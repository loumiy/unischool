// ---------------------------------------------------------------------
// Teaching and the catalogue's price (Plan 71):
//
//   1. The curriculum committee: four seats, one more at prestige 70, 80,
//      90 and 100, and the next step named.
//   2. Academic satisfaction's standard is an A for an ordinary intake and
//      a strong A for the best; teaching against it reads 0 with every
//      course under a C and 1 with every course over the standard.
//   3. Prestige's teaching ceiling: near its floor with poor teaching, the
//      full 150 only with every course at an A.
//   4. The catalogue's price: every undergraduate course not yet started is
//      listed at its base price times the growth per course on offer; a
//      start raises the rest and keeps its own; graduate courses keep
//      their list price.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { createInitialState } from '../src/state/actions';
import type { GameState } from '../src/state/types';
import { GRADE_A } from '../src/data/courseQuality';
import { baseCourseCost, CATALOGUE_PRICE_GROWTH } from '../src/data/techData';
import {
  cataloguePriceScale, committeeSeats, coursesOnOffer, nextCommitteeSeatAt, repriceCatalogue, startDevelopment,
} from '../src/systems/techtree/techSystem';
import { academicStandard, teachingAgainstStandard } from '../src/systems/satisfaction/satisfactionSystem';
import { teachingCeiling } from '../src/systems/prestige/prestigeSystem';
import { bindScriptStream } from '../src/engine/random';

bindScriptStream(72);
const store = new Map<string, string>();
(globalThis as unknown as { localStorage: unknown }).localStorage = {
  getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
  setItem: (k: string, v: string) => { store.set(k, String(v)); },
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
const near = (a: number, b: number, eps = 1e-9) => Math.abs(a - b) < eps;

function fresh(): GameState {
  return createInitialState('Standards');
}

// Every instructor at one teaching level, with room enough that load costs nothing.
function teachingAt(s: GameState, teaching: number): void {
  for (const f of s.faculty) {
    f.teaching = teaching;
    f.acclaim = 0;
    f.courseSlots = 1;
  }
}

// ---- 1. the committee ----
{
  const s = fresh();
  s.self.reputation = 60;
  assert(committeeSeats(s) === 4 && nextCommitteeSeatAt(s) === 70, 'four seats, the fifth at prestige 70');
  s.self.reputation = 85;
  assert(committeeSeats(s) === 6 && nextCommitteeSeatAt(s) === 90, 'six past 80, the next at 90');
  s.self.reputation = 120;
  assert(committeeSeats(s) === 8 && nextCommitteeSeatAt(s) === null, 'eight at 100 and above, and no further step');
}

// ---- 2. the academic standard ----
{
  const s = fresh();
  s.students.incomingQuality = 30;
  assert(near(academicStandard(s), GRADE_A), 'an A for an ordinary intake');
  s.students.incomingQuality = 90;
  assert(near(academicStandard(s), GRADE_A + 8), 'a strong A for the best students');
  s.students.incomingQuality = 62.5;
  assert(academicStandard(s) > GRADE_A && academicStandard(s) < GRADE_A + 8, 'in between for in between');

  teachingAt(s, 40);
  assert(teachingAgainstStandard(s) === 0, 'every course under a C earns nothing');
  teachingAt(s, 100);
  assert(near(teachingAgainstStandard(s), 1), 'every course over the standard earns it all');
  teachingAt(s, 70);
  const b = teachingAgainstStandard(s);
  assert(b > 0.3 && b < 0.8, 'a campus of B\'s reads well short');
}

// ---- 3. the teaching ceiling ----
{
  const s = fresh();
  teachingAt(s, 100);
  assert(near(teachingCeiling(s).value, 150), 'A\'s everywhere reach the full 150');
  teachingAt(s, 70);
  const bs = teachingCeiling(s).value;
  teachingAt(s, 35);
  const ds = teachingCeiling(s).value;
  assert(ds < 95 && bs > ds && bs < 130, 'poor teaching holds standing near the floor; B\'s a little higher');
}

// ---- 4. the catalogue's price ----
{
  const s = fresh();
  const listed = () => s.tech.filter((t) => t.kind === 'course' && t.graduateProgram === undefined && t.status === 'available');
  assert(near(cataloguePriceScale(s), CATALOGUE_PRICE_GROWTH ** coursesOnOffer(s)), 'the scale is the growth per course on offer');
  const before = listed();
  assert(before.length > 1, 'some courses are listed at founding');
  assert(before.every((t) => Math.abs(t.cost - baseCourseCost(t.id)! * cataloguePriceScale(s)) <= 5_000), 'each at its base price times the scale');
  const started = before[0];
  const paid = started.cost;
  s.finance.cash = 1e9;
  startDevelopment(s, started);
  assert(started.cost === paid, 'a started course keeps its price');
  const other = s.tech.find((t) => t.id === before[1].id)!;
  assert(other.cost === Math.round((baseCourseCost(other.id)! * cataloguePriceScale(s)) / 10_000) * 10_000, 'the rest are re-listed at the new scale');
  assert(cataloguePriceScale(s) > CATALOGUE_PRICE_GROWTH ** (coursesOnOffer(s) - 1) - 1e-12 && other.cost >= before[1].cost, 'which is no lower than before');
  const grad = s.tech.find((t) => t.graduateProgram !== undefined)!;
  const gradCost = grad.cost;
  repriceCatalogue(s);
  assert(grad.cost === gradCost && baseCourseCost(grad.id) === undefined, 'graduate courses keep their list price');
}

console.log(`teaching standard: ${checks} checks, ${failures} failures`);
if (failures > 0) process.exit(1);
