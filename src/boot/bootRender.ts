import { BOOT, CANVAS, LINK_RECT, PLATTER_TAGLINE, START_RECT } from './bootConfig';
import type { BootScene } from './bootScene';

const { palette: C } = BOOT;
export const FONT_FAMILY = 'Silkscreen';
const FONT_SIZE = { small: 8, large: 16 } as const;
type Size = keyof typeof FONT_SIZE;
type Align = 'left' | 'center' | 'right';

/** Hard-edged text: drawn to a scratch canvas, then every pixel is snapped to fully on or fully off. No anti-aliasing. */
export function createText(scratch: HTMLCanvasElement) {
  const sctx = scratch.getContext('2d', { willReadFrequently: true });
  const font = (size: Size) => `${FONT_SIZE[size]}px ${FONT_FAMILY}, monospace`;

  function width(text: string, size: Size, scale = 1): number {
    if (!sctx) return text.length * FONT_SIZE[size] * scale;
    sctx.font = font(size);
    return Math.ceil(sctx.measureText(text).width) * scale;
  }

  /** `scale` enlarges the glyphs by a whole number of pixels (nearest-neighbour), for big blocky digits. */
  function draw(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: Size, color: string, align: Align = 'left', scale = 1) {
    if (!sctx || !text) return;
    const w = width(text, size);
    const h = FONT_SIZE[size] + 2;
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
    const left = align === 'center' ? x - (w * scale) / 2 : align === 'right' ? x - w * scale : x;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(scratch, Math.round(left), Math.round(y), scratch.width * scale, scratch.height * scale);
  }

  return { width, draw };
}

export const rect = (ctx: CanvasRenderingContext2D, color: string, x: number, y: number, w: number, h: number) => {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
};

/** The Platter app icon at 32x32: a cream "P" on sage, corners cut a pixel-step at a time. */
function drawPlatterIcon(ctx: CanvasRenderingContext2D, x: number, y: number) {
  rect(ctx, C.sage, x + 4, y, 24, 32);
  rect(ctx, C.sage, x + 2, y + 1, 28, 30);
  rect(ctx, C.sage, x + 1, y + 2, 30, 28);
  rect(ctx, C.sage, x, y + 4, 32, 24);
  const cream = (px: number, py: number, w: number, h: number) => rect(ctx, C.cream, x + px, y + py, w, h);
  cream(10, 7, 5, 18);   // stem
  cream(15, 7, 7, 4);    // top of the bowl
  cream(22, 9, 4, 8);    // right of the bowl
  cream(15, 15, 7, 4);   // bottom of the bowl
  cream(21, 11, 1, 1); cream(21, 14, 1, 1); // soften the inner corners
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
    text.draw(ctx!, 'AsmitOS', mid, 46, 'large', C.cream, 'center');
    text.draw(ctx!, BOOT.version, mid, 68, 'small', C.mute, 'center');
    const { segments } = BOOT.progress;
    const barX = 40;
    const barY = 98;
    rect(ctx!, C.dim, barX - 2, barY - 2, 164, 12);
    rect(ctx!, C.glow, barX - 1, barY - 1, 162, 10);
    for (let i = 0; i < segments; i++) rect(ctx!, i < scene.segments ? C.sageLight : C.dim, barX + 1 + i * 10, barY + 1, 8, 6);
    text.draw(ctx!, scene.status, mid, 116, 'small', C.light, 'center');
  }

  /** A flat button with 1px-cut corners and a hard 2px drop shadow. Pressed, the face drops onto the shadow and darkens. */
  function startButton(pressed: boolean) {
    const { x, y, width, height } = START_RECT;
    const w = width - 2;
    const h = height - 2;
    const box = (color: string, bx: number, by: number) => {
      rect(ctx!, color, bx + 1, by, w - 2, h);
      rect(ctx!, color, bx, by + 1, w, h - 2);
    };
    if (!pressed) box(C.dim, x + 2, y + 2);
    const fx = pressed ? x + 2 : x;
    const fy = pressed ? y + 2 : y;
    box(pressed ? C.sageDark : C.sage, fx, fy);
    if (!pressed) { rect(ctx!, C.sageLight, fx + 2, fy, w - 4, 1); rect(ctx!, C.sageLight, fx, fy + 2, 1, h - 4); }
    text.draw(ctx!, 'START', fx + w / 2, fy + Math.floor((h - 8) / 2), 'small', C.cream, 'center');
  }

  function card(appStoreLine: string, pressed: boolean) {
    drawPlatterIcon(ctx!, mid - 16, 10);
    text.draw(ctx!, 'Platter', mid, 48, 'large', C.cream, 'center');
    const lines = wrap((t) => text.width(t, 'small'), PLATTER_TAGLINE, 160);
    lines.forEach((line, i) => text.draw(ctx!, line, mid, 69 + i * 10, 'small', C.light, 'center'));
    const { x, y, width, height } = LINK_RECT;
    rect(ctx!, C.amber, x, y, width, height);
    rect(ctx!, C.glow, x + 1, y + 1, width - 2, height - 2);
    text.draw(ctx!, appStoreLine, mid, y + 4, 'small', C.amber, 'center');
    text.draw(ctx!, 'platterapp.tech', mid, y + height + 5, 'small', C.mute, 'center');
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
