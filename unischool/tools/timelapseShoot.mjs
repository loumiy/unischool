// ---------------------------------------------------------------------
// PHOTOGRAPH THE TIME-LAPSE. Loads each frame written by tools/timelapse.ts
// into a headless Chromium, frames the campus with the map's own zoom and
// pan, hides the game's chrome (the pennant, the menu, the map tools, the
// ticker and the dock), captions the year, and writes a JPEG per frame,
// then joins them into a WebM with the ffmpeg Playwright ships.
//
//   npm run dev                                            # in one shell
//   npm run timelapse:shoot -- node_modules/.tmp/timelapse
//   npm run timelapse:shoot -- dir --fps=8 --zoom=-1 --pan=60,-10 \
//     --size=1920,1080 --scale=1 --no-caption --png --jobs=4
//
// Flags: --fps=N (frames of the run a second, default 8: two seasons of a
// year a second is about 25s for fifty years), --zoom, --pan, --size and
// --scale as in shoot.mjs, --no-caption, --png (a lossless PNG per frame
// as well, for an editor), --jobs=N (browsers in parallel, default 4),
// --from=N --to=N (a range of frames, for a retake), --seasons (keep the
// map's seasons: off by default, since one frame a quarter lands in the
// winter white once a year and the video strobes), --clean (hide the
// map's own labels and marks, as clip.mjs's --clean does), --positions
// (beside each shot, <frame>.positions.json: every building's middle on
// the page, in CSS px, and the map's view, for an editor's camera move to
// follow the campus), --views=FILE (a camera per frame, in place of --zoom
// and --pan: FILE is a JSON array of the map's own views, { zoom, x, y } as
// window.__campusMap.view() gives them, one per frame by its number; the
// game draws each frame at its own zoom, for a move sharp at every size).
// Writes <dir>/shots/*.jpg and <dir>/timelapse.webm.
//
// The WebM is a preview and a source for an editor. Steam wants an MP4
// (H.264): `ffmpeg -i timelapse.webm -c:v libx264 -pix_fmt yuv420p
// -crf 18 timelapse.mp4` with any full ffmpeg.
//
// Same browser rules as shoot.mjs: playwright-core, no download.
// ---------------------------------------------------------------------
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright-core';
import { CLEAN_MAP_CSS, mapBuildings, waitForMap } from './mapReview.mjs';

const argv = process.argv.slice(2);
const dir = argv.find((a) => !a.startsWith('--'));
if (!dir) {
  console.error('usage: timelapseShoot <frames dir> [--fps=N] [--zoom=N] [--pan=DX,DY] [--size=W,H] [--scale=N] [--no-caption] [--png] [--jobs=N]');
  process.exit(2);
}
const flag = (name, fallback) => {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};
const fps = Number(flag('fps', 8));
const zoom = Number(flag('zoom', -1));
const pan = flag('pan', '60,-10').split(',').map(Number);
const [W, H] = flag('size', '1920,1080').split(',').map(Number);
const scale = Number(flag('scale', 1));
const jobs = Number(flag('jobs', 4));
const caption = !argv.includes('--no-caption');
const png = argv.includes('--png');
const seasons = argv.includes('--seasons');
const clean = argv.includes('--clean');
const positions = argv.includes('--positions');
const views = flag('views', null) && JSON.parse(readFileSync(flag('views', null), 'utf8'));
const URL = process.env.CAMPUS_URL ?? 'http://localhost:5173/';

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
  `${process.env.PLAYWRIGHT_BROWSERS_PATH ?? '/opt/pw-browsers'}/ffmpeg-1011/ffmpeg-linux`,
  '/opt/pw-browsers/ffmpeg-1011/ffmpeg-linux',
  '/usr/bin/ffmpeg',
].filter(Boolean).find((p) => existsSync(p));

const all = readdirSync(dir).filter((f) => /^frame-\d+\.json$/.test(f)).sort();
const from = Number(flag('from', 0));
const to = Number(flag('to', all.length - 1));
const frames = all.slice(from, to + 1);
const shots = join(dir, 'shots');
mkdirSync(shots, { recursive: true });

// Everything that is the game's interface rather than the campus.
const HIDE = `
  .pennant, .main-menu, .campus-map-zoom-controls, .log-ticker, .toolbar,
  .toast, .tooltip, [role="tooltip"] { display: none !important; }
  /* The map keeps the room the dock and ticker took: give it back. */
  :root { --toolbar-height: 0px !important; --log-ticker-height: 0px !important; }
  .timelapse-caption {
    position: fixed; left: 48px; bottom: 40px; z-index: 50;
    font: 600 44px/1 'Bricolage Grotesque Variable', system-ui, sans-serif;
    color: #fff; text-shadow: 0 2px 10px rgba(0,0,0,.45); letter-spacing: .01em;
  }
  .timelapse-caption small { display: block; margin-top: 8px; font-size: 22px; font-weight: 500; opacity: .9; }
`;

const browser = await chromium.launch({ executablePath, args: ['--no-sandbox', '--disable-background-networking'] });
const errors = [];

// --views: the map moved to a view by the player's own means, a wheel turn
// and drags (CampusMap.tsx), then read back, since the canvas sets its
// offset on a device pixel.
const ZOOM_SPEED = 0.0016;       // CampusMap.tsx: zoom × e^(−deltaY × ZOOM_SPEED), toward the cursor
const mapView = (page) => page.evaluate(() => window.__campusMap.view());
// A drag by (dx, dy), in pieces that stay on the page, each by way of a
// point off its line, so a short one is still a drag and not a click.
async function dragBy(page, dx, dy) {
  const pieces = Math.max(1, Math.ceil(Math.max(Math.abs(dx) / (W * 0.4), Math.abs(dy) / (H * 0.4))));
  for (let i = 0; i < pieces; i++) {
    const [x, y] = [W / 2 - dx / pieces / 2, H / 2 - dy / pieces / 2];
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 24, y + 24, { steps: 4 });
    await page.mouse.move(x + dx / pieces, y + dy / pieces, { steps: 8 });
    await page.mouse.up();
  }
  await page.keyboard.press('Escape');
}
async function setView(page, target) {
  // The target's middle brought to the page's middle, the zoom turned
  // there, which keeps it there, then what is left put right.
  const mid = { x: (W / 2 - target.x) / target.zoom, y: (H / 2 - target.y) / target.zoom };
  let v = await mapView(page);
  await dragBy(page, W / 2 - (mid.x * v.zoom + v.x), H / 2 - (mid.y * v.zoom + v.y));
  // What a wheel turn does, as measured: the browser scales a turn (by the
  // device scale, in headless Chromium).
  let gain = 1;
  for (let tries = 0; tries < 6; tries++) {
    v = await mapView(page);
    const want = Math.log(target.zoom / v.zoom);
    if (Math.abs(want) > 1e-6) {
      await page.mouse.move(W / 2, H / 2);
      await page.mouse.wheel(0, -want / ZOOM_SPEED / gain);
      await page.waitForTimeout(100);
      const turned = await mapView(page);
      const got = Math.log(turned.zoom / v.zoom);
      if (Math.abs(got) > 1e-9) gain *= got / want;
      v = turned;
    }
    if (Math.abs(target.x - v.x) < 0.75 && Math.abs(target.y - v.y) < 0.75 && Math.abs(target.zoom / v.zoom - 1) < 1e-4) return v;
    await dragBy(page, target.x - v.x, target.y - v.y);
  }
  return mapView(page);
}

async function shootFrame(file) {
  const payload = readFileSync(join(dir, file), 'utf8');
  const { state } = JSON.parse(payload);
  // A context per frame: the game saves itself when a page unloads
  // (useGame.ts), so one page reloaded would write each frame over the next.
  const context = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: scale });
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(`${file}: ${String(e)}`));
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.evaluate(([s, seasons]) => {
    localStorage.clear();
    localStorage.setItem('unischool.save', s);
    // settings.ts's key: the map's seasons on or off (Plan 74I).
    localStorage.setItem('unischool.settings.v1', JSON.stringify({ seasons }));
  }, [payload, seasons]);
  await page.goto(URL, { waitUntil: 'networkidle' });
  const cont = page.locator('.title-primary');
  if (await cont.count()) await cont.first().click();
  await page.waitForSelector('svg', { timeout: 20_000 });
  await page.waitForTimeout(800);
  // Paused, so the clock raises nothing while the camera is set.
  await page.getByRole('button', { name: 'Paused', exact: true }).click().catch(() => {});
  if (views) {
    await setView(page, views[Number(file.match(/\d+/)[0])]);
  } else if (zoom !== 0) {
    await page.click('.map-tools-toggle');
    for (let i = 0; i < Math.abs(zoom); i++) {
      await page.click(zoom > 0 ? 'button:has-text("+")' : 'button:has-text("−")');
      await page.waitForTimeout(150);
    }
    await page.click('.map-tools-toggle').catch(() => {});
  }
  if (!views && (pan[0] || pan[1])) {
    await page.mouse.move(W / 2, H / 2);
    await page.mouse.down();
    await page.mouse.move(W / 2 + pan[0], H / 2 + pan[1], { steps: 20 });
    await page.mouse.up();
    await page.waitForTimeout(300);
    // A short drag reads as a click on whatever it ended over.
    await page.keyboard.press('Escape');
  }
  await page.addStyleTag({ content: HIDE });
  if (clean) await page.addStyleTag({ content: CLEAN_MAP_CSS });
  if (caption) {
    // format.ts's termName: the first half of the year is the fall term.
    const term = state.clock.week <= 26 ? 'Fall term' : 'Spring term';
    await page.evaluate(([year, term]) => {
      const el = document.createElement('div');
      el.className = 'timelapse-caption';
      el.innerHTML = `Year ${year}<small>${term}</small>`;
      document.body.append(el);
    }, [state.clock.year, term]);
  }
  await page.mouse.move(1, 1);
  await page.waitForTimeout(1_200);
  await waitForMap(page);
  const base = join(shots, file.replace(/\.json$/, ''));
  await page.screenshot({ path: `${base}.jpg`, type: 'jpeg', quality: 92 });
  if (png) await page.screenshot({ path: `${base}.png` });
  if (positions) {
    writeFileSync(`${base}.positions.json`, JSON.stringify({ width: W, height: H, scale, view: await mapView(page), buildings: await mapBuildings(page) }));
  }
  await context.close();
}

let next = 0;
let done = 0;
const started = Date.now();
await Promise.all(Array.from({ length: Math.min(jobs, frames.length) }, async () => {
  while (next < frames.length) {
    const file = frames[next++];
    await shootFrame(file);
    done += 1;
    if (done % 10 === 0 || done === frames.length) {
      const s = (Date.now() - started) / 1000;
      console.log(`${done}/${frames.length} frames, ${s.toFixed(0)}s`);
    }
  }
}));
await browser.close();
if (errors.length > 0) console.log(`page errors:\n  ${[...new Set(errors)].join('\n  ')}`);

// The whole run, every shot on disk in order, retakes included.
const jpgs = readdirSync(shots).filter((f) => f.endsWith('.jpg')).sort();
if (!FFMPEG) {
  console.log(`no ffmpeg found: the frames are in ${shots}. Set FFMPEG_PATH to join them.`);
  process.exit(0);
}
const video = join(dir, 'timelapse.webm');
const ff = spawn(FFMPEG, [
  '-y', '-hide_banner', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', 'pipe:0',
  '-c:v', 'libvpx', '-b:v', '12M', '-qmin', '4', '-qmax', '20', '-r', '30', video,
], { stdio: ['pipe', 'ignore', 'inherit'] });
for (const f of jpgs) {
  if (!ff.stdin.write(readFileSync(join(shots, f)))) await new Promise((r) => ff.stdin.once('drain', r));
}
ff.stdin.end();
await new Promise((resolve, reject) => ff.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}`)))));
console.log(`${video}: ${jpgs.length} frames at ${fps} a second, ${(jpgs.length / fps).toFixed(1)}s`);
