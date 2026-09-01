import type { GameState } from '../../state/types';
import { milestoneSchools } from '../../data/techData';

// ---------------------------------------------------------------------
// Prestige (s.self.reputation) is a slow-moving STOCK, not a flow. It used
// to be nudged directly by course/building/milestone completion effects
// and a weekly satisfaction-driven pull (see rivalsSystem.ts's old
// repTarget) — that made it spike while the player was actively building
// and sag once the curriculum was done, since it tracked *build activity*
// rather than the school's actual standing.
//
// Instead, once a year (see reducer.ts's RESOLVE_ADMISSIONS, the one
// natural annual boundary) this module computes a prestige TARGET from
// durable, slow-changing inputs — things that describe what the school
// *is*, not what it did this week — and reputation drifts toward that
// target by a small fraction of the gap. It never jumps to it. A
// long-established school's prestige is sticky: it does not evaporate the
// moment growth stalls, and it does not snap to a new high the moment a
// milestone completes.
//
// The inputs, each normalized to 0..1 before weighting:
//   - curriculum breadth: a STOCK — how many majors/schools stand fully
//     finished right now (see milestoneSchools() below), not how many
//     courses were added this year.
//   - selectivity: the emergent admit rate from the most recently resolved
//     admissions cycle (admissionsSystem.ts) — more selective (lower admit
//     rate) means a higher score.
//   - incoming student quality: the average quality of the class that
//     actually enrolled in that same cycle.
//   - faculty quality: the roster's average current teaching+research (see
//     facultyData.ts — faculty are an appreciating asset: retained hires
//     grow toward a rolled ceiling over years of tenure, then plateau, and
//     cost more as they do). A durable stock of the same shape as
//     curriculum breadth — it reflects who's on the roster right now, not
//     who was hired this week.
//
//   - campus life, and financial resources per student (endowment against
//     capacity) — two smaller, capped inputs; the second is what the
//     late-game endowment campaigns buy (see financeSystem.ts).
//
// EVERY score is independently clamped to 0..1 before it is
// weighted, so each contributes at most its own weight to the target. That
// is what stops the prestige/selectivity/quality loop from spiraling: a
// tiny, scarcity-obsessed school can ride selectivity and quality to their
// individual ceilings, but climbing past that combined ceiling requires
// the curriculum-breadth and faculty-quality terms too, both of which only
// rise with genuine, sustained investment — see the PR notes for the
// fast-forward trajectories this was tuned against.
// ---------------------------------------------------------------------

// Prestige target, before any of the weighted inputs, for a school with
// zero curriculum breadth, average selectivity, and average incoming
// quality. Deliberately below the field's median so a fresh school is
// unremarkable, not average, until it earns its way up.
const PRESTIGE_BASELINE = 32;

// How much of the gap between current prestige and its target closes each
// YEAR (not week) — see tickPrestigeAnnual. Small on purpose: prestige is
// sticky, so a single blockbuster year barely moves it, and a long-idle
// school keeps most of what it already had.
const PRESTIGE_DRIFT_RATE = 0.12;

// Weight applied to each 0..1 input score. Their sum plus PRESTIGE_BASELINE
// would exceed PRESTIGE_MAX if every input maxed out at once (it's clamped
// there below); in practice curriculum breadth still dominates by design,
// with selectivity, student quality, and faculty quality as comparable
// secondary drivers. Rebalanced (down from the prior three-input version's
// 90/45/35) to make room for faculty quality without pushing a strong,
// straightforward sustained-buildout run (curriculum + a mature
// departmental roster, but no special selectivity management) right up
// against PRESTIGE_MAX — see the PR notes' fast-forward runs.
const CURRICULUM_BREADTH_WEIGHT = 75; // majors/schools completed — the stock only sustained buildout grows
const SELECTIVITY_WEIGHT = 30;        // emergent admit-rate-derived score — grows with scarce capacity or pricing power
const STUDENT_QUALITY_WEIGHT = 22;    // emergent avg incoming quality — grows with a low-tuition, high-yield posture
const FACULTY_QUALITY_WEIGHT = 25;    // avg roster teaching+research — grows by hiring well and, more importantly, retaining hires long enough to mature
const CAMPUS_LIFE_WEIGHT = 12;        // rec center / athletics complex — a small, capped draw on its own (see campusLifeScore below)
const ENDOWMENT_WEIGHT = 16;          // financial resources per student — what the late-game endowment campaigns buy (see endowmentScore below)

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
// booleans techSystem.ts already tracks (major-complete, major-mastered,
// school-complete) — never off anything added or completed this tick.
// Weighted so a fully mastered curriculum (every major complete AND
// mastered, every school complete) scores exactly 1.
const MAJOR_COMPLETE_SHARE = 0.4;
const MAJOR_MASTERED_SHARE = 0.3;
const SCHOOL_COMPLETE_SHARE = 0.3;

export function curriculumBreadthScore(s: GameState): number {
  const schools = milestoneSchools();
  const totalMajors = schools.reduce((sum, school) => sum + school.majors.length, 0);
  const schoolsWithMajors = schools.filter((school) => school.majors.length > 0).length;
  if (totalMajors === 0 || schoolsWithMajors === 0) return 0;

  let majorsComplete = 0;
  let majorsMastered = 0;
  let schoolsComplete = 0;
  for (const school of schools) {
    for (const major of school.majors) {
      if (s.milestones[`major-complete:${major.prefix}`]) majorsComplete += 1;
      if (s.milestones[`major-mastered:${major.prefix}`]) majorsMastered += 1;
    }
    if (school.majors.length > 0 && s.milestones[`school-complete:${school.schoolName}`]) schoolsComplete += 1;
  }

  return clamp01(
    MAJOR_COMPLETE_SHARE * (majorsComplete / totalMajors) +
    MAJOR_MASTERED_SHARE * (majorsMastered / totalMajors) +
    SCHOOL_COMPLETE_SHARE * (schoolsComplete / schoolsWithMajors),
  );
}

// Admissions scale: how much CREDIT the two admissions-derived inputs
// below (selectivity and incoming quality) are allowed to earn, as a
// multiplier — the same shape as libraryAdequacyScore further down, and
// for the same reason.
//
// Without it, the two cheapest inputs in the formula are free for a
// school that never grows: turning away applicants and enrolling only
// top-band students is trivially easy at 350 beds, and it used to be
// enough on its own to drift a do-nothing school into the top of the
// rankings (see the PR's "idle" fast-forward — it reached prestige ~127
// having built nothing at all, which makes the entire growth loop
// optional). Being selective with a class of 200 is a boutique, not a
// national university; national standing has to be earned at scale.
//
// The floor keeps a small school from scoring zero on either input — a
// selective small college is genuinely well regarded, just not top-ten —
// so this throttles the shortcut without ever creating a downward
// spiral: it is a multiplier on an upside, never a penalty, and it can
// only rise as enrollment grows.
const ADMISSIONS_SCALE_FOR_FULL_CREDIT = 6_000; // enrolled students at which selectivity/quality count in full
const ADMISSIONS_SCALE_FLOOR = 0.35;
function admissionsScaleScore(s: GameState): number {
  return clamp(s.students.enrolled / ADMISSIONS_SCALE_FOR_FULL_CREDIT, ADMISSIONS_SCALE_FLOOR, 1);
}

// Selectivity: the most recently resolved admissions cycle's admit rate,
// inverted — a lower admit rate (harder to get in) scores higher.
function selectivityScore(s: GameState): number {
  return clamp01(1 - s.students.admitRate);
}

// Incoming student quality: the most recently resolved cycle's average
// quality score (0..100, see admissionsSystem.ts's QUALITY_BAND_SCORE),
// normalized to 0..1.
function studentQualityScore(s: GameState): number {
  return clamp01(s.students.incomingQuality / 100);
}

// Faculty quality: the roster's average current teaching+research (each
// 0..100), normalized to 0..1. Reads current (already-grown) stats only —
// a brand-new hire barely moves this, a long-retained one moves it a lot,
// which is what makes retention (not just hiring) the actual lever.
function facultyQualityScore(s: GameState): number {
  if (s.faculty.length === 0) return 0;
  const avgStat = s.faculty.reduce((sum, f) => sum + f.teaching + f.research, 0) / (s.faculty.length * 2);
  return clamp01(avgStat / 100);
}

// Library adequacy: how well the library's total servesPopulation (its
// tier-1 seats, plus the research-library tier-2 upgrade if built — see
// facilitiesData.ts) covers the campus at its current capacity. Mirrors
// satisfactionSystem.ts's own academic-attribute target ratio (kept equal
// deliberately, tuned independently rather than cross-imported — systems
// only read/write shared state, they don't call into each other) but is
// used here as a MULTIPLIER on the curriculum-breadth term rather than as
// an additive score: "under-capacity caps academic prestige growth" means
// a brilliant, fully-built curriculum at a school with no library can't
// fully cash in that prestige, not that a bad library actively costs
// prestige on its own. A floor keeps a brand-new school (no library built
// yet — it hasn't had time) from having curriculum breadth zeroed outright.
const LIBRARY_TARGET_RATIO = 0.15;
const LIBRARY_ADEQUACY_FLOOR = 0.4;
function libraryAdequacyScore(s: GameState): number {
  if (s.students.capacity <= 0) return 1;
  const servesPopulation = s.tech
    .filter((t) => t.status === 'done' && t.facilityType === 'library')
    .reduce((sum, t) => sum + (t.effects?.servesPopulation ?? 0), 0);
  const ratio = clamp01(servesPopulation / (s.students.capacity * LIBRARY_TARGET_RATIO));
  return clamp(ratio, LIBRARY_ADEQUACY_FLOOR, 1);
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

// Financial resources per student: endowment measured against the size of
// the campus it has to support, which is how real rankings read a school's
// wealth — a small school with a large endowment is resource-rich; the
// same endowment spread over 20,000 beds is not. This is what the
// late-game endowment campaigns (see financeSystem.ts's endowmentCampaign)
// actually buy: the surplus a mature school can no longer spend on dorms
// or curriculum converts into standing instead, slowly and expensively.
//
// Clamped to 0..1 exactly like every other input, so it can contribute at
// most its own weight — money can buy a real but bounded amount of
// prestige, and never a shortcut past the curriculum-breadth term. Read
// against CAPACITY, not enrolled, so it can't be gamed by under-filling
// the class for a year.
const ENDOWMENT_PER_SEAT_FOR_FULL_SCORE = 400_000;
function endowmentScore(s: GameState): number {
  if (s.students.capacity <= 0) return 0;
  return clamp01(s.finance.endowment / (s.students.capacity * ENDOWMENT_PER_SEAT_FOR_FULL_SCORE));
}

export function computePrestigeTarget(s: GameState): number {
  const target =
    PRESTIGE_BASELINE +
    CURRICULUM_BREADTH_WEIGHT * curriculumBreadthScore(s) * libraryAdequacyScore(s) +
    SELECTIVITY_WEIGHT * selectivityScore(s) * admissionsScaleScore(s) +
    STUDENT_QUALITY_WEIGHT * studentQualityScore(s) * admissionsScaleScore(s) +
    FACULTY_QUALITY_WEIGHT * facultyQualityScore(s) +
    CAMPUS_LIFE_WEIGHT * campusLifeScore(s) +
    ENDOWMENT_WEIGHT * endowmentScore(s);
  return clamp(target, PRESTIGE_MIN, PRESTIGE_MAX);
}

// Called once a year, from RESOLVE_ADMISSIONS — the one natural annual
// boundary — right after that cycle's admitRate/incomingQuality are set.
// Drifts prestige a small fraction of the way toward its target; never
// jumps. There is no other, artificial downward pull: if the target sits
// below current prestige (say, selectivity slipped), prestige drifts down
// to match reality, but standing still with a stable target holds prestige
// steady — rivals climbing past a stagnating player is what actually costs
// rank (see rivalsSystem.ts).
export function tickPrestigeAnnual(s: GameState): void {
  const target = computePrestigeTarget(s);
  s.self.reputation += (target - s.self.reputation) * PRESTIGE_DRIFT_RATE;
  s.self.reputation = clamp(s.self.reputation, PRESTIGE_MIN, PRESTIGE_MAX);
}
