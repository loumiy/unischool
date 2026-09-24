import type { GameState } from '../state/types';
import { random } from '../engine/random';

// ---------------------------------------------------------------------
// Money expressed in weeks of operating cost. Budgets span four orders of
// magnitude over a run (~$45k/week at founding, ~$7.5M late), so content
// (eventData.ts, studentLifeData.ts) sizes costs in weeks of opex and
// converts here. Its own module because neither of those may import the
// other.
// ---------------------------------------------------------------------

// Floor, so the first eligible year doesn't scale off a near-empty budget.
export const MIN_OPEX_SCALE = 45_000;

export function weeksOfOpEx(s: GameState, weeks: number): number {
  return Math.round(Math.max(s.finance.weeklyOpEx, MIN_OPEX_SCALE) * weeks);
}

// Rolled once when the content fires and carried, never re-rolled at
// resolve, so the number shown is the number applied.
export function rollAmount(s: GameState, minWeeks: number, maxWeeks: number): number {
  return weeksOfOpEx(s, minWeeks + random() * (maxWeeks - minWeeks));
}

