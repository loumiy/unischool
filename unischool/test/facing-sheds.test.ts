// Four-way facing for the sports sheds, the school labs' fronts and Modern's
// carillon (buildingMotifs.tsx, workshopSplit through PlantScreen): each
// feature is anchored to one of the building's own sides, not to the walls
// the camera sees. So a half turn of the camera shows a different elevation
// (the front's sign and drop-off at one view, the plain back at the other),
// a building turned to face -row (facing 2) shows from the opening camera
// what one at facing 0 shows from behind, and every wall the camera sees
// still has its door at the middle.

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { buildingMassArt, materialOf } from '../src/components/buildingMotifs';
import { SCHOOL_SIGNATURES } from '../src/components/buildingSpec';
import { DEFAULT_PITCH, VIEWS, setCamera, visibleWalls } from '../src/components/isoProjection';
import { sidesOf } from '../src/components/facing';
import { initialTech } from '../src/data/techData';
import { initialDorms } from '../src/data/campusData';
import { initialFacilities } from '../src/data/facilitiesData';
import { isPlaceableKind, orientedFootprint } from '../src/state/campusMap';
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

console.log('facing sheds tests');

const CATALOGUE: Buildable[] = [...initialTech(), ...initialDorms(), ...initialFacilities()].filter(isPlaceableKind);
const byId = (id: string) => CATALOGUE.find((t) => t.id === id)!;
const hall = byId('HALL-01');
const schoolHall = (prefix: string): Buildable => {
  const school = Object.keys(SCHOOL_SIGNATURES).find((k) => k.startsWith(prefix))!;
  return { ...hall, signature: school } as Buildable;
};

const AT_45 = VIEWS[0]!;
const AT_225 = VIEWS[2]!;
function art(t: Buildable, facing: Facing, azimuth: number, v: Vernacular = 'georgian'): string {
  setCamera({ azimuth, pitch: DEFAULT_PITCH });
  const fp = orientedFootprint(t, facing);
  const p = { col: 0.06, row: 0.06, w: fp.w - 0.12, h: fp.h - 0.12, facing };
  return renderToStaticMarkup(createElement('svg', null, buildingMassArt({ t, p, material: materialOf(t, v), vernacular: v, developing: false }, 0)));
}
const count = (svg: string, cls: string) => svg.split(`class="${cls}"`).length - 1;
const doorWalls = (svg: string) => new Set([...svg.matchAll(/data-door="(\w+)"/g)].map((m) => m[1]));

// Each case: a building and the marker its front (or front and right side)
// draws, with how many of them the opening view shows.
const cases: Array<{ name: string; t: Buildable; marker: string; atOpening: number; v?: Vernacular }> = [
  { name: 'the Recreation Center\'s sign', t: byId('REC-T1'), marker: 'shed-sign', atOpening: 1 },
  { name: 'the Gym\'s front sign and its roof board', t: byId('GYM'), marker: 'shed-sign', atOpening: 2 },
  { name: 'the Complex\'s glass-front sign band and end-wall sign', t: byId('REC-T2'), marker: 'shed-sign', atOpening: 2 },
  { name: 'Health\'s drop-off', t: schoolHall('Health'), marker: 'clinic-dropoff', atOpening: 1 },
  { name: 'Computer Science\'s atrium', t: schoolHall('Computer'), marker: 'atrium-front', atOpening: 1 },
];
for (const c of cases) {
  const front = art(c.t, 0, AT_45, c.v);
  const back = art(c.t, 0, AT_225, c.v);
  assert(count(front, c.marker) === c.atOpening, `${c.name}: the opening view shows ${c.atOpening} (${count(front, c.marker)})`);
  // The Gym's roof board stands on the roof, so its back shows from behind,
  // but its lettering faces the front.
  assert(count(back, c.marker) === 0, `${c.name}: from behind it is not drawn (${count(back, c.marker)})`);
  const turned = art(c.t, 2, AT_45, c.v);
  const turnedBack = art(c.t, 2, AT_225, c.v);
  assert(count(turned, c.marker) === count(back, c.marker), `${c.name}: facing 2 at the opening view draws what facing 0 does from behind`);
  assert(count(turnedBack, c.marker) === count(front, c.marker), `${c.name}: and facing 2 from behind what facing 0 does at the opening view`);
}

// The sheds keep a door at the middle of every wall the camera sees, the
// back's and the left side's included, at every facing and view.
for (const id of ['REC-T1', 'REC-T2', 'GYM', 'ATH-FIELDHOUSE', 'ATH-NATATORIUM']) {
  for (const facing of [0, 1, 2, 3] as Facing[]) {
    for (const az of VIEWS) {
      const svg = art(byId(id), facing, az);
      const seen = visibleWalls();
      const doors = doorWalls(svg);
      assert(doors.has(seen.left) && doors.has(seen.right), `${id} at facing ${facing}, azimuth ${az.toFixed(2)}: a door on both walls the camera sees (${[...doors].join(', ')})`);
    }
  }
}

// The Complex's signs: the band over its glass front and the one on its
// right side's end wall, each drawn exactly when its wall shows, at every
// facing and view.
{
  const t = byId('REC-T2');
  for (const facing of [0, 1, 2, 3] as Facing[]) {
    for (const az of VIEWS) {
      const svg = art(t, facing, az);
      const seen = visibleWalls();
      const front = sidesOf(facing).front;
      const frontSeen = front === seen.left || front === seen.right;
      const signs = count(svg, 'shed-sign');
      const rightSeen = sidesOf(facing).right === seen.left || sidesOf(facing).right === seen.right;
      assert(signs === (frontSeen ? 1 : 0) + (rightSeen ? 1 : 0), `REC-T2 at facing ${facing}, azimuth ${az.toFixed(2)}: a sign on the front and on the right side, where seen (${signs})`);
    }
  }
}

// Modern's carillon stays at the hall's front-right corner: it rises above
// the roof from every side, and the opening view and the view from behind
// draw different elevations.
{
  const founders = byId('BLDG-GENSTUDIES');
  const drawn = (facing: Facing, az: number) => {
    const svg = art(founders, facing, az, 'modern');
    return { svg, n: count(svg, 'iso-carillon-mast') };
  };
  const a = drawn(0, AT_45); const b = drawn(0, AT_225);
  assert(a.n === 1 && b.n === 1, 'Modern Founders Hall has its carillon from the front and from behind');
  assert(a.svg !== b.svg, 'and the two views draw different elevations');
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
