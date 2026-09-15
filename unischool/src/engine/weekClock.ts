// The week clock's accumulator: how much of the current week has elapsed,
// and how many whole weeks that crossed.
//
// WHY THIS EXISTS AS ITS OWN FUNCTION. The clock used to be a
// `setInterval(SPEEDS[speed])` keyed on the speed, so every pause, resume
// or speed change tore the interval down and built a fresh one — throwing
// away however much of the current week had already run. Pausing on day 5
// of week 3 and resuming started week 3 over, and the day squares beside
// the clock (DayTicker.tsx) reset with it, which is how the playtest
// noticed.
//
// An accumulator has no such seam: the caller samples real elapsed time at
// whatever cadence it likes and adds `delta / msPerWeek` to a running
// fraction. Pausing stops sampling and leaves the fraction where it was;
// changing speed changes only the RATE the fraction accrues at, so day 5
// stays day 5 across the change rather than becoming 5/7 of a week at the
// new rate. That is the settled decision: what survives a pause or a speed
// change is the elapsed FRACTION of the week, because "day 5 of week 3" is
// what the fraction means to the player.
//
// Kept pure — no timers, no state, no React — so it can be tested by
// feeding it a sequence of (delta, speed) pairs and asserting both the tick
// count and the remainder carried forward (see test/week-clock.test.ts).
// The one thing this does NOT do is decide WHEN it is sampled or what a
// tick means; that is useGame.ts's job.

export interface WeekAdvance {
  // How far through the new current week we now are, 0..1. Whole weeks are
  // never left in here — they come out as `ticks`.
  progress: number;
  // Whole weeks crossed by this sample. Normally 0 or 1; more than 1 only
  // when one sample covered more than a week of game time, which a fast
  // speed or a long-delayed timer can genuinely do.
  ticks: number;
}

// Advance `progress` (0..1 through the current week) by `elapsedMs` of real
// time at `msPerWeek` milliseconds per week.
//
// A non-positive `msPerWeek` is the paused clock (SPEEDS.paused is 0) and a
// non-positive delta is a timer that fired twice in the same millisecond or
// a clock that stepped backwards: both hand the progress straight back,
// unchanged, rather than dividing by zero or running the week backwards.
export function advanceWeekProgress(progress: number, elapsedMs: number, msPerWeek: number): WeekAdvance {
  if (!(msPerWeek > 0) || !(elapsedMs > 0)) return { progress, ticks: 0 };
  const total = progress + elapsedMs / msPerWeek;
  const ticks = Math.floor(total);
  // The remainder is what makes a tick boundary lossless: the fraction of
  // the sample that landed past the boundary belongs to the NEXT week, not
  // to the bin.
  return { progress: total - ticks, ticks };
}

// The longest stretch of real time one sample is allowed to be worth.
//
// `performance.now()` keeps counting while a tab is in the background, and
// browsers throttle timers there to roughly one call a second, so coming
// back to a tab left running for ten minutes would otherwise hand the
// accumulator a 600,000ms delta and dispatch two years of weekly ticks in
// one frame — the sim would lurch forward through decisions the player
// never saw. Capping the delta means an unattended tab effectively pauses
// and resumes exactly where it was, which is what a player who alt-tabbed
// away expects to come back to. It is a cap on the SAMPLE, not on the
// ticks: at any speed the game actually offers, a cap this size still
// carries more than a whole week, so nothing is lost during ordinary play.
export const MAX_SAMPLE_MS = 1000;
