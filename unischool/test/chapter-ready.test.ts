// ---------------------------------------------------------------------
// An objective opens when it can be done (Plan 124B, X4; it replaces Plan
// 118E's help that said to wait). An objective with a `ready` reading is
// left out of the drawer and the ticker until it holds, and its chapter
// still waits for it; a chapter whose first required objective isn't ready
// waits to open. Three objectives have one: the second course (a program's
// first course taught), the first academic hall (affordable, in cash or
// with a loan), and moving a program into it (the hall standing).
//
// The guard (review III's I7-5a, extended): no chapter opens with a
// required objective the player can't act on that week. Pinned here on
// the three, and over ten years of the guided player in
// test/chapter-pace.test.ts.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { teachingCollege } from './fixtures/teaching';
import { CHAPTERS, currentChapter, leadObjective, objectiveReady, objectiveRows, settleChapters } from '../src/state/chapters';
import { housedPrograms } from '../src/data/openingData';
import { academicHallId, programById } from '../src/data/techData';
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

console.log('chapter ready tests');

const chapter = (id: string) => CHAPTERS.find((c) => c.id === id)!;
const shown = (s: GameState, id: string, objective: string) => objectiveRows(s, chapter(id)).some((r) => r.id === objective);
// The chapter opened, and every required objective it shows can be acted
// on (the guard): met, or ready.
function opensActionable(s: GameState, id: string): boolean {
  const c = chapter(id);
  return c.objectives.filter((o) => !o.optional).every((o) => !shown(s, id, o.id) || objectiveReady(s, o));
}
// A guided record with every main chapter before `id` done.
function upTo(s: GameState, id: string): void {
  const before = CHAPTERS.slice(0, CHAPTERS.findIndex((c) => c.id === id)).filter((c) => !c.side).map((c) => c.id);
  s.guidance = { opened: Object.fromEntries(before.map((c) => [c, 1])), done: Object.fromEntries(before.map((c) => [c, 1])), met: [], marked: [] };
}

// ---- The next course waits for a first course taught ----
{
  const s = teachingCollege('Ready');
  const entries = housedPrograms(s).map((id) => s.tech.find((t) => t.id === programById(id)?.entryCourseId)!).filter(Boolean);
  const later = s.tech.filter((t) => t.kind === 'course' && t.status === 'done' && !entries.includes(t));
  for (const t of [...entries, ...later]) { t.status = 'available'; delete s.developing[t.id]; }
  entries[0].status = 'developing';
  s.developing[entries[0].id] = 4;
  upTo(s, 'next-course');
  settleChapters(s);
  assert(s.guidance!.opened['next-course'] === undefined && currentChapter(s) === null, 'while the first course is written, The next course waits to open');
  assert(!shown(s, 'next-course', 'develop-second-course'), 'and its objective is out of the drawer');

  entries[0].status = 'done';
  delete s.developing[entries[0].id];
  settleChapters(s);
  assert(currentChapter(s)?.id === 'next-course' && shown(s, 'next-course', 'develop-second-course'), 'once it is taught, the chapter opens on it');
  assert(opensActionable(s, 'next-course'), 'and what it shows can be done');
}

// ---- A hall of its own waits for Elm Hall to be affordable ----
{
  const s = teachingCollege('Hall');
  s.clock.year = 2;
  s.clock.week = 30;
  upTo(s, 'hall-of-its-own');
  const elm = s.tech.find((t) => t.id === academicHallId(0))!;
  elm.status = 'available';
  const cash = s.finance.cash;
  // No cash in hand, so no loan either (treasury.ts's loanFor).
  s.finance.cash = 0;
  settleChapters(s);
  assert(s.guidance!.opened['hall-of-its-own'] === undefined, 'with Elm Hall out of reach, A hall of its own waits to open');
  assert(!shown(s, 'hall-of-its-own', 'site-academic-hall'), 'and its objective is out of the drawer');

  s.finance.cash = Math.max(cash, elm.cost);
  settleChapters(s);
  assert(currentChapter(s)?.id === 'hall-of-its-own', 'affordable, it opens');
  assert(shown(s, 'hall-of-its-own', 'site-academic-hall') && opensActionable(s, 'hall-of-its-own'), 'on the hall to place');
  // Moving a program in waits for the hall to stand.
  assert(!shown(s, 'hall-of-its-own', 'move-a-program'), 'moving a program in is out of the drawer while the hall is not built');
  assert(leadObjective(s, chapter('hall-of-its-own'))?.id === 'site-academic-hall', 'the ticker names the hall');

  s.placements[elm.id] = { row: 30, col: 30, w: 2, h: 2 } as GameState['placements'][string];
  elm.status = 'developing';
  s.developing[elm.id] = 12;
  settleChapters(s);
  assert(!shown(s, 'hall-of-its-own', 'move-a-program') && s.guidance!.done['hall-of-its-own'] === undefined, 'going up, the move is still hidden, and the chapter waits for it');
  assert(leadObjective(s, chapter('hall-of-its-own')) === null, 'and the ticker names no objective it cannot act on');

  elm.status = 'done';
  delete s.developing[elm.id];
  settleChapters(s);
  assert(shown(s, 'hall-of-its-own', 'move-a-program'), 'built, moving a program in appears');
  assert(leadObjective(s, chapter('hall-of-its-own'))?.id === 'move-a-program', 'and the ticker names it');
}

// ---- Every objective with a reading for ready is one of the three ----
{
  const readied = CHAPTERS.flatMap((c) => c.objectives.filter((o) => o.ready).map((o) => o.id)).sort();
  assert(JSON.stringify(readied) === JSON.stringify(['develop-second-course', 'move-a-program', 'site-academic-hall']), `three objectives wait to be ready (${readied.join(', ')})`);
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
