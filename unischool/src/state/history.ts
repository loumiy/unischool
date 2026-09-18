import type { GameState, YearSnapshot } from './types';
import { totalEnrolled } from './types';
import { playerRank } from '../systems/rivals/rivalsSystem';
import { FOUNDING_PRESET } from '../data/foundingData';

// ---------------------------------------------------------------------
// The annual history record (see YearSnapshot in types.ts). Nothing here
// is a system — no weekly tick, no state of its own: this is a pure
// derivation of the current GameState into one flat, serializable row,
// called from the reducer at the one annual boundary that already exists
// (RESOLVE_ADMISSIONS). It lives in state/ alongside campusMap.ts for the
// same reason: a small pure helper over the shared state that neither the
// engine nor any system owns.
//
// Everything captured here is already computed elsewhere — this only
// remembers it. Derived readings (catalogue percentage, year-over-year
// deltas) are deliberately NOT stored; views compute them from these
// fields so the record stays minimal and never goes stale.
//
// Two of the year's figures are the exception to "already on the state"
// (Plan 16's PR B): who did not return, and what the year averaged. Both
// exist only inside RESOLVE_ADMISSIONS — the attrition is a number the
// advance returns and the average is read and then reset in the same
// case — so the reducer hands them in rather than this re-deriving them a
// second way.
// ---------------------------------------------------------------------

// Course Buildables that are finished — the catalogue's raw progress.
// Counted off `tech` rather than tracked incrementally so it can never
// drift from the actual curriculum state.
function coursesDone(s: GameState): number {
  return s.tech.filter((t) => t.kind === 'course' && t.status === 'done').length;
}

// Milestone keys are namespaced by kind (see techSystem.ts's
// awardMilestone); counting the `program-established:` prefix gives the
// number of programs whose tier-2 quartet is finished.
const PROGRAM_ESTABLISHED_PREFIX = 'program-established:';

function programsEstablished(s: GameState): number {
  return Object.keys(s.milestones).filter((k) => k.startsWith(PROGRAM_ESTABLISHED_PREFIX)).length;
}

// What the year is measured against: the row filed last summer, or — for
// the first year, which has no row behind it — the founding figures. The
// one place those two are joined, so the review beat and the snapshot
// agree about what "a year ago" was.
export function previousYear(s: GameState): Pick<YearSnapshot, 'cash' | 'coursesDone'> {
  const last = s.history.length > 0 ? s.history[s.history.length - 1] : null;
  return last ?? { cash: FOUNDING_PRESET.startingCash, coursesDone: 0 };
}

export interface YearFigures {
  attrition: number;           // students who did not return at this summer's advance
  satisfactionAverage: number; // the year's average satisfaction, as the funnel just read it
}

// Snapshots the school's headline numbers for the year that is closing.
// Called AFTER that year's admissions funnel and prestige drift have both
// resolved, so the row is the state the school carries into the next year.
export function captureYearSnapshot(s: GameState, figures: YearFigures): YearSnapshot {
  const before = previousYear(s);
  const done = coursesDone(s);
  return {
    year: s.clock.year,
    prestige: s.self.reputation,
    // Recorded every year regardless of s.hasEnteredRankings: the rankings
    // reveal governs what the UI SHOWS (see StatusHeader.tsx), not what the
    // record keeps — the annual report needs a prior rank to compare
    // against from the first year it fires.
    rank: playerRank(s),
    enrolled: totalEnrolled(s.students),
    cash: s.finance.cash,
    coursesDone: done,
    programsEstablished: programsEstablished(s),
    satisfaction: s.students.satisfaction,
    net: s.finance.cash - before.cash,
    // The funnel has just written these three for this summer's class.
    applicants: s.students.applicantPool,
    admitRate: s.students.admitRate,
    incomingQuality: s.students.incomingQuality,
    satisfactionAverage: figures.satisfactionAverage,
    coursesFinished: Math.max(0, done - before.coursesDone),
    attrition: figures.attrition,
  };
}
