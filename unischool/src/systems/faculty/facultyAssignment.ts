import type { Buildable, Faculty, GameState } from '../../state/types';
import { assignedInstructor } from '../techtree/techSystem';

// Who teaches what, in both directions. Both read ONE record —
// s.courseFaculty, the instructor the player chose when they started the
// course (see types.ts's CourseFaculty block) — so "what are they
// teaching" (FacultyTab) and "who teaches this" (CurriculumTab) can never
// disagree about the same pairing.
//
// This used to be a deterministic round-robin computed on read: the engine
// tracked only per-field slot capacity, so the pairing was invented fresh
// every render by sorting a field's faculty and its courses by id and
// dealing one against the other. That was enough while the answer was only
// ever a caption under a cell. It is not enough now — a course quality
// grade hangs off who teaches it, and a round-robin re-deals every course
// in a department the moment one more person is hired into it. The
// round-robin survives in exactly one place, and only as history: see
// legacyRoundRobinAssignments below.

// Every offered course this person is currently assigned to, in s.tech
// order. An empty list for someone who has been hired but not yet given
// anything to teach, which is now a real and visible state rather than an
// impossible one.
export function coursesTaughtBy(s: GameState, f: Faculty): Buildable[] {
  return s.tech.filter((t) => s.courseFaculty[t.id] === f.id && (t.status === 'developing' || t.status === 'done'));
}

// The inverse: the faculty member teaching this course, or undefined when
// it is not offered, has no faculty field, or has been left unstaffed by a
// dismissal. Re-exported from techSystem (which owns the resolve, since the
// slot accounting there has to ask the same question) so callers on this
// side of the projection don't need to know that.
export function instructorOf(s: GameState, t: Buildable): Faculty | undefined {
  return assignedInstructor(s, t);
}

// ---------------------------------------------------------------------
// FROZEN. The old round-robin, kept for exactly one caller: the save
// migration that turns a pre-assignment save into an assigned one (see
// persistence.ts's MIGRATIONS[30]).
//
// It is the right seeding rule precisely because it is what the old build
// DREW. A player resuming a save has been looking at these pairings under
// their course cells and on their faculty cards for the whole run;
// materializing them means the game they reopen says exactly what the game
// they closed said, and the feature arrives as "you can now change this"
// rather than as "everyone has been reshuffled".
//
// Do not call this from live code, and do not "improve" it — a better
// pairing rule would silently rewrite resumed saves. It is history, and
// its only job is to reproduce history exactly.
export function legacyRoundRobinAssignments(s: GameState): Record<string, string> {
  const assignments: Record<string, string> = {};
  const fields = new Set(s.tech.map((t) => t.requiresFaculty).filter((f): f is string => !!f));

  for (const field of fields) {
    const faculty = s.faculty.filter((x) => x.field === field).sort((a, b) => a.id.localeCompare(b.id));
    if (faculty.length === 0) continue;
    const courses = s.tech
      .filter((t) => t.requiresFaculty === field && (t.status === 'developing' || t.status === 'done'))
      .sort((a, b) => a.id.localeCompare(b.id));
    courses.forEach((course, i) => {
      assignments[course.id] = faculty[i % faculty.length].id;
    });
  }
  return assignments;
}
