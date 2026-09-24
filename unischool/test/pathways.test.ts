// Drawn paths (src/components/pathways.tsx's buildPathGeometry, and the
// reducer's path actions): a diagonal run is bridged into one band, a turn
// is rounded on its outside, and none of it changes the tiles underneath.

import { buildPathGeometry } from '../src/components/pathways';
import { createInitialState } from '../src/state/actions';
import { reducer } from '../src/engine/reducer';
import { ROAD_FIRST_ROW } from '../src/state/campusMap';
import { bindScriptStream } from '../src/engine/random';
import type { Pathways } from '../src/state/types';

bindScriptStream(2427);
const store = new Map<string, string>();
(globalThis as unknown as { localStorage: unknown }).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => { store.set(k, v); },
  removeItem: (k: string) => { store.delete(k); },
};

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('pathway tests');

const paths = (...tiles: [number, number][]): Pathways => Object.fromEntries(tiles.map(([r, c]) => [`${r},${c}`, true]));
// Subpaths, and points per subpath, in a path string.
const shapes = (d: string) => d.split('M').filter(Boolean).map((part) => part.split('L').length);

// ---- A lone tile has four rounded corners ----
{
  const g = buildPathGeometry(paths([10, 10]));
  const s = shapes(g.fill);
  assert(s.length === 1 && s[0] === 20, `one shape, each corner an arc of five points (${s.join(',')})`);
  assert(g.joints === '', 'and no joints');
}

// ---- A straight run: square where the tiles meet, one joint each ----
{
  const g = buildPathGeometry(paths([10, 10], [10, 11], [10, 12]));
  assert(shapes(g.joints).length === 2, 'two joints between three tiles');
  assert(shapes(g.fill).length === 3, 'no bridges on a straight run');
}

// ---- A diagonal run is bridged into one band, with straight edges ----
{
  const g = buildPathGeometry(paths([10, 10], [11, 11], [12, 12]));
  const s = shapes(g.fill);
  assert(s.length === 3 + 4, `three tiles and two triangles per corner they share (${s.length})`);
  assert(s.filter((n) => n === 3).length === 4, 'the bridges are triangles');
  // The middle tile's corners all lie on the run's edges or its joins, so
  // none is rounded: it stays a square.
  assert(s.filter((n) => n !== 3).includes(4), 'the middle tile stays square');
  const sw = buildPathGeometry(paths([10, 10], [11, 9]));
  assert(shapes(sw.fill).filter((n) => n === 3).length === 2, 'a run the other way is bridged too');
  const closed = buildPathGeometry(paths([10, 10], [11, 11], [10, 11]));
  assert(shapes(closed.fill).every((n) => n !== 3), 'no bridge where an orthogonal tile already joins the pair');
}

// ---- A straight run laid in one step, and moved ----
{
  let s = createInitialState('Paths');
  s.pendingInterrupt = null;
  s = reducer(s, { type: 'PAINT_PATH_TILES', add: [{ row: 5, col: 5 }, { row: 6, col: 6 }, { row: ROAD_FIRST_ROW, col: 7 }], remove: [] });
  assert('5,5' in s.pathways && '6,6' in s.pathways, 'a run is laid in one action');
  assert(!(`${ROAD_FIRST_ROW},7` in s.pathways), 'but not on the road');
  s = reducer(s, { type: 'PAINT_PATH_TILES', add: [{ row: 6, col: 5 }], remove: [{ row: 6, col: 6 }] });
  assert('6,5' in s.pathways && !('6,6' in s.pathways), 'and moved: what left the line is lifted');
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
