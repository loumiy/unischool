import type { GameState } from '../../state/types';
import { totalEnrolled, WEEKS_PER_YEAR } from '../../state/types';
import { programOfCourse } from '../../data/techData';
import { isHoused, isInTransit } from './programOffers';

// ---------------------------------------------------------------------
// INSTRUCTION CAPACITY: the seats the housed catalogue can teach (Plan
// 15's §4). A sum over every DEVELOPED course whose program is HOUSED in
// a hall slot and settled there, of SEATS_PER_COURSE. Plan 14's halls are
// what make this honest — you cannot teach students in programs you have
// nowhere to put — and the reading is what turns a hall from a purchase
// into a bet: an empty slot teaches nobody.
//
// A founded-but-shallow program contributes less than a distinguished
// one, because the sum is over courses and not programs, so depth and
// breadth both buy growth, in different shapes.
//
// IT IS THE GAME'S ONE HARD CEILING (Plan 15's PR E): the freshman class
// cannot exceed the seats left after graduation (intakeCeiling below,
// which admissionsSystem.ts's funnel clips to), the summer reveal says how
// much room there is and what next summer will hold, and the services
// line rises past 85% of it (financeSystem.ts's servicesMultiplier). It
// caps ENROLLMENT, never applicants: the pool and the cohort reveal are
// untouched. Housing, dining and health stay soft — crowding, never caps
// — so "I over-admitted and paid for it" is still a story the game tells.
//
// A program IN TRANSIT counts nothing, for the same reason its courses
// carry no teaching quality while it moves (facultyAssignment.ts): it is
// not teaching anybody this term.
//
// THE CORE IS SEATED FROM FOUNDING. Founders Hall holds the general-
// education core and the founding faculty teach it from day one — the
// founding body of 350 is already in those rooms — so the six core courses
// count whether or not their development has finished. Without that a
// college would open with no room for anybody, and its first summer would
// admit nobody. Every other course seats students only once it is done.
// ---------------------------------------------------------------------

// Seats a developed course adds to what the school can teach. PROVISIONAL —
// Plan 15's PR G fits it against the scorecard. The opening value is sized
// off the bands that PR is written against: the whole catalogue (421
// courses, every one housed and developed) holds about 34,000, the top of
// the year-50 band, and a year-20 completionist with 150–225 courses open
// holds 12,000–18,000, which is that year's band. Founders Hall's six core
// courses hold 480 at founding: the founding body of 350 with a little room,
// and nothing more until a program is founded.
export const SEATS_PER_COURSE = 80;

const CORE_PROGRAM_ID = 'CORE';

export interface InstructionCapacity {
  courses: number;   // developed courses in housed, settled programs
  seats: number;     // courses * SEATS_PER_COURSE
}

export function instructionCapacityDetail(s: GameState): InstructionCapacity {
  let courses = 0;
  for (const t of s.tech) {
    if (t.kind !== 'course') continue;
    const programId = programOfCourse(t.id);
    if (programId === undefined) continue;
    if (t.status !== 'done' && programId !== CORE_PROGRAM_ID) continue;
    if (!isHoused(s, programId) || isInTransit(s, programId)) continue;
    courses += 1;
  }
  return { courses, seats: courses * SEATS_PER_COURSE };
}

export function instructionCapacity(s: GameState): number {
  return instructionCapacityDetail(s).seats;
}

// THE CEILING, read at the summer boundary. `seatsLeft` is what the
// freshman class may not exceed: the catalogue's seats less the three
// classes that stay on after the seniors graduate. `nextSummer` is what
// the catalogue will hold a year from now if every course now developing
// in a housed program finishes on schedule — so a player building toward
// a bigger class sees it coming.
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

// How much of the enrolled body the catalogue can teach, 0..1 — the same
// shape as satisfactionSystem.ts's attributeCoverage, so the crowding
// reading can take the worst of the six without converting units. A campus
// with nobody enrolled is fully covered rather than divided by zero.
export function instructionCoverage(s: GameState): number {
  const enrolled = totalEnrolled(s.students);
  if (enrolled <= 0) return 1;
  return Math.max(0, Math.min(1, instructionCapacity(s) / enrolled));
}
