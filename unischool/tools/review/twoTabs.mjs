// ---------------------------------------------------------------------
// TWO TABS, ONE SAVE (Plan 73, area 7; Plan 79B's guard). A probe, not a
// test: opens one save in several tabs of one browser and reads which game
// a fresh tab continues from after each way two tabs can meet. Plan 73
// wrote it as the repro of G7-1 (a stale tab's close wrote its older game
// over the newer one); Plan 86 (the second review) turned it into the four
// cases below, each with the week it expects.
//
//   1. The October repro. A continues, then B continues (B takes the
//      claim). A is asked to play on: it should show the banner and stay
//      put. B closes. A fresh tab continues at the week both opened at.
//   2. Taken back. A presses "Open it here", plays on, and is hidden
//      (which saves). B, which has lost the claim, closes. A fresh tab
//      continues at A's week.
//   3. A stale Continue. B sits on the title screen, loaded before A saved.
//      Its Continue should open A's newer game, not the one it loaded.
//   4. Side by side. A plays on without being hidden, so nothing is saved;
//      B continues from the save. B holds the college from the week it
//      loaded, and A's unsaved weeks go (the plan's "last tab to take up
//      the college keeps it"). Reported, not judged.
//
//   node tools/review/twoTabs.mjs save.json     # CAMPUS_URL, default the dev server
// Exits non-zero if a case ends at a week it did not expect.
// ---------------------------------------------------------------------
import { existsSync, readFileSync } from 'node:fs';
import { chromium } from 'playwright-core';

const savePath = process.argv[2];
if (!savePath) { console.error('usage: twoTabs <save.json>'); process.exit(2); }
const URL = process.env.CAMPUS_URL ?? 'http://localhost:5173/';
const CHROME = [process.env.CHROME_PATH, '/opt/pw-browsers/chromium/chrome-linux/chrome', '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/usr/bin/chromium'].filter(Boolean).find((p) => existsSync(p));
const save = readFileSync(savePath, 'utf8');
const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });

const weekOf = (text) => {
  const m = /Year (\d+) · [^·\n]+ · Week (\d+)/.exec(text ?? '');
  return m ? (Number(m[1]) - 1) * 52 + Number(m[2]) : null;
};
const label = (w) => (w === null ? 'nowhere' : `Year ${Math.floor((w - 1) / 52) + 1}, week ${((w - 1) % 52) + 1}`);
const clock = async (p) => weekOf(await p.locator('body').innerText());
const saved = (p) => p.evaluate(() => { const s = JSON.parse(localStorage.getItem('unischool.save')); return (s.state.clock.year - 1) * 52 + s.state.clock.week; });
const banner = (p) => p.locator('.elsewhere-banner').isVisible();
const hide = (p) => p.evaluate(() => {
  Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));
});
const close = (p) => p.evaluate(() => window.dispatchEvent(new Event('pagehide')));
const continueWeek = async (p) => weekOf(await p.locator('.title-primary').first().innerText());
async function title(page) {
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.locator('.title-primary').first().waitFor();
}
async function cont(page) {
  await page.locator('.title-primary').first().click();
  await page.waitForTimeout(1500);
}
async function play(page, ms) {
  const two = page.getByRole('button', { name: '2×', exact: true });
  if (await two.isEnabled().catch(() => false)) await two.click({ timeout: 1500 }).catch(() => {});
  await page.waitForTimeout(ms);
  await page.getByRole('button', { name: 'Paused', exact: true }).click({ timeout: 1500 }).catch(() => {});
}
async function fresh() {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const A = await context.newPage();
  await A.goto(URL, { waitUntil: 'networkidle' });
  await A.evaluate((v) => { localStorage.clear(); localStorage.setItem('unischool.save', v); }, save);
  return { context, A };
}

let bad = 0;
const verdict = (name, got, want, note = '') => {
  const ok = got === want;
  if (!ok) bad += 1;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}: a fresh tab continues at ${label(got)}${ok ? '' : `, expected ${label(want)}`}${note ? ` (${note})` : ''}`);
};

// 1 and 2, one browser.
{
  const { context, A } = await fresh();
  await title(A); await cont(A);
  const start = await clock(A);
  const B = await context.newPage();
  await title(B); await cont(B);
  console.log(`1. both tabs continued at ${label(start)}; A's banner: ${await banner(A)}, B's: ${await banner(B)}`);
  await A.bringToFront();
  await play(A, 8000);
  console.log(`   A asked to play on 8 s: at ${label(await clock(A))}`);
  await hide(A);
  await close(B);
  const C = await context.newPage();
  await title(C);
  verdict('1. the October repro', await continueWeek(C), start);
  await C.close();

  // 2. A takes it back.
  await Promise.all([A.waitForEvent('load'), A.getByRole('button', { name: 'Open it here' }).click()]);
  await A.waitForLoadState('networkidle');
  await A.waitForTimeout(1500);
  console.log(`2. A pressed "Open it here": at ${label(await clock(A))}, banner ${await banner(A)}; B's banner: ${await banner(B)}`);
  await play(A, 15000);
  const aWeek = await clock(A);
  await hide(A);
  console.log(`   A played on to ${label(aWeek)} and, hidden, saved ${label(await saved(A))}`);
  await close(B);
  console.log(`   B (at ${label(await clock(B))}) closed; the save reads ${label(await saved(B))}`);
  const D = await context.newPage();
  await title(D);
  verdict('2. taken back', await continueWeek(D), aWeek);
  await context.close();
}

// 3. A stale Continue.
{
  const { context, A } = await fresh();
  const B = await context.newPage();
  await title(B);
  const bLoaded = await continueWeek(B);
  await title(A); await cont(A);
  await play(A, 15000);
  const aWeek = await clock(A);
  await hide(A);
  await B.bringToFront();
  await B.locator('.title-primary').first().click();
  await B.waitForTimeout(3000);
  const bWeek = await clock(B);
  const ok = bWeek === aWeek;
  if (!ok) bad += 1;
  console.log(`${ok ? 'ok  ' : 'FAIL'} 3. a stale Continue: B loaded ${label(bLoaded)}, A saved ${label(aWeek)}, B's Continue opened ${label(bWeek)}; A's banner: ${await banner(A)}`);
  await close(A); await close(B);
  const C = await context.newPage();
  await title(C);
  verdict('3. after both close', await continueWeek(C), aWeek);
  await context.close();
}

// 4. Side by side: A is never hidden, so it has not saved when B continues.
{
  const { context, A } = await fresh();
  await title(A); await cont(A);
  const start = await clock(A);
  await play(A, 15000);
  const aWeek = await clock(A);
  const B = await context.newPage();
  await title(B); await cont(B);
  console.log(`4. side by side: A played ${label(start)} → ${label(aWeek)} unsaved; B continued at ${label(await clock(B))}; A's banner: ${await banner(A)}`);
  await close(A); await close(B);
  const C = await context.newPage();
  await title(C);
  verdict('4. side by side', await continueWeek(C), start, `A's ${aWeek - start} unsaved weeks are not kept, by design`);
  await context.close();
}

await browser.close();
process.exit(bad ? 1 : 0);
