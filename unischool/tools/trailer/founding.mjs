// ---------------------------------------------------------------------
// THE TRAILER'S FIRST GAMEPLAY SHOT (docs/store/trailer.md, G1): a new game
// founded as Halifax, the map brought three steps closer, the build menu
// opened from the walkthrough's door, Founders Hall picked up, its ghost
// glided onto the lawn and set down. The page clock is Playwright's fake
// one, stepped a frame at a time as tools/clip.mjs steps it, and a cursor
// is drawn on the page, since a headless screenshot has none. The coach's
// card, the pennant and the ticker come off for the picture; the build
// menu and the dock stay.
//
//   npm run dev                                   # in one shell
//   node tools/trailer/founding.mjs <out dir>     # writes 0000.png …
//
// Not part of the game: nothing in src/ imports this.
// ---------------------------------------------------------------------
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { chromium } from 'playwright-core';

const OUT = process.argv[2] ?? 'node_modules/.tmp/trailer/g1';
const URL = process.env.CAMPUS_URL ?? 'http://localhost:5173/';
const W = 1920, H = 1080, FPS = 30;
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
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });
const page = await (await browser.newContext({ viewport: { width: W, height: H } })).newPage();
page.on('pageerror', (e) => console.error('pageerror', String(e)));
await page.clock.install();
await page.goto(URL, { waitUntil: 'domcontentloaded' });
await page.evaluate(() => {
  localStorage.clear();
  localStorage.setItem('unischool.settings.v1', JSON.stringify({ seasons: true, muted: true, pauseOnArrival: false, pauseForNews: false, stats: 'off', feedbackPrompts: false }));
});
await page.goto(URL, { waitUntil: 'networkidle' });

// The title screen's New game, then the founding: Halifax, Georgian, navy
// and gold.
await page.click('.title-screen .title-primary');
await page.waitForTimeout(500);
await page.fill('input[placeholder="e.g. Halifax"]', 'Halifax');
await page.locator('.startup-vern-btn', { hasText: 'Georgian' }).first().click();
await page.locator('.startup-color-btn[aria-label="Navy and gold"]').click();
await page.click('.startup-begin-btn');
await page.waitForTimeout(1200);
// The welcome letter: Next.
const welcome = page.locator('.modal[data-interrupt="welcome"]');
if (await welcome.count()) {
  await welcome.locator('button:not(.letter-skip)').first().click();
  await page.waitForTimeout(500);
}
// Closer in, through the map tools' own + button, as clip.mjs zooms.
await page.click('.map-tools-toggle');
for (let i = 0; i < 3; i++) { await page.click('button:has-text("+")'); await page.waitForTimeout(250); }
await page.click('.map-tools-toggle').catch(() => {});
await page.waitForTimeout(600);
// The walkthrough's step one: its door opens the build menu.
await page.locator('.opening-coach-actions button').first().click().catch(() => {});
await page.waitForTimeout(800);

await page.addStyleTag({ content: `
  .opening-coach, .toast, .log-ticker, .pennant { display: none !important; }
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
let n = 0;
const shot = async () => {
  await page.clock.runFor(1000 / FPS);
  await page.screenshot({ path: `${OUT}/${String(n++).padStart(4, '0')}.png` });
};
const ease = (t) => t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
async function glide(from, to, frames) {
  for (let i = 1; i <= frames; i++) {
    const t = ease(i / frames);
    const x = from.x + (to.x - from.x) * t, y = from.y + (to.y - from.y) * t;
    await page.mouse.move(x, y);
    await cursor(x, y);
    await shot();
  }
}
const start = { x: tile.x + tile.width / 2 + 260, y: tile.y - 160 };
const onTile = { x: tile.x + tile.width / 2, y: tile.y + tile.height / 2 };
await page.mouse.move(start.x, start.y);
await cursor(start.x, start.y);
for (let i = 0; i < 8; i++) await shot();
await glide(start, onTile, 18);
await page.mouse.click(onTile.x, onTile.y);
for (let i = 0; i < 4; i++) await shot();
await glide(onTile, target, 34);
for (let i = 0; i < 6; i++) await shot();
if (!(await page.locator('.campus-preview.ok').count())) console.warn('the ghost is red at the target: the hall may not go down');
// Set down (frame 70): the hall's panel comes off with every other popup.
await page.mouse.click(target.x, target.y);
await page.addStyleTag({ content: '.toolbar-popup, [role="dialog"] { display: none !important; }' });
await glide(target, { x: target.x + 120, y: target.y + 150 }, 20);
for (let i = 0; i < 24; i++) await shot();
console.log(`wrote ${n} frames to ${OUT}`);
await browser.close();
