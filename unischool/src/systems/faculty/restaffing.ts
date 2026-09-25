import type { Buildable, Faculty, GameState } from '../../state/types';
import { programById, programOfCourse } from '../../data/techData';
import { effectiveCourseSlots, eligibleInstructors, facultyLoad, unstaffedCourses } from '../techtree/techSystem';
import { hireFaculty } from './appointments';

// ---------------------------------------------------------------------
// Restaffing (Plan 59). An unstaffed course darkens its program
// (techtree/darkness.ts), so putting a college back together must be one
// click, not one per course. A plan gives every unstaffed course of a
// school (or of the college) an instructor: someone already on the payroll
// with a free course slot first, else the cheapest listed candidate in the
// field, each hire taking as many of the field's courses as their slots
// hold. The Curriculum tab's "Staff from the market" and a Dean's year-end
// recommendation (eventSystem.ts) both commit a plan through restaff().
//
// The market keeps a candidate listed in every field with an unstaffed
// course (facultySystem.ts's tickCandidatePool), so a plan is short only
// for a course whose field has nobody listed this week.
// ---------------------------------------------------------------------

export interface RestaffStep {
  courseId: string;
  facultyId: string;
  // A candidate the plan appoints first, with their listed salary.
  hire?: { name: string; salary: number };
}

// The school a course belongs to (a graduate program's is its home school).
export function schoolOfCourse(courseId: string): string | undefined {
  const programId = programOfCourse(courseId);
  return programId ? programById(programId)?.school : undefined;
}

export function unstaffedIn(s: GameState, school?: string): Buildable[] {
  return unstaffedCourses(s).filter((t) => school === undefined || schoolOfCourse(t.id) === school);
}

export function restaffPlan(s: GameState, school?: string): RestaffStep[] {
  const steps: RestaffStep[] = [];
  // Slots the plan has already spoken for, by person.
  const taken = new Map<string, number>();
  const room = (f: Faculty, onPayroll: boolean) =>
    (onPayroll ? effectiveCourseSlots(s, f) - facultyLoad(s, f.id) : f.courseSlots) - (taken.get(f.id) ?? 0);
  const hires: Faculty[] = [];

  for (const course of unstaffedIn(s, school)) {
    const field = course.requiresFaculty!;
    // On the payroll: the game's own eligibility, less what this plan took.
    let teacher: Faculty | undefined = eligibleInstructors(s, course).find((f) => room(f, true) > 0);
    let hire = false;
    // A hire this plan already made, with a slot left.
    if (!teacher) teacher = hires.find((f) => f.field === field && room(f, false) > 0);
    // The cheapest listed candidate in the field.
    if (!teacher) {
      teacher = s.candidates
        .filter((c) => c.field === field && !hires.includes(c))
        .sort((a, b) => a.salary - b.salary)[0];
      if (teacher) { hires.push(teacher); hire = true; }
    }
    if (!teacher) continue;
    taken.set(teacher.id, (taken.get(teacher.id) ?? 0) + 1);
    steps.push({ courseId: course.id, facultyId: teacher.id, ...(hire ? { hire: { name: teacher.name, salary: teacher.salary } } : {}) });
  }
  return steps;
}

// Commits a plan: appoints its hires, then assigns every course. Returns
// how many courses were staffed.
export function restaff(s: GameState, school?: string): number {
  let staffed = 0;
  for (const step of restaffPlan(s, school)) {
    if (step.hire) hireFaculty(s, { type: 'HIRE_FACULTY', facultyId: step.facultyId });
    if (!s.faculty.some((f) => f.id === step.facultyId)) continue;
    s.courseFaculty[step.courseId] = step.facultyId;
    staffed += 1;
  }
  if (staffed > 0) {
    s.log.unshift({
      year: s.clock.year, week: s.clock.week,
      message: `${staffed} course${staffed === 1 ? '' : 's'} restaffed${school ? ` in ${school}` : ''}.`,
      kind: 'good',
    });
  }
  return staffed;
}
