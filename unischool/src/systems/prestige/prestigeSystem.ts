import type { GameState } from '../../state/types';
import { totalEnrolled } from '../../state/types';
import { graduatePrograms, milestoneSchools } from '../../data/techData';
import { campusAverageCourseQuality } from '../faculty/facultyAssignment';
import { teachingQualityScore } from '../../data/courseQuality';
import { INITIATIVE_COMPLETION_CREDIT } from '../../data/researchData';

// ---------------------------------------------------------------------
// Prestige (s.self.reputation) is a slow-moving STOCK, not a flow. It used
// to be nudged directly by course/building/milestone completion effects
// and a weekly satisfaction-driven pull (see rivalsSystem.ts's old
// repTarget) — that made it spike while the player was actively building
// and sag once the curriculum was done, since it tracked *build activity*
// rather than the school's actual standing.
//
// Instead, EVERY WEEK (see tickPrestige below, registered in reducer.ts's
// SYSTEMS array) this module computes a prestige TARGET from durable,
// slow-changing inputs — things that describe what the school *is*, not what
// it did this week — and reputation drifts toward that target by a small
// fraction of the gap. It never jumps to it, and the weekly fraction is tiny
// (see PRESTIGE_DRIFT_RATE): a long-established school's prestige is sticky —
// it does not evaporate the moment growth stalls, does not snap to a new high
// the moment a milestone completes, and moves only gently from one week to
// the next. Weekly rather than annual so standing responds smoothly to
// mid-year changes — a lab finishing, a star hire maturing, a breakthrough
// published — rather than sitting frozen between summers.
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

// How much of the gap between current prestige and its target closes each
// WEEK — see tickPrestige. Deliberately tiny: prestige is sticky, so a single
// good week barely moves it and a long-idle school keeps most of what it
// already had. Sized to preserve the old ~12%-per-year stickiness now that
// the drift runs weekly: 1 - (1 - 0.12)^(1/52) ≈ 0.00246, so 52 weekly closes
// still total ~12% of the gap over a year.
const PRESTIGE_DRIFT_RATE = 0.0025;

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
const CURRICULUM_BREADTH_WEIGHT = 90; // majors/schools completed — the stock only sustained buildout grows
const TEACHING_QUALITY_WEIGHT = 30;   // how good the courses actually are, as its own input (see teachingScore below)
const STUDENT_QUALITY_WEIGHT = 24;    // emergent avg incoming quality — grows with a low-tuition, selective posture
const RESEARCH_WEIGHT = 22;           // what the university's research has actually produced (see researchScore below)
const CAMPUS_LIFE_WEIGHT = 12;        // rec center / athletics complex — a small, capped draw on its own (see campusLifeScore below)
const ENDOWMENT_WEIGHT = 18;          // financial resources per student — what the late-game endowment campaigns buy (see endowmentScore below)

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
const RESEARCH_CREDITS_FOR_FULL_SCORE = 20;
function researchScore(s: GameState): number {
  const doctorates = graduatePrograms().filter(
    (program) => program.type === 'doctoral' && s.milestones[`grad-program-complete:${program.id}`],
  ).length;
  const credits =
    PUBLICATION_PRESTIGE_CREDIT * s.research.publications +
    s.research.completedInitiatives.reduce(
      (sum, done) => sum + (done.cancelled ? 0 : INITIATIVE_COMPLETION_CREDIT[done.depth]),
      0,
    ) +
    BREAKTHROUGH_PRESTIGE_CREDIT * s.research.breakthroughs +
    PRIZE_PRESTIGE_CREDIT * s.research.prizes +
    DOCTORATE_PRESTIGE_CREDIT * doctorates;
  return clamp01(credits / RESEARCH_CREDITS_FOR_FULL_SCORE);
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
function endowmentScore(s: GameState): number {
  const enrolled = totalEnrolled(s.students);
  if (enrolled <= 0) return 0;
  return clamp01(s.finance.endowment / (enrolled * ENDOWMENT_PER_SEAT_FOR_FULL_SCORE));
}

export function computePrestigeTarget(s: GameState): number {
  const target =
    PRESTIGE_BASELINE +
    CURRICULUM_BREADTH_WEIGHT * curriculumBreadthScore(s) * libraryAdequacyScore(s) +
    TEACHING_QUALITY_WEIGHT * teachingScore(s) +
    STUDENT_QUALITY_WEIGHT * studentQualityScore(s) * admissionsScaleScore(s) +
    RESEARCH_WEIGHT * researchScore(s) +
    CAMPUS_LIFE_WEIGHT * campusLifeScore(s) +
    ENDOWMENT_WEIGHT * endowmentScore(s);
  return clamp(target, PRESTIGE_MIN, PRESTIGE_MAX);
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
export function tickPrestige(s: GameState): void {
  const target = computePrestigeTarget(s);
  s.self.reputation += (target - s.self.reputation) * PRESTIGE_DRIFT_RATE;
  s.self.reputation = clamp(s.self.reputation, PRESTIGE_MIN, PRESTIGE_MAX);
}
