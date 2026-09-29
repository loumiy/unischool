// A college teaching its founding pillars, for the suites whose subject is
// not the opening. Since Plan 80D a college opens with nothing to teach —
// no professor, no course, Founders Hall empty — and the walkthrough founds
// its first program. Many suites were written against the college before
// it, which opened teaching English, Mathematics and Economics, two courses
// each, in Founders Hall's first three program slots. This puts a new
// college there directly: the three founding-market professors appointed
// (Bennett f3, Iyer f4, Okafor f2), their programs housed and each one's
// first two courses developed and taught by them. Not a game path; the
// opening itself is test/opening.test.ts's.

import type { GameState } from '../../src/state/types';
import { createInitialState } from '../../src/state/actions';
import { FOUNDING_PROGRAMS, FOUNDING_MARKET } from '../../src/data/foundingData';
import { FOUNDERS_HALL_ID, programById } from '../../src/data/techData';
import { appointFaculty } from '../../src/systems/faculty/facultySystem';
import { refillOffers } from '../../src/systems/techtree/programOffers';
import { repriceCatalogue, unlockAvailable } from '../../src/systems/techtree/techSystem';

// The courses each pillar opened with before Plan 80D.
export const TEACHING_COURSES_PER_PROGRAM = 2;

// The six courses, in program order.
export function teachingCourseIds(): string[] {
  return FOUNDING_PROGRAMS.flatMap((id) => programById(id)!.courseIds.slice(0, TEACHING_COURSES_PER_PROGRAM));
}

// Turns a newly founded college (createInitialState) into one teaching the
// pillars. Mutates and returns it.
export function teachPillars(s: GameState): GameState {
  const teacherOf = new Map<string, string>();
  for (const p of FOUNDING_MARKET) {
    const i = s.candidates.findIndex((c) => c.id === p.id);
    if (i < 0) continue;
    const [person] = s.candidates.splice(i, 1);
    appointFaculty(s, person);
    teacherOf.set(p.field, person.id);
  }
  FOUNDING_PROGRAMS.forEach((programId, slot) => {
    const program = programById(programId)!;
    s.halls[FOUNDERS_HALL_ID][slot] = { programId };
    for (const id of program.courseIds.slice(0, TEACHING_COURSES_PER_PROGRAM)) {
      s.tech.find((t) => t.id === id)!.status = 'done';
      const teacher = teacherOf.get(program.field ?? '');
      if (teacher) s.courseFaculty[id] = teacher;
    }
  });
  s.programOffers = s.programOffers.filter((id) => !FOUNDING_PROGRAMS.includes(id));
  unlockAvailable(s);
  refillOffers(s);
  repriceCatalogue(s);
  for (const t of s.tech) if (t.kind === 'course' && t.status !== 'locked') s.seen.courseIds[t.id] = true;
  return s;
}

// createInitialState, teaching the pillars.
export function teachingCollege(...args: Parameters<typeof createInitialState>): GameState {
  return teachPillars(createInitialState(...args));
}
