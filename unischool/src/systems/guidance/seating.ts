import type { Buildable, GameState } from '../../state/types';
import { totalEnrolled } from '../../state/types';
import { FOUNDERS_HALL_ID, isAcademicHall, programById, programOfCourse } from '../../data/techData';
import { instructionCapacity, SEATS_PER_COURSE } from '../techtree/instructionCapacity';
import { isHoused } from '../techtree/programOffers';
import { claimedSchool } from '../techtree/schools';
import { courseSlotsFree, hasFreeFacultySlot, isUndergraduateCourse } from '../techtree/techSystem';
import { count } from '../../format';
import type { StepIntent } from './intent';
import { slotFree } from '../administration/offices';

// Seating the students (Plan 80D): a college opens with no course, so its
// students have no places until the catalog is developed, and it is crowded
// until then (instructionCapacity.ts). While the places taught and coming
// (courses in development in housed programs) fall short of the students
// enrolled, this names the cheapest next step toward them: the cheapest
// course the college can develop, or a program founded when an entry course
// is cheaper, with the professor it needs. Read by the next-step line
// (nextStep.ts) and the first letter's ask (eventData.ts's 'doors-open').

export interface SeatingAsk {
  text: string;
  go: 'curriculum' | 'hall';
  hallId?: string;
  intent: StepIntent;
}

// Places taught now and places coming: courses in development in housed
// programs, each worth SEATS_PER_COURSE once taught.
export function placesComing(s: GameState): number {
  const developing = s.tech.filter((t) => {
    if (!isUndergraduateCourse(t) || t.status !== 'developing') return false;
    const programId = programOfCourse(t.id);
    return programId !== undefined && isHoused(s, programId);
  }).length;
  return instructionCapacity(s) + developing * SEATS_PER_COURSE;
}

// Whether the students are short of places, counting the courses coming.
export function studentsUnseated(s: GameState): boolean {
  return placesComing(s) < totalEnrolled(s.students);
}

// A hall a new program can go to: Founders Hall first, then a standing hall
// no school claims, with a free program slot.
function openHall(s: GameState): string | undefined {
  const halls = Object.keys(s.halls).sort((a, b) => (a === FOUNDERS_HALL_ID ? -1 : b === FOUNDERS_HALL_ID ? 1 : 0));
  return halls.find((hallId) => {
    const hall = s.tech.find((t) => t.id === hallId);
    return !!hall && isAcademicHall(hall) && claimedSchool(s, hallId) === null && s.halls[hallId].some(slotFree);
  });
}

const courseName = (t: Buildable) => t.name.split(' · ')[1] ?? t.name;

export function seatingAsk(s: GameState): SeatingAsk | null {
  if (!studentsUnseated(s)) return null;
  const taught = instructionCapacity(s);
  const coming = placesComing(s);
  const places = coming > taught
    ? `Places for ${count(coming)} of ${count(totalEnrolled(s.students))} students, counting courses under way`
    : `Places for ${count(taught)} of ${count(totalEnrolled(s.students))} students`;
  // The committee writes only so many at once: with no room on it, the
  // places come when its courses are done.
  if (courseSlotsFree(s) <= 0) return null;
  const course = s.tech
    .filter((t) => isUndergraduateCourse(t) && t.status === 'available')
    .sort((a, b) => a.cost - b.cost)[0];
  const hallId = openHall(s);
  const entries = hallId === undefined ? [] : s.programOffers
    .map((id) => s.tech.find((t) => t.id === programById(id)?.entryCourseId))
    .filter((t): t is Buildable => t !== undefined)
    .sort((a, b) => a.cost - b.cost);
  if (hallId !== undefined && entries.length > 0 && (!course || entries[0].cost < course.cost)) {
    const hall = s.tech.find((t) => t.id === hallId)?.name ?? 'Founders Hall';
    const housed = Object.values(s.halls).some((slots) => slots.some((slot) => slot.programId !== null));
    return {
      text: `${places}: found ${housed ? 'another' : 'a'} program in ${hall}, with a professor to teach it`,
      go: 'hall', hallId, intent: { kind: 'found', hallId },
    };
  }
  if (!course) return null;
  const field = course.requiresFaculty;
  const needs = field !== undefined && !hasFreeFacultySlot(s, field);
  return {
    text: needs
      ? `${places}: appoint a ${field} professor to develop ${courseName(course)}`
      : `${places}: develop ${courseName(course)}, ${SEATS_PER_COURSE} more`,
    go: 'curriculum', intent: { kind: 'develop', courseId: course.id },
  };
}
