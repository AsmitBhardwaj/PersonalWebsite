import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { START_RECT } from '../src/boot/bootConfig';

const BOOTED_KEY = 'sidekick:booted';
const stage = (page: Page) => page.locator('.device-stage');
const boot = (page: Page) => page.locator('.boot-seq');
const home = (page: Page) => page.getByRole('button', { name: 'Open Projects', exact: true }).first();
const startButton = (page: Page) => page.getByRole('button', { name: 'Start', exact: true });
const booted = (page: Page) => page.evaluate((key) => window.localStorage.getItem(key), BOOTED_KEY);

async function openLid(page: Page) {
  await page.goto('/');
  await expect(stage(page)).toHaveAttribute('data-phase', 'wake');
  await page.keyboard.press('Enter');
}

async function toCard(page: Page) {
  await openLid(page);
  await expect(boot(page)).toHaveAttribute('data-boot-stage', 'card');
  await expect(startButton(page)).toBeVisible();
}

/** A pixel on the Start face, away from the lettering and the highlight edge, as [r, g, b]. */
const startFace = (page: Page) => page.evaluate(({ x, y }) => {
  const canvas = document.querySelector<HTMLCanvasElement>('.boot-seq canvas')!;
  return [...canvas.getContext('2d')!.getImageData(x + 5, y + 3, 1, 1).data.slice(0, 3)];
}, START_RECT);

test.describe('first visit', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('plays after the swivel, holds the card until Start, then hands off to home and is skipped on the second visit', async ({ page }) => {
    await openLid(page);
    await expect(boot(page)).toBeAttached();
    await expect(boot(page)).toHaveAttribute('data-boot-stage', 'splash');
    await expect(boot(page)).toHaveAttribute('data-boot-stage', 'card');
    const link = page.getByRole('link', { name: 'Now on the App Store' });
    await expect(link).toHaveAttribute('href', /^https:\/\/apps\.apple\.com\/app\/id/);
    await expect(startButton(page)).toBeVisible();
    await page.screenshot({ path: 'test-results/boot-card.png' });

    // No auto-advance, and the boot flag waits for Start.
    await page.waitForTimeout(2500);
    await expect(boot(page)).toHaveAttribute('data-boot-stage', 'card');
    expect(await booted(page)).toBeNull();

    await startButton(page).click();
    await expect(boot(page)).toHaveCount(0);
    await expect(home(page)).toBeVisible();
    expect(await booted(page)).toBe('1');

    await openLid(page);
    await expect(stage(page)).toHaveAttribute('data-phase', 'open');
    await expect(stage(page)).toHaveAttribute('data-ready', 'true');
    await expect(home(page)).toBeVisible();
    await expect(boot(page)).toHaveCount(0);
  });

  test('leaving before Start leaves the flag unset, so the boot plays again', async ({ page }) => {
    await toCard(page);
    expect(await booted(page)).toBeNull();
    await page.reload();
    await openLid(page);
    await expect(boot(page)).toHaveAttribute('data-boot-stage', 'splash');
  });

  test('Enter starts it without typing into the terminal', async ({ page }) => {
    await toCard(page);
    await page.keyboard.press('Enter');
    await expect(boot(page)).toHaveCount(0);
    await expect(home(page)).toBeVisible();
    await expect(page.getByTestId('command-buffer')).toHaveCount(0);
    expect(await booted(page)).toBe('1');
  });

  for (const [name, id] of [['trackball', 'control-trackball'], ['D-pad centre', 'dpad-center']]) {
    test(`the ${name} starts it`, async ({ page }) => {
      await toCard(page);
      await page.locator(`[data-control-id="${id}"]`).dispatchEvent('click');
      await expect(boot(page)).toHaveCount(0);
      await expect(home(page)).toBeVisible();
      expect(await booted(page)).toBe('1');
    });
  }

  test('other keys, other controls and taps elsewhere on the card do nothing', async ({ page }) => {
    await toCard(page);
    for (const key of ['a', ' ', 'Escape', 'ArrowDown', 'Tab']) await page.keyboard.press(key);
    await boot(page).click({ position: { x: 4, y: 4 }, force: true });
    await page.locator('.boot-seq__lcd').click({ position: { x: 12, y: 12 }, force: true });
    await page.locator('[data-control-id="control-back"]').dispatchEvent('click');
    await page.locator('[data-control-id="dpad-up"]').dispatchEvent('click');
    await expect(boot(page)).toHaveAttribute('data-boot-stage', 'card');
    await expect(page.getByTestId('command-buffer')).toHaveCount(0);
    expect(await booted(page)).toBeNull();
  });

  test('nothing starts it during the backlight and splash', async ({ page }) => {
    await openLid(page);
    await expect(boot(page)).toHaveAttribute('data-boot-stage', 'splash');
    await page.locator('[data-control-id="control-trackball"]').dispatchEvent('click');
    await page.keyboard.press('Enter');
    await expect(boot(page)).toHaveAttribute('data-boot-stage', 'card');
    expect(await booted(page)).toBeNull();
  });

  test('the Start button shows a pressed state while it is held', async ({ page }) => {
    await toCard(page);
    await expect.poll(() => startFace(page)).toEqual([0x63, 0x78, 0x58]);
    const box = (await startButton(page).boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await expect.poll(() => startFace(page)).toEqual([0x4b, 0x5c, 0x43]);
    await page.mouse.up();
    await expect(boot(page)).toHaveCount(0);
  });

  test('reduced motion shows the same card with a Start button, no animation and no timeout', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openLid(page); // a first visit waits on the closed phone with its message, then crossfades open
    await expect(boot(page)).toHaveAttribute('data-boot-stage', 'card');
    await expect(startButton(page)).toBeVisible();
    await page.waitForTimeout(2500);
    await expect(boot(page)).toHaveAttribute('data-boot-stage', 'card');
    expect(await booted(page)).toBeNull();
    await startButton(page).click();
    await expect(boot(page)).toHaveCount(0);
    await expect(home(page)).toBeVisible();
    expect(await booted(page)).toBe('1');
  });
});

test('"reboot" replays the sequence for a returning visitor', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Skip intro' }).click();
  await expect(stage(page)).toHaveAttribute('data-ready', 'true');
  await expect(boot(page)).toHaveCount(0);
  await page.keyboard.type('reboot');
  await page.keyboard.press('Enter');
  await expect(boot(page)).toHaveAttribute('data-boot-stage', 'splash');
  await expect(boot(page)).toHaveAttribute('data-boot-stage', 'card');
  await page.keyboard.press('Enter');
  await expect(boot(page)).toHaveCount(0);
  await expect(home(page)).toBeVisible();
});
