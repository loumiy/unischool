// ---------------------------------------------------------------------
// THE TRAILER'S ACT 2 (docs/store/trailer.md, shots 7 to 11): one new game,
// Halifax in navy and gold, founded and laid out on camera.
//
//   7  the founding screen's facade, Halifax typed and carved letter by
//      letter, at six times the pixels and cropped to the facade;
//   8  the map three steps closer, Founders Hall picked up from the build
//      menu, its ghost glided onto the lawn and set down;
//   9  two steps closer, the build menu on its Grounds tab: flower beds
//      dragged along the hall's south and east walls, lifting at each door
//      (the north and west walls are planted between takes);
//   10 the path tool: a straight walk out from each door through its gap,
//      and the four walks held;
//   11 Meadow House, the first residence hall, sited beside the hall, and
//      the game saved, for tools/clip.mjs to record it rising
//      (--until-built --no-seasons).
//
// The page clock is Playwright's fake one, stepped a frame at a time as
// tools/clip.mjs steps it, and a cursor is drawn on the page, since a
// headless screenshot has none. The map stays in summer (the Seasons
// setting's Always summer), as the rest of the act is recorded, and its own
// labels and marks and the tools' hint are hidden; the build menu and the
// dock stay.
//
//   npm run dev                                   # in one shell
//   node tools/trailer/act2.mjs <out dir>         # name/ founding/ beds/ walks/ meadow.json
//
// Not part of the game: nothing in src/ imports this.
// ---------------------------------------------------------------------
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright-core';
import { CLEAN_MAP_CSS } from '../mapReview.mjs';

const OUT = process.argv[2] ?? 'node_modules/.tmp/tr60/act2';
const URL = process.env.CAMPUS_URL ?? 'http://localhost:5173/';
const W = 1920, H = 1080, FPS = 30;
const NAME = 'Halifax';
const SETTINGS = { seasons: false, muted: true, pauseOnArrival: false, pauseForNews: false, stats: 'off', feedbackPrompts: false };
const executablePath = [
  process.env.CHROME_PATH,
  `${process.env.PLAYWRIGHT_BROWSERS_PATH ?? ''}/chromium-1194/chrome-linux/chrome`,
  '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  '/usr/bin/chromium',
  '/usr/bin/google-chrome',
].filter(Boolean).find((p) => existsSync(p));
if (!executablePath) {
  console.error('no Chromium found. Set CHROME_PATH.');
  process.exit(2);
}
rmSync(OUT, { recursive: true, force: true });
for (const d of ['name', 'founding', 'beds', 'walks']) mkdirSync(`${OUT}/${d}`, { recursive: true });
const pad = (n) => String(n).padStart(4, '0');

const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });

async function fresh(context) {
  const page = await context.newPage();
  page.on('pageerror', (e) => console.error('pageerror', String(e)));
  await page.clock.install();
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.evaluate((settings) => {
    localStorage.clear();
    localStorage.setItem('unischool.settings.v1', JSON.stringify(settings));
  }, SETTINGS);
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.click('.title-screen .title-primary');
  await page.waitForTimeout(500);
  await page.locator('.startup-vern-btn', { hasText: 'Georgian' }).first().click();
  await page.locator('.startup-color-btn[aria-label="Navy and gold"]').click();
  return page;
}

// --- 7 · The name, carved ---------------------------------------------
{
  const page = await fresh(await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 6 }));
  await page.evaluate(() => document.fonts.ready);
  const box = await page.locator('.startup-facade-svg').boundingBox();
  const input = page.locator('input[placeholder="e.g. Halifax"]');
  await input.focus();
  let n = 0;
  const hold = async (frames) => {
    for (let i = 0; i < frames; i++) await page.screenshot({ path: `${OUT}/name/${pad(n++)}.png`, clip: box });
  };
  // A beat on the bare COLLEGE, a letter every four frames, then the name.
  await hold(6);
  for (const ch of NAME) {
    await page.keyboard.type(ch);
    await hold(4);
  }
  await hold(24);
  console.log(`name: ${n} frames, the facade ${Math.round(box.width)}x${Math.round(box.height)} CSS px at 6x`);
  await page.context().close();
}

// --- 8 · The founding ---------------------------------------------------
const page = await fresh(await browser.newContext({ viewport: { width: W, height: H } }));
await page.fill('input[placeholder="e.g. Halifax"]', NAME);
await page.click('.startup-begin-btn');
await page.waitForTimeout(1200);
// The welcome letter: Next.
const welcome = page.locator('.modal[data-interrupt="welcome"]');
if (await welcome.count()) {
  await welcome.locator('button:not(.letter-skip)').first().click();
  await page.waitForTimeout(500);
}
// Closer in, through the map tools' own + button, as clip.mjs zooms.
async function zoomIn(steps) {
  await page.click('.map-tools-toggle');
  for (let i = 0; i < steps; i++) { await page.click('button:has-text("+")'); await page.waitForTimeout(250); }
  await page.click('.map-tools-toggle').catch(() => {});
}
await zoomIn(3);
await page.waitForTimeout(600);
// The walkthrough's step one: its door opens the build menu.
await page.locator('.opening-coach-actions button').first().click().catch(() => {});
await page.waitForTimeout(800);

await page.addStyleTag({ content: `${CLEAN_MAP_CSS}
  .opening-coach, .toast, .log-ticker, .pennant, .map-tool-hint { display: none !important; }
  #trailer-cursor { position: fixed; z-index: 99999; pointer-events: none; width: 34px; height: 34px;
    filter: drop-shadow(0 2px 3px rgba(0,0,0,.45)); transform: translate(-3px, -2px); }
` });
await page.evaluate(() => {
  const c = document.createElement('div');
  c.id = 'trailer-cursor';
  c.innerHTML = '<svg viewBox="0 0 24 24" width="34" height="34"><path d="M3 2 L3 19 L7.5 15 L10.5 22 L13.5 20.8 L10.6 14 L17 14 Z" fill="#fff" stroke="#111" stroke-width="1.4" stroke-linejoin="round"/></svg>';
  c.style.left = '-50px'; c.style.top = '-50px';
  document.body.appendChild(c);
});
const cursor = (x, y) => page.evaluate(([x, y]) => {
  const c = document.getElementById('trailer-cursor');
  c.style.left = `${x}px`; c.style.top = `${y}px`;
}, [x, y]);

const tile = await page.locator('.build-tile', { hasText: 'Founders Hall' }).first().boundingBox();
if (!tile) {
  console.error('no Founders Hall tile: the build menu did not open');
  process.exit(2);
}
// The hall goes a little above the middle of the view.
const target = { x: W / 2, y: H / 2 - 40 };

await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
await page.clock.runFor(1500);
let dir = 'founding';
let n = 0;
const shot = async () => {
  await page.clock.runFor(1000 / FPS);
  await page.screenshot({ path: `${OUT}/${dir}/${pad(n++)}.png` });
};
const take = (d) => { dir = d; n = 0; };
const ease = (t) => t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
let at = { x: -50, y: -50 };
async function glide(to, frames, { record = true } = {}) {
  const from = at;
  for (let i = 1; i <= frames; i++) {
    const t = ease(i / frames);
    const x = from.x + (to.x - from.x) * t, y = from.y + (to.y - from.y) * t;
    await page.mouse.move(x, y);
    await cursor(x, y);
    if (record) await shot();
  }
  at = to;
}
async function hold(frames) { for (let i = 0; i < frames; i++) await shot(); }

const start = { x: tile.x + tile.width / 2 + 260, y: tile.y - 160 };
const onTile = { x: tile.x + tile.width / 2, y: tile.y + tile.height / 2 };
at = start;
await page.mouse.move(start.x, start.y);
await cursor(start.x, start.y);
await hold(8);
await glide(onTile, 18);
await page.mouse.click(onTile.x, onTile.y);
await hold(4);
await glide(target, 34);
await hold(6);
if (!(await page.locator('.campus-preview.ok').count())) console.warn('the ghost is red at the target: the hall may not go down');
// Set down (frame 70): the hall's panel comes off with every other popup.
await page.mouse.click(target.x, target.y);
const popupsOff = await page.addStyleTag({ content: '.toolbar-popup, [role="dialog"] { display: none !important; }' });
await glide({ x: target.x + 120, y: target.y + 150 }, 20);
await hold(24);
console.log(`founding: ${n} frames`);

// The walkthrough steps aside by its own skip (the coach's, armed then
// confirmed), so every door of the dock opens; its card is hidden, so the
// clicks are the page's own.
for (let i = 0; i < 2; i++) {
  await page.evaluate(() => document.querySelector('.opening-coach .letter-skip')?.click());
  await page.waitForTimeout(150);
}
if (await page.locator('.toolbar-build-btn').isDisabled()) {
  console.error('the walkthrough still holds the dock');
  process.exit(2);
}

// --- Where things are -----------------------------------------------------
// The state, as the game saves it when the page is hidden (useGame.ts).
const state = () => page.evaluate(() => {
  window.dispatchEvent(new Event('pagehide'));
  return JSON.parse(localStorage.getItem('unischool.save')).state;
});
const fh = (await state()).placements['BLDG-GENSTUDIES'];
if (!fh) {
  console.error('Founders Hall was not set down');
  process.exit(2);
}
// A tile's middle on the page: isoProjection's default camera (a point
// (col, row) at x = 32(col - row), y = 16(col + row) in the world), then
// the map's view (window.__campusMap: p * zoom + (x, y) from the map's
// corner), the corner found from the hall's own middle.
async function projector() {
  const { v, mid } = await page.evaluate(() => {
    const m = window.__campusMap;
    return { v: m.view(), mid: m.buildings().find((b) => b.id === 'BLDG-GENSTUDIES') };
  });
  const world = (col, row) => ({ x: 32 * (col - row), y: 16 * (col + row) });
  const fw = world(fh.col + fh.w / 2, fh.row + fh.h / 2);
  const corner = { x: mid.x - fw.x * v.zoom - v.x, y: mid.y - fw.y * v.zoom - v.y };
  return (row, col) => {
    const p = world(col + 0.5, row + 0.5);
    return { x: p.x * v.zoom + v.x + corner.x, y: p.y * v.zoom + v.y + corner.y };
  };
}

// --- 9 · The flower beds -------------------------------------------------
await popupsOff.evaluate((el) => el.remove());
await page.keyboard.press('Escape');
await page.waitForTimeout(300);
await zoomIn(2);
if (!(await page.locator('.build-mode-tabs').isVisible().catch(() => false))) await page.click('.toolbar-build-btn');
await page.locator('.build-cat-tab', { hasText: 'Grounds' }).first().click();
await page.locator('.build-mini-tile', { hasText: 'Flower bed' }).first().click();
await page.waitForTimeout(400);
let tileAt = await projector();
const { row: r0, col: c0, w: fw, h: fh_ } = fh;
const S = r0 + fh_, E = c0 + fw, N = r0 - 1, Wc = c0 - 1;          // the rows and columns round the hall
const door = { s: [S, c0 + Math.floor(fw / 2)], e: [r0 + Math.floor(fh_ / 2), E], n: [N, c0 + Math.floor(fw / 2)], w: [r0 + Math.floor(fh_ / 2), Wc] };
// A run of beds: down on the first tile, across each in turn, up on the last.
async function run(tiles, { record = true, perTile = 3 } = {}) {
  const pts = tiles.map(([r, c]) => tileAt(r, c));
  await glide(pts[0], record ? 8 : 1, { record });
  await page.mouse.down();
  for (const p of pts.slice(1)) await glide(p, perTile, { record });
  await page.mouse.up();
}
const span = (a, b) => (a <= b ? Array.from({ length: b - a + 1 }, (_, i) => a + i) : Array.from({ length: a - b + 1 }, (_, i) => a - i));
take('beds');
at = tileAt(S + 2, c0 - 2);
await page.mouse.move(at.x, at.y);
await cursor(at.x, at.y);
await hold(4);
// The south wall, west to east, lifting at its door; round the corner and
// up the east wall, lifting at that door.
await run(span(Wc, door.s[1] - 1).map((c) => [S, c]));
await run([...span(door.s[1] + 1, E).map((c) => [S, c]), ...span(S - 1, door.e[0] + 1).map((r) => [r, E])]);
await run(span(door.e[0] - 1, N).map((r) => [r, E]));
await glide({ x: at.x + 90, y: at.y + 110 }, 10);
await hold(6);
console.log(`beds: ${n} frames`);
// Between takes: the north and west walls.
await run(span(E - 1, door.n[1] + 1).map((c) => [N, c]), { record: false, perTile: 1 });
await run([...span(door.n[1] - 1, Wc).map((c) => [N, c]), ...span(r0, door.w[0] - 1).map((r) => [r, Wc])], { record: false, perTile: 1 });
await run(span(door.w[0] + 1, S - 1).map((r) => [r, Wc]), { record: false, perTile: 1 });

// --- 10 · The walks --------------------------------------------------------
await page.locator('.build-mini-tile', { hasText: 'Paths' }).first().click();
await page.waitForTimeout(300);
tileAt = await projector();
take('walks');
await hold(4);
// Straight, Shift held, out from each door: the two the camera faces first.
const LEN = 6;
const walks = [
  [door.s, [door.s[0] + LEN, door.s[1]]],
  [door.e, [door.e[0], door.e[1] + LEN]],
  [door.w, [door.w[0], door.w[1] - LEN]],
  [door.n, [door.n[0] - LEN, door.n[1]]],
];
await page.keyboard.down('Shift');
for (const [[ra, ca], [rb, cb]] of walks) {
  const rows = span(ra, rb), cols = span(ca, cb);
  await run(rows.length > 1 ? rows.map((r) => [r, ca]) : cols.map((c) => [ra, c]), { perTile: 2 });
}
await page.keyboard.up('Shift');
await page.keyboard.press('Escape');
await glide({ x: W - 60, y: H / 2 }, 14);
await hold(60);
console.log(`walks: ${n} frames`);

// --- 11 · Meadow House, sited -----------------------------------------------
if (!(await page.locator('.build-mode-tabs').isVisible().catch(() => false))) await page.click('.toolbar-build-btn');
const tabs = page.locator('.build-cat-tab');
for (let i = 0; i < await tabs.count(); i++) {
  await tabs.nth(i).click();
  if (await page.locator('.build-tile', { hasText: 'Meadow House' }).count()) break;
}
await page.locator('.build-tile', { hasText: 'Meadow House' }).first().click();
await page.waitForTimeout(300);
// Beside the hall, across the east walk, a little south.
tileAt = await projector();
const site = tileAt(S + 1, E + 4);
await page.mouse.move(site.x, site.y, { steps: 6 });
await page.clock.runFor(300);
if (!(await page.locator('.campus-preview.ok').count())) console.warn('the ghost is red at the site: Meadow House may not go down');
await page.mouse.click(site.x, site.y);
await page.clock.runFor(500);
const saved = await state();
if (!saved.placements['DORM-01']) console.warn('Meadow House was not sited');
writeFileSync(`${OUT}/meadow.json`, JSON.stringify({ version: (await page.evaluate(() => JSON.parse(localStorage.getItem('unischool.save')).version)), savedAt: Date.now(), state: saved }));
console.log(`Founders Hall at row ${r0}, col ${c0}; Meadow House at ${JSON.stringify(saved.placements['DORM-01'] ?? null)}; ${Object.values(saved.dressing ?? {}).filter((d) => d === 'flowerbed').length} beds, ${Object.keys(saved.pathways ?? {}).length} walk tiles`);
await browser.close();
