import type { DemandSubject } from '../data/demandData';
import type {
  AthleticsBudgetTier, Coach, GameState, InitiativeDepth, Placements, SchoolColors, SummerDecision, TileCoord, Vernacular,
} from './types';
import { DEFAULT_ATHLETICS_BUDGET, initialCoachCandidatePool } from '../data/studentLifeData';
import type { DecisionEventContext } from '../data/eventData';
import { WEEKS_PER_YEAR } from './types';
import { centredPlacement, footprintOf, isPlaceableKind } from './campusMap';
import { initialTech, FOUNDERS_HALL_REPUTATION_BONUS, FOUNDERS_HALL_ID, ACADEMIC_HALL_SLOTS, programById } from '../data/techData';
import { unlockAvailable } from '../systems/techtree/techSystem';
import { refillOffers } from '../systems/techtree/programOffers';
import { initialDorms } from '../data/campusData';
import { seedTrees } from '../data/treeData';
import { initialFacilities } from '../data/facilitiesData';
import { initialRivals } from '../data/rivalData';
import { initialCandidatePool, facultySalary, grownStat, FOUNDING_TENURE_WEEKS } from '../data/facultyData';
import { admitRate } from '../systems/admissions/admissionsSystem';
import { RESEARCH_STANDING_BASELINE, SOCIAL_STANDING_BASELINE } from '../systems/prestige/prestigeSystem';
import { baseShareCohortCounts } from '../systems/admissions/cohorts';
import {
  FOUNDING_PRESET, FOUNDING_VERNACULAR, STARTING_ENDOWMENT, STARTING_TUITION,
  FOUNDING_CLASSES, FOUNDING_PROGRAMS, FOUNDING_COURSES_PER_PROGRAM,
} from '../data/foundingData';
import { FOUNDING_COLORS, schoolColorsOf } from '../data/schoolColors';
import { OPENING_LETTERS } from '../data/eventData';

// A founded university opens with a near-empty campus, with ONE exception:
// Founders Hall (techData.ts's FOUNDERS_HALL_ID), pre-built ('done')
// and — in a headless founding — pre-placed at the centre of the map, the
// university's literal founding hall. A GUIDED founding (the startup
// screen's, see START_GAME's `guided`) leaves it unsited: placing it is the
// opening walkthrough's first step (state/opening.ts), and the
// walk sites it for free. Every other founding buildable (the starting
// dorm, dining hall, and the rest of the seeded-'available' facility
// chains) is seeded 'available', so the player builds and sites each from
// scratch; the
// founding student body is entirely commuters, with no dorm at all (see
// campusData.ts and admissionsSystem.ts — enrollment is never capacity-
// gated). `capacity` accordingly starts at 0 below: there is no bed count to
// fold in the way a pre-built dorm used to require.
//
// THE FOUNDING COLLEGE (Plan 19). The college is not empty inside: three
// Social Sciences & Humanities programs are housed in Founders Hall before
// the player sees the game, each with its first two courses developed and
// taught by the founding roster. Six courses at SEATS_PER_COURSE is the
// 480 seats the founding body of 350 sits in (see instructionCapacity.ts),
// which is why it is six and not three; and English, History and
// Philosophy because those are what the five professors on the payroll
// can teach. The other three rooms are free, and the offer queue draws
// from week one, so the first decision the game asks is the one the rest
// of the run is built on: found a fourth program. The programs themselves
// are foundingData.ts's FOUNDING_PROGRAMS.
// Who teaches the founding courses: the roster below, by field.
const FOUNDING_INSTRUCTOR_BY_PROGRAM: Record<string, string> = { ENGL: 'f3', HIST: 'f2', PHIL: 'f5' };
// The founding offer draw is rigged, once (see programOffers.ts's
// refillOffers): at least one of the first three offers is a program the
// college can staff out of the roster it already has. Named MAJORS rather
// than "a field with a free slot", because a field is not a major: Iyer's
// spare slots also staff Data Science and Bennett's Creative Writing, and
// a college teaching literature, history and logic whose fourth program is
// Data Science is a funny opening. Sociology is the opening school's own
// depth path (Reyes, below) and Mathematics is the breadth path into a
// school the college is not in — so the guaranteed offer states the
// year-one question itself.
export const FOUNDING_OFFER_GUARANTEE: readonly string[] = ['SOCY', 'MATH'];

// The six course ids the college opens teaching, in program order:
// the 101 and the 110 of each founding program.
export function foundingCourseIds(): string[] {
  return FOUNDING_PROGRAMS.flatMap((id) => programById(id)!.courseIds.slice(0, FOUNDING_COURSES_PER_PROGRAM));
}

// The institutional half of every new school's name (see types.ts's
// University). Fixed at founding — the startup screen only lets the
// player write the half in front of it — and swapped for "University"
// exactly once, if the player accepts the charter the first lab offers.
export const STARTING_INSTITUTION_SUFFIX = 'College';

// All the ways a player can change the world. The engine's reducer is the
// only thing that interprets these. UI dispatches them; systems never do.
export type CampusTool = 'draw' | 'erase' | 'plant' | 'fell';

export type Action =
  | { type: 'TICK' }                                   // advance one week
  // Leaves the startup screen and founds the university. `guided` is what
  // a human founding passes (App.tsx): the opening walkthrough holds the
  // clock and Founders Hall waits to be sited (see state/opening.ts). Omitted by the sim, the tests and the scenario tool,
  // which open at 'play' with the hall pre-placed, as every founding did
  // before the walk existed.
  | { type: 'START_GAME'; name: string; vernacular: Vernacular; colors: SchoolColors; guided?: boolean }
  // The opening walkthrough's two Next buttons (welcome -> site the hall;
  // teaching -> found a fourth program), and its one decline. Declining places
  // Founders Hall where a headless founding would have and stands the
  // letters down too — see state/opening.ts's skipOpening.
  | { type: 'ADVANCE_OPENING' }
  | { type: 'SKIP_OPENING' }
  // Courses only (see the reducer's guard). Charges the cost up front, sets
  // status 'developing', and starts the countdown in s.developing — see
  // techSystem.ts's canStartDevelopment/startDevelopment, the single gate
  // and the single mutation both this and PLACE_BUILDABLE below share. A
  // placeable Buildable (building/dorm/facility) never starts this way —
  // it starts through PLACE_BUILDABLE instead, which combines the same
  // gate with siting a location in one step.
  //
  // `facultyId` is the instructor the player picked for it. The Curriculum
  // tab ALWAYS supplies one — choosing who teaches a course is the point of
  // the interaction, and the assignment is written in the same transaction
  // as the start (see techSystem.ts's startDevelopment), so a developing
  // course is never without a teacher. It is optional only for the one
  // caller that is not a player making a choice: the headless balance sim,
  // of which let the engine take the strongest eligible teacher instead.
  | { type: 'START_DEVELOPMENT'; nodeId: string; facultyId?: string }
  // Founds a program (Plan 14): takes an empty slot in a standing hall and
  // starts the program's entry course with the chosen instructor, in one
  // transaction. The only way a major or graduate program enters the
  // curriculum — its tier-1 course is never started any other way. See
  // techSystem.ts's foundProgram for the gate.
  | { type: 'FOUND_PROGRAM'; programId: string; hallId: string; slot: number; facultyId: string }
  // Moves a housed program to an empty slot in a standing hall (Plan 14).
  // Free in money, expensive in time: the program goes dark for
  // RELOCATION_WEEKS. See techSystem.ts's relocateProgram for the gate.
  | { type: 'RELOCATE_PROGRAM'; programId: string; hallId: string; slot: number }
  | { type: 'REASSIGN_COURSE_FACULTY'; courseId: string; facultyId: string }
  // Commissions a research initiative in a vacant facility: a topic, a
  // team and a depth, paid for up front out of cash (see
  // researchData.ts's initiative block).
  //
  // It COSTS THE TEAM'S TEACHING. Every participant is committed for the
  // duration and loses two course slots (see techSystem.ts's
  // RESEARCH_COMMITMENT_SLOTS); whatever no longer fits in what remains is
  // shed lowest tier first, offered to any colleague in the field with
  // room (planCommitmentCoverage), and orphaned only if nobody has any —
  // which is why the UI names both numbers before the click, not after. Rejected if
  // the facility is not finished or already busy, the topic's fields are
  // not all covered, anyone named is already committed, or the funding
  // cannot be paid.
  | { type: 'START_INITIATIVE'; labId: string; topicId: string; depth: InitiativeDepth; facultyIds: string[] }
  // Ends one early. The up-front funding is forfeit and nothing banks, but
  // the participants are released immediately — which is usually the real
  // reason to do it (decision 8).
  | { type: 'CANCEL_INITIATIVE'; labId: string }
  // Moves an already-offered course to a different instructor — the lever
  // for fixing a weak course, and for re-staffing one a dismissal left
  // unstaffed. Free and immediate: the real cost is an opportunity cost,
  // since the person taking it on is one slot less available to everything
  // else. Rejected unless the course is offered and the new instructor is
  // eligible for it (on the roster, in its field, not already full — see
  // techSystem.ts's eligibleInstructors).
  // Appoints someone straight off the standing candidate list (see
  // facultyData.ts's churn block): they move from s.candidates to
  // s.faculty this instant, with no fee and no waiting period. The only
  // thing that can stop a hire is nobody in that field being on the
  // market this week — availability IS the recruiting constraint now, and
  // the money constraint is the salary they start drawing immediately.
  | { type: 'HIRE_FACULTY'; facultyId: string }
  // Dismisses someone from the roster. This ORPHANS every course they were
  // teaching: their assignments are cleared, and those courses go unstaffed
  // until the player gives them a new instructor (see types.ts's
  // CourseFaculty). The department does NOT get that capacity back — the
  // courses still exist and still need teaching — so it is left
  // over-committed until somebody takes them on. A replacement hire can
  // always do that (eligibility is a per-person check), but the school
  // cannot open NEW courses in that field until it has. The UI warns
  // before this, naming the courses, because it is not recoverable by
  // undo — see FacultyTab.tsx.
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
  // Plants or fells one tree on a tile (see types.ts's Trees). The same
  // family as the path tools — free, decorative, granting nothing — with
  // one rule the reducer keeps: nothing is planted under a building or a
  // path, since neither would ever be seen.
  | { type: 'PLANT_TREE'; tile: TileCoord }
  | { type: 'FELL_TREE'; tile: TileCoord }
  // Every campus tool the map can hold: the two path tools and the two
  // tree tools. Left paints with the armed one, right with its opposite.

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
  // Advances the summer sequence by one beat (Plan 16's PR A — see
  // types.ts's SummerPayload). Review and Standing are read-and-continue;
  // leaving the Admissions beat carries the two levers along as
  // `decision`, so the last beat commits exactly what the player set. The
  // clock does not move: only the last beat's RESOLVE_ADMISSIONS turns the
  // page. A no-op if no summer is pending or it is already on its last beat.
  | { type: 'RESOLVE_SUMMER_BEAT'; decision?: SummerDecision }
  // Resolves the summer — its last beat: sets next year's two policy levers
  // (tuition and the admit rate), runs the funnel to commit the enrolled
  // class, and advances the clock into that year itself (see reducer.ts).
  // Tuition is set ONLY here, once a year — there is no other action that
  // changes it. Accepted at ANY beat, not only the last: the UI offers it
  // on the Students beat alone, but a harness that answers the whole summer
  // in one action (the tests, a scenario) is answering the same question.
  // `approvedPetitionIds` is the student-life digest, the summer's fourth
  // beat (see data/studentLifeData.ts and the reducer): the ids of the
  // club/chapter petitions raised since last summer that the player is
  // recognising. Every pending petition NOT listed is declined, and the
  // queue drains either way — so the digest can never accumulate across
  // years, and clubs never need a stop-the-clock modal of their own.
  | { type: 'RESOLVE_ADMISSIONS'; tuition: number; admitRate: number; approvedPetitionIds: string[] }
  // Dismisses the "you've entered the rankings" reveal (or a playtest-forced
  // U.S. News report — the annual one is the summer's Standing beat now).
  // Advances the clock, like every other interrupt raised mid-tick: it
  // fires as a trailing step after that week's systems already ran, so
  // dismissing means moving on to the next week, not replaying this one.
  | { type: 'RESOLVE_REPORT' }
  // Puts down one of the first year's letters (Plan 16's PR F — see
  // data/eventData.ts's OPENING_LETTERS). `skipAll` is the first letter's
  // "I know the way": it marks the whole script declined for this run, so
  // a second playthrough is not walked through the opening again. Advances
  // the clock, like every other trailing interrupt.
  | { type: 'RESOLVE_LETTER'; skipAll: boolean }
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
  | { type: 'RESOLVE_RESEARCH_REPORT' }
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
  // The athletic director's offer. `candidate` is the whole person rather
  // than an id: they were rolled into the interrupt's payload and live
  // nowhere else, so there is no pool for the reducer to look them up in —
  // the same shape the visiting-scholar event's own appointment uses.
  // `candidate: null` is the decline, which records a week rather than a flag
  // (see types.ts's athleticDirectorAskedWeek).
  | { type: 'RESOLVE_ATHLETIC_DIRECTOR'; candidate: Coach | null; mascot: string }
  | { type: 'RESOLVE_MASCOT'; mascot: string } // the first sport club's naming beat (Plan 21's PR O)
  // A championship report: read and leave, like the U.S. News report.
  | { type: 'RESOLVE_CHAMPIONSHIP' }
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
  // at any time — unlike tuition this is not an annual policy
  // decision, it's a standing dial the player can adjust as often as they
  // like, so there is nothing to refuse and no cost charged here.
  | { type: 'SET_ATHLETICS_BUDGET'; tier: AthleticsBudgetTier }
  | { type: 'SET_TEAM_ORDER'; order: string[] } // the priority list, dragged (Plan 21's PR G)
  | { type: 'EXPAND_VENUE'; venueId: string } // a venue rung, in place (Plan 21's PR Q)
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
  | { type: 'MARK_SEEN'; kind: 'course' | 'buildable'; ids: string[] }
  // Records that a gated tab's gate is open (see components/TabNav.tsx's
  // TAB_GATES) — the first time for each tab, and only the first time. With
  // `announce`, the same dispatch also logs a line saying the view is now
  // available, which is the point: a tab that silently appears in a
  // nine-icon row is a tab nobody notices. Dispatched from App.tsx, which is
  // where the gates are actually evaluated; it passes announce: false for
  // the gates it finds ALREADY open on its first render, since a save that
  // resumes with three labs standing has nothing to announce.
  | { type: 'NOTE_TAB_AVAILABLE'; id: string; label: string; announce: boolean }
  // ---------------------------------------------------------------------
  // THE PLAYTEST BLOCK. Every action below is dispatched by exactly one
  // component — components/DebugPanel.tsx — which only renders behind the
  // playtest flag (see components/playtest.ts). None is reachable from any
  // ordinary surface, none is dispatched by a system, and the balance
  // harness never dispatches one either: a trajectory the sim measures has
  // to be one a player could actually have produced.
  //
  // They go through the reducer rather than round it because that is the
  // rule the whole architecture rests on — the reducer is the one
  // interpreter of every action — and because a shortcut that wrote state
  // from a component would be the one place the invariants tests cannot
  // see. What makes them playtest-only is the GATE, not a back door.
  //
  // `DEBUG_SET_CASH` replaces the old GRANT_FUNDS "+$1B" button: setting
  // the figure says what it does, where adding a round billion to it made
  // "how much money does this school have" a question with no answer.
  // ---------------------------------------------------------------------
  | { type: 'DEBUG_SET_CASH'; amount: number }
  | { type: 'DEBUG_SET_PRESTIGE'; value: number }
  // Sets the satisfaction STOCK. It will drift back toward its own computed
  // target over the following weeks, which is the point: this is how you
  // look at what a satisfaction of 30 does, not how you pin it there.
  | { type: 'DEBUG_SET_SATISFACTION'; value: number }
  | { type: 'DEBUG_SET_TUITION'; value: number }
  // Fast-forwards N weeks, answering whatever stops the clock with the
  // shared default answers (see engine/defaultAnswers.ts) when
  // `autoResolve` is set, and stopping at the first modal when it is not.
  | { type: 'DEBUG_JUMP'; weeks: number; autoResolve: boolean }
  // Fires one authored decision event by id, bypassing its eligibility and
  // both cooldowns. The payload is ROLLED as it would be at fire time, so
  // the modal is the real modal rather than a preview of one.
  | { type: 'DEBUG_FORCE_EVENT'; eventId: string }
  // Raises a student demand for one named shortfall, bypassing the
  // satisfaction threshold and the cooldown. The ask itself is whatever the
  // demand system would have asked for (see demandSystem.ts's
  // shortfallDemandFor), so a forced demand is a real demand.
  | { type: 'DEBUG_FORCE_DEMAND'; subject: DemandSubject }
  // Celebrates the queued milestones now, rather than on the next week the
  // frequency floor allows.
  | { type: 'DEBUG_FORCE_MILESTONE' }
  // Publishes the U.S. News report now, off this week's standings.
  | { type: 'DEBUG_FORCE_REPORT' }
  // Swaps the instructors of two offered courses in the same department
  // (Plan 14's PR G — the Curriculum tab's drag-and-drop chips). Atomic:
  // both change or neither does, and a drop that is not a legal swap is a
  // no-op — nothing is ever displaced to unassigned behind the player's
  // back. See techSystem.ts's swapInstructors for the gate.
  | { type: 'SWAP_COURSE_FACULTY'; courseA: string; courseB: string }
  // Posts a search for a candidate in a faculty field (Plan 14's PR H):
  // spends money to raise the weekly chance the market lists somebody in
  // it, for a fixed window. See systems/faculty/facultySearch.ts.
  | { type: 'POST_SEARCH'; field: string }
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
      applicantPool: 0, admitRate: 0, incomingQuality: 0,
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
    self: { name: '', suffix: '', universityCharterOffered: false, mascot: '', reputation: 0, reportCard: null, socialStanding: 0, researchStanding: 0, vernacular: FOUNDING_VERNACULAR, colors: schoolColorsOf(FOUNDING_COLORS), legacy: null, facultyServed: 0 },
    history: [],
    log: [],
    pendingInterrupt: null,
    events: {
      pendingMilestones: [], lastMilestoneWeek: 0, lastDecisionWeek: 0, decisionHistory: {},
      // No demand raised and none outstanding; week 0 reads as "never" for
      // the cooldown too (see data/demandData.ts's DEMAND_COOLDOWN_WEEKS).
      pendingDemand: null, activeDemand: null, lastDemandWeek: 0,
      // No letter delivered and the script not declined (see types.ts's
      // EventState.opening).
      opening: { read: [], skipped: false, stage: 'play' },
      passedResponses: [],
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
      season: {},
      rivalries: {},
      athleticDirectorAskedWeek: 0,
    },
    research: {
      publications: 0, grants: 0, grantIncome: 0,
      breakthroughs: 0, prizes: 0, initiatives: {}, completedInitiatives: [],
      lastOutputWeek: 0, pendingCompletions: [],
    },
    candidates: [],
    started: false,
    hasEnteredRankings: false,
    milestones: {},
    ambitions: {},
    courseFaculty: {},
    seen: { courseIds: {}, buildableIds: {}, tabIds: {} },
  };
}

// The real starting state, once the player has named the university. The
// name is the WHOLE of what the startup screen asks for since Plan 07's
// PR C — every other founding condition comes from FOUNDING_PRESET, which
// is the same for every school (see data/foundingData.ts).
export function createInitialState(
  name: string,
  vernacular: Vernacular = FOUNDING_VERNACULAR,
  // The school's colour pair (Plan 18's PR B), defaulted like the
  // vernacular and for the same reason: the tests and the sim are not
  // about the picture.
  colors: SchoolColors = schoolColorsOf(FOUNDING_COLORS),
  // Whether this founding gets the opening walkthrough (see START_GAME):
  // the clock held at 'welcome' and Founders Hall left for the player to
  // site. Off by default, so every headless caller opens at 'play'.
  guided = false,
): GameState {
  const preset = FOUNDING_PRESET;

  // The central Buildable list, built up front so Founders Hall can be
  // pulled out of it to pre-place (it opens 'done' — see techData.ts).
  const tech = [...initialTech(), ...initialDorms(), ...initialFacilities()];

  // The founding college's six courses are developed already (see
  // FOUNDING_PROGRAMS above): seeded 'done' here, and the rest of their
  // programs' courses are opened by the ordinary resolver once the state
  // exists (unlockAvailable, at the bottom) — so a tier-2 course of a
  // founding program reads 'available' on day one by the same rule that
  // opens it on any other day.
  const courseFaculty: GameState['courseFaculty'] = {};
  for (const programId of FOUNDING_PROGRAMS) {
    for (const id of programById(programId)!.courseIds.slice(0, FOUNDING_COURSES_PER_PROGRAM)) {
      tech.find((t) => t.id === id)!.status = 'done';
      courseFaculty[id] = FOUNDING_INSTRUCTOR_BY_PROGRAM[programId];
    }
  }

  // Centre Founders Hall's footprint on the grid: the founding landmark
  // sits in the middle of the map, not a corner (see the placements entry
  // below). Math.floor keeps the anchor on a whole tile; the footprint is odd
  // vs. even against the grid dimensions, so this lands as close to dead
  // centre as the tile grid allows.
  // In a guided founding there is no placement at all yet: the walkthrough's
  // first step is the player choosing where the hall stands.
  const foundersHall = tech.find((t) => t.id === FOUNDERS_HALL_ID)!;
  const foundingPlacements: Placements = guided ? {} : { [FOUNDERS_HALL_ID]: centredPlacement(footprintOf(foundersHall)) };

  // Read in two places below — self.reputation and the admit rate seeded
  // from it — so the opening slider position cannot drift from the standing
  // it is supposed to describe.
  const foundingReputation = preset.startingReputation + FOUNDERS_HALL_REPUTATION_BONUS;

  // One founding price, read into five places below (the listed price and
  // the four classes), so they cannot be seeded out of step with each other.
  // No longer clamped on the way in: STARTING_TUITION is 13,000 against a
  // slider that ends at 100,000, so the clamp only ever mattered while a
  // public school's cap was 22,000 and it could not have bitten even then.
  const foundingTuition = STARTING_TUITION;

  const state: GameState = {
    clock: { year: 1, week: 1 },
    finance: {
      cash: preset.startingCash,
      endowment: STARTING_ENDOWMENT,
      endowmentCampaigns: 0,
      // The founding body is all four classes at once (see FOUNDING_CLASSES),
      // and they were all admitted under the same founding price — so the
      // listed price and all four class prices open equal. They only diverge
      // once the player actually moves the slider.
      listedTuition: foundingTuition,
      tuitionByClass: {
        freshman: foundingTuition, sophomore: foundingTuition,
        junior: foundingTuition, senior: foundingTuition,
      },
      weeklyOpEx: 0,
      weeksInTheRed: 0,
    },
    students: {
      // Founding mix: a college opens with ALL FOUR class years present and
      // BALANCED (≈ FOUNDING_BODY / 4 each), not a freshman class only — so
      // there is a graduating class from year one and the body opens at the
      // steady-state structure the campus would otherwise take years of
      // lumpy cycles to reach. See FOUNDING_CLASSES in foundingData.ts.
      classes: { ...FOUNDING_CLASSES },
      // Not one of those four classes was admitted by the player — they
      // arrived before the school had built a single thing for a cohort to
      // respond to — so all four open on the neutral prior rather than on a
      // mix that would imply choices nobody made. Each is replaced by a real
      // recorded split as it graduates out, so by year five the whole body
      // is the player's own doing. See cohorts.ts's baseShareCohortCounts.
      cohortsByClass: {
        freshman: baseShareCohortCounts(FOUNDING_CLASSES.freshman),
        sophomore: baseShareCohortCounts(FOUNDING_CLASSES.sophomore),
        junior: baseShareCohortCounts(FOUNDING_CLASSES.junior),
        senior: baseShareCohortCounts(FOUNDING_CLASSES.senior),
      },
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
      crowdingYearSum: 0, crowdingYearWeeks: 0,
      applicantPool: preset.startingApplicantPool,
      // Neutral placeholders until the first summer admissions cycle
      // resolves and sets these for real — see RESOLVE_ADMISSIONS.
      // Seeded from the curve rather than a round placeholder: this is the
      // slider's sticky opening position now (see admissionsSystem.ts's
      // admitRate), so a founding school opens at what a school of its
      // standing would normally take.
      admitRate: admitRate(foundingReputation),
      incomingQuality: 50,
      // No summer has run yet, so the first reveal has no year to be read
      // against (see types.ts's FunnelRecord).
      lastFunnel: null,
    },
    // Year 1 runs on the founding price with the starting enrolled/applicant
    // figures below. The first real admissions interrupt, at the end of
    // year 1, runs the funnel and sets year 2's enrolled class from the
    // player's tuition choice.
    // Founding faculty are already-established hires, not brand-new
    // candidates, and THE WAY THAT IS EXPRESSED IS TENURE (see
    // facultyData.ts's FOUNDING_TENURE_WEEKS). Their teaching, research and
    // salary are not authored figures: they are derived from each person's
    // rolled potential and that tenure, through exactly the curves
    // growFaculty will keep applying from week one onward.
    //
    // That indirection is load-bearing, not tidiness. All three fields are
    // RECOMPUTED every tick, so a literal written here survives zero weeks —
    // which is what used to happen. The five were authored at teaching 70-80
    // and silently became 44-48 on the first tick: precisely the
    // fresh-candidate figures this comment claimed they were not using.
    // Nothing read the numbers per-person, so it stayed invisible until a
    // course grade put one on a card. Deriving them from the functions that
    // will overwrite them means the roster on week one is the roster the
    // engine actually believes in.
    //
    // acclaim is 0 for all five and stays there until one of them wins a
    // research prize — which none of them can until the school has built
    // a lab, decades away (see systems/research/researchSystem.ts).
    //
    // THE ROSTER IS THE FOUNDING COLLEGE'S (Plan 19). Three of the five
    // teach the three pre-founded programs (FOUNDING_PROGRAMS above):
    // Bennett the two English courses, Okafor the two History, Novak the
    // two Philosophy — six of the roster's eleven course slots. The five
    // slots left are what the founding offer draw is written against
    // (FOUNDING_OFFER_GUARANTEE): Bennett's third slot (English —
    // ENGL120 next, or Creative Writing), Iyer's two (Mathematics — the
    // breadth path into Science, or Data Science) and Reyes's two
    // (Sociology — the depth path: Sociology and Anthropology share the
    // department, so she covers SOCY101 and ANTH101 together). Five free
    // slots against three free rooms, so the opening is staffable without
    // a hire, and the player meets the faculty gate the first time they
    // reach for a fourth field — Political Science, the one appointment
    // the opening school still needs.
    //
    // Reyes used to be the Physics hire, for a gen-ed science course that
    // no longer exists. She moved to Sociology so that the roster reaches
    // five of the opening school's six majors and finishing the school the
    // opening is built around costs no more at founding than leaving it
    // does. Her name, stats, tenure, slots and salary are unchanged.
    faculty: [
      {
        id: 'f1', name: 'Dr. Alma Reyes', field: 'Sociology', teaching: grownStat(82, FOUNDING_TENURE_WEEKS), research: grownStat(78, FOUNDING_TENURE_WEEKS), teachingPotential: 82, researchPotential: 78,
        tenureWeeks: FOUNDING_TENURE_WEEKS, weeksListed: 0, acclaim: 0,
        salary: facultySalary(grownStat(82, FOUNDING_TENURE_WEEKS), grownStat(78, FOUNDING_TENURE_WEEKS), FOUNDING_TENURE_WEEKS, 0), courseSlots: 2,
        nationality: 'United States', flag: '🇺🇸', gender: 'female', heritage: 'Hispanic/Latin American',
        bio: 'Earned a doctorate in Sociology at Ravensmoor Institute; research centers on social networks and urban communities.',
      },
      {
        id: 'f2', name: 'Dr. John Okafor', field: 'History', teaching: grownStat(88, FOUNDING_TENURE_WEEKS), research: grownStat(68, FOUNDING_TENURE_WEEKS), teachingPotential: 88, researchPotential: 68,
        tenureWeeks: FOUNDING_TENURE_WEEKS, weeksListed: 0, acclaim: 0,
        salary: facultySalary(grownStat(88, FOUNDING_TENURE_WEEKS), grownStat(68, FOUNDING_TENURE_WEEKS), FOUNDING_TENURE_WEEKS, 0), courseSlots: 2,
        nationality: 'Nigeria', flag: '🇳🇬', gender: 'male', heritage: 'West African',
        bio: 'Earned a doctorate in History at the University of Calderwood; research centers on maritime trade networks.',
      },
      {
        id: 'f3', name: 'Dr. Grace Bennett', field: 'English', teaching: grownStat(85, FOUNDING_TENURE_WEEKS), research: grownStat(72, FOUNDING_TENURE_WEEKS), teachingPotential: 85, researchPotential: 72,
        tenureWeeks: FOUNDING_TENURE_WEEKS, weeksListed: 0, acclaim: 0,
        salary: facultySalary(grownStat(85, FOUNDING_TENURE_WEEKS), grownStat(72, FOUNDING_TENURE_WEEKS), FOUNDING_TENURE_WEEKS, 0), courseSlots: 3,
        nationality: 'United Kingdom', flag: '🇬🇧', gender: 'female', heritage: 'Anglo/Western European',
        bio: 'Earned a doctorate in English at Marchmont University; research centers on rhetoric and composition.',
      },
      {
        id: 'f4', name: 'Dr. Priya Iyer', field: 'Mathematics', teaching: grownStat(80, FOUNDING_TENURE_WEEKS), research: grownStat(79, FOUNDING_TENURE_WEEKS), teachingPotential: 80, researchPotential: 79,
        tenureWeeks: FOUNDING_TENURE_WEEKS, weeksListed: 0, acclaim: 0,
        salary: facultySalary(grownStat(80, FOUNDING_TENURE_WEEKS), grownStat(79, FOUNDING_TENURE_WEEKS), FOUNDING_TENURE_WEEKS, 0), courseSlots: 2,
        nationality: 'India', flag: '🇮🇳', gender: 'female', heritage: 'South Asian',
        bio: 'Earned a doctorate in Mathematics at Ironwood University; research centers on numerical analysis.',
      },
      {
        id: 'f5', name: 'Dr. Elena Novak', field: 'Philosophy', teaching: grownStat(83, FOUNDING_TENURE_WEEKS), research: grownStat(71, FOUNDING_TENURE_WEEKS), teachingPotential: 83, researchPotential: 71,
        tenureWeeks: FOUNDING_TENURE_WEEKS, weeksListed: 0, acclaim: 0,
        salary: facultySalary(grownStat(83, FOUNDING_TENURE_WEEKS), grownStat(71, FOUNDING_TENURE_WEEKS), FOUNDING_TENURE_WEEKS, 0), courseSlots: 2,
        nationality: 'Poland', flag: '🇵🇱', gender: 'female', heritage: 'Slavic/Eastern European',
        bio: 'Earned a doctorate in Philosophy at Amberfield University; research centers on ethics and moral philosophy.',
      },
    ],
    // The single central Buildable list (see
    // docs/architecture/buildables.md) — courses, academic buildings, dorms,
    // AND campus-life facilities all live here together.
    tech,
    developing: {},
    // The six founding courses and who teaches them (see the roster
    // above). Every later entry is written the moment the player starts a
    // course and picks who teaches it.
    courseFaculty,
    // Founders Hall's six slots, three of them filled before the player
    // sees the game with the founding programs (see types.ts's HallSlot).
    // Every other hall's entry is written the week that hall finishes
    // construction (techSystem.ts), with every slot empty — so a founding
    // save has exactly one hall, three programs in it, three rooms free.
    halls: {
      [FOUNDERS_HALL_ID]: Array.from({ length: ACADEMIC_HALL_SLOTS }, (_, i) => ({
        programId: i < FOUNDING_PROGRAMS.length ? FOUNDING_PROGRAMS[i] : null,
      })),
    },
    // Drawn below, once the state exists to draw against (refillOffers
    // reads the school's name and the housed count): the first three
    // offers, with the founding guarantee.
    programOffers: [],
    // No search running: a founding school's five hires cover what it
    // teaches.
    searches: {},
    // Only Founders Hall is pre-placed: it opens 'done' (techData.ts), so
    // it needs a spot on the map from day one. It is centred on the grid
    // (foundersHallPlacement above) — the founding landmark the rest of the
    // campus grows out around — rather than tucked in a corner like the
    // player's later top-left auto-sited builds. Everything else, dorms
    // included, is placed by the player as it is built.
    placements: foundingPlacements,
    pathways: {},
    // The ground the university is founded on (see data/treeData.ts). Seeded
    // AGAINST the placements above, so no tree is generated under Founders
    // Hall — the only building that exists at founding — rather than planted
    // and then felled. (A guided founding seeds against nothing; the trees
    // under wherever the player puts the hall are felled when it lands,
    // exactly as under any later building.)
    trees: seedTrees(foundingPlacements),
    rivals: initialRivals(),
    // +FOUNDERS_HALL_REPUTATION_BONUS: a small academic-standing
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
      // No mascot at founding, and the empty string is the honest answer
      // rather than a placeholder: a school with no varsity program has
      // nothing for a mascot to name. It is filled in at the
      // athletic-director interrupt, which is the first moment the question
      // has an answer (see types.ts's University.mascot).
      mascot: '',
      reputation: foundingReputation,
      reportCard: null,
      // The other two standings open at their own baselines rather than at
      // the academic one (see prestigeSystem.ts's RESEARCH_STANDING_BASELINE
      // and SOCIAL_STANDING_BASELINE). A founding school is not a research
      // university and has no campus life to speak of, and both numbers say
      // so on day one.
      socialStanding: SOCIAL_STANDING_BASELINE,
      researchStanding: RESEARCH_STANDING_BASELINE,
      // Chosen on the startup screen and fixed from here on — a campus's
      // architecture is what it was built as, so nothing ever offers to
      // change it. Defaulted rather than required so the tests and the sim,
      // which are not about the picture, do not all have to say 'georgian'.
      vernacular,
      // Picked beside it and fixed the same way (see types.ts's SchoolColors).
      colors: { ...colors },
      // No record yet: the fiftieth summer writes it (see types.ts's
      // University.legacy). The founding five have served from day one.
      legacy: null,
      facultyServed: 5,
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
      // No letter delivered and the script not declined (see types.ts's
      // EventState.opening). A guided founding opens on the walkthrough's
      // welcome with the first letter already counted read — the welcome IS
      // that letter's content, and the walk does its ask — so the letters
      // proper carry on from the second (see state/opening.ts).
      opening: guided
        ? { read: [OPENING_LETTERS[0].id], skipped: false, stage: 'welcome' }
        : { read: [], skipped: false, stage: 'play' },
      passedResponses: [],
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
      // synchronized wave instead of churning continuously).
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
      season: {},
      rivalries: {},
      athleticDirectorAskedWeek: 0,
    },
    // No labs at founding, so nothing produces research and no output can
    // fire — the whole slice sits at zero until the first lab finishes
    // (see systems/research/researchSystem.ts).
    research: {
      publications: 0, grants: 0, grantIncome: 0,
      breakthroughs: 0, prizes: 0, initiatives: {}, completedInitiatives: [],
      lastOutputWeek: 0, pendingCompletions: [],
    },
    candidates: initialCandidatePool(),
    started: true,
    hasEnteredRankings: false,
    milestones: {},
    ambitions: {},
    // Filled in below, once the founding programs' courses have been
    // opened.
    seen: { courseIds: {}, buildableIds: {}, tabIds: {} },
  };

  // The founding programs' next courses open by the ordinary rule — housed,
  // prereqs done — rather than by hand, so day one is a state a tick could
  // have produced.
  unlockAvailable(state);

  // The alert-badge exception for what a school starts with (see types.ts's
  // SeenState). The founding courses and the founding buildables (Founders
  // Hall, the starting dorm, dining hall, and the rest of the
  // seeded-'available' facility chains) are unlocked from the moment the
  // university opens — the player was never shown a moment when they
  // WEREN'T there to be revealed, so they are not "new" and must not carry
  // a badge on day one: an empty `seen` would tell the brand-new player
  // that every one of these is news.
  for (const node of state.tech) {
    if (node.status === 'locked') continue;
    if (node.kind === 'course') state.seen.courseIds[node.id] = true;
    else if (isPlaceableKind(node)) state.seen.buildableIds[node.id] = true;
  }

  // The first three offers, drawn at founding with the one-time guarantee
  // (see FOUNDING_OFFER_GUARANTEE and programOffers.ts). Off the global
  // dice, like every draw the offer makes.
  refillOffers(state, FOUNDING_OFFER_GUARANTEE);
  return state;
}

export { WEEKS_PER_YEAR };
