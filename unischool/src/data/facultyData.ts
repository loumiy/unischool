import type { Faculty } from '../state/types';

// Seed pools for generating varied hiring candidates. Not tied to the
// techData.ts curriculum — these are just plausible academic fields.
const FIRST_NAMES = [
  'Alma', 'John', 'Wei', 'Priya', 'Marcus', 'Elena', 'Kenji', 'Fatima',
  'Liam', 'Sofia', 'Ahmed', 'Grace', 'Diego', 'Yuki', 'Nadia', 'Omar',
];
const LAST_NAMES = [
  'Reyes', 'Okafor', 'Zhang', 'Patel', 'Bennett', 'Volkov', 'Tanaka',
  'Haddad', 'Murphy', 'Costa', 'Hassan', 'Kim', 'Rossi', 'Nakamura', 'Silva',
];
const FIELDS = [
  'Physics', 'History', 'CompSci', 'Biology', 'Economics', 'Mathematics',
  'Philosophy', 'Chemistry', 'Sociology', 'Literature', 'Psychology', 'Art',
];

// Candidate attribute ranges and how they set the salary ask.
const TEACHING_MIN = 40;
const TEACHING_MAX = 95;
const RESEARCH_MIN = 40;
const RESEARCH_MAX = 95;
const MORALE_MIN = 65;
const MORALE_MAX = 90;
const SALARY_BASE = 55_000;         // floor salary ask, regardless of skill
const SALARY_PER_SKILL_POINT = 500; // added per combined teaching+research point

function randomInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function pick<T>(pool: T[]): T {
  return pool[randomInt(0, pool.length - 1)];
}

export function generateCandidate(): Faculty {
  const teaching = randomInt(TEACHING_MIN, TEACHING_MAX);
  const research = randomInt(RESEARCH_MIN, RESEARCH_MAX);
  const salary = SALARY_BASE + (teaching + research) * SALARY_PER_SKILL_POINT;

  return {
    id: `cand-${Math.random().toString(36).slice(2, 10)}`,
    name: `Dr. ${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
    field: pick(FIELDS),
    teaching,
    research,
    salary,
    morale: randomInt(MORALE_MIN, MORALE_MAX),
  };
}
