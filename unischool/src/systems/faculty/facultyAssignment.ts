import type { Buildable, Faculty, GameState } from '../../state/types';
import { assignedInstructor } from '../techtree/techSystem';
import { qualityOf, tierOf, type CourseQuality } from '../../data/courseQuality';

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

// ---------------------------------------------------------------------
// COURSE QUALITY, wired to state.
//
// The scale itself, and every number in it, lives in
// data/courseQuality.ts — this only supplies the two facts that scale
// needs from the world: who is teaching the course, and how much else
// they are carrying. It belongs HERE because quality is a property of the
// PAIRING, and the pairing is what this module is.
//
// Both readers resolve the instructor through techSystem's
// assignedInstructor, the single place a courseFaculty id is checked
// against the roster, so "the teacher has left" is never answered one way
// by the grade and another way by the cell.
// ---------------------------------------------------------------------

// EVERY INSTRUCTOR'S CURRENT LOAD, IN ONE PASS.
//
// This exists for a performance reason that is worth stating plainly,
// because the shape it forces is not obvious and re-flattening it would
// quietly cost a run. techSystem's facultyLoad answers "how many courses
// does this person teach" by filtering all of s.tech — fine for the one
// call the reducer makes, fatal in a loop. Grading every course would then
// be 421 courses x 421 filtered rows, twice a week (satisfaction and
// prestige both read the campus mean), which over a forty-year run is
// billions of comparisons and a sim that never finishes.
//
// So anything grading MORE THAN ONE course builds this map first and
// threads it through. One pass over s.tech, then every lookup is O(1).
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

// Is this course graded at all? Only an OFFERED course with a faculty
// field is: an undeveloped course has no teacher and no grade, because an
// empty slot in the catalogue is not a failing course — it is a course
// the university has not opened. Callers get null and render a dash.
export function courseQuality(s: GameState, t: Buildable, loads?: FacultyLoads): CourseQuality | null {
  if (t.status !== 'developing' && t.status !== 'done') return null;
  if (!t.requiresFaculty) return null;

  // An UNSTAFFED course (its instructor was dismissed — see types.ts's
  // CourseFaculty) is also null, not zero. It is not a course being taught
  // badly; it is a course not being taught, which is a different state
  // with a different fix, and averaging it in as an F would quietly
  // punish the player twice for one dismissal.
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

// What one course contributes to an AGGREGATE (a major's grade, a
// school's, the campus mean), which is not the same question as what
// grade its own card shows.
//
//   - Not offered, or fieldless: contributes NOTHING. It is excluded from
//     the average entirely, because a course the university has not opened
//     is an empty slot in the catalogue, not a bad course. Counting it
//     would mean a school's grade fell every time it revealed new
//     coursework it had not got to yet.
//   - Offered but UNSTAFFED: contributes ZERO. This one is the correction
//     that matters. The obvious reading — leave it out, it is not being
//     taught badly, it is not being taught — is right about one orphaned
//     course and badly wrong in aggregate: a school that dismissed its way
//     down to fifteen professors across four hundred courses would average
//     only the handful still staffed and report a comfortable B, hiding
//     the exact catastrophe the grade exists to show. From a student's
//     side a course with no teacher is not a course they are missing out
//     on, it is a course the university is failing to provide, and the
//     aggregate says so.
//
// The per-course card still shows "—" rather than F for the same course
// (see courseQuality's null), because the two are answering different
// questions: the card asks "how good is this course", which has no answer
// without a teacher, while the aggregate asks "how good is the teaching
// this school provides", which very much does.
function aggregateScore(s: GameState, t: Buildable, loads: FacultyLoads): number | null {
  if (t.status !== 'developing' && t.status !== 'done') return null;
  if (!t.requiresFaculty) return null;
  return courseQuality(s, t, loads)?.score ?? 0;
}

// The mean across a set of course ids. null when none of them count at all
// — a school with nothing open yet has no grade, rather than a zero.
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

// Every graded course on campus, as one mean. The figure both the
// satisfaction term and the prestige multiplier read (see those systems
// for how each uses it) — computed once here so the two can never disagree
// about how good the catalogue is.
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
