// ---------------------------------------------------------------------
// EVERY SCREEN, CAPTURED AND COUNTED (Plan 73, area 2). Loads each save in
// a fresh headless Chromium at each size, photographs what is standing
// (the title screen, the map, then any modal held in the save, stepped
// through to the end), then opens each tab, the Build menu, the main menu,
// Settings and Founders Hall's panel in turn. Every capture is counted:
// the words and the controls on the top layer (the last dialog open) and
// on the whole page, and whether the top layer has to scroll.
//
//   npm run dev                                        # in one shell
//   npm run review:gallery -- node_modules/.tmp/sc/*.json --out node_modules/.tmp/gallery
//   npm run review:gallery -- save.json --sizes desktop,phone --no-shots
//
// Writes <out>/<save>-<size>-<nn>-<what>.png, gallery.json and gallery.md.
// A fresh page with no save is captured too (the title and the founding
// form) unless --no-fresh. --settings '<json>' plays with the player's
// settings set (settings.ts: textScale 1–1.3, vision 'safe', motion
// 'reduce'), for the sweep at the text scale's extreme.
// ---------------------------------------------------------------------
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { chromium } from 'playwright-core';
import { mapBuildings, mapMissed, waitForMap } from '../mapReview.mjs';

const argv = process.argv.slice(2);
const VALUE_FLAGS = ['out', 'sizes', 'settings'];
const flags = {};
const saves = [];
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (!a.startsWith('--')) { saves.push(a); continue; }
  const [k, v] = a.slice(2).split(/=(.*)/s);
  flags[k] = v ?? (VALUE_FLAGS.includes(k) ? argv[++i] : 'true');
}
const out = flags.out ?? 'node_modules/.tmp/gallery';
const SIZES = { desktop: { width: 1440, height: 900 }, phone: { width: 390, height: 844 } };
const sizes = (flags.sizes ?? 'desktop,phone').split(',');
const shots = flags['no-shots'] === undefined;
const URL = process.env.CAMPUS_URL ?? 'http://localhost:5173/';
const CHROME = [process.env.CHROME_PATH, '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/usr/bin/chromium'].filter(Boolean).find((p) => existsSync(p));
if (!CHROME) { console.error('no Chromium found; set CHROME_PATH'); process.exit(2); }
mkdirSync(out, { recursive: true });

// The toolbar's tab buttons, by aria-label (TabNav.tsx's TAB_LABELS and the
// funds chip's "Treasury"). The Inbox's label carries its count ("Inbox, 2 to
// decide"), so each is matched by its start.
const TABS = ['Inbox', 'Curriculum', 'Faculty', 'Research', 'Students', 'Athletics', 'History', 'Treasury'];
// A modal is stepped through by the button that moves it on; failing
// that, its last enabled button (the default answer).
const ADVANCE = /^(continue|next|begin|done|close|ok|noted|read on|carry on|on to|see |start|→)|→$/i;

const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox', '--disable-background-networking'] });
const rows = [];

async function count(page) {
  return page.evaluate(() => {
    const visible = (el) => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
    const dialogs = [...document.querySelectorAll('[role="dialog"]')].filter(visible);
    // A stop is answered in the inbox's reading pane (Plan 77C): count the
    // stop itself, as the modal it was, not the inbox's list beside it.
    const held = [...document.querySelectorAll('.modal-inbox')].filter(visible);
    const top = held[held.length - 1] ?? dialogs[dialogs.length - 1] ?? null;
    const words = (el) => (el?.innerText ?? '').split(/\s+/).filter((w) => /[A-Za-z0-9$]/.test(w)).length;
    const controls = (el) => [...(el ?? document).querySelectorAll('button, a[href], input, select, textarea, [role="button"], [role="tab"], [role="slider"]')]
      .filter((c) => visible(c) && !c.disabled).length;
    let scrolls = false;
    for (const el of top ? [top, ...top.querySelectorAll('*')] : []) {
      const cs = getComputedStyle(el);
      if (/(auto|scroll)/.test(cs.overflowY) && el.scrollHeight > el.clientHeight + 4) { scrolls = true; break; }
    }
    const disabled = [...(top ?? document).querySelectorAll('button:disabled')].filter(visible).length;
    const label = top ? (top.dataset.interrupt ? `Inbox › ${top.dataset.interrupt}` : top.getAttribute('aria-label') ?? top.className.split(' ')[0]) : 'page';
    return { layer: label, words: words(top ?? document.body), pageWords: words(document.body), controls: controls(top), pageControls: controls(null), disabled, scrolls };
  });
}

async function capture(page, ctx, what) {
  await page.waitForTimeout(450);
  const n = String(ctx.n++).padStart(2, '0');
  const file = `${ctx.name}-${ctx.size}-${n}-${what.replace(/[^\w-]+/g, '-').slice(0, 40)}.png`;
  const c = await count(page);
  if (shots) await page.screenshot({ path: join(out, file) });
  rows.push({ save: ctx.name, size: ctx.size, what, file, ...c });
  console.log(`${ctx.name} ${ctx.size} ${what}: ${c.words} words, ${c.controls} controls on ${c.layer}${c.scrolls ? ', scrolls' : ''}`);
}

async function closeTop(page) {
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
}

async function stepModals(page, ctx) {
  for (let k = 0; k < 16; k++) {
    const modal = page.locator('.modal').first();
    if (!(await modal.count())) return;
    const type = (await modal.getAttribute('data-interrupt')) ?? 'modal';
    await capture(page, ctx, `modal ${type} ${k + 1}`);
    const buttons = modal.locator('button:not([disabled])');
    const names = await buttons.evaluateAll((els) => els.map((e) => (e.innerText || e.getAttribute('aria-label') || '').trim()));
    let pick = names.findIndex((t) => ADVANCE.test(t));
    if (pick < 0) pick = names.length - 1;
    if (pick < 0) return;
    await buttons.nth(pick).click().catch(() => {});
    await page.waitForTimeout(700);
  }
}

async function pause(page) {
  await page.getByRole('button', { name: 'Paused', exact: true }).click({ timeout: 1500 }).catch(() => {});
}

// The inbox's first matter or letter, read (Plan 77).
async function inboxPane(page, ctx) {
  const row = page.locator('button.inbox-row').first();
  if (!(await row.count())) return;
  await row.click().catch(() => {});
  await capture(page, ctx, 'Inbox reading pane');
}

// The Faculty tab's other views and one person opened (Plan 84). On a phone
// the person opens over the tab, and Escape closes it first.
async function facultyViews(page, ctx) {
  for (const view of ['Market', 'Departments']) {
    const b = page.locator('.dept-views button', { hasText: view }).first();
    if (!(await b.count())) continue;
    await b.click().catch(() => {});
    await capture(page, ctx, `Faculty ${view}`);
  }
  const back = page.locator('.dept-views button').first();
  if (await back.count()) await back.click().catch(() => {});
  const tile = page.locator('.faculty-tile-top').first();
  if (!(await tile.count())) return;
  await tile.click({ force: true }).catch(() => {});
  await capture(page, ctx, 'Faculty person');
  if (ctx.size === 'phone') await closeTop(page);
}

// History's other two views (Plan 95H); the tab opens on Prestige, and is
// set back to it so the next save's tour opens there too.
async function historyViews(page, ctx) {
  for (const view of ['The record', 'The guide']) {
    const b = page.locator('.history-views button', { hasText: view }).first();
    if (!(await b.count())) continue;
    await b.click().catch(() => {});
    await capture(page, ctx, `History ${view}`);
  }
  const back = page.locator('.history-views button').first();
  if (await back.count()) await back.click().catch(() => {});
}

async function tour(page, ctx) {
  await pause(page);
  for (const tab of TABS) {
    const btn = page.locator(`button[aria-label^="${tab}"]`).first();
    if (!(await btn.count()) || !(await btn.isVisible().catch(() => false)) || await btn.isDisabled()) continue;
    await btn.click().catch(() => {});
    await capture(page, ctx, `tab ${tab}`);
    if (tab === 'Inbox') await inboxPane(page, ctx);
    if (tab === 'Faculty') await facultyViews(page, ctx);
    if (tab === 'History') await historyViews(page, ctx);
    await closeTop(page);
  }
  const build = page.locator('button:has-text("Build")').last();
  if (await build.count()) {
    await build.click().catch(() => {});
    await capture(page, ctx, 'build menu');
    await closeTop(page);
  }
  const menu = page.locator('button[aria-label="Open main menu"]').first();
  if (await menu.count()) {
    await menu.click().catch(() => {});
    await capture(page, ctx, 'main menu');
    const settings = page.locator('.main-menu-popup button:has-text("Settings")').first();
    if (await settings.count()) {
      await settings.click().catch(() => {});
      await capture(page, ctx, 'settings');
    }
    await closeTop(page);
    await closeTop(page);
  }
  // The map is a canvas (Plan 83): Founders Hall is found through the map's
  // review probe and clicked where it stands.
  const hall = (await mapBuildings(page)).find((b) => /Founders Hall/.test(b.name));
  if (hall) {
    await page.mouse.click(hall.x, hall.y);
    await capture(page, ctx, 'Founders Hall panel');
    await closeTop(page);
  }
}

async function session(savePath, size) {
  const name = savePath ? basename(savePath).replace(/\.json$/, '') : 'fresh';
  const phone = size === 'phone';
  const context = await browser.newContext({
    viewport: SIZES[size],
    ...(phone ? { isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : {}),
  });
  if (flags.settings) {
    await context.addInitScript((v) => { localStorage.setItem('unischool.settings.v1', v); }, flags.settings);
  }
  if (savePath) {
    const save = readFileSync(savePath, 'utf8');
    await context.addInitScript((v) => { localStorage.setItem('unischool.save', v); }, save);
  }
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  const ctx = { name, size, n: 0 };
  await capture(page, ctx, 'title screen');
  if (!savePath) {
    await page.locator('.title-primary, button:has-text("New game")').first().click().catch(() => {});
    await capture(page, ctx, 'founding form');
  } else {
    await page.locator('.title-primary').first().click().catch(() => {});
    await page.waitForTimeout(1200);
    const renderer = await waitForMap(page);
    if (renderer !== 'canvas') rows.push({ save: name, size, what: 'the map', errors: [`the ${renderer ?? 'no'} map is up, not the canvas`] });
    const missed = Object.entries(await mapMissed(page) ?? {});
    if (missed.length) rows.push({ save: name, size, what: 'the map', errors: missed.map(([k, n]) => `the canvas could not draw ${k} (${n})`) });
    await capture(page, ctx, 'map');
    await stepModals(page, ctx);
    await tour(page, ctx);
  }
  if (errors.length) rows.push({ save: name, size, what: 'page errors', errors: [...new Set(errors)] });
  await context.close();
}

const all = flags['no-fresh'] === undefined ? [null, ...saves] : saves;
for (const size of sizes) for (const s of all) await session(s, size);
await browser.close();

writeFileSync(join(out, 'gallery.json'), JSON.stringify(rows, null, 2));
const table = rows.filter((r) => r.words !== undefined);
const md = [
  '# Screen gallery',
  '',
  `Written by \`npm run review:gallery\` (\`tools/review/gallery.mjs\`): ${table.length} captures. "Words" and "controls" count the top layer (the last dialog open, else the page); a control is a visible, enabled button, link, field or tab.`,
  '',
  '| Save | Size | Screen | Top layer | Words | Controls | Disabled | Scrolls | Page words | File |',
  '|---|---|---|---|---:|---:|---:|---|---:|---|',
  ...table.map((r) => `| ${r.save} | ${r.size} | ${r.what} | ${r.layer} | ${r.words} | ${r.controls} | ${r.disabled} | ${r.scrolls ? 'yes' : ''} | ${r.pageWords} | ${r.file} |`),
  '',
  ...rows.filter((r) => r.errors).map((r) => `- **${r.save} ${r.size}:** ${r.errors.join('; ')}`),
].join('\n');
writeFileSync(join(out, 'gallery.md'), `${md}\n`);
console.log(`${table.length} captures → ${join(out, 'gallery.md')}`);
