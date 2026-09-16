import type { SchoolType } from '../state/types';

// ---------------------------------------------------------------------
// Private vs. public is the game's one starting fork (see
// docs/design/progression.md's "Startup and school type"). Everything
// the choice affects is a plain, tunable starting condition here — no
// behavior branches on schoolType anywhere else except where a system
// explicitly reads one of these fields off state. Archetypes
// (Harvard-like, ASU-like, ...) are meant to emerge from play, not from
// this table, so keep it to starting conditions only.
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

// --- Founding class mix (see actions.ts's createInitialState) ----------
// A founded college opens with ALL FOUR class years present and BALANCED —
// roughly equal freshman / sophomore / junior / senior counts — rather than
// a freshman-only lump, so there is a graduating class from year one and the
// body opens at the steady-state structure a campus would otherwise take
// years of lumpy cycles to reach.
//
// The founding body is commuters, every one of them: there is no dorm at
// founding (see campusData.ts — the starting dorm is seeded 'available',
// not 'done', like every other one in the chain), and enrollment is not
// capacity-gated at all any more (see admissionsSystem.ts) — so this is
// simply the school's starting size, independent of anything the player
// later builds. 350 matches the founding dorm's own bed count purely by
// naming coincidence (a real founding class is roughly the size of a real
// first dorm), not because anything ties the two together.
//
// The remainder from dividing by four is loaded onto the younger classes,
// so the "ramp" is at most a one-student tilt toward the freshmen.
export const FOUNDING_BODY = 350;
const FOUNDING_PER_CLASS = Math.floor(FOUNDING_BODY / 4);
const FOUNDING_REMAINDER = FOUNDING_BODY - FOUNDING_PER_CLASS * 4; // 0..3, spread over the younger classes
export const FOUNDING_CLASSES = {
  freshman: FOUNDING_PER_CLASS + (FOUNDING_REMAINDER > 0 ? 1 : 0),
  sophomore: FOUNDING_PER_CLASS + (FOUNDING_REMAINDER > 1 ? 1 : 0),
  junior: FOUNDING_PER_CLASS + (FOUNDING_REMAINDER > 2 ? 1 : 0),
  senior: FOUNDING_PER_CLASS,
} as const; // { freshman: 88, sophomore: 88, junior: 87, senior: 87 }, all commuters

export const SCHOOL_TYPE_PRESETS: Record<SchoolType, SchoolTypePreset> = {
  private: {
    label: 'Private',
    description: 'No state funding and a smaller applicant pool, but you can charge what you like and start with more prestige.',
    startingCash: 1_400_000,
    prestigeBonus: 10,
    startingApplicantPool: 150,
    // Raised from 60,000 at Plan 05's PR E. The tuition decision is a
    // blind gamble now — the slider says only whether you are in line with
    // your standing — and the backlog's ask was "no stated cap; the cap is
    // where the slider ends". So the number is not shown any more, which
    // means it has to be somewhere a private school will never sensibly
    // reach rather than somewhere it bumps into. Nothing in the balance sim
    // gets near it: the highest-priced strategy closes a 40-year run around
    // 38k, and the deficit surcharge tops out well under this.
    tuitionCeiling: 100_000,
    baselineFundingPerWeek: 0,
    appropriationPerStudentPerYear: 0,
  },
  public: {
    label: 'Public',
    description: 'A state appropriation that grows with enrollment and a much larger applicant pool, but tuition is capped and prestige starts lower.',
    startingCash: 1_200_000,
    prestigeBonus: -5,
    startingApplicantPool: 400,
    // NOT raised with the private ceiling at PR E. A public school's cap is
    // most of what distinguishes it — it trades pricing power for a
    // subsidy — and dropping public/private is its own backlog item, so
    // this plan does not decide that question on the startup screen's
    // behalf. It is still never stated on screen; it is simply where this
    // school type's slider ends.
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
