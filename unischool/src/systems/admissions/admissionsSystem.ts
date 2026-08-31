import type { GameState } from '../../state/types';
import { WEEKS_PER_YEAR } from '../../state/types';

// ---------------------------------------------------------------------
// Admissions is a distribution-based funnel, resolved once a year in the
// summer interrupt (see README's "Admissions: an annual summer decision").
// The applicant pool is modeled purely as aggregate statistics — a total
// applicant count plus a coarse quality distribution (top / mid / low
// bands) — never as individual applicants.
//
// The player sets exactly two things: tuition and an average financial-aid
// percentage. Everything else is emergent:
//
//   1. Applicant pool = f(prestige, tuition, satisfaction). Higher prestige
//      draws more applicants and shifts the distribution toward higher
//      quality; higher tuition shrinks the pool and fattens the low-quality
//      tail; and current student satisfaction scales the whole pool up or
//      down as word of mouth (see WORD_OF_MOUTH_STRENGTH below) — that is
//      satisfaction's one mechanical consequence, applied here once a year
//      rather than as a weekly drip.
//   2. Admissions skims from the top of the quality distribution, admitting
//      enough of each band — most selective first — that EXPECTED
//      enrollment (admits x that band's yield) fills capacity, not raw
//      admit headcount. A real admissions office over-admits to compensate
//      for anticipated no-shows; skimming to capacity on headcount alone
//      would systematically under-fill the class whenever yield runs well
//      under 100%. The player sets no selectivity and no target enrollment
//      — selectivity is emergent, reported as the admit rate (admitted /
//      applicants), and it rises (less selective) exactly when yield is
//      weak, same as it would for a real school leaning on a big applicant
//      pool it can't actually convert.
//   3. Aid drives yield: not every admit enrolls. Yield rises with aid
//      (diminishing returns) and with prestige, and falls for higher-
//      quality admits (who are more price-sensitive and cost more aid to
//      win). Enrolled class = yield x admits — capped by capacity only as
//      a rounding safety net, since admits are already sized to target it.
//   4. Net tuition per enrolled student = tuition x (1 - aid); that is
//      what flows into finance (see financeSystem.ts).
//
// Every curve parameter is a named constant here so balancing never means
// hunting for magic numbers. projectAdmissions() below is pure: the UI
// calls it to preview the consequences of the two settings live, and the
// reducer calls it on resolve to commit the enrolled class for the year.
// ---------------------------------------------------------------------

// Reference points the quality/yield curves below are centered on: at
// PRESTIGE_REFERENCE and zero tuition they sit at their baseline. (Applicant
// *volume* no longer uses either reference — see APPLICANT_VOLUME_MIDPOINT
// and APPLICANT_VOLUME_TUITION_REFERENCE below, tuned independently.)
const PRESTIGE_REFERENCE = 50;      // "average" prestige
const TUITION_REFERENCE = 20_000;   // price scale the quality-mix shift uses

// --- Applicant volume: a logistic (S-curve) in prestige, then discounted by
// price. A real applicant pool isn't an unbounded power of prestige — it
// rises fast through the middle of the prestige range and tapers off
// approaching a ceiling near the very top, the way a handful of schools
// nationally pull in six-figure applicant counts while most schools don't.
// Capacity plays NO role here — applicant volume and capacity (dorms; see
// campusData.ts) are deliberately independent levers, so a small, elite,
// dorm-constrained school and a huge, low-selectivity one can both draw a
// big pool; what differs is how much of it they can admit, which is exactly
// where selectivity should come from.
//
// Tuned (see the PR notes for the worked examples) against four rough real-
// world benchmarks — a highly selective private near max prestige at sticker
// tuition should land close to a ~4% admit rate against a several-thousand-
// seat capacity; a mid-prestige private near 50% tuition discount-adjusted
// price should land close to 50%; a mid-high prestige, high-tuition school
// should land in the high-single-digits. A low/mid-prestige school with a
// huge dorm chain and low tuition will NOT reproduce a big, high-acceptance
// applicant pool from prestige/price alone — that also draws heavily on
// athletics and campus life, which aren't modeled yet (see README's
// roadmap), so admit rate saturates near 100% there instead. That's an
// accepted, deliberate gap, not a bug.
const APPLICANT_VOLUME_CEILING = 260_000;   // asymptotic max pool size, approached only near max prestige
const APPLICANT_VOLUME_MIDPOINT = 108;      // prestige at which the pool sits at half the ceiling
const APPLICANT_VOLUME_STEEPNESS = 0.083;   // curve steepness around the midpoint
const APPLICANT_VOLUME_TUITION_REFERENCE = 30_000; // price scale the volume discount uses
const PRICE_SENSITIVITY = 0.18;             // applicants ~ exp(-sensitivity x tuition/ref); higher tuition => fewer applicants

// --- Word of mouth: current student satisfaction scales the applicant pool.
// This is satisfaction's ONE mechanical consequence (the weekly attrition
// trickle it used to drive is gone): a miserable student body talks the
// school down and next cycle's pool shrinks; a happy one talks it up and
// the pool grows. It is applied once a year, inside the funnel, so the
// effect is felt at the summer decision alongside prestige and price
// rather than as an invisible weekly drip.
//
// WORD_OF_MOUTH_NEUTRAL is the satisfaction score that neither helps nor
// hurts — it matches the founding satisfaction in state/actions.ts, so a
// school that holds steady at its starting mood sees no word-of-mouth
// effect at all. Deviation from it is normalized against the room
// available on that side (0..NEUTRAL below, NEUTRAL..100 above), so
// WORD_OF_MOUTH_STRENGTH reads directly as the maximum fractional swing:
// at satisfaction 100 the pool is (1 + STRENGTH)x, at satisfaction 0 it is
// (1 - STRENGTH)x. This single constant is the tuning knob for how much
// student happiness matters to demand.
const WORD_OF_MOUTH_NEUTRAL = 70;    // satisfaction score with no effect on demand — matches the founding value
const WORD_OF_MOUTH_STRENGTH = 0.35; // max fractional change to the pool: +35% at satisfaction 100, -35% at 0

// --- Quality distribution: fractions of the pool in each band ---
// Base mix at reference conditions; must sum to 1. Prestige shifts mass up
// into the top band; tuition shifts mass down into the low tail.
const QUALITY_BAND_BASE = { top: 0.20, mid: 0.50, low: 0.30 };
const QUALITY_BAND_FLOOR = 0.05;             // no band ever fully vanishes
const PRESTIGE_QUALITY_SHIFT = 0.35;         // mass moved top<-low per unit of (prestige-ref)/ref
const TUITION_QUALITY_SHIFT = 0.25;          // mass moved top->low per unit of tuition/ref

// --- Yield: fraction of admits in a band who actually enroll ---
const YIELD_BASE = 0.30;                     // floor yield before aid/prestige/quality adjustments
const AID_YIELD_STRENGTH = 0.45;             // most yield aid can add, approached with diminishing returns
const AID_YIELD_DECAY = 3.0;                 // curvature of the diminishing-returns aid response: 1 - exp(-decay x aid)
const PRESTIGE_YIELD_STRENGTH = 0.25;        // yield added per unit of (prestige-ref)/ref, for free
// Higher-quality admits are more price-sensitive, so they yield lower at a
// given aid level (and cost more aid to win): the top band pays the biggest
// yield penalty, the low band none.
const YIELD_QUALITY_PENALTY = { top: 0.22, mid: 0.10, low: 0.0 };

// A 0..100 quality score per band, used only to summarize the enrolled
// class's average incoming quality for prestige (see prestigeSystem.ts) —
// the funnel itself never needed a scalar score before, only band
// fractions and per-band yield.
const QUALITY_BAND_SCORE = { top: 90, mid: 55, low: 20 };

type QualityBand = 'top' | 'mid' | 'low';

// The emergent outcome of the funnel for a given policy. Everything here is
// a displayed consequence of the two inputs (tuition, aid), not an input.
export interface AdmissionsProjection {
  applicants: number;          // total applicant pool, after word of mouth
  wordOfMouthMultiplier: number; // satisfaction's multiplier on the pool (1.0 = neutral) — see WORD_OF_MOUTH_STRENGTH
  admits: number;              // admitted, after skimming to capacity
  admitRate: number;           // admits / applicants — the emergent selectivity (lower = more selective)
  yieldRate: number;           // enrolled / admits — the emergent yield
  enrolled: number;            // enrolled class = yield x admits, capped by capacity
  avgIncomingQuality: number;  // 0..100 weighted-average quality of the enrolled class — an input to prestige
  netTuitionPerStudent: number; // tuition x (1 - aid): what actually flows into finance
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

// Total applicant count as a function of prestige and tuition. See the
// constants above for the shape and the numbers this is tuned against.
function applicantVolume(prestige: number, tuition: number): number {
  const prestigePool = APPLICANT_VOLUME_CEILING /
    (1 + Math.exp(-APPLICANT_VOLUME_STEEPNESS * (prestige - APPLICANT_VOLUME_MIDPOINT)));
  const tuitionFactor = Math.exp(-PRICE_SENSITIVITY * Math.max(tuition, 0) / APPLICANT_VOLUME_TUITION_REFERENCE);
  return prestigePool * tuitionFactor;
}

// Word-of-mouth multiplier on the applicant pool, from current student
// satisfaction. 1.0 at WORD_OF_MOUTH_NEUTRAL, rising to 1 +
// WORD_OF_MOUTH_STRENGTH at satisfaction 100 and falling to 1 -
// WORD_OF_MOUTH_STRENGTH at satisfaction 0.
function wordOfMouthFactor(satisfaction: number): number {
  const s = clamp(satisfaction, 0, 100);
  const deviation = s >= WORD_OF_MOUTH_NEUTRAL
    ? (s - WORD_OF_MOUTH_NEUTRAL) / (100 - WORD_OF_MOUTH_NEUTRAL)
    : (s - WORD_OF_MOUTH_NEUTRAL) / WORD_OF_MOUTH_NEUTRAL;
  return 1 + WORD_OF_MOUTH_STRENGTH * deviation;
}

// The quality mix (top/mid/low fractions, summing to 1) for the pool.
function qualityMix(prestige: number, tuition: number): Record<QualityBand, number> {
  const shift =
    PRESTIGE_QUALITY_SHIFT * (prestige - PRESTIGE_REFERENCE) / PRESTIGE_REFERENCE -
    TUITION_QUALITY_SHIFT * (Math.max(tuition, 0) / TUITION_REFERENCE);
  const top = clamp(QUALITY_BAND_BASE.top + shift, QUALITY_BAND_FLOOR, 1);
  const low = clamp(QUALITY_BAND_BASE.low - shift, QUALITY_BAND_FLOOR, 1);
  const mid = QUALITY_BAND_BASE.mid;
  const sum = top + mid + low;
  return { top: top / sum, mid: mid / sum, low: low / sum };
}

// Yield for one quality band: aid (diminishing returns) and prestige lift
// it, higher band quality drags it down.
function bandYield(prestige: number, aid: number, band: QualityBand): number {
  const aidTerm = AID_YIELD_STRENGTH * (1 - Math.exp(-AID_YIELD_DECAY * clamp(aid, 0, 1)));
  const prestigeTerm = PRESTIGE_YIELD_STRENGTH * (prestige - PRESTIGE_REFERENCE) / PRESTIGE_REFERENCE;
  return clamp(YIELD_BASE + aidTerm + prestigeTerm - YIELD_QUALITY_PENALTY[band], 0, 1);
}

// Pure funnel resolution. Given the school's prestige, capacity, and current
// student satisfaction plus the player's two levers (tuition, aid), returns
// the full set of emergent outcomes. No individual applicants are modeled —
// only band aggregates.
export function projectAdmissions(
  prestige: number,
  tuition: number,
  aid: number,
  capacity: number,
  satisfaction: number,
): AdmissionsProjection {
  const wordOfMouth = wordOfMouthFactor(satisfaction);
  const applicants = applicantVolume(prestige, tuition) * wordOfMouth;
  const mix = qualityMix(prestige, tuition);
  const pool: Record<QualityBand, number> = {
    top: applicants * mix.top,
    mid: applicants * mix.mid,
    low: applicants * mix.low,
  };

  // Yield each band up front — quality changes price sensitivity, and the
  // admit-sizing pass below needs each band's yield to know how many
  // admits it takes to fill a given amount of capacity.
  const bands: QualityBand[] = ['top', 'mid', 'low'];
  const yieldByBand: Record<QualityBand, number> = {
    top: bandYield(prestige, aid, 'top'),
    mid: bandYield(prestige, aid, 'mid'),
    low: bandYield(prestige, aid, 'low'),
  };

  // Skim from the top of the distribution, admitting enough of each band
  // that its EXPECTED enrollment (admits x yield) fills the capacity that's
  // still remaining after the bands above it — not enough that its raw
  // admit headcount does. This is what makes selectivity react correctly
  // to yield: a school whose admits mostly don't show up ends up admitting
  // (and reporting) a much higher admit rate than one with the same
  // capacity and applicant pool but strong yield, exactly as a real
  // admissions office over-admits to compensate for anticipated no-shows.
  let remainingCapacity = Math.max(capacity, 0);
  const admitsByBand: Record<QualityBand, number> = { top: 0, mid: 0, low: 0 };
  for (const band of bands) {
    if (remainingCapacity <= 0) break;
    const bandYieldRate = yieldByBand[band];
    // A band yielding literally nobody can never help fill the class —
    // admitting more of it would only inflate the admit count for zero
    // enrollment benefit, so skip it rather than admitting its whole pool
    // for nothing.
    if (bandYieldRate <= 0) continue;
    const neededAdmits = remainingCapacity / bandYieldRate;
    const take = Math.min(pool[band], neededAdmits);
    admitsByBand[band] = take;
    remainingCapacity -= take * bandYieldRate;
  }
  const admits = admitsByBand.top + admitsByBand.mid + admitsByBand.low;

  const enrolledByBand: Record<QualityBand, number> = {
    top: admitsByBand.top * yieldByBand.top,
    mid: admitsByBand.mid * yieldByBand.mid,
    low: admitsByBand.low * yieldByBand.low,
  };
  const enrolledRaw = enrolledByBand.top + enrolledByBand.mid + enrolledByBand.low;
  const enrolled = Math.min(Math.max(capacity, 0), Math.round(enrolledRaw));

  // Average incoming quality is a weighted mean over the (pre-rounding)
  // enrolled mix, not the admit mix — it describes who actually shows up.
  const avgIncomingQuality = enrolledRaw > 0
    ? (enrolledByBand.top * QUALITY_BAND_SCORE.top +
       enrolledByBand.mid * QUALITY_BAND_SCORE.mid +
       enrolledByBand.low * QUALITY_BAND_SCORE.low) / enrolledRaw
    : 0;

  return {
    applicants: Math.round(applicants),
    wordOfMouthMultiplier: wordOfMouth,
    admits: Math.round(admits),
    admitRate: applicants > 0 ? admits / applicants : 0,
    yieldRate: admits > 0 ? enrolled / admits : 0,
    enrolled,
    avgIncomingQuality,
    netTuitionPerStudent: Math.round(tuition * (1 - clamp(aid, 0, 1))),
  };
}

// Enrollment is set once a year by the funnel above and then holds for the
// year: there is no weekly attrition trickle any more, and this tick writes
// nothing and logs nothing on an ordinary week. Dissatisfaction's teeth are
// in demand instead — see wordOfMouthFactor above, applied at the next
// cycle's RESOLVE_ADMISSIONS.
export function tickAdmissions(s: GameState): void {
  // Summer: pause for the once-a-year admissions decision (see README's
  // "Admissions: an annual summer decision"). The reducer's TICK case sees
  // pendingInterrupt getting set here and holds the clock at this week;
  // RESOLVE_ADMISSIONS (in reducer.ts) runs the funnel and advances into
  // the new year. The payload carries the two sticky inputs so an unchanged
  // strategy is a one-click continue.
  if (s.clock.week === WEEKS_PER_YEAR && !s.pendingInterrupt) {
    s.pendingInterrupt = {
      type: 'admissions',
      payload: {
        tuition: s.finance.tuitionPerStudent,
        financialAidRate: s.admissions.financialAidRate,
      },
    };
  }
}
