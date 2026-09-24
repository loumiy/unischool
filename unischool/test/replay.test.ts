// A run replays exactly: the same start and the same actions give the same
// state, byte for byte. This holds only while the reducer is pure and every
// draw comes from the stream carried in the state (engine/random.ts), so it
// is the test that guards both.

import { reducer } from '../src/engine/reducer';
import { replay, startRunLog } from '../src/engine/actionLog';
import { defaultAnswer } from '../src/engine/defaultAnswers';
import type { Action } from '../src/state/actions';
import { createPreStartState } from '../src/state/actions';
import { firstFreeSpot, footprintOf, isPlaceableKind } from '../src/state/campusMap';
import type { GameState } from '../src/state/types';
import { canStartDevelopment, eligibleInstructors } from '../src/systems/techtree/techSystem';
import { FOUNDING_VERNACULAR } from '../src/data/foundingData';
import { FOUNDING_COLORS, schoolColorsOf } from '../src/data/schoolColors';

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

const store = new Map<string, string>();
(globalThis as unknown as { localStorage: unknown }).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => { store.set(k, v); },
  removeItem: (k: string) => { store.delete(k); },
};

// A crude player: answers every interrupt with the shared defaults, starts
// any course it can staff, and builds the first affordable building on the
// first free ground. Enough to reach hiring, building, events, the summer
// and the rivals' drift, which is where the draws are.
function nextMove(s: GameState): Action {
  if (s.pendingInterrupt) {
    const answer = defaultAnswer(s);
    if (answer) return answer;
  }
  if (s.clock.week % 4 === 0) {
    const course = s.tech.find((t) => t.kind === 'course' && t.status === 'available' && canStartDevelopment(s, t, eligibleInstructors(s, t)[0]?.id));
    if (course) return { type: 'START_DEVELOPMENT', nodeId: course.id, facultyId: eligibleInstructors(s, course)[0]?.id };
    const building = s.tech.find((t) => isPlaceableKind(t) && t.status === 'available' && canStartDevelopment(s, t));
    const spot = building && firstFreeSpot(s.placements, footprintOf(building));
    if (building && spot) return { type: 'PLACE_BUILDABLE', buildableId: building.id, row: spot.row, col: spot.col, rotated: false };
  }
  return { type: 'TICK' };
}

function play(seed: number, years: number): { log: ReturnType<typeof startRunLog>; end: GameState } {
  let s = createPreStartState();
  const log = startRunLog(s);
  const dispatch = (a: Action) => {
    log.actions.push(a);
    s = reducer(s, a);
  };
  dispatch({ type: 'START_GAME', name: 'Replay', vernacular: FOUNDING_VERNACULAR, colors: schoolColorsOf(FOUNDING_COLORS), seed });
  while (s.clock.year <= years) dispatch(nextMove(s));
  return { log, end: s };
}

console.log('replay tests');

const YEARS = 4;
const first = play(777, YEARS);
const kinds = new Set(first.log.actions.map((a) => a.type));
assert(first.end.clock.year > YEARS, `the scripted run reaches year ${YEARS + 1}`);
assert(kinds.has('START_DEVELOPMENT') && kinds.has('PLACE_BUILDABLE'), `the run builds and develops (${[...kinds].join(', ')})`);
assert(first.end.history.length >= YEARS, 'and closes a summer every year');

const replayed = replay(first.log);
assert(JSON.stringify(replayed) === JSON.stringify(first.end), 'replaying the logged actions from the start gives the same state');

const again = play(777, YEARS);
assert(JSON.stringify(again.end) === JSON.stringify(first.end), 'the same seed played the same way gives the same state');

const other = play(778, YEARS);
assert(JSON.stringify(other.end) !== JSON.stringify(first.end), 'a different seed gives a different run');

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
