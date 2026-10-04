import type { GameState } from '../../state/types';
import {
  ADMISSIONS_RANGE_HALF_WIDTH, ALUMNI_CAMPAIGN_LIFT, ALUMNI_GIVING_LIFT, CHARTER_INTERVAL_WEEKS,
  COUNSELING_COOLDOWN_LIFT, COUNSELING_DEADLINE_LIFT, FACILITIES_DAMAGE_CUT, FACILITIES_PAYDOWN_LIFT,
  RECRUITMENT_LISTING_EXTRA_WEEKS, RECRUITMENT_POOL_EXTRA,
} from '../../data/officeData';
import { CANDIDATE_LISTING_WEEKS, CANDIDATE_POOL_TARGET } from '../../data/facultyData';
import { DEMAND_COOLDOWN_WEEKS, DEMAND_DEADLINE_WEEKS } from '../../data/demandData';
import { officeStrength } from './offices';

// ---------------------------------------------------------------------
// WHAT THE OFFICES DO (Plan 89E), as readings the systems call at their
// levers. Each is neutral with its office closed (strength 0), so a
// college without the office plays exactly as before, and none draws on
// the random stream. The enrolment pulls are in cohorts.ts (through
// CohortSignals), the committee seat in techSystem.ts and the grants in
// researchSystem.ts, beside the levers they move; the two new actions
// (a club chartered, a team founded) are in officeActions.ts.
// ---------------------------------------------------------------------

// Office of Faculty Recruitment: the market holds more candidates, and a
// listing stays longer.
export function candidatePoolTarget(s: GameState): number {
  return CANDIDATE_POOL_TARGET + Math.round(RECRUITMENT_POOL_EXTRA * officeStrength(s, 'faculty-recruitment'));
}
export function candidateListingWeeks(s: GameState): number {
  return CANDIDATE_LISTING_WEEKS + Math.round(RECRUITMENT_LISTING_EXTRA_WEEKS * officeStrength(s, 'faculty-recruitment'));
}

// Counseling & Wellness: a longer gap between demands, and longer to meet
// one.
export function demandCooldownWeeks(s: GameState): number {
  return Math.round(DEMAND_COOLDOWN_WEEKS * (1 + COUNSELING_COOLDOWN_LIFT * officeStrength(s, 'counseling')));
}
export function demandDeadlineWeeks(s: GameState): number {
  return Math.round(DEMAND_DEADLINE_WEEKS * (1 + COUNSELING_DEADLINE_LIFT * officeStrength(s, 'counseling')));
}

// Facilities Management: the backlog paid down faster at full funding, and
// an event's damage smaller.
export function paydownFactor(s: GameState): number {
  return 1 + FACILITIES_PAYDOWN_LIFT * officeStrength(s, 'facilities-management');
}
export function eventDamageFactor(s: GameState): number {
  return Math.max(0, 1 - FACILITIES_DAMAGE_CUT * officeStrength(s, 'facilities-management'));
}

// Alumni Relations: the year's giving, and what a campaign brings in.
export function givingFactor(s: GameState): number {
  return 1 + ALUMNI_GIVING_LIFT * officeStrength(s, 'alumni-relations');
}
export function campaignFactor(s: GameState): number {
  return 1 + ALUMNI_CAMPAIGN_LIFT * officeStrength(s, 'alumni-relations');
}

// Admissions Office: the range the summer's pool will fall in, around the
// projection at a price, before the price is set; narrower with the seat.
// Null without the office.
export function admissionsRange(s: GameState, projected: number): { low: number; high: number } | null {
  const k = officeStrength(s, 'admissions');
  if (k <= 0) return null;
  const half = ADMISSIONS_RANGE_HALF_WIDTH / k;
  const round = (n: number) => Math.max(0, Math.round(n / 100) * 100);
  return { low: round(projected * (1 - half)), high: round(projected * (1 + half)) };
}

// Student Activities Office: weeks between charters, shorter with the seat.
export function charterIntervalWeeks(s: GameState): number {
  const k = officeStrength(s, 'student-activities');
  return k > 0 ? Math.round(CHARTER_INTERVAL_WEEKS / k) : Infinity;
}
