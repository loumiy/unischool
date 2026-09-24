// The distress ladder (src/systems/finance/distress.ts): no bankruptcy, five
// survivable rungs, down one a term and back up as the conditions allow,
// with the board's cuts and its letters.

import { createInitialState } from '../src/state/actions';
import { reducer } from '../src/engine/reducer';
import {
  AUSTERITY_AFTER_TERMS, BOARD_POLICY_DRAW, BOARD_POLICY_MAINTENANCE, RECEIVERSHIP_AFTER_TERMS, RECEIVERSHIP_TERMS,
  RUNG_AUSTERITY, RUNG_DEFICIT, RUNG_FREEZE, RUNG_RECEIVERSHIP, RUNG_SOUND, RUNG_TIGHT,
  closeTerm, constructionFrozen, distressOf, rungOf, tickDistress, tuitionFloor,
} from '../src/systems/finance/distress';
import { loanFor } from '../src/systems/finance/treasury';
import { canStartDevelopment } from '../src/systems/techtree/techSystem';
import { BOARD_LETTERS } from '../src/data/boardData';
import { loadGame, saveGame } from '../src/state/persistence';
import { bindScriptStream } from '../src/engine/random';
import type { GameState } from '../src/state/types';

bindScriptStream(2728);
const store = new Map<string, string>();
(globalThis as unknown as { localStorage: unknown }).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => { store.set(k, v); },
  removeItem: (k: string) => { store.delete(k); },
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

console.log('distress tests');

function fresh(): GameState {
  const s = createInitialState('Distress');
  s.pendingInterrupt = null;
  s.finance.weeklyOpEx = 100_000;  // a term costs $1.7M
  return s;
}
// Closes a term that ran at `net`, with `cash` in the bank after it.
function term(s: GameState, net: number, cash: number): void {
  s.finance.cash = cash;
  (s.finance.distress ??= distressOf(s)).termNet = net;
  closeTerm(s);
}
const letters = (s: GameState) => distressOf(s).letters;

// ---- Sound and the gentle rungs ----
{
  const s = fresh();
  assert(rungOf(s) === RUNG_SOUND && s.finance.distress === undefined, 'a new college is sound, with no record');
  term(s, 50_000, 5_000_000);
  assert(rungOf(s) === RUNG_SOUND && letters(s).length === 0, 'a surplus term with reserves stays sound, and nobody writes');
  term(s, 50_000, 1_000_000);
  assert(rungOf(s) === RUNG_TIGHT && letters(s).length === 0, 'cash under a term\'s expenses is Tight, which the board notes without writing');
  term(s, -10_000, 1_000_000);
  assert(rungOf(s) === RUNG_TIGHT, 'one deficit term is not yet Deficit');
  term(s, -10_000, 1_000_000);
  assert(rungOf(s) === RUNG_DEFICIT, 'two in a row are');
  term(s, 10_000, 5_000_000);
  term(s, 10_000, 5_000_000);
  assert(rungOf(s) === RUNG_SOUND && letters(s).at(-1) === 'recovered', 'and a surplus with reserves climbs straight back to Sound');
}

// ---- Freeze, austerity, receivership ----
{
  let s = fresh();
  s.finance.maintenanceFunding = 0.8;
  s.finance.drawRate = 0.035;
  term(s, -500_000, -1);
  assert(rungOf(s) === RUNG_FREEZE, 'empty reserves go straight to Freeze');
  assert(constructionFrozen(s), 'which stops new construction');
  const hall = s.tech.find((t) => t.kind === 'facility' && !t.requiresFaculty && t.cost > 0)!;
  hall.status = 'available';
  s.finance.cash = hall.cost * 10;
  assert(!canStartDevelopment(s, hall), 'even with the cash back');
  s.finance.cash = 1;
  s.finance.endowment = 1e9;
  assert(loanFor(s, hall.cost) === 0, 'and borrowing');
  const course = s.tech.find((t) => t.kind === 'course' && t.status === 'available' && !t.requiresFaculty);
  if (course) {
    s.finance.cash = course.cost + 1;
    assert(canStartDevelopment(s, course), 'but not teaching');
  }
  for (let i = 0; i < AUSTERITY_AFTER_TERMS; i++) term(s, -500_000, -1);
  assert(rungOf(s) === RUNG_AUSTERITY, `${AUSTERITY_AFTER_TERMS} terms frozen is Austerity`);
  assert(s.finance.maintenanceFunding === 0, 'the board cuts maintenance to nothing');
  s = reducer(s, { type: 'SET_MAINTENANCE_FUNDING', level: 1 });
  assert(s.finance.maintenanceFunding === 0, 'and the administration cannot restore it');
  s.finance.listedTuition = 30_000;
  assert(tuitionFloor(s) === 30_000, 'nor lower the tuition');
  for (let i = 0; i < RECEIVERSHIP_AFTER_TERMS; i++) term(s, -500_000, -1);
  assert(rungOf(s) === RUNG_RECEIVERSHIP, `${RECEIVERSHIP_AFTER_TERMS} terms of austerity is Receivership`);
  assert(s.finance.drawRate === BOARD_POLICY_DRAW && s.finance.maintenanceFunding === BOARD_POLICY_MAINTENANCE, 'the interim CFO sets the draw and the maintenance');
  assert(!constructionFrozen(s), 'and builds on cash as anyone may');
  assert(distressOf(s).scars.length === 1, 'the year is scarred');
  for (let i = 0; i < RECEIVERSHIP_TERMS - 1; i++) term(s, 100_000, 10_000_000);
  assert(rungOf(s) === RUNG_RECEIVERSHIP, 'the CFO serves the full three years, however the terms go');
  term(s, 100_000, 10_000_000);
  assert(rungOf(s) === RUNG_SOUND, 'and leaves the college where its conditions put it');
  assert(s.finance.maintenanceFunding === 0.8 && s.finance.drawRate === 0.035, 'handing back the budget the college had set');
  assert(letters(s).join() === 'enter-3,enter-4,enter-5,exit-5', `with a letter at each step (${letters(s).join()})`);
  assert(letters(s).every((id) => BOARD_LETTERS[id] !== undefined), 'every one of them written');
  s = reducer(s, { type: 'READ_BOARD_LETTER' });
  assert(letters(s).length === 3, 'and read one at a time');
  assert(distressOf(s).confidence < 70, 'the board\'s confidence remembers');
}

// ---- Out of austerity by recovery ----
{
  const s = fresh();
  term(s, -1, -1);
  for (let i = 0; i < AUSTERITY_AFTER_TERMS; i++) term(s, -1, -1);
  assert(rungOf(s) === RUNG_AUSTERITY, 'into austerity');
  term(s, 10_000, 100);
  assert(rungOf(s) === RUNG_AUSTERITY, 'one surplus term is not enough');
  term(s, 10_000, 100);
  assert(rungOf(s) === RUNG_TIGHT && s.finance.maintenanceFunding === undefined, 'two with cash climb out, and full maintenance returns');
  assert(letters(s).at(-1) === 'exit-4', 'the board says the cuts are lifted');
}

// ---- The clock ----
{
  const s = fresh();
  s.finance.cash = 1;
  s.clock.year = 3;
  s.clock.week = 18;
  tickDistress(s);
  tickDistress(s);
  assert(distressOf(s).termsAtRung === 0 && rungOf(s) === RUNG_TIGHT, 'a term closes at the top of the next');
  const before = JSON.stringify(s.finance.distress);
  tickDistress(s);
  assert(JSON.stringify(s.finance.distress) === before, 'once, however often a held week runs');
  s.clock.week = 19;
  tickDistress(s);
  assert(JSON.stringify(s.finance.distress) === before, 'and not mid-term');
}

// ---- Saves ----
{
  const s = fresh();
  term(s, -1, -1);
  saveGame(s);
  assert(loadGame()?.finance.distress?.rung === RUNG_FREEZE, 'the ladder saves');
  (s.finance.distress as unknown as { rung: number }).rung = 9;
  saveGame(s);
  assert(loadGame()?.finance.distress === undefined, 'and a malformed one is dropped');
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
