import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

async function openPhotos(page: Page) {
  await page.goto('/');
  const skip = page.getByRole('button', { name: 'Skip intro' });
  if (await skip.count()) await skip.click();
  await expect(page.locator('.device-stage')).toHaveAttribute('data-phase', 'open');
  await page.getByRole('button', { name: 'Open Photos', exact: true }).first().click();
  await expect(page.locator('.photos-grid')).toBeVisible();
  // Wait for the camera zoom or focus-mode transition to finish.
  await expect(page.locator('.device-stage')).not.toHaveAttribute('data-zoom', 'enter');
  await expect(page.locator('.device-stage')).not.toHaveAttribute('data-focus', 'enter');
}

const tiles = (page: Page) => page.locator('.photos-tile');
const viewer = (page: Page) => page.locator('.photo-viewer');
const counter = (page: Page) => page.locator('.photo-viewer__count');

test('Photos shows the profile and a 3-column grid of lazy thumbnails', async ({ page }) => {
  await openPhotos(page);
  await expect(page.getByRole('heading', { name: 'Asmit Bhardwaj' })).toBeVisible();
  await expect(page.locator('.photos-count')).toContainText(/\d+\s+posts?/);
  await expect(page.getByRole('link', { name: /Instagram/ })).toHaveCount(0);
  const count = await tiles(page).count();
  expect(count).toBeGreaterThanOrEqual(3);
  await expect(tiles(page).first().locator('img')).toHaveAttribute('loading', 'lazy');
  await expect(tiles(page).first()).toHaveAttribute('data-loaded', 'true');
  const box = async (index: number) => (await tiles(page).nth(index).boundingBox())!;
  const first = await box(0), second = await box(1);
  expect(Math.abs(first.width - first.height)).toBeLessThan(1.5); // square crop
  expect(second.x).toBeGreaterThan(first.x);
  expect(Math.abs(second.y - first.y)).toBeLessThan(1.5); // same row
  if (count >= 3) expect(Math.abs((await box(2)).y - first.y)).toBeLessThan(1.5); // three to a row
  if (count > 3) {
    const fourth = await box(3);
    expect(fourth.y).toBeGreaterThan(first.y + first.height - 1); // the 4th photo starts the second row
    expect(Math.abs(fourth.x - first.x)).toBeLessThan(1.5);
  }
});

test('d-pad moves the highlight, Enter opens, arrows page, Escape goes back to the grid, then home', async ({ page }) => {
  await openPhotos(page);
  await page.keyboard.press('ArrowRight');
  await expect(tiles(page).nth(0)).toHaveClass(/is-highlighted/);
  await page.keyboard.press('ArrowRight');
  await expect(tiles(page).nth(1)).toHaveClass(/is-highlighted/);
  await page.keyboard.press('Enter');
  await expect(viewer(page)).toBeVisible();
  const total = await tiles(page).count();
  await expect(counter(page)).toHaveText(`2 / ${total}`);
  await page.keyboard.press('ArrowRight');
  await expect(counter(page)).toHaveText(`3 / ${total}`);
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  await expect(counter(page)).toHaveText(`1 / ${total}`);
  await page.keyboard.press('ArrowLeft'); // clamps at the first photo
  await expect(counter(page)).toHaveText(`1 / ${total}`);

  await page.keyboard.press('Escape');
  await expect(viewer(page)).toHaveCount(0);
  await expect(page.locator('.photos-grid')).toBeVisible();
  await expect(tiles(page).nth(0)).toHaveClass(/is-highlighted/);
  await page.keyboard.press('Escape'); // grid showing: Escape leaves the app
  await expect(page.getByRole('button', { name: 'Open Contact', exact: true }).first()).toBeVisible();
});

test('clicking a photo opens it with its caption; the Back button returns', async ({ page }) => {
  await openPhotos(page);
  const captioned = page.locator('.photos-tile[aria-label^="Open photo:"]').first(); // the placeholders ship captions; real photos may have none
  test.skip(await captioned.count() === 0, 'no photo has a caption');
  await captioned.click();
  await expect(viewer(page)).toBeVisible();
  await expect(viewer(page).locator('img')).toBeVisible();
  await expect(viewer(page).locator('.photo-viewer__caption p')).not.toBeEmpty();
  await page.getByRole('button', { name: 'Back to photos' }).click();
  await expect(viewer(page)).toHaveCount(0);
});

test.describe('on a phone: focus mode and swipes', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('opens full-screen, swipes between photos, and Back returns to the grid before leaving', async ({ page }) => {
    await openPhotos(page);
    await expect(page.locator('.device-stage')).toHaveAttribute('data-focus', 'on');
    await tiles(page).nth(0).click();
    await expect(viewer(page)).toBeVisible();
    const total = await tiles(page).count();
    await expect(counter(page)).toHaveText(`1 / ${total}`);

    const stage = page.locator('.photo-viewer__stage');
    const box = (await stage.boundingBox())!;
    const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
    const touch = (type: string, x: number, y: number) => stage.dispatchEvent(type, { pointerId: 9, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y, bubbles: true });
    const swipe = async (dx: number, dy = 0) => { await touch('pointerdown', cx, cy); await touch('pointermove', cx + dx, cy + dy); await touch('pointerup', cx + dx, cy + dy); };

    await swipe(-120); // swipe left: next
    await expect(counter(page)).toHaveText(`2 / ${total}`);
    await swipe(0, -120); // a vertical swipe does not page
    await expect(counter(page)).toHaveText(`2 / ${total}`);
    await swipe(10); // too short
    await expect(counter(page)).toHaveText(`2 / ${total}`);
    await swipe(120); // swipe right: previous
    await expect(counter(page)).toHaveText(`1 / ${total}`);

    await page.getByRole('button', { name: 'Back to phone home' }).click(); // the nav bar's Back leaves the viewer first
    await expect(viewer(page)).toHaveCount(0);
    await expect(page.locator('.photos-grid')).toBeVisible();
    await expect(page.locator('.device-stage')).toHaveAttribute('data-focus', 'on');
    await page.getByRole('button', { name: 'Back to phone home' }).click();
    await expect(page.getByRole('button', { name: 'Open Contact', exact: true }).first()).toBeVisible();
  });
});
