import type { GameState } from '../../state/types';
import { programOfCourse } from '../../data/techData';

// A dark program (Plan 59) is not taught this term. Two ways to go dark:
//
//   - in transit between halls (techSystem.ts's RELOCATION_WEEKS): chosen,
//     short, and excluded from every grade, as since Plan 14;
//   - unstaffed: any of its offered courses has no live instructor (a
//     retirement, a dismissal). The whole program stops: no seats, no
//     progress, and every one of its courses counts as a zero in the grade
//     averages, so a college that lets its faculty go craters.
//
// Restaffing is what brings it back, so nothing here blocks a hire, an
// assignment or a move. Each reading is one pass over the courses and the
// payroll: callers that read many courses compute the set once.

// Programs with an offered, fielded course and no live instructor.
export function unstaffedPrograms(s: GameState): Set<string> {
  const staff = new Set(s.faculty.map((f) => f.id));
  const out = new Set<string>();
  for (const t of s.tech) {
    if (t.kind !== 'course' || !t.requiresFaculty) continue;
    if (t.status !== 'developing' && t.status !== 'done') continue;
    const facultyId = s.courseFaculty[t.id];
    if (facultyId && staff.has(facultyId)) continue;
    const programId = programOfCourse(t.id);
    if (programId !== undefined) out.add(programId);
  }
  return out;
}

// Programs in transit between halls.
export function transitPrograms(s: GameState): Set<string> {
  const out = new Set<string>();
  for (const slots of Object.values(s.halls)) {
    for (const slot of slots) if (slot.programId !== null && (slot.transitWeeks ?? 0) > 0) out.add(slot.programId);
  }
  return out;
}

// Every dark program, either way.
export function darkPrograms(s: GameState): Set<string> {
  const out = unstaffedPrograms(s);
  for (const id of transitPrograms(s)) out.add(id);
  return out;
}
