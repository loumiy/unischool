// ---------------------------------------------------------------------
// The legacy (Plan 17's PR B): six graded axes and a name, read off state
// at any moment (src/state/legacy.ts).
//
// What is pinned: that every axis is a 0..1 reading banded by one table;
// that the three axes the standing already grades read the standing's own
// functions, so the legacy cannot disagree with the prestige model about
// breadth, concentration or research; that a founding school reads as a
// school with nothing yet and a saturated one as the university everything
// is measured against; that the names table is total (every pattern of
// grades finds a name) and that its worked examples land where Plan 17
// says they should; and that reading the legacy writes nothing.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { createInitialState } from '../src/state/actions';
import { AXES, LEGACY_GRADE_BANDS, LEGACY_NAMES, gradeOf, legacy, legacyName } from '../src/state/legacy';
import { concentrationScore, curriculumBreadthScore, researchScore } from '../src/systems/prestige/prestigeSystem';
import { graduatePrograms, milestoneSchools } from '../src/data/techData';
import type { GameState, LegacyAxis, LegacyAxisKey, LegacyGrade } from '../src/state/types';

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

const KEYS: LegacyAxisKey[] = ['breadth', 'concentration', 'teaching', 'research', 'reach', 'stewardship'];
const GRADES: LegacyGrade[] = ['A', 'B', 'C', 'D', 'F'];

// Axes hand-built from a grade per key, for the names table.
function axesOf(grades: Partial<Record<LegacyAxisKey, LegacyGrade>>, fill: LegacyGrade = 'C'): LegacyAxis[] {
  const score: Record<LegacyGrade, number> = { A: 0.95, B: 0.75, C: 0.55, D: 0.35, F: 0.1 };
  return KEYS.map((key) => {
    const grade = grades[key] ?? fill;
    return { key, label: key, grade, score: score[grade], detail: '' };
  });
}
const nameFor = (grades: Partial<Record<LegacyAxisKey, LegacyGrade>>, fill?: LegacyGrade) => legacyName(axesOf(grades, fill)).name;

console.log('legacy tests');

// --- the shape ------------------------------------------------------------------
{
  const s = createInitialState('Shape');
  const l = legacy(s);
  assert(l.axes.length === 6 && l.axes.map((a) => a.key).join(',') === KEYS.join(','), 'six axes in a fixed order');
  assert(AXES.map((a) => a.key).join(',') === KEYS.join(','), 'the AXES table is that order');
  assert(l.axes.every((a) => a.score >= 0 && a.score <= 1), 'every score is 0..1');
  assert(l.axes.every((a) => a.grade === gradeOf(a.score)), 'every grade is the band its score falls in');
  assert(l.axes.every((a) => a.detail.length > 0), 'every axis says what it read');
  assert(l.year === 1 && l.name.length > 0, 'a year and a name');
  assert(LEGACY_GRADE_BANDS[0].grade === 'A' && LEGACY_GRADE_BANDS[LEGACY_GRADE_BANDS.length - 1].from === 0, 'the bands run A first and F catches the rest');
  assert(gradeOf(1) === 'A' && gradeOf(0) === 'F' && gradeOf(0.65) === 'B' && gradeOf(0.649) === 'C', 'banding is at-or-above');
  assert(JSON.stringify(JSON.parse(JSON.stringify(l))) === JSON.stringify(l), 'the legacy is plain JSON');
}

// --- a founding school -------------------------------------------------------------
{
  const s = createInitialState('Founding');
  const l = legacy(s);
  const grade = (key: LegacyAxisKey) => l.axes.find((a) => a.key === key)!.grade;
  assert(grade('breadth') === 'F' && grade('concentration') === 'F' && grade('research') === 'F', 'nothing built, nothing founded, nothing researched');
  assert(grade('reach') === 'F', 'no summer has drawn a class');
  assert(l.table === 'troubled', `a school with nothing yet reads from the troubled table ("${l.name}")`);
}

// --- the standing's own readings --------------------------------------------------------
{
  const s = createInitialState('Same');
  s.milestones['school-founded:Engineering'] = true;
  s.milestones['school-distinguished:Engineering'] = true;
  s.milestones['program-established:MECH'] = true;
  s.research.prizes = 3;
  s.research.breakthroughs = 4;
  const l = legacy(s);
  const score = (key: LegacyAxisKey) => l.axes.find((a) => a.key === key)!.score;
  assert(score('breadth') === curriculumBreadthScore(s), 'breadth is curriculumBreadthScore');
  assert(score('concentration') === concentrationScore(s), 'concentration is concentrationScore');
  assert(score('research') === researchScore(s), 'research is researchScore');
  assert(l.axes.find((a) => a.key === 'concentration')!.grade === 'A', 'a school founded and distinguished is an A in concentration');
}

// --- a saturated school -------------------------------------------------------------------
{
  const rich: GameState = createInitialState('Saturated');
  for (const t of rich.tech) if (t.kind === 'course') t.status = 'done';
  const richLegacy = (() => {
    // Breadth and concentration read milestones: set every one.
    for (const school of milestoneSchools()) {
      for (const major of school.majors) {
        rich.milestones[`program-established:${major.prefix}`] = true;
        rich.milestones[`program-distinguished:${major.prefix}`] = true;
      }
      if (school.majors.length > 0) {
        rich.milestones[`school-distinguished:${school.schoolName}`] = true;
        rich.milestones[`school-founded:${school.schoolName}`] = true;
      }
    }
    for (const p of graduatePrograms()) rich.milestones[`grad-program-complete:${p.id}`] = true;
    rich.research.prizes = 10;
    rich.research.breakthroughs = 20;
    rich.finance.endowment = 5_000_000_000;
    rich.students.classes = { freshman: 5_000, sophomore: 5_000, junior: 5_000, senior: 5_000 };
    rich.students.incomingQuality = 90;
    rich.students.admitRate = 0.08;
    rich.students.lastFunnel = {
      year: 49, applicants: 200_000, cohorts: {} as never,
      factors: { prestigePool: 220_000, priceFactor: 1, capacityFactor: 1, wordOfMouth: 1, cohortDemand: 1, stickerShock: 1 },
    };
    for (let y = 1; y <= 49; y += 1) {
      rich.history.push({
        year: y, prestige: 150, rank: 1, enrolled: 20_000, cash: 1e9, coursesDone: 421, programsEstablished: 42,
        satisfaction: 85, net: 0, applicants: 200_000, admitRate: 0.08, incomingQuality: 90, satisfactionAverage: 85,
        coursesFinished: 0, attrition: 0,
      });
    }
    rich.clock.year = 50;
    return legacy(rich);
  })();
  const grade = (key: LegacyAxisKey) => richLegacy.axes.find((a) => a.key === key)!.grade;
  for (const key of ['breadth', 'concentration', 'research', 'reach', 'stewardship'] as LegacyAxisKey[]) {
    assert(grade(key) === 'A', `a saturated school is an A in ${key} (${grade(key)})`);
  }
  // Teaching depends on who teaches what; every course done with no
  // instructor recorded is not being taught, which is the honest reading.
  assert(grade('teaching') === 'F', 'a catalogue with nobody teaching it is not taught well');
}

// --- the names table is total, and its examples land ----------------------------------------
{
  // Every one of the 5^6 patterns finds a name.
  let named = 0;
  const total = 5 ** 6;
  for (let i = 0; i < total; i += 1) {
    let n = i;
    const grades = {} as Record<LegacyAxisKey, LegacyGrade>;
    for (const key of KEYS) { grades[key] = GRADES[n % 5]; n = Math.floor(n / 5); }
    if (legacyName(axesOf(grades)).name.length > 0) named += 1;
  }
  assert(named === total, `every pattern of grades has a name (${named} of ${total})`);
  assert(LEGACY_NAMES[LEGACY_NAMES.length - 1].when({} as never, []), 'the last entry catches everything');
  assert(LEGACY_NAMES.length >= 17, `a dozen and more names (${LEGACY_NAMES.length})`);

  assert(nameFor({}, 'A') === 'the university everything is measured against', 'six As');
  assert(nameFor({ research: 'A', breadth: 'B', teaching: 'B' }, 'C') === 'a great research university', 'research A over a broad, well-taught school');
  assert(nameFor({ teaching: 'A', reach: 'A', concentration: 'A', breadth: 'C', research: 'B', stewardship: 'B' }) === 'the finest college in the country', 'a small, selective, beautifully taught college');
  assert(nameFor({ reach: 'A', breadth: 'B', stewardship: 'B', research: 'C', teaching: 'C', concentration: 'C' }) === 'an engine of the region', 'broad, wanted, solvent, no research');
  assert(nameFor({ stewardship: 'A', teaching: 'A', reach: 'B', breadth: 'C', research: 'C', concentration: 'C' }) === 'a place students never leave', 'happy and well taught');
  assert(nameFor({ breadth: 'B', stewardship: 'D' }, 'C') === 'a school that grew too fast', 'broad and in the red');
  assert(nameFor({}, 'F') === 'a school that never got started', 'six Fs');
  assert(nameFor({}, 'C') === 'a college still finding itself', 'six Cs');
  assert(legacyName(axesOf({ breadth: 'B', teaching: 'B', research: 'B', stewardship: 'B' }, 'C')).table === 'sound', 'four Bs is a sound school');
  assert(legacyName(axesOf({}, 'A')).table === 'great' && legacyName(axesOf({}, 'F')).table === 'troubled', 'the tables follow the grades');
}

// --- reading writes nothing ---------------------------------------------------------------------
{
  const s = createInitialState('Pure');
  const before = JSON.stringify(s);
  legacy(s);
  assert(JSON.stringify(s) === before, 'legacy(s) is a pure reading');
}

console.log(failures === 0 ? `  ✓ all ${checks} checks passed` : `  ${failures} of ${checks} checks failed`);
process.exit(failures === 0 ? 0 : 1);
