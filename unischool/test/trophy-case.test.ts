// ---------------------------------------------------------------------
// The trophy case (TrophyCase.tsx): one cup per sport, the sport with the
// most titles first, each cup's years oldest first (its base's bands, top
// to bottom), and every sport drawn as one of the four cups.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { SPORTS } from '../src/data/studentLifeData';
import { trophyShape, trophyShelf } from '../src/components/TrophyCase';

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) { failures += 1; console.log(`  ✗ ${msg}`); }
}

console.log('trophy case tests');

assert(trophyShelf([]).length === 0, 'no titles, no cups');

const shelf = trophyShelf([
  { sport: 'football', year: 15 },
  { sport: 'basketball-m', year: 12 },
  { sport: 'basketball-m', year: 6 },
  { sport: 'soccer-w', year: 20 },
  { sport: 'basketball-m', year: 9 },
]);
assert(shelf.length === 3, 'one cup per sport');
assert(shelf[0].sport === 'basketball-m', 'the sport with the most titles stands first');
assert(shelf[0].years.join() === '6,9,12', "a cup's years run oldest first");
assert(shelf[1].sport === 'soccer-w', 'a tie goes to the latest title');
assert(shelf[0].label === 'Basketball' && shelf[0].genderLabel === "Men's", 'a two-gender sport is labelled by sport and gender');
assert(shelf[2].label === 'Football' && shelf[2].genderLabel === '', 'a one-gender sport has no gender label');

for (const sp of SPORTS) {
  assert(['cup', 'urn', 'bowl', 'star'].includes(trophyShape(sp.id)), `${sp.id} has a cup`);
}
assert(trophyShape('basketball-m') === trophyShape('basketball-w'), "both genders of a sport share a cup");

console.log(failures === 0 ? `  ✓ all ${checks} checks passed` : `  ${failures} of ${checks} checks failed`);
if (failures > 0) process.exit(1);
