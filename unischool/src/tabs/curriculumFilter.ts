// The Curriculum tab's filters (Plan 76B): a filter turns the tab into one
// flat cross-school worklist of what matched. Kept apart from the tab so a
// test can read them without React.
import type { Buildable, GameState } from '../state/types';
import type { Grade } from '../data/courseQuality';
import { canStartDevelopment, isUnstaffed } from '../systems/techtree/techSystem';
import { courseQuality, type FacultyLoads } from '../systems/faculty/facultyAssignment';

export type CellState = 'locked' | 'blocked' | 'available' | 'developing' | 'done';

export function cellState(s: GameState, t: Buildable): CellState {
  if (t.status === 'done') return 'done';
  if (t.status === 'developing') return 'developing';
  if (t.status === 'locked') return 'locked';
  return canStartDevelopment(s, t) ? 'available' : 'blocked';
}

export type StatusFilter = 'all' | 'available' | 'developing' | 'done' | 'unstaffed';
// "weak" is Needs attention (a D or an F); "belowA" is anything short of
// the A that lifts prestige.
export type GradeFilter = 'all' | 'weak' | 'belowA';

const GRADES_IN: Record<Exclude<GradeFilter, 'all'>, ReadonlySet<Grade>> = {
  weak: new Set<Grade>(['D', 'F']),
  belowA: new Set<Grade>(['B', 'C', 'D', 'F']),
};

export interface Filters {
  query: string;
  status: StatusFilter;
  grade: GradeFilter;
  // A department (from the strip's "waiting on faculty" item): revealed
  // courses still ahead of the player that need this field.
  field: string | null;
}

export const NO_FILTERS: Filters = { query: '', status: 'all', grade: 'all', field: null };

export function filtersActive(f: Filters): boolean {
  return f.query.trim() !== '' || f.status !== 'all' || f.grade !== 'all' || f.field !== null;
}

export function matchesFilters(s: GameState, t: Buildable, f: Filters, loads: FacultyLoads): boolean {
  const query = f.query.trim().toLowerCase();
  if (query !== '' && !t.name.toLowerCase().includes(query)) return false;

  if (f.field !== null && (t.requiresFaculty !== f.field || t.status !== 'available')) return false;

  if (f.status !== 'all') {
    if (f.status === 'unstaffed') {
      if (!isUnstaffed(s, t)) return false;
    } else if (cellState(s, t) !== f.status) return false;
  }

  if (f.grade !== 'all') {
    const q = courseQuality(s, t, loads);
    // An unstaffed course has no grade but belongs in either worklist.
    if (!q) return isUnstaffed(s, t);
    if (!GRADES_IN[f.grade].has(q.grade)) return false;
  }
  return true;
}
