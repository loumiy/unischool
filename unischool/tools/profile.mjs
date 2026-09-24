// Map frame times at each speed, on a save you choose. Loads the save into a
// headless Chromium through localStorage, sets a speed with the status bar's
// own buttons, and samples requestAnimationFrame for a few seconds per speed:
// frames per second, the 95th-percentile frame, and long tasks (over 50 ms).
// Modals are answered with their last button so the clock keeps running.
//
//   npm run dev                                   # in one shell
//   npm run scenario -- --strategy Completionist --year 40 --clear-modal /tmp/y40.json
//   npm run profile -- /tmp/y40.json [--seconds=10] [--size=1440,900]
//
// Headless Chromium draws in software, so read the numbers against each
// other (before and after a change, one speed against another) rather than
// as what a player's machine will show.

import { readFileSync, existsSync } from 'node:fs';
import { chromium } from 'playwright-core';

const [savePath, ...flags] = process.argv.slice(2);
if (!savePath || !existsSync(savePath)) {
  console.error('usage: profile <save.json> [--seconds=N] [--size=W,H]');
  process.exit(2);
}
const flag = (name, fallback) => flags.find((f) => f.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const SECONDS = Number(flag('seconds', '10'));
const [W, H] = flag('size', '1440,900').split(',').map(Number);
const URL = process.env.CAMPUS_URL ?? 'http://localhost:5173/';
const SAVE_KEY = 'unischool.save';

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});
const page = await browser.newPage({ viewport: { width: W, height: H } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.addInitScript(
  ([key, save]) => {
    if (!sessionStorage.getItem('profile.loaded')) {
      localStorage.setItem(key, save);
      sessionStorage.setItem('profile.loaded', '1');
    }
  },
  [SAVE_KEY, readFileSync(savePath, 'utf8')],
);
await page.goto(URL, { waitUntil: 'load' });
await page.waitForTimeout(1500);

// Samples frames for `seconds` while answering any modal that stops the clock.
async function sample(seconds) {
  await page.evaluate(() => {
    const w = window;
    w.__frames = [];
    w.__long = 0;
    let last = performance.now();
    const tick = (t) => {
      w.__frames.push(t - last);
      last = t;
      if (w.__sampling) requestAnimationFrame(tick);
    };
    w.__sampling = true;
    requestAnimationFrame(tick);
    new PerformanceObserver((list) => { w.__long += list.getEntries().length; }).observe({ type: 'longtask', buffered: false });
  });
  const until = Date.now() + seconds * 1000;
  while (Date.now() < until) {
    const modal = page.locator('.modal button:not([disabled]), [role=dialog][aria-modal=true] button:not([disabled])');
    if (await modal.count()) await modal.last().click().catch(() => {});
    await page.waitForTimeout(250);
  }
  return page.evaluate(() => {
    const w = window;
    w.__sampling = false;
    const frames = w.__frames.slice(1).sort((a, b) => a - b);
    const mean = frames.reduce((s, f) => s + f, 0) / Math.max(frames.length, 1);
    return {
      fps: 1000 / mean,
      p95: frames[Math.floor(frames.length * 0.95)] ?? 0,
      longTasks: w.__long,
      week: document.body.innerText.match(/Year \d+ · [^\n]*Week \d+/)?.[0] ?? '?',
    };
  });
}

const SPEEDS = ['Paused', 'Play', '2×', '4×'];
console.log(`${savePath} at ${W}×${H}, ${SECONDS}s per speed`);
console.log('speed        fps    p95 frame   long tasks   clock after');
for (const label of SPEEDS) {
  await page.locator(`button[aria-label="${label}"]`).first().click();
  const r = await sample(SECONDS);
  console.log(`${label.padEnd(10)} ${r.fps.toFixed(1).padStart(6)} ${`${r.p95.toFixed(1)} ms`.padStart(12)} ${String(r.longTasks).padStart(12)}   ${r.week}`);
}
if (errors.length) console.log(`\npage errors:\n  ${errors.join('\n  ')}`);
await browser.close();
process.exit(errors.length ? 1 : 0);
