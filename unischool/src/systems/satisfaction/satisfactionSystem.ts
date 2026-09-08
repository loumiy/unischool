import type { GameState, SatisfactionAttributes } from '../../state/types';
import { HEALTH_CENTER_TIER1_POPULATION_GATE } from '../../data/facilitiesData';
import {
  athleticsSocialBonus, CHAPTER_HOUSE_CAPACITY_BONUS, clubSocialBonus, greekSocialBonus, studentLifeSocialBonus,
} from '../../data/studentLifeData';
import { totalEnrolled } from '../../state/types';

// ---------------------------------------------------------------------
// Satisfaction stays ONE displayed number (s.students.satisfaction), but
// it is now the weighted sum of five named attributes computed here, each
// written to by a specific cluster of campus facilities/needs — never by
// an ad hoc catch-all formula. s.students.satisfactionBreakdown carries
// this week's raw per-attribute scores for its own panel (see
// StudentLifeTab.tsx) to show exactly what's dragging the number down.
//
// Every ratio-based attribute compares total servesPopulation (summed
// live off 'done' facilities — see BuildableEffects's live-read contract
// in state/types.ts) against total ENROLLED students: needs scale with how
// many students the campus actually has, not with bed count — enrollment is
// never capacity-gated (see admissionsSystem.ts), so a big commuter school
// with few dorms is still a big school that needs feeding. Housing is the
// one deliberate exception: it compares bed CAPACITY (dorms plus housed
// Greek chapters) against enrolled, since that ratio is the whole point of
// the attribute (see TARGET_RATIO.housing below).
//
// The headline number still drifts smoothly toward its target at the same
// weekly rate the old single-formula version used — only the TARGET is now
// a real weighted sum of attributes instead of an inline crowding/
// reputation/scholarships formula. The breakdown itself is NOT smoothed — it always
// reflects what's true about the campus right now, so a newly finished
// building is visible in the breakdown immediately even while the headline
// number is still catching up to it.
// ---------------------------------------------------------------------

const SATISFACTION_DRIFT_RATE = 0.05; // fraction of the gap to target closed per week — matches the pre-refactor rate

// Attribute weights, summing to 100 so the weighted sum lands on the same
// 0..100 scale as each attribute. Basic needs stays heaviest — going
// hungry should move the headline number the most.
//
// Housing carves out a real, felt weight (per the design ask that not
// having enough beds should impact satisfaction) without dominating: most
// students are commuters by design, so the target ratio it's scored
// against (see TARGET_RATIO.housing) is deliberately not 1:1 the way basic
// needs is. The other four give up a proportional share to make room —
// health least, since it is dormant below
// HEALTH_CENTER_TIER1_POPULATION_GATE and, even scoring, is the attribute a
// player interacts with least (two tiers, one gate, no orgs/prestige
// nudges). Still sums to 100.
const ATTRIBUTE_WEIGHTS: SatisfactionAttributes = {
  academic: 20,
  social: 24,
  basicNeeds: 30,
  health: 11,
  housing: 15,
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
// balance sim's growth strategies reach 40k-56k ENROLLED by year 40 and are
// still climbing — see sim/balanceSim.ts) keeps diluting its social ratio
// even with both buildings fully tiered well before it gets there, because
// SOCIAL_PENALTY_CURVATURE below bites before the ratio hits 1.0. It has to
// lean on the quad and student life to close the rest of the way, which is
// the intended path back to a high score, not a bug to fix by raising the
// ratio further.
// Housing's target ratio is bed CAPACITY over ENROLLED, not servesPopulation
// over enrolled like the other four — commuters are the norm, so scoring it
// against 1.0 (as if every student should get a bed) would make an ordinary,
// well-run commuter campus read as permanently housing-starved. 0.35 says a
// school housing about a third of its students — roughly the freshman class
// plus a slice of upperclassmen, the real-world shape — is fully adequate;
// short of that is a felt shortfall, per the design ask.
const TARGET_RATIO: SatisfactionAttributes = {
  academic: 0.15,
  social: 0.34,
  basicNeeds: 1.0,
  health: 1.0,
  housing: 0.35,
};

// Basic needs gets the STEEPEST under-capacity penalty (ratio^curvature,
// curvature > 1) — going hungry should read as an acute problem, not a
// gentle drift, per the design ask, and it stays the sharpest single
// attribute in the model.
//
// Social gets a curvature of its own now, > 1 but well short of basic
// needs': neglecting student life should read as an acute problem too
// (per this pass's design ask), just not the MOST acute one — a bored
// student and a hungry one are not the same emergency. Academic, health and
// housing stay linear (curvature 1) — a housing shortfall is a real, felt
// need per the design ask, but not the acute emergency going hungry is.
const BASIC_NEEDS_PENALTY_CURVATURE = 2.2;
const SOCIAL_PENALTY_CURVATURE = 1.4;

// Reputation and scholarships used to nudge the old single satisfaction
// formula directly; they still do, just folded into the two attributes
// they thematically belong to instead of a bespoke crowding/reputation/scholarships
// blend: prestige as campus pride (social), scholarships as affordability (basic
// needs). Both are small, capped nudges on top of the ratio-based score,
// not attributes in their own right.
const REPUTATION_PRIDE_MAX_BONUS = 15;  // added to `social` at max prestige (PRESTIGE_MAX, see prestigeSystem.ts)
const REPUTATION_PRIDE_PRESTIGE_MAX = 150;
const SCHOLARSHIP_AFFORDABILITY_MAX_BONUS = 20; // added to `basicNeeds` at 100% average scholarships

// Faculty quality: a well-staffed, strongly-retained roster should read as
// more academically satisfying than a thinly or weakly staffed one, on top
// of (not instead of) whatever the library already provides — a great
// library with no faculty, or a great faculty with no library, should each
// land only partially satisfied. ADDITIVE and capped, the same pattern as
// REPUTATION_PRIDE_MAX_BONUS/SCHOLARSHIP_AFFORDABILITY_MAX_BONUS above, so a
// library already scoring 100 cannot be pushed past it and a bare roster
// cannot pull academic down below what the library alone earned.
const FACULTY_QUALITY_MAX_BONUS = 15; // added to `academic` at a fully-matured, top-tier average roster

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
// satisfaction model does not itself think is short. Housing is a special
// case here, same as it is in computeSatisfactionBreakdown below: it reads
// bed CAPACITY over enrolled, not servesPopulation over enrolled.
export function attributeCoverage(s: GameState, attribute: keyof SatisfactionAttributes): number {
  const enrolled = totalEnrolled(s.students);
  if (enrolled <= 0) return 1;
  const served = attribute === 'housing' ? s.students.capacity : servedPopulationFor(s, attribute);
  return clamp(served / (enrolled * TARGET_RATIO[attribute]), 0, 1);
}

function ratioScore(servesPopulation: number, enrolled: number, targetRatio: number, curvature: number): number {
  if (enrolled <= 0) return 100; // nothing to serve yet — not a problem
  const ratio = clamp(servesPopulation / (enrolled * targetRatio), 0, 1);
  return clamp(100 * ratio ** curvature, ATTRIBUTE_SCORE_FLOOR, 100);
}

// The roster's average current teaching+research (each 0..100), normalized
// to 0..1 — mirrors prestigeSystem.ts's own facultyQualityScore exactly
// (current, already-grown stats only, so a retained hire matters more than
// a fresh one), kept as an independent local reading rather than an import
// since systems only ever read/write shared state, never call into each
// other. An empty roster reads as 0, its floor, rather than dividing by
// zero.
function facultyQualityScore(s: GameState): number {
  if (s.faculty.length === 0) return 0;
  const avgStat = s.faculty.reduce((sum, f) => sum + f.teaching + f.research, 0) / (s.faculty.length * 2);
  return clamp(avgStat / 100, 0, 1);
}

export function computeSatisfactionBreakdown(s: GameState): SatisfactionAttributes {
  const enrolled = totalEnrolled(s.students);

  // Library adequacy and faculty quality are two independent inputs to how
  // academically satisfying the school reads, combined additively so
  // either can carry the attribute partway on its own (see
  // FACULTY_QUALITY_MAX_BONUS above) — then clamped to the same
  // [ATTRIBUTE_SCORE_FLOOR, 100] band every other attribute uses, so a
  // library already at its ceiling gains nothing further from faculty.
  const academicLibraryRatio = ratioScore(servedPopulationFor(s, 'academic'), enrolled, TARGET_RATIO.academic, 1);
  const academicFacultyBonus = facultyQualityScore(s) * FACULTY_QUALITY_MAX_BONUS;
  const academic = clamp(academicLibraryRatio + academicFacultyBonus, ATTRIBUTE_SCORE_FLOOR, 100);

  const socialRatio = ratioScore(servedPopulationFor(s, 'social'), enrolled, TARGET_RATIO.social, SOCIAL_PENALTY_CURVATURE);
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

  const basicNeedsRatio = ratioScore(servedPopulationFor(s, 'basicNeeds'), enrolled, TARGET_RATIO.basicNeeds, BASIC_NEEDS_PENALTY_CURVATURE);
  const affordability = clamp(s.admissions.scholarshipRate, 0, 1) * SCHOLARSHIP_AFFORDABILITY_MAX_BONUS;
  const basicNeeds = clamp(basicNeedsRatio + affordability, ATTRIBUTE_SCORE_FLOOR, 100);

  // Health is DORMANT — scores full — below the population threshold the
  // health center itself unlocks at (see facilitiesData.ts): a small campus
  // isn't expected to have one yet, so not having one costs nothing. Cross
  // the threshold and it becomes a real, scoring need like any other. Read
  // against enrolled, not capacity — capacity is beds now, and a large
  // commuter school with few dorms is still a large school.
  const health = enrolled < HEALTH_CENTER_TIER1_POPULATION_GATE
    ? 100
    : ratioScore(servedPopulationFor(s, 'health'), enrolled, TARGET_RATIO.health, 1);

  // Housing: bed CAPACITY (dorms plus housed Greek chapters — see
  // eventData.ts's 'greek-housing' event) against enrolled, not
  // servesPopulation — there is no Buildable effect feeding this attribute
  // the way a dining hall feeds basicNeeds, since a dorm's beds are already
  // tracked as s.students.capacity (see types.ts). Most students are
  // commuters by design (TARGET_RATIO.housing well under 1.0), so this is
  // "is there enough housing for the share of students who'd want it", not
  // "is everyone housed".
  const housing = ratioScore(s.students.capacity, enrolled, TARGET_RATIO.housing, 1);

  return { academic, social, basicNeeds, health, housing };
}

// ---------------------------------------------------------------------
// PER-ATTRIBUTE DETAIL, for the Student Life tab's expandable breakdown
// (see StudentLifeTab.tsx). Same "read the real computation, don't re-
// author it" rule as studentLifeSatisfaction below: every figure here is
// pulled from the same servedPopulationFor/flatBonusFor/computed-bonus
// terms computeSatisfactionBreakdown itself sums, so the expanded view can
// never disagree with the rounded headline number sitting above it.
// ---------------------------------------------------------------------
export interface AttributeContributor {
  label: string;
  value: number; // a building's servesPopulation, or a named bonus in points
}

export interface AttributeDetail {
  contributors: AttributeContributor[]; // 'done' buildings serving this attribute, largest first
  totalServed: number;
  neededForFullScore: number;           // capacity x TARGET_RATIO[attribute] — the "fully covered" reference point
  bonuses: AttributeContributor[];      // named point bonuses beyond served population (faculty quality, prestige pride, ...)
  score: number;                        // the same 0..100 this.week reads computeSatisfactionBreakdown() for
  dormant: boolean;                     // health only, below its population gate — see computeSatisfactionBreakdown above
}

export function attributeDetail(s: GameState, attribute: keyof SatisfactionAttributes): AttributeDetail {
  const enrolled = totalEnrolled(s.students);
  const dormant = attribute === 'health' && enrolled < HEALTH_CENTER_TIER1_POPULATION_GATE;

  // Housing has no Buildable effect feeding it the way a dining hall feeds
  // basicNeeds (see computeSatisfactionBreakdown above) — its contributors
  // are every 'done' dorm's capacityBonus plus a flat bonus per housed
  // Greek chapter, reconstructed here rather than read off a live sum
  // because s.students.capacity is a single accumulated number with no
  // per-source breakdown of its own.
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
        .filter((t) => t.status === 'done' && t.effects?.satisfactionAttribute === attribute && (t.effects?.servesPopulation ?? 0) > 0)
        .map((t) => ({ label: t.name, value: t.effects!.servesPopulation! }))
        .sort((a, b) => b.value - a.value);
  const totalServed = contributors.reduce((sum, c) => sum + c.value, 0);

  const bonuses: AttributeContributor[] = [];
  const flat = flatBonusFor(s, attribute);
  if (flat > 0) bonuses.push({ label: 'Quad & other flat contributors', value: flat });
  if (attribute === 'academic') {
    const facultyBonus = facultyQualityScore(s) * FACULTY_QUALITY_MAX_BONUS;
    if (facultyBonus > 0) bonuses.push({ label: 'Faculty quality', value: facultyBonus });
  }
  if (attribute === 'social') {
    const pride = clamp(s.self.reputation / REPUTATION_PRIDE_PRESTIGE_MAX, 0, 1) * REPUTATION_PRIDE_MAX_BONUS;
    if (pride > 0) bonuses.push({ label: 'Campus pride (prestige)', value: pride });
    const orgs = studentLifeSocialBonus(s);
    if (orgs > 0) bonuses.push({ label: 'Clubs, Greek life & athletics', value: orgs });
  }
  if (attribute === 'basicNeeds') {
    const affordability = clamp(s.admissions.scholarshipRate, 0, 1) * SCHOLARSHIP_AFFORDABILITY_MAX_BONUS;
    if (affordability > 0) bonuses.push({ label: 'Scholarship affordability', value: affordability });
  }

  return {
    contributors,
    totalServed,
    neededForFullScore: Math.round(enrolled * TARGET_RATIO[attribute]),
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
  teamCount: number; // active varsity teams only — an awaitingVenue team contributes nothing yet (see athleticsSocialBonus)
  // The raw flat contributions each source offers the `social` attribute,
  // before the aggregate cap and before `social` itself is clamped.
  clubSocialBonus: number;
  greekSocialBonus: number;
  athleticsSocialBonus: number;
  // What each source is actually worth on the HEADLINE satisfaction
  // target, in points, after every clamp the model applies.
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

  const target = weightedSum(breakdown);
  s.students.satisfaction += (target - s.students.satisfaction) * SATISFACTION_DRIFT_RATE;
  s.students.satisfaction = clamp(s.students.satisfaction, 0, 100);

  // Accumulate this week's satisfaction toward the trailing-year average
  // next summer's admissions funnel reads as word of mouth (see
  // admissionsSystem.ts's trailingYearSatisfaction; the reducer averages and
  // resets this at RESOLVE_ADMISSIONS).
  s.students.satisfactionYearSum += s.students.satisfaction;
  s.students.satisfactionYearWeeks += 1;
}
