import { Buffer } from 'node:buffer';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceDir = path.join(projectRoot, 'src/assets/device/source');
const outputDir = path.join(projectRoot, 'public/assets/device/generated');

const OPEN = {
  width: 1586,
  height: 992,
  display: { left: 400, top: 90, width: 786, height: 510 },
  displayOuter: { x: 11, y: 11, width: 766, height: 485, radius: 62 },
  lcd: { x: 147, y: 63, width: 494, height: 381, radius: 9 },
  pivot: { x: 393, y: 296 },
};

const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));

async function removeNearWhite(inputPath) {
  const { data, info } = await sharp(inputPath).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const rgba = Buffer.alloc(info.width * info.height * 4);

  for (let source = 0, target = 0; source < data.length; source += 3, target += 4) {
    const red = data[source];
    const green = data[source + 1];
    const blue = data[source + 2];
    const distanceFromWhite = 255 - Math.min(red, green, blue);
    const alpha = clamp(Math.round((distanceFromWhite - 9) * 13), 0, 255);
    rgba[target] = red;
    rgba[target + 1] = green;
    rgba[target + 2] = blue;
    rgba[target + 3] = alpha;
  }

  return sharp(rgba, { raw: { width: info.width, height: info.height, channels: 4 } });
}

function svgMask(width, height, content) {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="none"/>${content}</svg>`);
}

async function buildOpenBase(openSource) {
  const foreground = await (await removeNearWhite(openSource)).png().toBuffer();
  const silhouette = `
    <path fill="white" d="
      M 205 455
      C 247 443 324 447 380 450
      C 397 451 409 462 424 478
      L 1162 478
      C 1177 462 1189 451 1206 450
      C 1262 447 1339 443 1381 455
      C 1398 488 1402 584 1400 727
      C 1399 827 1370 881 1287 901
      C 1116 922 470 922 299 901
      C 216 881 187 827 186 727
      C 184 584 188 488 205 455 Z"/>
  `;
  const displayRemoval = `<rect x="397" y="0" width="792" height="596" fill="white"/>`;

  const extractedHardware = await sharp(foreground)
    .composite([
      { input: svgMask(OPEN.width, OPEN.height, silhouette), blend: 'dest-in' },
      { input: svgMask(OPEN.width, OPEN.height, displayRemoval), blend: 'dest-out' },
    ])
    .png()
    .toBuffer();
  const chassisUnderlay = Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${OPEN.width}" height="${OPEN.height}">
      <defs><linearGradient id="body" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#242729"/><stop offset=".2" stop-color="#141617"/><stop offset=".88" stop-color="#090b0c"/><stop offset="1" stop-color="#202324"/></linearGradient></defs>
      <rect x="378" y="444" width="830" height="468" rx="42" fill="url(#body)" stroke="#08090a" stroke-width="4"/>
    </svg>`);

  await sharp({ create: { width: OPEN.width, height: OPEN.height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: chassisUnderlay }, { input: extractedHardware }])
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(path.join(outputDir, 'device-base-open.png'));
}

async function buildDisplayFront(openSource) {
  const foreground = await (await removeNearWhite(openSource)).png().toBuffer();
  const outer = OPEN.displayOuter;
  const lcd = OPEN.lcd;
  const frameMask = `
    <path fill="white" fill-rule="evenodd" d="
      M ${outer.x + outer.radius} ${outer.y}
      H ${outer.x + outer.width - outer.radius}
      Q ${outer.x + outer.width} ${outer.y} ${outer.x + outer.width} ${outer.y + outer.radius}
      V ${outer.y + outer.height - outer.radius}
      Q ${outer.x + outer.width} ${outer.y + outer.height} ${outer.x + outer.width - outer.radius} ${outer.y + outer.height}
      H ${outer.x + outer.radius}
      Q ${outer.x} ${outer.y + outer.height} ${outer.x} ${outer.y + outer.height - outer.radius}
      V ${outer.y + outer.radius}
      Q ${outer.x} ${outer.y} ${outer.x + outer.radius} ${outer.y} Z
      M ${lcd.x + lcd.radius} ${lcd.y}
      H ${lcd.x + lcd.width - lcd.radius}
      Q ${lcd.x + lcd.width} ${lcd.y} ${lcd.x + lcd.width} ${lcd.y + lcd.radius}
      V ${lcd.y + lcd.height - lcd.radius}
      Q ${lcd.x + lcd.width} ${lcd.y + lcd.height} ${lcd.x + lcd.width - lcd.radius} ${lcd.y + lcd.height}
      H ${lcd.x + lcd.radius}
      Q ${lcd.x} ${lcd.y + lcd.height} ${lcd.x} ${lcd.y + lcd.height - lcd.radius}
      V ${lcd.y + lcd.radius}
      Q ${lcd.x} ${lcd.y} ${lcd.x + lcd.radius} ${lcd.y} Z"/>
  `;

  await sharp(foreground)
    .extract(OPEN.display)
    .composite([{ input: svgMask(OPEN.display.width, OPEN.display.height, frameMask), blend: 'dest-in' }])
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(path.join(outputDir, 'display-front-frame.png'));
}

async function main() {
  await mkdir(outputDir, { recursive: true });
  const openSource = path.join(sourceDir, 'sidekickI.png');

  await Promise.all([
    buildOpenBase(openSource),
    buildDisplayFront(openSource),
  ]);

  await writeFile(path.join(outputDir, 'device-metrics.json'), `${JSON.stringify({
    sourceCanvas: { width: OPEN.width, height: OPEN.height },
    displayBounds: OPEN.display,
    lcdOpeningInDisplay: OPEN.lcd,
    lcdOpeningInSource: {
      left: OPEN.display.left + OPEN.lcd.x,
      top: OPEN.display.top + OPEN.lcd.y,
      width: OPEN.lcd.width,
      height: OPEN.lcd.height,
    },
    pivotInDisplay: OPEN.pivot,
  }, null, 2)}\n`);
}

await main();
