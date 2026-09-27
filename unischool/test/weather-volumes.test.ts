// ---------------------------------------------------------------------
// The walls a building weathers on (src/components/weatherVolumes.ts,
// Plan 75A). Streaks, boarded windows and the derelict's grime were drawn
// on one box of the whole footprint, which for the buildings with open air
// in their plots laid grime across a village green, a hospital's forecourt
// and a stadium's open stands. Each form now weathers on the boxes it
// actually stands in, and every box lies inside its footprint.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { weatherVolumes } from '../src/components/weatherVolumes';
import { motifOf, wallHeightOf } from '../src/components/buildingSpec';
import { footprintOf, isPlaceableKind } from '../src/state/campusMap';
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

console.log('weather volume tests');

const CATALOGUE: Buildable[] = [...initialTech(), ...initialDorms(), ...initialFacilities()].filter(isPlaceableKind);
const at = (t: Buildable) => { const fp = footprintOf(t); return { col: 10, row: 10, w: fp.w, h: fp.h }; };
const volumesOf = (t: Buildable) => weatherVolumes(t, at(t), 'georgian');

for (const t of CATALOGUE) {
  const p = at(t);
  for (const v of volumesOf(t)) {
    const inside = v.col >= p.col - 1e-9 && v.row >= p.row - 1e-9 && v.col + v.w <= p.col + p.w + 1e-9 && v.row + v.h <= p.row + p.h + 1e-9;
    assert(inside && v.w > 0 && v.h > 0 && v.height > 0, `${t.id}: every weathered box stands inside its footprint`);
  }
}

const find = (pick: (t: Buildable) => boolean) => CATALOGUE.find(pick)!;
const village = find((t) => motifOf(t) === 'village');
assert(volumesOf(village).length > 5, 'a village weathers house by house, not across its green');
assert(volumesOf(village).filter((v) => v.tarp).length > 0, 'and a derelict one has a tarpaulin on a house');

const stadium = find((t) => t.facilityType === 'footballStadium');
assert(volumesOf(stadium).length === 0, 'a stadium of open stands has no outer wall to weather');
assert(volumesOf({ ...stadium, expansions: 2 }).length === 1, 'until its bowl closes');
assert(volumesOf({ ...stadium, expansions: 2 })[0]!.boards === false, 'and it has no windows to board');

const hospital = find((t) => motifOf(t) === 'block' && Math.min(footprintOf(t).w, footprintOf(t).h) >= 7);
const [slab, wing] = volumesOf(hospital);
assert(volumesOf(hospital).length === 2 && wing!.height < slab!.height, 'the hospital weathers as its ward slab and its lower wing');

const tower = find((t) => motifOf(t) === 'tower');
const [podium, shaft] = volumesOf(tower);
assert(podium!.base === 0 && shaft!.base === podium!.height && shaft!.w < podium!.w, 'a tower weathers as its podium and its slimmer shaft');

for (const id of ['LANDMARK-CAMPANILE', 'LANDMARK-DOME', 'LANDMARK-GATE']) {
  const t = find((x) => x.id === id);
  const [v] = volumesOf(t);
  assert(volumesOf(t).length === 1 && v!.height < wallHeightOf(t), `${id} weathers on its own masonry, not a box to its full height`);
}
assert(CATALOGUE.filter((t) => motifOf(t) === 'grounds').every((t) => volumesOf(t).length === 0), 'open ground weathers nowhere');
const hall = find((t) => t.id === 'HALL-01');
assert(volumesOf(hall).length === 1 && volumesOf(hall)[0]!.height === wallHeightOf(hall), 'a hall still weathers as one box');

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
