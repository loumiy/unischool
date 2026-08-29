import type { Faculty, GameState } from '../../state/types';
import { generateCandidate, grownStat, facultySalary, SLOT_GROWTH_INTERVAL_WEEKS, MAX_FACULTY_SLOTS } from '../../data/facultyData';

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

// Counts down every open posting (see POST_JOB in the reducer). When one
// hits zero, exactly one candidate in that field arrives in s.candidates
// and the posting closes — the player can post that field again right
// away for another one, at another fee and another wait. This is the
// job-posting model's whole "cost and/or delay" mechanic: candidates never
// arrive for a field the player hasn't paid to open, and never arrive
// faster than the rolled countdown.
function tickOpenPostings(s: GameState): void {
  for (const field of Object.keys(s.openPostings)) {
    const weeksLeft = s.openPostings[field] - 1;
    if (weeksLeft <= 0) {
      delete s.openPostings[field];
      const existingNames = [...s.faculty, ...s.candidates].map((f) => f.name);
      s.candidates.push(generateCandidate(field, existingNames));
      s.log.unshift({
        year: s.clock.year,
        week: s.clock.week,
        message: `A candidate for the ${field} opening has arrived.`,
        kind: 'good',
      });
    } else {
      s.openPostings[field] = weeksLeft;
    }
  }
}

export function tickFaculty(s: GameState): void {
  tickOpenPostings(s);
  for (const f of s.faculty) growFaculty(f);
}
