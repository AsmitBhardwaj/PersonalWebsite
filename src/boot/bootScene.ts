import { BOOT } from './bootConfig';

export type BootStage = 'backlight' | 'splash' | 'card' | 'done';

export interface BootScene {
  stage: BootStage;
  /** False while the backlight is dark: black at the start and during each flicker. */
  lit: boolean;
  /** Filled blocks of the splash progress bar. */
  segments: number;
  status: string;
  /** The "Press enter" prompt is in its visible half of the blink. */
  prompt: boolean;
}

/** The whole sequence as a pure function of time, so it can be drawn from any clock and tested without one. */
export function sceneAt(ms: number, reduced: boolean): BootScene {
  if (reduced) {
    return { stage: ms >= BOOT.reducedCardMs ? 'done' : 'card', lit: true, segments: 0, status: '', prompt: true };
  }
  const splashStart = BOOT.backlightMs;
  const cardStart = splashStart + BOOT.splashMs;
  if (ms < splashStart) {
    const dark = BOOT.flicker.some(([from, to]) => ms >= from && ms < to);
    return { stage: 'backlight', lit: !dark, segments: 0, status: '', prompt: false };
  }
  if (ms < cardStart) {
    const p = (ms - splashStart) / BOOT.splashMs;
    const { segments, steps } = BOOT.progress;
    const filled = Math.min(steps, Math.floor(p * steps) + 1) * (segments / steps);
    const status = [...BOOT.status].reverse().find((entry) => p >= entry.from)?.text ?? '';
    return { stage: 'splash', lit: true, segments: filled, status, prompt: false };
  }
  const cardElapsed = ms - cardStart;
  return {
    stage: ms >= cardStart + BOOT.cardMs ? 'done' : 'card',
    lit: true,
    segments: 0,
    status: '',
    prompt: Math.floor(cardElapsed / BOOT.promptBlinkMs) % 2 === 0,
  };
}
