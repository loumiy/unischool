// ---------------------------------------------------------------------
// Develop All says what it will do (src/systems/techtree/techSystem.ts's
// developAllPlan, and the DEVELOP_ALL_AVAILABLE_COURSES case that runs it).
//
// The button now carries a count and a price, so the only thing worth
// testing is that both are TRUE: the courses it names are the courses that
// start, and the figure it quotes is the figure the school is charged. A
// naive "everything that passes canStartDevelopment right now" would
// over-promise on both, because each start spends cash and takes a faculty
// slot out from under the courses later in the sweep.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { createInitialState } from '../src/state/actions';
import { reducer } from '../src/engine/reducer';
import { developAllPlan, totalFacultySlots, usedFacultySlots } from '../src/systems/techtree/techSystem';
import type { Faculty, GameState } from '../src/state/types';

let seed = 5150;
Math.random = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
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

function fresh(): GameState {
  return createInitialState('Ashcombe');
}

console.log('develop-all tests');

// --- the quote is the bill --------------------------------------------
{
  const s = fresh();
  const plan = developAllPlan(s);
  assert(plan.ids.length > 0, `a founding school has courses it can start (${plan.ids.length})`);

  const cashBefore = s.finance.cash;
  const after = reducer(s, { type: 'DEVELOP_ALL_AVAILABLE_COURSES' });

  const started = after.tech.filter((t) => t.kind === 'course' && t.status === 'developing').map((t) => t.id);
  assert(
    started.sort().join() === [...plan.ids].sort().join(),
    `the courses that started are exactly the ones the button named (${started.length} vs ${plan.ids.length})`,
  );
  assert(
    cashBefore - after.finance.cash === plan.cost,
    `and the school was charged exactly what the button quoted ($${plan.cost.toLocaleString()})`,
  );
  assert(after.finance.cash >= 0, 'never below zero');
}

// --- it stops when the money does -------------------------------------
{
  const s = fresh();
  const full = developAllPlan(s);
  assert(full.cost > 0, 'the full sweep costs something');

  // Half the money buys fewer courses, and the quote still matches the
  // bill — the case a naive count gets wrong.
  s.finance.cash = Math.floor(full.cost / 2);
  const plan = developAllPlan(s);
  assert(plan.ids.length < full.ids.length, `a poorer school starts fewer (${plan.ids.length} of ${full.ids.length})`);
  assert(plan.cost <= s.finance.cash, 'and never quotes more than it has');

  const before = s.finance.cash;
  const after = reducer(s, { type: 'DEVELOP_ALL_AVAILABLE_COURSES' });
  assert(before - after.finance.cash === plan.cost, 'the bill still matches the quote when cash is the limit');
  assert(after.finance.cash >= 0, 'and the school is not overdrawn');
}

// --- it stops when the slots do ---------------------------------------
{
  const s = fresh();
  s.finance.cash = 5_000_000_000;

  // One department, one slot, several courses waiting on it.
  const field = 'Physics';
  s.faculty = s.faculty.filter((f) => f.field !== field);
  s.faculty.push({
    id: 'solo', name: 'Solo', field, teaching: 60, research: 60, acclaim: 0,
    courseSlots: 1, salary: 100_000, tenureWeeks: 0,
  } as Faculty);
  // Unlocked wholesale, including courses progressive discovery has not
  // revealed yet: what is under test is the slot ceiling, not the tree.
  for (const t of s.tech) {
    if (t.requiresFaculty === field) t.status = 'available';
  }
  const waiting = s.tech.filter((t) => t.requiresFaculty === field && t.status === 'available').length;
  assert(waiting > 1, `more ${field} courses are waiting than the department can hold (${waiting})`);
  assert(totalFacultySlots(s, field) === 1, 'the department supplies one slot');
  assert(usedFacultySlots(s, field) === 0, 'and none of it is spoken for yet');

  const plan = developAllPlan(s);
  const planned = plan.ids.filter((id) => s.tech.find((t) => t.id === id)?.requiresFaculty === field).length;
  assert(planned === 1, `the sweep takes one ${field} course, not all ${waiting} (took ${planned})`);

  const after = reducer(s, { type: 'DEVELOP_ALL_AVAILABLE_COURSES' });
  const startedInField = after.tech.filter(
    (t) => t.requiresFaculty === field && t.status === 'developing',
  ).length;
  assert(startedInField === 1, `and one is what actually starts (${startedInField})`);
  assert(
    usedFacultySlots(after, field) <= totalFacultySlots(after, field),
    'the department is never over-committed by the sweep',
  );
}

// --- nothing to do is nothing to say ----------------------------------
{
  const s = fresh();
  s.finance.cash = 0;
  const plan = developAllPlan(s);
  assert(plan.ids.length === 0 && plan.cost === 0, 'a school that can afford nothing plans nothing');

  const after = reducer(s, { type: 'DEVELOP_ALL_AVAILABLE_COURSES' });
  assert(
    after.tech.every((t) => t.kind !== 'course' || t.status !== 'developing'),
    'and starts nothing',
  );
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
