// ---------------------------------------------------------------------
// The summer report card (Plan 15's PR B — see prestigeSystem.ts's
// gradeYear and applyReportCard, and reducer.ts's RESOLVE_ADMISSIONS).
// Prestige is graded once a year and steps toward the grade by a share
// of the gap: a small one upward, a large one downward. This pins the
// asymmetry, that the climb is unblocked, that the year's accumulators
// are what the card reads and are reset after it, that the tremor between
// summers is a tremor, and that the penalty can take a school below what
// its curriculum earned.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { createInitialState } from '../src/state/actions';
import { reducer } from '../src/engine/reducer';
import { defaultAnswer } from '../src/engine/defaultAnswers';
import {
  applyReportCard, computePrestigeTarget, gradeYear, prestigeBreakdown,
  PRESTIGE_FALL_RATE, PRESTIGE_RISE_RATE, setPrestigeForPlaytest,
} from '../src/systems/prestige/prestigeSystem';
import { WEEKS_PER_YEAR } from '../src/state/types';
import type { GameState } from '../src/state/types';
import { bindScriptStream } from '../src/engine/random';

bindScriptStream(17);
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
  return createInitialState('Report Card');
}

// Plays until the summer decision is on screen, answering everything else
// with the harness's own defaults, then returns the state with it pending.
function toSummer(start: GameState): GameState {
  let s = start;
  for (let i = 0; i < WEEKS_PER_YEAR * 2; i += 1) {
    if (s.pendingInterrupt?.type === 'summer') return s;
    const answer = defaultAnswer(s);
    s = answer ? reducer(s, answer) : reducer(s, { type: 'TICK' });
  }
  throw new Error('no summer interrupt inside two years');
}

console.log('report card tests');

// ---- the step is asymmetric: slow up, fast down ----
{
  // A founding campus grades in the twenties — nothing built, and the
  // crowding penalty in full — so give it a school to its name first,
  // to keep thirty below the grade inside the band.
  const s = fresh();
  s.milestones['school-founded:Engineering'] = true;
  s.milestones['school-distinguished:Engineering'] = true;
  const target = computePrestigeTarget(s);
  assert(target - 30 > 5, `the grade sits high enough to test against (${target.toFixed(1)})`);

  setPrestigeForPlaytest(s, target - 30);
  const up = gradeYear(s);
  assert(near(up.score, target), 'the card grades the live target');
  assert(near(up.after - up.before, 30 * PRESTIGE_RISE_RATE), `thirty below its grade, a school climbs ${30 * PRESTIGE_RISE_RATE} (${(up.after - up.before).toFixed(2)})`);

  setPrestigeForPlaytest(s, target + 30);
  const down = gradeYear(s);
  assert(near(down.before - down.after, 30 * PRESTIGE_FALL_RATE), `thirty above it, it falls ${30 * PRESTIGE_FALL_RATE} (${(down.before - down.after).toFixed(2)})`);
  assert(PRESTIGE_FALL_RATE > PRESTIGE_RISE_RATE, 'falling is faster than climbing');
  // PR G fitted the pair to 0.20 and 0.30 (the plan opened at 0.12 and
  // 0.40): a slower rise left a school that built well still in the fifties
  // at year ten, and the steeper fall turned the found era's dips into
  // collapses.
  assert(near(PRESTIGE_RISE_RATE, 0.20) && near(PRESTIGE_FALL_RATE, 0.30), 'at the fitted rates');

  setPrestigeForPlaytest(s, target);
  const flat = gradeYear(s);
  assert(near(flat.after, flat.before), 'sitting at its grade, nothing moves');
}

// ---- the climb is unblocked: a school at a low standing with a good grade climbs every year ----
{
  const s = fresh();
  s.milestones['school-founded:Engineering'] = true;
  s.milestones['school-distinguished:Engineering'] = true;
  const target = computePrestigeTarget(s);
  setPrestigeForPlaytest(s, 20);
  assert(target > 40, `a school with something to its name grades well above 20 (${target.toFixed(1)})`);
  let last = s.self.reputation;
  for (let year = 1; year <= 10; year += 1) {
    applyReportCard(s, gradeYear(s));
    assert(s.self.reputation > last, `year ${year}: a low school with a good grade climbs (${last.toFixed(1)} -> ${s.self.reputation.toFixed(1)})`);
    last = s.self.reputation;
  }
  assert(target - s.self.reputation < (target - 20) * (1 - PRESTIGE_RISE_RATE) ** 10 + 1e-9, 'and closes the gap at the rise rate, undiminished');
}

// ---- the card carries a grade per input, keyed as the breakdown keys them ----
{
  const s = fresh();
  const card = gradeYear(s);
  const made = prestigeBreakdown(s);
  assert(made.inputs.every((i) => card.grades[i.key] !== undefined), 'every input is graded');
  assert(made.inputs.every((i) => near(card.grades[i.key], i.contribution)), 'at the contribution the breakdown shows');
  assert(Object.keys(card.grades).length === made.inputs.length, 'and nothing else is');
  assert(card.grades.crowding <= 0, 'the crowding grade is a subtraction');
}

// ---- the penalty can take a school below what its curriculum earned ----
{
  const s = fresh();
  s.students.crowdingYearSum = 0;
  s.students.crowdingYearWeeks = 0;
  const made = prestigeBreakdown(s);
  const crowding = made.inputs.find((i) => i.key === 'crowding')!;
  const earned = made.inputs.filter((i) => !i.penalty).reduce((sum, i) => sum + i.contribution, made.baseline);
  assert(crowding.contribution < 0, 'a founding campus with nothing built is crowded');
  assert(made.target < earned, `and its target sits below what its inputs earned (${made.target.toFixed(1)} < ${earned.toFixed(1)})`);
  assert(near(made.target, Math.max(made.min, earned + crowding.contribution)), 'by exactly the penalty');
}

// ---- the weight budget ----
{
  const s = fresh();
  const made = prestigeBreakdown(s);
  const weight = (key: string) => made.inputs.find((i) => i.key === key)!.weight;
  assert(weight('breadth') === 50 && weight('concentration') === 30, 'breadth gave thirty of its ninety to concentration');
  assert(weight('welfare') === 20 && weight('crowding') === 25, 'welfare at twenty, crowding up to twenty-five');
  assert(weight('campus') === 12 && weight('endowment') === 8, 'campus life restored to twelve (Plan 21 PR B); endowment cut to eight');
  assert(weight('teaching') === 30 && weight('students') === 24 && weight('research') === 22, 'teaching, students and research unchanged');
  const ceiling = made.inputs.filter((i) => !i.penalty).reduce((sum, i) => sum + i.weight, made.baseline);
  assert(ceiling >= made.max, `every input at its cap still reaches the top of the band (${ceiling} >= ${made.max})`);
}

// ---- the summer, through the reducer ----
{
  const start = fresh();
  assert(start.self.reportCard === null, 'no summer has graded a founding school');
  const atSummer = toSummer(start);
  assert(atSummer.students.crowdingYearWeeks > 0, 'the crowding accumulator has a year in it by the summer');
  assert(atSummer.students.satisfactionYearWeeks === atSummer.students.crowdingYearWeeks, 'ticked in step with the satisfaction accumulator');
  const expected = gradeYear(atSummer);
  const before = atSummer.self.reputation;
  // The summer is four beats (Plan 16's PR A), answered one per call by the
  // shared defaults; the card is written by the last.
  let s = atSummer;
  for (let i = 0; i < 6 && s.pendingInterrupt?.type === 'summer'; i += 1) s = reducer(s, defaultAnswer(s)!);
  assert(s.pendingInterrupt === null, 'the defaults walk the whole summer');
  assert(s.self.reportCard !== null, 'the summer writes the card');
  assert(near(s.self.reportCard!.score, expected.score), 'graded on the state before the funnel ran');
  assert(near(s.self.reportCard!.before, before), 'from the prestige the summer opened at');
  assert(near(s.self.reputation, expected.after), 'and prestige stepped to the card\'s figure');
  assert(s.students.crowdingYearWeeks === 0 && s.students.crowdingYearSum === 0, 'the crowding accumulator is reset for the new year');
  assert(s.history[s.history.length - 1].prestige === s.self.reputation, 'the year\'s snapshot records the stepped standing');
  assert(s.log.some((l) => l.message.startsWith('Report card for year')), 'and the log says so');
  const made = prestigeBreakdown(s);
  assert(made.summer?.reportCard === s.self.reportCard, 'the breakdown carries the card for the panel');
  assert(near(made.summer!.riseRate, PRESTIGE_RISE_RATE) && near(made.summer!.fallRate, PRESTIGE_FALL_RATE), 'and both rates');
}

// ---- between summers, a tremor ----
{
  const s = fresh();
  const target = computePrestigeTarget(s);
  setPrestigeForPlaytest(s, target - 40);
  const before = s.self.reputation;
  const s1 = reducer(s, { type: 'TICK' });
  const moved = s1.self.reputation - before;
  assert(moved > 0 && moved < 0.05, `a week forty below its target moves prestige by a tremor (${moved.toFixed(4)})`);
  assert(s1.students.crowdingYearWeeks === 1, 'and feeds the crowding accumulator one week');
}

console.log(`report card: ${checks} checks, ${failures} failures`);
if (failures > 0) process.exit(1);
