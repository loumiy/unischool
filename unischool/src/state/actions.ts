import type { GameState, SchoolType } from './types';
import { WEEKS_PER_YEAR } from './types';
import { initialTech, GENED_BUILDING_CAPACITY_BONUS, GENED_BUILDING_REPUTATION_BONUS } from '../data/techData';
import { initialRivals } from '../data/rivalData';
import { initialCandidates } from '../data/facultyData';
import { SCHOOL_TYPE_PRESETS, BASE_STARTING_REPUTATION } from '../data/schoolTypeData';

// All the ways a player can change the world. The engine's reducer is the
// only thing that interprets these. UI dispatches them; systems never do.
export type Action =
  | { type: 'TICK' }                                   // advance one week
  | { type: 'START_GAME'; name: string; schoolType: SchoolType } // leaves the startup screen, founds the university
  | { type: 'START_DEVELOPMENT'; nodeId: string }
  | { type: 'HIRE_FACULTY'; facultyId: string }
  | { type: 'FIRE_FACULTY'; facultyId: string }
  | { type: 'BUY_SLOT' }
  | { type: 'TOGGLE_AUTO_DEVELOP' }
  | { type: 'RESOLVE_INTERRUPT' }                      // clears pendingInterrupt, lets the clock resume
  // Resolves the annual summer admissions interrupt: sets next year's
  // policy and, unlike RESOLVE_INTERRUPT, advances the clock into that
  // year itself (see reducer.ts). Tuition is set ONLY here, once a year —
  // there is no other action that changes it.
  | { type: 'RESOLVE_ADMISSIONS'; tuition: number; financialAidRate: number; selectivity: number; targetEnrollment: number }
  // Dismisses the "you've entered the rankings" reveal or an annual U.S.
  // News report interrupt. Like RESOLVE_ADMISSIONS (and unlike the plain
  // RESOLVE_INTERRUPT), this advances the clock — both fire as a trailing
  // step after that week's systems already ran, so dismissing means
  // moving on to the next week, not replaying this one.
  | { type: 'RESOLVE_REPORT' }
  | { type: 'DEBUG_TRIGGER_TEST_INTERRUPT' }           // scaffolding: see reducer.ts, remove once a real interrupt exists
  | { type: 'RESET' };

// A minimal placeholder state for the pre-game startup screen only. None of
// the expensive seed generation (curriculum, rivals, faculty, candidates)
// runs until the player actually founds the university via START_GAME.
export function createPreStartState(): GameState {
  return {
    clock: { year: 1, week: 1 },
    finance: { cash: 0, endowment: 0, tuitionPerStudent: 0, tuitionCeiling: 0, baselineFundingPerWeek: 0, weeklyOpEx: 0 },
    students: { enrolled: 0, capacity: 0, satisfaction: 0, applicantPool: 0 },
    admissions: { financialAidRate: 0, selectivity: 0, targetEnrollment: 0 },
    faculty: [],
    tech: [],
    slots: 0,
    developing: {},
    rivals: [],
    self: { name: '', reputation: 0, schoolType: 'private' },
    log: [],
    gameOver: false,
    pendingInterrupt: null,
    autoDevelop: false,
    candidates: [],
    started: false,
    hasEnteredRankings: false,
    milestones: {},
  };
}

// The real starting state, once the player has named the university and
// picked private/public on the startup screen. Private/public sets
// starting conditions purely through SCHOOL_TYPE_PRESETS — see
// README's "Startup and school type".
export function createInitialState(name: string, schoolType: SchoolType): GameState {
  const preset = SCHOOL_TYPE_PRESETS[schoolType];
  return {
    clock: { year: 1, week: 1 },
    finance: {
      cash: preset.startingCash,
      endowment: 1_000_000, // not varied by school type — not in README's explicit starting-condition list
      tuitionPerStudent: Math.min(8_000, preset.tuitionCeiling),
      tuitionCeiling: preset.tuitionCeiling,
      baselineFundingPerWeek: preset.baselineFundingPerWeek,
      weeklyOpEx: 0,
    },
    students: {
      enrolled: 200,
      // +GENED_BUILDING_CAPACITY_BONUS: General Studies Hall starts already
      // built (see initialTech), so its capacity contribution is folded in
      // here rather than granted via the normal completion-effects path.
      capacity: 400 + GENED_BUILDING_CAPACITY_BONUS,
      satisfaction: 70,
      applicantPool: preset.startingApplicantPool,
    },
    // Year 1 runs under these founding defaults — no school-type variation
    // here, unlike tuitionCeiling/startingApplicantPool (see the PR notes
    // on the first admissions cycle's timing). The first real admissions
    // interrupt, at the end of year 1, sets year 2's policy.
    admissions: {
      financialAidRate: 0,
      selectivity: 0.2,
      targetEnrollment: 400,
    },
    faculty: [
      { id: 'f1', name: 'Dr. Alma Reyes', field: 'Physics', teaching: 72, research: 65, salary: 90_000, morale: 80 },
      { id: 'f2', name: 'Dr. John Okafor', field: 'History', teaching: 80, research: 55, salary: 82_000, morale: 78 },
      { id: 'f3', name: 'Dr. Wei Zhang', field: 'CompSci', teaching: 60, research: 88, salary: 105_000, morale: 75 },
    ],
    tech: initialTech(),
    slots: 2,
    developing: {},
    rivals: initialRivals(),
    // +GENED_BUILDING_REPUTATION_BONUS: same fold-in as capacity above.
    self: { name, reputation: BASE_STARTING_REPUTATION + preset.prestigeBonus + GENED_BUILDING_REPUTATION_BONUS, schoolType },
    log: [
      { year: 1, week: 1, message: 'The university opens its doors.', kind: 'info' },
    ],
    gameOver: false,
    pendingInterrupt: null,
    autoDevelop: false,
    candidates: initialCandidates(),
    started: true,
    hasEnteredRankings: false,
    milestones: {},
  };
}

export { WEEKS_PER_YEAR };
