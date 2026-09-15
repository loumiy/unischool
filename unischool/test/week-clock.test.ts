// ---------------------------------------------------------------------
// The week clock's accumulator (src/engine/weekClock.ts).
//
// The bug this exists to pin: the clock used to be one setInterval per
// speed, so every pause, resume or speed change threw away the part-week
// in flight and started the week over. The accumulator's whole job is that
// no such seam exists, and "no seam" is exactly the kind of property that
// can regress without anything throwing — the game would simply feel like
// it stutters at a speed change, months later, to somebody who cannot say
// why.
//
// So the checks here are mostly one shape: drive a SEQUENCE of (delta,
// speed) pairs through the accumulator, across pauses and speed changes,
// and assert the two things that must be true of it — how many weeks it
// crossed, and how much of the next week it carried forward. The
// conservation check at the end is the honest version of both at once:
// ticks + leftover fraction must equal the weeks of game time fed in,
// however the feeding was chopped up.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { advanceWeekProgress, MAX_SAMPLE_MS } from '../src/engine/weekClock';
import { SPEEDS, type Speed } from '../src/engine/useGame';

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}
// Floating point: a week fraction is built by division and addition, so
// exact equality is the wrong question to ask of it.
function close(a: number, b: number, tol = 1e-9): boolean {
  return Math.abs(a - b) <= tol;
}

// The sampler useGame.ts runs, minus React and minus the wall clock: feed
// it (delta in ms, speed) pairs and it reports the same two figures the
// real one acts on.
//
// A step longer than one sample is chopped into sample-sized pieces, which
// is what the real sampler does with it too — it wakes every SAMPLE_MS, so
// a stretch of real time reaches the accumulator as a run of small deltas,
// never as one big one. (The cap on a SINGLE sample is a separate rule,
// checked on its own below.) Chopping here also means the sequence checks
// exercise the carry across many samples rather than one arithmetic step.
const CHUNK_MS = MAX_SAMPLE_MS;
function run(steps: readonly [number, Speed][], from = 0): { progress: number; ticks: number } {
  let progress = from;
  let ticks = 0;
  for (const [delta, speed] of steps) {
    for (let left = delta; left > 0; left -= CHUNK_MS) {
      const step = advanceWeekProgress(progress, Math.min(left, CHUNK_MS), SPEEDS[speed]);
      progress = step.progress;
      ticks += step.ticks;
    }
  }
  return { progress, ticks };
}

console.log('week clock tests');

// --- the basics ------------------------------------------------------
{
  const half = advanceWeekProgress(0, SPEEDS.real / 2, SPEEDS.real);
  assert(half.ticks === 0 && close(half.progress, 0.5), 'half a week at real speed is half a week, and no tick');

  const exact = advanceWeekProgress(0.5, SPEEDS.real / 2, SPEEDS.real);
  assert(exact.ticks === 1 && close(exact.progress, 0), 'the second half crosses exactly one boundary and lands on zero');

  const over = advanceWeekProgress(0.9, SPEEDS.real / 2, SPEEDS.real);
  assert(over.ticks === 1 && close(over.progress, 0.4), 'the part of a sample past the boundary is carried into the next week');

  const burst = advanceWeekProgress(0.25, SPEEDS.real * 3, SPEEDS.real);
  assert(burst.ticks === 3 && close(burst.progress, 0.25), 'a sample worth three weeks crosses three boundaries, not one');
}

// --- the bug: a pause must not cost the week in flight ----------------
{
  // Day 5 of the week, then paused for a good long while, then resumed.
  const fiveSevenths = (SPEEDS.real * 5) / 7;
  const { progress, ticks } = run([
    [fiveSevenths, 'real'],
    [MAX_SAMPLE_MS, 'paused'],
    [MAX_SAMPLE_MS, 'paused'],
    [MAX_SAMPLE_MS, 'paused'],
  ]);
  assert(ticks === 0, 'a pause ticks nothing');
  assert(close(progress, 5 / 7), 'day 5 is still day 5 after the pause — the week in flight survives it');
  assert(Math.floor(progress * 7) === 5, 'and the day squares still read 5 (DayTicker.tsx)');

  // Resuming needs only the REST of the week, not another whole one.
  const resumed = run([[(SPEEDS.real * 2) / 7, 'real']], progress);
  assert(resumed.ticks === 1 && close(resumed.progress, 0), 'two sevenths more finishes that same week');
}

// --- decision 2: a speed change preserves the FRACTION, not the ms ----
{
  const { progress: atSwitch } = run([[(SPEEDS.real * 5) / 7, 'real']]);
  assert(close(atSwitch, 5 / 7), 'day 5 at real speed');

  // The old interval-per-speed rebuilt the timer here, losing the lot. The
  // accumulator changes only the RATE: 2/7ths of a week still remain, they
  // just now take 2/7ths of a SHORTER week to run.
  const rest = run([[(SPEEDS.double * 2) / 7, 'double']], atSwitch);
  assert(rest.ticks === 1 && close(rest.progress, 0), 'switching to 2x mid-week finishes the same week, at the new rate');

  // And the switch itself, with no time passing over it, moves nothing.
  const noop = advanceWeekProgress(atSwitch, 0, SPEEDS.double);
  assert(noop.ticks === 0 && noop.progress === atSwitch, 'the change of speed alone advances nothing');

  // Half a week at real, then the same wall-clock time at 2x, is a week
  // and a half: the second half runs twice as fast.
  const mixed = run([[SPEEDS.real / 2, 'real'], [SPEEDS.real / 2, 'double']]);
  assert(mixed.ticks === 1 && close(mixed.progress, 0.5), 'the same real time buys twice the game time at 2x');
}

// --- guards ----------------------------------------------------------
{
  const paused = advanceWeekProgress(0.42, 10_000, SPEEDS.paused);
  assert(paused.ticks === 0 && paused.progress === 0.42, 'a paused clock (0 ms per week) never divides and never advances');

  const zero = advanceWeekProgress(0.42, 0, SPEEDS.real);
  assert(zero.ticks === 0 && zero.progress === 0.42, 'a zero-length sample changes nothing');

  const backwards = advanceWeekProgress(0.42, -500, SPEEDS.real);
  assert(backwards.ticks === 0 && backwards.progress === 0.42, 'a clock that stepped backwards is ignored, not run in reverse');

  assert(
    advanceWeekProgress(0, MAX_SAMPLE_MS, SPEEDS.real).ticks === 0,
    'the sample cap is longer than nothing but shorter than a real-speed week',
  );
  assert(
    MAX_SAMPLE_MS >= SPEEDS.fast,
    'and it still carries a whole week at the fastest speed offered, so ordinary play never loses time to it',
  );
}

// --- conservation, over a long ragged sequence ------------------------
{
  // Deliberately irregular: timers do not fire on a grid, and the speed
  // changes land mid-sample rather than at boundaries.
  let seed = 20260915;
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  const order: Speed[] = ['real', 'double', 'paused', 'fast', 'real', 'paused', 'double'];

  const steps: [number, Speed][] = [];
  for (let i = 0; i < 5000; i++) {
    const speed = order[Math.floor(rnd() * order.length)];
    steps.push([Math.round(10 + rnd() * 240), speed]);
  }

  const { progress, ticks } = run(steps);
  const expected = steps.reduce(
    (weeks, [delta, speed]) => weeks + (SPEEDS[speed] > 0 ? delta / SPEEDS[speed] : 0),
    0,
  );
  assert(progress >= 0 && progress < 1, 'the carried fraction is always a fraction of one week');
  assert(
    close(ticks + progress, expected, 1e-6),
    `every millisecond fed in is either a tick or carried, across ${steps.length} ragged samples ` +
    `(${ticks} + ${progress.toFixed(6)} vs ${expected.toFixed(6)})`,
  );
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
