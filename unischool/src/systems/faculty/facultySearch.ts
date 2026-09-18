import type { GameState } from '../../state/types';
import { FACULTY_FIELDS, generateCandidate } from '../../data/facultyData';
import { weeksOfOpEx } from '../../data/moneyScale';

// ---------------------------------------------------------------------
// THE SEARCH (Plan 14's PR H). Every course needs a deliberate instructor,
// and the candidate market lists somebody in a thin field — Clinical
// Health, AI, Neuroscience — every few months. That makes HIRING, not
// cash, the thing a run stalls on, which is the pressure the review asked
// for, and a wall if the player can only wait it out.
//
// POST_SEARCH { field } spends money to raise the weekly probability that
// a candidate in a named field is listed, for a fixed window. It rides
// facultySystem.ts's existing tickCandidatePool rather than inventing a
// second market: a search's listing is an ordinary candidate, on the
// ordinary market, who withdraws after the ordinary CANDIDATE_LISTING_WEEKS
// if nobody appoints them. Surfaced where the shortage is felt — the
// instructor picker when no one is eligible, the hall panel's course
// strip, and the Faculty board per short department.
//
// It is also the recurring MONEY SINK the mid-game needs: a cost that
// scales with the size of the operation (weeks of opex, like every event
// in eventData.ts) and produces people rather than a bigger number. Every
// constant here is provisional, fitted in Plan 15's PR G.
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

// One week of every running search: a roll for a listing in its field,
// and the window closing. Called from tickCandidatePool, after the
// ordinary arrivals, so a search's listing is on top of the market's own
// churn rather than in place of it. One global draw per running search
// per week — the balance sim's seeded stream moves only when a search is
// actually running, which is the same discipline every other roll keeps.
export function tickSearches(s: GameState): void {
  for (const field of Object.keys(s.searches)) {
    if (Math.random() < SEARCH_LISTING_CHANCE) {
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
