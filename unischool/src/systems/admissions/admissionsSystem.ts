import type { GameState } from '../../state/types';
import { WEEKS_PER_YEAR } from '../../state/types';

// Admissions runs as an annual cycle: applicants accrue through the year,
// then a cohort is admitted at year-end. Between cycles, retention nibbles.
export function tickAdmissions(s: GameState): void {
  // Weekly: satisfaction drifts toward a target set by crowding & reputation.
  const crowding = s.students.enrolled / Math.max(s.students.capacity, 1);
  const target = 50 + s.self.reputation * 0.4 - crowding * 30;
  s.students.satisfaction += (target - s.students.satisfaction) * 0.05;
  s.students.satisfaction = clamp(s.students.satisfaction, 0, 100);

  // Applicant pool builds through the year, scaled by reputation.
  s.students.applicantPool += s.self.reputation * 2;

  // Year-end: admit up to remaining capacity from the pool, lose some to attrition.
  if (s.clock.week === WEEKS_PER_YEAR) {
    const attrition = Math.round(s.students.enrolled * (1 - s.students.satisfaction / 100) * 0.15);
    s.students.enrolled = Math.max(0, s.students.enrolled - attrition);

    const openSeats = Math.max(0, s.students.capacity - s.students.enrolled);
    const admitted = Math.min(openSeats, Math.round(s.students.applicantPool * 0.3));
    s.students.enrolled += admitted;
    s.students.applicantPool = 0;

    s.log.unshift({
      year: s.clock.year,
      week: s.clock.week,
      message: `Admissions cycle: +${admitted} admitted, -${attrition} left. Enrolled: ${s.students.enrolled}.`,
      kind: 'info',
    });
  }
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
