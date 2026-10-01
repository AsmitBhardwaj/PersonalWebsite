import { test as base, expect } from '@playwright/test';

/** localStorage key the app reads for the sound toggle (see src/audio/clack.ts). */
export const MUTE_KEY = 'sidekick:muted';

/**
 * `test` with the device sounds muted before any page script runs, so a run is silent. The init script only fills an empty
 * slot, so a test that toggles the sound keeps its own choice across reloads. Specs that need sound on use `test.use({ muted: false })`.
 */
export const test = base.extend<{ muted: boolean }>({
  muted: [true, { option: true }],
  page: async ({ page, muted }, provide) => {
    await page.addInitScript(({ key, mute }) => {
      try { if (mute && window.localStorage.getItem(key) === null) window.localStorage.setItem(key, '1'); } catch { /* storage unavailable: the Chromium flag still mutes */ }
    }, { key: MUTE_KEY, mute: muted });
    await provide(page);
  },
});

export { expect };
