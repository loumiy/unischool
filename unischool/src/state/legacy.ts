import type { GameState, Legacy, LegacyAxis, LegacyAxisKey, LegacyGrade } from './types';
import { WEEKS_PER_YEAR, totalEnrolled } from './types';
import { graduatePrograms, milestoneSchools } from '../data/techData';
import { gradeFor, teachingQualityScore } from '../data/courseQuality';
import { courseQuality, facultyLoads } from '../systems/faculty/facultyAssignment';
import {
  RESEARCH_CREDITS_FOR_FULL_SCORE, concentrationScore, curriculumBreadthScore, researchCredits, researchScore,
} from '../systems/prestige/prestigeSystem';
import { isSchoolFounded } from '../systems/techtree/schools';

// ---------------------------------------------------------------------
// THE LEGACY (Plan 17's PR B): what the run adds up to, as six graded
// axes and a name. A pure reading of the state as it stands — the same
// shape as yearInReview.ts: nothing here is a system, nothing is stored
// by this file, and every figure is one the game already keeps. The
// fiftieth summer (PR C) calls this once and writes the result onto
// s.self.legacy, and from then on the record is sealed; until then the
// History tab can show what the run WOULD be called today, the way the
// Standing panel shows what the year is grading toward.
//
// WHY SIX GRADES AND NOT A SCORE. A single number ranks runs, and a
// ranking has one right answer — which is precisely the "build everything"
// the September review found had turned the game into a checklist. Six
// axes let a small selective college and a broad state university both
// finish with something to be proud of and something they gave up, and be
// *called* something for the shape of it. The name is flavour; the six
// grades are the record.
//
// WHAT THE AXES READ. Each is a 0..1 reading built from the same pure
// functions prestigeSystem.ts sums — breadth, concentration and research
// are exactly the standing's inputs — plus three the standing does not
// grade this way: teaching as the campus grade AND the share of courses
// taught well, reach as the greater of how selective the school is and
// how far past its standing it draws, and stewardship as solvency, wealth
// per student and the students' own fifty-year average. Campus life is
// deliberately not an axis (see Plan 17 §B): it cannot yet be earned, and
// an axis every run grades the same is not a record of anything.
//
// THE BANDS are the calibration Plan 17's PR E fits: an A in breadth is
// what the earnest completionist reaches at fifty, a C is what a balanced
// school reaches. They are one table so a re-fit moves one place.
// ---------------------------------------------------------------------

// Score at or above which each grade is earned, best first.
export const LEGACY_GRADE_BANDS: ReadonlyArray<{ grade: LegacyGrade; from: number }> = [
  { grade: 'A', from: 0.85 },
  { grade: 'B', from: 0.65 },
  { grade: 'C', from: 0.45 },
  { grade: 'D', from: 0.25 },
  { grade: 'F', from: 0 },
];

export function gradeOf(score: number): LegacyGrade {
  for (const band of LEGACY_GRADE_BANDS) if (score >= band.from) return band.grade;
  return 'F';
}

// A grade as a number, for "at least a B" comparisons in the names table.
const GRADE_RANK: Record<LegacyGrade, number> = { A: 4, B: 3, C: 2, D: 1, F: 0 };

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

// --- teaching -----------------------------------------------------------
// Half the campus average grade, scored on courseQuality.ts's own floor
// and ceiling; half the share of graded courses at A or B. The second
// half is what tells a school that teaches everything adequately from one
// that teaches most things well: two campuses can average 62 with very
// different rosters.
const TEACHING_AVERAGE_SHARE = 0.5;

function teachingReading(s: GameState): { score: number; detail: string } {
  const loads = facultyLoads(s);
  let sum = 0;
  let n = 0;
  let good = 0;
  for (const t of s.tech) {
    const quality = courseQuality(s, t, loads);
    if (!quality) continue;
    sum += quality.score;
    n += 1;
    const grade = gradeFor(quality.score);
    if (grade === 'A' || grade === 'B') good += 1;
  }
  if (n === 0) return { score: 0, detail: 'No course is being taught.' };
  const average = sum / n;
  const share = good / n;
  const score = TEACHING_AVERAGE_SHARE * teachingQualityScore(average) + (1 - TEACHING_AVERAGE_SHARE) * share;
  return {
    score: clamp01(score),
    detail: `The campus average course grade is ${average.toFixed(0)} of 100; ${Math.round(share * 100)}% of ${n.toLocaleString()} courses are taught to an A or a B.`,
  };
}

// --- selectivity and reach -------------------------------------------------
// The greater of two readings, because the axis is "how much is this school
// wanted", and there are two honest answers: only the best get in, or far
// more apply than its standing alone would draw. A selective college earns
// it one way and a regional engine the other; a school that is neither
// selective nor sought after earns neither.
//
// Selectivity: half the class's average quality, half how far below
// REACH_ADMIT_OPEN the admit rate sits (REACH_ADMIT_SELECTIVE or under
// scores the whole half). Reach: the realised pool against the pool
// prestige alone would draw (lastFunnel.factors.prestigePool), so a cheap,
// well-regarded school drawing most of what its standing could ever draw
// reads high and an expensive one reads low. Null before the first summer.
const REACH_ADMIT_SELECTIVE = 0.10;
const REACH_ADMIT_OPEN = 0.50;
const REACH_POOL_RATIO_FOR_FULL = 0.8;

function reachReading(s: GameState): { score: number; detail: string } {
  const funnel = s.students.lastFunnel;
  if (!funnel) return { score: 0, detail: 'No summer has drawn a class yet.' };
  const quality = clamp01(s.students.incomingQuality / 100);
  const admit = s.students.admitRate;
  const selectivity = 0.5 * quality + 0.5 * clamp01((REACH_ADMIT_OPEN - admit) / (REACH_ADMIT_OPEN - REACH_ADMIT_SELECTIVE));
  const ratio = funnel.factors.prestigePool > 0 ? funnel.applicants / funnel.factors.prestigePool : 0;
  const reach = clamp01(ratio / REACH_POOL_RATIO_FOR_FULL);
  const score = Math.max(selectivity, reach);
  return {
    score,
    detail: `${funnel.applicants.toLocaleString()} applied last summer, ${Math.round(ratio * 100)}% of what prestige alone would draw; `
      + `${Math.round(admit * 100)}% were admitted at an average quality of ${s.students.incomingQuality.toFixed(0)}.`,
  };
}

// --- stewardship -------------------------------------------------------------
// Three readings of equal weight: the share of the run's weeks the account
// closed above zero, the endowment per enrolled student against a
// reference a well-run school reaches by fifty, and the students' own
// average satisfaction across every year on the books, scored on
// welfare's floor and ceiling (40 earns nothing, 80 pays in full).
const STEWARDSHIP_ENDOWMENT_PER_STUDENT_FOR_FULL = 80_000;
const STEWARDSHIP_SATISFACTION_FLOOR = 40;
const STEWARDSHIP_SATISFACTION_FULL = 80;

function stewardshipReading(s: GameState): { score: number; detail: string } {
  const weeks = (s.clock.year - 1) * WEEKS_PER_YEAR + s.clock.week;
  const solvent = weeks > 0 ? clamp01(1 - s.finance.weeksInTheRed / weeks) : 1;
  const enrolled = totalEnrolled(s.students);
  const perStudent = enrolled > 0 ? s.finance.endowment / enrolled : 0;
  const wealth = clamp01(perStudent / STEWARDSHIP_ENDOWMENT_PER_STUDENT_FOR_FULL);
  const years = s.history.length;
  const average = years > 0
    ? s.history.reduce((sum, h) => sum + h.satisfactionAverage, 0) / years
    : s.students.satisfaction;
  const welfare = clamp01((average - STEWARDSHIP_SATISFACTION_FLOOR) / (STEWARDSHIP_SATISFACTION_FULL - STEWARDSHIP_SATISFACTION_FLOOR));
  return {
    score: (solvent + wealth + welfare) / 3,
    detail: `${s.finance.weeksInTheRed === 0 ? 'Never a week in the red' : `${s.finance.weeksInTheRed.toLocaleString()} weeks in the red`}; `
      + `$${Math.round(perStudent).toLocaleString()} of endowment per student; `
      + `students averaged ${average.toFixed(0)} satisfaction over ${years === 0 ? 'the year so far' : `${years} year${years === 1 ? '' : 's'}`}.`,
  };
}

// --- breadth, concentration, research: the standing's own readings ------------

function breadthDetail(s: GameState): string {
  const schools = milestoneSchools();
  const majors = schools.reduce((sum, school) => sum + school.majors.length, 0);
  let established = 0;
  let distinguished = 0;
  for (const school of schools) {
    for (const major of school.majors) {
      if (s.milestones[`program-established:${major.prefix}`]) established += 1;
      if (s.milestones[`program-distinguished:${major.prefix}`]) distinguished += 1;
    }
  }
  const graduate = graduatePrograms().filter((p) => s.milestones[`grad-program-complete:${p.id}`]).length;
  return `${established} of ${majors} programs established, ${distinguished} distinguished; ${graduate} of ${graduatePrograms().length} graduate programs founded.`;
}

function concentrationDetail(s: GameState): string {
  const schools = milestoneSchools().filter((school) => school.majors.length > 0);
  const founded = schools.filter((school) => isSchoolFounded(s, school.schoolName));
  const distinguished = schools.filter((school) => s.milestones[`school-distinguished:${school.schoolName}`]);
  if (founded.length === 0 && distinguished.length === 0) return 'No school was ever founded.';
  return `${founded.length} of ${schools.length} schools founded, ${distinguished.length} distinguished`
    + (founded.length > 0 ? ` — ${founded.map((school) => school.schoolName).join(', ')}.` : '.');
}

interface AxisSpec {
  key: LegacyAxisKey;
  label: string;
  read(s: GameState): { score: number; detail: string };
}

export const AXES: readonly AxisSpec[] = [
  { key: 'breadth', label: 'Academic breadth', read: (s) => ({ score: curriculumBreadthScore(s), detail: breadthDetail(s) }) },
  { key: 'concentration', label: 'Concentration', read: (s) => ({ score: concentrationScore(s), detail: concentrationDetail(s) }) },
  { key: 'teaching', label: 'Teaching', read: teachingReading },
  {
    key: 'research', label: 'Research',
    read: (s) => ({
      score: researchScore(s),
      detail: `${researchCredits(s).toFixed(1)} of ${RESEARCH_CREDITS_FOR_FULL_SCORE} credits — publications, finished projects, breakthroughs, ${s.research.prizes} prize${s.research.prizes === 1 ? '' : 's'} and doctorates.`,
    }),
  },
  { key: 'reach', label: 'Selectivity and reach', read: reachReading },
  { key: 'stewardship', label: 'Stewardship', read: stewardshipReading },
];

// ---------------------------------------------------------------------
// THE NAMES. An authored table keyed on the pattern of grades: each entry
// is a sentence and the shape of run it describes, tested in order, the
// first match wins, and the last three catch everything. `table` says
// which of three families the name belongs to — great, sound or troubled
// — which is what Plan 17's PR E asserts against ("a legacy name from the
// sound table") and what the report's tone follows.
// ---------------------------------------------------------------------
type Grades = Record<LegacyAxisKey, LegacyGrade>;

interface NameEntry {
  name: string;
  table: Legacy['table'];
  when(g: Grades, ranked: LegacyAxisKey[]): boolean;
}

const atLeast = (g: Grades, key: LegacyAxisKey, grade: LegacyGrade) => GRADE_RANK[g[key]] >= GRADE_RANK[grade];
const atMost = (g: Grades, key: LegacyAxisKey, grade: LegacyGrade) => GRADE_RANK[g[key]] <= GRADE_RANK[grade];
const count = (g: Grades, test: (grade: LegacyGrade) => boolean) => (Object.values(g) as LegacyGrade[]).filter(test).length;
const all = (g: Grades, grade: LegacyGrade) => count(g, (x) => GRADE_RANK[x] >= GRADE_RANK[grade]) === 6;

export const LEGACY_NAMES: readonly NameEntry[] = [
  // --- troubled: the runs that went wrong somewhere -------------------------------
  { name: 'a school that grew too fast', table: 'troubled', when: (g) => atLeast(g, 'breadth', 'B') && atMost(g, 'stewardship', 'D') },
  { name: 'a crowded school', table: 'troubled', when: (g) => atLeast(g, 'reach', 'B') && atMost(g, 'stewardship', 'D') },
  { name: 'a school that never got started', table: 'troubled', when: (g) => count(g, (x) => GRADE_RANK[x] <= GRADE_RANK.D) >= 5 },
  { name: 'a college still finding itself', table: 'troubled', when: (g) => count(g, (x) => GRADE_RANK[x] <= GRADE_RANK.C) === 6 },
  // --- great: the runs the game is about --------------------------------------
  { name: 'the university everything is measured against', table: 'great', when: (g) => all(g, 'A') },
  { name: 'a university in full', table: 'great', when: (g) => count(g, (x) => x === 'A') >= 5 && all(g, 'B') },
  { name: 'a great research university', table: 'great', when: (g) => g.research === 'A' && atLeast(g, 'breadth', 'B') && atLeast(g, 'teaching', 'B') },
  { name: 'the finest college in the country', table: 'great', when: (g) => g.teaching === 'A' && g.reach === 'A' && atLeast(g, 'concentration', 'B') && atMost(g, 'breadth', 'C') },
  { name: 'a national university', table: 'great', when: (g) => g.breadth === 'A' && g.concentration === 'A' && atLeast(g, 'research', 'B') },
  { name: 'an engine of the region', table: 'great', when: (g) => g.reach === 'A' && atLeast(g, 'breadth', 'B') && atLeast(g, 'stewardship', 'B') && atMost(g, 'research', 'C') },
  { name: 'a place students never leave', table: 'great', when: (g) => g.stewardship === 'A' && g.teaching === 'A' && atLeast(g, 'reach', 'B') },
  { name: "a specialist's school", table: 'great', when: (g) => g.concentration === 'A' && atLeast(g, 'research', 'B') && atMost(g, 'breadth', 'C') },
  { name: "the country's teaching college", table: 'great', when: (g) => g.teaching === 'A' && atMost(g, 'breadth', 'C') && atMost(g, 'research', 'C') },
  // --- sound: a good school, one way or another --------------------------------
  { name: 'a sound university', table: 'sound', when: (g) => count(g, (x) => GRADE_RANK[x] >= GRADE_RANK.B) >= 4 && atLeast(g, 'stewardship', 'C') && all(g, 'D') },
  { name: 'a well-run college', table: 'sound', when: (g) => g.stewardship === 'A' && all(g, 'C') },
  { name: 'a school known for one thing', table: 'sound', when: (g, ranked) => g[ranked[0]] === 'A' && atMost(g, ranked[1], 'C') },
  { name: 'a research institute with students attached', table: 'sound', when: (g) => g.research === 'A' && atMost(g, 'teaching', 'C') },
  { name: 'a rich school with little to show for it', table: 'sound', when: (g) => g.stewardship === 'A' && atMost(g, 'breadth', 'D') && atMost(g, 'research', 'D') },
  { name: 'a broad school, thinly taught', table: 'sound', when: (g) => atLeast(g, 'breadth', 'B') && atMost(g, 'teaching', 'C') },
  { name: 'a college that punches above its weight', table: 'sound', when: (g) => atLeast(g, 'teaching', 'B') && atLeast(g, 'reach', 'B') && atMost(g, 'breadth', 'C') },
  { name: 'a university of its own kind', table: 'sound', when: () => true },
];

export function legacyName(axes: readonly LegacyAxis[]): { name: string; table: Legacy['table'] } {
  const g = {} as Grades;
  for (const axis of axes) g[axis.key] = axis.grade;
  const ranked = [...axes].sort((a, b) => b.score - a.score).map((a) => a.key);
  const entry = LEGACY_NAMES.find((n) => n.when(g, ranked))!;
  return { name: entry.name, table: entry.table };
}

// The whole reading, at this moment.
export function legacy(s: GameState): Legacy {
  const axes: LegacyAxis[] = AXES.map((spec) => {
    const { score, detail } = spec.read(s);
    const clamped = clamp01(score);
    return { key: spec.key, label: spec.label, score: clamped, grade: gradeOf(clamped), detail };
  });
  const { name, table } = legacyName(axes);
  return { year: s.clock.year, axes, name, table };
}
