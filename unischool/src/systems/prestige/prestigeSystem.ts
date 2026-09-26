import { projectLift, projectLiftMax, standingProjects } from '../estate/projects';
import { campusBeauty } from '../estate/beauty';
import { conditionOf, historicPrestige } from '../estate/estate';
import { isPlaceableKind } from '../../state/campusMap';
import type { GameState, ReportCard, SatisfactionAttributes } from '../../state/types';
import { servingPopulation, standsOnCampus, totalEnrolled } from '../../state/types';
import { graduatePrograms, milestoneSchools } from '../../data/techData';
import { campusAverageCourseQuality, campusCourseScores } from '../faculty/facultyAssignment';
import { gradeFor, teachingQualityScore, type Grade } from '../../data/courseQuality';
import { INITIATIVE_COMPLETION_CREDIT, labEquippedFields, researchableFields } from '../../data/researchData';
import { athleticProgramStrength, sportEconomics, studentLifeSocialBonus, STUDENT_LIFE_SOCIAL_BONUS_CAP } from '../../data/studentLifeData';
import { HEALTH_CENTER_TIER1_POPULATION_GATE } from '../../data/facilitiesData';
import { TARGET_RATIO, attributeCoverage } from '../satisfaction/satisfactionSystem';
import { trailingYearSatisfaction } from '../admissions/admissionsSystem';
import { isSchoolFounded } from '../techtree/schools';
import { instructionCapacityDetail, instructionCoverage, SEATS_PER_COURSE } from '../techtree/instructionCapacity';
import { money, pct } from '../../format';
import { clamp, clamp01 } from '../../math';

// Prestige (s.self.reputation) is a slow-moving stock pulled toward a target
// computed from durable inputs. It moves in two ways: the summer report card
// (gradeYear) steps it toward the year's score, falling faster than rising,
// and a weekly tremor (tickPrestige) keeps it alive between summers. Welfare
// and crowding are graded on the year's average so a dorm finished in week
// 50 cannot game them. Selectivity is not an input: the admit rate is itself
// a function of prestige. Every score is clamped to 0..1 before weighting,
// so no input exceeds its weight and the prestige/quality loop cannot spiral.

// The target before any input: below the field's median, so a fresh school
// is unremarkable until it earns its way up.
const PRESTIGE_BASELINE = 32;

// Share of the gap closed each week by the weekly-drifting standings:
// ~12% of the gap over a year, 1 - (1 - 0.12)^(1/52) ≈ 0.00246.
const PRESTIGE_DRIFT_RATE = 0.0025;

// The summer step, as shares of the gap to the year score.
export const PRESTIGE_RISE_RATE = 0.20;
export const PRESTIGE_FALL_RATE = 0.30;
// The most one summer can add (Plan 67): standing is earned a year at a time,
// however far the college has outgrown it. Without it a college that filled
// its catalog in a decade reached the cap in fifteen years; with it the
// climb from the founding's low fifties to 150 takes about forty.
export const PRESTIGE_MAX_RISE = 2.1;

// Weekly movement between summers; the summer step is the beat.
const PRESTIGE_TREMOR_RATE = PRESTIGE_DRIFT_RATE / 10;

// Weight of each 0..1 input; the target is clamped to PRESTIGE_MAX. Faculty
// stats are not an input: teaching and research already count through
// course grades and research output.
const CURRICULUM_BREADTH_WEIGHT = 50; // majors/schools completed; the largest single term
const CONCENTRATION_WEIGHT = 30;      // how deep the deepest school is — founded and distinguished (see concentrationScore below)
const TEACHING_QUALITY_WEIGHT = 30;   // how good the courses actually are, as its own input (see teachingScore below)
const STUDENT_QUALITY_WEIGHT = 24;    // emergent avg incoming quality — grows with a low-tuition, selective posture
const RESEARCH_WEIGHT = 22;           // what the university's research has actually produced (see researchScore below)
const WELFARE_WEIGHT = 20;            // the year's average satisfaction, scored from 40 to 80 (see welfareScore below)
// Campus life: every athletics venue and rec-center rung carries a
// prestigeContribution (facilitiesData.ts); a full build reads about 0.55.
const CAMPUS_LIFE_WEIGHT = 12;
// Campus beauty (systems/estate/beauty.ts): either way from a neutral 50.
const BEAUTY_WEIGHT = 6;
// Estate condition (Plan 31, V1-21): the finished buildings' mean condition
// (systems/estate/estate.ts). Only neglect counts: full condition costs
// nothing, and a mean of half or worse costs the whole weight.
const CONDITION_PENALTY = 4;
const CONDITION_FLOOR = 0.5;
const ENDOWMENT_WEIGHT = 8;           // financial resources per student; any larger and it is a term nobody could earn
const CROWDING_PENALTY = 25;          // the most crowding can SUBTRACT (see crowdingScore below)

// Same band as rivalsSystem.ts's RIVAL_REPUTATION_MIN/MAX, so the player's
// prestige and rivals' reputation stay on one comparable scale.
const PRESTIGE_MIN = 5;
const PRESTIGE_MAX = 150;

// Curriculum breadth: a stock read off the durable milestones techSystem.ts
// awards; the four shares sum to 1. Graduate programs are a share inside
// this term, not a weight of their own, so they cannot raise the ceiling
// (docs/design/graduate-programs.md).
const PROGRAM_ESTABLISHED_SHARE = 0.34;
const PROGRAM_DISTINGUISHED_SHARE = 0.26;
const SCHOOL_DISTINGUISHED_SHARE = 0.25;
const GRADUATE_PROGRAM_SHARE = 0.15;

// Completed graduate programs' weights over every program's weight.
function graduateBreadthFraction(s: GameState): number {
  const programs = graduatePrograms();
  const total = programs.reduce((sum, program) => sum + program.prestigeWeight, 0);
  if (total <= 0) return 0;
  const earned = programs
    .filter((program) => s.milestones[`grad-program-complete:${program.id}`])
    .reduce((sum, program) => sum + program.prestigeWeight, 0);
  return earned / total;
}

export function curriculumBreadthScore(s: GameState): number {
  const schools = milestoneSchools();
  const totalMajors = schools.reduce((sum, school) => sum + school.majors.length, 0);
  const schoolsWithMajors = schools.filter((school) => school.majors.length > 0).length;
  if (totalMajors === 0 || schoolsWithMajors === 0) return 0;

  let programsEstablished = 0;
  let programsDistinguished = 0;
  let schoolsDistinguished = 0;
  for (const school of schools) {
    for (const major of school.majors) {
      if (s.milestones[`program-established:${major.prefix}`]) programsEstablished += 1;
      if (s.milestones[`program-distinguished:${major.prefix}`]) programsDistinguished += 1;
    }
    if (school.majors.length > 0 && s.milestones[`school-distinguished:${school.schoolName}`]) schoolsDistinguished += 1;
  }

  return clamp01(
    PROGRAM_ESTABLISHED_SHARE * (programsEstablished / totalMajors) +
    PROGRAM_DISTINGUISHED_SHARE * (programsDistinguished / totalMajors) +
    SCHOOL_DISTINGUISHED_SHARE * (schoolsDistinguished / schoolsWithMajors) +
    GRADUATE_PROGRAM_SHARE * graduateBreadthFraction(s),
  );
}

// A floored multiplier on student-quality credit, so a tiny school of top
// students cannot ride that input to the top of the rankings.
const ADMISSIONS_SCALE_FOR_FULL_CREDIT = 6_000; // enrolled students at which incoming quality counts in full
const ADMISSIONS_SCALE_FLOOR = 0.35;
function admissionsScaleScore(s: GameState): number {
  return clamp(totalEnrolled(s.students) / ADMISSIONS_SCALE_FOR_FULL_CREDIT, ADMISSIONS_SCALE_FLOOR, 1);
}

function studentQualityScore(s: GameState): number {
  return clamp01(s.students.incomingQuality / 100);
}

// Library adequacy: a floored multiplier on curriculum breadth, against
// satisfactionSystem.ts's academic target (before rising expectations).
const LIBRARY_TARGET_RATIO = TARGET_RATIO.academic;
const LIBRARY_ADEQUACY_FLOOR = 0.4;
function libraryAdequacyScore(s: GameState): number {
  const enrolled = totalEnrolled(s.students);
  if (enrolled <= 0) return 1;
  // A library under a new floor serves its old figure (types.ts's
  // servingPopulation), as satisfaction reads it.
  const servesPopulation = s.tech
    .filter((t) => standsOnCampus(t) && t.facilityType === 'library')
    .reduce((sum, t) => sum + servingPopulation(t), 0);
  const ratio = clamp01(servesPopulation / (enrolled * LIBRARY_TARGET_RATIO));
  return clamp(ratio, LIBRARY_ADEQUACY_FLOOR, 1);
}

// Charges for teaching actually delivered (courseQuality.ts's
// teachingQualityScore); a campus with no courses open reads 0.
function teachingScore(s: GameState): number {
  const avg = campusAverageCourseQuality(s);
  return avg === null ? 0 : teachingQualityScore(avg);
}

// From -1 at a campus scoring 0 to 1 at one scoring 100.
// 0 at full condition, 1 at CONDITION_FLOOR or worse.
function conditionScore(s: GameState): number {
  const standing = s.tech.filter((t) => isPlaceableKind(t) && standsOnCampus(t));
  if (standing.length === 0) return 0;
  const mean = standing.reduce((t, b) => t + conditionOf(b), 0) / standing.length;
  return Math.max(0, Math.min(1, (1 - mean) / (1 - CONDITION_FLOOR)));
}

function beautyScore(s: GameState): number {
  return Math.max(-1, Math.min(1, (campusBeauty(s) - 50) / 50));
}

function campusLifeScore(s: GameState): number {
  // In-place work (a venue expansion) stands throughout (standsOnCampus).
  const total = s.tech
    .filter((t) => standsOnCampus(t))
    .reduce((sum, t) => sum + (t.effects?.prestigeContribution ?? 0), 0);
  // Historic buildings lend a little of their own (systems/estate).
  return clamp01(total + historicPrestige(s));
}

// Research: its only path into prestige, as a capped, small-weighted input,
// so research supplements standing and never substitutes for curriculum. A
// monotone lifetime count. Publications are heavily discounted because they
// are common; canceled initiatives earn nothing.
const PUBLICATION_PRESTIGE_CREDIT = 0.1;
const BREAKTHROUGH_PRESTIGE_CREDIT = 1;
const PRIZE_PRESTIGE_CREDIT = 3;      // on top of what the winner's own output gains
const DOCTORATE_PRESTIGE_CREDIT = 2;  // a founded research doctorate, worth two breakthroughs
export const RESEARCH_CREDITS_FOR_FULL_SCORE = 20;
// Shared by the academic input and the research standing, which differ only
// in the denominator.
export function researchCredits(s: GameState): number {
  const doctorates = graduatePrograms().filter(
    (program) => program.type === 'doctoral' && s.milestones[`grad-program-complete:${program.id}`],
  ).length;
  return (
    PUBLICATION_PRESTIGE_CREDIT * s.research.publications +
    s.research.completedInitiatives.reduce(
      (sum, done) => sum + (done.cancelled ? 0 : INITIATIVE_COMPLETION_CREDIT[done.depth]),
      0,
    ) +
    BREAKTHROUGH_PRESTIGE_CREDIT * s.research.breakthroughs +
    PRIZE_PRESTIGE_CREDIT * s.research.prizes +
    DOCTORATE_PRESTIGE_CREDIT * doctorates
  );
}

export function researchScore(s: GameState): number {
  return clamp01(researchCredits(s) / RESEARCH_CREDITS_FOR_FULL_SCORE);
}

// Endowment per enrolled student: what late-game campaigns buy, bounded.
// Read against enrolled rather than beds, which would favor commuter schools.
const ENDOWMENT_PER_SEAT_FOR_FULL_SCORE = 400_000;
export function endowmentScore(s: GameState): number {
  const enrolled = totalEnrolled(s.students);
  if (enrolled <= 0) return 0;
  return clamp01(s.finance.endowment / (enrolled * ENDOWMENT_PER_SEAT_FOR_FULL_SCORE));
}

// =====================================================================
// The breakdown: the target functions are sums over it, so the panel
// (HistoryTab.tsx) can never disagree with the engine. Readings are shown
// but not counted, and kept out of `inputs` so the sum stays exact.
// =====================================================================

// A floored multiplier: the term is only worth its full weight to a school
// that can serve the students it has.
export interface StandingMultiplier {
  label: string;
  value: number;   // 0..1
  detail: string;  // what the ratio is, in the units a reader recognizes
}

export interface StandingInput {
  key: string;
  label: string;
  score: number;         // the raw 0..1 reading, before weighting
  weight: number;        // the most this input can ever be worth (or, for a penalty, cost)
  contribution: number;  // weight * score * (multiplier ?? 1) — what it IS worth; negative for a penalty
  multiplier?: StandingMultiplier;
  penalty?: boolean;     // a subtraction rather than an input: the contribution is -weight * score
  detail: string;        // one line about what the score actually read
}

export interface SummerModel {
  riseRate: number;
  maxRise: number;
  fallRate: number;
  reportCard: ReportCard | null;
}

// A term shown but not counted: `reach` is what it would add or subtract.
export interface StandingReading {
  key: string;
  label: string;
  score: number;         // 0..1
  weight?: number;       // the proposed weight, once it counts; absent for a reading that is never an input
  reach: number;         // (weight ?? 0) * score — what it would be worth, and is not
  penalty?: boolean;     // true when the reach would be subtracted rather than added
  detail: string;        // one line about what the score actually read
}

export interface StandingBreakdown {
  label: string;
  baseline: number;         // what a school with nothing scores
  inputs: StandingInput[];
  readings: StandingReading[]; // measured and shown, counted by nothing — see StandingReading
  target: number;           // baseline + every contribution, clamped to the band
  current: number;          // the stock today — what the target is pulling on
  driftRate: number;        // the share of the gap that closes each week between summers
  summer?: SummerModel;     // set on the standing that steps at the summer (academic)
  // A cap on the target set by something no sum of inputs can buy past
  // (Plan 71: academic standing and the teaching standard). Absent: none.
  ceiling?: { value: number; label: string; detail: string };
  min: number;
  max: number;
}

function weigh(
  key: string, label: string, weight: number, score: number, detail: string,
  multiplier?: StandingMultiplier,
): StandingInput {
  return {
    key, label, weight, score, detail, multiplier,
    contribution: weight * score * (multiplier?.value ?? 1),
  };
}

function penalise(key: string, label: string, weight: number, score: number, detail: string): StandingInput {
  return { key, label, weight, score, detail, penalty: true, contribution: -weight * score };
}

// The capital projects standing (Plan 33, estate/projects.ts): a line of
// their own, shown once one stands, each lifting in proportion to its
// condition.
function projectInput(s: GameState, axis: 'academics' | 'research' | 'experience'): StandingInput[] {
  const lift = projectLift(s, axis);
  if (lift <= 0) return [];
  const max = projectLiftMax(axis);
  const names = standingProjects(s).filter((t) => (t.project!.boosts[axis] ?? 0) > 0).map((t) => t.name);
  return [weigh('projects', 'Capital projects', max, lift / max, `${names.join(', ')}: ${lift.toFixed(1)} of the ${max} points every project in full repair would add.`)];
}

// Computes its own target, so no caller can disagree with the sum.
function breakdown(
  label: string, baseline: number, current: number, inputs: StandingInput[],
  readings: StandingReading[] = [], summer?: SummerModel, ceiling?: StandingBreakdown['ceiling'],
): StandingBreakdown {
  const total = inputs.reduce((sum, input) => sum + input.contribution, baseline);
  return {
    label, baseline, inputs, readings, current, summer, ceiling,
    target: Math.min(clamp(total, PRESTIGE_MIN, PRESTIGE_MAX), ceiling?.value ?? PRESTIGE_MAX),
    driftRate: summer ? PRESTIGE_TREMOR_RATE : PRESTIGE_DRIFT_RATE,
    min: PRESTIGE_MIN,
    max: PRESTIGE_MAX,
  };
}

function libraryMultiplier(s: GameState): StandingMultiplier {
  const enrolled = totalEnrolled(s.students);
  const seats = s.tech
    .filter((t) => standsOnCampus(t) && t.facilityType === 'library')
    .reduce((sum, t) => sum + servingPopulation(t), 0);
  return {
    label: 'library adequacy',
    value: libraryAdequacyScore(s),
    detail: `${seats.toLocaleString()} seats for ${enrolled.toLocaleString()} students`,
  };
}

function scaleMultiplier(s: GameState): StandingMultiplier {
  const enrolled = totalEnrolled(s.students);
  return {
    label: 'scale',
    value: admissionsScaleScore(s),
    detail: `${enrolled.toLocaleString()} enrolled of the ${ADMISSIONS_SCALE_FOR_FULL_CREDIT.toLocaleString()} a national reading counts in full`,
  };
}

// The teaching standard (Plan 71): no college becomes highly prestigious on
// mediocre teaching. The courses' grades, as points (A 1, B 0.65, C 0.35,
// D 0.1, F 0), cap the academic target: TEACHING_CEILING_FLOOR at nothing
// but F's, the full PRESTIGE_MAX only when every course is an A. A campus of
// B's tops out in the mid-120s.
const GRADE_POINTS: Record<Grade, number> = { A: 1, B: 0.65, C: 0.35, D: 0.1, F: 0 };
const TEACHING_CEILING_FLOOR = 95;
const TEACHING_CEILING_CURVE = 1.3;
export function teachingStandardShare(s: GameState): number {
  const scores = campusCourseScores(s);
  if (scores.length === 0) return 0;
  return scores.reduce((sum, score) => sum + GRADE_POINTS[gradeFor(score)], 0) / scores.length;
}
export function teachingCeiling(s: GameState): NonNullable<StandingBreakdown['ceiling']> {
  const share = teachingStandardShare(s);
  const value = TEACHING_CEILING_FLOOR + (PRESTIGE_MAX - TEACHING_CEILING_FLOOR) * share ** TEACHING_CEILING_CURVE;
  const scores = campusCourseScores(s);
  const aShare = scores.length > 0 ? scores.filter((x) => gradeFor(x) === 'A').length / scores.length : 0;
  return {
    value,
    label: 'The teaching standard',
    detail: `${Math.round(aShare * 100)}% of courses graded A: standing can reach ${value.toFixed(0)}. Only a campus teaching A's everywhere reaches ${PRESTIGE_MAX}.`,
  };
}

export function prestigeBreakdown(s: GameState): StandingBreakdown {
  const avgQuality = campusAverageCourseQuality(s);
  const average = trailingYearSatisfaction(s);
  const coverages = crowdingCoverages(s);
  const worst = coverages[0];
  return breakdown('Academic standing', PRESTIGE_BASELINE, s.self.reputation, [
    weigh(
      'breadth', 'Curriculum breadth', CURRICULUM_BREADTH_WEIGHT, curriculumBreadthScore(s),
      'Programs established and distinguished, schools distinguished, graduate programs founded.',
      libraryMultiplier(s),
    ),
    weigh(
      'concentration', 'Concentration', CONCENTRATION_WEIGHT, concentrationScore(s), concentrationDetail(s),
    ),
    weigh(
      'teaching', 'Teaching quality', TEACHING_QUALITY_WEIGHT, teachingScore(s),
      avgQuality === null
        ? 'No course is being taught, so there is no teaching to be good at.'
        : `The campus average course grade, ${avgQuality.toFixed(0)} of 100.`,
    ),
    weigh(
      'students', 'Student quality', STUDENT_QUALITY_WEIGHT, studentQualityScore(s),
      `The class that enrolled last summer averaged ${s.students.incomingQuality.toFixed(0)} of 100.`,
      scaleMultiplier(s),
    ),
    weigh(
      'research', 'Research output', RESEARCH_WEIGHT, researchScore(s),
      `${researchCredits(s).toFixed(1)} credits of ${RESEARCH_CREDITS_FOR_FULL_SCORE} — publications, finished projects, breakthroughs, prizes and doctorates.`,
    ),
    weigh(
      'campus', 'Campus life', CAMPUS_LIFE_WEIGHT, campusLifeScore(s),
      'What the recreation chain and the athletics venues contribute on their own.',
    ),
    weigh(
      'welfare', 'Welfare', WELFARE_WEIGHT, welfareScore(s),
      `Students have averaged ${average.toFixed(0)} of 100 this year; ${WELFARE_FLOOR_SATISFACTION} earns nothing and ${WELFARE_FULL_SATISFACTION} pays in full.`,
    ),
    weigh(
      'beauty', 'Campus beauty', BEAUTY_WEIGHT, beautyScore(s),
      `The campus scores ${campusBeauty(s).toFixed(0)} of 100 for its trees, landmarks, upkeep and quads; 50 is neutral.`,
    ),
    weigh(
      'endowment', 'Endowment', ENDOWMENT_WEIGHT, endowmentScore(s),
      `${money(s.finance.endowment)} against a student body of ${totalEnrolled(s.students).toLocaleString()}.`,
    ),
    ...projectInput(s, 'academics'),
    penalise(
      'condition', 'Estate condition', CONDITION_PENALTY, conditionScore(s),
      'The buildings\' mean condition: a fully maintained estate costs nothing, a run-down one up to four points.',
    ),
    penalise(
      'crowding', 'Crowding', CROWDING_PENALTY, crowdingScore(s),
      `Averaged over the year. Today the worst is ${worst.label} at ${pct(worst.coverage)}`
        + (worst.coverage >= CROWDING_GRACE
          ? `; nothing is lost at ${pct(CROWDING_GRACE)} or better.`
          : ` (${coverages.slice(1).map((c) => `${c.label} ${pct(c.coverage)}`).join(', ')}); nothing is lost at ${pct(CROWDING_GRACE)} or better.`),
    ),
  ], prestigeReadings(s), {
    riseRate: PRESTIGE_RISE_RATE,
    maxRise: PRESTIGE_MAX_RISE,
    fallRate: PRESTIGE_FALL_RATE,
    reportCard: s.self.reportCard,
  }, teachingCeiling(s));
}

// Welfare: trailing-year average satisfaction; 40 earns nothing, 80 pays in full.
const WELFARE_FLOOR_SATISFACTION = 40;
const WELFARE_FULL_SATISFACTION = 80;

export function welfareScore(s: GameState): number {
  const average = trailingYearSatisfaction(s);
  return clamp01((average - WELFARE_FLOOR_SATISFACTION) / (WELFARE_FULL_SATISFACTION - WELFARE_FLOOR_SATISFACTION));
}

// Concentration: how deep the deepest school is (founded and distinguished).
// Only the best school counts; more schools are breadth. Both milestones are
// durable, so moving a program out does not un-found a school.
const CONCENTRATION_FOUNDED_SHARE = 0.4;
const CONCENTRATION_DISTINGUISHED_SHARE = 0.6;

interface SchoolDepth {
  school: string;
  founded: boolean;
  distinguished: boolean;
  depth: number; // 0..1
}

function deepestSchool(s: GameState): SchoolDepth | null {
  let best: SchoolDepth | null = null;
  for (const school of milestoneSchools()) {
    if (school.majors.length === 0) continue;
    const founded = isSchoolFounded(s, school.schoolName);
    const distinguished = !!s.milestones[`school-distinguished:${school.schoolName}`];
    const depth =
      (founded ? CONCENTRATION_FOUNDED_SHARE : 0) +
      (distinguished ? CONCENTRATION_DISTINGUISHED_SHARE : 0);
    if (depth > 0 && (best === null || depth > best.depth)) {
      best = { school: school.schoolName, founded, distinguished, depth };
    }
  }
  return best;
}

export function concentrationScore(s: GameState): number {
  return clamp01(deepestSchool(s)?.depth ?? 0);
}

// Crowding: the worst coverage ratio as a shortfall below CROWDING_GRACE,
// averaged over the year. Health below its population gate counts as fully
// covered, as in the satisfaction and demand systems.
const CROWDING_GRACE = 0.85;

const COVERAGE_LABELS: Record<keyof SatisfactionAttributes, string> = {
  academic: 'library',
  social: 'social space',
  basicNeeds: 'dining',
  health: 'health',
  housing: 'housing',
};

interface CoverageReading {
  label: string;
  coverage: number; // 0..1
}

// Crowding reads the needs a class physically overruns (Plan 71): beds,
// dining, health and class seats. The library and social space score in
// satisfaction (and the library in breadth's adequacy), and a college that
// has not built one is short of it, not overcrowded.
const CROWDED_NEEDS: ReadonlyArray<keyof SatisfactionAttributes> = ['housing', 'basicNeeds', 'health'];

export function crowdingCoverages(s: GameState): CoverageReading[] {
  const enrolled = totalEnrolled(s.students);
  const out: CoverageReading[] = [];
  for (const attribute of CROWDED_NEEDS) {
    const dormant = attribute === 'health' && enrolled < HEALTH_CENTER_TIER1_POPULATION_GATE;
    out.push({ label: COVERAGE_LABELS[attribute], coverage: dormant ? 1 : attributeCoverage(s, attribute) });
  }
  out.push({ label: 'instruction', coverage: instructionCoverage(s) });
  return out.sort((a, b) => a.coverage - b.coverage);
}

// This week's shortfall — what tickPrestige accumulates.
export function crowdingShortfallNow(s: GameState): number {
  const worst = crowdingCoverages(s)[0].coverage;
  return clamp01((CROWDING_GRACE - worst) / CROWDING_GRACE);
}

export function crowdingScore(s: GameState): number {
  return s.students.crowdingYearWeeks > 0
    ? clamp01(s.students.crowdingYearSum / s.students.crowdingYearWeeks)
    : crowdingShortfallNow(s);
}

function reading(
  key: string, label: string, score: number, detail: string,
  weight?: number, penalty?: boolean,
): StandingReading {
  return { key, label, score, weight, reach: (weight ?? 0) * score, penalty, detail };
}

function concentrationDetail(s: GameState): string {
  const best = deepestSchool(s);
  if (!best) {
    return 'No school founded yet — six programs of one school in one hall found it, and finishing every one of them distinguishes it.';
  }
  if (best.founded && best.distinguished) return `The School of ${best.school}: founded and distinguished.`;
  if (best.founded) return `The School of ${best.school}: founded, not yet distinguished — every one of its programs complete would finish it.`;
  return `${best.school}: distinguished but never founded — its programs were finished without ever sharing one hall.`;
}

export function prestigeReadings(s: GameState): StandingReading[] {
  const capacity = instructionCapacityDetail(s);
  const enrolled = totalEnrolled(s.students);
  return [
    reading(
      'capacity', 'Instruction capacity', instructionCoverage(s),
      `${capacity.courses.toLocaleString()} developed course${capacity.courses === 1 ? '' : 's'} in housed programs × ${SEATS_PER_COURSE} seats = room for ${capacity.seats.toLocaleString()}, against ${enrolled.toLocaleString()} enrolled.`,
    ),
  ];
}

// The summer report card. gradeYear runs before the accumulators reset and
// the funnel runs, so it grades the year just ended; applyReportCard runs
// after the funnel, so the admissions projection holds for the new class.
export function gradeYear(s: GameState): ReportCard {
  const made = prestigeBreakdown(s);
  const grades: Record<string, number> = {};
  for (const input of made.inputs) grades[input.key] = input.contribution;
  const before = s.self.reputation;
  const gap = made.target - before;
  const rate = gap >= 0 ? PRESTIGE_RISE_RATE : PRESTIGE_FALL_RATE;
  const step = gap >= 0 ? Math.min(gap * rate, PRESTIGE_MAX_RISE) : gap * rate;
  const after = clamp(before + step, PRESTIGE_MIN, PRESTIGE_MAX);
  return { year: s.clock.year, score: made.target, grades, before, after };
}

// Kept here so test/invariants.test.ts section 5 finds every writer of
// s.self.reputation in one file.
export function applyReportCard(s: GameState, card: ReportCard): void {
  s.self.reputation = card.after;
  s.self.reportCard = card;
}

export function computePrestigeTarget(s: GameState): number {
  return prestigeBreakdown(s).target;
}

// The target as if these milestones had never been awarded, for the
// milestone modal's "worth" line.
export function prestigeTargetWithout(s: GameState, milestoneKeys: readonly string[]): number {
  if (milestoneKeys.length === 0) return computePrestigeTarget(s);
  const milestones = { ...s.milestones };
  for (const key of milestoneKeys) delete milestones[key];
  return computePrestigeTarget({ ...s, milestones });
}

// The other two standings (docs/design/progression.md): stocks beside
// `reputation`, never inside it, and never read back into a decision
// (test/invariants.test.ts section 5).

// Both sit below the academic baseline: these are earned, not arrived with.
export const RESEARCH_STANDING_BASELINE = 18;
export const SOCIAL_STANDING_BASELINE = 22;

// Three times the academic denominator, so the axis does not max out within
// a decade.
const RESEARCH_STANDING_CREDITS_FOR_FULL = 60;

const RESEARCH_OUTPUT_WEIGHT = 80;  // what the labs have actually produced
const RESEARCH_BREADTH_WEIGHT = 40; // how many fields the school can research in at all

// Divides by fields, not schools.
function researchBreadthScore(s: GameState): number {
  const fields = researchableFields().length;
  if (fields === 0) return 0;
  return clamp01(labEquippedFields(s).size / fields);
}

export function researchStandingBreakdown(s: GameState): StandingBreakdown {
  const equipped = labEquippedFields(s).size;
  const fields = researchableFields().length;
  return breakdown('Research standing', RESEARCH_STANDING_BASELINE, s.self.researchStanding, [
    weigh(
      'output', 'What the labs have produced', RESEARCH_OUTPUT_WEIGHT,
      clamp01(researchCredits(s) / RESEARCH_STANDING_CREDITS_FOR_FULL),
      `${researchCredits(s).toFixed(1)} credits of ${RESEARCH_STANDING_CREDITS_FOR_FULL} — the same tally the academic standing reads, against a national denominator.`,
    ),
    weigh(
      'breadth', 'Fields it can research in', RESEARCH_BREADTH_WEIGHT, researchBreadthScore(s),
      `${equipped} of the ${fields} fields the college could research in ${equipped === 1 ? 'has' : 'have'} a lab.`,
    ),
    ...projectInput(s, 'research'),
  ]);
}

export function computeResearchTarget(s: GameState): number {
  return researchStandingBreakdown(s).target;
}

const SOCIAL_FACILITIES_WEIGHT = 30;   // the rec-center chain's own prestigeContribution, the same sum campusLifeScore reads
const SOCIAL_ORGANISATIONS_WEIGHT = 35; // clubs, chapters and housed chapters, through their own capped bonus
const SOCIAL_ATHLETICS_WEIGHT = 30;     // athleticProgramStrength
const SOCIAL_SATISFACTION_WEIGHT = 25;  // what the student body actually reports about its social life
const SOCIAL_TITLES_WEIGHT = 20;        // championships won (see systems/athletics/playoffs.ts)

// Championships: a monotone stock; maxing it takes a dynasty.
const TITLES_FOR_FULL_SCORE = 12;
function titlesScore(s: GameState): number {
  const weighted = s.orgs.titles.reduce((sum, t) => sum + sportEconomics(t.sport).payoffMultiplier, 0);
  return clamp01(weighted / TITLES_FOR_FULL_SCORE);
}

function socialOrganisationsScore(s: GameState): number {
  return clamp01(studentLifeSocialBonus(s) / STUDENT_LIFE_SOCIAL_BONUS_CAP);
}

export function socialStandingBreakdown(s: GameState): StandingBreakdown {
  const titles = s.orgs.titles.length;
  const teams = s.orgs.teams.filter((t) => t.status === 'active').length;
  return breakdown('Campus life standing', SOCIAL_STANDING_BASELINE, s.self.socialStanding, [
    weigh(
      'facilities', 'Places built for it', SOCIAL_FACILITIES_WEIGHT, campusLifeScore(s),
      'The recreation chain, read off the same contribution the academic standing reads.',
    ),
    weigh(
      'organisations', 'Clubs and chapters', SOCIAL_ORGANISATIONS_WEIGHT, socialOrganisationsScore(s),
      `${s.orgs.clubs.length} club${s.orgs.clubs.length === 1 ? '' : 's'} and ${s.orgs.chapters.length} chapter${s.orgs.chapters.length === 1 ? '' : 's'}.`,
    ),
    weigh(
      'athletics', 'Varsity athletics', SOCIAL_ATHLETICS_WEIGHT, clamp01(athleticProgramStrength(s) / 100),
      `${teams} team${teams === 1 ? '' : 's'} fielding, at program strength ${athleticProgramStrength(s).toFixed(0)}.`,
    ),
    weigh(
      'satisfaction', 'What students report', SOCIAL_SATISFACTION_WEIGHT,
      clamp01(s.students.satisfactionBreakdown.social / 100),
      `The social attribute of student satisfaction, at ${s.students.satisfactionBreakdown.social.toFixed(0)} of 100.`,
    ),
    weigh(
      'titles', 'Championships', SOCIAL_TITLES_WEIGHT, titlesScore(s),
      `${titles} national title${titles === 1 ? '' : 's'} of the ${TITLES_FOR_FULL_SCORE} a dynasty is.`,
    ),
    ...projectInput(s, 'experience'),
  ]);
}

export function computeSocialTarget(s: GameState): number {
  return socialStandingBreakdown(s).target;
}

// Academic standing trembles toward its target; the other two drift at the
// full weekly rate. Kept in one function so invariants.test.ts can confine
// every writer to this file.
export function tickPrestige(s: GameState): void {
  s.students.crowdingYearSum += crowdingShortfallNow(s);
  s.students.crowdingYearWeeks += 1;
  s.self.reputation = drift(s.self.reputation, computePrestigeTarget(s), PRESTIGE_TREMOR_RATE);
  s.self.researchStanding = drift(s.self.researchStanding, computeResearchTarget(s), PRESTIGE_DRIFT_RATE);
  s.self.socialStanding = drift(s.self.socialStanding, computeSocialTarget(s), PRESTIGE_DRIFT_RATE);
}

function drift(current: number, target: number, rate: number): number {
  return clamp(current + (target - current) * rate, PRESTIGE_MIN, PRESTIGE_MAX);
}

// Lives here because test/invariants.test.ts section 5 confines writers of
// s.self.reputation. Prestige drifts back toward its target afterward.
export function setPrestigeForPlaytest(s: GameState, value: number): number {
  s.self.reputation = clamp(value, PRESTIGE_MIN, PRESTIGE_MAX);
  return s.self.reputation;
}
