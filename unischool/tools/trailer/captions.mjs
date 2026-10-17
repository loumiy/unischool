// ---------------------------------------------------------------------
// THE TIME-LAPSE'S YEAR CAPTIONS, apart from the picture: one transparent
// 1920x1080 PNG per year and term the frames hold, in the style
// tools/timelapseShoot.mjs captions a frame with (Bricolage Grotesque,
// white, bottom left). For a time-lapse shot with --no-caption and moved in
// the edit, where a caption burned into the frame would scale and crop with
// the picture. tools/trailer/tudor_compose.py lays them on.
//
//   node tools/trailer/captions.mjs <frames dir> <out dir>    # from unischool/
//
// Writes <out>/year-<N>-<fall|spring>.png. Not part of the game.
// ---------------------------------------------------------------------
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright-core';

const [framesDir, OUT] = process.argv.slice(2);
if (!framesDir || !OUT) {
  console.error('usage: captions <frames dir> <out dir>');
  process.exit(2);
}
mkdirSync(OUT, { recursive: true });
const BRICO = `${process.cwd()}/node_modules/@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-latin-wght-normal.woff2`;

// Every year and term the frames hold. format.ts's termName: the first half
// of the year is the fall term.
const wanted = new Map();
for (const f of readdirSync(framesDir).filter((n) => /^frame-\d+\.json$/.test(n))) {
  const { clock } = JSON.parse(readFileSync(join(framesDir, f), 'utf8')).state;
  const term = clock.week <= 26 ? 'fall' : 'spring';
  wanted.set(`year-${clock.year}-${term}`, { year: clock.year, term: term === 'fall' ? 'Fall term' : 'Spring term' });
}

// timelapseShoot.mjs's .timelapse-caption, as it draws at 1920x1080.
const CSS = `
@font-face { font-family: Brico; src: url('file://${BRICO}') format('woff2'); font-weight: 200 800; }
html, body { margin: 0; width: 1920px; height: 1080px; background: transparent; overflow: hidden; }
.caption { position: fixed; left: 48px; bottom: 40px; font: 600 44px/1 Brico, system-ui, sans-serif;
  color: #fff; text-shadow: 0 2px 10px rgba(0,0,0,.45); letter-spacing: .01em; }
.caption small { display: block; margin-top: 8px; font-size: 22px; font-weight: 500; opacity: .9; }
`;

const executablePath = [
  process.env.CHROME_PATH,
  `${process.env.PLAYWRIGHT_BROWSERS_PATH ?? ''}/chromium-1194/chrome-linux/chrome`,
  '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  '/usr/bin/chromium',
  '/usr/bin/google-chrome',
].filter(Boolean).find((p) => existsSync(p));
const browser = await chromium.launch({ executablePath, args: ['--no-sandbox', '--allow-file-access-from-files'] });
const page = await (await browser.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
const dir = OUT.startsWith('/') ? OUT : `${process.cwd()}/${OUT}`;
for (const [id, { year, term }] of wanted) {
  const file = `${dir}/${id}.html`;
  writeFileSync(file, `<!doctype html><meta charset="utf-8"><style>${CSS}</style><body><div class="caption">Year ${year}<small>${term}</small></div></body>`);
  await page.goto(`file://${file}`);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: `${dir}/${id}.png`, omitBackground: true });
}
await browser.close();
console.log(`wrote ${wanted.size} captions to ${OUT}`);
