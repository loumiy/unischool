import { WEEKS_PER_YEAR, type GameState } from './types';

// Turns the calendar page: one week on, and a new year after the last week.
export function advanceClock(s: GameState): void {
  s.clock.week += 1;
  if (s.clock.week > WEEKS_PER_YEAR) {
    s.clock.week = 1;
    s.clock.year += 1;
  }
}
