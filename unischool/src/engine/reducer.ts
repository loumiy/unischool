import type { GameState, LogEntry } from '../state/types';
import { WEEKS_PER_YEAR } from '../state/types';
import type { Action } from '../state/actions';
import { createInitialState, createPreStartState } from '../state/actions';
import { tickFinance, endowmentCampaign } from '../systems/finance/financeSystem';
import { tickTech, canStartDevelopment, startDevelopment } from '../systems/techtree/techSystem';
import { tickAdmissions, projectAdmissions } from '../systems/admissions/admissionsSystem';
import { tickRivals } from '../systems/rivals/rivalsSystem';
import { tickFaculty } from '../systems/faculty/facultySystem';
import { tickResearch } from '../systems/research/researchSystem';
import { tickPrestigeAnnual } from '../systems/prestige/prestigeSystem';
import { tickSatisfaction } from '../systems/satisfaction/satisfactionSystem';
import { tickEvents } from '../systems/events/eventSystem';
import { tickStudentLife } from '../systems/studentlife/studentLifeSystem';
import { tickDemands } from '../systems/demands/demandSystem';
import { findDecisionEvent } from '../data/eventData';
import {
  CHAPTER_APPROVAL_SATISFACTION_NUDGE, CHAPTER_DECLINE_SATISFACTION_HIT,
  CLUB_APPROVAL_SATISFACTION_NUDGE, CLUB_DECLINE_SATISFACTION_HIT, activatePetition,
} from '../data/studentLifeData';
import {
  canPlace, canSiteRetroactively, edgeKey, footprintOf, isEdgeInBounds, isPlaceableKind,
  orientedFootprint, placementFor, RETROACTIVE_SITING_COST,
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
      if (!s.started || s.gameOver || s.pendingInterrupt) return state; // the clock halts while an interrupt is pending
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
      const node = s.tech.find((t) => t.id === action.nodeId);
      if (node && !isPlaceableKind(node) && canStartDevelopment(s, node)) startDevelopment(s, node);
      return s;
    }

    case 'HIRE_FACULTY': {
      const idx = s.candidates.findIndex((c) => c.id === action.facultyId);
      if (idx !== -1) {
        const [hired] = s.candidates.splice(idx, 1);
        // weeksListed is the pool's clock, tenureWeeks is the roster's:
        // clearing it here is what moves them from one to the other, so a
        // hire never carries a stale listing age (and can never be aged
        // out of a job they already hold).
        hired.weeksListed = 0;
        s.faculty.push(hired);
      }
      return s;
    }

    case 'FIRE_FACULTY': {
      s.faculty = s.faculty.filter((f) => f.id !== action.facultyId);
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
          if (node.status === 'done') {
            if (canSiteRetroactively(s, node)) {
              s.placements[node.id] = placementFor(action.row, action.col, fp);
              s.finance.cash -= RETROACTIVE_SITING_COST;
            }
          } else if (canStartDevelopment(s, node)) {
            s.placements[node.id] = placementFor(action.row, action.col, fp);
            startDevelopment(s, node);
          }
        }
      }
      return s;
    }

    case 'ADD_PATH_EDGE': {
      if (isEdgeInBounds(action.edge)) s.pathways[edgeKey(action.edge)] = true;
      return s;
    }

    case 'REMOVE_PATH_EDGE': {
      delete s.pathways[edgeKey(action.edge)];
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

    // The one athletics-wide funding lever (see data/studentLifeData.ts's
    // ATHLETICS_INVESTMENT_TIERS). No cost, no gate, no log line — this is
    // a standing dial, not a decision, and reads live everywhere it matters
    // (financeSystem's studentLifeUpkeep line, satisfactionSystem's social
    // attribute) the very next tick.
    case 'SET_ATHLETICS_INVESTMENT': {
      s.orgs.athleticsInvestment = action.tier;
      return s;
    }

    case 'RESOLVE_INTERRUPT': {
      s.pendingInterrupt = null;
      return s;
    }

    case 'RESOLVE_ADMISSIONS': {
      // Tuition is set ONLY here, once a year — see README's "Admissions:
      // an annual summer decision" and the removed live SET_TUITION control.
      s.finance.tuitionPerStudent = Math.max(0, Math.min(action.tuition, s.finance.tuitionCeiling));
      s.admissions = { financialAidRate: clamp01(action.financialAidRate) };

      resolveStudentLifeDigest(s, action.approvedPetitionIds);

      // Run the distribution funnel with the committed policy: this sets the
      // year's enrolled class and applicant pool. The same pure function the
      // UI used to preview these outcomes (see admissionsSystem.ts) is what
      // commits them, so what the player saw is exactly what they get.
      const outcome = projectAdmissions(
        s.self.reputation,
        s.finance.tuitionPerStudent,
        s.admissions.financialAidRate,
        s.students.capacity,
        // Word of mouth: this year's student satisfaction scales next
        // year's applicant pool (see admissionsSystem.ts).
        s.students.satisfaction,
      );
      s.students.enrolled = outcome.enrolled;
      s.students.applicantPool = outcome.applicants;
      s.students.admitRate = outcome.admitRate;
      s.students.incomingQuality = outcome.avgIncomingQuality;

      // Prestige is a slow-moving stock (see prestigeSystem.ts): this is
      // the one annual boundary where it drifts toward a target computed
      // from curriculum breadth, the selectivity/quality just resolved
      // above, and (later) faculty quality.
      tickPrestigeAnnual(s);

      // The one annual boundary in the game, so the one place the history
      // record grows (see state/history.ts). Appended AFTER the funnel and
      // the prestige drift above, so the row is the state the school
      // actually carries into the next year, and BEFORE advanceClock, so
      // it is filed under the year that just closed.
      s.history.push(captureYearSnapshot(s));

      s.pendingInterrupt = null;
      advanceClock(s); // resolving is what turns the calendar page into the new year
      s.log.unshift({
        year: s.clock.year,
        week: s.clock.week,
        message: `Admissions: tuition $${s.finance.tuitionPerStudent.toLocaleString()}/yr, ${Math.round(s.admissions.financialAidRate * 100)}% aid — ${outcome.applicants.toLocaleString()} applicants, ${Math.round(outcome.admitRate * 100)}% admit rate, ${outcome.enrolled} enrolled.`,
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
    case 'RESOLVE_PRIZE': {
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
