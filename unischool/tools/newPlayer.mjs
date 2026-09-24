// A new player, scripted: founds a college in a headless Chromium, follows
// the opening walkthrough by doing what each step asks (through the UI, the
// way a player would), then plays the first year at 4×, answering every
// letter with its last button. It reports what it was shown, how long each
// step took, and where it stalled: a step it could not complete, or a clock
// that stopped with nothing on screen asking for anything.
//
//   npm run dev                              # in one shell
//   npm run newplayer [-- --timeout=180]     # writes node_modules/.tmp/newplayer-*.png on a stall
//
// Nothing in src/ imports it.

import { chromium } from 'playwright-core';

const flag = (name, fallback) => process.argv.find((f) => f.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const TIMEOUT_S = Number(flag('timeout', '180'));
const URL = process.env.CAMPUS_URL ?? 'http://localhost:5173/';
const SHOTS = 'node_modules/.tmp';

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(URL, { waitUntil: 'load' });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'load' });
await page.waitForTimeout(800);

const started = Date.now();
const elapsed = () => ((Date.now() - started) / 1000).toFixed(1);
const log = [];
const note = (what) => { log.push(`${elapsed().padStart(6)}s  ${what}`); };
const stalls = [];
const seen = new Set();
const visible = async (selector) => (await page.locator(selector).count()) > 0;
const clickFirst = async (selector) => {
  const el = page.locator(selector).first();
  if ((await el.count()) === 0) return false;
  await el.click().catch(() => {});
  await page.waitForTimeout(150);
  return true;
};
const clock = async () => (await page.locator('body').innerText()).match(/Year (\d+) · [^\n]*Week (\d+)/);

// Founding.
await page.fill('input[placeholder="e.g. Blackmoor"]', 'Newcomb');
await page.click('.startup-begin-btn');
await page.waitForTimeout(800);
note('founded Newcomb College');

let speedSet = false;
let lastClock = '';
let lastMove = Date.now();
while (Date.now() - started < TIMEOUT_S * 1000) {
  const c = await clock();
  if (c && Number(c[1]) >= 2) { note(`reached ${c[0]}`); break; }

  // The walkthrough's letters: read, then take the step it offers.
  const welcome = page.locator('.modal[data-interrupt="welcome"]');
  if (await welcome.count()) {
    const title = await welcome.getAttribute('aria-label');
    if (!seen.has(`letter:${title}`)) { seen.add(`letter:${title}`); note(`walkthrough letter: ${title}`); }
    await welcome.locator('button:not(.letter-skip)').first().click();
    await page.waitForTimeout(200);
    continue;
  }

  // Any other letter: note it once per kind, answer with the last button.
  const modal = page.locator('.modal-backdrop .modal, [role="dialog"][aria-modal="true"]');
  if (await modal.count()) {
    const kind = (await modal.first().getAttribute('data-interrupt'))
      ?? (await modal.first().getAttribute('aria-label'))
      ?? (await modal.first().locator('h1, h2, h3').first().innerText().catch(() => 'a letter'));
    if (!seen.has(`modal:${kind}`)) { seen.add(`modal:${kind}`); note(`letter: ${kind}`); }
    await modal.first().locator('button:not([disabled])').last().click().catch(() => {});
    await page.waitForTimeout(150);
    lastMove = Date.now();
    continue;
  }

  // The coach: do what it asks.
  const coach = page.locator('.opening-coach');
  if (await coach.count()) {
    const title = await coach.getAttribute('aria-label');
    if (!seen.has(`coach:${title}`)) { seen.add(`coach:${title}`); note(`walkthrough step: ${title}`); lastMove = Date.now(); }
    if (await clickFirst('.opening-coach-actions button')) {
      // A door (the build menu or the hall panel) or Next.
    }
    if (await clickFirst('.opening-target')) {
      // Picked up the ringed build tile, or opened the ringed hall slot.
    }
    if (await visible('.campus-map-svg.placing')) {
      const box = await page.locator('.campus-map-svg').boundingBox();
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      await page.waitForTimeout(200);
    }
    if (await visible('.hall-offer-tile')) {
      await clickFirst('.hall-offer-tile:not(.selected)');
      if (!(await clickFirst('.instructor-option:not(.full):not(.selected)'))) await clickFirst('button:has-text("Appoint")');
      await clickFirst('.building-info-jump:not([disabled])');
    }
  } else if (!speedSet) {
    await clickFirst('button[aria-label="4×"]');
    speedSet = true;
    note('walkthrough done; playing at 4×');
  }

  // The NEXT line, noted whenever it changes.
  const next = page.locator('.log-ticker-next-text');
  if (await next.count()) {
    const text = (await next.innerText()).trim();
    if (!seen.has(`next:${text}`)) { seen.add(`next:${text}`); note(`next: ${text}`); }
  }

  // A stall: the clock has not moved for 20 seconds and nothing is asking.
  const now = c?.[0] ?? '';
  if (now !== lastClock) { lastClock = now; lastMove = Date.now(); }
  if (Date.now() - lastMove > 20_000) {
    const shot = `${SHOTS}/newplayer-stall-${stalls.length + 1}.png`;
    await page.screenshot({ path: shot });
    stalls.push(`${elapsed()}s at ${now || 'the startup'}: nothing moved for 20s (${shot})`);
    note(`STALL: ${stalls.at(-1)}`);
    lastMove = Date.now();
    if (stalls.length >= 3) break;
  }
  await page.waitForTimeout(250);
}

const final = await clock();
console.log(log.join('\n'));
console.log(`\nended at ${final?.[0] ?? 'no clock'} after ${elapsed()}s`);
console.log(stalls.length ? `stalls:\n  ${stalls.join('\n  ')}` : 'no stalls');
if (errors.length) console.log(`page errors:\n  ${errors.join('\n  ')}`);
await browser.close();
process.exit(stalls.length || errors.length || !final || Number(final[1]) < 2 ? 1 : 0);
