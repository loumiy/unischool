import type { GameState, LogEntry } from '../state/types';
import { WEEKS_PER_YEAR } from '../state/types';
import type { Action } from '../state/actions';
import { createInitialState, createPreStartState } from '../state/actions';
import { tickFinance, endowmentCampaign } from '../systems/finance/financeSystem';
import { tickTech, canStartDevelopment, startDevelopment } from '../systems/techtree/techSystem';
import { tickAdmissions, projectAdmissions } from '../systems/admissions/admissionsSystem';
import { tickRivals } from '../systems/rivals/rivalsSystem';
import { tickFaculty } from '../systems/faculty/facultySystem';
import { tickPrestigeAnnual } from '../systems/prestige/prestigeSystem';
import { tickSatisfaction } from '../systems/satisfaction/satisfactionSystem';
import { tickEvents } from '../systems/events/eventSystem';
import { findDecisionEvent } from '../data/eventData';
import { canPlace, placementFor } from '../state/campusMap';
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
  tickFinance,
  tickSatisfaction,
  tickAdmissions,
  tickRivals,
  // Last, deliberately: the summer admissions decision and the U.S. News
  // report own their weeks, and only one interrupt can be pending at a
  // time. Running the texture system afterwards means it sees their claim
  // and stands down instead of competing for the week — see
  // systems/events/eventSystem.ts.
  tickEvents,
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
      const node = s.tech.find((t) => t.id === action.nodeId);
      if (node && canStartDevelopment(s, node)) startDevelopment(s, node);
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
      // Purely a map-layer action: it writes a coordinate and nothing else.
      // No effects are applied or re-applied here — a building's effects
      // landed when it finished developing, whether or not it is ever
      // placed (see state/campusMap.ts).
      // The footprint comes from the Buildable's kind, not from the
      // action: the player picks an anchor tile, the rules decide how much
      // ground it covers (see campusMap.ts's footprintOf).
      const node = s.tech.find((t) => t.id === action.buildableId);
      if (node && canPlace(s, node, action.row, action.col)) {
        s.placements[node.id] = placementFor(node, action.row, action.col);
      }
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

    case 'RESOLVE_INTERRUPT': {
      s.pendingInterrupt = null;
      return s;
    }

    case 'RESOLVE_ADMISSIONS': {
      // Tuition is set ONLY here, once a year — see README's "Admissions:
      // an annual summer decision" and the removed live SET_TUITION control.
      s.finance.tuitionPerStudent = Math.max(0, Math.min(action.tuition, s.finance.tuitionCeiling));
      s.admissions = { financialAidRate: clamp01(action.financialAidRate) };

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

    // Scaffolding: proves the interrupt pause/resume cycle works end to end.
    // Remove this case (and the action, and its debug button in App.tsx)
    // once a real interrupt — admissions, the report, the tutorial — exists.
    case 'DEBUG_TRIGGER_TEST_INTERRUPT': {
      s.pendingInterrupt = {
        type: 'debug-test',
        payload: { message: 'This is a throwaway interrupt to prove the clock halts and resumes correctly.' },
      };
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
