import type { GameState, Faculty } from '../../state/types';
import { WEEKS_PER_YEAR } from '../../state/types';
import { generateCandidate } from '../../data/facultyData';

// How many candidates sit in the hiring pool at once, and how often the
// whole pool turns over.
const POOL_MIN_SIZE = 3;
const POOL_MAX_SIZE = 5;
const POOL_REFRESH_WEEKS = 8; // twice a year, given WEEKS_PER_YEAR = 16

function randomPoolSize(): number {
  return POOL_MIN_SIZE + Math.floor(Math.random() * (POOL_MAX_SIZE - POOL_MIN_SIZE + 1));
}

// Shared with createInitialState() so the game starts with a populated pool
// using the same generation logic the periodic refresh uses.
export function generateFacultyPool(): Faculty[] {
  return Array.from({ length: randomPoolSize() }, () => generateCandidate());
}

export function tickFaculty(s: GameState): void {
  const absoluteWeek = (s.clock.year - 1) * WEEKS_PER_YEAR + s.clock.week;
  if (absoluteWeek % POOL_REFRESH_WEEKS !== 0) return;

  s.facultyPool = generateFacultyPool();
  s.log.unshift({
    year: s.clock.year,
    week: s.clock.week,
    message: 'New faculty candidates are available to hire.',
    kind: 'info',
  });
}
