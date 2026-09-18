import type { Buildable, Faculty, GameState } from '../../state/types';
import { WEEKS_PER_YEAR } from '../../state/types';
import { CANDIDATE_LISTING_WEEKS } from '../../data/facultyData';
import { programById } from '../../data/techData';
import type { Grade } from '../../data/courseQuality';
import { facultyPay, financeBreakdown } from '../finance/financeSystem';
import { canPostSearch, searchCost, searchWeeksLeft } from './facultySearch';
import { neededFacultyFields, unstaffedCourses } from '../techtree/techSystem';
import { projectedQuality } from './facultyAssignment';
import type { FieldCapacity } from './facultyCapacity';

// ---------------------------------------------------------------------
// WHAT TO DO ABOUT HIRING, this week. The Faculty board is twenty-nine
// rows of capacity, which answers "how big is each department" and not
// "what should I do" — and the interesting scarcity in hiring is TEMPORAL:
// a thin-field listing is a window of a few weeks, and the board showed
// it as a card inside a row inside a division. These readings turn the
// market back into what the churn model was built to be, a stream of
// events with a deadline and a price, and give each department the one
// action its state calls for. Every figure comes off functions the rest
// of the game already runs on (neededFacultyFields, facultyGate's
// halves, projectedQuality, facultyPay, searchCost); nothing here is new
// state.
// ---------------------------------------------------------------------

// The courses a department is holding up: every revealed, unstarted
// course that asks for the field, plus the entry course of a program on
// offer in it (still locked, but the founding is what the player is
// being asked to make — the same rule neededFacultyFields applies).
export function waitingCourses(s: GameState, field: string): Buildable[] {
  const offeredEntryIds = new Set(s.programOffers.map((id) => programById(id)?.entryCourseId));
  return s.tech.filter((t) => t.kind === 'course' && t.requiresFaculty === field
    && (t.status === 'available' || offeredEntryIds.has(t.id)));
}

export interface Listing {
  candidate: Faculty;
  field: string;
  weeksLeft: number;
  // The first course waiting on the field, and the grade this person
  // would earn on it — the two facts that decide an appointment.
  course: Buildable | undefined;
  grade: Grade | null;
  // Salary at this school's market rate, a year.
  pay: number;
  // The waiting courses their slots would open, by code — what the
  // appointment is WORTH, the way a course start is worth "+80 seats".
  unblocks: string[];
}

function listingFor(s: GameState, candidate: Faculty, waiting: Buildable[]): Listing {
  const course = waiting[0];
  return {
    candidate,
    field: candidate.field,
    weeksLeft: Math.max(0, CANDIDATE_LISTING_WEEKS - candidate.weeksListed),
    course,
    grade: course ? projectedQuality(s, course, candidate).grade : null,
    pay: facultyPay(s, candidate.salary),
    unblocks: waiting.slice(0, candidate.courseSlots).map((t) => t.name.split(' · ')[0]),
  };
}

// Listings in a department that is short: the appointments worth making
// this week, soonest to withdraw first, strongest teacher next.
export function worthTaking(s: GameState): Listing[] {
  const needed = neededFacultyFields(s);
  const out: Listing[] = [];
  for (const field of needed) {
    const waiting = waitingCourses(s, field);
    for (const c of s.candidates) {
      if (c.field === field) out.push(listingFor(s, c, waiting));
    }
  }
  return out.sort((a, b) => a.weeksLeft - b.weeksLeft || b.candidate.teaching - a.candidate.teaching);
}

// One department's listing, for its row: the strongest listed teacher in
// the field, read the same way.
export function bestListing(s: GameState, field: string): Listing | undefined {
  const listed = s.candidates.filter((c) => c.field === field).sort((a, b) => b.teaching - a.teaching);
  if (listed.length === 0) return undefined;
  return listingFor(s, listed[0], waitingCourses(s, field));
}

// THE ONE THING TO DO about a department, chosen by its state — the
// row's action, the way a program row leads with its next start.
export type DeptAction =
  | { kind: 'appoint'; listing: Listing }
  | { kind: 'search'; cost: number; canPost: boolean }
  | { kind: 'searching'; weeksLeft: number }
  | { kind: 'reassign'; unstaffed: number }
  | { kind: 'none' };

export function deptAction(s: GameState, c: FieldCapacity): DeptAction {
  if (c.state === 'over') {
    const unstaffed = unstaffedCourses(s).filter((t) => t.requiresFaculty === c.field).length;
    if (unstaffed > 0) return { kind: 'reassign', unstaffed };
  }
  if (c.state === 'short' || c.state === 'over') {
    const listing = bestListing(s, c.field);
    if (listing) return { kind: 'appoint', listing };
    const running = searchWeeksLeft(s, c.field);
    if (running > 0) return { kind: 'searching', weeksLeft: running };
    return { kind: 'search', cost: searchCost(s), canPost: canPostSearch(s, c.field) };
  }
  return { kind: 'none' };
}

// Departments short with nobody listed — where only a search or time
// helps — and whether one is running.
export function searchable(s: GameState, fields: FieldCapacity[]): Array<{ field: string; waiting: number; running: number }> {
  return fields
    .filter((c) => (c.state === 'short' || c.state === 'over') && c.listed === 0)
    .map((c) => ({ field: c.field, waiting: waitingCourses(s, c.field).length, running: searchWeeksLeft(s, c.field) }))
    .sort((a, b) => b.waiting - a.waiting);
}

// Payroll as a share of the week, and what the listings above would add.
export interface Payroll {
  weekly: number;      // salaries a week, at market rate
  share: number;       // of total weekly expenses, 0..1
  wouldAdd: number;    // a week, if every listing worth taking were appointed
}

export function payroll(s: GameState, listings: Listing[]): Payroll {
  const fb = financeBreakdown(s);
  const wouldAdd = listings.reduce((sum, l) => sum + l.pay, 0) / WEEKS_PER_YEAR;
  return {
    weekly: fb.weeklySalaries,
    share: fb.totalExpenses > 0 ? fb.weeklySalaries / fb.totalExpenses : 0,
    wouldAdd,
  };
}
