#!/usr/bin/env node
/**
 * Generates the favicon and PWA icons from the club logo (public/brand/chess-square-logo.jpg).
 * Replace that file with a new logo, then run: npm run icons
 */
import { mkdirSync } from 'node:fs';
import sharp from 'sharp';

const LOGO = 'public/brand/chess-square-logo.jpg';
/** The red of the logo's checkerboard, used to pad maskable icons. */
const BACKGROUND = '#bc3931';

/** Logo scaled into the centre of a padded square, so round/squircle masks never clip it. */
async function padded(size, scale, file) {
  const inner = Math.round(size * scale);
  const logo = await sharp(LOGO).resize(inner, inner).toBuffer();
  await sharp({ create: { width: size, height: size, channels: 3, background: BACKGROUND } })
    .composite([{ input: logo, gravity: 'centre' }])
    .png()
    .toFile(file);
}

mkdirSync('public/icons', { recursive: true });

for (const size of [192, 512]) {
  await sharp(LOGO).resize(size, size).png().toFile(`public/icons/icon-${size}x${size}.png`);
  await padded(size, 0.78, `public/icons/maskable-${size}x${size}.png`);
}
await sharp(LOGO).resize(180, 180).png().toFile('public/icons/apple-touch-icon.png');
await sharp(LOGO).resize(64, 64).png().toFile('public/favicon.png');
await sharp(LOGO).resize(96, 96).png().toFile('public/brand/mark-96.png');
console.log('Icons written to public/icons, public/favicon.png and public/brand');
