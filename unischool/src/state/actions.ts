import type { GameState, SchoolType } from './types';
import { WEEKS_PER_YEAR } from './types';
import { initialTech, GENED_BUILDING_REPUTATION_BONUS } from '../data/techData';
import { initialDorms, STARTING_DORM_CAPACITY } from '../data/campusData';
import { initialFacilities } from '../data/facilitiesData';
import { initialRivals } from '../data/rivalData';
import { initialCandidates, facultySalary } from '../data/facultyData';
import {
  SCHOOL_TYPE_PRESETS, BASE_STARTING_REPUTATION, STARTING_ENDOWMENT, STARTING_TUITION,
} from '../data/schoolTypeData';

// All the ways a player can change the world. The engine's reducer is the
// only thing that interprets these. UI dispatches them; systems never do.
export type Action =
  | { type: 'TICK' }                                   // advance one week
  | { type: 'START_GAME'; name: string; schoolType: SchoolType } // leaves the startup screen, founds the university
  | { type: 'START_DEVELOPMENT'; nodeId: string }
  | { type: 'HIRE_FACULTY'; facultyId: string }
  | { type: 'FIRE_FACULTY'; facultyId: string }
  // Opens a job posting for `field` (see facultyData.ts's JOB_POSTING_COST/
  // rollPostingWeeks and facultySystem.ts's tickOpenPostings): charges the
  // fee immediately and starts a countdown; when it resolves, exactly one
  // candidate in that field is added to s.candidates. Rejected by the
  // reducer if a posting for that field is already open, or the school
  // can't afford it.
  | { type: 'POST_JOB'; field: string }
  // Posts an opening in every field that doesn't already have one open,
  // for as long as cash holds out — same $JOB_POSTING_COST-per-field rate
  // and one-open-posting-per-field rule as POST_JOB, just fired for every
  // field in one action instead of one at a time.
  | { type: 'POST_ALL_JOBS' }
  // Sites a finished building/dorm/facility on a campus-map tile (see
  // state/campusMap.ts for the placement rules). Visual only: it
  // grants nothing, and a building's effects never depend on it. Rejected
  // by the reducer if the Buildable isn't finished, isn't a placeable kind
  // (a `course` never is), is already placed, or the target tile is out of
  // bounds or occupied.
  | { type: 'PLACE_BUILDABLE'; buildableId: string; row: number; col: number }
  // Runs an endowment campaign (see financeSystem.ts's endowmentCampaign):
  // converts a large lump of cash into endowment at a prestige-scaled
  // donor match. Repeatable forever, each one costing more than the last —
  // the late-game money sink, once the dorm/facility chains and the
  // curriculum have run out of things to buy. Rejected by the reducer if
  // prestige is below the campaign gate or the cash isn't there.
  | { type: 'LAUNCH_ENDOWMENT_CAMPAIGN' }
  | { type: 'TOGGLE_AUTO_DEVELOP' }
  | { type: 'RESOLVE_INTERRUPT' }                      // clears pendingInterrupt, lets the clock resume
  // Resolves the annual summer admissions interrupt: sets next year's two
  // policy levers (tuition, aid), runs the admissions funnel to commit the
  // enrolled class, and — unlike RESOLVE_INTERRUPT — advances the clock into
  // that year itself (see reducer.ts). Tuition is set ONLY here, once a
  // year — there is no other action that changes it.
  | { type: 'RESOLVE_ADMISSIONS'; tuition: number; financialAidRate: number }
  // Dismisses the "you've entered the rankings" reveal or an annual U.S.
  // News report interrupt. Like RESOLVE_ADMISSIONS (and unlike the plain
  // RESOLVE_INTERRUPT), this advances the clock — both fire as a trailing
  // step after that week's systems already ran, so dismissing means
  // moving on to the next week, not replaying this one.
  | { type: 'RESOLVE_REPORT' }
  | { type: 'DEBUG_TRIGGER_TEST_INTERRUPT' }           // scaffolding: see reducer.ts, remove once a real interrupt exists
  // Writes the run to localStorage on demand (see state/persistence.ts).
  // The autosave already fires once a year at the admissions boundary; this
  // is the player's way to not lose the weeks since. It changes no game
  // state beyond the log line confirming it.
  | { type: 'SAVE_GAME' }
  // Abandons the current run: erases the save and returns to the startup
  // screen so a new university can be founded. The UI confirms before
  // dispatching this — it is not undoable.
  | { type: 'RESET' };

// A minimal placeholder state for the pre-game startup screen only. None of
// the expensive seed generation (curriculum, rivals, faculty, candidates)
// runs until the player actually founds the university via START_GAME.
export function createPreStartState(): GameState {
  return {
    clock: { year: 1, week: 1 },
    finance: {
      cash: 0, endowment: 0, endowmentCampaigns: 0, tuitionPerStudent: 0, tuitionCeiling: 0,
      baselineFundingPerWeek: 0, appropriationPerStudentPerYear: 0, weeklyOpEx: 0,
    },
    students: {
      enrolled: 0, capacity: 0, satisfaction: 0,
      satisfactionBreakdown: { academic: 0, social: 0, basicNeeds: 0, health: 0, infrastructure: 0 },
      applicantPool: 0, admitRate: 0, incomingQuality: 0,
    },
    admissions: { financialAidRate: 0 },
    faculty: [],
    tech: [],
    developing: {},
    placements: {},
    rivals: [],
    self: { name: '', reputation: 0, schoolType: 'private' },
    history: [],
    log: [],
    gameOver: false,
    pendingInterrupt: null,
    autoDevelop: false,
    candidates: [],
    openPostings: {},
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
      endowment: STARTING_ENDOWMENT,
      endowmentCampaigns: 0,
      tuitionPerStudent: Math.min(STARTING_TUITION, preset.tuitionCeiling),
      tuitionCeiling: preset.tuitionCeiling,
      baselineFundingPerWeek: preset.baselineFundingPerWeek,
      appropriationPerStudentPerYear: preset.appropriationPerStudentPerYear,
      weeklyOpEx: 0,
    },
    students: {
      enrolled: 200,
      // Capacity comes entirely from dorms now (see campusData.ts). The
      // starting dorm is seeded 'done' rather than granted via the normal
      // completion-effects path, so its capacity is folded in here.
      capacity: STARTING_DORM_CAPACITY,
      satisfaction: 70,
      // Overwritten on the very first TICK by satisfactionSystem.ts's real
      // computation — this starting value just matches the legacy flat 70
      // so the pre-tick UI doesn't show a startling all-zero breakdown.
      satisfactionBreakdown: { academic: 70, social: 70, basicNeeds: 70, health: 70, infrastructure: 70 },
      applicantPool: preset.startingApplicantPool,
      // Neutral placeholders until the first summer admissions cycle
      // resolves and sets these for real — see RESOLVE_ADMISSIONS.
      admitRate: 0.5,
      incomingQuality: 50,
    },
    // Year 1 runs under this founding default (no aid) with the starting
    // enrolled/applicant figures below — no school-type variation here,
    // unlike tuitionCeiling/startingApplicantPool. The first real admissions
    // interrupt, at the end of year 1, runs the funnel and sets year 2's
    // enrolled class from the player's tuition and aid choices.
    admissions: {
      financialAidRate: 0,
    },
    // Founding faculty are already-established hires, not brand-new
    // candidates — a small headroom to their potential (rather than
    // generateCandidate's usual ~45% gap) reflects that; tenureWeeks starts
    // at 0 regardless, so they still grow (and get pricier) from here. See
    // facultyData.ts's grownStat/facultySalary for the shared growth curve.
    //
    // courseSlots are sized to exactly cover the six gen-ed core courses'
    // requiresFaculty fields (techData.ts's GENED_FIELDS: English x2 —
    // GE110 + GE160 — Mathematics, Philosophy, Physics, History x1 each) —
    // no more, no less. Every other course sits behind the gen-ed core as a
    // prereq, so the player always has time to post a job for any other
    // field before it's actually needed.
    faculty: [
      {
        id: 'f1', name: 'Dr. Alma Reyes', field: 'Physics', teaching: 72, research: 65, teachingPotential: 82, researchPotential: 78,
        tenureWeeks: 0, salary: facultySalary(72, 65, 0), morale: 80, courseSlots: 1,
        nationality: 'United States', flag: '🇺🇸',
        bio: 'Earned a doctorate in Physics at Ravensmoor Institute; research centers on astrophysical modeling.',
      },
      {
        id: 'f2', name: 'Dr. John Okafor', field: 'History', teaching: 80, research: 55, teachingPotential: 88, researchPotential: 68,
        tenureWeeks: 0, salary: facultySalary(80, 55, 0), morale: 78, courseSlots: 1,
        nationality: 'Nigeria', flag: '🇳🇬',
        bio: 'Earned a doctorate in History at the University of Calderwood; research centers on maritime trade networks.',
      },
      {
        id: 'f3', name: 'Dr. Grace Bennett', field: 'English', teaching: 78, research: 60, teachingPotential: 85, researchPotential: 72,
        tenureWeeks: 0, salary: facultySalary(78, 60, 0), morale: 76, courseSlots: 2,
        nationality: 'United Kingdom', flag: '🇬🇧',
        bio: 'Earned a doctorate in English at Marchmont University; research centers on rhetoric and composition.',
      },
      {
        id: 'f4', name: 'Dr. Priya Iyer', field: 'Mathematics', teaching: 70, research: 68, teachingPotential: 80, researchPotential: 79,
        tenureWeeks: 0, salary: facultySalary(70, 68, 0), morale: 77, courseSlots: 1,
        nationality: 'India', flag: '🇮🇳',
        bio: 'Earned a doctorate in Mathematics at Ironwood University; research centers on numerical analysis.',
      },
      {
        id: 'f5', name: 'Dr. Elena Novak', field: 'Philosophy', teaching: 75, research: 62, teachingPotential: 83, researchPotential: 71,
        tenureWeeks: 0, salary: facultySalary(75, 62, 0), morale: 79, courseSlots: 1,
        nationality: 'Poland', flag: '🇵🇱',
        bio: 'Earned a doctorate in Philosophy at Amberfield University; research centers on ethics and moral philosophy.',
      },
    ],
    // The single central Buildable list (see README's "central abstraction")
    // — courses, academic buildings, dorms, AND campus-life facilities all
    // live here together.
    tech: [...initialTech(), ...initialDorms(), ...initialFacilities()],
    developing: {},
    placements: {},
    rivals: initialRivals(),
    // +GENED_BUILDING_REPUTATION_BONUS: same fold-in as capacity above.
    self: { name, reputation: BASE_STARTING_REPUTATION + preset.prestigeBonus + GENED_BUILDING_REPUTATION_BONUS, schoolType },
    // Empty at founding: the first row lands at the end of year 1, when the
    // summer admissions interrupt resolves (see reducer.ts's
    // RESOLVE_ADMISSIONS), so every view reading it must handle a school
    // with no history yet.
    history: [],
    log: [
      { year: 1, week: 1, message: 'The university opens its doors.', kind: 'info' },
    ],
    gameOver: false,
    pendingInterrupt: null,
    autoDevelop: false,
    candidates: initialCandidates(),
    openPostings: {},
    started: true,
    hasEnteredRankings: false,
    milestones: {},
  };
}

export { WEEKS_PER_YEAR };
