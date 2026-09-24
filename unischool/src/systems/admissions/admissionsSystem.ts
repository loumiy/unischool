import { beautyPoolFactor } from '../estate/beauty';
import type { ClassCohorts, ClassCounts, ClassTuition, CohortCounts, FunnelFactors, GameState, SummerPayload } from '../../state/types';
import { SEMICENTENNIAL_YEAR, WEEKS_PER_YEAR } from '../../state/types';
import { cohortCounts, cohortDemandFactor, NEUTRAL_COHORT_SIGNALS, type CohortSignals, athleteBandDrag } from './cohorts';
import { clamp } from '../../math';

// The trailing-year satisfaction that drives word of mouth: the average of
// the weekly readings since last summer (accumulated by tickSatisfaction,
// reset at RESOLVE_ADMISSIONS). Falls back to the current value before any
// week has accumulated.
export function trailingYearSatisfaction(s: GameState): number {
  return s.students.satisfactionYearWeeks > 0
    ? s.students.satisfactionYearSum / s.students.satisfactionYearWeeks
    : s.students.satisfaction;
}

// ---------------------------------------------------------------------
// Admissions is a distribution-based funnel, resolved once a year in the
// summer (docs/design/admissions.md). The pool is aggregate statistics, a
// count plus top/mid/low quality bands, never individual applicants.
//
//   1. Applicant pool = f(prestige, tuition, satisfaction, dorm capacity,
//      cohort demand). Prestige grows it and shifts it toward quality;
//      tuition shrinks it and, past what prestige has earned, drives off the
//      price-sensitive bands hardest (sticker shock). Satisfaction scales it
//      as word of mouth. Housing is a floored throttle on its size, never a
//      gate. Cohort demand (cohorts.ts) adds seven audiences, each pulled by
//      a different investment.
//   2. The player chooses the admit rate; admitRate(prestige) is only the
//      slider's opening position. The skim takes that share best band first.
//   3. The class is the admits (no yield step), clipped from the bottom band
//      up to the seats left (instructionCapacity.ts's intakeCeiling). The
//      ceiling caps enrollment, never the pool.
//   4. Each class pays its own price (financeSystem.ts's
//      annualTuitionBilled); this funnel prices one class.
//
// projectAdmissions is pure: the UI previews with it, the reducer commits
// with it.
// ---------------------------------------------------------------------

// =====================================================================
// Demand tuning. Enrollment is earned: the class grows only by growing
// prestige, satisfaction and price competitiveness, so beds built ahead of
// demand sit empty and cost money.
// =====================================================================

// The quality-mix curves sit at their baseline at PRESTIGE_REFERENCE and
// zero tuition.
const PRESTIGE_REFERENCE = 50;      // "average" prestige
const TUITION_REFERENCE = 20_000;   // price scale the quality-mix shift uses

// Applicant volume: a logistic in prestige, discounted by price and housing.
// Steep through the low-middle range, so a founding school (prestige ~50)
// draws a couple of thousand and twenty points later several times that;
// that multiplier is the growth loop's payoff.
const APPLICANT_VOLUME_CEILING = 260_000;   // asymptotic max pool size, approached only near max prestige
const APPLICANT_VOLUME_MIDPOINT = 103;      // prestige at which the pool sits at half the ceiling
const APPLICANT_VOLUME_STEEPNESS = 0.069;   // curve steepness around the midpoint

// Capacity factor: the one place dorm space touches admissions. Without an
// investment-linked throttle a school that builds nothing still grows
// indefinitely. A commuter school still draws a real pool (the floor), and
// beds past the reference buy nothing further.
const CAPACITY_FACTOR_FLOOR = 0.35;      // a school with zero dorms still draws this share of the "full" pool
const CAPACITY_FACTOR_REFERENCE = 6_000; // beds at which the factor reaches 1.0 — matches prestigeSystem.ts's own admissions-scale reference
function capacityFactor(capacity: number): number {
  return CAPACITY_FACTOR_FLOOR + (1 - CAPACITY_FACTOR_FLOOR) * clamp(capacity / CAPACITY_FACTOR_REFERENCE, 0, 1);
}

// Price tolerance: what the school can charge before demand falls away. It
// rises with prestige, which makes the loop pay (breadth -> prestige ->
// pricing power -> revenue) and stops "tuition to the ceiling" from
// trivializing year one. With PRICE_SENSITIVITY 1.0 the revenue-maximizing
// price is exactly the tolerance.
const PRICE_TOLERANCE_BASE = 5_500;             // what a school with no reputation at all can charge
const PRICE_TOLERANCE_PER_PRESTIGE_POINT = 240; // added per point of prestige
const PRICE_SENSITIVITY = 1.0;                  // applicants ~ exp(-sensitivity x netPrice/tolerance)

// Sticker shock: price moves who applies, not just how many. Past the
// tolerance, the low and mid bands self-select away far harder than the top
// ("undermatching"). Applied as exp(-rate × overreach), where overreach is
// how far tuition sits past priceTolerance as a fraction of it; no shock at
// or under tolerance.
const STICKER_SHOCK_RATE: Record<QualityBand, number> = { top: 0.05, mid: 0.35, low: 0.65 };

// Word of mouth: satisfaction's one mechanical effect on demand, applied
// once a year in the funnel. Deviation from WORD_OF_MOUTH_NEUTRAL is
// normalized against the room on that side, so STRENGTH is the maximum swing
// (pool × (1 ± STRENGTH) at 100 or 0). It cannot spiral: satisfaction is
// floored by ATTRIBUTE_SCORE_FLOOR, so the multiplier bottoms out near 0.63.
const WORD_OF_MOUTH_NEUTRAL = 70;    // satisfaction score with no effect on demand — matches the founding value
const WORD_OF_MOUTH_STRENGTH = 0.60; // max fractional change to the pool: +60% at satisfaction 100, -60% at 0

// Admit rate: what the slider opens at, what a founding save is seeded with
// and what a migrated save resets to. A decreasing logistic, so standing is
// what lets a school be selective. It is the share of the pool that ends up
// on campus (there is no yield), fitted so a school taking the default gets
// a realistic class from prestige 50 up. Admitting deep is paid for in
// incoming quality, since the skim runs best band first.
const ADMIT_RATE_CEILING = 0.38;    // at zero/negative prestige — a brand-new school keeps a good share of the small pool it draws
const ADMIT_RATE_FLOOR = 0.055;     // the most selective a school can ever be, at the very top of the prestige scale
const ADMIT_RATE_MIDPOINT = 100;    // prestige at which the rate sits halfway between floor and ceiling
const ADMIT_RATE_STEEPNESS = 0.06;  // curve steepness around the midpoint

export function admitRate(prestige: number): number {
  return ADMIT_RATE_FLOOR + (ADMIT_RATE_CEILING - ADMIT_RATE_FLOOR) /
    (1 + Math.exp(ADMIT_RATE_STEEPNESS * (prestige - ADMIT_RATE_MIDPOINT)));
}

// --- Quality distribution: fractions of the pool in each band ---
// Base mix at reference conditions; must sum to 1. Prestige shifts mass up
// into the top band; tuition shifts mass down into the low tail.
const QUALITY_BAND_BASE = { top: 0.20, mid: 0.50, low: 0.30 };
const QUALITY_BAND_FLOOR = 0.05;             // no band ever fully vanishes
const PRESTIGE_QUALITY_SHIFT = 0.35;         // mass moved top<-low per unit of (prestige-ref)/ref
const TUITION_QUALITY_SHIFT = 0.25;          // mass moved top->low per unit of tuition/ref

// 0..100 per band, used only to average the enrolled class's quality for
// prestige.
const QUALITY_BAND_SCORE = { top: 90, mid: 55, low: 20 };

type QualityBand = 'top' | 'mid' | 'low';

// The emergent outcome of the funnel for a given policy.
export interface AdmissionsProjection {
  applicants: number;          // total applicant pool, after word of mouth, cohort demand, AND sticker shock
  wordOfMouthMultiplier: number; // satisfaction's multiplier on the pool (1.0 = neutral) — see WORD_OF_MOUTH_STRENGTH
  // The blended cohort-demand multiplier (cohorts.ts's cohortDemandFactor).
  cohortDemandMultiplier: number;
  // Realized applicants over the pool with no sticker shock (1.0 = none).
  stickerShockMultiplier: number;
  admits: number;              // skimmed top band first, clipped to the seats left
  admitRate: number;           // admits / applicants — below the chosen rate if a thin band ran out or the ceiling clipped
  // The intake cap given (instructionCapacity.ts's intakeCeiling), and
  // whether the class was clipped to it from the bottom band up.
  seatsLeft: number;
  capped: boolean;
  enrolled: number;            // the incoming class, which IS the admits
  avgIncomingQuality: number;  // 0..100 weighted-average quality of the enrolled class — an input to prestige
  // The enrolled class's cohort counts, summing to `enrolled`, which
  // RESOLVE_ADMISSIONS records and never recomputes (types.ts's ClassCohorts).
  enrolledCohorts: CohortCounts;
  // The factors the pool is the product of (types.ts's FunnelFactors), so the
  // reveal can compare them with last year's.
  factors: FunnelFactors;
}

// Exported so the admissions modal can show what tuition is judged against.
export function priceTolerance(prestige: number): number {
  return PRICE_TOLERANCE_BASE + PRICE_TOLERANCE_PER_PRESTIGE_POINT * Math.max(prestige, 0);
}

// A price relative to priceTolerance, bucketed so the tuition input can be
// styled by it (InterruptModal.tsx).
export type PriceTier = 'bargain' | 'fair' | 'expensive' | 'reckless';
const PRICE_TIER_FAIR_MAX = 1.15;      // at/under tolerance x this: reads as fair, not just "not a bargain"
const PRICE_TIER_EXPENSIVE_MAX = 1.6;  // over this: reckless, not just pricey
const PRICE_TIER_BARGAIN_MAX = 0.7;    // at/under tolerance x this: a genuine bargain, not just fair

export function priceTier(price: number, tolerance: number): PriceTier {
  const ratio = tolerance > 0 ? Math.max(price, 0) / tolerance : Infinity;
  if (ratio <= PRICE_TIER_BARGAIN_MAX) return 'bargain';
  if (ratio <= PRICE_TIER_FAIR_MAX) return 'fair';
  if (ratio <= PRICE_TIER_EXPENSIVE_MAX) return 'expensive';
  return 'reckless';
}

// Applicant volume as its three factors, kept apart so the reveal can report
// each one's year-over-year move; the funnel reads their product.
function applicantVolumeParts(prestige: number, price: number, capacity: number): Pick<FunnelFactors, 'prestigePool' | 'priceFactor' | 'capacityFactor'> {
  const prestigePool = APPLICANT_VOLUME_CEILING /
    (1 + Math.exp(-APPLICANT_VOLUME_STEEPNESS * (prestige - APPLICANT_VOLUME_MIDPOINT)));
  const priceFactor = Math.exp(-PRICE_SENSITIVITY * Math.max(price, 0) / priceTolerance(prestige));
  return { prestigePool, priceFactor, capacityFactor: capacityFactor(capacity) };
}

// 1.0 at WORD_OF_MOUTH_NEUTRAL, 1 ± WORD_OF_MOUTH_STRENGTH at 100 and 0.
function wordOfMouthFactor(satisfaction: number): number {
  const s = clamp(satisfaction, 0, 100);
  const deviation = s >= WORD_OF_MOUTH_NEUTRAL
    ? (s - WORD_OF_MOUTH_NEUTRAL) / (100 - WORD_OF_MOUTH_NEUTRAL)
    : (s - WORD_OF_MOUTH_NEUTRAL) / WORD_OF_MOUTH_NEUTRAL;
  return 1 + WORD_OF_MOUTH_STRENGTH * deviation;
}

// The quality mix (top/mid/low, summing to 1). `drag` is the athlete band
// drag (cohorts.ts's athleteBandDrag), taken off the top and added to the
// low; zero for every reader but the realised class.
function qualityMix(prestige: number, tuition: number, drag: number = 0): Record<QualityBand, number> {
  const shift =
    PRESTIGE_QUALITY_SHIFT * (prestige - PRESTIGE_REFERENCE) / PRESTIGE_REFERENCE -
    TUITION_QUALITY_SHIFT * (Math.max(tuition, 0) / TUITION_REFERENCE) -
    drag;
  const top = clamp(QUALITY_BAND_BASE.top + shift, QUALITY_BAND_FLOOR, 1);
  const low = clamp(QUALITY_BAND_BASE.low - shift, QUALITY_BAND_FLOOR, 1);
  const mid = QUALITY_BAND_BASE.mid;
  const sum = top + mid + low;
  return { top: top / sum, mid: mid / sum, low: low / sum };
}

// For the balance harness's admit-rate probes: since the skim runs best band
// first, this is the rate at which incoming quality saturates.
export function topBandShare(prestige: number, tuition: number): number {
  return qualityMix(prestige, tuition).top;
}

// Per-band self-selection away from an overreaching price (STICKER_SHOCK_RATE).
function stickerShockFactor(prestige: number, tuition: number, band: QualityBand): number {
  const overreach = Math.max(0, Math.max(tuition, 0) / priceTolerance(prestige) - 1);
  return Math.exp(-STICKER_SHOCK_RATE[band] * overreach);
}

// ---------------------------------------------------------------------
// The class advance, pure because two callers must never disagree:
// RESOLVE_ADMISSIONS commits it and consequences.ts previews it on a copy.
// Prices and cohort mixes move with their classes; the graduating seniors
// take theirs with them.
// ---------------------------------------------------------------------
export interface EnrolledBody {
  classes: ClassCounts;
  tuitionByClass: ClassTuition;
  cohortsByClass: ClassCohorts;
}

export interface IncomingClass {
  count: number;
  price: number;
  cohorts: CohortCounts;
}

export interface AdvancedBody {
  classes: ClassCounts;
  tuitionByClass: ClassTuition;
  cohortsByClass: ClassCohorts;
  graduating: number; // the seniors who just left
  notReturning: number; // students the three staying classes lost to attrition (see attritionRate)
}

// Attrition: below ATTRITION_SATISFACTION_LINE each class loses a share at
// the summer, linearly up to ATTRITION_MAX_RATE at ATTRITION_FLOOR_SATISFACTION,
// read off the year's average satisfaction. The summer logs it on its own
// line so a smaller school is never unexplained.
export const ATTRITION_SATISFACTION_LINE = 50;
export const ATTRITION_FLOOR_SATISFACTION = 30;
export const ATTRITION_MAX_RATE = 0.08;

export function attritionRate(satisfaction: number): number {
  if (satisfaction >= ATTRITION_SATISFACTION_LINE) return 0;
  const depth = (ATTRITION_SATISFACTION_LINE - satisfaction) / (ATTRITION_SATISFACTION_LINE - ATTRITION_FLOOR_SATISFACTION);
  return ATTRITION_MAX_RATE * clamp(depth, 0, 1);
}

// A class's mix shrunk to exactly `total` by largest remainders, so the
// counts still sum to the head count (test/enrolled-cohorts.test.ts).
function shrinkCohorts(counts: CohortCounts, total: number): CohortCounts {
  const keys = Object.keys(counts) as Array<keyof CohortCounts>;
  const before = keys.reduce((sum, key) => sum + counts[key], 0);
  if (before <= 0 || total >= before) return { ...counts };
  const scaled = keys.map((key) => ({ key, exact: (counts[key] * total) / before }));
  const out = { ...counts };
  let placed = 0;
  for (const { key, exact } of scaled) { out[key] = Math.floor(exact); placed += out[key]; }
  scaled
    .sort((a, b) => (b.exact - Math.floor(b.exact)) - (a.exact - Math.floor(a.exact)))
    .slice(0, total - placed)
    .forEach(({ key }) => { out[key] += 1; });
  return out;
}

export function advanceClasses(body: EnrolledBody, incoming: IncomingClass, attrition = 0): AdvancedBody {
  const { classes, tuitionByClass, cohortsByClass } = body;
  // Staying classes lose their share before moving up; seniors leave anyway
  // and the incoming class has had no year to leave over.
  const keep = 1 - clamp(attrition, 0, 1);
  const stayFreshman = Math.round(classes.freshman * keep);
  const staySophomore = Math.round(classes.sophomore * keep);
  const stayJunior = Math.round(classes.junior * keep);
  return {
    graduating: classes.senior,
    notReturning: (classes.freshman - stayFreshman) + (classes.sophomore - staySophomore) + (classes.junior - stayJunior),
    classes: {
      senior: stayJunior,
      junior: staySophomore,
      sophomore: stayFreshman,
      freshman: incoming.count,
    },
    tuitionByClass: {
      senior: tuitionByClass.junior,
      junior: tuitionByClass.sophomore,
      sophomore: tuitionByClass.freshman,
      freshman: incoming.price,
    },
    cohortsByClass: {
      senior: shrinkCohorts(cohortsByClass.junior, stayJunior),
      junior: shrinkCohorts(cohortsByClass.sophomore, staySophomore),
      sophomore: shrinkCohorts(cohortsByClass.freshman, stayFreshman),
      freshman: incoming.cohorts,
    },
  };
}

// Pure funnel resolution. `capacity` feeds applicant volume only, and
// `enrolled` is the incoming freshman class, not the whole body.
export function projectAdmissions(
  prestige: number,
  tuition: number,
  capacity: number,
  satisfaction: number,
  cohortSignals: CohortSignals = NEUTRAL_COHORT_SIGNALS,
  // Defaulted to the curve's value, so callers without a slider (the demand
  // system's what-if, the pricing tests) read the usual rate.
  chosenAdmitRate: number = admitRate(prestige),
  // Infinite by default, for the same callers.
  seatsLeft: number = Infinity,
): AdmissionsProjection {
  const tolerance = priceTolerance(prestige);
  const wordOfMouth = wordOfMouthFactor(satisfaction);
  const cohortDemand = cohortDemandFactor(cohortSignals, tolerance, tuition);
  const volume = applicantVolumeParts(prestige, Math.max(tuition, 0), capacity);
  // Campus beauty's swing, capped (systems/estate/beauty.ts).
  const beauty = beautyPoolFactor(cohortSignals.beauty);
  // What the guidebooks say (systems/identity/tags.ts).
  const tags = cohortSignals.tagPool ?? 1;
  const rawApplicants = volume.prestigePool * volume.priceFactor * volume.capacityFactor * wordOfMouth * cohortDemand * beauty * tags;
  const mix = qualityMix(prestige, tuition, athleteBandDrag(cohortSignals, tolerance, tuition));

  const bands: QualityBand[] = ['top', 'mid', 'low'];
  // Sticker shock removes families who never applied, per band; `applicants`
  // is the realized pool everything downstream reads.
  const pool: Record<QualityBand, number> = { top: 0, mid: 0, low: 0 };
  for (const band of bands) {
    pool[band] = rawApplicants * mix[band] * stickerShockFactor(prestige, tuition, band);
  }
  const applicants = pool.top + pool.mid + pool.low;
  const stickerShockMultiplier = rawApplicants > 0 ? applicants / rawApplicants : 1;

  // Skim the chosen share of the pool, best band first. A thin band can
  // leave admits short, which is why admitRate is reported as
  // admits/applicants.
  let remainingAdmits = applicants * clamp(chosenAdmitRate, 0, 1);
  const admitsByBand: Record<QualityBand, number> = { top: 0, mid: 0, low: 0 };
  for (const band of bands) {
    if (remainingAdmits <= 0) break;
    const take = Math.min(pool[band], remainingAdmits);
    admitsByBand[band] = take;
    remainingAdmits -= take;
  }
  // The ceiling caps enrollment, clipped from the bottom band up: a school
  // that must turn people away turns away its weakest admits.
  let over = Math.max(0, admitsByBand.top + admitsByBand.mid + admitsByBand.low - Math.max(0, seatsLeft));
  const capped = over > 0;
  for (const band of [...bands].reverse()) {
    if (over <= 0) break;
    const cut = Math.min(admitsByBand[band], over);
    admitsByBand[band] -= cut;
    over -= cut;
  }
  const admits = admitsByBand.top + admitsByBand.mid + admitsByBand.low;

  const enrolledRaw = admits;
  const enrolled = Math.round(enrolledRaw);

  const avgIncomingQuality = enrolledRaw > 0
    ? clamp((admitsByBand.top * QUALITY_BAND_SCORE.top +
       admitsByBand.mid * QUALITY_BAND_SCORE.mid +
       admitsByBand.low * QUALITY_BAND_SCORE.low) / enrolledRaw + (cohortSignals.tagQuality ?? 0), 0, 100)
    : 0;

  return {
    applicants: Math.round(applicants),
    wordOfMouthMultiplier: wordOfMouth,
    cohortDemandMultiplier: cohortDemand,
    stickerShockMultiplier,
    admits: Math.round(admits),
    admitRate: applicants > 0 ? admits / applicants : 0,
    seatsLeft,
    capped,
    enrolled,
    avgIncomingQuality,
    // Computed here, not in the reducer, so the consequences.ts preview and
    // the commit apportion identically.
    enrolledCohorts: cohortCounts(cohortSignals, tolerance, tuition, enrolled),
    factors: { ...volume, wordOfMouth, cohortDemand, stickerShock: stickerShockMultiplier, beauty, tags },
  };
}

// Enrollment is set once a year by the funnel and holds; this tick only
// opens the summer.
export function tickAdmissions(s: GameState): void {
  // Summer: raise the year's fixed stop (types.ts's SummerPayload). The
  // reducer holds the clock; the last beat's RESOLVE_ADMISSIONS runs the
  // funnel and advances the year. The payload carries last year's levers so
  // an unchanged strategy is a click-through.
  if (s.clock.week === WEEKS_PER_YEAR && !s.pendingInterrupt) {
    const payload: SummerPayload = {
      beat: 0,
      tuition: s.finance.listedTuition,
      admitRate: s.students.admitRate,
    };
    // The fiftieth summer opens on the Final Report, only while it is
    // unwritten so a resumed save is not told twice.
    if (s.clock.year === SEMICENTENNIAL_YEAR && !s.ending) payload.final = true;
    s.pendingInterrupt = { type: 'summer', payload };
  }
}
