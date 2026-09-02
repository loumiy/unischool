import type { GameState } from '../state/types';

// ---------------------------------------------------------------------
// MONEY, EXPRESSED IN WEEKS OF OPERATING COST.
//
// A run spans four orders of magnitude of budget (see financeSystem.ts's
// stage table: ~$45k a week at founding, ~$7.5M a week late), so any
// authored figure written in dollars is either a crisis in year 3 or a
// rounding error in year 40. Content therefore sizes itself in WEEKS OF
// OPEX and converts here — the decision-event table (eventData.ts) and the
// student-organisation layer (studentLifeData.ts) both do, and both mean
// the same thing by "1.5 weeks of opex".
//
// This lives in its own module rather than in either of them because both
// need it and neither may import the other: eventData.ts authors the Greek
// events, which read student-life state, so the dependency there already
// runs one way.
// ---------------------------------------------------------------------

// Floor on the scale, so the very first eligible year still produces sane
// figures rather than scaling off a near-empty budget.
export const MIN_OPEX_SCALE = 45_000;

export function weeksOfOpEx(s: GameState, weeks: number): number {
  return Math.round(Math.max(s.finance.weeklyOpEx, MIN_OPEX_SCALE) * weeks);
}

// A rolled figure is fixed at the moment the content that needs it fires,
// and carried from there — never re-rolled at resolve time, so the number
// shown is the number applied.
export function rollAmount(s: GameState, minWeeks: number, maxWeeks: number): number {
  return weeksOfOpEx(s, minWeeks + Math.random() * (maxWeeks - minWeeks));
}

export function money(n: number): string {
  return `$${Math.round(n).toLocaleString()}`;
}
