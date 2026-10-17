// ---------------------------------------------------------------------
// THE TRAILER'S SCREENS WITH A HAND ON THEM (docs/store/trailer.md, shots
// 14 and 16), at four times the pixels for the edit's push-ins:
//
//   choice   the board's letter of the four specializations: the cursor
//            passes over the cards and chooses academics, the faculty
//            training program (its button armed, then confirmed);
//   charter  the charter letter opened from the inbox, its button Become
//            Halifax University clicked; then the map, the campus under
//            the pennant that now reads Halifax University (pennant/).
//
// The page clock is Playwright's fake one, stepped a frame at a time, and
// a cursor is drawn on the page, as tools/trailer/act2.mjs draws it.
//
//   npm run dev                                                 # in one shell
//   node tools/trailer/screens.mjs choice <save.json> <out dir>
//   node tools/trailer/screens.mjs charter <save.json> <out dir>
//
// Not part of the game: nothing in src/ imports this.
// ---------------------------------------------------------------------
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { chromium } from 'playwright-core';

const [mode, savePath, OUT] = process.argv.slice(2);
if (!['choice', 'charter'].includes(mode) || !savePath || !OUT) {
  console.error('usage: screens <choice|charter> <save.json> <out dir>');
  process.exit(2);
}
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
const page = await (await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2 })).newPage();
page.on('pageerror', (e) => console.error('pageerror', String(e)));
await page.clock.install();
await page.goto(URL, { waitUntil: 'domcontentloaded' });
await page.evaluate((s) => {
  localStorage.setItem('unischool.save', s);
  localStorage.setItem('unischool.settings.v1', JSON.stringify({ muted: true, pauseOnArrival: false, pauseForNews: false, stats: 'off', feedbackPrompts: false }));
}, readFileSync(savePath, 'utf8'));
await page.goto(URL, { waitUntil: 'networkidle' });
const cont = page.locator('.title-primary');
if (await cont.count()) await cont.first().click();
await page.waitForSelector('svg', { timeout: 20_000 });
await page.waitForTimeout(2_500);
await page.getByRole('button', { name: 'Paused', exact: true }).click().catch(() => {});

await page.addStyleTag({ content: `
  .toast, .tooltip, [role="tooltip"] { display: none !important; }
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

let dir = OUT;
let n = 0;
const shot = async () => {
  await page.clock.runFor(1000 / FPS);
  await page.screenshot({ path: `${dir}/${String(n++).padStart(4, '0')}.png` });
};
const ease = (t) => t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
let at = { x: W - 120, y: H - 200 };
async function glide(to, frames) {
  const from = at;
  for (let i = 1; i <= frames; i++) {
    const t = ease(i / frames);
    const x = from.x + (to.x - from.x) * t, y = from.y + (to.y - from.y) * t;
    await page.mouse.move(x, y);
    await cursor(x, y);
    await shot();
  }
  at = to;
}
async function hold(frames) { for (let i = 0; i < frames; i++) await shot(); }
const middle = async (locator) => {
  const b = await locator.boundingBox();
  if (!b) throw new Error(`not on the page: ${locator}`);
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
};

if (mode === 'choice') {
  await page.waitForSelector('.spec-card-choose', { timeout: 10_000 });
  const cards = page.locator('section:has(.spec-card-choose)');
  const count = await cards.count();
  const academics = cards.filter({ hasText: 'The faculty training program' }).first();
  const button = academics.locator('.spec-card-choose');
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
  await page.mouse.move(at.x, at.y);
  await cursor(at.x, at.y);
  await hold(3);
  // Across the cards, right to left, each title passed over.
  for (let i = count - 1; i >= 1; i--) {
    const title = await middle(cards.nth(i).locator('h3, h4, .spec-card-name').first());
    await glide({ x: title.x, y: title.y + 30 }, 11);
  }
  await glide(await middle(button), 16);
  await hold(5);
  await page.mouse.click(at.x, at.y);                 // armed
  await hold(9);
  await glide(await middle(button), 3);
  await page.mouse.click(at.x, at.y);                 // confirmed
  await hold(10);
} else {
  await page.getByRole('button', { name: 'Inbox' }).first().click();
  await page.waitForSelector('.tab-overlay', { timeout: 10_000 });
  await page.waitForTimeout(800);
  // The letter opens on its own, the one waiting for an answer; its
  // button carries a line under the label, so it is found by its start.
  const become = page.locator('.tab-overlay button', { hasText: /^Become .+ University/ }).first();
  await become.scrollIntoViewIfNeeded();
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
  const b = await middle(become);
  at = { x: b.x + 420, y: b.y + 260 };
  await page.mouse.move(at.x, at.y);
  await cursor(at.x, at.y);
  await hold(6);
  await glide(b, 26);
  await hold(6);
  await page.mouse.click(b.x, b.y);
  await hold(8);
  console.log(`letter: ${n} frames, the button at ${Math.round(b.x)},${Math.round(b.y)}`);
  // The map again, the campus brought under the pennant.
  await page.keyboard.press('Escape');
  await page.clock.runFor(600);
  await page.locator('.tab-overlay').waitFor({ state: 'detached', timeout: 5_000 }).catch(() => {});
  await cursor(-50, -50);
  const fh = await page.evaluate(() => window.__campusMap.buildings().find((x) => x.id === 'BLDG-GENSTUDIES'));
  const goal = { x: 520, y: 330 };
  await page.mouse.move(W / 2, H / 2);
  await page.mouse.down();
  await page.mouse.move(W / 2 + (goal.x - fh.x), H / 2 + (goal.y - fh.y), { steps: 12 });
  await page.mouse.up();
  await page.keyboard.press('Escape');
  await page.mouse.move(W - 2, H / 2);
  await page.clock.runFor(1500);
  dir = `${OUT}/pennant`;
  mkdirSync(dir, { recursive: true });
  n = 0;
  await hold(30);
  const pennant = await page.locator('.pennant').first().textContent().catch(() => '');
  console.log(`pennant: ${n} frames, reading "${(pennant ?? '').trim()}"`);
}
console.log(`wrote ${OUT}`);
await browser.close();
