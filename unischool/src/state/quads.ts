import type { Buildable, Pathways, Placements } from './types';
import { CAMPUS_GRID_HEIGHT, CAMPUS_GRID_WIDTH } from './types';
import { ROAD_FIRST_ROW, parsePathTileKey, pathTileKey } from './campusMap';
import {
  QUAD_DOORWAY_DEPTH, QUAD_DOORWAY_WIDTH, QUAD_GREEN_WEIGHT, QUAD_MAX_AREA, QUAD_MIN_AREA,
  QUAD_MIN_ENCLOSURE, QUAD_PATH_WEIGHT,
} from '../data/quadData';

// Quads (ported from v2's quads.ts): the open spaces the buildings enclose,
// detected rather than declared. A quad is ground that is not built on and
// not road, does not reach the edge of the parcel, is neither a light well
// nor the rest of the campus, and is mostly walled. The game finds them;
// the map does not show them (Plan 80H took away their names, their tint and
// the player's marks), and nothing but what the campus encloses makes one.
//
// A placed Campus Quad (a facility of type 'quad') is lawn a quad is made
// of, not a wall. Every other placement is a wall.
//
// A quad's identity is its anchor, the first of its tiles in row-major order.
//
// The fill runs twice. First over open ground with paving underfoot, which
// finds the spaces the buildings enclose and lets a walk cross a green
// without cutting it in two. Then, through what the first pass did not
// claim, with paving as edge, which finds the lawns a player has drawn
// paths around. Before either, narrow gaps between buildings are sealed as
// doorways (see sealDoorways).
//
// Read by campus beauty (systems/estate/beauty.ts), whose enclosure share
// counts the quads, and by the one event that needs a quad to stand
// (systems/events/catalogue.ts's quadsOver).

export interface QuadInput {
  placements: Placements;
  tech: ReadonlyArray<Pick<Buildable, 'id' | 'facilityType'>>;
  pathways: Pathways;
}

export interface Quad {
  key: string;            // the anchor tile, as pathTileKey writes it
  tiles: number[];        // row * CAMPUS_GRID_WIDTH + col
  area: number;
  enclosure: number;      // 0–1: how much of its edge is wall, paving counting for less
  green: number;          // 0–1: the share of it that is lawn, not paving
  quality: number;        // 0–1: enclosure, lifted by how green it is
}

const W = CAMPUS_GRID_WIDTH;
const H = CAMPUS_GRID_HEIGHT;
const N = W * H;
const DC = [0, 1, 0, -1] as const;
const DR = [-1, 0, 1, 0] as const;

// What a tile is to the fill. Anything but OPEN stops it and is edge.
const OPEN = 0;
const BUILT = 1;
const ROAD = 2;     // bounds a space without walling it
const DOORWAY = 3;  // a gap too narrow to be a way out

export const tileIndex = (row: number, col: number) => row * W + col;
export const tileOf = (i: number) => ({ row: Math.floor(i / W), col: i % W });

// A doorway is a hole through something thin: a run of open ground at most
// QUAD_DOORWAY_WIDTH across, closed at both ends by something solid, through
// a wall no deeper than QUAD_DOORWAY_DEPTH. Without the first half a court
// drains through its own entrance into the rest of the campus; without the
// second, a long alley between two halls would be sealed as well.

// The run of open ground through (col,row) along one axis: its length, or 0
// if it is wider than a doorway or runs off the parcel.
function narrowRun(kind: Uint8Array, col: number, row: number, dc: number, dr: number): number {
  let length = 1;
  let ends = 0;
  for (const sign of [1, -1]) {
    let c = col + dc * sign;
    let r = row + dr * sign;
    while (c >= 0 && r >= 0 && c < W && r < H) {
      if (kind[tileIndex(r, c)] !== OPEN) {
        ends++;
        break;
      }
      length++;
      if (length > QUAD_DOORWAY_WIDTH) return 0;
      c += dc * sign;
      r += dr * sign;
    }
  }
  return ends === 2 ? length : 0;
}

// How far the narrowness goes on, across the run: the depth of the wall.
function depthOfGap(narrow: Uint8Array, col: number, row: number, dc: number, dr: number): number {
  let depth = 1;
  for (const sign of [1, -1]) {
    let c = col + dc * sign;
    let r = row + dr * sign;
    while (c >= 0 && r >= 0 && c < W && r < H && narrow[tileIndex(r, c)]) {
      depth++;
      if (depth > QUAD_DOORWAY_DEPTH) return depth;
      c += dc * sign;
      r += dr * sign;
    }
  }
  return depth;
}

// A tile with open ground all round cannot be in a doorway: four reads that
// skip most of an unbuilt parcel.
function touchesSolid(kind: Uint8Array, col: number, row: number): boolean {
  for (let k = 0; k < 4; k++) {
    const c = col + DC[k];
    const r = row + DR[k];
    if (c < 0 || r < 0 || c >= W || r >= H) continue;
    if (kind[tileIndex(r, c)] !== OPEN) return true;
  }
  return false;
}

function sealDoorways(kind: Uint8Array): void {
  const narrowAcross = new Uint8Array(N);
  const narrowDown = new Uint8Array(N);
  const candidates: number[] = [];
  for (let r = 0; r < H; r++) {
    for (let c = 0; c < W; c++) {
      const i = tileIndex(r, c);
      if (kind[i] !== OPEN || !touchesSolid(kind, c, r)) continue;
      if (narrowRun(kind, c, r, 1, 0) > 0) narrowAcross[i] = 1;
      if (narrowRun(kind, c, r, 0, 1) > 0) narrowDown[i] = 1;
      if (narrowAcross[i] || narrowDown[i]) candidates.push(i);
    }
  }
  // Collected first and applied after, so one doorway does not make the
  // next tile look like one.
  const sealed: number[] = [];
  for (const i of candidates) {
    const { row: r, col: c } = tileOf(i);
    const thin = (narrowAcross[i] === 1 && depthOfGap(narrowAcross, c, r, 0, 1) <= QUAD_DOORWAY_DEPTH)
      || (narrowDown[i] === 1 && depthOfGap(narrowDown, c, r, 1, 0) <= QUAD_DOORWAY_DEPTH);
    if (thin) sealed.push(i);
  }
  for (const i of sealed) kind[i] = DOORWAY;
}

interface Region {
  tiles: number[];
  touchesEdge: boolean;
  boundary: number;
  wall: number; // weighted: a building is worth 1, paving less
}

function flood(
  start: number, kind: Uint8Array, paved: Uint8Array, claimed: Uint8Array,
  seen: Uint8Array, queue: Int32Array, pavingIsEdge: boolean,
): Region {
  const passable = (i: number) => kind[i] === OPEN && claimed[i] === 0 && !(pavingIsEdge && paved[i] === 1);
  let head = 0;
  let tail = 0;
  queue[tail++] = start;
  seen[start] = 1;
  const region: Region = { tiles: [], touchesEdge: false, boundary: 0, wall: 0 };
  while (head < tail) {
    const i = queue[head++];
    region.tiles.push(i);
    const { row: r, col: c } = tileOf(i);
    if (c === 0 || r === 0 || c === W - 1 || r === H - 1) region.touchesEdge = true;
    for (let k = 0; k < 4; k++) {
      const nc = c + DC[k];
      const nr = r + DR[k];
      if (nc < 0 || nr < 0 || nc >= W || nr >= H) continue;
      const j = tileIndex(nr, nc);
      if (passable(j)) {
        if (!seen[j]) {
          seen[j] = 1;
          queue[tail++] = j;
        }
        continue;
      }
      region.boundary++;
      if (kind[j] === BUILT) region.wall += 1;
      else if (kind[j] === OPEN && pavingIsEdge && paved[j] === 1) region.wall += QUAD_PATH_WEIGHT;
      // The road, a doorway or another quad bound the space without
      // enclosing it, and count against the share that does.
    }
  }
  return region;
}

// The ground as the fill sees it, and which of it is paved.
function grids(input: QuadInput): { kind: Uint8Array; paved: Uint8Array } {
  const kind = new Uint8Array(N);
  for (let r = ROAD_FIRST_ROW; r < H; r++) for (let c = 0; c < W; c++) kind[tileIndex(r, c)] = ROAD;
  const lawn = new Set(input.tech.filter((t) => t.facilityType === 'quad').map((t) => t.id));
  for (const [id, p] of Object.entries(input.placements)) {
    if (lawn.has(id)) continue;
    for (let r = p.row; r < p.row + p.h; r++) {
      for (let c = p.col; c < p.col + p.w; c++) {
        if (r >= 0 && c >= 0 && r < H && c < W) kind[tileIndex(r, c)] = BUILT;
      }
    }
  }
  sealDoorways(kind);
  const paved = new Uint8Array(N);
  for (const key of Object.keys(input.pathways)) {
    const t = parsePathTileKey(key);
    if (t && t.row >= 0 && t.col >= 0 && t.row < H && t.col < W) paved[tileIndex(t.row, t.col)] = 1;
  }
  return { kind, paved };
}

function quadOf(region: Region, paved: Uint8Array): Quad {
  const { tiles } = region;
  const enclosure = region.boundary === 0 ? 0 : region.wall / region.boundary;
  const green = tiles.filter((i) => paved[i] !== 1).length / tiles.length;
  return {
    key: pathTileKey(tileOf(tiles[0])), tiles, area: tiles.length,
    enclosure: Number(enclosure.toFixed(3)),
    green: Number(green.toFixed(3)),
    quality: Number((enclosure * (1 - QUAD_GREEN_WEIGHT + QUAD_GREEN_WEIGHT * green)).toFixed(3)),
  };
}

export function detectQuads(input: QuadInput): Quad[] {
  const { kind, paved } = grids(input);
  const claimed = new Uint8Array(N);
  const queue = new Int32Array(N);
  const quads: Quad[] = [];

  // Pass one: what the buildings enclose, paving underfoot. Pass two: what
  // the paving encloses in the ground pass one left, and only if there are
  // paths to enclose anything.
  const passes = Object.keys(input.pathways).length > 0 ? [false, true] : [false];
  for (const pavingIsEdge of passes) {
    const seen = new Uint8Array(N);
    for (let start = 0; start < N; start++) {
      if (seen[start] || claimed[start] || kind[start] !== OPEN) continue;
      if (pavingIsEdge && paved[start] === 1) continue;
      const region = flood(start, kind, paved, claimed, seen, queue, pavingIsEdge);
      if (region.touchesEdge || region.tiles.length < QUAD_MIN_AREA || region.tiles.length > QUAD_MAX_AREA) continue;
      if (region.boundary === 0 || region.wall / region.boundary < QUAD_MIN_ENCLOSURE) continue;
      for (const i of region.tiles) claimed[i] = 1;
      quads.push(quadOf(region, paved));
    }
  }

  quads.sort((a, b) => a.tiles[0] - b.tiles[0]);
  return quads;
}
