// The Curriculum tab's filters (Plan 76B): a filter turns the tab into one
// flat cross-school worklist of what matched. Kept apart from the tab so a
// test can read them without React.
import type { Buildable, GameState } from '../state/types';
import type { Grade } from '../data/courseQuality';
import { programById, programOfCourse } from '../data/techData';
import { canStartDevelopment, isUnstaffed } from '../systems/techtree/techSystem';
import { tierBands } from '../systems/techtree/programProgress';
import { instructorQuality, type FacultyLoads } from '../systems/faculty/facultyAssignment';

export type CellState = 'locked' | 'blocked' | 'available' | 'developing' | 'done';

export function cellState(s: GameState, t: Buildable): CellState {
  if (t.status === 'done') return 'done';
  if (t.status === 'developing') return 'developing';
  if (t.status === 'locked') return 'locked';
  return canStartDevelopment(s, t) ? 'available' : 'blocked';
}

export type StatusFilter = 'all' | 'available' | 'developing' | 'done' | 'unstaffed';
// "belowA" is anything short of the A that lifts prestige. Needs attention
// (a D or an F) went in Plan 80B: Below A and No instructor cover it.
export type GradeFilter = 'all' | 'belowA';

const GRADES_IN: Record<Exclude<GradeFilter, 'all'>, ReadonlySet<Grade>> = {
  belowA: new Set<Grade>(['B', 'C', 'D', 'F']),
};

export interface Filters {
  query: string;
  status: StatusFilter;
  grade: GradeFilter;
  // A department (a "field:" target from another tab): revealed courses
  // still ahead of the player that need this field.
  field: string | null;
  // One course from established (Plan 80B): the last course a major needs
  // for its milestone.
  nearEstablished: boolean;
}

export const NO_FILTERS: Filters = { query: '', status: 'all', grade: 'all', field: null, nearEstablished: false };

export function filtersActive(f: Filters): boolean {
  return f.query.trim() !== '' || f.status !== 'all' || f.grade !== 'all' || f.field !== null || f.nearEstablished;
}

// The one course standing between a major and Established (its entry course
// and tier-2 quartet done but this one), whether started or not. Read from
// course status, as programProgress's toMilestone is.
export function oneFromEstablished(s: GameState, t: Buildable, lookup?: Map<string, Buildable>): boolean {
  if (t.status === 'done') return false;
  const programId = programOfCourse(t.id);
  const program = programId !== undefined ? programById(programId) : undefined;
  const bands = program ? tierBands(program) : null;
  if (!bands) return false;
  const needed = [...bands.entry, ...bands.tier2];
  if (!needed.includes(t.id)) return false;
  const find = lookup ? (id: string) => lookup.get(id) : (id: string) => s.tech.find((x) => x.id === id);
  return needed.filter((id) => find(id)?.status !== 'done').length === 1;
}

export function matchesFilters(s: GameState, t: Buildable, f: Filters, loads: FacultyLoads, lookup?: Map<string, Buildable>): boolean {
  const query = f.query.trim().toLowerCase();
  if (query !== '' && !t.name.toLowerCase().includes(query)) return false;

  if (f.field !== null && (t.requiresFaculty !== f.field || t.status !== 'available')) return false;

  if (f.nearEstablished && !oneFromEstablished(s, t, lookup)) return false;

  if (f.status !== 'all') {
    if (f.status === 'unstaffed') {
      if (!isUnstaffed(s, t)) return false;
    } else if (cellState(s, t) !== f.status) return false;
  }

  if (f.grade !== 'all') {
    // The grade its instructor earns, so a weak course in a dark program
    // (no grade while dark) is still caught.
    const q = instructorQuality(s, t, loads);
    // An unstaffed course has no grade but belongs in the worklist.
    if (!q) return isUnstaffed(s, t);
    if (!GRADES_IN[f.grade].has(q.grade)) return false;
  }
  return true;
}
