import type { Buildable, Pathways, Placement, Placements } from '../state/types';
import type { FaceDir } from './isoProjection';
import { CAMPUS_GRID_HEIGHT, CAMPUS_GRID_WIDTH } from '../state/types';
import { ROAD_FIRST_ROW, parsePathTileKey } from '../state/campusMap';
import { isAcademicHall } from '../data/techData';
import { quadTile } from './quadGeometry';

// Routes for the walkers and the desire lines (ported from v2's routes.ts):
// the cheapest way over the grid between two buildings, paths first, lawn
// when there is no path, the road at the edge, never through a building.
// Drawing only: the map's own copy of the grid, never the simulation's.
//
// Every wall of a building has a door at its middle (the map draws the two
// in view), and a door whose way out is built over is shut. A walker leaves
// by whichever open door suits its route and goes in by whichever suits it
// at the other end (Plan 48: every walk used the +row wall, so in two views
// of four the crowd streamed to a blank back wall).
//
// A route is read off a shortest-path tree grown from every door of the
// building it leaves. Trees are grown one at a time as walkers first need
// them (RouteTable), so a new layout never stalls a frame on a whole
// campus's worth of searches.

const W = CAMPUS_GRID_WIDTH;
const H = CAMPUS_GRID_HEIGHT;
const N = W * H;

// What a step onto a tile costs. A Campus Quad is lawn with its own walks
// (quadGeometry.ts), at a path's cost, round a centerpiece no one crosses.
export const PATH_COST = 1;
const ROAD_COST = 1.5;
const QUAD_COST = 2;
export const LAWN_COST = 4;

export interface Waypoint { col: number; row: number }  // a point on the grid
export interface Tile { col: number; row: number }      // a tile, by its corner

// A way in: the tile a walker steps from, and the point on the wall it walks
// to (the door, at the wall's middle). `side` is null for a stop with no
// wall to go through: the road, a sports ground, a village green.
export interface Entrance extends Tile { face: Waypoint; side: FaceDir | null }

// Somewhere to walk to: a building's open doors, or a point by the road.
export interface Stop {
  key: string;
  id: string | null;    // the building, if it is one
  weight: number;
  entrances: Entrance[];
}

const idx = (col: number, row: number) => row * W + col;

export interface WalkInput {
  placements: Placements;
  tech: ReadonlyArray<Pick<Buildable, 'id' | 'kind' | 'facilityType' | 'status' | 'slots' | 'tier'>>;
  pathways: Pathways;
}

// The tile cost grid: -1 where nothing walks.
export function walkGrid(input: WalkInput): Float32Array {
  const g = new Float32Array(N).fill(LAWN_COST);
  for (let r = ROAD_FIRST_ROW; r < H; r++) for (let c = 0; c < W; c++) g[idx(c, r)] = ROAD_COST;
  const byId = new Map(input.tech.map((t) => [t.id, t]));
  for (const [id, p] of Object.entries(input.placements)) {
    const t = byId.get(id);
    if (t?.facilityType === 'quad') {
      // Lawn, its walks, and the centerpiece no one walks through (Plan 62:
      // the crowd crossed the Grand Quad through its fountain).
      for (let r = p.row; r < p.row + p.h; r++) {
        for (let c = p.col; c < p.col + p.w; c++) {
          const kind = quadTile(p.col, p.row, p.w, p.h, t.tier ?? 1, c, r);
          g[idx(c, r)] = kind === 'blocked' ? -1 : kind === 'walk' ? PATH_COST : QUAD_COST;
        }
      }
      continue;
    }
    for (let r = p.row; r < p.row + p.h; r++) for (let c = p.col; c < p.col + p.w; c++) g[idx(c, r)] = -1;
  }
  for (const key of Object.keys(input.pathways)) {
    const t = parsePathTileKey(key);
    if (t && t.row >= 0 && t.col >= 0 && t.row < H && t.col < W && g[idx(t.col, t.row)] !== -1) g[idx(t.col, t.row)] = PATH_COST;
  }
  return g;
}

// A building's doors, one a wall, at the wall's middle. A door opens onto
// the tile (or, on an even wall, the two tiles) just outside that middle;
// if any of them is off the map or built over, that door is shut. A
// building walled in on every side is reached at the nearest open tile round
// its edge, as before.
export function entrancesOf(p: Placement, grid: Float32Array): Entrance[] {
  const open = (c: number, r: number) => c >= 0 && r >= 0 && c < W && r < H && grid[idx(c, r)] > 0;
  const midCol = p.col + p.w / 2;
  const midRow = p.row + p.h / 2;
  // The tiles a door on this wall opens onto: one under an odd wall's
  // middle, the two either side of an even wall's.
  const across = (mid: number, even: boolean) => (even ? [mid - 1, mid] : [Math.floor(mid)]);
  const walls: { side: FaceDir; tiles: Tile[]; face: Waypoint }[] = [
    { side: 'posRow', face: { col: midCol, row: p.row + p.h }, tiles: across(midCol, p.w % 2 === 0).map((c) => ({ col: c, row: p.row + p.h })) },
    { side: 'negRow', face: { col: midCol, row: p.row }, tiles: across(midCol, p.w % 2 === 0).map((c) => ({ col: c, row: p.row - 1 })) },
    { side: 'posCol', face: { col: p.col + p.w, row: midRow }, tiles: across(midRow, p.h % 2 === 0).map((r) => ({ col: p.col + p.w, row: r })) },
    { side: 'negCol', face: { col: p.col, row: midRow }, tiles: across(midRow, p.h % 2 === 0).map((r) => ({ col: p.col - 1, row: r })) },
  ];
  const out: Entrance[] = [];
  for (const w of walls) {
    if (!w.tiles.every((q) => open(q.col, q.row))) continue;
    const q = w.tiles[w.tiles.length - 1];
    out.push({ col: q.col, row: q.row, face: w.face, side: w.side });
  }
  if (out.length > 0) return out;
  const round: [number, number][] = [];
  for (let c = p.col; c < p.col + p.w; c++) round.push([c, p.row + p.h], [c, p.row - 1]);
  for (let r = p.row; r < p.row + p.h; r++) round.push([p.col - 1, r], [p.col + p.w, r]);
  for (const [c, r] of round) {
    if (open(c, r)) return [{ col: c, row: r, face: { col: c + 0.5, row: r + 0.5 }, side: null }];
  }
  return [];
}

// Finished buildings, weighted by how much of a student's day happens
// there: home, then the halls and the dining halls.
export function doors(input: WalkInput, grid: Float32Array): Stop[] {
  const byId = new Map(input.tech.map((t) => [t.id, t]));
  const out: Stop[] = [];
  for (const [id, p] of Object.entries(input.placements)) {
    const t = byId.get(id);
    if (!t || t.status !== 'done' || t.facilityType === 'quad') continue;
    const entrances = entrancesOf(p, grid);
    if (entrances.length === 0) continue;
    const weight = t.kind === 'dorm' ? 3
      : isAcademicHall(t as Buildable) || t.facilityType === 'diningHall' ? 2
        : t.facilityType === 'library' || t.facilityType === 'studentCenter' || t.facilityType === 'recCenter' ? 1.5
          : 1;
    out.push({ key: id, id, weight, entrances });
  }
  return out;
}

// Where students come from and go to when there is nowhere else: points
// along the road.
export function roadsides(): Stop[] {
  const out: Stop[] = [];
  for (let c = 4; c < W - 4; c += 8) out.push(pointStop(c, ROAD_FIRST_ROW));
  return out;
}

// A stop at one tile, with no wall: the road, or wherever a walker stood
// when the campus changed under it.
export function pointStop(col: number, row: number): Stop {
  return { key: `at:${col},${row}`, id: null, weight: 1, entrances: [{ col, row, face: { col: col + 0.5, row: row + 0.5 }, side: null }] };
}

// A shortest-path tree from one tile or several: Dijkstra, eight-way, a
// diagonal step costing more and refused across a blocked corner. `prev`
// leads every reached tile back to its root (a root is its own `prev`);
// `dist` is what the way there costs.
export interface Tree { prev: Int32Array; dist: Float64Array }

export function growTree(grid: Float32Array, from: Tile | readonly Tile[]): Int32Array {
  return growCostTree(grid, from).prev;
}

export function growCostTree(grid: Float32Array, from: Tile | readonly Tile[]): Tree {
  const dist = new Float64Array(N).fill(Infinity);
  const prev = new Int32Array(N).fill(-1);
  const done = new Uint8Array(N);
  // A binary min-heap over (cost, tile), as two parallel arrays.
  const hc: number[] = [];
  const hi: number[] = [];
  const push = (cost: number, i: number) => {
    hc.push(cost); hi.push(i);
    let k = hc.length - 1;
    while (k > 0) {
      const parent = (k - 1) >> 1;
      if (hc[parent] <= hc[k]) break;
      [hc[parent], hc[k]] = [hc[k], hc[parent]];
      [hi[parent], hi[k]] = [hi[k], hi[parent]];
      k = parent;
    }
  };
  const pop = (): number => {
    const top = hi[0];
    const lc = hc.pop()!;
    const li = hi.pop()!;
    if (hc.length > 0) {
      hc[0] = lc; hi[0] = li;
      let k = 0;
      for (;;) {
        const l = k * 2 + 1;
        const r = l + 1;
        let m = k;
        if (l < hc.length && hc[l] < hc[m]) m = l;
        if (r < hc.length && hc[r] < hc[m]) m = r;
        if (m === k) break;
        [hc[m], hc[k]] = [hc[k], hc[m]];
        [hi[m], hi[k]] = [hi[k], hi[m]];
        k = m;
      }
    }
    return top;
  };
  for (const root of Array.isArray(from) ? from : [from as Tile]) {
    const start = idx(root.col, root.row);
    if (grid[start] <= 0 || dist[start] === 0) continue;
    dist[start] = 0;
    prev[start] = start;
    push(0, start);
  }
  while (hc.length > 0) {
    const i = pop();
    if (done[i]) continue;
    done[i] = 1;
    const c = i % W;
    const r = (i - c) / W;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nc = c + dc;
        const nr = r + dr;
        if (nc < 0 || nr < 0 || nc >= W || nr >= H) continue;
        const j = idx(nc, nr);
        const step = grid[j];
        if (step <= 0 || done[j]) continue;
        if (dr !== 0 && dc !== 0 && (grid[idx(c + dc, r)] <= 0 || grid[idx(c, r + dr)] <= 0)) continue;
        const d = dist[i] + step * (dr !== 0 && dc !== 0 ? Math.SQRT2 : 1);
        if (d < dist[j]) {
          dist[j] = d;
          prev[j] = i;
          push(d, j);
        }
      }
    }
  }
  return { prev, dist };
}

// The route from a tree's root to a tile, as tile centers, or null if the
// tile was never reached.
export function routeTo(prev: Int32Array, to: Tile): Waypoint[] | null {
  let i = idx(to.col, to.row);
  if (prev[i] === -1) return null;
  const out: Waypoint[] = [];
  for (let guard = 0; guard < N; guard++) {
    out.push({ col: (i % W) + 0.5, row: Math.floor(i / W) + 0.5 });
    if (prev[i] === i) return out.reverse();
    i = prev[i];
  }
  return null;
}

// The way from one stop to another: out of whichever of `from`'s doors the
// tree leads back to, and in at `to`'s cheapest door. Door to door, wall
// point to wall point, with the tiles between.
export interface Walk { route: Waypoint[]; exit: Entrance; entry: Entrance }

export function walkOf(tree: Tree, from: Stop, to: Stop): Walk | null {
  let entry: Entrance | null = null;
  for (const e of to.entrances) {
    const d = tree.dist[idx(e.col, e.row)];
    if (d < Infinity && (!entry || d < tree.dist[idx(entry.col, entry.row)])) entry = e;
  }
  if (!entry) return null;
  const tiles = routeTo(tree.prev, entry);
  if (!tiles) return null;
  const first = tiles[0];
  const exit = from.entrances.find((e) => e.col + 0.5 === first.col && e.row + 0.5 === first.row) ?? from.entrances[0];
  const route: Waypoint[] = [];
  const add = (w: Waypoint) => {
    const last = route[route.length - 1];
    if (!last || last.col !== w.col || last.row !== w.row) route.push(w);
  };
  add(exit.face);
  tiles.forEach(add);
  add(entry.face);
  return { route, exit, entry };
}

// Trees by the stop they are grown from, grown on demand and at most
// `budget` per call to `grow`, so a new campus fills in over a few frames.
export class RouteTable {
  private trees = new Map<string, Tree>();
  private wanted: Stop[] = [];
  private readonly grid: Float32Array;
  constructor(grid: Float32Array) {
    this.grid = grid;
  }

  walk(from: Stop, to: Stop): Walk | null | undefined {
    const tree = this.trees.get(from.key);
    if (!tree) {
      if (!this.wanted.some((w) => w.key === from.key)) this.wanted.push(from);
      return undefined; // not yet: ask again next frame
    }
    return walkOf(tree, from, to);
  }

  grow(budget = 1): void {
    for (let k = 0; k < budget && this.wanted.length > 0; k++) {
      const from = this.wanted.shift()!;
      this.trees.set(from.key, growCostTree(this.grid, from.entrances));
    }
  }
}

// Desire lines: the lawn the busiest routes cross, as runs of tile centers.
// Homes to halls and dining, the most-used few of each.
export function desireLines(input: WalkInput, grid: Float32Array): Waypoint[][] {
  const stops = doors(input, grid);
  const homes = stops.filter((d) => d.weight >= 3).slice(0, 6);
  const dests = stops.filter((d) => d.weight === 2).slice(0, 8);
  const runs: Waypoint[][] = [];
  for (const a of homes) {
    const tree = growCostTree(grid, a.entrances);
    for (const b of dests) {
      const walk = walkOf(tree, a, b);
      if (!walk) continue;
      let run: Waypoint[] = [];
      // The tiles only: the two door points are on the walls.
      for (const w of walk.route.slice(1, -1)) {
        if (grid[idx(Math.floor(w.col), Math.floor(w.row))] === LAWN_COST) run.push(w);
        else {
          if (run.length > 2) runs.push(run);
          run = [];
        }
      }
      if (run.length > 2) runs.push(run);
    }
  }
  return runs;
}
