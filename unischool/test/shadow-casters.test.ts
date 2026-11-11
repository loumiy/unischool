// Cast shadows start at the walls (buildingMotifs' shadowCastersOf, read by
// CampusMap's shadow pass). A building that stands back from a terrace or a
// forecourt, sets houses out on a lawn or puts a tall part beside a low one
// casts from the parts it draws, not from its whole plot at its tallest
// height: the dining hall's shadow lay out beyond its terrace, the village's
// along its plot's edge, and the hospital's filled the corner its wing
// leaves open. Each part is inside the plot, at every facing.
//
// Not part of the game: nothing imports it. Run with `npm test`.

import { drawnHeightOf, shadowCastersOf, villageLotBox, VILLAGE_HOUSES, type ShadowCaster } from '../src/components/buildingMotifs';
import { diningPlan, isHospital, motifOf, wallHeightOf } from '../src/components/buildingSpec';
import type { Plot } from '../src/components/facing';
import { initialTech } from '../src/data/techData';
import { initialDorms } from '../src/data/campusData';
import { initialFacilities } from '../src/data/facilitiesData';
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

console.log('shadow caster tests');

const CATALOGUE: Buildable[] = [...initialTech(), ...initialDorms(), ...initialFacilities()]
  .filter((t) => t.kind !== 'course');
const V: Vernacular = 'georgian';
const FACINGS: Facing[] = [0, 1, 2, 3];
const EPS = 1e-6;

const plotOf = (t: Buildable, facing: Facing): Plot => {
  const fp = footprintOf(t);
  const odd = facing % 2 === 1;
  return { col: 20, row: 30, w: odd ? fp.h : fp.w, h: odd ? fp.w : fp.h, facing };
};
const inside = (c: ShadowCaster, p: Plot) =>
  c.col >= p.col - EPS && c.row >= p.row - EPS && c.col + c.w <= p.col + p.w + EPS && c.row + c.h <= p.row + p.h + EPS;
const overlap = (a: { col: number; row: number; w: number; h: number }, b: { col: number; row: number; w: number; h: number }) =>
  Math.max(0, Math.min(a.col + a.w, b.col + b.w) - Math.max(a.col, b.col)) * Math.max(0, Math.min(a.row + a.h, b.row + b.h) - Math.max(a.row, b.row));
const area = (cs: ShadowCaster[]) => cs.reduce((s, c) => s + c.w * c.h, 0);
const byId = (id: string) => {
  const t = CATALOGUE.find((x) => x.id === id);
  if (!t) throw new Error(`no ${id}`);
  return t;
};

// Each kind checked below is in the catalogue.
assert(CATALOGUE.some((x) => x.facilityType === 'diningHall'), 'the catalogue has dining halls');
assert(CATALOGUE.some((x) => motifOf(x) === 'village'), 'and a village');
assert(CATALOGUE.some((x) => isHospital(x) && Math.min(footprintOf(x).w, footprintOf(x).h) >= 7), 'and a split hospital');
assert(CATALOGUE.some((x) => motifOf(x) === 'tower'), 'and a residence tower');

// ---- Every building: parts inside its plot, at a height ----
for (const t of CATALOGUE) {
  for (const facing of FACINGS) {
    const p = plotOf(t, facing);
    const cs = shadowCastersOf(t, p, false, V);
    if (motifOf(t) === 'grounds') {
      assert(cs.length === 0, `${t.id}: open ground casts nothing`);
      continue;
    }
    assert(cs.length > 0, `${t.id} facing ${facing}: casts a shadow`);
    assert(cs.every((c) => inside(c, p)), `${t.id} facing ${facing}: every part lies inside the plot`);
    assert(cs.every((c) => c.height > 0 && c.w > 0 && c.h > 0), `${t.id} facing ${facing}: every part has a size and a height`);
    // A site is its low frame, over the whole plot (CampusMap raises it to its stage).
    const site = shadowCastersOf(t, p, true, V);
    if (t.renovatingFrom === undefined) {
      assert(site.length === 1 && Math.abs(site[0]!.height - drawnHeightOf(t, true, V)) < EPS && Math.abs(area(site) - p.w * p.h) < EPS,
        `${t.id} facing ${facing}: a site casts its frame over the whole plot`);
    }
  }
}

// ---- A plain hall is one box over its plot at its drawn height ----
{
  const hall = CATALOGUE.find((t) => t.kind === 'building' && motifOf(t) === 'hall')!;
  const p = plotOf(hall, 0);
  const cs = shadowCastersOf(hall, p, false, V);
  assert(cs.length === 1 && cs[0]!.col === p.col && cs[0]!.w === p.w && cs[0]!.height === drawnHeightOf(hall, false, V), 'a plain hall casts its whole plot at its drawn height');
}

// ---- The dining hall: from the hall, not the terrace before it ----
for (const t of CATALOGUE.filter((x) => x.facilityType === 'diningHall')) {
  for (const facing of FACINGS) {
    const p = plotOf(t, facing);
    const terrace = diningPlan(t, p, V).terrace;
    const cs = shadowCastersOf(t, p, false, V);
    assert(cs.every((c) => overlap(c, terrace) < EPS), `${t.id} facing ${facing}: nothing casts from the terrace`);
  }
}

// ---- The village: one shadow per house, none from the lawn ----
for (const t of CATALOGUE.filter((x) => motifOf(x) === 'village')) {
  for (const facing of FACINGS) {
    const p = plotOf(t, facing);
    const cs = shadowCastersOf(t, p, false, V);
    assert(cs.length === VILLAGE_HOUSES.length, `${t.id} facing ${facing}: a shadow for each house`);
    assert(VILLAGE_HOUSES.every((lot, i) => overlap(cs[i]!, villageLotBox(p, lot)) > cs[i]!.w * cs[i]!.h - EPS), `${t.id} facing ${facing}: each on its own lot`);
    assert(area(cs) < p.w * p.h * 0.6, `${t.id} facing ${facing}: the lawn between them casts nothing`);
  }
}

// ---- The hospital: the tall slab and the low wing, not the open corner ----
for (const t of CATALOGUE.filter((x) => isHospital(x) && Math.min(footprintOf(x).w, footprintOf(x).h) >= 7)) {
  for (const facing of FACINGS) {
    const p = plotOf(t, facing);
    const cs = shadowCastersOf(t, p, false, V);
    assert(cs.length === 2 && cs[0]!.height > cs[1]!.height, `${t.id} facing ${facing}: a slab taller than its wing`);
    assert(area(cs) < p.w * p.h - 1, `${t.id} facing ${facing}: the corner the wing leaves open casts nothing`);
  }
}

// ---- The Museum stands back behind its forecourt ----
{
  const museum = byId('PROJ-MUSEUM');
  for (const facing of FACINGS) {
    const p = plotOf(museum, facing);
    const cs = shadowCastersOf(museum, p, false, V);
    assert(cs.length === 1 && area(cs) < p.w * p.h * 0.8, `museum facing ${facing}: casts from the gallery, not the forecourt`);
  }
}

// ---- A residence tower: a low podium and a tall inset shaft ----
for (const t of CATALOGUE.filter((x) => motifOf(x) === 'tower')) {
  const p = plotOf(t, 0);
  const cs = shadowCastersOf(t, p, false, V);
  assert(cs.length === 2 && cs[0]!.height < cs[1]!.height && cs[1]!.w < p.w && cs[1]!.h < p.h,
    `${t.id}: the podium low over the plot, the shaft tall and inset`);
  assert(cs[1]!.height > wallHeightOf(t) * 0.9, `${t.id}: the shaft casts at the tower's height`);
}

if (failures === 0) {
  console.log(`  ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
