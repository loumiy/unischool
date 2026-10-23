// ---------------------------------------------------------------------
// The hall's Develop button (Plan 104A): a program tile's summary in a
// hall starts its next course with the Curriculum row's own one-click
// action (CurriculumTab.tsx's RowAction), so the two offer and refuse
// the same thing. What is worth pinning:
//
//   - the summary of a program with an available course and a free
//     teacher carries the Develop button, above Open in Curriculum;
//   - its click dispatches the same START_DEVELOPMENT as the Curriculum
//     row's;
//   - it is disabled with the row's reasons (money short, committee
//     full), and a course no one can teach says so with Appoint… or
//     Open…, which opens the Curriculum on that course.
//
// The tile and the row are called as functions (neither uses a hook) so
// their buttons' handlers can be pressed without a DOM.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { createElement, isValidElement, type ReactElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Action } from '../src/state/actions';
import type { GameState } from '../src/state/types';
import { foundGame } from '../sim/harness/game';
import { teachPillars } from './fixtures/teaching';
import { ProgramTile } from '../src/components/BuildingInfoPanel';
import { RowAction } from '../src/tabs/CurriculumTab';
import { programById, type ProgramInfo } from '../src/data/techData';
import { programProgress, programStanding } from '../src/systems/techtree/programProgress';
import { facultyLoads } from '../src/systems/faculty/facultyAssignment';
import { courseSlotsFree } from '../src/systems/techtree/techSystem';

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('hall develop tests');

type Props = Record<string, unknown> & { children?: ReactNode };
function findAll(node: ReactNode, pred: (e: ReactElement<Props>) => boolean, out: ReactElement<Props>[] = []): ReactElement<Props>[] {
  if (Array.isArray(node)) {
    for (const n of node) findAll(n, pred, out);
    return out;
  }
  if (!isValidElement<Props>(node)) return out;
  if (pred(node)) out.push(node);
  findAll(node.props.children, pred, out);
  return out;
}
const classed = (cls: string) => (e: ReactElement<Props>) => typeof e.props.className === 'string' && e.props.className.split(' ').includes(cls);

// The hall's summary, open, with what its buttons dispatch and open.
function hall(s: GameState, program: ProgramInfo) {
  const acted: Action[] = [];
  const opened: string[] = [];
  const props = { program, s, act: (a: Action) => acted.push(a), open: true, onToggle: () => {}, onOpenCurriculum: (k: string) => opened.push(k) };
  const rows = findAll(ProgramTile(props), (e) => e.type === RowAction);
  const row = rows.length === 1 ? RowAction(rows[0].props as Parameters<typeof RowAction>[0]) : null;
  const html = renderToStaticMarkup(createElement(ProgramTile, props));
  return { acted, opened, rows, row, html };
}
// The Curriculum's folded row, built as the tab builds it.
function curriculum(s: GameState, program: ProgramInfo) {
  const acted: Action[] = [];
  const lookup = new Map(s.tech.map((t) => [t.id, t]));
  const row = RowAction({
    s, act: (a) => acted.push(a), program, progress: programProgress(s, program, lookup), lookup, loads: facultyLoads(s), onSelect: () => {}, compact: true,
  });
  return { acted, row };
}
const develop = (row: ReactNode) => findAll(row, classed('row-action-develop'))[0];
const secondary = (row: ReactNode) => findAll(row, classed('row-action-secondary'))[0];

const college = () => teachPillars(foundGame({ seed: 12345 }).s);
const ENGL = programById('ENGL')!;
const MATH = programById('MATH')!;

// English: ENGL120 is open and Dr. Bennett has a slot.
{
  const s = college();
  const h = hall(s, ENGL);
  const c = curriculum(s, ENGL);
  assert(h.rows.length === 1, 'the summary holds one RowAction');
  assert(h.rows[0]?.props.compact === true, "in the row's compact form");
  const hb = develop(h.row);
  const cb = develop(c.row);
  assert(hb !== undefined, 'the hall offers Develop for a program with an open course and a free teacher');
  assert(hb?.props.disabled === false, 'enabled');
  assert(hb?.props.title === cb?.props.title, `with the Curriculum's words (${String(hb?.props.title)})`);
  (hb?.props.onClick as () => void)?.();
  (cb?.props.onClick as () => void)?.();
  assert(h.acted.length === 1 && h.acted[0].type === 'START_DEVELOPMENT', 'its click starts a course');
  assert(JSON.stringify(h.acted) === JSON.stringify(c.acted), `the same START_DEVELOPMENT as the Curriculum row (${JSON.stringify(h.acted)})`);
  const at = (needle: string) => h.html.indexOf(needle);
  assert(at('row-action-develop') >= 0 && at('Open in Curriculum') > at('row-action-develop'), 'above Open in Curriculum');
  assert(!h.html.includes('row-action-worth'), 'without the milestone, which the summary states');
  assert(!h.html.includes('Choose…'), "without the Curriculum's Choose…");
}

// Money short: disabled, with the row's reason.
{
  const s = college();
  s.finance.cash = 0;
  const hb = develop(hall(s, ENGL).row);
  const cb = develop(curriculum(s, ENGL).row);
  assert(hb?.props.disabled === true, 'disabled with no money');
  assert(String(hb?.props.title).includes('short of the development cost') && hb?.props.title === cb?.props.title, `saying how short, as the row does (${String(hb?.props.title)})`);
}

// The committee full: disabled, with the row's reason.
{
  const s = college();
  for (const t of s.tech) {
    if (courseSlotsFree(s) === 0) break;
    if (t.kind === 'course' && t.status === 'locked' && !ENGL.courseIds.includes(t.id)) t.status = 'developing';
  }
  const hb = develop(hall(s, ENGL).row);
  assert(courseSlotsFree(s) === 0 && hb?.props.disabled === true, 'disabled with the committee full');
  assert(hb?.props.title === 'The committee is full', `saying so (${String(hb?.props.title)})`);
}

// Mathematics: Dr. Iyer's slots are full, so no one can teach MATH120.
{
  const s = college();
  const h = hall(s, MATH);
  assert(develop(h.row) === undefined, 'no Develop when no one can teach the next course');
  assert(h.html.includes('needs Mathematics faculty'), 'it says who is needed');
  const b = secondary(h.row);
  assert(b !== undefined && /Appoint…|Open…/.test(renderToStaticMarkup(b)), 'with Appoint… or Open…');
  (b?.props.onClick as () => void)?.();
  assert(h.opened.length === 1 && h.opened[0] === `course:${programProgress(s, MATH).next?.id}`, `which opens the Curriculum on that course (${h.opened.join(', ')})`);
}

// Every course in hand: nothing to start, said in words.
{
  const s = college();
  for (const id of ENGL.courseIds) s.tech.find((t) => t.id === id)!.status = 'done';
  const h = hall(s, ENGL);
  assert(develop(h.row) === undefined && h.html.includes('Every course is developed.'), 'a finished program says so');
}

// The ring on a program's pip over its hall (Plan 112D): none, then silver
// when the program is Established, then gold when it is Distinguished.
{
  const s = college();
  assert(programStanding(s, ENGL.id) === null, 'a new program wears no ring');
  s.milestones[`program-established:${ENGL.id}`] = true;
  assert(programStanding(s, ENGL.id) === 'established', 'an Established program is ringed silver');
  s.milestones[`program-distinguished:${ENGL.id}`] = true;
  assert(programStanding(s, ENGL.id) === 'distinguished', 'and a Distinguished one gold');
}

console.log(failures === 0 ? `  ✓ all ${checks} checks passed` : `  ${failures} of ${checks} checks failed`);
process.exit(failures === 0 ? 0 : 1);
