// The dining chain sized to a campus of about 40,000 (Plan 127, see
// facilitiesData.ts above DINING_RUNGS): the places that are not the
// grocery or the towers' shops carry what RETAIL_FOOD_SHARE leaves, every
// one is needed by 40,000, none alone is a large share late, the halls'
// price per place climbs with their size, and the founding is as it was.

import { initialFacilities, isDiningPlace, RETAIL_FOOD_SHARE, COFFEE_KIOSK_ID, FOOD_TRUCKS_ID } from '../src/data/facilitiesData';
import { TARGET_RATIO } from '../src/systems/satisfaction/satisfactionSystem';
import { footprintOf } from '../src/state/campusMap';

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('dining chain tests');

const places = initialFacilities().filter(isDiningPlace);
const seats = (id: string) => places.find((t) => t.id === id)?.effects?.servesPopulation ?? 0;
const total = places.reduce((sum, t) => sum + (t.effects?.servesPopulation ?? 0), 0);
const CAMPUS = 40_000;
const need = CAMPUS * TARGET_RATIO.basicNeeds * (1 - RETAIL_FOOD_SHARE);

assert(places.length === 10, `ten places to eat: eight halls, the kiosk and the trucks (${places.length})`);
assert(total >= need && total <= need * 1.02, `together they feed what 40,000 students need beside the shops (${total} against ${need})`);
for (const t of places) {
  const without = total - (t.effects?.servesPopulation ?? 0);
  assert(without < need, `${t.name} is needed by 40,000 (${without} without it)`);
  assert((t.effects?.servesPopulation ?? 0) < need * 0.3, `${t.name} alone is not a large share (${t.effects?.servesPopulation})`);
}

// The halls, in the order they open, get bigger and dearer a place.
const halls = places.filter((t) => t.facilityType === 'diningHall' && t.id !== 'DININGHALL-04');
for (let i = 1; i < halls.length; i++) {
  const a = halls[i - 1]!; const b = halls[i]!;
  assert(b.effects!.servesPopulation! > a.effects!.servesPopulation!, `${b.name} seats more than ${a.name}`);
  assert(b.cost / b.effects!.servesPopulation! > a.cost / a.effects!.servesPopulation!, `${b.name} costs more a place than ${a.name}`);
}

// The small places beside them: cheap, early and small on the map.
const kiosk = places.find((t) => t.id === COFFEE_KIOSK_ID)!;
const trucks = places.find((t) => t.id === FOOD_TRUCKS_ID)!;
assert(kiosk.prereqs.join() === 'DINING-01' && kiosk.cost < 250_000, 'the kiosk opens after the Original Commons and costs less than it');
assert(trucks.prereqs.join() === 'DININGHALL-03', 'the trucks open after the Hilltop Cafeteria');
assert(trucks.cost / seats(FOOD_TRUCKS_ID) < 1_500, 'and are cheap a place');
const kfp = footprintOf(kiosk); const tfp = footprintOf(trucks);
assert(kfp.w * kfp.h === 4 && tfp.w * tfp.h === 20, `the kiosk on 2x2, the trucks on 5x4 (${kfp.w}x${kfp.h}, ${tfp.w}x${tfp.h})`);

// The founding: one hall for the founding class, as before.
assert(seats('DINING-01') === 350 && places.find((t) => t.id === 'DINING-01')!.cost === 250_000, 'the Original Commons is as it was');

// Each hall keeps the land it had before the rebalance.
const land: Record<string, string> = {
  'DINING-01': '3x3', 'DININGHALL-02': '5x3', 'DININGHALL-03': '5x4', 'DININGHALL-04': '3x3',
  'DININGHALL-05': '7x6', 'DININGHALL-06': '9x6', 'DININGHALL-07': '11x7', 'DININGHALL-08': '11x9',
};
for (const [id, want] of Object.entries(land)) {
  const fp = footprintOf(places.find((t) => t.id === id)!);
  assert(`${fp.w}x${fp.h}` === want, `${id} stands on ${want} (${fp.w}x${fp.h})`);
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
