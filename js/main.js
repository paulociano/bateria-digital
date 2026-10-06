const validKeys = new Set(['q', 'w', 'e', 'a', 's', 'd', 'z', 'x', 'c']);
const KITS = {
    original: {
        name: 'Original',
        samples: {
            keyq: 'music/keyq.wav',
            keyw: 'music/keyw.wav',
            keye: 'music/keye.wav',
            keya: 'music/keya.wav',
            keys: 'music/keys.wav',
            keyd: 'music/keyd.wav',
            keyz: 'music/keyz.wav',
            keyx: 'music/keyx.wav',
            keyc: 'music/keyc.wav'
        },
        labels: {
            keyq: 'Sample 01 · Q',
            keyw: 'Sample 02 · W',
            keye: 'Sample 03 · E',
            keya: 'Sample 04 · A',
            keys: 'Sample 05 · S',
            keyd: 'Sample 06 · D',
            keyz: 'Sample 07 · Z',
            keyx: 'Sample 08 · X',
            keyc: 'Sample 09 · C'
        }
    },
    'studio-cc0': {
        name: 'Studio CC0',
        samples: {
            keyq: 'music/kits/studio-cc0/kick.wav',
            keyw: 'music/kits/studio-cc0/snare.wav',
            keye: 'music/kits/studio-cc0/hat-closed.wav',
            keya: 'music/kits/studio-cc0/clap.wav',
            keys: 'music/kits/studio-cc0/tom-low.wav',
            keyd: 'music/kits/studio-cc0/tom-mid.wav',
            keyz: 'music/kits/studio-cc0/tom-high.wav',
            keyx: 'music/kits/studio-cc0/hat-open.wav',
            keyc: 'music/kits/studio-cc0/crash.wav'
        },
        labels: {
            keyq: 'Kick · Q',
            keyw: 'Snare · W',
            keye: 'Closed Hat · E',
            keya: 'Clap · A',
            keys: 'Low Tom · S',
            keyd: 'Mid Tom · D',
            keyz: 'High Tom · Z',
            keyx: 'Open Hat · X',
            keyc: 'Crash · C'
        }
    }
};

let activeKitId = 'original';
let sampleUrls = KITS[activeKitId].samples;
let padLabels = KITS[activeKitId].labels;

const GRID_STEPS = 16;
const STORAGE_KEY = 'bateria-digital:state:v1';
const SLOT_NAMES = ['A', 'B', 'C', 'D'];
const DEMO_PATTERN = [
    'keyq', null, 'keys', null,
    'keyq', 'keyw', 'keys', null,
    'keyq', null, 'keys', 'keye',
    'keyq', 'keyw', 'keys', null
];

const composer = document.querySelector('#composer');
const input = document.querySelector('#input');
const tempo = document.querySelector('#tempo');
const tempoValue = document.querySelector('#tempo-value');
const clearButton = document.querySelector('#clear');
const stopButton = document.querySelector('#stop');
const loopButton = document.querySelector('#loop');
const gridPlayButton = document.querySelector('#grid-play');
const quickPlayButton = composer.querySelector('.play');
const machine = document.querySelector('.machine');
const playbackStatus = document.querySelector('#playback-status');
const keys = document.querySelector('.keys');
const stepGrid = document.querySelector('#step-grid');
const selectedSoundLabel = document.querySelector('#selected-sound');
const slotButtons = [...document.querySelectorAll('[data-slot]')];
const activeSlotLabel = document.querySelector('#active-slot');
const saveSlotButton = document.querySelector('#save-slot');
const demoPatternButton = document.querySelector('#demo-pattern');
const tapTempoButton = document.querySelector('#tap-tempo');
const sharePatternButton = document.querySelector('#share-pattern');
const recordAudioButton = document.querySelector('#record-audio');
const kitSelect = document.querySelector('#kit-select');
const swing = document.querySelector('#swing');
const swingValue = document.querySelector('#swing-value');
const channelName = document.querySelector('#channel-name');
const channelVolume = document.querySelector('#channel-volume');
const channelVolumeValue = document.querySelector('#channel-volume-value');
const channelMuteButton = document.querySelector('#channel-mute');
const channelSoloButton = document.querySelector('#channel-solo');

let audioEngine = null;
const LOOK_AHEAD_MS = 25;
const SCHEDULE_AHEAD_SECONDS = 0.12;

let audioMode = 'pending';
let audioReadyPromise = null;
const sequenceTimers = new Set();
let schedulerId = null;
let finishTimer = null;
let loopEnabled = false;
let isPlaying = false;
let currentPattern = [];
let currentStep = 0;
let nextStepTime = 0;
let selectedSound = 'keyq';
let gridPattern = Array(GRID_STEPS).fill(null);
let activeSlot = 'A';
let savedSlots = Object.fromEntries(SLOT_NAMES.map((slot) => [slot, null]));
let tapTimes = [];
let isRecording = false;
let swingAmount = 50;
let channelStates = Object.fromEntries(
    Object.keys(sampleUrls).map((sound) => [sound, { volume: 1, muted: false, solo: false }])
);

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && isPlaying) {
        stopSequence();
        return;
    }

    if (event.repeat || event.target === input) return;

    const key = event.key.toLowerCase();
    if (validKeys.has(key)) {
        const sound = `key${key}`;
        selectSound(sound);
        playSound(sound);
    }
});

keys.addEventListener('pointerdown', (event) => {
    const pad = event.target.closest('[data-key]');
    if (!pad) return;

    selectSound(pad.dataset.key);
    playSound(pad.dataset.key);
});

keys.addEventListener('click', (event) => {
    if (event.detail !== 0) return;
    const pad = event.target.closest('[data-key]');
    if (!pad) return;

    selectSound(pad.dataset.key);
    playSound(pad.dataset.key);
});

stepGrid.addEventListener('click', (event) => {
    const step = event.target.closest('[data-step]');
    if (!step) return;

    if (isPlaying) {
        playbackStatus.textContent = 'Pare para editar o pattern';
        return;
    }

    toggleGridStep(Number(step.dataset.step));
});

composer.addEventListener('submit', (event) => {
    event.preventDefault();
    syncGridFromInput();
    playSequence(gridPattern.slice());
});

gridPlayButton.addEventListener('click', () => {
    playSequence(gridPattern.slice());
});

input.addEventListener('input', () => {
    if (isPlaying) return;
    syncGridFromInput();
    persistWorkingState();
});

tempo.addEventListener('input', () => {
    updateTempo();
    persistWorkingState();
});

stopButton.addEventListener('click', () => {
    stopSequence();
});

loopButton.addEventListener('click', () => {
    loopEnabled = !loopEnabled;
    loopButton.setAttribute('aria-pressed', String(loopEnabled));

    if (!isPlaying) {
        playbackStatus.textContent = loopEnabled ? 'Loop ativo' : 'Loop desativado';
    }
});

clearButton.addEventListener('click', () => {
    input.value = '';
    gridPattern = Array(GRID_STEPS).fill(null);
    renderGrid();
    persistWorkingState();
    input.focus();
    playbackStatus.textContent = 'Pattern limpo';
});

slotButtons.forEach((button) => {
    button.addEventListener('click', () => selectSlot(button.dataset.slot));
});

saveSlotButton.addEventListener('click', saveActiveSlot);
demoPatternButton.addEventListener('click', loadDemoPattern);
tapTempoButton.addEventListener('click', registerTempoTap);
sharePatternButton.addEventListener('click', shareCurrentPattern);
recordAudioButton.addEventListener('click', toggleRecording);
kitSelect.addEventListener('change', () => switchKit(kitSelect.value));

swing.addEventListener('input', () => {
    setSwing(swing.value);
    persistWorkingState();
});

channelVolume.addEventListener('input', () => {
    channelStates[selectedSound].volume = Number(channelVolume.value) / 100;
    applyChannelState(selectedSound);
    renderChannelStrip();
    persistWorkingState();
});

channelMuteButton.addEventListener('click', () => {
    channelStates[selectedSound].muted = !channelStates[selectedSound].muted;
    applyAllChannelStates();
    renderChannelStrip();
    persistWorkingState();
});

channelSoloButton.addEventListener('click', () => {
    channelStates[selectedSound].solo = !channelStates[selectedSound].solo;
    applyAllChannelStates();
    renderChannelStrip();
    persistWorkingState();
});

function parsePattern(value) {
    const pattern = [];

    [...value.toLowerCase()].forEach((character) => {
        if (validKeys.has(character)) {
            pattern.push(`key${character}`);
            return;
        }

        if (/\s/.test(character) || character === '.' || character === '-') {
            pattern.push(null);
        }
    });

    return pattern.slice(0, GRID_STEPS);
}

function renderKitLabels() {
    kitSelect.value = activeKitId;

    keys.querySelectorAll('[data-key]').forEach((pad) => {
        const sound = pad.dataset.key;
        const label = padLabels[sound];
        const name = label.split(' · ')[0];
        const small = pad.querySelector('[data-pad-name]');
        if (small) small.textContent = name;
        pad.setAttribute('aria-label', label);
    });

    selectedSoundLabel.textContent = padLabels[selectedSound];
    channelName.textContent = padLabels[selectedSound];
}

function updateFallbackSources() {
    Object.entries(sampleUrls).forEach(([sound, src]) => {
        const audio = document.querySelector(`#s_${sound}`);
        if (!audio) return;
        audio.src = src;
        audio.load();
    });
}

async function switchKit(kitId, { persist = true, announce = true } = {}) {
    if (!KITS[kitId] || kitId === activeKitId && audioEngine) {
        renderKitLabels();
        return;
    }

    stopSequence({ announce: false });
    setEditingDisabled(true);

    if (audioEngine) await audioEngine.destroy();

    activeKitId = kitId;
    sampleUrls = KITS[activeKitId].samples;
    padLabels = KITS[activeKitId].labels;
    audioEngine = new window.AudioEngine(sampleUrls);
    audioMode = 'pending';
    audioReadyPromise = null;

    updateFallbackSources();
    renderKitLabels();
    renderGrid();
    renderChannelStrip();

    const ready = await ensureAudio();
    if (!isPlaying) setEditingDisabled(false);

    if (persist) persistWorkingState();
    if (announce) {
        playbackStatus.textContent = ready
            ? `Kit ${KITS[activeKitId].name} carregado`
            : `Kit ${KITS[activeKitId].name} · modo compatível`;
    }
}

function normalizePattern(pattern) {
    if (!Array.isArray(pattern)) return Array(GRID_STEPS).fill(null);

    return Array.from({ length: GRID_STEPS }, (_, index) => {
        const sound = pattern[index];
        return sound === null || sampleUrls[sound] ? sound ?? null : null;
    });
}

function soundToKey(sound) {
    return sound ? sound.slice(-1) : '-';
}

function selectSound(sound) {
    if (!sampleUrls[sound]) return;

    selectedSound = sound;
    selectedSoundLabel.textContent = padLabels[sound];

    keys.querySelectorAll('[data-key]').forEach((pad) => {
        pad.classList.toggle('is-selected', pad.dataset.key === sound);
    });

    renderGrid();
    renderChannelStrip();
}

function toggleGridStep(index) {
    if (!Number.isInteger(index) || index < 0 || index >= GRID_STEPS) return;

    gridPattern[index] = gridPattern[index] === selectedSound ? null : selectedSound;
    renderGrid();
    syncInputFromGrid();
    persistWorkingState();
    playbackStatus.textContent = gridPattern[index] ? `Passo ${index + 1} definido` : `Passo ${index + 1} limpo`;
}

function buildGrid() {
    stepGrid.innerHTML = '';

    for (let index = 0; index < GRID_STEPS; index += 1) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'step-button';
        button.dataset.step = String(index);

        const number = document.createElement('span');
        number.className = 'step-button__number';
        number.textContent = String(index + 1).padStart(2, '0');

        const value = document.createElement('span');
        value.className = 'step-button__value';
        value.textContent = '·';

        button.append(number, value);
        stepGrid.appendChild(button);
    }
}

function renderGrid() {
    const steps = stepGrid.querySelectorAll('[data-step]');

    steps.forEach((button, index) => {
        const sound = gridPattern[index];
        const value = button.querySelector('.step-button__value');

        button.classList.toggle('is-filled', Boolean(sound));
        button.dataset.sound = sound || '';
        button.setAttribute('aria-pressed', String(Boolean(sound)));
        value.textContent = sound ? soundToKey(sound).toUpperCase() : '·';

        const currentValue = sound ? padLabels[sound] : 'pausa';
        const selectedValue = padLabels[selectedSound];
        button.setAttribute(
            'aria-label',
            `Passo ${index + 1}: ${currentValue}. Clique para ${sound === selectedSound ? 'remover' : `definir ${selectedValue}`}.`
        );
    });
}

function syncGridFromInput() {
    const parsed = parsePattern(input.value);
    gridPattern = Array.from({ length: GRID_STEPS }, (_, index) => parsed[index] ?? null);
    renderGrid();
}

function syncInputFromGrid() {
    const serialized = gridPattern.map(soundToKey).join('').replace(/-+$/, '');
    input.value = serialized;
}

function setSwing(value) {
    const numeric = Math.round(Number(value));
    swingAmount = Math.min(75, Math.max(50, numeric || 50));
    swing.value = String(swingAmount);
    swingValue.value = `${swingAmount}%`;
    swing.setAttribute('aria-valuetext', `${swingAmount}%`);

    const percentage = ((swingAmount - 50) / 25) * 100;
    swing.style.background = `linear-gradient(90deg, #ff705e ${percentage}%, #303744 ${percentage}%)`;
}

function normalizeChannelState(state) {
    const rawVolume = Number(state?.volume);
    return {
        volume: Number.isFinite(rawVolume) ? Math.min(1, Math.max(0, rawVolume)) : 1,
        muted: Boolean(state?.muted),
        solo: Boolean(state?.solo)
    };
}

function renderChannelStrip() {
    const state = channelStates[selectedSound];
    const percent = Math.round(state.volume * 100);

    channelName.textContent = padLabels[selectedSound];
    channelVolume.value = String(percent);
    channelVolumeValue.value = `${percent}%`;
    channelVolume.setAttribute('aria-valuetext', `${percent}%`);
    channelVolume.style.background = `linear-gradient(90deg, #5da9ff ${percent}%, #303744 ${percent}%)`;
    channelMuteButton.setAttribute('aria-pressed', String(state.muted));
    channelSoloButton.setAttribute('aria-pressed', String(state.solo));
}

function isChannelAudible(sound) {
    const state = channelStates[sound];
    const hasSolo = Object.values(channelStates).some((item) => item.solo);
    return !state.muted && (!hasSolo || state.solo) && state.volume > 0;
}

function applyFallbackChannelState(sound) {
    const audio = document.querySelector(`#s_${sound}`);
    if (!audio) return;

    audio.volume = channelStates[sound].volume;
    audio.muted = !isChannelAudible(sound);
}

function applyChannelState(sound) {
    if (audioMode === 'web-audio') {
        audioEngine.setChannel(sound, channelStates[sound]);
    }
    applyFallbackChannelState(sound);
}

function applyAllChannelStates() {
    Object.keys(channelStates).forEach(applyChannelState);
}

function swingOffsetSeconds(stepIndex) {
    if (stepIndex % 2 === 0) return 0;
    return stepDurationSeconds() * 2 * ((swingAmount / 100) - 0.5);
}

function setTempo(value) {
    const numeric = Math.round(Number(value));
    const clamped = Math.min(Number(tempo.max), Math.max(Number(tempo.min), numeric || 120));
    tempo.value = String(clamped);
    updateTempo();
}

function updateTempo() {
    const percentage = ((tempo.value - tempo.min) / (tempo.max - tempo.min)) * 100;
    const label = `${tempo.value} BPM`;

    tempoValue.value = label;
    tempo.setAttribute('aria-valuetext', label);
    tempo.style.background = `linear-gradient(90deg, #ff705e ${percentage}%, #303744 ${percentage}%)`;
}

function selectSlot(slot) {
    if (!SLOT_NAMES.includes(slot) || isPlaying) return;

    activeSlot = slot;
    renderMemory();

    const saved = savedSlots[slot];
    if (!saved) {
        playbackStatus.textContent = `Slot ${slot} vazio · pronto para salvar`;
        persistWorkingState();
        return;
    }

    gridPattern = normalizePattern(saved.pattern);
    setTempo(saved.bpm);
    renderGrid();
    syncInputFromGrid();
    persistWorkingState();
    playbackStatus.textContent = `Slot ${slot} carregado`;
}

function saveActiveSlot() {
    if (isPlaying) return;

    savedSlots[activeSlot] = {
        pattern: gridPattern.slice(),
        bpm: Number(tempo.value)
    };
    persistWorkingState();
    renderMemory();
    playbackStatus.textContent = `Pattern salvo no slot ${activeSlot}`;
}

function renderMemory() {
    activeSlotLabel.textContent = `Slot ${activeSlot}`;

    slotButtons.forEach((button) => {
        const slot = button.dataset.slot;
        const isActive = slot === activeSlot;
        button.classList.toggle('is-active', isActive);
        button.classList.toggle('has-pattern', Boolean(savedSlots[slot]));
        button.setAttribute('aria-pressed', String(isActive));
        button.setAttribute(
            'aria-label',
            savedSlots[slot] ? `Slot ${slot}, pattern salvo` : `Slot ${slot}, vazio`
        );
    });
}

function loadDemoPattern() {
    if (isPlaying) return;

    gridPattern = DEMO_PATTERN.slice();
    setTempo(112);
    renderGrid();
    syncInputFromGrid();
    persistWorkingState();
    playbackStatus.textContent = 'Groove demo carregado';
}

function registerTempoTap() {
    if (isPlaying) return;

    const now = performance.now();
    if (tapTimes.length && now - tapTimes[tapTimes.length - 1] > 2000) {
        tapTimes = [];
    }

    tapTimes.push(now);
    tapTimes = tapTimes.slice(-6);

    if (tapTimes.length < 2) {
        playbackStatus.textContent = 'Tap Tempo · toque novamente';
        return;
    }

    const intervals = tapTimes.slice(1).map((time, index) => time - tapTimes[index]);
    const averageInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    const bpm = Math.round(60000 / averageInterval);

    setTempo(bpm);
    persistWorkingState();
    playbackStatus.textContent = `Tap Tempo · ${tempo.value} BPM`;
}

function buildPortableState() {
    return {
        version: 1,
        pattern: gridPattern.slice(),
        bpm: Number(tempo.value),
        swing: swingAmount,
        kit: activeKitId,
        channels: channelStates
    };
}

function encodePortableState(state) {
    const bytes = new TextEncoder().encode(JSON.stringify(state));
    let binary = '';
    bytes.forEach((byte) => { binary += String.fromCharCode(byte); });

    return btoa(binary)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/g, '');
}

function decodePortableState(encoded) {
    try {
        const normalized = encoded.replace(/-/g, '+').replace(/_/g, '/');
        const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4);
        const binary = atob(padded);
        const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
        const parsed = JSON.parse(new TextDecoder().decode(bytes));

        if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.pattern)) return null;
        return parsed;
    } catch (_) {
        return null;
    }
}

function applyPortableState(state) {
    if (!state) return false;

    if (KITS[state.kit]) activeKitId = state.kit;
    sampleUrls = KITS[activeKitId].samples;
    padLabels = KITS[activeKitId].labels;

    gridPattern = normalizePattern(state.pattern);
    setTempo(state.bpm ?? 120);
    setSwing(state.swing ?? 50);

    Object.keys(channelStates).forEach((sound) => {
        channelStates[sound] = normalizeChannelState(state.channels?.[sound]);
    });

    return true;
}

function restoreSharedState() {
    const match = window.location.hash.match(/^#p=([A-Za-z0-9_-]+)$/);
    if (!match) return false;

    const shared = decodePortableState(match[1]);
    if (!shared) {
        playbackStatus.textContent = 'Link de pattern inválido';
        return false;
    }

    applyPortableState(shared);
    return true;
}

async function shareCurrentPattern() {
    const encoded = encodePortableState(buildPortableState());
    const url = new URL(window.location.href);
    url.hash = `p=${encoded}`;
    window.history.replaceState(null, '', url);

    try {
        if (navigator.share) {
            await navigator.share({
                title: 'Bateria Digital — Pattern',
                text: 'Abra este groove na Bateria Digital.',
                url: url.toString()
            });
            playbackStatus.textContent = 'Pattern compartilhado';
            return;
        }

        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(url.toString());
            playbackStatus.textContent = 'Link do pattern copiado';
            return;
        }
    } catch (error) {
        if (error?.name === 'AbortError') {
            playbackStatus.textContent = 'Compartilhamento cancelado';
            return;
        }
    }

    playbackStatus.textContent = 'Link preparado na barra do navegador';
}

function recordingExtension(type) {
    if (type.includes('ogg')) return 'ogg';
    return 'webm';
}

function downloadRecording(blob, type) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bateria-digital-${Date.now()}.${recordingExtension(type)}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function toggleRecording() {
    const webAudioReady = await ensureAudio();
    if (!webAudioReady || !audioEngine.canRecord()) {
        playbackStatus.textContent = 'Gravação indisponível neste navegador';
        return;
    }

    await audioEngine.resume();

    if (!isRecording) {
        const started = audioEngine.startRecording();
        if (!started) {
            playbackStatus.textContent = 'Não foi possível iniciar a gravação';
            return;
        }

        isRecording = true;
        recordAudioButton.setAttribute('aria-pressed', 'true');
        recordAudioButton.querySelector('span').textContent = 'Finalizar';
        recordAudioButton.querySelector('small').textContent = 'gerar arquivo';
        playbackStatus.textContent = 'Gravando master';
        return;
    }

    const result = await audioEngine.stopRecording();
    isRecording = false;
    recordAudioButton.setAttribute('aria-pressed', 'false');
    recordAudioButton.querySelector('span').textContent = 'Gravar';
    recordAudioButton.querySelector('small').textContent = 'exportar áudio';

    if (!result?.blob?.size) {
        playbackStatus.textContent = 'Gravação vazia';
        return;
    }

    downloadRecording(result.blob, result.type);
    playbackStatus.textContent = 'Áudio exportado';
}

function readStoredState() {
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;

        const parsed = JSON.parse(raw);
        if (!parsed || parsed.version !== 1) return null;

        return parsed;
    } catch (_) {
        return null;
    }
}

function restoreStoredState() {
    const stored = readStoredState();
    if (!stored) return;

    gridPattern = normalizePattern(stored.working?.pattern);
    setTempo(stored.working?.bpm ?? 120);
    setSwing(stored.working?.swing ?? 50);

    Object.keys(channelStates).forEach((sound) => {
        channelStates[sound] = normalizeChannelState(stored.working?.channels?.[sound]);
    });

    if (KITS[stored.working?.kit]) activeKitId = stored.working.kit;
    sampleUrls = KITS[activeKitId].samples;
    padLabels = KITS[activeKitId].labels;

    if (SLOT_NAMES.includes(stored.activeSlot)) activeSlot = stored.activeSlot;

    SLOT_NAMES.forEach((slot) => {
        const saved = stored.slots?.[slot];
        if (!saved) return;

        savedSlots[slot] = {
            pattern: normalizePattern(saved.pattern),
            bpm: Math.min(180, Math.max(70, Math.round(Number(saved.bpm) || 120)))
        };
    });
}

function persistWorkingState() {
    try {
        const state = {
            version: 1,
            activeSlot,
            working: {
                pattern: gridPattern.slice(),
                bpm: Number(tempo.value),
                swing: swingAmount,
                channels: channelStates,
                kit: activeKitId
            },
            slots: savedSlots
        };

        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (_) {
        // Storage can be unavailable in private/restricted browser contexts.
    }
}

async function ensureAudio() {
    if (audioMode === 'web-audio') return true;
    if (audioMode === 'fallback') return false;

    if (!audioEngine) audioEngine = new window.AudioEngine(sampleUrls);

    if (!audioReadyPromise) {
        audioReadyPromise = audioEngine.init().then((ready) => {
            audioMode = ready ? 'web-audio' : 'fallback';
            applyAllChannelStates();
            return ready;
        });
    }

    return audioReadyPromise;
}

async function playSound(sound) {
    flashPad(sound);

    if (await ensureAudio()) {
        await audioEngine.resume();
        audioEngine.playAt(sound);
        return;
    }

    playFallbackSound(sound);
}

async function playSequence(pattern) {
    stopSequence({ announce: false });

    if (!pattern.some(Boolean)) {
        playbackStatus.textContent = 'Adicione uma batida';
        return;
    }

    currentPattern = pattern.slice(0, GRID_STEPS);
    currentStep = 0;
    isPlaying = true;
    machine.classList.add('is-playing');
    stopButton.disabled = false;
    setEditingDisabled(true);
    playbackStatus.textContent = 'Preparando áudio';

    const webAudioReady = await ensureAudio();
    if (!isPlaying) return;

    if (webAudioReady) {
        await audioEngine.resume();
        nextStepTime = audioEngine.currentTime + 0.06;
        playbackStatus.textContent = 'Tocando';
        scheduleAhead();
        schedulerId = window.setInterval(scheduleAhead, LOOK_AHEAD_MS);
        return;
    }

    playbackStatus.textContent = 'Tocando · modo compatível';
    playFallbackCycle();
}

function scheduleAhead() {
    if (!isPlaying || audioMode !== 'web-audio') return;

    while (isPlaying && nextStepTime < audioEngine.currentTime + SCHEDULE_AHEAD_SECONDS) {
        const stepIndex = currentStep;
        const token = currentPattern[stepIndex];

        const scheduledTime = nextStepTime + swingOffsetSeconds(stepIndex);
        if (token) audioEngine.playAt(token, scheduledTime);
        scheduleVisualStep(stepIndex, token, scheduledTime);

        nextStepTime += stepDurationSeconds();
        currentStep += 1;

        if (currentStep >= currentPattern.length) {
            if (loopEnabled) {
                currentStep = 0;
                continue;
            }

            stopScheduler();

            const remainingMs = Math.max(0, (nextStepTime - audioEngine.currentTime) * 1000);
            finishTimer = window.setTimeout(finishSequence, remainingMs);
            break;
        }
    }
}

function scheduleVisualStep(stepIndex, token, scheduledTime) {
    const delay = Math.max(0, (scheduledTime - audioEngine.currentTime) * 1000);
    trackTimeout(() => {
        if (!isPlaying) return;
        activateStep(stepIndex);
        playbackStatus.textContent = `Passo ${stepIndex + 1}/${currentPattern.length}`;
        if (token) flashPad(token);
    }, delay);
}

function playFallbackCycle() {
    if (!isPlaying) return;

    const interval = stepDurationSeconds() * 1000;

    currentPattern.forEach((token, index) => {
        trackTimeout(() => {
            if (!isPlaying) return;
            activateStep(index);
            playbackStatus.textContent = `Passo ${index + 1}/${currentPattern.length}`;

            if (token) {
                flashPad(token);
                playFallbackSound(token);
            }
        }, index * interval + swingOffsetSeconds(index) * 1000);
    });

    trackTimeout(() => {
        if (!isPlaying) return;

        if (loopEnabled) {
            playFallbackCycle();
            return;
        }

        finishSequence();
    }, currentPattern.length * interval);
}

function stepDurationSeconds() {
    return 60 / Number(tempo.value) / 4;
}

function activateStep(index) {
    stepGrid.querySelectorAll('.step-button.is-current').forEach((step) => {
        step.classList.remove('is-current');
    });

    const current = stepGrid.querySelector(`[data-step="${index}"]`);
    if (current) current.classList.add('is-current');
}

function flashPad(sound) {
    const pad = document.querySelector(`[data-key="${sound}"]`);
    if (!pad) return;

    pad.classList.remove('active');
    void pad.offsetWidth;
    pad.classList.add('active');
    window.setTimeout(() => pad.classList.remove('active'), 180);
}

function playFallbackSound(sound) {
    const audio = document.querySelector(`#s_${sound}`);
    if (!audio || !isChannelAudible(sound)) return;

    applyFallbackChannelState(sound);
    audio.currentTime = 0;
    audio.play().catch(() => {
        playbackStatus.textContent = 'Áudio indisponível';
    });
}

function stopScheduler() {
    if (schedulerId !== null) {
        window.clearInterval(schedulerId);
        schedulerId = null;
    }
}

function trackTimeout(callback, delay) {
    const timer = window.setTimeout(() => {
        sequenceTimers.delete(timer);
        callback();
    }, delay);

    sequenceTimers.add(timer);
    return timer;
}

function clearPlaybackTimers() {
    sequenceTimers.forEach((timer) => window.clearTimeout(timer));
    sequenceTimers.clear();

    if (finishTimer !== null) {
        window.clearTimeout(finishTimer);
        finishTimer = null;
    }
}

function stopAllAudio() {
    audioEngine?.stopAll();

    document.querySelectorAll('audio').forEach((audio) => {
        audio.pause();
        audio.currentTime = 0;
    });
}

function setEditingDisabled(disabled) {
    input.disabled = disabled;
    quickPlayButton.disabled = disabled;
    gridPlayButton.disabled = disabled;
    clearButton.disabled = disabled;
    saveSlotButton.disabled = disabled;
    demoPatternButton.disabled = disabled;
    tapTempoButton.disabled = disabled;
    kitSelect.disabled = disabled;
    swing.disabled = disabled;
    channelVolume.disabled = disabled;
    channelMuteButton.disabled = disabled;
    channelSoloButton.disabled = disabled;
    slotButtons.forEach((button) => { button.disabled = disabled; });

    stepGrid.querySelectorAll('.step-button').forEach((step) => {
        step.disabled = disabled;
    });
}

function resetPlaybackState(status) {
    isPlaying = false;
    currentStep = 0;
    machine.classList.remove('is-playing');
    stopButton.disabled = true;
    setEditingDisabled(false);
    stepGrid.querySelectorAll('.step-button.is-current').forEach((step) => step.classList.remove('is-current'));
    playbackStatus.textContent = status;
}

function finishSequence() {
    clearPlaybackTimers();
    stopScheduler();
    resetPlaybackState('Pronto');
}

function stopSequence({ announce = true } = {}) {
    clearPlaybackTimers();
    stopScheduler();
    stopAllAudio();
    resetPlaybackState(announce ? 'Parado' : 'Pronto');
}

buildGrid();
restoreStoredState();
const sharedStateLoaded = restoreSharedState();
if (sharedStateLoaded) persistWorkingState();
audioEngine = new window.AudioEngine(sampleUrls);
updateFallbackSources();
renderKitLabels();
setSwing(swingAmount);
selectSound(selectedSound);
renderGrid();
syncInputFromGrid();
renderMemory();
renderChannelStrip();
updateTempo();
applyAllChannelStates();
ensureAudio();
