// ---------------------------------------------------------------------
// Plan 96C's small fixes that have logic to test: the day ticker lights
// the day under way, so Sunday lights; a lamp's flash ends at its own time
// whatever else starts or finishes meanwhile.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { litDaysAt } from '../src/components/DayTicker';
import { liveFlashes } from '../src/components/CommitteeLamps';

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) { failures += 1; console.log(`  ✗ ${msg}`); }
}

console.log('plan 96 fixes tests');

// The day ticker.
assert(litDaysAt(0) === 1, 'Monday lights as the week opens');
assert(litDaysAt(0.5) === 4, 'mid-week lights Thursday');
assert(litDaysAt(6 / 7 + 0.001) === 7, 'Sunday lights for the last seventh');
assert(litDaysAt(0.9999) === 7, 'the last moment of the week has every day lit');
assert(litDaysAt(1) === 7, 'never more than seven');

// The lamps' flashes.
const flashes = [{ id: 'a', until: 1_200 }, { id: 'b', until: 1_700 }];
assert(liveFlashes(flashes, 1_000).length === 2, 'both lit before either ends');
assert(liveFlashes(flashes, 1_200).map((f) => f.id).join() === 'b', 'the first ends at its own time, though a second came later');
assert(liveFlashes(flashes, 1_700).length === 0, 'none outlives its end');

console.log(failures === 0 ? `  ✓ all ${checks} checks passed` : `  ${failures} of ${checks} checks failed`);
if (failures > 0) process.exit(1);
