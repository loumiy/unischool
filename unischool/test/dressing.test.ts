// Lamps, benches and bike racks (src/components/dressing.tsx, the reducer's
// PLACE_DRESSING and REMOVE_DRESSING): placed by the player on or beside a
// path, never on a building or the road, kept by a save; racks appear on
// their own once the college is big enough.

import { createInitialState } from '../src/state/actions';
import { reducer } from '../src/engine/reducer';
import { campusLayout } from '../src/components/campusLayout';
import { BIKE_RACK_ENROLMENT, dressingProps } from '../src/components/dressing';
import { BENCH_FACINGS, benchFacingOf, dressingKindOf, turnFacing } from '../src/state/dressing';
import { ROAD_FIRST_ROW } from '../src/state/campusMap';
import { SAVE_KEY, SAVE_VERSION, loadGame, readSave } from '../src/state/persistence';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DEFAULT_PITCH, setCamera } from '../src/components/isoProjection';
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
  assert(s.dressing?.['10,10'] !== undefined && dressingKindOf(s.dressing['10,10']) === 'bench', 'a bench on one');
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

// ---- A bench faces out across one edge of its tile (Plan 80I) ----
{
  const facing = (s: GameState, key: string) => (s.dressing?.[key] ? benchFacingOf(s.dressing[key]) : null);
  let s = fresh();
  // A walk along row 20, cols 10 to 16, and one down col 30.
  for (let c = 10; c <= 16; c++) s.pathways[`20,${c}`] = true;
  for (let r = 10; r <= 16; r++) s.pathways[`${r},30`] = true;
  const place = (row: number, col: number, f?: 'n' | 'e' | 's' | 'w') => {
    s = reducer(s, { type: 'PLACE_DRESSING', tile: { row, col }, kind: 'bench', ...(f ? { facing: f } : {}) });
  };
  place(19, 12); place(21, 12); place(12, 29); place(12, 31);
  assert(facing(s, '19,12') === 's' && facing(s, '21,12') === 'n', 'north of a walk a bench faces south onto it, south of it north');
  assert(facing(s, '12,29') === 'e' && facing(s, '12,31') === 'w', 'west of a walk it faces east, east of it west');
  place(20, 13);
  assert(facing(s, '20,13') === 'e', 'on the walk itself it faces along it (east before west)');
  place(19, 14, 'n');
  assert(facing(s, '19,14') === 'n', 'turned with R, it keeps the facing it was given, its back to the walk');
  place(19, 12, 'w');
  assert(facing(s, '19,12') === 'w', 'and a bench set again on its own tile takes the new facing');
  assert(lampsKept(s), 'lamps are stored as they were');
  assert(JSON.stringify(BENCH_FACINGS.map(turnFacing)) === JSON.stringify(['e', 's', 'w', 'n']), 'R turns a quarter clockwise: north, east, south, west');
  // Drawn at every facing and view, each part inside its own tile.
  const views = [0, 1, 2, 3].map((k) => Math.PI / 4 + (k * Math.PI) / 2);
  let inside = true;
  for (const f of BENCH_FACINGS) {
    s.dressing = { '40,40': `bench-${f}` };
    s.pathways['41,40'] = true;
    const props = dressingProps(campusLayout(s)).filter((p) => p.key === 'd-40,40');
    if (props.length !== 1 || props[0].w !== 1 || props[0].h !== 1) inside = false;
    for (const azimuth of views) {
      setCamera({ azimuth, pitch: DEFAULT_PITCH });
      const svg = renderToStaticMarkup(createElement('svg', null, props[0].node));
      if (!svg.includes('campus-bench-seat') || !svg.includes('campus-bench-back') || (svg.match(/campus-bench-iron/g) ?? []).length !== 2) inside = false;
    }
  }
  setCamera({ azimuth: Math.PI / 4, pitch: DEFAULT_PITCH });
  assert(inside, 'a bench at each facing and view is one 1x1 prop with a slatted seat, a slatted back and two iron ends');
}

function lampsKept(s: GameState): boolean {
  const t = fresh();
  t.pathways = s.pathways;
  const u = reducer(t, { type: 'PLACE_DRESSING', tile: { row: 19, col: 11 }, kind: 'lamp' });
  return u.dressing?.['19,11'] === 'lamp';
}

// ---- A save from before (version 81) keeps each bench as it was drawn ----
{
  const raw = readFileSync(join(process.cwd(), 'test/fixtures/save-v81.json'), 'utf8');
  const parsed = JSON.parse(raw) as { version: number; state: { dressing?: Record<string, string>; pathways: Record<string, true> } };
  const before = Object.entries(parsed.state.dressing ?? {});
  assert(parsed.version === 81 && before.some(([, v]) => v === 'bench') && before.some(([, v]) => v === 'lamp'),
    'the fixture was written at version 81, with benches and a lamp stored without a facing');
  const read = readSave(raw);
  assert(!('refused' in read), 'it loads');
  if (!('refused' in read)) {
    const after = read.state.dressing ?? {};
    const pathways = parsed.state.pathways;
    let kept = true;
    for (const [key, v] of before) {
      const [row, col] = key.split(',').map(Number);
      // dressing.tsx's old rule: along the row, facing east, with paving east
      // or west of it; else along the column, facing south.
      const was = `${row},${col - 1}` in pathways || `${row},${col + 1}` in pathways ? 'e' : 's';
      if (v === 'lamp' ? after[key] !== 'lamp' : after[key] !== `bench-${was}`) kept = false;
    }
    assert(kept && Object.keys(after).length === before.length, 'every bench faces the way it was drawn, and the lamp is a lamp');
    assert(before.some(([k, v]) => v === 'bench' && after[k] === 'bench-e') && before.some(([k, v]) => v === 'bench' && after[k] === 'bench-s'),
      'the fixture has a bench of each old kind (east and south)');
    assert(SAVE_VERSION >= 82, `at version 82 or later (${SAVE_VERSION})`);
  }
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
  s.dressing = {
    '10,11': 'lamp', '10,12': 'bench-w', [`${hall.row},${hall.col}`]: 'bench-s', [`${ROAD_FIRST_ROW},3`]: 'lamp',
    '9,9': 'fountain' as 'lamp', '9,10': 'bench' as 'lamp', '9,11': 'bench-x' as 'lamp',
  };
  store.set(SAVE_KEY, JSON.stringify({ version: SAVE_VERSION, savedAt: 0, state: s }));
  assert(JSON.stringify(loadGame()!.dressing) === JSON.stringify({ '10,11': 'lamp', '10,12': 'bench-w' }),
    'only the lamp and the bench on open land survive a load, the bench with its facing; a bench with no facing is dropped');
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
