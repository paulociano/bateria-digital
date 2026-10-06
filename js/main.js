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

const composer = document.querySelector('#composer');
const input = document.querySelector('#input');
const tempo = document.querySelector('#tempo');
const tempoValue = document.querySelector('#tempo-value');
const clearButton = document.querySelector('#clear');
const stopButton = document.querySelector('#stop');
const loopButton = document.querySelector('#loop');
const machine = document.querySelector('.machine');
const playbackStatus = document.querySelector('#playback-status');
const keys = document.querySelector('.keys');
const sequencePreview = document.querySelector('#sequence-preview');

const audioEngine = new window.AudioEngine(sampleUrls);
const LOOK_AHEAD_MS = 25;
const SCHEDULE_AHEAD_SECONDS = 0.12;

let audioMode = 'pending';
let audioReadyPromise = null;
let sequenceTimers = [];
let schedulerId = null;
let finishTimer = null;
let loopEnabled = false;
let isPlaying = false;
let currentPattern = [];
let currentStep = 0;
let nextStepTime = 0;

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && isPlaying) {
        stopSequence();
        return;
    }

    if (event.repeat || event.target === input) return;

    const key = event.key.toLowerCase();
    if (validKeys.has(key)) playSound(`key${key}`);
});

keys.addEventListener('pointerdown', (event) => {
    const pad = event.target.closest('[data-key]');
    if (pad) playSound(pad.dataset.key);
});

keys.addEventListener('click', (event) => {
    if (event.detail !== 0) return;
    const pad = event.target.closest('[data-key]');
    if (pad) playSound(pad.dataset.key);
});

composer.addEventListener('submit', (event) => {
    event.preventDefault();
    playSequence(parsePattern(input.value));
});

input.addEventListener('input', () => {
    if (!isPlaying) renderPattern(parsePattern(input.value));
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
    renderPattern([]);
    input.focus();

    if (!isPlaying) playbackStatus.textContent = 'Sequência limpa';
});

function parsePattern(value) {
    const pattern = [];

    [...value.trim().toLowerCase()].forEach((character) => {
        if (validKeys.has(character)) {
            pattern.push(`key${character}`);
            return;
        }

        if (/\s/.test(character) || character === '.' || character === '-') {
            pattern.push(null);
        }
    });

    return pattern;
}

function renderPattern(pattern) {
    sequencePreview.innerHTML = '';

    if (!pattern.length) {
        const empty = document.createElement('span');
        empty.className = 'sequence-empty';
        empty.textContent = 'Sua sequência aparecerá aqui';
        sequencePreview.appendChild(empty);
        return;
    }

    pattern.forEach((token, index) => {
        const step = document.createElement('span');
        step.className = `sequence-step${token ? '' : ' is-rest'}`;
        step.dataset.step = String(index);
        step.textContent = token ? token.slice(-1).toUpperCase() : '·';
        step.setAttribute('aria-label', token ? `Passo ${index + 1}: tecla ${token.slice(-1).toUpperCase()}` : `Passo ${index + 1}: pausa`);
        sequencePreview.appendChild(step);
    });
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
    renderPattern(pattern);

    if (!pattern.some(Boolean)) {
        playbackStatus.textContent = 'Adicione uma batida';
        input.focus();
        return;
    }

    currentPattern = pattern;
    currentStep = 0;
    isPlaying = true;
    machine.classList.add('is-playing');
    stopButton.disabled = false;
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
    const timer = window.setTimeout(() => {
        if (!isPlaying) return;
        activateStep(stepIndex);
        playbackStatus.textContent = `Passo ${stepIndex + 1}/${currentPattern.length}`;
        if (token) flashPad(token);
    }, delay);

    sequenceTimers.push(timer);
}

function playFallbackCycle() {
    if (!isPlaying) return;

    const interval = stepDurationSeconds() * 1000;

    currentPattern.forEach((token, index) => {
        const timer = window.setTimeout(() => {
            if (!isPlaying) return;
            activateStep(index);
            playbackStatus.textContent = `Passo ${index + 1}/${currentPattern.length}`;

            if (token) {
                flashPad(token);
                playFallbackSound(token);
            }
        }, index * interval);

        sequenceTimers.push(timer);
    });

    const cycleTimer = window.setTimeout(() => {
        if (!isPlaying) return;

        if (loopEnabled) {
            sequenceTimers = [];
            playFallbackCycle();
            return;
        }

        finishSequence();
    }, currentPattern.length * interval);

    sequenceTimers.push(cycleTimer);
}

function stepDurationSeconds() {
    return 60 / Number(tempo.value) / 2;
}

function activateStep(index) {
    sequencePreview.querySelectorAll('.sequence-step.is-current').forEach((step) => {
        step.classList.remove('is-current');
    });

    const current = sequencePreview.querySelector(`[data-step="${index}"]`);
    if (current) {
        current.classList.add('is-current');
        current.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
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

function clearPlaybackTimers() {
    sequenceTimers.forEach((timer) => window.clearTimeout(timer));
    sequenceTimers = [];

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

function finishSequence() {
    clearPlaybackTimers();
    stopScheduler();
    isPlaying = false;
    currentStep = 0;
    machine.classList.remove('is-playing');
    stopButton.disabled = true;
    sequencePreview.querySelectorAll('.sequence-step.is-current').forEach((step) => step.classList.remove('is-current'));
    playbackStatus.textContent = 'Pronto';
}

function stopSequence({ announce = true } = {}) {
    clearPlaybackTimers();
    stopScheduler();
    stopAllAudio();

    isPlaying = false;
    currentStep = 0;
    machine.classList.remove('is-playing');
    stopButton.disabled = true;
    sequencePreview.querySelectorAll('.sequence-step.is-current').forEach((step) => step.classList.remove('is-current'));

    if (announce) playbackStatus.textContent = 'Parado';
}

updateTempo();
renderPattern([]);
ensureAudio();
