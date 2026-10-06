const validKeys = new Set(['q', 'w', 'e', 'a', 's', 'd', 'z', 'x', 'c']);
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

let sequenceTimers = [];
let loopEnabled = false;
let isPlaying = false;

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
    const sequence = [...input.value.toLowerCase()].filter((key) => validKeys.has(key));
    playSequence(sequence);
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
    input.focus();

    if (!isPlaying) playbackStatus.textContent = 'Sequência limpa';
});

function updateTempo() {
    const percentage = ((tempo.value - tempo.min) / (tempo.max - tempo.min)) * 100;
    const label = `${tempo.value} BPM`;

    tempoValue.value = label;
    tempo.setAttribute('aria-valuetext', label);
    tempo.style.background = `linear-gradient(90deg, #ff806d ${percentage}%, #464642 ${percentage}%)`;
}

function playSound(sound) {
    const audio = document.querySelector(`#s_${sound}`);
    const pad = document.querySelector(`[data-key="${sound}"]`);

    if (!audio || !pad) return;

    audio.currentTime = 0;
    audio.play().catch(() => {
        playbackStatus.textContent = 'Áudio indisponível';
    });

    pad.classList.remove('active');
    void pad.offsetWidth;
    pad.classList.add('active');
    window.setTimeout(() => pad.classList.remove('active'), 180);
}

function playSequence(sequence) {
    stopSequence({ announce: false });

    if (!sequence.length) {
        playbackStatus.textContent = 'Adicione uma batida';
        input.focus();
        return;
    }

    isPlaying = true;
    machine.classList.add('is-playing');
    stopButton.disabled = false;
    scheduleCycle(sequence);
}

function scheduleCycle(sequence) {
    if (!isPlaying) return;

    sequenceTimers = [];
    const interval = 60000 / Number(tempo.value) / 2;

    sequence.forEach((key, index) => {
        const timer = window.setTimeout(() => {
            if (!isPlaying) return;
            playbackStatus.textContent = `Passo ${index + 1}/${sequence.length}`;
            playSound(`key${key}`);
        }, index * interval);

        sequenceTimers.push(timer);
    });

    const completionTimer = window.setTimeout(() => {
        if (!isPlaying) return;

        if (loopEnabled) {
            scheduleCycle(sequence);
            return;
        }

        finishSequence();
    }, sequence.length * interval);

    sequenceTimers.push(completionTimer);
}

function finishSequence() {
    sequenceTimers = [];
    isPlaying = false;
    machine.classList.remove('is-playing');
    stopButton.disabled = true;
    playbackStatus.textContent = 'Pronto';
}

function stopSequence({ announce = true } = {}) {
    sequenceTimers.forEach((timer) => window.clearTimeout(timer));
    sequenceTimers = [];
    isPlaying = false;
    machine.classList.remove('is-playing');
    stopButton.disabled = true;

    if (announce) playbackStatus.textContent = 'Parado';
}

updateTempo();