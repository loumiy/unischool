// ---------------------------------------------------------------------
// Paths by line or area (Plan 120B; src/components/pathStroke.ts). What is
// worth pinning:
//
//   - a rectangle lays every tile between its corners, and a line the run;
//   - moving the pointer moves the shape: tiles it leaves are lifted, and
//     a tile it repaved goes back to what it was;
//   - a shape skips the tiles under a building;
//   - the right button's shape lifts paths, and puts them back if it moves
//     off them;
//   - what it returns goes through PAINT_PATH_TILES unchanged.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { createInitialState } from '../src/state/actions';
import { reducer } from '../src/engine/reducer';
import { pathTileKey } from '../src/state/campusMap';
import { bindScriptStream } from '../src/engine/random';
import { shapeStroke, tilesInRect, type ShapeChange, type Stroke } from '../src/components/pathStroke';
import type { GameState, TileCoord } from '../src/state/types';

bindScriptStream(1202);

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('path shape tests');

const stroke = (anchor: TileCoord): Stroke => ({ anchor, laid: new Set(), prior: new Map() });
const apply = (s: GameState, c: ShapeChange, surface?: 'cobble' | 'brick') => reducer(s, {
  type: 'PAINT_PATH_TILES', add: c.add, remove: c.remove, ...(surface ? { surface } : {}), ...(c.restore.length > 0 ? { restore: c.restore } : {}),
});
const paved = (s: GameState) => Object.keys(s.pathways).length;
const at = (row: number, col: number) => pathTileKey({ row, col });

function open(): GameState {
  const s = createInitialState('Paths');
  s.pathways = {};
  s.placements = {};
  return s;
}

// ---- A rectangle, and a line ----
{
  let s = open();
  const k = stroke({ row: 30, col: 30 });
  s = apply(s, shapeStroke(s.pathways, s.placements, k, { row: 32, col: 34 }, 'area', 'draw', 'paving'));
  assert(paved(s) === 15 && tilesInRect({ row: 30, col: 30 }, { row: 32, col: 34 }).every((t) => pathTileKey(t) in s.pathways), `a 3 by 5 rectangle lays 15 tiles (${paved(s)})`);
  s = apply(s, shapeStroke(s.pathways, s.placements, k, { row: 31, col: 31 }, 'area', 'draw', 'paving'));
  assert(paved(s) === 4, `shrunk to 2 by 2, the rest is lifted (${paved(s)})`);
  const l = stroke({ row: 40, col: 30 });
  s = apply(s, shapeStroke(s.pathways, s.placements, l, { row: 40, col: 39 }, 'line', 'draw', 'paving'));
  assert(paved(s) === 14, `a line of ten beside it (${paved(s)})`);
}

// ---- Repaving puts back what it crossed ----
{
  let s = open();
  s.pathways[at(30, 31)] = 'brick';
  const k = stroke({ row: 30, col: 30 });
  s = apply(s, shapeStroke(s.pathways, s.placements, k, { row: 31, col: 32 }, 'area', 'draw', 'cobble'), 'cobble');
  assert(s.pathways[at(30, 31)] === 'cobble' && paved(s) === 6, 'a cobble rectangle repaves the brick tile');
  s = apply(s, shapeStroke(s.pathways, s.placements, k, { row: 30, col: 30 }, 'area', 'draw', 'cobble'), 'cobble');
  assert(s.pathways[at(30, 31)] === 'brick' && paved(s) === 2, 'moved off it, the brick comes back');
}

// ---- Not under a building ----
{
  let s = open();
  s.placements = { hall: { row: 31, col: 31, w: 2, h: 2 } as GameState['placements'][string] };
  const k = stroke({ row: 30, col: 30 });
  s = apply(s, shapeStroke(s.pathways, s.placements, k, { row: 33, col: 33 }, 'area', 'draw', 'paving'));
  assert(paved(s) === 12 && !(at(31, 31) in s.pathways) && !(at(32, 32) in s.pathways), `a rectangle round a building skips its four tiles (${paved(s)})`);
}

// ---- Deleting by area ----
{
  let s = open();
  for (const t of tilesInRect({ row: 30, col: 30 }, { row: 33, col: 33 })) s.pathways[pathTileKey(t)] = true;
  s.pathways[at(31, 31)] = 'brick';
  const k = stroke({ row: 30, col: 30 });
  s = apply(s, shapeStroke(s.pathways, s.placements, k, { row: 31, col: 31 }, 'area', 'unpave', 'paving'));
  assert(paved(s) === 12, `the right button's rectangle lifts four (${paved(s)})`);
  s = apply(s, shapeStroke(s.pathways, s.placements, k, { row: 30, col: 33 }, 'area', 'unpave', 'paving'));
  assert(paved(s) === 12 && s.pathways[at(31, 31)] === 'brick' && !(at(30, 33) in s.pathways), 'moved, it lifts the new row and puts the brick back');
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
