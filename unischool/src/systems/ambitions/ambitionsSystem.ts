import type { GameState } from '../../state/types';
import { AMBITIONS } from '../../data/ambitionsData';

// ---------------------------------------------------------------------
// The ambitions pass (Plan 17's PR A). One ordinary pure tick, registered
// in reducer.ts's SYSTEMS after tickRivals — so a rank read here is this
// week's, after the field has drifted — and before tickEvents, so the
// week's log line lands before any interrupt claims the week.
//
// WEEKLY, not on the milestone pass. Plan 17 sketched detection inside
// tickTech's milestone pass plus a hook at the summer boundary, and half
// the list would never have been seen there: a rank, a prize, ten
// thousand students and a billion in the endowment are none of them
// things a course finishing tells you about. Twenty predicates over state
// the game already keeps cost nothing a week, and the fiftieth-summer
// pair (data/ambitionsData.ts) simply read true on the one week the
// summer holds the clock on year fifty — which is the week the final
// report renders, so it shows them reached.
//
// Written once, never revoked: an ambition already in s.ambitions is
// skipped, so a school that falls out of the top ten keeps the year it
// got there. No RNG, so the sim's stream is untouched.
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
