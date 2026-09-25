// ---------------------------------------------------------------------
// The campus map's painter's order (src/components/depthSort.ts).
//
// This is the kind of property that regresses silently: a wrong draw order
// does not throw, it just leaves a building looking like it is made of glass
// somewhere on a map nobody was looking at. So it is pinned here rather than
// trusted to review.
//
// The check is a BRUTE FORCE one — for every pair of things in a scene, ask
// `occludes` directly which should be drawn first, and assert the produced
// order agrees. That is the definition of correct, so the test cannot drift
// from the implementation by sharing an assumption with it.
//
// Layouts are built from the REAL footprint catalog (footprintOf over
// initialTech) at a fixed seed, not from invented rectangles, so the shapes
// under test are the shapes the game can actually place.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { depthOrder, occludes, type DepthBox } from '../src/components/depthSort';
import { DEFAULT_CAMERA, DEFAULT_PITCH_INDEX, PITCHES, VIEWS, setCamera } from '../src/components/isoProjection';
import { footprintOf, isPlaceableKind } from '../src/state/campusMap';
import { groundProps } from '../src/components/groundMarkings';
import { motifOf } from '../src/components/buildingSpec';
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

// A seeded PRNG, so a failure is reproducible rather than "it went red once".
let seed = 20260914;
function rnd(): number {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
}

// Every footprint the catalog can actually put on the map.
const CATALOGUE = [...initialTech(), ...initialDorms(), ...initialFacilities()]
  .filter(isPlaceableKind)
  .map(footprintOf);

// A scene of non-overlapping footprints, plus one-tile items standing on the
// gaps between them — which is exactly what a campus is: buildings, and trees
// on the ground that is left.
function layout(buildings: number, trees: number, span: number): DepthBox[] {
  const out: DepthBox[] = [];
  const clear = (b: DepthBox) => out.every((o) => !(
    b.col < o.col + o.w && o.col < b.col + b.w && b.row < o.row + o.h && o.row < b.row + b.h
  ));
  for (let guard = 0; out.length < buildings && guard < buildings * 200; guard++) {
    const fp = CATALOGUE[Math.floor(rnd() * CATALOGUE.length)];
    const b = { col: Math.floor(rnd() * span), row: Math.floor(rnd() * span), w: fp.w, h: fp.h };
    if (clear(b)) out.push(b);
  }
  for (let guard = 0; out.length < buildings + trees && guard < trees * 200; guard++) {
    const b = { col: Math.floor(rnd() * span), row: Math.floor(rnd() * span), w: 1, h: 1 };
    if (clear(b)) out.push(b);
  }
  return out;
}

// Every pair, against the relation itself.
function violations(order: readonly DepthBox[]): number {
  let bad = 0;
  for (let i = 0; i < order.length; i++) {
    for (let j = i + 1; j < order.length; j++) {
      // i is drawn before j, so j must not be BEHIND i.
      if (occludes(order[i], order[j]) === 1) bad += 1;
    }
  }
  return bad;
}

// The key the map used to sort on, kept here so the test can show it is
// genuinely being repaired rather than merely replaced.
const farCorner = (b: DepthBox) => b.row + b.h + b.col + b.w;

console.log('campus map painter\'s order');

// --- 1. The relation itself -----------------------------------------------
{
  // A 12-wide hall on rows 0-1, and a small lab standing in front of its left
  // end. This is the case the old scalar key got backwards, and the reason
  // this module exists — so it is named explicitly rather than left to the
  // random sweep to rediscover.
  const hall: DepthBox = { col: 0, row: 0, w: 12, h: 1 };
  const lab: DepthBox = { col: 0, row: 1, w: 2, h: 2 };
  assert(occludes(lab, hall) === 1, 'a lab in front of a long hall is nearer the camera');
  assert(farCorner(lab) < farCorner(hall), 'and the OLD scalar key put it behind — the bug this fixes');
  const [first, second] = depthOrder([hall, lab]);
  assert(first === hall && second === lab, 'the hall is drawn first, so the lab paints over it');
}
{
  // Separated on both axes: opposite diagonal corners of the screen, never
  // overlapping, so the relation must decline to order them at all.
  const a: DepthBox = { col: 0, row: 8, w: 2, h: 2 };
  const b: DepthBox = { col: 8, row: 0, w: 2, h: 2 };
  assert(occludes(a, b) === 0, 'two footprints on opposite diagonals never occlude');
  assert(occludes(b, a) === 0, 'and the relation says so in both directions');
}
{
  // An L of two long footprints, which genuinely overlap on screen.
  const acrossCol: DepthBox = { col: 0, row: 0, w: 6, h: 2 };
  const downRow: DepthBox = { col: 0, row: 2, w: 2, h: 6 };
  assert(
    occludes(downRow, acrossCol) === 1 && occludes(acrossCol, downRow) === -1,
    'the relation is antisymmetric',
  );
}
{
  // Footprints that touch along an edge. Their rhombuses only meet, but the
  // near building's MASS rises up the screen across the far one's base, so the
  // order genuinely matters — and the conservative gate in `occludes` admits
  // the pair rather than leaving it to the tie-break. (Being conservative in
  // that direction is the safe one; see the note in depthSort.ts.)
  const far: DepthBox = { col: 4, row: 0, w: 2, h: 2 };
  const near: DepthBox = { col: 4, row: 2, w: 2, h: 2 };
  assert(occludes(near, far) === 1, 'a building directly in front of its neighbor is nearer');
  const [first, second] = depthOrder([near, far]);
  assert(first === far && second === near, 'so the nearer one is drawn last');
}

// --- 2. The sweep ---------------------------------------------------------
{
  let total = 0;
  let scalarTotal = 0;
  let items = 0;
  for (let run = 0; run < 60; run++) {
    const scene = layout(70, 700, 60);
    items += scene.length;
    const ordered = depthOrder(scene);
    assert(ordered.length === scene.length, 'every item in the scene comes back out of the sort');
    total += violations(ordered);
    scalarTotal += violations([...scene].sort((a, b) => farCorner(a) - farCorner(b)));
  }
  assert(total === 0, `60 scenes, ${items} items: expected 0 occlusion violations, got ${total}`);
  // Not a correctness claim about the new sort — a guard that the sweep above
  // is actually exercising the hard cases. If the layouts ever stop producing
  // pairs the old key got wrong, this test has quietly stopped testing.
  assert(scalarTotal > 0, `the old scalar key still fails these layouts (${scalarTotal} violations) — the sweep is biting`);
  console.log(`  · sweep: ${items} items over 60 scenes — topological 0, old scalar key ${scalarTotal}`);
}

// --- 3. The tie-break -----------------------------------------------------
{
  // A scene whose items never occlude each other must come out in exactly the
  // order the map always drew it in. This is what makes the change a repair
  // rather than a reshuffle: where occlusion has no opinion, nothing moves.
  const spaced: DepthBox[] = [];
  for (let i = 0; i < 12; i++) spaced.push({ col: i * 9, row: i * 9, w: 3, h: 3 });
  const shuffled = [...spaced].reverse();
  const ordered = depthOrder(shuffled);
  const byKey = [...shuffled].sort((a, b) => farCorner(a) - farCorner(b));
  assert(
    ordered.every((b, i) => b === byKey[i]),
    'with no occlusion to satisfy, the order falls back to the old scalar key',
  );
}

// --- 3b. Every azimuth ----------------------------------------------------
{
  // The camera turns continuously, so the relation has to be right — and
  // acyclic — at every azimuth, not just the four the grid lines up with. Same
  // brute-force check as the sweep, at 48 azimuths including the cardinals
  // (where one grid axis runs straight across the screen and says nothing
  // about depth) and the 45-degree diagonals either side of them.
  let total = 0;
  let asym = 0;
  let items = 0;
  const steps = 48;
  for (let k = 0; k < steps; k++) {
    const azimuth = (k / steps) * Math.PI * 2;
    setCamera({ azimuth, pitch: DEFAULT_CAMERA.pitch });
    const scene = layout(50, 400, 60);
    items += scene.length;
    const ordered = depthOrder(scene);
    assert(ordered.length === scene.length, `azimuth ${k}/${steps}: every item comes back out of the sort`);
    total += violations(ordered);
    // The relation must be antisymmetric at every camera, or the sort is
    // being asked to satisfy a contradiction.
    for (let i = 0; i < scene.length; i += 7) {
      for (let j = i + 1; j < scene.length; j += 5) {
        if (occludes(scene[i], scene[j]) !== -occludes(scene[j], scene[i])) asym += 1;
      }
    }
  }
  setCamera(DEFAULT_CAMERA);
  assert(total === 0, `${steps} azimuths, ${items} items: expected 0 occlusion violations, got ${total}`);
  assert(asym === 0, `the relation is antisymmetric at every azimuth (${asym} pairs were not)`);
  console.log(`  · azimuths: ${items} items over ${steps} cameras — ${total} violations`);
}

// --- 3c. Every pitch on the tilt ladder -----------------------------------
{
  // Ten pitches from nearly level to straight down, at each of the four
  // views. The sort is on the ground alone, so it must hold at all of them;
  // and the camera must land on each pitch as asked, not a clamped one.
  assert(PITCHES.length === 10, 'the tilt ladder has ten pitches');
  assert(PITCHES.every((p, i) => i === 0 || p > PITCHES[i - 1]), 'from flattest to steepest');
  assert(PITCHES[DEFAULT_PITCH_INDEX] === DEFAULT_CAMERA.pitch, 'and the opening pitch is on it');
  let total = 0;
  for (const pitch of PITCHES) {
    for (const azimuth of VIEWS) {
      const applied = setCamera({ azimuth, pitch });
      assert(Math.abs(applied.pitch - pitch) < 1e-12, `pitch ${pitch.toFixed(3)} is not clamped`);
      const ordered = depthOrder(layout(40, 300, 50));
      total += violations(ordered);
    }
  }
  setCamera(DEFAULT_CAMERA);
  assert(total === 0, `every pitch and view: expected 0 occlusion violations, got ${total}`);
}

// --- 4. Determinism -------------------------------------------------------
{
  const scene = layout(40, 300, 50);
  const a = depthOrder(scene);
  const b = depthOrder(scene);
  assert(a.every((x, i) => x === b[i]), 'the same scene sorts the same way every time');
}

// --- 5. Cost --------------------------------------------------------------
{
  const scene = layout(70, 790, 70);
  const t0 = performance.now();
  const runs = 20;
  for (let i = 0; i < runs; i++) depthOrder(scene);
  const ms = (performance.now() - t0) / runs;
  console.log(`  · cost: ${scene.length} items in ${ms.toFixed(1)} ms per sort`);
  // Generous on purpose: this runs when the campus CHANGES, not per frame (the
  // map memoises it), so the bar is "nothing pathological" rather than a
  // frame budget. A quadratic creeping in over the trees would blow past it.
  assert(ms < 120, `a full scene sorts in well under a frame-ish budget (${ms.toFixed(1)} ms)`);
}

// --- 6. What stands on open ground ----------------------------------------
// A plate's raised props enter THIS sort individually, each on the ground it
// covers (see groundMarkings.tsx's own note on why a big flat footprint
// cannot be sorted as one thing). That only works if the box each prop
// declares is the box it actually occupies: a prop that declares somewhere
// else sorts at the wrong depth and paints through whatever is standing
// there, which is the exact failure the split exists to avoid.
{
  const PLATES = [...initialTech(), ...initialDorms(), ...initialFacilities()]
    .filter(isPlaceableKind)
    .filter((t) => motifOf(t) === 'grounds');

  let real = 0;
  let inside = 0;
  let total = 0;
  for (const t of PLATES) {
    const fp = footprintOf(t);
    for (const prop of groundProps(t.facilityType, 0, 0, fp.w, fp.h, t.tier, false, t.id, 2)) {
      total += 1;
      if (prop.w > 0 && prop.h > 0) real += 1;
      // Half a tile of slack: a tree's crown legitimately overhangs the edge
      // of the lawn it stands at the corner of.
      const S = 0.5;
      if (prop.col >= -S && prop.row >= -S && prop.col + prop.w <= fp.w + S && prop.row + prop.h <= fp.h + S) inside += 1;
    }
  }
  assert(total > 0, `open ground has raised props on it (${total} across ${PLATES.length} plates)`);
  assert(real === total, `every prop covers real ground rather than a point (${real} of ${total})`);
  assert(inside === total, `and every prop stands on the plate it belongs to (${inside} of ${total})`);

  // The diamond's seating, specifically. 4C replaced one continuous arc of
  // stand with discrete banks, and the reason it is a list rather than one
  // prop is this sort: a tree beside the third-base line has to pass in
  // front of the bank nearest it and behind the one further round, which one
  // box spanning the whole sweep can never express.
  const diamond = PLATES.find((t) => t.facilityType === 'athleticsDiamond')!;
  const df = footprintOf(diamond);
  const banks = groundProps('athleticsDiamond', 0, 0, df.w, df.h, undefined, false, undefined, 2).filter((p) => p.key.startsWith('stand-'));
  assert(banks.length > 1, `the diamond's seating is banks, not a bowl (${banks.length} of them)`);
  const boxes = new Set(banks.map((b) => `${b.col.toFixed(3)},${b.row.toFixed(3)},${b.w.toFixed(3)},${b.h.toFixed(3)}`));
  assert(boxes.size === banks.length, 'each bank declares its own ground rather than a shared box');

  // And they sort: the sweep is centered on the camera, so the bank behind
  // the plate is nearer than the ones out along the lines and must be
  // painted after them.
  const order = depthOrder(banks.map((b) => ({ col: b.col, row: b.row, w: b.w, h: b.h })));
  const depth = (b: DepthBox) => b.col + b.w + b.row + b.h;
  const middle = banks[Math.floor(banks.length / 2)];
  const deepest = order[order.length - 1];
  assert(
    depth(deepest) >= depth({ col: middle.col, row: middle.row, w: middle.w, h: middle.h }),
    'the bank nearest the camera is painted last',
  );
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
