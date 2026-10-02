import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { parseCaptionDate } from './photo-date.mjs';

export const FULL_EDGE = 1080;
export const THUMB_EDGE = 360;
const SOURCE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.heic', '.heif', '.webp', '.tiff', '.avif']);
const HEIC_EXTENSIONS = new Set(['.heic', '.heif']);
/** Sources with this prefix are demo content: they are skipped as soon as a real photo exists. */
export const PLACEHOLDER_PREFIX = 'placeholder-';
/** RIFF chunks that carry metadata. A clean WebP has none of them. */
const METADATA_CHUNKS = new Set(['EXIF', 'XMP ', 'ICCP']);

const isPlaceholder = (file) => file.toLowerCase().startsWith(PLACEHOLDER_PREFIX);

/** HEIF brands that need the JS decoder. Detected from the bytes: an iPhone HEIC renamed to .jpeg is still HEIC. */
const HEIC_BRANDS = new Set(['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'hevm', 'hevs', 'mif1', 'msf1']);
const isHeic = (bytes, file) => (bytes.length > 12 && bytes.toString('ascii', 4, 8) === 'ftyp' && HEIC_BRANDS.has(bytes.toString('ascii', 8, 12))) || HEIC_EXTENSIONS.has(path.extname(file).toLowerCase());

/** Decode a source file to something sharp can read. HEIC needs a JS decoder: prebuilt sharp has no HEVC. */
async function readSource(file) {
  const bytes = await readFile(file);
  if (!isHeic(bytes, file)) return bytes;
  const { default: convert } = await import('heic-convert');
  return Buffer.from(await convert({ buffer: bytes, format: 'JPEG', quality: 0.95 }));
}

async function readCaptions(srcDir) {
  const file = path.join(srcDir, 'captions.json');
  if (!existsSync(file)) return {};
  let parsed;
  try { parsed = JSON.parse(await readFile(file, 'utf8')); } catch (error) { throw new Error(`photos-src/captions.json is not valid JSON: ${error.message}`); }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('photos-src/captions.json must be an object keyed by filename.');
  return parsed;
}

/** Throws if a built WebP carries any metadata chunk (EXIF is where GPS lives) or sharp still reports EXIF/XMP/ICC. */
export async function assertNoMetadata(file) {
  const bytes = await readFile(file);
  if (bytes.length < 12 || bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WEBP') throw new Error(`${file} is not a WebP.`);
  for (let offset = 12; offset + 8 <= bytes.length;) {
    const fourcc = bytes.toString('ascii', offset, offset + 4);
    if (METADATA_CHUNKS.has(fourcc)) throw new Error(`${path.basename(file)} still contains a ${fourcc.trim()} metadata chunk (GPS/location may be present).`);
    offset += 8 + bytes.readUInt32LE(offset + 4) + (bytes.readUInt32LE(offset + 4) % 2);
  }
  const meta = await sharp(bytes).metadata();
  if (meta.exif || meta.xmp || meta.icc) throw new Error(`${path.basename(file)} still has embedded metadata.`);
}

/**
 * Build the photo set.
 * @param {{ srcDir: string, outDir: string, manifestPath: string, publicBase?: string, log?: (line: string) => void }} options
 * @returns {Promise<Array<{ id: string, file: string, src: string, thumb: string, width: number, height: number, caption?: string, date?: string, place?: string }>>}
 */
export async function buildPhotos({ srcDir, outDir, manifestPath, publicBase = '/photos', log = () => undefined }) {
  const all = existsSync(srcDir) ? (await readdir(srcDir)).filter((name) => SOURCE_EXTENSIONS.has(path.extname(name).toLowerCase())).sort() : [];
  const real = all.filter((name) => !isPlaceholder(name));
  const files = real.length > 0 ? real : all;
  const captions = await readCaptions(srcDir);
  const byKey = (file) => captions[file] ?? captions[path.basename(file, path.extname(file))] ?? {};
  for (const key of Object.keys(captions)) {
    if (!isPlaceholder(key) && !all.some((file) => file === key || path.basename(file, path.extname(file)) === key)) log(`warning: captions.json has "${key}" but no matching photo in photos-src/`);
  }

  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });
  await mkdir(path.dirname(manifestPath), { recursive: true });

  const entries = [];
  for (const file of files) {
    const source = path.join(srcDir, file);
    let input;
    try { input = await readSource(source); } catch (error) { throw new Error(`Could not read ${file}: ${error.message}`); }
    const hash = createHash('sha256').update(input).digest('hex').slice(0, 8);
    const slug = path.basename(file, path.extname(file)).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'photo';
    const id = `${slug}-${hash}`;
    // rotate() applies the EXIF orientation. sharp writes no metadata unless asked, so EXIF, XMP and GPS are all dropped.
    const resize = (edge) => sharp(input).rotate().resize({ width: edge, height: edge, fit: 'inside', withoutEnlargement: true });
    const full = await resize(FULL_EDGE).webp({ quality: 82 }).toFile(path.join(outDir, `${id}.webp`));
    await resize(THUMB_EDGE).webp({ quality: 78 }).toFile(path.join(outDir, `${id}-thumb.webp`));
    const caption = byKey(file);
    const date = typeof caption.date === 'string' && caption.date.trim() ? caption.date.trim() : undefined;
    if (date && Number.isNaN(parseCaptionDate(date))) throw new Error(`Bad date "${date}" for ${file} in captions.json: use YYYY, YYYY-MM or YYYY-MM-DD.`);
    const sortTime = date ? parseCaptionDate(date) : (await stat(source)).mtimeMs;
    entries.push({
      sortTime,
      photo: {
        id, file, src: `${publicBase}/${id}.webp`, thumb: `${publicBase}/${id}-thumb.webp`, width: full.width, height: full.height,
        ...(typeof caption.caption === 'string' && caption.caption.trim() ? { caption: caption.caption.trim() } : {}),
        ...(date ? { date } : {}),
        ...(typeof caption.place === 'string' && caption.place.trim() ? { place: caption.place.trim() } : {}),
      },
    });
    log(`${file} -> ${id}.webp (${full.width}x${full.height})`);
  }

  entries.sort((a, b) => b.sortTime - a.sortTime || a.photo.file.localeCompare(b.photo.file));
  const photos = entries.map((entry) => entry.photo);

  // The privacy gate: no output may carry metadata, so a bug here fails the build instead of leaking a location.
  for (const name of await readdir(outDir)) await assertNoMetadata(path.join(outDir, name));
  await writeFile(manifestPath, `${JSON.stringify(photos, null, 2)}\n`);
  return photos;
}
