// ---------------------------------------------------------------------
// Plan 99E: a flight of entrance steps runs out from its wall whichever
// way the wall faces. On walls facing -col or -row (the ones a turned
// camera sees) each tread's box started on the wall's plane and ran into
// the building, so the flight read as climbing away from the door.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { treadBox } from '../src/components/buildingMotifs';

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) { failures += 1; console.log(`  ✗ ${msg}`); }
}

console.log('entrance steps tests');

// A door on each wall of a building whose wall planes are col 10 / col 20,
// row 10 / row 20; the door's middle at 15 along it.
const walls = [
  { dir: 'posRow', at: { col: 15, row: 20 }, out: { col: 0, row: 1 } },
  { dir: 'negRow', at: { col: 15, row: 10 }, out: { col: 0, row: -1 } },
  { dir: 'posCol', at: { col: 20, row: 15 }, out: { col: 1, row: 0 } },
  { dir: 'negCol', at: { col: 10, row: 15 }, out: { col: -1, row: 0 } },
] as const;
const n = 3;
const halfW = 0.6;
for (const w of walls) {
  const boxes = Array.from({ length: n }, (_, i) => treadBox(n, i, w.at.col, w.at.row, w.out.col, w.out.row, halfW));
  // Every tread outside the building: on the wall's plane and beyond it.
  const outside = boxes.every((b) => (w.out.col > 0 ? b.col >= w.at.col : w.out.col < 0 ? b.col + b.w <= w.at.col
    : w.out.row > 0 ? b.row >= w.at.row : b.row + b.h <= w.at.row));
  assert(outside, `${w.dir}: every tread stands outside the wall`);
  // Each touches the wall, and each higher tread reaches less far out.
  const touches = boxes.every((b) => (w.out.col > 0 ? b.col === w.at.col : w.out.col < 0 ? b.col + b.w === w.at.col
    : w.out.row > 0 ? b.row === w.at.row : b.row + b.h === w.at.row));
  assert(touches, `${w.dir}: every tread starts at the wall`);
  const reach = boxes.map((b) => (w.out.col !== 0 ? b.w : b.h));
  assert(reach.every((r, i) => i === 0 || r < reach[i - 1]!), `${w.dir}: the higher a tread, the nearer the door (${reach.map((r) => r.toFixed(2)).join(', ')})`);
  // Centred on the door along the wall.
  const across = boxes.every((b) => (w.out.col !== 0 ? Math.abs(b.row + b.h / 2 - w.at.row) < 1e-9 : Math.abs(b.col + b.w / 2 - w.at.col) < 1e-9));
  assert(across, `${w.dir}: centred on the door`);
}

console.log(failures === 0 ? `  ✓ all ${checks} checks passed` : `  ${failures} of ${checks} checks failed`);
if (failures > 0) process.exit(1);
