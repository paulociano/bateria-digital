const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('css/main.css', 'utf8');

test('critical scripts load in dependency order', () => {
    const core = html.indexOf('js/core.js');
    const audio = html.indexOf('js/audio-engine.js');
    const main = html.indexOf('js/main.js');

    assert.ok(core >= 0, 'core.js must be referenced');
    assert.ok(core < main, 'core.js must load before main.js');
    assert.ok(audio >= 0 && audio < main, 'audio-engine.js must load before main.js');
});

test('interactive controls keep required accessible labels and types', () => {
    for (const id of ['loop','stop','clear','save-slot','demo-pattern','tap-tempo','share-pattern','record-audio','grid-play']) {
        assert.match(html, new RegExp(`<button[^>]*id="${id}"[^>]*type="button"`));
    }

    assert.match(html, /id="playback-status"[^>]*role="status"[^>]*aria-live="polite"/);
    assert.match(html, /id="record-audio"[^>]*aria-pressed="false"/);
});

test('motion and mobile breakpoints remain guarded', () => {
    assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
    assert.match(css, /@media \(max-width: 520px\)/);
    assert.match(css, /@media \(max-width: 760px\)/);
});

test('web fonts are requested from head without CSS @import', () => {
    assert.match(html, /rel="preconnect" href="https://fonts.googleapis.com"/);
    assert.match(html, /fonts.googleapis.com/css2/);
    assert.doesNotMatch(css, /@import\s+url\(/);
});

test('compact controls keep a 44px minimum touch target', () => {
    assert.match(css, /\.slot-button,[\s\S]*min-height:\s*44px/);
    assert.match(css, /\.utility-button[\s\S]*min-height:\s*44px/);
});

test('higher contrast preference has an explicit treatment', () => {
    assert.match(css, /@media \(prefers-contrast: more\)/);
});
