import type { GameState } from '../../state/types';
import { generateCandidate } from '../../data/facultyData';

// Keeps the hireable candidate pool topped up so HIRE_FACULTY always has
// someone to appoint, without it growing without bound.
const MAX_CANDIDATES = 4;
const REPLENISH_CHANCE_PER_WEEK = 0.15;

export function tickFaculty(s: GameState): void {
  if (s.candidates.length < MAX_CANDIDATES && Math.random() < REPLENISH_CHANCE_PER_WEEK) {
    s.candidates.push(generateCandidate());
  }
}
