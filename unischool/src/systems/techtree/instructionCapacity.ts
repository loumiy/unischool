import type { GameState } from '../../state/types';
import { totalEnrolled, WEEKS_PER_YEAR } from '../../state/types';
import { programOfCourse } from '../../data/techData';
import { isHoused } from './programOffers';
import { darkPrograms, unstaffedPrograms } from './darkness';

// Instruction capacity: SEATS_PER_COURSE for every developed course whose
// program is housed and settled (not in transit), so depth and breadth both
// buy growth. The game's one hard ceiling: it caps enrollment via
// intakeCeiling (admissionsSystem.ts), never applicants; housing, dining and
// health stay soft.

// Seats a developed course adds. Provisional; sized so the whole catalog
// holds about 33,000 (top of the year-50 band), and a year-20 completionist
// with 150–225 courses holds 12,000–18,000. The college opens with no
// course (Plan 80D), so its founding body of 350 is crowded until five are
// taught; with none, capacity and coverage read zero, never a division.
export const SEATS_PER_COURSE = 80;

export interface InstructionCapacity {
  courses: number;   // developed courses in housed, settled programs
  seats: number;     // courses * SEATS_PER_COURSE
}

// Developed courses in housed programs outside `dark`.
function coursesTaught(s: GameState, dark: Set<string>): number {
  let courses = 0;
  for (const t of s.tech) {
    if (t.kind !== 'course') continue;
    const programId = programOfCourse(t.id);
    if (programId === undefined) continue;
    if (t.status !== 'done') continue;
    if (!isHoused(s, programId) || dark.has(programId)) continue;
    courses += 1;
  }
  return courses;
}

export function instructionCapacityDetail(s: GameState): InstructionCapacity {
  // A dark program seats nobody: in transit, or unstaffed (darkness.ts).
  const courses = coursesTaught(s, darkPrograms(s));
  return { courses, seats: courses * SEATS_PER_COURSE };
}

export function instructionCapacity(s: GameState): number {
  return instructionCapacityDetail(s).seats;
}

// The ceiling, read at the summer boundary. `seatsLeft` caps the freshman
// class (capacity less the three classes staying on); `nextSummer` counts
// courses now developing in housed programs that finish within a year.
//
// A program in transit counts its seats here (Plan 79C): it is dark for a
// few weeks of a class that stays four years, so a move just before the
// summer does not shrink the class. An unstaffed one still counts none: it
// is dark until someone is hired. The weekly readings (instructionCapacity,
// the crowding and the grades) still count a moving program as dark.
export interface IntakeCeiling {
  capacity: number;              // seats for next year, programs in transit included
  moving: number;                // of which in programs in transit
  stayingOn: number;             // enrolled less the graduating seniors
  seatsLeft: number;             // capacity - stayingOn, never below zero
  nextSummer: number;            // seats a year from now, counting courses in development
}

export function intakeCeiling(s: GameState): IntakeCeiling {
  const capacity = coursesTaught(s, unstaffedPrograms(s)) * SEATS_PER_COURSE;
  const moving = capacity - instructionCapacity(s);
  const stayingOn = totalEnrolled(s.students) - s.students.classes.senior;
  let developing = 0;
  for (const t of s.tech) {
    if (t.kind !== 'course' || t.status !== 'developing') continue;
    const programId = programOfCourse(t.id);
    if (programId === undefined || !isHoused(s, programId)) continue;
    if ((s.developing[t.id] ?? 0) <= WEEKS_PER_YEAR) developing += 1;
  }
  return {
    capacity,
    moving,
    stayingOn,
    seatsLeft: Math.max(0, capacity - stayingOn),
    nextSummer: capacity + developing * SEATS_PER_COURSE,
  };
}

// Share of the enrolled body the catalog can teach, 0..1 — the same shape
// as satisfactionSystem.ts's attributeCoverage. Empty campus counts as covered.
export function instructionCoverage(s: GameState): number {
  const enrolled = totalEnrolled(s.students);
  if (enrolled <= 0) return 1;
  return Math.max(0, Math.min(1, instructionCapacity(s) / enrolled));
}
