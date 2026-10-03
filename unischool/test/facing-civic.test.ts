// Four-way orientation for the civic set (the chapel, the Law School, the
// Museum, the dining halls, the residence towers and the library): each has
// a front, a back and two sides of its own, which stay on the building as
// the camera turns and turn with it when it is placed facing another way.
// So a half turn of the camera shows another elevation, and a building
// placed facing 2 (its front on -row) looks from the opening view as one
// facing 0 does from behind.

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { BuildingMotifArt } from '../src/components/buildingMotifs';
import { chapelPlan, diningPlan, materialOf } from '../src/components/buildingSpec';
import { initialTech } from '../src/data/techData';
import { initialDorms } from '../src/data/campusData';
import { initialFacilities } from '../src/data/facilitiesData';
import { DEFAULT_PITCH, VIEWS, setCamera } from '../src/components/isoProjection';
import { sidesOf, type Plot } from '../src/components/facing';
import { footprintOf } from '../src/state/campusMap';
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

console.log('facing civic tests');

const CATALOGUE: Buildable[] = [...initialTech(), ...initialDorms(), ...initialFacilities()];

const byId = (id: string): Buildable => {
  const t = CATALOGUE.find((x) => x.id === id);
  if (!t) throw new Error(`no ${id}`);
  return t;
};
const plotOf = (t: Buildable, facing: Facing): Plot => {
  const fp = footprintOf(t);
  const odd = facing % 2 === 1;
  return { col: 20, row: 20, w: odd ? fp.h : fp.w, h: odd ? fp.w : fp.h, facing };
};
// The opening view (azimuth 45) and the half turn from it (225).
const OPENING = VIEWS[0]!;
const BEHIND = VIEWS[2]!;
const draw = (t: Buildable, v: Vernacular, facing: Facing, azimuth: number): string => {
  setCamera({ azimuth, pitch: DEFAULT_PITCH });
  return renderToStaticMarkup(createElement('svg', null, createElement(BuildingMotifArt, {
    t, p: plotOf(t, facing), material: materialOf(t, v), vernacular: v, developing: false,
  })));
};
const has = (markup: string, cls: string) => markup.includes(cls);

// --- The chapel: its porch on the front's long wall --------------------
{
  const chapel = byId('AMENITY-CHAPEL');
  const front = draw(chapel, 'georgian', 0, OPENING);
  const back = draw(chapel, 'georgian', 0, BEHIND);
  assert(has(front, 'chapel-porch'), 'the chapel shows its porch from the opening view');
  assert(!has(back, 'chapel-porch'), 'and not from behind, where its back keeps a plain door');
  assert(has(draw(chapel, 'georgian', 2, OPENING), 'chapel-porch') === has(back, 'chapel-porch')
    && has(draw(chapel, 'georgian', 2, BEHIND), 'chapel-porch') === has(front, 'chapel-porch'),
  'a chapel facing 2 shows from the opening view what one facing 0 shows from behind');
  for (const facing of [0, 1, 2, 3] as Facing[]) {
    const p = plotOf(chapel, facing);
    const plan = chapelPlan(p, 'gothic');
    const sides = sidesOf(facing);
    assert(plan.porch === sides.front && plan.west === sides.left && plan.east === sides.right,
      `facing ${facing}: the porch is on the front, the tower at the building's left end, the chancel at its right`);
  }
  // Doors: both visible walls carry one in every view (walkers' way in).
  for (const az of VIEWS) {
    const m = draw(chapel, 'gothic', 0, az);
    assert((m.match(/data-door="/g) ?? []).length >= 2, `at azimuth ${az.toFixed(2)} the chapel's visible walls have doors`);
  }
}

// --- The Law School: the temple front on its front, the frontispiece behind
{
  const law = byId('PROJ-LAW');
  const front = draw(law, 'classical', 0, OPENING);
  const back = draw(law, 'classical', 0, BEHIND);
  assert(has(front, 'law-temple') && !has(front, 'law-frontispiece'), 'the Law School shows its temple front from the opening view');
  assert(!has(back, 'law-temple') && has(back, 'law-frontispiece'), 'and its pilastered back front from behind');
  const turned = draw(law, 'classical', 2, OPENING);
  assert(has(turned, 'law-frontispiece') && !has(turned, 'law-temple'), 'facing 2, the opening view sees what facing 0 shows from behind');
}

// --- The Museum: its sculptures in the forecourt before its front -------
{
  const museum = byId('PROJ-MUSEUM');
  const at = (facing: Facing, az: number) => {
    const m = draw(museum, 'georgian', facing, az);
    // Before the gallery (behind it) or after (in front).
    return m.indexOf('museum-red-cube') > m.indexOf('gallery-vaults');
  };
  assert(at(0, OPENING) && !at(0, BEHIND), 'the forecourt sculptures stand before the gallery from the front, behind it from the back');
  assert(at(2, OPENING) === at(0, BEHIND), 'facing 2 at the opening view puts them where facing 0 does from behind');
}

// --- The dining halls: the terrace on the front, the yard at the back ---
{
  const refectory = CATALOGUE.filter((t) => t.facilityType === 'diningHall')
    .find((t) => diningPlan(t, plotOf(t, 0), 'georgian').band === 'refectory');
  assert(refectory !== undefined, 'a refectory to look at');
  if (refectory) {
    for (const facing of [0, 1, 2, 3] as Facing[]) {
      const p = plotOf(refectory, facing);
      const plan = diningPlan(refectory, p, 'georgian');
      const sides = sidesOf(facing);
      const edge = sides.front === 'posRow' ? Math.abs(plan.terrace.row + plan.terrace.h - (p.row + p.h))
        : sides.front === 'negRow' ? Math.abs(plan.terrace.row - p.row)
          : sides.front === 'posCol' ? Math.abs(plan.terrace.col + plan.terrace.w - (p.col + p.w))
            : Math.abs(plan.terrace.col - p.col);
      assert(plan.front === sides.front && plan.service === sides.right && edge < 1e-9,
        `facing ${facing}: the terrace lies along the front, the kitchen at the building's right`);
    }
    const front = draw(refectory, 'georgian', 0, OPENING);
    const back = draw(refectory, 'georgian', 0, BEHIND);
    assert(!has(front, 'sig-bins') && has(back, 'sig-bins'), "the kitchen yard's bins show from behind, not from the front");
    assert(front.indexOf('ground-deck') < front.indexOf('iso-ridge'), 'the terrace is paved under the hall');
    assert(has(draw(refectory, 'georgian', 2, OPENING), 'sig-bins'), 'facing 2, the opening view sees the service yard');
  }
}

// --- The residence tower: the entrance canopy over the front door ------
{
  const tower = CATALOGUE.find((t) => t.id === 'DORM-14');
  if (tower) {
    const canopies = (m: string) => (m.match(/data-door="/g) ?? []).length;
    const front = draw(tower, 'georgian', 0, OPENING);
    const back = draw(tower, 'georgian', 0, BEHIND);
    assert(canopies(front) >= 2 && canopies(back) >= 2, 'the tower has a door on each visible wall in both views');
    assert(front !== back, 'and the two views differ (the canopy and balconies are its own)');
  }
}

// --- The library: the grand entrance on its front -----------------------
{
  const library = CATALOGUE.find((t) => t.facilityType === 'library');
  if (library) {
    // The portico paints after the walls on a front in view, before them
    // (behind the mass) on one turned away.
    const after = (facing: Facing, az: number) => {
      const m = draw(library, 'classical', facing, az);
      return m.indexOf('iso-portico') > m.indexOf('iso-window');
    };
    assert(after(0, OPENING) && !after(0, BEHIND), "the library's portico is on its front: in front from the opening view, behind from behind");
    assert(after(2, OPENING) === after(0, BEHIND), 'facing 2 at the opening view matches facing 0 from behind');
    const m = draw(library, 'classical', 0, OPENING);
    assert((m.match(/iso-portico/g) ?? []).length === 1, 'one portico, not one on every visible wall');
  }
}

setCamera({ azimuth: OPENING, pitch: DEFAULT_PITCH });

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
