import type { GameState } from '../state/types';
import { WEEKS_PER_YEAR } from '../state/types';
import type { Action } from '../state/actions';
import { createInitialState } from '../state/actions';
import { tickFinance } from '../systems/finance/financeSystem';
import { tickTech } from '../systems/techtree/techSystem';
import { tickAdmissions } from '../systems/admissions/admissionsSystem';
import { tickRivals } from '../systems/rivals/rivalsSystem';

// The systems run in a fixed order each week. Order matters: research and
// finance resolve before admissions/rivals read the updated world.
const SYSTEMS: Array<(s: GameState) => void> = [
  tickTech,
  tickFinance,
  tickAdmissions,
  tickRivals,
];

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
      if (s.gameOver || s.pendingInterrupt) return state; // the clock halts while an interrupt is pending
      for (const system of SYSTEMS) system(s);
      advanceClock(s);
      if (s.log.length > 50) s.log.length = 50; // cap log growth
      return s;
    }

    case 'START_DEVELOPMENT': {
      const node = s.tech.find((t) => t.id === action.nodeId);
      const slotsUsed = Object.keys(s.developing).length;
      const facultyOk = !node?.requiresFaculty || s.faculty.some((f) => f.field === node.requiresFaculty);
      if (node && node.status === 'available' && slotsUsed < s.slots && facultyOk) {
        node.status = 'developing';
        s.developing[node.id] = node.duration;
        s.finance.cash -= node.cost; // cost is charged up front; see README's pacing model for the (separate) cash-gate task
      }
      return s;
    }

    case 'FIRE_FACULTY': {
      s.faculty = s.faculty.filter((f) => f.id !== action.facultyId);
      return s;
    }

    case 'SET_TUITION': {
      s.finance.tuitionPerStudent = Math.max(0, action.amount);
      return s;
    }

    case 'RESOLVE_INTERRUPT': {
      s.pendingInterrupt = null;
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
      return createInitialState();

    default:
      return state;
  }
}
