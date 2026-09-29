import { COLLEGE_NAME_MAX, type Vernacular } from '../state/types';

// Where every school starts: one set of conditions for everybody. The
// startup screen asks only for a name (StartupScreen.tsx); anything that
// should vary between schools belongs in play.

// Under the founding facade when the typed name ends in "University"
// (StartupScreen.tsx, Plan 78G): the facade reads College, and this says
// when that changes (systems/events/charter.ts).
export const UNIVERSITY_CAPTION = 'Every college opens as a College; the board grants "University" with its first research lab.';

// Under the name field, on the founding screen and in the charter's rename,
// once the name has reached the longest it can be (the review's G7-19): the
// field takes no more, and this says why.
export const NAME_LIMIT_NOTE = `${COLLEGE_NAME_MAX} characters at most`;

export interface FoundingPreset {
  startingCash: number;
  startingReputation: number;
  startingApplicantPool: number;
}

// Starting cash covers the courses that seat the students, with room to
// spare; the pinch arrives when the build-out drags weeklyOpEx up
// (financeSystem.ts).

// What the founding classes pay, and where the first summer's price opens
// (Plan 80F; $16,000 until then): just under the founding price tolerance
// ($21,500 at prestige 50, admissionsSystem.ts's priceTolerance), a price
// the admissions screen reads as fair, so the founding years are not
// starved by a bargain nobody asked for. Raising it at the first summer is
// still a real decision because it shrinks the pool
// (admissionsSystem.ts's PRICE_SENSITIVITY).
export const STARTING_TUITION = 20_000;

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

// The founding market (Plan 80D): a college opens with nothing to teach.
// No professor is on the payroll and no course is developed; 350 students
// are enrolled and Founders Hall stands empty. The programs first on offer
// are Plan 52's pillars, one from each of three schools — English
// (Introduction to Literary Studies, British Literature Survey),
// Mathematics (Calculus, Linear Algebra) and Economics (Microeconomics,
// Macroeconomics) — and the faculty market lists a professor for each
// (FOUNDING_MARKET below) beside its ordinary candidates. The walkthrough
// founds English with Dr. Grace Bennett (state/opening.ts). Plain ids, so
// eventData.ts can read them without an import cycle.
export const FOUNDING_PROGRAMS: readonly string[] = ['ENGL', 'MATH', 'ECON'];
// The walkthrough's program, and the professor it appoints to teach it.
export const WALKTHROUGH_PROGRAM = 'ENGL';
export const WALKTHROUGH_PROFESSOR = 'f3';

// The pillars' professors, listed on the market the week the college opens
// (facultyData.ts's foundingCandidates). Established scholars: their stats
// are grown over FOUNDING_TENURE_WEEKS, so each teaches better, and asks
// more, than the market's ordinary candidates. The ids are the founding
// roster's before Plan 80D, so a save or a test that names one still does.
export interface FoundingProfessor {
  id: string;
  name: string;
  field: string;
  teachingPotential: number;
  researchPotential: number;
  courseSlots: number;
  nationality: string;
  flag: string;
  gender: 'male' | 'female';
  heritage: string;
  bio: string;
}

export const FOUNDING_MARKET: readonly FoundingProfessor[] = [
  {
    id: 'f3', name: 'Dr. Grace Bennett', field: 'English', teachingPotential: 85, researchPotential: 72, courseSlots: 3,
    nationality: 'United Kingdom', flag: '🇬🇧', gender: 'female', heritage: 'Anglo/Western European',
    bio: 'Earned a doctorate in English at Marchmont University; research centers on rhetoric and composition.',
  },
  {
    id: 'f4', name: 'Dr. Priya Iyer', field: 'Mathematics', teachingPotential: 80, researchPotential: 79, courseSlots: 2,
    nationality: 'India', flag: '🇮🇳', gender: 'female', heritage: 'South Asian',
    bio: 'Earned a doctorate in Mathematics at Ironwood University; research centers on numerical analysis.',
  },
  {
    id: 'f2', name: 'Dr. John Okafor', field: 'Economics', teachingPotential: 88, researchPotential: 68, courseSlots: 2,
    nationality: 'Nigeria', flag: '🇳🇬', gender: 'male', heritage: 'West African',
    bio: 'Earned a doctorate in Economics at the University of Calderwood; research centers on trade and development.',
  },
];

// The architecture a new campus is built in. One value today, so a constant
// rather than a startup choice.
export const FOUNDING_VERNACULAR: Vernacular = 'georgian';

// Tunable: the harness's players (`npm run sim`) read how these play out.
// Re-fit the founding applicant pool together with the admit-rate curve
// rather than nudging it alone.
//
// The gift was $1.4M until Plan 35, which measured a founding with no slack:
// a player charging a tenth less than the harness's price stalled for a
// decade (docs/design/economy.md's "The late margin, settled"), $3M from
// then until Plan 80D, when the college began opening with nothing to teach,
// and $2.45M, provisionally, until Plan 80F set it from the harness: enough
// to develop the courses that seat the Year 2 headcount, with the
// professors they need, and about a fifth to spare. With the founding admit
// rate at about 86% (admissionsSystem.ts's admitRate) the class fills the
// room the courses make, and the Guided player's Year 2 body is about 455
// (421–458 across the seeds and founding funds tried), so six courses (480
// places): six programs' entry courses at $300k ($1.8M), a professor each
// for a year (the three founding-market professors at about $105k and three
// of the market's at its median, about $73k: $0.53M) and the courses
// carried for a year ($300 a week each: $0.09M). $2.43M, and a fifth more
// is $2.9M. The Guided player never borrows and never runs out of cash in
// Years 1–2 (its lowest is about $0.1M, the reserve it keeps).
export const FOUNDING_PRESET: FoundingPreset = {
  startingCash: 2_900_000,
  startingReputation: 50,
  startingApplicantPool: 150,
};
