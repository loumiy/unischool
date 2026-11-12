// ---------------------------------------------------------------------
// GIF 2, DEVELOPING COURSES. Week 6 of a new college: English, Economics,
// Mathematics and Physics founded in Founders Hall, each with its entry
// course taught. The Curriculum tab, each program's next course started
// with its row's Develop button until the committee is writing four, then
// the weeks at 2x until the four are taught.
//
//   npm run dev                                                  # one shell
//   npm run scenario -- --player Guided --year 1 --week 5 --clear-modal \
//     --name Halifax --colors navy-gold node_modules/.tmp/gif/early.json
//   node tools/itchGifs/courses.mjs node_modules/.tmp/gif/early.json ../docs/store/itch/gifs/2-courses.gif
//
// Staged: a new college has about one course's worth of cash in week 6
// ($1.4M, each of these $910k), so the save is given $4.2M (--cash) for
// the four to start at once. Nothing else is changed. The week the save
// stops in is played first, off camera, so the last two entry courses are
// taught (the harness's player would start two more foundings that week;
// in the browser nobody does).
// ---------------------------------------------------------------------
import { readFileSync } from 'node:fs';
import { args, encodeGif, openRig } from './rig.mjs';

const { positional, flag } = args();
const [savePath, outPath] = positional;
if (!savePath || !outPath) {
  console.error('usage: courses.mjs <week-5 save.json> <out.gif> [--cash=4200000] [--width=960]');
  process.exit(2);
}
const fps = Number(flag('fps', 12));
const save = JSON.parse(readFileSync(savePath, 'utf8'));
save.state.finance.cash = Number(flag('cash', 4_200_000));

const rig = await openRig({
  save, out: outPath, size: [1280, 1200], fps,
  // The objectives drawer opens over the rows when the first start
  // finishes Chapter 2; it is the ticker's, hidden with it.
  hide: ['.log-ticker', '.toast', '.objectives-popup'],
});
const { page } = rig;
await page.addStyleTag({ content: ':root { --log-ticker-height: 0px !important; }' });
await rig.settle();

// The save's week, played out off camera.
await rig.speed('real');
await page.waitForTimeout(500);
await rig.stopClock();
await rig.run(5_500);
await rig.clearStops();
await rig.pause();
await page.getByRole('button', { name: 'Curriculum', exact: true }).first().click();
await page.waitForTimeout(800);
await rig.run(1_500);

// 1. The tab, four rows waiting.
await rig.pointerTo(900, 230);
await rig.hold(0.6);

// 2. Each row's Develop, top to bottom.
const PROGRAMS = (flag('programs', 'ECON,ENGL,MATH,PHYS')).split(',');
for (const [i, name] of PROGRAMS.entries()) {
  const row = page.locator(`.program-row[data-program="${name}"]`);
  const button = row.locator('button', { hasText: /^Develop / }).first();
  if (!(await button.count())) { console.warn(`no Develop button for ${name}`); continue; }
  await rig.clickOn(button, i === 0 ? 0.6 : 0.5);
  await rig.hold(0.35);
}
await rig.glide(1000, 200, 0.4);
await rig.hold(0.6);

// 3. The weeks at 2x (4x opens with a Provost), a week every two frames,
// until all four are taught.
await rig.speed('double');
rig.setStep(1250);
for (let i = 0; i < 40; i++) await rig.shot({ clearStops: true });
await rig.pause();
rig.setStep(1000 / fps);
await rig.pointerTo(-40, -40, { mouse: false });
await rig.hold(1.5);

const dir = await rig.close();
encodeGif(dir, outPath, { fps, width: Number(flag('width', 960)), holdLast: 0.5 });
