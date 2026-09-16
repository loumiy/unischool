// ---------------------------------------------------------------------
// Admissions pricing (see docs/design/admissions.md and
// admissionsSystem.ts's STICKER_SHOCK_RATE).
//
// projectAdmissions() is pure and deterministic — no Math.random anywhere
// in this module — so this file needs none of the seeding/localStorage
// scaffolding the other tests use; it drives the real, shipped function
// directly, at chosen policy points, exactly as the admissions modal and
// the reducer's RESOLVE_ADMISSIONS do.
//
// WHAT THIS GUARDS, and what it used to. This file was written against a
// two-lever model where a school listed one price and charged another:
// inflating the sticker while raising scholarships to hold the STUDENT'S
// net price fixed was a strict improvement, because qualityMix's shift
// moved mass into the low band, whose yield penalty is zero. Sticker shock
// was the answer, and three of these sections tested it by holding net
// price fixed while moving the sticker.
//
// Scholarships are retired (Plan 05's PR B), so there is one price and
// that construction cannot be written at all. What survives is the half of
// sticker shock that was never about the exploit: price moves WHO applies,
// not just how many. A price inside the school's earned tolerance costs
// nothing (1); overreach costs applicants, monotonically (2); it costs the
// low and mid bands harder than the top, so the pool's composition shifts
// (4); and there is a real interior optimum in what to charge (3).
//
// The exploit invariant itself did not vanish — it MOVED. The retroactive
// hike is the exploit this model can express, and class-pricing.test.ts
// carries it (see Plan 05's PR A).
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

// First-year revenue from the incoming class at a given price: the figure
// a player is really optimizing when they set the one lever. One price
// now, so this is just the class times what it is charged (see
// financeSystem.ts's annualTuitionBilled, which sums exactly this per
// class).
function firstYearRevenue(prestige: number, tuition: number): number {
  return projectAdmissions(prestige, tuition, CAPACITY, SATISFACTION).enrolled * tuition;
}

// =====================================================================
// 1. NO SHOCK WITHIN EARNED TOLERANCE — a price the school's own standing
// can support costs nothing.
// =====================================================================
for (const prestige of [30, 50, 90, 130]) {
  const tolerance = priceTolerance(prestige);
  const atTolerance = projectAdmissions(prestige, Math.round(tolerance), CAPACITY, SATISFACTION);
  assert(
    Math.abs(atTolerance.stickerShockMultiplier - 1) < 1e-6,
    `prestige ${prestige}: a price at earned tolerance draws zero shock (got ${atTolerance.stickerShockMultiplier})`,
  );
  const underTolerance = projectAdmissions(prestige, Math.round(tolerance * 0.5), CAPACITY, SATISFACTION);
  assert(
    Math.abs(underTolerance.stickerShockMultiplier - 1) < 1e-6,
    `prestige ${prestige}: a price well under earned tolerance draws zero shock`,
  );
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
    const o = projectAdmissions(prestige, tuition, CAPACITY, SATISFACTION);
    assert(
      o.stickerShockMultiplier <= previous + 1e-9,
      `prestige ${prestige}: shock multiplier is non-increasing as the price climbs to ${m}x tolerance (was ${previous.toFixed(4)}, now ${o.stickerShockMultiplier.toFixed(4)})`,
    );
    previous = o.stickerShockMultiplier;
  }
  assert(previous < 0.9, `prestige ${prestige}: a price at 5x earned tolerance draws a real, meaningful shock (got multiplier ${previous.toFixed(3)})`);
}

// =====================================================================
// 3. A REAL DECISION EXISTS — with one price, the first-year revenue curve
// has a genuine interior optimum: some price beats both giving the place
// away and pricing it out of its own applicant pool. This is the same
// question the old section 4 asked ("is there a real pricing decision, or
// is one end always right?"), asked of the model that now exists — there
// is no sticker-vs-net gap left to sweep, so it sweeps the price itself.
// =====================================================================
for (const prestige of [30, 50, 90]) {
  const tolerance = priceTolerance(prestige);
  const prices = [0.1, 0.25, 0.5, 0.75, 1, 1.5, 2, 3, 5].map((m) => Math.round(tolerance * m));
  const revenues = prices.map((price) => firstYearRevenue(prestige, price));
  const peak = Math.max(...revenues);
  const peakAt = prices[revenues.indexOf(peak)];
  assert(
    peak > revenues[0] * 1.1 && peak > revenues[revenues.length - 1] * 1.1,
    `prestige ${prestige}: the price-vs-revenue curve peaks in the middle, not at a corner (cheapest $${revenues[0].toLocaleString()}, peak $${peak.toLocaleString()} at $${peakAt.toLocaleString()}, dearest $${revenues[revenues.length - 1].toLocaleString()})`,
  );
  assert(
    peakAt > tolerance * 0.2 && peakAt < tolerance * 3,
    `prestige ${prestige}: the revenue-maximizing price is somewhere near earned tolerance, not at an extreme (peak $${peakAt.toLocaleString()} vs tolerance $${Math.round(tolerance).toLocaleString()})`,
  );
}

// =====================================================================
// 4. BAND-SPECIFIC — the whole of what sticker shock still claims to do,
// tested by its one cleanly observable signature.
//
// The per-band factors depend only on overreach, so at the SAME overreach
// every school gets the same three factors. What differs is the mix they
// are applied to (qualityMix reads prestige), and the aggregate multiplier
// is that mix's weighted blend. So if the shock were band-blind, two
// schools at the same overreach would be shocked identically whatever
// their prestige; because it is band-specific, the school with more of its
// pool in the lightly-shocked top band is shocked LESS.
//
// The effect is small — a couple of percent — because the mix moves slowly
// with prestige, and it is measured at 2x rather than further out because
// qualityMix clamps at QUALITY_BAND_FLOOR under heavy overreach, which
// makes every school's mix identical and the signature vanish. Small and
// real is the honest claim here.
//
// NOTE the thing this deliberately does NOT assert: that overreach raises
// the average quality of who enrolls. Two price effects on composition run
// opposite ways — this one pushes the mix up, qualityMix's own tuition
// shift pushes it down — and which wins depends on prestige (it is up at
// 30 and 50, down at 90). That is a property of two tunings meeting, not
// an invariant, and a test that asserted it would be asserting today's
// numbers rather than the model's intent.
// =====================================================================
{
  const OVERREACH = 2;
  const shockAt = (prestige: number): number => projectAdmissions(
    prestige, Math.round(priceTolerance(prestige) * OVERREACH), CAPACITY, SATISFACTION,
  ).stickerShockMultiplier;

  let previous = 0;
  for (const prestige of [30, 50, 90, 130]) {
    const shock = shockAt(prestige);
    assert(
      shock > previous,
      `prestige ${prestige}: at the same ${OVERREACH}x overreach, a school with more top-band applicants is shocked less (previous ${previous.toFixed(4)}, now ${shock.toFixed(4)})`,
    );
    previous = shock;
  }
  assert(previous < 1, 'even the most prestigious school is genuinely shocked by real overreach');
}

// =====================================================================
// 5. ONE PRICE, ONE RESPONSE — the funnel reads a single number. Volume
// falls with price and the pool never grows by charging more, which the
// old model could not assert: volume was scored against net price while
// the band split read the sticker, so the two could and did disagree.
// =====================================================================
for (const prestige of [30, 50, 90]) {
  const tolerance = priceTolerance(prestige);
  let previous = Infinity;
  for (const m of [0.25, 0.5, 1, 1.5, 2, 3]) {
    const o = projectAdmissions(prestige, Math.round(tolerance * m), CAPACITY, SATISFACTION);
    assert(
      o.applicants <= previous + 1e-9,
      `prestige ${prestige}: the applicant pool never grows as price rises to ${m}x tolerance (was ${previous}, now ${o.applicants})`,
    );
    previous = o.applicants;
  }
}

// =====================================================================
// 6. SANITY — the funnel still produces well-formed output under heavy
// shock: no negative counts, rates stay in [0, 1].
// =====================================================================
{
  const prestige = 20;
  const o = projectAdmissions(prestige, 200_000, CAPACITY, SATISFACTION);
  assert(o.applicants >= 0, 'applicants never negative under extreme sticker shock');
  assert(o.admits >= 0, 'admits never negative under extreme sticker shock');
  assert(o.enrolled >= 0, 'enrolled never negative under extreme sticker shock');
  assert(o.admitRate >= 0 && o.admitRate <= 1, 'admit rate stays in [0, 1]');
  assert(o.stickerShockMultiplier >= 0 && o.stickerShockMultiplier <= 1, 'shock multiplier stays in [0, 1]');
  assert(admitRate(prestige) >= 0 && admitRate(prestige) <= 1, 'admitRate(prestige) stays in [0, 1] independent of shock');
}

// =====================================================================
// 7. THE ADMIT RATE IS A DECISION (Plan 05's PR C) — the class is the
// share of the pool the player chose, so moving the slider moves class
// size, monotonically and with nothing in between.
// =====================================================================
for (const prestige of [30, 50, 90]) {
  const price = Math.round(priceTolerance(prestige));
  let previousEnrolled = -1;
  for (const rate of [0.05, 0.1, 0.25, 0.5, 0.75, 1]) {
    const o = projectAdmissions(prestige, price, CAPACITY, SATISFACTION, undefined, rate);
    assert(
      o.enrolled >= previousEnrolled,
      `prestige ${prestige}: a larger admit rate never commits a smaller class (${rate}: ${o.enrolled}, previous ${previousEnrolled})`,
    );
    previousEnrolled = o.enrolled;
  }

  // Admitted IS enrolled: there is no yield step left to take a cut. At a
  // rate the pool can actually fill, the class is the chosen share of it.
  const half = projectAdmissions(prestige, price, CAPACITY, SATISFACTION, undefined, 0.5);
  assert(
    Math.abs(half.enrolled - half.applicants * 0.5) <= 1,
    `prestige ${prestige}: admitting half the pool enrolls half the pool (${half.enrolled} of ${half.applicants})`,
  );
  assert(
    Math.abs(half.admitRate - 0.5) < 1e-9,
    `prestige ${prestige}: the reported rate echoes the choice when the bands can fill it (got ${half.admitRate})`,
  );
}

// =====================================================================
// 8. A BIGGER CLASS COSTS QUALITY — the price of admitting deep, and the
// only thing that punishes it now that yield is gone. The skim runs best
// band first, so a larger share reaches further down the distribution and
// drags the average quality of who arrives, which feeds prestige.
// =====================================================================
for (const prestige of [30, 50, 90]) {
  const price = Math.round(priceTolerance(prestige));
  let previousQuality = Infinity;
  for (const rate of [0.05, 0.1, 0.25, 0.5, 0.75, 1]) {
    const o = projectAdmissions(prestige, price, CAPACITY, SATISFACTION, undefined, rate);
    assert(
      o.avgIncomingQuality <= previousQuality + 1e-9,
      `prestige ${prestige}: admitting a larger share never raises incoming quality (${rate}: ${o.avgIncomingQuality.toFixed(2)}, previous ${previousQuality.toFixed(2)})`,
    );
    previousQuality = o.avgIncomingQuality;
  }
  // And the trade is real, not a rounding artifact: taking the whole pool
  // is a materially weaker class than skimming the top of it.
  const skim = projectAdmissions(prestige, price, CAPACITY, SATISFACTION, undefined, 0.05);
  const all = projectAdmissions(prestige, price, CAPACITY, SATISFACTION, undefined, 1);
  assert(
    skim.avgIncomingQuality > all.avgIncomingQuality + 5,
    `prestige ${prestige}: skimming beats taking everyone by a real margin (${skim.avgIncomingQuality.toFixed(1)} vs ${all.avgIncomingQuality.toFixed(1)})`,
  );
  assert(all.enrolled > skim.enrolled, `prestige ${prestige}: and the bigger class really is bigger`);
}

// =====================================================================
// 9. THE DEFAULT IS WHAT THE SLIDER OPENS AT — admitRate(prestige) is no
// longer an answer the funnel computes, so the only claim left on it is
// that it is a sane opening position: a real share, more selective the
// more standing a school has.
// =====================================================================
{
  let previous = Infinity;
  for (const prestige of [0, 30, 50, 90, 130, 150]) {
    const rate = admitRate(prestige);
    assert(rate > 0 && rate < 1, `prestige ${prestige}: the default rate is a real share (got ${rate})`);
    assert(rate < previous, `prestige ${prestige}: standing makes a school more selective by default (${rate.toFixed(4)} < ${previous.toFixed(4)})`);
    previous = rate;
  }
}

console.log('admissions-pricing tests');
if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
