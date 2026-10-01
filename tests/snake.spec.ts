import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

async function openSnake(page: Page) {
  await page.goto('/');
  const skip = page.getByRole('button', { name: 'Skip intro' });
  if (await skip.count()) await skip.click();
  await expect(page.locator('.device-stage')).toHaveAttribute('data-phase', 'open');
  await page.getByRole('button', { name: 'Open Snake', exact: true }).first().click();
  await expect(page.locator('.snake-field')).toBeVisible();
  // Focus mode animates the play field to its final size (and the game holds still meanwhile): wait for the transition and the canvas to settle.
  await expect(page.locator('.device-stage')).not.toHaveAttribute('data-focus', 'enter');
  let last = '';
  await expect.poll(async () => { const box = await page.locator('.snake-field canvas').boundingBox(); const now = box ? [box.x, box.y, box.width, box.height].map((n) => n.toFixed(1)).join() : ''; const stable = now === last; last = now; return stable && now !== ''; }, { intervals: [200], timeout: 10_000 }).toBe(true);
}

const field = (page: Page) => page.locator('.snake-field');

test('Snake starts with Enter, turns with the arrow keys and ends against a wall', async ({ page }) => {
  await openSnake(page);
  await expect(page.locator('.type-overlay')).toContainText(/Press Enter to start|Tap to start/);
  await page.keyboard.press('Enter');
  await expect(field(page)).toHaveAttribute('data-head', /\d+,\d+/);
  await expect(page.locator('.snake-game')).toHaveAttribute('data-status', 'playing');
  await page.keyboard.press('ArrowDown');
  await expect(field(page)).toHaveAttribute('data-dir', 'down');
  await page.keyboard.press('ArrowLeft'); // not a reversal of down
  await expect(field(page)).toHaveAttribute('data-dir', 'left');
  await expect(page.locator('.snake-game')).toHaveAttribute('data-status', 'over', { timeout: 15_000 });
  await expect(page.locator('.type-overlay')).toContainText('retry');
});

test.describe('swipe on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('Tap starts, swipes steer, the arrow strip is shown', async ({ page }) => {
    await openSnake(page);
    await expect(page.locator('.device-stage')).toHaveAttribute('data-focus', 'on');
    await expect(page.locator('.type-overlay')).toContainText('Tap to start');
    await expect(page.locator('.touch-arrows')).toBeVisible();

    const box = (await field(page).boundingBox())!;
    const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
    const touch = (type: string, x: number, y: number) => field(page).dispatchEvent(type, { pointerId: 7, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y, bubbles: true });
    const swipe = async (dx: number, dy: number) => { await touch('pointerdown', cx, cy); await touch('pointermove', cx + dx, cy + dy); await touch('pointerup', cx + dx, cy + dy); };

    await touch('pointerdown', cx, cy); await touch('pointerup', cx, cy); // a tap
    await expect(page.locator('.snake-game')).toHaveAttribute('data-status', 'playing');

    await swipe(0, 80);
    await expect(field(page)).toHaveAttribute('data-dir', 'down');
    await swipe(-80, 0);
    await expect(field(page)).toHaveAttribute('data-dir', 'left');
  });
});

const read = (page: Page) => page.locator('.snake-game').evaluate((el) => ({ status: el.getAttribute('data-status'), score: Number(el.getAttribute('data-score')), length: Number(el.getAttribute('data-length')), grid: el.querySelector('.snake-field')!.getAttribute('data-grid') }));

test.describe('resizing mid-run', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('rescaling the play field keeps the grid, the score and the snake', async ({ page }) => {
    await openSnake(page);
    await page.keyboard.press('Enter');
    await expect(page.locator('.snake-game')).toHaveAttribute('data-status', 'playing');
    const before = await read(page);
    expect(before.grid).toBe('20x14');
    const canvasBefore = (await page.locator('.snake-field canvas').boundingBox())!;

    await page.setViewportSize({ width: 1000, height: 650 });
    await page.waitForTimeout(300);
    const after = await read(page);
    // Never reset: the run is still on (or ended by the wall, never back at the start screen), same grid, nothing lost.
    expect(after.status).not.toBe('start');
    expect(after.grid).toBe('20x14');
    expect(after.length).toBeGreaterThanOrEqual(before.length);
    expect(after.score).toBeGreaterThanOrEqual(before.score);
    expect(after.score).toBe((after.length - 3) * 10);
    const canvasAfter = (await page.locator('.snake-field canvas').boundingBox())!;
    expect(Math.abs(canvasAfter.width - canvasBefore.width)).toBeGreaterThan(5); // the cells rescaled, nothing else
    expect(Math.abs(canvasAfter.width / canvasAfter.height - 20 / 14)).toBeLessThan(0.05);
  });

  test('entering focus mode mid-run does not reset it', async ({ page }) => {
    await openSnake(page);
    await page.keyboard.press('Enter');
    await expect(page.locator('.snake-game')).toHaveAttribute('data-status', 'playing');
    const before = await read(page);
    await page.setViewportSize({ width: 390, height: 844 }); // the device now takes over the viewport
    await expect(page.locator('.device-stage')).toHaveAttribute('data-focus', 'on');
    const after = await read(page);
    expect(after.status).not.toBe('start');
    expect(after.grid).toBe('20x14');
    expect(after.length).toBeGreaterThanOrEqual(before.length);
    await page.setViewportSize({ width: 1280, height: 800 }); // and back out
    await expect(page.locator('.device-stage')).not.toHaveAttribute('data-focus', /.*/);
    const back = await read(page);
    expect(back.status).not.toBe('start');
    expect(back.grid).toBe('20x14');
  });
});

test.describe('focus transition on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('the field is letterboxed to the fixed grid and the run waits out the enter animation', async ({ page }) => {
    await openSnake(page);
    const field = (await page.locator('.snake-field').boundingBox())!;
    const canvas = (await page.locator('.snake-field canvas').boundingBox())!;
    expect(canvas.width).toBeLessThanOrEqual(field.width + 0.5);
    expect(canvas.height).toBeLessThanOrEqual(field.height + 0.5);
    expect(Math.abs(canvas.width / canvas.height - 20 / 14)).toBeLessThan(0.05);
  });
});
