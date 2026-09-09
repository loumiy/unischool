import type { GameState } from '../../state/types';
import { WEEKS_PER_YEAR } from '../../state/types';

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
// summer interrupt (see README's "Admissions: an annual summer decision").
// The applicant pool is modeled purely as aggregate statistics — a total
// applicant count plus a coarse quality distribution (top / mid / low
// bands) — never as individual applicants.
//
// There is no ADMISSIONS CEILING anywhere in this file: nothing ever skims
// TOWARD a capacity target, and enrollment is never capped by beds. Students
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
// The player sets exactly two things: tuition and an average scholarship
// percentage. Everything else is emergent:
//
//   1. Applicant pool = f(prestige, tuition, satisfaction, dorm capacity).
//      Higher prestige draws more applicants and shifts the distribution
//      toward higher quality; higher tuition shrinks the pool and fattens
//      the low-quality tail; current student satisfaction scales the whole
//      pool up or down as word of mouth (see WORD_OF_MOUTH_STRENGTH below)
//      — that is satisfaction's one mechanical consequence, applied here
//      once a year rather than as a weekly drip; and dorm capacity scales
//      the pool toward its full size as housing investment grows (see
//      CAPACITY_FACTOR_FLOOR/CAPACITY_FACTOR_REFERENCE below). A STICKER
//      price that overreaches what the school's prestige has earned (see
//      STICKER_SHOCK_RATE below) additionally self-selects away exactly the
//      price-sensitive bands scholarships would otherwise win back — a real
//      sticker is never laundered for free by matching it with aid.
//   2. Admit rate = f(prestige) alone (see admitRate below): a school's
//      standing is what makes it selective, on the real-world curve from a
//      barely-selective young school to a single-digit admit rate at the
//      very top. It is NOT a player lever and it is NOT capacity-derived —
//      admissions skims from the top of the quality distribution, admitting
//      that fraction of the applicant pool, most selective band first.
//   3. Scholarships drive yield: not every admit enrolls. Yield rises with scholarships
//      (diminishing returns) and with prestige, and falls for higher-
//      quality admits (who are more price-sensitive and cost more scholarships to
//      win). Enrolled class = yield x admits, with no ceiling of any kind.
//   4. Net tuition per enrolled student = tuition x (1 - scholarships); that is
//      what flows into finance (see financeSystem.ts).
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

// Reference points the quality/yield curves below are centered on: at
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
// revenue-maximizing NET price is exactly the tolerance below, so a
// founding school's best price is around $15k and a top-50 school's is
// three times that. Price is compared NET of scholarships (tuition x
// (1 - scholarships)) — scholarships is a discount on the sticker, so it widens the pool as
// well as lifting yield.
const PRICE_TOLERANCE_BASE = 5_500;             // what a school with no reputation at all can charge
const PRICE_TOLERANCE_PER_PRESTIGE_POINT = 240; // added per point of prestige
const PRICE_SENSITIVITY = 1.0;                  // applicants ~ exp(-sensitivity x netPrice/tolerance)

// --- Sticker shock: a family decides whether to APPLY off the listed
// price, months before financial aid is ever an offer on the table — a
// net-price calculator does not help someone who never opens it. So a
// sticker that overreaches what the school's prestige has earned (see
// priceTolerance above — the same curve the net-price discount is measured
// against) costs real applicants, on top of and independent of whatever
// net price the tuition/scholarships combination works out to.
//
// This is what makes "raise tuition and scholarships together, holding net
// price fixed" a real trade-off rather than a free lunch: without it,
// inflating the sticker only ever helps (it shifts qualityMix's band split
// toward the band that — once scholarships are raised to match — has the
// smallest yield penalty; see YIELD_QUALITY_PENALTY below), since applicant
// VOLUME is scored against net price alone and never falls. A large,
// deliberately-provoked fast-forward comparison at fixed net price ($10k,
// prestige 50) found $60k-sticker/83%-scholarship nearly tripling enrolled
// class size and net revenue over an honest $10k/0% policy for a mere ~17%
// hit to average incoming quality — the sticker-shock band split below is
// sized to close that gap, not merely narrow it (see the sim's admissions
// sweep for the check).
//
// BAND-SPECIFIC, and deliberately so: the real phenomenon this models
// (well-documented in the higher-ed research as "undermatching") is that
// price-sensitive families distrust or never learn about the aid they
// would actually receive, and self-select away from an intimidating list
// price — precisely the low/mid-band applicants scholarships exist to win
// back. A top-band family is more sophisticated about the aid process (or
// simply richer), same as YIELD_QUALITY_PENALTY already treats the top
// band as pickier about NET price rather than skittish about the sticker —
// so top is barely shocked at all, mid loses a real share, and low —
// already zero-rated on the yield penalty, which is exactly why inflating
// tuition floods it — loses the most.
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
const WORD_OF_MOUTH_STRENGTH = 0.45; // max fractional change to the pool: +45% at satisfaction 100, -45% at 0

// --- Admit rate: purely a function of prestige (see the module note above)
// — never a player lever, and never derived from capacity. A decreasing
// logistic, the mirror shape of applicantVolume's rising one: a school
// nobody has heard of admits nearly everyone who applies, and standing
// itself is what makes a top school selective, down to a single-digit
// admit rate at the very top of the scale — the real-world shape, arrived
// at without any notion of "how many seats are open."
const ADMIT_RATE_CEILING = 0.92;    // admit rate at zero/negative prestige — a brand-new school turns almost nobody away
const ADMIT_RATE_FLOOR = 0.04;      // the most selective a school can ever be, at the very top of the prestige scale
const ADMIT_RATE_MIDPOINT = 90;     // prestige at which admit rate sits halfway between floor and ceiling
const ADMIT_RATE_STEEPNESS = 0.05;  // curve steepness around the midpoint

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

// --- Yield: fraction of admits in a band who actually enroll ---
const YIELD_BASE = 0.30;                     // floor yield before scholarships/prestige/quality adjustments
const SCHOLARSHIP_YIELD_STRENGTH = 0.45;             // most yield scholarships can add, approached with diminishing returns
const SCHOLARSHIP_YIELD_DECAY = 3.0;                 // curvature of the diminishing-returns scholarships response: 1 - exp(-decay x scholarships)
const PRESTIGE_YIELD_STRENGTH = 0.25;        // yield added per unit of (prestige-ref)/ref, for free
// Higher-quality admits are more price-sensitive, so they yield lower at a
// given scholarships level (and cost more scholarships to win): the top band pays the biggest
// yield penalty, the low band none.
const YIELD_QUALITY_PENALTY = { top: 0.22, mid: 0.10, low: 0.0 };

// A 0..100 quality score per band, used only to summarize the enrolled
// class's average incoming quality for prestige (see prestigeSystem.ts) —
// the funnel itself never needed a scalar score before, only band
// fractions and per-band yield.
const QUALITY_BAND_SCORE = { top: 90, mid: 55, low: 20 };

type QualityBand = 'top' | 'mid' | 'low';

// The emergent outcome of the funnel for a given policy. Everything here is
// a displayed consequence of the two inputs (tuition, scholarships), not an input.
export interface AdmissionsProjection {
  applicants: number;          // total applicant pool, after word of mouth AND sticker shock
  wordOfMouthMultiplier: number; // satisfaction's multiplier on the pool (1.0 = neutral) — see WORD_OF_MOUTH_STRENGTH
  // What sticker shock alone cost the pool: realized applicants / what the
  // pool would have been at this net price with no shock at all (1.0 =
  // sticker priced at or under earned tolerance, no families self-selected
  // away). See STICKER_SHOCK_RATE above.
  stickerShockMultiplier: number;
  admits: number;              // admitted: applicants x admitRate(prestige), skimmed top band first
  admitRate: number;           // admits / applicants — matches admitRate(prestige) unless a thin top/mid band ran out to skim
  yieldRate: number;           // enrolled / admits — the emergent yield
  enrolled: number;            // enrolled class = yield x admits — no ceiling of any kind
  avgIncomingQuality: number;  // 0..100 weighted-average quality of the enrolled class — an input to prestige
  netTuitionPerStudent: number; // tuition x (1 - scholarships): what actually flows into finance
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

// What this school can charge before demand starts falling away — the
// prestige-scaled price scale the volume discount is measured against.
// Exported so the admissions modal can show the player the number their
// tuition decision is actually being judged against, rather than leaving
// the most important curve in the game invisible.
export function priceTolerance(prestige: number): number {
  return PRICE_TOLERANCE_BASE + PRICE_TOLERANCE_PER_PRESTIGE_POINT * Math.max(prestige, 0);
}

// Total applicant count as a function of prestige, NET price (tuition after
// scholarships), and dorm capacity. See the constants above for the shape
// and the numbers this is tuned against.
function applicantVolume(prestige: number, netPrice: number, capacity: number): number {
  const prestigePool = APPLICANT_VOLUME_CEILING /
    (1 + Math.exp(-APPLICANT_VOLUME_STEEPNESS * (prestige - APPLICANT_VOLUME_MIDPOINT)));
  const priceFactor = Math.exp(-PRICE_SENSITIVITY * Math.max(netPrice, 0) / priceTolerance(prestige));
  return prestigePool * priceFactor * capacityFactor(capacity);
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

// Per-band self-selection away from an overreaching sticker price — see
// STICKER_SHOCK_RATE above for why this exists and why it is band-specific.
// 1.0 (no shock at all) whenever the sticker sits at or under what the
// school's own prestige can already support.
function stickerShockFactor(prestige: number, tuition: number, band: QualityBand): number {
  const overreach = Math.max(0, Math.max(tuition, 0) / priceTolerance(prestige) - 1);
  return Math.exp(-STICKER_SHOCK_RATE[band] * overreach);
}

// Yield for one quality band: scholarships (diminishing returns) and prestige lift
// it, higher band quality drags it down.
function bandYield(prestige: number, scholarshipRate: number, band: QualityBand): number {
  const scholarshipTerm = SCHOLARSHIP_YIELD_STRENGTH * (1 - Math.exp(-SCHOLARSHIP_YIELD_DECAY * clamp(scholarshipRate, 0, 1)));
  const prestigeTerm = PRESTIGE_YIELD_STRENGTH * (prestige - PRESTIGE_REFERENCE) / PRESTIGE_REFERENCE;
  return clamp(YIELD_BASE + scholarshipTerm + prestigeTerm - YIELD_QUALITY_PENALTY[band], 0, 1);
}

// Pure funnel resolution. Given the school's prestige, its dorm capacity
// (an input to applicant VOLUME only now — see capacityFactor above, never
// a ceiling), the trailing-year student satisfaction that drives word of
// mouth, and the player's two levers (tuition, scholarships), returns the
// full set of emergent outcomes. `enrolled` here is the incoming FRESHMAN
// class, not the whole body. No individual applicants are modeled — only
// band aggregates.
export function projectAdmissions(
  prestige: number,
  tuition: number,
  scholarshipRate: number,
  capacity: number,
  satisfaction: number,
): AdmissionsProjection {
  const wordOfMouth = wordOfMouthFactor(satisfaction);
  const netPrice = Math.max(tuition, 0) * (1 - clamp(scholarshipRate, 0, 1));
  const rawApplicants = applicantVolume(prestige, netPrice, capacity) * wordOfMouth;
  const mix = qualityMix(prestige, tuition);

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

  const yieldByBand: Record<QualityBand, number> = {
    top: bandYield(prestige, scholarshipRate, 'top'),
    mid: bandYield(prestige, scholarshipRate, 'mid'),
    low: bandYield(prestige, scholarshipRate, 'low'),
  };

  // Skim from the top of the distribution until admitRate(prestige)'s share
  // of the whole pool is used up — never toward a capacity target, since
  // there is none. A thin top/mid band can leave admits short of that
  // target (nothing left to skim), which is exactly why the reported
  // admitRate below is admits/applicants rather than the curve's own value.
  let remainingAdmits = applicants * admitRate(prestige);
  const admitsByBand: Record<QualityBand, number> = { top: 0, mid: 0, low: 0 };
  for (const band of bands) {
    if (remainingAdmits <= 0) break;
    const take = Math.min(pool[band], remainingAdmits);
    admitsByBand[band] = take;
    remainingAdmits -= take;
  }
  const admits = admitsByBand.top + admitsByBand.mid + admitsByBand.low;

  const enrolledByBand: Record<QualityBand, number> = {
    top: admitsByBand.top * yieldByBand.top,
    mid: admitsByBand.mid * yieldByBand.mid,
    low: admitsByBand.low * yieldByBand.low,
  };
  const enrolledRaw = enrolledByBand.top + enrolledByBand.mid + enrolledByBand.low;
  const enrolled = Math.round(enrolledRaw);

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
    stickerShockMultiplier,
    admits: Math.round(admits),
    admitRate: applicants > 0 ? admits / applicants : 0,
    yieldRate: admits > 0 ? enrolled / admits : 0,
    enrolled,
    avgIncomingQuality,
    netTuitionPerStudent: Math.round(tuition * (1 - clamp(scholarshipRate, 0, 1))),
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
        scholarshipRate: s.admissions.scholarshipRate,
      },
    };
  }
}
