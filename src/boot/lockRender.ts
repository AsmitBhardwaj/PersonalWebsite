import { BOOT, CANVAS, LOCK } from './bootConfig';
import { createText, rect } from './bootRender';

const { palette: C } = BOOT;

export interface LockFace { time: string; date: string }

/** "11:08 PM": 12-hour, no leading zero, always a plain space (some locales put a narrow no-break space before AM/PM). */
export function formatLockTime(now: Date): string {
  return now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).replace(/\s/g, ' ');
}

/** "THU OCT 1". */
export function formatLockDate(now: Date): string {
  const part = (options: Intl.DateTimeFormatOptions) => now.toLocaleDateString('en-US', options);
  return `${part({ weekday: 'short' })} ${part({ month: 'short' })} ${part({ day: 'numeric' })}`.toUpperCase();
}

export const lockFace = (now: Date = new Date()): LockFace => ({ time: formatLockTime(now), date: formatLockDate(now) });

export interface LockRenderer { draw: (face: LockFace) => void }

/** Draws the lock screen on a 240x160 canvas: pixel status bar, big blocky clock and date, softkey bar. Flat colours, hard edges. */
export function createLockRenderer(canvas: HTMLCanvasElement): LockRenderer | null {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const text = createText(document.createElement('canvas'));
  const { width, height } = CANVAS;
  ctx.imageSmoothingEnabled = false;

  /** Rising signal bars, left to right, one pixel gap apart. */
  function signal(x: number, y: number) {
    for (let i = 0; i < LOCK.signalBars; i++) rect(ctx!, C.light, x + i * 3, y + 7 - (i + 1) * 2 + 1, 2, (i + 1) * 2);
  }

  /** A battery outline with a nub and a block per charge segment. */
  function battery(x: number, y: number) {
    rect(ctx!, C.light, x, y, 16, 8);
    rect(ctx!, C.black, x + 1, y + 1, 14, 6);
    rect(ctx!, C.light, x + 16, y + 2, 2, 4);
    for (let i = 0; i < LOCK.batterySegments; i++) rect(ctx!, C.sageLight, x + 2 + i * 3, y + 2, 2, 4);
  }

  return {
    draw(face) {
      rect(ctx, C.glow, 0, 0, width, height);
      for (let y = 1; y < height; y += 2) rect(ctx, LOCK.scanline, 0, y, width, 1);

      rect(ctx, C.black, 0, 0, width, LOCK.statusBarHeight);
      rect(ctx, C.dim, 0, LOCK.statusBarHeight - 1, width, 1);
      signal(4, 2);
      battery(width - 22, 2);

      text.draw(ctx, face.time, width / 2, LOCK.clockY, 'large', C.cream, 'center', LOCK.clockScale);
      text.draw(ctx, face.date, width / 2, LOCK.dateY, 'small', C.light, 'center');

      const barY = height - LOCK.softkeyHeight;
      rect(ctx, C.dim, 0, barY, width, LOCK.softkeyHeight);
      rect(ctx, C.mute, 0, barY, width, 1);
      text.draw(ctx, LOCK.softkeyText, width / 2, barY + Math.floor((LOCK.softkeyHeight - 8) / 2) + 1, 'small', C.cream, 'center');
    },
  };
}
