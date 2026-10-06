const test = require('node:test');
const assert = require('node:assert/strict');
const Core = require('../js/core.js');

const samples = Object.fromEntries(['q','w','e','a','s','d','z','x','c'].map((key) => [`key${key}`, true]));

test('parsePattern converts valid keys and pauses, ignoring other characters', () => {
    assert.deepEqual(
        Core.parsePattern('Qw- e!z', 16),
        ['keyq', 'keyw', null, null, 'keye', 'keyz']
    );
});

test('parsePattern is capped to the requested number of steps', () => {
    assert.equal(Core.parsePattern('qweasdzxcqweasdzxc', 16).length, 16);
});

test('normalizePattern preserves valid sounds and replaces invalid entries with rests', () => {
    const normalized = Core.normalizePattern(['keyq', 'bad', null, 'keyw'], samples, 4);
    assert.deepEqual(normalized, ['keyq', null, null, 'keyw']);
});

test('normalizePattern returns a fixed-size empty grid for invalid input', () => {
    assert.deepEqual(Core.normalizePattern('not-array', samples, 4), [null, null, null, null]);
});

test('normalizeChannelState preserves zero volume and clamps out-of-range values', () => {
    assert.deepEqual(Core.normalizeChannelState({ volume: 0, muted: true, solo: false }), {
        volume: 0,
        muted: true,
        solo: false
    });
    assert.equal(Core.normalizeChannelState({ volume: 4 }).volume, 1);
    assert.equal(Core.normalizeChannelState({ volume: -2 }).volume, 0);
    assert.equal(Core.normalizeChannelState({}).volume, 1);
});

test('portable state round-trips without losing musical state', () => {
    const state = {
        version: 1,
        pattern: ['keyq', null, 'keyw'],
        bpm: 127,
        swing: 63,
        kit: 'studio-cc0',
        channels: {
            keyq: { volume: 0.8, muted: false, solo: true }
        }
    };

    const encoded = Core.encodePortableState(state);
    assert.match(encoded, /^[A-Za-z0-9_-]+$/);
    assert.deepEqual(Core.decodePortableState(encoded), state);
});

test('portable state rejects malformed or unsupported payloads', () => {
    assert.equal(Core.decodePortableState('not-valid-base64'), null);
    const wrongVersion = Core.encodePortableState({ version: 2, pattern: [] });
    assert.equal(Core.decodePortableState(wrongVersion), null);
    const noPattern = Core.encodePortableState({ version: 1 });
    assert.equal(Core.decodePortableState(noPattern), null);
});
