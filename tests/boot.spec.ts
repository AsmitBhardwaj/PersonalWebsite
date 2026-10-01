import { expect, test, type Page } from '@playwright/test';

const stage = (page: Page) => page.locator('.device-stage');
const boot = (page: Page) => page.locator('.boot-seq');
const home = (page: Page) => page.getByRole('button', { name: 'Open Projects', exact: true }).first();

async function openLid(page: Page) {
  await page.goto('/');
  await expect(stage(page)).toHaveAttribute('data-phase', 'wake');
  await page.keyboard.press('Enter');
}

test.describe('first visit', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('plays after the swivel, ends on home, and is skipped on the second visit', async ({ page }) => {
    await openLid(page);
    await expect(boot(page)).toBeAttached();
    await expect(boot(page)).toHaveAttribute('data-boot-stage', 'splash');
    await expect(boot(page)).toHaveAttribute('data-boot-stage', 'card');
    const link = page.getByRole('link', { name: 'Now on the App Store' });
    await expect(link).toHaveAttribute('href', /^https:\/\/apps\.apple\.com\/app\/id/);
    expect(await page.evaluate(() => window.localStorage.getItem('sidekick:booted'))).toBe('1');
    await page.screenshot({ path: 'test-results/boot-card.png' });
    await expect(boot(page)).toHaveCount(0, { timeout: 6000 });
    await expect(home(page)).toBeVisible();

    await openLid(page);
    await expect(stage(page)).toHaveAttribute('data-phase', 'open');
    await expect(stage(page)).toHaveAttribute('data-ready', 'true');
    await expect(home(page)).toBeVisible();
    await expect(boot(page)).toHaveCount(0);
  });

  test('a keypress skips straight to home without typing into the terminal', async ({ page }) => {
    await openLid(page);
    await expect(boot(page)).toHaveAttribute('data-boot-stage', 'splash');
    await page.keyboard.press('a');
    await expect(boot(page)).toHaveCount(0);
    await expect(home(page)).toBeVisible();
    await expect(page.getByTestId('command-buffer')).toHaveCount(0);
  });

  test('a tap on the App Store line opens it in a new tab and does not skip', async ({ page }) => {
    await page.context().route('**/apps.apple.com/**', (route) => route.fulfill({ body: 'store' }));
    await openLid(page);
    await expect(boot(page)).toHaveAttribute('data-boot-stage', 'card');
    const link = page.getByRole('link', { name: 'Now on the App Store' });
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('href', /apps\.apple\.com\/app\/id/);
    await link.click({ force: true });
    await expect(boot(page)).toHaveAttribute('data-boot-stage', 'card');
    await expect(boot(page)).toBeAttached();
  });

  test('a tap elsewhere on the screen skips', async ({ page }) => {
    await openLid(page);
    await expect(boot(page)).toHaveAttribute('data-boot-stage', 'splash');
    await boot(page).click({ position: { x: 4, y: 4 }, force: true });
    await expect(boot(page)).toHaveCount(0);
    await expect(home(page)).toBeVisible();
  });

  test('reduced motion shows the card at once, then home', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await expect(boot(page)).toHaveAttribute('data-boot-stage', 'card');
    await expect(boot(page)).toHaveCount(0, { timeout: 4000 });
    await expect(home(page)).toBeVisible();
  });
});

test('"reboot" replays the sequence for a returning visitor', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Skip intro' }).click();
  await expect(stage(page)).toHaveAttribute('data-ready', 'true');
  await expect(boot(page)).toHaveCount(0);
  await page.keyboard.type('reboot');
  await page.keyboard.press('Enter');
  await expect(boot(page)).toHaveAttribute('data-boot-stage', 'splash');
  await expect(boot(page)).toHaveAttribute('data-boot-stage', 'card');
  await page.keyboard.press('Enter');
  await expect(boot(page)).toHaveCount(0);
  await expect(home(page)).toBeVisible();
});
