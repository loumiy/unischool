// The campus scene's static layer (src/components/campusLayout.ts): its key
// holds through a week in which nothing on the map changed, so the scene's
// memo skips it, and moves whenever something drawn does. A key that moves
// every week costs the frame rate; a key that misses a change leaves a stale
// campus on screen, which is the worse failure, so most checks are that one.

import { createInitialState } from '../src/state/actions';
import { reducer } from '../src/engine/reducer';
import { campusLayout } from '../src/components/campusLayout';
import { firstFreeSpot, footprintOf } from '../src/state/campusMap';
import { bindScriptStream } from '../src/engine/random';
import type { GameState } from '../src/state/types';

bindScriptStream(2424);
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

console.log('campus layout tests');

const key = (s: GameState) => campusLayout(s).key;
const quiet = (): GameState => {
  const s = createInitialState('Layout');
  s.pendingInterrupt = null;
  return s;
};

// ---- A quiet week keeps the key ----
{
  const s = quiet();
  const next = reducer(s, { type: 'TICK' });
  assert(next.placements !== s.placements, 'the reducer hands back new records every week');
  assert(key(next) === key(s), 'but a week in which nothing on the map changed keeps the key');
}

// ---- A construction countdown keeps the key; the site finishing moves it ----
{
  let s = quiet();
  const dorm = s.tech.find((t) => t.id === 'DORM-01')!;
  const spot = firstFreeSpot(s, dorm, footprintOf(dorm))!;
  const before = key(s);
  s = reducer(s, { type: 'PLACE_BUILDABLE', buildableId: 'DORM-01', row: spot.row, col: spot.col, rotated: false });
  assert(key(s) !== before, 'placing a building moves the key');
  assert(campusLayout(s).byId.get('DORM-01')?.developing === true, 'and it stands as a site');
  const siteKey = key(s);
  s.pendingInterrupt = null;
  s = reducer(s, { type: 'TICK' });
  assert(s.developing['DORM-01'] !== undefined, 'a week later the dorm is still going up');
  assert(key(s) === siteKey, 'and a week off the countdown keeps the key');
  for (let i = 0; i < 60 && s.developing['DORM-01'] !== undefined; i++) {
    s.pendingInterrupt = null;
    s = reducer(s, { type: 'TICK' });
  }
  assert(campusLayout(s).byId.get('DORM-01')?.developing === false, 'the dorm finishes');
  assert(key(s) !== siteKey, 'and finishing moves the key');
}

// ---- Everything else the scene draws moves the key ----
{
  const s = quiet();
  const base = key(s);
  const tile = { row: 3, col: 3 };
  const paved = reducer(s, { type: 'ADD_PATH_TILE', tile });
  assert(key(paved) !== base, 'a path tile moves the key');
  const planted = structuredClone(s);
  planted.trees['1,1'] = 7;
  assert(key(planted) !== base, 'a tree moves the key');
  const gothic = structuredClone(s);
  gothic.self.vernacular = gothic.self.vernacular === 'gothic' ? 'georgian' : 'gothic';
  assert(key(gothic) !== base, 'the vernacular moves the key');
  const renamed = structuredClone(s);
  const placedId = Object.keys(renamed.placements)[0];
  const t = renamed.tech.find((x) => x.id === placedId)!;
  t.name = `${t.name} (renamed)`;
  assert(key(renamed) !== base, 'a renamed building moves the key');
  const grown = structuredClone(s);
  grown.tech.find((x) => x.id === placedId)!.floorsAdded = 2;
  assert(key(grown) !== base, 'added floors move the key');
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
