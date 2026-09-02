import type { GameState, SchoolType } from './types';
import type { DecisionEventContext } from '../data/eventData';
import { WEEKS_PER_YEAR } from './types';
import { initialTech, GENED_BUILDING_REPUTATION_BONUS } from '../data/techData';
import { initialDorms, STARTING_DORM_CAPACITY } from '../data/campusData';
import { initialFacilities } from '../data/facilitiesData';
import { initialRivals } from '../data/rivalData';
import { initialCandidatePool, facultySalary } from '../data/facultyData';
import {
  SCHOOL_TYPE_PRESETS, BASE_STARTING_REPUTATION, STARTING_ENDOWMENT, STARTING_TUITION,
} from '../data/schoolTypeData';

// The institutional half of every new school's name (see types.ts's
// University). Fixed at founding — the startup screen only lets the
// player write the half in front of it — and swapped for "University"
// exactly once, if the player accepts the charter the first lab offers.
export const STARTING_INSTITUTION_SUFFIX = 'College';

// All the ways a player can change the world. The engine's reducer is the
// only thing that interprets these. UI dispatches them; systems never do.
export type Action =
  | { type: 'TICK' }                                   // advance one week
  | { type: 'START_GAME'; name: string; schoolType: SchoolType } // leaves the startup screen, founds the university
  | { type: 'START_DEVELOPMENT'; nodeId: string }
  // Appoints someone straight off the standing candidate list (see
  // facultyData.ts's churn block): they move from s.candidates to
  // s.faculty this instant, with no fee and no waiting period. The only
  // thing that can stop a hire is nobody in that field being on the
  // market this week — availability IS the recruiting constraint now, and
  // the money constraint is the salary they start drawing immediately.
  | { type: 'HIRE_FACULTY'; facultyId: string }
  | { type: 'FIRE_FACULTY'; facultyId: string }
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
  | { type: 'RESOLVE_INTERRUPT' }                      // clears pendingInterrupt, lets the clock resume
  // Resolves the annual summer admissions interrupt: sets next year's two
  // policy levers (tuition, aid), runs the admissions funnel to commit the
  // enrolled class, and — unlike RESOLVE_INTERRUPT — advances the clock into
  // that year itself (see reducer.ts). Tuition is set ONLY here, once a
  // year — there is no other action that changes it.
  // `approvedPetitionIds` is the student-life digest folded into this same
  // interrupt (see data/studentLifeData.ts and the reducer): the ids of the
  // club/chapter petitions raised since last summer that the player is
  // recognising. Every pending petition NOT listed is declined, and the
  // queue drains either way — so the digest can never accumulate across
  // years, and clubs never need a stop-the-clock modal of their own.
  | { type: 'RESOLVE_ADMISSIONS'; tuition: number; financialAidRate: number; approvedPetitionIds: string[] }
  // Dismisses the "you've entered the rankings" reveal or an annual U.S.
  // News report interrupt. Like RESOLVE_ADMISSIONS (and unlike the plain
  // RESOLVE_INTERRUPT), this advances the clock — both fire as a trailing
  // step after that week's systems already ran, so dismissing means
  // moving on to the next week, not replaying this one.
  | { type: 'RESOLVE_REPORT' }
  // Dismisses a milestone celebration — the stop-the-clock moment for a
  // completed/mastered major or a finished school (see data/eventData.ts's
  // MILESTONE_INTERRUPT_KINDS). Grants nothing: the milestone's real
  // effects landed when techSystem awarded it. Advances the clock, for the
  // same reason RESOLVE_REPORT does.
  | { type: 'RESOLVE_MILESTONE' }
  // Dismisses a research prize celebration — the one research output that
  // stops the clock (see systems/research/researchSystem.ts; grants and
  // breakthroughs never do). Grants nothing: the winner's acclaim, their
  // raised salary and research output, and the school's prestige credit
  // all landed the week the prize was won. Advances the clock, for the
  // same reason RESOLVE_MILESTONE does.
  | { type: 'RESOLVE_PRIZE' }
  // Answers the one-time College -> University charter offer, made the
  // first quiet week after any lab finishes (see
  // systems/events/eventSystem.ts). `accept` swaps the fixed half of the
  // institution's name; either answer marks the offer made, so it is
  // asked exactly once per run. Cosmetic — no system reads the name.
  | { type: 'RESOLVE_CHARTER'; accept: boolean }
  // Commits one choice from an authored decision event (see
  // data/eventData.ts's DECISION_EVENTS). `ctx` is the context the event
  // rolled for itself when it fired, carried back verbatim from the
  // interrupt payload so the reducer charges exactly the figure the modal
  // displayed. Rejected (with the interrupt still cleared) if the school
  // cannot afford the chosen option — every event always offers at least
  // one that costs nothing. Advances the clock, like RESOLVE_REPORT.
  | { type: 'RESOLVE_DECISION_EVENT'; eventId: string; choiceId: string; ctx: DecisionEventContext }
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
    self: { name: '', suffix: '', universityCharterOffered: false, reputation: 0, schoolType: 'private' },
    history: [],
    log: [],
    gameOver: false,
    pendingInterrupt: null,
    events: { pendingMilestones: [], lastMilestoneWeek: 0, lastDecisionWeek: 0, decisionHistory: {} },
    orgs: {
      clubs: [], chapters: [], pendingPetitions: [],
      hellenicCouncilApproved: false, hellenicCouncilOffered: false, lastFormationWeek: 0,
    },
    research: {
      points: 0, lifetimePoints: 0, grants: 0, grantIncome: 0,
      breakthroughs: 0, prizes: 0, lastOutputWeek: 0, pendingPrizes: [],
    },
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
    // acclaim is 0 for all five and stays there until one of them wins a
    // research prize — which none of them can until the school has built
    // a lab, decades away (see systems/research/researchSystem.ts).
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
        tenureWeeks: 0, weeksListed: 0, acclaim: 0, salary: facultySalary(72, 65, 0), morale: 80, courseSlots: 1,
        nationality: 'United States', flag: '🇺🇸',
        bio: 'Earned a doctorate in Physics at Ravensmoor Institute; research centers on astrophysical modeling.',
      },
      {
        id: 'f2', name: 'Dr. John Okafor', field: 'History', teaching: 80, research: 55, teachingPotential: 88, researchPotential: 68,
        tenureWeeks: 0, weeksListed: 0, acclaim: 0, salary: facultySalary(80, 55, 0), morale: 78, courseSlots: 1,
        nationality: 'Nigeria', flag: '🇳🇬',
        bio: 'Earned a doctorate in History at the University of Calderwood; research centers on maritime trade networks.',
      },
      {
        id: 'f3', name: 'Dr. Grace Bennett', field: 'English', teaching: 78, research: 60, teachingPotential: 85, researchPotential: 72,
        tenureWeeks: 0, weeksListed: 0, acclaim: 0, salary: facultySalary(78, 60, 0), morale: 76, courseSlots: 2,
        nationality: 'United Kingdom', flag: '🇬🇧',
        bio: 'Earned a doctorate in English at Marchmont University; research centers on rhetoric and composition.',
      },
      {
        id: 'f4', name: 'Dr. Priya Iyer', field: 'Mathematics', teaching: 70, research: 68, teachingPotential: 80, researchPotential: 79,
        tenureWeeks: 0, weeksListed: 0, acclaim: 0, salary: facultySalary(70, 68, 0), morale: 77, courseSlots: 1,
        nationality: 'India', flag: '🇮🇳',
        bio: 'Earned a doctorate in Mathematics at Ironwood University; research centers on numerical analysis.',
      },
      {
        id: 'f5', name: 'Dr. Elena Novak', field: 'Philosophy', teaching: 75, research: 62, teachingPotential: 83, researchPotential: 71,
        tenureWeeks: 0, weeksListed: 0, acclaim: 0, salary: facultySalary(75, 62, 0), morale: 79, courseSlots: 1,
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
    // `name` is the player's half only ("Blackmoor"); the institutional
    // half starts as College for every school and is only ever changed by
    // the one-time charter offer the first lab unlocks (see
    // systems/events/eventSystem.ts).
    self: {
      name,
      suffix: STARTING_INSTITUTION_SUFFIX,
      universityCharterOffered: false,
      reputation: BASE_STARTING_REPUTATION + preset.prestigeBonus + GENED_BUILDING_REPUTATION_BONUS,
      schoolType,
    },
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
    // Nothing celebrated and nothing fired yet; week 0 reads as "never"
    // (the clock's first real week is 1 — see eventData.ts's absoluteWeek).
    events: { pendingMilestones: [], lastMilestoneWeek: 0, lastDecisionWeek: 0, decisionHistory: {} },
    // No student organisations at founding, and none can form until the
    // campus has a student center to form them in (see
    // data/studentLifeData.ts). Greek life is gated a second time, on the
    // player explicitly chartering a Hellenic Council — so a run that
    // declines it, or never gets asked, carries these two lists at zero
    // and one empty flag forever, which is exactly what a school without
    // Greek life should look like in state.
    orgs: {
      clubs: [], chapters: [], pendingPetitions: [],
      hellenicCouncilApproved: false, hellenicCouncilOffered: false, lastFormationWeek: 0,
    },
    // No labs at founding, so nothing produces research and no output can
    // fire — the whole slice sits at zero until the first lab finishes
    // (see systems/research/researchSystem.ts).
    research: {
      points: 0, lifetimePoints: 0, grants: 0, grantIncome: 0,
      breakthroughs: 0, prizes: 0, lastOutputWeek: 0, pendingPrizes: [],
    },
    candidates: initialCandidatePool(),
    started: true,
    hasEnteredRankings: false,
    milestones: {},
  };
}

export { WEEKS_PER_YEAR };
