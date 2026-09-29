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
// on a board in space. The road runs on off both ends; farm fields parted
// by margins of grass (Plan 81E), open grass with scattered trees,
// a low town edge along the road, and gentle hills rising away from a flat
// valley floor, all fading into haze with distance.
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
// parcel's edge, where it is all but solid.
const HAZE_START = 72;
const HAZE_SOLID = 238;
const HAZE_CULL = 180;

// The height field, in screen units as authored at the default pitch (the
// motifs' `up` unit, about 4.35 to a meter). The whole valley rises a
// little away from the parcel, and hills stand on that rise.
const VALLEY_RISE = 240;
const VALLEY_RUN = 170;
const HILLS = 30;
// Steepest a slope may be anywhere in the ring, in height units per tile.
// Below the lowest pitch's own slope (about 8 units a tile), so no hill
// hides the ground behind it at any view: the ground can be drawn as merged
// shapes in any order. test/surroundings.test.ts holds it.
export const MAX_SLOPE = 7;

// The land is sampled on a grid this many tiles apart (the hills' light is
// traced on it), over the ring and a tile beyond.
const STEP = 4;
const G0 = -RING - 1;
const GN = (GW + 2 * RING + 2) / STEP + 1;

// Sprites stop where the haze all but hides them.
// Scattered trees (Plan 81D): the campus's own tree art on the valley floor,
// at most TREES_MAX; past it single crowns, at most CROWNS_MAX, out to
// CROWN_REACH. Both thin with distance (TREE_FALLOFF tiles to fall by e).
export const TREES_MAX = 40;
export const CROWNS_MAX = 200;
const CROWN_REACH = 125;
const TREE_FALLOFF = 55;

// A field's cover. Farm fields are crop, hay or plough, each with a margin
// of grass round it (Plan 81E, styles.css), and neighbours differ in cover
// (Plan 81D) so the patchwork reads.
// Meadow and rough grass lie open, with trees scattered over them.
export type Cover = 'meadow' | 'rough' | 'crop' | 'hay' | 'plough' | 'town';
const FARM: ReadonlySet<Cover> = new Set(['crop', 'hay', 'plough']);
export const isFarm = (c: Cover) => FARM.has(c);

export interface Field { c0: number; r0: number; c1: number; r1: number; cover: Cover; }
export interface Hill { col: number; row: number; radius: number; height: number; }
// A house or barn: a box with a gable roof along its longer side. `wall` and
// `roof` index the vernacular's palette (Surroundings.tsx); -1 is a barn's.
export interface House {
  col: number; row: number; w: number; h: number;
  wallH: number; ridge: number; wall: number; roof: number;
}
export interface TreeSpot { col: number; row: number; species: Species; scale: number; }
// A tree past the valley floor, drawn as a simple crown.
export interface Crown { col: number; row: number; scale: number; pine: boolean; }
// A closed outline on the grid, in tiles.
export type Loop = { col: number; row: number }[];

export interface Land {
  // The side of the parcel the town stands on.
  town: 'west' | 'east';
  fields: Field[];
  hills: Hill[];
  houses: House[];
  trees: TreeSpot[];
  crowns: Crown[];
  // Lanes through the town: [c0, r0, c1, r1], straight runs.
  lanes: [number, number, number, number][];
  // The hills' light: outlines of the ground lit a little and more, shaded
  // a little and more. Filled even-odd, so a hollow in the light is a hole.
  light: [Loop[], Loop[]];
  shadow: [Loop[], Loop[]];
  // The far hills' outline: phases of its waves.
  ridge: number[];
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
export function heightAt(land: Pick<Land, 'hills'>, col: number, row: number): number {
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

// The outlines of where `v` is above `at` on the land's grid (marching
// squares, the crossing points eased along each cell edge), as closed loops
// in tiles. The grid's border must lie below `at`, so every loop closes.
function outlines(v: Float64Array, at: number): Loop[] {
  const n = GN;
  const point = (edge: number): { col: number; row: number } => {
    const cell = edge >> 1;
    const i = cell % n; const j = (cell / n) | 0;
    const [i2, j2] = edge & 1 ? [i, j + 1] : [i + 1, j];
    const a = v[j * n + i]!; const b = v[j2 * n + i2]!;
    const t = (at - a) / (b - a);
    return { col: G0 + (i + (i2 - i) * t) * STEP, row: G0 + (j + (j2 - j) * t) * STEP };
  };
  // Each crossed cell edge joins two others, one in each cell beside it.
  const links = new Map<number, number[]>();
  const link = (p: number, q: number) => {
    (links.get(p) ?? links.set(p, []).get(p)!).push(q);
    (links.get(q) ?? links.set(q, []).get(q)!).push(p);
  };
  for (let j = 0; j < n - 1; j++) {
    for (let i = 0; i < n - 1; i++) {
      const v0 = v[j * n + i]! > at; const v1 = v[j * n + i + 1]! > at;
      const v2 = v[(j + 1) * n + i + 1]! > at; const v3 = v[(j + 1) * n + i]! > at;
      const k = (v0 ? 8 : 0) | (v1 ? 4 : 0) | (v2 ? 2 : 0) | (v3 ? 1 : 0);
      if (k === 0 || k === 15) continue;
      const T = (j * n + i) * 2; const B = ((j + 1) * n + i) * 2;
      const L = (j * n + i) * 2 + 1; const R = (j * n + i + 1) * 2 + 1;
      const centre = (v[j * n + i]! + v[j * n + i + 1]! + v[(j + 1) * n + i + 1]! + v[(j + 1) * n + i]!) / 4 > at;
      switch (k) {
        case 1: case 14: link(L, B); break;
        case 2: case 13: link(B, R); break;
        case 3: case 12: link(L, R); break;
        case 4: case 11: link(T, R); break;
        case 6: case 9: link(T, B); break;
        case 7: case 8: link(L, T); break;
        case 5: if (centre) { link(L, T); link(B, R); } else { link(T, R); link(L, B); } break;
        case 10: if (centre) { link(T, R); link(L, B); } else { link(L, T); link(B, R); } break;
      }
    }
  }
  const loops: Loop[] = [];
  const seen = new Set<number>();
  for (const startEdge of links.keys()) {
    if (seen.has(startEdge)) continue;
    const loop: Loop = [];
    let prev = -1; let cur = startEdge;
    while (!seen.has(cur)) {
      seen.add(cur);
      loop.push(point(cur));
      const next = links.get(cur)!.find((e) => e !== prev && !seen.has(e));
      if (next === undefined) break;
      prev = cur; cur = next;
    }
    if (loop.length >= 3) loops.push(loop);
  }
  return loops;
}

// How the ground at a slope (dh per tile along col and row, in height
// units) takes the light, against flat ground's: from a sun lower in the sky
// than light.ts's, so a gentle hill reads.
const SHADE_SUN_ELEVATION = (24 * Math.PI) / 180;
function lightOf(gc: number, gr: number): number {
  const c = gc / UNITS_PER_TILE_UP; const r = gr / UNITS_PER_TILE_UP;
  const cosE = Math.cos(SHADE_SUN_ELEVATION); const sinE = Math.sin(SHADE_SUN_ELEVATION);
  const lit = (-c * SUN_FROM.col * cosE - r * SUN_FROM.row * cosE + sinE) / Math.hypot(c, r, 1);
  return lit / sinE - 1;
}
// The steps of the hills' light: a little, and more.
const LIGHT_STEPS = [0.05, 0.13] as const;

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
  const seed = Math.floor(hashUnit(`${name}:surroundings`) * 4294967296);
  const rand = rng(seed);
  const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(rand() * xs.length)]!;
  const land: Land = {
    town: rand() < 0.5 ? 'west' : 'east', fields: [], hills: [], houses: [], trees: [], crowns: [], lanes: [],
    light: [[], []], shadow: [[], []], ridge: [],
  };
  land.ridge = Array.from({ length: 6 }, () => rand() * Math.PI * 2);

  // Hills: out on the valley's rise, none reaching its floor, apart.
  for (let tries = 0; land.hills.length < HILLS && tries < 600; tries++) {
    const col = -RING + rand() * (GW + 2 * RING);
    const row = -RING + rand() * (GH + 2 * RING);
    const d = parcelDistance(col, row);
    const radius = 24 + d * 0.16 + rand() * 16;
    if (d - radius < FLAT + 2 || d > HAZE_CULL) continue;
    if (land.hills.some((h) => Math.hypot(h.col - col, h.row - row) < 0.8 * (h.radius + radius))) continue;
    const height = Math.min(2.8 * radius, (70 + d * 0.9) * (0.75 + rand() * 0.5));
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
  const inTown = (col: number, row: number, pad: number) => [townN, townS].some((t) =>
    col > t.c0 - pad && col < t.c1 + pad && row > t.r0 - pad && row < t.r1 + pad);

  // Farms keep to the road and the town, on the low ground: how much a
  // point is farmland, 0 to 1.
  const farmness = (col: number, row: number, height: number) => {
    const off = Math.max(0, road0 - row, row - GH);
    const town = Math.hypot(Math.max(0, townN.c0 - col, col - across), Math.max(0, townN.r0 - row, row - townS.r1));
    return Math.max(smooth((64 - off) / 30), smooth((56 - town) / 26)) * (1 - smooth((height - 170) / 160));
  };

  // The land's height on the grid, for its light.
  const heights = new Float64Array(GN * GN);
  for (let j = 0; j < GN; j++) {
    for (let i = 0; i < GN; i++) heights[j * GN + i] = heightAt(land, G0 + i * STEP, G0 + j * STEP);
  }
  const lightGrid = new Float64Array(GN * GN);
  for (let j = 0; j < GN; j++) {
    for (let i = 0; i < GN; i++) {
      if (i === 0 || j === 0 || i === GN - 1 || j === GN - 1) continue;
      const gc = (heights[j * GN + i + 1]! - heights[j * GN + i - 1]!) / (2 * STEP);
      const gr = (heights[(j + 1) * GN + i]! - heights[(j - 1) * GN + i]!) / (2 * STEP);
      lightGrid[j * GN + i] = lightOf(gc, gr);
    }
  }
  const neg = lightGrid.map((x) => -x);
  land.light = [outlines(lightGrid, LIGHT_STEPS[0]), outlines(lightGrid, LIGHT_STEPS[1])];
  land.shadow = [outlines(neg, LIGHT_STEPS[0]), outlines(neg, LIGHT_STEPS[1])];

  // Fields: each block cut in two, again and again, into fields that grow
  // with distance from the parcel. Farm fields by the road and the town;
  // meadow and rough grass elsewhere.
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
    const cc = (c0 + c1) / 2; const cr = (r0 + r1) / 2;
    const d = parcelDistance(cc, cr);
    const size = 7 + d * 0.26;
    if (w <= size * 1.35 && h <= size * 1.35) {
      const height = heightAt(land, cc, cr);
      const farm = rand() < farmness(cc, cr, height) * 2;
      const cover: Cover = d < 3 ? 'meadow'
        : farm ? pick(['crop', 'crop', 'hay', 'hay', 'plough'] as const)
          : rand() < 0.45 ? 'rough' : 'meadow';
      land.fields.push({ c0, r0, c1, r1, cover });
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
  land.fields.push({ ...townN, cover: 'town' }, { ...townS, cover: 'town' });
  unlikeNeighbours(land.fields, rand);

  // Trees, scattered (Plan 81D): one here and there, now and then two or
  // three together, thinning away from the campus into the haze. The
  // campus's own art on the valley floor, a simple crown past it. None on
  // the road or in the town.
  const trees: TreeSpot[] = [];
  const crowns: Crown[] = [];
  const species = (): Species => pick(['canopy', 'canopy', 'canopy', 'canopy', 'conifer', 'conifer', 'ornamental'] as const);
  const clear = (col: number, row: number) => parcelDistance(col, row) >= 3 && !(row > road0 - 2 && row < GH + 2) && !inTown(col, row, 2);
  for (let tries = 0; tries < 6000; tries++) {
    const col = -CROWN_REACH + rand() * (GW + 2 * CROWN_REACH);
    const row = -CROWN_REACH + rand() * (GH + 2 * CROWN_REACH);
    const d = parcelDistance(col, row);
    if (d < 3 || d > CROWN_REACH || rand() > 0.5 * Math.exp(-d / TREE_FALLOFF)) continue;
    const x = rand();
    const n = x < 0.72 ? 1 : x < 0.92 ? 2 : 3;
    for (let m = 0; m < n; m++) {
      const c = m === 0 ? col : col + (rand() - 0.5) * 3;
      const r = m === 0 ? row : row + (rand() - 0.5) * 3;
      if (!clear(c, r)) continue;
      const dd = parcelDistance(c, r);
      if (dd < FLAT - 1) trees.push({ col: c, row: r, species: species(), scale: 0.8 + rand() * 0.5 });
      else crowns.push({ col: c, row: r, scale: 0.85 + rand() * 0.4, pine: rand() < 0.28 });
    }
  }
  land.trees = thin(trees, TREES_MAX, rand);
  land.crowns = thin(crowns, CROWNS_MAX, rand);

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
  // Farms: a house and a barn at the corner of a farm field out along the
  // road the other way.
  const farmland = land.fields.filter((f) => isFarm(f.cover) && f.c0 > GW && f.c1 - f.c0 > 11 && f.r1 - f.r0 > 9
    && rectDistance(f.c0, f.r0, f.c1, f.r1) < 60);
  for (let i = 0; i < 3 && farmland.length; i++) {
    const f = farmland.splice(Math.floor(rand() * farmland.length), 1)[0]!;
    const col = f.c0 + 2 + rand() * 2;
    const row = f.r1 - 5 - rand() * 2;
    house(col, row, 1.6, 1.2, 2);
    houses.push({ col: col + 3, row: row - 0.6, w: 2.8, h: 1.7, wallH: 18, ridge: 16, wall: -1, roof: 1 });
  }
  land.houses = houses;
  // No tree stands in a farmyard.
  const yard = (t: { col: number; row: number }) => houses.some((h) =>
    t.col > h.col - 1 && t.col < h.col + h.w + 1 && t.row > h.row - 1 && t.row < h.row + h.h + 1);
  land.trees = land.trees.filter((t) => !yard(t));
  land.crowns = land.crowns.filter((t) => !yard(t));

  return land.town === 'west' ? land : mirror(land);
}

// Two farm fields that touch along an edge do not share a cover (Plan 81D;
// kept under 81E's grass margins, so the patchwork still varies). Each field starts from the cover it drew; then,
// pass after pass, a field that shares its cover with a neighbour takes the
// cover fewest of its neighbours have (a random one of those), until none
// clash or the passes run out. Three covers cannot colour every patchwork:
// a field still sharing its cover with a neighbour then lies fallow, as
// rough grass.
const FARM_COVERS = ['crop', 'hay', 'plough'] as const;
export function fieldsTouch(a: Field, b: Field): boolean {
  return (Math.min(a.c1, b.c1) > Math.max(a.c0, b.c0) && (a.r1 === b.r0 || b.r1 === a.r0))
    || (Math.min(a.r1, b.r1) > Math.max(a.r0, b.r0) && (a.c1 === b.c0 || b.c1 === a.c0));
}
function unlikeNeighbours(fields: Field[], rand: () => number): void {
  const farms = fields.filter((f) => isFarm(f.cover));
  const near = farms.map((f) => farms.filter((g) => g !== f && fieldsTouch(f, g)));
  for (let pass = 0; pass < 40; pass++) {
    let clashes = 0;
    farms.forEach((f, i) => {
      const count = (c: Cover) => near[i]!.filter((g) => g.cover === c).length;
      if (count(f.cover) === 0) return;
      clashes += 1;
      const least = Math.min(...FARM_COVERS.map(count));
      const best = FARM_COVERS.filter((c) => count(c) === least);
      f.cover = best[Math.floor(rand() * best.length)]!;
    });
    if (clashes === 0) break;
  }
  farms.forEach((f, i) => {
    if (near[i]!.some((g) => g.cover === f.cover)) f.cover = 'rough';
  });
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
  const loops = (ls: Loop[]) => ls.map((l) => l.map((p) => ({ col: c(p.col), row: p.row })));
  return {
    ...land,
    fields: land.fields.map((f) => ({ ...f, c0: c(f.c1), c1: c(f.c0) })),
    hills: land.hills.map((h) => ({ ...h, col: c(h.col) })),
    houses: land.houses.map((h) => ({ ...h, col: c(h.col + h.w) })),
    trees: land.trees.map((t) => ({ ...t, col: c(t.col) })),
    crowns: land.crowns.map((k) => ({ ...k, col: c(k.col) })),
    lanes: land.lanes.map(([c0, r0, c1, r1]) => [c(c0), r0, c(c1), r1]),
    light: [loops(land.light[0]), loops(land.light[1])],
    shadow: [loops(land.shadow[0]), loops(land.shadow[1])],
  };
}

// --- the land, per camera ---------------------------------------------------

export type RingSprite =
  | { kind: 'tree'; key: string; y: number; tree: TreeSpot }
  // A run of far trees' crowns, near in depth, merged into four shapes.
  | { kind: 'crowns'; key: string; y: number; body: string; top: string; pineBody: string; pineTop: string }
  | { kind: 'house'; key: string; y: number; house: House; walls: { d: string; dir: FaceDir }[]; roofs: { d: string; dir: FaceDir }[] };

export interface RingView {
  // One flat plate under the whole ring (and the parcel).
  base: string;
  // Each cover's fields, one path each; the flat meadows are the plate.
  covers: { cover: Cover; d: string }[];
  // The hills' light over everything on the ground: a little lit, more lit,
  // a little shaded, more shaded.
  light: [string, string];
  shadow: [string, string];
  // The hills on the far side of the valley, far layer first, each with the
  // haze it stands in (0 to 1), for a low camera only.
  ridges: { d: string; haze: number }[];
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

// A far tree: one crown on a short stem, lit on the sun's side (always
// toward the top, as a tree's cap is), or a pine's spire. The size of the
// campus's own trees (trees.tsx), so it reads as a tree and never as a wood.
function crownShape(foot: Pt, scale: number, pine: boolean, standing: number, hs: number): { body: string; top: string; pts: Pt[] } {
  if (pine) {
    const w = 11 * scale;
    const base = foot.y - 8 * scale * hs;
    const tall = 34 * scale * Math.max(0.3, standing);
    return {
      body: `M${f1(foot.x - w)},${f1(base)}L${f1(foot.x + w)},${f1(base)}L${f1(foot.x)},${f1(base - tall)}Z`,
      top: `M${f1(foot.x - w * 0.45)},${f1(base - tall * 0.55)}L${f1(foot.x + w * 0.45)},${f1(base - tall * 0.55)}L${f1(foot.x)},${f1(base - tall)}Z`,
      pts: [{ x: foot.x - w, y: foot.y }, { x: foot.x + w, y: base - tall }],
    };
  }
  const r = 17 * scale;
  const cy = foot.y - 18 * scale * hs - r * 0.7 * standing;
  return {
    body: circleD(foot.x, cy, r),
    top: circleD(foot.x - r * 0.28, cy - r * 0.35 * standing, r * 0.55),
    pts: [{ x: foot.x - r, y: cy - r }, { x: foot.x + r, y: foot.y }],
  };
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

// The last view built and not kept: the frame of a turn draws the ring
// twice (under the campus and in front of it) from one build.
let passing: { key: string; view: RingView } | null = null;

// The ring at the camera the projection is at now, cached per name and
// camera where the camera rests (`keep`). A turn's in-between angles are
// built each frame and not kept, so they never push the views the camera
// rests on out of the cache (Plan 82).
export function ringView(name: string, keep = true): RingView {
  const cam = currentCamera();
  const key = `${name}|${cam.azimuth.toFixed(5)}|${cam.pitch.toFixed(5)}`;
  const hit = VIEW_CACHE.get(key) ?? (passing?.key === key ? passing.view : undefined);
  if (hit) return hit;
  const view = buildView(landOf(name));
  if (!keep) {
    passing = { key, view };
    return view;
  }
  if (VIEW_CACHE.size >= 12) VIEW_CACHE.delete(VIEW_CACHE.keys().next().value!);
  VIEW_CACHE.set(key, view);
  return view;
}

function buildView(land: Land): RingView {
  const byCover = new Map<Cover, string[]>();
  for (const f of land.fields) {
    const pts = outline(land, f.c0, f.r0, f.c1, f.r1);
    if (f.cover !== 'meadow') {
      const list = byCover.get(f.cover) ?? [];
      list.push(polyD(pts));
      byCover.set(f.cover, list);
    }
  }
  // Farm fields last, so their grass margins (Plan 81E) lie over the open
  // ground beside them as well as over each other.
  const covers = [...byCover.entries()].map(([cover, ds]) => ({ cover, d: ds.join('') }))
    .sort((a, b) => Number(isFarm(a.cover)) - Number(isFarm(b.cover)));
  const loopsD = (ls: Loop[]) => ls.map((l) => polyD(l.map((p) => at(land, p.col, p.row)))).join('');

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
  // The far trees, in runs of sixteen by depth: each run is four shapes, so
  // within a run a far tree's light could show on a near one's crown, which
  // with the trees this far apart and this deep in the haze does not happen
  // to any eye.
  const crowns = land.crowns.map((k) => {
    const foot = at(land, k.col, k.row);
    return { k, foot, shape: crownShape(foot, k.scale, k.pine, standing, hs) };
  }).sort((p, q) => p.foot.y - q.foot.y);
  for (let i = 0; i < crowns.length; i += 16) {
    const run = crowns.slice(i, i + 16);
    const part = (pine: boolean, top: boolean) => run.filter((c) => c.k.pine === pine).map((c) => (top ? c.shape.top : c.shape.body)).join('');
    const sprite: RingSprite = {
      kind: 'crowns', key: `c${i}`, y: run[run.length - 1]!.foot.y,
      body: part(false, false), top: part(false, true), pineBody: part(true, false), pineTop: part(true, true),
    };
    (run.some((c) => inFront(c.foot, c.shape.pts)) ? front : back).push(sprite);
  }
  back.sort((p, q) => p.y - q.y);
  front.sort((p, q) => p.y - q.y);

  return {
    base: polyPoints(boxFaces(-RING, -RING, GW + 2 * RING, GH + 2 * RING, 0, 0).top),
    covers,
    light: [loopsD(land.light[0]), loopsD(land.light[1])],
    shadow: [loopsD(land.shadow[0]), loopsD(land.shadow[1])],
    ridges: [ridgeline(land, 150, 640, 0), ridgeline(land, 118, 380, 3)],
    road, kerbs, centre, lanes, back, front,
  };
}

// How thick the radial haze is at `tiles` from the parcel's center, at the
// camera the projection is at (hazeOf's stops).
function hazeAtDistance(tiles: number): number {
  const h = hazeOf(currentCamera());
  const t = Math.min(1, tiles / h.r);
  for (let i = 1; i < h.stops.length; i++) {
    const [o1, a1] = h.stops[i]!; const [o0, a0] = h.stops[i - 1]!;
    if (t <= o1) return t <= o0 ? a0 : a0 + ((a1 - a0) * (t - o0)) / (o1 - o0);
  }
  return 1;
}

// The hills on the valley's far side (Plan 81C): a line of hills standing
// round it `distance` tiles out, drawn as a silhouette from the ground up to
// its ridgeline. Only for a low camera, where the far country is what the
// view looks across (they sink away by the opening pitch), and only on the
// side of the valley the camera looks across, where nothing of the ring
// stands in front of them: a backdrop. They take the haze of the ground at
// their feet (hazeAtDistance), so the land beyond, hazier still, reads as
// further off; their outline rises and falls into saddles so they never
// stand as a wall.
function ridgeline(land: Land, distance: number, height: number, salt: number): { d: string; haze: number } {
  const sinP = Math.sin(currentCamera().pitch);
  const low = smooth((0.5 - sinP) / 0.3);
  const haze = hazeAtDistance(distance + 70);
  if (low <= 0) return { d: '', haze };
  const o = unproject(0, 0);
  const u = unproject(0, -1);
  const away = { col: u.col - o.col, row: u.row - o.row };
  const len = Math.hypot(away.col, away.row) || 1;
  away.col /= len; away.row /= len;
  // Round the parcel at `distance`, sides and quarter-circle corners.
  const loop: { col: number; row: number }[] = [];
  const side = (c0: number, r0: number, c1: number, r1: number) => {
    const n = Math.ceil(Math.hypot(c1 - c0, r1 - r0) / 5);
    for (let i = 0; i < n; i++) loop.push({ col: c0 + ((c1 - c0) * i) / n, row: r0 + ((r1 - r0) * i) / n });
  };
  const arc = (cc: number, cr: number, a0: number) => {
    const n = Math.ceil((distance * Math.PI) / 2 / 5);
    for (let i = 0; i < n; i++) {
      const a = a0 + ((Math.PI / 2) * i) / n;
      loop.push({ col: cc + Math.cos(a) * distance, row: cr + Math.sin(a) * distance });
    }
  };
  side(0, -distance, GW, -distance); arc(GW, 0, -Math.PI / 2);
  side(GW + distance, 0, GW + distance, GH); arc(GW, GH, 0);
  side(GW, GH + distance, 0, GH + distance); arc(0, GH, Math.PI / 2);
  side(-distance, GH, -distance, 0); arc(0, 0, Math.PI);
  const cc = GW / 2; const cr = GH / 2;
  const facing = (p: { col: number; row: number }) => ((p.col - cc) * away.col + (p.row - cr) * away.row) / Math.hypot(p.col - cc, p.row - cr);
  const n = loop.length;
  // Start where the loop faces the camera most, so the far side is one run.
  let start = 0;
  for (let i = 1; i < n; i++) if (facing(loop[i]!) < facing(loop[start]!)) start = i;
  const ph = land.ridge;
  const tops: Pt[] = [];
  const feet: Pt[] = [];
  for (let j = 0; j <= n; j++) {
    const i = (start + j) % n;
    const p = loop[i]!;
    const t = (i / n) * Math.PI * 2;
    const w = smooth((facing(p) - 0.1) / 0.5);
    // Hills and saddles: waves that often fall to nothing.
    const wave = Math.max(0, 0.38 + 0.34 * Math.sin(4 * t + ph[salt]!) + 0.24 * Math.sin(9 * t + ph[salt + 1]!) + 0.12 * Math.sin(19 * t + ph[salt + 2]!));
    const foot = at(land, p.col, p.row);
    if (w <= 0) {
      if (tops.length) break;
      continue;
    }
    tops.push(lift(foot, height * low * w * wave));
    feet.push(foot);
  }
  if (tops.length < 2) return { d: '', haze };
  return { d: polyD([...tops, ...feet.reverse()]), haze };
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
