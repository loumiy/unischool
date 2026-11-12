// ---------------------------------------------------------------------
// THE RIG THE ITCH.IO GIFS ARE SHOT WITH. A save loaded into a headless
// Chromium under Playwright's fake clock (as clip.mjs does), a drawn
// pointer (a headless screenshot has none), and a frame written for every
// step of page time, so a GIF plays at an even rate however slowly the
// software renderer draws. Each GIF's script (build.mjs, courses.mjs,
// admissions.mjs, year.mjs) is a timeline on top of this.
//
// Not part of the game. See tools/README.md, "The itch.io GIFs".
// ---------------------------------------------------------------------
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { parcelView, waitForMap } from '../mapReview.mjs';

const CANDIDATES = [
  process.env.CHROME_PATH,
  '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome',
  '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  '/usr/bin/chromium',
  '/usr/bin/google-chrome',
].filter(Boolean);
const FFMPEG = [process.env.FFMPEG_PATH, '/usr/bin/ffmpeg', '/opt/pw-browsers/ffmpeg-1011/ffmpeg-linux']
  .filter(Boolean).find((p) => existsSync(p));

// useGame.ts's SPEEDS: page milliseconds a week; StatusHeader.tsx's labels.
export const WEEK_MS = { real: 5000, double: 2500, quad: 1250, octo: 625 };
const SPEED_LABEL = { real: 'Play', double: '2×', quad: '4×', octo: '8×' };

// The pointer: the system arrow, drawn over the page.
const POINTER = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="30" viewBox="0 0 22 30">
  <path d="M2 2 L2 24 L7.5 18.5 L11.5 27.5 L15 26 L11 17 L19 17 Z" fill="#fff" stroke="#111" stroke-width="1.6" stroke-linejoin="round"/></svg>`;

export async function openRig({ save, out, size = [1280, 800], scale = 1, fps = 12, seasons = true, url, parcel = true, hide = [] }) {
  const executablePath = CANDIDATES.find((p) => existsSync(p));
  if (!executablePath) throw new Error(`no Chromium found. Tried:\n  ${CANDIDATES.join('\n  ')}\nSet CHROME_PATH.`);
  const base = url ?? process.env.CAMPUS_URL ?? 'http://localhost:5173/';
  const URL = parcel ? parcelView(base) : base;
  const payload = typeof save === 'string' ? readFileSync(save, 'utf8') : JSON.stringify(save);
  const [W, H] = size;
  const browser = await chromium.launch({ executablePath, args: ['--no-sandbox', '--disable-background-networking'] });
  const context = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: scale });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.clock.install();
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.evaluate(([s, seasons]) => {
    localStorage.clear();
    localStorage.setItem('unischool.save', s);
    localStorage.setItem('unischool.settings.v1', JSON.stringify({ seasons, muted: true, pauseOnArrival: false, pauseForNews: false, stats: 'off', feedbackPrompts: false }));
  }, [payload, seasons]);
  await page.goto(URL, { waitUntil: 'networkidle' });
  const cont = page.locator('.title-primary');
  if (await cont.count()) await cont.first().click();
  await page.waitForSelector('svg', { timeout: 20_000 });
  await page.waitForTimeout(1_500);
  await page.getByRole('button', { name: 'Paused', exact: true }).click().catch(() => {});
  await page.addStyleTag({ content: `
    ${hide.length ? `${hide.join(', ')} { display: none !important; }` : ''}
    #gif-pointer { position: fixed; left: 0; top: 0; width: 22px; height: 30px; z-index: 2147483647;
      pointer-events: none; transform: translate(-40px, -40px); filter: drop-shadow(0 1px 1.5px rgba(0,0,0,.35)); }
    #gif-pointer.down svg { transform: scale(.88); transform-origin: 2px 2px; }
    * { caret-color: transparent !important; }
  ` });
  await page.evaluate((svg) => {
    const d = document.createElement('div');
    d.id = 'gif-pointer';
    d.innerHTML = svg;
    document.body.appendChild(d);
  }, POINTER);

  // The frames, kept out of the GIF's folder (it is docs/, committed).
  const dir = fileURLToPath(new globalThis.URL(`../../node_modules/.tmp/itch-gifs/${basename(out)}.frames`, import.meta.url));
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  let frame = 0;
  let pointer = [-40, -40];
  let step = 1000 / fps;
  let speedButton = null;
  let debt = 0;

  const rig = {
    page, W, H, fps, errors,
    get frames() { return frame; },
    // Page time a frame, in ms (1000 / fps is real time).
    setStep(ms) { step = ms; },
    async stopClock() {
      await page.clock.pauseAt(await page.evaluate(() => Date.now() + 2000));
    },
    // Runs the page clock without writing frames (warm-up, settling).
    async run(ms) { for (let t = 0; t < ms; t += 500) await page.clock.runFor(Math.min(500, ms - t)); },
    async speed(name) {
      speedButton = page.locator(`button[aria-label="${SPEED_LABEL[name]}"]`).first();
      const lock = await speedButton.getAttribute('title');
      if (lock?.startsWith('Appoint')) throw new Error(`speed ${name} is locked in this save: ${lock}`);
      await speedButton.evaluate((b) => b.click());
    },
    async pause() {
      speedButton = null;
      await page.locator('button[aria-label="Paused"], button[aria-label="Pause"]').first().evaluate((b) => b.click()).catch(() => {});
    },
    // One frame: answer any stop the clock waits on, keep the speed held,
    // step the clock, write the PNG.
    // `before` runs after the clock moves and before the PNG (a caption).
    async shot({ clearStops = false, before = null } = {}) {
      if (clearStops) await rig.clearStops();
      if (speedButton) await speedButton.evaluate((b) => { if (b.getAttribute('aria-pressed') !== 'true') b.click(); }).catch(() => {});
      // A jump, not a run: runFor fires every animation frame in between,
      // and each costs the software renderer a whole paint. The jump fires
      // each due timer once and one animation frame, so the walkers move by
      // the step and a week's tick lands when its time comes.
      // The ticks the last frame's settling spent come off this step, so
      // page time keeps to the frame rate and the game's clock to its speed.
      const jump = Math.max(1, step - debt);
      debt = Math.max(0, debt - (step - 1));
      await page.clock.fastForward(jump);
      // The canvas paints what changed over several animation frames (a
      // season's ground, tile by tile): step a frame at a time until it says
      // it has drawn the view in full, or a stale strip stays on screen.
      for (let i = 0; i < 40; i++) {
        const done = await page.evaluate(() => window.__campusMap?.settled?.() ?? true).catch(() => true);
        if (done) break;
        await page.clock.runFor(16);
        debt += 16;
      }
      if (before) await before();
      await page.screenshot({ path: `${dir}/${String(frame).padStart(4, '0')}.png` });
      frame++;
      if (frame % 12 === 0) process.stdout.write(`\rframe ${frame}`);
    },
    async hold(seconds, opts) { for (let i = 0, n = Math.round(seconds * fps); i < n; i++) await rig.shot(opts); },
    async clearStops() {
      const STOP = '.modal-inbox, .modal-backdrop .modal, [role="dialog"][aria-modal="true"]';
      for (let i = 0; i < 6; i++) {
        const modal = page.locator(STOP);
        if (!(await modal.count())) return;
        await modal.first().locator('button:not([disabled])').last().evaluate((b) => b.click()).catch(() => {});
        await page.waitForTimeout(150);
      }
    },
    // The drawn pointer and the real mouse, together.
    async pointerTo(x, y, { mouse = true } = {}) {
      pointer = [x, y];
      if (mouse) await page.mouse.move(x, y);
      await page.evaluate(([x, y]) => { document.getElementById('gif-pointer').style.transform = `translate(${x - 2}px, ${y - 2}px)`; }, [x, y]);
    },
    // A hand's move to (x, y) over `seconds`, a frame at a time, eased;
    // `during` runs before each frame (a drag holds the button down).
    async glide(x, y, seconds = 0.5, { opts } = {}) {
      const [x0, y0] = pointer;
      const n = Math.max(1, Math.round(seconds * fps));
      for (let i = 1; i <= n; i++) {
        const t = i / n;
        const e = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
        await rig.pointerTo(x0 + (x - x0) * e, y0 + (y - y0) * e);
        await rig.shot(opts);
      }
    },
    async press(down) {
      await page.evaluate((d) => document.getElementById('gif-pointer').classList.toggle('down', d), down);
    },
    // Glide to an element's middle and click it, a frame pressed.
    async clickOn(locator, seconds = 0.45, opts) {
      const el = typeof locator === 'string' ? page.locator(locator).first() : locator;
      const box = await el.boundingBox();
      if (!box) throw new Error(`nothing to click: ${locator}`);
      await rig.glide(box.x + box.width / 2, box.y + box.height / 2, seconds, { opts });
      await rig.press(true);
      await rig.shot(opts);
      await page.mouse.down();
      await page.mouse.up();
      await rig.press(false);
      await rig.shot(opts);
    },
    async clickAt(x, y, seconds = 0.45, opts) {
      await rig.glide(x, y, seconds, { opts });
      await rig.press(true);
      await rig.shot(opts);
      await page.mouse.down();
      await page.mouse.up();
      await rig.press(false);
      await rig.shot(opts);
    },
    // A drag from where the pointer is to (x, y), with keys held.
    async dragTo(x, y, seconds = 0.5, { keys = [], opts } = {}) {
      for (const k of keys) await page.keyboard.down(k);
      await rig.press(true);
      await page.mouse.down();
      await rig.glide(x, y, seconds, { opts });
      await page.mouse.up();
      await rig.press(false);
      for (const k of keys) await page.keyboard.up(k);
    },
    // A grid point on the page (mapProbe.ts's tile).
    tile(col, row) { return page.evaluate(([c, r]) => window.__campusMap.tile(c, r), [col, row]); },
    // Pans the map so the grid point (col, row) is at the page's (x, y).
    async centreOn(col, row, x = W / 2, y = H / 2) {
      for (let pass = 0; pass < 2; pass++) {
        const t = await rig.tile(col, row);
        const dx = x - t.x, dy = y - t.y;
        if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
        const x0 = W / 2 - dx / 2, y0 = H / 2 - dy / 2;
        await page.mouse.move(x0, y0);
        await page.mouse.down({ button: 'middle' });
        await page.mouse.move(x0 + dx, y0 + dy, { steps: 12 });
        await page.mouse.up({ button: 'middle' });
        await page.waitForTimeout(300);
      }
    },
    async zoom(steps) {
      if (!steps) return;
      await page.click('.map-tools-toggle');
      for (let i = 0; i < Math.abs(steps); i++) {
        await page.click(steps > 0 ? 'button:has-text("+")' : 'button:has-text("−")');
        await page.waitForTimeout(250);
      }
      await page.click('.map-tools-toggle').catch(() => {});
      await page.waitForTimeout(400);
    },
    async settle() {
      await page.mouse.move(-20, -20);
      await page.waitForTimeout(600);
      await waitForMap(page);
    },
    async close() {
      process.stdout.write('\n');
      await browser.close();
      if (errors.length) console.warn(`page errors:\n  ${errors.slice(0, 5).join('\n  ')}`);
      return dir;
    },
  };
  return rig;
}

// The frames to a GIF: scaled to `width`, one palette for the whole clip
// (so a colour does not shimmer between frames), only what changed
// re-coded (`diff_mode=rectangle`), and the last frame held `holdLast`
// seconds before the loop. `crop` is x,y,w,h in frame pixels.
export function encodeGif(dir, outPath, { fps = 12, width = 960, colors = 128, dither = 'bayer:bayer_scale=5', crop = null, holdLast = 0 } = {}) {
  if (!FFMPEG) throw new Error('no ffmpeg found');
  const pre = [crop ? `crop=${crop.join(':')}` : null, `scale=${width}:-1:flags=lanczos`,
    holdLast ? `tpad=stop_mode=clone:stop_duration=${holdLast}` : null].filter(Boolean).join(',');
  const filter = `[0:v]${pre},split[a][b];[a]palettegen=max_colors=${colors}:stats_mode=full[p];[b][p]paletteuse=dither=${dither}:diff_mode=rectangle`;
  const run = spawnSync(FFMPEG, ['-y', '-loglevel', 'error', '-framerate', String(fps), '-i', `${dir}/%04d.png`,
    '-filter_complex', filter, '-loop', '0', outPath], { stdio: 'inherit' });
  if (run.status !== 0) throw new Error('ffmpeg failed');
  const mb = statSync(outPath).size / 1e6;
  console.log(`wrote ${outPath} (${mb.toFixed(2)} MB)`);
  return mb;
}

// argv helpers for the four scripts.
export function args() {
  const argv = process.argv.slice(2);
  const flag = (name, fallback) => {
    const hit = argv.find((a) => a.startsWith(`--${name}=`));
    return hit ? hit.slice(name.length + 3) : fallback;
  };
  return { argv, positional: argv.filter((a) => !a.startsWith('--')), flag, has: (n) => argv.includes(`--${n}`) };
}
