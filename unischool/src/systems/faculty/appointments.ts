import type { GameState } from '../../state/types';
import type { Action } from '../../state/actions';
import { money } from '../../format';
import { appointFaculty } from './facultySystem';

export function hireFaculty(s: GameState, action: Extract<Action, { type: 'HIRE_FACULTY' }>): void {
  const idx = s.candidates.findIndex((c) => c.id === action.facultyId);
  if (idx !== -1) {
    const [hired] = s.candidates.splice(idx, 1);
    // The one appointment path, shared with the visiting-chair event
    // (see facultySystem.ts's appointFaculty).
    appointFaculty(s, hired);
    // Logged (Plan 16's PR B) so the year in review can list the
    // year's appointments — the roster growing is obvious the week it
    // happens and invisible by the summer.
    s.log.unshift({
      year: s.clock.year,
      week: s.clock.week,
      message: `Appointed ${hired.name} to the faculty in ${hired.field}, at ${money(hired.salary)}/yr.`,
      kind: 'info',
      topic: 'appointment',
      subject: hired.id,
    });
  }
}

// Dismissal is now two things happening together, not one. The person
// leaves the roster, AND every course they were teaching is orphaned:
// their assignments are cleared, so those courses go unstaffed until
// the player gives them a new instructor (see types.ts's CourseFaculty).
//
// Clearing the entries rather than leaving them dangling is what lets
// a replacement take the orphans over: eligibility is a per-person
// check, so anyone hired into the field with a free slot can pick them
// up. What does NOT happen is the department getting its capacity
// back — an unstaffed course still holds its field slot (see
// techSystem.ts's usedFacultySlots), because the course still exists
// and still needs teaching. The school is left over-committed, and has
// to staff what it already offers before it can offer more.
//
// It is logged because it is the one player action in the game with a
// consequence that outlives the click: the roster shrinking is
// obvious, four courses quietly losing their teacher is not. The UI
// warns beforehand (FacultyTab.tsx); this is the record afterwards.
export function fireFaculty(s: GameState, action: Extract<Action, { type: 'FIRE_FACULTY' }>): void {
  const leaving = s.faculty.find((f) => f.id === action.facultyId);
  if (!leaving) return;

  const orphaned = s.tech.filter((t) => s.courseFaculty[t.id] === leaving.id && (t.status === 'developing' || t.status === 'done'));
  for (const course of orphaned) delete s.courseFaculty[course.id];
  s.faculty = s.faculty.filter((f) => f.id !== action.facultyId);

  // Logged either way now (Plan 16's PR B), so the year in review can
  // list the year's departures; the orphaned courses are the half that
  // is bad news rather than a record.
  s.log.unshift({
    year: s.clock.year,
    week: s.clock.week,
    message: orphaned.length > 0
      ? `${leaving.name} has left the university. ${orphaned.length} ${orphaned.length === 1 ? 'course is' : 'courses are'} without an instructor until ${leaving.field} is staffed again.`
      : `${leaving.name} (${leaving.field}) has left the university.`,
    kind: orphaned.length > 0 ? 'bad' : 'info',
    topic: 'departure',
    subject: leaving.id,
  });
}
