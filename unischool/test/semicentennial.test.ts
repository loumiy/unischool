// ---------------------------------------------------------------------
// The semicentennial (Plan 17's PR C): the fiftieth summer's first beat is
// the final report, the record is sealed once at that summer's boundary,
// and play continues.
//
// What is pinned: that the summer raised on year fifty carries the `final`
// flag and only then; that its first beat is a page while every other
// summer's is wide; that RESOLVE_ADMISSIONS at year fifty writes
// s.self.legacy exactly once, as the reading the beat showed, and logs it;
// that the fifty-first summer is an ordinary one and cannot re-seal; that
// the snapshot carries the graduating class and the founder's figures sum
// it; and that the sealed record survives a save.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { createInitialState } from '../src/state/actions';
import { reducer } from '../src/engine/reducer';
import { defaultAnswer } from '../src/engine/defaultAnswers';
import { modalWidth } from '../src/components/modalLayout';
import { legacy } from '../src/state/legacy';
import { founderFigures } from '../src/state/finalReport';
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
  assert(after.self.legacy === null, 'and seals nothing');
}

// --- the fiftieth summer ------------------------------------------------------------
{
  const s = toSummer(inYear(SEMICENTENNIAL_YEAR));
  assert(s.clock.year === SEMICENTENNIAL_YEAR && payloadOf(s).beat === 0, 'the fiftieth summer opens on its first beat');
  assert(payloadOf(s).final === true, 'and it is the final report');
  assert(modalWidth(s.pendingInterrupt!) === 'page', 'the final report is a page');
  assert(s.self.legacy === null, 'the record is not sealed while the report is on screen');

  const shown = legacy(s);
  const b1 = reducer(s, { type: 'RESOLVE_SUMMER_BEAT' });
  assert(payloadOf(b1).beat === 1 && modalWidth(b1.pendingInterrupt!) === 'wide', 'Admissions follows (Plan 33 dropped the Standing beat)');
  assert(b1.self.legacy === null, 'still unsealed between beats');
  assert(payloadOf(b1).final === true, 'the flag rides through the beats');

  const after = throughSummer(s);
  assert(after.clock.year === SEMICENTENNIAL_YEAR + 1, 'the calendar turns to year fifty-one');
  assert(after.self.legacy !== null, 'the record is sealed at the boundary');
  assert(JSON.stringify(after.self.legacy) === JSON.stringify(shown), 'and it is exactly the reading the report showed');
  assert(after.self.legacy!.year === SEMICENTENNIAL_YEAR, 'stamped with the fiftieth year');
  assert(after.log.some((e) => e.message.includes('The record is sealed')), 'the log says so');
  assert(after.history[after.history.length - 1].year === SEMICENTENNIAL_YEAR, 'the fiftieth row is filed like any other');
  assert(after.pendingInterrupt === null, 'and the clock runs on');

  // The fifty-first summer is an ordinary one, and cannot re-seal.
  const sealed = after.self.legacy;
  const next = toSummer(after);
  assert(payloadOf(next).final === undefined, 'the fifty-first summer is not a final report');
  const later = throughSummer(next);
  assert(JSON.stringify(later.self.legacy) === JSON.stringify(sealed), 'and the record it carries is the one sealed at fifty, untouched');
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

// --- the sealed record survives a save -------------------------------------------------
{
  clearSave();
  const after = throughSummer(toSummer(inYear(SEMICENTENNIAL_YEAR)));
  assert(saveGame(after), 'a sealed run saves');
  const loaded = loadGame();
  assert(loaded !== null && JSON.stringify(loaded.self.legacy) === JSON.stringify(after.self.legacy), 'and the record comes back byte for byte');
}

console.log(failures === 0 ? `  ✓ all ${checks} checks passed` : `  ${failures} of ${checks} checks failed`);
process.exit(failures === 0 ? 0 : 1);
