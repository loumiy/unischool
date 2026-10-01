import { tagTeeth } from '../identity/teeth';
import { QUIRK_MORALE_CAP, QUIRK_MORALE_PER_POINT, quirkById } from '../../data/quirkData';
import { pairingBumps } from '../estate/pairing';
import type { Buildable, GameState, SatisfactionAttributes } from '../../state/types';
import { HEALTH_CENTER_TIER1_POPULATION_GATE, isRetailFood, RETAIL_FOOD_SHARE } from '../../data/facilitiesData';
import {
  athleticsSocialBonus, CHAPTER_HOUSE_CAPACITY_BONUS, clubSocialBonus, greekSocialBonus, studentLifeSocialBonus,
} from '../../data/studentLifeData';
import { servingPopulation, standsOnCampus, totalEnrolled } from '../../state/types';
import { extensionGain } from '../estate/estate';
import { campusCourseScores } from '../faculty/facultyAssignment';
import { GRADE_POINTS, meanGradePoints } from '../../data/courseQuality';
import { annualTuitionBilled } from '../finance/financeSystem';
import { priceTolerance } from '../admissions/admissionsSystem';
import { clamp } from '../../math';
import { DOWNTOWN_WORDS, offCampusShare } from '../../data/downtownData';
import { pct } from '../../format';

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
// Social at 0.34: a maxed student center and the Recreation Center (5,200,
// the Athletics Complex feeding health since Plan 80F) cover only ~15,300
// enrolled, so growing schools must lean on the quad and student
// life. Intended; do not raise it. Housing at 0.35: commuting is the norm.
export const TARGET_RATIO: SatisfactionAttributes = {
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
export function expectedRatio(s: GameState, attribute: keyof SatisfactionAttributes): number {
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

// Academic satisfaction (Plans 71 and 80F): what students meet in class,
// and somewhere to study. ACADEMIC_TEACHING_POINTS come from the courses'
// grades, read against what these students expect (expectedGradePoints):
// better students demand better teaching. The library's seats are worth
// ACADEMIC_LIBRARY_POINTS (a fifth until Plan 80F, two fifths since).
export const ACADEMIC_TEACHING_POINTS = 60;
export const ACADEMIC_LIBRARY_POINTS = 40;
// The courses are read as grade points (courseQuality.ts's GRADE_POINTS,
// the same reading prestige's teaching ceiling takes): nothing at a C's
// points or below, full credit at the points these students expect, a
// straight line between. What they expect runs from EXPECTED_AT_LOW for an
// intake of STANDARD_LOW_QUALITY or below (a quarter of the courses at A,
// the rest B) to EXPECTED_AT_HIGH for one of STANDARD_HIGH_QUALITY or above
// (three quarters at A). So a campus of B's with a library that seats its
// students reads about 87 with a weak class and about 72 with the best
// (test/teaching-standard.test.ts pins 70–90), and only A's everywhere read
// full marks for every class.
const STANDARD_LOW_QUALITY = 40;
const STANDARD_HIGH_QUALITY = 85;
const EXPECTED_AT_LOW = 0.73;
const EXPECTED_AT_HIGH = 0.92;
export function expectedGradePoints(s: GameState): number {
  const q = clamp((s.students.incomingQuality - STANDARD_LOW_QUALITY) / (STANDARD_HIGH_QUALITY - STANDARD_LOW_QUALITY), 0, 1);
  return EXPECTED_AT_LOW + (EXPECTED_AT_HIGH - EXPECTED_AT_LOW) * q;
}
// 0..1: how close the courses on offer come to what these students expect.
export function teachingAgainstStandard(s: GameState): number {
  const scores = campusCourseScores(s);
  if (scores.length === 0) return 0;
  const floor = GRADE_POINTS.C;
  return clamp((meanGradePoints(scores) - floor) / (expectedGradePoints(s) - floor), 0, 1);
}
// The share of courses at A, the rest at B, that earns the teaching's full
// points: how the Students tab says what these students expect.
export function aShareForFullMarks(s: GameState): number {
  return clamp((expectedGradePoints(s) - GRADE_POINTS.B) / (GRADE_POINTS.A - GRADE_POINTS.B), 0, 1);
}

// Satisfaction's one consequence is word of mouth on the next admissions
// pool (admissionsSystem.ts's WORD_OF_MOUTH_STRENGTH), so a class arriving
// ahead of its facilities shrinks the next pool: growth is paid in advance.

// Total servesPopulation feeding an attribute (flat contributors excluded;
// see flatBonusFor). Exported for demandSystem.ts, which measures demands
// against this same reading; `extra` counts buildings as if they stood (a
// demand's ask). Food bought at the grocery and the towers' shops counts for
// at most RETAIL_FOOD_SHARE of what the students need (Plan 80F), so the
// dining halls carry the rest.
export function servedPopulationFor(s: GameState, attribute: keyof SatisfactionAttributes, extra: readonly Buildable[] = []): number {
  let served = 0;
  let retail = 0;
  const add = (t: Buildable, n: number) => {
    if (attribute === 'basicNeeds' && isRetailFood(t)) retail += n;
    else served += n;
  };
  for (const t of s.tech) if (t.effects?.satisfactionAttribute === attribute) add(t, servingPopulation(t));
  for (const t of extra) if (t.effects?.satisfactionAttribute === attribute) add(t, t.effects?.servesPopulation ?? 0);
  return served + Math.min(retail, retailFoodCap(s)) + offCampusPlaces(s, attribute);
}

// Off-campus life (Plan 85H): at a college specialized in student life, the
// downtown district meets a share of the students' social, dining and
// housing needs (data/downtownData.ts's offCampusShare: up to
// OFF_CAMPUS_SHARE of each once grown in full), read against the need as
// the dial reads it. Counted with the buildings in servedPopulationFor (so
// crowding, demands and the building panel read it too) and, for housing,
// beside the beds.
export const OFF_CAMPUS_NEEDS: ReadonlyArray<keyof SatisfactionAttributes> = ['social', 'basicNeeds', 'housing'];
export function offCampusPlaces(s: GameState, attribute: keyof SatisfactionAttributes): number {
  if (!OFF_CAMPUS_NEEDS.includes(attribute)) return 0;
  const share = offCampusShare(s);
  if (share <= 0) return 0;
  return Math.round(share * totalEnrolled(s.students) * expectedRatio(s, attribute));
}

// The beds the students have: the campus's, and the downtown's (Plan 85H).
export function bedsWithDowntown(s: GameState): number {
  return s.students.capacity + offCampusPlaces(s, 'housing');
}

// The most the grocery and the towers' shops can count for: RETAIL_FOOD_SHARE
// of what the students need to eat.
export function retailFoodCap(s: GameState): number {
  return RETAIL_FOOD_SHARE * totalEnrolled(s.students) * TARGET_RATIO.basicNeeds;
}

// What share of the grocery's and the towers' shops' places count: 1 up to
// the cap, less past it.
function retailScale(s: GameState): number {
  const retail = s.tech.filter(isRetailFood).reduce((sum, t) => sum + servingPopulation(t), 0);
  return retail > 0 ? Math.min(1, retailFoodCap(s) / retail) : 1;
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
  const served = attribute === 'housing' ? bedsWithDowntown(s) : servedPopulationFor(s, attribute);
  return clamp(served / (enrolled * expectedRatio(s, attribute)), 0, 1);
}

function ratioScore(servesPopulation: number, enrolled: number, targetRatio: number, curvature: number): number {
  if (enrolled <= 0) return 100; // nothing to serve yet — not a problem
  const ratio = clamp(servesPopulation / (enrolled * targetRatio), 0, 1);
  return clamp(100 * ratio ** curvature, ATTRIBUTE_SCORE_FLOOR, 100);
}

// How the students take the faculty's quirks (data/quirkData.ts): their
// morale summed across the roster, scaled and capped either way.
export function facultyMorale(s: GameState): number {
  const sum = s.faculty.reduce((t, f) => t + (quirkById(f.quirk)?.effects.morale ?? 0), 0);
  return Math.max(-QUIRK_MORALE_CAP, Math.min(QUIRK_MORALE_CAP, sum * QUIRK_MORALE_PER_POINT));
}

// The library's share of `academic`: its seats against the students, up to
// ACADEMIC_LIBRARY_POINTS. An empty campus reads full.
function libraryPoints(s: GameState): number {
  const enrolled = totalEnrolled(s.students);
  if (enrolled <= 0) return ACADEMIC_LIBRARY_POINTS;
  return clamp(servedPopulationFor(s, 'academic') / (enrolled * expectedRatio(s, 'academic')), 0, 1) * ACADEMIC_LIBRARY_POINTS;
}

export function computeSatisfactionBreakdown(s: GameState): SatisfactionAttributes {
  const enrolled = totalEnrolled(s.students);

  // Teaching against the standard, plus the library's seats (Plan 71).
  const academicLibrary = libraryPoints(s);
  const academicTeaching = teachingAgainstStandard(s) * ACADEMIC_TEACHING_POINTS;
  // Sensible neighbors (systems/estate/pairing.ts), a couple of points at most.
  const pairing = pairingBumps(s);
  const academic = clamp(academicTeaching + academicLibrary + pairing.academic + facultyMorale(s), ATTRIBUTE_SCORE_FLOOR, 100);

  const socialRatio = ratioScore(servedPopulationFor(s, 'social'), enrolled, expectedRatio(s, 'social'), SOCIAL_PENALTY_CURVATURE);
  const pride = clamp(s.self.reputation / REPUTATION_PRIDE_PRESTIGE_MAX, 0, 1) * REPUTATION_PRIDE_MAX_BONUS;
  // Student organizations add a flat bonus (it does not dilute as the campus
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

  // Housing: bed capacity (dorms plus housed Greek chapters, and the
  // downtown's, Plan 85H) over enrolled.
  const housing = clamp(ratioScore(bedsWithDowntown(s), enrolled, expectedRatio(s, 'housing'), 1) + pairing.housing, ATTRIBUTE_SCORE_FLOOR, 100);

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

  // Housing contributors are reconstructed because s.students.capacity is a
  // single accumulated number: every standing building's beds (dorms, and
  // anything else built with beds), a dorm's added stories, and housed
  // chapters. The same terms demolition.ts takes back off, so the drawer
  // adds up to the capacity.
  const contributors = attribute === 'housing'
    ? [
        ...s.tech
          .filter((t) => standsOnCampus(t) && (t.effects?.capacityBonus ?? 0) > 0)
          .map((t) => ({
            label: t.name,
            value: t.effects!.capacityBonus! + (t.kind === 'dorm' ? (t.floorsAdded ?? 0) * extensionGain(t) : 0),
          })),
        ...s.orgs.chapters
          .filter((c) => c.housed)
          .map((c) => ({ label: `${c.name} House`, value: CHAPTER_HOUSE_CAPACITY_BONUS })),
      ].sort((a, b) => b.value - a.value)
    : s.tech
        .filter((t) => t.effects?.satisfactionAttribute === attribute && servingPopulation(t) > 0)
        // A library mid-renovation lists what it serves this week, so the
        // drawer adds up to the score. The grocery and the towers' shops
        // past their share list what they count for (Plan 80F).
        .map((t) => (attribute === 'basicNeeds' && isRetailFood(t) && retailScale(s) < 1
          ? { label: `${t.name} (the grocery and shops cover ${pct(RETAIL_FOOD_SHARE)} of meals at most)`, value: servingPopulation(t) * retailScale(s) }
          : { label: t.name, value: servingPopulation(t) }))
        .sort((a, b) => b.value - a.value);
  // The downtown's places (Plan 85H), last.
  const offCampus = offCampusPlaces(s, attribute);
  if (offCampus > 0) contributors.push({ label: DOWNTOWN_WORDS.offCampus, value: offCampus });
  const totalServed = contributors.reduce((sum, c) => sum + c.value, 0);

  const bonuses: AttributeContributor[] = [];
  const flat = flatBonusFor(s, attribute);
  if (flat > 0) bonuses.push({ label: 'Quads and the like, at any size', value: flat });
  if (attribute === 'academic') {
    const teaching = teachingAgainstStandard(s) * ACADEMIC_TEACHING_POINTS;
    bonuses.push({ label: `Teaching, against what these students expect (A's in ${pct(aShareForFullMarks(s))} of courses, B's in the rest)`, value: teaching });
    bonuses.push({ label: 'Library seats', value: libraryPoints(s) });
  }
  if (attribute === 'social') {
    const pride = clamp(s.self.reputation / REPUTATION_PRIDE_PRESTIGE_MAX, 0, 1) * REPUTATION_PRIDE_MAX_BONUS;
    if (pride > 0) bonuses.push({ label: 'Campus pride (prestige)', value: pride });
    const orgs = studentLifeSocialBonus(s);
    if (orgs > 0) bonuses.push({ label: 'Clubs, Greek life & athletics', value: orgs });
  }
  if (attribute === 'basicNeeds') {
    const affordability = affordabilityBonus(s);
    if (affordability > 0) bonuses.push({ label: 'Affordability (the price against prestige)', value: affordability });
  }
  if (attribute === 'academic') {
    const morale = facultyMorale(s);
    if (morale !== 0) bonuses.push({ label: 'Faculty personalities', value: morale });
  }
  if (attribute === 'academic' || attribute === 'housing') {
    const pairing = pairingBumps(s)[attribute];
    if (pairing > 0) bonuses.push({ label: attribute === 'academic' ? 'Academic halls near a library' : 'Residence halls near a dining hall', value: pairing });
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
