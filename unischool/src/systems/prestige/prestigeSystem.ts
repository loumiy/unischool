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
// The three inputs, each normalized to 0..1 before weighting:
//   - curriculum breadth: a STOCK — how many majors/schools stand fully
//     finished right now (see milestoneSchools() below), not how many
//     courses were added this year.
//   - selectivity: the emergent admit rate from the most recently resolved
//     admissions cycle (admissionsSystem.ts) — more selective (lower admit
//     rate) means a higher score.
//   - incoming student quality: the average quality of the class that
//     actually enrolled in that same cycle.
//
// Faculty quality is a planned fourth input (a natural extension once
// faculty have a durable "quality" stock of their own) — facultyQualityScore
// below is the seam: it already participates in the weighted sum, just at
// zero weight, so wiring it up later is a one-constant change.
//
// Each of the three (soon four) scores is independently clamped to 0..1
// before it is weighted, so each contributes at most its own weight to the
// target. That is what stops the prestige/selectivity/quality loop from
// spiraling: a tiny, scarcity-obsessed school can ride selectivity and
// quality to their individual ceilings, but climbing past that combined
// ceiling requires the curriculum-breadth term too, which only rises with
// genuine, sustained buildout — see the PR notes for the fast-forward
// trajectory this was tuned against.
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
// there below) — in practice curriculum breadth dominates: see the PR
// notes' fast-forward run, where a fully-built curriculum alone carries
// prestige to #1 even with unremarkable selectivity, and pairing it with a
// deliberately scarce/low-tuition posture pushes it higher still.
const CURRICULUM_BREADTH_WEIGHT = 90; // majors/schools completed — the stock only sustained buildout grows
const SELECTIVITY_WEIGHT = 45;        // emergent admit-rate-derived score — grows with scarce capacity or pricing power
const STUDENT_QUALITY_WEIGHT = 35;    // emergent avg incoming quality — grows with a low-tuition, high-yield posture
// Seam for the next task: faculty quality will become a real stock (e.g.
// average roster teaching+research) with its own nonzero weight. Kept at 0
// so it has no effect yet, but the target formula already sums it in.
const FACULTY_QUALITY_WEIGHT = 0;

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

// Seam for the next task: currently unused (FACULTY_QUALITY_WEIGHT is 0),
// but already shaped like the other scores (0..1) so wiring it in is just
// giving it a real weight above.
function facultyQualityScore(_s: GameState): number {
  return 0;
}

export function computePrestigeTarget(s: GameState): number {
  const target =
    PRESTIGE_BASELINE +
    CURRICULUM_BREADTH_WEIGHT * curriculumBreadthScore(s) +
    SELECTIVITY_WEIGHT * selectivityScore(s) +
    STUDENT_QUALITY_WEIGHT * studentQualityScore(s) +
    FACULTY_QUALITY_WEIGHT * facultyQualityScore(s);
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
