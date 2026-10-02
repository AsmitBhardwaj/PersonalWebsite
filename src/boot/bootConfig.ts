/**
 * Everything tunable about the first-visit boot sequence. Durations are milliseconds, coordinates are pixels on the
 * 480x320 logical canvas (the Sidekick II display), colours are flat hex.
 */

/** The Apple ID of the Platter listing. Replace before the App Store line goes live. */
export const PLATTER_APPLE_ID = 'YOUR_APPLE_ID';
export const PLATTER_APP_STORE_URL = `https://apps.apple.com/app/id${PLATTER_APPLE_ID}`;
export const PLATTER_SITE_URL = 'https://platterapp.tech';

/** Flip to 'coming_soon' if App Store review runs long: the line changes and the tap goes to the website instead. */
export type PlatterAppStoreStatus = 'live' | 'coming_soon';
export const PLATTER_APP_STORE_STATUS: PlatterAppStoreStatus = 'live';

/** The Platter status on the Projects page, derived from the same constant as the boot card. Only a live listing links out. */
export function platterProjectStatus(status: PlatterAppStoreStatus = PLATTER_APP_STORE_STATUS): { text: string; href?: string } {
  return status === 'live'
    ? { text: 'iOS · On the App Store', href: PLATTER_APP_STORE_URL }
    : { text: 'iOS · Coming soon to the App Store' };
}

export const PLATTER_TAGLINE = 'Save any recipe from Reels, TikTok & blogs.';

export function platterAppStoreCopy(status: PlatterAppStoreStatus): { line: string; href: string } {
  return status === 'live'
    ? { line: 'Now on the App Store', href: PLATTER_APP_STORE_URL }
    : { line: 'Coming soon to the App Store', href: PLATTER_SITE_URL };
}

export const BOOT = {
  /** localStorage flag set once the sequence has played for a visitor. */
  storageKey: 'sidekick:booted',

  /** Black to a dim glow, with a short flicker. `flicker` lists the intervals (start, end) when the backlight is off, the first being the dark before it comes on. */
  backlightMs: 250,
  flicker: [[0, 30], [80, 110], [160, 185]] as ReadonlyArray<readonly [number, number]>,

  splashMs: 1500,
  /** The bar has `segments` blocks and fills `steps` times, so every step lights `segments / steps` of them. */
  progress: { segments: 16, steps: 8 },
  /** Status line shown from this fraction of the splash onwards. */
  status: [
    { from: 0, text: 'Loading applications...' },
    { from: 0.55, text: 'Connecting...' },
  ] as ReadonlyArray<{ from: number; text: string }>,
  version: 'v2.8',

  /** Three square-wave notes at the splash. */
  chime: {
    notes: [
      { freq: 523.25, startMs: 0, durationMs: 110 },
      { freq: 659.25, startMs: 120, durationMs: 110 },
      { freq: 783.99, startMs: 240, durationMs: 220 },
    ] as ReadonlyArray<{ freq: number; startMs: number; durationMs: number }>,
    volume: 0.06,
  },

  palette: {
    black: '#000000',
    glow: '#0e1a1b',
    dim: '#35514f',
    mute: '#7fa39b',
    light: '#b9dfcf',
    cream: '#f1e8d0',
    sage: '#637858',
    sageLight: '#9bb28f',
    sageDark: '#4b5c43',
    amber: '#e8b84a',
  },
} as const;

export const CANVAS = { width: 480, height: 320 } as const;

/** The Start button on the card, in canvas pixels. It includes the 4px drop shadow, which the pressed state gives up. */
export const START_RECT = { x: 170, y: 268, width: 144, height: 36 } as const;

/** The tappable App Store line on the card, in canvas pixels. */
export const LINK_RECT = { x: 80, y: 198, width: 320, height: 30 } as const;

/** The dim screen of the shut device, drawn with the same canvas, font and palette as the boot. Coordinates are canvas pixels. */
export const LOCK = {
  /** Faint 2px scanlines on every other row: the only colour that is not part of the boot palette. */
  scanline: '#0b1516',
  statusBarHeight: 22,
  softkeyHeight: 28,
  softkeyText: 'OPEN TO START',
  /** Top of the big clock (drawn in the native `clock` font size, not scaled up), and of the date under it. */
  clockY: 80,
  dateY: 172,
  /** The notification card sits between the date and the softkey bar. */
  notice: { x: 12, y: 200, height: 62 },
  batterySegments: 4,
  signalBars: 4,
} as const;
