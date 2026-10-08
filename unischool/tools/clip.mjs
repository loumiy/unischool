// ---------------------------------------------------------------------
// RECORD A SHORT CLIP. Loads a save into a headless Chromium, frames one
// building close up, and records a few seconds of the live map: the
// walkers on the paths, a walk being drawn, a site going up. The page's
// clock is Playwright's fake one, stepped a frame at a time between
// screenshots, so the clip plays at an even rate however slowly the
// headless (software) renderer draws.
//
//   npm run dev                                            # in one shell
//   npm run clip -- out.json walkers.webm --focus=QUAD-T2 --zoom=4
//   npm run clip -- frame-0012.json paths.webm --focus=DINING-01 --zoom=3 \
//     --stroke=130,100:430,-50 --stroke=430,-50:190,-170
//   npm run clip -- frame-0046.json build.webm --focus=HALL-06 --zoom=4 --until-built
//
// Flags: --focus=<building id or name, a substring> (the building put in
// the middle; default the middle of the view), --zoom=N (map zoom steps
// in, after centring), --pan=DX,DY (a nudge after that, screen px),
// --tilt=N (as shoot.mjs), --size=W,H (default 1280,720), --scale=N,
// --fps=N (30), --seconds=N (3), --speed=<real|double|quad|octo>
// (the game's clock; default real, the speed the walkers are drawn for),
// --step=MS (page time a frame; default 1000/fps, real time. Larger to
// compress: a site's weeks into seconds), --until-built (record until the
// focused building is finished, and a second more, with --step set so that
// takes --seconds), --stroke=X1,Y1:X2,Y2 (screen px from the middle: a
// drag with the path tool (P), drawn over the clip, repeatable; Shift is
// held so each run is straight), --no-seasons (the map's seasons off, as
// the time-lapse has them), --warmup=MS (page time played before the
// first frame, default 8000, so the walkers are out), --png (keep the
// frames).
// Writes the WebM, and its frames in <out>.frames/ while it works.
//
// Same browser rules as shoot.mjs: playwright-core, no download.
// ---------------------------------------------------------------------
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { chromium } from 'playwright-core';
import { mapBuildings, waitForMap } from './mapReview.mjs';

const argv = process.argv.slice(2);
const [savePath, outPath] = argv.filter((a) => !a.startsWith('--'));
if (!savePath || !outPath) {
  console.error('usage: clip <save.json> <out.webm> [--focus=ID] [--zoom=N] [--pan=DX,DY] [--speed=S] [--step=MS] [--stroke=X1,Y1:X2,Y2] [--until-built]');
  process.exit(2);
}
const flag = (name, fallback) => {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};
const flagAll = (name) => argv.filter((a) => a.startsWith(`--${name}=`)).map((a) => a.slice(name.length + 3));
const [W, H] = flag('size', '1280,720').split(',').map(Number);
const scale = Number(flag('scale', 1));
const fps = Number(flag('fps', 30));
const seconds = Number(flag('seconds', 3));
const zoom = Number(flag('zoom', 0));
const tilt = Number(flag('tilt', 0));
const pan = flag('pan', '0,0').split(',').map(Number);
const focus = flag('focus', null);
const speed = flag('speed', 'real');
const untilBuilt = argv.includes('--until-built');
const strokes = flagAll('stroke').map((s) => s.split(':').map((p) => p.split(',').map(Number)));
const keepPng = argv.includes('--png');
const seasons = !argv.includes('--no-seasons');
const URL = process.env.CAMPUS_URL ?? 'http://localhost:5173/';
// useGame.ts's SPEEDS: page milliseconds a week.
const WEEK_MS = { real: 5000, double: 2500, quad: 1250, octo: 625 };
// The game's speed buttons, by their accessible names (StatusHeader.tsx's
// SPEED_LABELS).
const SPEED_LABEL = { real: 'Play', double: '2×', quad: '4×', octo: '8×' };

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
const FFMPEG = [
  process.env.FFMPEG_PATH,
  '/usr/bin/ffmpeg',
  `${process.env.PLAYWRIGHT_BROWSERS_PATH ?? '/opt/pw-browsers'}/ffmpeg-1011/ffmpeg-linux`,
  '/opt/pw-browsers/ffmpeg-1011/ffmpeg-linux',
].filter(Boolean).find((p) => existsSync(p));

const payload = readFileSync(savePath, 'utf8');
const { state } = JSON.parse(payload);
const browser = await chromium.launch({ executablePath, args: ['--no-sandbox', '--disable-background-networking'] });
const context = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: scale });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
// The fake clock goes in before the game's first script, and runs on real
// time until the camera is set; then it is paused and stepped.
await page.clock.install();
await page.goto(URL, { waitUntil: 'domcontentloaded' });
await page.evaluate(([s, seasons]) => {
  localStorage.clear();
  localStorage.setItem('unischool.save', s);
  // The map's seasons as the save's week has them unless --no-seasons;
  // sound off; nothing that arrives pauses the clock.
  localStorage.setItem('unischool.settings.v1', JSON.stringify({ seasons, muted: true, pauseOnArrival: false, pauseForNews: false, stats: 'off', feedbackPrompts: false }));
}, [payload, seasons]);
await page.goto(URL, { waitUntil: 'networkidle' });
const cont = page.locator('.title-primary');
if (await cont.count()) await cont.first().click();
await page.waitForSelector('svg', { timeout: 20_000 });
await page.waitForTimeout(1_500);
await page.getByRole('button', { name: 'Paused', exact: true }).click().catch(() => {});

for (let i = 0; i < Math.abs(tilt); i++) {
  await page.keyboard.press(tilt < 0 ? 'z' : 'x');
  await page.waitForTimeout(300);
}

// A drag of the map by (dx, dy) screen px, closing whatever the drag's
// end opened as a click.
async function drag(dx, dy) {
  if (!dx && !dy) return;
  const x0 = W / 2 - dx / 2, y0 = H / 2 - dy / 2;
  await page.mouse.move(x0, y0);
  await page.mouse.down();
  await page.mouse.move(x0 + dx, y0 + dy, { steps: 20 });
  await page.mouse.up();
  await page.waitForTimeout(400);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
}

async function focused() {
  const all = await mapBuildings(page);
  return all.find((b) => b.id === focus) ?? all.find((b) => b.id.includes(focus) || b.name.toLowerCase().includes(focus.toLowerCase()));
}

if (focus) {
  const b = await focused();
  if (!b) {
    console.error(`no building matching "${focus}" on the map`);
    process.exit(2);
  }
  await drag(W / 2 - b.x, H / 2 - b.y);
}
if (zoom !== 0) {
  await page.click('.map-tools-toggle');
  for (let i = 0; i < Math.abs(zoom); i++) {
    await page.click(zoom > 0 ? 'button:has-text("+")' : 'button:has-text("−")');
    await page.waitForTimeout(250);
  }
  await page.click('.map-tools-toggle').catch(() => {});
  await page.waitForTimeout(400);
  // The zoom keeps the middle of the map still, near enough: centre again.
  if (focus) {
    const b = await focused();
    await drag(W / 2 - b.x, H / 2 - b.y);
  }
}
await drag(pan[0], pan[1]);

// Everything that is the game's interface rather than the campus
// (timelapseShoot.mjs's list, with the map tools' own button).
await page.addStyleTag({ content: `
  .pennant, .main-menu, .map-tools-toggle, .campus-map-zoom-controls, .log-ticker, .toolbar,
  .toast, .tooltip, [role="tooltip"], .path-tool-hint, .build-popup,
  .modal-backdrop, .modal-inbox { display: none !important; }
  :root { --toolbar-height: 0px !important; --log-ticker-height: 0px !important; }
` });
await page.mouse.move(-20, -20);
await page.waitForTimeout(800);
await waitForMap(page);

// The clock runs at the speed asked, through its own button (hidden, so
// clicked from the page).
if (!SPEED_LABEL[speed]) {
  console.error(`--speed: one of ${Object.keys(SPEED_LABEL).join(', ')}`);
  process.exit(2);
}
const speedButton = page.locator(`button[aria-label="${SPEED_LABEL[speed]}"]`).first();
// A locked speed's title says what opens it (seats.ts's speedLock).
const lock = await speedButton.getAttribute('title');
if (lock?.startsWith('Appoint')) {
  console.error(`--speed=${speed} is locked in this save: ${lock}`);
  process.exit(2);
}
await speedButton.evaluate((b) => b.click());

// Let the walkers spread out from their doors before the first frame.
await page.waitForTimeout(1_500);
// A moment ahead: pausing at a time already past is refused.
await page.clock.pauseAt(await page.evaluate(() => Date.now() + 2000));
// The crowd grows a walker a frame from nobody (Walkers.tsx): walk it out
// in page time, a few steps at a time, so the first frame is a busy one.
const warmup = Number(flag('warmup', 8000));
for (let t = 0; t < warmup; t += 500) await page.clock.runFor(500);

let frames = Math.round(fps * seconds);
let step = Number(flag('step', 1000 / fps));
if (untilBuilt) {
  const id = (await focused())?.id ?? focus;
  const left = state.developing?.[id];
  if (left === undefined) {
    console.error(`--until-built: ${id} is not under construction in this save`);
    process.exit(2);
  }
  // The weeks left, then a second of the finished building at the same
  // rate of page time.
  const buildFrames = Math.max(1, frames - fps);
  step = (left * WEEK_MS[speed] + WEEK_MS[speed] * 0.5) / buildFrames;
  console.log(`${id}: ${left} weeks left at ${speed}, ${step.toFixed(0)} ms a frame`);
}

// A stop (a letter the clock waits on) answered with its last button, as
// newPlayer.mjs answers them, so the clock runs through the clip. Its
// card is hidden with the rest of the interface, so no frame shows it.
const STOP = '.modal-inbox, .modal-backdrop .modal, [role="dialog"][aria-modal="true"]';
async function clearStops() {
  for (let i = 0; i < 6; i++) {
    const modal = page.locator(STOP);
    if (!(await modal.count())) return;
    await modal.first().locator('button:not([disabled])').last().evaluate((b) => b.click()).catch(() => {});
    await page.waitForTimeout(150);
  }
}

const dir = `${outPath}.frames`;
rmSync(dir, { recursive: true, force: true });
mkdirSync(dir, { recursive: true });

// The strokes, spread over the clip's frames after a short hold: each
// stroke gets an equal share, the pointer moving a little each frame.
const hold = strokes.length ? Math.round(fps * 0.4) : 0;
const strokeFrames = strokes.length ? Math.max(1, Math.floor((frames - hold * 2) / strokes.length)) : 0;
if (strokes.length) {
  await page.keyboard.press('p');
  await page.waitForTimeout(200);
}
const at = ([x, y]) => [W / 2 + x, H / 2 + y];

for (let f = 0; f < frames; f++) {
  if (strokes.length) {
    const k = Math.floor((f - hold) / strokeFrames);
    const local = (f - hold) - k * strokeFrames;
    if (f >= hold && k < strokes.length) {
      const [a, b] = strokes[k].map(at);
      const t = Math.min(1, local / (strokeFrames - 1));
      // Eased, so the pointer sets off and arrives as a hand does.
      const e = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
      const x = a[0] + (b[0] - a[0]) * e, y = a[1] + (b[1] - a[1]) * e;
      if (local === 0) {
        await page.mouse.move(a[0], a[1]);
        await page.keyboard.down('Shift');
        await page.mouse.down();
      }
      await page.mouse.move(x, y);
      if (local === strokeFrames - 1) {
        await page.mouse.up();
        await page.keyboard.up('Shift');
      }
    } else if (f === hold + strokes.length * strokeFrames) {
      // The tool put away, its ghost with it.
      await page.keyboard.press('Escape');
      await page.mouse.move(-20, -20);
    }
  }
  await clearStops();
  // A matter's last week pauses the clock whatever the settings (App.tsx's
  // unseenPause): play on, as a player who glanced at it would.
  await speedButton.evaluate((b) => { if (b.getAttribute('aria-pressed') !== 'true') b.click(); });
  // The step fires the page's animation frames, so the canvas has painted
  // what it moved by the time the screenshot is taken.
  await page.clock.runFor(step);
  await page.screenshot({ path: `${dir}/${String(f).padStart(4, '0')}.png` });
  if (f % 15 === 0) process.stdout.write(`\rframe ${f + 1}/${frames}`);
}
process.stdout.write('\n');
// What the clock reached, and anything that held it (a modal pauses play).
const reached = await page.evaluate(() => ({
  date: document.querySelector('.toolbar-calendar')?.getAttribute('aria-label') ?? null,
  modal: (document.querySelector('[role="dialog"], [aria-modal="true"], .modal, .modal-backdrop')?.textContent ?? '').slice(0, 80) || null,
}));
console.log(`clock at ${reached.date}${reached.modal ? `, held by "${reached.modal}"` : ''}`);
await browser.close();

if (!FFMPEG) {
  console.error('no ffmpeg found; the frames are in ' + dir);
  process.exit(1);
}
const vp9 = spawnSync(FFMPEG, ['-hide_banner', '-encoders'], { encoding: 'utf8' }).stdout?.includes('libvpx-vp9');
const codec = vp9
  ? ['-c:v', 'libvpx-vp9', '-crf', '30', '-b:v', '0', '-row-mt', '1']
  : ['-c:v', 'libvpx', '-crf', '8', '-b:v', '4M'];
const run = spawnSync(FFMPEG, [
  '-y', '-loglevel', 'error', '-framerate', String(fps), '-i', `${dir}/%04d.png`,
  ...codec, '-pix_fmt', 'yuv420p', '-an', outPath,
], { stdio: 'inherit' });
if (run.status !== 0) process.exit(run.status ?? 1);
if (!keepPng) rmSync(dir, { recursive: true, force: true });
if (errors.length) console.warn(`page errors:\n  ${errors.slice(0, 5).join('\n  ')}`);
console.log(`wrote ${outPath} (${frames} frames, ${fps} fps)`);
