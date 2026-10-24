// A new player, scripted: passes the title screen, founds a college in a
// headless Chromium, follows the opening walkthrough by doing what each step
// asks (through the UI, the way a player would: since Plan 107A, site
// Founders Hall, then pick the ringed slot's first offer and found it; the
// founding faculty are already appointed), then plays the first year
// at the fastest speed open to it (2× until a Provost opens 4×), answering
// every stop and every matter with its last button, and opening the summer
// from its call when it waits at week 52 (Plan 112C). Since Plan 106 the
// walkthrough ends at the founding and the chapters take over; this player
// does none of their objectives (it is the player who skims), and logs the
// chapter line on the ticker each time it changes, so a run shows where a
// do-nothing first year leaves the chapters. A drawer Guided opens by itself
// is closed. A matter that pauses the clock on arrival (Plan 78E) is opened
// from its notice, answered in the inbox, and the clock resumed. It reports
// what it was shown, how long each step took, and where it stalled: a step
// it could not complete, or a clock that stopped with nothing on screen
// asking for anything.
//
// With --follow it is a player who reads the first chapters (Plan 115D):
// The next course and Somewhere to sleep by each objective's Show me in the
// drawer, then what it rings; Looking around by the keys and the wheel its
// help names. For the path it picks up the ringed Paths tile and drags from
// the residence hall to Founders Hall, and it saves the drawer, the ringed
// tile and the laid path as newplayer-sleep-*.png.
//
//   npm run dev                              # in one shell
//   npm run newplayer [-- --timeout=180] [-- --years=1]   # writes node_modules/.tmp/newplayer-*.png on a stall
//   npm run newplayer -- --follow            # and follows the first chapters
//   CAMPUS_URL=http://localhost:5174/ npm run newplayer   # a dev server on another port
//
// Nothing in src/ imports it.

import { existsSync } from 'node:fs';
import { chromium } from 'playwright-core';

const flag = (name, fallback) => process.argv.find((f) => f.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const TIMEOUT_S = Number(flag('timeout', '180'));
// The year to stop at (Plan 106's chapters run to year 5): 2 plays year one.
const UNTIL_YEAR = Number(flag('years', '1')) + 1;
const URL = process.env.CAMPUS_URL ?? 'http://localhost:5173/';
const FOLLOW = process.argv.includes('--follow');
const SHOTS = 'node_modules/.tmp';

// The first Chromium found: CHROMIUM or CHROME_PATH, else where Playwright
// puts one.
const CANDIDATES = [
  process.env.CHROMIUM,
  process.env.CHROME_PATH,
  '/opt/pw-browsers/chromium',
  '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  '/usr/bin/chromium',
  '/usr/bin/google-chrome',
].filter(Boolean);
const executablePath = CANDIDATES.find((p) => existsSync(p));
if (!executablePath) {
  console.error(`no Chromium found. Tried:\n  ${CANDIDATES.join('\n  ')}\nSet CHROMIUM.`);
  process.exit(2);
}
const browser = await chromium.launch({ executablePath });
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
  await el.click({ timeout: 1500 }).catch(() => {});
  await page.waitForTimeout(150);
  return true;
};
// The dock's clock (StatusHeader.tsx's SchoolAndClock): the year, and the
// term's week on the calendar page. [label, year, week], or null before
// there is a clock.
const clock = async () => {
  const year = (await page.locator('.toolbar-clock').first().innerText({ timeout: 500 }).catch(() => '')).match(/Year (\d+)/);
  if (!year) return null;
  const term = await page.locator('.toolbar-calendar-term').first().innerText({ timeout: 500 }).catch(() => '');
  const week = await page.locator('.toolbar-calendar-week').first().innerText({ timeout: 500 }).catch(() => '');
  return [`Year ${year[1]} · ${term.trim()} week ${week.trim()}`, year[1], week.trim()];
};
// Where a held building is tried, outward from the centre of the map: the
// first spot whose ghost is green takes it (a residence hall cannot go where
// Founders Hall already stands).
const SPOTS = [[0, 0], ...[1, 2, 3, 4].flatMap((r) => [[r, 0], [-r, 0], [0, r], [0, -r], [r, r], [-r, -r], [r, -r], [-r, r]].map(([x, y]) => [x * 110, y * 80]))];
async function setDown(skip = 0) {
  const box = await page.locator('.campus-map-svg').boundingBox();
  for (const [dx, dy] of SPOTS.slice(skip)) {
    const x = box.x + box.width / 2 + dx;
    const y = box.y + box.height / 2 + dy;
    await page.mouse.move(x, y);
    await page.waitForTimeout(80);
    if (await visible('.campus-preview.ok')) {
      await page.mouse.click(x, y);
      await page.waitForTimeout(200);
      return true;
    }
  }
  return false;
}

// The first chapters, followed (--follow): the ticker's objective, if it is
// one of theirs, done as its help says. A Show me is clicked in the drawer,
// then whatever the view it opens rings. A camera move is made with the
// keys or the wheel its help names. True if it did something.
const SLEEP_OBJECTIVES = ['Place a residence hall', 'Place a dining hall', 'Lay a path from the residence hall to Founders Hall'];
const COURSE_OBJECTIVE = "Start a program's second course";
const LOOK_OBJECTIVES = { 'Pan across the campus': 'pan', 'Turn the view': 'turn', 'Tilt the view': 'tilt', 'Zoom in or out': 'zoom' };
let sleepShots = 0;
// The residence hall it placed, found as the building the map gained.
let dormId = null;
const mapIds = () => page.evaluate(() => (window.__campusMap?.buildings() ?? []).map((b) => b.id));
async function shoot(name) {
  sleepShots += 1;
  const path = `${SHOTS}/newplayer-sleep-${sleepShots}-${name}.png`;
  await page.screenshot({ path });
  note(`shot ${path}`);
}
async function look(move) {
  const box = await page.locator('.campus-map-svg').boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  if (move === 'zoom') await page.mouse.wheel(0, 200);
  else if (move === 'pan') { await page.keyboard.down('d'); await page.waitForTimeout(300); await page.keyboard.up('d'); }
  else await page.keyboard.press(move === 'turn' ? 'q' : 'z');
  await page.waitForTimeout(300);
  note(`looked around: ${move}`);
}
async function follow() {
  const lead = (await page.locator('.log-ticker-objective-text').first().innerText({ timeout: 500 }).catch(() => '')).trim();
  if (await visible('.modal, .modal-inbox')) return false;
  if (LOOK_OBJECTIVES[lead]) {
    if (await visible('.objectives-popup')) await page.keyboard.press('Escape');
    await look(LOOK_OBJECTIVES[lead]);
    return true;
  }
  if (!SLEEP_OBJECTIVES.includes(lead) && lead !== COURSE_OBJECTIVE) return false;
  const path = lead === SLEEP_OBJECTIVES[2];
  if (!(await visible('.objectives-popup'))) await clickFirst('.log-ticker-objective');
  const row = page.locator('.objectives-list li', { hasText: lead }).first();
  if ((await row.count()) === 0) return false;
  await row.locator('.help-hint-btn').first().click({ timeout: 1500 }).catch(() => {});
  await page.waitForTimeout(200);
  if (path && !seen.has('sleep:drawer')) { seen.add('sleep:drawer'); await shoot('drawer'); }
  const door = page.locator('.objectives-door', { hasText: 'Show me' }).first();
  if ((await door.count()) === 0) return false;
  await door.click({ timeout: 1500 }).catch(() => {});
  await page.waitForTimeout(300);
  note(`followed Show me: ${lead}`);
  if (lead === COURSE_OBJECTIVE) {
    if (await clickFirst('.row-action-develop.opening-target:not([disabled])')) note('developed the ringed course');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    return true;
  }
  if (!path) {
    const before = await mapIds();
    // The residence hall a few rings out, so the path to the hall crosses
    // open lawn rather than lying under the buildings.
    const skip = lead === SLEEP_OBJECTIVES[0] ? 17 : 0;
    if (await clickFirst('.build-tile.opening-target') && !(await setDown(skip))) note('no clear ground found near the centre');
    if (lead === SLEEP_OBJECTIVES[0]) dormId = (await mapIds()).find((id) => !before.includes(id)) ?? dormId;
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    return true;
  }
  // The path: the ringed Paths tile, then a drag from the residence hall's
  // middle to Founders Hall's.
  if (!(await visible('.build-mini-tile.opening-target'))) { note('Paths is not rung'); return false; }
  await shoot('paths-ringed');
  await clickFirst('.build-mini-tile.opening-target');
  const ends = await page.evaluate((id) => {
    const all = window.__campusMap?.buildings() ?? [];
    const dorm = all.find((b) => b.id === id);
    const hall = all.find((b) => b.id === 'BLDG-GENSTUDIES');
    return dorm && hall ? { dorm, hall } : null;
  }, dormId);
  if (!ends) { note('no residence hall or Founders Hall on the map'); return false; }
  const steps = 24;
  await page.mouse.move(ends.dorm.x, ends.dorm.y);
  await page.mouse.down();
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(ends.dorm.x + (ends.hall.x - ends.dorm.x) * (i / steps), ends.dorm.y + (ends.hall.y - ends.dorm.y) * (i / steps));
    await page.waitForTimeout(20);
  }
  await page.mouse.up();
  await page.waitForTimeout(200);
  note(`dragged a path from ${ends.dorm.name} to ${ends.hall.name}`);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  // The next chapter's page opens by itself; shut, so the path shows.
  if (await visible('.objectives-popup')) await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  await shoot('path-laid');
  return true;
}

// The title screen comes first (Plan 34): a fresh browser has no run to
// continue, so its primary button is New game.
await page.click('.title-screen .title-primary');
await page.waitForTimeout(400);

// Founding.
await page.fill('input[placeholder="e.g. Halifax"]', 'Newcomb');
await page.click('.startup-begin-btn');
await page.waitForTimeout(800);
note('founded Newcomb College');

let speedSet = false;
let lastClock = '';
let lastMove = Date.now();
while (Date.now() - started < TIMEOUT_S * 1000) {
  const c = await clock();
  if (c && Number(c[1]) >= UNTIL_YEAR) { note(`reached ${c[0]}`); break; }

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
  // A stop is answered in the inbox (Plan 77), in its modal card.
  const modal = page.locator('.modal-inbox, .modal-backdrop .modal, [role="dialog"][aria-modal="true"]');
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

  // The summer waits for you at week 52 (Plan 112C): its call opens it,
  // and its pages are answered as any letter is.
  const summer = page.locator('.summer-call-open');
  if (await summer.count()) {
    const label = (await summer.first().innerText({ timeout: 500 }).catch(() => 'Open the summer')).trim();
    if (!seen.has(`summer:${c?.[1]}:${label}`)) { seen.add(`summer:${c?.[1]}:${label}`); note(`summer: ${label}${c ? ` (${c[0]})` : ''}`); }
    await summer.first().click({ timeout: 1500 }).catch(() => {});
    await page.waitForTimeout(250);
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
      // Picked up the ringed build tile, opened the ringed program slot,
      // picked the ringed program, or pressed the ringed Found.
    }
    if (await visible('.campus-map-svg.placing') && !(await setDown())) note('no clear ground found near the centre');
    if (await visible('.hall-offer-tile')) {
      // A ringed offer (Plan 107A rings all three), else the first; then its
      // professor, appointed from the market beside it when nobody on the
      // payroll can teach it (an old save's founding market).
      if (!(await visible('.hall-offer-tile.selected')) && !(await clickFirst('.hall-offer-tile.opening-target'))) await clickFirst('.hall-offer-tile');
      if (!(await visible('.hall-offer-picker .instructor-options'))) {
        const appoint = page.locator('.hall-offer-picker .course-drawer-appoint');
        if (await appoint.count()) {
          const who = (await page.locator('.hall-offer-picker .course-drawer-candidate').first().innerText().catch(() => '')).split('\n')[0];
          await appoint.first().click({ timeout: 1500 }).catch(() => {});
          note(`appointed ${who || 'a professor'}`);
          await page.waitForTimeout(200);
        }
      }
      await clickFirst('.hall-offer-picker .building-info-jump:not([disabled])');
    }
  } else {
    // A matter that paused the clock on arrival (Plan 78E): open it from its
    // notice, answer it in the inbox's reading pane, and close the inbox.
    const paused = await visible('button[aria-label="Paused"][aria-pressed="true"]');
    if (paused && await clickFirst('.toast .toast-open')) {
      await page.waitForTimeout(250);
      const subject = (await page.locator('.inbox-read h3').first().innerText().catch(() => 'a matter')).trim();
      if (!seen.has(`matter:${subject}`)) { seen.add(`matter:${subject}`); note(`matter: ${subject}`); }
      const answer = page.locator('.inbox-read .event-choice:not([disabled])');
      if (await answer.count()) await answer.last().click({ timeout: 1500 }).catch(() => {});
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);
      lastMove = Date.now();
    }
    // The fastest gear open: 4× waits for a Provost, so year one plays at 2×.
    if (!speedSet || paused) {
      for (const gear of ['4×', '2×', 'Play']) {
        if (await visible(`button[aria-label="${gear}"]:not([disabled])`)) {
          await clickFirst(`button[aria-label="${gear}"]`);
          if (!speedSet) note(`walkthrough done; playing at ${gear}`);
          break;
        }
      }
      speedSet = true;
    }
  }

  if (FOLLOW && !(await visible('.opening-coach')) && await follow()) {
    lastMove = Date.now();
    continue;
  }

  // The chapter line (Plan 106), noted whenever it changes; the drawer that
  // Guided opens by itself on a new chapter is closed, as a skimmer would.
  const chapter = page.locator('.log-ticker-objective');
  if (await chapter.count()) {
    const text = (await chapter.first().innerText({ timeout: 1000 }).catch(() => '')).replace(/\s+/g, ' ').trim();
    if (text && !seen.has(`chapter:${text}`)) { seen.add(`chapter:${text}`); note(`chapter line: ${text}${c ? ` (${c[0]})` : ''}`); }
  }
  if (await visible('.objectives-popup')) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);
  }

  // The NEXT line, noted whenever it changes.
  const next = page.locator('.log-ticker-next-text');
  if (await next.count()) {
    const text = (await next.innerText({ timeout: 1000 }).catch(() => '')).trim();
    if (text && !seen.has(`next:${text}`)) { seen.add(`next:${text}`); note(`next: ${text}`); }
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
process.exit(stalls.length || errors.length || !final || Number(final[1]) < UNTIL_YEAR ? 1 : 0);
