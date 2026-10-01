import { BOOT, CANVAS, LINK_RECT, PLATTER_TAGLINE } from './bootConfig';
import type { BootScene } from './bootScene';

const { palette: C } = BOOT;
export const FONT_FAMILY = 'Silkscreen';
const FONT_SIZE = { small: 8, large: 16 } as const;
type Size = keyof typeof FONT_SIZE;
type Align = 'left' | 'center';

/** Hard-edged text: drawn to a scratch canvas, then every pixel is snapped to fully on or fully off. No anti-aliasing. */
function createText(scratch: HTMLCanvasElement) {
  const sctx = scratch.getContext('2d', { willReadFrequently: true });
  const font = (size: Size) => `${FONT_SIZE[size]}px ${FONT_FAMILY}, monospace`;

  function width(text: string, size: Size): number {
    if (!sctx) return text.length * FONT_SIZE[size];
    sctx.font = font(size);
    return Math.ceil(sctx.measureText(text).width);
  }

  function draw(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: Size, color: string, align: Align = 'left') {
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
    ctx.drawImage(scratch, Math.round(align === 'center' ? x - w / 2 : x), Math.round(y));
  }

  return { width, draw };
}

const rect = (ctx: CanvasRenderingContext2D, color: string, x: number, y: number, w: number, h: number) => {
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

/** The return-key glyph, which the pixel font lacks. 7x5. */
const ENTER_GLYPH = ['......#', '......#', '..#...#', '.######', '..#....'];
function drawGlyph(ctx: CanvasRenderingContext2D, rows: readonly string[], x: number, y: number, color: string) {
  ctx.fillStyle = color;
  rows.forEach((row, ry) => [...row].forEach((cell, rx) => { if (cell === '#') ctx.fillRect(x + rx, y + ry, 1, 1); }));
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
  draw: (scene: BootScene, appStoreLine: string) => void;
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

  function card(scene: BootScene, appStoreLine: string) {
    drawPlatterIcon(ctx!, mid - 16, 10);
    text.draw(ctx!, 'Platter', mid, 48, 'large', C.cream, 'center');
    const lines = wrap((t) => text.width(t, 'small'), PLATTER_TAGLINE, 160);
    lines.forEach((line, i) => text.draw(ctx!, line, mid, 69 + i * 10, 'small', C.light, 'center'));
    const { x, y, width, height } = LINK_RECT;
    rect(ctx!, C.amber, x, y, width, height);
    rect(ctx!, C.glow, x + 1, y + 1, width - 2, height - 2);
    text.draw(ctx!, appStoreLine, mid, y + 4, 'small', C.amber, 'center');
    text.draw(ctx!, 'platterapp.tech', mid, y + height + 5, 'small', C.mute, 'center');
    if (scene.prompt) {
      const before = 'Press ';
      const after = ' to continue';
      const total = text.width(before, 'small') + 7 + text.width(after, 'small');
      const left = Math.round(mid - total / 2);
      const py = 148;
      text.draw(ctx!, before, left, py, 'small', C.light);
      drawGlyph(ctx!, ENTER_GLYPH, left + text.width(before, 'small'), py + 1, C.light);
      text.draw(ctx!, after, left + text.width(before, 'small') + 7, py, 'small', C.light);
    }
  }

  return {
    draw(scene, appStoreLine) {
      rect(ctx, scene.lit ? C.glow : C.black, 0, 0, CANVAS.width, CANVAS.height);
      if (!scene.lit) return;
      if (scene.stage === 'splash') splash(scene);
      else if (scene.stage === 'card') card(scene, appStoreLine);
    },
  };
}
