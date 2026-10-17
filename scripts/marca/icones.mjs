// Gera os PNGs do app (tela inicial, iPhone, Android) a partir de scripts/marca/svg.
// Uso: node scripts/marca/icones.mjs   (CHROMIUM_PATH opcional, como nos testes)
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright-core';

const SVG = new URL('./svg/', import.meta.url);
const OUT = new URL('../../public/icons/', import.meta.url);
const jobs = [
  ['full.svg', 'icon-192.png', 192],
  ['full.svg', 'icon-512.png', 512],
  ['mask.svg', 'icon-maskable-512.png', 512],
  ['full.svg', 'apple-touch-icon.png', 180],
  ['badge.svg', 'badge-96.png', 96],
];
const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
for (const [src, out, size] of jobs) {
  const p = await b.newPage({ viewport: { width: size, height: size } });
  await p.setContent(`<style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${readFileSync(new URL(src, SVG), 'utf8')}`);
  await p.screenshot({ path: new URL(out, OUT).pathname, omitBackground: true });
  await p.close();
}
await b.close();
console.log('Ícones gerados em public/icons.');
