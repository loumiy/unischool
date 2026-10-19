// ---------------------------------------------------------------------
// The Faculty tab's Table and Plot layouts (FacultyTable.tsx,
// FacultyPlot.tsx). What is worth pinning:
//
//   - the table draws a row a person, in the order it is given, with
//     Appoint on a candidate's row and never on a professor's, and the
//     sorted column marked for a screen reader;
//   - the plot draws a dot a person, the market beside the faculty, the
//     faculty's two medians across it, and a card for nobody until a dot
//     is picked;
//   - teachingRank ranks somebody in their department, a candidate as if
//     appointed, and facultyMedian reads research as it reads teaching.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Faculty, GameState } from '../src/state/types';
import { readSave } from '../src/state/persistence';
import { GRADE_A, GRADE_D } from '../src/data/courseQuality';
import { GRADE_LINES, compareFaculty, facultyMedian, teachingRank } from '../src/tabs/facultySort';
import FacultyTable from '../src/tabs/FacultyTable';
import FacultyPlot from '../src/tabs/FacultyPlot';

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('faculty layouts tests');

function launch(): GameState {
  const read = readSave(readFileSync(join(process.cwd(), 'test/fixtures/save-launch.json'), 'utf8'));
  if ('refused' in read) throw new Error(`the launch fixture is refused: ${read.refused}`);
  return read.state;
}
const act = () => {};
const count = (html: string, needle: string) => html.split(needle).length - 1;
// Dots on the plot, not the key's samples: only a plotted dot is placed.
const dots = (html: string, kind: string) => (html.match(new RegExp(`class="faculty-dot ${kind}[^"]*" style=`, 'g')) ?? []).length;
const none = new Map();

// ---- The helpers ----
{
  const s = launch();
  assert(s.faculty.length > 0 && s.candidates.length > 0, 'the fixture has a faculty and a market');
  const best = [...s.faculty].sort(compareFaculty('teaching'))[0];
  const inField = s.faculty.filter((f) => f.field === best.field);
  const top = teachingRank(best, s.faculty);
  assert(top.rank === 1 && top.of === inField.length, `the best teacher ranks first of their department (${top.rank} of ${top.of})`);
  const c = s.candidates[0];
  const asIf = teachingRank(c, s.faculty);
  assert(asIf.of === s.faculty.filter((f) => f.field === c.field).length + 1, 'a candidate is ranked among the department as if appointed');

  const people = [10, 20, 30, 40, 50].map((r, i) => ({ ...s.faculty[0], id: `x${i}`, research: r, teaching: 100 - r })) as Faculty[];
  assert(facultyMedian(people, 'research') === 30, 'the research median is the middle research');
  assert(facultyMedian(people) === 70, 'and the default is still teaching');
  assert(GRADE_LINES[0].value === GRADE_D && GRADE_LINES[GRADE_LINES.length - 1].value === GRADE_A, 'the plot\'s lines run D to A, on the course grades');
}

// ---- The table ----
{
  const s = launch();
  const people = [...s.faculty].sort(compareFaculty('teaching'));
  const html = renderToStaticMarkup(createElement(FacultyTable, {
    s, act, people, isCandidate: false, sort: 'teaching', setSort: () => {}, commitments: none, loads: none,
  }));
  assert(count(html, 'data-faculty=') === people.length, `a row a professor (${count(html, 'data-faculty=')} of ${people.length})`);
  assert(html.indexOf(people[0].name) < html.indexOf(people[people.length - 1].name), 'in the order given');
  assert(!html.includes('>Appoint<'), 'no Appoint on the faculty');
  assert(count(html, 'aria-sort="descending"') === 1, 'the sorted column is marked, once');
  assert(!html.includes('Dismiss'), 'Dismiss waits on the opened row');

  const market = renderToStaticMarkup(createElement(FacultyTable, {
    s, act, people: s.candidates, isCandidate: true, sort: 'teaching', setSort: () => {}, commitments: none, loads: none,
  }));
  assert(count(market, '>Appoint<') === s.candidates.length, 'Appoint on every candidate\'s row');
  assert(market.includes('Asks') && market.includes('Listing'), 'the market\'s columns say what they hold');
}

// ---- The plot ----
{
  const s = launch();
  const html = renderToStaticMarkup(createElement(FacultyPlot, {
    s, act, people: s.faculty, isCandidate: false, scope: null, commitments: none, loads: none,
  }));
  assert(dots(html, 'prof') + dots(html, 'retiring') === s.faculty.length, 'a dot a professor');
  assert(dots(html, 'cand') === s.candidates.length, 'and a ring a candidate, the market shown beside them');
  assert(count(html, 'faculty-plot-median ') === 2, 'the two medians across the plot');
  assert(html.includes('faculty-plot-card empty'), 'no card until a dot is picked');

  const field = s.faculty[0].field;
  const scoped = renderToStaticMarkup(createElement(FacultyPlot, {
    s, act, people: s.faculty.filter((f) => f.field === field), isCandidate: false, scope: field, commitments: none, loads: none,
  }));
  assert(dots(scoped, 'cand') === s.candidates.filter((f) => f.field === field).length, 'narrowed to a field, the market is narrowed with it');
}

console.log(`  ${checks} checks, ${failures} failed`);
if (failures > 0) process.exit(1);
