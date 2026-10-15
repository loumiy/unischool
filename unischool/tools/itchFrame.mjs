// ---------------------------------------------------------------------
// THE GAME IN ITCH.IO'S FRAME, LOCALLY (Plan 97D). itch.io plays an HTML
// game in an iframe on the game's page, served from another domain under a
// sub-path. This serves dist-itch/ (npm run build:itch) the same way: the
// game from http://127.0.0.1:<port>/html/0000000/, and a host page from
// http://localhost:<port+1>/ that embeds it with itch.io's iframe
// attributes. Two hosts, so the game is cross-origin to its page, as it is
// on itch.io.
//
//   npm run build:itch
//   npm run itch:frame               # serve, and print the page to open
//   npm run itch:frame -- --check    # the checks below, in headless Chromium
//
// The iframe's attributes are itch.io's game_drop frame's, as itch.io served
// them in 2025 (no `sandbox`, and an `allow` list without clipboard-write).
// itch.io changes them now and then: read them off a live game page and
// update ITCH_ALLOW when they move. Chrome's refusal of the clipboard there
// is reported on itch.io's forum (posts 14093085 and 14065214).
//
// --check plays each of these inside the frame and exits non-zero on a
// failure:
//   saves      a run saved, the frame reloaded, and the run continues;
//   downloads  Download save, and a download made the way the report card
//              makes it (an anchor never added to the page), each give a file;
//   clipboard  the frame refuses the clipboard, and Copy summary shows the
//              line selected, to copy by hand;
//   keys       a hotkey works after one click in the frame;
//   wheel      the map's wheel zoom never scrolls the host page;
//   audio      sound starts on the first click;
//   two frames the claim on the save hands over between two pages.
// ---------------------------------------------------------------------

import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist-itch');
const flags = process.argv.slice(2);
const PORT = Number(flags.find((f) => f.startsWith('--port='))?.slice(7) ?? 8770);
const GAME_PATH = '/html/0000000/';
const GAME_URL = `http://127.0.0.1:${PORT}${GAME_PATH}index.html`;
const HOST_URL = `http://localhost:${PORT + 1}/`;

export const ITCH_ALLOW = 'autoplay; fullscreen *; geolocation; microphone; camera; midi; monetization; xr-spatial-tracking; gamepad; gyroscope; accelerometer; xr; cross-origin-isolated; web-share';

if (!existsSync(join(DIST, 'index.html'))) {
  console.error('dist-itch/ has no build. Run `npm run build:itch` first.');
  process.exit(2);
}

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2', '.json': 'application/json' };

// The game, only under its sub-path: a request for /assets/... at the
// root 404s, as it would on itch.io.
const game = createServer((req, res) => {
  const path = decodeURIComponent((req.url ?? '/').split('?')[0]);
  if (!path.startsWith(GAME_PATH)) { res.writeHead(404).end(); return; }
  const file = normalize(join(DIST, path.slice(GAME_PATH.length) || 'index.html'));
  if (!file.startsWith(DIST) || !existsSync(file) || statSync(file).isDirectory()) { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' });
  res.end(readFileSync(file));
});

// The host page: a game page's frame at itch.io's default embed size, with
// the page long enough to scroll, as an itch.io page is.
const hostPage = `<!doctype html><html><head><meta charset="utf-8"><title>UniSchool by Halifax Games</title>
<style>body{margin:0;background:#2b2b2b;color:#ddd;font:14px sans-serif}.wrap{width:1440px;margin:40px auto}
#game_drop{display:block;border:0;width:1440px;height:900px;background:#000}.below{height:1600px;padding:20px}</style></head>
<body><div class="wrap"><iframe id="game_drop" src="${GAME_URL}" allowtransparency="true" webkitallowfullscreen="true" mozallowfullscreen="true" msallowfullscreen="true" allowfullscreen="true" frameborder="0" scrolling="no" allow="${ITCH_ALLOW}"></iframe>
<div class="below">The game's description, comments and the rest of the page.</div></div></body></html>`;
const host = createServer((_req, res) => { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(hostPage); });

await new Promise((r) => game.listen(PORT, '127.0.0.1', r));
await new Promise((r) => host.listen(PORT + 1, 'localhost', r));

if (!flags.includes('--check')) {
  console.log(`The game in an itch.io-style frame: ${HOST_URL}\n(the game itself: ${GAME_URL})\nCtrl+C to stop.`);
} else {
  const code = await check();
  game.close();
  host.close();
  process.exit(code);
}

async function check() {
  const { chromium } = await import('playwright-core');
  const CANDIDATES = [process.env.CHROME_PATH, `${process.env.PLAYWRIGHT_BROWSERS_PATH ?? ''}/chromium-1194/chrome-linux/chrome`, '/opt/pw-browsers/chromium', '/usr/bin/chromium', '/usr/bin/google-chrome'].filter(Boolean);
  const executablePath = CANDIDATES.find((p) => existsSync(p));
  if (!executablePath) { console.error(`no Chromium found. Tried:\n  ${CANDIDATES.join('\n  ')}\nSet CHROME_PATH.`); return 2; }
  const browser = await chromium.launch({ executablePath, args: ['--no-sandbox', '--autoplay-policy=user-gesture-required'] });
  const context = await browser.newContext({ viewport: { width: 1520, height: 1000 }, acceptDownloads: true });
  // Every AudioContext the game makes, so the check can read its state.
  await context.addInitScript(() => {
    const AC = window.AudioContext;
    if (!AC) return;
    window.__contexts = [];
    window.AudioContext = class extends AC { constructor(...a) { super(...a); window.__contexts.push(this); } };
  });

  let failures = 0;
  const results = [];
  const assert = (ok, what) => { results.push(`${ok ? '✓' : '✗'} ${what}`); if (!ok) failures += 1; };
  const step = async (what, fn) => {
    try { await fn(); } catch (e) { assert(false, `${what}: ${e instanceof Error ? e.message.split('\n')[0] : e}`); }
  };

  const page = await context.newPage();
  const open = async (p) => {
    await p.goto(HOST_URL);
    const f = p.frameLocator('#game_drop');
    await f.locator('.title-screen').waitFor({ timeout: 15000 });
    return f;
  };
  const frameOf = (p) => p.frames().find((fr) => fr.url().startsWith(GAME_URL));
  let f = await open(page);
  assert(true, 'the game loads in the frame from its sub-path');

  // audio: nothing until the first click; running after it.
  await step('audio', async () => {
    const before = await frameOf(page).evaluate(() => (window.__contexts ?? []).map((c) => c.state));
    await f.locator('.title-card').click({ position: { x: 5, y: 5 } });
    await page.waitForTimeout(400);
    const after = await frameOf(page).evaluate(() => (window.__contexts ?? []).map((c) => c.state));
    assert(!before.includes('running') && after.includes('running'), `sound starts on the first click (before: ${before.join(',') || 'none'}; after: ${after.join(',') || 'none'})`);
  });

  // keys: after that click, Escape closes the settings.
  await step('keys', async () => {
    await f.getByRole('button', { name: 'Settings' }).click();
    await f.locator('[aria-label="Settings"]').waitFor();
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    assert(await f.locator('[aria-label="Settings"]').count() === 0, 'a hotkey works after one click in the frame (Escape closes Settings)');
  });

  // saves: a run put in the frame's storage continues, is saved, and
  // continues again after the frame reloads.
  const save = readFileSync(join(ROOT, 'test/fixtures/save-playtest.json'), 'utf8');
  await step('saves', async () => {
    await frameOf(page).evaluate((raw) => { localStorage.setItem('unischool.save', raw); }, save);
    f = await open(page);
    await f.getByRole('button', { name: /^Continue/ }).click();
    await f.locator('.main-menu-btn').waitFor();
    await f.locator('.main-menu-btn').click();
    await f.getByRole('button', { name: 'Save', exact: true }).click();
    const saved = await frameOf(page).evaluate(() => JSON.parse(localStorage.getItem('unischool.save')).savedAt);
    f = await open(page);
    const text = await f.locator('.title-primary').innerText();
    const again = await frameOf(page).evaluate(() => JSON.parse(localStorage.getItem('unischool.save')).savedAt);
    // The page saves again as it unloads, so the stored save is that one or later.
    assert(/Playtest/.test(text) && /Year 25/.test(text) && again >= saved, `a saved run continues after the frame reloads (${text.replace(/\s+/g, ' ')})`);
  });

  // downloads: the menu's Download save, and an anchor never added to the
  // page (the report card's way).
  await step('downloads', async () => {
    await f.getByRole('button', { name: /^Continue/ }).click();
    await f.locator('.main-menu-btn').click();
    const [save] = await Promise.all([page.waitForEvent('download', { timeout: 5000 }), f.getByRole('button', { name: 'Download save' }).click()]);
    assert(/\.unischool\.json$/.test(save.suggestedFilename()), `Download save gives a file in the frame (${save.suggestedFilename()})`);
    const [card] = await Promise.all([
      page.waitForEvent('download', { timeout: 5000 }),
      frameOf(page).evaluate(() => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob(['png'], { type: 'image/png' }));
        a.download = 'report-card.png';
        a.click();
      }),
    ]);
    assert(card.suggestedFilename() === 'report-card.png', 'an anchor the page never holds downloads too (the report card\'s way)');
  });

  // clipboard: refused in the frame; Copy summary falls back to the line,
  // selected.
  await step('clipboard', async () => {
    const refused = await frameOf(page).evaluate(async () => { try { await navigator.clipboard.writeText('x'); return false; } catch { return true; } });
    assert(refused, 'the frame refuses the clipboard, as Chrome does on itch.io');
    const entry = { id: 'h1', college: 'Playtest University', name: 'Playtest', suffix: 'University', vernacular: 'georgian', colors: { primary: '#7b1e2b', secondary: '#c9a227' }, title: 'A research powerhouse', mark: 'B', grades: [{ label: 'Academics', grade: 'B' }], eras: [{ name: 'The Founding', from: 1, to: 3, lines: [] }], year: 50, finishedAt: Date.now(), markScore: 66, rank: 12, total: 100 };
    await frameOf(page).evaluate((e) => localStorage.setItem('unischool.hall', JSON.stringify([e])), entry);
    f = await open(page);
    await f.getByRole('button', { name: 'Open the hall' }).click();
    await f.getByRole('button', { name: 'Copy summary' }).click();
    const box = f.locator('.report-card-manual input');
    await box.waitFor({ timeout: 3000 });
    const shown = await box.inputValue();
    const selected = await frameOf(page).evaluate(() => { const i = document.querySelector('.report-card-manual input'); return i.selectionEnd - i.selectionStart; });
    assert(/^Playtest University — B · 66, #12 of 100 after fifty years\. UniSchool/.test(shown) && selected === shown.length, `Copy summary shows the line selected, to copy by hand (${shown})`);
    assert(!shown.includes('127.0.0.1'), 'and never sends anyone to the frame\'s own address');
  });

  // wheel: over the map, the wheel zooms and the host page stays put.
  await step('wheel', async () => {
    f = await open(page);
    await f.getByRole('button', { name: /^Continue/ }).click();
    await f.locator('.main-menu-btn').waitFor();
    const box = await page.locator('#game_drop').boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    for (let i = 0; i < 5; i++) { await page.mouse.wheel(0, 400); await page.waitForTimeout(50); }
    const scrolled = await page.evaluate(() => window.scrollY);
    assert(scrolled === 0, `the map's wheel zoom never scrolls the host page (scrollY ${scrolled})`);
  });

  // two frames: a second page continuing the run takes the claim; the first
  // stops and says so.
  await step('two frames', async () => {
    const second = await context.newPage();
    const g = await open(second);
    await g.getByRole('button', { name: /^Continue/ }).click();
    await g.locator('.main-menu-btn').waitFor();
    await f.locator('.elsewhere-banner').waitFor({ timeout: 5000 });
    assert(true, 'the claim hands over between two frames: the first stops when the second continues');
    await second.close();
  });

  await browser.close();
  console.log(`itch.io frame checks\n  ${results.join('\n  ')}`);
  return failures === 0 ? 0 : 1;
}
