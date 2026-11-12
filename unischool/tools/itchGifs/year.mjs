// ---------------------------------------------------------------------
// GIF 4, A YEAR OF A GROWN CAMPUS. Year 41 of the Completionist's run,
// laid out, the interface hidden: the weeks played at 8x, two frames a
// week, from the first week of the fall to the last before the summer.
// The leaves turn and fall, the snow comes and goes, the beds flower, and
// the venues along the north edge fill on their game weeks and empty
// again. A caption in the corner keeps the term and the week.
//
//   npm run dev                                                  # one shell
//   npm run scenario -- --player Completionist --year 41 --week 1 --clear-modal \
//     --name Halifax --colors navy-gold node_modules/.tmp/gif/late.json
//   npm run layout -- node_modules/.tmp/gif/late.json node_modules/.tmp/gif/late-laid.json
//   node tools/itchGifs/year.mjs node_modules/.tmp/gif/late-laid.json ../docs/store/itch/gifs/4-year.gif
//
// --pan=DX,DY frames it (screen px from the parcel view, a drag),
// --zoom=N as shot.mjs, --per-week=N frames a week.
// ---------------------------------------------------------------------
import { args, encodeGif, openRig, WEEK_MS } from './rig.mjs';

const { positional, flag } = args();
const [savePath, outPath] = positional;
if (!savePath || !outPath) {
  console.error('usage: year.mjs <laid-out save.json> <out.gif> [--pan=DX,DY] [--zoom=N] [--per-week=2] [--width=960]');
  process.exit(2);
}
const fps = Number(flag('fps', 12));
const perWeek = Number(flag('per-week', 2));
const [W, H] = [1280, 800];

const rig = await openRig({
  save: savePath, out: outPath, size: [W, H], fps,
  // Everything that is the game's interface rather than the campus
  // (clip.mjs's list).
  hide: ['.pennant', '.main-menu', '.map-tools-toggle', '.campus-map-zoom-controls', '.log-ticker', '.toolbar',
    '.toast', '.tooltip', '[role="tooltip"]', '.path-tool-hint', '.build-popup', '.modal-backdrop', '.modal-inbox',
    '.campus-map-layers', '.map-layers-toggle'],
});
const { page } = rig;
await page.addStyleTag({ content: `
  :root { --toolbar-height: 0px !important; --log-ticker-height: 0px !important; }
  #gif-caption { position: fixed; left: 18px; bottom: 16px; z-index: 2147483646; pointer-events: none;
    font: 700 17px/1 'Archivo', 'Bricolage Grotesque', system-ui, sans-serif; letter-spacing: .04em; text-transform: uppercase;
    color: #1b2a4a; background: rgba(251, 247, 236, .94); border: 2px solid #1b2a4a; border-radius: 8px; padding: 9px 12px 8px;
    box-shadow: 0 2px 0 #1b2a4a; }
  #gif-caption b { color: #7b1e2b; margin-right: .5em; }
` });
await page.evaluate(() => {
  const d = document.createElement('div');
  d.id = 'gif-caption';
  document.body.appendChild(d);
});

await rig.zoom(Number(flag('zoom', 0)));
const [dx, dy] = flag('pan', '60,175').split(',').map(Number);
if (dx || dy) {
  const x0 = W / 2 - dx / 2, y0 = H / 2 - dy / 2;
  await page.mouse.move(x0, y0);
  await page.mouse.down({ button: 'middle' });
  await page.mouse.move(x0 + dx, y0 + dy, { steps: 16 });
  await page.mouse.up({ button: 'middle' });
  await page.waitForTimeout(400);
}
await rig.settle();

// The caption from the calendar (StatusHeader.tsx's toolbar-calendar,
// hidden with the toolbar but still in the page).
async function caption() {
  await page.evaluate(() => {
    const label = document.querySelector('.toolbar-calendar')?.getAttribute('aria-label') ?? '';
    const [, term, week] = label.match(/·\s*(\w+) term\s*·\s*Week (\d+)/) ?? [];
    document.getElementById('gif-caption').innerHTML = term ? `<b>${term}</b>Week ${week}` : '';
  });
}
const week = () => page.evaluate(() => Number(document.querySelector('.toolbar-calendar-week')?.textContent ?? 0));

// The walkers walked out at real speed first (eight seconds is under two
// weeks), then the fastest gear the save has open.
await rig.speed('real');
await page.waitForTimeout(500);
await rig.stopClock();
await rig.run(8_000);
let gear = null;
for (const g of ['octo', 'quad', 'double']) {
  try { await rig.speed(g); gear = g; break; } catch { /* locked */ }
}
console.log(`at ${gear}`);
rig.setStep(WEEK_MS[gear] / perWeek);

await caption();
await rig.hold(0.4, { clearStops: true, before: caption });
// To the last week before the summer (week 52 holds the clock for it).
const last = Number(flag('to-week', 51));
for (let i = 0; i < 60 * perWeek && (await week()) < last; i++) {
  await rig.shot({ clearStops: true, before: caption });
}
await rig.pause();
rig.setStep(1000 / fps);
await caption();
await rig.hold(0.8);

const dir = await rig.close();
encodeGif(dir, outPath, { fps, width: Number(flag('width', 960)), holdLast: 0.4 });
