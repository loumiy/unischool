import { discoverySchools, graduateCourseIds, graduatePrograms } from './techData';

// =====================================================================
// COURSE QUALITY — the A-F grade every developed course carries.
//
// This module is the TUNING and the MATH, and nothing else: every function
// here takes plain numbers, so the whole scale can be read, reasoned about
// and re-balanced in one place without a GameState in sight. The state
// wiring — who actually teaches a course, and how loaded they are — lives
// in systems/faculty/facultyAssignment.ts, which already owns the pairing
// (see types.ts's CourseFaculty).
//
// DERIVED, NEVER STORED. Teaching, research and salary are recomputed from
// potential + tenure on every tick (facultySystem.ts's growFaculty), which
// is exactly why a research prize needed `acclaim` as its own field — a
// stored bump would be erased the following week. Quality goes the other
// way: it is computed on read, from the assignment plus the instructor's
// CURRENT stats. Nothing to persist, nothing to migrate, nothing to drift.
//
// And it means a course quietly gets better while nobody is looking at it:
// the professor you appointed in year 3 keeps maturing, so the course they
// teach climbs with them. That is the retention payoff made visible, and
// it falls out of the derivation for free rather than needing a system.
// =====================================================================

export type Grade = 'A' | 'B' | 'C' | 'D' | 'F';

// The bands. Deliberately NOT facultyData.ts's QUALITY_TIER_THRESHOLDS
// (85/70/55/35): "this professor is Distinguished" and "this course is an
// A" are different claims about different things, and one shared ladder
// would couple two scales that want tuning apart.
//
// WHY THESE NUMBERS, which is not where you would guess. facultyData.ts's
// grownStat starts a hire at 55% of their potential, and potential itself
// caps at 100 — so a brand-new hire's teaching is capped at 55, whoever
// they are. No fresh appointment can open a course above C under ANY
// banding. Early in a run, with one eligible person per field, the grade
// therefore reads TENURE rather than the player's choice; choice only
// starts to matter once there is a bench to choose from. That is the same
// shape the prestige model already has (retention is the lever), so it is
// intended — but it means these numbers are not really a decision about
// where A sits. They are a decision about two things:
//
//   1. HOW OFTEN A NEW DEPARTMENT'S FIRST COURSE READS F. At these bands,
//      about one fresh hire in seven. Strict bands (82/68/52/36) put it at
//      one in three, which makes expanding the curriculum — the thing the
//      game is asking the player to do — read as failing at it.
//   2. HEADROOM FOR THE PENALTIES BELOW, which only ever push down. At
//      these bands a matured instructor (teaching ~71) drops a grade when
//      carrying a full load on a tier-3 course. At strict bands that same
//      professor reads B either way, so overloading someone would be
//      invisible across the middle of the range, where most courses live.
//
// The upshot to preserve through any retune: D on a NEW department's
// course is the system working, D on a VETERAN's course means the player
// overloaded them. Those must stay distinguishable.
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

// --- LOAD. What a full plate costs the courses on it. -----------------
//
// The penalty scales with how close the instructor is to their OWN
// ceiling, not with whether they have passed it — passing it is
// impossible through play (canStartDevelopment refuses it, and a hire
// never sheds a slot). A rule that only fired on an impossible state would
// be no rule at all.
//
// So: somebody teaching one course teaches it at full strength, and every
// further course they take on costs all of their courses a little. That is
// what makes "hire more" and "hire better" genuinely different answers
// rather than the same number twice, and it is the moment-to-moment
// version of the whole feature's question — is this professor's next
// course worth what it does to their others?
// 12 -> 7. At 12 a full load was reliably a whole letter grade against
// bands 16-18 points wide, and an over-full one (the migration-only case
// below) nearly two — so a professor's second and third course read as a
// punishment for expanding the catalogue rather than as a price paid for
// it. The playtest calls that a cliff; this is the same rule as a cost.
//
// It lands here rather than in Phase 2 because it and the research
// commitment push the same number in the same direction: cutting a
// commitment to two slots (techSystem.ts's RESEARCH_COMMITMENT_SLOTS)
// leaves more professors carrying a partial load alongside a project, so
// the load penalty now fires more often than it used to.
//
// WHAT THE RETUNE PRESERVES, checked at the new value rather than assumed:
// a matured instructor (teaching ~71) on a tier-3 course still drops a
// visible grade when carrying a full load — 66 (B) to 59 (C) — so
// overloading somebody is still legible in the middle of the range where
// most courses live. What changes is the depth of the drop, not whether it
// happens: the window of teaching scores that changes band at a full load
// narrows from 12 points to 7 at each boundary. The invariant above still
// holds, and holds harder: D on a veteran's course still means the player
// overloaded them, it just takes more overloading to get there.
const LOAD_PENALTY_MAX = 7;
// An over-ceiling load (migration only) keeps scaling past the max rather
// than clamping at it, up to this multiple — an over-stretched department
// should read worse than a merely full one.
const LOAD_PENALTY_OVERRUN_CAP = 1.5;

export function loadPenalty(load: number, slots: number): number {
  if (slots <= 1 || load <= 1) return 0;
  const fraction = (load - 1) / (slots - 1);
  return LOAD_PENALTY_MAX * Math.min(fraction, LOAD_PENALTY_OVERRUN_CAP);
}

// --- TIER. Harder material needs a stronger teacher. ------------------
//
// A capstone and an intro survey are not the same job, so the same
// professor does not deserve the same grade for both. This is what turns
// assignment from a RANKING problem ("who is best") into a MATCHING one
// ("who is right for this"), and it gives a senior hire a natural home:
// put your star on the tier-3 seminar, not on the entry survey, because
// that is where their strength actually shows up in the grade.
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

// Course id -> tier, built once from the SEED rather than parsed off the
// course code: the seed already knows which number is which tier
// (techData.ts's NUMS/TIERS), so it is asked rather than guessed, and the
// map cannot drift from the catalogue it is derived from.
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

// --- ACCLAIM. A laureate's teaching benefits from it too. -------------
// Small, and capped: this is the one place the research loop reaches
// back into the teaching loop, and it should be a nod rather than a
// second career's worth of grade.
const ACCLAIM_BONUS_PER_PRIZE = 3;
const ACCLAIM_BONUS_MAX = 6;

export function acclaimBonus(acclaim: number): number {
  return Math.min(acclaim * ACCLAIM_BONUS_PER_PRIZE, ACCLAIM_BONUS_MAX);
}

// One itemized reason a course scores what it does. Signed: the base is
// positive, penalties are negative. The drawer renders these verbatim,
// because a grade the player cannot decompose is a grade they cannot act
// on — "C" tells them nothing, "teaching 66, −9 for a full load, −5 for a
// capstone" tells them to move a course off that professor.
export interface QualityFactor {
  label: string;
  value: number;
}

export interface CourseQuality {
  score: number;
  grade: Grade;
  factors: QualityFactor[];
}

// The whole scale, on plain numbers. `slots` and `load` are the
// instructor's own ceiling and current course count (the course being
// graded included).
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

// NOTE ON WHAT IS DELIBERATELY *NOT* AN INPUT: campus facilities.
//
// The plan originally carried a small library/buildings term here. It is
// left out, and the reason is a double-count that would otherwise be
// invisible. The library ALREADY reaches academic satisfaction through the
// seats-per-student ratio (satisfactionSystem.ts's academicLibraryRatio)
// and ALREADY reaches prestige as a multiplier on the curriculum-breadth
// term (prestigeSystem.ts's libraryAdequacyScore). Feeding it a third time
// through course quality — which now multiplies that same breadth term —
// would let one building move the dominant prestige input three ways at
// once, compounding in a way no one reading any single formula could see.
//
// Every input above is instead something the player decides about a
// PERSON: who teaches it, how much else they carry, what they have won.
// That keeps the grade answerable — every factor in the breakdown names an
// action — and keeps buildings paying off once each, where they already do.

// =====================================================================
// FROM A MEAN GRADE TO A PRESTIGE SCORE.
//
// How good the teaching a university delivers is, 0..1, for
// prestigeSystem's standalone teaching-quality input.
//
// IT IS AN INPUT RATHER THAN A MULTIPLIER, and that is a correction. It
// began as a multiplier on the curriculum-breadth term — how much
// curriculum exists, scaled by how good it is — which reads sensibly and
// had two problems. It stacked on the library multiplier already on that
// line, so two factors compounded on the single largest term. And
// breadth is MILESTONE-gated: it only moves when a program is established
// or distinguished, so a school teaching twenty courses beautifully in its
// first decade got nothing for them. Teaching had no path to prestige at
// all until a whole program completed.
//
// As its own input it is earned the moment there are courses to teach
// well, which is what the retired faculty-quality input used to provide —
// except earned through teaching actually delivered rather than through
// who happens to be on the payroll.
//
// 100 IS NOT REACHABLE (see the band note above: a fresh hire is capped at
// 55 before any penalty, and a course scores 100 only with a maxed
// professor carrying no load on a tier-1 course), so this maps the range
// that actually occurs rather than dividing by 100. A young school of
// fresh hires averages around 40 and reads near zero; a mature,
// well-matched, well-staffed one averages around 80 and reads near one.
const QUALITY_SCORE_FLOOR = 35;   // below this the teaching earns nothing
const QUALITY_SCORE_CEILING = 85; // at this it earns the whole input

export function teachingQualityScore(averageScore: number): number {
  const t = (averageScore - QUALITY_SCORE_FLOOR) / (QUALITY_SCORE_CEILING - QUALITY_SCORE_FLOOR);
  return Math.max(0, Math.min(1, t));
}
