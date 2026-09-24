import type { GameState, SummerBeat, SummerPayload } from '../state/types';
import { LOG_CAP, SUMMER_LAST_BEAT } from '../state/types';
import type { Action } from '../state/actions';
import { defaultAnswer } from './defaultAnswers';
import { createInitialState, createPreStartState } from '../state/actions';
import { tickFinance, endowmentCampaign } from '../systems/finance/financeSystem';
import {
  tickTech,
  canStartDevelopment,
  startDevelopment,
  eligibleInstructors,
  foundProgram,
  relocateProgram,
  swapInstructors,
} from '../systems/techtree/techSystem';
import { postSearch } from '../systems/faculty/facultySearch';
import { endInitiative } from '../systems/research/researchSystem';
import { researchTopic } from '../data/researchTopics';
import { TUITION_SLIDER_MAX } from '../data/foundingData';
import { tickAdmissions } from '../systems/admissions/admissionsSystem';
import { buildReportPayload, tickRivals } from '../systems/rivals/rivalsSystem';
import { tickAmbitions } from '../systems/ambitions/ambitionsSystem';
import { tickFaculty } from '../systems/faculty/facultySystem';
import { tickResearch } from '../systems/research/researchSystem';
import { setPrestigeForPlaytest, tickPrestige } from '../systems/prestige/prestigeSystem';
import { tickSatisfaction } from '../systems/satisfaction/satisfactionSystem';
import { fireMilestoneCelebration, tickEvents } from '../systems/events/eventSystem';
import { tickStudentLife } from '../systems/studentlife/studentLifeSystem';
import { tickAthletics } from '../systems/athletics/athleticsSystem';
import { raiseDemand, shortfallDemandFor, tickDemands } from '../systems/demands/demandSystem';
import { absoluteWeek, findDecisionEvent, offeredChoices } from '../data/eventData';
import { LIBRARY_TIER1_ID, nextLibraryFloor, servedUpkeep, nextVenueExpansion} from '../data/facilitiesData';
import { TREE_SEED_RANGE } from '../data/treeData';
import { advanceOpening, openingHoldsClock, settleOpening, skipOpening } from '../state/opening';
import { TRAINER_FIELD, MASCOT_MAX_LENGTH, applyTeamOrder } from '../data/studentLifeData';
import { isInBounds, isPlaceableKind, pathTileKey, occupantAt } from '../state/campusMap';
import { money } from '../format';
import { random, withRandom } from './random';
import { advanceClock } from '../state/clock';
import { resolveAdmissions } from '../systems/admissions/resolveAdmissions';
import { startInitiative } from '../systems/research/startInitiative';
import { placeBuildable } from '../state/placeBuildable';
import { fireFaculty, hireFaculty } from '../systems/faculty/appointments';

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

    case 'HIRE_FACULTY':
      hireFaculty(s, action);
      return s;

    case 'FIRE_FACULTY':
      fireFaculty(s, action);
      return s;

    case 'START_INITIATIVE':
      startInitiative(s, action);
      return s;

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
    case 'REASSIGN_COURSE_FACULTY': {
      const course = s.tech.find((t) => t.id === action.courseId);
      if (!course || (course.status !== 'developing' && course.status !== 'done')) return s;
      if (!eligibleInstructors(s, course, course.id).some((f) => f.id === action.facultyId)) return s;
      s.courseFaculty[course.id] = action.facultyId;
      return s;
    }

    case 'PLACE_BUILDABLE':
      placeBuildable(s, action);
      return s;

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

    case 'RESOLVE_ADMISSIONS':
      resolveAdmissions(s, action);
      return s;

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

    case 'SAVE_GAME':
      // The manual save's confirmation. The write itself happens in
      // useGame.ts, from the state this returns, so the saved run carries
      // its own "saved" line; a refused write comes back as SAVE_FAILED.
      s.log.unshift({ year: s.clock.year, week: s.clock.week, message: 'Game saved.', kind: 'good' });
      return s;

    case 'SAVE_FAILED': {
      const message = action.manual
        ? 'Save failed — this browser is refusing to store the run.'
        : 'Autosave failed — this browser is refusing to store the run. Progress will be lost on refresh.';
      const confirmation = s.log[0];
      if (action.manual && confirmation?.message === 'Game saved.') {
        confirmation.message = message;
        confirmation.kind = 'bad';
      } else {
        s.log.unshift({ year: s.clock.year, week: s.clock.week, message, kind: 'bad' });
      }
      return s;
    }

    case 'RESET':
      // Abandoning the run returns to the startup screen; useGame.ts
      // erases the save alongside.
      return createPreStartState();

    default:
      return state;
  }
}
