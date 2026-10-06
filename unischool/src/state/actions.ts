import type { Species } from '../data/treeData';
import type { DemandSubject } from '../data/demandData';
import type {
  AthleticsBudgetTier, BenchFacing, Coach, DressingKind, Facing, GameState, InitiativeDepth, Pillar, Placements, ScholarshipLevel, SchoolColors, SummerDecision, TileCoord, Vernacular,
} from './types';
import { DEFAULT_ATHLETICS_BUDGET, initialCoachCandidatePool } from '../data/studentLifeData';
import { emptyDowntown } from '../data/downtownData';
import type { DecisionEventContext } from '../data/eventData';
import { WEEKS_PER_YEAR } from './types';
import { centredPlacement, footprintOf, isPlaceableKind } from './campusMap';
import { initialTech, FOUNDERS_HALL_REPUTATION_BONUS, FOUNDERS_HALL_ID, ACADEMIC_HALL_SLOTS } from '../data/techData';
import { repriceCatalogue, unlockAvailable } from '../systems/techtree/techSystem';
import { refillOffers } from '../systems/techtree/programOffers';
import { initialDorms } from '../data/campusData';
import { seedTrees } from '../data/treeData';
import { initialFacilities } from '../data/facilitiesData';
import { initialRivals } from '../data/rivalData';
import { initialCandidatePool } from '../data/facultyData';
import { admitRate } from '../systems/admissions/admissionsSystem';
import { RESEARCH_STANDING_BASELINE, SOCIAL_STANDING_BASELINE } from '../systems/prestige/prestigeSystem';
import { baseShareCohortCounts } from '../systems/admissions/cohorts';
import {
  FOUNDING_PRESET, FOUNDING_VERNACULAR, STARTING_ENDOWMENT, STARTING_TUITION,
  FOUNDING_CLASSES, FOUNDING_PROGRAMS,
} from '../data/foundingData';
import { FOUNDING_COLORS, schoolColorsOf } from '../data/schoolColors';
import { OPENING_LETTERS } from '../data/eventData';
import { DEFAULT_SEED, withRandom } from '../engine/random';
import { foundingLadder, holdBackUnreached } from '../systems/ladder/ladderSystem';

// A founded university opens with only Founders Hall built, pre-placed at the
// map's center unless the founding is guided (state/opening.ts sites it then).
// The founding body is all commuters and enrollment is never capacity-gated,
// so `capacity` starts at 0. Since Plan 80D it opens with nothing to teach:
// no professor, no course, and every program slot of Founders Hall empty.
// The first offers are the founding pillars (foundingData.ts's
// FOUNDING_PROGRAMS), and the market lists a professor for each; until the
// courses come, the college is crowded (instructionCapacity.ts).

// Swapped for "University" only by the charter offer.
export const STARTING_INSTITUTION_SUFFIX = 'College';

// The map's campus tools; the right button applies the armed tool's opposite.
export type CampusTool = 'draw' | 'erase' | 'plant' | 'fell' | 'lamp' | 'bench';

// All the ways a player can change the world. The reducer is the only thing
// that interprets these; UI dispatches them, systems never do.
export type Action =
  | { type: 'TICK' }                                   // advance one week
  // `guided`: a human founding, with the opening walkthrough (state/opening.ts).
  | { type: 'START_GAME'; name: string; vernacular: Vernacular; colors: SchoolColors; guided?: boolean; seed?: number; sandbox?: boolean }
  | { type: 'ADVANCE_OPENING' }
  // `keepLetters`: skipping from a mid-walk card leaves the first year's
  // letters on; the welcome's decline turns them off too.
  | { type: 'SKIP_OPENING'; keepLetters?: boolean }
  // Courses only; placeables use PLACE_BUILDABLE. `facultyId` is omitted only
  // by the headless sim, letting the engine pick the strongest eligible teacher.
  | { type: 'START_DEVELOPMENT'; nodeId: string; facultyId?: string }
  // The only way a program enters the curriculum (techSystem.ts's foundProgram).
  | { type: 'FOUND_PROGRAM'; programId: string; hallId: string; slot: number; facultyId: string }
  // One global offer a year set aside for a fresh draw (Plan 78D,
  // programOffers.ts's declineOffer); a second in the same year is refused.
  | { type: 'DECLINE_OFFER'; programId: string }
  // Free, but the program goes dark for RELOCATION_WEEKS.
  | { type: 'RELOCATE_PROGRAM'; programId: string; hallId: string; slot: number }
  // An office of the administration into a free slot of Founders Hall, for
  // its price (Plan 89, systems/administration/offices.ts); closing one
  // leaves its slot dark for OFFICE_CLOSING_WEEKS.
  | { type: 'OPEN_OFFICE'; officeId: string; slot: number }
  | { type: 'CLOSE_OFFICE'; officeId: string }
  // The Student Activities Office charters a club at once (Plan 89E); the
  // Athletics Development Office founds a varsity team from a sport club,
  // its venue standing, without a petition.
  | { type: 'CHARTER_CLUB' }
  | { type: 'FOUND_TEAM'; clubId: string }
  | { type: 'REASSIGN_COURSE_FACULTY'; courseId: string; facultyId: string }
  // Paid up front. Each participant loses RESEARCH_COMMITMENT_SLOTS; courses
  // that no longer fit are shed lowest tier first, handed to colleagues with
  // room, and orphaned only if nobody has any (planCommitmentCoverage).
  | { type: 'START_INITIATIVE'; labId: string; topicId: string; depth: InitiativeDepth; facultyIds: string[] }
  // Funding is forfeit, but the participants are released immediately.
  | { type: 'CANCEL_INITIATIVE'; labId: string }
  // Straight off the candidate list, no fee or wait; the cost is the salary.
  | { type: 'HIRE_FACULTY'; facultyId: string }
  // Orphans every course they taught until reassigned, and the field stays
  // over-committed until a replacement is hired. The UI warns first.
  | { type: 'FIRE_FACULTY'; facultyId: string }
  // Builds and sites a placeable in one step: same gate and countdown as
  // START_DEVELOPMENT, and its footprint, turned to its facing, is reserved
  // from week one, so it may not overlap anything done or under
  // construction. Effects still apply only on completion.
  | { type: 'PLACE_BUILDABLE'; buildableId: string; row: number; col: number; facing: Facing; borrow?: boolean; gift?: boolean; endowment?: boolean }
  // Decorative; the only check is that the tile is on the grid.
  | { type: 'ADD_PATH_TILE'; tile: TileCoord }
  | { type: 'REMOVE_PATH_TILE'; tile: TileCoord }
  // Decorative; nothing is planted under a building or a path.
  // `species` asks for a kind (Plan 37); omitted, whatever the dice say.
  | { type: 'PLANT_TREE'; tile: TileCoord; species?: Species }
  | { type: 'FELL_TREE'; tile: TileCoord }
  // A straight run of path, laid and adjusted in one step (the Shift-held draw).
  | { type: 'PAINT_PATH_TILES'; add: TileCoord[]; remove: TileCoord[] }
  // The estate (systems/estate): how much of the upkeep to pay, and paying
  // off one building's backlog under scaffolding.
  | { type: 'SET_MAINTENANCE_FUNDING'; level: number }
  | { type: 'SET_DRAW_RATE'; rate: number }
  | { type: 'MOVE_TO_ENDOWMENT'; amount: number }
  // The standing sweep (systems/finance/sweep.ts): weeks of expenses kept
  // as cash, one of SWEEP_STEPS, or null for off.
  | { type: 'SET_SWEEP'; weeks: number | null }
  | { type: 'READ_BOARD_LETTER' }
  | { type: 'READ_DEMAND' }
  | { type: 'HOLD_REUNION'; classYear: number }
  // Fills a seat of the administration (systems/delegation/seats.ts): from
  // the faculty when facultyId is given, from outside otherwise.
  | { type: 'APPOINT_SEAT'; seatId: string; school: string | null; facultyId?: string }
  | { type: 'SET_SEAT_POLICY'; seatId: string; school: string | null; policy: string }
  | { type: 'RENOVATE_BUILDING'; id: string }
  | { type: 'EXTEND_BUILDING'; id: string }
  | { type: 'DECLARE_HISTORIC'; id: string }
  // Plan 39: a building under construction called off, its cost returned;
  // a standing one pulled down, for nothing and with nothing back.
  | { type: 'CANCEL_CONSTRUCTION'; id: string }
  | { type: 'DEMOLISH_BUILDING'; id: string }
  // A lamp or a bench beside a path, or lifted (components/dressing.tsx). A
  // bench takes the facing the player turned it to, or faces the path.
  | { type: 'PLACE_DRESSING'; tile: TileCoord; kind: DressingKind; facing?: BenchFacing }
  | { type: 'REMOVE_DRESSING'; tile: TileCoord }
  // Launches an advancement campaign (systems/alumni/campaigns.ts), which
  // replaced the endowment campaign in Plan 30.
  | { type: 'LAUNCH_CAMPAIGN'; id: string }
  // Fallback for an interrupt type InterruptModal.tsx doesn't recognise.
  | { type: 'RESOLVE_INTERRUPT' }
  // Advances the summer one beat without moving the clock; leaving the
  // Admissions beat carries the levers as `decision`.
  // `promises`: leaving the Review beat, the offered promises taken (Plan 33);
  // the rest are declined.
  | { type: 'RESOLVE_SUMMER_BEAT'; decision?: SummerDecision; promises?: string[] }
  // Locks the blind tuition on the admissions beat (SummerPayload.lockedTuition).
  | { type: 'LOCK_TUITION'; tuition: number }
  // Resolves the summer: sets tuition (the only place it changes) and the
  // admit rate, commits the class, and advances the clock. Accepted at any
  // beat. Pending petitions not in `approvedPetitionIds` are declined.
  | { type: 'RESOLVE_ADMISSIONS'; tuition: number; admitRate: number; approvedPetitionIds: string[] }
  // The interrupts below advance the clock when dismissed: they are raised
  // after that week's systems already ran.
  | { type: 'RESOLVE_REPORT' }
  // `skipAll` declines the rest of the opening letters for this run.
  | { type: 'RESOLVE_LETTER'; skipAll: boolean }
  // Puts down a milestone's note (data/ladderData.ts). Never holds the clock.
  | { type: 'READ_MILESTONE'; id: string }
  // Puts down a celebration's or a report's letter (Plan 95T). Never holds
  // the clock.
  | { type: 'READ_NEWS'; id: string }
  | { type: 'RESOLVE_MILESTONE' }
  | { type: 'RESOLVE_RESEARCH_REPORT' }
  // A demand is answered only by building what it asks for before the
  // deadline; there is deliberately no accept/refuse.
  // The college's one rename, in the charter's letter while it waits
  // (Plan 80D); cosmetic.
  | { type: 'RENAME_COLLEGE'; name: string; suffix: 'College' | 'University' }
  // Restaffing (Plan 59, systems/faculty/restaffing.ts): every unstaffed
  // course of a school, or of the college when school is null; `courseIds`
  // narrows it to a Curriculum section's courses (Plan 80B).
  | { type: 'RESTAFF'; school: string | null; courseIds?: string[] }
  // The Deans' year-end recommendations: accept every school's plan, or not.
  | { type: 'RESOLVE_DEAN_RECOMMENDATIONS'; accept: boolean }
  // The specialization (Plan 85D, systems/prestige/milestone.ts), at the
  // close of a summer at the milestone: a pillar, for good, or null for not
  // this year (offered again at the next summer's close). Holds no week: the
  // choice is raised after the summer turned the page.
  | { type: 'RESOLVE_SPECIALIZATION'; pillar: Pillar | null }
  // The faculty training program (Plan 85E, systems/faculty/training.ts):
  // one of the year's training picks at the Faculty Training Institute.
  // Teaching and its potential rise a grade's width; the professor teaches
  // one course fewer for a term, and a course that no longer fits moves to a
  // colleague with room, or waits for an instructor.
  | { type: 'TRAIN_FACULTY'; facultyId: string }
  // `candidate` is the whole person: they exist only in the interrupt
  // payload. `null` declines and records the week asked.
  | { type: 'RESOLVE_ATHLETIC_DIRECTOR'; candidate: Coach | null; mascot: string }
  | { type: 'RESOLVE_MASCOT'; mascot: string } // the first sport club's naming beat
  | { type: 'RESOLVE_CHAMPIONSHIP' }
  // `ctx` comes back from the interrupt so the reducer charges exactly what
  // the modal showed. An unaffordable choice is refused but still clears it.
  | { type: 'RESOLVE_DECISION_EVENT'; eventId: string; choiceId: string; ctx: DecisionEventContext }
  // An answer to an event from the catalogue (catalogueEngine.ts), inline
  // from the panel or a letter's. A letter's answer resumes the clock.
  | { type: 'RESOLVE_CATALOGUE_EVENT'; instanceId: string; choiceId: string }
  // A standing dial, free and adjustable any time.
  | { type: 'SET_ATHLETICS_BUDGET'; tier: AthleticsBudgetTier }
  | { type: 'SET_TEAM_ORDER'; order: string[] } // the priority list, dragged
  // A team's scholarship budget (Plan 80G): spent, and recruiting, only
  // while it is a flagship.
  | { type: 'SET_SCHOLARSHIPS'; teamId: string; level: ScholarshipLevel }
  | { type: 'EXPAND_VENUE'; venueId: string } // a venue rung, in place
  // Refused if the candidate's field doesn't fit the role or the role is
  // filled (fire the incumbent first). Salary is a recurring line.
  | { type: 'HIRE_COACH'; candidateId: string; teamId: string; role: 'head' | 'assistant' | 'trainer' }
  // The coach is discarded, not returned to the pool.
  | { type: 'FIRE_COACH'; teamId: string; role: 'head' | 'assistant' | 'trainer' }
  // Cuts a varsity program for good (Plan 95V, systems/athletics/cut.ts).
  // Refused for a flagship in season.
  | { type: 'CUT_TEAM'; teamId: string }
  // Clears alert badges (types.ts's SeenState); only the badged view sends it.
  | { type: 'MARK_SEEN'; kind: 'course' | 'buildable'; ids: string[] }
  // A gated tab has opened (TabNav.tsx's TAB_GATES). App.tsx passes
  // `announce: false` for gates already open on first render.
  | { type: 'NOTE_TAB_AVAILABLE'; id: string; label: string; announce: boolean }
  // Playtest actions, dispatched only by DebugPanel.tsx behind the playtest
  // flag; never by systems or the balance harness.
  | { type: 'DEBUG_SET_CASH'; amount: number }
  | { type: 'DEBUG_SET_PRESTIGE'; value: number }
  // Sets the stock; it drifts back toward its target afterwards.
  | { type: 'DEBUG_SET_SATISFACTION'; value: number }
  | { type: 'DEBUG_SET_TUITION'; value: number }
  // Without `autoResolve`, stops at the first modal.
  | { type: 'DEBUG_JUMP'; weeks: number; autoResolve: boolean }
  // Bypasses eligibility and cooldowns; the payload is rolled as at fire time.
  | { type: 'DEBUG_FORCE_EVENT'; eventId: string }
  | { type: 'DEBUG_FORCE_DEMAND'; subject: DemandSubject }
  | { type: 'DEBUG_FORCE_MILESTONE' }
  | { type: 'DEBUG_FORCE_REPORT' }
  // The Curriculum tab's drag-and-drop swap. Atomic; an illegal swap is a no-op.
  | { type: 'SWAP_COURSE_FACULTY'; courseA: string; courseB: string }
  // Pays to raise the weekly chance of a candidate in a field.
  | { type: 'POST_SEARCH'; field: string }
  // Puts the one tier-1 library back into 'developing' in place.
  | { type: 'RENOVATE_LIBRARY' }
  | { type: 'SAVE_GAME' }
  | { type: 'SAVE_FAILED'; manual: boolean }
  // useGame.ts erases the save.
  | { type: 'RESET' };

// A minimal placeholder state for the startup screen. The expensive seeding
// waits for START_GAME.
export function createPreStartState(): GameState {
  return {
    rng: DEFAULT_SEED,
    clock: { year: 1, week: 1 },
    finance: {
      cash: 0, endowment: 0, endowmentCampaigns: 0, weeksInTheRed: 0,
      listedTuition: 0, tuitionByClass: { freshman: 0, sophomore: 0, junior: 0, senior: 0 },
      weeklyOpEx: 0,
    },
    students: {
      classes: { freshman: 0, sophomore: 0, junior: 0, senior: 0 },
      cohortsByClass: {
        freshman: baseShareCohortCounts(0), sophomore: baseShareCohortCounts(0),
        junior: baseShareCohortCounts(0), senior: baseShareCohortCounts(0),
      },
      capacity: 0, satisfaction: 0,
      satisfactionBreakdown: { academic: 0, social: 0, basicNeeds: 0, health: 0, housing: 0 },
      satisfactionYearSum: 0, satisfactionYearWeeks: 0, priorYearAvgSatisfaction: 0,
      crowdingYearSum: 0, crowdingYearWeeks: 0,
      applicantPool: 0, applicantLift: 0, admitRate: 0, incomingQuality: 0,
      lastFunnel: null,
    },
    faculty: [],
    tech: [],
    developing: {},
    halls: {},
    programOffers: [],
    searches: {},
    placements: {},
    pathways: {},
    trees: {},
    rivals: [],
    self: { name: '', suffix: '', universityCharterOffered: false, mascot: '', reputation: 0, reportCard: null, socialStanding: 0, researchStanding: 0, vernacular: FOUNDING_VERNACULAR, colors: schoolColorsOf(FOUNDING_COLORS), facultyServed: 0 },
    history: [],
    log: [],
    pendingInterrupt: null,
    events: {
      pendingMilestones: [], lastMilestoneWeek: 0, lastDecisionWeek: 0, decisionHistory: {},
      pendingDemand: null, activeDemand: null, lastDemandWeek: 0,
      opening: { read: [], skipped: false, stage: 'play' },
      passedResponses: [],
      news: [],
    },
    orgs: {
      clubs: [], chapters: [], teams: [], coachCandidates: [], pendingPetitions: [],
      hellenicCouncilApproved: false, hellenicCouncilOffered: false, lastFormationWeek: 0,
      athleticsBudget: DEFAULT_ATHLETICS_BUDGET,
      teamOrder: [],
      studentCenterWeek: 0,
      mascotBeatPending: false,
      athleticDirector: null,
      lastSeason: {},
      titles: [],
      pendingTitles: [],
      complexRuns: [],
      cutPrograms: [],
      season: {},
      rivalries: {},
      athleticDirectorAskedWeek: 0,
    },
    research: {
      publications: 0, grants: 0, grantIncome: 0,
      breakthroughs: 0, prizes: 0, initiatives: {}, completedInitiatives: [],
      lastOutputWeek: 0, pendingCompletions: [], landmarkWork: [],
    },
    candidates: [],
    started: false,
    hasEnteredRankings: false,
    specialization: 'none',
    training: { year: 1, trained: [] },
    downtown: emptyDowntown(),
    milestones: {},
    courseFaculty: {},
    seen: { courseIds: {}, buildableIds: {}, tabIds: {} },
    ladder: foundingLadder(1),
  };
}

// Founds a university from a seed: every founding draw comes from that seed's
// stream, and the state carries the stream on.
export function createInitialState(
  name: string,
  vernacular: Vernacular = FOUNDING_VERNACULAR,
  colors: SchoolColors = schoolColorsOf(FOUNDING_COLORS),
  guided = false,
  seed = DEFAULT_SEED,
): GameState {
  const stream = { rng: seed | 0 };
  const state = withRandom(stream, () => foundState(name, vernacular, colors, guided));
  state.rng = stream.rng;
  return state;
}

// The prestige the founding admit rate is seeded from: the opening before
// Plan 95N lowered it to 42.
export const FOUNDING_ADMIT_PRESTIGE = 51.5;

function foundState(
  name: string,
  vernacular: Vernacular = FOUNDING_VERNACULAR,
  colors: SchoolColors = schoolColorsOf(FOUNDING_COLORS),
  guided = false,
): GameState {
  const preset = FOUNDING_PRESET;

  const tech = [...initialTech(), ...initialDorms(), ...initialFacilities()];

  const foundersHall = tech.find((t) => t.id === FOUNDERS_HALL_ID)!;
  foundersHall.builtYear = 1;
  const foundingPlacements: Placements = guided ? {} : { [FOUNDERS_HALL_ID]: centredPlacement(footprintOf(foundersHall)) };

  const foundingReputation = preset.startingReputation + FOUNDERS_HALL_REPUTATION_BONUS;

  const foundingTuition = STARTING_TUITION;

  const state: GameState = {
    rng: 0, // written by createInitialState once the founding draws are done
    clock: { year: 1, week: 1 },
    finance: {
      cash: preset.startingCash,
      endowment: STARTING_ENDOWMENT,
      endowmentCampaigns: 0,
      listedTuition: foundingTuition,
      tuitionByClass: {
        freshman: foundingTuition, sophomore: foundingTuition,
        junior: foundingTuition, senior: foundingTuition,
      },
      weeklyOpEx: 0,
      weeksInTheRed: 0,
    },
    students: {
      // All four class years, balanced, so a class graduates in year one.
      classes: { ...FOUNDING_CLASSES },
      // Nobody chose these classes, so they open on the neutral cohort prior.
      cohortsByClass: {
        freshman: baseShareCohortCounts(FOUNDING_CLASSES.freshman),
        sophomore: baseShareCohortCounts(FOUNDING_CLASSES.sophomore),
        junior: baseShareCohortCounts(FOUNDING_CLASSES.junior),
        senior: baseShareCohortCounts(FOUNDING_CLASSES.senior),
      },
      // Beds affect Housing satisfaction and upkeep, never enrollment.
      capacity: 0,
      satisfaction: 70,
      satisfactionBreakdown: { academic: 70, social: 70, basicNeeds: 70, health: 70, housing: 70 },
      // Matches WORD_OF_MOUTH_NEUTRAL, so year 1 gets no word-of-mouth swing.
      satisfactionYearSum: 0, satisfactionYearWeeks: 0, priorYearAvgSatisfaction: 70,
      crowdingYearSum: 0, crowdingYearWeeks: 0,
      applicantPool: preset.startingApplicantPool,
      applicantLift: 0,
      // Seeded from the old opening (Plan 95N), so the lower opening
      // prestige does not shrink the first class.
      admitRate: admitRate(FOUNDING_ADMIT_PRESTIGE),
      incomingQuality: 50,
      lastFunnel: null,
    },
    // Nobody on the payroll: the first professors are appointed from the
    // founding market (initialCandidatePool).
    faculty: [],
    tech,
    developing: {},
    courseFaculty: {},
    halls: {
      [FOUNDERS_HALL_ID]: Array.from({ length: ACADEMIC_HALL_SLOTS }, () => ({ programId: null })),
    },
    // The founding pillars; refillOffers draws their replacements as they
    // are founded.
    programOffers: [...FOUNDING_PROGRAMS],
    searches: {},
    placements: foundingPlacements,
    pathways: {},
    // Seeded against the placements so no tree starts under Founders Hall.
    trees: seedTrees(foundingPlacements),
    rivals: initialRivals(),
    self: {
      name,
      suffix: STARTING_INSTITUTION_SUFFIX,
      universityCharterOffered: false,
      mascot: '',
      reputation: foundingReputation,
      reportCard: null,
      socialStanding: SOCIAL_STANDING_BASELINE,
      researchStanding: RESEARCH_STANDING_BASELINE,
      vernacular,
      colors: { ...colors },
      facultyServed: 0,
    },
    history: [],
    log: [
      { year: 1, week: 1, message: 'The college opens its doors.', kind: 'info' },
    ],
    pendingInterrupt: null,
    // Week 0 reads as "never".
    events: {
      pendingMilestones: [], lastMilestoneWeek: 0, lastDecisionWeek: 0, decisionHistory: {},
      pendingDemand: null, activeDemand: null, lastDemandWeek: 0,
      // A guided opening's welcome stands in for the first letter.
      opening: guided
        ? { read: [OPENING_LETTERS[0].id], skipped: false, stage: 'welcome' }
        : { read: [], skipped: false, stage: 'play' },
      passedResponses: [],
      news: [],
    },
    orgs: {
      clubs: [], chapters: [], teams: [],
      // Starts full and staggered so the pool churns rather than aging out
      // in one wave.
      coachCandidates: initialCoachCandidatePool(),
      pendingPetitions: [],
      hellenicCouncilApproved: false, hellenicCouncilOffered: false, lastFormationWeek: 0,
      athleticsBudget: DEFAULT_ATHLETICS_BUDGET,
      teamOrder: [],
      studentCenterWeek: 0,
      mascotBeatPending: false,
      athleticDirector: null,
      lastSeason: {},
      titles: [],
      pendingTitles: [],
      complexRuns: [],
      cutPrograms: [],
      season: {},
      rivalries: {},
      athleticDirectorAskedWeek: 0,
    },
    research: {
      publications: 0, grants: 0, grantIncome: 0,
      breakthroughs: 0, prizes: 0, initiatives: {}, completedInitiatives: [],
      lastOutputWeek: 0, pendingCompletions: [], landmarkWork: [],
    },
    candidates: initialCandidatePool(),
    started: true,
    hasEnteredRankings: false,
    specialization: 'none',
    training: { year: 1, trained: [] },
    downtown: emptyDowntown(),
    milestones: {},
    seen: { courseIds: {}, buildableIds: {}, tabIds: {} },
    ladder: foundingLadder(1),
  };

  holdBackUnreached(state);
  unlockAvailable(state);

  // Founding content is not "new": no alert badges on day one.
  for (const node of state.tech) {
    if (node.status === 'locked') continue;
    if (node.kind === 'course') state.seen.courseIds[node.id] = true;
    else if (isPlaceableKind(node)) state.seen.buildableIds[node.id] = true;
  }

  refillOffers(state);
  repriceCatalogue(state);
  return state;
}

export { WEEKS_PER_YEAR };
