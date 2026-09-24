// Lamps, benches and bike racks (src/components/dressing.tsx, the reducer's
// PLACE_DRESSING and REMOVE_DRESSING): placed by the player on or beside a
// path, never on a building or the road, kept by a save; racks appear on
// their own once the college is big enough.

import { createInitialState } from '../src/state/actions';
import { reducer } from '../src/engine/reducer';
import { campusLayout } from '../src/components/campusLayout';
import { BIKE_RACK_ENROLMENT, dressingProps } from '../src/components/dressing';
import { ROAD_FIRST_ROW } from '../src/state/campusMap';
import { SAVE_KEY, SAVE_VERSION, loadGame } from '../src/state/persistence';
import { bindScriptStream } from '../src/engine/random';
import { crowdedVenues, isCommencement } from '../src/components/mapOccasions';
import { OCCASIONS } from '../src/systems/athletics/season';
import { FOUNDERS_HALL_ID } from '../src/data/techData';
import { WEEKS_PER_YEAR } from '../src/state/types';
import type { GameState } from '../src/state/types';

bindScriptStream(2429);
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

console.log('dressing tests');

function fresh(): GameState {
  const s = createInitialState('Dressing');
  s.pendingInterrupt = null;
  return s;
}

// ---- Placed beside a path, and only there ----
{
  let s = fresh();
  s.pathways['10,10'] = true;
  s = reducer(s, { type: 'PLACE_DRESSING', tile: { row: 10, col: 11 }, kind: 'lamp' });
  assert(s.dressing?.['10,11'] === 'lamp', 'a lamp stands beside a path');
  s = reducer(s, { type: 'PLACE_DRESSING', tile: { row: 10, col: 10 }, kind: 'bench' });
  assert(s.dressing?.['10,10'] === 'bench', 'a bench on one');
  s = reducer(s, { type: 'PLACE_DRESSING', tile: { row: 12, col: 12 }, kind: 'lamp' });
  assert(!('12,12' in (s.dressing ?? {})), 'but not out on the lawn');
  const [hallId, hall] = Object.entries(s.placements)[0];
  s.pathways[`${hall.row},${hall.col - 1}`] = true;
  s = reducer(s, { type: 'PLACE_DRESSING', tile: { row: hall.row, col: hall.col }, kind: 'lamp' });
  assert(!(`${hall.row},${hall.col}` in (s.dressing ?? {})), `nor inside ${hallId}`);
  s.pathways[`${ROAD_FIRST_ROW - 1},5`] = true;
  s = reducer(s, { type: 'PLACE_DRESSING', tile: { row: ROAD_FIRST_ROW, col: 5 }, kind: 'lamp' });
  assert(!(`${ROAD_FIRST_ROW},5` in (s.dressing ?? {})), 'nor on the road');
  s = reducer(s, { type: 'REMOVE_DRESSING', tile: { row: 10, col: 11 } });
  assert(!('10,11' in (s.dressing ?? {})), 'and a lamp can be lifted');
  assert(dressingProps(campusLayout(s)).some((p) => p.key === 'd-10,10'), 'what stands is drawn');
}

// ---- Bike racks come with size ----
{
  const s = fresh();
  const dorm = s.tech.find((t) => t.id === 'DORM-01')!;
  dorm.status = 'done';
  s.placements[dorm.id] = { row: 30, col: 30, w: 7, h: 3 };
  for (const c of Object.keys(s.students.classes) as (keyof GameState['students']['classes'])[]) s.students.classes[c] = 100;
  assert(!dressingProps(campusLayout(s)).some((p) => p.key.startsWith('r-')), 'a small college has no bike racks');
  for (const c of Object.keys(s.students.classes) as (keyof GameState['students']['classes'])[]) s.students.classes[c] = BIKE_RACK_ENROLMENT;
  const racks = dressingProps(campusLayout(s)).filter((p) => p.key.startsWith('r-'));
  assert(racks.some((p) => p.key === 'r-DORM-01' && p.row === 33), 'a big one has a rack at the dorm door');
}

// ---- A save keeps them, and drops what cannot stand ----
{
  const s = fresh();
  s.started = true;
  const [, hall] = Object.entries(s.placements)[0];
  s.dressing = { '10,11': 'lamp', [`${hall.row},${hall.col}`]: 'bench', [`${ROAD_FIRST_ROW},3`]: 'lamp', '9,9': 'fountain' as 'lamp' };
  store.set(SAVE_KEY, JSON.stringify({ version: SAVE_VERSION, savedAt: 0, state: s }));
  assert(JSON.stringify(loadGame()!.dressing) === JSON.stringify({ '10,11': 'lamp' }), 'only the lamp on open land survives a load');
}

// ---- The flag, the crowds and the banners ----
{
  const s = fresh();
  assert(FOUNDERS_HALL_ID in s.placements && dressingProps(campusLayout(s)).some((p) => p.key === 'flag'), 'the flag flies at Founders Hall');
  const field = s.tech.find((t) => t.facilityType === 'athleticsField')!;
  field.status = 'done';
  s.placements[field.id] = { row: 5, col: 5, w: 22, h: 13 };
  s.clock.week = OCCASIONS[0].week;
  assert(crowdedVenues(s).length === 0, 'a field with no team has no crowd');
  s.orgs.teams.push({ venueCategory: 'athleticsField', status: 'active' } as GameState['orgs']['teams'][number]);
  assert(JSON.stringify(crowdedVenues(s)) === JSON.stringify([field.id]), 'with a team, it fills on a game week');
  s.clock.week = OCCASIONS[0].week + 1;
  assert(crowdedVenues(s).length === 0, 'and empties the week after');
  s.clock.week = WEEKS_PER_YEAR;
  assert(isCommencement(s), 'the last week of the year is commencement');
  s.clock.week = 10;
  assert(!isCommencement(s), 'a week in the fall is not');
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
