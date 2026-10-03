// Four-way orientation: a placement's facing (state/types.ts), the walls
// each of a building's sides faces (components/facing.ts), the building's
// own frame on the map, and how a facing is placed and loaded.

import { createInitialState } from '../src/state/actions';
import { reducer } from '../src/engine/reducer';
import { firstFreeSpot, footprintOf, isPlaceableKind, orientedFootprint } from '../src/state/campusMap';
import { bindScriptStream } from '../src/engine/random';
import { readSave, SAVE_VERSION } from '../src/state/persistence';
import { SIDES, frontDepth, frontWidth, localBox, localToGrid, seenSides, sideOf, sidesOf, type Side } from '../src/components/facing';
import { DEFAULT_PITCH, VIEWS, setCamera, visibleWalls, type FaceDir } from '../src/components/isoProjection';
import type { Facing, GameState } from '../src/state/types';

bindScriptStream(2424);

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('facing tests');

const FACINGS: Facing[] = [0, 1, 2, 3];
const OUT: Record<FaceDir, [number, number]> = { posRow: [0, 1], negRow: [0, -1], posCol: [1, 0], negCol: [-1, 0] };

// The four sides take the four walls, and sideOf undoes sidesOf.
for (const f of FACINGS) {
  const s = sidesOf(f);
  assert(new Set(SIDES.map((k) => s[k])).size === 4, `facing ${f}: four sides on four walls`);
  for (const k of SIDES) assert(sideOf(f, s[k]) === k, `facing ${f}: sideOf(sidesOf(${k})) is ${k}`);
  // Opposite sides on opposite walls.
  const [fx, fy] = OUT[s.front]; const [bx, by] = OUT[s.back];
  assert(fx === -bx && fy === -by, `facing ${f}: the back faces away from the front`);
  // Left is the building's own left, seen from in front of it: standing out
  // along the front's normal n and looking back at the building (along -n),
  // the left hand points along -n turned a quarter on the grid (x = col,
  // y = row, y down): (x, y) -> (y, -x), so (-fy, fx).
  const [lx, ly] = OUT[s.left];
  assert(lx === -fy && ly === fx, `facing ${f}: left is the left hand of someone facing the front`);
}
assert(sidesOf(0).front === 'posRow' && sidesOf(0).left === 'negCol', 'facing 0: front on +row (the road), left on -col');
assert(sidesOf(undefined).front === 'posRow', 'no facing reads as 0');

// The building's own frame: d = 0 lies along the front wall, u runs left to
// right, and the frame fills the stored footprint.
const p0 = { col: 10, row: 20, w: 5, h: 3 };
for (const f of FACINGS) {
  const p = f % 2 === 0 ? { ...p0, facing: f } : { ...p0, w: p0.h, h: p0.w, facing: f };
  const fw = frontWidth(p); const fd = frontDepth(p);
  assert(fw === 5 && fd === 3, `facing ${f}: the front is the base footprint's width`);
  const box = localBox(p, 0, 0, fw, fd);
  assert(box.col === p.col && box.row === p.row && box.w === p.w && box.h === p.h, `facing ${f}: the whole local frame is the footprint`);
  const s = sidesOf(f);
  const [nx, ny] = OUT[s.front];
  const a = localToGrid(p, 0, 0); const b = localToGrid(p, fw, 0);
  const onFront = (q: { col: number; row: number }) => (nx !== 0 ? q.col === (nx > 0 ? p.col + p.w : p.col) : q.row === (ny > 0 ? p.row + p.h : p.row));
  assert(onFront(a) && onFront(b), `facing ${f}: d = 0 is the front wall`);
  const [lx, ly] = OUT[s.left];
  // From u = 0 to u = fw is away from the left side.
  assert((b.col - a.col) * lx + (b.row - a.row) * ly < 0, `facing ${f}: u runs from the left side to the right`);
}

// The camera: turning the building a quarter is turning the camera a
// quarter the other way, so each facing shows each pair of sides in one
// view of four, and over the four views every side is seen twice.
const seenAt = (k: number, f: Facing) => {
  setCamera({ azimuth: VIEWS[k], pitch: DEFAULT_PITCH });
  return seenSides(f);
};
for (const f of FACINGS) {
  const count: Record<Side, number> = { front: 0, left: 0, back: 0, right: 0 };
  for (let k = 0; k < 4; k++) {
    const s = seenAt(k, f);
    count[s.left] += 1; count[s.right] += 1;
    const t = seenAt(((k + f) % 4 + 4) % 4, 0);
    const u = seenAt(((k - f) % 4 + 4) % 4, 0);
    const same = (x: { left: Side; right: Side }) => x.left === s.left && x.right === s.right;
    assert(same(t) || same(u), `facing ${f}, view ${k}: the same sides as facing 0 a quarter-turn view away`);
  }
  assert(SIDES.every((k) => count[k] === 2), `facing ${f}: every side seen in two views of four`);
}
// At the opening view a building at facing 0 shows its front on the left and
// its right side on the right; turned half round, its back and left.
assert(seenAt(0, 0).left === 'front' && seenAt(0, 0).right === 'right', 'opening view: front and right side');
assert(seenAt(2, 0).left === 'back' && seenAt(2, 0).right === 'left', 'half a turn: back and left side');
setCamera({ azimuth: VIEWS[0], pitch: DEFAULT_PITCH });
assert(visibleWalls().left === 'posRow', 'the opening view sees +row on its left');

const s0 = createInitialState('Facing');
const oblongId = s0.tech.find((t) => isPlaceableKind(t) && t.status === 'available' && footprintOf(t).w !== footprintOf(t).h)!.id;

// Placing: the facing is stored, an odd one turns the footprint, and a
// square footprint turns as well.
function placed(id: string, facing: Facing): GameState {
  let s = createInitialState('Facing');
  s.pendingInterrupt = null;
  s.finance.cash = 1e9;
  const t = s.tech.find((x) => x.id === id)!;
  const fp = orientedFootprint(t, facing);
  const spot = firstFreeSpot(s, t, fp)!;
  s = reducer(s, { type: 'PLACE_BUILDABLE', buildableId: id, row: spot.row, col: spot.col, facing });
  return s;
}
{
  const oblong = s0.tech.find((t) => isPlaceableKind(t) && t.status === 'available' && footprintOf(t).w !== footprintOf(t).h)!;
  const square = s0.tech.find((t) => isPlaceableKind(t) && t.status === 'available' && footprintOf(t).w === footprintOf(t).h);
  const base = footprintOf(oblong);
  for (const f of FACINGS) {
    const p = placed(oblong.id, f).placements[oblong.id];
    assert(!!p && p.facing === f, `${oblong.id}: placed at facing ${f}`);
    if (p) assert(f % 2 === 0 ? p.w === base.w && p.h === base.h : p.w === base.h && p.h === base.w, `${oblong.id}: facing ${f} turns the footprint`);
  }
  assert(!!square, 'a square footprint is open at founding');
  if (square) {
    const sq = placed(square.id, 2).placements[square.id];
    assert(!!sq && sq.facing === 2, `${square.id} (square): placed facing 2`);
  }
}

// Loading: a save from before facings reads the facing off the footprint,
// and one that does not fit the footprint is put right.
{
  const s = placed(oblongId, 0);
  const t = s.tech.find((x) => x.id === oblongId)!;
  const base = footprintOf(t);
  {
    const load = (p: object) => {
      const st = JSON.parse(JSON.stringify(s)) as GameState;
      st.placements[oblongId] = { ...st.placements[oblongId], ...p } as GameState['placements'][string];
      const out = readSave(JSON.stringify({ version: SAVE_VERSION, savedAt: 0, state: st }));
      return 'state' in out ? out.state.placements[oblongId] : undefined;
    };
    const turned = { w: base.h, h: base.w };
    assert(load({ facing: undefined })?.facing === 0, 'an old save, base footprint: facing 0');
    assert(load({ ...turned, facing: undefined })?.facing === 1, 'an old save, turned footprint: facing 1');
    assert(load({ facing: 2 })?.facing === 2, 'a facing that fits is kept');
    assert(load({ ...turned, facing: 3 })?.facing === 3, 'an odd facing on a turned footprint is kept');
    assert(load({ facing: 1 })?.facing === 0, 'an odd facing on the base footprint is put right');
    assert(load({ facing: 7 })?.facing === 0, 'a facing out of range is put right');
  }
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
