/**
 * Generate PWA icons from the brand chevron mark.
 *
 * Outputs to public/icons/:
 *   - icon-192.png            (regular, 192x192)
 *   - icon-512.png            (regular, 512x512)
 *   - maskable-192.png        (with 20% safe-zone padding)
 *   - maskable-512.png        (with 20% safe-zone padding)
 *   - apple-touch-icon.png    (180x180, iOS home screen)
 *
 * Run with: pnpm icons
 */

import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const OUT_DIR = resolve(process.cwd(), 'public/icons');

const BG = '#0B0B0C';
const FG = '#E5601F';

/** The chevron arrow, normalized to a 64-unit canvas (matches favicon.svg). */
const CHEVRON_PATH = 'M14 18 L34 18 L50 32 L34 46 L14 46 L30 32 Z';

/**
 * @param size - output side length in px
 * @param padding - safe-zone padding ratio, e.g. 0.2 = 20% inset on each side.
 *                  Maskable icons need ~20% so the system can crop without
 *                  clipping the mark.
 * @param fillBackground - whether to paint the background. Maskable icons must
 *                         fill the whole tile; regular icons are also fine
 *                         filled (we want a solid badge in both cases).
 */
function buildSvg(size: number, padding: number, fillBackground: boolean): string {
  const inset = size * padding;
  const inner = size - inset * 2;
  const scale = inner / 64;
  const tx = inset;
  const ty = inset;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  ${fillBackground ? `<rect width="${size}" height="${size}" fill="${BG}"/>` : ''}
  <g transform="translate(${tx} ${ty}) scale(${scale})">
    <path d="${CHEVRON_PATH}" fill="${FG}"/>
  </g>
</svg>`;
}

interface Icon {
  filename: string;
  size: number;
  padding: number;
}

const ICONS: Icon[] = [
  { filename: 'icon-192.png', size: 192, padding: 0.1 },
  { filename: 'icon-512.png', size: 512, padding: 0.1 },
  { filename: 'maskable-192.png', size: 192, padding: 0.2 },
  { filename: 'maskable-512.png', size: 512, padding: 0.2 },
  { filename: 'apple-touch-icon.png', size: 180, padding: 0.1 },
];

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  for (const icon of ICONS) {
    const svg = buildSvg(icon.size, icon.padding, true);
    const png = await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
    const out = resolve(OUT_DIR, icon.filename);
    await writeFile(out, png);
    console.log(`  ${icon.filename}  ${icon.size}×${icon.size}`);
  }
  console.log(`\nWrote ${ICONS.length} icons to ${OUT_DIR}.`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
