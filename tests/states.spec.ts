import { expect, test } from '@playwright/test';

test('captures the closed, swivel, and fully open states', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.mouse.move(1, 1);
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((image) => image.decode().catch(() => undefined)));
  });
  await expect(page.locator('.device-stage')).toHaveAttribute('data-phase', 'closed');
  await page.screenshot({ path: 'test-results/asset-closed-1440x900.png' });
  await expect(page.locator('.device-stage')).toHaveAttribute('data-phase', 'wake');
  await page.screenshot({ path: 'test-results/asset-wake-1440x900.png' });
  await expect(page.locator('.device-stage')).toHaveAttribute('data-phase', 'mid-swivel');
  await page.screenshot({ path: 'test-results/asset-mid-swivel-1440x900.png' });
  await expect(page.locator('.device-stage')).toHaveAttribute('data-phase', 'enter');
  await expect(page.locator('.device-stage')).toHaveAttribute('data-ready', 'true');
  await expect(page.locator('.device-stage')).toHaveAttribute('data-phase', 'open');
  await page.screenshot({ path: 'test-results/asset-open-1440x900.png' });
});

test('reference comparison overlay aligns with the open device', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/?compareDevice=1');
  await page.getByRole('button', { name: 'Skip intro' }).click();
  await expect(page.locator('.device-stage')).toHaveAttribute('data-phase', 'open');
  await expect(page.locator('.reference-overlay')).toBeVisible();
  await page.mouse.move(1, 1);
  await page.screenshot({ path: 'test-results/asset-comparison-overlay-1440x900.png' });
});
