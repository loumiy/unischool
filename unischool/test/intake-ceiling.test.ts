// ---------------------------------------------------------------------
// The ceiling (Plan 15's PR E — see instructionCapacity.ts's intakeCeiling,
// admissionsSystem.ts's `seatsLeft`, and financeSystem.ts's
// servicesMultiplier). The freshman class cannot exceed the seats the
// housed catalogue has left after graduation; the funnel clips it from
// the bottom band up; the pool is never capped; and the services line
// rises past 85% of capacity.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { createInitialState } from '../src/state/actions';
import { reducer } from '../src/engine/reducer';
import { defaultAnswer } from '../src/engine/defaultAnswers';
import { projectAdmissions } from '../src/systems/admissions/admissionsSystem';
import { intakeCeiling, instructionCapacity, SEATS_PER_COURSE } from '../src/systems/techtree/instructionCapacity';
import { servicesMultiplier, SERVICES_CROWDING_AT_FULL, SERVICES_PER_STUDENT_PER_WEEK, financeBreakdown } from '../src/systems/finance/financeSystem';
import { programs } from '../src/data/techData';
import { FOUNDING_PROGRAMS, FOUNDING_COURSES_PER_PROGRAM } from '../src/data/foundingData';
import { WEEKS_PER_YEAR, totalEnrolled } from '../src/state/types';
import type { GameState } from '../src/state/types';

let seed = 99;
Math.random = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
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
const near = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) < eps;

function fresh(): GameState {
  return createInitialState('Ceiling');
}
// The founding college's developed courses (Plan 19): what a founding save
// can teach.
const FOUNDING_COURSE_COUNT = FOUNDING_PROGRAMS.length * FOUNDING_COURSES_PER_PROGRAM;

function toSummer(start: GameState): GameState {
  let s = start;
  for (let i = 0; i < WEEKS_PER_YEAR * 2; i += 1) {
    if (s.pendingInterrupt?.type === 'summer') return s;
    const answer = defaultAnswer(s);
    s = answer ? reducer(s, answer) : reducer(s, { type: 'TICK' });
  }
  throw new Error('no summer interrupt inside two years');
}

console.log('intake ceiling tests');

// ---- the funnel clips to the seats left, from the bottom band up ----
{
  const free = projectAdmissions(60, 20_000, 0, 70);
  assert(!free.capped && free.seatsLeft === Infinity, 'without a ceiling nothing is capped');
  assert(free.enrolled > 100, `and the class is a real one (${free.enrolled})`);

  const held = projectAdmissions(60, 20_000, 0, 70, undefined, undefined, 100);
  assert(held.capped, 'a ceiling below the class caps it');
  assert(held.enrolled === 100, `to exactly the seats left (${held.enrolled})`);
  assert(held.applicants === free.applicants, 'the pool is untouched');
  assert(held.avgIncomingQuality >= free.avgIncomingQuality, 'and the weakest admits are the ones turned away');
  assert(held.admitRate < free.admitRate, 'so the realised admit rate falls below the chosen one');

  const roomy = projectAdmissions(60, 20_000, 0, 70, undefined, undefined, free.enrolled + 50);
  assert(!roomy.capped && roomy.enrolled === free.enrolled, 'a ceiling above the class changes nothing');

  const none = projectAdmissions(60, 20_000, 0, 70, undefined, undefined, 0);
  assert(none.enrolled === 0 && none.capped, 'no seats left admits nobody');
}

// ---- the ceiling's arithmetic ----
{
  const s = fresh();
  const c = intakeCeiling(s);
  assert(c.capacity === FOUNDING_COURSE_COUNT * SEATS_PER_COURSE, 'the founding college\'s six developed courses are the capacity');
  assert(c.stayingOn === totalEnrolled(s.students) - s.students.classes.senior, 'three classes stay on after graduation');
  assert(c.seatsLeft === c.capacity - c.stayingOn, 'and the room is what is left');
  assert(c.nextSummer === c.capacity, 'with nothing developing, next summer holds the same');

  // A course developing in a housed program that finishes within the year counts toward next summer.
  const finance = programs().find((p) => p.kind === 'major' && p.school === 'Business')!;
  s.tech.find((t) => t.id === 'HALL-01')!.status = 'done';
  s.halls['HALL-01'] = Array.from({ length: 6 }, () => ({ programId: null }));
  s.halls['HALL-01'][0] = { programId: finance.id };
  const entry = s.tech.find((t) => t.id === finance.entryCourseId)!;
  entry.status = 'developing';
  s.developing[entry.id] = 20;
  assert(intakeCeiling(s).nextSummer === c.capacity + SEATS_PER_COURSE, 'a housed course finishing this year adds its seats to next summer');
  s.developing[entry.id] = 80;
  assert(intakeCeiling(s).nextSummer === c.capacity, 'one finishing later does not');
  assert(instructionCapacity(s) === c.capacity, 'and neither counts today');

  s.students.classes = { freshman: 1_000, sophomore: 1_000, junior: 1_000, senior: 0 };
  assert(intakeCeiling(s).seatsLeft === 0, 'a body past the catalogue leaves no room, never a negative one');
}

// ---- services rise past 85% of capacity ----
{
  const s = fresh();
  const capacity = instructionCapacity(s);
  const at = (used: number) => {
    s.students.classes = { freshman: Math.round(capacity * used), sophomore: 0, junior: 0, senior: 0 };
    return servicesMultiplier(s);
  };
  assert(near(at(0.5), 1) && near(at(0.85), 1), 'nothing up to 85%');
  assert(near(at(1), 1 + SERVICES_CROWDING_AT_FULL), `1 + ${SERVICES_CROWDING_AT_FULL} at the ceiling`);
  assert(at(0.925) > 1 && at(0.925) < 1 + SERVICES_CROWDING_AT_FULL, 'rising between');
  assert(at(4) === 2, 'capped well past it');
  s.students.classes = { freshman: 0, sophomore: 0, junior: 0, senior: 0 };
  assert(servicesMultiplier(s) === 1, 'and nobody enrolled reads 1');
  const empty = createInitialState('No seats');
  empty.halls = {}; // the founding programs unhoused: nothing seats anybody
  assert(instructionCapacity(empty) === 0 && servicesMultiplier(empty) === 2, 'a campus with no seats at all reads the cap');
  s.students.classes = { freshman: capacity, sophomore: 0, junior: 0, senior: 0 };
  // (the multiplied statement line is asserted below)
  s.self.reputation = 50; // market rate 1, so the line reads its base
  assert(near(financeBreakdown(s).servicesCost, capacity * SERVICES_PER_STUDENT_PER_WEEK * (1 + SERVICES_CROWDING_AT_FULL)), 'and the statement charges the multiplied line');
}

// ---- the summer, through the reducer: the class is held to the room ----
{
  const start = fresh();
  const atSummer = toSummer(start);
  const ceiling = intakeCeiling(atSummer);
  const wide = projectAdmissions(atSummer.self.reputation, atSummer.finance.listedTuition, atSummer.students.capacity, atSummer.students.priorYearAvgSatisfaction, undefined, 1);
  assert(wide.enrolled > ceiling.seatsLeft, `taking the whole pool would overrun the room (${wide.enrolled} against ${ceiling.seatsLeft})`);
  const s = reducer(atSummer, { type: 'RESOLVE_ADMISSIONS', tuition: atSummer.finance.listedTuition, admitRate: 1, approvedPetitionIds: [] });
  assert(s.students.classes.freshman <= ceiling.seatsLeft, `the freshman class is held to the room (${s.students.classes.freshman})`);
  assert(s.students.classes.freshman === ceiling.seatsLeft, 'exactly, when the pool would have filled it');
  assert(s.log.some((l) => l.message.includes('the class was held to it')), 'and the log says so');
  assert(totalEnrolled(s.students) <= intakeCeiling(atSummer).capacity, 'so the body fits the catalogue');
}

console.log(`intake ceiling: ${checks} checks, ${failures} failures`);
if (failures > 0) process.exit(1);
