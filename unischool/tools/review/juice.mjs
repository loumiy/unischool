// ---------------------------------------------------------------------
// WHAT THE GAME DOES BACK (Plan 123, pass C): one verb, measured.
//
//   npx vite preview --port 4173                  # in one shell (or dev)
//   node tools/review/juice.mjs <name> <save.json|fresh> [setup steps] -- <act steps>
//   node tools/review/juice.mjs hire save.json resume key=f -- "click=Hire"
//
// Plays the setup steps (drive.mjs's grammar: resume, click=, sel=, key=,
// mouse=, move=, wait=, hover=), then the act steps, and from the first act
// step records for five seconds:
//   - the screen: a screenshot at 0, 50, 100, 200, 400, 800, 1600, 3200 and
//     5000 ms, each compared with the one before the act (the share of the
//     screen that changed, after a small blur), and a filmstrip of them;
//   - the page: DOM mutations per 100 ms bucket (a number counting, a toast,
//     a panel opening);
//   - the sound: every oscillator or noise voice the page starts, with its
//     time and frequency (the game synthesises its effects, engine.ts), so
//     a cue is seen as voices starting together.
// Writes node_modules/.tmp/juice/<name>/{strip.png,report.json} and prints
// the first frame with a visible response, the first sound, and the totals.
// A measure, not a verdict: the reviewer scores the beats from these.
// ---------------------------------------------------------------------
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright-core';

const argv = process.argv.slice(2);
const [name, start, ...rest] = argv;
if (!name || !start) { console.error('usage: juice <name> <save.json|fresh> [setup…] -- <act…>'); process.exit(2); }
const sep = rest.indexOf('--');
const setup = sep < 0 ? [] : rest.slice(0, sep);
const act = sep < 0 ? rest : rest.slice(sep + 1);
const ROOT = new URL('../..', import.meta.url).pathname;
const OUT = join(ROOT, 'node_modules/.tmp/juice', name);
mkdirSync(OUT, { recursive: true });
const URL_ = process.env.CAMPUS_URL ?? 'http://localhost:4173/';
const CHROME = [process.env.CHROME_PATH, '/opt/pw-browsers/chromium', '/usr/bin/chromium'].filter(Boolean).find((p) => existsSync(p));
const MARKS = [0, 50, 100, 200, 400, 800, 1600, 3200, 5000];

const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await context.addInitScript(() => {
  // Sound: log every voice the page starts.
  const log = (window.__voices = []);
  const wrap = (proto, kind) => {
    const orig = proto.start;
    proto.start = function (...a) {
      const freq = this.frequency?.value ?? this.__band ?? null;
      log.push({ t: performance.now(), kind, wave: this.type ?? 'noise', freq: freq ? Math.round(freq) : null });
      return orig.apply(this, a);
    };
  };
  wrap(OscillatorNode.prototype, 'osc');
  wrap(AudioBufferSourceNode.prototype, 'buffer');
  // The page: mutations, timestamped.
  window.__muts = [];
  const watch = () => new MutationObserver((ms) => { const t = performance.now(); for (const m of ms) window.__muts.push(t); })
    .observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watch); else watch();
});
if (start !== 'fresh') {
  const save = readFileSync(start, 'utf8');
  await context.addInitScript((v) => { if (!sessionStorage.getItem('juice-loaded')) { localStorage.setItem('unischool.save', v); sessionStorage.setItem('juice-loaded', '1'); } }, save);
}
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(URL_, { waitUntil: 'networkidle' });
await page.waitForTimeout(800);

async function clickText(text) {
  for (const loc of [page.getByRole('button', { name: text, exact: true }), page.getByRole('button', { name: text })]) {
    if (await loc.count()) { await loc.first().click(); return; }
  }
  await page.getByText(text, { exact: false }).first().click();
}
async function step(s, settle = true) {
  const [cmd, ...r] = s.split('='); const arg = r.join('=');
  switch (cmd) {
    case 'resume': { const c = page.locator('.title-primary'); if (await c.count()) { await c.first().click(); await page.waitForTimeout(1200); } break; }
    case 'click': await clickText(arg); break;
    case 'sel': await page.locator(arg).first().click(); break;
    case 'key': await page.keyboard.press(arg); break;
    case 'mouse': { const [x, y] = arg.split(',').map(Number); await page.mouse.click(x, y); break; }
    case 'move': { const [x, y] = arg.split(',').map(Number); await page.mouse.move(x, y, { steps: 8 }); break; }
    case 'hover': await page.locator(arg).first().hover(); break;
    case 'wait': await page.waitForTimeout(Number(arg)); return;
    default: throw new Error(`unknown step ${s}`);
  }
  if (settle) await page.waitForTimeout(350);
}
for (const s of setup) await step(s).catch((e) => console.log(`[setup fail] ${s}: ${String(e).split('\n')[0]}`));
await page.waitForTimeout(500);

// A grey 240×150 thumbnail of a PNG, through ffmpeg, for the diff.
const gray = (png) => spawnSync('ffmpeg', ['-v', 'error', '-i', 'pipe:0', '-vf', 'scale=240:150,boxblur=1', '-f', 'rawvideo', '-pix_fmt', 'gray', 'pipe:1'], { input: png, maxBuffer: 1 << 24 }).stdout;
const diff = (a, b) => { let n = 0; for (let i = 0; i < a.length; i++) if (Math.abs(a[i] - b[i]) > 12) n++; return n / a.length; };

const before = await page.screenshot();
writeFileSync(join(OUT, 'f-before.png'), before);
const base = gray(before);
const t0 = await page.evaluate(() => { window.__voices.length = 0; window.__muts.length = 0; return performance.now(); });
// The act: the first step is not awaited to settle, so the 0 ms frame is
// the frame right after the input.
for (const [i, s] of act.entries()) await step(s, i < act.length - 1).catch((e) => console.log(`[act fail] ${s}: ${String(e).split('\n')[0]}`));
const frames = [];
for (const ms of MARKS) {
  const now = await page.evaluate((t) => performance.now() - t, t0);
  if (ms > now) await page.waitForTimeout(ms - now);
  const png = await page.screenshot();
  const at = Math.round(await page.evaluate((t) => performance.now() - t, t0));
  const f = join(OUT, `f-${String(ms).padStart(4, '0')}.png`);
  writeFileSync(f, png);
  frames.push({ mark: ms, at, changed: +diff(base, gray(png)).toFixed(4), file: f });
}
const { voices, muts } = await page.evaluate((t) => ({
  voices: window.__voices.map((v) => ({ ...v, t: Math.round(v.t - t) })),
  muts: window.__muts.map((m) => Math.round(m - t)),
}), t0);
const buckets = {};
for (const m of muts) { const b = Math.floor(m / 100) * 100; buckets[b] = (buckets[b] ?? 0) + 1; }

// The filmstrip: before, then each mark, three to a row.
const inputs = [join(OUT, 'f-before.png'), ...frames.map((f) => f.file)];
spawnSync('ffmpeg', ['-v', 'error', '-y', ...inputs.flatMap((f) => ['-i', f]),
  '-filter_complex', `${inputs.map((_, i) => `[${i}:v]scale=480:300,drawtext=text='${i === 0 ? 'before' : `${frames[i - 1].mark} ms`}':x=8:y=8:fontsize=20:fontcolor=white:box=1:boxcolor=black@0.6[v${i}]`).join(';')};${inputs.map((_, i) => `[v${i}]`).join('')}xstack=inputs=${inputs.length}:layout=${inputs.map((_, i) => `${(i % 5) * 480}_${Math.floor(i / 5) * 300}`).join('|')}:fill=black`,
  join(OUT, 'strip.png')]);

const firstVisible = frames.find((f) => f.changed >= 0.002);
const report = { name, setup, act, frames: frames.map(({ file, ...f }) => f), voices, mutationsPer100ms: buckets, errors };
writeFileSync(join(OUT, 'report.json'), JSON.stringify(report, null, 1));
console.log(`[juice] ${name}`);
console.log(`  screen: ${frames.map((f) => `${f.mark}ms ${(f.changed * 100).toFixed(1)}%`).join(' · ')}`);
console.log(`  first visible response: ${firstVisible ? `${firstVisible.mark} ms` : 'none in 5 s'}`);
console.log(`  page mutations: ${muts.length} (first at ${muts[0] ?? '—'} ms)`);
console.log(`  sound: ${voices.length ? `${voices.length} voices, first at ${voices[0].t} ms: ${voices.slice(0, 6).map((v) => `${v.wave}${v.freq ? '@' + v.freq : ''}`).join(' ')}` : 'none'}`);
if (errors.length) console.log(`  errors: ${errors.join(' | ')}`);
console.log(`  → ${join(OUT, 'strip.png')}`);
await browser.close();
