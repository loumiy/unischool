// The grounds a player draws (the build menu's Grounds tab): paths in three
// surfaces (src/state/paving.ts), laid tile by tile or in a straight run
// that puts back what it crossed, and drawn each in its own coursing
// (src/components/pathways.tsx); and a sandbox's hand on a standing
// building (src/state/sandboxMoves.ts): moved, and drawn in another
// architecture. None of it is open to a normal run's buildings.

import { reducer } from '../src/engine/reducer';
import { createPreStartState } from '../src/state/actions';
import { FOUNDING_VERNACULAR } from '../src/data/foundingData';
import { FOUNDING_COLORS, schoolColorsOf } from '../src/data/schoolColors';
import { FOUNDERS_HALL_ID } from '../src/data/techData';
import { bindScriptStream } from '../src/engine/random';
import { buildPathGeometry } from '../src/components/pathways';
import { campusLayout, entryKey } from '../src/components/campusLayout';
import { surfaceOf } from '../src/state/paving';
import { moveRefusal } from '../src/state/sandboxMoves';
import { firstFreeSpot, footprintOf, isPlaceableKind, orientedFootprint, placementTiles } from '../src/state/campusMap';
import { SAVE_KEY, SAVE_VERSION, loadGame } from '../src/state/persistence';
import type { GameState, Pathways } from '../src/state/types';

bindScriptStream(4242);
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

console.log('campus decoration tests');

const found = (sandbox: boolean): GameState => {
  const s = reducer(createPreStartState(), {
    type: 'START_GAME', name: 'Decoration', vernacular: FOUNDING_VERNACULAR, colors: schoolColorsOf(FOUNDING_COLORS), seed: 31, sandbox,
  });
  s.pendingInterrupt = null;
  return s;
};

function roundTrip(s: GameState): GameState | null {
  store.clear();
  localStorage.setItem(SAVE_KEY, JSON.stringify({ version: SAVE_VERSION, savedAt: 0, state: s }));
  return loadGame();
}

// ---- Three surfaces, and repaving ----
{
  let s = found(false);
  const tile = { row: 20, col: 20 };
  s = reducer(s, { type: 'ADD_PATH_TILE', tile });
  assert(s.pathways['20,20'] === true, 'a path drawn with no surface is the flagged walk, stored as before materials');
  s = reducer(s, { type: 'ADD_PATH_TILE', tile, surface: 'cobble' });
  assert(s.pathways['20,20'] === 'cobble', 'drawing over it in cobbles repaves it');
  s = reducer(s, { type: 'ADD_PATH_TILE', tile: { row: 20, col: 21 }, surface: 'brick' });
  assert(surfaceOf(s.pathways['20,21']) === 'brick', 'and brick is its own');
  s = reducer(s, { type: 'ADD_PATH_TILE', tile, surface: 'paving' });
  assert(s.pathways['20,20'] === true, 'and the flagged walk is stored as `true` again');
}

// ---- A straight run puts back what it crossed ----
{
  let s = found(false);
  s.pathways['30,32'] = 'brick';
  // A run across the brick tile, in cobbles.
  s = reducer(s, {
    type: 'PAINT_PATH_TILES', add: [{ row: 30, col: 30 }, { row: 30, col: 31 }, { row: 30, col: 32 }], remove: [], surface: 'cobble',
  });
  assert(['30,30', '30,31', '30,32'].every((k) => s.pathways[k] === 'cobble'), 'the run is laid in cobbles, over the brick');
  // Moved off: what it laid is lifted and what it repaved is put back.
  s = reducer(s, {
    type: 'PAINT_PATH_TILES', add: [], remove: [{ row: 30, col: 31 }], surface: 'cobble',
    restore: [{ tile: { row: 30, col: 32 }, paving: 'brick' }],
  });
  assert(!('30,31' in s.pathways) && s.pathways['30,32'] === 'brick', 'moving the run off puts the brick back');
}

// ---- Each surface is drawn in its own fill and coursing ----
{
  const paths: Pathways = { '10,10': true, '10,11': 'cobble', '10,12': 'brick', '10,13': 'brick' };
  const g = buildPathGeometry(paths);
  assert(g.fills.paving !== '' && g.fills.cobble !== '' && g.fills.brick !== '', 'each surface has a fill');
  assert(g.coursing.paving === '' && g.coursing.cobble !== '' && g.coursing.brick !== '', 'cobbles and brick have coursing; the flagged walk its joints');
  const shapes = (d: string) => d.split('M').filter(Boolean).length;
  assert(shapes(g.outline) === 4, 'one curb round all of them: the walk is one walk whatever it is paved with');
  // The joints between tiles are drawn across surfaces as within one.
  assert(shapes(g.joints) === 3, `three joints between four tiles (${shapes(g.joints)})`);
  // The coursing stays inside a lone tile's rounded corners.
  const lone = buildPathGeometry({ '40,40': 'cobble' });
  const xs = [...lone.coursing.cobble.matchAll(/[ML](-?[\d.]+),(-?[\d.]+)/g)].map((m) => ({ x: Number(m[1]), y: Number(m[2]) }));
  const pts = [...lone.outline.matchAll(/[ML](-?[\d.]+),(-?[\d.]+)/g)].map((m) => ({ x: Number(m[1]), y: Number(m[2]) }));
  const inside = (p: { x: number; y: number }) => {
    // The outline is convex: a point inside lies on the same side of every edge.
    let sign = 0;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i]!; const b = pts[(i + 1) % pts.length]!;
      // Signed distance from the edge, in screen units; within half a
      // unit (the two decimals the strings print) counts as on it.
      const cross = ((b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x)) / Math.hypot(b.x - a.x, b.y - a.y);
      if (Math.abs(cross) < 0.5) continue;
      if (sign === 0) sign = Math.sign(cross);
      else if (Math.sign(cross) !== sign) return false;
    }
    return true;
  };
  assert(xs.length > 0 && xs.every(inside), 'and every sett joint of a lone tile lies inside its rounded outline');
}

// ---- A save keeps the surfaces, and drops what it does not draw ----
{
  const s = found(false);
  s.pathways = { '12,12': true, '12,13': 'cobble', '12,14': 'brick', '12,15': 'marble' as never, '12,16': false as never };
  const loaded = roundTrip(s);
  assert(loaded?.pathways['12,12'] === true && loaded.pathways['12,13'] === 'cobble' && loaded.pathways['12,14'] === 'brick', 'a save keeps every surface');
  assert(loaded !== null && !('12,15' in loaded.pathways) && !('12,16' in loaded.pathways), 'and drops a value it does not know');
}

// ---- A sandbox moves a standing building ----
{
  let s = found(true);
  const hall = s.placements[FOUNDERS_HALL_ID]!;
  const node = s.tech.find((t) => t.id === FOUNDERS_HALL_ID)!;
  const before = s.tech.find((t) => t.id === FOUNDERS_HALL_ID)!.status;
  // Off to the open ground well west of the middle.
  const to = { row: hall.row - 12, col: hall.col - 30 };
  assert(moveRefusal(s, FOUNDERS_HALL_ID, to.row, to.col, 0) === null, 'an open site is allowed');
  s.trees[`${to.row + 1},${to.col + 1}`] = 7;
  s.dressing = { [`${to.row + 2},${to.col + 2}`]: 'lamp' };
  s = reducer(s, { type: 'MOVE_BUILDABLE', id: FOUNDERS_HALL_ID, row: to.row, col: to.col, facing: 1 });
  const moved = s.placements[FOUNDERS_HALL_ID]!;
  assert(moved.row === to.row && moved.col === to.col && moved.facing === 1, 'it stands where it was set down, turned');
  const fp = orientedFootprint(node, 1);
  assert(moved.w === fp.w && moved.h === fp.h, 'with its footprint turned with it');
  assert(!(`${to.row + 1},${to.col + 1}` in s.trees) && !(`${to.row + 2},${to.col + 2}` in (s.dressing ?? {})), "the new ground's tree is felled and its lamp lifted");
  assert(s.tech.find((t) => t.id === FOUNDERS_HALL_ID)!.status === before && s.halls[FOUNDERS_HALL_ID] !== undefined, 'and the building is otherwise untouched');
  // Its own old ground no longer blocks it: a move by one tile overlaps it.
  assert(moveRefusal(s, FOUNDERS_HALL_ID, to.row + 1, to.col, 1) === null, 'a building never blocks its own new site');
  // Onto another building: refused, and nothing moves.
  const other = s.tech.find((t) => isPlaceableKind(t) && t.status === 'available' && !t.requiresFaculty && t.id !== FOUNDERS_HALL_ID)!;
  const spot = firstFreeSpot(s, other, footprintOf(other))!;
  s = reducer(s, { type: 'PLACE_BUILDABLE', buildableId: other.id, row: spot.row, col: spot.col, facing: 0 });
  assert(other.id in s.placements, 'a second building stands');
  const onto = s.placements[other.id]!;
  assert(moveRefusal(s, FOUNDERS_HALL_ID, onto.row, onto.col, 1) !== null, 'a site on another building is refused');
  const was = { ...s.placements[FOUNDERS_HALL_ID]! };
  s = reducer(s, { type: 'MOVE_BUILDABLE', id: FOUNDERS_HALL_ID, row: onto.row, col: onto.col, facing: 1 });
  assert(s.placements[FOUNDERS_HALL_ID]!.row === was.row && s.placements[FOUNDERS_HALL_ID]!.col === was.col, 'and the building stays put');
  // Off the land: refused.
  assert(moveRefusal(s, FOUNDERS_HALL_ID, 200, 200, 0) !== null, 'so is a site off the grid');
  // Its tiles are its own: nothing else covers them.
  const covered = placementTiles(s.placements[FOUNDERS_HALL_ID]!).filter((t) => Object.entries(s.placements).some(([id, p]) => id !== FOUNDERS_HALL_ID
    && t.row >= p.row && t.row < p.row + p.h && t.col >= p.col && t.col < p.col + p.w));
  assert(covered.length === 0, 'no two buildings overlap');
}

// ---- A normal run may not ----
{
  let s = found(false);
  const hall = { ...s.placements[FOUNDERS_HALL_ID]! };
  assert(moveRefusal(s, FOUNDERS_HALL_ID, hall.row - 12, hall.col - 30, 0) !== null, 'a normal run is told no');
  s = reducer(s, { type: 'MOVE_BUILDABLE', id: FOUNDERS_HALL_ID, row: hall.row - 12, col: hall.col - 30, facing: 0 });
  assert(s.placements[FOUNDERS_HALL_ID]!.row === hall.row && s.placements[FOUNDERS_HALL_ID]!.col === hall.col, 'and its building stays');
  s = reducer(s, { type: 'SET_BUILDING_STYLE', id: FOUNDERS_HALL_ID, vernacular: 'gothic' });
  assert(s.placements[FOUNDERS_HALL_ID]!.vernacular === undefined, 'nor can it restyle one');
  const t = s.tech.find((x) => isPlaceableKind(x) && x.status === 'available' && !x.requiresFaculty && x.cost < s.finance.cash)!;
  const spot = firstFreeSpot(s, t, footprintOf(t))!;
  s = reducer(s, { type: 'PLACE_BUILDABLE', buildableId: t.id, row: spot.row, col: spot.col, facing: 0, vernacular: 'modern' });
  assert(t.id in s.placements && s.placements[t.id]!.vernacular === undefined, "a normal run's building is in the college's style whatever the action asks");
}

// ---- A sandbox draws a building in another style ----
{
  let s = found(true);
  s = reducer(s, { type: 'SET_BUILDING_STYLE', id: FOUNDERS_HALL_ID, vernacular: 'gothic' });
  assert(s.placements[FOUNDERS_HALL_ID]!.vernacular === 'gothic', 'a sandbox restyles a standing building');
  const key = entryKey(campusLayout(s).byId.get(FOUNDERS_HALL_ID)!);
  s = reducer(s, { type: 'SET_BUILDING_STYLE', id: FOUNDERS_HALL_ID, vernacular: 'tudor' });
  assert(entryKey(campusLayout(s).byId.get(FOUNDERS_HALL_ID)!) !== key, "a new style redraws it (it is in the layout's key)");
  const loaded = roundTrip(s);
  assert(loaded?.placements[FOUNDERS_HALL_ID]?.vernacular === 'tudor', 'a save keeps it');
  s = reducer(s, { type: 'SET_BUILDING_STYLE', id: FOUNDERS_HALL_ID, vernacular: FOUNDING_VERNACULAR });
  assert(s.placements[FOUNDERS_HALL_ID]!.vernacular === undefined, "the college's own style is the absence of one");
  s = reducer(s, { type: 'SET_BUILDING_STYLE', id: FOUNDERS_HALL_ID, vernacular: 'tudor' });
  s = reducer(s, { type: 'MOVE_BUILDABLE', id: FOUNDERS_HALL_ID, row: s.placements[FOUNDERS_HALL_ID]!.row - 12, col: s.placements[FOUNDERS_HALL_ID]!.col - 30, facing: 0 });
  assert(s.placements[FOUNDERS_HALL_ID]!.vernacular === 'tudor', 'a moved building keeps its style');
  const t = s.tech.find((x) => isPlaceableKind(x) && x.status === 'available' && !x.requiresFaculty)!;
  const spot = firstFreeSpot(s, t, footprintOf(t))!;
  s = reducer(s, { type: 'PLACE_BUILDABLE', buildableId: t.id, row: spot.row, col: spot.col, facing: 0, vernacular: 'artDeco' });
  assert(s.placements[t.id]?.vernacular === 'artDeco', 'and a new building goes up in the style asked for');
  // A style a normal run carries (a hand-edited save) is dropped on load.
  const plain = found(false);
  plain.placements[FOUNDERS_HALL_ID]!.vernacular = 'gothic';
  assert(roundTrip(plain)?.placements[FOUNDERS_HALL_ID]?.vernacular === undefined, "a normal run's save loads without one");
  const junk = found(true);
  junk.placements[FOUNDERS_HALL_ID]!.vernacular = 'baroque' as never;
  assert(roundTrip(junk)?.placements[FOUNDERS_HALL_ID]?.vernacular === undefined, 'and a style this version does not draw is dropped');
}

console.log(failures === 0 ? `  ✓ all ${checks} checks passed` : `  ${failures} of ${checks} checks failed`);
if (failures > 0) process.exit(1);
