import type { GameState, SatisfactionAttributes } from '../../state/types';
import { HEALTH_CENTER_TIER1_CAPACITY_GATE } from '../../data/facilitiesData';
import { clubSocialBonus, greekSocialBonus, studentLifeSocialBonus } from '../../data/studentLifeData';

// ---------------------------------------------------------------------
// Satisfaction stays ONE displayed number (s.students.satisfaction), but
// it is now the weighted sum of four named attributes computed here, each
// written to by a specific cluster of campus facilities/needs — never by
// an ad hoc catch-all formula. s.students.satisfactionBreakdown carries
// this week's raw per-attribute scores for the expandable UI (see
// AdmissionsTab.tsx) to show exactly what's dragging the number down.
//
// Every ratio-based attribute compares total servesPopulation (summed
// live off 'done' facilities — see BuildableEffects's live-read contract
// in state/types.ts) against s.students.CAPACITY, not today's enrollment:
// needs scale with how big the campus is planned to be, so expanding
// housing carries a felt, plan-ahead satisfaction cost (per the design
// ask), not just an upkeep bill that shows up on the balance sheet.
//
// The headline number still drifts smoothly toward its target at the same
// weekly rate the old single-formula version used — only the TARGET is now
// a real weighted sum of attributes instead of an inline crowding/
// reputation/aid formula. The breakdown itself is NOT smoothed — it always
// reflects what's true about the campus right now, so a newly finished
// building is visible in the breakdown immediately even while the headline
// number is still catching up to it.
// ---------------------------------------------------------------------

const SATISFACTION_DRIFT_RATE = 0.05; // fraction of the gap to target closed per week — matches the pre-refactor rate

// Attribute weights, summing to 100 so the weighted sum lands on the same
// 0..100 scale as each attribute. Basic needs stays heaviest — going
// hungry should move the headline number the most.
//
// This is the re-tune the parking-removal PR deliberately deferred (see its
// note, kept above in git history): social is moved up from a share equal
// to academic's to the clear second-heaviest attribute, so a social
// shortfall now moves the headline number more than an academic or health
// one does. Health gives up the difference — it is dormant below
// HEALTH_CENTER_TIER1_CAPACITY_GATE and, even scoring, is the attribute a
// player interacts with least (two tiers, one gate, no orgs/prestige
// nudges), so it can afford to matter least. Academic gives up a little
// too. Still sums to 100.
const ATTRIBUTE_WEIGHTS: SatisfactionAttributes = {
  academic: 23,
  social: 28,
  basicNeeds: 34,
  health: 15,
};

// No ratio-based attribute ever bottoms out at a literal 0 — "stall, don't
// crater" is the same pacing idea README's finance model uses for cash.
const ATTRIBUTE_SCORE_FLOOR = 12;

// How much servesPopulation is "needed" per unit of capacity for a ratio-
// based attribute to read as fully adequate (ratio 1.0 => score 100).
// Basic needs is a repeatable chain (dining; see facilitiesData.ts) so it's
// held to a strict near-1:1 ratio. Academic and health are
// single-buildings-with-tiers with a hard capacity ceiling on how much
// they can ever serve, so their target ratio is tuned low enough that a
// fully built-out chain comfortably covers even a large, dorm-heavy
// campus — see the PR notes for the worked numbers. This is a deliberate
// consequence, not an oversight: an enormous, low-selectivity campus will
// still feel the strain on academic/health harder than a small elite one
// can, the same way it does in the real world.
//
// Social is the deliberate exception, and the point of this pass. A maxed
// student center + rec center (1,000 + 3,000 + 1,200 + 3,500 = 8,700
// served — see facilitiesData.ts) covered any campus this game's dorm
// chain can reach at the OLD ratio (0.20 => adequate up to 43,500
// capacity) with room to spare, which is exactly why a school that got
// ahead on social once could coast on it forever. At 0.34, that same full
// build is only adequate up to ~25,600 capacity — comfortably covers a
// modest-to-large campus, but a school that keeps growing past that (the
// balance sim's growth strategies reach 13k-18k capacity by year 40 and are
// still climbing — see sim/balanceSim.ts) keeps diluting its social ratio
// even with both buildings fully tiered well before it gets there, because
// SOCIAL_PENALTY_CURVATURE below bites before the ratio hits 1.0. It has to
// lean on the quad and student life to close the rest of the way, which is
// the intended path back to a high score, not a bug to fix by raising the
// ratio further.
const TARGET_RATIO: SatisfactionAttributes = {
  academic: 0.15,
  social: 0.34,
  basicNeeds: 1.0,
  health: 1.0,
};

// Basic needs gets the STEEPEST under-capacity penalty (ratio^curvature,
// curvature > 1) — going hungry should read as an acute problem, not a
// gentle drift, per the design ask, and it stays the sharpest single
// attribute in the model.
//
// Social gets a curvature of its own now, > 1 but well short of basic
// needs': neglecting student life should read as an acute problem too
// (per this pass's design ask), just not the MOST acute one — a bored
// student and a hungry one are not the same emergency. Academic and
// health stay linear (curvature 1).
const BASIC_NEEDS_PENALTY_CURVATURE = 2.2;
const SOCIAL_PENALTY_CURVATURE = 1.4;

// Reputation and financial aid used to nudge the old single satisfaction
// formula directly; they still do, just folded into the two attributes
// they thematically belong to instead of a bespoke crowding/reputation/aid
// blend: prestige as campus pride (social), aid as affordability (basic
// needs). Both are small, capped nudges on top of the ratio-based score,
// not attributes in their own right.
const REPUTATION_PRIDE_MAX_BONUS = 15;  // added to `social` at max prestige (PRESTIGE_MAX, see prestigeSystem.ts)
const REPUTATION_PRIDE_PRESTIGE_MAX = 150;
const AID_AFFORDABILITY_MAX_BONUS = 20; // added to `basicNeeds` at 100% average aid

// Satisfaction has exactly one mechanical consequence: it scales the next
// annual admissions cycle's applicant pool as word of mouth (see
// admissionsSystem.ts's WORD_OF_MOUTH_STRENGTH). It no longer drives a
// weekly attrition trickle, so nothing here writes to enrollment — this
// module only computes the number and the breakdown behind it.
//
// That one consequence is now load-bearing for the growth loop, and it is
// why the ratio attributes above are scored against CAPACITY rather than
// enrollment. Finishing a dorm dilutes every ratio the same week the beds
// appear, months before the students who fill them are even admitted; the
// dip in satisfaction shrinks the pool at the next summer funnel, which
// shrinks the class that was supposed to pay for the dorm. Growth
// therefore has to be paid for TWICE and in advance — once in the dorm's
// own cost and upkeep, once in the dining hall/health capacity that keeps
// the dilution from throttling demand. That is the whole point: capacity
// is not free enrollment.
//
// ATTRIBUTE_SCORE_FLOOR is what keeps that from becoming a death spiral:
// no attribute reaches zero, so satisfaction bottoms out well above it,
// word of mouth bottoms out at ~0.63x rather than at nothing, and a
// single cheap facility is always enough to start climbing back.

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

// Total servesPopulation across every 'done' facility feeding a given
// attribute (excludes flat contributors — see flatBonusFor below).
//
// Exported because the student-demand system (see
// systems/demands/demandSystem.ts) measures a demand's target against this
// exact reading rather than keeping a capacity model of its own: "somewhere
// to eat" is met when the basicNeeds attribute's served population reaches
// the demanded total, which is the same number scored below.
export function servedPopulationFor(s: GameState, attribute: keyof SatisfactionAttributes): number {
  return s.tech
    .filter((t) => t.status === 'done' && t.effects?.satisfactionAttribute === attribute)
    .reduce((sum, t) => sum + (t.effects?.servesPopulation ?? 0), 0);
}

function flatBonusFor(s: GameState, attribute: keyof SatisfactionAttributes): number {
  return s.tech
    .filter((t) => t.status === 'done' && t.effects?.satisfactionAttribute === attribute)
    .reduce((sum, t) => sum + (t.effects?.flatSatisfactionBonus ?? 0), 0);
}

// How much of a ratio-based attribute's need the campus currently covers,
// 0..1 — precisely the `ratio` ratioScore below scores, lifted out so it can
// be read without a second copy of the formula. 1.0 means "fully adequate
// for the campus as planned"; anything under it is a real shortfall in the
// same units the score is computed in.
//
// Exported for the student-demand system, which derives what students ask
// for from the WORST-covered attribute (see demandSystem.ts's
// rollShortfallDemand) — so a demand can never be about a need the
// satisfaction model does not itself think is short.
export function attributeCoverage(s: GameState, attribute: keyof SatisfactionAttributes): number {
  const capacity = s.students.capacity;
  if (capacity <= 0) return 1;
  return clamp(servedPopulationFor(s, attribute) / (capacity * TARGET_RATIO[attribute]), 0, 1);
}

function ratioScore(servesPopulation: number, capacity: number, targetRatio: number, curvature: number): number {
  if (capacity <= 0) return 100; // nothing to serve yet — not a problem
  const ratio = clamp(servesPopulation / (capacity * targetRatio), 0, 1);
  return clamp(100 * ratio ** curvature, ATTRIBUTE_SCORE_FLOOR, 100);
}

export function computeSatisfactionBreakdown(s: GameState): SatisfactionAttributes {
  const capacity = s.students.capacity;

  const academic = ratioScore(servedPopulationFor(s, 'academic'), capacity, TARGET_RATIO.academic, 1);

  const socialRatio = ratioScore(servedPopulationFor(s, 'social'), capacity, TARGET_RATIO.social, SOCIAL_PENALTY_CURVATURE);
  const pride = clamp(s.self.reputation / REPUTATION_PRIDE_PRESTIGE_MAX, 0, 1) * REPUTATION_PRIDE_MAX_BONUS;
  // Student organisations (see data/studentLifeData.ts) are the third
  // contributor to `social`, alongside the ratio-scored facilities and the
  // prestige-pride nudge. FLAT, like the quad's bonus and for the same
  // reason: a chess club is worth the same at 400 students as at 40,000,
  // so its contribution does not dilute as the campus grows. Read LIVE off
  // s.orgs every week, never applied once, so disbanding a chapter removes
  // its contribution the same week — see the live-read contract on
  // BuildableEffects in state/types.ts, which this deliberately mirrors.
  const social = clamp(
    socialRatio + flatBonusFor(s, 'social') + pride + studentLifeSocialBonus(s),
    ATTRIBUTE_SCORE_FLOOR,
    100,
  );

  const basicNeedsRatio = ratioScore(servedPopulationFor(s, 'basicNeeds'), capacity, TARGET_RATIO.basicNeeds, BASIC_NEEDS_PENALTY_CURVATURE);
  const affordability = clamp(s.admissions.financialAidRate, 0, 1) * AID_AFFORDABILITY_MAX_BONUS;
  const basicNeeds = clamp(basicNeedsRatio + affordability, ATTRIBUTE_SCORE_FLOOR, 100);

  // Health is DORMANT — scores full — below the population threshold the
  // health center itself unlocks at (see facilitiesData.ts): a small campus
  // isn't expected to have one yet, so not having one costs nothing. Cross
  // the threshold and it becomes a real, scoring need like any other.
  const health = capacity < HEALTH_CENTER_TIER1_CAPACITY_GATE
    ? 100
    : ratioScore(servedPopulationFor(s, 'health'), capacity, TARGET_RATIO.health, 1);

  return { academic, social, basicNeeds, health };
}

function weightedSum(breakdown: SatisfactionAttributes): number {
  return (
    breakdown.academic * ATTRIBUTE_WEIGHTS.academic +
    breakdown.social * ATTRIBUTE_WEIGHTS.social +
    breakdown.basicNeeds * ATTRIBUTE_WEIGHTS.basicNeeds +
    breakdown.health * ATTRIBUTE_WEIGHTS.health
  ) / 100;
}

// The satisfaction TARGET: the weighted sum of this week's attribute
// scores, and the number the headline stock drifts toward. Exported so a
// view can read the real target rather than reconstructing it — the same
// reason computePrestigeTarget is exported.
export function satisfactionTarget(s: GameState): number {
  return weightedSum(computeSatisfactionBreakdown(s));
}

// ---------------------------------------------------------------------
// WHAT STUDENT LIFE IS ACTUALLY WORTH, read off the model rather than
// authored. Satisfaction is a stock drifting toward a facilities-derived
// target; clubs and Greek chapters nudge that TARGET, so there is no such
// thing as a standing "+N satisfaction" from them and printing one would
// be a parallel number that drifts from what the system applies.
//
// So this does what prestigeTargetWithout does for the milestone modal: it
// runs the very computation tickSatisfaction runs, against throwaway
// shallow copies of the state with one source of student life removed, and
// reports the difference. Pure — computeSatisfactionBreakdown only ever
// READS, and each copy shares every other slice by reference.
//
// Reading it this way rather than summing the bonus constants is what makes
// it honest at the edges: `social` is clamped to 100 and weighted at 20% of
// the headline number, so a campus whose social score is already maxed
// genuinely gains nothing more from its next club — and this says so,
// where an aggregate of the constants would claim a contribution that is
// not being applied.
// ---------------------------------------------------------------------
export interface StudentLifeSatisfaction {
  clubCount: number;
  chapterCount: number;
  // The raw flat contributions each source offers the `social` attribute,
  // before the aggregate cap and before `social` itself is clamped.
  clubSocialBonus: number;
  greekSocialBonus: number;
  // What each source is actually worth on the HEADLINE satisfaction
  // target, in points, after every clamp the model applies.
  clubTargetContribution: number;
  greekTargetContribution: number;
  totalTargetContribution: number;
  target: number;              // the satisfaction target as it stands
  targetWithoutStudentLife: number; // and what it would be with no clubs and no chapters
}

function withoutOrgs(s: GameState, clubs: boolean, chapters: boolean): GameState {
  return {
    ...s,
    orgs: {
      ...s.orgs,
      clubs: clubs ? [] : s.orgs.clubs,
      chapters: chapters ? [] : s.orgs.chapters,
    },
  };
}

export function studentLifeSatisfaction(s: GameState): StudentLifeSatisfaction {
  const target = satisfactionTarget(s);
  const withoutClubs = satisfactionTarget(withoutOrgs(s, true, false));
  const withoutGreek = satisfactionTarget(withoutOrgs(s, false, true));
  const withoutBoth = satisfactionTarget(withoutOrgs(s, true, true));

  return {
    clubCount: s.orgs.clubs.length,
    chapterCount: s.orgs.chapters.length,
    clubSocialBonus: clubSocialBonus(s),
    greekSocialBonus: greekSocialBonus(s),
    clubTargetContribution: target - withoutClubs,
    greekTargetContribution: target - withoutGreek,
    totalTargetContribution: target - withoutBoth,
    target,
    targetWithoutStudentLife: withoutBoth,
  };
}

export function tickSatisfaction(s: GameState): void {
  const breakdown = computeSatisfactionBreakdown(s);
  s.students.satisfactionBreakdown = breakdown;

  const target = weightedSum(breakdown);
  s.students.satisfaction += (target - s.students.satisfaction) * SATISFACTION_DRIFT_RATE;
  s.students.satisfaction = clamp(s.students.satisfaction, 0, 100);
}
