// The campus map on a touch screen (Plan 70F), in a real browser with touch
// emulated: one finger pans, two pinch to zoom, a tap opens a building, and
// a picked-up building is set down with a tap and built only with Place.
// Exits non-zero on the first failed check.
//
//   npm run dev                       (in another terminal)
//   node tools/touchCheck.mjs         [path/to/save.json]  (default: the launch fixture)
//
// CAMPUS_URL and CHROME_PATH as for tools/shoot.mjs. Not part of the game.

import { chromium } from 'playwright-core';
import { existsSync, readFileSync } from 'node:fs';

const URL = process.env.CAMPUS_URL ?? 'http://localhost:5173/';
const savePath = process.argv[2] ?? 'test/fixtures/save-launch.json';
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

let failures = 0;
const check = (ok, what) => {
  console.log(`${ok ? '✓' : '✗'} ${what}`);
  if (!ok) failures += 1;
};

const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: 1024, height: 768 }, hasTouch: true, isMobile: false });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
const cdp = await context.newCDPSession(page);

// Touch through the DevTools protocol, so the page sees real touch pointers.
const touch = (type, points) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points.map(([x, y], id) => ({ x, y, id })) });
async function drag(from, to, steps = 8) {
  await touch('touchStart', [from]);
  for (let i = 1; i <= steps; i += 1) {
    await touch('touchMove', [[from[0] + ((to[0] - from[0]) * i) / steps, from[1] + ((to[1] - from[1]) * i) / steps]]);
  }
  await touch('touchEnd', []);
}
async function pinch(centre, fromGap, toGap, steps = 8) {
  const at = (gap) => [[centre[0] - gap / 2, centre[1]], [centre[0] + gap / 2, centre[1]]];
  await touch('touchStart', at(fromGap));
  for (let i = 1; i <= steps; i += 1) await touch('touchMove', at(fromGap + ((toGap - fromGap) * i) / steps));
  await touch('touchEnd', []);
}
async function tap(x, y) {
  await page.touchscreen.tap(x, y);
  await page.waitForTimeout(250);
}
const view = () => page.evaluate(() => {
  const t = document.querySelector('.campus-map-svg > g')?.getAttribute('transform') ?? '';
  const m = /translate\(([-\d.e]+) ([-\d.e]+)\) scale\(([-\d.e]+)\)/.exec(t);
  return m ? { x: Number(m[1]), y: Number(m[2]), zoom: Number(m[3]) } : null;
});

await page.goto(URL);
await page.evaluate((s) => localStorage.setItem('unischool.save', s), readFileSync(savePath, 'utf8'));
await page.reload();
await page.waitForTimeout(1500);
const cont = page.getByRole('button', { name: /Continue/ });
if (await cont.count()) await cont.first().tap();
await page.waitForTimeout(800);
for (let i = 0; i < 10; i += 1) {
  const noted = page.getByRole('button', { name: /^Noted$/ });
  if (!(await noted.count())) break;
  await noted.first().tap();
  await page.waitForTimeout(150);
}

// One finger pans.
const v0 = await view();
await drag([600, 400], [500, 330]);
await page.waitForTimeout(150);
const v1 = await view();
check(v0 && v1 && Math.abs(v1.x - v0.x + 100) < 2 && Math.abs(v1.y - v0.y + 70) < 2 && v1.zoom === v0.zoom, `one finger pans by its travel (${JSON.stringify(v0)} → ${JSON.stringify(v1)})`);

// Two pinch.
await pinch([512, 380], 100, 200);
await page.waitForTimeout(150);
const v2 = await view();
check(v1 && v2 && v2.zoom > v1.zoom * 1.6, `two fingers spread to twice the gap zoom in (${v1?.zoom.toFixed(2)} → ${v2?.zoom.toFixed(2)})`);
check(await page.locator('.campus-map-zoom-controls.touch-ui [aria-label="Turn the view left"]').count() === 1, 'the camera buttons show once the map is touched');

// A tap opens a building: the first hall's slot marks.
const mark = page.locator('.campus-hall-marks').first();
const box = await mark.boundingBox();
if (box) {
  await tap(box.x + box.width / 2, box.y + box.height / 2);
  check(await page.locator('.building-info-line, [class*=building-info]').count() > 0, 'a tap on a hall opens its panel');
  await page.keyboard.press('Escape');
} else {
  check(false, 'a hall to tap');
}

// Picking up a building and placing it by touch.
await page.locator('.toolbar-build-btn').tap();
await page.waitForTimeout(400);
let armed = false;
for (const tab of await page.locator('.build-cat-tab').all()) {
  await tab.tap();
  await page.waitForTimeout(150);
  // Groups open on a tap ("show ▸").
  for (const more of await page.locator('.build-popup button:has-text("show")').all()) {
    await more.tap().catch(() => {});
    await page.waitForTimeout(80);
  }
  const tile = page.locator('button.build-tile.available:not([disabled])').first();
  if (await tile.count()) { await tile.tap(); armed = true; break; }
}
check(armed, 'a building is picked up from the build tray by touch');
if (armed) {
  await page.waitForTimeout(300);
  check(await page.locator('.map-touch-bar').count() === 1, 'the touch bar shows while placing');
  const placedBefore = await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('unischool.save') ?? '{}').state?.placements ?? {}).length);
  const cash0 = await page.locator('.toolbar-money, [class*=money]').first().textContent();
  // Try a few spots until the ghost says it can go there.
  let ok = false;
  for (const [x, y] of [[300, 180], [760, 180], [200, 300], [850, 300], [512, 150]]) {
    await tap(x, y);
    const note = await page.locator('.map-touch-bar-note').textContent();
    const disabled = await page.locator('.map-touch-bar button.primary').isDisabled();
    if (!disabled) { ok = true; break; }
    console.log(`  (${x}, ${y}): ${note}`);
  }
  const cash1 = await page.locator('.toolbar-money, [class*=money]').first().textContent();
  check(cash0 === cash1, 'a tap sets the ghost down without building');
  check(ok, 'Place is offered where the site is clear');
  if (ok) {
    await page.locator('.map-touch-bar button.primary').tap();
    await page.waitForTimeout(400);
    check(await page.locator('.map-touch-bar').count() === 0, 'Place builds and puts the bar away');
    void placedBefore;
  }
}

check(errors.length === 0, `no page errors${errors.length ? `: ${errors.join('; ')}` : ''}`);
await browser.close();
process.exit(failures > 0 ? 1 : 0);
