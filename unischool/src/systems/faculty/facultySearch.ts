import type { GameState } from '../../state/types';
import { FACULTY_FIELDS, generateCandidate } from '../../data/facultyData';
import { weeksOfOpEx } from '../../data/moneyScale';
import { random } from '../../engine/random';

// ---------------------------------------------------------------------
// Faculty searches. The candidate market lists somebody in a thin field only
// every few months, which makes hiring the thing a run stalls on. A search
// (POST_SEARCH) spends money to raise the weekly chance of a listing in one
// field for SEARCH_WEEKS. Its finds are ordinary candidates on the ordinary
// market (facultySystem.ts's tickCandidatePool) and withdraw after
// CANDIDATE_LISTING_WEEKS like anyone else. The cost scales with opex, so it
// doubles as a recurring mid-game money sink. Constants are provisional.
// ---------------------------------------------------------------------

export const SEARCH_WEEKS = 26;              // how long a posted search runs
export const SEARCH_COST_WEEKS = 2;          // its price, in weeks of operating expense (floored — see moneyScale.ts)
export const SEARCH_LISTING_CHANCE = 0.25;   // per week, that the search turns somebody up

export function searchCost(s: GameState): number {
  return weeksOfOpEx(s, SEARCH_COST_WEEKS);
}

// Weeks left on a search in this field, or 0.
export function searchWeeksLeft(s: GameState, field: string): number {
  return s.searches[field] ?? 0;
}

export function canPostSearch(s: GameState, field: string): boolean {
  if (!FACULTY_FIELDS.includes(field)) return false;
  if (searchWeeksLeft(s, field) > 0) return false;
  return s.finance.cash >= searchCost(s);
}

export function postSearch(s: GameState, field: string): void {
  if (!canPostSearch(s, field)) return;
  s.finance.cash -= searchCost(s);
  s.searches[field] = SEARCH_WEEKS;
  s.log.unshift({
    year: s.clock.year, week: s.clock.week,
    message: `A search is posted in ${field}: ${SEARCH_WEEKS} weeks of advertising, headhunting and conference visits.`,
    kind: 'info',
  });
}

// One week of every running search: a roll for a listing, then the window
// closes by a week. Called from tickCandidatePool after the ordinary
// arrivals. One global draw per running search per week, so the seeded
// stream moves only while a search runs.
export function tickSearches(s: GameState): void {
  for (const field of Object.keys(s.searches)) {
    if (random() < SEARCH_LISTING_CHANCE) {
      const existingNames = [...s.faculty, ...s.candidates].map((f) => f.name);
      const found = generateCandidate(field, existingNames);
      s.candidates.push(found);
      s.log.unshift({
        year: s.clock.year, week: s.clock.week,
        message: `The ${field} search has turned up ${found.name} — listed on the market now.`,
        topic: 'candidate',
        subject: found.id,
        kind: 'good',
      });
    }
    const left = s.searches[field] - 1;
    if (left <= 0) {
      delete s.searches[field];
      s.log.unshift({
        year: s.clock.year, week: s.clock.week,
        message: `The ${field} search has closed.`,
        kind: 'info',
      });
    } else {
      s.searches[field] = left;
    }
  }
}
