// ---------------------------------------------------------------------
// The semicentennial (Plan 17's PR C, Plan 33's PR G and H): the fiftieth
// summer's first beat is the Final Report, which is written once at that
// summer's boundary, and play continues into the Epilogue.
//
// What is pinned: that the summer raised on year fifty carries the `final`
// flag and only then; that its first beat is a page while every other
// summer's is wide; that RESOLVE_ADMISSIONS at year fifty writes s.ending
// exactly once, as the report the beat showed, and logs it; that the
// fifty-first summer is an ordinary one and cannot rewrite it; that every
// tenth summer after writes an addendum; that the snapshot carries the
// graduating class and the founder's figures sum it; and that the written
// report survives a save.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { createInitialState } from '../src/state/actions';
import { reducer } from '../src/engine/reducer';
import { defaultAnswer } from '../src/engine/defaultAnswers';
import { modalWidth } from '../src/components/modalLayout';
import { finalReport, founderFigures } from '../src/state/finalReport';
import { loadGame, saveGame, clearSave } from '../src/state/persistence';
import { appointFaculty } from '../src/systems/faculty/facultySystem';
import type { GameState, SummerPayload } from '../src/state/types';
import { SEMICENTENNIAL_YEAR, WEEKS_PER_YEAR, totalEnrolled } from '../src/state/types';

const store = new Map<string, string>();
(globalThis as unknown as { localStorage: unknown }).localStorage = {
  getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
  setItem: (k: string, v: string) => { store.set(k, String(v)); },
  removeItem: (k: string) => { store.delete(k); },
  clear: () => { store.clear(); },
};

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

const payloadOf = (s: GameState) => s.pendingInterrupt?.payload as SummerPayload;

// Ticks to the next summer, answering anything else with the shared defaults.
function toSummer(start: GameState): GameState {
  let s = start;
  for (let i = 0; i < WEEKS_PER_YEAR * 2; i += 1) {
    if (s.pendingInterrupt?.type === 'summer') return s;
    const answer = defaultAnswer(s);
    s = answer ? reducer(s, answer) : reducer(s, { type: 'TICK' });
  }
  throw new Error('no summer inside two years');
}

// Walks the four beats with the defaults and returns the state in the new year.
function throughSummer(start: GameState): GameState {
  let s = start;
  for (let i = 0; i < 4 && s.pendingInterrupt?.type === 'summer'; i += 1) s = reducer(s, defaultAnswer(s)!);
  return s;
}

// A school standing at the start of year `year`, with no letters pending.
function inYear(year: number): GameState {
  const s = createInitialState('Fifty');
  s.clock.year = year;
  s.clock.week = 1;
  s.events.opening.skipped = true;
  return s;
}

console.log('semicentennial tests');

// --- an ordinary summer is not final ---------------------------------------------
{
  const s = toSummer(inYear(SEMICENTENNIAL_YEAR - 1));
  assert(s.clock.year === SEMICENTENNIAL_YEAR - 1 && payloadOf(s).beat === 0, 'the forty-ninth summer opens on its first beat');
  assert(payloadOf(s).final === undefined, 'and is not the final report');
  assert(modalWidth(s.pendingInterrupt!) === 'wide', 'its review is wide');
  const after = throughSummer(s);
  assert(after.ending === undefined, 'and writes nothing');
}

// --- the fiftieth summer ------------------------------------------------------------
{
  const s = toSummer(inYear(SEMICENTENNIAL_YEAR));
  assert(s.clock.year === SEMICENTENNIAL_YEAR && payloadOf(s).beat === 0, 'the fiftieth summer opens on its first beat');
  assert(payloadOf(s).final === true, 'and it is the final report');
  assert(modalWidth(s.pendingInterrupt!) === 'page', 'the final report is a page');
  assert(s.ending === undefined, 'the report is not written while it is on screen');

  const shown = finalReport(s);
  const b1 = reducer(s, { type: 'RESOLVE_SUMMER_BEAT' });
  assert(payloadOf(b1).beat === 1 && modalWidth(b1.pendingInterrupt!) === 'wide', 'Admissions follows (Plan 33 dropped the Standing beat)');
  assert(b1.ending === undefined, 'nor between beats');
  assert(payloadOf(b1).final === true, 'the flag rides through the beats');

  const after = throughSummer(s);
  assert(after.clock.year === SEMICENTENNIAL_YEAR + 1, 'the calendar turns to year fifty-one');
  assert(after.ending !== undefined, 'the report is written at the boundary');
  assert(JSON.stringify(after.ending!.report) === JSON.stringify(shown), 'and it is exactly the report the beat showed');
  assert(after.ending!.report.year === SEMICENTENNIAL_YEAR, 'dated the fiftieth year');
  assert(after.ending!.report.axes.length === 6 && ['A', 'B', 'C', 'D', 'F'].includes(after.ending!.report.mark), 'six standings graded, and a mark');
  assert(after.ending!.report.title.startsWith(after.ending!.report.college), `a title that names the college ("${after.ending!.report.title}")`);
  assert(after.log.some((e) => e.message.includes('The Final Report')), 'the log says so');
  assert(after.history[after.history.length - 1].year === SEMICENTENNIAL_YEAR, 'the fiftieth row is filed like any other');
  assert(after.pendingInterrupt === null, 'and the clock runs on');

  // The fifty-first summer is an ordinary one, and cannot rewrite it.
  const written = after.ending!.report;
  const next = toSummer(after);
  assert(payloadOf(next).final === undefined, 'the fifty-first summer is not a final report');
  let later = throughSummer(next);
  assert(JSON.stringify(later.ending!.report) === JSON.stringify(written), 'and the report it carries is the one written at fifty, untouched');
  // The Epilogue: an addendum at the sixtieth summer, for the decade.
  for (let y = SEMICENTENNIAL_YEAR + 2; y < SEMICENTENNIAL_YEAR + 10; y++) later = throughSummer(toSummer(later));
  assert(later.ending!.addenda.length === 0, 'no addendum before the decade is out');
  later = throughSummer(toSummer(later));
  const addendum = later.ending!.addenda[0];
  assert(later.ending!.addenda.length === 1 && addendum.from === SEMICENTENNIAL_YEAR + 1 && addendum.to === SEMICENTENNIAL_YEAR + 10, 'the sixtieth summer writes the decade\'s addendum');
  assert(addendum.lines[0] === `Years ${SEMICENTENNIAL_YEAR + 1} to ${SEMICENTENNIAL_YEAR + 10}.`, `in the chronicle's sentences (${addendum.lines.join(' ')})`);
}

// --- the founder's figures ---------------------------------------------------------
{
  const s = inYear(SEMICENTENNIAL_YEAR - 2);
  assert(s.self.facultyServed === 5, 'the founding five have served from day one');
  appointFaculty(s, { ...s.faculty[0], id: 'new' });
  assert(s.self.facultyServed === 6, 'an appointment counts');
  const seniors = s.students.classes.senior;
  const after = throughSummer(toSummer(s));
  const row = after.history[after.history.length - 1];
  assert(row.graduated === seniors, `the snapshot carries the graduating class (${row.graduated} of ${seniors})`);
  const figures = founderFigures(after);
  assert(figures.studentsTaught === seniors + totalEnrolled(after.students), 'students taught is every class that left plus the body still here');
  assert(figures.facultyServed === 6 && figures.prizes === 0 && figures.titles === 0, 'the other three read the tallies they name');
}

// --- the written report survives a save ------------------------------------------------
{
  clearSave();
  const after = throughSummer(toSummer(inYear(SEMICENTENNIAL_YEAR)));
  assert(saveGame(after), 'a finished run saves');
  const loaded = loadGame();
  assert(loaded !== null && JSON.stringify(loaded.ending) === JSON.stringify(after.ending), 'and the report comes back byte for byte');
  (after as unknown as { ending: unknown }).ending = { report: 'nonsense' };
  saveGame(after);
  assert(loadGame()!.ending === undefined, 'a malformed ending is dropped');
  (after.self as unknown as { legacy: unknown }).legacy = { name: 'old' };
  delete after.ending;
  saveGame(after);
  assert(!('legacy' in loadGame()!.self), 'the retired legacy is dropped from older saves');
}

console.log(failures === 0 ? `  ✓ all ${checks} checks passed` : `  ${failures} of ${checks} checks failed`);
process.exit(failures === 0 ? 0 : 1);
