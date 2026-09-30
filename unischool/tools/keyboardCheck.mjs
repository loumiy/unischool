// The campus map by keyboard (Plan 83E), in a real browser: Tab reaches the
// map's list of buildings, the arrow keys walk it in the order the map
// reads, the focused building is lit on the map, Enter inspects it, and
// leaving the list puts the map back as it was. Exits non-zero on a failed
// check.
//
//   npm run dev                       (in another terminal)
//   node tools/keyboardCheck.mjs      [path/to/save.json] [--shot=focused.png]
//
// CAMPUS_URL and CHROME_PATH as for tools/shoot.mjs. Not part of the game.

import { chromium } from 'playwright-core';
import { existsSync, readFileSync } from 'node:fs';
import { mapView, waitForMap } from './mapReview.mjs';

const URL = process.env.CAMPUS_URL ?? 'http://localhost:5173/';
const args = process.argv.slice(2);
const savePath = args.find((a) => !a.startsWith('--')) ?? 'test/fixtures/save-launch.json';
const shot = args.find((a) => a.startsWith('--shot='))?.slice(7) ?? null;
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
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(URL);
await page.evaluate((s) => localStorage.setItem('unischool.save', s), readFileSync(savePath, 'utf8'));
await page.reload();
await page.waitForTimeout(1500);
const cont = page.getByRole('button', { name: /Continue/ });
if (await cont.count()) await cont.first().click();
await page.waitForTimeout(800);
for (let i = 0; i < 10; i += 1) {
  const noted = page.getByRole('button', { name: /^Noted$/ });
  if (!(await noted.count())) break;
  await noted.first().click();
  await page.waitForTimeout(150);
}
await page.getByRole('button', { name: 'Paused', exact: true }).click().catch(() => {});
await page.mouse.move(0, 0);
const renderer = await waitForMap(page);
check(renderer !== null, `the map is up (${renderer})`);

const focused = () => page.evaluate(() => {
  const el = document.activeElement;
  return el?.closest('.map-building-list') ? { id: el.getAttribute('data-building-button'), name: el.textContent } : null;
});
const lit = () => page.evaluate(() => document.querySelector('.campus-map-svg')?.classList.contains('inspecting') ?? false);

// Nothing shows for a mouse player: the list takes no room on screen.
const box = await page.locator('.map-building-list').boundingBox();
check(box !== null && box.width <= 1 && box.height <= 1, 'the list is visually hidden');
check(!(await lit()), 'no building is lit before the keyboard reaches the list');

// Tab reaches the list, in a few presses from the top of the page.
await page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur());
let tabs = 0;
while (!(await focused()) && tabs < 30) { await page.keyboard.press('Tab'); tabs += 1; }
const first = await focused();
check(first !== null, `Tab reaches the map's buildings (${tabs} presses, on ${first?.name})`);
const count = await page.locator('.map-building-list button').count();
const stops = await page.locator('.map-building-list button[tabindex="0"]').count();
check(count > 3 && stops === 1, `one Tab stop for ${count} buildings`);
await waitForMap(page);
check(await lit(), 'the focused building is lit on the map');

// The arrow keys walk the list in the order the map reads (top to bottom),
// and do not pan the map while they do.
const names = [first?.name];
let panned = false;
for (let i = 0; i < Math.min(8, count - 1); i += 1) {
  const before = await mapView(page);
  // Where the next building stands before the key: one already on screen
  // is not panned to (one off screen is brought into view).
  const next = await page.evaluate(() => {
    const el = document.activeElement?.nextElementSibling;
    const id = el?.getAttribute('data-building-button');
    return window.__campusMap.buildings().find((b) => b.id === id) ?? null;
  });
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(120);
  names.push((await focused())?.name);
  const after = await mapView(page);
  const onScreen = next && next.x > 150 && next.y > 150 && next.x < 1130 && next.y < 650;
  if (onScreen && (before.x !== after.x || before.y !== after.y)) panned = true;
}
check(new Set(names).size === names.length && names.every(Boolean), `the arrow keys move from building to building (${names.join(' → ')})`);
check(!panned, 'the arrow keys do not pan the map while the list has the focus');
const ys = await page.evaluate((ids) => ids.map((id) => window.__campusMap.buildings().find((b) => b.id === id)?.y ?? 0), await page.$$eval('.map-building-list button', (els) => els.map((e) => e.getAttribute('data-building-button'))));
check(ys.every((y, i) => i === 0 || y >= ys[i - 1] - 48), 'the list runs top to bottom as the map reads');

await waitForMap(page);
if (shot) {
  await page.screenshot({ path: shot });
  console.log(`  wrote ${shot}`);
}

// Enter inspects it; Escape closes the panel.
await page.keyboard.press('Enter');
await page.waitForTimeout(300);
check(await page.locator('.building-info-line, [class*=building-info]').count() > 0, 'Enter inspects the focused building');
await page.keyboard.press('Escape');
await page.waitForTimeout(300);
check(await page.locator('[class*=building-info]').count() === 0, 'Escape closes its panel');

// Home and End, then out of the list: the map as it was.
await page.keyboard.press('End');
const last = await focused();
await page.keyboard.press('Home');
const home = await focused();
check(last?.id !== home?.id && home?.id === first?.id, `Home and End reach the ends (${home?.name} … ${last?.name})`);
await page.keyboard.press('Tab');
await page.waitForTimeout(200);
check(!(await focused()) && !(await lit()), 'leaving the list puts the light out');
await page.keyboard.press('Shift+Tab');
await page.waitForTimeout(200);
check((await focused())?.id === home?.id, 'Shift+Tab comes back to the building it left');

check(errors.length === 0, `no page errors${errors.length ? `: ${errors.join('; ')}` : ''}`);
await browser.close();
process.exit(failures ? 1 : 0);
