// The centrepieces keep their own sides (Plan 88: four-way facing). The
// Founders Hall, the Business School, the Graduate College and the Research
// Park put their entrances, towers and signs on the building's own front,
// back and sides (components/facing.ts), not on the walls the camera sees:
// so turning the camera half way round shows another elevation, and a
// building turned half way round (facing 2) seen from the opening view shows
// what the unturned one shows from behind.

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import BuildingMotif, { materialOf } from '../src/components/buildingMotifs';
import { setCamera, DEFAULT_PITCH } from '../src/components/isoProjection';
import { orientedFootprint, isPlaceableKind } from '../src/state/campusMap';
import { initialTech } from '../src/data/techData';
import { initialDorms } from '../src/data/campusData';
import { initialFacilities } from '../src/data/facilitiesData';
import type { Buildable, Facing, Vernacular } from '../src/state/types';

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('facing centrepieces tests');

const CATALOGUE: Buildable[] = [...initialTech(), ...initialDorms(), ...initialFacilities()].filter(isPlaceableKind);
const byId = (id: string) => CATALOGUE.find((t) => t.id === id)!;

// The building drawn alone at a camera azimuth (degrees) and a facing.
function draw(t: Buildable, v: Vernacular, azimuth: number, facing: Facing): string {
  setCamera({ azimuth: (azimuth * Math.PI) / 180, pitch: DEFAULT_PITCH });
  const fp = orientedFootprint(t, facing);
  const p = { col: 10.06, row: 12.06, w: fp.w - 0.12, h: fp.h - 0.12, facing };
  return renderToStaticMarkup(createElement('svg', null, createElement(BuildingMotif, { t, p, material: materialOf(t, v), vernacular: v, developing: false })));
}

// What a drawing is made of, without where it is or how it is lit: each
// element's tag and class, counted. A turn of the camera moves every point
// and relights every wall (the sun stays put), but draws the same parts.
function parts(markup: string): string {
  const counts = new Map<string, number>();
  for (const m of markup.matchAll(/<(\w+)([^>]*)>/g)) {
    const cls = /class="([^"]*)"/.exec(m[2])?.[1] ?? '';
    // Cast shadows fall where the sun puts them, which a turn changes.
    if (cls.includes('shadow')) continue;
    const key = `${m[1]}.${cls}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, n]) => `${k}:${n}`).join(' ');
}
const count = (markup: string, pattern: RegExp) => [...markup.matchAll(pattern)].length;

const founders = byId('BLDG-GENSTUDIES');
const centrepieces: Array<[Buildable, Vernacular]> = [
  [founders, 'georgian'], [founders, 'tudor'],
  [byId('PROJ-BUSINESS'), 'modern'], [byId('PROJ-GRADUATE'), 'gothic'], [byId('PROJ-RESEARCH-PARK'), 'modern'],
];

for (const [t, v] of centrepieces) {
  const front = draw(t, v, 45, 0);
  const behind = draw(t, v, 225, 0);
  const turned = draw(t, v, 45, 2);
  assert(parts(front) !== parts(behind), `${t.id} (${v}): from behind it shows another elevation than from the front`);
  assert(parts(turned) === parts(behind), `${t.id} (${v}): turned half round, the opening view shows what its back view did`);
  // A quarter turn of each brings the same side round too.
  assert(parts(draw(t, v, 315, 1)) === parts(draw(t, v, 45, 0)), `${t.id} (${v}): a quarter turn of building and camera together draws the same`);
}

// The Georgian Founders Hall: a door at the middle of every wall it shows,
// the grand portico (its oculus) on the front, a plain doorcase (no
// oculus) on the back; the ends' porticos either way.
{
  const front = draw(founders, 'georgian', 45, 0);
  const behind = draw(founders, 'georgian', 225, 0);
  assert(count(front, /data-door=/g) === 2 && count(behind, /data-door=/g) === 2, 'Founders Hall draws a door on each wall in view');
  const oculi = (m: string) => count(m, /class="iso-clock-face"/g);
  assert(oculi(front) === oculi(behind) + 1, `the front shows the grand portico's oculus, the back a plain doorcase (${oculi(front)} vs ${oculi(behind)})`);
}

// The Business School's atrium is on its front: its canopy's door faces
// posRow at facing 0 and negRow at facing 2, whatever the camera.
{
  const t = byId('PROJ-BUSINESS');
  const atFront = draw(t, 'modern', 45, 0);
  const atBack = draw(t, 'modern', 225, 2);
  assert(count(atFront, /class="iso-curtain-glass"/g) > 0, 'the Business School shows its atrium');
  assert(parts(atFront) === parts(atBack), 'turned half round and seen from behind, the Business School shows its front again');
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
