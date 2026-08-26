import type { GameState } from '../../state/types';
import { WEEKS_PER_YEAR } from '../../state/types';

// ---------------------------------------------------------------------
// Admissions is an annual summer decision (see README): the player sets
// tuition, financial aid, selectivity, and a target enrollment once a
// year, via the interrupt enqueued at the bottom of this file, and those
// settings then drive these weekly numbers passively for the rest of the
// year. Every rate is named here so it's easy to find and retune.
// ---------------------------------------------------------------------

// How much of the enrollment gap toward targetEnrollment closes each week.
const ADMIT_CONVERGENCE_RATE = 0.15;

// Baseline weekly attrition rate, scaled by dissatisfaction — replaces the
// old single year-end lump with a steady trickle across the year.
const ATTRITION_BASE_RATE = 0.01;

// Financial aid makes the school more affordable and so a little more
// appealing: it nudges satisfaction up and modestly broadens the
// applicant funnel, in exchange for the real revenue cost applied in
// financeSystem.ts.
const AID_SATISFACTION_BONUS = 20;   // added to the satisfaction target at financialAidRate == 1
const AID_APPLICANT_POOL_BONUS = 0.3; // extra fraction of applicant growth at financialAidRate == 1

export function tickAdmissions(s: GameState): void {
  const { financialAidRate, selectivity, targetEnrollment } = s.admissions;

  // Weekly: satisfaction drifts toward a target set by crowding, reputation, and affordability.
  const crowding = s.students.enrolled / Math.max(s.students.capacity, 1);
  const target = 50 + s.self.reputation * 0.4 - crowding * 30 + financialAidRate * AID_SATISFACTION_BONUS;
  s.students.satisfaction += (target - s.students.satisfaction) * 0.05;
  s.students.satisfaction = clamp(s.students.satisfaction, 0, 100);

  // Applicant interest keeps building through the year, scaled by reputation and a little by aid.
  s.students.applicantPool += s.self.reputation * 2 * (1 + financialAidRate * AID_APPLICANT_POOL_BONUS);

  // Weekly attrition trickle: dissatisfied students leave gradually.
  const attrition = Math.round(s.students.enrolled * (1 - s.students.satisfaction / 100) * ATTRITION_BASE_RATE);
  s.students.enrolled = Math.max(0, s.students.enrolled - attrition);

  // Weekly conversion: close part of the gap to targetEnrollment, drawing
  // from the selectivity-filtered pool, never exceeding physical capacity.
  const openSeats = Math.max(0, s.students.capacity - s.students.enrolled);
  const gapToTarget = Math.max(0, targetEnrollment - s.students.enrolled);
  const consideredPool = s.students.applicantPool * (1 - selectivity); // higher selectivity = smaller share considered
  const admitted = Math.min(openSeats, gapToTarget, Math.round(consideredPool * ADMIT_CONVERGENCE_RATE));
  s.students.enrolled += admitted;
  s.students.applicantPool = Math.max(0, s.students.applicantPool - admitted);

  if (attrition > 0 || admitted > 0) {
    s.log.unshift({
      year: s.clock.year,
      week: s.clock.week,
      message: `Admissions: +${admitted} enrolled, -${attrition} left. Enrolled: ${s.students.enrolled}.`,
      kind: 'info',
    });
  }

  // Summer: pause for the once-a-year admissions decision (see README's
  // "Admissions: an annual summer decision"). The reducer's TICK case
  // sees pendingInterrupt getting set here and holds the clock at this
  // week; RESOLVE_ADMISSIONS (in reducer.ts) is what actually advances
  // into the new year once the player has set its policy.
  if (s.clock.week === WEEKS_PER_YEAR && !s.pendingInterrupt) {
    s.pendingInterrupt = {
      type: 'admissions',
      payload: {
        tuition: s.finance.tuitionPerStudent,
        financialAidRate: s.admissions.financialAidRate,
        selectivity: s.admissions.selectivity,
        targetEnrollment: s.admissions.targetEnrollment,
      },
    };
  }
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
