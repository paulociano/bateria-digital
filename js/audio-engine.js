(() => {
    class AudioEngine {
        constructor(sampleUrls) {
            this.sampleUrls = sampleUrls;
            this.context = null;
            this.output = null;
            this.buffers = new Map();
            this.activeSources = new Set();
            this.ready = false;
            this.initializing = null;
        }

        init() {
            if (this.ready) return Promise.resolve(true);
            if (this.initializing) return this.initializing;

            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (!AudioContextClass) return Promise.resolve(false);

            this.initializing = this.#load(AudioContextClass);
            return this.initializing;
        }

        async #load(AudioContextClass) {
            try {
                this.context = new AudioContextClass();
                this.output = this.context.createGain();
                this.output.gain.value = 0.92;
                this.output.connect(this.context.destination);

                const decoded = await Promise.all(
                    Object.entries(this.sampleUrls).map(async ([name, url]) => {
                        const response = await fetch(url, { cache: 'force-cache' });
                        if (!response.ok) throw new Error(`Falha ao carregar ${url}`);

                        const bytes = await response.arrayBuffer();
                        const buffer = await this.context.decodeAudioData(bytes);
                        return [name, buffer];
                    })
                );

                this.buffers = new Map(decoded);
                this.ready = true;
                return true;
            } catch (error) {
                console.warn('Web Audio indisponível; usando fallback HTMLAudio.', error);
                this.ready = false;

                if (this.context && this.context.state !== 'closed') {
                    await this.context.close().catch(() => {});
                }

                this.context = null;
                this.output = null;
                return false;
            }
        }

        async resume() {
            if (!this.context) return false;
            if (this.context.state === 'suspended') await this.context.resume();
            return this.context.state === 'running';
        }

        get currentTime() {
            return this.context?.currentTime ?? 0;
        }

        playAt(name, when = this.currentTime) {
            if (!this.ready || !this.context || !this.output) return null;

            const buffer = this.buffers.get(name);
            if (!buffer) return null;

            const source = this.context.createBufferSource();
            source.buffer = buffer;
            source.connect(this.output);
            source.addEventListener('ended', () => this.activeSources.delete(source), { once: true });
            this.activeSources.add(source);
            source.start(Math.max(this.context.currentTime, when));
            return source;
        }

        stopAll() {
            this.activeSources.forEach((source) => {
                try {
                    source.stop();
                } catch (_) {}
            });
            this.activeSources.clear();
        }
    }

    window.AudioEngine = AudioEngine;
})();
