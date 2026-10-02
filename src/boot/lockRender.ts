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

/** A notification card on the lock screen. `slide` runs 0 (off to the right) to 1 (in place). */
export interface LockNotice { title: string; body: string; slide: number }

export interface LockRenderer { draw: (face: LockFace, notice?: LockNotice | null) => void }

/** Draws the lock screen on a 480x320 canvas: pixel status bar, big pixel-font clock and date, softkey bar. Flat colours, hard edges. */
export function createLockRenderer(canvas: HTMLCanvasElement): LockRenderer | null {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const text = createText(document.createElement('canvas'));
  const { width, height } = CANVAS;
  ctx.imageSmoothingEnabled = false;

  /** Rising signal bars, left to right, each 3px wide with a 2px gap, stepping up 3px a bar and rounded at the top. */
  function signal(x: number, y: number) {
    for (let i = 0; i < LOCK.signalBars; i++) {
      const h = 5 + i * 3;
      const bx = x + i * 5;
      const by = y + 14 - h;
      rect(ctx!, C.light, bx, by, 3, h);
      rect(ctx!, C.glow, bx, by, 1, 1); rect(ctx!, C.glow, bx + 2, by, 1, 1);
    }
  }

  /** A battery outline with rounded corners, a nub and a block per charge segment. */
  function battery(x: number, y: number) {
    rect(ctx!, C.light, x + 1, y, 28, 14);
    rect(ctx!, C.light, x, y + 1, 30, 12);
    rect(ctx!, C.black, x + 2, y + 2, 26, 10);
    rect(ctx!, C.light, x + 30, y + 4, 3, 6);
    for (let i = 0; i < LOCK.batterySegments; i++) rect(ctx!, C.sageLight, x + 4 + i * 6, y + 4, 4, 6);
  }

  return {
    draw(face, notice) {
      rect(ctx, C.glow, 0, 0, width, height);
      for (let y = 2; y < height; y += 4) rect(ctx, LOCK.scanline, 0, y, width, 2);

      rect(ctx, C.black, 0, 0, width, LOCK.statusBarHeight);
      rect(ctx, C.dim, 0, LOCK.statusBarHeight - 2, width, 2);
      signal(8, 3);
      battery(width - 41, 2);

      text.draw(ctx, face.time, width / 2, LOCK.clockY, 'clock', C.cream, 'center');
      text.draw(ctx, face.date, width / 2, LOCK.dateY, 'small', C.light, 'center');

      if (notice) {
        const x = LOCK.notice.x + Math.round((1 - notice.slide) * (width - LOCK.notice.x));
        const { y, height: h } = LOCK.notice;
        const w = width - LOCK.notice.x * 2;
        rect(ctx, C.light, x, y, w, h);
        rect(ctx, C.black, x + 2, y + 2, w - 4, h - 4);
        rect(ctx, C.sage, x + 2, y + 2, 6, h - 4);
        text.draw(ctx, notice.title.toUpperCase(), x + 18, y + 9, 'small', C.sageLight);
        text.draw(ctx, notice.body, x + 18, y + 33, 'small', C.cream);
      }

      const barY = height - LOCK.softkeyHeight;
      rect(ctx, C.dim, 0, barY, width, LOCK.softkeyHeight);
      rect(ctx, C.mute, 0, barY, width, 2);
      text.draw(ctx, LOCK.softkeyText, width / 2, barY + Math.floor((LOCK.softkeyHeight - 16) / 2), 'small', C.cream, 'center');
    },
  };
}
