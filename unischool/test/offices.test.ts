// ---------------------------------------------------------------------
// The administration's offices (Plan 87B): an office in a slot of Founders
// Hall, the gates on opening and closing one, its price and running cost,
// and the slot it holds against programs.
//
//   1. OPEN_OFFICE puts an office in a free slot of Founders Hall for its
//      price; the same office is never held twice, and an office never
//      takes a slot that is not free.
//   2. An office's slot is not free: no program is relocated into it.
//   3. Never past the allowance.
//   4. CLOSE_OFFICE leaves the slot dark (held, still counted) for
//      OFFICE_CLOSING_WEEKS, then free; a closing office costs nothing and
//      does nothing.
//   5. The open offices' budget is an expense line, charged weekly.
//   6. A save keeps its offices, and drops one the game would refuse.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { createInitialState } from '../src/state/actions';
import { reducer } from '../src/engine/reducer';
import { bindScriptStream } from '../src/engine/random';
import { FOUNDERS_HALL_ID, academicHallId, majorPrefixes } from '../src/data/techData';
import { MAX_OFFICES, OFFICE_BUDGET_SHARE, OFFICE_CLOSING_WEEKS, OFFICES, OFFICE_SEAT_BONUS } from '../src/data/officeData';
import {
  heldOffices, officeBudget, officeOpen, officePrice, officeStrength, openOfficeRefusal, slotFree, tickOffices,
} from '../src/systems/administration/offices';
import { canRelocateProgram } from '../src/systems/techtree/techSystem';
import { financeBreakdown } from '../src/systems/finance/financeSystem';
import { readSave, SAVE_VERSION } from '../src/state/persistence';
import type { GameState } from '../src/state/types';

bindScriptStream(12345);
const store = new Map<string, string>();
(globalThis as unknown as { localStorage: unknown }).localStorage = {
  getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
  setItem: (k: string, v: string) => { store.set(k, String(v)); },
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

console.log('office tests');

function college(name = 'Offices'): GameState {
  const s = createInitialState(name);
  s.finance.cash = 500_000_000;
  s.finance.weeklyOpEx = 400_000;
  return s;
}

const founders = (s: GameState) => s.halls[FOUNDERS_HALL_ID];

// ---- 1. Opening an office ----
{
  const s = college();
  assert(founders(s).length === 6 && founders(s).every(slotFree), 'Founders Hall opens with six free slots');
  assert(OFFICES.length === 12 && new Set(OFFICES.map((o) => o.id)).size === 12, 'twelve offices, each its own');
  const price = officePrice(s, 'admissions');
  assert(price > 0, `an office has a price (${price})`);
  assert(openOfficeRefusal(s, 'admissions', 2) === null, 'the Admissions Office may open in slot 3');
  const t = reducer(s, { type: 'OPEN_OFFICE', officeId: 'admissions', slot: 2 });
  assert(founders(t)[2].office?.id === 'admissions' && founders(t)[2].programId === null, 'OPEN_OFFICE puts it in the slot');
  assert(!slotFree(founders(t)[2]), 'and the slot is no longer free');
  assert(t.finance.cash === s.finance.cash - price, 'for its price');
  assert(founders(t)[2].office?.openedYear === s.clock.year, 'recording the year it opened');
  assert(officeOpen(t, 'admissions') && officeStrength(t, 'admissions') === 1, 'it is open, at strength 1 with no Provost');

  assert(openOfficeRefusal(t, 'admissions', 3) !== null, 'the same office is never held twice');
  const twice = reducer(t, { type: 'OPEN_OFFICE', officeId: 'admissions', slot: 3 });
  assert(twice === t, 'and OPEN_OFFICE refuses it, changing nothing');
  assert(openOfficeRefusal(t, 'curriculum', 2) !== null, 'an office never takes a slot that is not free');
  assert(openOfficeRefusal(t, 'no-such-office', 3) !== null, 'nor opens unless it is one of the twelve');
  assert(openOfficeRefusal(t, 'curriculum', 6) !== null, 'nor outside the six slots');

  const poor = college('Poor');
  poor.finance.cash = 0;
  assert(openOfficeRefusal(poor, 'admissions', 0) === 'Not enough cash.', 'nor without its price');

  // The seat bonus.
  t.seats = [{ seatId: 'provost', school: null, holder: 'x', internal: false, policy: 'economical', salary: 1, appointedYear: 1 }];
  assert(officeStrength(t, 'admissions') === OFFICE_SEAT_BONUS, 'with the Provost seated it works half again as hard');
  assert(officeStrength(t, 'career-services') === 0, 'an office not held does nothing');
}

// ---- 2. An office's slot takes no program ----
{
  const s = college('Relocate');
  const elm = academicHallId(0);
  const hall = s.tech.find((x) => x.id === elm)!;
  hall.status = 'done';
  const programId = majorPrefixes()[0];
  s.halls[elm] = Array.from({ length: hall.slots ?? 6 }, (_, i) => ({ programId: i === 0 ? programId : null }));
  const t = reducer(s, { type: 'OPEN_OFFICE', officeId: 'counseling', slot: 0 });
  assert(!canRelocateProgram(t, { programId, hallId: FOUNDERS_HALL_ID, slot: 0 }), 'no program moves into an office\'s slot');
  assert(canRelocateProgram(t, { programId, hallId: FOUNDERS_HALL_ID, slot: 1 }), 'and one may move into the free slot beside it');
}

// ---- 3. The allowance ----
{
  let s = college('Allowance');
  OFFICES.slice(0, MAX_OFFICES).forEach((o, i) => { s = reducer(s, { type: 'OPEN_OFFICE', officeId: o.id, slot: i }); });
  assert(heldOffices(s).length === MAX_OFFICES, `${MAX_OFFICES} offices fill Founders Hall`);
  // A seventh slot cannot exist in Founders Hall, so free one by hand to
  // reach the allowance gate rather than the slot gate.
  founders(s).push({ programId: null });
  assert(openOfficeRefusal(s, OFFICES[MAX_OFFICES].id, MAX_OFFICES)?.startsWith('The college holds every office') === true,
    'never more than the allowance');
}

// ---- 4. Closing ----
{
  let s = college('Closing');
  s = reducer(s, { type: 'OPEN_OFFICE', officeId: 'alumni-relations', slot: 4 });
  const budgetOpen = officeBudget(s);
  s = reducer(s, { type: 'CLOSE_OFFICE', officeId: 'alumni-relations' });
  const slot = founders(s)[4];
  assert(slot.office?.closingWeeks === OFFICE_CLOSING_WEEKS, `CLOSE_OFFICE darkens the slot for ${OFFICE_CLOSING_WEEKS} weeks`);
  assert(!slotFree(slot), 'the slot is not free while it closes');
  assert(heldOffices(s).length === 1, 'and the office still counts against the allowance');
  assert(!officeOpen(s, 'alumni-relations') && officeStrength(s, 'alumni-relations') === 0, 'a closing office does nothing');
  assert(budgetOpen > 0 && officeBudget(s) === 0, 'and costs nothing');
  assert(openOfficeRefusal(s, 'alumni-relations', 0) !== null, 'it cannot be reopened while it closes');
  assert(reducer(s, { type: 'CLOSE_OFFICE', officeId: 'alumni-relations' }) === s, 'nor closed twice');
  for (let w = 0; w < OFFICE_CLOSING_WEEKS - 1; w += 1) tickOffices(s);
  assert(founders(s)[4].office?.closingWeeks === 1, 'a week before the end it is still closing');
  tickOffices(s);
  assert(slotFree(founders(s)[4]) && heldOffices(s).length === 0, 'then the slot is free and nothing is held');
  assert(openOfficeRefusal(s, 'alumni-relations', 4) === null, 'and the office may open again, for its price');
}

// ---- 5. The budget ----
{
  let s = college('Budget');
  assert(financeBreakdown(s).offices === 0, 'no office, no Offices line');
  s = reducer(s, { type: 'OPEN_OFFICE', officeId: 'admissions', slot: 0 });
  s = reducer(s, { type: 'OPEN_OFFICE', officeId: 'curriculum', slot: 1 });
  const expected = 2 * OFFICE_BUDGET_SHARE * s.finance.weeklyOpEx;
  const flow = financeBreakdown(s);
  assert(Math.abs(flow.offices - expected) < 1e-6, `two offices draw ${expected.toFixed(0)} a week (${flow.offices.toFixed(0)})`);
  const before = financeBreakdown(college('Budget'));
  assert(Math.abs(flow.totalExpenses - before.totalExpenses - flow.offices) < 1, 'and the line is in the week\'s expenses');
}

// ---- 6. Save and load ----
{
  let s = college('Saved');
  s = reducer(s, { type: 'OPEN_OFFICE', officeId: 'facilities-management', slot: 1 });
  s = reducer(s, { type: 'OPEN_OFFICE', officeId: 'admissions', slot: 3 });
  s = reducer(s, { type: 'CLOSE_OFFICE', officeId: 'admissions' });
  const raw = JSON.parse(JSON.stringify(s)) as GameState;
  raw.halls[FOUNDERS_HALL_ID][5] = { programId: null, office: { id: 'facilities-management', openedYear: 1 } };
  raw.halls[FOUNDERS_HALL_ID][4] = { programId: null, office: { id: 'no-such-office', openedYear: 1 } };
  const read = readSave(JSON.stringify({ version: SAVE_VERSION, savedAt: 0, state: raw }));
  const loaded = 'state' in read ? read.state : null;
  assert(loaded !== null, 'the save loads');
  const kept = loaded ? heldOffices(loaded) : [];
  assert(kept.length === 2, `a save keeps its two offices (${kept.map((o) => o.id).join(', ')})`);
  assert(kept.find((o) => o.id === 'admissions')?.closingWeeks === OFFICE_CLOSING_WEEKS, 'a closing office keeps its term');
  assert(kept.filter((o) => o.id === 'facilities-management').length === 1, 'a repeated office is dropped');
  assert(loaded !== null && slotFree(loaded.halls[FOUNDERS_HALL_ID][4]), 'and an unknown one leaves its slot free');
}

console.log(`  ${checks - failures}/${checks} checks passed`);
if (failures > 0) process.exit(1);
