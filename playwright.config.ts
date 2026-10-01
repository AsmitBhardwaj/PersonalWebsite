import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  // states.spec polls short-lived intro phases, which a fully loaded machine can miss.
  workers: 2,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'on-first-retry',
    // Every test is a returning visitor unless it says otherwise, so the first-visit boot does not sit between it and the home screen.
    storageState: { cookies: [], origins: [{ origin: 'http://127.0.0.1:4173', localStorage: [{ name: 'sidekick:booted', value: '1' }] }] },
  },
  webServer: {
    command: 'npm run dev -- --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: true,
  },
  projects: [
    // --mute-audio keeps Chromium silent even where the page's own mute flag (tests/fixtures.ts) is not in play.
    { name: 'chromium', use: { ...devices['Desktop Chrome'], launchOptions: { args: ['--mute-audio'] } } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile-safari', use: { ...devices['iPhone 14'] } },
  ],
});
