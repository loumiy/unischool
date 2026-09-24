import type { Buildable, Pathways, Placement, Placements } from '../state/types';
import { CAMPUS_GRID_HEIGHT, CAMPUS_GRID_WIDTH } from '../state/types';
import { ROAD_FIRST_ROW, parsePathTileKey } from '../state/campusMap';
import { isAcademicHall } from '../data/techData';

// Routes for the walkers and the desire lines (ported from v2's routes.ts):
// the cheapest way over the grid between two doors, paths first, lawn when
// there is no path, the road at the edge, never through a building. Drawing
// only: the map's own copy of the grid, never the simulation's.
//
// A route is read off a shortest-path tree grown from its starting door.
// Trees are grown one at a time as walkers first need them (RouteTable), so
// a new layout never stalls a frame on a whole campus's worth of searches.

const W = CAMPUS_GRID_WIDTH;
const H = CAMPUS_GRID_HEIGHT;
const N = W * H;

// What a step onto a tile costs. A Campus Quad is lawn with its own walks.
export const PATH_COST = 1;
const ROAD_COST = 1.5;
const QUAD_COST = 2;
export const LAWN_COST = 4;

export interface Waypoint { col: number; row: number }  // a tile centre
export interface Door { id: string; col: number; row: number; weight: number }

const idx = (col: number, row: number) => row * W + col;

export interface WalkInput {
  placements: Placements;
  tech: ReadonlyArray<Pick<Buildable, 'id' | 'kind' | 'facilityType' | 'status' | 'slots'>>;
  pathways: Pathways;
}

// The tile cost grid: -1 where nothing walks.
export function walkGrid(input: WalkInput): Float32Array {
  const g = new Float32Array(N).fill(LAWN_COST);
  for (let r = ROAD_FIRST_ROW; r < H; r++) for (let c = 0; c < W; c++) g[idx(c, r)] = ROAD_COST;
  const byId = new Map(input.tech.map((t) => [t.id, t]));
  for (const [id, p] of Object.entries(input.placements)) {
    const cost = byId.get(id)?.facilityType === 'quad' ? QUAD_COST : -1;
    for (let r = p.row; r < p.row + p.h; r++) for (let c = p.col; c < p.col + p.w; c++) g[idx(c, r)] = cost;
  }
  for (const key of Object.keys(input.pathways)) {
    const t = parsePathTileKey(key);
    if (t && t.row >= 0 && t.col >= 0 && t.row < H && t.col < W && g[idx(t.col, t.row)] !== -1) g[idx(t.col, t.row)] = PATH_COST;
  }
  return g;
}

// A building's door: the tile just outside the middle of its front (the +row
// edge), or else the nearest walkable tile round its edge.
function doorOf(p: Placement, grid: Float32Array): { col: number; row: number } | null {
  const want: [number, number][] = [[p.col + Math.floor(p.w / 2), p.row + p.h]];
  for (let c = p.col; c < p.col + p.w; c++) want.push([c, p.row + p.h], [c, p.row - 1]);
  for (let r = p.row; r < p.row + p.h; r++) want.push([p.col - 1, r], [p.col + p.w, r]);
  for (const [c, r] of want) {
    if (c < 0 || r < 0 || c >= W || r >= H) continue;
    if (grid[idx(c, r)] > 0) return { col: c, row: r };
  }
  return null;
}

// Finished buildings' doors, weighted by how much of a student's day happens
// there: home, then the halls and the dining halls.
export function doors(input: WalkInput, grid: Float32Array): Door[] {
  const byId = new Map(input.tech.map((t) => [t.id, t]));
  const out: Door[] = [];
  for (const [id, p] of Object.entries(input.placements)) {
    const t = byId.get(id);
    if (!t || t.status !== 'done' || t.facilityType === 'quad') continue;
    const door = doorOf(p, grid);
    if (!door) continue;
    const weight = t.kind === 'dorm' ? 3
      : isAcademicHall(t as Buildable) || t.facilityType === 'diningHall' ? 2
        : t.facilityType === 'library' || t.facilityType === 'studentCenter' || t.facilityType === 'recCenter' ? 1.5
          : 1;
    out.push({ id, ...door, weight });
  }
  return out;
}

// Where students come from and go to when there is nowhere else: points
// along the road.
export function roadsides(): Waypoint[] {
  const out: Waypoint[] = [];
  for (let c = 4; c < W - 4; c += 8) out.push({ col: c, row: ROAD_FIRST_ROW });
  return out;
}

// A shortest-path tree from one tile: Dijkstra, eight-way, a diagonal step
// costing more and refused across a blocked corner. `prev` leads every
// reached tile back to the root.
export function growTree(grid: Float32Array, from: { col: number; row: number }): Int32Array {
  const dist = new Float64Array(N).fill(Infinity);
  const prev = new Int32Array(N).fill(-1);
  const done = new Uint8Array(N);
  const start = idx(from.col, from.row);
  if (grid[start] <= 0) return prev;
  dist[start] = 0;
  prev[start] = start;
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
  push(0, start);
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
  return prev;
}

// The route from a tree's root to a tile, as tile centres, or null if the
// tile was never reached.
export function routeTo(prev: Int32Array, to: { col: number; row: number }): Waypoint[] | null {
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

// Trees by their root, grown on demand and at most `budget` per call to
// `grow`, so a new campus fills in over a few frames.
export class RouteTable {
  private trees = new Map<string, Int32Array>();
  private wanted: { col: number; row: number }[] = [];
  private readonly grid: Float32Array;
  constructor(grid: Float32Array) {
    this.grid = grid;
  }

  route(from: { col: number; row: number }, to: { col: number; row: number }): Waypoint[] | null | undefined {
    const tree = this.trees.get(`${from.col},${from.row}`);
    if (!tree) {
      if (!this.wanted.some((w) => w.col === from.col && w.row === from.row)) this.wanted.push(from);
      return undefined; // not yet: ask again next frame
    }
    return routeTo(tree, to);
  }

  grow(budget = 1): void {
    for (let k = 0; k < budget && this.wanted.length > 0; k++) {
      const from = this.wanted.shift()!;
      this.trees.set(`${from.col},${from.row}`, growTree(this.grid, from));
    }
  }
}

// Desire lines: the lawn the busiest routes cross, as runs of tile centres.
// Homes to halls and dining, the most-used few of each.
export function desireLines(input: WalkInput, grid: Float32Array): Waypoint[][] {
  const stops = doors(input, grid);
  const homes = stops.filter((d) => d.weight >= 3).slice(0, 6);
  const dests = stops.filter((d) => d.weight === 2).slice(0, 8);
  const runs: Waypoint[][] = [];
  for (const a of homes) {
    const tree = growTree(grid, a);
    for (const b of dests) {
      const route = routeTo(tree, b);
      if (!route) continue;
      let run: Waypoint[] = [];
      for (const w of route) {
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
