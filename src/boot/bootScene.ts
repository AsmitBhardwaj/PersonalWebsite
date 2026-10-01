import { BOOT } from './bootConfig';

export type BootStage = 'backlight' | 'splash' | 'card';

export interface BootScene {
  stage: BootStage;
  /** False while the backlight is dark: black at the start and during each flicker. */
  lit: boolean;
  /** Filled blocks of the splash progress bar. */
  segments: number;
  status: string;
}

/** The backlight and splash as a pure function of time, so it can be drawn from any clock and tested without one. The card has no end: it waits for Start. */
export function sceneAt(ms: number, reduced: boolean): BootScene {
  // Reduced motion: no backlight or splash, straight to the static card.
  if (reduced) return { stage: 'card', lit: true, segments: 0, status: '' };
  const splashStart = BOOT.backlightMs;
  const cardStart = splashStart + BOOT.splashMs;
  if (ms < splashStart) {
    const dark = BOOT.flicker.some(([from, to]) => ms >= from && ms < to);
    return { stage: 'backlight', lit: !dark, segments: 0, status: '' };
  }
  if (ms < cardStart) {
    const p = (ms - splashStart) / BOOT.splashMs;
    const { segments, steps } = BOOT.progress;
    const filled = Math.min(steps, Math.floor(p * steps) + 1) * (segments / steps);
    const status = [...BOOT.status].reverse().find((entry) => p >= entry.from)?.text ?? '';
    return { stage: 'splash', lit: true, segments: filled, status };
  }
  return { stage: 'card', lit: true, segments: 0, status: '' };
}
