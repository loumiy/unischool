import type { GameState, SatisfactionAttributes } from '../../state/types';
import { HEALTH_CENTER_TIER1_CAPACITY_GATE } from '../../data/facilitiesData';

// ---------------------------------------------------------------------
// Satisfaction stays ONE displayed number (s.students.satisfaction), but
// it is now the weighted sum of five named attributes computed here, each
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
// 0..100 scale as each attribute. Basic needs is heaviest — going hungry
// should move the headline number the most.
const ATTRIBUTE_WEIGHTS: SatisfactionAttributes = {
  academic: 20,
  social: 20,
  basicNeeds: 30,
  health: 15,
  infrastructure: 15,
};

// No ratio-based attribute ever bottoms out at a literal 0 — "stall, don't
// crater" is the same pacing idea README's finance model uses for cash.
const ATTRIBUTE_SCORE_FLOOR = 12;

// How much servesPopulation is "needed" per unit of capacity for a ratio-
// based attribute to read as fully adequate (ratio 1.0 => score 100).
// Basic needs and infrastructure are repeatable chains (dining, parking; see
// facilitiesData.ts) so they're held to a strict near-1:1 ratio. Academic,
// social, and health are single-buildings-with-tiers with a hard capacity
// ceiling on how much they can ever serve, so their target ratio is tuned
// low enough that a fully built-out chain comfortably covers even a large,
// dorm-heavy campus — see the PR notes for the worked numbers. This is a
// deliberate consequence, not an oversight: an enormous, low-selectivity
// campus will still feel the strain on academic/social/health harder than
// a small elite one can, the same way it does in the real world.
const TARGET_RATIO: SatisfactionAttributes = {
  academic: 0.15,
  social: 0.20,
  basicNeeds: 1.0,
  health: 1.0,
  infrastructure: 1.0,
};

// Basic needs alone gets a STEEPER-than-linear under-capacity penalty
// (ratio^curvature, curvature > 1) — neglecting dining should read as an
// acute problem, not a gentle drift, per the design ask. Every other
// ratio-based attribute is linear (curvature 1).
const BASIC_NEEDS_PENALTY_CURVATURE = 2.2;

// Reputation and financial aid used to nudge the old single satisfaction
// formula directly; they still do, just folded into the two attributes
// they thematically belong to instead of a bespoke crowding/reputation/aid
// blend: prestige as campus pride (social), aid as affordability (basic
// needs). Both are small, capped nudges on top of the ratio-based score,
// not attributes in their own right.
const REPUTATION_PRIDE_MAX_BONUS = 15;  // added to `social` at max prestige (PRESTIGE_MAX, see prestigeSystem.ts)
const REPUTATION_PRIDE_PRESTIGE_MAX = 150;
const AID_AFFORDABILITY_MAX_BONUS = 20; // added to `basicNeeds` at 100% average aid

// Student center's passive retention effect (churnReductionBonus) is read
// directly by admissionsSystem.ts's weekly attrition calc instead of here —
// systems only read/write shared state, they don't call into each other
// (see README's architecture rules), so that small scan lives there, next
// to the only place it's used, rather than being cross-imported from this
// file.

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

// Total servesPopulation across every 'done' facility feeding a given
// attribute (excludes flat contributors — see flatBonusFor below).
function servedPopulationFor(s: GameState, attribute: keyof SatisfactionAttributes): number {
  return s.tech
    .filter((t) => t.status === 'done' && t.effects?.satisfactionAttribute === attribute)
    .reduce((sum, t) => sum + (t.effects?.servesPopulation ?? 0), 0);
}

function flatBonusFor(s: GameState, attribute: keyof SatisfactionAttributes): number {
  return s.tech
    .filter((t) => t.status === 'done' && t.effects?.satisfactionAttribute === attribute)
    .reduce((sum, t) => sum + (t.effects?.flatSatisfactionBonus ?? 0), 0);
}

function ratioScore(servesPopulation: number, capacity: number, targetRatio: number, curvature: number): number {
  if (capacity <= 0) return 100; // nothing to serve yet — not a problem
  const ratio = clamp(servesPopulation / (capacity * targetRatio), 0, 1);
  return clamp(100 * ratio ** curvature, ATTRIBUTE_SCORE_FLOOR, 100);
}

export function computeSatisfactionBreakdown(s: GameState): SatisfactionAttributes {
  const capacity = s.students.capacity;

  const academic = ratioScore(servedPopulationFor(s, 'academic'), capacity, TARGET_RATIO.academic, 1);

  const socialRatio = ratioScore(servedPopulationFor(s, 'social'), capacity, TARGET_RATIO.social, 1);
  const pride = clamp(s.self.reputation / REPUTATION_PRIDE_PRESTIGE_MAX, 0, 1) * REPUTATION_PRIDE_MAX_BONUS;
  const social = clamp(socialRatio + flatBonusFor(s, 'social') + pride, ATTRIBUTE_SCORE_FLOOR, 100);

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

  const infrastructure = ratioScore(servedPopulationFor(s, 'infrastructure'), capacity, TARGET_RATIO.infrastructure, 1);

  return { academic, social, basicNeeds, health, infrastructure };
}

function weightedSum(breakdown: SatisfactionAttributes): number {
  return (
    breakdown.academic * ATTRIBUTE_WEIGHTS.academic +
    breakdown.social * ATTRIBUTE_WEIGHTS.social +
    breakdown.basicNeeds * ATTRIBUTE_WEIGHTS.basicNeeds +
    breakdown.health * ATTRIBUTE_WEIGHTS.health +
    breakdown.infrastructure * ATTRIBUTE_WEIGHTS.infrastructure
  ) / 100;
}

export function tickSatisfaction(s: GameState): void {
  const breakdown = computeSatisfactionBreakdown(s);
  s.students.satisfactionBreakdown = breakdown;

  const target = weightedSum(breakdown);
  s.students.satisfaction += (target - s.students.satisfaction) * SATISFACTION_DRIFT_RATE;
  s.students.satisfaction = clamp(s.students.satisfaction, 0, 100);
}
