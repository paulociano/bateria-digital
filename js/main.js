const validKeys = new Set(['q', 'w', 'e', 'a', 's', 'd', 'z', 'x', 'c']);
const sampleUrls = {
    keyq: 'music/keyq.wav',
    keyw: 'music/keyw.wav',
    keye: 'music/keye.wav',
    keya: 'music/keya.wav',
    keys: 'music/keys.wav',
    keyd: 'music/keyd.wav',
    keyz: 'music/keyz.wav',
    keyx: 'music/keyx.wav',
    keyc: 'music/keyc.wav'
};
const padLabels = {
    keyq: 'Pad 01 · Q',
    keyw: 'Pad 02 · W',
    keye: 'Pad 03 · E',
    keya: 'Pad 04 · A',
    keys: 'Pad 05 · S',
    keyd: 'Pad 06 · D',
    keyz: 'Pad 07 · Z',
    keyx: 'Pad 08 · X',
    keyc: 'Pad 09 · C'
};

const GRID_STEPS = 16;
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

const audioEngine = new window.AudioEngine(sampleUrls);
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
});

tempo.addEventListener('input', updateTempo);

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
    input.focus();
    playbackStatus.textContent = 'Pattern limpo';
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
}

function toggleGridStep(index) {
    if (!Number.isInteger(index) || index < 0 || index >= GRID_STEPS) return;

    gridPattern[index] = gridPattern[index] === selectedSound ? null : selectedSound;
    renderGrid();
    syncInputFromGrid();
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

function updateTempo() {
    const percentage = ((tempo.value - tempo.min) / (tempo.max - tempo.min)) * 100;
    const label = `${tempo.value} BPM`;

    tempoValue.value = label;
    tempo.setAttribute('aria-valuetext', label);
    tempo.style.background = `linear-gradient(90deg, #ff806d ${percentage}%, #464642 ${percentage}%)`;
}

async function ensureAudio() {
    if (audioMode === 'web-audio') return true;
    if (audioMode === 'fallback') return false;

    if (!audioReadyPromise) {
        audioReadyPromise = audioEngine.init().then((ready) => {
            audioMode = ready ? 'web-audio' : 'fallback';
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

        if (token) audioEngine.playAt(token, nextStepTime);
        scheduleVisualStep(stepIndex, token, nextStepTime);

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
        }, index * interval);
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
    if (!audio) return;

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
    audioEngine.stopAll();

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
selectSound(selectedSound);
updateTempo();
syncGridFromInput();
ensureAudio();
