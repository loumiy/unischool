import type { Buildable, Faculty, GameState } from '../../state/types';

// Course-to-teacher assignment is a display-only projection: the engine
// only tracks course-slot CAPACITY per field (courseSlots), never which
// specific hire teaches which specific course. Deterministically round-
// robins a field's currently-offered (developing/done) requiresFaculty-
// gated courses across that field's faculty, sorted by id, so "what are
// they teaching" (FacultyTab) and "who teaches this" (CurriculumTab) both
// read a stable, real-looking answer rather than nothing — without
// inventing new persisted state for it.
//
// Both directions of the projection (faculty -> their courses, course ->
// its instructor) share this one sorted pairing so they can never
// disagree with each other about who teaches what.
function fieldTeachingRoster(s: GameState, field: string): { faculty: Faculty[]; courses: Buildable[] } {
  const faculty = s.faculty.filter((x) => x.field === field).sort((a, b) => a.id.localeCompare(b.id));
  const courses = s.tech
    .filter((t) => t.requiresFaculty === field && (t.status === 'developing' || t.status === 'done'))
    .sort((a, b) => a.id.localeCompare(b.id));
  return { faculty, courses };
}

export function coursesTaughtBy(s: GameState, f: Faculty): Buildable[] {
  const { faculty, courses } = fieldTeachingRoster(s, f.field);
  const idx = faculty.findIndex((x) => x.id === f.id);
  if (idx === -1 || faculty.length === 0) return [];
  return courses.filter((_, i) => i % faculty.length === idx);
}

// The inverse projection: which faculty member a given course's round-robin
// slot lands on. undefined for a course with no requiresFaculty field (no
// gate, no assignment) or with no faculty in that field yet.
export function instructorOf(s: GameState, t: Buildable): Faculty | undefined {
  if (!t.requiresFaculty) return undefined;
  const { faculty, courses } = fieldTeachingRoster(s, t.requiresFaculty);
  if (faculty.length === 0) return undefined;
  const courseIdx = courses.findIndex((c) => c.id === t.id);
  if (courseIdx === -1) return undefined;
  return faculty[courseIdx % faculty.length];
}
