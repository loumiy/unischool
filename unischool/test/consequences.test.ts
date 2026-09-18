// ---------------------------------------------------------------------
// Consequences (Plan 15's PR F): attrition at the year boundary
// (admissionsSystem.ts's attritionRate and advanceClasses), demands from
// 60 with an instruction shortfall (demandData.ts, demandSystem.ts), and
// word of mouth at ±0.60. A bad year costs students, it says so, and the
// projection promises the same body the tick produces.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { createInitialState } from '../src/state/actions';
import { reducer } from '../src/engine/reducer';
import { defaultAnswer } from '../src/engine/defaultAnswers';
import {
  ATTRITION_MAX_RATE, ATTRITION_SATISFACTION_LINE, advanceClasses, attritionRate, projectAdmissions,
} from '../src/systems/admissions/admissionsSystem';
import { attritionReasons, projectConsequences } from '../src/systems/admissions/consequences';
import { baseShareCohortCounts, COHORTS } from '../src/systems/admissions/cohorts';
import { DEMAND_SATISFACTION_THRESHOLD, demandSubject } from '../src/data/demandData';
import { demandProgress, shortfallDemandFor } from '../src/systems/demands/demandSystem';
import { instructionCapacity, intakeCeiling, SEATS_PER_COURSE } from '../src/systems/techtree/instructionCapacity';
import { programs } from '../src/data/techData';
import { WEEKS_PER_YEAR, totalEnrolled } from '../src/state/types';
import type { GameState } from '../src/state/types';

let seed = 31;
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
const near = (a: number, b: number, eps = 1e-9) => Math.abs(a - b) < eps;

function toSummer(start: GameState): GameState {
  let s = start;
  for (let i = 0; i < WEEKS_PER_YEAR * 2; i += 1) {
    if (s.pendingInterrupt?.type === 'summer') return s;
    const answer = defaultAnswer(s);
    s = answer ? reducer(s, answer) : reducer(s, { type: 'TICK' });
  }
  throw new Error('no summer interrupt inside two years');
}
function withYearAverage(s: GameState, average: number): void {
  s.students.satisfactionYearSum = average * 40;
  s.students.satisfactionYearWeeks = 40;
}

console.log('consequences tests');

// ---- the attrition curve ----
{
  assert(attritionRate(ATTRITION_SATISFACTION_LINE) === 0 && attritionRate(70) === 0, 'nothing at or above the line');
  assert(near(attritionRate(40), ATTRITION_MAX_RATE / 2), 'halfway down, half the rate');
  assert(near(attritionRate(30), ATTRITION_MAX_RATE), 'the full rate at 30');
  assert(near(attritionRate(5), ATTRITION_MAX_RATE), 'and no worse below it');
}

// ---- the advance, with attrition ----
{
  const body = {
    classes: { freshman: 100, sophomore: 200, junior: 300, senior: 400 },
    tuitionByClass: { freshman: 10_000, sophomore: 11_000, junior: 12_000, senior: 13_000 },
    cohortsByClass: {
      freshman: baseShareCohortCounts(100), sophomore: baseShareCohortCounts(200),
      junior: baseShareCohortCounts(300), senior: baseShareCohortCounts(400),
    },
  };
  const incoming = { count: 50, price: 9_000, cohorts: baseShareCohortCounts(50) };
  const none = advanceClasses(body, incoming);
  assert(none.notReturning === 0 && none.classes.sophomore === 100 && none.classes.senior === 300, 'no attrition is the plain advance');

  const some = advanceClasses(body, incoming, 0.1);
  assert(some.graduating === 400, 'the seniors graduate as before');
  assert(some.classes.sophomore === 90 && some.classes.junior === 180 && some.classes.senior === 270, 'each staying class loses its share before it moves up');
  assert(some.classes.freshman === 50, 'the incoming class is untouched');
  assert(some.notReturning === 10 + 20 + 30, 'and the loss is counted');
  assert(some.tuitionByClass.sophomore === 10_000 && some.tuitionByClass.senior === 12_000, 'a class\'s price does not change');
  const sum = (c: Record<string, number>) => COHORTS.reduce((t, k) => t + c[k.id], 0);
  assert(sum(some.cohortsByClass.senior) === 270 && sum(some.cohortsByClass.sophomore) === 90, 'the mix shrinks with the class, and still sums to it');
}

// ---- a bad year, through the reducer, says so ----
{
  const atSummer = toSummer(createInitialState('Attrition'));
  withYearAverage(atSummer, 30);
  const before = atSummer.students.classes;
  const staying = before.freshman + before.sophomore + before.junior;
  const outcome = projectAdmissions(
    atSummer.self.reputation, atSummer.finance.listedTuition, atSummer.students.capacity, 30,
    undefined, atSummer.students.admitRate, intakeCeiling(atSummer).seatsLeft,
  );
  const projected = projectConsequences(atSummer, outcome.enrolled, atSummer.finance.listedTuition);
  assert(projected.notReturning > 0, `the projection says who will not return (${projected.notReturning})`);
  assert(projected.attritionReasons.length > 0, `and why (${projected.attritionReasons.join(', ')})`);

  const s = reducer(atSummer, { type: 'RESOLVE_ADMISSIONS', tuition: atSummer.finance.listedTuition, admitRate: atSummer.students.admitRate, approvedPetitionIds: [] });
  const stayed = s.students.classes.sophomore + s.students.classes.junior + s.students.classes.senior;
  assert(staying - stayed === projected.notReturning, `the tick loses exactly the projected number (${staying - stayed} vs ${projected.notReturning})`);
  assert(Math.abs((staying - stayed) / staying - ATTRITION_MAX_RATE) < 0.01, `about ${ATTRITION_MAX_RATE * 100}% of the staying classes at satisfaction 30`);
  assert(totalEnrolled(s.students) === projected.totalEnrolled, 'and the body committed is the body projected');
  assert(s.log.some((l) => l.message.includes('did not return')), 'the log names the loss');

  const good = toSummer(createInitialState('Content'));
  withYearAverage(good, 70);
  const g = reducer(good, defaultAnswer(good)!);
  assert(!g.log.some((l) => l.message.includes('did not return')), 'a good year loses nobody and says nothing');
}

// ---- attrition reasons name the worst-covered needs ----
{
  const s = createInitialState('Reasons');
  const reasons = attritionReasons(s);
  assert(reasons.length === 2, 'two reasons at most');
  assert(reasons.every((r) => ['housing', 'dining', 'study space', 'social space', 'classes'].includes(r)), 'each a need the campus is short of');
}

// ---- demands from 60, and one for a seat in class ----
{
  assert(DEMAND_SATISFACTION_THRESHOLD === 60, 'demands come from 60, not 45');

  const s = createInitialState('Seats');
  assert(shortfallDemandFor(s, 'instruction') === null, 'with no housed program beyond the core there is no course to ask for');

  const finance = programs().find((p) => p.kind === 'major' && p.school === 'Business')!;
  s.tech.find((t) => t.id === 'HALL-01')!.status = 'done';
  s.halls['HALL-01'] = Array.from({ length: 6 }, () => ({ programId: null }));
  s.halls['HALL-01'][0] = { programId: finance.id };
  const entry = s.tech.find((t) => t.id === finance.entryCourseId)!;
  entry.status = 'available';
  s.students.classes = { freshman: 1_000, sophomore: 0, junior: 0, senior: 0 };
  const demand = shortfallDemandFor(s, 'instruction');
  assert(demand !== null && demand.metric === 'seats', 'a crowded catalogue with a course to start raises the instruction shortfall');
  assert(demand!.askId === entry.id, 'and asks for the next course in a housed program');
  assert(demandSubject(demand!) === 'instruction', 'read as the instruction subject');
  assert(demand!.target === instructionCapacity(s) + SEATS_PER_COURSE, 'met at one more course\'s seats');
  assert(!demandProgress(s, demand!).met, 'not met yet');
  entry.status = 'done';
  assert(demandProgress(s, demand!).met, 'developing it meets the demand');
}

// ---- word of mouth, wider ----
{
  const high = projectAdmissions(60, 20_000, 0, 100);
  const low = projectAdmissions(60, 20_000, 0, 0);
  assert(near(high.wordOfMouthMultiplier, 1.6) && near(low.wordOfMouthMultiplier, 0.4), `±0.60: ${high.wordOfMouthMultiplier} and ${low.wordOfMouthMultiplier}`);
}

console.log(`consequences: ${checks} checks, ${failures} failures`);
if (failures > 0) process.exit(1);
