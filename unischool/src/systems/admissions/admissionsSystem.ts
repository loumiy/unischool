import type { ClassCohorts, ClassCounts, ClassTuition, CohortCounts, FunnelFactors, GameState, SummerPayload } from '../../state/types';
import { SEMICENTENNIAL_YEAR, WEEKS_PER_YEAR } from '../../state/types';
import { cohortCounts, cohortDemandFactor, NEUTRAL_COHORT_SIGNALS, type CohortSignals, athleteBandDrag } from './cohorts';
import { clamp } from '../../math';

// The trailing-year satisfaction that drives word of mouth: the average of
// every weekly satisfaction reading accumulated since last summer (see
// satisfactionSystem.ts's tickSatisfaction, which does the accumulating, and
// reducer.ts's RESOLVE_ADMISSIONS, which reads this then resets the
// accumulator). Falls back to the current headline satisfaction before any
// week has accumulated, so a founding year and a freshly loaded save both
// read a sensible value rather than 0/0.
export function trailingYearSatisfaction(s: GameState): number {
  return s.students.satisfactionYearWeeks > 0
    ? s.students.satisfactionYearSum / s.students.satisfactionYearWeeks
    : s.students.satisfaction;
}

// ---------------------------------------------------------------------
// Admissions is a distribution-based funnel, resolved once a year in the
// summer interrupt (see docs/design/admissions.md). The applicant pool is
// modeled purely as aggregate statistics — a total applicant count plus a
// coarse quality distribution (top / mid / low bands) — never as
// individual applicants.
//
// There is ONE admissions ceiling, and it is not beds (Plan 15's PR E):
// the freshman class cannot exceed the seats the housed catalogue has left
// after graduation (instructionCapacity.ts's intakeCeiling, passed in as
// projectAdmissions's `seatsLeft`). Nothing ever skims TOWARD it — it
// clips the class from the bottom band up once the chosen share overruns
// it — and it caps enrollment, never the pool. Students
// are commuters unless the school has built them a dorm bed (see
// campusData.ts and satisfactionSystem.ts's Housing attribute) — housing is
// an amenity that feeds satisfaction, never an admissions gate. Dorm space
// still touches admissions once, though, as a real (but not fatal) throttle
// per the design ask: a school that never builds any still draws a genuine
// applicant pool (see CAPACITY_FACTOR_FLOOR below), but growing that pool
// past a modest scale takes housing investment same as everything else —
// otherwise a school can grow purely on default prestige/price with zero
// commitment of any kind, which defeats the whole "growth is earned"
// premise (see financeSystem.ts's header) as surely as a hard cap would
// have, just less visibly. A school that wants to stay small still has
// price as its other lever: price itself out of its own applicant pool.
//
// The player sets exactly one thing: tuition. Everything else is emergent:
//
//   1. Applicant pool = f(prestige, tuition, satisfaction, dorm capacity,
//      cohort demand). Higher prestige draws more applicants and shifts the
//      distribution toward higher quality; higher tuition shrinks the pool
//      and fattens the low-quality tail; current student satisfaction
//      scales the whole pool up or down as word of mouth (see
//      WORD_OF_MOUTH_STRENGTH below) — that is satisfaction's one
//      mechanical consequence, applied here once a year rather than as a
//      weekly drip; and dorm capacity scales the pool toward its full size
//      as housing investment grows (see CAPACITY_FACTOR_FLOOR/
//      CAPACITY_FACTOR_REFERENCE below). A price that overreaches what the
//      school's prestige has earned (see STICKER_SHOCK_RATE below)
//      additionally self-selects away the price-sensitive bands hardest,
//      so price moves the COMPOSITION of the pool and not only its size.
//      Cohort demand (see
//      cohorts.ts) is a further, independent multiplier on the same pool:
//      seven named audiences (high achievers, pre-professional, research-
//      oriented, social, arts-focused, price-sensitive, athletes) each
//      pulled by a DIFFERENT investment — labs, established majors, clubs,
//      a fielded varsity team — so growing enrollment is never only a
//      prestige/price question.
//   2. Admit rate is the PLAYER'S SECOND DECISION (Plan 05's PR C). It is
//      still not capacity-derived — admissions skims from the top of the
//      quality distribution, taking that fraction of the applicant pool,
//      best band first — but the fraction is chosen, not computed.
//      admitRate(prestige) below is what the slider opens at: what a school
//      of this standing would normally take.
//   3. The class IS the admits. There is no yield step: what the skim
//      takes is what enrolls, with no ceiling of any kind. Admitting deeper
//      costs incoming quality, since the skim runs best band first — that
//      is the price of a bigger class, and it is paid in prestige.
//   4. What flows into finance is each CLASS's own price (see
//      financeSystem.ts's annualTuitionBilled and types.ts's
//      tuitionByClass) — this funnel prices one class, not the school.
//
// Every curve parameter is a named constant here so balancing never means
// hunting for magic numbers. projectAdmissions() below is pure: the UI
// calls it to preview the consequences of the two settings live, and the
// reducer calls it on resolve to commit the enrolled class for the year.
// ---------------------------------------------------------------------

// =====================================================================
// DEMAND TUNING. Everything the growth loop's revenue side depends on
// lives in this block. The shape being tuned for: enrollment is EARNED,
// never automatic. A school only grows its class by growing the three
// things that grow the pool — prestige (curriculum breadth, over years),
// student satisfaction (facilities, immediately) and price competitiveness
// (the annual decision) — so beds built ahead of demand sit empty and
// cost money, which is exactly the lag the pacing model is built on.
// =====================================================================

// Reference points the quality curves below are centered on: at
// PRESTIGE_REFERENCE and zero tuition they sit at their baseline. (Applicant
// *volume* no longer uses either reference — see APPLICANT_VOLUME_MIDPOINT
// and the price-tolerance block below, tuned independently.)
const PRESTIGE_REFERENCE = 50;      // "average" prestige
const TUITION_REFERENCE = 20_000;   // price scale the quality-mix shift uses

// --- Applicant volume: a logistic (S-curve) in prestige, then discounted by
// price and by housing scale. A real applicant pool isn't an unbounded power
// of prestige — it rises fast through the middle of the prestige range and
// tapers off approaching a ceiling near the very top, the way a handful of
// schools nationally pull in six-figure applicant counts while most schools
// don't.
//
// The curve is deliberately steep through the low-middle of the prestige
// range: a founding school (prestige ~50) draws a couple of thousand
// applicants, and the same school twenty prestige points later draws
// several times that. That multiplier IS the growth loop's payoff — the
// reason building out a major eventually pays for the dorm it forced.
const APPLICANT_VOLUME_CEILING = 260_000;   // asymptotic max pool size, approached only near max prestige
const APPLICANT_VOLUME_MIDPOINT = 103;      // prestige at which the pool sits at half the ceiling
const APPLICANT_VOLUME_STEEPNESS = 0.069;   // curve steepness around the midpoint

// --- Capacity factor: the one place dorm space still touches admissions,
// now that beds are no longer an enrollment ceiling. Without SOME
// investment-linked throttle, a school can grow purely on the strength of
// its founding prestige/price with no commitment of any kind — measured
// against a fast-forward where a school that builds NOTHING for 40 years
// still organically grew to five figures of enrollment and billions in
// cash, which is exactly the "growth is optional" failure mode the whole
// pacing model exists to prevent (see financeSystem.ts's header). A pure
// commuter school still draws a real, meaningful pool — most students
// everywhere commute, and this is a floor, not a wall — but investing in
// housing reads as a bigger, more credible national draw, up to a
// reference scale beyond which more beds buy nothing further: dorms are
// one input among the "other factors already baked in" here, never a
// second unbounded lever the way prestige is.
const CAPACITY_FACTOR_FLOOR = 0.35;      // a school with zero dorms still draws this share of the "full" pool
const CAPACITY_FACTOR_REFERENCE = 6_000; // beds at which the factor reaches 1.0 — matches prestigeSystem.ts's own admissions-scale reference
function capacityFactor(capacity: number): number {
  return CAPACITY_FACTOR_FLOOR + (1 - CAPACITY_FACTOR_FLOOR) * clamp(capacity / CAPACITY_FACTOR_REFERENCE, 0, 1);
}

// --- Price tolerance: what the school can charge before demand falls away,
// and the single most important connection in this file. It is NOT a fixed
// price scale: it RISES WITH PRESTIGE. A school nobody has heard of cannot
// charge elite tuition and fill a class — it prices itself out of its own
// applicant pool — while a school at the top of the rankings can charge
// several times as much and still be over-subscribed.
//
// That is what makes the loop pay: curriculum breadth -> prestige ->
// pricing power -> revenue. It is also what stops the year-1 "just set
// tuition to the ceiling" move from trivializing the early game, which is
// what a fixed price scale allowed: with PRICE_SENSITIVITY at 1.0 the
// revenue-maximizing price is exactly the tolerance below, so a founding
// school's best price is around $15k and a top-50 school's is three times
// that. There is one price to compare: what a family is quoted is what
// they pay.
const PRICE_TOLERANCE_BASE = 5_500;             // what a school with no reputation at all can charge
const PRICE_TOLERANCE_PER_PRESTIGE_POINT = 240; // added per point of prestige
const PRICE_SENSITIVITY = 1.0;                  // applicants ~ exp(-sensitivity x netPrice/tolerance)

// --- Sticker shock: price moves WHO applies, not just how many.
// applicantVolume above already scores the pool's SIZE against price. This
// is the second, band-specific half of the same response, and it is what
// ties price to the pool's COMPOSITION: a price that overreaches what the
// school's prestige has earned (see priceTolerance above) drives away the
// low and mid bands far harder than the top, so an overreaching school
// does not simply get a smaller pool — it gets a smaller pool that is
// relatively richer in the applicants least sensitive to what it charges.
//
// HISTORICAL NOTE, because the rates below were sized for a job they no
// longer do. This existed to stop "raise tuition and scholarships
// together, holding net price fixed" from being a free lunch: volume was
// scored against NET price while the band split was scored against the
// sticker, so inflating the sticker and matching it with aid only ever
// helped. Scholarships are gone (Plan 05's PR B) and sticker IS net, so
// that exploit can no longer be expressed and the rates are no longer
// tuned against it. They are kept at their sized-for-that-job values
// because the effect they produce — the undermatching shape described
// next — is real and worth having on its own, not because the exploit
// still needs closing.
//
// BAND-SPECIFIC, and deliberately so: the real phenomenon this models
// (well-documented in the higher-ed research as "undermatching") is that
// price-sensitive families self-select away from an intimidating list
// price long before anyone runs the numbers for them. A top-band family is
// less deterred (better informed, or simply richer), same as
// YIELD_QUALITY_PENALTY already treats the top band as the pickiest about
// price once admitted — so top is barely shocked at all, mid loses a real
// share, and low loses the most.
//
// Rates are the exponent's coefficient in exp(-rate x overreach), where
// overreach is how far RAW tuition sits past priceTolerance(prestige) as a
// fraction of it (0 = priced exactly at earned tolerance or under; there is
// no shock at all for a sticker the school's own standing can support).
const STICKER_SHOCK_RATE: Record<QualityBand, number> = { top: 0.05, mid: 0.35, low: 0.65 };

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
//
// Raised as part of the growth-loop pass so that the satisfaction dilution
// a new dorm causes (every ratio attribute in satisfactionSystem.ts is
// scored against CAPACITY) actually throttles the next cycle's pool —
// growing beds without growing dining/health now costs demand, not just a
// number on a panel. It CANNOT spiral: satisfaction is floored
// by ATTRIBUTE_SCORE_FLOOR, so the multiplier bottoms out around 0.63x
// rather than at zero, and building one cheap facility moves it back.
const WORD_OF_MOUTH_NEUTRAL = 70;    // satisfaction score with no effect on demand — matches the founding value
// Widened from ±0.45 by Plan 15's PR F, so satisfaction moves the pool
// enough to notice across two summers.
const WORD_OF_MOUTH_STRENGTH = 0.60; // max fractional change to the pool: +60% at satisfaction 100, -60% at 0

// --- Admit rate: A PLAYER DECISION as of Plan 05's PR C. This curve is no
// longer what the funnel answers — it is what the slider OPENS at: what a
// school of this standing would normally take. A decreasing logistic, the
// mirror shape of applicantVolume's rising one, so standing itself is what
// lets a school be selective, down to low single digits at the very top.
//
// WHAT THE NUMBER MEANS CHANGED, and the constants moved to match. There
// is no yield step any more (PR C deleted it): an admitted student is an
// enrolled student, so this is the share of the applicant pool that ends
// up ON CAMPUS, not the share that gets a letter. Those were very
// different numbers — the old model admitted 92% of a no-name school's
// pool and enrolled about a fifth of them.
//
// ALL FOUR constants were therefore refitted, against the enrolled share
// the two-step funnel actually produced at each prestige, so that a school
// accepting the default commits about the class it always did. The fit is
// within a few percent from prestige 50 up (-0.6% at 50, -7% at 70, -6%
// at 90, -1.5% at 110, -0.3% at 130), which is the range a school spends a
// run in. It is NOT a scaled copy of the old curve: the midpoint moved out
// to 100 and the slope steepened, because the old admit curve and the
// enrolled share it produced are different shapes.
//
// WHAT WAS LOST WITH YIELD, stated rather than quietly dropped, and it is
// why the fit is +19% at prestige 30: a school nobody has heard of used to
// be hurt twice — it had to admit nearly everyone AND few of them came —
// so the share of applicants it actually enrolled PEAKED IN THE MIDDLE of
// the prestige range rather than at the bottom. No monotone curve can
// express that, and a player setting the slider is not subject to it at
// all: a founding school can simply choose to take a large share of its
// pool. What punishes admitting deep now is quality — the skim runs best
// band first, so a bigger share reaches further down the distribution and
// drags avgIncomingQuality, which feeds prestige. Class size is bought
// with quality, not conceded to yield.
const ADMIT_RATE_CEILING = 0.38;    // at zero/negative prestige — a brand-new school keeps a good share of the small pool it draws
const ADMIT_RATE_FLOOR = 0.055;     // the most selective a school can ever be, at the very top of the prestige scale
const ADMIT_RATE_MIDPOINT = 100;    // prestige at which the rate sits halfway between floor and ceiling
const ADMIT_RATE_STEEPNESS = 0.06;  // curve steepness around the midpoint

// The rate a school of this standing would normally take — the slider's
// opening position, what a founding save is seeded with, and what a
// migrated save is reset to.
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

// NOTE: there is no yield here any more. `bandYield` and the
// YIELD_BASE/PRESTIGE_YIELD_STRENGTH/YIELD_QUALITY_PENALTY constants were
// deleted at Plan 05's PR C, when admit rate became the player's decision.
// A second conversion between "the share I chose" and "the class I got" is
// exactly what made the old panel need nine numbers to explain one
// outcome. An admitted student is an enrolled student.

// A 0..100 quality score per band, used only to summarize the enrolled
// class's average incoming quality for prestige (see prestigeSystem.ts) —
// the funnel itself never needed a scalar score, only band fractions.
const QUALITY_BAND_SCORE = { top: 90, mid: 55, low: 20 };

type QualityBand = 'top' | 'mid' | 'low';

// The emergent outcome of the funnel for a given policy. Everything here is
// a displayed consequence of the one input (tuition), not an input.
export interface AdmissionsProjection {
  applicants: number;          // total applicant pool, after word of mouth, cohort demand, AND sticker shock
  wordOfMouthMultiplier: number; // satisfaction's multiplier on the pool (1.0 = neutral) — see WORD_OF_MOUTH_STRENGTH
  // The blended cohort-demand multiplier (1.0 = neutral) — see cohorts.ts's
  // cohortDemandFactor. Applied alongside word of mouth, before sticker
  // shock; the UI reads cohorts.ts's own cohortBreakdown directly for the
  // per-cohort detail behind this one number.
  cohortDemandMultiplier: number;
  // What sticker shock alone cost the pool: realized applicants / what the
  // pool would have been at this net price with no shock at all (1.0 =
  // sticker priced at or under earned tolerance, no families self-selected
  // away). See STICKER_SHOCK_RATE above.
  stickerShockMultiplier: number;
  admits: number;              // admitted: applicants x admitRate(prestige), skimmed top band first — and clipped to the seats left (see `capped`)
  admitRate: number;           // admits / applicants — matches the chosen rate unless a thin top/mid band ran out to skim, or the ceiling clipped it
  // THE CEILING (Plan 15's PR E). `seatsLeft` is the intake cap the funnel
  // was given (instructionCapacity.ts's intakeCeiling); `capped` is true
  // when the chosen share would have enrolled more than fit, and the class
  // was clipped to it from the bottom band up. The pool is never capped.
  seatsLeft: number;
  capped: boolean;
  enrolled: number;            // the incoming class, which IS the admits — no yield step, no ceiling of any kind
  avgIncomingQuality: number;  // 0..100 weighted-average quality of the enrolled class — an input to prestige
  // What that enrolled class is MADE OF — the eight counts that sum to
  // `enrolled`, which RESOLVE_ADMISSIONS records against the new freshman
  // class and never recomputes (see types.ts's ClassCohorts). Note this
  // decomposes the ENROLLED class, not `applicants`: the reveal shows the
  // pool's mix, this is the mix that actually turned up.
  enrolledCohorts: CohortCounts;
  // THE SIX FACTORS the pool is the product of (Plan 16's PR C — see
  // types.ts's FunnelFactors). Returned so the reveal can put this year's
  // against last year's, recorded at RESOLVE_ADMISSIONS, and say which
  // one moved the pool and by how much. The three multipliers above are
  // repeated inside it, so a reader has the whole product in one place.
  factors: FunnelFactors;
}

// What this school can charge before demand starts falling away — the
// prestige-scaled price scale the volume discount is measured against.
// Exported so the admissions modal can show the player the number their
// tuition decision is actually being judged against, rather than leaving
// the most important curve in the game invisible.
export function priceTolerance(prestige: number): number {
  return PRICE_TOLERANCE_BASE + PRICE_TOLERANCE_PER_PRESTIGE_POINT * Math.max(prestige, 0);
}

// A price relative to priceTolerance, bucketed into four bands a player can
// read at a glance rather than having to do the division themselves — the
// same "$40k is a steal for a top-20 school, reckless for a founding one"
// judgment call priceTolerance itself exists to make legible, now surfaced
// as a color/label instead of a bare number the admissions form's own
// tuition input can be styled by (see InterruptModal.tsx). With one price
// there is one tier to show, which is the whole of the feedback the
// tuition slider gives: are you in line with your own standing, or not.
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

// Total applicant count as a function of prestige, price, and dorm
// capacity, as its three parts. See the constants above for the shape and
// the numbers this is tuned against. The parts are kept apart rather than
// multiplied here because the reveal reports each one's year-over-year
// move (Plan 16's PR C); the product is what the funnel reads.
function applicantVolumeParts(prestige: number, price: number, capacity: number): Pick<FunnelFactors, 'prestigePool' | 'priceFactor' | 'capacityFactor'> {
  const prestigePool = APPLICANT_VOLUME_CEILING /
    (1 + Math.exp(-APPLICANT_VOLUME_STEEPNESS * (prestige - APPLICANT_VOLUME_MIDPOINT)));
  const priceFactor = Math.exp(-PRICE_SENSITIVITY * Math.max(price, 0) / priceTolerance(prestige));
  return { prestigePool, priceFactor, capacityFactor: capacityFactor(capacity) };
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
// `drag` is the athlete band drag (cohorts.ts's athleteBandDrag, Plan 21's
// PR H): the one place cohort reaches band, taken off the top and added to
// the low. Zero by default, so every reader that is not the realised class
// (the top-band share, the what-ifs) reads the mix as it always did.
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

// The top band's share of the pool at this prestige and price. Exported
// for the balance harness's admit-rate probes: the skim runs best band
// first, so this is the exact rate at which incoming quality saturates —
// admitting any less buys no quality at all and costs class size.
export function topBandShare(prestige: number, tuition: number): number {
  return qualityMix(prestige, tuition).top;
}

// Per-band self-selection away from an overreaching sticker price — see
// STICKER_SHOCK_RATE above for why this exists and why it is band-specific.
// 1.0 (no shock at all) whenever the sticker sits at or under what the
// school's own prestige can already support.
function stickerShockFactor(prestige: number, tuition: number, band: QualityBand): number {
  const overreach = Math.max(0, Math.max(tuition, 0) / priceTolerance(prestige) - 1);
  return Math.exp(-STICKER_SHOCK_RATE[band] * overreach);
}

// ---------------------------------------------------------------------
// THE CLASS ADVANCE, as a pure function, because two callers need it and
// they must never disagree: reducer.ts's RESOLVE_ADMISSIONS, which commits
// it, and consequences.ts, which runs it on a copy to show the player what
// committing would do. A second copy of this in the UI is exactly how a
// projected panel starts promising a body the tick then does not produce.
//
// Prices move with their classes, in the same statements, for the reason
// types.ts's tuitionByClass gives: a price belongs to the class that was
// quoted it, and the graduating seniors take theirs with them.
// ---------------------------------------------------------------------
// The three per-class records that move together, grouped rather than passed
// as three positional arguments — and the incoming class's three facts,
// grouped for the same reason. This started as (classes, tuitionByClass,
// incoming, incomingPrice) and would have been six positionals once the
// cohort split joined them, half of them interchangeable-looking numbers.
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
  graduating: number;
  notReturning: number; // students the three staying classes lost to attrition (see attritionRate)   // the seniors who just left
}

// ATTRITION (Plan 15's PR F). Below ATTRITION_SATISFACTION_LINE each class
// loses a share of its students at the summer boundary — up to
// ATTRITION_MAX_RATE a year at ATTRITION_FLOOR_SATISFACTION, scaling
// linearly between. Read off the year's average satisfaction, the same
// figure word of mouth reads, so the students who leave are the ones who
// had the year. A class's price does not change; its cohort mix shrinks
// proportionally. This gets its own line at the summer, because attrition
// that arrives as a silently smaller number is the single most likely
// source of "I don't understand what happened to my school".
export const ATTRITION_SATISFACTION_LINE = 50;
export const ATTRITION_FLOOR_SATISFACTION = 30;
export const ATTRITION_MAX_RATE = 0.08;

export function attritionRate(satisfaction: number): number {
  if (satisfaction >= ATTRITION_SATISFACTION_LINE) return 0;
  const depth = (ATTRITION_SATISFACTION_LINE - satisfaction) / (ATTRITION_SATISFACTION_LINE - ATTRITION_FLOOR_SATISFACTION);
  return ATTRITION_MAX_RATE * clamp(depth, 0, 1);
}

// A class's mix, shrunk to exactly `total` — largest remainders, so the
// seven counts still sum to the head count they describe (the identity
// test/enrolled-cohorts.test.ts holds every class to).
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
  // The three classes that stay on lose their share before they move up;
  // the seniors are leaving anyway, and the incoming class has not had a
  // year to leave over.
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
    // The mix moves in the same statements as the head count it describes,
    // and the graduating seniors' mix is simply not carried forward — it
    // left with them. A class that shrank shrinks its mix with it.
    cohortsByClass: {
      senior: shrinkCohorts(cohortsByClass.junior, stayJunior),
      junior: shrinkCohorts(cohortsByClass.sophomore, staySophomore),
      sophomore: shrinkCohorts(cohortsByClass.freshman, stayFreshman),
      freshman: incoming.cohorts,
    },
  };
}

// Pure funnel resolution. Given the school's prestige, its dorm capacity
// (an input to applicant VOLUME only now — see capacityFactor above, never
// a ceiling), the trailing-year student satisfaction that drives word of
// mouth, the player's two levers (tuition and, as of PR C, the admit
// rate), and its cohort signals (see cohorts.ts — defaulted to neutral so
// every existing caller, admissions-pricing.test.ts included, is unaffected
// unless it opts in), returns the full set of emergent outcomes.
// `enrolled` here is the incoming FRESHMAN class, not the whole body. No
// individual applicants are modeled — only band aggregates.
export function projectAdmissions(
  prestige: number,
  tuition: number,
  capacity: number,
  satisfaction: number,
  cohortSignals: CohortSignals = NEUTRAL_COHORT_SIGNALS,
  // The player's decision as of PR C, LAST so the existing positional
  // callers did not have to move. Defaulted to the curve's own value, so a
  // caller that has not been taught about the slider — the demand system's
  // what-if, the pricing tests — still reads "what a school of this
  // standing would normally take", which is what they already meant.
  chosenAdmitRate: number = admitRate(prestige),
  // The seats the class may not exceed (Plan 15's PR E). Infinite by
  // default, for the same reason the admit rate defaults: the pricing tests
  // and the demand system's what-if read the funnel, not the ceiling.
  seatsLeft: number = Infinity,
): AdmissionsProjection {
  const tolerance = priceTolerance(prestige);
  const wordOfMouth = wordOfMouthFactor(satisfaction);
  const cohortDemand = cohortDemandFactor(cohortSignals, tolerance, tuition);
  // One price now: what a family is quoted is what they pay, so the volume
  // response and the band-specific shock below read the same number.
  const volume = applicantVolumeParts(prestige, Math.max(tuition, 0), capacity);
  const rawApplicants = volume.prestigePool * volume.priceFactor * volume.capacityFactor * wordOfMouth * cohortDemand;
  const mix = qualityMix(prestige, tuition, athleteBandDrag(cohortSignals, tolerance, tuition));

  const bands: QualityBand[] = ['top', 'mid', 'low'];
  // Sticker shock is applied per band, straight onto the raw pool split —
  // it is real attrition (a family that never applied), not a redistribution
  // the way qualityMix's own shift is. `applicants` below is therefore the
  // REALIZED pool, after both word of mouth and sticker shock, and is what
  // the rest of the funnel (admit rate, the modal's headline figure) reads.
  const pool: Record<QualityBand, number> = { top: 0, mid: 0, low: 0 };
  for (const band of bands) {
    pool[band] = rawApplicants * mix[band] * stickerShockFactor(prestige, tuition, band);
  }
  const applicants = pool.top + pool.mid + pool.low;
  const stickerShockMultiplier = rawApplicants > 0 ? applicants / rawApplicants : 1;

  // Skim from the top of the distribution until the CHOSEN share of the
  // whole pool is used up — never toward a capacity target, since there is
  // none. Top band first, which is the whole cost of admitting deep: a
  // bigger share reaches further down the distribution, so it buys class
  // size with incoming quality (see avgIncomingQuality below, which feeds
  // prestige). A thin top/mid band can leave admits short of the chosen
  // share (nothing left to skim), which is why the reported admitRate below
  // is admits/applicants rather than the chosen value echoed back.
  let remainingAdmits = applicants * clamp(chosenAdmitRate, 0, 1);
  const admitsByBand: Record<QualityBand, number> = { top: 0, mid: 0, low: 0 };
  for (const band of bands) {
    if (remainingAdmits <= 0) break;
    const take = Math.min(pool[band], remainingAdmits);
    admitsByBand[band] = take;
    remainingAdmits -= take;
  }
  // THE CEILING. Intake cannot exceed the seats the housed catalogue has
  // left after graduation — a hard cap on ENROLLMENT, not on applicants.
  // Clipped from the bottom band up, since a school that must turn people
  // away turns away its weakest admits.
  let over = Math.max(0, admitsByBand.top + admitsByBand.mid + admitsByBand.low - Math.max(0, seatsLeft));
  const capped = over > 0;
  for (const band of [...bands].reverse()) {
    if (over <= 0) break;
    const cut = Math.min(admitsByBand[band], over);
    admitsByBand[band] -= cut;
    over -= cut;
  }
  const admits = admitsByBand.top + admitsByBand.mid + admitsByBand.low;

  // Admitted IS enrolled — there is no yield step (see the note above the
  // quality-band scores). The class is what was skimmed.
  const enrolledRaw = admits;
  const enrolled = Math.round(enrolledRaw);

  // Average incoming quality is a weighted mean over the admitted mix,
  // which IS the enrolled mix now that everyone admitted comes.
  const avgIncomingQuality = enrolledRaw > 0
    ? (admitsByBand.top * QUALITY_BAND_SCORE.top +
       admitsByBand.mid * QUALITY_BAND_SCORE.mid +
       admitsByBand.low * QUALITY_BAND_SCORE.low) / enrolledRaw
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
    // Computed HERE rather than by the reducer, although the reducer has
    // everything it would need: consequences.ts runs this same commit on a
    // copy to preview it, and two call sites apportioning independently is
    // how a projection starts promising a body the tick does not produce —
    // the hazard advanceClasses was extracted to avoid, in this same block.
    enrolledCohorts: cohortCounts(cohortSignals, tolerance, tuition, enrolled),
    factors: { ...volume, wordOfMouth, cohortDemand, stickerShock: stickerShockMultiplier },
  };
}

// Enrollment is set once a year by the funnel above and then holds for the
// year: there is no weekly attrition trickle any more, and this tick writes
// nothing and logs nothing on an ordinary week. Dissatisfaction's teeth are
// in demand instead — see wordOfMouthFactor above, applied at the next
// cycle's RESOLVE_ADMISSIONS.
export function tickAdmissions(s: GameState): void {
  // Summer: pause for the year's one fixed stop (see
  // docs/design/admissions.md and types.ts's SummerPayload). The reducer's
  // TICK case sees pendingInterrupt getting set here and holds the clock at
  // this week; the sequence opens on the year in review, and it is the
  // LAST beat's RESOLVE_ADMISSIONS (in reducer.ts) that runs the funnel and
  // advances into the new year. The payload carries the sticky inputs so an
  // unchanged strategy is a click-through.
  if (s.clock.week === WEEKS_PER_YEAR && !s.pendingInterrupt) {
    const payload: SummerPayload = {
      beat: 0,
      tuition: s.finance.listedTuition,
      // Sticky, like tuition: last year's committed rate, so an unchanged
      // strategy stays a click-through. A founding save seeds this from
      // the curve (see actions.ts).
      admitRate: s.students.admitRate,
    };
    // The fiftieth summer's first beat is the final report (Plan 17's PR
    // C) — stamped here so the modal and its width rule read it off the
    // payload, and only while the record is still unsealed, so a save
    // resumed on a later year fifty week is not told twice.
    if (s.clock.year === SEMICENTENNIAL_YEAR && s.self.legacy === null) payload.final = true;
    s.pendingInterrupt = { type: 'summer', payload };
  }
}
