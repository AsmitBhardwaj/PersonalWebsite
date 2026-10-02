import { BOOT, CANVAS, LINK_RECT, PLATTER_TAGLINE, START_RECT } from './bootConfig';
import type { BootScene } from './bootScene';

const { palette: C } = BOOT;
export const FONT_FAMILY = 'Pixelify Sans';
/** One pixel face at three native sizes, never scaled up: small labels, titles, and the lock-screen clock. */
const FONT = {
  small: { family: FONT_FAMILY, px: 16, weight: 400 },
  large: { family: FONT_FAMILY, px: 40, weight: 400 },
  clock: { family: FONT_FAMILY, px: 64, weight: 400 },
} as const;
type Size = keyof typeof FONT;
/** Every face and size the canvas needs, for preloading before the first paint. */
export const FONT_LOADS = Object.values(FONT).map((f) => `${f.weight} ${f.px}px "${f.family}"`);
type Align = 'left' | 'center' | 'right';

/** Hard-edged text: drawn to a scratch canvas, then every pixel is snapped to fully on or fully off. No anti-aliasing. */
export function createText(scratch: HTMLCanvasElement) {
  const sctx = scratch.getContext('2d', { willReadFrequently: true });
  const font = (size: Size) => `${FONT[size].weight} ${FONT[size].px}px "${FONT[size].family}", monospace`;

  function width(text: string, size: Size): number {
    if (!sctx) return text.length * FONT[size].px;
    sctx.font = font(size);
    return Math.ceil(sctx.measureText(text).width);
  }

  function draw(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: Size, color: string, align: Align = 'left') {
    if (!sctx || !text) return;
    const w = width(text, size);
    const h = Math.ceil(FONT[size].px * 1.4);
    scratch.width = w + 2;
    scratch.height = h;
    sctx.font = font(size);
    sctx.textBaseline = 'top';
    sctx.fillStyle = '#fff';
    sctx.fillText(text, 0, 0);
    const image = sctx.getImageData(0, 0, scratch.width, scratch.height);
    for (let i = 3; i < image.data.length; i += 4) image.data[i] = image.data[i] > 127 ? 255 : 0;
    sctx.putImageData(image, 0, 0);
    sctx.globalCompositeOperation = 'source-in';
    sctx.fillStyle = color;
    sctx.fillRect(0, 0, scratch.width, scratch.height);
    sctx.globalCompositeOperation = 'source-over';
    const left = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(scratch, Math.round(left), Math.round(y));
  }

  return { width, draw };
}

export const rect = (ctx: CanvasRenderingContext2D, color: string, x: number, y: number, w: number, h: number) => {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
};

/** The Platter app icon at 64x64: a cream "P" on sage, corners cut in 2px steps. */
function drawPlatterIcon(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const sage = (px: number, py: number, w: number, h: number) => rect(ctx, C.sage, x + px, y + py, w, h);
  sage(8, 0, 48, 64); sage(4, 2, 56, 60); sage(2, 4, 60, 56); sage(0, 8, 64, 48);
  const cream = (px: number, py: number, w: number, h: number) => rect(ctx, C.cream, x + px, y + py, w, h);
  cream(20, 14, 10, 36);  // stem
  cream(30, 14, 14, 8);   // top of the bowl
  cream(44, 18, 8, 16);   // right of the bowl
  cream(30, 30, 14, 8);   // bottom of the bowl
  cream(42, 22, 2, 2); cream(42, 28, 2, 2); // soften the inner corners
}

/** Greedy word wrap to `max` pixels. */
function wrap(measure: (text: string) => number, text: string, max: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (line && measure(next) > max) { lines.push(line); line = word; } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

export interface BootRenderer {
  draw: (scene: BootScene, appStoreLine: string, startPressed?: boolean) => void;
}

export function createBootRenderer(canvas: HTMLCanvasElement): BootRenderer | null {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const text = createText(document.createElement('canvas'));
  const mid = CANVAS.width / 2;
  ctx.imageSmoothingEnabled = false;

  function splash(scene: BootScene) {
    text.draw(ctx!, 'AsmitOS', mid, 76, 'large', C.cream, 'center');
    text.draw(ctx!, BOOT.version, mid, 126, 'small', C.mute, 'center');
    const { segments } = BOOT.progress;
    const barX = 80;
    const barY = 196;
    rect(ctx!, C.dim, barX - 4, barY - 4, 328, 24);
    rect(ctx!, C.glow, barX - 2, barY - 2, 324, 20);
    for (let i = 0; i < segments; i++) rect(ctx!, i < scene.segments ? C.sageLight : C.dim, barX + 2 + i * 20, barY + 2, 16, 12);
    text.draw(ctx!, scene.status, mid, 230, 'small', C.light, 'center');
  }

  /** A flat button with 2px-cut corners and a hard 4px drop shadow. Pressed, the face drops onto the shadow and darkens. */
  function startButton(pressed: boolean) {
    const { x, y, width, height } = START_RECT;
    const w = width - 4;
    const h = height - 4;
    const box = (color: string, bx: number, by: number) => {
      rect(ctx!, color, bx + 2, by, w - 4, h);
      rect(ctx!, color, bx, by + 2, w, h - 4);
    };
    if (!pressed) box(C.dim, x + 4, y + 4);
    const fx = pressed ? x + 4 : x;
    const fy = pressed ? y + 4 : y;
    box(pressed ? C.sageDark : C.sage, fx, fy);
    if (!pressed) { rect(ctx!, C.sageLight, fx + 4, fy, w - 8, 2); rect(ctx!, C.sageLight, fx, fy + 4, 2, h - 8); }
    text.draw(ctx!, 'START', fx + w / 2, fy + Math.floor((h - FONT.small.px) / 2), 'small', C.cream, 'center');
  }

  function card(appStoreLine: string, pressed: boolean) {
    drawPlatterIcon(ctx!, mid - 32, 20);
    text.draw(ctx!, 'Platter', mid, 90, 'large', C.cream, 'center');
    const lines = wrap((t) => text.width(t, 'small'), PLATTER_TAGLINE, 400);
    lines.forEach((line, i) => text.draw(ctx!, line, mid, 142 + i * 22, 'small', C.light, 'center'));
    const { x, y, width, height } = LINK_RECT;
    rect(ctx!, C.amber, x, y, width, height);
    rect(ctx!, C.glow, x + 2, y + 2, width - 4, height - 4);
    text.draw(ctx!, appStoreLine, mid, y + 6, 'small', C.amber, 'center');
    text.draw(ctx!, 'platterapp.tech', mid, y + height + 8, 'small', C.mute, 'center');
    startButton(pressed);
  }

  return {
    draw(scene, appStoreLine, startPressed = false) {
      rect(ctx, scene.lit ? C.glow : C.black, 0, 0, CANVAS.width, CANVAS.height);
      if (!scene.lit) return;
      if (scene.stage === 'splash') splash(scene);
      else if (scene.stage === 'card') card(appStoreLine, startPressed);
    },
  };
}
