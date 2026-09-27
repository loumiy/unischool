// ---------------------------------------------------------------------
// The phone check (Plan 70G): every tab, the Treasury, the build tray, the
// menu and the dock at 390x844 (a phone) and 820x1180 (a tablet), as a touch
// device, reporting anything that runs past the screen's edge and does not
// sit inside something that scrolls or clips it, and every '?' on each
// screen opened by a tap, its explanation inside the screen. Exits 1 if
// anything fails.
//
//   npm run dev                                   # in one terminal
//   npm run phone -- [save.json] [--out=dir]      # screenshots too, with --out
//
// A save held at a modal (npm run scenario -- --modal summer) is walked
// through the modal's steps instead of the tabs.
//
// The save defaults to test/fixtures/save-launch.json (a year-25 college with
// every tab populated). CAMPUS_URL and CHROME_PATH as for tools/shoot.mjs.
// Not part of the game: nothing imports it.
// ---------------------------------------------------------------------

import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { chromium } from 'playwright-core';

const args = process.argv.slice(2);
const savePath = args.find((a) => !a.startsWith('--')) ?? 'test/fixtures/save-launch.json';
const out = args.find((a) => a.startsWith('--out='))?.slice(6);
const URL = process.env.CAMPUS_URL ?? 'http://localhost:5173/';
const SIZES = [[390, 844], [820, 1180]];

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

const save = JSON.parse(readFileSync(savePath, 'utf8'));
// The ladder's unread letters would open over the first screen.
if (save.state?.ladder) save.state.ladder.unread = [];
if (out) mkdirSync(out, { recursive: true });

// Everything past the right edge (or, for a fixed element, either edge) that
// no scrolling or clipping ancestor holds, and a tab body that scrolls
// sideways. SVG internals are the map's, which pans.
function measure() {
  const W = window.innerWidth;
  const held = (e) => {
    for (let n = e.parentElement; n && n !== document.body; n = n.parentElement) {
      if (n.classList.contains('tab-overlay-body')) return false;
      const ox = getComputedStyle(n).overflowX;
      if ((ox === 'auto' || ox === 'scroll' || ox === 'hidden' || ox === 'clip') && n.getBoundingClientRect().right <= W + 1) return true;
    }
    return false;
  };
  const name = (e) => `${e.tagName.toLowerCase()}.${String(e.className).split(' ')[0]}`;
  const all = [...document.querySelectorAll('body *')].filter((e) => !e.closest('svg'));
  const problems = [];
  const body = document.querySelector('.tab-overlay-body');
  if (body && body.scrollWidth > body.clientWidth + 1) problems.push(`the tab scrolls sideways (${body.scrollWidth} in ${body.clientWidth})`);
  if (document.documentElement.scrollWidth > W + 1) problems.push(`the page scrolls sideways (${document.documentElement.scrollWidth} in ${W})`);
  for (const e of all) {
    const r = e.getBoundingClientRect();
    const cs = getComputedStyle(e);
    if (r.width === 0 || cs.visibility === 'hidden') continue;
    if (cs.position === 'fixed') {
      if (r.right > W + 1 || r.left < -1) problems.push(`${name(e)} fixed at ${Math.round(r.left)}..${Math.round(r.right)}`);
    } else if (r.right > W + 1 && !held(e)) {
      problems.push(`${name(e)} runs to ${Math.round(r.right)}`);
    }
    if (problems.length >= 6) break;
  }
  return problems;
}

const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });
let failures = 0;
for (const [w, h] of SIZES) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.evaluate((s) => localStorage.setItem('unischool.save', s), JSON.stringify(save));
  await page.goto(URL, { waitUntil: 'networkidle' });
  // Every '?' on the screen, opened by a tap in turn: its explanation must
  // land inside the screen.
  const hints = async () => {
    const off = [];
    const buttons = page.locator('.help-hint-btn:visible');
    const n = Math.min(await buttons.count(), 20);
    for (let i = 0; i < n; i += 1) {
      const button = buttons.nth(i);
      await button.scrollIntoViewIfNeeded({ timeout: 1_000 }).catch(() => {});
      if (!(await button.tap({ timeout: 1_000 }).then(() => true, () => false))) continue;
      await page.waitForTimeout(120);
      const r = await page.evaluate(() => {
        const p = document.querySelector('.help-hint-text');
        if (!p) return null;
        const b = p.getBoundingClientRect();
        return { left: b.left, right: b.right, text: p.textContent.slice(0, 30) };
      });
      if (r && (r.left < 0 || r.right > w)) off.push(`"${r.text}…" at ${Math.round(r.left)}..${Math.round(r.right)}`);
      // Escape closes an open hint and nothing else (HelpHint.tsx).
      await page.keyboard.press('Escape');
    }
    return { n, off };
  };
  const check = async (label) => {
    await page.waitForTimeout(500);
    const problems = await page.evaluate(measure);
    if (out) await page.screenshot({ path: `${out}/${w}-${label}.png` });
    const { n, off } = await hints();
    if (off.length) problems.push(`hints past the edge: ${off.join(', ')}`);
    console.log(`${problems.length ? '✗' : '✓'} ${w}x${h} ${label} (${n} hints)${problems.length ? `: ${problems.join('; ')}` : ''}`);
    failures += problems.length ? 1 : 0;
  };
  await check('title');
  const cont = page.locator('.title-primary');
  if (await cont.count()) await cont.first().tap();
  await page.waitForTimeout(1_500);
  await check('campus');
  // A save held at a modal (npm run scenario -- --modal summer): each of its
  // steps in turn, moved on by its forward button, instead of the tabs,
  // which sit behind it.
  if (await page.locator('.modal').count()) {
    for (let step = 1; step <= 8 && (await page.locator('.modal').count()); step += 1) {
      await check(`modal-${step}`);
      const buttons = page.locator('.modal button:visible');
      const labels = await buttons.allInnerTexts();
      const i = labels.findIndex((t) => /continue|lock|^set |^open |admit|commit|begin|onward|done|carry on|accept|close/i.test(t));
      if (i < 0) { console.log(`  (no forward button among: ${labels.join(' | ')})`); break; }
      await buttons.nth(i).tap();
      await page.waitForTimeout(700);
    }
    if (errors.length) { console.log(`✗ ${w}x${h} page errors: ${errors.join(' | ')}`); failures += 1; }
    await ctx.close();
    continue;
  }
  const close = async () => {
    const button = page.getByRole('button', { name: /^Close/ }).first();
    if (await button.count()) await button.tap().catch(() => {});
    await page.waitForTimeout(200);
  };
  for (const tab of ['Curriculum', 'Faculty', 'Research', 'Students', 'Athletics', 'History']) {
    const button = page.locator(`.toolbar-tabs button[aria-label^="${tab}"]`).first();
    if (!(await button.count())) { console.log(`✗ ${w}x${h} no ${tab} tab`); failures += 1; continue; }
    await button.scrollIntoViewIfNeeded();
    await button.tap();
    await check(tab.toLowerCase());
    await close();
  }
  await page.locator('.toolbar-funds-btn').first().tap();
  await check('treasury');
  await close();
  const build = page.locator('.toolbar-build-btn');
  await build.scrollIntoViewIfNeeded();
  await build.tap();
  await check('build');
  // On a phone the dock folds while the menu is open (Plan 76I), so the
  // menu's own close puts it away.
  await close();
  await page.waitForTimeout(300);
  const menu = page.locator('.main-menu-btn');
  if (await menu.count()) {
    await menu.tap();
    await check('menu');
    await menu.tap();
  }
  if (errors.length) { console.log(`✗ ${w}x${h} page errors: ${errors.join(' | ')}`); failures += 1; }
  await ctx.close();
}
await browser.close();
console.log(failures ? `${failures} screens run past the edge.` : 'Nothing runs past the edge.');
process.exit(failures ? 1 : 0);
