import type { GameState } from '../../state/types';
import { WEEKS_PER_YEAR } from '../../state/types';
import { gradeYear } from '../prestige/prestigeSystem';
import { rankBy } from '../rivals/rivalsSystem';
import { officeStrength } from './offices';

// ---------------------------------------------------------------------
// The Office of Institutional Research (Plan 89E): where the summer's
// grade would leave the college in the guide, were the year graded today.
// The History tab already says what the year is grading toward; what the
// college cannot see is the rank that grade buys against the field, and
// that is what this office reads. The rivals are taken as they stand (they
// move at the summer too), so it is a forecast, not a promise.
//
// From the spring term; with the Provost seated, all year.
// ---------------------------------------------------------------------

export interface RankForecast {
  prestige: number;   // the graded figure: gradeYear's `after`
  rank: number;       // where it would stand
  now: number;        // where the college stands today
}

export function rankForecast(s: GameState): RankForecast | null {
  const k = officeStrength(s, 'institutional-research');
  if (k <= 0) return null;
  const spring = s.clock.week > WEEKS_PER_YEAR / 2;
  if (!spring && k <= 1) return null;
  const prestige = gradeYear(s).after;
  const graded: GameState = { ...s, self: { ...s.self, reputation: prestige } };
  return { prestige, rank: rankBy(graded, 'reputation'), now: rankBy(s, 'reputation') };
}
