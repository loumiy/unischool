import type { GameState, YearSnapshot } from './types';
import { totalEnrolled } from './types';
import { playerRank } from '../systems/rivals/rivalsSystem';
import { FOUNDING_COURSES_PER_PROGRAM, FOUNDING_PRESET, FOUNDING_PROGRAMS } from '../data/foundingData';

// The annual history record (see YearSnapshot in types.ts): a pure derivation
// of the state into one flat row, called at RESOLVE_ADMISSIONS. Derived
// readings (percentages, deltas) are not stored; views compute them.
// Attrition and the year's average satisfaction exist only inside
// RESOLVE_ADMISSIONS, so the reducer hands them in.

// Finished courses, counted off `tech` so it cannot drift.
function coursesDone(s: GameState): number {
  return s.tech.filter((t) => t.kind === 'course' && t.status === 'done').length;
}

// Milestone keys are namespaced by kind (see techSystem.ts's awardMilestone).
const PROGRAM_ESTABLISHED_PREFIX = 'program-established:';

function programsEstablished(s: GameState): number {
  return Object.keys(s.milestones).filter((k) => k.startsWith(PROGRAM_ESTABLISHED_PREFIX)).length;
}

// What the year is measured against: last summer's row, or the founding
// figures in year one. The founding college opens with its courses developed,
// so year one counts from those.
export function previousYear(s: GameState): Pick<YearSnapshot, 'cash' | 'coursesDone'> {
  const last = s.history.length > 0 ? s.history[s.history.length - 1] : null;
  return last ?? { cash: FOUNDING_PRESET.startingCash, coursesDone: FOUNDING_PROGRAMS.length * FOUNDING_COURSES_PER_PROGRAM };
}

export interface YearFigures {
  attrition: number;           // students who did not return at this summer's advance
  satisfactionAverage: number; // the year's average satisfaction, as the funnel just read it
  graduated: number;           // the seniors the advance just sent out
}

// The closing year's headline numbers, captured after its admissions and
// prestige have resolved.
export function captureYearSnapshot(s: GameState, figures: YearFigures): YearSnapshot {
  const before = previousYear(s);
  const done = coursesDone(s);
  return {
    year: s.clock.year,
    prestige: s.self.reputation,
    // Recorded even before the rankings reveal: the annual report needs a
    // prior rank from its first year.
    rank: playerRank(s),
    enrolled: totalEnrolled(s.students),
    cash: s.finance.cash,
    coursesDone: done,
    programsEstablished: programsEstablished(s),
    satisfaction: s.students.satisfaction,
    net: s.finance.cash - before.cash,
    applicants: s.students.applicantPool,
    admitRate: s.students.admitRate,
    incomingQuality: s.students.incomingQuality,
    satisfactionAverage: figures.satisfactionAverage,
    coursesFinished: Math.max(0, done - before.coursesDone),
    attrition: figures.attrition,
    graduated: figures.graduated,
  };
}
