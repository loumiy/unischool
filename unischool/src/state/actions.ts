import type { GameState } from './types';
import { WEEKS_PER_YEAR } from './types';
import { initialTech } from '../data/techData';
import { initialRivals } from '../data/rivalData';
import { STARTING_SLOTS } from '../systems/techtree/techSystem';

// All the ways a player can change the world. The engine's reducer is the
// only thing that interprets these. UI dispatches them; systems never do.
export type Action =
  | { type: 'TICK' }                                   // advance one week
  | { type: 'START_DEVELOPMENT'; nodeId: string }
  | { type: 'BUY_SLOT' }
  | { type: 'HIRE_FACULTY'; facultyId: string }
  | { type: 'FIRE_FACULTY'; facultyId: string }
  | { type: 'SET_TUITION'; amount: number }
  | { type: 'RESET' };

export function createInitialState(): GameState {
  return {
    clock: { year: 1, week: 1 },
    finance: {
      cash: 500_000,
      endowment: 1_000_000,
      tuitionPerStudent: 8_000,
      weeklyOpEx: 0,
    },
    students: {
      enrolled: 200,
      capacity: 400,
      satisfaction: 70,
      applicantPool: 0,
    },
    faculty: [
      { id: 'f1', name: 'Dr. Alma Reyes', field: 'Physics', teaching: 72, research: 65, salary: 90_000, morale: 80 },
      { id: 'f2', name: 'Dr. John Okafor', field: 'History', teaching: 80, research: 55, salary: 82_000, morale: 78 },
      { id: 'f3', name: 'Dr. Wei Zhang', field: 'CompSci', teaching: 60, research: 88, salary: 105_000, morale: 75 },
    ],
    tech: initialTech(),
    slots: STARTING_SLOTS,
    developing: {},
    milestones: {},
    rivals: initialRivals(),
    self: { name: 'Your University', reputation: 40 },
    log: [
      { year: 1, week: 1, message: 'The university opens its doors.', kind: 'info' },
    ],
    gameOver: false,
  };
}

export { WEEKS_PER_YEAR };
