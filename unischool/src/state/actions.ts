import type { AthleticsBudgetTier, GameState, SchoolType, TileCoord } from './types';
import { DEFAULT_ATHLETICS_BUDGET, initialCoachCandidatePool } from '../data/studentLifeData';
import type { DecisionEventContext } from '../data/eventData';
import { WEEKS_PER_YEAR, CAMPUS_GRID_WIDTH, CAMPUS_GRID_HEIGHT } from './types';
import { footprintOf, isPlaceableKind, placementFor } from './campusMap';
import { initialTech, GENED_BUILDING_REPUTATION_BONUS, GENED_BUILDING_ID } from '../data/techData';
import { initialDorms } from '../data/campusData';
import { seedTrees } from '../data/treeData';
import { initialFacilities } from '../data/facilitiesData';
import { initialRivals } from '../data/rivalData';
import { initialCandidatePool, facultySalary } from '../data/facultyData';
import {
  SCHOOL_TYPE_PRESETS, BASE_STARTING_REPUTATION, STARTING_ENDOWMENT, STARTING_TUITION,
  FOUNDING_COHORTS,
} from '../data/schoolTypeData';

// A founded university opens with a near-empty campus, with ONE exception:
// Founders Hall (techData.ts's General Studies building), pre-built ('done')
// and pre-placed at the centre of the map — the university's literal
// founding hall. Every other founding buildable (the starting dorm, dining
// hall, and the rest of the seeded-'available' facility chains) is seeded
// 'available', so the player builds and sites each from scratch; the
// founding student body is entirely commuters, with no dorm at all (see
// campusData.ts and admissionsSystem.ts — enrollment is never capacity-
// gated). `capacity` accordingly starts at 0 below: there is no bed count to
// fold in the way a pre-built dorm used to require.

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
  // Courses only (see the reducer's guard). Charges the cost up front, sets
  // status 'developing', and starts the countdown in s.developing — see
  // techSystem.ts's canStartDevelopment/startDevelopment, the single gate
  // and the single mutation both this and PLACE_BUILDABLE below share. A
  // placeable Buildable (building/dorm/facility) never starts this way —
  // it starts through PLACE_BUILDABLE instead, which combines the same
  // gate with siting a location in one step.
  | { type: 'START_DEVELOPMENT'; nodeId: string }
  // Appoints someone straight off the standing candidate list (see
  // facultyData.ts's churn block): they move from s.candidates to
  // s.faculty this instant, with no fee and no waiting period. The only
  // thing that can stop a hire is nobody in that field being on the
  // market this week — availability IS the recruiting constraint now, and
  // the money constraint is the salary they start drawing immediately.
  | { type: 'HIRE_FACULTY'; facultyId: string }
  | { type: 'FIRE_FACULTY'; facultyId: string }
  // The unified build-and-site action for a placeable Buildable (building/
  // dorm/facility — a `course` never dispatches this). Placement IS how a
  // placeable Buildable starts: this charges the cost, starts the
  // countdown (exactly as START_DEVELOPMENT does for a course — same gate,
  // same s.developing mutation), and writes the location into s.placements
  // in the same step, so a developing placeable is renderable at its
  // footprint and its tiles are reserved from week one (see
  // state/campusMap.ts for the placement rules). Rejected by the reducer
  // if the Buildable can't be started (canStartDevelopment: wrong status,
  // unaffordable, no free faculty slot), isn't a placeable kind, is already
  // sited, or the target tile is out of bounds or occupied — by anything
  // already 'done' OR anything still under construction, since an
  // in-progress placement reserves its tiles exactly like a finished one.
  // `rotated` is whether the player turned it 90 degrees before setting it
  // down (see campusMap.ts's orientedFootprint) — the reducer tests and
  // stores the ROTATED footprint, so a rotation that no longer fits is
  // refused exactly like an unrotated overflow.
  //
  // A building's EFFECTS still apply once, only when it finishes (see
  // techSystem.ts's tickTech/applyEffects) — placement changes when/how/
  // where a build is initiated, never what it grants or when it grants it.
  | { type: 'PLACE_BUILDABLE'; buildableId: string; row: number; col: number; rotated: boolean }
  // Draws/erases one pathway tile (see state/campusMap.ts's pathTileKey and
  // types.ts's Pathways). Purely decorative — free, reversible, grants
  // nothing, read by no system — so unlike PLACE_BUILDABLE there is no
  // legality to fail beyond the tile existing on the current grid, which
  // the reducer checks the same defensive way sanitizePathways does on
  // load.
  | { type: 'ADD_PATH_TILE'; tile: TileCoord }
  | { type: 'REMOVE_PATH_TILE'; tile: TileCoord }
  // Runs an endowment campaign (see financeSystem.ts's endowmentCampaign):
  // converts a large lump of cash into endowment at a prestige-scaled
  // donor match. Repeatable forever, each one costing more than the last —
  // the late-game money sink, once the dorm/facility chains and the
  // curriculum have run out of things to buy. Rejected by the reducer if
  // prestige is below the campaign gate or the cash isn't there.
  | { type: 'LAUNCH_ENDOWMENT_CAMPAIGN' }
  // The generic fallback for an interrupt type InterruptModal.tsx's own
  // switch doesn't recognise — normally unreachable, since every type that
  // exists today is wired to its own dedicated resolve action below
  // instead (see reducer.ts's own comment on this case for why it still
  // advances the clock, same as every one of those).
  | { type: 'RESOLVE_INTERRUPT' }
  // Resolves the annual summer admissions interrupt: sets next year's two
  // policy levers (tuition, scholarships), runs the admissions funnel to commit the
  // enrolled class, and advances the clock into that year itself (see
  // reducer.ts). Tuition is set ONLY here, once a year — there is no other
  // action that changes it.
  // `approvedPetitionIds` is the student-life digest folded into this same
  // interrupt (see data/studentLifeData.ts and the reducer): the ids of the
  // club/chapter petitions raised since last summer that the player is
  // recognising. Every pending petition NOT listed is declined, and the
  // queue drains either way — so the digest can never accumulate across
  // years, and clubs never need a stop-the-clock modal of their own.
  | { type: 'RESOLVE_ADMISSIONS'; tuition: number; scholarshipRate: number; approvedPetitionIds: string[] }
  // Dismisses the "you've entered the rankings" reveal or an annual U.S.
  // News report interrupt. Advances the clock, like every other interrupt
  // raised mid-tick: it fires as a trailing step after that week's systems
  // already ran, so dismissing means moving on to the next week, not
  // replaying this one.
  | { type: 'RESOLVE_REPORT' }
  // Dismisses a milestone celebration — the stop-the-clock moment for a
  // established/distinguished program or a distinguished school (see
  // data/eventData.ts's MILESTONE_INTERRUPT_KINDS). Grants nothing: the milestone's real
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
  // Acknowledges a student demand at the moment it is raised (see
  // systems/demands/demandSystem.ts). Grants nothing and costs nothing —
  // the demand is already open on s.events.activeDemand with its target
  // and deadline, and the ONLY way to answer it is to build the thing it
  // asks for before the deadline passes, which the demand system detects
  // off the campus itself. There is deliberately no "accept"/"refuse"
  // fork and no second action: a demand is do-it-or-don't over time, not a
  // menu. Advances the clock, for the same reason RESOLVE_MILESTONE does.
  | { type: 'RESOLVE_DEMAND' }
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
  // Sets the one athletics-wide recruiting & scholarship budget lever (see
  // data/studentLifeData.ts's ATHLETICS_BUDGET_TIERS). Free and reversible
  // at any time — unlike tuition/scholarships this is not an annual policy
  // decision, it's a standing dial the player can adjust as often as they
  // like, so there is nothing to refuse and no cost charged here.
  | { type: 'SET_ATHLETICS_BUDGET'; tier: AthleticsBudgetTier }
  // Hires a coach candidate into one of a team's three staff roles (see
  // types.ts's VarsityTeam/Coach). Refused (no-op) if the candidate isn't
  // listed, the team doesn't exist, the candidate's field doesn't match
  // what the role needs (team.sport for head/assistant, TRAINER_FIELD for
  // trainer — see studentLifeData.ts), or the role is already filled: fire
  // the incumbent first, the same explicit two-step HIRE_FACULTY/
  // FIRE_FACULTY already uses rather than a silent hire-over-and-discard.
  // Free: a coach's salary is a recurring line (see varsityTeamUpkeep), not
  // an up-front cost.
  | { type: 'HIRE_COACH'; candidateId: string; teamId: string; role: 'head' | 'assistant' | 'trainer' }
  // Releases a team's coach from the given role — discarded, not returned
  // to the candidate pool, exactly like FIRE_FACULTY.
  | { type: 'FIRE_COACH'; teamId: string; role: 'head' | 'assistant' | 'trainer' }
  // Records that the player has now seen these ids in the relevant view —
  // the Curriculum tab (kind 'course'), the build popup's active category
  // tab (kind 'buildable'), or the Faculty tab's candidate pool (kind
  // 'candidate') — so the alert badge on that menu (and, for a buildable,
  // on that specific tab) stops lighting up for them (see types.ts's
  // SeenState). Dispatched by each of those three views' own effect,
  // never by anything else: seeing is something only the view a badge
  // points at can report.
  | { type: 'MARK_SEEN'; kind: 'course' | 'buildable' | 'candidate'; ids: string[] }
  // Grants operating funds directly, with no event or interrupt behind it
  // (see StatusHeader.tsx's "+$1B" button). Playtest-only: gated behind
  // naming the university "test", the same as the sandbox Fast speed and
  // the removed debug-interrupt trigger — never reachable in normal play.
  | { type: 'GRANT_FUNDS'; amount: number }
  // Starts development on every currently 'available' course in one shot
  // (see CurriculumTab.tsx's "Develop All" button) — a shortcut for
  // clicking each one individually, not a new capability: it goes through
  // the exact same canStartDevelopment/startDevelopment pair START_DEVELOPMENT
  // uses, course by course, so cash and faculty-slot limits still apply
  // exactly as they would one click at a time. Playtest-only, gated the same
  // way as GRANT_FUNDS.
  | { type: 'DEVELOP_ALL_AVAILABLE_COURSES' }
  // Renovates the tier-1 library in place for more capacity (see
  // facilitiesData.ts's nextLibraryFloor) — puts that SAME already-placed
  // Buildable back into 'developing' at its existing spot rather than
  // starting a new one, and raises its own effects.servesPopulation on
  // completion. No nodeId: there is exactly one tier-1 library, so unlike
  // START_DEVELOPMENT there is nothing to disambiguate.
  | { type: 'RENOVATE_LIBRARY' }
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
      cohorts: { freshman: 0, sophomore: 0, junior: 0, senior: 0 },
      capacity: 0, satisfaction: 0,
      satisfactionBreakdown: { academic: 0, social: 0, basicNeeds: 0, health: 0, housing: 0 },
      satisfactionYearSum: 0, satisfactionYearWeeks: 0, priorYearAvgSatisfaction: 0,
      applicantPool: 0, admitRate: 0, incomingQuality: 0,
    },
    admissions: { scholarshipRate: 0 },
    faculty: [],
    tech: [],
    developing: {},
    placements: {},
    pathways: {},
    trees: {},
    rivals: [],
    self: { name: '', suffix: '', universityCharterOffered: false, reputation: 0, schoolType: 'private' },
    history: [],
    log: [],
    pendingInterrupt: null,
    events: {
      pendingMilestones: [], lastMilestoneWeek: 0, lastDecisionWeek: 0, decisionHistory: {},
      // No demand raised and none outstanding; week 0 reads as "never" for
      // the cooldown too (see data/demandData.ts's DEMAND_COOLDOWN_WEEKS).
      pendingDemand: null, activeDemand: null, lastDemandWeek: 0,
    },
    orgs: {
      clubs: [], chapters: [], teams: [], coachCandidates: [], pendingPetitions: [],
      hellenicCouncilApproved: false, hellenicCouncilOffered: false, lastFormationWeek: 0,
      athleticsBudget: DEFAULT_ATHLETICS_BUDGET,
    },
    research: {
      points: 0, lifetimePoints: 0, grants: 0, grantIncome: 0,
      breakthroughs: 0, prizes: 0, lastOutputWeek: 0, pendingPrizes: [],
    },
    candidates: [],
    started: false,
    hasEnteredRankings: false,
    milestones: {},
    seen: { courseIds: {}, buildableIds: {}, candidateIds: {} },
  };
}

// The real starting state, once the player has named the university and
// picked private/public on the startup screen. Private/public sets
// starting conditions purely through SCHOOL_TYPE_PRESETS — see
// README's "Startup and school type".
export function createInitialState(name: string, schoolType: SchoolType): GameState {
  const preset = SCHOOL_TYPE_PRESETS[schoolType];

  // The central Buildable list, built up front so Founders Hall can be
  // pulled out of it to pre-place (it opens 'done' — see techData.ts).
  const tech = [...initialTech(), ...initialDorms(), ...initialFacilities()];

  // The alert-badge exception for what a school starts with (see types.ts's
  // SeenState). The gen-ed core courses and the founding buildables (Founders
  // Hall, the starting dorm, dining hall, and the rest of the
  // seeded-'available' facility chains) are unlocked from the moment the
  // university opens — the player was never shown a moment when they
  // WEREN'T there to be revealed, so they are not "new" and must not carry
  // a badge on day one. Seeded here the same way MIGRATIONS[22] in
  // persistence.ts seeds a resumed save's `seen` from its OWN current
  // visibility, for the same reason: an empty `seen` would tell the
  // brand-new player that every one of these is news.
  const foundingCourseIds: Record<string, true> = {};
  const foundingBuildableIds: Record<string, true> = {};
  for (const node of tech) {
    if (node.status === 'locked') continue;
    if (node.kind === 'course') foundingCourseIds[node.id] = true;
    else if (isPlaceableKind(node)) foundingBuildableIds[node.id] = true;
  }
  // Centre Founders Hall's footprint on the grid: the founding landmark
  // sits in the middle of the map, not a corner (see the placements entry
  // below). Math.floor keeps the anchor on a whole tile; the footprint is odd
  // vs. even against the grid dimensions, so this lands as close to dead
  // centre as the tile grid allows.
  const foundersHall = tech.find((t) => t.id === GENED_BUILDING_ID)!;
  const foundersHallFootprint = footprintOf(foundersHall);
  const foundersHallPlacement = placementFor(
    Math.floor((CAMPUS_GRID_HEIGHT - foundersHallFootprint.h) / 2),
    Math.floor((CAMPUS_GRID_WIDTH - foundersHallFootprint.w) / 2),
    foundersHallFootprint,
  );

  const state: GameState = {
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
      // Founding mix: a college opens with ALL FOUR class years present and
      // BALANCED (≈ FOUNDING_BODY / 4 each), not a freshman class only — so
      // there is a graduating class from year one and the body opens at the
      // steady-state structure the campus would otherwise take years of
      // lumpy cycles to reach. See FOUNDING_COHORTS in schoolTypeData.ts.
      cohorts: { ...FOUNDING_COHORTS },
      // No housing at founding: the whole body is commuters, and dorm beds
      // are built up from zero like every other facility (see
      // campusData.ts). Enrollment is never capacity-gated (see
      // admissionsSystem.ts), so this has no bearing on how big the school
      // can grow — only on the Housing satisfaction attribute and the
      // physical-plant seat upkeep (see satisfactionSystem.ts/
      // financeSystem.ts) until the player builds some.
      capacity: 0,
      satisfaction: 70,
      // Overwritten on the very first TICK by satisfactionSystem.ts's real
      // computation — this starting value just matches the legacy flat 70
      // so the pre-tick UI doesn't show a startling all-zero breakdown.
      satisfactionBreakdown: { academic: 70, social: 70, basicNeeds: 70, health: 70, housing: 70 },
      // Word of mouth seeds neutral: 70 matches WORD_OF_MOUTH_NEUTRAL (see
      // admissionsSystem.ts), so year 1's funnel gets no word-of-mouth swing
      // until a real year of satisfaction has accumulated.
      satisfactionYearSum: 0, satisfactionYearWeeks: 0, priorYearAvgSatisfaction: 70,
      applicantPool: preset.startingApplicantPool,
      // Neutral placeholders until the first summer admissions cycle
      // resolves and sets these for real — see RESOLVE_ADMISSIONS.
      admitRate: 0.5,
      incomingQuality: 50,
    },
    // Year 1 runs under this founding default (no scholarships) with the starting
    // enrolled/applicant figures below — no school-type variation here,
    // unlike tuitionCeiling/startingApplicantPool. The first real admissions
    // interrupt, at the end of year 1, runs the funnel and sets year 2's
    // enrolled class from the player's tuition and scholarships choices.
    admissions: {
      scholarshipRate: 0,
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
    // courseSlots cover the six gen-ed core courses' requiresFaculty fields
    // (techData.ts's GENED_FIELDS: English x2 — GE110 + GE160 —
    // Mathematics, Philosophy, Physics, History x1 each) plus exactly one
    // spare slot per field. Every tier-1 major course sits behind the
    // gen-ed core as a prereq, and five of those tier-1 courses
    // (AERO101/PHYS101 in Physics, HIST101 in History, CRWR101/ENGL101 in
    // English, MATH101/DATA101 in Mathematics, PHIL101 in Philosophy —
    // techData.ts's SCHOOLS) share a field with a founding hire, so the
    // spare slot lets the player open one of those the moment gen-ed
    // clears, without a hire in the way. Every other field still needs a
    // fresh hire before its tier-1 course can start.
    faculty: [
      {
        id: 'f1', name: 'Dr. Alma Reyes', field: 'Physics', teaching: 72, research: 65, teachingPotential: 82, researchPotential: 78,
        tenureWeeks: 0, weeksListed: 0, acclaim: 0, salary: facultySalary(72, 65, 0), courseSlots: 2,
        nationality: 'United States', flag: '🇺🇸', gender: 'female', heritage: 'Hispanic/Latin American',
        bio: 'Earned a doctorate in Physics at Ravensmoor Institute; research centers on astrophysical modeling.',
      },
      {
        id: 'f2', name: 'Dr. John Okafor', field: 'History', teaching: 80, research: 55, teachingPotential: 88, researchPotential: 68,
        tenureWeeks: 0, weeksListed: 0, acclaim: 0, salary: facultySalary(80, 55, 0), courseSlots: 2,
        nationality: 'Nigeria', flag: '🇳🇬', gender: 'male', heritage: 'West African',
        bio: 'Earned a doctorate in History at the University of Calderwood; research centers on maritime trade networks.',
      },
      {
        id: 'f3', name: 'Dr. Grace Bennett', field: 'English', teaching: 78, research: 60, teachingPotential: 85, researchPotential: 72,
        tenureWeeks: 0, weeksListed: 0, acclaim: 0, salary: facultySalary(78, 60, 0), courseSlots: 3,
        nationality: 'United Kingdom', flag: '🇬🇧', gender: 'female', heritage: 'Anglo/Western European',
        bio: 'Earned a doctorate in English at Marchmont University; research centers on rhetoric and composition.',
      },
      {
        id: 'f4', name: 'Dr. Priya Iyer', field: 'Mathematics', teaching: 70, research: 68, teachingPotential: 80, researchPotential: 79,
        tenureWeeks: 0, weeksListed: 0, acclaim: 0, salary: facultySalary(70, 68, 0), courseSlots: 2,
        nationality: 'India', flag: '🇮🇳', gender: 'female', heritage: 'South Asian',
        bio: 'Earned a doctorate in Mathematics at Ironwood University; research centers on numerical analysis.',
      },
      {
        id: 'f5', name: 'Dr. Elena Novak', field: 'Philosophy', teaching: 75, research: 62, teachingPotential: 83, researchPotential: 71,
        tenureWeeks: 0, weeksListed: 0, acclaim: 0, salary: facultySalary(75, 62, 0), courseSlots: 2,
        nationality: 'Poland', flag: '🇵🇱', gender: 'female', heritage: 'Slavic/Eastern European',
        bio: 'Earned a doctorate in Philosophy at Amberfield University; research centers on ethics and moral philosophy.',
      },
    ],
    // The single central Buildable list (see README's "central abstraction")
    // — courses, academic buildings, dorms, AND campus-life facilities all
    // live here together.
    tech,
    developing: {},
    // Only Founders Hall is pre-placed: it opens 'done' (techData.ts), so
    // it needs a spot on the map from day one. It is centred on the grid
    // (foundersHallPlacement above) — the founding landmark the rest of the
    // campus grows out around — rather than tucked in a corner like the
    // player's later top-left auto-sited builds. Everything else, dorms
    // included, is placed by the player as it is built.
    placements: { [GENED_BUILDING_ID]: foundersHallPlacement },
    pathways: {},
    // The ground the university is founded on (see data/treeData.ts). Seeded
    // AGAINST the placements above, so no tree is generated under Founders
    // Hall — the only building that exists at founding — rather than planted
    // and then felled.
    trees: seedTrees({ [GENED_BUILDING_ID]: foundersHallPlacement }),
    rivals: initialRivals(),
    // +GENED_BUILDING_REPUTATION_BONUS: a small gen-ed academic-standing
    // baseline the founding institution opens with (see techData.ts — it is
    // NOT tied to whether Founders Hall has been built yet, since it always
    // has been by founding; reputation is a stock that drifts toward a
    // target, and there is no apply-once reputation effect). `name` is the
    // player's half only ("Blackmoor"); the
    // institutional half starts as College for every school and is only ever
    // changed by the one-time charter offer the first lab unlocks (see
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
    pendingInterrupt: null,
    // Nothing celebrated and nothing fired yet; week 0 reads as "never"
    // (the clock's first real week is 1 — see eventData.ts's absoluteWeek).
    events: {
      pendingMilestones: [], lastMilestoneWeek: 0, lastDecisionWeek: 0, decisionHistory: {},
      // No demand raised and none outstanding; week 0 reads as "never" for
      // the cooldown too (see data/demandData.ts's DEMAND_COOLDOWN_WEEKS).
      pendingDemand: null, activeDemand: null, lastDemandWeek: 0,
    },
    // No student organisations at founding, and none can form until the
    // campus has a student center to form them in (see
    // data/studentLifeData.ts). Greek life is gated a second time, on the
    // player explicitly chartering a Hellenic Council — so a run that
    // declines it, or never gets asked, carries these two lists at zero
    // and one empty flag forever, which is exactly what a school without
    // Greek life should look like in state.
    orgs: {
      clubs: [], chapters: [], teams: [],
      // A full, staggered coaching-staff market from week one — see
      // facultyData.ts's initialCandidatePool for why "starts full, not
      // empty" matters (a pool seeded flat would age out as one
      // synchronized cohort instead of churning continuously).
      coachCandidates: initialCoachCandidatePool(),
      pendingPetitions: [],
      hellenicCouncilApproved: false, hellenicCouncilOffered: false, lastFormationWeek: 0,
      athleticsBudget: DEFAULT_ATHLETICS_BUDGET,
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
    // Every course and buildable the school starts with unlocked is
    // pre-marked seen (see foundingCourseIds/foundingBuildableIds above) —
    // the gen-ed core and the founding buildables were never "revealed" to
    // this player, they were just always there, so no badge. candidateIds
    // starts genuinely empty: unlike courses/buildables, no candidate is
    // ever "needed" at founding (every founding hire has a free slot to
    // spare beyond their own gen-ed course — see the roster above), so
    // there is nothing here to except.
    seen: { courseIds: foundingCourseIds, buildableIds: foundingBuildableIds, candidateIds: {} },
  };
  return state;
}

export { WEEKS_PER_YEAR };
