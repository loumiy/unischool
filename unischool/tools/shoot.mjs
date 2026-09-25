// ---------------------------------------------------------------------
// PHOTOGRAPH THE CAMPUS. Loads a save written by tools/makeSave.ts into a
// headless Chromium, drives the map's own zoom and pan controls, and writes
// a PNG.
//
// Needs the dev server up (`npm run dev`) and a Chromium on disk. It does
// NOT download one: `playwright-core` is the browserless package precisely
// so installing this repo does not pull 300MB nobody asked for. Point
// CHROME_PATH at any Chromium/Chrome build, or set PLAYWRIGHT_BROWSERS_PATH
// and let the default below find one.
//
//   npm run shot:save -- /tmp/gothic.json 22 gothic
//   npm run shot -- /tmp/gothic.json /tmp/gothic.png --zoom=-2 --pan=-430,320
//
// Flags: --zoom=N (+ in, - out), --pan=DX,DY (screen px, drag), --clip=x,y,w,h,
//        --size=W,H (viewport, default 1600,1000), --scale=N (device pixels per
//        CSS pixel: 2 for a print-sharp PNG at the same framing)
//
// Not only the map: --tab=<id> opens one of the full-screen views over it
// (a TabNav id: curriculum, faculty, research, students, athletics,
// history, treasury) through the toolbar's own button, so what
// is photographed is the tab as the player reaches it. --click=<text>
// presses a button by its text and can repeat, which is how a modal held
// in the save is stepped through (the summer's Continue, Continue, and
// there is the admissions beat); --element=<selector> crops the PNG to one
// element, the way the README's admissions card was taken:
//
//   npm run shot -- summer.json admissions.png --click="Continue →" \
//     --click="Continue →" --element=.modal
//   npm run shot -- out.json faculty.png --tab=faculty --scale=2
//   npm run shot -- out.json curriculum.png --tab=curriculum \
//     --press=".collapse-toggle" --press=".collapse-toggle >> nth=1"   # a school and a program opened
// ---------------------------------------------------------------------
import { readFileSync, existsSync } from 'node:fs';
import { chromium } from 'playwright-core';

const [savePath, outPath, ...flags] = process.argv.slice(2);
if (!savePath || !outPath) {
  console.error('usage: shoot <save.json> <out.png> [--zoom=N] [--pan=DX,DY] [--clip=x,y,w,h] [--size=W,H] [--scale=N]');
  process.exit(2);
}
const flag = (name, fallback) => {
  const hit = flags.find((f) => f.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};
const flagAll = (name) => flags.filter((f) => f.startsWith(`--${name}=`)).map((f) => f.slice(name.length + 3));
const nums = (s) => (s ? s.split(',').map(Number) : null);

const URL = process.env.CAMPUS_URL ?? 'http://localhost:5173/';

// The toolbar's aria-labels, by tab id (TabNav.tsx's TAB_LABELS, repeated
// here rather than imported: this file is plain Node and TabNav is
// TypeScript that pulls in the research data behind its gates).
const TAB_LABELS = {
  curriculum: 'Curriculum',
  faculty: 'Faculty',
  research: 'Research',
  students: 'Students',
  athletics: 'Athletics',
  history: 'History',
};
const CANDIDATES = [
  process.env.CHROME_PATH,
  `${process.env.PLAYWRIGHT_BROWSERS_PATH ?? ''}/chromium-1194/chrome-linux/chrome`,
  '/usr/bin/chromium',
  '/usr/bin/google-chrome',
].filter(Boolean);
const executablePath = CANDIDATES.find((p) => existsSync(p));
if (!executablePath) {
  console.error(`no Chromium found. Tried:\n  ${CANDIDATES.join('\n  ')}\nSet CHROME_PATH.`);
  process.exit(2);
}

const save = readFileSync(savePath, 'utf8');
const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });
const size = nums(flag('size', null)) ?? [1600, 1000];
const page = await browser.newPage({
  viewport: { width: size[0], height: size[1] },
  deviceScaleFactor: Number(flag('scale', 1)),
});

// Two loads on purpose: the first is only there to give localStorage an
// origin to write the save into, the second is the one that reads it.
await page.goto(URL, { waitUntil: 'domcontentloaded' });
await page.evaluate((s) => localStorage.setItem('unischool.save', s), save);
await page.goto(URL, { waitUntil: 'networkidle' });
// A loaded save opens on the title screen: continue into it.
const cont = page.locator('.title-primary');
if (await cont.count()) { await cont.first().click(); }
await page.waitForSelector('svg', { timeout: 20_000 });
await page.waitForTimeout(2_500);

const zoom = Number(flag('zoom', 0));
for (let i = 0; i < Math.abs(zoom); i++) {
  await page.click(zoom > 0 ? 'button:has-text("+")' : 'button:has-text("−")');
  await page.waitForTimeout(200);
}

const pan = nums(flag('pan', null));
if (pan) {
  await page.mouse.move(size[0] / 2, size[1] / 2);
  await page.mouse.down();
  await page.mouse.move(size[0] / 2 + pan[0], size[1] / 2 + pan[1], { steps: 20 });
  await page.mouse.up();
  await page.waitForTimeout(600);
  // A short drag reads as a click on whatever it ended over: close any panel it opened.
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
}

// Trees settle and the map finishes its entry animation; a shot taken too
// early catches a half-drawn campus.
await page.waitForTimeout(2_000);

// A modal held in the save, stepped through by its own buttons. Each click
// waits for the modal to re-render before the next: the summer's beats
// swap the whole card.
for (const text of flagAll('click')) {
  await page.getByRole('button', { name: text, exact: true }).first().click();
  await page.waitForTimeout(600);
}

// A tab, opened the way the player opens it. Treasury has no icon in the
// toolbar's row (see Toolbar.tsx's ICON_TAB_ORDER): its entry point is the
// funds figure at the left, and that is what gets clicked for it.
const tab = flag('tab', null);
if (tab) {
  const label = TAB_LABELS[tab];
  if (tab !== 'treasury' && !label) {
    console.error(`no tab "${tab}". Known: ${Object.keys(TAB_LABELS).join(', ')}, treasury`);
    process.exit(2);
  }
  if (tab === 'treasury') await page.locator('.toolbar-funds-btn').first().click();
  else await page.getByRole('button', { name: label, exact: true }).click();
  await page.waitForSelector('.tab-overlay', { timeout: 10_000 });
  // The tab's own entry animations, and any chart that draws on mount.
  await page.waitForTimeout(1_200);
}

// Elements pressed by selector once the tab is open, in order (a Playwright
// selector, `>> nth=N` included): how a collapsed school is opened for a
// picture of its catalogue.
for (const selector of flagAll('press')) {
  await page.locator(selector).first().click();
  await page.waitForTimeout(400);
}

// Park the pointer: a click leaves it over whatever it pressed, and the
// hover tooltip on that (an audience card's, a button's) would be in shot.
await page.mouse.move(0, 0);
await page.waitForTimeout(300);

const clip = nums(flag('clip', null));
const element = flag('element', null);
if (element) {
  await page.locator(element).first().screenshot({ path: outPath });
} else {
  await page.screenshot({
    path: outPath,
    ...(clip ? { clip: { x: clip[0], y: clip[1], width: clip[2], height: clip[3] } } : {}),
  });
}
await browser.close();
console.log(`wrote ${outPath}`);
