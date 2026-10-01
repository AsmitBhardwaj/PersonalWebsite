import { expect, test } from './fixtures';

test('intro can be skipped and phone apps work', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Skip intro' })).toBeVisible();
  await page.getByRole('button', { name: 'Skip intro' }).click();
  await expect(page.getByRole('button', { name: 'Open Projects', exact: true }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Open Projects', exact: true }).first().click();
  await expect(page.getByRole('heading', { name: 'Platter' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Open Contact', exact: true }).first()).toBeVisible();
});

test('reduced motion enters open state immediately', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Open Projects', exact: true }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Skip intro' })).toHaveCount(0);
});
