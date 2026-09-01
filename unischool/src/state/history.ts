import type { GameState, YearSnapshot } from './types';
import { playerRank } from '../systems/rivals/rivalsSystem';

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
// ---------------------------------------------------------------------

// Course Buildables that are finished — the catalogue's raw progress.
// Counted off `tech` rather than tracked incrementally so it can never
// drift from the actual curriculum state.
function coursesDone(s: GameState): number {
  return s.tech.filter((t) => t.kind === 'course' && t.status === 'done').length;
}

// Milestone keys are namespaced by kind (see techSystem.ts's
// awardMilestone); counting the `major-complete:` prefix gives the number
// of majors whose tier-2 quartet is finished.
const MAJOR_COMPLETE_PREFIX = 'major-complete:';

function majorsComplete(s: GameState): number {
  return Object.keys(s.milestones).filter((k) => k.startsWith(MAJOR_COMPLETE_PREFIX)).length;
}

// Snapshots the school's headline numbers for the year that is closing.
// Called AFTER that year's admissions funnel and prestige drift have both
// resolved, so the row is the state the school carries into the next year.
export function captureYearSnapshot(s: GameState): YearSnapshot {
  return {
    year: s.clock.year,
    prestige: s.self.reputation,
    // Recorded every year regardless of s.hasEnteredRankings: the rankings
    // reveal governs what the UI SHOWS (see StatusHeader.tsx), not what the
    // record keeps — the annual report needs a prior rank to compare
    // against from the first year it fires.
    rank: playerRank(s),
    enrolled: s.students.enrolled,
    cash: s.finance.cash,
    coursesDone: coursesDone(s),
    majorsComplete: majorsComplete(s),
    satisfaction: s.students.satisfaction,
  };
}
