import type { Buildable, Faculty, GameState } from '../../state/types';
import { assignedInstructor } from '../techtree/techSystem';
import { qualityOf, tierOf, type CourseQuality } from '../../data/courseQuality';
import { programOfCourse } from '../../data/techData';
import { isInTransit } from '../techtree/programOffers';

// Who teaches what, in both directions, read from one record: s.courseFaculty,
// the instructor chosen when the course was started (types.ts's CourseFaculty).

// Every offered course this person is assigned to, in s.tech order. Empty
// for a hire with nothing to teach yet.
export function coursesTaughtBy(s: GameState, f: Faculty): Buildable[] {
  return s.tech.filter((t) => s.courseFaculty[t.id] === f.id && (t.status === 'developing' || t.status === 'done'));
}

// Course quality, wired to state. The scale lives in data/courseQuality.ts;
// this supplies who teaches the course and their load. The instructor is
// always resolved through techSystem's assignedInstructor, so the grade and
// the cell agree on whether the teacher has left.

// Every instructor's current load in one pass. Anything grading more than one
// course must build this and thread it through: techSystem's facultyLoad
// filters all of s.tech per call, and grading every course that way twice a
// week makes a long run effectively never finish.
export type FacultyLoads = ReadonlyMap<string, number>;

export function facultyLoads(s: GameState): FacultyLoads {
  const loads = new Map<string, number>();
  for (const t of s.tech) {
    if (t.status !== 'developing' && t.status !== 'done') continue;
    const facultyId = s.courseFaculty[t.id];
    if (!facultyId) continue;
    loads.set(facultyId, (loads.get(facultyId) ?? 0) + 1);
  }
  return loads;
}

// Only an offered course with a faculty field is graded; null renders as a dash.
export function courseQuality(s: GameState, t: Buildable, loads?: FacultyLoads): CourseQuality | null {
  if (t.status !== 'developing' && t.status !== 'done') return null;
  if (!t.requiresFaculty) return null;
  // A program in transit between halls is not taught this term: no grade,
  // and no contribution to averages (see aggregateScore).
  if (inTransit(s, t)) return null;

  // An unstaffed course (instructor dismissed) is null too: not taught,
  // rather than taught badly.
  const instructor = assignedInstructor(s, t);
  if (!instructor) return null;

  return qualityOf({
    teaching: instructor.teaching,
    acclaim: instructor.acclaim,
    load: (loads ?? facultyLoads(s)).get(instructor.id) ?? 0,
    slots: instructor.courseSlots,
    tier: tierOf(t.id),
  });
}

// What a course would be graded with this person teaching it (the picker's
// chips and the swap preview). The load is theirs plus this course, unless
// they already teach it.
export function projectedQuality(s: GameState, t: Buildable, f: Faculty, loads?: FacultyLoads): CourseQuality {
  const load = (loads ?? facultyLoads(s)).get(f.id) ?? 0;
  return qualityOf({
    teaching: f.teaching,
    acclaim: f.acclaim,
    load: s.courseFaculty[t.id] === f.id ? load : load + 1,
    slots: f.courseSlots,
    tier: tierOf(t.id),
  });
}

// What one course contributes to an aggregate (a major, a school, the campus):
//   - Not offered, fieldless, or in transit: nothing (excluded), so revealing
//     new coursework never lowers a grade.
//   - Offered but unstaffed: zero. Leaving it out would let a school that
//     dismissed most of its faculty report a comfortable grade from the few
//     staffed courses. (The course's own card still shows "—": it answers a
//     different question.)
function aggregateScore(s: GameState, t: Buildable, loads: FacultyLoads): number | null {
  if (t.status !== 'developing' && t.status !== 'done') return null;
  if (!t.requiresFaculty) return null;
  if (inTransit(s, t)) return null;
  return courseQuality(s, t, loads)?.score ?? 0;
}

function inTransit(s: GameState, t: Buildable): boolean {
  const programId = programOfCourse(t.id);
  return programId !== undefined && isInTransit(s, programId);
}

// The mean across a set of course ids; null when none of them count.
export function averageCourseQuality(s: GameState, ids: string[], loads?: FacultyLoads): number | null {
  const byId = new Map(s.tech.map((t) => [t.id, t]));
  const load = loads ?? facultyLoads(s);
  let sum = 0;
  let n = 0;
  for (const id of ids) {
    const t = byId.get(id);
    if (!t) continue;
    const score = aggregateScore(s, t, load);
    if (score === null) continue;
    sum += score;
    n += 1;
  }
  return n === 0 ? null : sum / n;
}

// Every graded course on campus as one mean, read by both satisfaction and
// prestige so they agree.
export function campusAverageCourseQuality(s: GameState): number | null {
  const loads = facultyLoads(s);
  let sum = 0;
  let n = 0;
  for (const t of s.tech) {
    const score = aggregateScore(s, t, loads);
    if (score === null) continue;
    sum += score;
    n += 1;
  }
  return n === 0 ? null : sum / n;
}
