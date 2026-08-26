import type { GameState } from '../state/types';
import { WEEKS_PER_YEAR } from '../state/types';
import type { Action } from '../state/actions';
import { createInitialState } from '../state/actions';
import { tickFinance } from '../systems/finance/financeSystem';
import { tickTech, developmentWeeks, nextSlotCost } from '../systems/techtree/techSystem';
import { tickAdmissions } from '../systems/admissions/admissionsSystem';
import { tickRivals } from '../systems/rivals/rivalsSystem';
import { tickFaculty } from '../systems/faculty/facultySystem';

// The systems run in a fixed order each week. Order matters: research and
// finance resolve before admissions/rivals read the updated world.
const SYSTEMS: Array<(s: GameState) => void> = [
  tickFaculty,
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

    case 'START_DEVELOPMENT': {
      const node = s.tech.find((t) => t.id === action.nodeId);
      const slotsUsed = Object.keys(s.developing).length;
      if (node && node.status === 'available' && slotsUsed < s.slots) {
        node.status = 'developing';
        s.developing[node.id] = developmentWeeks(node.tier);
      }
      return s;
    }

    case 'BUY_SLOT': {
      const cost = nextSlotCost(s.slots);
      if (s.finance.cash >= cost) {
        s.finance.cash -= cost;
        s.slots += 1;
        s.log.unshift({
          year: s.clock.year,
          week: s.clock.week,
          message: `Bought a new development slot for $${cost.toLocaleString()}.`,
          kind: 'good',
        });
      }
      return s;
    }

    case 'HIRE_FACULTY': {
      const idx = s.facultyPool.findIndex((f) => f.id === action.facultyId);
      if (idx !== -1 && s.finance.cash >= s.facultyPool[idx].salary) {
        const [hired] = s.facultyPool.splice(idx, 1);
        s.faculty.push(hired);
        s.log.unshift({
          year: s.clock.year,
          week: s.clock.week,
          message: `Hired ${hired.name} (${hired.field}).`,
          kind: 'good',
        });
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
