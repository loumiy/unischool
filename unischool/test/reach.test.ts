// The road and reachability (src/state/reach.ts, campusMap.ts's road): every
// building has a way on foot from the road, nothing is sited that walls one
// off, and nothing is built, paved or planted on the road. The map is
// cosmetic, so what these pin is the player's siting rules and the saves'
// hygiene, never the simulation.

import { createInitialState } from '../src/state/actions';
import { reducer } from '../src/engine/reducer';
import {
  ROAD_FIRST_ROW, canPlace, firstFreeSpot, footprintOf, isRoadTile, parsePathTileKey, placementFor,
} from '../src/state/campusMap';
import { reachFromRoad, reachable, siteRefusal } from '../src/state/reach';
import { SAVE_KEY, SAVE_VERSION, loadGame } from '../src/state/persistence';
import { bindScriptStream } from '../src/engine/random';
import type { Buildable, GameState } from '../src/state/types';
import { CAMPUS_GRID_WIDTH } from '../src/state/types';

bindScriptStream(2425);
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

console.log('reach tests');

const fresh = (): GameState => {
  const s = createInitialState('Reach');
  s.pendingInterrupt = null;
  return s;
};
const node = (s: GameState, id: string): Buildable => s.tech.find((t) => t.id === id)!;
// Stands a Buildable at a site directly, as a built campus would have it.
function stand(s: GameState, id: string, row: number, col: number, w: number, h: number): void {
  node(s, id).status = 'done';
  s.placements[id] = { row, col, w, h };
}
// Placeable Buildables to wall with, any that are not quads.
const walls = (s: GameState) => s.tech.filter((t) => (t.kind === 'dorm' || t.kind === 'facility') && t.facilityType !== 'quad' && !(t.id in s.placements));

// ---- The road ----
{
  const s = fresh();
  assert(Object.keys(s.trees).every((k) => { const t = parsePathTileKey(k)!; return !isRoadTile(t.row, t.col); }), 'no founding tree stands on the road');
  const dorm = node(s, 'DORM-01');
  const fp = footprintOf(dorm);
  assert(siteRefusal(s, dorm, ROAD_FIRST_ROW - fp.h + 1, 10, fp) !== null, 'a building may not overhang the road');
  assert(siteRefusal(s, dorm, ROAD_FIRST_ROW - fp.h, 10, fp) === null, 'but may stand right beside it');
  const paved = reducer(s, { type: 'ADD_PATH_TILE', tile: { row: ROAD_FIRST_ROW, col: 5 } });
  assert(Object.keys(paved.pathways).length === 0, 'the road cannot be paved over');
  const planted = reducer(s, { type: 'PLANT_TREE', tile: { row: ROAD_FIRST_ROW + 1, col: 5 } });
  assert(!(`${ROAD_FIRST_ROW + 1},5` in planted.trees), 'nor planted');
  const reach = reachFromRoad(s);
  for (const [id, p] of Object.entries(s.placements)) assert(reachable(reach, p), `${id} is reachable at founding`);
}

// ---- Walling off ----
{
  const s = fresh();
  const [a, b, c, d, e] = walls(s);
  // A 3x3 hole at rows 10-12, cols 10-12, with a building on three sides of it.
  stand(s, a.id, 7, 7, 9, 3);    // north
  stand(s, b.id, 10, 7, 3, 3);   // west
  stand(s, c.id, 10, 13, 3, 3);  // east
  const target = node(s, 'DORM-01');
  // The last side closes the ring, with the hole empty: refused as walling
  // nothing yet, but a building placed in the hole first is walled off.
  const inHole = { row: 10, col: 10, w: 3, h: 3 };
  stand(s, d.id, inHole.row, inHole.col, inHole.w, inHole.h);
  assert(reachable(reachFromRoad(s), inHole), 'a building in a three-sided hole is reachable from its open side');
  const south = { w: 9, h: 3 };
  const why = siteRefusal(s, e, 13, 7, south);
  assert(why !== null && why.startsWith('it would wall off'), `closing the ring is refused, naming what it walls off (${why})`);
  assert(!canPlace(s, { ...e, status: 'available' }, 13, 7, south), 'and canPlace agrees');
  // A building sited into a closed pocket has no way in.
  delete s.placements[d.id];
  node(s, d.id).status = 'available';
  stand(s, e.id, 13, 7, 9, 3);
  const pocket = siteRefusal(s, target, 10, 10, { w: 3, h: 3 });
  assert(pocket === 'no way to walk to it from the road', `a site in a closed pocket is refused (${pocket})`);
}

// ---- A quad is walked across ----
{
  const s = fresh();
  const quad = s.tech.find((t) => t.facilityType === 'quad' && !(t.id in s.placements))!;
  const [a, b, c, d, e] = walls(s);
  // The same three-sided hole with a building in it: closing the fourth side
  // with a quad leaves the building reachable across the green, where a
  // building there would wall it off.
  stand(s, a.id, 7, 7, 9, 3);
  stand(s, b.id, 10, 7, 3, 3);
  stand(s, c.id, 10, 13, 3, 3);
  stand(s, d.id, 10, 10, 3, 3);
  assert(siteRefusal(s, quad, 13, 7, { w: 9, h: 3 }) === null, 'a quad may close the ring: people cross it');
  assert(siteRefusal(s, e, 13, 7, { w: 9, h: 3 }) !== null, 'where a building may not');
  stand(s, quad.id, 13, 7, 9, 3);
  assert(reachable(reachFromRoad(s), s.placements[d.id]), 'and the building behind the quad is still reached across it');
}

// ---- The first free spot always leaves a way in ----
{
  const s = fresh();
  const all = walls(s).slice(0, 40);
  for (const t of all) {
    const fp = footprintOf(t);
    const spot = firstFreeSpot(s, t, fp);
    if (!spot) continue;
    s.placements[t.id] = placementFor(spot.row, spot.col, fp);
    t.status = 'done';
  }
  const reach = reachFromRoad(s);
  const cut = Object.entries(s.placements).filter(([id, p]) => node(s, id).facilityType !== 'quad' && !reachable(reach, p));
  assert(cut.length === 0, `forty buildings sited first-fit are all reachable (${cut.map(([id]) => id).join(', ')})`);
}

// ---- An older save's building on the road is moved, not lost ----
{
  const s = fresh();
  s.started = true;
  const dorm = node(s, 'DORM-01');
  const fp = footprintOf(dorm);
  dorm.status = 'done';
  s.placements[dorm.id] = { row: ROAD_FIRST_ROW - 1, col: 40, ...fp };
  s.pathways[`${ROAD_FIRST_ROW},3`] = true;
  s.trees[`${ROAD_FIRST_ROW},4`] = 99;
  store.set(SAVE_KEY, JSON.stringify({ version: SAVE_VERSION, savedAt: 0, state: s }));
  const loaded = loadGame()!;
  const p = loaded.placements[dorm.id];
  assert(p !== undefined, 'the dorm is still standing after load');
  assert(p !== undefined && p.row + p.h <= ROAD_FIRST_ROW && p.col >= 0 && p.col + p.w <= CAMPUS_GRID_WIDTH, 'and off the road');
  assert(!(`${ROAD_FIRST_ROW},3` in loaded.pathways), 'a path on the road is lifted');
  assert(!(`${ROAD_FIRST_ROW},4` in loaded.trees), 'a tree on the road is gone');
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
