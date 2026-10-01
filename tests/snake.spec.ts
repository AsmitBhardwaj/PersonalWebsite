import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

async function openSnake(page: Page) {
  await page.goto('/');
  const skip = page.getByRole('button', { name: 'Skip intro' });
  if (await skip.count()) await skip.click();
  await expect(page.locator('.device-stage')).toHaveAttribute('data-phase', 'open');
  await page.getByRole('button', { name: 'Open Snake', exact: true }).first().click();
  await expect(page.locator('.snake-field')).toBeVisible();
  // Focus mode resizes the play field as it settles, and a resize resets the run: wait for a stable grid.
  let last = '';
  await expect.poll(async () => { const now = (await page.locator('.snake-field').getAttribute('data-grid')) ?? ''; const stable = now === last; last = now; return stable && now !== ''; }, { intervals: [400], timeout: 10_000 }).toBe(true);
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
