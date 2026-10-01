import { expect, test } from '@playwright/test';

test('captures the closed, swivel, and fully open states', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.waitForTimeout(120);
  await page.screenshot({ path: 'test-results/state-closed-1440x900.png' });
  await page.waitForTimeout(1_430);
  await page.screenshot({ path: 'test-results/state-swivel-1440x900.png' });
  await page.waitForTimeout(1_550);
  await expect(page.locator('.device-stage')).toHaveAttribute('data-ready', 'true');
  await page.screenshot({ path: 'test-results/state-open-1440x900.png' });
});
