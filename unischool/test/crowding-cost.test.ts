// ---------------------------------------------------------------------
// What crowding costs prestige, said where it is decided (Plan 95P, the
// second review's B3-5): the admissions decision projects the grade's
// crowding term for the class it would admit, and NEXT names a need under
// the grace before the shortfall reading does.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { teachingCollege } from './fixtures/teaching';
import { reducer } from '../src/engine/reducer';
import { defaultAnswer } from '../src/engine/defaultAnswers';
import { projectAdmissions, trailingYearSatisfaction } from '../src/systems/admissions/admissionsSystem';
import { projectConsequences } from '../src/systems/admissions/consequences';
import { deriveCohortSignals } from '../src/systems/admissions/cohorts';
import { intakeCeiling } from '../src/systems/techtree/instructionCapacity';
import { CROWDING_GRACE, prestigeBreakdown } from '../src/systems/prestige/prestigeSystem';
import { attributeCoverage } from '../src/systems/satisfaction/satisfactionSystem';
import { nextStep } from '../src/systems/guidance/nextStep';
import { STARTING_DORM_CAPACITY, STARTING_DORM_ID } from '../src/data/campusData';
import { FOUNDING_PROGRAMS } from '../src/data/foundingData';
import { programById } from '../src/data/techData';
import { WEEKS_PER_YEAR, totalEnrolled } from '../src/state/types';
import type { GameState } from '../src/state/types';
import { bindScriptStream } from '../src/engine/random';

bindScriptStream(95);
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

function toSummer(start: GameState): GameState {
  let s = start;
  for (let i = 0; i < WEEKS_PER_YEAR * 2; i += 1) {
    if (s.pendingInterrupt?.type === 'summer') return s;
    const answer = defaultAnswer(s);
    s = answer ? reducer(s, answer) : reducer(s, { type: 'TICK' });
  }
  throw new Error('no summer interrupt inside two years');
}

// The founding residence hall and dining hall standing: 350 beds and
// dining for 350, as the review's college had at its second summer.
function foundingHalls(s: GameState): GameState {
  s.tech.find((t) => t.id === STARTING_DORM_ID)!.status = 'done';
  s.students.capacity = STARTING_DORM_CAPACITY;
  s.tech.find((t) => t.id === 'DINING-01')!.status = 'done';
  return s;
}

console.log('crowding cost tests');

// ---- the projection is the grade's term once the class enrols ----
// The review's Year 2 (B3-5): a class of 603 made 982 students for 350
// beds and dining for 350, and crowding cost 14.5 of the grade (dining
// 36%). Built here directly: the founding halls, a catalog that seats the
// class, 379 staying on through a good year, and the admit rate that makes
// 603.
{
  const atSummer = toSummer(foundingHalls(teachingCollege('Crowded')));
  atSummer.students.satisfactionYearSum = 70 * 40;
  atSummer.students.satisfactionYearWeeks = 40;
  // A catalog of the review's size: each founding program's courses taught
  // by the professor who teaches its first.
  for (const id of FOUNDING_PROGRAMS) {
    const courses = programById(id)!.courseIds;
    for (const c of courses.slice(0, 5)) {
      atSummer.tech.find((t) => t.id === c)!.status = 'done';
      atSummer.courseFaculty[c] = atSummer.courseFaculty[courses[0]];
    }
  }
  // The staying classes, as many as the review's 982 leaves beside its 603.
  atSummer.students.classes = { freshman: 126, sophomore: 126, junior: 127, senior: atSummer.students.classes.senior };
  // The admit rate that makes the review's class of 603.
  const funnel = (rate: number) => projectAdmissions(
    atSummer.self.reputation, atSummer.finance.listedTuition, atSummer.students.capacity, trailingYearSatisfaction(atSummer),
    deriveCohortSignals(atSummer), rate, intakeCeiling(atSummer).seatsLeft,
  );
  const admitRate = 603 / funnel(1).applicants;
  const outcome = funnel(admitRate);
  const projected = projectConsequences(atSummer, outcome.enrolled, atSummer.finance.listedTuition, outcome.avgIncomingQuality);
  console.log(`    a class of ${outcome.enrolled}: ${projected.totalEnrolled} students for ${atSummer.students.capacity} beds; crowding −${projected.crowding.toFixed(1)} (${projected.crowdingWorst.label} ${(projected.crowdingWorst.coverage * 100).toFixed(0)}%)`);
  assert(outcome.enrolled === 603 && projected.totalEnrolled === 982, 'the review\'s class and body');
  assert(projected.crowding > 0 && projected.crowdingWorst.coverage < CROWDING_GRACE,
    `the projection shows crowding: ${projected.crowding.toFixed(1)} (${projected.crowdingWorst.label} ${(projected.crowdingWorst.coverage * 100).toFixed(0)}%)`);
  assert(projected.crowdingWorst.label === 'dining', `dining is the worst, as in the review (${projected.crowdingWorst.label})`);

  const s = reducer(atSummer, { type: 'RESOLVE_ADMISSIONS', tuition: atSummer.finance.listedTuition, admitRate, approvedPetitionIds: [] });
  assert(totalEnrolled(s.students) === projected.totalEnrolled, `the body committed is the body projected (${totalEnrolled(s.students)})`);
  const term = prestigeBreakdown(s).inputs.find((i) => i.key === 'crowding')!;
  assert(Math.abs(-term.contribution - projected.crowding) < 1e-9,
    `the projection equals the grade's crowding term after the class enrols (${projected.crowding.toFixed(2)} vs ${(-term.contribution).toFixed(2)})`);
  assert(Math.abs(attributeCoverage(s, 'basicNeeds') - projected.crowdingWorst.coverage) < 1e-9, 'and names the coverage the grade reads');

  // A smaller class crowds less: the figure moves with the admit rate.
  const fewer = projectConsequences(atSummer, Math.round(outcome.enrolled / 4), atSummer.finance.listedTuition, outcome.avgIncomingQuality);
  assert(fewer.crowding < projected.crowding, `a smaller class costs less (${fewer.crowding.toFixed(1)})`);

  // A body every hall covers costs nothing, and the decision shows nothing.
  atSummer.students.classes = { freshman: 50, sophomore: 50, junior: 50, senior: atSummer.students.classes.senior };
  const roomy = projectConsequences(atSummer, 50, atSummer.finance.listedTuition, outcome.avgIncomingQuality);
  assert(roomy.crowding === 0, `nothing while every coverage is ${CROWDING_GRACE * 100}% or better (${roomy.crowding})`);
}

// ---- NEXT: crowding speaks under the grace, not at it ----
// A hundred students and a dining hall that feeds 84 or 86 of them. Nothing
// else is short and nothing earlier on the line speaks, so NEXT is crowding
// or what follows it.
{
  const base = foundingHalls(teachingCollege('Next'));
  base.events.opening.skipped = true;
  base.clock.year = 2;
  base.programOffers = [];
  base.students.classes = { freshman: 25, sophomore: 25, junior: 25, senior: 25 };
  const at = (coverage: number) => {
    const s = structuredClone(base);
    s.tech.find((t) => t.id === 'DINING-01')!.effects!.servesPopulation = Math.round(100 * coverage);
    return s;
  };

  const under = at(0.84);
  assert(Math.abs(attributeCoverage(under, 'basicNeeds') - 0.84) < 0.005, `dining reads 84% (${attributeCoverage(under, 'basicNeeds')})`);
  const step = nextStep(under);
  console.log('    at 84%:', step?.text);
  assert(step?.text === 'Dining at 84%; a dining hall would raise it', `crowding speaks under the grace (${step?.text})`);
  assert(step?.go === 'build', 'and opens the build menu');

  const over = at(0.86);
  const quiet = nextStep(over);
  console.log('    at 86%:', quiet?.text);
  assert(!quiet?.text.includes('Dining at'), `at 86% it is quiet (${quiet?.text})`);

  // The line carries the intent of the reading it stands before, so the
  // guided player does what it did without it (a line, not an intent).
  assert(JSON.stringify(step?.intent) === JSON.stringify(quiet?.intent), 'the guided player\'s intent is the one the line stands before');

  // A dining hall going up: the line names it and when it opens.
  const building = at(0.84);
  const next = building.tech.find((t) => t.id !== 'DINING-01' && t.effects?.satisfactionAttribute === 'basicNeeds' && t.kind !== 'dorm')!;
  next.status = 'developing';
  building.developing[next.id] = 9;
  const named = nextStep(building);
  console.log('    going up:', named?.text);
  assert(named?.text === `Dining at 84%; ${next.name} opens in 9 weeks`, `it names the building going up (${named?.text})`);
  assert(named?.go === 'hall' && named.hallId === next.id, 'and opens its site');

  // Then it is only something to know: a step the player can act on (an
  // idle lab) speaks first (Plan 95O's rule).
  const lab = building.tech.find((t) => t.facilityType === 'lab')!;
  lab.status = 'done';
  assert(nextStep(building)?.intent?.kind === 'research', `it gives way to a step that can be taken (${nextStep(building)?.text})`);
  building.tech.find((t) => t.id === next.id)!.status = 'available';
  assert(nextStep(building)?.text.startsWith('Dining at 84%') === true && nextStep(building)?.intent?.kind === 'research',
    'with nothing going up, crowding speaks first and the guided player keeps the lab\'s intent');
}

if (failures > 0) {
  console.error(`crowding cost: ${failures} of ${checks} checks failed`);
  process.exit(1);
}
console.log(`  ${checks} checks passed`);
