// ---------------------------------------------------------------------
// Research prize names (src/data/researchData.ts's prizeName).
//
// Authored content, so the failures worth guarding against are authoring
// ones: a field nobody wrote a ladder for (its winners would take the
// fallback's generic prize), a ladder whose rungs do not climb with depth,
// a twin lab that loses its applied prizes, a name that does not read in
// "wins {name}", and a real prize's name slipping in (Plan 47).
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { FACULTY_FIELDS } from '../src/data/facultyData';
import { prizeName } from '../src/data/researchData';
import { researchSchools } from '../src/data/techData';
import type { InitiativeDepth } from '../src/state/types';

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

const DEPTHS: readonly InitiativeDepth[] = ['pilot', 'project', 'program', 'landmark'];
const LAB_IDS = researchSchools().flatMap((school) => school.labIds);
const FALLBACK = new Set(DEPTHS.map((d) => prizeName('No Such Field', 'LAB-PHYS', d)));

// Words a real prize's name would bring in.
const REAL = /\b(Nobel|Oscar|Academy Award|Turing|Fields Medal|Pulitzer|Abel|Lasker|Holberg|Crafoord|Kyoto|Balzan|Kavli|Emmy|Grammy|Peabody|Olympic|Olympiad|Riksbank)\b/;

console.log('research prizes');
for (const field of FACULTY_FIELDS) {
  const [pilot, project, program, landmark] = DEPTHS.map((d) => prizeName(field, 'LAB-PHYS', d));
  assert(![pilot, program, landmark].some((n) => FALLBACK.has(n)), `${field} has a prize ladder of its own`);
  assert(pilot === project && pilot !== program, `${field}: a pilot and a funded project win the society's medal, a major program the field's prize`);
}

for (const lab of LAB_IDS) {
  for (const field of FACULTY_FIELDS) {
    for (const depth of DEPTHS) {
      const name = prizeName(field, lab, depth);
      assert(name.startsWith('the '), `"${name}" reads in "wins ${name}"`);
      assert(!REAL.test(name), `"${name}" names no real prize`);
    }
  }
}

assert(prizeName('Chemistry', 'LAB-CHEN', 'program') !== prizeName('Chemistry', 'LAB-CHEM', 'program'),
  'chemistry in the chemical engineering labs wins engineering prizes');
assert(prizeName('Physics', 'LAB-AERO', 'landmark') !== prizeName('Physics', 'LAB-PHYS', 'landmark'),
  'and physics in the aerospace labs');
assert(prizeName('Chemistry', 'LAB-CHEN', 'landmark') === prizeName('Mechanical Engineering', 'LAB-MECH', 'landmark'),
  'which top out where the rest of engineering does');

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
