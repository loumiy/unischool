import type { GameState } from '../../state/types';
import { totalEnrolled, WEEKS_PER_YEAR } from '../../state/types';
import { programOfCourse } from '../../data/techData';
import { isHoused } from './programOffers';
import { darkPrograms } from './darkness';

// Instruction capacity: SEATS_PER_COURSE for every developed course whose
// program is housed and settled (not in transit), so depth and breadth both
// buy growth. The game's one hard ceiling: it caps enrollment via
// intakeCeiling (admissionsSystem.ts), never applicants; housing, dining and
// health stay soft.

// Seats a developed course adds. Provisional; sized so the whole catalog
// holds about 33,000 (top of the year-50 band), a year-20 completionist with
// 150–225 courses holds 12,000–18,000, and the founding six courses hold 480
// for the founding body of 350.
export const SEATS_PER_COURSE = 80;

export interface InstructionCapacity {
  courses: number;   // developed courses in housed, settled programs
  seats: number;     // courses * SEATS_PER_COURSE
}

export function instructionCapacityDetail(s: GameState): InstructionCapacity {
  // A dark program seats nobody: in transit, or unstaffed (darkness.ts).
  const dark = darkPrograms(s);
  let courses = 0;
  for (const t of s.tech) {
    if (t.kind !== 'course') continue;
    const programId = programOfCourse(t.id);
    if (programId === undefined) continue;
    if (t.status !== 'done') continue;
    if (!isHoused(s, programId) || dark.has(programId)) continue;
    courses += 1;
  }
  return { courses, seats: courses * SEATS_PER_COURSE };
}

export function instructionCapacity(s: GameState): number {
  return instructionCapacityDetail(s).seats;
}

// The ceiling, read at the summer boundary. `seatsLeft` caps the freshman
// class (capacity less the three classes staying on); `nextSummer` counts
// courses now developing in housed programs that finish within a year.
export interface IntakeCeiling {
  capacity: number;              // seats today
  stayingOn: number;             // enrolled less the graduating seniors
  seatsLeft: number;             // capacity - stayingOn, never below zero
  nextSummer: number;            // seats a year from now, counting courses in development
}

export function intakeCeiling(s: GameState): IntakeCeiling {
  const capacity = instructionCapacity(s);
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
