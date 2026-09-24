// The walkers' routes and the crowd's size (src/components/walkRoutes.ts,
// Walkers.tsx's walkerCount): routes go round buildings, prefer paving, and
// wear desire lines only into lawn; the crowd grows slower than the student
// body and stops at its cap.

import { doors, desireLines, growTree, routeTo, walkGrid, RouteTable, LAWN_COST, PATH_COST } from '../src/components/walkRoutes';
import { MAX_WALKERS, walkerCount } from '../src/components/Walkers';
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
  assert(ds.length === 2, 'each finished building has a door');
  assert(ds.find((d) => d.id === 'DORM-01')?.weight === 3, 'home weighs most');
  const table = new RouteTable(grid);
  const [a, b] = ds;
  assert(table.route(a, b) === undefined, 'a route waits for its tree');
  table.grow(1);
  const r = table.route(a, b);
  assert(Array.isArray(r) && r.length > 1, 'and has it a frame later');
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

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
