// The land around the campus (src/components/ringLand.ts, Plans 81B–81D):
// generated from the college's name and the same every time, different
// from one name to the next, never on the parcel, gentle enough that no
// hill hides the ground behind it, and the camera kept over it at every
// view, pitch and zoom.

import {
  CROWNS_MAX, FLAT, MAX_SLOPE, RING, TREES_MAX, clampView, fieldsTouch, heightAt, isFarm, landOf, parcelDistance, ringView, ringZoomFloor, type Land,
} from '../src/components/ringLand';
import { PITCHES, VIEWS, setCamera, unproject } from '../src/components/isoProjection';
import { CAMPUS_GRID_HEIGHT as GH, CAMPUS_GRID_WIDTH as GW } from '../src/state/types';
import { ROAD_FIRST_ROW } from '../src/state/campusMap';

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('surroundings tests');

const NAMES = ['Blackmoor University', 'Harrow Vale College', 'Saint Aldric', 'Q', 'Université de Montfort', 'A'];

// The same name, the same land; another name, another.
const a = JSON.stringify(landOf('Blackmoor University'));
landOf('Harrow Vale College');
assert(JSON.stringify(landOf('Blackmoor University')) === a, 'a name gives the same land every time');
const differs = (x: Land, y: Land) => JSON.stringify(x.fields) !== JSON.stringify(y.fields) && JSON.stringify(x.houses) !== JSON.stringify(y.houses);
assert(differs(landOf('Blackmoor University'), landOf('Harrow Vale College')), 'two names give two lands');
const towns = new Set(NAMES.map((n) => landOf(n).town));
assert(towns.size === 2, 'the town stands west of one campus and east of another');

const overlaps = (p: { c0: number; r0: number; c1: number; r1: number }, q: { c0: number; r0: number; c1: number; r1: number }) =>
  p.c0 < q.c1 && q.c0 < p.c1 && p.r0 < q.r1 && q.r0 < p.r1;
const PARCEL = { c0: 0, r0: 0, c1: GW, r1: GH };
const ROAD = { c0: -RING, r0: ROAD_FIRST_ROW, c1: GW + RING, r1: GH };

for (const name of NAMES) {
  const land = landOf(name);
  // Nothing of it on the parcel, and nothing built on the road.
  assert(land.fields.every((f) => !overlaps(f, PARCEL)), `${name}: no field on the parcel`);
  assert(land.fields.every((f) => !overlaps(f, ROAD)), `${name}: no field on the road`);
  const box = (h: Land['houses'][number]) => ({ c0: h.col, r0: h.row, c1: h.col + h.w, r1: h.row + h.h });
  assert(land.houses.length >= 20, `${name}: a town along the road (${land.houses.length} houses)`);
  assert(land.houses.every((h) => !overlaps(box(h), PARCEL) && !overlaps(box(h), ROAD)), `${name}: no house on the parcel or the road`);
  assert(land.houses.every((h, i) => land.houses.every((g, j) => i === j || !overlaps(box(h), box(g)))), `${name}: no two houses stand in each other`);
  const lanes = land.lanes.map(([c0, r0, c1, r1]) => ({ c0: Math.min(c0, c1) - 0.4, r0: Math.min(r0, r1), c1: Math.max(c0, c1) + 0.4, r1: Math.max(r0, r1) }));
  assert(land.houses.every((h) => lanes.every((l) => !overlaps(box(h), l))), `${name}: no house on a lane`);
  const pt = (p: { col: number; row: number }) => ({ c0: p.col, r0: p.row, c1: p.col + 0.01, r1: p.row + 0.01 });
  assert([...land.trees, ...land.crowns].every((t) => !overlaps(pt(t), PARCEL) && !overlaps(pt(t), ROAD)), `${name}: no tree on the parcel or the road`);
  // The campus's own tree art stands on the flat valley floor only.
  assert(land.trees.every((t) => heightAt(land, t.col, t.row) === 0), `${name}: the drawn trees stand on the valley floor`);

  // Plan 81C: the farms a minority of the land, kept to the road and the
  // town. Plan 81D: the rest open grass.
  let land0 = 0; let farm = 0; let farFarm = 0;
  for (let row = -180; row <= GH + 180; row += 3) {
    for (let col = -180; col <= GW + 180; col += 3) {
      const d = parcelDistance(col, row);
      if (d <= 0 || d > 180 || (row >= ROAD_FIRST_ROW && row <= GH)) continue;
      land0 += 1;
      const f = land.fields.find((x) => col >= x.c0 && col < x.c1 && row >= x.r0 && row < x.r1);
      if (f && isFarm(f.cover)) {
        farm += 1;
        if (row < ROAD_FIRST_ROW - 100 || row > GH + 100) farFarm += 1;
      }
    }
  }
  assert(farm / land0 < 0.4, `${name}: farmland is under 40% of the land (${((100 * farm) / land0).toFixed(0)}%)`);
  assert(farm / land0 > 0.1, `${name}: but there are farms (${((100 * farm) / land0).toFixed(0)}%)`);
  assert(farFarm === 0, `${name}: the farms keep to the road and the town`);
  // Plan 81D: the farm fields have no border, so two that touch along an
  // edge are told apart by cover alone (where three covers could not do it,
  // a field lies fallow as rough grass).
  const farms = land.fields.filter((f) => isFarm(f.cover));
  let pairs = 0; let same = 0;
  for (let i = 0; i < farms.length; i++) {
    for (let j = i + 1; j < farms.length; j++) {
      if (!fieldsTouch(farms[i]!, farms[j]!)) continue;
      pairs += 1;
      if (farms[i]!.cover === farms[j]!.cover) same += 1;
    }
  }
  assert(pairs > 50 && same === 0, `${name}: touching farm fields differ in cover (${same} of ${pairs} pairs alike)`);

  // Plan 81D: no woods, trees scattered. The band: enough that the grass is
  // not bare (the valley floor alone is some 16,000 tiles, so under a tree
  // or two per thousand tiles would read as empty), and few enough that
  // they never gather into a wood (a wood is hundreds of trees a few tiles
  // apart). Near the campus the tree art is capped at TREES_MAX, further out
  // the crowns at CROWNS_MAX, and both thin with distance.
  const all = [...land.trees, ...land.crowns];
  assert(land.trees.length >= 15 && land.trees.length <= TREES_MAX, `${name}: ${land.trees.length} trees near the campus, a scattering`);
  assert(land.crowns.length >= 60 && land.crowns.length <= CROWNS_MAX, `${name}: ${land.crowns.length} far trees, a scattering`);
  const near = all.filter((t) => parcelDistance(t.col, t.row) < 60).length;
  const far = all.filter((t) => parcelDistance(t.col, t.row) >= 60).length;
  // The band 60–125 tiles out is about 2.6 times the area of the one within
  // 60, so fewer trees there means they thin with distance.
  assert(far < near * 1.4, `${name}: the trees thin with distance (${near} near, ${far} far)`);
  // Scattered: no tree has more than a small group within four tiles.
  const crowded = all.filter((t) => all.filter((u) => Math.hypot(u.col - t.col, u.row - t.row) < 4).length > 5).length;
  assert(crowded === 0, `${name}: no trees gather into a wood (${crowded} crowded)`);
  const houseBox = (h: Land['houses'][number]) => ({ c0: h.col - 0.5, r0: h.row - 0.5, c1: h.col + h.w + 0.5, r1: h.row + h.h + 0.5 });
  assert(land.houses.every((h) => all.every((t) => !overlaps(pt(t), houseBox(h)))), `${name}: no tree stands in a house`);

  // A flat valley floor, hills beyond it.
  let floorFlat = true;
  let highest = 0;
  let steepest = 0;
  for (let row = -RING; row <= GH + RING; row += 3) {
    for (let col = -RING; col <= GW + RING; col += 3) {
      const h = heightAt(land, col, row);
      if (parcelDistance(col, row) <= FLAT && h !== 0) floorFlat = false;
      highest = Math.max(highest, h);
      const g = Math.hypot(heightAt(land, col + 0.5, row) - heightAt(land, col - 0.5, row), heightAt(land, col, row + 0.5) - heightAt(land, col, row - 0.5));
      steepest = Math.max(steepest, g);
    }
  }
  assert(floorFlat, `${name}: the valley floor is flat`);
  assert(land.hills.length >= 8 && highest > 150, `${name}: hills rise beyond it (${land.hills.length}, highest ${highest.toFixed(0)})`);
  // No slope steeper than the lowest pitch's sight line, so no hill hides
  // ground behind it and the ground's merged shapes can go down in any order.
  assert(steepest <= MAX_SLOPE, `${name}: gentle (steepest ${steepest.toFixed(2)} units a tile)`);
}
// A slope hides what is behind it once it rises faster than the sight line
// falls: (TILE_W / sqrt 2) cos 30deg tan(pitch) height units a tile.
const lowest = (64 / Math.SQRT2) * Math.cos(Math.asin(0.5)) * Math.tan(PITCHES[0]!);
assert(MAX_SLOPE < lowest, `the slope limit is under the lowest pitch's (${lowest.toFixed(2)})`);

// The camera never shows past the ring: at every view and pitch, at the
// widest zoom it allows, from anywhere, every corner of the canvas stays
// over the land.
for (const [width, height] of [[1440, 900], [390, 844], [2560, 1440], [3840, 2160]] as const) {
  for (const azimuth of VIEWS) {
    for (const pitch of PITCHES) {
      setCamera({ azimuth, pitch });
      const zoom = Math.max(0.22, ringZoomFloor(width, height));
      let inside = true;
      for (const [x, y] of [[-1e6, -1e6], [1e6, 1e6], [5e4, -3e4], [0, 0]] as const) {
        const v = clampView({ x, y, zoom }, width, height);
        for (const [sx, sy] of [[0, 0], [width, 0], [0, height], [width, height]] as const) {
          const g = unproject((sx - v.x) / v.zoom, (sy - v.y) / v.zoom);
          if (g.col < -RING - 1e-6 || g.col > GW + RING + 1e-6 || g.row < -RING - 1e-6 || g.row > GH + RING + 1e-6) inside = false;
        }
      }
      assert(inside, `${width}x${height}, view ${azimuth.toFixed(2)}, pitch ${pitch.toFixed(2)}: the canvas stays over the land`);
    }
  }
}
// At the opening pitch on a desktop, the map's own widest zoom is allowed.
setCamera({ azimuth: VIEWS[0]!, pitch: PITCHES[3]! });
assert(ringZoomFloor(1440, 900) < 0.22, 'the widest zoom is the map\'s own at the opening view');
// A view already over the land is left alone.
const still = { x: 100, y: -200, zoom: 0.5 };
assert(clampView(still, 1440, 900) === still, 'a view over the land is not moved');

// The view is a handful of shapes and a modest number of sprites.
for (const azimuth of VIEWS) {
  setCamera({ azimuth, pitch: PITCHES[3]! });
  const view = ringView('Blackmoor University');
  const sprites = view.back.length + view.front.length;
  assert(view.covers.length <= 40 && sprites < 450, `view ${azimuth.toFixed(2)}: ${view.covers.length} field shapes, ${sprites} sprites`);
  assert(!('woods' in view) && !('pines' in view), 'no wood shapes (Plan 81D)');
  assert(!('hedges' in view), 'no borders round the fields (Plan 81D)');
  assert(view.back.every((s, i) => i === 0 || s.y >= view.back[i - 1]!.y), 'sprites go down back to front');
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
