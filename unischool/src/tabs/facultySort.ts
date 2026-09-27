import type { Faculty } from '../state/types';
import { WEEKS_PER_YEAR } from '../state/types';
import { careerWeeks } from '../systems/faculty/facultySystem';

// The Faculty tab's sort and filter (Plan 72F). Pure, for the test: how the
// people in a department are ordered, and which departments show. The
// choice is kept for the session (FacultyTab.tsx), not in the save.

export type FacultySort = 'teaching' | 'research' | 'salary' | 'years' | 'name';

export const FACULTY_SORTS: ReadonlyArray<{ id: FacultySort; label: string }> = [
  { id: 'teaching', label: 'Teaching' },
  { id: 'research', label: 'Research' },
  { id: 'salary', label: 'Salary' },
  { id: 'years', label: 'Years left' },
  { id: 'name', label: 'Name' },
];

// Years until a professor retires (facultySystem.ts's careerWeeks); a
// candidate's whole career, since the clock starts at appointment.
export function yearsLeft(f: Faculty): number {
  return Math.max(0, Math.ceil((careerWeeks(f.id) - f.tenureWeeks) / WEEKS_PER_YEAR));
}

// Strongest, dearest or longest first; names A to Z. Ties go by name, so
// the order never shuffles between weeks.
export function compareFaculty(sort: FacultySort): (a: Faculty, b: Faculty) => number {
  const byName = (a: Faculty, b: Faculty) => a.name.localeCompare(b.name);
  switch (sort) {
    case 'teaching': return (a, b) => b.teaching - a.teaching || byName(a, b);
    case 'research': return (a, b) => b.research - a.research || byName(a, b);
    case 'salary': return (a, b) => b.salary - a.salary || byName(a, b);
    case 'years': return (a, b) => yearsLeft(b) - yearsLeft(a) || byName(a, b);
    case 'name': return byName;
  }
}

// Which departments show: all in use, one, or only those short of people
// (short, or over: more courses on offer than the roster can teach).
export interface FacultyFilter { field: string | null; shortOnly: boolean }

export function showsDepartment(filter: FacultyFilter, field: string, state: string): boolean {
  if (filter.field !== null && filter.field !== field) return false;
  if (filter.shortOnly && state !== 'short' && state !== 'over') return false;
  return true;
}
