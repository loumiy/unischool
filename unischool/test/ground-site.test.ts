// ---------------------------------------------------------------------
// A plate under construction (src/components/groundMarkings.tsx's
// GroundSite, and the `developing` shortcut in front of GroundMarking and
// groundProps).
//
// The bug this pins: open ground was drawn FINISHED throughout its own
// construction — a quad being laid had its lawn, its walks, its fountain
// and its full-grown trees, with a progress bar lying across them. The
// reasoning in the old comment was that a plate has no mass to raise and so
// has no construction state worth drawing; the mass is not what makes
// construction legible, the absence of the finished surface is.
//
// What makes it worth a test rather than a screenshot is that open ground
// is drawn in TWO halves that the map runs as separate passes — the paint
// (GroundMarking) and the things standing on it (groundProps) — so the
// failure mode is one half knowing about construction and the other not.
// A quad with no lawn and a fountain floating over bare earth is a worse
// picture than the bug being fixed, and nothing but a check on both halves
// together rules it out.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import GroundMarking, { GroundSite, groundProps } from '../src/components/groundMarkings';
import { motifOf } from '../src/components/buildingSpec';
import { footprintOf, isPlaceableKind } from '../src/state/campusMap';
import { initialTech } from '../src/data/techData';
import { initialDorms } from '../src/data/campusData';
import { initialFacilities } from '../src/data/facilitiesData';

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

// Every Buildable the map draws as open ground — read off motifOf rather
// than listed here, so a facility added to the grounds motif later is
// covered by these checks without anybody remembering to add it.
const PLATES = [...initialTech(), ...initialDorms(), ...initialFacilities()]
  .filter(isPlaceableKind)
  .filter((t) => motifOf(t) === 'grounds');

console.log('ground site tests');

// --- there is something to test --------------------------------------
{
  assert(PLATES.length > 0, `the catalogue has open ground in it (${PLATES.length} plates)`);

  // The guard against a vacuous suite: if no finished plate had props, every
  // check below would pass on a groundProps that always returned [].
  const withProps = PLATES.filter((t) => {
    const fp = footprintOf(t);
    return groundProps(t.facilityType, 0, 0, fp.w, fp.h, t.tier).length > 0;
  });
  assert(
    withProps.length > 0,
    `and at least one finished plate has things standing on it (${withProps.map((t) => t.facilityType).join(', ')})`,
  );
}

// --- nothing stands on a site ----------------------------------------
{
  let bare = 0;
  for (const t of PLATES) {
    const fp = footprintOf(t);
    const props = groundProps(t.facilityType, 0, 0, fp.w, fp.h, t.tier, true);
    if (props.length === 0) bare += 1;
  }
  assert(
    bare === PLATES.length,
    `no open-ground facility has props while it is being laid (${bare} of ${PLATES.length})`,
  );

  // The quad is the one that made this visible: full-grown trees and a
  // working fountain on ground that had not been graded yet.
  const quad = PLATES.find((t) => t.facilityType === 'quad')!;
  const qf = footprintOf(quad);
  assert(
    groundProps('quad', 0, 0, qf.w, qf.h, quad.tier).length > 0,
    'a finished quad has its planting and its fountain',
  );
  assert(
    groundProps('quad', 0, 0, qf.w, qf.h, quad.tier, true).length === 0,
    'and a quad under construction has neither',
  );
}

// --- a finished plate is untouched ------------------------------------
{
  // The flag must be the ONLY thing it changes: passing developing: false
  // has to give back exactly what omitting it gives back, or the fix has
  // quietly altered every finished campus on the map.
  let same = 0;
  for (const t of PLATES) {
    const fp = footprintOf(t);
    const omitted = groundProps(t.facilityType, 0, 0, fp.w, fp.h, t.tier);
    const explicit = groundProps(t.facilityType, 0, 0, fp.w, fp.h, t.tier, false);
    if (omitted.map((p) => p.key).join() === explicit.map((p) => p.key).join()) same += 1;
  }
  assert(same === PLATES.length, `a finished plate draws the same props either way (${same} of ${PLATES.length})`);
}

// --- the paint half agrees with the props half ------------------------
{
  // Called as a plain function rather than rendered: what is under test is
  // WHICH component GroundMarking hands the plate to, and that is the
  // returned element's type. No DOM, no renderer, no snapshot.
  let sites = 0;
  let surfaces = 0;
  for (const t of PLATES) {
    const fp = footprintOf(t);
    const args = { facilityType: t.facilityType, col: 0, row: 0, w: fp.w, h: fp.h, tier: t.tier };
    if (GroundMarking({ ...args, developing: true }).type === GroundSite) sites += 1;
    if (GroundMarking({ ...args, developing: false }).type !== GroundSite) surfaces += 1;
  }
  assert(sites === PLATES.length, `every plate under construction is drawn as a site (${sites} of ${PLATES.length})`);
  assert(
    surfaces === PLATES.length,
    `and every finished one is drawn as its own surface (${surfaces} of ${PLATES.length})`,
  );

  // The default is finished. A plate whose caller says nothing about
  // construction is not a building site.
  const quad = PLATES.find((t) => t.facilityType === 'quad')!;
  const qf = footprintOf(quad);
  assert(
    GroundMarking({ facilityType: 'quad', col: 0, row: 0, w: qf.w, h: qf.h, tier: quad.tier }).type !== GroundSite,
    'and a plate asked for with no construction flag at all is a finished one',
  );
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
