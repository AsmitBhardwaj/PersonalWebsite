import { expect, test } from '@playwright/test';

const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 1024, height: 768 },
  { name: 'mobile', width: 390, height: 844 },
];

for (const viewport of viewports) {
  test(`${viewport.name} device fits and renders`, async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    await page.setViewportSize(viewport);
    await page.goto('/');
    if (viewport.name === 'desktop') {
      await page.screenshot({ path: 'test-results/closed-1440x900.png' });
    }
    await page.getByRole('button', { name: 'Skip intro' }).click();
    await expect(page.locator('.device-stage')).toHaveAttribute('data-ready', 'true');
    await page.screenshot({ path: `test-results/open-${viewport.width}x${viewport.height}.png`, fullPage: true });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(overflow).toBe(false);
    expect(errors).toEqual([]);
  });
}
