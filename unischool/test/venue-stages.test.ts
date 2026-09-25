// ---------------------------------------------------------------------
// VENUE STAGES (Plan 54). A venue's expansions show on the map: the fields
// and the diamond grow from the field alone to a small stand to full
// seating, the arena rises a storey with each of its two expansions, and
// the natatorium with its one.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { groundProps } from '../src/components/groundMarkings';
import { wallHeightOf } from '../src/components/buildingSpec';
import { footprintOf } from '../src/state/campusMap';
import { initialFacilities, nextVenueExpansion, venueExpansionsMax, venueSeatsOf } from '../src/data/facilitiesData';
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

console.log('venue stage tests');

const catalog = initialFacilities();
const byType = (type: string) => catalog.find((t) => t.facilityType === type)!;
const stands = (type: string, stage: number) => {
  const t = byType(type);
  const fp = footprintOf(t);
  return groundProps(t.facilityType, 0, 0, fp.w, fp.h, t.tier, false, t.id, stage).filter((p) => p.key.startsWith('stand')).length;
};

// ---- The fields: the field alone, a small stand, full seating ----
assert(stands('athleticsField', 0) === 0, 'a new multi-sport field has no stand');
assert(stands('athleticsField', 1) === 1, 'its first expansion adds one');
assert(stands('athleticsField', 2) === 1, 'its second, one longer covered grandstand (Plan 61: nothing on the track)');
{
  const t = byType('athleticsField'); const fp = footprintOf(t);
  assert(groundProps(t.facilityType, 0, 0, fp.w, fp.h, t.tier, false, t.id, 2).some((p) => p.key === 'scoreboard'), 'and a scoreboard standing in a corner');
}
assert(stands('athleticsDiamond', 0) === 0, 'a new diamond has no seating');
assert(stands('athleticsDiamond', 1) === 1, 'its first expansion, the stand behind the plate');
assert(stands('athleticsDiamond', 2) === 3, 'its second, the horseshoe down both lines');

// ---- The halls rise ----
const withExpansions = (t: Buildable, n: number): Buildable => ({ ...t, expansions: n });
for (const type of ['athleticsArena', 'athleticsNatatorium']) {
  const t = byType(type);
  const cap = venueExpansionsMax(t.id);
  const heights = Array.from({ length: cap + 1 }, (_, n) => wallHeightOf(withExpansions(t, n)));
  assert(heights.every((h, i) => i === 0 || h > heights[i - 1]), `the ${t.name} rises with each expansion (${heights.map((h) => h.toFixed(0)).join(' → ')})`);
}
assert(venueExpansionsMax(byType('athleticsArena').id) === 2, 'the arena rises two storeys');
assert(venueExpansionsMax(byType('athleticsNatatorium').id) === 1, 'the natatorium one');
assert(nextVenueExpansion(withExpansions(byType('athleticsNatatorium'), 1)) === null, 'and is offered no second');
assert(nextVenueExpansion(withExpansions(byType('footballStadium'), 1)) !== null, 'while the stadium is offered its full bowl');
{
  // The second deck (Plan 61): one more step, about 60% more seats.
  const stadium = byType('footballStadium');
  assert(venueExpansionsMax(stadium.id) === 3, 'the stadium has a third expansion, its second deck');
  const bowl = venueSeatsOf(withExpansions(stadium, 2));
  const deck = venueSeatsOf(withExpansions(stadium, 3));
  assert(Math.abs(deck / bowl - 1.6) < 0.01, `which adds about 60% to the full bowl (${bowl} to ${deck})`);
  const step2 = nextVenueExpansion(withExpansions(stadium, 1))!; const step3 = nextVenueExpansion(withExpansions(stadium, 2))!;
  assert(step3.cost > step2.cost && step3.seatsGain === deck - bowl, 'priced as the next step, and its seats as shown');
  assert(nextVenueExpansion(withExpansions(stadium, 3)) === null, 'and nothing after it');
}
{
  // The diamond's seating stands behind home plate (Plan 61).
  const t = byType('athleticsDiamond'); const fp = footprintOf(t);
  const plate = groundProps(t.facilityType, 0, 0, fp.w, fp.h, t.tier, false, t.id, 1).find((p) => p.key === 'stand-1')!;
  const hc = fp.w * 0.66; const hr = fp.h * 0.66;
  assert(!(hc >= plate.col && hc <= plate.col + plate.w && hr >= plate.row && hr <= plate.row + plate.h), 'the plate stand does not cover home plate');
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
