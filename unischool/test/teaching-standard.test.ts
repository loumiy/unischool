// ---------------------------------------------------------------------
// Teaching and the catalogue's price (Plan 71):
//
//   1. The curriculum committee: four seats, one more at prestige 70, 80,
//      90 and 100, and the next step named.
//   2. Academic satisfaction reads the courses' grade points against what
//      the students expect: a quarter of the courses at A for an ordinary
//      intake, three quarters for the best; nothing with every course under
//      a C, everything with every course at an A. An all-B college with a
//      library reads 70–90, higher with a weaker class (Plan 80F).
//   3. Prestige's teaching ceiling: near its floor with poor teaching, about
//      128 for B's, the full 150 only with every course at an A, and a
//      straight line in grade points (Plan 80F).
//   4. The catalogue's price: every undergraduate course not yet started is
//      listed at its base price times the growth per course on offer; a
//      start raises the rest and keeps its own; graduate courses keep
//      their list price.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { teachingCollege } from './fixtures/teaching';
import type { GameState } from '../src/state/types';
import { gradeFor } from '../src/data/courseQuality';
import { baseCourseCost, CATALOGUE_PRICE_GROWTH } from '../src/data/techData';
import {
  cataloguePriceScale, committeeSeats, coursesOnOffer, nextCommitteeSeatAt, repriceCatalogue, startDevelopment,
} from '../src/systems/techtree/techSystem';
import { ACADEMIC_LIBRARY_POINTS, computeSatisfactionBreakdown, expectedGradePoints, teachingAgainstStandard } from '../src/systems/satisfaction/satisfactionSystem';
import { teachingCeiling, teachingCeilingAt } from '../src/systems/prestige/prestigeSystem';
import { LIBRARY_TIER1_ID } from '../src/data/facilitiesData';
import { campusCourseScores } from '../src/systems/faculty/facultyAssignment';
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
  return teachingCollege('Standards');
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

// ---- 2. what the students expect ----
{
  const s = fresh();
  s.students.incomingQuality = 30;
  assert(near(expectedGradePoints(s), 0.73), 'a quarter of the courses at A for an ordinary intake');
  s.students.incomingQuality = 90;
  assert(near(expectedGradePoints(s), 0.92), 'three quarters at A for the best students');
  s.students.incomingQuality = 62.5;
  assert(expectedGradePoints(s) > 0.73 && expectedGradePoints(s) < 0.92, 'in between for in between');

  teachingAt(s, 40);
  assert(teachingAgainstStandard(s) === 0, 'every course under a C earns nothing');
  teachingAt(s, 100);
  assert(near(teachingAgainstStandard(s), 1), 'every course at an A earns it all');
  teachingAt(s, 70);
  const b = teachingAgainstStandard(s);
  assert(b > 0.4 && b < 0.9, 'a campus of B\'s reads short');
}

// ---- 2b. an all-B college reads 70–90 (Plan 80F) ----
// Every course a B and a library that seats the students: academic
// satisfaction sits between 70 and 90 for every class, higher for a weaker
// one and lower for a stronger one, and the library is two fifths of it.
{
  const s = fresh();
  for (const f of s.faculty) delete f.quirk;
  const library = s.tech.find((t) => t.id === LIBRARY_TIER1_ID)!;
  library.status = 'done';
  library.effects = { ...library.effects!, servesPopulation: 10_000 };
  // The teaching levels at which every course is a B, from the lowest B's
  // to the highest.
  const allB: number[] = [];
  for (let teaching = 40; teaching <= 100; teaching += 1) {
    teachingAt(s, teaching);
    if (campusCourseScores(s).every((score) => gradeFor(score) === 'B')) allB.push(teaching);
  }
  assert(allB.length >= 3, `the fixture can teach B's everywhere (${allB.join(', ')})`);
  const levels = [allB[0], allB[Math.floor(allB.length / 2)], allB[allB.length - 1]];
  const mid = levels[1];
  let previous = Infinity;
  for (const quality of [15, 30, 45, 55, 65, 75, 85, 95]) {
    s.students.incomingQuality = quality;
    for (const teaching of levels) {
      teachingAt(s, teaching);
      const academic = computeSatisfactionBreakdown(s).academic;
      assert(academic >= 70 && academic <= 90, `an all-B college reads 70–90 with a class of quality ${quality} (${academic.toFixed(1)})`);
    }
    teachingAt(s, mid);
    const academic = computeSatisfactionBreakdown(s).academic;
    assert(academic <= previous + 1e-9, `no higher for a stronger class (${quality}: ${academic.toFixed(1)})`);
    previous = academic;
  }
  s.students.incomingQuality = 20;
  teachingAt(s, mid);
  const weak = computeSatisfactionBreakdown(s).academic;
  s.students.incomingQuality = 90;
  const strong = computeSatisfactionBreakdown(s).academic;
  assert(weak - strong >= 10, `a weak class is plainly happier with B's than a strong one (${weak.toFixed(1)} against ${strong.toFixed(1)})`);
  teachingAt(s, 100);
  assert(near(computeSatisfactionBreakdown(s).academic, 100), 'A\'s everywhere and a library read full marks for the strongest class');
  teachingAt(s, 40);
  assert(near(computeSatisfactionBreakdown(s).academic, ACADEMIC_LIBRARY_POINTS), 'the library alone is two fifths');
}

// ---- 3. the teaching ceiling ----
{
  const s = fresh();
  teachingAt(s, 100);
  assert(near(teachingCeiling(s).value, 150), 'A\'s everywhere reach the full 150');
  teachingAt(s, 70);
  const bs = teachingCeiling(s).value;
  assert(Math.abs(bs - 128) < 0.5, `a campus of B's reaches about 128 (${bs.toFixed(1)})`);
  teachingAt(s, 35);
  const ds = teachingCeiling(s).value;
  assert(ds < 95 && bs > ds, 'poor teaching holds standing near the floor; B\'s well above it');
  assert(near(teachingCeilingAt(0.5), (teachingCeilingAt(0) + teachingCeilingAt(1)) / 2), 'a straight line in grade points');
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
