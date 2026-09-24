// ---------------------------------------------------------------------
// Year over year on the reveal (Plan 16's PR C): the funnel returns the six
// factors its pool is the product of (admissionsSystem.ts's
// AdmissionsProjection.factors), the boundary records last summer's
// (students.lastFunnel), and the reveal divides this year's by last year's
// to say what moved the pool (systems/admissions/yearOverYear.ts).
//
// What is pinned: that the six factors really do multiply to the pool, so
// the decomposition is exact rather than a story; that the parts of a
// year's move compose back to the pool's own move; that the boundary
// records what the reveal will need, and the first summer has nothing to
// be read against; and that word of mouth is one of the named parts.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { createInitialState } from '../src/state/actions';
import { reducer } from '../src/engine/reducer';
import { defaultAnswer } from '../src/engine/defaultAnswers';
import { projectAdmissions } from '../src/systems/admissions/admissionsSystem';
import { poolChange } from '../src/systems/admissions/yearOverYear';
import { signedPct as pct } from '../src/format';
import { COHORTS } from '../src/systems/admissions/cohorts';
import type { FunnelFactors, GameState } from '../src/state/types';
import { WEEKS_PER_YEAR } from '../src/state/types';

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}
const near = (a: number, b: number, eps: number) => Math.abs(a - b) <= eps;

function product(f: FunnelFactors): number {
  return f.prestigePool * f.priceFactor * f.capacityFactor * f.wordOfMouth * f.cohortDemand * f.stickerShock;
}

function toSummer(start: GameState): GameState {
  let s = start;
  for (let i = 0; i < WEEKS_PER_YEAR * 2; i += 1) {
    if (s.pendingInterrupt?.type === 'summer') return s;
    const answer = defaultAnswer(s);
    s = answer ? reducer(s, answer) : reducer(s, { type: 'TICK' });
  }
  throw new Error('no summer inside two years');
}

console.log('reveal year-over-year tests');

// --- the six factors multiply to the pool --------------------------------
{
  for (const [prestige, tuition, capacity, satisfaction] of [[50, 16_000, 0, 70], [80, 30_000, 1_200, 88], [110, 45_000, 6_000, 40], [35, 60_000, 350, 55]]) {
    const out = projectAdmissions(prestige, tuition, capacity, satisfaction);
    assert(
      near(product(out.factors), out.applicants, 0.5),
      `at prestige ${prestige}, price ${tuition}: the factors' product is the pool to within rounding (${product(out.factors).toFixed(2)} vs ${out.applicants})`,
    );
    assert(out.factors.wordOfMouth === out.wordOfMouthMultiplier, 'word of mouth is the multiplier the funnel already reported');
    assert(out.factors.stickerShock === out.stickerShockMultiplier, 'as is sticker shock');
    assert(out.factors.cohortDemand === out.cohortDemandMultiplier, 'and cohort demand');
  }
  const neutral = projectAdmissions(50, 16_000, 0, 70);
  assert(near(neutral.factors.wordOfMouth, 1, 1e-9), 'satisfaction 70 is word of mouth 1.0');
  assert(projectAdmissions(50, 16_000, 0, 90).factors.wordOfMouth > 1, 'and a happier year is more than 1');
}

// --- the parts of a move compose to the move -------------------------------
{
  let s = toSummer(createInitialState('Compose'));
  assert(poolChange(projectAdmissions(50, 16_000, 0, 70), s.students.lastFunnel) === null, 'the first summer has nothing to be read against');

  s = reducer(s, { type: 'RESOLVE_ADMISSIONS', tuition: 16_000, admitRate: s.students.admitRate, approvedPetitionIds: [] });
  const last = s.students.lastFunnel;
  assert(last !== null && last.year === 1, 'the boundary records the funnel it ran');
  if (!last) throw new Error('no record');
  assert(last.applicants === s.students.applicantPool, 'the pool it drew');
  assert(near(product(last.factors), last.applicants, 0.5), 'and the six factors behind it');
  const split = COHORTS.reduce((sum, c) => sum + last.cohorts[c.id], 0);
  assert(split === last.applicants, `the pool's cohort split sums to the pool (${split} vs ${last.applicants})`);

  // A second summer at a happier, pricier, better-regarded school. Prestige
  // is SET rather than nudged: the first summer's report card stepped it
  // down at a school that built nothing, so "+10" could still sit below the
  // level the first funnel read.
  s = toSummer(s);
  s.students.satisfactionYearSum = 90 * s.students.satisfactionYearWeeks;
  s.self.reputation = 80;
  const now = projectAdmissions(s.self.reputation, 24_000, s.students.capacity, 90, undefined, s.students.admitRate);
  const change = poolChange(now, last);
  assert(change !== null, 'the second summer is read against the first');
  if (!change) throw new Error('no change');
  assert(near(change.change, now.applicants / last.applicants - 1, 1e-9), 'the headline is the pool over last year\'s pool');
  // Every factor's ratio, including the ones too small to print, composes
  // back to the pool's own ratio — the whole reason the line is honest.
  const composed = (Object.keys(now.factors) as Array<keyof FunnelFactors>)
    .reduce((acc, key) => acc * (now.factors[key] / last.factors[key]), 1);
  assert(near(composed, product(now.factors) / product(last.factors), 1e-9), 'the factor ratios compose to the unrounded pool ratio');
  assert(near(composed, 1 + change.change, 0.02), `and to the headline within rounding (${composed.toFixed(4)} vs ${(1 + change.change).toFixed(4)})`);
  const labels = change.parts.map((p) => p.label);
  assert(labels.includes('word of mouth'), `word of mouth is named among the parts (${labels.join(', ')})`);
  assert(change.parts.find((p) => p.label === 'word of mouth')!.change > 0, 'and it moved the pool up');
  assert(labels.includes('price'), 'so is the price');
  assert(change.parts.find((p) => p.label === 'price')!.change < 0, 'which moved it down');
  assert(labels.includes('prestige') && change.parts.find((p) => p.label === 'prestige')!.change > 0, 'and prestige, up');
  assert(!labels.includes('beds'), 'a factor that did not move is not on the line');
  for (let i = 1; i < change.parts.length; i += 1) {
    assert(Math.abs(change.parts[i - 1].change) >= Math.abs(change.parts[i].change), 'biggest move first');
  }
}

// --- the percentage reads as a player would write it ---------------------
{
  assert(pct(0.3412) === '+34%', `+34% (${pct(0.3412)})`);
  assert(pct(-0.031) === '−3%', `−3% (${pct(-0.031)})`);
  assert(pct(0.002) === '0%', 'a move that rounds to nothing reads 0%');
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
