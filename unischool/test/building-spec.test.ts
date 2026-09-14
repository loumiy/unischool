// ---------------------------------------------------------------------
// The campus's unit system (src/components/campusScale.ts) and the
// dimensional spec derived from it (src/components/buildingSpec.ts).
//
// This pins the thing the art brief actually asked for: that a storey means
// the SAME THING on every building on the map, and that a building's height
// and its floor count can never disagree. Both used to be authored in separate
// tables with no arithmetic between them, which is how a storey came to be
// 6.1 m in a residential tower and 26.3 m in a gym.
//
// Run over the REAL catalogue — every placeable Buildable the game can build —
// rather than over invented examples, so a new rung added to a chain without a
// storey count is caught here rather than by eye.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { TILE_H, TILE_W } from '../src/components/isoProjection';
import {
  METRES_PER_TILE, PITCH, STOREY, STOREY_METRES, UNITS_PER_TILE_UP, across, up,
} from '../src/components/campusScale';
import {
  TOWER_PODIUM_STOREYS, motifOf, ridgeOf, storeysOf, wallHeightOf, windowRanksOf,
} from '../src/components/buildingSpec';
import { isPlaceableKind } from '../src/state/campusMap';
import { initialTech } from '../src/data/techData';
import { initialDorms } from '../src/data/campusData';
import { initialFacilities } from '../src/data/facilitiesData';
import type { Buildable } from '../src/state/types';

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}
const near = (a: number, b: number, tol = 1e-9) => Math.abs(a - b) <= tol;

const CATALOGUE: Buildable[] = [...initialTech(), ...initialDorms(), ...initialFacilities()]
  .filter(isPlaceableKind);
const byId = (id: string) => CATALOGUE.find((t) => t.id === id);

console.log('campus scale and building spec');

// --- 1. The scale is DERIVED from the projection, not chosen ---------------
{
  assert(near(PITCH, Math.asin(TILE_H / TILE_W)), 'the camera pitch comes out of the projection\'s own constants');
  assert(near(UNITS_PER_TILE_UP, (TILE_W / Math.SQRT2) * Math.cos(PITCH)),
    'a tile of height is foreshortened by cos(pitch), not assumed to be TILE_W / 2');
  assert(near(up(METRES_PER_TILE), UNITS_PER_TILE_UP),
    'up() and the tile agree: one tile of height is METRES_PER_TILE metres');
  assert(near(across(METRES_PER_TILE), 1), 'across() and the tile agree on the ground, too');
  assert(near(STOREY, up(STOREY_METRES)), 'a storey is its own height in metres and nothing else');
  // The number this replaced. If the derivation ever drifts far from it, the
  // campus silently rescales — so the agreement is asserted, not admired.
  assert(Math.abs(STOREY - 17) < 0.1,
    `the derived storey lands on the 17 units buildingMotifs already used for an added floor (got ${STOREY.toFixed(2)})`);
  // And the shortcut that was wrong: TILE_W / 2 understates height by ~18%,
  // which is exactly the "stylistic" exaggeration it then needed.
  assert(Math.abs(UNITS_PER_TILE_UP / (TILE_W / 2) - 1.22) < 0.01,
    'the TILE_W/2 shortcut understates height by the 1.22x a fudge factor was compensating for');
}

// --- 2. ONE storey height, campus-wide ------------------------------------
{
  const storeyed = CATALOGUE.filter((t) => storeysOf(t) > 0);
  assert(storeyed.length > 30, `the catalogue has plenty of storeyed buildings to compare (${storeyed.length})`);

  let worst: { id: string; metres: number } | null = null;
  for (const t of storeyed) {
    const metres = (wallHeightOf(t) / storeysOf(t)) / (UNITS_PER_TILE_UP / METRES_PER_TILE);
    if (!worst || Math.abs(metres - STOREY_METRES) > Math.abs(worst.metres - STOREY_METRES)) {
      worst = { id: t.id, metres };
    }
  }
  assert(worst !== null && near(worst.metres, STOREY_METRES, 1e-9),
    `every building's storey is ${STOREY_METRES} m (worst: ${worst?.id} at ${worst?.metres.toFixed(3)} m)`);
}

// --- 3. Height and floor count cannot disagree ----------------------------
{
  for (const t of CATALOGUE) {
    const storeys = storeysOf(t);
    if (storeys === 0) continue;
    if (!near(wallHeightOf(t), storeys * STOREY)) {
      assert(false, `${t.id}: wall height is its storey count times STOREY`);
      break;
    }
    if (windowRanksOf(t) !== storeys) {
      assert(false, `${t.id}: one rank of windows per storey`);
      break;
    }
  }
  assert(true, 'every storeyed building: height = storeys x STOREY, and one window rank per storey');
}

// --- 4. Clear-span volumes have a height but no floors --------------------
{
  const clearSpan = CATALOGUE.filter((t) => ['hangar', 'bowl'].includes(motifOf(t)));
  assert(clearSpan.length > 0, 'the catalogue has clear-span venues');
  assert(clearSpan.every((t) => storeysOf(t) === 0),
    'a gym, a pool hall and a stadium have no storeys — they are one volume');
  assert(clearSpan.every((t) => wallHeightOf(t) > 0), 'but they still stand up');
  assert(clearSpan.every((t) => windowRanksOf(t) === 1),
    'and are lit by one continuous band rather than by ranks');
  const grounds = CATALOGUE.filter((t) => motifOf(t) === 'grounds');
  assert(grounds.every((t) => wallHeightOf(t) === 0 && ridgeOf(t) === 0),
    'open ground has no mass at all');
}

// --- 5. A renovation adds a REAL floor ------------------------------------
{
  const library = CATALOGUE.find((t) => t.facilityType === 'library');
  assert(library !== undefined, 'the catalogue has a library');
  if (library) {
    const base = storeysOf(library);
    const renovated = { ...library, floorsAdded: 3 };
    assert(storeysOf(renovated) === base + 3, 'three added floors are three more storeys');
    assert(near(wallHeightOf(renovated) - wallHeightOf(library), 3 * STOREY),
      'and they raise the building by three storeys — not by half of one, as the old 17-against-34 did');
    assert(windowRanksOf(renovated) === base + 3, 'each added floor brings its own rank of windows');
  }
}

// --- 6. The chains are legible as HEIGHT, not just as numbers -------------
{
  const dorm = (beds: number) => CATALOGUE.find((t) => t.kind === 'dorm' && (t.effects?.capacityBonus ?? 0) === beds);
  const founding = dorm(350); const early = dorm(500); const mid = dorm(1_000); const tower = dorm(5_000);
  assert(!!founding && !!early && !!mid && !!tower, 'the housing chain covers all four size classes');
  if (founding && early && mid && tower) {
    assert(storeysOf(founding) < storeysOf(early), 'the founding hall is shorter than an ordinary one');
    assert(storeysOf(early) === 4, 'a 500-bed hall is the four-storey residence hall campusData.ts calls it');
    assert(storeysOf(early) < storeysOf(mid), 'a 1,000-bed hall is taller than a 500-bed one');
    assert(storeysOf(mid) < storeysOf(tower), 'and a tower is taller than both');
    assert(storeysOf(tower) > TOWER_PODIUM_STOREYS, 'a tower has a shaft above its podium');
  }

  const hall = byId('BLDG-GENSTUDIES');
  assert(!!hall, 'Founders Hall is in the catalogue');
  if (hall && mid && early) {
    // A residence hall genuinely is taller than the teaching building it
    // serves. On the old table every hall stood at 84 and every dorm at 54.
    assert(wallHeightOf(mid) > wallHeightOf(hall), 'a high-rise residence hall stands over the academic halls');
    assert(near(wallHeightOf(early), wallHeightOf(hall)), 'and a four-storey one stands level with them');
  }

  const hospital = CATALOGUE.find((t) => t.facilityType === 'healthCenter' && (t.effects?.servesPopulation ?? 0) >= 20_000);
  const counselling = CATALOGUE.filter((t) => t.facilityType === 'healthCenter')
    .sort((a, b) => (a.effects?.servesPopulation ?? 0) - (b.effects?.servesPopulation ?? 0))[0];
  assert(!!hospital && !!counselling, 'the health chain has both ends');
  if (hospital && counselling && hall) {
    assert(storeysOf(hospital) > storeysOf(hall), 'the teaching hospital towers over a teaching hall');
    assert(storeysOf(counselling) < storeysOf(hospital),
      'and a counselling centre is not the same building relabelled');
  }
}

// --- 7. Nothing in the catalogue is missing a spec -------------------------
{
  for (const t of CATALOGUE) {
    const h = wallHeightOf(t);
    if (!Number.isFinite(h) || h < 0) { assert(false, `${t.id}: has a real wall height`); break; }
    if (motifOf(t) !== 'grounds' && h <= 0) { assert(false, `${t.id}: stands up`); break; }
  }
  assert(true, `all ${CATALOGUE.length} placeable Buildables carry a usable spec`);
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
