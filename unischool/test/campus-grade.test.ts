// ---------------------------------------------------------------------
// The Campus standing (Plan 119): decoration, quads, paths to doors and
// assets placed, each a ratio, so care beats size. Pinned: each part moves
// on its own; a campus that bought every building it could and dressed none
// of it reads a D or worse on the report's scale, and the same campus laid
// out with care, a path to every door and three decorations a building,
// reads an A.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { teachingCollege } from './fixtures/teaching';
import { CAMPUS_SCALE, campusTerms } from '../src/systems/estate/beauty';
import { firstFreeSpot, footprintOf, isPlaceableKind, pathTileKey } from '../src/state/campusMap';
import { reportGrade } from '../src/data/reportData';
import type { GameState } from '../src/state/types';

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('campus grade tests');

const reportScale = (score: number) => (score * 100) / CAMPUS_SCALE;

// Every building the college may build, done and placed where it fits,
// with no paths and no dressing.
function boughtEverything(): GameState {
  const s = teachingCollege('Campus');
  s.pathways = {};
  s.dressing = {};
  let placed = 0;
  for (const t of s.tech) {
    if (!isPlaceableKind(t) || t.facilityType === 'quad' || t.status === 'locked' || t.id in s.placements) continue;
    const fp = footprintOf(t);
    const at = firstFreeSpot(s, t, fp);
    if (!at) continue;
    s.placements[t.id] = { ...at, ...fp };
    t.status = 'done';
    placed += 1;
    if (placed >= 12) break;
  }
  return s;
}

// The same campus with a path at every door and three decorations a
// building, on the open tiles around it.
function withCare(s: GameState): GameState {
  for (const [, p] of Object.entries(s.placements)) {
    const door = { row: p.row + p.h, col: p.col + Math.floor((p.w - 1) / 2) };
    s.pathways[pathTileKey(door)] = 'paving' as never;
    let n = 0;
    for (let dc = 1; dc <= p.w + 2 && n < 3; dc += 1) {
      const key = pathTileKey({ row: p.row - 1, col: p.col + dc - 1 });
      if (!(key in s.dressing!)) { s.dressing![key] = 'lamp'; n += 1; }
    }
  }
  return s;
}

{
  const bought = boughtEverything();
  const b = campusTerms(bought);
  assert(b.decoration === 0 && b.paths === 0, `bought: no dressing, no paths (${JSON.stringify(b)})`);
  assert(b.assets > 0.4, `but its buildings stand (${b.assets})`);
  const cared = withCare(boughtEverything());
  const c = campusTerms(cared);
  assert(c.decoration === 1 && c.paths === 1, `with care: dressed, and a path at every door (${JSON.stringify(c)})`);
  assert(c.assets === b.assets, 'on the same buildings');
  const bg = reportGrade(reportScale(b.score));
  const cg = reportGrade(reportScale(c.score));
  assert(bg !== 'A' && bg !== 'B', `bought everything, with no path or decoration, reads ${bg} (${reportScale(b.score).toFixed(0)})`);
  assert(['A', 'B'].includes(cg) && c.score > b.score + 40, `laid out with care reads ${cg} (${reportScale(c.score).toFixed(0)})`);
}

// Size alone doesn't raise it: a campus of one building laid out with care
// scores on its decoration and paths as a large one does.
{
  const s = teachingCollege('Small');
  s.dressing = {};
  const one = campusTerms(s);
  const hall = Object.values(s.placements)[0];
  for (let dc = 0; dc < 3; dc += 1) s.dressing[pathTileKey({ row: hall.row - 1, col: hall.col + dc })] = 'bench-s' as never;
  const dressed = campusTerms(s);
  assert(dressed.decoration === 1 && dressed.decoration > one.decoration, `three decorations dress a one-building campus fully (${one.decoration} → ${dressed.decoration})`);
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
