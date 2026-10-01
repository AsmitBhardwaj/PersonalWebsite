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

  test('desktop keeps apps inside the device', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openApp(page, 'Projects');
    await expect(page.getByRole('heading', { name: 'Platter' })).toBeVisible();
    await expect(stage(page)).not.toHaveAttribute('data-focus', /.*/);
    const shell = (await page.locator('.screen-shell').boundingBox())!;
    expect(shell.width).toBeLessThan(500);
  });

  test('resizing from desktop to phone width enters focus mode, and back leaves it', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openApp(page, 'Projects');
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(stage(page)).toHaveAttribute('data-focus', 'on');
    await expectFillsViewport(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(stage(page)).not.toHaveAttribute('data-focus', /.*/);
    await expect(page.getByRole('heading', { name: 'Platter' })).toBeVisible();
  });
});
