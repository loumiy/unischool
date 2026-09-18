import type { GameState } from '../../state/types';
import { totalEnrolled } from '../../state/types';
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
// TODAY THIS IS A READING AND NOTHING MORE (Plan 15's PR A). It is shown on
// the History tab's Standing panel and feeds the crowding reading beside
// it, and it contributes zero anywhere. Plan 15's PR E turns it into the
// game's one hard ceiling — the freshman class cannot exceed the seats
// left after graduation — and PR D's services line reads crowding past it.
// Housing, dining and health stay soft: crowding, never caps.
//
// A program IN TRANSIT counts nothing, for the same reason its courses
// carry no teaching quality while it moves (facultyAssignment.ts): it is
// not teaching anybody this term.
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

export interface InstructionCapacity {
  courses: number;   // developed courses in housed, settled programs
  seats: number;     // courses * SEATS_PER_COURSE
}

export function instructionCapacityDetail(s: GameState): InstructionCapacity {
  let courses = 0;
  for (const t of s.tech) {
    if (t.kind !== 'course' || t.status !== 'done') continue;
    const programId = programOfCourse(t.id);
    if (programId === undefined) continue;
    if (!isHoused(s, programId) || isInTransit(s, programId)) continue;
    courses += 1;
  }
  return { courses, seats: courses * SEATS_PER_COURSE };
}

export function instructionCapacity(s: GameState): number {
  return instructionCapacityDetail(s).seats;
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
