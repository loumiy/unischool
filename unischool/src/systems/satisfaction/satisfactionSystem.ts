import { tagTeeth } from '../identity/teeth';
import { QUIRK_MORALE_CAP, QUIRK_MORALE_PER_POINT, quirkById } from '../../data/quirkData';
import { pairingBumps } from '../estate/pairing';
import type { GameState, SatisfactionAttributes } from '../../state/types';
import { HEALTH_CENTER_TIER1_POPULATION_GATE } from '../../data/facilitiesData';
import {
  athleticsSocialBonus, CHAPTER_HOUSE_CAPACITY_BONUS, clubSocialBonus, greekSocialBonus, studentLifeSocialBonus,
} from '../../data/studentLifeData';
import { servingPopulation, totalEnrolled } from '../../state/types';
import { campusAverageCourseQuality } from '../faculty/facultyAssignment';
import { annualTuitionBilled } from '../finance/financeSystem';
import { priceTolerance } from '../admissions/admissionsSystem';
import { clamp } from '../../math';

// Satisfaction is the weighted sum of five attributes, each fed by its own
// facilities. Ratio attributes compare servesPopulation against enrolled
// students (housing: beds over enrolled). The headline drifts toward the
// target; the breakdown (s.students.satisfactionBreakdown) is not smoothed.

const SATISFACTION_DRIFT_RATE = 0.05; // fraction of the gap to target closed per week

// Weights sum to 100. Basic needs heaviest; health lightest (dormant below
// its population gate). Exported for the Students tab's cards.
export const ATTRIBUTE_WEIGHTS: SatisfactionAttributes = {
  academic: 20,
  social: 24,
  basicNeeds: 30,
  health: 11,
  housing: 15,
};

// No attribute reaches 0 ("stall, don't crater", as docs/design/economy.md
// does for cash). This keeps word of mouth from a death spiral: it bottoms
// out around 0.63x, and one cheap facility starts the climb back.
const ATTRIBUTE_SCORE_FLOOR = 12;

// servesPopulation needed per enrolled student for a score of 100.
// Social at 0.34: a maxed student center + rec center (8,700) covers only
// ~25,600 enrolled, so growing schools must lean on the quad and student
// life. Intended; do not raise it. Housing at 0.35: commuting is the norm.
const TARGET_RATIO: SatisfactionAttributes = {
  academic: 0.15,
  social: 0.34,
  basicNeeds: 1.0,
  health: 1.0,
  housing: 0.35,
};

// Rising expectations (Plan 29, v2's satisfaction): the better the college's
// name, the more students expect of its library, its social life and its
// beds. Each point of prestige over 50 raises those three targets by a
// tenth of a percent, so a college at 150 needs a tenth more of each for
// the same score. Food and care are needs, not expectations, and stay put.
export const EXPECTATION_PER_PRESTIGE = 0.001;
export function expectation(s: GameState): number {
  return 1 + EXPECTATION_PER_PRESTIGE * Math.max(0, s.self.reputation - 50);
}
function expectedRatio(s: GameState, attribute: keyof SatisfactionAttributes): number {
  const rises = attribute === 'academic' || attribute === 'social' || attribute === 'housing';
  return TARGET_RATIO[attribute] * (rises ? expectation(s) : 1);
}

// Diminishing returns (v2): what a college does above 80 counts half, so a
// campus cannot buy its way to a perfect mood.
export const DIMINISHING_ABOVE = 80;
export function diminished(target: number): number {
  return target <= DIMINISHING_ABOVE ? target : DIMINISHING_ABOVE + (target - DIMINISHING_ABOVE) / 2;
}

// Under-capacity penalty is ratio^curvature. Basic needs is the steepest
// (hunger is acute), social is steep but less so; the others are linear.
const BASIC_NEEDS_PENALTY_CURVATURE = 2.2;
const SOCIAL_PENALTY_CURVATURE = 1.4;

// Small capped nudges on top of the ratio scores: prestige as campus pride
// (social) and affordability (basic needs).
const REPUTATION_PRIDE_MAX_BONUS = 15;  // added to `social` at max prestige (PRESTIGE_MAX, see prestigeSystem.ts)
const REPUTATION_PRIDE_PRESTIGE_MAX = 150;

// Affordability compares the enrollment-weighted average price actually paid
// (types.ts's tuitionByClass: returning classes keep older prices) with
// priceTolerance. Free is the full bonus; at or above tolerance is none.
const AFFORDABILITY_MAX_BONUS = 20; // added to `basicNeeds` at a price of zero

// Reads annualTuitionBilled so class prices are summed in one place, shared
// with the Treasury. An empty campus scores 0.
function affordabilityBonus(s: GameState): number {
  const enrolled = totalEnrolled(s.students);
  if (enrolled <= 0) return 0;
  const averagePricePaid = annualTuitionBilled(s) / enrolled;
  const tolerance = priceTolerance(s.self.reputation);
  if (tolerance <= 0) return 0;
  const ratio = Math.max(averagePricePaid, 0) / tolerance;
  return clamp(1 - ratio, 0, 1) * AFFORDABILITY_MAX_BONUS;
}

// Additive, capped bonus to `academic` from course quality, on top of the
// library ratio, so either input alone carries the attribute only partway.
const FACULTY_QUALITY_MAX_BONUS = 15; // added to `academic` when every course offered is graded at the top of the scale (see teachingSatisfaction)

// Satisfaction's one consequence is word of mouth on the next admissions
// pool (admissionsSystem.ts's WORD_OF_MOUTH_STRENGTH), so a class arriving
// ahead of its facilities shrinks the next pool: growth is paid in advance.

// Total servesPopulation feeding an attribute (flat contributors excluded;
// see flatBonusFor). Exported for demandSystem.ts, which measures demands
// against this same reading.
export function servedPopulationFor(s: GameState, attribute: keyof SatisfactionAttributes): number {
  return s.tech
    .filter((t) => t.effects?.satisfactionAttribute === attribute)
    .reduce((sum, t) => sum + servingPopulation(t), 0);
}

function flatBonusFor(s: GameState, attribute: keyof SatisfactionAttributes): number {
  return s.tech
    .filter((t) => t.status === 'done' && t.effects?.satisfactionAttribute === attribute)
    .reduce((sum, t) => sum + (t.effects?.flatSatisfactionBonus ?? 0), 0);
}

// Share of an attribute's need currently covered, 0..1: the `ratio` that
// ratioScore scores. Exported for demandSystem.ts's rollShortfallDemand, so
// demands only target needs this model considers short. Housing reads bed
// capacity.
export function attributeCoverage(s: GameState, attribute: keyof SatisfactionAttributes): number {
  const enrolled = totalEnrolled(s.students);
  if (enrolled <= 0) return 1;
  const served = attribute === 'housing' ? s.students.capacity : servedPopulationFor(s, attribute);
  return clamp(served / (enrolled * expectedRatio(s, attribute)), 0, 1);
}

function ratioScore(servesPopulation: number, enrolled: number, targetRatio: number, curvature: number): number {
  if (enrolled <= 0) return 100; // nothing to serve yet — not a problem
  const ratio = clamp(servesPopulation / (enrolled * targetRatio), 0, 1);
  return clamp(100 * ratio ** curvature, ATTRIBUTE_SCORE_FLOOR, 100);
}

// Mean quality grade across every course currently offered, 0..1
// (data/courseQuality.ts): what students actually experience, so improving
// a weak course moves `academic` as much as opening one. No courses reads 0.
function teachingSatisfaction(s: GameState): number {
  const avg = campusAverageCourseQuality(s);
  return avg === null ? 0 : clamp(avg / 100, 0, 1);
}

// How the students take the faculty's quirks (data/quirkData.ts): their
// morale summed across the roster, scaled and capped either way.
export function facultyMorale(s: GameState): number {
  const sum = s.faculty.reduce((t, f) => t + (quirkById(f.quirk)?.effects.morale ?? 0), 0);
  return Math.max(-QUIRK_MORALE_CAP, Math.min(QUIRK_MORALE_CAP, sum * QUIRK_MORALE_PER_POINT));
}

export function computeSatisfactionBreakdown(s: GameState): SatisfactionAttributes {
  const enrolled = totalEnrolled(s.students);

  // Library ratio plus course-quality bonus, clamped to the shared band.
  const academicLibraryRatio = ratioScore(servedPopulationFor(s, 'academic'), enrolled, expectedRatio(s, 'academic'), 1);
  const academicFacultyBonus = teachingSatisfaction(s) * FACULTY_QUALITY_MAX_BONUS;
  // Sensible neighbours (systems/estate/pairing.ts), a couple of points at most.
  const pairing = pairingBumps(s);
  const academic = clamp(academicLibraryRatio + academicFacultyBonus + pairing.academic + facultyMorale(s), ATTRIBUTE_SCORE_FLOOR, 100);

  const socialRatio = ratioScore(servedPopulationFor(s, 'social'), enrolled, expectedRatio(s, 'social'), SOCIAL_PENALTY_CURVATURE);
  const pride = clamp(s.self.reputation / REPUTATION_PRIDE_PRESTIGE_MAX, 0, 1) * REPUTATION_PRIDE_MAX_BONUS;
  // Student organisations add a flat bonus (it does not dilute as the campus
  // grows), read live off s.orgs each week like BuildableEffects.
  const social = clamp(
    socialRatio + flatBonusFor(s, 'social') + pride + studentLifeSocialBonus(s),
    ATTRIBUTE_SCORE_FLOOR,
    100,
  );

  const basicNeedsRatio = ratioScore(servedPopulationFor(s, 'basicNeeds'), enrolled, TARGET_RATIO.basicNeeds, BASIC_NEEDS_PENALTY_CURVATURE);
  const affordability = affordabilityBonus(s);
  const basicNeeds = clamp(basicNeedsRatio + affordability, ATTRIBUTE_SCORE_FLOOR, 100);

  // Health scores full (dormant) below the health center's population gate.
  const health = enrolled < HEALTH_CENTER_TIER1_POPULATION_GATE
    ? 100
    : ratioScore(servedPopulationFor(s, 'health'), enrolled, TARGET_RATIO.health, 1);

  // Housing: bed capacity (dorms plus housed Greek chapters) over enrolled.
  const housing = clamp(ratioScore(s.students.capacity, enrolled, expectedRatio(s, 'housing'), 1) + pairing.housing, ATTRIBUTE_SCORE_FLOOR, 100);

  return { academic, social, basicNeeds, health, housing };
}

// Per-attribute detail for StudentLifeTab.tsx's expandable breakdown, built
// from the same terms computeSatisfactionBreakdown sums so the two can
// never disagree.
export interface AttributeContributor {
  label: string;
  value: number; // a building's servesPopulation, or a named bonus in points
}

export interface AttributeDetail {
  contributors: AttributeContributor[]; // 'done' buildings serving this attribute, largest first
  totalServed: number;
  neededForFullScore: number;           // enrolled x TARGET_RATIO[attribute]
  bonuses: AttributeContributor[];      // named point bonuses beyond served population (faculty quality, prestige pride, ...)
  score: number;                        // computeSatisfactionBreakdown()'s 0..100 score
  dormant: boolean;                     // health only, below its population gate
}

export function attributeDetail(s: GameState, attribute: keyof SatisfactionAttributes): AttributeDetail {
  const enrolled = totalEnrolled(s.students);
  const dormant = attribute === 'health' && enrolled < HEALTH_CENTER_TIER1_POPULATION_GATE;

  // Housing contributors are reconstructed (done dorms plus housed chapters)
  // because s.students.capacity is a single accumulated number.
  const contributors = attribute === 'housing'
    ? [
        ...s.tech
          .filter((t) => t.kind === 'dorm' && t.status === 'done' && (t.effects?.capacityBonus ?? 0) > 0)
          .map((t) => ({ label: t.name, value: t.effects!.capacityBonus! })),
        ...s.orgs.chapters
          .filter((c) => c.housed)
          .map((c) => ({ label: `${c.name} House`, value: CHAPTER_HOUSE_CAPACITY_BONUS })),
      ].sort((a, b) => b.value - a.value)
    : s.tech
        .filter((t) => t.effects?.satisfactionAttribute === attribute && servingPopulation(t) > 0)
        // A library mid-renovation lists what it serves this week, so the
        // drawer adds up to the score.
        .map((t) => ({ label: t.name, value: servingPopulation(t) }))
        .sort((a, b) => b.value - a.value);
  const totalServed = contributors.reduce((sum, c) => sum + c.value, 0);

  const bonuses: AttributeContributor[] = [];
  const flat = flatBonusFor(s, attribute);
  if (flat > 0) bonuses.push({ label: 'Quad & other flat contributors', value: flat });
  if (attribute === 'academic') {
    const facultyBonus = teachingSatisfaction(s) * FACULTY_QUALITY_MAX_BONUS;
    if (facultyBonus > 0) bonuses.push({ label: 'Course quality', value: facultyBonus });
  }
  if (attribute === 'social') {
    const pride = clamp(s.self.reputation / REPUTATION_PRIDE_PRESTIGE_MAX, 0, 1) * REPUTATION_PRIDE_MAX_BONUS;
    if (pride > 0) bonuses.push({ label: 'Campus pride (prestige)', value: pride });
    const orgs = studentLifeSocialBonus(s);
    if (orgs > 0) bonuses.push({ label: 'Clubs, Greek life & athletics', value: orgs });
  }
  if (attribute === 'basicNeeds') {
    const affordability = affordabilityBonus(s);
    if (affordability > 0) bonuses.push({ label: 'Affordability (price vs. standing)', value: affordability });
  }
  if (attribute === 'academic') {
    const morale = facultyMorale(s);
    if (morale !== 0) bonuses.push({ label: 'The faculty\'s characters', value: morale });
  }
  if (attribute === 'academic' || attribute === 'housing') {
    const pairing = pairingBumps(s)[attribute];
    if (pairing > 0) bonuses.push({ label: attribute === 'academic' ? 'Halls near a library' : 'Residences near a dining hall', value: pairing });
  }

  return {
    contributors,
    totalServed,
    neededForFullScore: Math.round(enrolled * expectedRatio(s, attribute)),
    bonuses,
    score: computeSatisfactionBreakdown(s)[attribute],
    dormant,
  };
}

function weightedSum(breakdown: SatisfactionAttributes): number {
  return (
    breakdown.academic * ATTRIBUTE_WEIGHTS.academic +
    breakdown.social * ATTRIBUTE_WEIGHTS.social +
    breakdown.basicNeeds * ATTRIBUTE_WEIGHTS.basicNeeds +
    breakdown.health * ATTRIBUTE_WEIGHTS.health +
    breakdown.housing * ATTRIBUTE_WEIGHTS.housing
  ) / 100;
}

// The target the headline drifts toward. Exported so views read the real one.
// A Commuter college's students go home at five (an identity tag's teeth,
// Plan 31).
export function satisfactionTarget(s: GameState): number {
  return clamp(diminished(weightedSum(computeSatisfactionBreakdown(s))) + tagTeeth(s, 'satisfaction'), 0, 100);
}

// What student life is worth on the satisfaction target. Orgs nudge the
// target, not the stock, so this reruns the real computation on shallow
// copies with each source removed (like prestigeTargetWithout) and reports
// the difference. Unlike summing bonus constants, this is honest when
// `social` is already clamped at 100.
export interface StudentLifeSatisfaction {
  clubCount: number;
  chapterCount: number;
  teamCount: number; // active varsity teams only
  // The raw flat contributions each source offers the `social` attribute,
  // before the aggregate cap and before `social` itself is clamped.
  clubSocialBonus: number;
  greekSocialBonus: number;
  athleticsSocialBonus: number;
  // Worth on the headline target, in points, after every clamp.
  clubTargetContribution: number;
  greekTargetContribution: number;
  athleticsTargetContribution: number;
  totalTargetContribution: number;
  target: number;              // the satisfaction target as it stands
  targetWithoutStudentLife: number; // and what it would be with no clubs, no chapters and no athletics
}

function withoutOrgs(s: GameState, clubs: boolean, chapters: boolean, teams: boolean): GameState {
  return {
    ...s,
    orgs: {
      ...s.orgs,
      clubs: clubs ? [] : s.orgs.clubs,
      chapters: chapters ? [] : s.orgs.chapters,
      teams: teams ? [] : s.orgs.teams,
    },
  };
}

export function studentLifeSatisfaction(s: GameState): StudentLifeSatisfaction {
  const target = satisfactionTarget(s);
  const withoutClubs = satisfactionTarget(withoutOrgs(s, true, false, false));
  const withoutGreek = satisfactionTarget(withoutOrgs(s, false, true, false));
  const withoutAthletics = satisfactionTarget(withoutOrgs(s, false, false, true));
  const withoutAll = satisfactionTarget(withoutOrgs(s, true, true, true));

  return {
    clubCount: s.orgs.clubs.length,
    chapterCount: s.orgs.chapters.length,
    teamCount: s.orgs.teams.filter((t) => t.status === 'active').length,
    clubSocialBonus: clubSocialBonus(s),
    greekSocialBonus: greekSocialBonus(s),
    athleticsSocialBonus: athleticsSocialBonus(s),
    clubTargetContribution: target - withoutClubs,
    greekTargetContribution: target - withoutGreek,
    athleticsTargetContribution: target - withoutAthletics,
    totalTargetContribution: target - withoutAll,
    target,
    targetWithoutStudentLife: withoutAll,
  };
}

export function tickSatisfaction(s: GameState): void {
  const breakdown = computeSatisfactionBreakdown(s);
  s.students.satisfactionBreakdown = breakdown;

  const target = clamp(diminished(weightedSum(breakdown)) + tagTeeth(s, 'satisfaction'), 0, 100);
  s.students.satisfaction += (target - s.students.satisfaction) * SATISFACTION_DRIFT_RATE;
  s.students.satisfaction = clamp(s.students.satisfaction, 0, 100);

  // Trailing-year sum for word of mouth (admissionsSystem.ts's
  // trailingYearSatisfaction); reset at RESOLVE_ADMISSIONS.
  s.students.satisfactionYearSum += s.students.satisfaction;
  s.students.satisfactionYearWeeks += 1;
}
