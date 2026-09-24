import { discoverySchools, graduateCourseIds, graduatePrograms } from './techData';

// Course quality: the A-F grade every developed course carries. This module
// is the tuning and math on plain numbers; the state wiring (who teaches
// what, how loaded) is in systems/faculty/facultyAssignment.ts.
// Quality is computed on read from the instructor's current stats, never
// stored, so a course improves as its professor matures.

export type Grade = 'A' | 'B' | 'C' | 'D' | 'F';

// Kept separate from facultyData.ts's QUALITY_TIER_THRESHOLDS so the two
// scales can be tuned apart. A new hire starts at 55% of potential, so no
// fresh appointment opens above C; early grades read tenure, not choice.
// These bands are tuned so about one fresh hire in seven opens at F, and so
// a matured instructor (teaching ~71) visibly drops a grade under a full
// load on a tier-3 course. Preserve through any retune: D on a new
// department's course is normal, D on a veteran's means overload.
export const GRADE_A = 78;
export const GRADE_B = 62;
export const GRADE_C = 44;
const GRADE_D = 30;

export function gradeFor(score: number): Grade {
  if (score >= GRADE_A) return 'A';
  if (score >= GRADE_B) return 'B';
  if (score >= GRADE_C) return 'C';
  if (score >= GRADE_D) return 'D';
  return 'F';
}

// --- Load: what a full plate costs the courses on it. ---
// Scales with how close the instructor is to their own slot ceiling
// (exceeding it is impossible in play): one course is taught at full
// strength, and each further course costs all of them a little, so "hire
// more" and "hire better" are different answers. 7 keeps a full load a cost
// rather than a cliff while a matured instructor on a tier-3 course still
// drops a visible grade (66 B to 59 C).
const LOAD_PENALTY_MAX = 7;
// An over-ceiling load (migration only) keeps scaling up to this multiple,
// so an over-stretched department reads worse than a full one.
const LOAD_PENALTY_OVERRUN_CAP = 1.5;

export function loadPenalty(load: number, slots: number): number {
  if (slots <= 1 || load <= 1) return 0;
  const fraction = (load - 1) / (slots - 1);
  return LOAD_PENALTY_MAX * Math.min(fraction, LOAD_PENALTY_OVERRUN_CAP);
}

// --- Tier: harder material needs a stronger teacher. ---
// Makes assignment a matching problem: a star belongs on the capstone.
export type CourseTier = 1 | 2 | 3 | 'graduate';

const TIER_PENALTY: Record<string, number> = {
  1: 0,
  2: 2,
  3: 5,
  graduate: 8,
};

export function tierPenalty(tier: CourseTier): number {
  return TIER_PENALTY[String(tier)] ?? 0;
}

// Course id -> tier, built once from the seed (techData.ts) rather than
// parsed from course codes.
let tierMap: Map<string, CourseTier> | null = null;

function courseTiers(): Map<string, CourseTier> {
  if (tierMap) return tierMap;
  const map = new Map<string, CourseTier>();
  for (const school of discoverySchools()) {
    for (const major of school.majors) {
      map.set(major.tier1Id, 1);
      for (const id of major.tier2Ids) map.set(id, 2);
      for (const id of major.tier3Ids) map.set(id, 3);
    }
  }
  for (const program of graduatePrograms()) {
    for (const id of graduateCourseIds(program)) map.set(id, 'graduate');
  }
  tierMap = map;
  return map;
}

export function tierOf(courseId: string): CourseTier {
  return courseTiers().get(courseId) ?? 1;
}

// --- Acclaim: a laureate's teaching benefits too. ---
// Small and capped: the research loop's one nod into the teaching loop.
const ACCLAIM_BONUS_PER_PRIZE = 3;
const ACCLAIM_BONUS_MAX = 6;

export function acclaimBonus(acclaim: number): number {
  return Math.min(acclaim * ACCLAIM_BONUS_PER_PRIZE, ACCLAIM_BONUS_MAX);
}

// One itemized, signed reason for a score. The drawer renders these
// verbatim so the player can see which action would move the grade.
export interface QualityFactor {
  label: string;
  value: number;
}

export interface CourseQuality {
  score: number;
  grade: Grade;
  factors: QualityFactor[];
}

// `slots` and `load` are the instructor's ceiling and current course count,
// the graded course included.
export function qualityOf(
  { teaching, acclaim, load, slots, tier }:
  { teaching: number; acclaim: number; load: number; slots: number; tier: CourseTier },
): CourseQuality {
  const factors: QualityFactor[] = [{ label: 'Instructor teaching', value: teaching }];

  const loadCost = loadPenalty(load, slots);
  if (loadCost > 0) factors.push({ label: `Teaching load (${load} of ${slots})`, value: -loadCost });

  const tierCost = tierPenalty(tier);
  if (tierCost > 0) {
    const what = tier === 'graduate' ? 'Graduate coursework' : tier === 3 ? 'Capstone tier' : 'Upper tier';
    factors.push({ label: what, value: -tierCost });
  }

  const acclaimGain = acclaimBonus(acclaim);
  if (acclaimGain > 0) factors.push({ label: 'Prize-winning faculty', value: acclaimGain });

  const score = Math.max(0, Math.min(100, factors.reduce((sum, f) => sum + f.value, 0)));
  return { score, grade: gradeFor(score), factors };
}

// Campus facilities are deliberately not an input: the library already
// reaches satisfaction and prestige elsewhere, and a third path would
// double-count it. Every input is a decision about a person.

// A mean course score to prestigeSystem's teaching-quality input, 0..1.
// It is its own input (not a multiplier on curriculum breadth) so teaching
// counts before any program reaches a milestone. 100 is not reachable, so
// this maps the range that occurs: a young school of fresh hires (~40)
// reads near zero, a mature well-staffed one (~80) near one.
const QUALITY_SCORE_FLOOR = 35;   // below this the teaching earns nothing
const QUALITY_SCORE_CEILING = 85; // at this it earns the whole input

export function teachingQualityScore(averageScore: number): number {
  const t = (averageScore - QUALITY_SCORE_FLOOR) / (QUALITY_SCORE_CEILING - QUALITY_SCORE_FLOOR);
  return Math.max(0, Math.min(1, t));
}
