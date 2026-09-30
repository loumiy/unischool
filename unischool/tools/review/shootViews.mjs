// ---------------------------------------------------------------------
// EVERY VIEW OF A SAVE (Plan 73, area 1). Loads saves into one headless
// Chromium, one after another, and photographs each from all four corners
// of the campus (the E key's quarter turn, CampusMap.tsx), and optionally
// at a second pitch (X steepens, Z flattens). The camera turns about the
// ground at the middle of the canvas, which is where an arrangement campus
// stands (arrangements.ts), so the same framing serves every view.
//
//   npm run dev                                            # in one shell
//   npm run review:views -- node_modules/.tmp/arrangements/*.json \
//     --out node_modules/.tmp/views --zoom=3
//   npm run review:views -- save.json --out dir --zoom=2 --pitch=2 --size=1200,900
//
// Flags: --out=<dir> (default node_modules/.tmp/views), --zoom=N (the map's
// + button, N presses), --pitch=N (after the flat set, N presses of X for a
// second, steeper set; negative presses Z), --size=W,H (default 1400,900),
// --scale=N, --clip=x,y,w,h (default: the whole canvas above the dock).
// Writes <save>-v0.png … -v3.png (and -p<N>-v0 … for the second pitch).
//
// Same browser rules as shoot.mjs: playwright-core, no download.
// ---------------------------------------------------------------------
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { chromium } from 'playwright-core';
import { mapMissed, waitForMap } from '../mapReview.mjs';

// `--k=v` and `--k v` both work; everything else is a save.
const VALUE_FLAGS = ['out', 'zoom', 'pitch', 'size', 'scale', 'clip'];
const flags = {};
const saves = [];
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (!a.startsWith('--')) { saves.push(a); continue; }
  const [k, v] = a.slice(2).split(/=(.*)/s);
  flags[k] = v ?? (VALUE_FLAGS.includes(k) ? argv[++i] : 'true');
}
const flag = (name, fallback) => flags[name] ?? fallback;
if (saves.length === 0) {
  console.error('usage: shootViews <save.json>... [--out=dir] [--zoom=N] [--pitch=N] [--size=W,H] [--scale=N]');
  process.exit(2);
}
const out = flag('out', 'node_modules/.tmp/views');
const zoom = Number(flag('zoom', 2));
const pitch = Number(flag('pitch', 0));
const [W, H] = flag('size', '1400,900').split(',').map(Number);
const scale = Number(flag('scale', 1));
const clip = flag('clip', null)?.split(',').map(Number) ?? null;
const URL = process.env.CAMPUS_URL ?? 'http://localhost:5173/';

const CANDIDATES = [
  process.env.CHROME_PATH,
  `${process.env.PLAYWRIGHT_BROWSERS_PATH ?? ''}/chromium-1194/chrome-linux/chrome`,
  '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  '/usr/bin/chromium',
  '/usr/bin/google-chrome',
].filter(Boolean);
const executablePath = CANDIDATES.find((p) => existsSync(p));
if (!executablePath) {
  console.error(`no Chromium found. Tried:\n  ${CANDIDATES.join('\n  ')}\nSet CHROME_PATH.`);
  process.exit(2);
}
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ executablePath, args: ['--no-sandbox', '--disable-background-networking'] });
const errors = [];
// A context per save: the game saves itself when a page unloads
// (useGame.ts), so reusing one page would write the last save over the next.
let page = null;

// The canvas above the dock: the dock and the pennant stay out of shot.
async function canvasClip() {
  if (clip) return { x: clip[0], y: clip[1], width: clip[2], height: clip[3] };
  const dock = await page.locator('.toolbar, .dock').first().boundingBox().catch(() => null);
  const bottom = dock ? Math.max(200, dock.y - 40) : H - 120;
  return { x: 0, y: 0, width: W, height: bottom };
}

async function shoot(path) {
  await page.mouse.move(2, 2);
  await page.waitForTimeout(700);
  // The view in full: the canvas has made its drawings for it.
  await waitForMap(page);
  await page.screenshot({ path, clip: await canvasClip() });
}

async function turn() {
  await page.keyboard.press('e');
  // TURN_MS is 260; the scene redraws its walls and doors after the turn.
  await page.waitForTimeout(900);
}

for (const savePath of saves) {
  const name = basename(savePath).replace(/\.json$/, '');
  const save = readFileSync(savePath, 'utf8');
  const context = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: scale });
  page = await context.newPage();
  page.on('pageerror', (e) => errors.push(`${name}: ${String(e)}`));
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.evaluate((s) => { localStorage.clear(); localStorage.setItem('unischool.save', s); }, save);
  await page.goto(URL, { waitUntil: 'networkidle' });
  const cont = page.locator('.title-primary');
  if (await cont.count()) await cont.first().click();
  await page.waitForSelector('svg', { timeout: 20_000 });
  await page.waitForTimeout(1_500);
  // Paused, so the clock raises nothing mid-set: the gear itself, which
  // sets rather than toggles.
  await page.getByRole('button', { name: 'Paused', exact: true }).click().catch(() => {});
  if (zoom !== 0) {
    await page.click('.map-tools-toggle');
    for (let i = 0; i < Math.abs(zoom); i++) {
      await page.click(zoom > 0 ? 'button:has-text("+")' : 'button:has-text("−")');
      await page.waitForTimeout(150);
    }
    // Fold the tools away again, so the pill is not in shot.
    await page.click('.map-tools-toggle').catch(() => {});
  }
  await page.waitForTimeout(1_200);
  for (let v = 0; v < 4; v++) {
    await shoot(join(out, `${name}-v${v}.png`));
    await turn();
  }
  if (pitch !== 0) {
    for (let i = 0; i < Math.abs(pitch); i++) { await page.keyboard.press(pitch > 0 ? 'x' : 'z'); await page.waitForTimeout(300); }
    for (let v = 0; v < 4; v++) {
      await shoot(join(out, `${name}-p${pitch}-v${v}.png`));
      await turn();
    }
  }
  const renderer = await page.evaluate(() => window.__campusMap?.renderer() ?? null);
  const missed = Object.entries(await mapMissed(page) ?? {});
  if (renderer !== 'canvas') errors.push(`${name}: the ${renderer ?? 'no'} map is up, not the canvas`);
  if (missed.length) errors.push(`${name}: the canvas could not draw ${missed.map(([k, n]) => `${k} (${n})`).join(', ')}`);
  console.log(`${name}: ${pitch !== 0 ? 8 : 4} views`);
  await context.close();
}
if (errors.length > 0) console.log(`page errors:\n  ${[...new Set(errors)].join('\n  ')}`);
await browser.close();
