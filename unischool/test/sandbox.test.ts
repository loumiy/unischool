// Sandbox mode (the title screen's Sandbox, src/systems/sandbox): a run
// founded as a sandbox never runs short of funds, and a building placed or
// a course started is finished by the same action, and every building is
// open from the start. A normal run is not
// touched, and a sandbox run is never hung in the hall of fame.

import { teachingCollege } from './fixtures/teaching';
import { reducer } from '../src/engine/reducer';
import { firstFreeSpot, footprintOf, isPlaceableKind } from '../src/state/campusMap';
import { bindScriptStream } from '../src/engine/random';
import { canStartDevelopment } from '../src/systems/techtree/techSystem';
import { SANDBOX_CASH } from '../src/systems/sandbox/sandbox';
import { createPreStartState } from '../src/state/actions';
import { FOUNDING_VERNACULAR } from '../src/data/foundingData';
import { FOUNDING_COLORS, schoolColorsOf } from '../src/data/schoolColors';
import type { GameState } from '../src/state/types';

bindScriptStream(5150);

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('sandbox tests');

const found = (sandbox: boolean) => reducer(createPreStartState(), {
  type: 'START_GAME', name: 'Sandbox', vernacular: FOUNDING_VERNACULAR, colors: schoolColorsOf(FOUNDING_COLORS), seed: 77, sandbox,
});

// ---- Founding ----
{
  const s = found(true);
  assert(s.sandbox === true && s.started, 'a sandbox founding is a sandbox run');
  assert(s.finance.cash === SANDBOX_CASH, `and opens with the sandbox's funds (${s.finance.cash})`);
  assert(Object.keys(s.developing).length === 0, 'with nothing left under way');
  const placeable = s.tech.filter((t) => isPlaceableKind(t));
  const shut = placeable.filter((t) => t.status === 'locked');
  assert(shut.length === 0, `every building is open from the start (${shut.map((t) => t.id).join(', ')})`);
  const n = found(false);
  assert(n.tech.some((t) => isPlaceableKind(t) && t.status === 'locked'), 'while a normal run opens them over time');
  assert(n.sandbox === undefined, 'a normal founding is not a sandbox');
  assert(n.finance.cash < SANDBOX_CASH, 'and has its usual funds');
}

// ---- Buildings and courses finish at once; the funds stay full ----
{
  let s: GameState = teachingCollege('Sandbox');
  s.pendingInterrupt = null;
  s.sandbox = true;
  s.finance.cash = 0;
  const t = s.tech.find((x) => x.kind === 'facility' && x.cost >= 5_000_000 && !x.requiresFaculty && !x.project)!;
  t.status = 'available';
  const spot = firstFreeSpot(s, t, footprintOf(t))!;
  // A no-op action settles the run: its funds are filled.
  s = reducer(s, { type: 'SAVE_GAME' });
  assert(s.finance.cash === SANDBOX_CASH, 'any action fills the funds');
  s = reducer(s, { type: 'PLACE_BUILDABLE', buildableId: t.id, row: spot.row, col: spot.col, facing: 0 });
  const built = s.tech.find((x) => x.id === t.id)!;
  assert(built.status === 'done' && s.developing[t.id] === undefined, `a building placed is finished at once (${built.status})`);
  assert(built.builtYear === s.clock.year, 'and dated this year');
  assert(s.finance.cash === SANDBOX_CASH, 'and the funds are full again');

  const course = s.tech.find((x) => x.kind === 'course' && !isPlaceableKind(x) && canStartDevelopment(s, x));
  assert(course !== undefined, 'a course can be started');
  if (course) {
    s = reducer(s, { type: 'START_DEVELOPMENT', nodeId: course.id });
    assert(s.tech.find((x) => x.id === course.id)!.status === 'done', 'a course started is taught at once');
  }

  s = reducer(s, { type: 'TICK' });
  assert(s.finance.cash >= SANDBOX_CASH && s.finance.weeksInTheRed === 0, `a week never draws the funds down (${s.finance.cash})`);
}

// ---- A normal run waits ----
{
  let s: GameState = teachingCollege('Normal');
  s.pendingInterrupt = null;
  const t = s.tech.find((x) => x.kind === 'facility' && x.cost >= 5_000_000 && !x.requiresFaculty && !x.project)!;
  t.status = 'available';
  s.finance.cash = t.cost + 1_000;
  const spot = firstFreeSpot(s, t, footprintOf(t))!;
  s = reducer(s, { type: 'PLACE_BUILDABLE', buildableId: t.id, row: spot.row, col: spot.col, facing: 0 });
  assert(s.tech.find((x) => x.id === t.id)!.status === 'developing', 'a normal run builds over weeks');
  assert(s.finance.cash === 1_000, 'and pays for it');
}

if (failures === 0) {
  console.log(`  all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
