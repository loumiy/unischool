// ---------------------------------------------------------------------
// TWO TABS, ONE SAVE (Plan 73, area 7). A repro, not a test: opens the same
// save in two tabs of one browser, plays tab A on for a few weeks, hides it
// (which saves, useGame.ts), then closes tab B, which is still at the old
// week, and reads which week a fresh tab continues from. Nothing guards
// the save against a second tab, so the last tab to hide or close wins.
//
//   npm run dev                                    # in one shell
//   node tools/review/twoTabs.mjs node_modules/.tmp/sc/y8.json
// ---------------------------------------------------------------------
import { existsSync, readFileSync } from 'node:fs';
import { chromium } from 'playwright-core';

const savePath = process.argv[2];
if (!savePath) { console.error('usage: twoTabs <save.json>'); process.exit(2); }
const URL = process.env.CAMPUS_URL ?? 'http://localhost:5173/';
const CHROME = [process.env.CHROME_PATH, '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/usr/bin/chromium'].filter(Boolean).find((p) => existsSync(p));
const save = readFileSync(savePath, 'utf8');
const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const clock = async (p) => (await p.locator('body').innerText()).match(/Year \d+ · [^\n]*Week \d+/)?.[0];
const saved = (p) => p.evaluate(() => { const s = JSON.parse(localStorage.getItem('unischool.save')); return `Year ${s.state.clock.year}, week ${s.state.clock.week}`; });
async function open(page) {
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.locator('.title-primary').first().click();
  await page.waitForTimeout(1000);
  await page.getByRole('button', { name: 'Paused', exact: true }).click();
}

const A = await context.newPage();
await A.goto(URL, { waitUntil: 'networkidle' });
await A.evaluate((v) => localStorage.setItem('unischool.save', v), save);
await open(A);
const B = await context.newPage();
await open(B);
console.log(`both tabs open at ${await clock(A)}`);
await A.bringToFront();
await A.getByRole('button', { name: '2×', exact: true }).click();
await A.waitForTimeout(22_000);
await A.getByRole('button', { name: 'Paused', exact: true }).click();
// Switching away hides a tab; the game saves on that.
await A.evaluate(() => {
  Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));
});
console.log(`tab A played on to ${await clock(A)} and, hidden, saved ${await saved(A)}`);
await B.evaluate(() => window.dispatchEvent(new Event('pagehide')));
console.log(`tab B, still at ${await clock(B)}, closed and saved ${await saved(B)}`);
const C = await context.newPage();
await open(C);
console.log(`a fresh tab continues at ${await clock(C)}`);
await browser.close();
