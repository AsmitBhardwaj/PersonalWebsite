import { expect, test } from '@playwright/test';

const stage = (page: import('@playwright/test').Page) => page.locator('.device-stage');

test('captures the closed, swivel, and fully open states', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.mouse.move(1, 1);
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((image) => image.decode().catch(() => undefined)));
  });
  await expect(stage(page)).toHaveAttribute('data-phase', 'closed');
  await page.screenshot({ path: 'test-results/asset-closed-1440x900.png' });
  // The device wakes, then waits for a visitor. It never opens by itself.
  await expect(stage(page)).toHaveAttribute('data-phase', 'wake');
  await page.screenshot({ path: 'test-results/asset-wake-1440x900.png' });
  await page.waitForTimeout(1200);
  await expect(stage(page)).toHaveAttribute('data-phase', 'wake');

  // Phases last a couple of hundred ms, so record them instead of polling for each.
  await page.evaluate(() => {
    const el = document.querySelector('.device-stage')!;
    const w = window as unknown as { __phases: string[] };
    w.__phases = [];
    new MutationObserver(() => w.__phases.push(el.getAttribute('data-phase') ?? '')).observe(el, { attributes: true, attributeFilter: ['data-phase'] });
  });
  await page.keyboard.press('Enter');
  await page.screenshot({ path: 'test-results/asset-swivel-1440x900.png' });
  await expect(stage(page)).toHaveAttribute('data-phase', 'open');
  expect(await page.evaluate(() => (window as unknown as { __phases: string[] }).__phases)).toEqual(['swivel', 'mid-swivel', 'enter', 'open']);
  await expect(stage(page)).toHaveAttribute('data-ready', 'true');
  await page.screenshot({ path: 'test-results/asset-open-1440x900.png' });
});

test('reference comparison overlay aligns with the open device', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/?compareDevice=1');
  await page.getByRole('button', { name: 'Skip intro' }).click();
  await expect(stage(page)).toHaveAttribute('data-phase', 'open');
  await expect(page.locator('.reference-overlay')).toBeVisible();
  await page.mouse.move(1, 1);
  await page.screenshot({ path: 'test-results/asset-comparison-overlay-1440x900.png' });
});
