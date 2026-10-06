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

// The open ground (Plan 95B, the second review's B1-2): each new token at
// the four corners of the year, and its summer value (the stylesheet's own
// fallback) at the seasons-off week.
const lightness = (c: string) => [1, 3, 5].reduce((n, i) => n + parseInt(c.slice(i, i + 2), 16), 0) / 3;
const greenness = (c: string) => parseInt(c.slice(3, 5), 16) - (parseInt(c.slice(1, 3), 16) + parseInt(c.slice(5, 7), 16)) / 2;
const pinkness = (c: string) => parseInt(c.slice(1, 3), 16) - parseInt(c.slice(3, 5), 16);
const tok = (w: number, k: string) => (seasonStyle(w) as Record<string, string>)[k]!;
const OPEN_GROUND_SUMMER: Record<string, string> = {
  '--turf': '#6d9150', '--turf-deep': '#5d7f43', '--turf-roof': '#5d8a4a', '--court': '#5e8a58',
  '--water': '#6ba3bd', '--pond': '#6ba3bd', '--garden-grass': '#7fa652', '--moss': '#6d8a4a',
  '--sakura': '#7d9e4a', '--sakura-top': '#9ab85f',
  '--azalea': '#d9829f', '--azalea-top': '#f0a8c0', '--azalea-deep': '#b5487a', '--azalea-deep-top': '#d5679a',
  '--under-ice-opacity': '1', '--petal-opacity': '0',
};
for (const [k, v] of Object.entries(OPEN_GROUND_SUMMER)) {
  assert(tok(SUMMER_GREEN_WEEK, k) === v, `${k} is its summer value with seasons off (${tok(SUMMER_GREEN_WEEK, k)}, want ${v})`);
  assert(tok(2, k) === v, `${k} is its summer value at week 2 (${tok(2, k)})`);
}
// Every token at every checked week is a color or a number, and every one
// has left its summer value under the week-26 snow (the petals were
// already gone).
for (const w of [2, 12, 26, 40]) {
  for (const k of Object.keys(OPEN_GROUND_SUMMER)) assert(/^#[0-9a-f]{6}$|^[01](\.\d+)?$/.test(tok(w, k)), `${k} at week ${w} is a value (${tok(w, k)})`);
}
for (const k of Object.keys(OPEN_GROUND_SUMMER)) {
  if (k !== '--petal-opacity') assert(tok(26, k) !== OPEN_GROUND_SUMMER[k], `${k} changes under the snow`);
}
// Week 12, the Fall Term: the turf dulls toward straw but nothing is under
// snow; the water is open; the cherries are turning, not in blossom.
assert(tok(12, '--turf') !== '#6d9150' && greenness(tok(12, '--turf')) < greenness('#6d9150'), `week 12: the turf dulls (${tok(12, '--turf')})`);
assert(tok(12, '--court') === '#5e8a58', 'week 12: the courts are painted, so they keep their color');
assert(tok(12, '--water') === '#6ba3bd' && tok(12, '--pond') === '#6ba3bd' && tok(12, '--under-ice-opacity') === '1', 'week 12: the pool and the pond are open');
assert(pinkness(tok(12, '--sakura')) > pinkness('#7d9e4a') && greenness(tok(12, '--sakura')) < greenness('#7d9e4a'), `week 12: the cherries turn rust (${tok(12, '--sakura')})`);
assert(tok(12, '--sakura') === tok(12, '--leaf-ornamental'), 'week 12: the cherries wear the ornamental leaf');
assert(tok(12, '--petal-opacity') === '0', 'week 12: no petals');
// Week 26, deep snow: the turf takes about half the lawn's cover, so it is
// paler than in summer and darker than the lawn; the pool is covered, the
// pond frozen, no blossom.
const lawn26 = lightness(tok(26, '--lawn'));
const turf26 = lightness(tok(26, '--turf'));
assert(turf26 > lightness('#6d9150') + 40 && turf26 < lawn26 - 20, `week 26: the turf under half the lawn's snow (${tok(26, '--turf')} against ${tok(26, '--lawn')})`);
assert(tok(26, '--turf-roof') !== '#5d8a4a' && lightness(tok(26, '--turf-roof')) > turf26, `week 26: the roof's infield is not swept, so it takes more snow than a pitch (${tok(26, '--turf-roof')})`);
assert(lightness(tok(26, '--court')) > lightness('#5e8a58') + 40, `week 26: the courts take the snow too (${tok(26, '--court')})`);
assert(tok(26, '--water') === '#7d8b88', `week 26: the pool is under its cover (${tok(26, '--water')})`);
assert(tok(26, '--pond') === '#c4d3da', `week 26: the pond is frozen pale (${tok(26, '--pond')})`);
assert(tok(26, '--under-ice-opacity') === '0', 'week 26: the lanes and the koi are under the cover and the ice');
assert(pinkness(tok(26, '--sakura')) < 30 && tok(26, '--sakura') === tok(26, '--leaf-ornamental'), `week 26: the cherries are bare twigs (${tok(26, '--sakura')})`);
assert(greenness(tok(26, '--azalea')) > 0 && lightness(tok(26, '--azalea-top')) > lightness('#58884a'), `week 26: the azaleas are out of flower, their tops under snow (${tok(26, '--azalea')}, ${tok(26, '--azalea-top')})`);
assert(lightness(tok(26, '--garden-grass')) > 200 && lightness(tok(26, '--moss')) > 200, "week 26: the garden's grass and moss under the snow");
// Week 40, the spring: the snow is gone and the cherries are in blossom.
assert(tok(40, '--sakura') === '#e79bb8' && tok(40, '--sakura-top') === '#f7c6d8', `week 40: the cherries in blossom (${tok(40, '--sakura')})`);
assert(tok(40, '--petal-opacity') === '1', 'week 40: petals under the blossom');
assert(tok(40, '--water') === '#6ba3bd' && tok(40, '--pond') === '#6ba3bd' && tok(40, '--court') === '#5e8a58', 'week 40: the water open, the courts clear');
assert(greenness(tok(40, '--turf')) > greenness(tok(26, '--turf')), `week 40: the turf greens again (${tok(40, '--turf')})`);
assert(pinkness(tok(40, '--azalea')) > pinkness(tok(26, '--azalea')), `week 40: the azaleas are coming into flower (${tok(40, '--azalea')})`);
// Blossom only while the trees bud.
for (let w = 1; w <= 52; w++) {
  if (seasonOf(w).bud === 0) assert(tok(w, '--sakura') === tok(w, '--leaf-ornamental'), `no blossom in week ${w}`);
}

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
