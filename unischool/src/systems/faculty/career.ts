import type { Career, Faculty, GameState, Initiative } from '../../state/types';
import { WEEKS_PER_YEAR } from '../../state/types';

// ---------------------------------------------------------------------
// The career record (Plan 84C): what a professor has done at the college,
// kept on the professor (types.ts's Career) for the Faculty tab. Written
// here and nowhere else; nothing in the simulation reads it, and nothing
// here draws on the random stream, so keeping it moves no figure.
//
// Kept for the current roster only: a professor who leaves takes theirs
// with them (the chronicle and the research record keep what the college
// remembers).
// ---------------------------------------------------------------------

// The clock as one number, as eventData.ts's absoluteWeek (not imported:
// eventData imports the faculty system).
function weekOf(s: GameState): number {
  return (s.clock.year - 1) * WEEKS_PER_YEAR + s.clock.week;
}

export function emptyCareer(arrivedWeek: number): Career {
  return { arrivedWeek, courses: [], research: [], prizes: [], years: [] };
}

// On appointment (facultySystem.ts's appointFaculty): the record starts the
// week they join. A founding professor's earlier years (their tenure) were
// elsewhere.
export function startCareer(s: GameState, f: Faculty): void {
  f.career = emptyCareer(weekOf(s));
}

// The courses each professor teaches this week, by id: a course counts
// once it is taught ('done'); one still being developed does not yet.
function taughtBy(s: GameState): Map<string, string[]> {
  const done = new Set(s.tech.filter((t) => t.kind === 'course' && t.status === 'done').map((t) => t.id));
  const out = new Map<string, string[]>();
  for (const [courseId, facultyId] of Object.entries(s.courseFaculty)) {
    if (!done.has(courseId)) continue;
    const list = out.get(facultyId);
    if (list) list.push(courseId);
    else out.set(facultyId, [courseId]);
  }
  return out;
}

// Once a week, after the roster's week (facultySystem.ts's tickFaculty):
// every course a professor teaches extends its span if the span ran to
// last week (or already reaches this one, when a held week is run again),
// and opens a new one otherwise. A course that moved or ended is simply
// not extended, which closes its span at the last week it was taught.
export function recordCourses(s: GameState): void {
  const week = weekOf(s);
  const taught = taughtBy(s);
  for (const f of s.faculty) {
    const courses = taught.get(f.id);
    if (!courses || !f.career) continue;
    for (const courseId of courses) {
      let open = null;
      for (let i = f.career.courses.length - 1; i >= 0; i -= 1) {
        if (f.career.courses[i].courseId === courseId) { open = f.career.courses[i]; break; }
      }
      if (open && open.to >= week - 1) open.to = Math.max(open.to, week);
      else f.career.courses.push({ courseId, from: week, to: week });
    }
  }
}

// At the last week of each year: teaching and research, rounded, as the
// year's mark. A held week run again replaces the mark rather than adding.
export function recordYear(s: GameState): void {
  if (s.clock.week !== WEEKS_PER_YEAR) return;
  for (const f of s.faculty) {
    if (!f.career) continue;
    const years = f.career.years;
    if (years.length > 0 && years[years.length - 1][0] === s.clock.year) years.pop();
    years.push([s.clock.year, Math.round(f.teaching), Math.round(f.research)]);
  }
}

// When a project ends, concluded or not (researchSystem.ts's
// concludeInitiative): a line on each participant's record, and the prize
// on the winner's.
export function recordProject(
  s: GameState,
  initiative: Initiative,
  participants: readonly Faculty[],
  cancelled: boolean,
  prize: { facultyId: string; prizeName: string } | null,
): void {
  const weeksRun = cancelled ? initiative.weeksTotal - Math.max(0, initiative.weeksRemaining) : initiative.weeksTotal;
  for (const f of participants) {
    if (!f.career) continue;
    f.career.research.push({
      topicId: initiative.topicId,
      depth: initiative.depth,
      year: s.clock.year,
      years: Math.round((weeksRun / WEEKS_PER_YEAR) * 10) / 10,
      publications: initiative.publications,
      breakthroughs: initiative.breakthroughs,
      ...(cancelled ? { cancelled: true as const } : {}),
    });
    if (prize && prize.facultyId === f.id) {
      f.career.prizes.push({ name: prize.prizeName, year: s.clock.year, topicId: initiative.topicId });
    }
  }
}
