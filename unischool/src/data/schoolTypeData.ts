import type { SchoolType } from '../state/types';
import { STARTING_DORM_CAPACITY } from './campusData';

// ---------------------------------------------------------------------
// Private vs. public is the game's one starting fork (see README's
// "Startup and school type"). Everything the choice affects is a plain,
// tunable starting condition here — no behavior branches on schoolType
// anywhere else except where a system explicitly reads one of these
// fields off state. Archetypes (Harvard-like, ASU-like, ...) are meant
// to emerge from play, not from this table, so keep it to starting
// conditions only.
// ---------------------------------------------------------------------

// Shared baseline reputation both types start from before their own
// prestigeBonus/penalty is added.
export const BASE_STARTING_REPUTATION = 40;

export interface SchoolTypePreset {
  label: string;                  // shown on the startup screen
  description: string;            // one-line flavor/tradeoff text for the startup screen
  startingCash: number;
  prestigeBonus: number;          // added to BASE_STARTING_REPUTATION; negative allowed
  startingApplicantPool: number;
  tuitionCeiling: number;         // hard cap enforced on the annual tuition decision
  baselineFundingPerWeek: number; // FLAT non-tuition income (an institutional appropriation); 0 if none
  appropriationPerStudentPerYear: number; // per-enrolled-student appropriation; 0 if none. A flat grant alone would shrink to nothing next to a mature school's costs — a public school's funding has to grow with the school it funds, or "public" would mean "unplayable after year 15".
}

// ---------------------------------------------------------------------
// STARTING CONDITIONS — the top of the growth loop's first turn.
//
// The intro (gen-ed) loop is deliberately FRICTIONLESS: starting cash is
// sized to cover the whole gen-ed ramp — six core courses, a few job
// postings and hires, the cheap early campus-life buildings — with room
// to spare, so a new player learns "develop a course, hire faculty"
// without money ever entering their head. The pinch is supposed to arrive
// one loop later, when the tier-1 build-out drags weeklyOpEx up (see
// financeSystem.ts's cost drivers), not in week three.
//
// Everything after that is priced against MID/LATE-game income, never
// against this cushion — see financeSystem.ts.
// ---------------------------------------------------------------------

// Both types start at the same tuition and endowment; the fork is in the
// four numbers below them. Tuition still has real room to move at the
// year-1 summer decision (raising it is meant to feel like a decision —
// it shrinks the applicant pool, see admissionsSystem.ts's
// PRICE_SENSITIVITY — not a free win), but it no longer starts so low
// that a normal founding opening reads as a false-alarm cash scare that
// only the summer decision can fix: comfortably under both school types'
// tuitionCeiling and under the founding revenue-maximizing net price
// (~$15k, per admissionsSystem.ts's price-tolerance model), so the pinch
// comes from the tier-1 build-out dragging opex up (see techData.ts's
// TIER_COURSE_COST and financeSystem.ts's cost drivers), not from an
// artificially low starting price.
export const STARTING_TUITION = 13_000;
export const STARTING_ENDOWMENT = 3_000_000; // pays out ~$120k/yr from day one (see financeSystem.ts's ENDOWMENT_PAYOUT_RATE)

// --- Founding cohort mix (see actions.ts's createInitialState) ---------
// A founded college opens with ALL FOUR class years present and BALANCED —
// roughly equal freshman / sophomore / junior / senior counts — rather than
// a freshman-only lump. The body is sized to exactly the founding hall's
// bed count (STARTING_DORM_CAPACITY), which is pre-built and pre-placed at
// founding, so the school opens FULLY HOUSED with no gap between its body
// and its capacity (ALIGNMENT_ROADMAP.md's lever 2).
//
// Why balanced-and-sized-to-capacity: the cohort advance is a zero-damping
// shift register, so ANY imbalance or body/capacity gap at founding
// re-circulates as a four-year wave that never decays. Opening at the
// steady state the campus would otherwise take years to reach — each cohort
// ≈ capacity / 4 — means intake and graduation both sit near capacity / 4
// from year one, and the first admissions cycles are steady rather than
// lumpy. (Growth beyond the founding hall is then smoothed by the intake
// damper — see admissionsSystem.ts's INTAKE_SURGE_MULTIPLIER, lever 3.)
//
// FOUNDING_BODY tracks STARTING_DORM_CAPACITY so the two never drift; the
// remainder from dividing by four is loaded onto the younger cohorts, so
// the "ramp" is at most a one-student tilt toward the freshmen.
export const FOUNDING_BODY = STARTING_DORM_CAPACITY; // fully housed at open — matches the founding hall's beds
const FOUNDING_PER_COHORT = Math.floor(FOUNDING_BODY / 4);
const FOUNDING_REMAINDER = FOUNDING_BODY - FOUNDING_PER_COHORT * 4; // 0..3, spread over the younger cohorts
export const FOUNDING_COHORTS = {
  freshman: FOUNDING_PER_COHORT + (FOUNDING_REMAINDER > 0 ? 1 : 0),
  sophomore: FOUNDING_PER_COHORT + (FOUNDING_REMAINDER > 1 ? 1 : 0),
  junior: FOUNDING_PER_COHORT + (FOUNDING_REMAINDER > 2 ? 1 : 0),
  senior: FOUNDING_PER_COHORT,
} as const; // { freshman: 88, sophomore: 88, junior: 87, senior: 87 } at capacity 350

export const SCHOOL_TYPE_PRESETS: Record<SchoolType, SchoolTypePreset> = {
  private: {
    label: 'Private',
    description: 'No state funding and a smaller applicant pool, but tuition is uncapped and you start with more prestige.',
    startingCash: 1_400_000,
    prestigeBonus: 10,
    startingApplicantPool: 150,
    tuitionCeiling: 60_000,
    baselineFundingPerWeek: 0,
    appropriationPerStudentPerYear: 0,
  },
  public: {
    label: 'Public',
    description: 'A state appropriation that grows with enrollment and a much larger applicant pool, but tuition is capped and prestige starts lower.',
    startingCash: 1_200_000,
    prestigeBonus: -5,
    startingApplicantPool: 400,
    tuitionCeiling: 22_000,
    baselineFundingPerWeek: 7_000,
    // Roughly a third of the capped tuition: a public school trades
    // pricing power for a subsidy that scales with the students it
    // actually enrolls, which is what keeps the low tuition ceiling from
    // becoming a slow death sentence as instruction costs rise. Sized so
    // a public school's revenue per student lands slightly ABOVE a private
    // one's at the same (low) prestige and slightly BELOW it once prestige
    // — and so private pricing power — has grown; the two forks should
    // trade places over the arc, not one dominate it.
    appropriationPerStudentPerYear: 5_500,
  },
};
