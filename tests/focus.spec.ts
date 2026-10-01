import { expect, test, type Page } from '@playwright/test';

async function openApp(page: Page, name: string) {
  await page.goto('/');
  const skip = page.getByRole('button', { name: 'Skip intro' });
  if (await skip.count()) await skip.click(); // reduced motion has no intro to skip
  await expect(page.locator('.device-stage')).toHaveAttribute('data-phase', 'open');
  await page.getByRole('button', { name: `Open ${name}`, exact: true }).first().click();
}

const stage = (page: Page) => page.locator('.device-stage');
const homeVisible = (page: Page) => expect(page.getByRole('button', { name: 'Open Contact', exact: true }).first()).toBeVisible();

async function expectFillsViewport(page: Page) {
  const viewport = page.viewportSize()!;
  const box = (await page.locator('.screen-shell').boundingBox())!;
  expect(box.x).toBeLessThanOrEqual(1);
  expect(box.y).toBeLessThanOrEqual(1);
  expect(box.width).toBeGreaterThanOrEqual(viewport.width - 1);
  expect(box.height).toBeGreaterThanOrEqual(viewport.height - 1);
}

async function minBodyFont(page: Page) {
  return page.evaluate(() => Math.min(...Array.from(document.querySelectorAll('.app-host p:not(.eyebrow), .app-host li'))
    .filter((el) => el.textContent?.trim())
    .map((el) => parseFloat(getComputedStyle(el).fontSize))));
}

test.describe('focus mode on a phone viewport', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('enters on open, readable text, exits with the Back control', async ({ page }) => {
    await openApp(page, 'Projects');
    await expect(stage(page)).toHaveAttribute('data-focus', 'on');
    await expectFillsViewport(page);
    expect(await minBodyFont(page)).toBeGreaterThanOrEqual(14);
    await expect(page.locator('.status-bar')).toBeVisible();
    await page.getByRole('button', { name: 'Back to phone home' }).click();
    await expect(stage(page)).not.toHaveAttribute('data-focus', /.*/);
    await homeVisible(page);
    const shell = (await page.locator('.screen-shell').boundingBox())!;
    expect(shell.height).toBeLessThan(220);
  });

  test('Escape and the browser back gesture both return home', async ({ page }) => {
    await openApp(page, 'Projects');
    await expect(stage(page)).toHaveAttribute('data-focus', 'on');
    await page.keyboard.press('Escape');
    await expect(stage(page)).not.toHaveAttribute('data-focus', /.*/);
    await homeVisible(page);

    await page.getByRole('button', { name: 'Open Projects', exact: true }).first().click();
    await expect(stage(page)).toHaveAttribute('data-focus', 'on');
    await page.goBack();
    await expect(stage(page)).not.toHaveAttribute('data-focus', /.*/);
    await homeVisible(page);
    expect(page.url()).toMatch(/\/$/);
  });

  test('projects header collapses to a sticky bar and the pager stays reachable', async ({ page }) => {
    await openApp(page, 'Projects');
    await expect(stage(page)).toHaveAttribute('data-focus', 'on');
    const scroller = page.locator('.project-scroll');
    await scroller.evaluate((el) => { el.scrollTop = el.scrollHeight; });
    const bar = (await page.locator('.project-bar').boundingBox())!;
    const area = (await scroller.boundingBox())!;
    expect(Math.abs(bar.y - area.y)).toBeLessThanOrEqual(1);
    expect(bar.height).toBeLessThan(60);
    await expect(page.getByRole('button', { name: 'Next project' })).toBeInViewport();
  });

  test('Type fills the focus area and keeps its words inside the play field', async ({ page }) => {
    await openApp(page, 'Type');
    await expect(stage(page)).toHaveAttribute('data-focus', 'on');
    await expectFillsViewport(page);
    await page.keyboard.press('Enter');
    await expect(page.locator('.type-word').first()).toBeVisible();
    const inside = () => page.evaluate(() => {
      const field = document.querySelector('.type-field')!.getBoundingClientRect();
      return Array.from(document.querySelectorAll('.type-word:not(.type-pop)')).every((el) => {
        const r = el.getBoundingClientRect();
        return r.left >= field.left - 1 && r.right <= field.right + 1 && r.top >= field.top - 1 && r.bottom <= field.bottom + 1;
      });
    });
    expect(await inside()).toBe(true);
    const focusedField = (await page.locator('.type-field').boundingBox())!;
    expect(focusedField.height).toBeGreaterThan(400);
    await page.keyboard.press('Escape');
    await expect(stage(page)).not.toHaveAttribute('data-focus', /.*/);
    await homeVisible(page);
  });

  test('reduced motion crossfades into and out of focus mode', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openApp(page, 'Projects');
    await expect(stage(page)).toHaveAttribute('data-focus', 'on');
    await expectFillsViewport(page);
    await page.keyboard.press('Escape');
    await expect(stage(page)).not.toHaveAttribute('data-focus', /.*/);
    await homeVisible(page);
  });
});

test.describe('focus mode in landscape and on desktop', () => {
  test('390 landscape focuses and keeps text readable', async ({ page }) => {
    await page.setViewportSize({ width: 844, height: 390 });
    await openApp(page, 'Projects');
    await expect(stage(page)).toHaveAttribute('data-focus', 'on');
    await expectFillsViewport(page);
    expect(await minBodyFont(page)).toBeGreaterThanOrEqual(14);
  });

  test('desktop keeps games inside the device with no zoom', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openApp(page, 'Type');
    await expect(page.locator('.type-game')).toBeVisible();
    await expect(stage(page)).not.toHaveAttribute('data-focus', /.*/);
    await expect(stage(page)).not.toHaveAttribute('data-zoom', /.*/);
    expect(await wrapperScale(page)).toBe(1);
    const shell = (await page.locator('.screen-shell').boundingBox())!;
    expect(shell.width).toBeLessThan(500);
  });

  test('resizing across modes: zoom on desktop, focus on a phone, zoom again', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openApp(page, 'Projects');
    await expect(stage(page)).toHaveAttribute('data-zoom', 'on');
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(stage(page)).toHaveAttribute('data-focus', 'on');
    await expect(stage(page)).not.toHaveAttribute('data-zoom', /.*/);
    expect(await wrapperScale(page)).toBe(1);
    await expectFillsViewport(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(stage(page)).toHaveAttribute('data-zoom', 'on');
    await expect(stage(page)).not.toHaveAttribute('data-focus', /.*/);
    await expect(page.getByRole('heading', { name: 'Platter' })).toBeVisible();
  });
});

const wrapperScale = (page: Page) => page.evaluate(() => {
  const transform = getComputedStyle(document.querySelector('.device-wrap')!).transform;
  return transform === 'none' ? 1 : new DOMMatrix(transform).a;
});

for (const viewport of [{ width: 1440, height: 900 }, { width: 1280, height: 720 }]) {
  test.describe(`camera zoom at ${viewport.width}x${viewport.height}`, () => {
    test.use({ viewport });

    test('reading apps zoom the device, text is 16px+, page does not scroll, Escape zooms out', async ({ page, isMobile }) => {
      test.skip(isMobile, 'The desktop camera zoom is not used on a touch phone, and mobile WebKit has no mouse wheel.');
      await openApp(page, 'Projects');
      await expect(stage(page)).toHaveAttribute('data-zoom', 'on');
      await expect(stage(page)).not.toHaveAttribute('data-focus', /.*/);
      const shell = (await page.locator('.screen-shell').boundingBox())!;
      expect(shell.height / viewport.height).toBeGreaterThan(0.58);
      expect(shell.height / viewport.height).toBeLessThan(0.66);
      expect(Math.abs(shell.x + shell.width / 2 - viewport.width / 2)).toBeLessThan(3);
      expect(Math.abs(shell.y + shell.height / 2 - viewport.height / 2)).toBeLessThan(3);
      const effective = await page.evaluate(() => {
        const p = document.querySelector('.project-body p')!;
        return parseFloat(getComputedStyle(p).fontSize) * p.getBoundingClientRect().height / (p as HTMLElement).offsetHeight;
      });
      expect(effective).toBeGreaterThanOrEqual(16);
      const scroll = await page.evaluate(() => ({ overflow: getComputedStyle(document.documentElement).overflow, fits: document.documentElement.scrollHeight <= innerHeight }));
      expect(scroll).toEqual({ overflow: 'hidden', fits: true });
      await page.mouse.wheel(0, 600);
      expect(await page.evaluate(() => window.scrollY)).toBe(0);

      // The dispatcher still routes keys to the app, and the hitboxes are scaled with the device.
      await page.keyboard.press('ArrowDown');
      await expect.poll(() => page.locator('.project-scroll').evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
      const space = (await page.locator('[data-control-id="key-space"]').boundingBox())!;
      expect(space.width).toBeGreaterThan(288 / 1586 * 900 * 1.5);

      await page.keyboard.press('Escape');
      await expect(stage(page)).not.toHaveAttribute('data-zoom', /.*/);
      await homeVisible(page);
      expect(await wrapperScale(page)).toBe(1);
    });

    test('Home on the screen zooms back out, and reduced motion crossfades', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await openApp(page, 'About');
      await expect(stage(page)).toHaveAttribute('data-zoom', 'on');
      expect(await wrapperScale(page)).toBeGreaterThan(1.5);
      await page.locator('.screen-nav').getByRole('button', { name: 'Phone home', exact: true }).click();
      await expect(stage(page)).not.toHaveAttribute('data-zoom', /.*/);
      await homeVisible(page);
    });
  });
}

test.describe('touch keyboard for games on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('Type is playable by tapping the on-screen keys', async ({ page }) => {
    await openApp(page, 'Type');
    await expect(stage(page)).toHaveAttribute('data-focus', 'on');
    const dock = (await page.locator('.touch-kbd').boundingBox())!;
    expect(dock.width).toBeGreaterThan(360); // full width
    expect(dock.y + dock.height).toBeGreaterThan(844 - 20); // along the bottom
    const field = (await page.locator('.type-field').boundingBox())!;
    expect(field.y + field.height).toBeLessThanOrEqual(dock.y);
    expect(field.height).toBeGreaterThan(300);
    await expect(page.locator('.touch-arrows')).toHaveCount(0); // Type does not use arrows

    const key = (id: string) => page.locator(`.touch-key[data-control-id="${id}"]`);
    await key('key-enter').tap();
    await expect(page.locator('.type-word').first()).toBeVisible();

    // A held key lights up and releases.
    await key('key-q').dispatchEvent('pointerdown');
    await expect(key('key-q')).toHaveClass(/is-pressed/);
    await key('key-q').dispatchEvent('pointerup');
    await expect(key('key-q')).not.toHaveClass(/is-pressed/);
    expect(await page.evaluate(() => document.activeElement?.tagName)).not.toBe('INPUT');

    // Tap out whole words until one clears and the score goes up.
    const score = () => page.locator('.type-hud b').first().innerText().then(Number);
    for (let attempt = 0; attempt < 5 && (await score()) === 0; attempt++) {
      const word = (await page.locator('.type-word:not(.type-pop)').last().innerText()).trim();
      for (const letter of word) {
        const id = /[a-z]/.test(letter) ? `key-${letter}` : letter === ' ' ? 'key-space' : null;
        if (id) await key(id).tap();
      }
    }
    expect(await score()).toBeGreaterThan(0);
  });
});

test.describe('sideways phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('games pause behind a rotate prompt in landscape and resume in portrait', async ({ page }) => {
    await openApp(page, 'Type');
    await expect(stage(page)).toHaveAttribute('data-focus', 'on');
    await page.locator('.touch-key[data-control-id="key-enter"]').tap();
    const word = page.locator('.type-word:not(.type-pop)').first();
    await expect(word).toBeVisible();
    await expect(page.locator('.rotate-prompt')).toHaveCount(0);

    await page.setViewportSize({ width: 844, height: 390 });
    await expect(page.locator('.rotate-prompt')).toBeVisible();
    await expect(page.locator('.rotate-prompt')).toContainText('Rotate to portrait to play');
    await expect(page.locator('.touch-kbd')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Back to phone home' })).toBeInViewport(); // Back stays reachable
    const top = () => word.evaluate((el) => (el as HTMLElement).style.getPropertyValue('--y'));
    const frozen = await top();
    await page.waitForTimeout(600);
    expect(await top()).toBe(frozen); // the game is paused

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator('.rotate-prompt')).toHaveCount(0);
    await expect(page.locator('.touch-kbd')).toBeVisible();
    await expect.poll(top).not.toBe(frozen); // and picks up again
  });

  test('reading apps are unaffected when sideways', async ({ page }) => {
    await page.goto('/'); // Firefox hangs on a viewport resize before the first navigation
    await page.setViewportSize({ width: 844, height: 390 });
    await openApp(page, 'Projects');
    await expect(stage(page)).toHaveAttribute('data-focus', 'on');
    await expect(page.locator('.rotate-prompt')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Platter' })).toBeVisible();
  });
});

test.describe('key lighting on the device art', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  const light = (page: Page, id: string) => page.locator(`[data-control-id="${id}"] .key-light`);
  const opacity = (page: Page, id: string) => light(page, id).evaluate((el) => parseFloat(getComputedStyle(el).opacity));

  test('a physical keypress lights the matching key, several keys glow at once, and it fades on release', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Skip intro' }).click();
    await expect(stage(page)).toHaveAttribute('data-phase', 'open');
    expect(await opacity(page, 'key-a')).toBe(0);

    await page.keyboard.down('a');
    await page.keyboard.down('s');
    await expect.poll(() => opacity(page, 'key-a')).toBe(1);
    await expect.poll(() => opacity(page, 'key-s')).toBe(1);
    const look = await light(page, 'key-a').evaluate((el) => {
      const css = getComputedStyle(el);
      const box = el.getBoundingClientRect();
      const key = el.parentElement!.getBoundingClientRect();
      return { shadow: css.boxShadow, background: css.backgroundImage, shift: css.transform, insetX: box.left - key.left, width: box.width, keyWidth: key.width };
    });
    expect(look.shadow).toContain('rgba(74, 125, 255');
    expect(look.shadow).toContain('inset');
    expect(look.background).toContain('radial-gradient');
    expect(look.shift).not.toBe('none');
    expect(look.insetX).toBeGreaterThan(0); // slightly inset: reads as the key, not a box on top
    expect(look.width).toBeLessThan(look.keyWidth);
    await page.screenshot({ path: 'test-results/key-lit-home-1440x900.png' });

    await page.keyboard.up('a');
    await page.keyboard.up('s');
    await expect.poll(() => opacity(page, 'key-a')).toBe(0);
    await expect.poll(() => opacity(page, 'key-s')).toBe(0);
  });

  test('d-pad, trackball and back buttons light, in an app and while zoomed', async ({ page }) => {
    await openApp(page, 'Projects');
    await expect(stage(page)).toHaveAttribute('data-zoom', 'on');
    await page.keyboard.down('ArrowDown');
    await expect.poll(() => opacity(page, 'dpad-down')).toBe(1);
    await page.screenshot({ path: 'test-results/key-lit-zoom-1440x900.png' });
    await page.keyboard.up('ArrowDown');
    await page.locator('[data-control-id="control-trackball"]').dispatchEvent('pointerdown');
    await expect.poll(() => opacity(page, 'control-trackball')).toBe(1);
    expect(await light(page, 'control-trackball').evaluate((el) => getComputedStyle(el).borderRadius)).toBe('50%');
    await page.locator('[data-control-id="control-trackball"]').dispatchEvent('pointerup');
  });

  test('in-device games light keys while typing', async ({ page }) => {
    await openApp(page, 'Type');
    await page.keyboard.down('q');
    await expect.poll(() => opacity(page, 'key-q')).toBe(1);
    await page.screenshot({ path: 'test-results/key-lit-game-1440x900.png' });
    await page.keyboard.up('q');
  });
});
