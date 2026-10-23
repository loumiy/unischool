// ---------------------------------------------------------------------
// Curriculum folding (Plan 107C, components/useCollapse.ts): a section
// folds once it is finished, and a player's click is kept until it next
// finishes. A program row starts open only if you can act on it: its next
// course can start, the committee's room aside, or the program is dark
// (Plan 114H, the third review's C2-4). With the chapters on, every row is
// open until A hall of its own.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { useCollapse } from '../src/components/useCollapse';
import { programFoldedByDefault } from '../src/tabs/CurriculumTab';
import { foundGame } from '../sim/harness/game';
import { teachPillars } from './fixtures/teaching';
import { programById, type ProgramInfo } from '../src/data/techData';
import { courseSlotsFree } from '../src/systems/techtree/techSystem';
import type { GameState } from '../src/state/types';

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

// Renders one section and hands back what it read and its toggle.
// `folded` is the section's default; `finished`, when given apart from it,
// is what resets a click (a program row's, Plan 114H).
function read(key: string, folded: boolean, finished = folded): { collapsed: boolean; toggle: () => void } {
  let out: { collapsed: boolean; toggle: () => void } | undefined;
  function Probe() {
    const [collapsed, toggle] = useCollapse(key, folded, finished);
    out = { collapsed, toggle };
    return null;
  }
  renderToStaticMarkup(createElement(Probe));
  return out!;
}

assert(!read('program:a', false).collapsed, 'a program with courses left starts open');
assert(read('program:b', true).collapsed, 'a finished program starts folded');

read('program:c', false).toggle();
assert(read('program:c', false).collapsed, 'a player who folds an unfinished program keeps it folded');

read('program:d', true).toggle();
assert(!read('program:d', true).collapsed, 'a player who opens a finished program keeps it open');

read('program:e', false).toggle();
read('program:e', false).toggle();
assert(!read('program:e', false).collapsed, 'opened again by hand, it stays open while unfinished');
assert(read('program:e', true).collapsed, 'and folds the moment it finishes, the earlier click giving way');
read('program:e', true).toggle();
assert(!read('program:e', true).collapsed, 'reopened after finishing, it stays open');

// A row that folds because its course started keeps your click: only
// finishing gives it way (Plan 114H).
read('program:f', false, false).toggle();
read('program:f', false, false).toggle();
assert(!read('program:f', true, false).collapsed, 'opened by hand, a row stays open when its course starts and nothing else is ready');
assert(read('program:f', true, true).collapsed, 'and folds when it finishes');

// The rows' defaults, on a college teaching its pillars (fixtures/teaching):
// English's next course is open and Dr. Bennett has a slot; Mathematics'
// teacher has none.
const college = () => teachPillars(foundGame({ seed: 12345 }).s);
const ENGL = programById('ENGL')!;
const MATH = programById('MATH')!;
const folded = (s: GameState, p: ProgramInfo, chaptersEarly = false) => programFoldedByDefault(s, p, chaptersEarly);
{
  const s = college();
  assert(!folded(s, ENGL), 'a row whose next course can start begins open');
  assert(folded(s, MATH), 'a row waiting on a teacher begins folded');
  assert(!folded(s, MATH, true), 'with the chapters on, before A hall of its own, every row begins open');
}
{
  const s = college();
  for (const t of s.tech) {
    if (courseSlotsFree(s) === 0) break;
    if (t.kind === 'course' && t.status === 'locked' && !ENGL.courseIds.includes(t.id)) t.status = 'developing';
  }
  assert(courseSlotsFree(s) === 0 && !folded(s, ENGL), 'a full committee folds nothing: a ready row waits only for a seat');
}
{
  const s = college();
  s.finance.cash = 0;
  assert(folded(s, ENGL), 'a row whose next course is out of reach begins folded');
}
{
  const s = college();
  const teacher = s.courseFaculty[MATH.courseIds[0]];
  s.faculty = s.faculty.filter((f) => f.id !== teacher);
  assert(!folded(s, MATH), 'a dark row begins open');
}
{
  const s = college();
  for (const id of ENGL.courseIds) {
    const t = s.tech.find((c) => c.id === id);
    if (t) t.status = 'done';
  }
  assert(folded(s, ENGL), 'a finished row begins folded');
  assert(folded(s, ENGL, true), 'even with every row open in the first chapters');
}

if (failures > 0) {
  console.error(`  ${failures} of ${checks} checks failed`);
  process.exit(1);
}
console.log(`  ✓ all ${checks} checks passed`);
