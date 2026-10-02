import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { SWIVEL } from '../src/components/device/swivelConfig';

const { ring } = SWIVEL;
const stage = (page: Page) => page.locator('.device-stage');
const lock = (page: Page) => page.locator('.lock-screen');
const pill = (page: Page) => page.locator('.open-prompt');
const runFor = (page: Page, ms: number) => page.clock.runFor(ms);
const buzzes = (page: Page) => stage(page).evaluate((el) => Number((el as HTMLElement).dataset.buzzes ?? 0));

/** Mocked time, page loaded, wake-up played, and nothing touched so the idle clock keeps running from load. */
async function load(page: Page) {
  await page.clock.install({ time: 0 });
  await page.clock.pauseAt(1000);
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  await runFor(page, 1000);
  await expect(stage(page)).toHaveAttribute('data-phase', 'wake');
}

/** Records the widest sideways shift of the stage and how many times it swung from one side to the other since this was called. */
async function watchShake(page: Page) {
  await page.evaluate(() => {
    const el = document.querySelector<HTMLElement>('.device-stage')!;
    const w = window as unknown as { __shake: { max: number; shakes: number } };
    w.__shake = { max: 0, shakes: 0 };
    let side = 0;
    const tick = () => {
      const x = new DOMMatrix(getComputedStyle(el).transform).m41;
      w.__shake.max = Math.max(w.__shake.max, Math.abs(x));
      if (Math.abs(x) > 0.5) { const now = Math.sign(x); if (side && now !== side) w.__shake.shakes += 1; side = now; }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}
const shake = (page: Page) => page.evaluate(() => (window as unknown as { __shake: { max: number; shakes: number } }).__shake);

test.describe('first visit: the phone rings', () => {
  test.use({ storageState: { cookies: [], origins: [] }, viewport: { width: 1440, height: 900 } });

  test('starts dimmed, buzzes at 1.5 s with a shake, wakes the screen and keeps the message up', async ({ page }) => {
    await load(page);
    await expect(lock(page)).toHaveAttribute('data-ring', 'idle');
    await expect(lock(page)).not.toContainText(ring.notification.body);
    await watchShake(page);
    await runFor(page, 400); // t = 1.4 s since load
    expect(await buzzes(page)).toBe(0);
    await runFor(page, 400);
    expect(await buzzes(page)).toBe(1);
    await runFor(page, 600);
    const s = await shake(page);
    expect(s.max).toBeGreaterThan(1);
    expect(s.max).toBeLessThanOrEqual(ring.shakePx + 0.5);
    expect(s.shakes).toBeGreaterThanOrEqual(3); // several quick pulses, not one drift
    await expect(lock(page)).toHaveAttribute('data-ring', 'awake');
    await expect(lock(page)).toContainText('1 new message');
    await expect(lock(page)).toContainText('asmit: hey, you found my sidekick');
    // The device is back at rest, and the message stays.
    expect(await stage(page).evaluate((el) => getComputedStyle(el).transform)).toMatch(/none|matrix\(1, 0, 0, 1, 0, 0\)/);
    await runFor(page, 2000);
    await expect(lock(page)).toContainText(ring.notification.body);
  });

  test('buzzes again every 5 s and stops after 3', async ({ page }) => {
    await load(page);
    await runFor(page, 1700); // 2.7 s after load: first buzz done
    expect(await buzzes(page)).toBe(1);
    await runFor(page, 3500);
    expect(await buzzes(page)).toBe(1);
    await runFor(page, 2000);
    expect(await buzzes(page)).toBe(2);
    await runFor(page, 5000);
    expect(await buzzes(page)).toBe(3);
    await runFor(page, 20_000); // past the 12 s auto-open too
    await expect(stage(page)).not.toHaveAttribute('data-phase', 'wake');
    expect(await buzzes(page)).toBe(3);
  });

  test('an interaction does not buy extra buzzes', async ({ page }) => {
    await load(page);
    await runFor(page, 1700);
    for (let i = 0; i < 6; i++) { await page.mouse.move(5 + i, 5); await runFor(page, 5600); if ((await stage(page).getAttribute('data-phase')) !== 'wake') break; }
    expect(await buzzes(page)).toBeLessThanOrEqual(ring.maxBuzzes);
  });

  test('the pill reads "Tap to read the message"', async ({ page }) => {
    await load(page);
    await expect(pill(page)).toHaveText(ring.pillText);
  });

  test('clicking the phone opens it with the swivel and clack, then the boot flow', async ({ page }) => {
    await load(page);
    await runFor(page, 2500);
    const box = (await page.locator('.display-assembly').boundingBox())!;
    await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.7);
    await runFor(page, 500);
    await expect(stage(page)).not.toHaveAttribute('data-phase', 'wake');
    await runFor(page, 3500);
    await expect(stage(page)).toHaveAttribute('data-phase', 'open');
    await expect(page.locator('.boot-seq')).toBeAttached();
  });

  test('Enter opens it too', async ({ page }) => {
    await load(page);
    await runFor(page, 2500);
    await page.keyboard.press('Enter');
    await runFor(page, 4000);
    await expect(stage(page)).toHaveAttribute('data-phase', 'open');
  });

  test('dragging the lid opens it', async ({ page }) => {
    await load(page);
    await runFor(page, 2500);
    const box = (await page.locator('.display-assembly').boundingBox())!;
    const x = box.x + box.width / 2;
    await page.mouse.move(x, box.y + box.height * 0.7);
    await page.mouse.down();
    for (let i = 1; i <= 10; i++) { await page.mouse.move(x, box.y + box.height * 0.7 - i * box.height * 0.1); await runFor(page, 32); }
    await page.mouse.up();
    await runFor(page, 4000);
    await expect(stage(page)).toHaveAttribute('data-phase', 'open');
  });

  test('the 12 s auto-open still applies', async ({ page }) => {
    await load(page);
    await runFor(page, 12_500);
    await expect(stage(page)).not.toHaveAttribute('data-phase', 'wake');
    await runFor(page, 3500);
    await expect(stage(page)).toHaveAttribute('data-phase', 'open');
  });
});

test.describe('first visit with reduced motion', () => {
  test.use({ storageState: { cookies: [], origins: [] }, viewport: { width: 1440, height: 900 } });

  test('shows the message statically, never shakes, and still opens', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await load(page);
    await watchShake(page);
    await expect(lock(page)).toHaveAttribute('data-ring', 'awake');
    await expect(lock(page)).toContainText(ring.notification.body);
    await expect(pill(page)).toHaveText(ring.pillText);
    await runFor(page, 15_000 - 2000); // idle past the buzz times, short of the auto-open
    expect(await buzzes(page)).toBe(0);
    expect((await shake(page)).max).toBe(0);
    await page.keyboard.press('Enter');
    await runFor(page, 1000);
    await expect(stage(page)).toHaveAttribute('data-phase', 'open');
  });
});

test.describe('returning visitor', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('gets no buzz, no message, the usual pill and the lid nudge', async ({ page }) => {
    await load(page);
    await expect(lock(page)).toHaveAttribute('data-ring', 'off');
    await expect(pill(page)).toHaveText('Tap, drag or press Enter to open');
    await page.evaluate(() => {
      const lid = document.querySelector<HTMLElement>('.display-assembly')!;
      const w = window as unknown as { __max: number };
      w.__max = 0;
      const tick = () => { w.__max = Math.max(w.__max, Number(/rotate\((-?[\d.]+)deg\)/.exec(lid.style.transform)?.[1] ?? 0)); requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    });
    await watchShake(page);
    await runFor(page, 2500); // 3.5 s after load: the lid nudge, not a buzz
    expect(await page.evaluate(() => (window as unknown as { __max: number }).__max)).toBeGreaterThan(5);
    expect(await buzzes(page)).toBe(0);
    expect((await shake(page)).max).toBe(0);
    await expect(lock(page)).not.toContainText(ring.notification.body);
  });
});
