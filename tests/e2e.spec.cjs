const { test, expect, devices } = require('@playwright/test');

const baseURL = 'http://127.0.0.1:4173';

test.beforeEach(async ({ page }) => {
    await page.goto(baseURL);
    await expect(page.locator('#playback-status')).toHaveText('Pronto');
});

test('loads the complete instrument shell without horizontal overflow', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'BD—16' })).toBeVisible();
    await expect(page.locator('[data-key]')).toHaveCount(9);
    await expect(page.locator('.step-button')).toHaveCount(16);

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(overflow).toBe(false);
});

test('quick pattern updates the 16-step grid without requiring playback', async ({ page }) => {
    await page.locator('#input').fill('qw-e');
    const values = page.locator('.step-button__value');

    await expect(values.nth(0)).toHaveText('Q');
    await expect(values.nth(1)).toHaveText('W');
    await expect(values.nth(2)).toHaveText('·');
    await expect(values.nth(3)).toHaveText('E');
});

test('selecting a pad and editing a step updates the observable pattern state', async ({ page }) => {
    await page.locator('[data-key="keyw"]').click();
    await expect(page.locator('#selected-sound')).toContainText('W');

    const firstStep = page.locator('.step-button').first();
    await firstStep.click();
    await expect(firstStep).toHaveAttribute('aria-pressed', 'true');
    await expect(firstStep.locator('.step-button__value')).toHaveText('W');
    await expect(page.locator('#input')).toHaveValue('w');

    await firstStep.click();
    await expect(firstStep).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('#input')).toHaveValue('');
});

test('working pattern and BPM survive reload through localStorage', async ({ page }) => {
    await page.locator('#input').fill('q-e-s');
    await page.locator('#tempo').evaluate((element) => {
        element.value = '137';
        element.dispatchEvent(new Event('input', { bubbles: true }));
    });

    await page.reload();

    await expect(page.locator('#input')).toHaveValue('q-e-s');
    await expect(page.locator('#tempo')).toHaveValue('137');
    await expect(page.locator('#tempo-value')).toHaveText('137 BPM');
});

test('saved slot survives reload and restores its pattern and BPM', async ({ page }) => {
    await page.locator('#input').fill('q---s---q---s');
    await page.locator('#tempo').evaluate((element) => {
        element.value = '126';
        element.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.locator('#save-slot').click();

    await page.locator('#input').fill('www');
    await page.reload();
    await page.locator('[data-slot="A"]').click();

    await expect(page.locator('#input')).toHaveValue('q---s---q---s');
    await expect(page.locator('#tempo')).toHaveValue('126');
    await expect(page.locator('#playback-status')).toHaveText('Slot A carregado');
});

test('shared URL state overrides pre-existing local state', async ({ page }) => {
    await page.evaluate(() => {
        localStorage.setItem('bateria-digital:state:v1', JSON.stringify({
            version: 1,
            activeSlot: 'A',
            working: {
                pattern: ['keyw'],
                bpm: 91,
                swing: 50,
                kit: 'original',
                channels: {}
            },
            slots: {}
        }));
    });

    const payload = await page.evaluate(() => window.BateriaCore.encodePortableState({
        version: 1,
        pattern: ['keyq', null, 'keys', null],
        bpm: 144,
        swing: 62,
        kit: 'studio-cc0',
        channels: {}
    }));

    await page.goto('about:blank');
    await page.goto(`${baseURL}/#p=${payload}`);

    await expect(page.locator('#input')).toHaveValue('q-s');
    await expect(page.locator('#tempo')).toHaveValue('144');
    await expect(page.locator('#swing')).toHaveValue('62');
    await expect(page.locator('#kit-select')).toHaveValue('studio-cc0');
});

test('invalid shared hash does not break the application', async ({ page }) => {
    await page.goto('about:blank');
    await page.goto(`${baseURL}/#p=invalid-payload`);
    await expect(page.locator('#playback-status')).toHaveText('Link de pattern inválido');
    await expect(page.locator('.step-button')).toHaveCount(16);
});

test.describe('mobile layout', () => {
    const iphone = devices['iPhone 13'];
    test.use({
        viewport: iphone.viewport,
        userAgent: iphone.userAgent,
        deviceScaleFactor: iphone.deviceScaleFactor,
        isMobile: iphone.isMobile,
        hasTouch: iphone.hasTouch
    });

    test('keeps critical controls usable without horizontal overflow', async ({ page }) => {
        await page.goto(baseURL);

        await expect(page.locator('[data-key]')).toHaveCount(9);
        await expect(page.locator('.step-button')).toHaveCount(16);
        await expect(page.locator('#stop')).toBeVisible();
        await expect(page.locator('#record-audio')).toBeVisible();

        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
        expect(overflow).toBe(false);

        await page.screenshot({ path: 'test-results/mobile-home.png', fullPage: true });
    });
});

test('captures a deterministic desktop evidence screenshot', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.screenshot({ path: 'test-results/desktop-home.png', fullPage: true });
});
