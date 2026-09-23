import type { Faculty, GameState, LogEntry, SummerBeat, SummerPayload } from '../state/types';
import { LOG_CAP, SEMICENTENNIAL_YEAR, SUMMER_LAST_BEAT, WEEKS_PER_YEAR, institutionName } from '../state/types';
import type { Action } from '../state/actions';
import { defaultAnswer } from './defaultAnswers';
import { createInitialState, createPreStartState } from '../state/actions';
import { tickFinance, endowmentCampaign } from '../systems/finance/financeSystem';
import {
  tickTech, canStartDevelopment, startDevelopment, eligibleInstructors, isCommitted,
  planCommitmentCoverage, foundProgram, relocateProgram, swapInstructors,
} from '../systems/techtree/techSystem';
import { postSearch } from '../systems/faculty/facultySearch';
import { endInitiative } from '../systems/research/researchSystem';
import { initiativeDepth, initiativeFundingCost } from '../data/researchData';
import { researchTopic } from '../data/researchTopics';
import { TUITION_SLIDER_MAX } from '../data/foundingData';
import { tickAdmissions, advanceClasses, attritionRate, priceTolerance, projectAdmissions, trailingYearSatisfaction } from '../systems/admissions/admissionsSystem';
import { attritionReasons } from '../systems/admissions/consequences';
import { intakeCeiling } from '../systems/techtree/instructionCapacity';
import { cohortCounts, deriveCohortSignals } from '../systems/admissions/cohorts';
import { buildReportPayload, tickRivals } from '../systems/rivals/rivalsSystem';
import { tickAmbitions } from '../systems/ambitions/ambitionsSystem';
import { appointFaculty, tickFaculty } from '../systems/faculty/facultySystem';
import { tickResearch } from '../systems/research/researchSystem';
import { setPrestigeForPlaytest, tickPrestige, gradeYear, applyReportCard } from '../systems/prestige/prestigeSystem';
import { tickSatisfaction } from '../systems/satisfaction/satisfactionSystem';
import { fireMilestoneCelebration, tickEvents } from '../systems/events/eventSystem';
import { tickStudentLife } from '../systems/studentlife/studentLifeSystem';
import { tickAthletics } from '../systems/athletics/athleticsSystem';
import { raiseDemand, shortfallDemandFor, tickDemands } from '../systems/demands/demandSystem';
import { absoluteWeek, findDecisionEvent, offeredChoices } from '../data/eventData';
import { LIBRARY_TIER1_ID, nextLibraryFloor, servedUpkeep, nextVenueExpansion} from '../data/facilitiesData';
import { fellTrees, TREE_SEED_RANGE } from '../data/treeData';
import { advanceOpening, openingHoldsClock, settleOpening, skipOpening } from '../state/opening';
import {
  CHAPTER_APPROVAL_SATISFACTION_NUDGE, CHAPTER_DECLINE_SATISFACTION_HIT,
  CLUB_APPROVAL_SATISFACTION_NUDGE, CLUB_DECLINE_SATISFACTION_HIT, activatePetition, TRAINER_FIELD,
  MASCOT_MAX_LENGTH, applyTeamOrder } from '../data/studentLifeData';
import {
  awaitsSite, canPlace, footprintOf, isInBounds, isPlaceableKind,
  orientedFootprint, pathTileKey, placementFor,
  occupantAt,
} from '../state/campusMap';
import { captureYearSnapshot } from '../state/history';
import { legacy } from '../state/legacy';
import { saveGame, clearSave } from '../state/persistence';
import { money } from '../format';
import { random, withRandom } from './random';

// The systems run in a fixed order each week. Order matters: research and
// finance resolve before admissions/rivals read the updated world;
// satisfaction resolves before admissions so the summer funnel's
// word-of-mouth term reads this week's freshly recomputed satisfaction,
// not last week's.
const SYSTEMS: Array<(s: GameState) => void> = [
  tickTech,
  tickFaculty,
  // After tickFaculty, before tickFinance: research output is weighted by
  // this week's freshly grown stats and tenure, and a grant that lands
  // this week should be in the balance the same week's cash flow settles
  // against.
  tickResearch,
  // After tickResearch, before tickFinance: prestige drifts weekly toward its
  // computed target (see prestigeSystem.ts's tickPrestige — moved off the old
  // annual boundary so standing responds smoothly to mid-year curriculum,
  // faculty and research changes rather than sitting frozen between summers).
  // Placed before tickFinance so this week's reputation feeds the prestige
  // dividend, and after tickTech/tickFaculty/tickResearch so a milestone,
  // matured hire or breakthrough from this week is already in the target it
  // drifts toward. The two admissions-derived inputs (selectivity, incoming
  // quality) only change at the summer boundary; every other input can move
  // any week.
  tickPrestige,
  // After tickPrestige, before tickFinance: a coach's grown quality/salary
  // (see systems/athletics/athleticsSystem.ts) should be in the SAME
  // week's varsityTeamUpkeep read, not a week stale — the same "feeds this
  // week's finance" reasoning tickResearch/tickPrestige's own placement
  // uses.
  tickAthletics,
  tickFinance,
  // After tickFinance, before tickSatisfaction: a student organisation
  // petition is sized in weeks of THIS week's operating cost, and an
  // organisation the player recognised belongs in this week's satisfaction
  // target rather than a week behind it. Raises no interrupt of its own —
  // clubs and chapters are answered in a batch at the summer boundary (see
  // systems/studentlife/studentLifeSystem.ts).
  tickStudentLife,
  tickSatisfaction,
  tickAdmissions,
  tickRivals,
  // After tickRivals, so an ambition about rank reads the table as it
  // stands this week, and before tickEvents, so the line lands before any
  // interrupt claims the week. Reads everything and writes only
  // s.ambitions and the log (see systems/ambitions/ambitionsSystem.ts).
  tickAmbitions,
  // Last, deliberately: the summer admissions decision and the U.S. News
  // report own their weeks, and only one interrupt can be pending at a
  // time. Running the texture system afterwards means it sees their claim
  // and stands down instead of competing for the week — see
  // systems/events/eventSystem.ts.
  tickEvents,
  // After tickEvents, and last of all: the student-demand system (see
  // systems/demands/demandSystem.ts). It stands down for EVERY other
  // claimant on the week — the two annual interrupts, a milestone, the
  // charter, a prize, and now an authored decision event too — because a
  // demand it cannot announce this week waits in s.events.pendingDemand
  // for the next quiet one, exactly as a milestone waits in
  // pendingMilestones. Its resolution half (target met, or deadline
  // passed) runs every week regardless of what claimed the week: the
  // player finishing the demanded building is the answer, and it should
  // not have to wait for a quiet slot.
  tickDemands,
];

// ---------------------------------------------------------------------
// saveGame (see state/persistence.ts) is the ONE thing in this reducer
// that reaches outside itself. It doesn't change the reducer's purity with
// respect to the GAME state — it reads the assembled `s`, writes it to
// localStorage, and touches nothing — but it is a side effect, so it is
// worth being explicit about where it is allowed and why.
//
// Two actions call it: RESOLVE_ADMISSIONS (the annual autosave) and
// SAVE_GAME (the manual one). Doing it here rather than in an effect in
// useGame.ts means the save is taken at the exact instant the boundary
// resolves, from the exact state being committed, instead of being
// reconstructed a render later from a change the hook has to infer.
//
// Both are safe under React's StrictMode double-invocation because both
// are DETERMINISTIC: the two invocations build an identical `s`, so the
// second write is a byte-for-byte repeat of the first. An action that
// saves AND rolls dice would not be — which is exactly why START_GAME's
// save lives in useGame.ts instead (see there, and its case below).
// ---------------------------------------------------------------------

// ---------------------------------------------------------------------
// The student-life digest (see docs/design/student-life.md, and
// data/studentLifeData.ts). Clubs and Greek chapters form quietly during
// the year and queue as petitions; this is where the whole year's worth is
// answered, folded into the summer admissions interrupt rather than given
// a modal of its own. So the light beat costs the run ZERO extra
// stop-the-clock moments.
//
// The queue is drained WHOLESALE: anything the player did not tick is
// declined here and now. That is what keeps the digest a digest — it can
// never accumulate across years into a screen of decisions — and it is why
// declining has a consequence at all, since a petition that simply expired
// would be a decision nobody made.
//
// Approving is a MOVE, not a re-roll: everything mechanical about the
// organisation (its name, founding size, weekly cost) was rolled when the
// petition was raised, so the figures shown in the digest are the figures
// applied — the same contract the decision-event table follows.
//
// The satisfaction changes here are transient nudges to the STOCK, on top
// of the durable contribution a live organisation makes to the satisfaction
// TARGET every week (see satisfactionSystem.ts). The durable half is the
// real reward for approving; this half is what makes the moment land, and
// what gives declining teeth it would otherwise have none of.
function resolveStudentLifeDigest(s: GameState, approvedIds: string[]): void {
  const petitions = s.orgs.pendingPetitions;
  if (petitions.length === 0) return;
  s.orgs.pendingPetitions = [];

  const approved = new Set(approvedIds);
  let nudge = 0;
  let recognised = 0;
  let declined = 0;
  for (const petition of petitions) {
    if (approved.has(petition.id)) {
      // The first sport club is a named beat (Plan 21's PR O): the school
      // picks its mascot on the next quiet week, not in the director's
      // modal two decades on.
      const firstSport = !!petition.sport && !s.orgs.clubs.some((c) => c.sport !== null) && s.orgs.teams.length === 0;
      activatePetition(s, petition);
      if (firstSport && !s.self.mascot) s.orgs.mascotBeatPending = true;
      recognised += 1;
      nudge += petition.kind === 'club'
        ? CLUB_APPROVAL_SATISFACTION_NUDGE
        : CHAPTER_APPROVAL_SATISFACTION_NUDGE;
    } else {
      declined += 1;
      nudge -= petition.kind === 'club'
        ? CLUB_DECLINE_SATISFACTION_HIT
        : CHAPTER_DECLINE_SATISFACTION_HIT;
    }
  }
  s.students.satisfaction = Math.max(0, Math.min(100, s.students.satisfaction + nudge));

  s.log.unshift({
    year: s.clock.year,
    week: s.clock.week,
    message: `Student life: ${recognised} organisation${recognised === 1 ? '' : 's'} recognised, ${declined} declined.`,
    kind: declined > recognised ? 'bad' : 'good',
    topic: 'organisations',
  });
}

// The four "set this number" playtest actions, together: each one writes
// the field a panel control names and hands back a line saying what it
// did, so the reducer's own case is four lines rather than four cases.
// Clamped where the game clamps the same field anywhere else — a playtest
// shortcut may skip the WORK of reaching a state, never produce one the
// simulation could not.
function debugSet(
  s: GameState,
  action: Extract<Action, { type: 'DEBUG_SET_CASH' | 'DEBUG_SET_PRESTIGE' | 'DEBUG_SET_SATISFACTION' | 'DEBUG_SET_TUITION' }>,
): string {
  switch (action.type) {
    case 'DEBUG_SET_CASH':
      s.finance.cash = action.amount;
      return `operating funds set to ${money(action.amount)}`;
    case 'DEBUG_SET_PRESTIGE':
      // Written through prestigeSystem.ts, which owns the field and clamps
      // it to the band its own drift uses — see setPrestigeForPlaytest, and
      // invariants.test.ts section 5 for why the write is not here.
      return `prestige set to ${setPrestigeForPlaytest(s, action.value).toFixed(1)}`;
    case 'DEBUG_SET_SATISFACTION': {
      const value = Math.max(0, Math.min(100, action.value));
      s.students.satisfaction = value;
      return `satisfaction set to ${value.toFixed(0)}`;
    }
    case 'DEBUG_SET_TUITION': {
      const value = Math.max(0, Math.min(TUITION_SLIDER_MAX, Math.round(action.value)));
      s.finance.listedTuition = value;
      return `listed tuition set to ${money(value)}`;
    }
  }
}

function advanceClock(s: GameState): void {
  s.clock.week += 1;
  if (s.clock.week > WEEKS_PER_YEAR) {
    s.clock.week = 1;
    s.clock.year += 1;
  }
}

export function reducer(state: GameState, action: Action): GameState {
  // Clone so systems can mutate freely without touching the previous state,
  // and bind the clone's random stream for every draw this action makes.
  const s: GameState = structuredClone(state);
  return withRandom(s, () => reduce(state, s, action));
}

function reduce(state: GameState, s: GameState, action: Action): GameState {
  switch (action.type) {
    case 'TICK': {
      // The clock halts while an interrupt is pending, and while the opening
      // walkthrough is holding it (see state/opening.ts).
      if (!s.started || s.pendingInterrupt || openingHoldsClock(s)) return state;
      for (const system of SYSTEMS) system(s);
      // A system may have just enqueued an interrupt (e.g. the summer
      // admissions decision) — hold the clock at this week rather than
      // rolling into the next one until it's resolved.
      if (!s.pendingInterrupt) advanceClock(s);
      if (s.log.length > LOG_CAP) s.log.length = LOG_CAP; // cap log growth
      return s;
    }

    case 'START_GAME':
      // Deliberately does NOT save here, even though founding is exactly
      // when a save should first exist: createInitialState rolls dice
      // (rivals, the candidate pool, faculty potentials), so under
      // StrictMode's double-invocation the two runs build different
      // universities and a write from inside the reducer could persist the
      // one React discards. The founding save is taken in useGame.ts
      // instead, from the state actually committed — see the note above.
      return createInitialState(action.name, action.vernacular, action.colors, action.guided ?? false, action.seed);

    // The opening walkthrough's two Next buttons and its decline (see
    // state/opening.ts). The steps that end on something DONE
    // (the hall sited, a program founded) are settled by settleOpening from
    // the action that did it, never from here.
    case 'ADVANCE_OPENING': {
      advanceOpening(s);
      return s;
    }
    case 'SKIP_OPENING': {
      skipOpening(s);
      return s;
    }

    case 'START_DEVELOPMENT': {
      // Courses only now. A placeable Buildable (building/dorm/facility)
      // starts through PLACE_BUILDABLE instead, which combines this same
      // gate with siting a location in one step (see that case below, and
      // state/campusMap.ts's canPlace) — placement is how a placeable
      // Buildable starts, not a cosmetic step after it finishes. The
      // isPlaceableKind guard is defensive: no UI path dispatches
      // START_DEVELOPMENT for a placeable Buildable any more, but refusing
      // it here rather than trusting the caller keeps this the one place a
      // placeable Buildable can be started structurally, not just by
      // convention — exactly as canStartDevelopment stays the one gate,
      // reused rather than forked, for both actions.
      //
      // action.facultyId is the instructor the player chose. It is threaded
      // through BOTH halves — the gate and the mutation — so the person who
      // is checked for eligibility is exactly the person who gets recorded,
      // and a stale or ineligible pick is refused rather than silently
      // swapped for someone else. Omitted only by the two non-player
      // callers (see actions.ts), where startDevelopment auto-picks.
      const node = s.tech.find((t) => t.id === action.nodeId);
      if (node && !isPlaceableKind(node) && canStartDevelopment(s, node, action.facultyId)) {
        startDevelopment(s, node, action.facultyId);
      }
      return s;
    }

    case 'FOUND_PROGRAM': {
      // The whole gate and the whole mutation live in techSystem.ts's
      // foundProgram, for the reason START_DEVELOPMENT's do in
      // canStartDevelopment/startDevelopment: the hall panel has to be
      // able to say whether a founding will go through before offering
      // the button, and one predicate serves both.
      foundProgram(s, { programId: action.programId, hallId: action.hallId, slot: action.slot, facultyId: action.facultyId });
      settleOpening(s); // the walkthrough's last step ends on a fourth program founded
      return s;
    }

    case 'RELOCATE_PROGRAM': {
      relocateProgram(s, { programId: action.programId, hallId: action.hallId, slot: action.slot });
      return s;
    }

    case 'HIRE_FACULTY': {
      const idx = s.candidates.findIndex((c) => c.id === action.facultyId);
      if (idx !== -1) {
        const [hired] = s.candidates.splice(idx, 1);
        // The one appointment path, shared with the visiting-chair event
        // (see facultySystem.ts's appointFaculty).
        appointFaculty(s, hired);
        // Logged (Plan 16's PR B) so the year in review can list the
        // year's appointments — the roster growing is obvious the week it
        // happens and invisible by the summer.
        s.log.unshift({
          year: s.clock.year,
          week: s.clock.week,
          message: `Appointed ${hired.name} to the faculty in ${hired.field}, at ${money(hired.salary)}/yr.`,
          kind: 'info',
          topic: 'appointment',
          subject: hired.id,
        });
      }
      return s;
    }

    // Dismissal is now two things happening together, not one. The person
    // leaves the roster, AND every course they were teaching is orphaned:
    // their assignments are cleared, so those courses go unstaffed until
    // the player gives them a new instructor (see types.ts's CourseFaculty).
    //
    // Clearing the entries rather than leaving them dangling is what lets
    // a replacement take the orphans over: eligibility is a per-person
    // check, so anyone hired into the field with a free slot can pick them
    // up. What does NOT happen is the department getting its capacity
    // back — an unstaffed course still holds its field slot (see
    // techSystem.ts's usedFacultySlots), because the course still exists
    // and still needs teaching. The school is left over-committed, and has
    // to staff what it already offers before it can offer more.
    //
    // It is logged because it is the one player action in the game with a
    // consequence that outlives the click: the roster shrinking is
    // obvious, four courses quietly losing their teacher is not. The UI
    // warns beforehand (FacultyTab.tsx); this is the record afterwards.
    case 'FIRE_FACULTY': {
      const leaving = s.faculty.find((f) => f.id === action.facultyId);
      if (!leaving) return s;

      const orphaned = s.tech.filter((t) => s.courseFaculty[t.id] === leaving.id && (t.status === 'developing' || t.status === 'done'));
      for (const course of orphaned) delete s.courseFaculty[course.id];
      s.faculty = s.faculty.filter((f) => f.id !== action.facultyId);

      // Logged either way now (Plan 16's PR B), so the year in review can
      // list the year's departures; the orphaned courses are the half that
      // is bad news rather than a record.
      s.log.unshift({
        year: s.clock.year,
        week: s.clock.week,
        message: orphaned.length > 0
          ? `${leaving.name} has left the university. ${orphaned.length} ${orphaned.length === 1 ? 'course is' : 'courses are'} without an instructor until ${leaving.field} is staffed again.`
          : `${leaving.name} (${leaving.field}) has left the university.`,
        kind: orphaned.length > 0 ? 'bad' : 'info',
        topic: 'departure',
        subject: leaving.id,
      });
      return s;
    }

    // Moves an offered course to a different instructor — the lever for
    // improving a weak course, and for re-staffing one a dismissal left
    // orphaned. Free and immediate by design: the real cost is the
    // opportunity cost, since whoever takes it on has one slot less for
    // everything else.
    //
    // The course itself is passed as `except` so its CURRENT instructor
    // still counts as eligible: the slot that course occupies is already
    // theirs, so a full professor must not be judged unable to go on
    // teaching something they are teaching right now.
    // Commissioning research. The gate is deliberately strict, because
    // this is the most expensive commitment in the game: the facility must
    // be finished and free, the topic real, the team the right size, every
    // field the topic names covered, nobody already committed elsewhere,
    // and the funding payable in full up front — the same "charge at the
    // moment of the decision" rule every Buildable follows, so research
    // borrows the pacing model rather than inventing a second one.
    //
    // And then it takes the team's teaching. Their assignments are cleared
    // exactly as FIRE_FACULTY clears them, because the consequence is the
    // same: those courses have no instructor until somebody else takes
    // them. That is the cost decision 2 chose, and it is why the UI names
    // the affected courses before this is dispatched.
    case 'START_INITIATIVE': {
      const lab = s.tech.find((t) => t.id === action.labId);
      if (!lab || lab.facilityType !== 'lab' || lab.status !== 'done') return s;
      if (s.research.initiatives[action.labId]) return s;

      const topic = researchTopic(action.topicId);
      const depth = initiativeDepth(action.depth);
      if (!topic || action.facultyIds.length !== depth.participants) return s;
      if (depth.requiresCrossDisciplinary && topic.fields.length < 2) return s;

      const team = action.facultyIds.map((id) => s.faculty.find((f) => f.id === id));
      if (team.some((f) => f === undefined)) return s;
      const participants = team as Faculty[];
      if (participants.some((f) => isCommitted(s, f.id))) return s;
      // Every field the topic names must actually be on the team — the
      // whole point of a cross-disciplinary topic.
      if (!topic.fields.every((field) => participants.some((f) => f.field === field))) return s;

      const cost = initiativeFundingCost(s, depth);
      if (s.finance.cash < cost) return s;
      s.finance.cash -= cost;

      s.research.initiatives[action.labId] = {
        labId: action.labId,
        topicId: topic.id,
        depth: depth.key,
        participantIds: participants.map((f) => f.id),
        weeksTotal: depth.weeks,
        weeksRemaining: depth.weeks,
        publications: 0,
        breakthroughs: 0,
        grantIncome: 0,
        banked: 0,
      };

      // Only the EXCESS teaching moves. A commitment costs two course
      // slots (see techSystem.ts's RESEARCH_COMMITMENT_SLOTS), so each
      // member keeps what their reduced load still covers and sheds the
      // rest, lowest tier first — the star keeps the capstone. The shed
      // set is computed by the same function ResearchTab warns with, so
      // what the player was told and what happens cannot drift apart.
      //
      // Written BEFORE the initiative is recorded would be wrong: the team
      // is committed as of the line above, and this reads the world as it
      // now is except for the one thing it must not (see
      // coursesShedByCommitment's own note on why it does not call
      // effectiveCourseSlots).
      const coverage = planCommitmentCoverage(s, action.facultyIds);
      for (const course of coverage.shed) delete s.courseFaculty[course.id];
      for (const { course, instructor } of coverage.covered) s.courseFaculty[course.id] = instructor.id;

      // Two different facts, reported as two: a department that absorbed
      // the load is not the same news as a course nobody can teach, and
      // the player can act on each (hire, or reassign, or leave it).
      const { covered, orphaned } = coverage;
      const moved = `${covered.length} of its team's ${coverage.shed.length} courses moved to colleagues`;
      const open = `${orphaned.length} ${orphaned.length === 1 ? 'course is' : 'courses are'} without an instructor`;
      const consequence = covered.length > 0 && orphaned.length > 0
        ? ` ${moved}; ${open}.`
        : covered.length > 0
          ? ` ${moved}.`
          : orphaned.length > 0
            ? ` ${open} while its team is committed.`
            : '';
      s.log.unshift({
        year: s.clock.year,
        week: s.clock.week,
        message: `“${topic.name}” has begun at ${lab.name}.${consequence}`,
        kind: orphaned.length > 0 ? 'info' : 'good',
        topic: 'research-started',
        subject: lab.id,
      });
      return s;
    }

    // Ending one early: the funding is gone and nothing banks, but the
    // team comes back this instant, which is usually why a player does it.
    case 'CANCEL_INITIATIVE': {
      const running = s.research.initiatives[action.labId];
      if (!running) return s;
      const topic = researchTopic(running.topicId);
      endInitiative(s, action.labId, true);
      s.log.unshift({
        year: s.clock.year,
        week: s.clock.week,
        message: `“${topic?.name ?? 'A project'}” has been wound up early. Its funding is not recovered.`,
        kind: 'bad',
        topic: 'research-concluded',
        subject: action.labId,
      });
      return s;
    }

    case 'REASSIGN_COURSE_FACULTY': {
      const course = s.tech.find((t) => t.id === action.courseId);
      if (!course || (course.status !== 'developing' && course.status !== 'done')) return s;
      if (!eligibleInstructors(s, course, course.id).some((f) => f.id === action.facultyId)) return s;
      s.courseFaculty[course.id] = action.facultyId;
      return s;
    }

    case 'PLACE_BUILDABLE': {
      // The unified build-and-site action for placeable kinds (building/
      // dorm/facility — see types.ts's PLACEABLE_KINDS). A course never
      // dispatches this — it isn't a place, and it starts through
      // START_DEVELOPMENT instead, unchanged.
      //
      // Two shapes, branching on the node's CURRENT status (canPlace admits
      // both — see its own comment):
      //   - 'available': the ordinary path. The gate is exactly
      //     canStartDevelopment's — the same affordability/faculty/status
      //     check a course's START_DEVELOPMENT uses, reused rather than
      //     forked — combined with campusMap.ts's canPlace, which adds "not
      //     already sited, and its footprint lands on clear tiles". Passing
      //     both charges the cost, starts the countdown (startDevelopment —
      //     identical to a course's: same duration, same tickTech
      //     decrement, same finish -> 'done' + applied effects), and writes
      //     the chosen location into s.placements in the SAME transaction,
      //     so a developing placeable is never without a location and its
      //     tiles are reserved from week one.
      //   - 'done': Founders Hall in a guided founding (campusMap.ts's
      //     awaitsSite). Nothing to build and nothing to pay: this only
      //     records where it stands.
      //
      // The BASE footprint comes from the Buildable's kind, not from the
      // action (see campusMap.ts's footprintOf); `action.rotated` says
      // whether the player turned that footprint 90 degrees before setting
      // it down. What's stored is the already-oriented footprint — there is
      // no separate orientation field (see types.ts's Placement).
      const node = s.tech.find((t) => t.id === action.buildableId);
      if (node) {
        // A 'done' node is sited at its base footprint; nothing offers
        // rotation for it (see CampusMap.tsx).
        const fp = node.status === 'done' ? footprintOf(node) : orientedFootprint(node, action.rotated);
        if (canPlace(s, node, action.row, action.col, fp)) {
          // Clearing the ground is part of committing a site: every tree
          // under the footprint is felled, permanently (see
          // data/treeData.ts). Done here, in the same transaction as the
          // placement, for both branches. Paving over a tree, by
          // contrast, deletes nothing: that is a render-time read of
          // `pathways` (see CampusMap.tsx), which is what lets lifting the
          // path bring the tree back.
          const placement = placementFor(action.row, action.col, fp);
          if (node.status === 'done') {
            if (awaitsSite(s, node)) {
              s.placements[node.id] = placement;
              fellTrees(s.trees, placement);
            }
          } else if (canStartDevelopment(s, node)) {
            s.placements[node.id] = placement;
            fellTrees(s.trees, placement);
            startDevelopment(s, node);
          }
          settleOpening(s); // the walkthrough's first step ends on Founders Hall standing
        }
      }
      return s;
    }

    case 'ADD_PATH_TILE': {
      if (isInBounds(action.tile.row, action.tile.col)) s.pathways[pathTileKey(action.tile)] = true;
      return s;
    }

    case 'REMOVE_PATH_TILE': {
      delete s.pathways[pathTileKey(action.tile)];
      return s;
    }

    case 'PLANT_TREE': {
      // Only on open ground: a tree under a building is felled by
      // definition, and one under a path is hidden until the path lifts
      // (see types.ts's Trees) — neither is something worth planting.
      const { row, col } = action.tile;
      if (!isInBounds(row, col)) return s;
      const key = pathTileKey(action.tile);
      if (key in s.pathways || occupantAt(s.placements, row, col) !== undefined) return s;
      if (!(key in s.trees)) s.trees[key] = Math.floor(random() * TREE_SEED_RANGE);
      return s;
    }

    case 'FELL_TREE': {
      delete s.trees[pathTileKey(action.tile)];
      return s;
    }

    case 'LAUNCH_ENDOWMENT_CAMPAIGN': {
      // The late-game money sink (see financeSystem.ts's endowmentCampaign
      // for the cost/match curve). Charged in full, up front, exactly like
      // starting a Buildable — but unlike a Buildable it is repeatable
      // forever, so it is the one purchase a fully built-out school still
      // has left. The same pure function the Treasury previews it with is
      // what commits it, so the player gets the numbers they were shown.
      const campaign = endowmentCampaign(s);
      if (campaign.available && campaign.affordable) {
        s.finance.cash -= campaign.cost;
        s.finance.endowment += campaign.endowmentGain;
        s.finance.endowmentCampaigns += 1;
        s.log.unshift({
          year: s.clock.year,
          week: s.clock.week,
          message: `Endowment campaign #${campaign.number} closed: ${money(campaign.cost)} committed, ${money(campaign.endowmentGain)} raised at a ${Math.round(campaign.match * 100)}% donor match.`,
          kind: 'good',
          topic: 'money',
        });
      }
      return s;
    }

    // The one athletics-wide recruiting & scholarship budget lever (see
    // data/studentLifeData.ts's ATHLETICS_BUDGET_TIERS). No cost, no gate,
    // no log line — this is a standing dial, not a decision, and reads live
    // everywhere it matters (financeSystem's studentLifeUpkeep line,
    // satisfactionSystem's social attribute, teamQuality) the very next
    // tick.
    case 'SET_ATHLETICS_BUDGET': {
      s.orgs.athleticsBudget = action.tier;
      return s;
    }

    // The priority list, dragged (Plan 21's PR G). The order is the stored
    // thing; the funded line is derived. A program dragged below the line
    // it was above may lose its head coach on the spot (studentLifeData.ts's
    // applyTeamOrder), and the log says who walked.
    case 'SET_TEAM_ORDER': {
      const left = applyTeamOrder(s, action.order);
      if (left.length > 0) {
        s.log.unshift({
          year: s.clock.year, week: s.clock.week,
          message: `The priority list moved, and ${left.join(', ')} resigned rather than coach a program the department will no longer fund in full.`,
          kind: 'bad',
        });
      }
      return s;
    }

    // Hires a listed coach candidate into one of a team's three staff
    // roles. Every gate is checked here, not trusted from the UI, the same
    // discipline HIRE_FACULTY's own simplicity relies on the candidate
    // pool's shape to uphold — but a coach hire has real ways to be invalid
    // (wrong field for the role, an already-filled slot) that a plain
    // splice can't rule out by construction, so they're checked explicitly.
    case 'HIRE_COACH': {
      const idx = s.orgs.coachCandidates.findIndex((c) => c.id === action.candidateId);
      const team = s.orgs.teams.find((t) => t.id === action.teamId);
      if (idx === -1 || !team) return s;
      const candidate = s.orgs.coachCandidates[idx];
      const neededField = action.role === 'trainer' ? TRAINER_FIELD : team.sport;
      if (candidate.field !== neededField) return s;
      const slot = action.role === 'head' ? 'headCoach' : action.role === 'assistant' ? 'assistantCoach' : 'trainer';
      if (team[slot] !== null) return s; // fire the incumbent first — see FIRE_COACH
      s.orgs.coachCandidates.splice(idx, 1);
      candidate.tenureWeeks = 0;
      candidate.weeksListed = 0;
      team[slot] = candidate;
      return s;
    }

    case 'FIRE_COACH': {
      const team = s.orgs.teams.find((t) => t.id === action.teamId);
      if (!team) return s;
      const slot = action.role === 'head' ? 'headCoach' : action.role === 'assistant' ? 'assistantCoach' : 'trainer';
      team[slot] = null;
      return s;
    }

    // A view reporting that the player has now seen these ids (see
    // types.ts's SeenState and the alert-badge module comment there).
    // Purely additive — nothing here ever un-sees an id — so this can
    // never resurrect a badge, only retire one.
    // A gated tab's gate has opened (see TabNav.tsx's TAB_GATES). Idempotent
    // through the seen bucket rather than through the caller being careful:
    // App.tsx dispatches this from an effect, which runs twice under
    // StrictMode and again for any render in between, and however many times
    // that happens the log must carry one line.
    case 'NOTE_TAB_AVAILABLE': {
      if (s.seen.tabIds[action.id]) return state;
      s.seen.tabIds[action.id] = true;
      if (action.announce) {
        s.log.unshift({
          year: s.clock.year,
          week: s.clock.week,
          message: `The ${action.label} view is now available.`,
          kind: 'good',
        });
      }
      return s;
    }

    case 'MARK_SEEN': {
      const bucket = action.kind === 'course' ? s.seen.courseIds : s.seen.buildableIds;
      for (const id of action.ids) bucket[id] = true;
      return s;
    }

    // The generic fallback for an interrupt type the UI's own switch
    // doesn't recognise (see InterruptModal.tsx's final, normally-
    // unreachable render branch — every one of the 8 interrupt types that
    // exist today is wired to its own dedicated resolve action instead,
    // every one of which advances the clock; see e.g. RESOLVE_MILESTONE).
    // That is not incidental: every interrupt today is raised mid-TICK (see
    // the SYSTEMS loop below), which skips its OWN advanceClock call to
    // hold the week open, so resolving has to advance it or the next
    // ordinary TICK would silently re-run that same week's systems a
    // second time before finally moving on. This action used to skip that
    // call, leaving it a live footgun rather than a safe fallback: a future
    // interrupt type reaching here by accident (its own resolve action
    // never wired up) would wedge the clock on that week forever instead of
    // erroring loudly. Advancing here matches every dedicated resolve
    // action and is the correct behavior for the case this fallback
    // actually exists to catch.
    case 'RESOLVE_INTERRUPT': {
      s.pendingInterrupt = null;
      advanceClock(s);
      return s;
    }

    // One beat forward through the summer (see types.ts's SummerPayload).
    // Nothing here touches the calendar or the school: it is bookkeeping
    // about where in the sequence the player is, written into the
    // interrupt's own payload so a save taken between beats resumes on the
    // right one. The decision the Admissions beat produced rides along the
    // same way, so the last beat commits it rather than a re-read slider.
    case 'RESOLVE_SUMMER_BEAT': {
      if (s.pendingInterrupt?.type !== 'summer') return state;
      const payload = s.pendingInterrupt.payload as SummerPayload;
      if (payload.beat >= SUMMER_LAST_BEAT) return state;
      payload.beat = (payload.beat + 1) as SummerBeat;
      if (action.decision) {
        payload.decision = {
          tuition: Math.max(0, Math.min(action.decision.tuition, TUITION_SLIDER_MAX)),
          admitRate: Math.max(0, Math.min(1, action.decision.admitRate)),
        };
      }
      return s;
    }

    // THE LAST BEAT OF THE SUMMER, and the one that turns the calendar page.
    case 'RESOLVE_ADMISSIONS': {
      // THE SEMICENTENNIAL (Plan 17's PR C). The fiftieth summer seals the
      // record: the legacy is read ONCE, here, before anything about this
      // summer changes the school — so it is exactly the reading the final
      // report (the summer's first beat) showed — and written to s.self,
      // where nothing ever writes it again. The clock does not stop: the
      // rest of this case runs as it does every year, and the sixtieth
      // summer files an ordinary year in review.
      if (s.clock.year === SEMICENTENNIAL_YEAR && s.self.legacy === null) {
        s.self.legacy = legacy(s);
        s.log.unshift({
          year: s.clock.year, week: s.clock.week,
          message: `The fiftieth year closes. The record is sealed: ${institutionName(s.self)} is ${s.self.legacy.name}.`,
          kind: 'good',
        });
      }

      // Tuition is set ONLY here, once a year — see
      // docs/design/admissions.md and the removed live SET_TUITION control.
      // This sets the LISTED price. It reaches a student only through the
      // freshman entry of tuitionByClass, below, after the classes advance:
      // the three classes already on the books keep the price they were
      // admitted under (see types.ts's tuitionByClass).
      s.finance.listedTuition = Math.max(0, Math.min(action.tuition, TUITION_SLIDER_MAX));

      resolveStudentLifeDigest(s, action.approvedPetitionIds);

      // THE REPORT CARD (Plan 15's PR B, see prestigeSystem.ts's gradeYear):
      // the year that just ended, graded — on the accumulators as they
      // stand and the class that spent the year — BEFORE anything below
      // resets or replaces either. The step itself is applied after the
      // funnel, so the class that enrolls is the one the panel projected.
      const reportCard = gradeYear(s);

      // Word of mouth: the trailing-year AVERAGE satisfaction (accumulated
      // weekly since last summer) scales next year's applicant pool — the
      // design's "current experience -> satisfaction -> next year's
      // applications". Read it, record it as this year's figure, then reset
      // the accumulator for the year now beginning — and the crowding
      // accumulator the report card just read, alongside it.
      const priorYearAvgSatisfaction = trailingYearSatisfaction(s);
      s.students.priorYearAvgSatisfaction = priorYearAvgSatisfaction;
      s.students.satisfactionYearSum = 0;
      s.students.satisfactionYearWeeks = 0;
      s.students.crowdingYearSum = 0;
      s.students.crowdingYearWeeks = 0;

      // Run the distribution funnel with the committed policy: it sizes the
      // incoming FRESHMAN class from demand and policy alone — dorm capacity
      // only scales the applicant pool now (see admissionsSystem.ts's
      // module comment), never a ceiling to fill or be capped by.
      // The admit rate is the player's second decision now (Plan 05's PR
      // C): the funnel takes it rather than computing one. What comes back
      // as outcome.admitRate is admits/applicants, which matches the choice
      // unless a thin top/mid band ran out before the share was filled.
      const chosenAdmitRate = Math.max(0, Math.min(1, action.admitRate));
      // THE CEILING (Plan 15's PR E): the class is clipped to the seats the
      // housed catalogue has left after graduation — read here, at the one
      // boundary, off the same function the reveal shows.
      const ceiling = intakeCeiling(s);
      const outcome = projectAdmissions(
        s.self.reputation,
        s.finance.listedTuition,
        s.students.capacity,
        priorYearAvgSatisfaction,
        deriveCohortSignals(s),
        chosenAdmitRate,
        ceiling.seatsLeft,
      );

      // Advance the classes a year: seniors graduate and leave, everyone
      // else moves up — less the share a bad year cost (Plan 15's PR F,
      // admissionsSystem.ts's attritionRate, off the same year's average
      // word of mouth reads) — and the incoming class arrives at the price
      // just set. The advance itself is a pure function in
      // admissionsSystem.ts because the admissions panel runs the SAME one
      // on a copy to project what this commit will do (see
      // consequences.ts) — two copies of it is how a projection starts
      // promising a body the tick does not produce.
      const attrition = attritionRate(priorYearAvgSatisfaction);
      const reasons = attritionReasons(s);
      const advanced = advanceClasses(
        {
          classes: s.students.classes,
          tuitionByClass: s.finance.tuitionByClass,
          cohortsByClass: s.students.cohortsByClass,
        },
        {
          count: outcome.enrolled,
          price: s.finance.listedTuition,
          // Written once, here, and never recomputed: what the class that
          // just enrolled is made of (see types.ts's ClassCohorts).
          cohorts: outcome.enrolledCohorts,
        },
        attrition,
      );
      const graduating = advanced.graduating;
      s.students.classes = advanced.classes;
      s.finance.tuitionByClass = advanced.tuitionByClass;
      s.students.cohortsByClass = advanced.cohortsByClass;
      s.students.applicantPool = outcome.applicants;
      // Stored as the CHOSEN rate, not the realized one, because this is
      // what next summer's slider opens at (see admissionsSystem.ts's
      // payload) — a school whose thin top band clipped its intake should
      // reopen on the policy it set, not on the clipped consequence.
      s.students.admitRate = chosenAdmitRate;
      s.students.incomingQuality = outcome.avgIncomingQuality;
      // What this funnel read, for next summer's reveal to be measured
      // against (Plan 16's PR C — see types.ts's FunnelRecord). The pool's
      // cohort split is apportioned by the same function the reveal's cards
      // use, off the same signals, so next year's "last year" is exactly
      // what this year's cards showed.
      s.students.lastFunnel = {
        year: s.clock.year,
        applicants: outcome.applicants,
        factors: outcome.factors,
        cohorts: cohortCounts(deriveCohortSignals(s), priceTolerance(s.self.reputation), s.finance.listedTuition, outcome.applicants),
      };

      // The summer step: prestige moves toward the year score — a small
      // share of the gap upward, a large one downward. This is the one
      // moment in the year prestige moves by more than a tremor.
      applyReportCard(s, reportCard);

      // The one annual boundary in the game, so the one place the history
      // record grows (see state/history.ts). Appended AFTER the funnel and
      // the step above, so the row is the class and the standing the school
      // actually carries into the next year, and BEFORE advanceClock, so it
      // is filed under the year that just closed. The year's own figures
      // that only this boundary knows — who left, what the year averaged —
      // are handed in rather than re-derived.
      s.history.push(captureYearSnapshot(s, {
        attrition: advanced.notReturning,
        satisfactionAverage: priorYearAvgSatisfaction,
        graduated: graduating,
      }));

      s.pendingInterrupt = null;
      advanceClock(s); // resolving is what turns the calendar page into the new year
      s.log.unshift({
        year: s.clock.year,
        week: s.clock.week,
        message: `Admissions: tuition ${money(s.finance.listedTuition)}/yr — ${outcome.applicants.toLocaleString()} applicants, ${Math.round(outcome.admitRate * 100)}% admitted, ${outcome.enrolled.toLocaleString()} freshmen enrolled, ${graduating.toLocaleString()} graduated.`,
        kind: 'info',
        topic: 'admissions',
      });
      // ATTRITION GETS ITS OWN LINE. A silently smaller number is the
      // single most likely source of "I don't understand what happened to
      // my school", and this plan added enough hidden machinery already.
      if (advanced.notReturning > 0) {
        s.log.unshift({
          year: s.clock.year,
          week: s.clock.week,
          message: `${advanced.notReturning.toLocaleString()} students did not return — ${reasons.length > 0 ? reasons.join(', ') : 'a year averaging ' + priorYearAvgSatisfaction.toFixed(0) + ' satisfaction'}.`,
          kind: 'bad',
          topic: 'attrition',
        });
      }
      if (outcome.capped) {
        s.log.unshift({
          year: s.clock.year,
          week: s.clock.week,
          message: `The catalogue had room for ${ceiling.seatsLeft.toLocaleString()} more; the class was held to it.`,
          kind: 'info',
        });
      }
      s.log.unshift({
        year: s.clock.year,
        week: s.clock.week,
        message: `Report card for year ${reportCard.year}: graded ${reportCard.score.toFixed(0)}. Prestige ${reportCard.before.toFixed(1)} → ${reportCard.after.toFixed(1)}.`,
        kind: reportCard.after >= reportCard.before ? 'good' : 'bad',
        topic: 'report-card',
      });

      // The autosave (see state/persistence.ts). This annual boundary is
      // the one moment in the game where a natural, meaningful chunk of
      // progress has just been committed, so it is the natural checkpoint:
      // a refresh costs at most the weeks since last summer, and the
      // player can shorten that themselves with SAVE_GAME.
      //
      // Written LAST, once `s` is fully assembled, so the saved run is
      // exactly the state React is about to commit. Silent on success —
      // an annual "autosaved" line would be noise next to the admissions
      // summary above — but a FAILED write is worth interrupting for,
      // because the player would otherwise believe their run is safe.
      if (!saveGame(s)) {
        s.log.unshift({
          year: s.clock.year,
          week: s.clock.week,
          message: 'Autosave failed — this browser is refusing to store the run. Progress will be lost on refresh.',
          kind: 'bad',
        });
      }
      return s;
    }

    // Acknowledges a student demand the moment it is raised (see
    // systems/demands/demandSystem.ts). Grants nothing and costs nothing:
    // the demand is already open on s.events.activeDemand, with its target
    // and its deadline, and the only way to answer it is to BUILD the
    // thing before the deadline passes — which the demand system detects
    // off the campus itself, with no second action to dispatch. This is
    // the dismissable acknowledgement the zero-cost/fairness rule asks
    // for, and nothing more. Advances the clock, like every other trailing
    // interrupt.
    case 'RESOLVE_DEMAND': {
      s.pendingInterrupt = null;
      advanceClock(s);
      return s;
    }

    // Dismisses a research prize celebration (see
    // systems/research/researchSystem.ts). Grants nothing, for the same
    // reason RESOLVE_MILESTONE does: the award — the winner's permanent
    // acclaim, and with it their higher salary and research output, plus
    // the school's prestige credit — landed the week the prize was won.
    // Advances the clock, like every other trailing interrupt.
    case 'RESOLVE_RESEARCH_REPORT': {
      s.pendingInterrupt = null;
      advanceClock(s);
      return s;
    }

    // Answers the one-time College -> University charter offer (see
    // systems/events/eventSystem.ts). Purely cosmetic: it swaps the fixed
    // half of the institution's name, and nothing in the game reads that
    // string except the views that display it. The flag is set either way,
    // so declining is final and the question never returns.
    case 'RESOLVE_CHAMPIONSHIP': {
      s.pendingInterrupt = null;
      advanceClock(s);
      return s;
    }

    // The first sport club's naming beat (Plan 21's PR O). Trimmed and
    // capped as the director's modal does it; an empty name keeps the
    // question for the director's modal, which still asks when nothing has
    // answered.
    case 'RESOLVE_MASCOT': {
      const mascot = action.mascot.trim().slice(0, MASCOT_MAX_LENGTH);
      if (mascot) s.self.mascot = mascot;
      s.orgs.mascotBeatPending = false;
      s.pendingInterrupt = null;
      s.log.unshift({
        year: s.clock.year, week: s.clock.week,
        message: mascot ? `The school's teams will play as the ${mascot}.` : 'The students could not agree on a name for the teams; the question will come back.',
        kind: mascot ? 'good' : 'info',
      });
      return s;
    }

    case 'RESOLVE_ATHLETIC_DIRECTOR': {
      if (action.candidate) {
        s.orgs.athleticDirector = action.candidate;
        // The mascot is trimmed and capped here rather than trusted from the
        // form: it goes into standings rows and championship banners beside a
        // school's own name, and an empty one is a real state the rest of the
        // game already handles (see types.ts's University.mascot).
        const mascot = action.mascot.trim().slice(0, MASCOT_MAX_LENGTH);
        if (mascot) s.self.mascot = mascot;
        s.log.unshift({
          year: s.clock.year,
          week: s.clock.week,
          message: mascot
            ? `${action.candidate.name} is the new athletic director. The teams will play as the ${mascot}.`
            : `${action.candidate.name} is the new athletic director.`,
          kind: 'good',
        });
      } else {
        // Nothing to record: the week the offer went out was stamped when it
        // FIRED (see eventSystem.ts), precisely so that declining and never
        // answering cool down the same way.
        s.log.unshift({
          year: s.clock.year,
          week: s.clock.week,
          message: 'None of the candidates for athletic director were appointed; the search goes on.',
          kind: 'info',
        });
      }
      s.pendingInterrupt = null;
      advanceClock(s);
      return s;
    }

    case 'RESOLVE_CHARTER': {
      s.self.universityCharterOffered = true;
      if (action.accept) {
        s.self.suffix = 'University';
        s.log.unshift({
          year: s.clock.year,
          week: s.clock.week,
          message: `${s.self.name} College is now ${s.self.name} University.`,
          kind: 'good',
        });
      } else {
        s.log.unshift({
          year: s.clock.year,
          week: s.clock.week,
          message: `The trustees have declined the charter; the school remains ${s.self.name} College.`,
          kind: 'info',
        });
      }
      s.pendingInterrupt = null;
      advanceClock(s);
      return s;
    }

    // Dismisses a milestone celebration (see systems/events/eventSystem.ts).
    // Nothing to apply — the milestone's real effects landed in techSystem
    // the week it was awarded; this interrupt exists to make the moment
    // land, not to grant anything. Advances the clock for the same reason
    // RESOLVE_REPORT does: it fires as a trailing step after that week's
    // systems already ran.
    case 'RESOLVE_MILESTONE': {
      s.pendingInterrupt = null;
      advanceClock(s);
      return s;
    }

    // Commits one choice from an authored decision event (see
    // data/eventData.ts). The definition is looked up from the data table
    // by id and the choice's own pure cost/apply pair does the work, so
    // the numbers the modal showed are exactly the numbers charged — the
    // same contract RESOLVE_ADMISSIONS and the endowment campaign follow.
    //
    // The cash cost is charged HERE rather than inside apply(), so every
    // event in the table is charged the same way and no authored effect
    // can quietly take the school below zero: an unaffordable choice is
    // refused outright, exactly as an unaffordable Buildable is (see
    // techSystem.ts's canStartDevelopment). Every event is guaranteed to
    // offer at least one zero-cost choice, so a refusal is never a dead
    // end. Either way the interrupt clears and the clock resumes: an
    // event can never wedge the game.
    case 'RESOLVE_DECISION_EVENT': {
      const event = findDecisionEvent(action.eventId);
      const choice = event && offeredChoices(s, event, action.ctx).find((c) => c.id === action.choiceId);
      if (choice) {
        const ctx = action.ctx;
        const cost = choice.cost(s, ctx);
        if (cost <= s.finance.cash) {
          s.finance.cash -= cost;
          s.log.unshift(choice.apply(s, ctx));
        }
      }
      s.pendingInterrupt = null;
      advanceClock(s);
      return s;
    }

    case 'RESOLVE_REPORT': {
      s.pendingInterrupt = null;
      advanceClock(s); // fires as a trailing step after that week's systems ran; dismissing moves on
      return s;
    }

    // Puts down one of the first year's letters (see eventSystem.ts's
    // fireOpeningLetter). The letter was marked read when it fired; all
    // this records is the one thing a letter can change — the player
    // declining the rest of the script. Advances the clock like every
    // other trailing interrupt.
    case 'RESOLVE_LETTER': {
      if (action.skipAll) s.events.opening.skipped = true;
      s.pendingInterrupt = null;
      advanceClock(s);
      return s;
    }

    // =====================================================================
    // THE PLAYTEST BLOCK (see actions.ts's own DEBUG_ block, and
    // components/DebugPanel.tsx, the single component that dispatches any
    // of these). One place, one comment, so what a developer can reach for
    // is a list rather than a habit — and so it is obvious at a glance that
    // nothing here is reachable in ordinary play or from any system.
    //
    // Each one is LOGGED, for the same reason the old "+$1B" grant was:
    // a number that changed because somebody typed it into a panel should
    // be distinguishable, weeks later, from one the simulation produced.
    // =====================================================================
    case 'DEBUG_SET_CASH':
    case 'DEBUG_SET_PRESTIGE':
    case 'DEBUG_SET_SATISFACTION':
    case 'DEBUG_SET_TUITION': {
      const what = debugSet(s, action);
      s.log.unshift({ year: s.clock.year, week: s.clock.week, message: `Playtest: ${what}`, kind: 'info' });
      return s;
    }

    // Fast-forward. The loop runs HERE rather than as a burst of TICKs
    // dispatched from the panel, and the reason is the auto-resolve: a
    // component dispatching a hundred actions in one handler cannot see
    // the state between any two of them, so it cannot know a modal came up
    // on week 37 and answer it. So it is a loop over the ordinary
    // primitives, inside the reducer, taking no shortcut the single-step
    // version does not take — and it costs one render rather than N.
    case 'DEBUG_JUMP': {
      let jumped = s;
      let weeks = 0;
      while (weeks < action.weeks) {
        if (jumped.pendingInterrupt) {
          if (!action.autoResolve) break;
          const answer = defaultAnswer(jumped);
          if (!answer) break;
          jumped = reducer(jumped, answer);
          continue; // answering turns the calendar page itself; that IS the week
        }
        jumped = reducer(jumped, { type: 'TICK' });
        weeks += 1;
      }
      jumped.log.unshift({
        year: jumped.clock.year,
        week: jumped.clock.week,
        message: `Playtest: jumped ${weeks} week${weeks === 1 ? '' : 's'}`
          + `${jumped.pendingInterrupt ? `, stopped by a ${jumped.pendingInterrupt.type} decision` : ''}.`,
        kind: 'info',
      });
      if (jumped.log.length > LOG_CAP) jumped.log.length = LOG_CAP;
      return jumped;
    }

    // Fire one authored decision event by id, bypassing eligibility and
    // both cooldowns — the payload is rolled exactly as eventSystem.ts
    // would roll it, so what comes up is the real modal and the choice
    // applies for real. An event whose context cannot be rolled against
    // this state (no faculty to poach, no building to break) is refused
    // rather than shown empty.
    case 'DEBUG_FORCE_EVENT': {
      if (s.pendingInterrupt) return state;
      const event = findDecisionEvent(action.eventId);
      if (!event) return state;
      const ctx = event.rollContext ? event.rollContext(s) : {};
      if (ctx === null) return state;
      s.events.decisionHistory[event.id] = {
        fires: (s.events.decisionHistory[event.id]?.fires ?? 0) + 1,
        lastWeek: absoluteWeek(s),
      };
      s.pendingInterrupt = { type: 'decision-event', payload: { eventId: event.id, ctx } };
      return s;
    }

    // Raise a demand for one named shortfall now, past the satisfaction
    // threshold and the cooldown that ordinarily gate it. The ask is the
    // one the demand system itself would make for that need, and it is
    // raised through the system's own raiseDemand — so a forced demand has
    // a real deadline, a real target, and resolves the real way.
    case 'DEBUG_FORCE_DEMAND': {
      if (s.pendingInterrupt || s.events.activeDemand) return state;
      const demand = shortfallDemandFor(s, action.subject);
      if (!demand) return state;
      raiseDemand(s, demand);
      return s;
    }

    // Celebrate whatever is queued now, rather than on the next week the
    // frequency floor allows. Nothing is invented: an empty queue stays
    // empty and nothing happens.
    case 'DEBUG_FORCE_MILESTONE': {
      if (s.pendingInterrupt) return state;
      s.events.lastMilestoneWeek = 0; // stand the frequency floor down for this one
      return fireMilestoneCelebration(s) ? s : state;
    }

    // Publish the U.S. News report now, off this week's standings — as its
    // own modal, the way it used to fire every year at week 26 before it
    // became the summer's Standing beat. The playtest panel's way of
    // looking at the table without waiting for a summer.
    case 'DEBUG_FORCE_REPORT': {
      if (s.pendingInterrupt) return state;
      s.pendingInterrupt = { type: 'annual-report', payload: buildReportPayload(s) };
      return s;
    }

    // A shortcut for clicking every available course's own "Develop"
    // button in turn (see CurriculumTab.tsx's "Develop All" button) — not a
    // new capability, so it goes through canStartDevelopment/
    // startDevelopment one course at a time, in s.tech's own order, exactly
    // as START_DEVELOPMENT does for a single course. Re-checking the gate
    // before every course (rather than snapshotting the available list
    // once) is what makes cash and faculty-slot limits bite mid-loop
    // exactly as they would clicking by hand: a course started earlier in
    // the loop can spend the cash or fill the faculty slot a later one
    // needed.
    case 'POST_SEARCH': {
      postSearch(s, action.field);
      return s;
    }

    case 'SWAP_COURSE_FACULTY': {
      swapInstructors(s, action.courseA, action.courseB);
      return s;
    }

    // Renovates the tier-1 library in place (see facilitiesData.ts's
    // nextLibraryFloor and actions.ts's RENOVATE_LIBRARY) rather than
    // starting a new Buildable: the SAME node goes back to 'developing' at
    // its already-placed spot — s.placements is untouched, there is no
    // second footprint — and its own effects are raised right away so they
    // take over the moment tickTech's ordinary completion flips status back
    // to 'done'.
    //
    // Raising effects at the START is only safe because the node also
    // records what it was serving BEFORE the work (renovatingFrom), which
    // is what the satisfaction sums read while it is 'developing' — see
    // types.ts's servingPopulation. Without that the library went fully
    // offline for the whole renovation and the new figure arrived only at
    // completion, so adding a fourth floor first took three away: a school
    // could watch its academic score fall for a year and read the
    // renovation as having caused it. The floors that exist keep working.
    case 'RENOVATE_LIBRARY': {
      const node = s.tech.find((t) => t.id === LIBRARY_TIER1_ID);
      const plan = node ? nextLibraryFloor(node) : null;
      if (node && plan && node.status === 'done' && s.finance.cash >= plan.cost) {
        const servesPopulation = (node.effects?.servesPopulation ?? 0) + plan.servesGain;
        node.renovatingFrom = node.effects?.servesPopulation ?? 0;
        node.status = 'developing';
        s.developing[node.id] = plan.weeks;
        s.finance.cash -= plan.cost;
        node.floorsAdded = (node.floorsAdded ?? 0) + 1;
        node.effects = {
          ...node.effects,
          servesPopulation,
          upkeepPerWeek: servedUpkeep('library', servesPopulation),
        };
      }
      return s;
    }

    // Expands a venue in place (Plan 21's PR Q), on the library's renovation
    // idiom above: the same node goes back to 'developing' at its spot, its
    // effects are raised at the start with renovatingFrom standing in for
    // the crowd it already serves, and its expansions count is what the
    // gate reads the seats off (facilitiesData.ts's venueSeatsOf).
    case 'EXPAND_VENUE': {
      const node = s.tech.find((t) => t.id === action.venueId);
      const plan = node ? nextVenueExpansion(node) : null;
      if (node && plan && node.status === 'done' && s.finance.cash >= plan.cost) {
        const servesPopulation = (node.effects?.servesPopulation ?? 0) + plan.servesGain;
        node.renovatingFrom = node.effects?.servesPopulation ?? 0;
        node.status = 'developing';
        s.developing[node.id] = plan.weeks;
        s.finance.cash -= plan.cost;
        node.expansions = (node.expansions ?? 0) + 1;
        node.effects = {
          ...node.effects,
          servesPopulation,
          prestigeContribution: (node.effects?.prestigeContribution ?? 0) + plan.prestigeGain,
          upkeepPerWeek: node.facilityType ? servedUpkeep(node.facilityType, servesPopulation) : node.effects?.upkeepPerWeek,
        };
      }
      return s;
    }

    case 'SAVE_GAME': {
      // The manual save. Logs either way: the confirmation is the whole
      // point of an explicit save affordance, and a silent failure would
      // be worse than no button at all.
      //
      // The log line is written BEFORE the save, so the persisted run
      // contains the record of its own save rather than a state one line
      // behind the one on screen. If the write is refused the line is
      // rewritten as the failure notice — nothing was persisted, so there
      // is nothing left on disk to contradict.
      const entry: LogEntry = {
        year: s.clock.year,
        week: s.clock.week,
        message: 'Game saved.',
        kind: 'good',
      };
      s.log.unshift(entry);
      if (!saveGame(s)) {
        entry.message = 'Save failed — this browser is refusing to store the run.';
        entry.kind = 'bad';
      }
      return s;
    }

    case 'RESET':
      // Abandoning the run: the save has to go with it, or the next
      // refresh would resurrect the university the player just discarded.
      // Returns to the startup screen rather than re-founding the same
      // school, so "New Game" means what it says (name and private/public
      // are both back on the table).
      clearSave();
      return createPreStartState();

    default:
      return state;
  }
}
