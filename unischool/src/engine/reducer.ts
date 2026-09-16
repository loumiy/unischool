import type { Faculty, GameState, LogEntry } from '../state/types';
import { WEEKS_PER_YEAR } from '../state/types';
import type { Action } from '../state/actions';
import { createInitialState, createPreStartState } from '../state/actions';
import { tickFinance, endowmentCampaign } from '../systems/finance/financeSystem';
import {
  tickTech, canStartDevelopment, startDevelopment, eligibleInstructors, isCommitted,
  planCommitmentCoverage, developAllPlan,
} from '../systems/techtree/techSystem';
import { endInitiative } from '../systems/research/researchSystem';
import { initiativeDepth, initiativeFundingCost } from '../data/researchData';
import { researchTopic } from '../data/researchTopics';
import { tickAdmissions, projectAdmissions, trailingYearSatisfaction } from '../systems/admissions/admissionsSystem';
import { deriveCohortSignals } from '../systems/admissions/cohorts';
import { tickRivals } from '../systems/rivals/rivalsSystem';
import { appointFaculty, tickFaculty } from '../systems/faculty/facultySystem';
import { tickResearch } from '../systems/research/researchSystem';
import { tickPrestige } from '../systems/prestige/prestigeSystem';
import { tickSatisfaction } from '../systems/satisfaction/satisfactionSystem';
import { tickEvents } from '../systems/events/eventSystem';
import { tickStudentLife } from '../systems/studentlife/studentLifeSystem';
import { tickAthletics } from '../systems/athletics/athleticsSystem';
import { tickDemands } from '../systems/demands/demandSystem';
import { findDecisionEvent } from '../data/eventData';
import { LIBRARY_TIER1_ID, nextLibraryFloor, servedUpkeep } from '../data/facilitiesData';
import { fellTrees } from '../data/treeData';
import {
  CHAPTER_APPROVAL_SATISFACTION_NUDGE, CHAPTER_DECLINE_SATISFACTION_HIT,
  CLUB_APPROVAL_SATISFACTION_NUDGE, CLUB_DECLINE_SATISFACTION_HIT, activatePetition, TRAINER_FIELD,
} from '../data/studentLifeData';
import {
  canPlace, canSiteRetroactively, footprintOf, isInBounds, isPlaceableKind,
  orientedFootprint, pathTileKey, placementFor, RETROACTIVE_SITING_COST,
} from '../state/campusMap';
import { captureYearSnapshot } from '../state/history';
import { saveGame, clearSave } from '../state/persistence';

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

// How many log entries are kept. Weekly attrition spam is gone, so what
// remains is milestones, completions, admissions cycles and postings — a
// deep enough cap that a completed major or a finished school building is
// still readable in the ticker weeks later instead of being pushed out by
// the next few routine lines.
const LOG_CAP = 200;

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

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
// The student-life digest (see README's "Student life", and
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
      activatePetition(s, petition);
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
  });
}

function advanceClock(s: GameState): void {
  s.clock.week += 1;
  if (s.clock.week > WEEKS_PER_YEAR) {
    s.clock.week = 1;
    s.clock.year += 1;
  }
}

export function reducer(state: GameState, action: Action): GameState {
  // Clone so systems can mutate freely without touching the previous state.
  const s: GameState = structuredClone(state);

  switch (action.type) {
    case 'TICK': {
      if (!s.started || s.pendingInterrupt) return state; // the clock halts while an interrupt is pending
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
      return createInitialState(action.name, action.schoolType);

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

    case 'HIRE_FACULTY': {
      const idx = s.candidates.findIndex((c) => c.id === action.facultyId);
      if (idx !== -1) {
        const [hired] = s.candidates.splice(idx, 1);
        // The one appointment path, shared with the visiting-chair event
        // (see facultySystem.ts's appointFaculty).
        appointFaculty(s, hired);
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

      if (orphaned.length > 0) {
        s.log.unshift({
          year: s.clock.year,
          week: s.clock.week,
          message: `${leaving.name} has left the university. ${orphaned.length} ${orphaned.length === 1 ? 'course is' : 'courses are'} without an instructor until ${leaving.field} is staffed again.`,
          kind: 'bad',
        });
      }
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
      //   - 'done': a founding Buildable (or an event-granted one — see
      //     needsSiting's own comment) that never got a home. There is no
      //     development to start — its effects already applied — so this
      //     only charges the flat RETROACTIVE_SITING_COST and records where
      //     it stands; canSiteRetroactively is the whole gate, no
      //     canStartDevelopment involved (that function requires status
      //     'available' and would always refuse a 'done' node).
      //
      // The BASE footprint comes from the Buildable's kind, not from the
      // action (see campusMap.ts's footprintOf); `action.rotated` says
      // whether the player turned that footprint 90 degrees before setting
      // it down. What's stored is the already-oriented footprint — there is
      // no separate orientation field (see types.ts's Placement).
      const node = s.tech.find((t) => t.id === action.buildableId);
      if (node) {
        // A 'done' node is never rotated — nothing offers that control for
        // a retroactive siting (see CampusMap.tsx), so its base footprint
        // is exactly what canPlace/placementFor need.
        const fp = node.status === 'done' ? footprintOf(node) : orientedFootprint(node, action.rotated);
        if (canPlace(s, node, action.row, action.col, fp)) {
          // Clearing the ground is part of committing a site: every tree
          // under the footprint is felled, permanently (see
          // data/treeData.ts). Done here, in the same transaction as the
          // placement, for both branches — a retroactive siting stands on
          // its ground exactly as a fresh build does. Paving over a tree, by
          // contrast, deletes nothing: that is a render-time read of
          // `pathways` (see CampusMap.tsx), which is what lets lifting the
          // path bring the tree back.
          const placement = placementFor(action.row, action.col, fp);
          if (node.status === 'done') {
            if (canSiteRetroactively(s, node)) {
              s.placements[node.id] = placement;
              fellTrees(s.trees, placement);
              s.finance.cash -= RETROACTIVE_SITING_COST;
            }
          } else if (canStartDevelopment(s, node)) {
            s.placements[node.id] = placement;
            fellTrees(s.trees, placement);
            startDevelopment(s, node);
          }
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
          message: `Endowment campaign #${campaign.number} closed: $${campaign.cost.toLocaleString()} committed, $${campaign.endowmentGain.toLocaleString()} raised at a ${Math.round(campaign.match * 100)}% donor match.`,
          kind: 'good',
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

    case 'RESOLVE_ADMISSIONS': {
      // Tuition is set ONLY here, once a year — see README's "Admissions:
      // an annual summer decision" and the removed live SET_TUITION control.
      // This sets the LISTED price. It reaches a student only through the
      // freshman entry of tuitionByClass, below, after the classes advance:
      // the three classes already on the books keep the price they were
      // admitted under (see types.ts's tuitionByClass).
      s.finance.listedTuition = Math.max(0, Math.min(action.tuition, s.finance.tuitionCeiling));
      s.admissions = { scholarshipRate: clamp01(action.scholarshipRate) };

      resolveStudentLifeDigest(s, action.approvedPetitionIds);

      // Word of mouth: the trailing-year AVERAGE satisfaction (accumulated
      // weekly since last summer) scales next year's applicant pool — the
      // design's "current experience -> satisfaction -> next year's
      // applications". Read it, record it as this year's figure, then reset
      // the accumulator for the year now beginning.
      const priorYearAvgSatisfaction = trailingYearSatisfaction(s);
      s.students.priorYearAvgSatisfaction = priorYearAvgSatisfaction;
      s.students.satisfactionYearSum = 0;
      s.students.satisfactionYearWeeks = 0;

      // Advance the classes a year: seniors graduate and leave, everyone
      // else moves up. Full progression, no attrition, in this model.
      //
      // Each class's TUITION moves with it, in the same direction and in
      // the same statement — a price belongs to the class that was quoted
      // it, and the graduating seniors take theirs with them. Written as
      // pairs rather than two separate loops so that a future edit to one
      // line has the other staring at it; the two falling out of step is
      // the whole failure mode this model exists to prevent.
      const classes = s.students.classes;
      const tuition = s.finance.tuitionByClass;
      const graduating = classes.senior;
      classes.senior = classes.junior;        tuition.senior = tuition.junior;
      classes.junior = classes.sophomore;     tuition.junior = tuition.sophomore;
      classes.sophomore = classes.freshman;   tuition.sophomore = tuition.freshman;
      classes.freshman = 0;

      // Run the distribution funnel with the committed policy: it sizes the
      // incoming FRESHMAN class from demand and policy alone — dorm capacity
      // only scales the applicant pool now (see admissionsSystem.ts's
      // module comment), never a ceiling to fill or be capped by.
      const outcome = projectAdmissions(
        s.self.reputation,
        s.finance.listedTuition,
        s.admissions.scholarshipRate,
        s.students.capacity,
        priorYearAvgSatisfaction,
        deriveCohortSignals(s),
      );
      classes.freshman = outcome.enrolled;
      // The incoming class is quoted the price that was just set, and keeps
      // it for four years.
      tuition.freshman = s.finance.listedTuition;
      s.students.applicantPool = outcome.applicants;
      s.students.admitRate = outcome.admitRate;
      s.students.incomingQuality = outcome.avgIncomingQuality;

      // The one annual boundary in the game, so the one place the history
      // record grows (see state/history.ts). Appended AFTER the funnel above,
      // so the row is the class the school actually carries into the next
      // year, and BEFORE advanceClock, so it is filed under the year that just
      // closed. Prestige is NOT drifted here any more — it drifts weekly in
      // the SYSTEMS array (see prestigeSystem.ts's tickPrestige), so this
      // captures reputation as of the last weekly tick; the cycle's
      // freshly-resolved selectivity and quality feed prestige over the
      // following weeks rather than in a jump here.
      s.history.push(captureYearSnapshot(s));

      s.pendingInterrupt = null;
      advanceClock(s); // resolving is what turns the calendar page into the new year
      s.log.unshift({
        year: s.clock.year,
        week: s.clock.week,
        message: `Admissions: tuition $${s.finance.listedTuition.toLocaleString()}/yr, ${Math.round(s.admissions.scholarshipRate * 100)}% scholarships — ${outcome.applicants.toLocaleString()} applicants, ${Math.round(outcome.admitRate * 100)}% admit rate, ${outcome.enrolled.toLocaleString()} freshmen enrolled, ${graduating.toLocaleString()} graduated.`,
        kind: 'info',
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
      const choice = event?.choices.find((c) => c.id === action.choiceId);
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

    // A direct playtest grant (see StatusHeader.tsx's "+$1B" button) —
    // deliberately not an event or interrupt, since it isn't something the
    // simulation ever produces on its own. Logged like every other cash
    // movement so it's visible (and auditable) in the ticker rather than a
    // silent jump in the header figure.
    case 'GRANT_FUNDS': {
      s.finance.cash += action.amount;
      s.log.unshift({
        year: s.clock.year,
        week: s.clock.week,
        message: `Playtest grant: $${action.amount.toLocaleString()} added to operating funds.`,
        kind: 'good',
      });
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
    case 'DEVELOP_ALL_AVAILABLE_COURSES': {
      // Driven by the same plan the button quotes (see techSystem.ts's
      // developAllPlan), so what the player was told it would cost is what
      // it costs. Each start is still re-checked against the live state as
      // the cash and the slots go: the plan decides WHICH, and
      // canStartDevelopment remains the authority on whether.
      for (const id of developAllPlan(s).ids) {
        const node = s.tech.find((t) => t.id === id);
        if (node && canStartDevelopment(s, node)) startDevelopment(s, node);
      }
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
