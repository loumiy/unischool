import { CAMPUS_GRID_HEIGHT as GH, CAMPUS_GRID_WIDTH as GW } from '../state/types';
import { ROAD_FIRST_ROW } from '../state/campusMap';
import { hashUnit } from '../data/rivalData';
import type { Species } from '../data/treeData';
import {
  boxFaces, currentCamera, heightScale, lift, polyPoints, project, unproject, visibleWalls,
  type Camera, type FaceDir, type Pt,
} from './isoProjection';
import { SUN_FROM } from './light';
import { UNITS_PER_TILE_UP } from './campusScale';
import { treeOutline } from './trees';

// The land around the campus (Plan 81B): a ring of country drawn past the
// parcel's edge on every side, so the campus stands somewhere rather than
// on a board in space. The road runs on off both ends; fields divided by
// hedgerows, woods, a low town edge along the road, and gentle hills rising
// away from a flat valley floor, all fading into haze with distance.
//
// Drawing only, and not state: the land is generated from the college's
// name (a seeded hash, as the rivals' colors are), so it is the same on
// every load, and nothing of it is saved. Nothing in it can be built on,
// clicked or walked; siting, reach and the walkers know nothing of it.
//
// Pure geometry here (no React); Surroundings.tsx draws it. The land is
// built once per name and projected once per camera (both cached), as a few
// large merged shapes and a sparse, depth-sorted set of sprites.

// How far the ring runs past the parcel's edge on every side, in tiles. The
// camera never shows past it (clampView), and the haze is solid well before it.
export const RING = 200;
// The valley floor: the ring stays flat this far out from the parcel, so
// the campus sits on level ground, and the hills rise beyond it.
export const FLAT = 26;

// The haze, as a radius about the parcel's center in tiles: clear to
// HAZE_START, solid by HAZE_SOLID (at the opening pitch; lower pitches pull
// both in, see hazeOf). Nothing is drawn further than HAZE_CULL from the
// parcel's edge, where it is all but solid, and no hedge past HEDGE_REACH.
const HAZE_START = 72;
const HAZE_SOLID = 238;
const HAZE_CULL = 180;
const HEDGE_REACH = 130;

// The height field, in screen units as authored at the default pitch (the
// motifs' `up` unit, about 4.35 to a meter). The whole valley rises a
// little away from the parcel, and hills stand on that rise.
const VALLEY_RISE = 240;
const VALLEY_RUN = 170;
const HILLS = 20;
// Steepest a slope may be anywhere in the ring, in height units per tile.
// Below the lowest pitch's own slope (about 8 units a tile), so no hill
// hides the ground behind it at any view: the ground can be drawn as merged
// shapes in any order. test/surroundings.test.ts holds it.
export const MAX_SLOPE = 7;

// Sprites stop where the haze all but hides them.
const TREES_MAX = 40;
const CLUMPS_MAX = 70;
const CLUMP_REACH = 110;

export type Cover = 'meadow' | 'crop' | 'hay' | 'plough' | 'wood' | 'pine' | 'town';

// `shade` is how the field's slope takes the light, -2 (turned away) to 2.
export interface Field { c0: number; r0: number; c1: number; r1: number; cover: Cover; shade: Shade; }
export type Shade = -2 | -1 | 0 | 1 | 2;
export interface Hill { col: number; row: number; radius: number; height: number; }
// A house or barn: a box with a gable roof along its longer side. `wall` and
// `roof` index the vernacular's palette (Surroundings.tsx); -1 is a barn's.
export interface House {
  col: number; row: number; w: number; h: number;
  wallH: number; ridge: number; wall: number; roof: number;
}
export interface TreeSpot { col: number; row: number; species: Species; scale: number; }
export interface Clump { col: number; row: number; size: number; pine: boolean; }

export interface Land {
  // The side of the parcel the town stands on.
  town: 'west' | 'east';
  fields: Field[];
  hills: Hill[];
  houses: House[];
  trees: TreeSpot[];
  clumps: Clump[];
  // Lanes through the town: [c0, r0, c1, r1], straight runs.
  lanes: [number, number, number, number][];
}

// --- the land, per name ----------------------------------------------------

// The land's own random numbers (mulberry32), seeded from the name; never
// the sim's stream.
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Distance from a grid point to the parcel, in tiles; 0 on it.
export function parcelDistance(col: number, row: number): number {
  const dc = col < 0 ? -col : col > GW ? col - GW : 0;
  const dr = row < 0 ? -row : row > GH ? row - GH : 0;
  return Math.hypot(dc, dr);
}

// Distance from a grid rectangle's nearest point to the parcel.
function rectDistance(c0: number, r0: number, c1: number, r1: number): number {
  return Math.hypot(Math.max(0, c0 - GW, -c1), Math.max(0, r0 - GH, -r1));
}

const smooth = (t: number) => {
  const u = Math.max(0, Math.min(1, t));
  return u * u * (3 - 2 * u);
};

// The ground's height at a grid point: 0 on the parcel and the valley floor.
export function heightAt(land: Land, col: number, row: number): number {
  const d = parcelDistance(col, row);
  if (d <= FLAT) return 0;
  let h = VALLEY_RISE * smooth((d - FLAT) / VALLEY_RUN);
  for (const hill of land.hills) {
    const dc = col - hill.col;
    const dr = row - hill.row;
    const q = (dc * dc + dr * dr) / (hill.radius * hill.radius);
    if (q < 1) h += hill.height * (1 - q) * (1 - q);
  }
  return h;
}

const LAND_CACHE = new Map<string, Land>();

export function landOf(name: string): Land {
  const hit = LAND_CACHE.get(name);
  if (hit) return hit;
  const land = buildLand(name);
  if (LAND_CACHE.size > 8) LAND_CACHE.clear();
  LAND_CACHE.set(name, land);
  return land;
}

// Built as if the town stood west of the parcel, then mirrored across it
// when the name puts it east.
function buildLand(name: string): Land {
  const rand = rng(Math.floor(hashUnit(`${name}:surroundings`) * 4294967296));
  const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(rand() * xs.length)]!;
  const land: Land = { town: rand() < 0.5 ? 'west' : 'east', fields: [], hills: [], houses: [], trees: [], clumps: [], lanes: [] };

  // Hills: well out on the valley's rise, none reaching the floor, apart.
  for (let tries = 0; land.hills.length < HILLS && tries < 400; tries++) {
    const col = -RING + rand() * (GW + 2 * RING);
    const row = -RING + rand() * (GH + 2 * RING);
    const d = parcelDistance(col, row);
    const radius = 20 + d * 0.14 + rand() * 12;
    if (d - radius < FLAT + 2 || d > HAZE_CULL) continue;
    if (land.hills.some((h) => Math.hypot(h.col - col, h.row - row) < 0.85 * (h.radius + radius))) continue;
    const height = Math.min(2.8 * radius, (60 + d * 0.8) * (0.75 + rand() * 0.5));
    land.hills.push({ col, row, radius, height });
  }

  // The town: along the road west of the parcel, and across the road from
  // the campus's west end.
  const road0 = ROAD_FIRST_ROW;
  const length = Math.round(38 + rand() * 22);
  const across = Math.round(34 + rand() * 30);
  const townN = { c0: -length, r0: road0 - 16, c1: -2, r1: road0 - 2 };
  const townS = { c0: -length, r0: GH + 2, c1: across, r1: GH + 16 };
  const laneA = -Math.round(11 + rand() * 4);
  const laneB = laneA - Math.round(15 + rand() * 6);
  const lanes = [laneA, ...(laneB > -length + 6 ? [laneB] : [])];
  for (const c of lanes) {
    land.lanes.push([c, townN.r0 - 1, c, road0], [c, GH, c, townS.r1 + 1]);
  }

  // Fields: each block cut in two, again and again, into fields that grow
  // with distance from the parcel.
  const blocks: [number, number, number, number][] = [
    [-RING, -RING, GW + RING, -2],
    [-RING, -2, -2, townN.r0],
    [-RING, townN.r0, -length, road0 - 2],
    [GW + 2, -2, GW + RING, road0 - 2],
    [-RING, townS.r1, GW + RING, GH + RING],
    [-RING, GH + 2, -length, townS.r1],
    [across, GH + 2, GW + RING, townS.r1],
  ];
  const cut = (c0: number, r0: number, c1: number, r1: number) => {
    const w = c1 - c0;
    const h = r1 - r0;
    // Out past the haze nothing shows: leave it to the base.
    if (rectDistance(c0, r0, c1, r1) > HAZE_CULL) return;
    const d = parcelDistance((c0 + c1) / 2, (r0 + r1) / 2);
    // On a hillside fields stay small enough to follow it.
    const size = Math.min(7 + d * 0.26, relief(land, c0, r0, c1, r1) > 24 ? 16 : Infinity);
    if (w <= size * 1.35 && h <= size * 1.35) {
      const cc = (c0 + c1) / 2; const cr = (r0 + r1) / 2;
      land.fields.push({ c0, r0, c1, r1, cover: coverFor(d, heightAt(land, cc, cr), rand), shade: shadeAt(land, cc, cr) });
      return;
    }
    if (w >= h) {
      const c = Math.round(c0 + w * (0.34 + rand() * 0.32));
      cut(c0, r0, c, r1); cut(c, r0, c1, r1);
    } else {
      const r = Math.round(r0 + h * (0.34 + rand() * 0.32));
      cut(c0, r0, c1, r); cut(c0, r, c1, r1);
    }
  };
  for (const [c0, r0, c1, r1] of blocks) cut(c0, r0, c1, r1);
  land.fields.push({ ...townN, cover: 'town', shade: 0 }, { ...townS, cover: 'town', shade: 0 });

  // Woods: a canopy (Surroundings.tsx's pattern) over every wood, trees
  // from the campus's own art standing at the edges of those on the valley
  // floor, clumps of crowns on those past it, and past those only the
  // canopy.
  const trees: TreeSpot[] = [];
  const clumps: Clump[] = [];
  for (const f of land.fields) {
    if (f.cover !== 'wood' && f.cover !== 'pine') continue;
    const pine = f.cover === 'pine';
    for (let r = f.r0 + 1.2; r < f.r1 - 0.6; r += 2.3) {
      for (let c = f.c0 + 1.2; c < f.c1 - 0.6; c += 2.3) {
        const col = inside(c + (rand() - 0.5) * 1.4, f.c0, f.c1);
        const row = inside(r + (rand() - 0.5) * 1.4, f.r0, f.r1);
        const keep = rand();
        const d = parcelDistance(col, row);
        if (d < 3 || d > FLAT - 1) continue;
        const edge = Math.min(col - f.c0, f.c1 - col, row - f.r0, f.r1 - row);
        if (edge > 2.6 || keep > 0.8) continue;
        const species: Species = pine ? (rand() < 0.9 ? 'conifer' : 'canopy') : pick(['canopy', 'canopy', 'canopy', 'canopy', 'conifer', 'ornamental'] as const);
        trees.push({ col, row, species, scale: 0.85 + rand() * 0.45 });
      }
    }
    const fd = parcelDistance((f.c0 + f.c1) / 2, (f.r0 + f.r1) / 2);
    const step = 3.6 + fd * 0.045;
    for (let r = f.r0 + step / 2; r < f.r1; r += step) {
      for (let c = f.c0 + step / 2; c < f.c1; c += step) {
        const col = inside(c + (rand() - 0.5) * step * 0.5, f.c0, f.c1);
        const row = inside(r + (rand() - 0.5) * step * 0.5, f.r0, f.r1);
        const d = parcelDistance(col, row);
        if (d < FLAT || d > CLUMP_REACH) continue;
        clumps.push({ col, row, size: step * (0.9 + rand() * 0.25), pine });
      }
    }
  }
  land.trees = thin(trees, TREES_MAX, rand);
  land.clumps = thin(clumps, CLUMPS_MAX, rand);

  // Houses along the road, the lanes, and a farm or two out on the far side.
  const houses: House[] = [];
  const nearLane = (c0: number, c1: number) => lanes.some((c) => c0 < c + 2.8 && c1 > c - 2.8);
  const house = (col: number, row: number, w: number, h: number, storeys: number) => {
    houses.push({
      col, row, w, h,
      wallH: storeys === 2 ? 25 : 14, ridge: 11 + rand() * 6,
      wall: Math.floor(rand() * 3), roof: rand() < 0.75 ? 0 : 1,
    });
  };
  // The frontage: both sides of the road, a garden's depth back.
  for (const side of ['north', 'south'] as const) {
    const [start, end] = side === 'north' ? [townN.c1 - 1, townN.c0] : [townS.c1 - 1, townS.c0];
    for (let c = start; c > end + 1;) {
      const w = 1.4 + rand() * 0.8;
      const h = 1.1 + rand() * 0.4;
      const col = c - w;
      if (rand() > 0.14 && !nearLane(col, c)) {
        const row = side === 'north' ? road0 - 1.3 - h - rand() * 0.4 : GH + 1.3 + rand() * 0.4;
        house(col, row, w, h, rand() < 0.6 ? 2 : 1);
      }
      c -= w + 1.2 + rand() * 1.6;
    }
  }
  // The lanes: houses face them, both sides, out from the road.
  for (const lc of lanes) {
    for (const [from, to, dir] of [[road0 - 3.6, townN.r0 + 1, -1], [GH + 4.4, townS.r1 - 1, 1]] as const) {
      for (let r = from; dir < 0 ? r > to : r < to;) {
        const h = 1.4 + rand() * 0.7;
        const w = 1.1 + rand() * 0.3;
        for (const s of [-1, 1]) {
          if (rand() < 0.3) continue;
          const col = s < 0 ? lc - 1.1 - w : lc + 1.1;
          house(col, dir < 0 ? r - h : r, w, h, rand() < 0.4 ? 2 : 1);
        }
        r += dir * (h + 1.2 + rand() * 1.4);
      }
    }
  }
  // Farms: a house and a barn at the corner of a field by the road's far end.
  const farmland = land.fields.filter((f) => (f.cover === 'crop' || f.cover === 'hay' || f.cover === 'meadow')
    && f.c0 > GW && f.c1 - f.c0 > 11 && f.r1 - f.r0 > 9 && rectDistance(f.c0, f.r0, f.c1, f.r1) < 50);
  for (let i = 0; i < 3 && farmland.length; i++) {
    const f = farmland.splice(Math.floor(rand() * farmland.length), 1)[0]!;
    const col = f.c0 + 2 + rand() * 2;
    const row = f.r1 - 5 - rand() * 2;
    house(col, row, 1.6, 1.2, 2);
    houses.push({ col: col + 3, row: row - 0.6, w: 2.8, h: 1.7, wallH: 18, ridge: 16, wall: -1, roof: 1 });
  }
  land.houses = houses;

  return land.town === 'west' ? land : mirror(land);
}

// How far the ground rises and falls across a rectangle, in height units.
function relief(land: Land, c0: number, r0: number, c1: number, r1: number): number {
  const hs = [[c0, r0], [c1, r0], [c1, r1], [c0, r1], [(c0 + c1) / 2, (r0 + r1) / 2]].map(([c, r]) => heightAt(land, c!, r!));
  return Math.max(...hs) - Math.min(...hs);
}

// The light a slope takes from the sun (light.ts's, set lower in the sky
// here so a gentle hill reads), against flat ground's, in five steps.
const SHADE_SUN_ELEVATION = (35 * Math.PI) / 180;
export function shadeAt(land: Land, col: number, row: number): Shade {
  const e = 2;
  // The slope in tiles of height per tile across.
  const gc = (heightAt(land, col + e, row) - heightAt(land, col - e, row)) / (2 * e * UNITS_PER_TILE_UP);
  const gr = (heightAt(land, col, row + e) - heightAt(land, col, row - e)) / (2 * e * UNITS_PER_TILE_UP);
  const cosE = Math.cos(SHADE_SUN_ELEVATION);
  const sinE = Math.sin(SHADE_SUN_ELEVATION);
  const lit = (-gc * SUN_FROM.col * cosE - gr * SUN_FROM.row * cosE + sinE) / Math.hypot(gc, gr, 1);
  const rel = lit / sinE - 1;
  const step = Math.abs(rel) < 0.02 ? 0 : Math.abs(rel) < 0.07 ? 1 : 2;
  return (Math.sign(rel) * step) as Shade;
}

// A coordinate kept half a tile inside a field's span.
const inside = (v: number, lo: number, hi: number) => Math.max(lo + 0.5, Math.min(hi - 0.5, v));

// What a field grows: crops on the valley floor, grazing and woods up the
// hillsides (which lets a hill's light and shade read across one green).
function coverFor(d: number, height: number, rand: () => number): Cover {
  if (d < 3) return 'meadow';
  const up = smooth((height - 40) / 160);
  const wood = 0.12 + 0.18 * smooth((d - 20) / 120) + 0.12 * up;
  const x = rand();
  if (x < wood) return rand() < 0.3 ? 'pine' : 'wood';
  const y = (x - wood) / (1 - wood);
  const grass = 0.3 + 0.45 * up;
  return y < grass ? (rand() < 0.5 ? 'meadow' : 'hay') : y < grass + (1 - grass) * 0.5 ? 'crop' : y < grass + (1 - grass) * 0.8 ? 'hay' : 'plough';
}

// At most `max` of `xs`, dropped evenly rather than from one end.
function thin<T>(xs: T[], max: number, rand: () => number): T[] {
  if (xs.length <= max) return xs;
  const keep = max / xs.length;
  const out = xs.filter(() => rand() < keep);
  return out.slice(0, max);
}

function mirror(land: Land): Land {
  const c = (col: number) => GW - col;
  return {
    ...land,
    fields: land.fields.map((f) => ({ ...f, c0: c(f.c1), c1: c(f.c0) })),
    hills: land.hills.map((h) => ({ ...h, col: c(h.col) })),
    houses: land.houses.map((h) => ({ ...h, col: c(h.col + h.w) })),
    trees: land.trees.map((t) => ({ ...t, col: c(t.col) })),
    clumps: land.clumps.map((k) => ({ ...k, col: c(k.col) })),
    lanes: land.lanes.map(([c0, r0, c1, r1]) => [c(c0), r0, c(c1), r1]),
  };
}

// --- the land, per camera ---------------------------------------------------

export type RingSprite =
  | { kind: 'tree'; key: string; y: number; tree: TreeSpot }
  // A run of clumps, near in depth, merged into four shapes.
  | { kind: 'clumps'; key: string; y: number; body: string; top: string; pineBody: string; pineTop: string }
  | { kind: 'house'; key: string; y: number; house: House; walls: { d: string; dir: FaceDir }[]; roofs: { d: string; dir: FaceDir }[] };

export interface RingView {
  // One flat plate under the whole ring (and the parcel).
  base: string;
  // Each cover's fields, one path each.
  covers: { key: string; cover: Cover; shade: Shade; d: string }[];
  hedges: string;
  road: string;
  kerbs: string;
  centre: string;
  lanes: string;
  // Back to front: drawn under the campus, and over it.
  back: RingSprite[];
  front: RingSprite[];
}

const f1 = (v: number) => v.toFixed(1);

// A grid point on the ground, lifted by the ground's height.
function at(land: Land, col: number, row: number): Pt {
  return lift(project(col, row), heightAt(land, col, row));
}

// A grid-aligned rectangle's outline, following the ground: its edges are
// sampled every few tiles where the ground rises.
function outline(land: Land, c0: number, r0: number, c1: number, r1: number): Pt[] {
  const out: Pt[] = [];
  const edge = (ca: number, ra: number, cb: number, rb: number) => {
    const len = Math.abs(cb - ca) + Math.abs(rb - ra);
    const flat = parcelDistance(ca, ra) <= FLAT && parcelDistance(cb, rb) <= FLAT;
    const n = flat ? 1 : Math.max(1, Math.ceil(len / (parcelDistance(ca, ra) > 90 ? 12 : 7)));
    for (let i = 0; i < n; i++) out.push(at(land, ca + ((cb - ca) * i) / n, ra + ((rb - ra) * i) / n));
  };
  edge(c0, r0, c1, r0); edge(c1, r0, c1, r1); edge(c1, r1, c0, r1); edge(c0, r1, c0, r0);
  return out;
}
// Path data in whole units, each point after the first relative to the
// last: the ring's shapes are large and many-sided, and a unit is under a
// pixel at every zoom the ring is seen at. Rounded before differencing, so
// neighbours' shared corners land on the same pixel.
function runD(pts: Pt[]): string {
  let x = Math.round(pts[0]!.x);
  let y = Math.round(pts[0]!.y);
  let d = `M${x},${y}`;
  for (let i = 1; i < pts.length; i++) {
    const nx = Math.round(pts[i]!.x);
    const ny = Math.round(pts[i]!.y);
    d += `l${nx - x},${ny - y}`;
    x = nx; y = ny;
  }
  return d;
}
const polyD = (pts: Pt[]) => `${runD(pts)}z`;
const lineD = runD;
// A house is small enough to be seen close: a tenth of a unit.
const houseD = (pts: Pt[]) => `M${pts.map((p) => `${f1(p.x)},${f1(p.y)}`).join('L')}Z`;
// A straight run on the ground, sampled so it follows the rise.
function run(land: Land, c0: number, r0: number, c1: number, r1: number): Pt[] {
  const len = Math.hypot(c1 - c0, r1 - r0);
  const n = Math.max(1, Math.ceil(len / 7));
  return Array.from({ length: n + 1 }, (_, i) => at(land, c0 + ((c1 - c0) * i) / n, r0 + ((r1 - r0) * i) / n));
}

// The parcel's outline on screen: a sprite that would stand over it is left
// out (it would be drawn under the campus, and cut by its edge).
function parcelQuad(): Pt[] {
  return boxFaces(0, 0, GW, GH, 0, 0).top;
}
function boxHitsQuad(b: { x0: number; y0: number; x1: number; y1: number }, q: Pt[]): boolean {
  // Separating axes: the box's two and the quad's four edge normals.
  const rect: Pt[] = [{ x: b.x0, y: b.y0 }, { x: b.x1, y: b.y0 }, { x: b.x1, y: b.y1 }, { x: b.x0, y: b.y1 }];
  const axes: Pt[] = [{ x: 1, y: 0 }, { x: 0, y: 1 }];
  for (let i = 0; i < q.length; i++) {
    const a = q[i]!; const c = q[(i + 1) % q.length]!;
    axes.push({ x: c.y - a.y, y: a.x - c.x });
  }
  for (const ax of axes) {
    const pr = (ps: Pt[]) => ps.map((p) => p.x * ax.x + p.y * ax.y);
    const u = pr(rect); const v = pr(q);
    if (Math.max(...u) < Math.min(...v) || Math.max(...v) < Math.min(...u)) return false;
  }
  return true;
}
// The lowest point of the parcel's outline on the screen column at `x`
// (clamped into its span): below it, a point is in front of the parcel.
function quadBottomAt(q: Pt[], x: number): number {
  const xs = q.map((p) => p.x);
  const cx = Math.max(Math.min(...xs), Math.min(Math.max(...xs), x));
  let bottom = -Infinity;
  for (let i = 0; i < q.length; i++) {
    const a = q[i]!; const b = q[(i + 1) % q.length]!;
    if ((cx < Math.min(a.x, b.x)) || (cx > Math.max(a.x, b.x))) continue;
    const y = a.x === b.x ? Math.max(a.y, b.y) : a.y + ((b.y - a.y) * (cx - a.x)) / (b.x - a.x);
    bottom = Math.max(bottom, y);
  }
  return bottom;
}
function boundsOf(pts: Pt[]) {
  let x0 = Infinity; let y0 = Infinity; let x1 = -Infinity; let y1 = -Infinity;
  for (const p of pts) { x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); }
  return { x0, y0, x1, y1 };
}

// A circle as two arcs, for merging into one path.
function circleD(cx: number, cy: number, r: number): string {
  return `M${f1(cx - r)},${f1(cy)}a${f1(r)},${f1(r)} 0 1,0 ${f1(2 * r)},0a${f1(r)},${f1(r)} 0 1,0 ${f1(-2 * r)},0Z`;
}

// A clump of woodland: a mound of crowns, lit on the sun's side (always
// toward the top, as a tree's cap is). Sized in screen units off its
// spacing, so neighbours touch.
function clumpShape(foot: Pt, size: number, pine: boolean, standing: number, hs: number): { body: string; top: string; pts: Pt[] } {
  const r = size * 9;
  const lift0 = r * 0.35 * hs;
  const pts: Pt[] = [];
  if (pine) {
    const spires = [[-0.55, 0.05, 0.8], [0.5, 0.1, 0.75], [0, -0.1, 1]] as const;
    const body: string[] = [];
    const top: string[] = [];
    for (const [dx, dy, k] of spires) {
      const bx = foot.x + dx * r;
      const by = foot.y + dy * r * standing - lift0 * 0.5;
      const w = r * 0.42 * k;
      const tall = r * 1.5 * k * Math.max(0.3, standing);
      body.push(`M${f1(bx - w)},${f1(by)}L${f1(bx + w)},${f1(by)}L${f1(bx)},${f1(by - tall)}Z`);
      top.push(`M${f1(bx - w * 0.45)},${f1(by - tall * 0.55)}L${f1(bx + w * 0.45)},${f1(by - tall * 0.55)}L${f1(bx)},${f1(by - tall)}Z`);
      pts.push({ x: bx - w, y: by }, { x: bx + w, y: by - tall });
    }
    return { body: body.join(''), top: top.join(''), pts };
  }
  const crowns = [[-0.55, 0.12, 0.55], [0.55, 0.14, 0.52], [0, -0.12, 0.62], [-0.28, -0.42, 0.44], [0.3, -0.38, 0.42]] as const;
  const body = crowns.map(([dx, dy, k]) => {
    const cx = foot.x + dx * r;
    const cy = foot.y - lift0 + dy * r * standing;
    pts.push({ x: cx - k * r, y: cy - k * r }, { x: cx + k * r, y: cy + k * r });
    return circleD(cx, cy, k * r);
  }).join('');
  const top = [[-0.2, -0.52, 0.3], [0.32, -0.46, 0.26]].map(([dx, dy, k]) => circleD(foot.x + dx * r, foot.y - lift0 + dy * r * standing, k * r)).join('');
  return { body, top, pts };
}

// A house or barn: walls on the sides the camera sees (a gable end rises to
// the ridge), and the two roof slopes, the far one first.
function houseShape(land: Land, h: House) {
  const base = heightAt(land, h.col + h.w / 2, h.row + h.h / 2);
  const f = boxFaces(h.col, h.row, h.w, h.h, base, h.wallH);
  const alongCol = h.w >= h.h;
  const up = (p: Pt, k: number) => lift(p, k);
  const ridgeA = alongCol ? project(h.col, h.row + h.h / 2) : project(h.col + h.w / 2, h.row);
  const ridgeB = alongCol ? project(h.col + h.w, h.row + h.h / 2) : project(h.col + h.w / 2, h.row + h.h);
  const R0 = up(ridgeA, base + h.wallH + h.ridge);
  const R1 = up(ridgeB, base + h.wallH + h.ridge);
  const seen = visibleWalls();
  const gableDir = (d: FaceDir) => (alongCol ? d === 'negCol' || d === 'posCol' : d === 'negRow' || d === 'posRow');
  const wall = (poly: Pt[], dir: FaceDir) => {
    // poly: bottom-left, bottom-right, top-right, top-left.
    if (!gableDir(dir)) return { d: houseD(poly), dir };
    const mid = { x: (poly[2]!.x + poly[3]!.x) / 2, y: (poly[2]!.y + poly[3]!.y) / 2 };
    return { d: houseD([poly[0]!, poly[1]!, poly[2]!, lift(mid, h.ridge), poly[3]!]), dir };
  };
  const walls = [wall(f.left, f.dir.CD), wall(f.right, f.dir.BC)];
  const slopes: { d: string; dir: FaceDir }[] = alongCol
    ? [{ d: houseD([f.NWt, f.NEt, R1, R0]), dir: 'negRow' }, { d: houseD([f.SWt, f.SEt, R1, R0]), dir: 'posRow' }]
    : [{ d: houseD([f.NWt, f.SWt, R1, R0]), dir: 'negCol' }, { d: houseD([f.NEt, f.SEt, R1, R0]), dir: 'posCol' }];
  const facing = (d: FaceDir) => d === seen.left || d === seen.right;
  slopes.sort((a, b) => Number(facing(a.dir)) - Number(facing(b.dir)));
  const pts = [f.D, f.C, f.B, f.A, f.At, f.Bt, f.Ct, f.Dt, R0, R1];
  return { walls, roofs: slopes, pts, y: f.C.y, foot: f.C };
}

const VIEW_CACHE = new Map<string, RingView>();

// The ring at the camera the projection is at now, cached per name and camera.
export function ringView(name: string): RingView {
  const cam = currentCamera();
  const key = `${name}|${cam.azimuth.toFixed(5)}|${cam.pitch.toFixed(5)}`;
  const hit = VIEW_CACHE.get(key);
  if (hit) return hit;
  const view = buildView(landOf(name));
  if (VIEW_CACHE.size >= 12) VIEW_CACHE.delete(VIEW_CACHE.keys().next().value!);
  VIEW_CACHE.set(key, view);
  return view;
}

function buildView(land: Land): RingView {
  const byCover = new Map<string, { cover: Cover; shade: Shade; ds: string[] }>();
  const hedges: string[] = [];
  for (const f of land.fields) {
    const pts = outline(land, f.c0, f.r0, f.c1, f.r1);
    // A flat meadow is the plate itself.
    if (f.cover !== 'meadow' || f.shade !== 0) {
      // A wood is its canopy, whichever way it faces.
      const shade = f.cover === 'wood' || f.cover === 'pine' ? 0 : f.shade;
      const k = `${f.cover}${shade}`;
      const entry = byCover.get(k) ?? { cover: f.cover, shade, ds: [] };
      entry.ds.push(polyD(pts));
      byCover.set(k, entry);
    }
    // Hedgerows round every field but the town's gardens; the far ones are
    // lost in the haze.
    if (f.cover !== 'town' && rectDistance(f.c0, f.r0, f.c1, f.r1) < HEDGE_REACH) hedges.push(polyD(pts));
  }
  const covers = [...byCover.entries()].map(([key, { cover, shade, ds }]) => ({ key, cover, shade, d: ds.join('') }));

  // The road, on off both ends of the parcel's own.
  const rows = [ROAD_FIRST_ROW, GH] as const;
  const mid = (ROAD_FIRST_ROW + GH) / 2;
  const road = [[-RING, 0], [GW, GW + RING]].map(([c0, c1]) => polyD([...run(land, c0!, rows[0], c1!, rows[0]), ...run(land, c1!, rows[1], c0!, rows[1])])).join('');
  const kerbs = [[-RING, 0], [GW, GW + RING]].flatMap(([c0, c1]) => rows.map((r) => lineD(run(land, c0!, r, c1!, r)))).join('');
  const centre = [[-RING, 0], [GW, GW + RING]].map(([c0, c1]) => lineD(run(land, c0!, mid, c1!, mid))).join('');
  const lanes = land.lanes.map(([c0, r0, c1, r1]) => lineD(run(land, c0, r0, c1, r1))).join('');

  const hs = heightScale();
  const standing = Math.max(0, Math.min(1, hs));

  // Sprites, back to front. One the campus's outline would cut, standing in
  // front of the parcel, is drawn over the campus instead, after it (a
  // point in front of the parcel is nearer the camera than anything on the
  // parcel above it on the screen); every other one under it.
  const quad = parcelQuad();
  const back: RingSprite[] = [];
  const front: RingSprite[] = [];
  const inFront = (foot: Pt, pts: Pt[]) => boxHitsQuad(boundsOf(pts), quad) && foot.y > quadBottomAt(quad, foot.x);
  land.trees.forEach((t, i) => {
    const foot = project(t.col, t.row);
    const sprite: RingSprite = { kind: 'tree', key: `t${i}`, y: foot.y, tree: t };
    (inFront(foot, treeOutline(t.col, t.row, t.species, t.scale)) ? front : back).push(sprite);
  });
  land.houses.forEach((h, i) => {
    const shape = houseShape(land, h);
    const sprite: RingSprite = { kind: 'house', key: `h${i}`, y: shape.y, house: h, walls: shape.walls, roofs: shape.roofs };
    (inFront(shape.foot, shape.pts) ? front : back).push(sprite);
  });
  // The clumps, in runs of a dozen by depth: each run is four shapes, so a
  // far clump's light can show on a near one's crown within a run, which
  // at their distance and in their haze does not read.
  const clumps = land.clumps.map((k) => {
    const foot = at(land, k.col, k.row);
    return { k, foot, shape: clumpShape(foot, k.size, k.pine, standing, hs) };
  }).sort((p, q) => p.foot.y - q.foot.y);
  for (let i = 0; i < clumps.length; i += 12) {
    const run = clumps.slice(i, i + 12);
    const part = (pine: boolean, top: boolean) => run.filter((c) => c.k.pine === pine).map((c) => (top ? c.shape.top : c.shape.body)).join('');
    const sprite: RingSprite = {
      kind: 'clumps', key: `c${i}`, y: run[run.length - 1]!.foot.y,
      body: part(false, false), top: part(false, true), pineBody: part(true, false), pineTop: part(true, true),
    };
    (run.some((c) => inFront(c.foot, c.shape.pts)) ? front : back).push(sprite);
  }
  back.sort((p, q) => p.y - q.y);
  front.sort((p, q) => p.y - q.y);

  return {
    base: polyPoints(boxFaces(-RING, -RING, GW + 2 * RING, GH + 2 * RING, 0, 0).top),
    covers,
    hedges: hedges.join(''),
    road, kerbs, centre, lanes, back, front,
  };
}

// --- the haze -------------------------------------------------------------

export interface Haze {
  // The grid-to-screen matrix, for a gradient laid out in tiles.
  matrix: string;
  cx: number; cy: number; r: number;
  // [offset, opacity] along the radius.
  stops: [number, number][];
  // A second, screen-aligned wash up the screen past the parcel's back
  // corner, stronger the lower the camera looks.
  y1: number; y2: number; depth: number;
  // A plate well past the ring, for both to fill.
  plate: string;
}

// The haze at the camera the projection is at now: cheap, so it is worked
// out every frame of a turn.
export function hazeOf(camera: Camera): Haze {
  const sinP = Math.sin(camera.pitch);
  // Lower pitches see further across the ground in the same screen, so the
  // haze closes in.
  const k = Math.min(1.04, 0.72 + 0.56 * sinP);
  const a = project(1, 0);
  const b = project(0, 1);
  const r = HAZE_SOLID * k;
  const s = (tiles: number) => Math.min(1, (tiles * k) / r);
  const corners = [project(0, 0), project(GW, 0), project(GW, GH), project(0, GH)];
  const yTop = Math.min(...corners.map((p) => p.y));
  const perTile = Math.hypot(a.x, a.y) * sinP;
  return {
    matrix: `matrix(${a.x} ${a.y} ${b.x} ${b.y} 0 0)`,
    cx: GW / 2, cy: GH / 2, r,
    stops: [[s(HAZE_START), 0], [s(115), 0.2], [s(160), 0.52], [s(200), 0.85], [1, 1]],
    y1: yTop, y2: yTop - 150 * perTile,
    depth: Math.max(0, Math.min(0.75, (1 - sinP) ** 1.5 * 0.85)),
    plate: polyPoints(boxFaces(-2 * RING, -2 * RING, GW + 4 * RING, GH + 4 * RING, 0, 0).top),
  };
}

// --- the camera's leash ---------------------------------------------------

export interface MapView { x: number; y: number; zoom: number; }

// How far the canvas reaches from its center, in tiles along each grid
// axis, at zoom 1: the projection is linear, so a corner's offset is.
function reach(width: number, height: number): { col: number; row: number } {
  const o = unproject(0, 0);
  const ex = unproject(1, 0);
  const ey = unproject(0, 1);
  const hw = width / 2; const hh = height / 2;
  return {
    col: Math.abs(ex.col - o.col) * hw + Math.abs(ey.col - o.col) * hh,
    row: Math.abs(ex.row - o.row) * hw + Math.abs(ey.row - o.row) * hh,
  };
}

// The widest zoom at which the canvas still fits inside the ring at the
// camera the projection is at: the map's own floor wins where it is higher.
export function ringZoomFloor(width: number, height: number): number {
  const m = reach(width, height);
  return Math.max((2 * m.col) / (GW + 2 * RING), (2 * m.row) / (GH + 2 * RING));
}

// How far past the parcel's edge the center of the canvas may go: out
// there the land is mostly haze, and the campus is what the map is for.
export const CENTRE_REACH = 70;

// The view moved (never zoomed) the least distance that keeps the whole
// canvas over the ring (its every corner inside the ring's outer edge) and
// its center within CENTRE_REACH of the parcel. Both are squares on the
// grid, so each grid axis is clamped on its own.
export function clampView(view: MapView, width: number, height: number): MapView {
  const m = reach(width, height);
  const mc = m.col / view.zoom;
  const mr = m.row / view.zoom;
  const centre = unproject((width / 2 - view.x) / view.zoom, (height / 2 - view.y) / view.zoom);
  const fit = (v: number, lo: number, hi: number) => (lo > hi ? (lo + hi) / 2 : Math.max(lo, Math.min(hi, v)));
  const col = fit(centre.col, Math.max(-RING + mc, -CENTRE_REACH), Math.min(GW + RING - mc, GW + CENTRE_REACH));
  const row = fit(centre.row, Math.max(-RING + mr, -CENTRE_REACH), Math.min(GH + RING - mr, GH + CENTRE_REACH));
  if (col === centre.col && row === centre.row) return view;
  const w = project(col, row);
  return { x: width / 2 - w.x * view.zoom, y: height / 2 - w.y * view.zoom, zoom: view.zoom };
}
