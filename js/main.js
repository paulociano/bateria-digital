const validKeys = new Set(['q', 'w', 'e', 'a', 's', 'd', 'z', 'x', 'c']);
const composer = document.querySelector('#composer');
const input = document.querySelector('#input');
const tempo = document.querySelector('#tempo');
const tempoValue = document.querySelector('#tempo-value');
const clearButton = document.querySelector('#clear');
const machine = document.querySelector('.machine');
const playbackStatus = document.querySelector('#playback-status');
let sequenceTimers = [];

document.addEventListener('keydown', (event) => {
    if (event.repeat || event.target === input) return;
    const key = event.key.toLowerCase();
    if (validKeys.has(key)) playSound(`key${key}`);
});

document.querySelector('.keys').addEventListener('click', (event) => {
    const pad = event.target.closest('[data-key]');
    if (pad) playSound(pad.dataset.key);
});

composer.addEventListener('submit', (event) => {
    event.preventDefault();
    const sequence = [...input.value.toLowerCase()].filter((key) => validKeys.has(key));
    playSequence(sequence);
});

tempo.addEventListener('input', () => {
    const percentage = ((tempo.value - tempo.min) / (tempo.max - tempo.min)) * 100;
    tempoValue.value = `${tempo.value} BPM`;
    tempo.style.background = `linear-gradient(90deg, #ff806d ${percentage}%, #464642 ${percentage}%)`;
});

clearButton.addEventListener('click', () => {
    stopSequence();
    input.value = '';
    input.focus();
});

function playSound(sound) {
    const audio = document.querySelector(`#s_${sound}`);
    const pad = document.querySelector(`[data-key="${sound}"]`);
    if (!audio || !pad) return;
    audio.currentTime = 0;
    audio.play().catch(() => {});
    pad.classList.remove('active');
    void pad.offsetWidth;
    pad.classList.add('active');
    window.setTimeout(() => pad.classList.remove('active'), 180);
}

function playSequence(sequence) {
    stopSequence();
    if (!sequence.length) {
        playbackStatus.textContent = 'Adicione uma batida';
        input.focus();
        return;
    }

    machine.classList.add('is-playing');
    playbackStatus.textContent = 'Tocando';
    const interval = 60000 / Number(tempo.value) / 2;

    sequence.forEach((key, index) => {
        const timer = window.setTimeout(() => playSound(`key${key}`), index * interval);
        sequenceTimers.push(timer);
    });

    sequenceTimers.push(window.setTimeout(() => {
        machine.classList.remove('is-playing');
        playbackStatus.textContent = 'Pronto';
        sequenceTimers = [];
    }, sequence.length * interval));
}

function stopSequence() {
    sequenceTimers.forEach((timer) => window.clearTimeout(timer));
    sequenceTimers = [];
    machine.classList.remove('is-playing');
    playbackStatus.textContent = 'Pronto';
}
