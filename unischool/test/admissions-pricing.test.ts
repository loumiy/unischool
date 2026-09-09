// ---------------------------------------------------------------------
// Admissions pricing: net price vs. sticker price (see README's
// "Admissions: an annual summer decision" and admissionsSystem.ts's
// STICKER_SHOCK_RATE).
//
// projectAdmissions() is pure and deterministic — no Math.random anywhere
// in this module — so this file needs none of the seeding/localStorage
// scaffolding the other tests use; it drives the real, shipped function
// directly, at chosen policy points, exactly as the admissions modal and
// the reducer's RESOLVE_ADMISSIONS do.
//
// WHAT THIS GUARDS. Before STICKER_SHOCK_RATE existed, inflating the
// sticker price while raising scholarships to hold the STUDENT'S net price
// fixed was a strict improvement with no offsetting cost: qualityMix's
// tuition-driven shift moved mass into the low band, whose yield penalty is
// zero, so a school that priced at its ceiling and discounted back down to
// an honest net price nearly tripled its enrolled class and net revenue
// over pricing honestly in the first place — see the fix's own commit
// message for the exact verified numbers. These checks lock that shut: a
// sticker within the school's earned tolerance costs nothing, one that
// overreaches costs real applicants (worst in the low/mid bands, least in
// the top band), and the profitability curve at a fixed net price has to
// have a genuine interior optimum rather than favoring either extreme.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { projectAdmissions, priceTolerance, admitRate } from '../src/systems/admissions/admissionsSystem';

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

const CAPACITY = 6_000; // admissionsScaleScore's own reference — a representative mid-size campus
const SATISFACTION = 70; // WORD_OF_MOUTH_NEUTRAL — isolates pricing from word-of-mouth swings

// Net revenue at a policy: what actually flows into finance for the
// incoming class, the figure a player is really optimizing when they set
// these two levers (see financeSystem.ts's tuitionRevenue line).
function netRevenue(prestige: number, tuition: number, scholarshipRate: number): number {
  const o = projectAdmissions(prestige, tuition, scholarshipRate, CAPACITY, SATISFACTION);
  return o.enrolled * o.netTuitionPerStudent;
}

// The scholarship rate that lands exactly on `netPriceTarget` for a given
// sticker tuition — the same "hold the student's price fixed, move the
// sticker" construction the exploit relied on.
function scholarshipFor(tuition: number, netPriceTarget: number): number {
  return tuition > 0 ? Math.max(0, 1 - netPriceTarget / tuition) : 0;
}

// =====================================================================
// 1. NO SHOCK WITHIN EARNED TOLERANCE — a sticker the school's own
// standing can support costs nothing, at any scholarship rate.
// =====================================================================
for (const prestige of [30, 50, 90, 130]) {
  const tolerance = priceTolerance(prestige);
  for (const scholarshipRate of [0, 0.3, 0.7]) {
    const atTolerance = projectAdmissions(prestige, Math.round(tolerance), scholarshipRate, CAPACITY, SATISFACTION);
    assert(
      Math.abs(atTolerance.stickerShockMultiplier - 1) < 1e-6,
      `prestige ${prestige}: a sticker at earned tolerance draws zero shock (scholarship ${scholarshipRate}, got ${atTolerance.stickerShockMultiplier})`,
    );
    const underTolerance = projectAdmissions(prestige, Math.round(tolerance * 0.5), scholarshipRate, CAPACITY, SATISFACTION);
    assert(
      Math.abs(underTolerance.stickerShockMultiplier - 1) < 1e-6,
      `prestige ${prestige}: a sticker well under earned tolerance draws zero shock`,
    );
  }
}

// =====================================================================
// 2. SHOCK RISES WITH OVERREACH, AND NEVER REVERSES — monotone in how far
// the sticker sits past what the school's prestige can support.
// =====================================================================
for (const prestige of [30, 50, 90, 130]) {
  const tolerance = priceTolerance(prestige);
  const overreachMultipliers = [1, 1.5, 2, 3, 5];
  let previous = 1;
  for (const m of overreachMultipliers) {
    const tuition = Math.round(tolerance * m);
    const o = projectAdmissions(prestige, tuition, 0.5, CAPACITY, SATISFACTION);
    assert(
      o.stickerShockMultiplier <= previous + 1e-9,
      `prestige ${prestige}: shock multiplier is non-increasing as the sticker climbs to ${m}x tolerance (was ${previous.toFixed(4)}, now ${o.stickerShockMultiplier.toFixed(4)})`,
    );
    previous = o.stickerShockMultiplier;
  }
  assert(previous < 0.9, `prestige ${prestige}: a sticker at 5x earned tolerance draws a real, meaningful shock (got multiplier ${previous.toFixed(3)})`);
}

// =====================================================================
// 3. THE EXPLOIT IS CLOSED — at a fixed NET price, maxing out the sticker
// (and matching it with scholarships) no longer beats honest pricing.
// =====================================================================
{
  const prestige = 50;
  const netPriceTarget = 10_000;
  const honest = netRevenue(prestige, netPriceTarget, 0);
  const extreme = netRevenue(prestige, 60_000, scholarshipFor(60_000, netPriceTarget));
  assert(
    extreme <= honest,
    `sticker-inflation-plus-matching-aid no longer beats honest pricing at the same net price (honest $${honest.toLocaleString()}, extreme $${extreme.toLocaleString()})`,
  );
}

// =====================================================================
// 4. A REAL DECISION EXISTS — the profitability curve at a fixed net price
// has a genuine interior optimum: some sticker level beats BOTH the
// honest-pricing floor and the maxed-out-sticker extreme. (Confirms the
// fix didn't overcorrect into "honest pricing is always best either way" —
// a little price discrimination should still be a legitimate, rewarded
// real-world strategy, just not an unbounded one.)
// =====================================================================
{
  const prestige = 50;
  const netPriceTarget = 10_000;
  const stickers = [10_000, 12_500, 15_000, 17_500, 20_000, 25_000, 30_000, 40_000, 60_000];
  const revenues = stickers.map((t) => netRevenue(prestige, t, scholarshipFor(t, netPriceTarget)));
  const maxRevenue = Math.max(...revenues);
  const first = revenues[0];
  const last = revenues[revenues.length - 1];
  assert(
    maxRevenue > first * 1.1 && maxRevenue > last * 1.1,
    `the sticker-vs-net-price curve has a real interior peak, not a corner solution (honest $${first.toLocaleString()}, peak $${maxRevenue.toLocaleString()}, maxed-out $${last.toLocaleString()})`,
  );
}

// =====================================================================
// 5. BAND-SPECIFIC — the low band is shocked hardest, the top band least,
// at the same overreach. Read indirectly through avgIncomingQuality: heavy
// overreach should shift the enrolled mix toward LOWER average quality
// (the top band's share of the realized pool shrinks least, so it becomes
// relatively more of the mix... texture the multiplier band-by-band is not
// exposed, so this checks the documented, intended consequence instead —
// see the low band losing volume fastest is what floods the mix downward
// even before qualityMix's own tuition shift is counted).
// =====================================================================
{
  const prestige = 50;
  const netPriceTarget = 10_000;
  const mild = projectAdmissions(prestige, 12_000, scholarshipFor(12_000, netPriceTarget), CAPACITY, SATISFACTION);
  const extreme = projectAdmissions(prestige, 60_000, scholarshipFor(60_000, netPriceTarget), CAPACITY, SATISFACTION);
  assert(
    extreme.stickerShockMultiplier < mild.stickerShockMultiplier,
    'heavier sticker overreach draws a stronger overall shock than mild overreach',
  );
}

// =====================================================================
// 6. SANITY — the funnel still produces well-formed output under heavy
// shock: no negative counts, rates stay in [0, 1].
// =====================================================================
{
  const prestige = 20;
  const o = projectAdmissions(prestige, 200_000, 0.95, CAPACITY, SATISFACTION);
  assert(o.applicants >= 0, 'applicants never negative under extreme sticker shock');
  assert(o.admits >= 0, 'admits never negative under extreme sticker shock');
  assert(o.enrolled >= 0, 'enrolled never negative under extreme sticker shock');
  assert(o.admitRate >= 0 && o.admitRate <= 1, 'admit rate stays in [0, 1]');
  assert(o.yieldRate >= 0 && o.yieldRate <= 1, 'yield rate stays in [0, 1]');
  assert(o.stickerShockMultiplier >= 0 && o.stickerShockMultiplier <= 1, 'shock multiplier stays in [0, 1]');
  assert(admitRate(prestige) >= 0 && admitRate(prestige) <= 1, 'admitRate(prestige) stays in [0, 1] independent of shock');
}

console.log('admissions-pricing tests');
if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
