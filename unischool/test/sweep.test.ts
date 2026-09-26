// Idle cash and the endowment (Plan 70D, src/systems/finance/sweep.ts):
//   - the board writes once cash has sat above a year of expenses for a
//     full year with no sweep set, and again at most once a decade;
//   - its ask stands on the next-step line until a sweep is set;
//   - the standing sweep moves cash above its reserve into the endowment at
//     each quarter's close, never past Financial strength's full mark;
//   - SET_SWEEP takes only the steps, and setting one puts the letter away;
//   - grants are scaled per depth (researchData.ts's GRANT_DEPTH_SCALE).

import { createInitialState } from '../src/state/actions';
import { reducer } from '../src/engine/reducer';
import { bindScriptStream } from '../src/engine/random';
import type { GameState } from '../src/state/types';
import { totalEnrolled, WEEKS_PER_YEAR } from '../src/state/types';
import {
  IDLE_CASH_AGAIN_LETTER, IDLE_CASH_LETTER, SWEEP_DEFAULT_WEEKS, fullMarkEndowment, idleCashAsk, sweepAmount, tickSweep,
} from '../src/systems/finance/sweep';
import { FINANCIAL_FULL_PER_STUDENT, selfFinancial } from '../src/systems/rivals/rivalsSystem';
import { nextStep } from '../src/systems/guidance/nextStep';
import { GRANT_DEPTH_SCALE, INITIATIVE_DEPTHS, rollGrantAmount } from '../src/data/researchData';

bindScriptStream(7070);

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('sweep tests');

const OPEX = 1_000_000;

// A college with opex fixed at OPEX a week and `weeksOfCash` of it in the
// bank, at the given week of the given year.
function college(weeksOfCash: number): GameState {
  const s = createInitialState('Sweep');
  s.finance.weeklyOpEx = OPEX;
  s.finance.cash = weeksOfCash * OPEX;
  s.finance.endowment = 0;
  return s;
}

// Steps the clock a week at a time and runs the sweep's weekly tick, the
// cash held where it is.
function weeks(s: GameState, n: number): void {
  for (let i = 0; i < n; i += 1) {
    s.clock.week += 1;
    if (s.clock.week > WEEKS_PER_YEAR) { s.clock.week = 1; s.clock.year += 1; }
    tickSweep(s);
  }
}

// ---- The board's letter ----
{
  const s = college(60);
  weeks(s, 51);
  assert(!(s.finance.distress?.letters ?? []).includes(IDLE_CASH_LETTER), 'no letter before a full year idle');
  weeks(s, 2);
  assert((s.finance.distress?.letters ?? []).includes(IDLE_CASH_LETTER), 'the board writes after a year above a year of expenses');
  assert(idleCashAsk(s), 'and its ask stands');
  const step = nextStep(s);
  assert(step?.intent?.kind === 'sweep', `the next-step line carries the ask (${step?.intent?.kind})`);

  // Dismissed, it does not come back for a decade.
  const read = reducer(s, { type: 'READ_BOARD_LETTER' });
  weeks(read, WEEKS_PER_YEAR * 9);
  assert(!(read.finance.distress?.letters ?? []).length, 'no reminder within the decade');
  weeks(read, WEEKS_PER_YEAR * 1 + 2);
  assert((read.finance.distress?.letters ?? []).includes(IDLE_CASH_AGAIN_LETTER), 'a reminder after a decade');

  // Setting the sweep answers it.
  const set = reducer(s, { type: 'SET_SWEEP', weeks: SWEEP_DEFAULT_WEEKS });
  assert(set.finance.sweepWeeks === SWEEP_DEFAULT_WEEKS, 'the letter\'s answer sets the default sweep');
  assert(!(set.finance.distress?.letters ?? []).includes(IDLE_CASH_LETTER), 'and puts the letter away');
  assert(!idleCashAsk(set), 'and the ask no longer stands');
}
{
  const s = college(40);
  weeks(s, WEEKS_PER_YEAR * 2);
  assert(!(s.finance.distress?.letters ?? []).length, 'cash under a year of expenses never draws the letter');
}

// ---- SET_SWEEP takes only the steps ----
{
  const s = college(10);
  assert(reducer(s, { type: 'SET_SWEEP', weeks: 20 }) === s, 'a sweep off the steps is refused');
  const on = reducer(s, { type: 'SET_SWEEP', weeks: 13 });
  assert(on.finance.sweepWeeks === 13, 'a step is taken');
  assert(reducer(on, { type: 'SET_SWEEP', weeks: null }).finance.sweepWeeks === undefined, 'null turns it off');
}

// ---- The sweep itself ----
{
  const s = college(200);
  s.finance.sweepWeeks = 26;
  const full = fullMarkEndowment(s);
  assert(full === FINANCIAL_FULL_PER_STUDENT * totalEnrolled(s.students), 'the full mark is $80k a student');
  s.clock.week = 12;
  const expected = sweepAmount(s, 26);
  const cashBefore = s.finance.cash;
  weeks(s, 1);
  assert(s.clock.week === 13 && s.finance.endowment === expected && s.finance.cash === cashBefore - expected, `a quarter's close moves ${expected} into the endowment`);
  assert(s.finance.endowment <= full, 'never past the full mark');
  assert(s.finance.cash >= 26 * OPEX || s.finance.endowment === full, 'and keeps the reserve, unless the mark is reached first');
  weeks(s, 1);
  assert(s.finance.endowment === expected, 'nothing moves between quarters');

  // At the mark, nothing more moves; cash stays cash.
  s.finance.endowment = full;
  s.finance.cash = 500 * OPEX;
  s.clock.week = 25;
  weeks(s, 1);
  assert(s.finance.endowment === full && s.finance.cash === 500 * OPEX, 'at the full mark the sweep moves nothing');
  assert(Math.round(selfFinancial(s)) === 150, 'and Financial strength reads full');
  assert(!(s.finance.distress?.letters ?? []).length, 'no letter while a sweep is set');
}

// ---- Grants by depth ----
{
  const s = createInitialState('Grants');
  s.finance.weeklyOpEx = OPEX;
  const mean = (depth: 'pilot' | 'landmark') => {
    let t = 0;
    for (let i = 0; i < 400; i += 1) t += rollGrantAmount(s, depth);
    return t / 400;
  };
  const ratio = mean('pilot') / mean('landmark');
  const expected = GRANT_DEPTH_SCALE.pilot / GRANT_DEPTH_SCALE.landmark;
  assert(Math.abs(ratio / expected - 1) < 0.1, `a pilot's grant is ${expected.toFixed(1)}× a landmark's (${ratio.toFixed(1)}×)`);
  assert(INITIATIVE_DEPTHS.every((d) => GRANT_DEPTH_SCALE[d.key] > 0), 'every depth has a scale');
}

if (failures > 0) {
  console.error(`  ${failures} of ${checks} checks failed`);
  process.exit(1);
}
console.log(`  ✓ all ${checks} checks passed`);
