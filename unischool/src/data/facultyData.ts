import type { Faculty } from '../state/types';

// Small name/field pools for generating hireable candidates. Not meant to be
// exhaustive — just enough variety that the candidate pool doesn't repeat
// obviously over a long playthrough.
const FIRST_NAMES = ['Alma', 'John', 'Wei', 'Omar', 'Kenji', 'Priya', 'Elena', 'Marcus', 'Fatima', 'Liam', 'Sofia', 'Daniel'];
const LAST_NAMES = ['Reyes', 'Okafor', 'Zhang', 'Costa', 'Hassan', 'Patel', 'Novak', 'Reid', 'Nasser', 'Byrne', 'Moreau', 'Kim'];
const FIELDS = ['Physics', 'History', 'CompSci', 'Economics', 'Biology', 'Mathematics', 'Sociology', 'Chemistry', 'Psychology', 'English'];

function pick<T>(pool: T[]): T {
  return pool[Math.floor(Math.random() * pool.length)];
}

// One randomly-rolled hireable candidate. Salary scales with skill so
// stronger faculty cost more to run, matching the existing roster's shape.
export function generateCandidate(): Faculty {
  const teaching = 40 + Math.round(Math.random() * 55);
  const research = 40 + Math.round(Math.random() * 55);
  return {
    id: crypto.randomUUID(),
    name: `Dr. ${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
    field: pick(FIELDS),
    teaching,
    research,
    salary: 60_000 + (teaching + research) * 400,
    morale: 70 + Math.round(Math.random() * 20),
  };
}

export function initialCandidates(): Faculty[] {
  return [generateCandidate(), generateCandidate()];
}
