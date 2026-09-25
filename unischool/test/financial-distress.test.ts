// ---------------------------------------------------------------------
// Financial-distress invariants (see docs/design/economy.md / "No hard
// insolvency game-over", and the alignment roadmap's PR F). The design is
// "stall, don't die": a shortfall halts EXPANSION, never the run. These
// tests drive the REAL reducer (the same one the app runs) to pin that down:
//
//   - no priced action can drive cash negative — an unaffordable Buildable,
//     placement or endowment campaign is refused at the moment of decision;
//   - the OPERATING budget still can go negative, and the clock keeps
//     ticking indefinitely when it does (no bankruptcy, no gameOver);
//   - the zero-cost recovery lever (firing faculty) actually improves the
//     weekly bottom line.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { reducer } from '../src/engine/reducer';
import { createInitialState } from '../src/state/actions';
import type { GameState } from '../src/state/types';
import { weeklyNet } from '../src/systems/finance/financeSystem';
import { bindScriptStream } from '../src/engine/random';

// Deterministic RNG + in-memory localStorage so the reducer runs under Node
// the same way every time (RESOLVE_ADMISSIONS autosaves; TICK rolls dice for
// events/research/faculty churn — none of which these invariants depend on,
// but a fixed stream keeps the run reproducible).
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

function fresh(): GameState {
  return createInitialState('Distress');
}

function emptyClasses(s: GameState): void {
  s.students.classes = { freshman: 0, sophomore: 0, junior: 0, senior: 0 };
}

// ---- No purchase can drive cash negative ----

// A course whose cost exceeds cash is refused: not charged, not developing.
{
  const s0 = fresh();
  s0.finance.cash = 100;
  const course = s0.tech.find((t) => t.kind === 'course' && t.status === 'available' && t.cost > 100);
  assert(course !== undefined, 'fixture: an available course costs more than 100');
  if (course) {
    const s1 = reducer(s0, { type: 'START_DEVELOPMENT', nodeId: course.id });
    assert(s1.finance.cash === 100, 'unaffordable START_DEVELOPMENT does not charge');
    assert(s1.tech.find((t) => t.id === course.id)?.status === 'available', 'unaffordable course stays available');
    assert(s1.developing[course.id] === undefined, 'unaffordable course never enters development');
  }
}

// Cash already negative blocks every priced start (no cost is <= a negative
// balance) — the operating-deficit bottleneck, arrived at honestly.
{
  const s0 = fresh();
  s0.finance.cash = -5000;
  const course = s0.tech.find((t) => t.kind === 'course' && t.status === 'available' && t.cost > 0);
  if (course) {
    const s1 = reducer(s0, { type: 'START_DEVELOPMENT', nodeId: course.id });
    assert(s1.developing[course.id] === undefined && s1.finance.cash === -5000,
      'negative cash blocks a priced start');
  }
}

// An unaffordable placeable Buildable is refused: not sited, not charged.
{
  // Tick once so the next dorm unlocks: the founding hall is pre-built ('done')
  // at founding now, so the first buildable dorm is Dorm II, which unlocks the
  // tick its prereq (that hall) is seen 'done' — i.e. immediately.
  const s0 = reducer(fresh(), { type: 'TICK' });
  s0.finance.cash = 50;
  const dorm = s0.tech.find((t) => t.kind === 'dorm' && t.status === 'available' && t.cost > 50);
  assert(dorm !== undefined, 'fixture: an available dorm costs more than 50');
  if (dorm) {
    // A clear, in-bounds spot, well clear of the centered founding dorm — so
    // the only reason placement is refused is that it is unaffordable.
    const s1 = reducer(s0, { type: 'PLACE_BUILDABLE', buildableId: dorm.id, row: 45, col: 60, rotated: false });
    assert(!(dorm.id in s1.placements), 'unaffordable placeable is not sited');
    assert(s1.finance.cash === 50, 'unaffordable placeable does not charge');
    assert(s1.developing[dorm.id] === undefined, 'unaffordable placeable never enters development');
  }
}

// ---- The operating budget CAN go negative, and the run continues ----

// Strip enrollment (no tuition) so the deterministic salary + seat-upkeep
// expenses run a weekly deficit against tiny income. The clock must keep
// advancing straight past zero — no bankruptcy, no gameOver.
{
  const s0 = fresh();
  emptyClasses(s0);
  s0.finance.cash = 3000;
  assert(weeklyNet(s0) < 0, 'fixture: a school with no students runs a weekly deficit');

  let s = s0;
  const startWeek = s.clock.week;
  let ticks = 0;
  for (let i = 0; i < 6; i += 1) {
    // The first year's opening letter (Plan 16's PR F) holds week one open
    // like any other interrupt; it is read and put down so the clock's own
    // behavior under a deficit is what this measures.
    if (s.pendingInterrupt) { s = reducer(s, { type: 'RESOLVE_LETTER', skipAll: true }); continue; }
    s = reducer(s, { type: 'TICK' });
    ticks += 1;
  }
  assert(ticks > 0 && s.clock.week !== startWeek, 'the clock advances while heading into the red (TICK not refused)');
  assert(s.finance.cash < 0, 'the operating deficit drives cash below zero');
  assert(!('gameOver' in s), 'no gameOver field exists — there is no hard-failure state');

  // Still running with cash already negative: one more tick still advances.
  if (!s.pendingInterrupt) {
    const wk = s.clock.week;
    const s2 = reducer(s, { type: 'TICK' });
    assert(s2.clock.week !== wk, 'TICK keeps advancing the clock with cash already negative');
    assert(s2.finance.cash < 0, 'the school stays indefinitely in the red — an accepted state');
  }
}

// ---- The zero-cost recovery lever moves the numbers ----

// Firing the priciest faculty member improves the weekly bottom line — the
// lever a stalled school always has and no Buildable can take away.
{
  const s0 = fresh();
  emptyClasses(s0);
  const before = weeklyNet(s0);
  const priciest = [...s0.faculty].sort((a, b) => b.salary - a.salary)[0];
  assert(priciest !== undefined, 'fixture: the founding roster has faculty to cut');
  if (priciest) {
    const s1 = reducer(s0, { type: 'FIRE_FACULTY', facultyId: priciest.id });
    assert(s1.faculty.length === s0.faculty.length - 1, 'FIRE_FACULTY removes the hire');
    assert(weeklyNet(s1) > before, 'firing the priciest faculty improves weekly net (recovery lever)');
  }
}

console.log('financial-distress tests');
if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
