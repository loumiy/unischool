// ---------------------------------------------------------------------
// The year on the map (src/components/seasons.ts, Plan 74I): the season
// the map shows at each week of the game's own calendar. Weeks 1–26 are the
// Fall Term, 27–52 the Spring Term, the summer beat week 52.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { SUMMER_GREEN_WEEK, seasonOf, seasonStyle } from '../src/components/seasons';
import { DEFAULT_SETTINGS, normaliseSettings } from '../src/settings';

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('seasons tests');

const at = (w: number) => seasonOf(w);
const still = (w: number) => { const s = at(w); return s.turn === 0 && s.bare === 0 && s.snow === 0 && s.bud === 0; };

// Summer and the start of the Fall Term are the plain green map.
for (const w of [1, 2, 3, 46, 50, 52]) assert(still(w), `week ${w} is the summer map`);
const summer = seasonStyle(50) as Record<string, string>;
assert(summer['--grass'] === '#82a561' && summer['--leaf-canopy'] === '#4f7a3c', "and matches the stylesheet's own colors");

// The leaves turn through the Fall Term, and only turn further.
const fall = Array.from({ length: 11 }, (_, i) => at(6 + i).turn);
assert(fall.every((t, i) => i === 0 || t >= fall[i - 1]!), 'the leaves turn through the Fall Term, never back');
assert(at(12).turn > 0.4 && at(12).bare === 0 && at(12).snow === 0, 'by week 12 the trees are turning, no snow yet');
assert(at(21).bare === 1, 'by week 21 the leaves are down');

// Snow lies at the turn of the terms, and only then.
assert(at(26).snow === 1 && at(26).bare === 1, 'week 26, the turn of the terms: deep snow, bare trees');
for (let w = 1; w <= 52; w++) {
  if (w <= 21 || w >= 32) assert(at(w).snow === 0, `no snow in week ${w}`);
}

// Bare into the Spring Term, budding, and green again by the summer.
assert(at(30).bare === 1 && at(30).bud === 0, 'week 30: still bare');
assert(at(38).bud > 0 && at(38).bare < 1 && at(38).snow === 0, 'week 38: budding');
assert(still(44), 'week 44: green again');

// The calendar wraps: week 53 is week 1, week 0 is week 52.
assert(JSON.stringify(at(53)) === JSON.stringify(at(1)) && JSON.stringify(at(0)) === JSON.stringify(at(52)), 'the calendar wraps');

// Winter shows on the ground: the grass is near white under the snow.
const winter = seasonStyle(26) as Record<string, string>;
assert(parseInt(winter['--grass']!.slice(1, 3), 16) > 200, `the grass is under snow at week 26 (${winter['--grass']})`);

// The setting (Plan 74I's seasons, off for a strobe-free time-lapse): on
// unless turned off, including for settings saved before it existed, and
// off holds the map at a week with no season in it.
assert(DEFAULT_SETTINGS.seasons === true, 'seasons are on by default');
assert(normaliseSettings({ textScale: 1.15 }).seasons === true, 'settings saved before the switch keep the seasons');
assert(normaliseSettings({ seasons: false }).seasons === false, 'and turning them off holds');
assert(still(SUMMER_GREEN_WEEK), `the seasons-off week (${SUMMER_GREEN_WEEK}) is the plain summer map`);

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
