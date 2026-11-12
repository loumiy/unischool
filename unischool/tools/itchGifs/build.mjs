// ---------------------------------------------------------------------
// GIF 1, BUILD MODE. On a laid-out campus in year 15, with the walkers
// out: Walnut Hall picked from the build menu and set on an empty lot, its
// 36 weeks played at 4x a week a frame, then a brick walk drawn round it
// with Shift held (a tile of lawn left between), and that tile filled with
// flower beds.
//
//   npm run dev                                                  # one shell
//   npm run scenario -- --player Completionist --year 15 --week 10 --clear-modal \
//     --name Halifax --colors navy-gold node_modules/.tmp/gif/mid.json
//   npm run layout -- node_modules/.tmp/gif/mid.json node_modules/.tmp/gif/mid-laid.json
//   node tools/itchGifs/build.mjs node_modules/.tmp/gif/mid-laid.json ../docs/store/itch/gifs/1-build.gif
//
// The lot (rows 81-89, cols 50-60) is the free ground between Cascade House,
// the library and the chapel in that seeded run's layout; --lot=ROW,COL
// moves it (its top-left corner: the walk's ring, 11 by 9).
// ---------------------------------------------------------------------
import { readFileSync } from 'node:fs';
import { args, encodeGif, openRig } from './rig.mjs';

const { positional, flag, has } = args();
const [savePath, outPath] = positional;
if (!savePath || !outPath) {
  console.error('usage: build.mjs <laid-out save.json> <out.gif> [--lot=ROW,COL] [--width=960]');
  process.exit(2);
}
const [R, C] = flag('lot', '81,50').split(',').map(Number);
const fps = Number(flag('fps', 12));

// The lot cleared of its woodland, as a site is.
const save = JSON.parse(readFileSync(savePath, 'utf8'));
// The chapel stands just in front of the default lot, where its tower
// would cover the walk's near corner: it goes to the next block south,
// facing the walk below it (placement is drawing only; campus-map.md).
// --keep-chapel leaves it.
const chapel = save.state.placements['AMENITY-CHAPEL'];
if (chapel && !has('keep-chapel') && flag('lot', null) === null) {
  save.state.placements['AMENITY-CHAPEL'] = { ...chapel, row: 94, col: 57 };
  for (const key of ['91,63', '89,66']) delete save.state.pathways[key];
  for (let r = 97; r <= 102; r++) save.state.pathways[`${r},59`] = true;
  for (const key of Object.keys(save.state.trees ?? {})) {
    const [r, c] = key.split(',').map(Number);
    if ((r >= 93 && r <= 97 && c >= 56 && c <= 62) || (c === 59 && r >= 97 && r <= 102)) delete save.state.trees[key];
  }
}
for (const key of Object.keys(save.state.trees ?? {})) {
  const [r, c] = key.split(',').map(Number);
  if (r >= R - 1 && r <= R + 9 && c >= C - 1 && c <= C + 11) delete save.state.trees[key];
}

const rig = await openRig({
  save, out: outPath, size: [1280, 800], fps,
  hide: ['.log-ticker', '.pennant', '.main-menu', '.toast'],
});
const { page } = rig;
await page.addStyleTag({ content: ':root { --log-ticker-height: 0px !important; }' });
await rig.zoom(3);
const mid = [C + 5.5, R + 4.5];
await rig.centreOn(mid[0], mid[1], 640, 285);
await rig.settle();

await rig.speed('real');
await page.waitForTimeout(1_000);
await rig.stopClock();
await rig.run(8_000);

// A tile's middle on the page.
const at = async (col, row) => rig.tile(col + 0.5, row + 0.5);

// 1. The lot, the walkers about it.
await rig.pointerTo(900, 520);
await rig.hold(0.5);

// 2. Walnut Hall from the build menu, set on the lot.
await rig.clickOn('.toolbar-build-btn', 0.5);
await rig.hold(0.15);
await rig.clickOn(page.locator('.build-cat-tab').nth(1), 0.4);
await rig.hold(0.15);
const hallTile = page.getByRole('button', { name: /Walnut Hall/ });
const hallWeeks = Number((await hallTile.first().textContent()).match(/(\d+)w/)?.[1] ?? 36);
await rig.clickOn(hallTile, 0.4);
const site = await at(C + 2, R + 2);
await rig.glide(site.x, site.y, 0.6);
await rig.hold(0.2);
await rig.clickAt(site.x, site.y, 0.1);
await rig.hold(0.3);
await page.keyboard.press('Escape');
await rig.glide(1000, 560, 0.3);

// 3. Its weeks at 4x, one a frame.
// Played until the calendar has passed the weeks the menu quoted (the
// clock can lose a frame to a pause along the way).
const week = async () => Number(await page.locator('.toolbar-calendar-week').first().textContent());
const done = (await week()) + hallWeeks;
await rig.speed('quad');
rig.setStep(1250);
for (let i = 0; i < hallWeeks * 2 && (await week()) < done; i++) await rig.shot({ clearStops: true });
// Back to real time for the drawing (a paused clock stills the walkers).
// The run must end before week 51, when this save's next letter that
// holds the clock arrives (a chapter asking for a house).
console.log(`\nbuilt by week ${await week()}`);
await rig.speed('real');
rig.setStep(1000 / fps);
await rig.hold(0.4, { clearStops: true });

// 4. A brick walk round it, a tile of lawn between, with Shift.
await rig.clickOn('.toolbar-build-btn', 0.45);
await rig.hold(0.1);
await rig.clickOn(page.locator('.build-mini-tile', { hasText: 'Paths' }), 0.4);
await rig.clickOn(page.locator('.build-holding .segmented button', { hasText: 'Brick' }), 0.4);
// A ring of tiles, four straight Shift-drags corner to corner; the last
// side stops a tile short of where the ring began, which the first laid.
const ring = async (r0, c0, r1, c1, seconds) => {
  const corners = [[c0, r0], [c1, r0], [c1, r1], [c0, r1], [c0, r0 + 1]];
  const first = await at(...corners[0]);
  await rig.glide(first.x, first.y, 0.4);
  for (const corner of corners.slice(1)) {
    const p = await at(...corner);
    await rig.dragTo(p.x, p.y, seconds, { keys: ['Shift'] });
  }
};
await ring(R, C, R + 8, C + 10, 0.45);
await rig.hold(0.2);

// 5. The lawn between filled with flower beds.
await rig.clickOn(page.locator('.build-holding .menu-btn'), 0.45);
await rig.clickOn(page.locator('.build-mini-tile', { hasText: 'Flower bed' }), 0.4);
await ring(R + 1, C + 1, R + 7, C + 9, 0.4);
await page.keyboard.press('Escape');
await page.keyboard.press('Escape');
await rig.glide(1180, 700, 0.5);
await rig.pointerTo(-40, -40, { mouse: false });
await rig.hold(1.2);
console.log(`\nended in week ${await week()}`);

const dir = await rig.close();
encodeGif(dir, outPath, { fps, width: Number(flag('width', 960)), holdLast: 0.6 });
