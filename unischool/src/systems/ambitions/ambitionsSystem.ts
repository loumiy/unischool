import type { GameState } from '../../state/types';
import { AMBITIONS } from '../../data/ambitionsData';

// ---------------------------------------------------------------------
// The ambitions pass. Registered in reducer.ts's SYSTEMS after tickRivals
// (so a rank read here is this week's) and before tickEvents (so the log
// line lands before any interrupt claims the week).
//
// Checked weekly rather than on the milestone pass, since ranks, prizes,
// enrolment and endowment are not things a course finishing reports. The
// fiftieth-summer pair (data/ambitionsData.ts) reads true on the week the
// final report renders.
//
// Written once, never revoked: a school that falls out of the top ten keeps
// the year it got there. No RNG, so the sim's stream is untouched.
// ---------------------------------------------------------------------
export function tickAmbitions(s: GameState): void {
  for (const ambition of AMBITIONS) {
    if (s.ambitions[ambition.id] !== undefined) continue;
    if (!ambition.reached(s)) continue;
    s.ambitions[ambition.id] = s.clock.year;
    s.log.unshift({
      year: s.clock.year,
      week: s.clock.week,
      message: `Ambition reached: ${ambition.name}.`,
      kind: 'good',
      topic: 'ambition',
      subject: ambition.id,
    });
  }
}
