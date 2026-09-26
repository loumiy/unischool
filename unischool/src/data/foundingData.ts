import type { Vernacular } from '../state/types';

// Where every school starts: one set of conditions for everybody. The
// startup screen asks only for a name (StartupScreen.tsx); anything that
// should vary between schools belongs in play.

export interface FoundingPreset {
  startingCash: number;
  startingReputation: number;
  startingApplicantPool: number;
}

// Starting cash covers the opening with room to spare; the pinch arrives when
// the tier-1 build-out drags weeklyOpEx up (financeSystem.ts).

// Below the founding revenue-maximizing net price (~$15k, admissionsSystem.ts's
// price tolerance), so the opening has no false cash scare, while raising it
// at the first summer is still a real decision because it shrinks the pool
// (admissionsSystem.ts's PRICE_SENSITIVITY).
export const STARTING_TUITION = 16_000;

// Where the tuition slider ends: a control needs a top, not a policy cap.
// Deliberately out of reach: no player the harness has closes a fifty-year
// run anywhere near it (`npm run sim`), so a player at this number has left
// the part of the curve the game is balanced over.
export const TUITION_SLIDER_MAX = 100_000;
export const STARTING_ENDOWMENT = 3_000_000; // pays out ~$120k/yr from day one (at treasury.ts's DRAW_RATE_DEFAULT)

// --- Founding class mix (see actions.ts's createInitialState) ----------
// All four class years present and balanced, so there is a graduating class
// from year one. Every founding student is a commuter: no dorm stands at
// founding, and enrollment is not capacity-gated (admissionsSystem.ts). The
// remainder of dividing by four goes to the younger classes.
export const FOUNDING_BODY = 350;
const FOUNDING_PER_CLASS = Math.floor(FOUNDING_BODY / 4);
const FOUNDING_REMAINDER = FOUNDING_BODY - FOUNDING_PER_CLASS * 4; // 0..3, spread over the younger classes
export const FOUNDING_CLASSES = {
  freshman: FOUNDING_PER_CLASS + (FOUNDING_REMAINDER > 0 ? 1 : 0),
  sophomore: FOUNDING_PER_CLASS + (FOUNDING_REMAINDER > 1 ? 1 : 0),
  junior: FOUNDING_PER_CLASS + (FOUNDING_REMAINDER > 2 ? 1 : 0),
  senior: FOUNDING_PER_CLASS,
} as const; // { freshman: 88, sophomore: 88, junior: 87, senior: 87 }, all commuters

// The founding college: the programs housed in Founders Hall at founding
// (techData.ts's major prefixes) and how many courses of each open
// developed. Six courses at instructionCapacity.ts's SEATS_PER_COURSE seat
// the founding body in 480 seats, and these three are what the five founding
// professors (actions.ts) can teach. Plain ids, so eventData.ts can read
// them without an import cycle.
//
// Plan 52: the pillars a college is founded on, one from each of three
// schools rather than three from one: English (Introduction to Literary
// Studies, British Literature Survey), Mathematics (Calculus, Linear
// Algebra) and Economics (Microeconomics, Macroeconomics). Founders Hall is
// every school's to begin with, and no school's.
export const FOUNDING_PROGRAMS: readonly string[] = ['ENGL', 'MATH', 'ECON'];
export const FOUNDING_COURSES_PER_PROGRAM = 2;

// The architecture a new campus is built in. One value today, so a constant
// rather than a startup choice.
export const FOUNDING_VERNACULAR: Vernacular = 'georgian';

// Tunable: the harness's players (`npm run sim`) read how these play out.
// Re-fit the founding applicant pool together with the admit-rate curve
// rather than nudging it alone.
//
// The gift was $1.4M until Plan 35, which measured a founding with no slack:
// a player charging a tenth less than the harness's price stalled for a
// decade (docs/design/economy.md's "The late margin, settled").
export const FOUNDING_PRESET: FoundingPreset = {
  startingCash: 3_000_000,
  startingReputation: 50,
  startingApplicantPool: 150,
};
