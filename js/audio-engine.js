(() => {
    class AudioEngine {
        constructor(sampleUrls) {
            this.sampleUrls = sampleUrls;
            this.context = null;
            this.output = null;
            this.buffers = new Map();
            this.channels = new Map();
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
                this.channels = new Map(
                    Object.keys(this.sampleUrls).map((name) => {
                        const gain = this.context.createGain();
                        gain.gain.value = 1;
                        gain.connect(this.output);

                        return [name, { gain, volume: 1, muted: false, solo: false }];
                    })
                );

                this.ready = true;
                this.#applyChannelStates();
                return true;
            } catch (error) {
                console.warn('Web Audio indisponível; usando fallback HTMLAudio.', error);
                this.ready = false;

                if (this.context && this.context.state !== 'closed') {
                    await this.context.close().catch(() => {});
                }

                this.context = null;
                this.output = null;
                this.channels.clear();
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
            if (!this.ready || !this.context) return null;

            const buffer = this.buffers.get(name);
            const channel = this.channels.get(name);
            if (!buffer || !channel || this.#isSilent(name)) return null;

            const source = this.context.createBufferSource();
            source.buffer = buffer;
            source.connect(channel.gain);
            source.addEventListener('ended', () => this.activeSources.delete(source), { once: true });
            this.activeSources.add(source);
            source.start(Math.max(this.context.currentTime, when));
            return source;
        }

        setChannel(name, state = {}) {
            const channel = this.channels.get(name);
            if (!channel) return;

            if (Number.isFinite(state.volume)) {
                channel.volume = Math.min(1, Math.max(0, state.volume));
            }

            if (typeof state.muted === 'boolean') channel.muted = state.muted;
            if (typeof state.solo === 'boolean') channel.solo = state.solo;

            this.#applyChannelStates();
        }

        #isSilent(name) {
            const channel = this.channels.get(name);
            if (!channel) return true;

            const hasSolo = [...this.channels.values()].some((item) => item.solo);
            return channel.muted || (hasSolo && !channel.solo) || channel.volume <= 0;
        }

        #applyChannelStates() {
            if (!this.context) return;

            const hasSolo = [...this.channels.values()].some((item) => item.solo);

            this.channels.forEach((channel) => {
                const audible = !channel.muted && (!hasSolo || channel.solo);
                const target = audible ? channel.volume : 0;
                channel.gain.gain.setTargetAtTime(target, this.context.currentTime, 0.006);
            });
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
