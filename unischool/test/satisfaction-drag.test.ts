// ---------------------------------------------------------------------
// Needs out of 100, and what pulls satisfaction down (Plan 104I). S1 read
// a need's "12" as a time of day and, in year two, couldn't tell what
// pulled satisfaction down. Pinned:
//
//   - the Students tab's dials say "/100";
//   - while satisfaction falls, one line names the need whose shortfall
//     weighs most (its weight times what it lacks of 100) and why, in the
//     needs cards' own words, on the tab and in the header's hover;
//   - while it is steady or rising, nothing is said.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { GameState, SatisfactionAttributes } from '../src/state/types';
import { teachingCollege } from './fixtures/teaching';
import {
  ATTRIBUTE_WEIGHTS, DRAG_FLOOR, computeSatisfactionBreakdown, satisfactionDrag, satisfactionTarget, satisfactionWeeklyChange,
} from '../src/systems/satisfaction/satisfactionSystem';
import { NEED_LABELS, dragLine, satisfactionHint } from '../src/data/figureHints';
import { SATISFACTION_TREND } from '../src/components/TrendFigure';
import StudentLifeTab from '../src/tabs/StudentLifeTab';

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('satisfaction drag tests');

const college = () => teachingCollege('Drag');
// The headline set `by` points above its target (falling) or below it.
const moving = (s: GameState, by: number) => { s.students.satisfaction = satisfactionTarget(s) + by; return s; };

assert(DRAG_FLOOR === SATISFACTION_TREND.floor, "'falling' is the header arrow's own floor");

// Falling: the largest weighted shortfall is named.
{
  const s = moving(college(), 10);
  assert(satisfactionWeeklyChange(s) < -DRAG_FLOOR, 'the headline is above its target: falling');
  const drag = satisfactionDrag(s)!;
  const scores = computeSatisfactionBreakdown(s);
  const pulls = (Object.keys(ATTRIBUTE_WEIGHTS) as Array<keyof SatisfactionAttributes>).map((k) => [k, ATTRIBUTE_WEIGHTS[k] * (100 - scores[k])] as const);
  const most = pulls.reduce((a, b) => (b[1] > a[1] ? b : a));
  assert(drag !== null && drag.need === most[0], `it names the need that pulls hardest (${drag?.need}, ${pulls.map(([k, v]) => `${k} ${v.toFixed(0)}`).join(', ')})`);
  const line = dragLine(drag);
  assert(line.startsWith(`${NEED_LABELS[drag.need]} is the drag: `), `in words: "${line}"`);
  const hint = satisfactionHint(s, drag);
  assert(hint.includes('falling') && hint.includes(line), `the header's hover says it too: "${hint}"`);
  const tab = renderToStaticMarkup(createElement(StudentLifeTab, { s, act: () => {} }));
  assert(tab.includes('satisfaction-drag') && tab.includes(line.replace(/'/g, '&#x27;')), "and the Students tab");
}

// Housing short of beds: "320 beds, 480 wanted".
{
  const line = dragLine({ need: 'housing', has: 320, wants: 480 });
  assert(line === 'Housing is the drag: 320 beds, 480 wanted.', `housing's words: "${line}"`);
  assert(dragLine({ need: 'academic', has: 30, wants: 60, library: { has: 20, wants: 40 } }) === 'Academic is the drag: teaching earns 30 of its 60 points, the library 20 of its 40.', "academic's words");
}

// Steady or rising: nothing said.
{
  const steady = moving(college(), 0);
  assert(satisfactionDrag(steady) === null, 'steady: no drag');
  const rising = moving(college(), -10);
  assert(satisfactionDrag(rising) === null, 'rising: no drag');
  assert(!satisfactionHint(rising, satisfactionDrag(rising)).includes('drag'), "and the hover keeps its lowest-need line");
  const tab = renderToStaticMarkup(createElement(StudentLifeTab, { s: rising, act: () => {} }));
  assert(!tab.includes('satisfaction-drag'), 'nor the tab');
}

// The dials say out of 100.
{
  const tab = renderToStaticMarkup(createElement(StudentLifeTab, { s: college(), act: () => {} }));
  assert(tab.includes('satisfaction-dial-of') && tab.includes('/100'), 'the dials say /100');
}

console.log(failures === 0 ? `  ✓ all ${checks} checks passed` : `  ${failures} of ${checks} checks failed`);
process.exit(failures === 0 ? 0 : 1);
