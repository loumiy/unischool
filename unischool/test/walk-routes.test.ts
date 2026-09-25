// The walkers' routes and the crowd's size (src/components/walkRoutes.ts,
// Walkers.tsx's walkerCount): routes go round buildings, prefer paving, and
// wear desire lines only into lawn; every wall has a door unless it is built
// against, and a walk leaves and enters by the doors that suit it; the crowd
// grows slower than the student body and stops at its cap.

import { doors, desireLines, entrancesOf, growTree, routeTo, walkGrid, RouteTable, LAWN_COST, PATH_COST } from '../src/components/walkRoutes';
import { MAX_WALKERS, doorOpacity, doorsHeld, walkerCount } from '../src/components/Walkers';
import { quadCentre } from '../src/components/quadGeometry';
import { createInitialState } from '../src/state/actions';
import { bindScriptStream } from '../src/engine/random';
import type { GameState } from '../src/state/types';

bindScriptStream(2428);
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

console.log('walk route tests');

// ---- The crowd ----
{
  assert(walkerCount(0) === 0, 'no students, no walkers');
  const small = walkerCount(500);
  const large = walkerCount(40_000);
  assert(small >= 15 && small <= 25, `about 20 at 500 students (${small})`);
  assert(large >= 350 && large <= MAX_WALKERS, `about 400 at 40,000 (${large})`);
  assert(walkerCount(200_000) === MAX_WALKERS, 'and never more than the cap');
}

function bare(): GameState {
  const s = createInitialState('Walk');
  s.placements = {};
  s.pathways = {};
  return s;
}
function stand(s: GameState, id: string, row: number, col: number, w: number, h: number): void {
  s.tech.find((t) => t.id === id)!.status = 'done';
  s.placements[id] = { row, col, w, h };
}

// ---- A route goes round a building, and takes the path when there is one ----
{
  const s = bare();
  stand(s, 'LIB-T1', 20, 20, 7, 5);
  const grid = walkGrid(s);
  const route = routeTo(growTree(grid, { col: 18, row: 22 }), { col: 29, row: 22 })!;
  assert(route !== null && route.length > 1, 'there is a way round');
  assert(route.every((w) => !(w.col > 20 && w.col < 27 && w.row > 20 && w.row < 25)), 'and it never crosses the library');

  // A path round the north side, one row off the building.
  const paved = bare();
  stand(paved, 'LIB-T1', 20, 20, 7, 5);
  for (let c = 17; c <= 30; c++) paved.pathways[`19,${c}`] = true;
  for (let r = 19; r <= 22; r++) { paved.pathways[`${r},17`] = true; paved.pathways[`${r},30`] = true; }
  const pg = walkGrid(paved);
  const along = routeTo(growTree(pg, { col: 17, row: 22 }), { col: 30, row: 22 })!;
  const onPath = along.filter((w) => pg[Math.floor(w.row) * 126 + Math.floor(w.col)] === PATH_COST).length;
  assert(onPath === along.length, `with a path round it, the walk keeps to the path (${onPath} of ${along.length})`);
}

// ---- Doors, and the table that grows trees a few at a time ----
{
  const s = bare();
  stand(s, 'DORM-01', 30, 30, 7, 3);
  stand(s, 'DINING-01', 30, 50, 3, 3);
  const grid = walkGrid(s);
  const ds = doors(s, grid);
  assert(ds.length === 2, 'each finished building is somewhere to go');
  assert(ds.find((d) => d.id === 'DORM-01')?.weight === 3, 'home weighs most');
  const table = new RouteTable(grid);
  const [a, b] = ds;
  assert(table.walk(a, b) === undefined, 'a route waits for its tree');
  table.grow(1);
  const r = table.walk(a, b);
  assert(!!r && r.route.length > 1, 'and has it a frame later');
}

// ---- A door on every wall, and none onto a neighbor ----
{
  const s = bare();
  stand(s, 'DORM-01', 30, 30, 7, 3);
  const grid = walkGrid(s);
  const all = entrancesOf(s.placements['DORM-01'], grid);
  assert(all.length === 4, `a building standing alone has four doors (${all.length})`);
  const front = all.find((e) => e.side === 'posRow')!;
  assert(front.face.col === 33.5 && front.face.row === 33, `each at its wall's middle (${front.face.col}, ${front.face.row})`);
  const west = all.find((e) => e.side === 'negCol')!;
  assert(west.face.col === 30 && west.face.row === 31.5 && west.col === 29, 'the -col door opens onto the tile west of the wall');

  // A dining hall built flush against the +row wall, over its middle.
  stand(s, 'DINING-01', 33, 32, 3, 3);
  const walled = entrancesOf(s.placements['DORM-01'], walkGrid(s));
  assert(!walled.some((e) => e.side === 'posRow'), 'a wall built against has no door');
  assert(walled.length === 3, `the other three stay open (${walled.length})`);

  // An even wall's door opens onto the two tiles either side of its
  // middle; one of them built over shuts it.
  const e = bare();
  stand(e, 'HALL-01', 30, 30, 6, 4);
  stand(e, 'DINING-01', 34, 33, 3, 3);   // covers col 33, just right of the middle (col 33 | 32)
  const evenDoors = entrancesOf(e.placements['HALL-01'], walkGrid(e));
  assert(!evenDoors.some((d) => d.side === 'posRow'), 'half a doorway built over is shut');

  // Every door built against: reached at the edge, as before.
  const boxed = bare();
  stand(boxed, 'DINING-01', 30, 30, 3, 3);
  stand(boxed, 'DORM-01', 33, 31, 1, 1);
  stand(boxed, 'HALL-01', 29, 31, 1, 1);
  stand(boxed, 'LIB-T1', 31, 29, 1, 1);
  stand(boxed, 'DORM-02', 31, 33, 1, 1);
  const cornered = entrancesOf(boxed.placements['DINING-01'], walkGrid(boxed));
  assert(cornered.length === 1 && cornered[0].side === null, `a walled-in building is still reached (${cornered.length})`);
}

// ---- A walk leaves by the door toward where it is going ----
{
  const s = bare();
  stand(s, 'DORM-01', 60, 60, 7, 3);
  stand(s, 'DINING-01', 30, 62, 3, 3);   // far to the north (-row)
  stand(s, 'HALL-01', 61, 90, 7, 5);     // far to the east (+col)
  const grid = walkGrid(s);
  const [home, dining, hall] = ['DORM-01', 'DINING-01', 'HALL-01'].map((id) => doors(s, grid).find((d) => d.id === id)!);
  const table = new RouteTable(grid);
  table.walk(home, dining);
  table.grow(1);
  const north = table.walk(home, dining)!;
  assert(north.exit.side === 'negRow' && north.entry.side === 'posRow', `north: out the -row door, in at the +row (${north.exit.side} → ${north.entry.side})`);
  const east = table.walk(home, hall)!;
  assert(east.exit.side === 'posCol' && east.entry.side === 'negCol', `east: out the +col door, in at the -col (${east.exit.side} → ${east.entry.side})`);
  const last = east.route[east.route.length - 1];
  assert(last.col === east.entry.face.col && last.row === east.entry.face.row && last.col === 90, 'and ends at the door on the wall');
  assert(east.route[0].col === 67 && east.route[0].row === 61.5, 'having begun at the door on the other');
}

// ---- Through a door: faded in the wall, and the door held open ----
{
  assert(doorOpacity(0, 5, true, true) === 0 && doorOpacity(5, 5, true, true) === 0, 'in the wall at either end');
  assert(doorOpacity(2.5, 5, true, true) === 1, 'in the open between');
  assert(doorOpacity(0, 5, false, false) === 1, 'no door, no fade');
  assert(doorsHeld(0.2, 5, 'a', 'b').join() === 'a', 'the door behind is held while on its step');
  assert(doorsHeld(4.5, 5, 'a', 'b').join() === 'b', 'the door ahead opens on the approach');
  assert(doorsHeld(5, 5, 'a', 'b').length === 0, 'and shuts once through');
  assert(doorsHeld(2.5, 5, 'a', 'b').length === 0, 'none held in the open');
}

// ---- Desire lines wear only lawn ----
{
  const s = bare();
  stand(s, 'DORM-01', 30, 30, 7, 3);
  stand(s, 'HALL-01', 30, 60, 7, 5);
  const grid = walkGrid(s);
  const lines = desireLines(s, grid);
  assert(lines.length > 0, 'a walk from home to a hall across lawn wears a line');
  assert(lines.every((run) => run.every((w) => grid[Math.floor(w.row) * 126 + Math.floor(w.col)] === LAWN_COST)), 'on lawn only');
  // Pave the whole way across: the line is gone.
  for (let c = 30; c <= 67; c++) s.pathways[`33,${c}`] = true;
  for (let r = 33; r <= 35; r++) { s.pathways[`${r},33`] = true; s.pathways[`${r},63`] = true; }
  const paved = walkGrid(s);
  const after = desireLines(s, paved).reduce((t, run) => t + run.length, 0);
  const before = lines.reduce((t, run) => t + run.length, 0);
  assert(after < before, `a path laid along it takes the wear (${before} → ${after})`);
}

// ---- Round the Grand Quad's fountain, on its ring walk (Plan 62) ----
{
  const s = bare();
  const quad = s.tech.find((t) => t.id === 'QUAD-T2')!;
  stand(s, 'QUAD-T2', 20, 20, 12, 12);
  const grid = walkGrid(s);
  const { cc, cr, R, ring } = quadCentre(20, 20, 12, 12, quad.tier ?? 2);
  assert(grid[Math.floor(cr) * 126 + Math.floor(cc)] === -1, 'no one steps into the fountain');
  // Across the quad along its walk, from one edge's middle to the other's.
  const route = routeTo(growTree(grid, { col: 25, row: 19 }), { col: 25, row: 32 })!;
  assert(route !== null && route.length > 1, 'the walk still crosses the quad');
  const nearest = Math.min(...route.map((w) => Math.hypot(w.col - cc, w.row - cr)));
  assert(nearest >= R, `and goes round the fountain, never inside its curb (${nearest.toFixed(2)} ≥ ${R.toFixed(2)})`);
  const onRing = route.filter((w) => { const d = Math.hypot(w.col - cc, w.row - cr); return ring && d >= ring[0] - 0.6 && d <= ring[1] + 0.6; }).length;
  assert(onRing >= 3, `by the ring walk (${onRing} steps on it)`);
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
