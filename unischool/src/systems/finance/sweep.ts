import type { GameState } from '../../state/types';
import { WEEKS_PER_YEAR } from '../../state/types';
import { foundingDistress } from './distress';
import { moveToEndowment, roundDown, TRANSFER_MINIMUM } from './treasury';
import { money } from '../../format';
import { FINANCIAL_FULL_PER_STUDENT } from '../rivals/rivalsSystem';
import { totalEnrolled } from '../../state/types';

// Idle cash and the endowment (Plan 70D). Cash earns nothing and counts for
// nothing in Financial strength (rivalsSystem.ts's selfFinancial reads the
// endowment per student), so a college that never moves money in is graded F
// however rich it is. Two things answer that, and the endowment stays the
// player's choice:
//   - a standing sweep (the Treasury): keep N weeks of expenses in cash and
//     move the rest into the endowment, each quarter, until the endowment
//     reaches Financial strength's full mark. Off until set. The cap is the
//     owner's call (Plan 70D): uncapped, swept cash compounded (its payout
//     came back as income and was swept again), and the natural line's
//     endowment reached $80B and its weekly net $80M by year 50.
//   - the board's letter, the first time cash has sat above a year of
//     expenses for a full year with no sweep set; its ask (the next-step
//     line, and the letter's own button) sets the sweep at
//     SWEEP_DEFAULT_WEEKS. A reminder comes at most once a decade after.

export const SWEEP_STEPS: readonly number[] = [13, 26, 52];
export const SWEEP_DEFAULT_WEEKS = 26;
// The sweep runs at each quarter's close.
const SWEEP_EVERY_WEEKS = 13;
// Idle: cash above this many weeks of expenses...
export const IDLE_CASH_WEEKS = 52;
// ...for this long.
const IDLE_FOR_WEEKS = 52;
const IDLE_REMINDER_YEARS = 10;

export const IDLE_CASH_LETTER = 'idle-cash';
export const IDLE_CASH_AGAIN_LETTER = 'idle-cash-again';

export function isSweepStep(weeks: unknown): weeks is number {
  return typeof weeks === 'number' && SWEEP_STEPS.includes(weeks);
}

export function sweepWeeksOf(s: GameState): number | null {
  return isSweepStep(s.finance.sweepWeeks) ? s.finance.sweepWeeks : null;
}

// The endowment at Financial strength's full mark, for today's students.
export function fullMarkEndowment(s: GameState): number {
  return FINANCIAL_FULL_PER_STUDENT * totalEnrolled(s.students);
}

// What the sweep would move now: the cash above its reserve, no more than
// the endowment lacks of its full mark, rounded down; nothing under the
// Treasury's transfer minimum.
export function sweepAmount(s: GameState, weeks: number): number {
  const above = s.finance.cash - weeks * s.finance.weeklyOpEx;
  const room = fullMarkEndowment(s) - s.finance.endowment;
  const amount = roundDown(Math.min(above, room));
  return amount >= TRANSFER_MINIMUM ? amount : 0;
}

// The board's ask stands: it has written about idle cash, no sweep is set,
// and the cash is still idle.
export function idleCashAsk(s: GameState): boolean {
  return s.finance.idleLetterYear !== undefined && sweepWeeksOf(s) === null && s.finance.idleSince !== undefined;
}

// Weekly, after the cash flow settles (financeSystem.ts's tickFinance).
export function tickSweep(s: GameState): void {
  const weeks = sweepWeeksOf(s);
  if (weeks !== null && s.clock.week % SWEEP_EVERY_WEEKS === 0) {
    const amount = sweepAmount(s, weeks);
    if (amount > 0 && moveToEndowment(s, amount)) {
      s.log.unshift({ year: s.clock.year, week: s.clock.week, message: `The standing sweep moved ${money(amount)} into the endowment.`, kind: 'info', topic: 'money' });
    }
  }

  // The watch on idle cash: only while no sweep is set.
  const idle = weeks === null && s.finance.weeklyOpEx > 0 && s.finance.cash > IDLE_CASH_WEEKS * s.finance.weeklyOpEx;
  if (!idle) {
    delete s.finance.idleSince;
    return;
  }
  const now = (s.clock.year - 1) * WEEKS_PER_YEAR + s.clock.week;
  s.finance.idleSince ??= now;
  if (now - s.finance.idleSince < IDLE_FOR_WEEKS) return;
  const last = s.finance.idleLetterYear;
  if (last !== undefined && s.clock.year - last < IDLE_REMINDER_YEARS) return;
  const distress = (s.finance.distress ??= foundingDistress());
  distress.letters.push(last === undefined ? IDLE_CASH_LETTER : IDLE_CASH_AGAIN_LETTER);
  s.finance.idleLetterYear = s.clock.year;
}
