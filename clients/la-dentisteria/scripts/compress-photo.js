// compress-photo.js — Resize and compress consultorio photo for web.
// Source: original DSC00573.jpg (~5.5MB)
// Output: wp-theme/assets/img/consultorio.jpg (~200-300KB, 1600px wide max)
//
// Run: node scripts/compress-photo.js

import sharp from 'sharp';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promises as fs } from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const SRC = 'C:\\Users\\TOMAS\\Desktop\\La Dentisteria\\FOTOS\\DSC00573.jpg';
const DEST = path.join(ROOT, 'wp-theme', 'assets', 'img', 'consultorio.jpg');

async function main() {
  const srcStat = await fs.stat(SRC);
  console.log(`Source: ${(srcStat.size / 1024 / 1024).toFixed(1)} MB`);

  await sharp(SRC)
    .resize(1600, null, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({
      quality: 78,
      mozjpeg: true,
      progressive: true,
    })
    .toFile(DEST);

  const destStat = await fs.stat(DEST);
  console.log(
    `Output: ${(destStat.size / 1024).toFixed(0)} KB (${(
      (destStat.size / srcStat.size) *
      100
    ).toFixed(1)}% of original)`
  );
  console.log(`Saved to: ${DEST}`);
}

main().catch((err) => {
  console.error('Compression failed:', err);
  process.exit(1);
});
