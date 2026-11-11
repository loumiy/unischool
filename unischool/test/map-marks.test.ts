// The map's marks hold a size on screen (Plan 126 J; markScale.ts): the
// counter-scale that keeps a hall's pips, a lab's disc, a full residence's
// disc and a building's label inside a band of screen sizes at every zoom,
// and the zoom below which a hall's row gives way to one mark.

import { DISC_ZOOM, HALL_ROW_FIT, LABEL_ZOOM, PIP_ZOOM, createZoomStore, hallRowFits, heldScale } from '../src/components/markScale';
import { TILE_W } from '../src/components/isoProjection';

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}
const near = (a: number, b: number) => Math.abs(a - b) < 1e-9;

// The map's zoom runs from 0.22 to 2.5 (CampusMap.tsx's MIN_ZOOM, MAX_ZOOM);
// the buttons step by 1.25.
const ZOOMS: number[] = [];
for (let z = 0.22; z <= 2.5; z *= 1.25) ZOOMS.push(z);
ZOOMS.push(2.5);

// ---- the counter-scale ----
{
  assert(near(heldScale(1, [0.5, 2]), 1), 'inside the band a mark moves with the map');
  assert(near(heldScale(0.25, [0.5, 2]), 2), 'below it, it stops shrinking');
  assert(near(heldScale(4, [0.5, 2]), 0.5), 'above it, it stops growing');
  assert(heldScale(0, PIP_ZOOM) === 1 && heldScale(Number.NaN, PIP_ZOOM) === 1, 'a zoom the map never has leaves a mark alone');
}

// ---- on screen, at every zoom step ----
{
  // A mark's size on screen: its size in map units, times the zoom, times
  // its held scale.
  const screen = (units: number, z: number, band: readonly [number, number]) => units * z * heldScale(z, band);
  for (const z of ZOOMS) {
    const pip = screen(13, z, PIP_ZOOM);
    assert(pip >= 9.5 && pip <= 17, `a pip is 9.5 to 17 px at zoom ${z.toFixed(3)} (${pip.toFixed(1)})`);
    const lab = screen(33, z, DISC_ZOOM);
    assert(lab >= 14 && lab <= 28.1, `a lab's disc is 14 to 28 px at zoom ${z.toFixed(3)} (${lab.toFixed(1)})`);
    const full = screen(31, z, DISC_ZOOM);
    assert(full >= 14 && full <= 28, `a full residence's disc is 14 to 28 px at zoom ${z.toFixed(3)} (${full.toFixed(1)})`);
    // The smallest and largest label faces (CampusMap.tsx's LABEL_*_FONT_SIZE).
    const small = screen(19, z, LABEL_ZOOM);
    const big = screen(34, z, LABEL_ZOOM);
    assert(small >= 10 && big <= 26, `a label's face is 10 to 26 px at zoom ${z.toFixed(3)} (${small.toFixed(1)} to ${big.toFixed(1)})`);
  }
}

// ---- one mark for a hall where the row would not fit ----
{
  // A hall is 7x5: its roof is five tiles across. Six pips and a plate.
  const row = 5 * 17 + 13 + 8;
  const roof = 5 * TILE_W;
  assert(HALL_ROW_FIT > 0 && HALL_ROW_FIT <= 1, 'the row may take at most its roof');
  assert(hallRowFits(row, roof, 0.4), 'at the opening view of a built-out campus the row is drawn');
  assert(!hallRowFits(row, roof, 0.256), 'at the widest zoom a laptop reaches the hall is one mark');
  let last = false;
  let flips = 0;
  for (const z of ZOOMS) {
    const fits = hallRowFits(row, roof, z);
    if (fits !== last) flips += 1;
    last = fits;
  }
  assert(flips === 1, 'zooming in, a hall changes over from one mark to its row once, and stays');
  assert(!hallRowFits(row + 17, roof, 0.36) && hallRowFits(row, roof, 0.36), 'a row with the offer\'s flag gives way a little sooner');
}

// ---- the zoom store ----
{
  const store = createZoomStore(1);
  let heard = 0;
  const off = store.subscribe(() => { heard += 1; });
  store.set(1);
  assert(heard === 0, 'the same zoom tells no one');
  store.set(0.5);
  assert(heard === 1 && store.get() === 0.5, 'a new zoom tells its readers');
  off();
  store.set(0.25);
  assert(heard === 1, 'and not one that has left');
}

console.log(`${checks} checks, ${failures} failures`);
if (failures > 0) process.exit(1);
