import type { GameState } from '../state/types';
import { WEEKS_PER_YEAR } from '../state/types';
import type { Action } from '../state/actions';
import { createInitialState } from '../state/actions';
import { tickFinance } from '../systems/finance/financeSystem';
import { tickTech, canStartDevelopment, startDevelopment, nextSlotCost, MAX_SLOTS } from '../systems/techtree/techSystem';
import { tickAdmissions, projectAdmissions } from '../systems/admissions/admissionsSystem';
import { tickRivals } from '../systems/rivals/rivalsSystem';
import { tickFaculty } from '../systems/faculty/facultySystem';
import { JOB_POSTING_COST, rollPostingWeeks } from '../data/facultyData';
import { tickPrestigeAnnual } from '../systems/prestige/prestigeSystem';
import { tickSatisfaction } from '../systems/satisfaction/satisfactionSystem';

// The systems run in a fixed order each week. Order matters: research and
// finance resolve before admissions/rivals read the updated world;
// satisfaction resolves before admissions so this week's attrition reads
// this week's freshly recomputed satisfaction, not last week's.
const SYSTEMS: Array<(s: GameState) => void> = [
  tickTech,
  tickFaculty,
  tickFinance,
  tickSatisfaction,
  tickAdmissions,
  tickRivals,
];

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
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
      if (s.log.length > 50) s.log.length = 50; // cap log growth
      return s;
    }

    case 'START_GAME':
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
        s.faculty.push(hired);
      }
      return s;
    }

    case 'FIRE_FACULTY': {
      s.faculty = s.faculty.filter((f) => f.id !== action.facultyId);
      return s;
    }

    case 'POST_JOB': {
      const alreadyOpen = action.field in s.openPostings;
      const canAfford = s.finance.cash >= JOB_POSTING_COST;
      if (!alreadyOpen && canAfford) {
        s.finance.cash -= JOB_POSTING_COST;
        s.openPostings[action.field] = rollPostingWeeks();
        s.log.unshift({
          year: s.clock.year,
          week: s.clock.week,
          message: `Posted an opening for ${action.field} faculty.`,
          kind: 'info',
        });
      }
      return s;
    }

    case 'BUY_SLOT': {
      const cost = nextSlotCost(s.slots);
      if (s.slots < MAX_SLOTS && s.finance.cash >= cost) {
        s.finance.cash -= cost;
        s.slots += 1;
      }
      return s;
    }

    case 'TOGGLE_AUTO_DEVELOP': {
      s.autoDevelop = !s.autoDevelop;
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

      s.pendingInterrupt = null;
      advanceClock(s); // resolving is what turns the calendar page into the new year
      s.log.unshift({
        year: s.clock.year,
        week: s.clock.week,
        message: `Admissions: tuition $${s.finance.tuitionPerStudent.toLocaleString()}/yr, ${Math.round(s.admissions.financialAidRate * 100)}% aid — ${outcome.applicants.toLocaleString()} applicants, ${Math.round(outcome.admitRate * 100)}% admit rate, ${outcome.enrolled} enrolled.`,
        kind: 'info',
      });
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

    case 'RESET':
      // Restart keeps the founded university's identity rather than
      // bouncing back to the startup screen.
      return createInitialState(state.self.name, state.self.schoolType);

    default:
      return state;
  }
}
