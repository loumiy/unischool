import { RENOVATION_WEEKS, canRenovate, clampFunding, renovationCost, tickEstate } from '../systems/estate/estate';
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
import { isLand, isPlaceableKind, parsePathTileKey, pathTileKey, occupantAt } from '../state/campusMap';
import { designationRefusal, detectQuads, tileIndex } from '../state/quads';
import { QUAD_NAME_MAX } from '../data/quadData';
import { money } from '../format';
import { random, withRandom } from './random';
import { advanceClock } from '../state/clock';
import { resolveAdmissions } from '../systems/admissions/resolveAdmissions';
import { startInitiative } from '../systems/research/startInitiative';
import { placeBuildable } from '../state/placeBuildable';
import { fireFaculty, hireFaculty } from '../systems/faculty/appointments';
import { tickLadder } from '../systems/ladder/ladderSystem';

// The systems run in a fixed order each week; each placement comment says
// what it must read fresh.
const SYSTEMS: Array<(s: GameState) => void> = [
  tickLadder,
  tickTech,
  tickFaculty,
  // Before tickFinance: output uses this week's grown stats, and a grant
  // lands in the same week's balance.
  tickResearch,
  // Weekly drift toward the computed target (see tickPrestige). After this
  // week's milestones, hires and breakthroughs; before tickFinance, so the
  // prestige dividend reads this week's reputation.
  tickPrestige,
  // Before tickFinance, so a coach's grown salary is in this week's upkeep.
  tickAthletics,
  tickFinance,
  // After tickFinance, which paid the week's share of the upkeep: the rest
  // becomes backlog (systems/estate).
  tickEstate,
  // After tickFinance (petitions are sized in this week's operating cost)
  // and before tickSatisfaction. Raises no interrupt: organisations are
  // answered in a batch at the summer boundary.
  tickStudentLife,
  tickSatisfaction,
  tickAdmissions,
  tickRivals,
  // After tickRivals (rank ambitions read this week's table) and before
  // tickEvents. Writes only s.ambitions and the log.
  tickAmbitions,
  // Near last: the summer decision and the U.S. News report own their weeks
  // and only one interrupt can be pending, so the texture system sees their
  // claim and stands down (see eventSystem.ts).
  tickEvents,
  // Last of all: a demand stands down for every other claimant and waits in
  // s.events.pendingDemand for a quiet week. Its resolution half (target met
  // or deadline passed) runs every week regardless.
  tickDemands,
];

// The four "set this number" playtest actions. Clamped where the game clamps
// the same field elsewhere: a shortcut may skip the work of reaching a state,
// never produce one the simulation could not.
function debugSet(
  s: GameState,
  action: Extract<Action, { type: 'DEBUG_SET_CASH' | 'DEBUG_SET_PRESTIGE' | 'DEBUG_SET_SATISFACTION' | 'DEBUG_SET_TUITION' }>,
): string {
  switch (action.type) {
    case 'DEBUG_SET_CASH':
      s.finance.cash = action.amount;
      return `operating funds set to ${money(action.amount)}`;
    case 'DEBUG_SET_PRESTIGE':
      // prestigeSystem.ts owns and clamps this field (see invariants.test.ts section 5).
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
  // Clone so systems can mutate freely, and bind the clone's random stream
  // for every draw this action makes.
  const s: GameState = structuredClone(state);
  return withRandom(s, () => reduce(state, s, action));
}

function reduce(state: GameState, s: GameState, action: Action): GameState {
  switch (action.type) {
    case 'TICK': {
      // The clock halts while an interrupt is pending or the opening
      // walkthrough holds it (see state/opening.ts).
      if (!s.started || s.pendingInterrupt || openingHoldsClock(s)) return state;
      for (const system of SYSTEMS) system(s);
      // Hold the week if a system just raised an interrupt.
      if (!s.pendingInterrupt) advanceClock(s);
      if (s.log.length > LOG_CAP) s.log.length = LOG_CAP;
      return s;
    }

    case 'START_GAME':
      // Does not save: createInitialState rolls dice, so under StrictMode's
      // double invocation a save from here could persist the discarded run.
      // useGame.ts takes the founding save from the committed state.
      return createInitialState(action.name, action.vernacular, action.colors, action.guided ?? false, action.seed);

    // The opening walkthrough's Next and decline (see state/opening.ts). Steps
    // that end on something done are settled by settleOpening from that action.
    case 'ADVANCE_OPENING': {
      advanceOpening(s);
      return s;
    }
    case 'SKIP_OPENING': {
      skipOpening(s);
      return s;
    }

    case 'START_DEVELOPMENT': {
      // Courses only: placeable Buildables start through PLACE_BUILDABLE,
      // which applies the same gate plus siting. The guard keeps that
      // structural rather than trusting callers.
      //
      // action.facultyId is checked and recorded by the same calls, so a
      // stale or ineligible pick is refused, never swapped. Omitted only by
      // the non-player callers (see actions.ts), where startDevelopment
      // auto-picks.
      const node = s.tech.find((t) => t.id === action.nodeId);
      if (node && !isPlaceableKind(node) && canStartDevelopment(s, node, action.facultyId)) {
        startDevelopment(s, node, action.facultyId);
      }
      return s;
    }

    case 'FOUND_PROGRAM': {
      // Gate and mutation live in foundProgram, so the hall panel can ask
      // the same predicate before offering the button.
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

    // Ending early: the funding is lost, but the team is freed at once.
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

    // Moves an offered course to another instructor: free and immediate; the
    // cost is the slot it takes. The course is passed as `except` so its
    // current instructor still counts as eligible even when full.
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
      if (isLand(action.tile.row, action.tile.col)) s.pathways[pathTileKey(action.tile)] = true;
      return s;
    }

    case 'REMOVE_PATH_TILE': {
      delete s.pathways[pathTileKey(action.tile)];
      return s;
    }

    case 'PAINT_PATH_TILES': {
      for (const tile of action.remove) delete s.pathways[pathTileKey(tile)];
      for (const tile of action.add) if (isLand(tile.row, tile.col)) s.pathways[pathTileKey(tile)] = true;
      return s;
    }

    case 'PLANT_TREE': {
      // Only on open ground (not under a building or a path; see types.ts's Trees).
      const { row, col } = action.tile;
      if (!isLand(row, col)) return s;
      const key = pathTileKey(action.tile);
      if (key in s.pathways || occupantAt(s.placements, row, col) !== undefined) return s;
      if (!(key in s.trees)) s.trees[key] = Math.floor(random() * TREE_SEED_RANGE);
      return s;
    }

    case 'FELL_TREE': {
      delete s.trees[pathTileKey(action.tile)];
      return s;
    }

    case 'SET_MAINTENANCE_FUNDING': {
      s.finance.maintenanceFunding = clampFunding(action.level);
      return s;
    }

    case 'RENOVATE_BUILDING': {
      const node = s.tech.find((t) => t.id === action.id);
      if (!node || !canRenovate(node)) return s;
      const cost = renovationCost(node);
      if (s.finance.cash < cost) return s;
      s.finance.cash -= cost;
      node.renovationWeeks = RENOVATION_WEEKS;
      return s;
    }

    case 'PLACE_DRESSING': {
      // On the land, off the buildings, and on or beside a path.
      const { row, col } = action.tile;
      if (!isLand(row, col) || occupantAt(s.placements, row, col) !== undefined) return s;
      const nearPath = [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]].some(([dr, dc]) => `${row + dr},${col + dc}` in s.pathways);
      if (!nearPath) return s;
      s.dressing = { ...s.dressing, [pathTileKey(action.tile)]: action.kind };
      return s;
    }

    case 'REMOVE_DRESSING': {
      if (s.dressing) delete s.dressing[pathTileKey(action.tile)];
      return s;
    }

    case 'MARK_QUAD': {
      const { row, col } = action.tile;
      if (designationRefusal(s, row, col) !== null) return s;
      // A mark inside a quad already standing would add nothing.
      const at = tileIndex(row, col);
      if (detectQuads(s).some((q) => q.tiles.includes(at))) return s;
      s.quads = { names: s.quads?.names ?? {}, designated: [...(s.quads?.designated ?? []), pathTileKey(action.tile)] };
      return s;
    }

    case 'UNMARK_QUAD': {
      const quad = detectQuads(s).find((q) => q.key === action.key);
      if (!quad || !s.quads) return s;
      const inside = new Set(quad.tiles);
      s.quads.designated = s.quads.designated.filter((key) => {
        const t = parsePathTileKey(key);
        return !t || !inside.has(tileIndex(t.row, t.col));
      });
      return s;
    }

    case 'NAME_QUAD': {
      const name = action.name.trim().slice(0, QUAD_NAME_MAX);
      const names = { ...s.quads?.names };
      if (name === '') delete names[action.key];
      else names[action.key] = name;
      s.quads = { names, designated: s.quads?.designated ?? [] };
      return s;
    }

    case 'LAUNCH_ENDOWMENT_CAMPAIGN': {
      // The repeatable late-game money sink (see endowmentCampaign), charged
      // up front. The same function previews and commits it, so the player
      // gets the numbers they were shown.
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

    // The athletics recruiting budget dial (studentLifeData.ts's
    // ATHLETICS_BUDGET_TIERS): no cost, no gate, no log line; read live next tick.
    case 'SET_ATHLETICS_BUDGET': {
      s.orgs.athleticsBudget = action.tier;
      return s;
    }

    // The priority list. The order is stored; the funded line is derived. A
    // program dragged below the line may lose its head coach (applyTeamOrder).
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

    // Hires a listed coach into one of a team's three staff roles. Every gate
    // (field for the role, slot empty) is checked here, not trusted from the UI.
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

    // A gated tab's gate has opened (see TabNav.tsx's TAB_GATES). Idempotent
    // via the seen bucket, because App.tsx dispatches it from an effect that
    // can run more than once; the log must carry one line.
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

    // A view reports ids the player has now seen (see types.ts's SeenState).
    // Purely additive, so it can only retire a badge, never resurrect one.
    case 'MARK_SEEN': {
      const bucket = action.kind === 'course' ? s.seen.courseIds : s.seen.buildableIds;
      for (const id of action.ids) bucket[id] = true;
      return s;
    }

    // Generic fallback for an interrupt type with no dedicated resolve
    // action. It must advance the clock like every resolve action: interrupts
    // are raised mid-TICK, which skips advanceClock to hold the week, so not
    // advancing would re-run that week's systems.
    case 'RESOLVE_INTERRUPT': {
      s.pendingInterrupt = null;
      advanceClock(s);
      return s;
    }

    // One beat forward through the summer (see types.ts's SummerPayload).
    // Bookkeeping only, kept in the interrupt's payload so a save between
    // beats resumes on the right one; the Admissions beat's decision rides
    // along so the last beat commits it.
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

    // Acknowledges a student demand (see demandSystem.ts). Grants nothing:
    // the answer is building the thing before the deadline, which the demand
    // system detects off the campus. Advances the clock, like every other
    // trailing interrupt.
    case 'RESOLVE_DEMAND': {
      s.pendingInterrupt = null;
      advanceClock(s);
      return s;
    }

    // Dismisses a research prize celebration. Grants nothing: the award
    // landed the week the prize was won. Advances the clock.
    case 'RESOLVE_RESEARCH_REPORT': {
      s.pendingInterrupt = null;
      advanceClock(s);
      return s;
    }

    case 'RESOLVE_CHAMPIONSHIP': {
      s.pendingInterrupt = null;
      advanceClock(s);
      return s;
    }

    // The first sport club's naming beat. An empty name leaves the question
    // for the athletic director's modal.
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
        // Trimmed and capped rather than trusted from the form; an empty
        // mascot is a valid state (see types.ts's University.mascot).
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
        // The offer's week was stamped when it fired (see eventSystem.ts),
        // so declining and never answering cool down the same way.
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

    // The one-time College -> University charter offer. Cosmetic: it swaps
    // the name's suffix. The flag is set either way, so declining is final.
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

    // Dismisses a milestone celebration. Its effects landed in techSystem the
    // week it was awarded. Advances the clock.
    case 'RESOLVE_MILESTONE': {
      s.pendingInterrupt = null;
      advanceClock(s);
      return s;
    }

    // Commits one choice from an authored decision event (see eventData.ts),
    // using the choice's own cost/apply pair so the modal's numbers are what
    // is charged. The cost is charged here, not in apply(), so no event can
    // take the school below zero: an unaffordable choice is refused (every
    // event offers a zero-cost choice). Either way the clock resumes.
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
      advanceClock(s); // a trailing interrupt: that week's systems already ran
      return s;
    }

    // Puts down one of the first year's letters (see fireOpeningLetter). The
    // only thing a letter records is declining the rest. Advances the clock.
    case 'READ_MILESTONE':
      s.ladder.unread = s.ladder.unread.filter((id) => id !== action.id);
      return s;

    case 'RESOLVE_LETTER': {
      if (action.skipAll) s.events.opening.skipped = true;
      s.pendingInterrupt = null;
      advanceClock(s);
      return s;
    }

    // Playtest actions, dispatched only by components/DebugPanel.tsx (see
    // actions.ts's DEBUG_ block). Each is logged, so a number someone typed
    // is distinguishable from one the simulation produced.
    case 'DEBUG_SET_CASH':
    case 'DEBUG_SET_PRESTIGE':
    case 'DEBUG_SET_SATISFACTION':
    case 'DEBUG_SET_TUITION': {
      const what = debugSet(s, action);
      s.log.unshift({ year: s.clock.year, week: s.clock.week, message: `Playtest: ${what}`, kind: 'info' });
      return s;
    }

    // Fast-forward. The loop runs inside the reducer so it can see and
    // auto-answer an interrupt between weeks, using only ordinary primitives,
    // for one render instead of N.
    case 'DEBUG_JUMP': {
      let jumped = s;
      let weeks = 0;
      while (weeks < action.weeks) {
        if (jumped.pendingInterrupt) {
          if (!action.autoResolve) break;
          const answer = defaultAnswer(jumped);
          if (!answer) break;
          jumped = reducer(jumped, answer);
          continue; // resolving an interrupt advances the clock itself
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

    // Fire one authored decision event, bypassing eligibility and cooldowns.
    // The payload is rolled as eventSystem.ts would; an event whose context
    // cannot be rolled against this state is refused.
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

    // Raise a demand for one named shortfall now, past its threshold and
    // cooldown, through the demand system's own raiseDemand.
    case 'DEBUG_FORCE_DEMAND': {
      if (s.pendingInterrupt || s.events.activeDemand) return state;
      const demand = shortfallDemandFor(s, action.subject);
      if (!demand) return state;
      raiseDemand(s, demand);
      return s;
    }

    // Celebrate whatever milestone is queued now; an empty queue does nothing.
    case 'DEBUG_FORCE_MILESTONE': {
      if (s.pendingInterrupt) return state;
      s.events.lastMilestoneWeek = 0; // stand the frequency floor down for this one
      return fireMilestoneCelebration(s) ? s : state;
    }

    // Publish the U.S. News report now as its own modal, off this week's standings.
    case 'DEBUG_FORCE_REPORT': {
      if (s.pendingInterrupt) return state;
      s.pendingInterrupt = { type: 'annual-report', payload: buildReportPayload(s) };
      return s;
    }

    case 'POST_SEARCH': {
      postSearch(s, action.field);
      return s;
    }

    case 'SWAP_COURSE_FACULTY': {
      swapInstructors(s, action.courseA, action.courseB);
      return s;
    }

    // Renovates the tier-1 library in place (see nextLibraryFloor): the same
    // node goes back to 'developing' at its placed spot, with its effects
    // raised at the start. renovatingFrom records what it served before, and
    // the satisfaction sums read that while developing (see types.ts's
    // servingPopulation), so existing floors keep working during the work.
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

    // Expands a venue in place, on the library's renovation pattern; the gate
    // reads seats off its expansions count (facilitiesData.ts's venueSeatsOf).
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
      // The write happens in useGame.ts from this state, so the save carries
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
      // Returns to the startup screen; useGame.ts erases the save.
      return createPreStartState();

    default:
      return state;
  }
}
