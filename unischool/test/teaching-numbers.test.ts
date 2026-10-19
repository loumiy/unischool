// ---------------------------------------------------------------------
// Teaching as a number, not a letter (Plan 104G, the owner's decision of
// 16 October): the hiring mechanics stay and the presentation changes. A
// young college's market is weak by design, and as letters a search of C,
// D and F candidates read as broken (S1). Pinned:
//
//   - every faculty and course surface shows numbers out of 100 and no
//     grade letter: the faculty tile (professor and candidate) and its
//     person page's Train, the market's cards, the Curriculum's rows, cells
//     and drawer, the hall's program tile, the Faculty tab;
//   - a candidate's tile and card show the college's own median beside
//     their teaching, warm only when they would raise it;
//   - the training and career words, and the staffing seat's moves, say
//     numbers; the bands stay underneath (the grade a course carries).
//
// The sim baseline is unchanged: this is words and chips only (checked
// with `npm run sim`, recorded in the plan).
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { GameState } from '../src/state/types';
import { readSave } from '../src/state/persistence';
import { teachPillars } from './fixtures/teaching';
import { foundGame } from '../sim/harness/game';
import FacultyTile, { FacultyActions } from '../src/tabs/FacultyTile';
import FacultyTab from '../src/tabs/FacultyTab';
import CurriculumTab, { CourseCell, InstructorOption, MarketInField, RowAction, qualityGap } from '../src/tabs/CurriculumTab';
import { ProgramTile } from '../src/components/BuildingInfoPanel';
import { setCurriculumView } from '../src/tabs/curriculumView';
import { facultyMedian } from '../src/tabs/facultySort';
import { programById } from '../src/data/techData';
import { programProgress } from '../src/systems/techtree/programProgress';
import { facultyLoads, instructorQuality, projectedQuality } from '../src/systems/faculty/facultyAssignment';
import { qualityOf } from '../src/data/courseQuality';
import { TRAINING_WORDS } from '../src/data/trainingData';
import { CAREER_WORDS } from '../src/data/careerWords';
import { SEATS } from '../src/data/seatData';

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('teaching numbers tests');

const act = () => {};
const launch = (): GameState => {
  const read = readSave(readFileSync(join(process.cwd(), 'test/fixtures/save-launch.json'), 'utf8'));
  if ('refused' in read) throw new Error(read.refused);
  return read.state;
};
// A grade letter on screen: GradeMark's label, the old meter's letter, or a
// chip's letter in a band's class.
const LETTER = /aria-label="grade [A-F]"|faculty-stat-letter|grade-[a-f]">[A-F]</;
const scores = (html: string) => [...html.matchAll(/aria-label="(\d+) out of 100"/g)].map((m) => Number(m[1]));
function numbersOnly(html: string, what: string, expectScore = true): void {
  assert(!LETTER.test(html), `${what}: no grade letter (${LETTER.exec(html)?.[0] ?? ''})`);
  if (expectScore) assert(scores(html).length > 0 || /Teaching \d+ out of 100/.test(html), `${what}: numbers out of 100`);
}

// ---- The faculty tile: professors, candidates, the person page ----
{
  const s = launch();
  for (const f of s.faculty.slice(0, 6)) {
    const html = renderToStaticMarkup(createElement(FacultyTile, { s, act, f, isCandidate: false }));
    numbersOnly(html, `${f.name}'s tile`);
    assert(html.includes(`aria-label="Teaching ${f.teaching} out of 100"`), `${f.name}'s teaching reads ${f.teaching}`);
    if (f.teachingPotential > f.teaching) assert(html.includes(`→ ${f.teachingPotential}`), `and where it is heading, → ${f.teachingPotential}`);
    assert(!html.includes('median'), 'a professor is not set against the median');
    numbersOnly(renderToStaticMarkup(createElement(FacultyActions, { s, act, f })), `${f.name}'s person page`, false);
  }
  const median = facultyMedian(s.faculty)!;
  assert(median !== null, `the launch college has a median teaching (${median})`);
  const above = s.candidates.find((c) => c.teaching > median);
  const below = s.candidates.find((c) => c.teaching <= median);
  for (const c of [above, below]) {
    if (!c) continue;
    const html = renderToStaticMarkup(createElement(FacultyTile, { s, act, f: c, isCandidate: true }));
    numbersOnly(html, `candidate ${c.name}'s tile`);
    assert(html.includes(`your faculty’s median is ${median}`), `${c.name} (${c.teaching}): the college's median beside the teaching`);
    assert(html.includes('above-median') === (c.teaching > median), `${c.name}: warm only above it`);
    assert(html.includes('--stat-grade:var(--warm-ink)') || html.includes('--stat-grade:var(--ink-muted)'), `${c.name}: in no band's ink`);
  }
  assert(above !== undefined || below !== undefined, 'the market lists somebody');
}

// ---- The market's cards, the picker ----
{
  const s = teachPillars(foundGame({ seed: 12345 }).s);
  const field = s.candidates[0]?.field;
  const course = s.tech.find((t) => t.requiresFaculty === field && t.status === 'available');
  if (field) {
    const html = renderToStaticMarkup(createElement(MarketInField, { s, act, field, projectedFor: course }));
    numbersOnly(html, `the ${field} market`, course !== undefined);
    assert(html.includes(`your faculty’s median is ${facultyMedian(s.faculty)}`), 'its cards set the candidate against the median');
  }
  const f = s.faculty[0];
  const t = s.tech.find((x) => x.requiresFaculty === f.field && x.status === 'available')!;
  numbersOnly(renderToStaticMarkup(createElement(InstructorOption, { s, f, selected: false, projectedFor: t })), 'the instructor picker');
}

// ---- The Curriculum: rows, cells, the drawer; the hall's tile ----
{
  const s = teachPillars(foundGame({ seed: 12345 }).s);
  numbersOnly(renderToStaticMarkup(createElement(CurriculumTab, { s, act })), 'the Curriculum tab');
  // The rows, kept as the tab's second view (Plan 105, decision 1).
  setCurriculumView('list');
  numbersOnly(renderToStaticMarkup(createElement(CurriculumTab, { s, act })), "the Curriculum tab's list");
  setCurriculumView('drawing');
  const taught = s.tech.find((t) => t.status === 'done' && s.courseFaculty[t.id])!;
  const cell = renderToStaticMarkup(createElement(CourseCell, { s, t: taught, selected: false, onSelect: () => {} }));
  const q = instructorQuality(s, taught)!;
  assert(!LETTER.test(cell) && cell.includes(`>${Math.round(q.score)}<`), `a taught course's cell shows its number (${Math.round(q.score)})`);
  const english = programById('ENGL')!;
  const lookup = new Map(s.tech.map((t) => [t.id, t]));
  const row = renderToStaticMarkup(createElement(RowAction, {
    s, act, program: english, progress: programProgress(s, english, lookup), lookup, loads: facultyLoads(s), onSelect: () => {},
  }));
  numbersOnly(row, "the row's next start");
  numbersOnly(renderToStaticMarkup(createElement(ProgramTile, { program: english, s, act, open: true, onToggle: () => {} })), "the hall's program tile");
  numbersOnly(renderToStaticMarkup(createElement(FacultyTab, { s, act })), 'the Faculty tab');
}

// ---- A course and its teacher never seem to disagree ----
{
  const s = teachPillars(foundGame({ seed: 12345 }).s);
  const iyer = s.faculty.find((f) => f.field === 'Mathematics')!;
  const upper = s.tech.find((t) => t.id === 'MATH120')!;
  const q = projectedQuality(upper, iyer);
  assert(q.score === iyer.teaching - 2 && qualityGap(q) === '−2, upper-level', `Iyer ${iyer.teaching}; an upper-level course ${q.score}, "${qualityGap(q)}"`);
  assert(qualityGap(qualityOf({ teaching: 60, acclaim: 0, tier: 1 })) === '', 'an intro course: no gap to say');
}

// ---- Words: training, the career, the staffing seat ----
{
  const words = [
    TRAINING_WORDS.trainTitle(58, 76, 'the spring'), TRAINING_WORDS.trained('Dr. A', 58, 76, ''), TRAINING_WORDS.whyNot.topGrade,
    CAREER_WORDS.trained(4, 58, 76),
  ];
  for (const w of words) assert(!/\([A-F]\)|\b[A-F] to [A-F]\b|an A\b/.test(w), `no letter: "${w}"`);
  assert(TRAINING_WORDS.trained('Dr. A', 58, 76, '').includes('58 → 76'), 'a training reads "58 → 76"');
  const staffing = SEATS.flatMap((seat) => seat.policies).filter((p) => p.staffs);
  assert(staffing.length > 0 && staffing.every((p) => p.label === 'Staff the weakest courses first' && !/below A|for the A|letter/.test(p.note ?? '')), 'the staffing policy is named without a letter');
}

console.log(failures === 0 ? `  ✓ all ${checks} checks passed` : `  ${failures} of ${checks} checks failed`);
process.exit(failures === 0 ? 0 : 1);
