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
      if (s.gameOver) return state;
      for (const system of SYSTEMS) system(s);
      advanceClock(s);
      if (s.log.length > 50) s.log.length = 50; // cap log growth
      return s;
    }

    case 'START_RESEARCH': {
      const node = s.tech.find((t) => t.id === action.nodeId);
      if (node && node.status === 'available') {
        // Cancel any in-progress node back to available.
        if (s.activeResearch) {
          const prev = s.tech.find((t) => t.id === s.activeResearch);
          if (prev && prev.status === 'researching') prev.status = 'available';
        }
        node.status = 'researching';
        s.activeResearch = node.id;
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

    case 'RESET':
      return createInitialState();

    default:
      return state;
  }
}
