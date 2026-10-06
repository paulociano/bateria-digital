(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    if (root) root.BateriaCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    const VALID_KEYS = new Set(['q', 'w', 'e', 'a', 's', 'd', 'z', 'x', 'c']);

    function parsePattern(value, gridSteps = 16) {
        const pattern = [];

        [...String(value ?? '').toLowerCase()].forEach((character) => {
            if (VALID_KEYS.has(character)) {
                pattern.push(`key${character}`);
                return;
            }

            if (/\s/.test(character) || character === '.' || character === '-') {
                pattern.push(null);
            }
        });

        return pattern.slice(0, gridSteps);
    }

    function normalizePattern(pattern, sampleUrls, gridSteps = 16) {
        if (!Array.isArray(pattern)) return Array(gridSteps).fill(null);

        return Array.from({ length: gridSteps }, (_, index) => {
            const sound = pattern[index];
            return sound === null || sampleUrls?.[sound] ? sound ?? null : null;
        });
    }

    function soundToKey(sound) {
        return sound ? sound.slice(-1) : '-';
    }

    function normalizeChannelState(state) {
        const rawVolume = Number(state?.volume);
        return {
            volume: Number.isFinite(rawVolume) ? Math.min(1, Math.max(0, rawVolume)) : 1,
            muted: Boolean(state?.muted),
            solo: Boolean(state?.solo)
        };
    }

    function encodePortableState(state) {
        const json = JSON.stringify(state);

        if (typeof Buffer !== 'undefined' && typeof window === 'undefined') {
            return Buffer.from(json, 'utf8').toString('base64url');
        }

        const bytes = new TextEncoder().encode(json);
        let binary = '';
        bytes.forEach((byte) => { binary += String.fromCharCode(byte); });

        return btoa(binary)
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/g, '');
    }

    function decodePortableState(encoded) {
        try {
            let json;

            if (typeof Buffer !== 'undefined' && typeof window === 'undefined') {
                json = Buffer.from(String(encoded), 'base64url').toString('utf8');
            } else {
                const normalized = String(encoded).replace(/-/g, '+').replace(/_/g, '/');
                const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4);
                const binary = atob(padded);
                const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
                json = new TextDecoder().decode(bytes);
            }

            const parsed = JSON.parse(json);
            if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.pattern)) return null;
            return parsed;
        } catch (_) {
            return null;
        }
    }

    return {
        parsePattern,
        normalizePattern,
        soundToKey,
        normalizeChannelState,
        encodePortableState,
        decodePortableState
    };
});
