// ---------------------------------------------------------------------
// PHOTOGRAPH THE CAMPUS. Loads a save written by tools/makeSave.ts into a
// headless Chromium, drives the map's own zoom and pan controls, and writes
// a PNG.
//
// Needs the dev server up (`npm run dev`) and a Chromium on disk. It does
// NOT download one: `playwright-core` is the browserless package precisely
// so installing this repo does not pull 300MB nobody asked for. Point
// CHROME_PATH at any Chromium/Chrome build, or set PLAYWRIGHT_BROWSERS_PATH
// and let the default below find one.
//
//   npm run shot:save -- /tmp/gothic.json 22 gothic
//   npm run shot -- /tmp/gothic.json /tmp/gothic.png --zoom=-2 --pan=-430,320
//
// Flags: --zoom=N (+ in, - out), --pan=DX,DY (screen px, drag), --clip=x,y,w,h,
//        --size=W,H (viewport, default 1600,1000), --scale=N (device pixels per
//        CSS pixel: 2 for a print-sharp PNG at the same framing)
// ---------------------------------------------------------------------
import { readFileSync, existsSync } from 'node:fs';
import { chromium } from 'playwright-core';

const [savePath, outPath, ...flags] = process.argv.slice(2);
if (!savePath || !outPath) {
  console.error('usage: shoot <save.json> <out.png> [--zoom=N] [--pan=DX,DY] [--clip=x,y,w,h] [--size=W,H] [--scale=N]');
  process.exit(2);
}
const flag = (name, fallback) => {
  const hit = flags.find((f) => f.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};
const nums = (s) => (s ? s.split(',').map(Number) : null);

const URL = process.env.CAMPUS_URL ?? 'http://localhost:5173/';
const CANDIDATES = [
  process.env.CHROME_PATH,
  `${process.env.PLAYWRIGHT_BROWSERS_PATH ?? ''}/chromium-1194/chrome-linux/chrome`,
  '/usr/bin/chromium',
  '/usr/bin/google-chrome',
].filter(Boolean);
const executablePath = CANDIDATES.find((p) => existsSync(p));
if (!executablePath) {
  console.error(`no Chromium found. Tried:\n  ${CANDIDATES.join('\n  ')}\nSet CHROME_PATH.`);
  process.exit(2);
}

const save = readFileSync(savePath, 'utf8');
const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });
const size = nums(flag('size', null)) ?? [1600, 1000];
const page = await browser.newPage({
  viewport: { width: size[0], height: size[1] },
  deviceScaleFactor: Number(flag('scale', 1)),
});

// Two loads on purpose: the first is only there to give localStorage an
// origin to write the save into, the second is the one that reads it.
await page.goto(URL, { waitUntil: 'domcontentloaded' });
await page.evaluate((s) => localStorage.setItem('unischool.save', s), save);
await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForSelector('svg', { timeout: 20_000 });
await page.waitForTimeout(2_500);

const zoom = Number(flag('zoom', 0));
for (let i = 0; i < Math.abs(zoom); i++) {
  await page.click(zoom > 0 ? 'button:has-text("+")' : 'button:has-text("−")');
  await page.waitForTimeout(200);
}

const pan = nums(flag('pan', null));
if (pan) {
  await page.mouse.move(size[0] / 2, size[1] / 2);
  await page.mouse.down();
  await page.mouse.move(size[0] / 2 + pan[0], size[1] / 2 + pan[1], { steps: 20 });
  await page.mouse.up();
  await page.waitForTimeout(600);
}

// Trees settle and the map finishes its entry animation; a shot taken too
// early catches a half-drawn campus.
await page.waitForTimeout(2_000);
const clip = nums(flag('clip', null));
await page.screenshot({
  path: outPath,
  ...(clip ? { clip: { x: clip[0], y: clip[1], width: clip[2], height: clip[3] } } : {}),
});
await browser.close();
console.log(`wrote ${outPath}`);
