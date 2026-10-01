import type { Faculty } from '../state/types';
import { WEEKS_PER_YEAR } from '../state/types';
import { careerWeeks } from '../systems/faculty/facultySystem';
import { FACULTY_FIELD_GROUPS } from '../data/facultyData';
import { quirkById } from '../data/quirkData';
import { gradeFor, type Grade } from '../data/courseQuality';

// The Faculty tab's sort and filter (Plans 72F and 84D). Pure, for the
// test: how people are ordered, which of them show in the grid, and which
// departments show on the board. The choice is kept for the session
// (FacultyTab.tsx), not in the save.

export type FacultySort = 'teaching' | 'research' | 'potential' | 'salary' | 'here' | 'years' | 'name';

export const FACULTY_SORTS: ReadonlyArray<{ id: FacultySort; label: string }> = [
  { id: 'teaching', label: 'Teaching' },
  { id: 'research', label: 'Research' },
  { id: 'potential', label: 'Potential' },
  { id: 'salary', label: 'Salary' },
  { id: 'here', label: 'Years here' },
  { id: 'years', label: 'Years left' },
  { id: 'name', label: 'Name' },
];

// Years until a professor retires (facultySystem.ts's careerWeeks); a
// candidate's whole career, since the clock starts at appointment.
export function yearsLeft(f: Faculty): number {
  return Math.max(0, Math.ceil((careerWeeks(f.id) - f.tenureWeeks) / WEEKS_PER_YEAR));
}

// Retiring within a year: the year's notice has been given (facultySystem.ts's
// tickRetirements). Never a candidate.
export function retiringSoon(f: Faculty): boolean {
  return f.career !== undefined && careerWeeks(f.id) - f.tenureWeeks <= WEEKS_PER_YEAR;
}

// Both potentials together: how good this person can become.
export function potentialOf(f: Faculty): number {
  return f.teachingPotential + f.researchPotential;
}

// A stat as a letter, on the course-grade bands (courseQuality.ts's
// gradeFor: A from 78, B from 62), so a professor reads on the scale their
// courses are graded on.
export function letterOf(value: number): Grade {
  return gradeFor(value);
}

// Strongest, dearest, longest here or longest left first; names A to Z.
// Ties go by name, so the order never shuffles between weeks. Years here
// reads the arrival (Plan 84C); a candidate has not arrived, and sorts last.
export function compareFaculty(sort: FacultySort): (a: Faculty, b: Faculty) => number {
  const byName = (a: Faculty, b: Faculty) => a.name.localeCompare(b.name);
  const arrived = (f: Faculty) => f.career?.arrivedWeek ?? Number.MAX_SAFE_INTEGER;
  switch (sort) {
    case 'teaching': return (a, b) => b.teaching - a.teaching || byName(a, b);
    case 'research': return (a, b) => b.research - a.research || byName(a, b);
    case 'potential': return (a, b) => potentialOf(b) - potentialOf(a) || byName(a, b);
    case 'salary': return (a, b) => b.salary - a.salary || byName(a, b);
    case 'here': return (a, b) => arrived(a) - arrived(b) || byName(a, b);
    case 'years': return (a, b) => yearsLeft(b) - yearsLeft(a) || byName(a, b);
    case 'name': return byName;
  }
}

// ---- The grid's filter (Plan 84D) ----
// `scope` is a field, a division (GROUP_SCOPE and its name), or null for
// all. `canTake` is read by the caller, who knows the college: somebody
// with a free course slot (or a candidate) in a field with a course waiting.
export interface GridFilter {
  scope: string | null;
  retiring: boolean;
  canTake: boolean;
  // Those the Faculty Training Institute could train now (Plan 85E).
  trainable: boolean;
  query: string;
}

export const NO_GRID_FILTER: GridFilter = { scope: null, retiring: false, canTake: false, trainable: false, query: '' };

export const GROUP_SCOPE = 'group:';

export function inScope(scope: string | null, field: string): boolean {
  if (scope === null) return true;
  if (!scope.startsWith(GROUP_SCOPE)) return scope === field;
  const group = FACULTY_FIELD_GROUPS.find((g) => g.name === scope.slice(GROUP_SCOPE.length));
  return group?.fields.includes(field) ?? false;
}

// The search box: every word of the query somewhere in the name, the
// field, the quirk or the nationality.
export function matchesQuery(f: Faculty, query: string): boolean {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const hay = [f.name, f.field, quirkById(f.quirk)?.name ?? '', f.nationality].join(' ').toLowerCase();
  return words.every((w) => hay.includes(w));
}

export function showsPerson(filter: GridFilter, f: Faculty, canTake: boolean, canTrain = false): boolean {
  if (!inScope(filter.scope, f.field)) return false;
  if (filter.retiring && !retiringSoon(f)) return false;
  if (filter.canTake && !canTake) return false;
  if (filter.trainable && !canTrain) return false;
  return matchesQuery(f, filter.query);
}

// ---- The department board's filter (Plan 72F) ----
// Which departments show: all in use, one, or only those short of people
// (short, or over: more courses on offer than the roster can teach).
export interface FacultyFilter { field: string | null; shortOnly: boolean }

export function showsDepartment(filter: FacultyFilter, field: string, state: string): boolean {
  if (filter.field !== null && filter.field !== field) return false;
  if (filter.shortOnly && state !== 'short' && state !== 'over') return false;
  return true;
}
