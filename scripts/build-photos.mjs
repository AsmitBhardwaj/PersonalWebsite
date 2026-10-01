// Turns the originals in photos-src/ into web-ready, metadata-free WebP in public/photos/ plus src/content/photos.generated.json.
// Runs before dev, tests, typecheck and build (see package.json). Fails if any output still carries EXIF/GPS.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildPhotos } from './photos-lib.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
try {
  const photos = await buildPhotos({
    srcDir: path.join(root, 'photos-src'),
    outDir: path.join(root, 'public/photos'),
    manifestPath: path.join(root, 'src/content/photos.generated.json'),
    log: (line) => console.log(`[photos] ${line}`),
  });
  console.log(`[photos] ${photos.length} photo${photos.length === 1 ? '' : 's'} built, no metadata in any output.`);
} catch (error) {
  console.error(`[photos] ${error.message}`);
  process.exit(1);
}
