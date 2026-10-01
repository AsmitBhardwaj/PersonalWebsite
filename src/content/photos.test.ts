// @vitest-environment node
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, readdir, rm, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FULL_EDGE, THUMB_EDGE, assertNoMetadata, buildPhotos } from '../../scripts/photos-lib.mjs';
import { formatPhotoDate } from './photos';

const GPS = { IFD3: { GPSLatitudeRef: 'N', GPSLatitude: '41/1 2/1 3/1', GPSLongitudeRef: 'W', GPSLongitude: '77/1 14/1 5/1' } };
const frame = (width: number, height: number, background: string) => sharp({ create: { width, height, channels: 3, background } });

let dir: string;
const at = (...parts: string[]) => path.join(dir, ...parts);
const run = (extra: Parameters<typeof buildPhotos>[0] extends infer T ? Partial<T> : never = {}) =>
  buildPhotos({ srcDir: at('src'), outDir: at('out'), manifestPath: at('out.json'), ...extra });

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), 'photos-'));
  const { mkdir } = await import('node:fs/promises');
  await mkdir(at('src'));
});
afterEach(() => rm(dir, { recursive: true, force: true }));

describe('photo build', () => {
  it('builds a manifest: newest first by caption date, else file date, with optional captions', async () => {
    await frame(2000, 1000, '#c33').jpeg().toFile(at('src', 'a.jpg'));
    await frame(800, 1200, '#3c3').png().toFile(at('src', 'b.png'));
    await frame(500, 500, '#33c').jpeg().toFile(at('src', 'c.jpg'));
    await utimes(at('src', 'a.jpg'), new Date('2024-01-01'), new Date('2024-01-01'));
    await utimes(at('src', 'b.png'), new Date('2025-01-01'), new Date('2025-01-01'));
    await utimes(at('src', 'c.jpg'), new Date('2020-01-01'), new Date('2020-01-01'));
    await writeFile(at('src', 'captions.json'), JSON.stringify({ 'a.jpg': { caption: ' Hello ', date: '2026-09', place: 'Sevilla' }, c: { date: '2025-06-15' } }));

    const photos = await run();
    expect(photos.map((p) => p.file)).toEqual(['a.jpg', 'c.jpg', 'b.png']); // 2026-09, 2025-06-15, then b by mtime (2025-01-01)
    expect(photos[0]).toMatchObject({ caption: 'Hello', date: '2026-09', place: 'Sevilla', width: FULL_EDGE, height: 540 });
    expect(photos[2]).not.toHaveProperty('caption'); // missing entries just have no caption
    expect(JSON.parse(await readFile(at('out.json'), 'utf8'))).toEqual(photos);
    for (const p of photos) {
      expect(existsSync(at('out', `${p.id}.webp`))).toBe(true);
      expect((await sharp(at('out', `${p.id}-thumb.webp`)).metadata()).width).toBeLessThanOrEqual(THUMB_EDGE);
    }
    expect((await sharp(at('out', `${photos[2].id}.webp`)).metadata()).height).toBe(FULL_EDGE); // 800x1200 -> long edge 1080
  });

  it('strips EXIF and GPS from every output and applies the orientation first', async () => {
    // A 1600x1000 sensor image tagged "rotate 90": it must come out upright, i.e. portrait.
    await frame(1600, 1000, '#c33').withExif(GPS).withMetadata({ orientation: 6 }).jpeg().toFile(at('src', 'trip.jpg'));
    const source = await sharp(at('src', 'trip.jpg')).metadata();
    expect(source.exif).toBeDefined(); // the fixture really carries location data
    expect(source.orientation).toBe(6);

    const [photo] = await run();
    expect(photo.height).toBeGreaterThan(photo.width);
    for (const name of await readdir(at('out'))) {
      const file = at('out', name);
      await assertNoMetadata(file);
      const meta = await sharp(file).metadata();
      expect(meta.exif).toBeUndefined();
      expect(meta.orientation).toBeUndefined();
      expect((await readFile(file)).toString('latin1')).not.toContain('GPS');
    }
  });

  it('the gate fails on an output that still carries EXIF', async () => {
    await frame(100, 100, '#fff').withExif(GPS).webp().toFile(at('dirty.webp'));
    await expect(assertNoMetadata(at('dirty.webp'))).rejects.toThrow(/metadata/);
  });

  it('skips placeholders once a real photo exists, uses them otherwise', async () => {
    await frame(100, 100, '#999').jpeg().toFile(at('src', 'placeholder-1.jpg'));
    expect((await run()).map((p) => p.file)).toEqual(['placeholder-1.jpg']);
    await frame(100, 100, '#111').jpeg().toFile(at('src', 'mine.jpg'));
    expect((await run()).map((p) => p.file)).toEqual(['mine.jpg']);
  });

  it('rejects a bad caption date and bad JSON', async () => {
    await frame(100, 100, '#999').jpeg().toFile(at('src', 'x.jpg'));
    await writeFile(at('src', 'captions.json'), JSON.stringify({ 'x.jpg': { date: 'last summer' } }));
    await expect(run()).rejects.toThrow(/Bad date/);
    await writeFile(at('src', 'captions.json'), '{ nope');
    await expect(run()).rejects.toThrow(/not valid JSON/);
  });

  it('shipped outputs (public/photos) carry no metadata', async () => {
    const out = fileURLToPath(new URL('../../public/photos', import.meta.url));
    const names = existsSync(out) ? (await readdir(out)).filter((n) => n.endsWith('.webp')) : [];
    expect(names.length).toBeGreaterThan(0);
    for (const name of names) await assertNoMetadata(path.join(out, name));
  });
});

describe('formatPhotoDate', () => {
  it('formats year, month and day precision, and passes through anything else', () => {
    expect(formatPhotoDate('2026')).toBe('2026');
    expect(formatPhotoDate('2026-09')).toBe('Sep 2026');
    expect(formatPhotoDate('2026-09-04')).toBe('4 Sep 2026');
    expect(formatPhotoDate('summer')).toBe('summer');
  });
});
