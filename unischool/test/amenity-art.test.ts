// ---------------------------------------------------------------------
// Plan 99C: every amenity standing on open ground has its own drawing, in
// both of groundMarkings.tsx's switches. Before, both fell through to the
// fountain, so a new amenity with no branch drew as one.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { AMENITIES, initialFacilities } from '../src/data/facilitiesData';
import { motifOf } from '../src/components/buildingSpec';
import { OPEN_GROUND_AMENITIES, groundProps } from '../src/components/groundMarkings';

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) { failures += 1; console.log(`  ✗ ${msg}`); }
}

console.log('amenity art tests');

const facilities = initialFacilities();
const open = AMENITIES.map((a) => facilities.find((t) => t.id === a.id)!).filter((t) => motifOf(t) === 'grounds');
assert(open.length >= 4, `the open-ground amenities are found (${open.map((t) => t.id).join(', ')})`);
for (const t of open) {
  assert(OPEN_GROUND_AMENITIES.includes(t.id), `${t.id} has its own branch`);
  const props = groundProps('amenity', 0, 0, 3, 3, undefined, false, t.id, 0, 'georgian');
  assert(props.length > 0, `${t.id} stands something on its ground`);
  assert(t.id === 'AMENITY-FOUNTAIN' || !props.some((p) => p.key === 'fountain'), `${t.id} is not drawn as the fountain`);
}
assert(groundProps('amenity', 0, 0, 3, 3, undefined, false, 'AMENITY-NOTHING', 0).length === 0, 'an unknown amenity draws nothing raised');
assert(groundProps('amenity', 0, 0, 3, 3, undefined, false, 'AMENITY-GAZEBO', 0, 'georgian')[0]?.key === 'gazebo', 'the gazebo is its own');

console.log(failures === 0 ? `  ✓ all ${checks} checks passed` : `  ${failures} of ${checks} checks failed`);
if (failures > 0) process.exit(1);
