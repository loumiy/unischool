// ---------------------------------------------------------------------
// Venue expansions priced against the college (Plan 121C, the owner:
// "maxing out the athletics investment doesn't feel like a big hurdle in
// the late game where you have a lot of cash"). A rung costs its fixed
// price or one, two and four weeks of the college's operating cost,
// whichever is more, and its upkeep reads what was paid.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { teachingCollege } from './fixtures/teaching';
import { reducer } from '../src/engine/reducer';
import { nextVenueExpansion } from '../src/data/facilitiesData';
import { facilityPrice } from '../src/systems/estate/estate';

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('venue prices tests');

{
  const s = teachingCollege('Venues');
  const stadium = s.tech.find((t) => t.id === 'ATH-STADIUM')!;
  stadium.status = 'done';
  const fixed = nextVenueExpansion(stadium)!.cost;

  // Early, the fixed price stands.
  s.finance.weeklyOpEx = 200_000;
  assert(nextVenueExpansion(stadium, s)!.cost === fixed, `early, the fixed price (${fixed})`);

  // Late, a rung is a week, two and four of running the college.
  s.finance.weeklyOpEx = 15_000_000;
  const rungs = [0, 1, 2].map((done) => nextVenueExpansion({ ...stadium, expansions: done }, s)!.cost);
  assert(rungs.join() === '15000000,30000000,60000000', `late, one, two and four weeks of operating cost (${rungs.join(', ')})`);

  // Paid, and kept: upkeep reads the price paid, not today's.
  s.finance.cash = 100_000_000;
  const after = reducer(s, { type: 'EXPAND_VENUE', venueId: stadium.id });
  const built = after.tech.find((t) => t.id === stadium.id)!;
  assert(after.finance.cash === 100_000_000 - 15_000_000 && built.expansionsPaid === 15_000_000, 'the first rung costs a week of operating cost, and is stored as paid');
  const priced = facilityPrice(built);
  after.finance.weeklyOpEx = 40_000_000;
  assert(facilityPrice(built) === priced && priced === built.cost + 15_000_000, 'its price for upkeep is what was paid, whatever the college spends now');

  // An older save's expansions, with nothing stored, read the fixed price.
  const old = { ...stadium, expansions: 1, expansionsPaid: undefined };
  assert(facilityPrice(old) === stadium.cost + fixed, 'an older save reads its expansions at the fixed price');
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
