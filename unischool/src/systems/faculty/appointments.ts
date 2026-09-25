import type { GameState } from '../../state/types';
import type { Action } from '../../state/actions';
import { money } from '../../format';
import { appointFaculty, leaveFaculty } from './facultySystem';
import { facultyPay } from '../finance/financeSystem';

export function hireFaculty(s: GameState, action: Extract<Action, { type: 'HIRE_FACULTY' }>): void {
  const idx = s.candidates.findIndex((c) => c.id === action.facultyId);
  if (idx !== -1) {
    const [hired] = s.candidates.splice(idx, 1);
    // The one appointment path, shared with the visiting-chair event.
    appointFaculty(s, hired);
    // Logged so the year in review can list the year's appointments.
    s.log.unshift({
      year: s.clock.year,
      week: s.clock.week,
      // The pay this school gives, as every card shows it.
      message: `Appointed ${hired.name} to the faculty in ${hired.field}, at ${money(Math.round(facultyPay(s, hired.salary)))}/yr.`,
      kind: 'info',
      topic: 'appointment',
      subject: hired.id,
    });
  }
}

// Dismissal removes the person and orphans every course they teach: the
// assignments are cleared (so anyone eligible can take them over), but the
// courses still hold their field slots (techSystem.ts's usedFacultySlots),
// leaving the school over-committed until it restaffs. Logged because the
// orphaned courses are easy to miss; FacultyTab.tsx warns beforehand.
export function fireFaculty(s: GameState, action: Extract<Action, { type: 'FIRE_FACULTY' }>): void {
  const leaving = s.faculty.find((f) => f.id === action.facultyId);
  if (!leaving) return;

  const orphaned = leaveFaculty(s, leaving);

  // Logged either way, so the year in review can list departures.
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
