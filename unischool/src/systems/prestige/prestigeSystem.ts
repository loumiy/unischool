import type { GameState, ReportCard, SatisfactionAttributes } from '../../state/types';
import { totalEnrolled } from '../../state/types';
import { graduatePrograms, milestoneSchools } from '../../data/techData';
import { campusAverageCourseQuality } from '../faculty/facultyAssignment';
import { teachingQualityScore } from '../../data/courseQuality';
import { INITIATIVE_COMPLETION_CREDIT, labEquippedFields, researchableFields } from '../../data/researchData';
import { athleticProgramStrength, studentLifeSocialBonus, STUDENT_LIFE_SOCIAL_BONUS_CAP } from '../../data/studentLifeData';
import { HEALTH_CENTER_TIER1_POPULATION_GATE } from '../../data/facilitiesData';
import { attributeCoverage } from '../satisfaction/satisfactionSystem';
import { trailingYearSatisfaction } from '../admissions/admissionsSystem';
import { isSchoolFounded } from '../techtree/schools';
import { instructionCapacityDetail, instructionCoverage, SEATS_PER_COURSE } from '../techtree/instructionCapacity';

// ---------------------------------------------------------------------
// Prestige (s.self.reputation) is a slow-moving STOCK, not a flow. It used
// to be nudged directly by course/building/milestone completion effects
// and a weekly satisfaction-driven pull (see rivalsSystem.ts's old
// repTarget) — that made it spike while the player was actively building
// and sag once the curriculum was done, since it tracked *build activity*
// rather than the school's actual standing.
//
// Instead, this module computes a prestige TARGET from durable, slow-
// changing inputs — things that describe what the school *is*, not what it
// did this week — and reputation moves toward it in two ways (Plan 15's
// PR B, which replaced a single weekly drift):
//
//   - A SUMMER REPORT CARD. At the admissions boundary (reducer.ts's
//     RESOLVE_ADMISSIONS calls gradeYear below) the inputs are graded for
//     the year just ended and summed into a YEAR SCORE on the same 5..150
//     scale. Prestige then steps toward that score by a fraction of the gap,
//     and the fraction is ASYMMETRIC: PRESTIGE_RISE_RATE above, PRESTIGE_
//     FALL_RATE below. A school whose grade drops thirty points loses twelve
//     the first summer and seven the next; climbing back at the rise rate
//     takes the better part of a decade. That asymmetry is the whole point —
//     the September 2026 review's finding was that a number which cannot
//     fall is not a reputation — and the climb is slow but UNBLOCKED:
//     nothing about a low grade makes an input harder to raise, which
//     test/report-card.test.ts asserts.
//   - A WEEKLY TREMOR. Between summers (tickPrestige, in reducer.ts's
//     SYSTEMS array) prestige still moves toward the live target, at a
//     tenth of the old weekly rate — enough that the toolbar number is
//     alive, not enough to pre-empt the summer step.
//
// Welfare and crowding are graded on the YEAR'S AVERAGE (their accumulators
// live on s.students), because those two are the ones a player could game
// by timing a dorm's completion in week 50. Everything else is graded on
// state at the summer, because what you see is what is graded.
//
// The inputs, each normalized to 0..1 before weighting:
//   - curriculum breadth: a STOCK — how many majors/schools stand fully
//     finished right now (see milestoneSchools() below), plus the graduate
//     programs founded on top of them; never how many courses were added
//     this year.
//   - incoming student quality: the average quality of the class that
//     actually enrolled in the most recently resolved admissions cycle
//     (admissionsSystem.ts).
//   - faculty quality: the roster's average current teaching+research (see
//     facultyData.ts — faculty are an appreciating asset: retained hires
//     grow toward a rolled ceiling over years of tenure, then plateau, and
//     cost more as they do). A durable stock of the same shape as
//     curriculum breadth — it reflects who's on the roster right now, not
//     who was hired this week.
//
//   - research standing: the breakthroughs and prizes the school's labs
//     have produced (see systems/research/researchSystem.ts). A monotone
//     COUNT, of exactly the same shape as curriculum breadth, and the
//     ONLY route research has into prestige — no research output ever
//     writes s.self.reputation. See researchScore below for why it is
//     deliberately a small weight.
//
//   - campus life, and financial resources per student (endowment against
//     enrolled body size) — two smaller, capped inputs; the second is what
//     the late-game endowment campaigns buy (see financeSystem.ts).
//
// Selectivity (admit rate) is deliberately NOT an input here, even though
// admissionsSystem.ts computes and displays one: it is now purely a
// function of prestige itself (see that file's admitRate curve), so
// feeding it back in would be close to circular — a derived reading of
// prestige contributing to prestige, lagged only by the weekly drift.
//
// EVERY score is independently clamped to 0..1 before it is
// weighted, so each contributes at most its own weight to the target. That
// is what stops the prestige/quality loop from spiraling: a small school
// can ride student quality to its own ceiling, but climbing past that
// requires the curriculum-breadth and faculty-quality terms too, both of
// which only rise with genuine, sustained investment — see the PR notes
// for the fast-forward trajectories this was tuned against.
// ---------------------------------------------------------------------

// Prestige target, before any of the weighted inputs, for a school with
// zero curriculum breadth and average incoming quality. Deliberately below
// the field's median so a fresh school is unremarkable, not average, until
// it earns its way up.
const PRESTIGE_BASELINE = 32;

// How much of the gap between a standing and its target closes each WEEK
// for the two standings that still drift weekly (research and campus life —
// see tickPrestige). Deliberately tiny: sized so 52 weekly closes total
// ~12% of the gap over a year: 1 - (1 - 0.12)^(1/52) ≈ 0.00246.
const PRESTIGE_DRIFT_RATE = 0.0025;

// THE SUMMER STEP (see the module note). Rise is the old weekly drift's
// annual equivalent, so a run that never falls short of its grade is
// roughly unchanged by the new model; fall is more than three times it.
// Both are shares of the gap between prestige and the year score. PR G of
// Plan 15 fits them against the scorecard.
export const PRESTIGE_RISE_RATE = 0.20;
export const PRESTIGE_FALL_RATE = 0.30;

// The weekly tremor between summers: a tenth of the old weekly rate. If it
// reads as noise in playtest, drop it; the summer step is the beat.
const PRESTIGE_TREMOR_RATE = PRESTIGE_DRIFT_RATE / 10;

// Weight applied to each 0..1 input score. Their sum plus PRESTIGE_BASELINE
// would exceed PRESTIGE_MAX if every input maxed out at once (it's clamped
// there below); in practice curriculum breadth dominates by design, with
// student quality and faculty quality as secondary drivers. SELECTIVITY_
// WEIGHT (30, in the prior four-input version) is retired rather than kept
// or redistributed as its own line — its role folds into wider headroom for
// the two inputs that were already this model's main drivers, curriculum
// breadth and faculty quality (see the module note above on why selectivity
// itself is gone).
// FACULTY QUALITY IS NO LONGER AN INPUT OF ITS OWN, and its old weight of
// 40 is redistributed below. It averaged every hire's teaching and research
// straight off the roster, which was the right reading when that was the
// ONLY way either stat reached prestige — neither had a job then.
//
// Both have one now, and each arrives through the work it actually does:
// teaching through course grades, which multiply the breadth term
// (curriculumQualityScore); research through what initiatives produce
// (researchScore). Keeping the old input as well charged for the same two
// numbers twice — once for the work, and once again for merely being on the
// payroll. It also quietly preserved the exact flaw PR C removed from
// academic satisfaction: a brilliant chemist hired and never assigned to
// anything still raised the school's standing.
//
// So the 40 goes where the two stats now do their work. Breadth takes the
// larger share because teaching reaches prestige through it, and research
// takes a smaller one — still far below breadth, which is the invariant
// researchScore's own note exists to protect: research supplements a
// university's standing, it never substitutes for being one.
//
// PLAN 15's PR B REBUDGETED THESE (its §1). Breadth gave up forty of its
// ninety: thirty to CONCENTRATION — the "known for" term, breadth's other
// half, which Plan 14's founded schools made possible — so that a school
// concentrated in one hall and finished is worth more than the same course
// count scattered. WELFARE is new at twenty, which is what lets a happy
// small college hold a standing a crowded large one cannot. And CROWDING
// is a PENALTY, not an input: a subtraction of up to twenty-five, so it
// can take a school below what its curriculum earned.
const CURRICULUM_BREADTH_WEIGHT = 50; // majors/schools completed — still the largest single term, no longer the whole game
const CONCENTRATION_WEIGHT = 30;      // how deep the deepest school is — founded and distinguished (see concentrationScore below)
const TEACHING_QUALITY_WEIGHT = 30;   // how good the courses actually are, as its own input (see teachingScore below)
const STUDENT_QUALITY_WEIGHT = 24;    // emergent avg incoming quality — grows with a low-tuition, selective posture
const RESEARCH_WEIGHT = 22;           // what the university's research has actually produced (see researchScore below)
const WELFARE_WEIGHT = 20;            // the year's average satisfaction, scored from 40 to 80 (see welfareScore below)
// Campus life is UNDER-EARNED: two rec-centre rungs are its only sources,
// worth +1.8 ever, so it is cut from 12 with a condition rather than a
// shrug. IT RETURNS TO 12 when athletics and student life reach it — the
// faculty lifecycle, athletics' reach into the economy and student life
// with teeth are all on the backlog — and the next plan to reach those
// systems restores it here.
const CAMPUS_LIFE_WEIGHT = 8;
const ENDOWMENT_WEIGHT = 8;           // financial resources per student — cut from 18: at $400k a student it is a term nobody could earn, and a term nobody can earn is not a term
const CROWDING_PENALTY = 25;          // the most crowding can SUBTRACT (see crowdingScore below)

// Same band as rivalsSystem.ts's RIVAL_REPUTATION_MIN/MAX, so the player's
// prestige and rivals' reputation stay on one comparable scale.
const PRESTIGE_MIN = 5;
const PRESTIGE_MAX = 150;

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

// Curriculum breadth: a STOCK read straight off the durable milestone
// booleans techSystem.ts already tracks (program-established,
// program-distinguished, school-distinguished) — never off anything added
// or completed this tick. Weighted so a fully finished curriculum (every
// program established AND distinguished, every school distinguished, every
// graduate program founded) scores exactly 1.
//
// GRADUATE PROGRAMS ARE THE FOURTH SHARE, and they are inside this term rather
// than beside it on purpose (see docs/design/graduate-programs.md). A graduate
// program is more curriculum, so it feeds the input curriculum already feeds;
// giving it a weight of its own would have raised the prestige ceiling by
// exactly the amount the whole capped-input model exists to prevent, and a
// grad-heavy school could then outrun the breadth ceiling that decades of
// undergraduate buildout are what actually buy. The four shares still sum to
// 1, so a school that finishes everything — every program established AND
// distinguished, every school distinguished, every graduate program founded —
// scores exactly 1 and no more.
//
// The consequence is deliberate and worth stating plainly: a fully built
// UNDERGRADUATE catalogue now scores 0.85 rather than 1.0, because the
// last 0.15 is graduate work it has not done. Finishing the catalogue is
// no longer the top of the curriculum curve; it is the point at which the
// graduate curve opens.
//
// WITHIN the graduate share, programs are weighted against each other by
// authored `prestigeWeight` (see techData.ts) and normalized by the total,
// which is how a professional school is allowed to move standing more than
// its five or six courses would suggest — the medical school is worth
// twice a doctoral program — while the share as a whole stays capped. That
// is the same discipline the research cap follows.
const PROGRAM_ESTABLISHED_SHARE = 0.34;
const PROGRAM_DISTINGUISHED_SHARE = 0.26;
const SCHOOL_DISTINGUISHED_SHARE = 0.25;
const GRADUATE_PROGRAM_SHARE = 0.15;

// The graduate half of curriculum breadth: completed programs' authored
// weights over every program's weight. A monotone stock read off the
// `grad-program-complete:` milestones techSystem.ts awards, exactly like
// the three undergraduate readings above.
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

// Admissions scale: how much CREDIT student quality below is allowed to
// earn, as a multiplier — the same shape as libraryAdequacyScore further
// down, and for the same reason.
//
// Without it, the cheapest input in the formula is free for a school that
// never grows: enrolling only top-band students is trivially easy at a
// tiny founding class, and it used to be enough (together with the now-
// retired selectivity input) to drift a do-nothing school into the top of
// the rankings on its own (see the PR's "idle" fast-forward — it reached
// prestige ~127 having built nothing at all, which makes the entire growth
// loop optional). A handful of star students is a boutique, not a national
// university; national standing has to be earned at scale.
//
// The floor keeps a small school from scoring zero on the input — a
// small college with excellent incoming students is genuinely well
// regarded, just not top-ten — so this throttles the shortcut without ever
// creating a downward spiral: it is a multiplier on an upside, never a
// penalty, and it can only rise as enrollment grows.
const ADMISSIONS_SCALE_FOR_FULL_CREDIT = 6_000; // enrolled students at which incoming quality counts in full
const ADMISSIONS_SCALE_FLOOR = 0.35;
function admissionsScaleScore(s: GameState): number {
  return clamp(totalEnrolled(s.students) / ADMISSIONS_SCALE_FOR_FULL_CREDIT, ADMISSIONS_SCALE_FLOOR, 1);
}

// Incoming student quality: the most recently resolved cycle's average
// quality score (0..100, see admissionsSystem.ts's QUALITY_BAND_SCORE),
// normalized to 0..1.
function studentQualityScore(s: GameState): number {
  return clamp01(s.students.incomingQuality / 100);
}

// Library adequacy: how well the library's total servesPopulation (tier-1's
// own seats, raised in place by any renovated-in floors, plus the
// research-library tier-2 upgrade if built — see facilitiesData.ts) covers
// the ENROLLED student body. Mirrors
// satisfactionSystem.ts's own academic-attribute target ratio (kept equal
// deliberately, tuned independently rather than cross-imported — systems
// only read/write shared state, they don't call into each other) but is
// used here as a MULTIPLIER on the curriculum-breadth term rather than as
// an additive score: "an under-served student body caps academic prestige
// growth" means a brilliant, fully-built curriculum at a school with no
// library can't fully cash in that prestige, not that a bad library
// actively costs prestige on its own. A floor keeps a brand-new school (no
// library built yet — it hasn't had time) from having curriculum breadth
// zeroed outright.
const LIBRARY_TARGET_RATIO = 0.15;
const LIBRARY_ADEQUACY_FLOOR = 0.4;
function libraryAdequacyScore(s: GameState): number {
  const enrolled = totalEnrolled(s.students);
  if (enrolled <= 0) return 1;
  const servesPopulation = s.tech
    .filter((t) => t.status === 'done' && t.facilityType === 'library')
    .reduce((sum, t) => sum + (t.effects?.servesPopulation ?? 0), 0);
  const ratio = clamp01(servesPopulation / (enrolled * LIBRARY_TARGET_RATIO));
  return clamp(ratio, LIBRARY_ADEQUACY_FLOOR, 1);
}

// How good the teaching is, as an input in its own right rather than a
// multiplier on breadth. See data/courseQuality.ts's teachingQualityScore
// for why that changed: breadth is milestone-gated, so as a multiplier
// this paid nothing at all for a decade of well-taught courses, and it
// compounded with the library multiplier already on that term.
//
// This is also where the retired faculty-quality input's work went. That
// one averaged every hire's raw stats, which charged the school for good
// professors whether or not they ever taught anybody; this charges for the
// teaching they actually deliver. A campus with no courses open reads 0 —
// it is not teaching badly, but it is equally not teaching.
function teachingScore(s: GameState): number {
  const avg = campusAverageCourseQuality(s);
  return avg === null ? 0 : teachingQualityScore(avg);
}

// Campus life: the rec center / athletics complex's "small prestige
// contribution" — the sum of prestigeContribution across every done
// facility that carries one (today, only the rec center's two tiers; see
// facilitiesData.ts), clamped like every other input so it can only ever
// contribute up to its own weight.
function campusLifeScore(s: GameState): number {
  const total = s.tech
    .filter((t) => t.status === 'done')
    .reduce((sum, t) => sum + (t.effects?.prestigeContribution ?? 0), 0);
  return clamp01(total);
}

// Research standing: what the school's labs have actually produced, as a
// count of published breakthroughs plus the far heavier prizes (see
// systems/research/researchSystem.ts). This is the ONLY path research has
// into prestige, and it is a capped INPUT for exactly the reason the
// endowment is: an event or an output that nudged s.self.reputation
// directly would be the completion-bonus flow this whole module exists to
// forbid, and would let a burst of luck do what only sustained investment
// is supposed to.
//
// Weighted small on purpose, and clamped like every other input, so it
// can contribute at most RESEARCH_WEIGHT to a target whose largest term
// is curriculum breadth at 75. That is the answer to the obvious failure
// mode: a school that builds two labs, staffs them beautifully and
// develops nothing else can ride research to at most +14 on its target —
// real, visible, and nowhere near enough to outrun the breadth-driven
// ceiling that decades of buildout are what actually buy. Research
// SUPPLEMENTS a research university's standing; it never substitutes for
// being a university.
//
// Read as a monotone lifetime count rather than as a rate, so it behaves
// like curriculum breadth: standing earned by past work does not evaporate
// during a quiet decade, and a school that dismantles its labs keeps the
// reputation it already built (while stopping the accumulation of more).
//
// A RESEARCH DOCTORATE ALSO COUNTS HERE, and only a doctorate does. This
// is the one place a graduate program reaches an input other than
// curriculum breadth, and it is honest rather than generous: a PhD program
// IS research standing in a way a professional school is not, so the three
// doctorates each carry a couple of credits into the same already-capped
// 0..1 the breakthroughs do. All three founded is 6 of 20 credits — worth
// about +4 on a target whose largest term is 75 — and the clamp above them
// is unchanged, so this cannot become a second route to prestige any more
// than breakthroughs can. Professional schools get nothing here: a medical
// school with no lab publishes nothing.
// A publication counts, but at a steep discount: ten of them are worth one
// breakthrough. Both halves of that matter. It counts because a department
// publishing steadily for a decade has genuinely built standing, and
// because the alternative — a frequent output that moves nothing — is a
// log line pretending to be a mechanic. And it is discounted hard because
// publications are common by design (the cheapest rung, the heaviest
// weight in RESEARCH_OUTPUTS), so anything less would let volume outrun the
// rare work this input is mostly about. The whole term stays clamped to
// RESEARCH_WEIGHT regardless, so this cannot widen research's reach into
// prestige at all — only change which work gets there first.
const PUBLICATION_PRESTIGE_CREDIT = 0.1;
// FINISHING one is worth something in itself, separately from whatever it
// produced along the way — five years of committed people is an
// achievement a university is known for even when the work was quiet.
// Sized by depth (see researchData.ts's INITIATIVE_COMPLETION_CREDIT), and
// a cancelled run earns none of it, which is most of what makes cancelling
// cost anything at all beyond the forfeited funding.
const BREAKTHROUGH_PRESTIGE_CREDIT = 1;
const PRIZE_PRESTIGE_CREDIT = 3;      // a prize is worth three breakthroughs to the school's standing, on top of what its winner's own output gains
const DOCTORATE_PRESTIGE_CREDIT = 2;  // a founded research doctorate, worth two breakthroughs
export const RESEARCH_CREDITS_FOR_FULL_SCORE = 20;
// The credit tally itself, extracted so the two readings of it share one
// source. Nothing about the arithmetic changed when it was lifted out of
// researchScore below — the whole point is that "what this university's
// research has produced" is counted once, and the two axes that care differ
// only in what they divide it by.
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

// Financial resources per student: endowment measured against the size of
// the student body it has to support, which is how real rankings read a
// school's wealth — a small school with a large endowment is resource-rich;
// the same endowment spread over 20,000 students is not. This is what the
// late-game endowment campaigns (see financeSystem.ts's endowmentCampaign)
// actually buy: the surplus a mature school can no longer spend on dorms
// or curriculum converts into standing instead, slowly and expensively.
//
// Clamped to 0..1 exactly like every other input, so it can contribute at
// most its own weight — money can buy a real but bounded amount of
// prestige, and never a shortcut past the curriculum-breadth term. Read
// against ENROLLED, not bed capacity — capacity is a much smaller number
// than the student body for a commuter-heavy school now, and reading
// against it would inflate this score for exactly the schools it's least
// meant to reward. Enrollment can't be gamed downward for a free score
// either: a smaller class also shrinks tuition revenue, the endowment's own
// main feeder.
const ENDOWMENT_PER_SEAT_FOR_FULL_SCORE = 400_000;
export function endowmentScore(s: GameState): number {
  const enrolled = totalEnrolled(s.students);
  if (enrolled <= 0) return 0;
  return clamp01(s.finance.endowment / (enrolled * ENDOWMENT_PER_SEAT_FOR_FULL_SCORE));
}

// =====================================================================
// THE BREAKDOWN: the same sum, written down.
//
// A standing is a weighted sum of clamped inputs, and until this existed
// the sum was only ever evaluated — the number came out, and neither the
// player nor the developer could see which term produced it. The September
// 2026 review's C5 asks for the player half; a tuning pass needs the same
// thing first, and so does anybody asking why prestige rose five points in
// a year with no milestones.
//
// THE TARGET FUNCTIONS ARE SUMS OVER THIS, not a second copy of the
// formula beside it. That is the whole discipline of the thing, and the
// same one satisfactionSystem.ts's attributeDetail follows: a panel that
// computed its own version of the arithmetic would be wrong within a
// release, quietly, and the only reader who would notice is the one the
// panel exists for.
//
// Rows are DATA. Plan 15 changes these inputs; the panel that renders them
// (see tabs/HistoryTab.tsx's Standing section) reads whatever the
// breakdown contains and never names a row, so a weight that moves or an
// input that is retired changes one file.
//
// A breakdown also carries READINGS (see the block below the inputs): terms
// the model measures and shows but does not yet count. They are the same
// shape as an input minus the contribution, and they are kept in their own
// list rather than as zero-weight rows so the identity above stays exact —
// the target is a sum over `inputs`, and nothing in `readings` is in it.
// =====================================================================

// A multiplier on an input rather than an input of its own: library
// adequacy on curriculum breadth, admissions scale on student quality.
// Both express the same idea — this term is only worth its full weight to
// a school that can actually serve the students it has — and both are
// floored, so they throttle an upside and never punish.
export interface StandingMultiplier {
  label: string;
  value: number;   // 0..1
  detail: string;  // what the ratio is, in the units a reader recognises
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

// The summer model, carried on the standing that has one so the panel can
// describe it without naming it: the two step rates and last summer's card.
export interface SummerModel {
  riseRate: number;
  fallRate: number;
  reportCard: ReportCard | null;
}

// A term that is measured and shown but contributes NOTHING — yet. `weight`
// is what the plan that introduced it proposes it will be worth once it
// counts, and `reach` is weight × score, the figure it WOULD add (or, for a
// penalty, subtract); the panel draws that as the pale layer with no solid
// one over it. A reading with no weight is a ceiling or a ratio rather than
// a future input, and is shown as the plain figure it is.
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

// Assembles a breakdown and computes its own target, so no caller can
// disagree with the sum.
function breakdown(
  label: string, baseline: number, current: number, inputs: StandingInput[],
  readings: StandingReading[] = [], summer?: SummerModel,
): StandingBreakdown {
  const total = inputs.reduce((sum, input) => sum + input.contribution, baseline);
  return {
    label, baseline, inputs, readings, current, summer,
    target: clamp(total, PRESTIGE_MIN, PRESTIGE_MAX),
    driftRate: summer ? PRESTIGE_TREMOR_RATE : PRESTIGE_DRIFT_RATE,
    min: PRESTIGE_MIN,
    max: PRESTIGE_MAX,
  };
}

function libraryMultiplier(s: GameState): StandingMultiplier {
  const enrolled = totalEnrolled(s.students);
  const seats = s.tech
    .filter((t) => t.status === 'done' && t.facilityType === 'library')
    .reduce((sum, t) => sum + (t.effects?.servesPopulation ?? 0), 0);
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
      'What the recreation and athletics facilities contribute on their own.',
    ),
    weigh(
      'welfare', 'Welfare', WELFARE_WEIGHT, welfareScore(s),
      `Students have averaged ${average.toFixed(0)} of 100 this year; ${WELFARE_FLOOR_SATISFACTION} earns nothing and ${WELFARE_FULL_SATISFACTION} pays in full.`,
    ),
    weigh(
      'endowment', 'Endowment', ENDOWMENT_WEIGHT, endowmentScore(s),
      `$${Math.round(s.finance.endowment).toLocaleString()} against a student body of ${totalEnrolled(s.students).toLocaleString()}.`,
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
    fallRate: PRESTIGE_FALL_RATE,
    reportCard: s.self.reportCard,
  });
}

// =====================================================================
// PLAN 15's TERMS: welfare, concentration, crowding — and the seats.
//
// Plan 15's PR A wrote these as READINGS: pure functions shown on the
// panel and counted by nothing, so there was a year of trajectories to
// read them off before PR B made them count. PR B promoted the first three
// to inputs (concentration and welfare) and a penalty (crowding), at the
// weights above. Instruction capacity stays a reading: it is the ceiling
// PR E turns into a cap, not an input, and it is shown as the ratio it is.
// =====================================================================

// Welfare: the trailing-year average satisfaction, scored (sat − 40) / 40
// and clamped. Below 40 it earns nothing; at 80 it pays in full. Read as
// the YEAR'S AVERAGE rather than today's number, because this is one of the
// two terms a player could otherwise game by timing a dorm's completion in
// week 50 — and it is the term that lets a happy small college hold a
// standing a crowded large one cannot.
const WELFARE_FLOOR_SATISFACTION = 40;
const WELFARE_FULL_SATISFACTION = 80;

export function welfareScore(s: GameState): number {
  const average = trailingYearSatisfaction(s);
  return clamp01((average - WELFARE_FLOOR_SATISFACTION) / (WELFARE_FULL_SATISFACTION - WELFARE_FLOOR_SATISFACTION));
}

// Concentration: the "known for" term, and the one Plan 14's founded
// schools make possible. Breadth counts how MANY programs stand finished;
// this reads how DEEP the school's deepest school is — founded (six of its
// programs housed as a unit in one hall, schools.ts) and distinguished
// (every one of its programs complete, techSystem.ts's checkMilestones) —
// so a player who fills a hall with one school and finishes it outranks a
// player with the same course count spread across seven. Only the best
// school counts, deliberately: a second and a third founded school are
// breadth, and breadth already pays for them. This is what lets a small
// elite college and a broad state university both be real.
//
// Both milestones are durable — awarded once, never revoked — which is why
// this reads them rather than the live dedication: a school that existed
// existed, and a program moved out for a term does not un-found it.
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

// Crowding: the worst of the five coverage ratios satisfactionSystem.ts
// already scores and the instruction-capacity ratio, read as a SHORTFALL
// below CROWDING_GRACE. A campus covering 90% or better of every need
// loses nothing; one feeding 55% of its students reads about 0.39, which
// at CROWDING_PENALTY is a little under ten points. It is a PENALTY rather
// than a weighted input, so it can take a school below what its
// curriculum earned — which is the point.
//
// Graded on the YEAR'S AVERAGE: tickPrestige accumulates the live
// shortfall every week, and crowdingScore reads the average of the year
// so far (the live reading before any week has accumulated). The summer
// card therefore grades the year the students actually had.
//
// Health below its population gate is fully covered rather than short,
// the same rule computeSatisfactionBreakdown and the demand system both
// apply: students cannot be crowded out of a building the campus is too
// small to have a use for.
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

// Every ratio the crowding reading considers, worst first.
export function crowdingCoverages(s: GameState): CoverageReading[] {
  const enrolled = totalEnrolled(s.students);
  const out: CoverageReading[] = [];
  for (const attribute of Object.keys(COVERAGE_LABELS) as Array<keyof SatisfactionAttributes>) {
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

// The year's average shortfall so far, which is what the input reads.
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

function pct(v: number): string {
  return `${Math.round(v * 100)}%`;
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

// =====================================================================
// THE SUMMER REPORT CARD, and the step it drives.
//
// gradeYear is called ONCE a year, from reducer.ts's RESOLVE_ADMISSIONS,
// BEFORE the accumulators reset and BEFORE the funnel runs — so the card
// grades the year that just ended, with the class that spent it — and the
// step is applied by applyReportCard AFTER the funnel, so the admissions
// panel's projection (which read prestige as it stood) is honoured by the
// class that actually enrolls. Two calls rather than one so those two
// orderings can both hold.
//
// The card's grades are the breakdown's own contributions, keyed by input,
// so the panel puts "this year's grade" beside each row without naming one.
// =====================================================================
export function gradeYear(s: GameState): ReportCard {
  const made = prestigeBreakdown(s);
  const grades: Record<string, number> = {};
  for (const input of made.inputs) grades[input.key] = input.contribution;
  const before = s.self.reputation;
  const gap = made.target - before;
  const rate = gap >= 0 ? PRESTIGE_RISE_RATE : PRESTIGE_FALL_RATE;
  const after = clamp(before + gap * rate, PRESTIGE_MIN, PRESTIGE_MAX);
  return { year: s.clock.year, score: made.target, grades, before, after };
}

// The step itself: prestige moves to the card's `after`. Lives here, and
// only here, so test/invariants.test.ts section 5 keeps every writer of
// s.self.reputation in one file. Recorded on s.self so the panel can show
// the card until next summer replaces it.
export function applyReportCard(s: GameState, card: ReportCard): void {
  s.self.reputation = card.after;
  s.self.reportCard = card;
}

export function computePrestigeTarget(s: GameState): number {
  return prestigeBreakdown(s).target;
}

// What the prestige target WOULD be if the given milestones had never
// been awarded. Used by the milestone celebration modal (see
// InterruptModal.tsx) to say what an accomplishment was actually worth:
// "the target moved from X to Y because of this". Pure — it builds a
// throwaway shallow copy with those milestone keys removed and runs the
// same computePrestigeTarget above, so there is no second copy of the
// formula to drift, and nothing about the real state is touched. Safe
// because computePrestigeTarget only ever READS; the copy shares every
// other slice by reference.
export function prestigeTargetWithout(s: GameState, milestoneKeys: readonly string[]): number {
  if (milestoneKeys.length === 0) return computePrestigeTarget(s);
  const milestones = { ...s.milestones };
  for (const key of milestoneKeys) delete milestones[key];
  return computePrestigeTarget({ ...s, milestones });
}

// Called every week from the SYSTEMS array (see reducer.ts). Drifts prestige
// a small fraction of the way toward its target; never jumps. There is no
// other, artificial downward pull: if the target sits below current prestige
// (say, incoming quality slipped at the last cycle), prestige drifts down to
// match reality, but standing still with a stable target holds prestige
// steady — rivals climbing past a stagnating player is what actually costs
// rank (see rivalsSystem.ts). Incoming quality only changes once a year at
// RESOLVE_ADMISSIONS; every other input can change any week, which is the
// whole reason this runs weekly.
// =====================================================================
// THE OTHER TWO STANDINGS (see docs/design/progression.md's "Three
// standings"). Two more stocks of exactly the shape above: a target
// computed weekly from durable inputs, drifted toward at the same tiny
// rate, clamped to the same band.
//
// THEY ARE ADDED BESIDE `reputation`, NEVER INSIDE IT, and that is the
// whole reason this was affordable. computePrestigeTarget is not touched by
// this change — not a weight, not the baseline, not an input. Splitting the
// headline number into components that sum to it would have moved
// admitRate, the applicant pool, price tolerance, every YearSnapshot ever
// recorded, and sim/balanceSim.ts's seven strategies, all at once. So the
// backlog's "prestige becomes more than one number" is read as two MORE
// numbers rather than as a decomposition of the one.
//
// AND THEY ARE READINGS, NEVER INPUTS. Nothing in computePrestigeTarget
// above reads either stock, and nothing outside this module reads them back
// into a decision: admissions, tuition, the applicant pool and the balance
// sim all still read `reputation` alone. That one-way rule is the same one
// rankings already follow — a rank measures prestige and never feeds it —
// and test/invariants.test.ts section 5 asserts it for all three.
//
// THE DOUBLE-COUNTING IS DELIBERATE. Research credits feed the academic
// target (at RESEARCH_WEIGHT, where they already did) and the research axis
// (at full scale). That is correct rather than sloppy: the two numbers
// answer different questions — how good is this university, and how good is
// its research — and a research university is supposed to score on both.
// What is forbidden is the other direction.
// =====================================================================

// A school with no labs is not a research university, and a school with no
// clubs, teams or social space is not much of a place to be a student. Both
// baselines sit below the academic one for that reason: these are things a
// school EARNS rather than arrives with.
export const RESEARCH_STANDING_BASELINE = 18;
export const SOCIAL_STANDING_BASELINE = 22;

// Research standing's own denominator on the credit tally, and it is
// deliberately three times RESEARCH_CREDITS_FOR_FULL_SCORE. That constant is
// calibrated for a CAPPED 22-weight input inside the academic target, where
// reaching the cap early and staying there is fine because the term can only
// ever be worth 22. Here the same tally carries most of a whole axis, so
// twenty credits has to read as "a good research school" rather than as the
// top of the national table — otherwise the axis is won in a decade and
// stops saying anything for the next three.
const RESEARCH_STANDING_CREDITS_FOR_FULL = 60;

const RESEARCH_OUTPUT_WEIGHT = 80;  // what the labs have actually produced
const RESEARCH_BREADTH_WEIGHT = 40; // how many fields the school can research in at all

// Lab breadth: equipped research fields against EVERY field the university
// could research in. Read through researchData.ts's own labEquippedFields,
// which is the gate research itself runs on, so "a school researches in N
// fields" can never drift from "research is possible in N fields".
//
// THE UNIT MISMATCH, FIXED (Plan 15's PR C). Plan 09's breakdown found this
// dividing equipped fields by the count of research SCHOOLS, and a school
// teaches several fields: at year 15 a completionist campus read 29
// equipped fields against 8 schools, so a 40-weight term had been pinned
// at its maximum since roughly the fourth lab. The denominator is now the
// fields themselves (researchableFields), which is what the sentence
// beside it always claimed it measured, and the term is something a
// research school earns lab by lab rather than something the third lab
// finishes.
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
      `${equipped} of the ${fields} fields the university could research in ${equipped === 1 ? 'has' : 'have'} a lab.`,
    ),
  ]);
}

export function computeResearchTarget(s: GameState): number {
  return researchStandingBreakdown(s).target;
}

// Social standing's four inputs. Between them they are the closest thing the
// game has to "what is it like to be a student here": the places built for
// it, the organisations that grew in them, the varsity programs, and what
// the students themselves report.
const SOCIAL_FACILITIES_WEIGHT = 30;   // the rec-centre chain's own prestigeContribution, the same sum campusLifeScore reads
const SOCIAL_ORGANISATIONS_WEIGHT = 35; // clubs, chapters and housed chapters, through their own capped bonus
const SOCIAL_ATHLETICS_WEIGHT = 30;     // athleticProgramStrength — and THIS is athletics' first reach into any standing at all
const SOCIAL_SATISFACTION_WEIGHT = 25;  // what the student body actually reports about its social life
const SOCIAL_TITLES_WEIGHT = 20;        // championships won (see systems/athletics/playoffs.ts)

// WHAT A CHAMPIONSHIP IS WORTH, and it is the term that closes the loop this
// whole plan was written around: hire a coach, the team's quality rises, it
// seeds higher in its sport, it qualifies and sometimes wins, and a title
// moves a standing the player can see a rank for. Every arrow in that chain
// exists once this term does.
//
// A MONOTONE STOCK, like curriculum breadth and research credits and for the
// same reason: standing earned by a banner does not evaporate during a quiet
// decade. A school that won four titles in the eighties is still a school
// that won four titles.
//
// Sized so it takes a genuine dynasty to max — twelve championships is
// decades of sustained investment in a department the game does not require
// anybody to build at all.
const TITLES_FOR_FULL_SCORE = 12;

function titlesScore(s: GameState): number {
  return clamp01(s.orgs.titles.length / TITLES_FOR_FULL_SCORE);
}

// ATHLETICS FINALLY TOUCHES A STANDING, and it is worth being precise about
// which one. docs/design/student-life.md says athletics reaches satisfaction
// "never prestige directly; if athletics should eventually touch prestige,
// that is a separate prestige-model decision, flagged rather than wired."
// This is that decision, made in the narrow shape it was flagged in: a
// program reaches SOCIAL standing, a number no system reads back. The
// headline it is forbidden to touch is still untouched, and `npm run sim`
// can prove it.
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
  ]);
}

export function computeSocialTarget(s: GameState): number {
  return socialStandingBreakdown(s).target;
}

// The weekly tick. Academic standing TREMBLES toward its live target (the
// summer step is the beat — see gradeYear); the other two stocks drift at
// the old weekly rate, since neither is graded at a summer and nothing
// reads either back. One function rather than three registered systems:
// keeping them here is what lets invariants.test.ts confine every writer
// of all three to one file.
//
// This is also where the crowding accumulator is fed (see
// s.students.crowdingYearWeeks): this week's shortfall, so that the summer
// card grades the year's average rather than the week the dorm opened.
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

// The playtest panel's "set prestige" (see reducer.ts's DEBUG block), and
// it lives HERE rather than in the reducer for one reason:
// test/invariants.test.ts section 5 confines every writer of
// s.self.reputation to three files, and that invariant is worth more than
// the convenience of writing the field where the action is handled. A
// shortcut may put the school at a standing it has not earned; it may not
// put it outside the band the drift itself can reach, so the same clamp
// applies, and from the next tick onward prestige drifts back toward its
// real target — which is exactly what makes this worth having.
export function setPrestigeForPlaytest(s: GameState, value: number): number {
  s.self.reputation = clamp(value, PRESTIGE_MIN, PRESTIGE_MAX);
  return s.self.reputation;
}
