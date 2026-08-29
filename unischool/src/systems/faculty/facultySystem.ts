import type { Faculty, GameState } from '../../state/types';
import { generateCandidate, grownStat, facultySalary, SLOT_GROWTH_INTERVAL_WEEKS, MAX_FACULTY_SLOTS } from '../../data/facultyData';

// Keeps the hireable candidate pool topped up so HIRE_FACULTY always has
// someone to appoint, without it growing without bound. This — together
// with money (salaries rise with skill and tenure; see facultyData.ts) —
// is the scarcity that forces specialization: even with the pool full, a
// player can only ever be offered so many candidates so fast, and can only
// afford to retain so many as they mature into stars, so staffing every
// school at top quality at once isn't an option.
const MAX_CANDIDATES = 4;
const REPLENISH_CHANCE_PER_WEEK = 0.15;

// Applies one week of tenure to a retained faculty member: teaching and
// research each grow toward their own rolled potential, and salary is
// recomputed from the new current stats plus the separate, slower
// seniority-premium curve (see facultyData.ts's grownStat/facultySalary).
// Candidates sitting in the hiring pool do NOT grow — only being on the
// roster ("retained") counts toward tenure.
function growFaculty(f: Faculty): void {
  f.tenureWeeks += 1;
  f.teaching = grownStat(f.teachingPotential, f.tenureWeeks);
  f.research = grownStat(f.researchPotential, f.tenureWeeks);
  f.salary = facultySalary(f.teaching, f.research, f.tenureWeeks);
  // Course slots grow in flat +1 steps on tenure milestones rather than a
  // smooth curve (there's no per-hire ceiling to approach, unlike teaching/
  // research) — a further, concrete reason to retain a hire long-term on
  // top of their rising stats.
  if (f.tenureWeeks % SLOT_GROWTH_INTERVAL_WEEKS === 0 && f.courseSlots < MAX_FACULTY_SLOTS) {
    f.courseSlots += 1;
  }
}

export function tickFaculty(s: GameState): void {
  if (s.candidates.length < MAX_CANDIDATES && Math.random() < REPLENISH_CHANCE_PER_WEEK) {
    const existingNames = [...s.faculty, ...s.candidates].map((f) => f.name);
    s.candidates.push(generateCandidate(existingNames));
  }

  for (const f of s.faculty) growFaculty(f);
}
