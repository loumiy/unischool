// ---------------------------------------------------------------------
// A building's own elevations (Plan 88): the generic hall, residence and
// pavilion art puts the vernacular's entrance on the building's front and
// a plain door on each side and a service door (with its bins) at the back,
// so what the camera sees changes as it turns, and turns with the building
// when it is placed facing another way. Before, the entrance followed the
// camera onto whichever two walls it saw.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { BuildingMotifArt, materialOf } from '../src/components/buildingMotifs';
import { DEFAULT_PITCH, VIEWS, setCamera, visibleWalls, type FaceDir } from '../src/components/isoProjection';
import { sideOf, sidesOf, type Side } from '../src/components/facing';
import { initialTech } from '../src/data/techData';
import { initialDorms } from '../src/data/campusData';
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

console.log('facing elevations tests');

const CATALOGUE: Buildable[] = [...initialTech(), ...initialDorms()].filter(isPlaceableKind);
const byId = (id: string) => {
  const t = CATALOGUE.find((b) => b.id === id);
  if (!t) throw new Error(`no ${id} in the catalogue`);
  return t;
};

// The opening view (azimuth 45) and the one opposite it (225).
const AT_45 = 0; const AT_225 = 2;

function draw(t: Buildable, v: Vernacular, facing: Facing, view: number): string {
  setCamera({ azimuth: VIEWS[view]!, pitch: DEFAULT_PITCH });
  const fp = orientedFootprint(t, facing);
  const p = { col: 20, row: 20, w: fp.w, h: fp.h, facing };
  return renderToStaticMarkup(createElement(BuildingMotifArt, { t, p, material: materialOf(t, v), vernacular: v, developing: false }));
}
const doorsOn = (svg: string): FaceDir[] => [...svg.matchAll(/data-door="(\w+)"/g)].map((m) => m[1] as FaceDir);
const has = (svg: string, cls: string) => svg.includes(`class="${cls}"`) || svg.includes(`${cls} `) || svg.includes(` ${cls}"`);

// --- 1. A half turn of the camera sees the other two elevations ---------
{
  // A Classical academic hall: a temple front on the front, plain doors on
  // the sides, the service door and its bins at the back.
  const hall = byId('HALL-02');
  const front = draw(hall, 'classical', 0, AT_45);
  const back = draw(hall, 'classical', 0, AT_225);
  assert(has(front, 'iso-portico'), 'facing 0 from the opening view: the hall shows its portico');
  assert(!has(front, 'iso-bin'), 'facing 0 from the opening view: no service yard (the back is out of sight)');
  assert(!has(back, 'iso-portico'), 'facing 0 from behind (azimuth 225): no portico, it is on the far side');
  assert(has(back, 'iso-bin'), 'facing 0 from behind: the back\'s service door and its bins');
  assert(front !== back, 'the two half-turned views draw different elevations');

  // Turned to face -row, seen from the opening view: the same two sides the
  // unturned hall shows from behind.
  const turned = draw(hall, 'classical', 2, AT_45);
  assert(!has(turned, 'iso-portico') && has(turned, 'iso-bin'),
    'facing 2 at azimuth 45 draws the back elevation, as facing 0 does at 225');
  setCamera({ azimuth: VIEWS[AT_45]!, pitch: DEFAULT_PITCH });
  const turnedSides = doorsOn(turned).map((d) => sideOf(2, d)).sort();
  setCamera({ azimuth: VIEWS[AT_225]!, pitch: DEFAULT_PITCH });
  const backSides = doorsOn(back).map((d) => sideOf(0, d)).sort();
  assert(JSON.stringify(turnedSides) === JSON.stringify(backSides) && turnedSides.join() === 'back,left',
    `the same sides' doors: facing 2 at 45 (${turnedSides.join()}) and facing 0 at 225 (${backSides.join()})`);
}

// --- 2. Every wall the camera sees has its door, the front its entrance --
{
  const cases: Array<[string, Vernacular]> = [
    ['HALL-02', 'classical'], ['HALL-02', 'gothic'], ['HALL-02', 'mission'], ['HALL-02', 'modern'], ['HALL-02', 'tudor'],
    ['DORM-02', 'classical'], ['DORM-02', 'gothic'], ['DORM-02', 'mission'], ['DORM-04', 'italianate'],
  ];
  for (const [id, v] of cases) {
    const t = byId(id);
    for (const facing of [0, 1, 2, 3] as Facing[]) {
      for (let view = 0; view < 4; view++) {
        const svg = draw(t, v, facing, view);
        const seen = visibleWalls();
        const doors = new Set(doorsOn(svg));
        // The front's entrance may be a porch's or an arcade's opening;
        // every other seen wall has a door-way the walkers can open.
        for (const dir of [seen.left, seen.right]) {
          const side: Side = sideOf(facing, dir);
          if (side === 'front') continue;
          assert(doors.has(dir), `${v} ${id} facing ${facing} view ${view}: a door on its ${side} (${dir})`);
        }
        // Nothing on a wall it cannot see.
        for (const dir of doors) {
          assert(dir === seen.left || dir === seen.right, `${v} ${id} facing ${facing} view ${view}: no door drawn on the unseen ${dir}`);
        }
        // The bins only where the back is seen.
        const backSeen = sidesOf(facing).back === seen.left || sidesOf(facing).back === seen.right;
        if (!backSeen) assert(!has(svg, 'iso-bin'), `${v} ${id} facing ${facing} view ${view}: no bins with the back out of sight`);
      }
    }
  }
}

console.log(failures === 0 ? `  ✓ all ${checks} checks passed` : `  ${failures} of ${checks} checks failed`);
if (failures === 0) {
  process.exit(0);
} else {
  process.exit(1);
}
