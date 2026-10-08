// ---------------------------------------------------------------------
// THE ITCH.IO COVER (Plan 97I): the fall campus with the title screen's
// mark and name over it, at itch.io's cover ratio (630 by 500), drawn at
// twice that so it stays sharp on a high-density screen.
//
//   npm run shot -- campus-laid.json bg.jpg --bare --size=1260,1000 \
//     --tilt=-2 --zoom=-1 --pan=0,220          # the campus, low in the frame
//   node tools/itchCover.mjs bg.jpg ../docs/store/itch/cover.jpg
//
// The mark is Logo.tsx's, and the name is set as the title screen sets it
// (styles.css's .logo-name: Archivo 800, wide capitals, white, the soft
// blue shadow). The title screen's art puts them on a blue sky; the campus
// shot's sky is a pale haze, so a band of that blue fades in behind them.
// ---------------------------------------------------------------------

import { readFileSync, writeFileSync, mkdtempSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const [bgPath, outPath] = process.argv.slice(2);
if (!bgPath || !outPath) {
  console.error('usage: node tools/itchCover.mjs <background.jpg> <out.jpg>');
  process.exit(2);
}

// The mark's paths, read from Logo.tsx so the cover never drifts from it.
const logo = readFileSync(join(ROOT, 'src/components/Logo.tsx'), 'utf8');
const paths = [...logo.matchAll(/<path\s+(?:fillRule="evenodd"\s+)?d="([^"]+)"/g)].map((m, i) => `<path ${i === 0 ? 'fill-rule="evenodd" ' : ''}d="${m[1]}"/>`);
const viewBox = logo.match(/viewBox="([^"]+)"/)[1];
const font = readFileSync(join(ROOT, 'node_modules/@fontsource/archivo/files/archivo-latin-800-normal.woff2')).toString('base64');
const bg = readFileSync(resolve(bgPath)).toString('base64');

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face { font-family: 'Archivo'; font-weight: 800; src: url(data:font/woff2;base64,${font}) format('woff2'); }
html, body { margin: 0; width: 630px; height: 500px; overflow: hidden; }
.cover { position: relative; width: 630px; height: 500px; background: url(data:image/jpeg;base64,${bg}) center / cover; }
/* The title art's sky, fading into the haze above the campus. */
.sky { position: absolute; inset: 0 0 auto 0; height: 300px;
  background: linear-gradient(180deg, rgba(58, 128, 205, 0.92) 0%, rgba(86, 152, 220, 0.78) 45%, rgba(120, 175, 225, 0.35) 75%, rgba(150, 190, 225, 0) 100%); }
.head { position: absolute; inset: 34px 0 auto 0; display: flex; flex-direction: column; align-items: center; gap: 12px;
  color: #fff; text-shadow: 0 2px 14px rgba(10, 50, 110, 0.28); }
.mark { width: 92px; height: auto; display: block; filter: drop-shadow(0 2px 10px rgba(10, 50, 110, 0.25)); }
.name { margin: 0; font-family: 'Archivo', sans-serif; font-weight: 800; font-size: 64px; line-height: 1;
  letter-spacing: 0.04em; text-transform: uppercase; }
</style></head><body><div class="cover"><div class="sky"></div><div class="head">
<svg class="mark" viewBox="${viewBox}"><g fill="currentColor">${paths.join('')}</g></svg>
<h1 class="name">UniSchool</h1></div></div></body></html>`;

const CANDIDATES = [process.env.CHROME_PATH, `${process.env.PLAYWRIGHT_BROWSERS_PATH ?? ''}/chromium-1194/chrome-linux/chrome`, '/opt/pw-browsers/chromium', '/usr/bin/chromium', '/usr/bin/google-chrome'].filter(Boolean);
const executablePath = CANDIDATES.find((p) => existsSync(p));
if (!executablePath) { console.error('no Chromium found; set CHROME_PATH.'); process.exit(2); }

const dir = mkdtempSync(join(tmpdir(), 'cover-'));
const page = join(dir, 'cover.html');
writeFileSync(page, html);
const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });
const tab = await browser.newPage({ viewport: { width: 630, height: 500 }, deviceScaleFactor: 2 });
await tab.goto(`file://${page}`);
await tab.evaluate(() => document.fonts.ready);
await tab.locator('.cover').screenshot({ path: outPath, type: 'jpeg', quality: 90 });
await browser.close();
console.log(`wrote ${outPath} (1260 by 1000, itch.io's 630 by 500 at twice the density)`);
