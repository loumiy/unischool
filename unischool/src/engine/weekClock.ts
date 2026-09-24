// The week clock's accumulator: how much of the current week has elapsed,
// and how many whole weeks that crossed. Pausing stops sampling; changing
// speed changes only the rate, so the elapsed fraction of the week ("day 5
// of week 3") survives both. Pure so it can be tested with (delta, speed)
// sequences (see test/week-clock.test.ts); when to sample and what a tick
// means is useGame.ts's job.

export interface WeekAdvance {
  // How far through the current week, 0..1. Whole weeks go to `ticks`.
  progress: number;
  // Whole weeks crossed by this sample. Usually 0 or 1; more at a fast
  // speed or after a long-delayed timer.
  ticks: number;
}

// Advance `progress` (0..1 through the current week) by `elapsedMs` of real
// time at `msPerWeek` milliseconds per week. A non-positive `msPerWeek`
// (paused) or delta returns the progress unchanged.
export function advanceWeekProgress(progress: number, elapsedMs: number, msPerWeek: number): WeekAdvance {
  if (!(msPerWeek > 0) || !(elapsedMs > 0)) return { progress, ticks: 0 };
  const total = progress + elapsedMs / msPerWeek;
  const ticks = Math.floor(total);
  // The remainder past the boundary carries into the next week.
  return { progress: total - ticks, ticks };
}

// The longest stretch of real time one sample may be worth. Without it a
// background tab (where performance.now() keeps counting) would return with
// years of ticks in one frame; with it, an unattended tab effectively pauses.
// At every offered speed it still exceeds a whole week, so normal play loses
// nothing.
export const MAX_SAMPLE_MS = 1000;
