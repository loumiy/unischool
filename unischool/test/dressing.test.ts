// Lamps, banner lamps, benches, flower beds and bike racks
// (src/components/dressing.tsx, the reducer's PLACE_DRESSING and
// REMOVE_DRESSING): placed by the player anywhere on open land, never on a
// building or the road, kept by a save; racks appear on their own once the
// college is big enough. A first-tier quad's lawn is open land, its walks
// and centrepiece are not, and the Grand Quad takes none (Plan 115H).

import { createInitialState } from '../src/state/actions';
import { reducer } from '../src/engine/reducer';
import { campusLayout } from '../src/components/campusLayout';
import { BIKE_RACK_ENROLMENT, dressingProps } from '../src/components/dressing';
import { BENCH_FACINGS, benchFacingOf, dressingKindOf, turnFacing } from '../src/state/dressing';
import { quadTile } from '../src/state/quadGeometry';
import { dressingRefusal } from '../src/components/buildReasons';
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

// ---- Placed on open land, off the buildings and the road ----
{
  let s = fresh();
  s.pathways['10,10'] = true;
  s = reducer(s, { type: 'PLACE_DRESSING', tile: { row: 10, col: 11 }, kind: 'lamp' });
  assert(s.dressing?.['10,11'] === 'lamp', 'a lamp stands beside a path');
  s = reducer(s, { type: 'PLACE_DRESSING', tile: { row: 10, col: 10 }, kind: 'bench' });
  assert(s.dressing?.['10,10'] !== undefined && dressingKindOf(s.dressing['10,10']) === 'bench', 'a bench on one');
  s = reducer(s, { type: 'PLACE_DRESSING', tile: { row: 12, col: 12 }, kind: 'lamp' });
  assert(s.dressing?.['12,12'] === 'lamp', 'and out on the lawn, no path near it');
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

// ---- On a quad's lawn, off its walks and centrepiece (Plan 115H) ----
{
  let s = fresh();
  const quad = s.tech.find((t) => t.facilityType === 'quad' && t.tier === 1)!;
  const grand = s.tech.find((t) => t.facilityType === 'quad' && t.tier === 2)!;
  const q = { row: 14, col: 30, w: 9, h: 9 };
  const g = { row: 30, col: 30, w: 13, h: 13 };
  s.placements[quad.id] = q;
  s.placements[grand.id] = g;
  const kinds = { lawn: [] as { row: number; col: number }[], walk: [] as { row: number; col: number }[], blocked: [] as { row: number; col: number }[] };
  for (let r = q.row; r < q.row + q.h; r++) for (let c = q.col; c < q.col + q.w; c++) kinds[quadTile(q.col, q.row, q.w, q.h, 1, c, r)].push({ row: r, col: c });
  assert(kinds.lawn.length > 0 && kinds.walk.length > 0 && kinds.blocked.length > 0, 'the quad has lawn, walks and a centrepiece');
  const lawn = kinds.lawn[0]!;
  s = reducer(s, { type: 'PLACE_DRESSING', tile: lawn, kind: 'bench' });
  assert(dressingKindOf(s.dressing?.[`${lawn.row},${lawn.col}`] ?? 'lamp') === 'bench', "a bench goes on a quad's lawn");
  assert(dressingRefusal(s, lawn.row, lawn.col) === null, 'and the map does not refuse it');
  assert(dressingProps(campusLayout(s)).some((p) => p.key === `d-${lawn.row},${lawn.col}`), 'and it is drawn');
  for (const tile of [...kinds.walk, ...kinds.blocked]) s = reducer(s, { type: 'PLACE_DRESSING', tile, kind: 'bench' });
  assert([...kinds.walk, ...kinds.blocked].every((tile) => !(`${tile.row},${tile.col}` in (s.dressing ?? {}))), "but not on the quad's walks or its centrepiece");
  const walk = kinds.walk[0]!;
  assert(dressingRefusal(s, walk.row, walk.col) === `Only on the lawn of ${quad.name}`, "and the map says it goes on the lawn");
  let grandTiles = 0;
  for (let r = g.row; r < g.row + g.h; r++) for (let c = g.col; c < g.col + g.w; c++) {
    s = reducer(s, { type: 'PLACE_DRESSING', tile: { row: r, col: c }, kind: 'lamp' });
    if (`${r},${c}` in (s.dressing ?? {})) grandTiles += 1;
  }
  assert(grandTiles === 0, `nor anywhere on the Grand Quad (${grandTiles} tiles took one)`);
  assert(dressingRefusal(s, g.row + 2, g.col + 2) === `${grand.name} stands here`, 'which the map refuses as a building');
  // A load keeps the bench on the lawn, and drops one on a walk.
  const walkKey = `${walk.row},${walk.col}`;
  s.dressing = { ...s.dressing, [walkKey]: 'bench-s' };
  s.started = true;
  // Built, so the load keeps its site.
  for (const t of s.tech) if (t.facilityType === 'quad') t.status = 'done';
  store.clear();
  store.set(SAVE_KEY, JSON.stringify({ version: SAVE_VERSION, savedAt: 0, state: s }));
  const loaded = loadGame()!.dressing ?? {};
  assert(`${lawn.row},${lawn.col}` in loaded && !(walkKey in loaded), "a save keeps the bench on the lawn, not one on a walk");
}

// ---- Banner lamps and flower beds ----
{
  let s = fresh();
  s = reducer(s, { type: 'PLACE_DRESSING', tile: { row: 30, col: 30 }, kind: 'bannerLamp' });
  assert(s.dressing?.['30,30'] === 'bannerLamp' && dressingKindOf(s.dressing['30,30']) === 'bannerLamp', 'a banner lamp stands on the lawn');
  for (let c = 31; c <= 33; c++) s = reducer(s, { type: 'PLACE_DRESSING', tile: { row: 32, col: c }, kind: 'flowerbed' });
  assert(['32,31', '32,32', '32,33'].every((k) => s.dressing?.[k] === 'flowerbed'), 'flower beds plant a border');
  assert(benchFacingOf('flowerbed') === null && benchFacingOf('bannerLamp') === null, 'neither has a facing');
  const props = dressingProps(campusLayout(s));
  assert(['d-30,30', 'd-32,31', 'd-32,32', 'd-32,33'].every((k) => props.some((p) => p.key === k)), 'and each is drawn');
  // A banner lamp flies the college's colors without an occasion; a lamp
  // does not.
  setCamera({ azimuth: Math.PI / 4, pitch: DEFAULT_PITCH });
  const markup = (key: string) => renderToStaticMarkup(createElement('svg', null, props.find((p) => p.key === key)!.node));
  assert(markup('d-30,30').includes(s.self.colors.primary) && markup('d-30,30').includes(s.self.colors.secondary), "a banner lamp's banners are the college's colors");
  // A bed meets its neighbor without an edge between them: the middle one
  // of three runs the full width of its tile along the row.
  assert(markup('d-32,32') !== markup('d-32,31'), 'a bed in a border is drawn as one of a run');
  // Saved and loaded.
  store.clear();
  localStorage.setItem(SAVE_KEY, JSON.stringify({ version: SAVE_VERSION, savedAt: 0, state: s }));
  const loaded = loadGame();
  assert(loaded?.dressing?.['30,30'] === 'bannerLamp' && loaded?.dressing?.['32,32'] === 'flowerbed', 'a save keeps both');
  s = reducer(s, { type: 'REMOVE_DRESSING', tile: { row: 32, col: 32 } });
  assert(!('32,32' in (s.dressing ?? {})), 'and a bed can be lifted');
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
