// ---------------------------------------------------------------------
// The build menu's tiles draw the building itself (Plan 94,
// BuildThumb.tsx): every placeable in the catalogue, in every vernacular,
// finished and under construction, draws through ThumbDrawing without
// throwing and draws something; the key a drawing is kept under changes
// with what the drawing shows.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { ThumbDrawing, thumbKey } from '../src/components/BuildThumb';
import { VERNACULARS } from '../src/components/buildingSpec';
import { initialTech } from '../src/data/techData';
import { initialDorms } from '../src/data/campusData';
import { initialFacilities } from '../src/data/facilitiesData';
import { isPlaceableKind } from '../src/state/campusMap';
import type { Buildable, Vernacular } from '../src/state/types';

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('build thumb tests');

const CATALOGUE: Buildable[] = [...initialTech(), ...initialDorms(), ...initialFacilities()].filter(isPlaceableKind);
const VERNS = Object.keys(VERNACULARS) as Vernacular[];
assert(CATALOGUE.length > 20 && VERNS.length >= 5, `a catalogue to draw (${CATALOGUE.length} placeables, ${VERNS.length} vernaculars)`);

let drawn = 0;
for (const v of VERNS) {
  for (const base of CATALOGUE) {
    for (const status of ['available', 'developing'] as const) {
      const t = { ...base, status };
      let markup = '';
      try {
        markup = renderToStaticMarkup(createElement(ThumbDrawing, { t, vernacular: v }));
      } catch (e) {
        assert(false, `${t.id} (${status}) draws in ${v}: ${(e as Error).message}`);
        continue;
      }
      const shapes = (markup.match(/<(polygon|path|rect|circle|ellipse|line|polyline)\b/g) ?? []).length;
      assert(shapes > 0, `${t.id} (${status}) draws something in ${v}`);
      drawn += 1;
    }
  }
}
assert(drawn === VERNS.length * CATALOGUE.length * 2, `every placeable drew, finished and going up (${drawn})`);

{
  const t = CATALOGUE.find((x) => x.tier !== undefined)!;
  const k = thumbKey({ ...t, status: 'available' }, 'georgian');
  assert(k !== thumbKey({ ...t, status: 'developing' }, 'georgian'), 'going up is drawn apart from finished');
  assert(k !== thumbKey({ ...t, status: 'available' }, 'gothic'), 'and each vernacular apart');
  assert(k !== thumbKey({ ...t, status: 'available', tier: (t.tier ?? 0) + 1 }, 'georgian'), 'and each tier');
  assert(k !== thumbKey({ ...t, status: 'available', expansions: 1 }, 'georgian'), 'and a venue\'s expansions');
  assert(k === thumbKey({ ...t, status: 'done' }, 'georgian'), 'but built and on offer look alike');
}

if (failures > 0) {
  console.error(`  ${failures} of ${checks} checks failed`);
  process.exit(1);
}
console.log(`  ✓ all ${checks} checks passed`);
