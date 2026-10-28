// Generates PWA PNG icons from public/favicon.svg. Run: npm run icons
import sharp from 'sharp';
import { readFile } from 'node:fs/promises';

const svg = await readFile(new URL('../public/favicon.svg', import.meta.url));
const out = (n) => new URL(`../public/icons/${n}`, import.meta.url).pathname;

await sharp(svg).resize(192, 192).png().toFile(out('icon-192.png'));
await sharp(svg).resize(512, 512).png().toFile(out('icon-512.png'));
// Maskable: shrink art to the safe zone on a solid background.
const inner = await sharp(svg).resize(360, 360).png().toBuffer();
await sharp({ create: { width: 512, height: 512, channels: 4, background: '#0b0d12' } })
  .composite([{ input: inner, gravity: 'center' }]).png().toFile(out('icon-maskable-512.png'));
console.log('icons written');
