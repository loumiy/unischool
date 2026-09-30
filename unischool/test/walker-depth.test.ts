// Walkers in the depth order (Plan 83D, walkerDepth.ts; replaces Plan 42's
// clips): a walker is drawn just before the first thing nearer the camera
// whose drawing reaches it, so a building or a tree in front covers it by
// being drawn after it, and nothing behind it ever does.

import { nearerThanWalker, walkerSlot } from '../src/components/walkerDepth';
import { DEFAULT_CAMERA, VIEWS, cameraAxes, setCamera } from '../src/components/isoProjection';

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('walker depth tests');

setCamera(DEFAULT_CAMERA);

// ---- A hall covers a walker behind it, not one in front ----
{
  const ax = cameraAxes();
  // At the opening view a building at a higher column than the walker is
  // the nearer of the two (depthSort.ts).
  const hall = { col: 20, row: 20, w: 6, h: 6 };
  assert(nearerThanWalker(hall, 19.5, 23, ax), 'a hall is nearer than a walker just behind it');
  assert(!nearerThanWalker(hall, 26.5, 23, ax), 'and not than one just in front of it');
  assert(!nearerThanWalker(hall, 22, 23, ax), 'a walker on its footprint (a door step) is in front of it');
  const boxes = [{ col: 0, row: 0, w: 1, h: 1 }, hall, { col: 40, row: 40, w: 1, h: 1 }];
  assert(walkerSlot(boxes, [1], 19.5, 23, ax) === 1, 'the walker behind is drawn before the hall');
  assert(walkerSlot(boxes, [1], 26.5, 23, ax) === boxes.length, 'the walker in front after everything that reaches it');
  assert(walkerSlot(boxes, [], 19.5, 23, ax) === boxes.length, 'with nothing over it, anywhere');
}

// ---- The first nearer thing wins, whatever comes before it ----
{
  const ax = cameraAxes();
  const behind = { col: 10, row: 10, w: 2, h: 2 };   // further from the camera than the walker
  const front = { col: 16, row: 14, w: 3, h: 3 };    // nearer
  assert(!nearerThanWalker(behind, 14, 14, ax) && nearerThanWalker(front, 14.5, 13.5, ax), 'one behind, one in front');
  assert(walkerSlot([behind, front], [0, 1], 14.5, 13.5, ax) === 1, 'drawn after the one behind and before the one in front');
}

// ---- Trees cover walkers too ----
{
  const ax = cameraAxes();
  const tree = { col: 40, row: 40, w: 1, h: 1 };
  assert(nearerThanWalker(tree, 39.6, 39.6, ax), 'a tree is nearer than a walker a step behind it');
  assert(!nearerThanWalker(tree, 41.4, 41.4, ax), 'not than one a step in front');
}

// ---- In every view, a nearer thing is nearer by depthSort's own rule ----
{
  for (const azimuth of VIEWS) {
    setCamera({ ...DEFAULT_CAMERA, azimuth });
    const ax = cameraAxes();
    const b = { col: 10, row: 10, w: 4, h: 4 };
    let near = 0; let far = 0;
    for (let c = 6; c < 18; c += 0.5) {
      for (let r = 6; r < 18; r += 0.5) {
        if (c >= 10 && c <= 14 && r >= 10 && r <= 14) continue;
        const nearer = nearerThanWalker(b, c, r, ax);
        const expected = (b.col >= c && ax.sinA > 0) || (c >= b.col + b.w && ax.sinA < 0)
          || (!(b.col >= c) && !(c >= b.col + b.w) && ((b.row >= r && ax.cosA > 0) || (r >= b.row + b.h && ax.cosA < 0)));
        if (nearer !== expected) assert(false, `view ${azimuth.toFixed(2)}: (${c}, ${r})`);
        if (nearer) near++; else far++;
      }
    }
    assert(near > 0 && far > 0, `view ${azimuth.toFixed(2)}: walkers both behind and in front (${near} / ${far})`);
  }
  setCamera(DEFAULT_CAMERA);
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
