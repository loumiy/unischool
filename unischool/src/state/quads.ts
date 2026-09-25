import type { Buildable, Pathways, Placements, QuadState } from './types';
import { CAMPUS_GRID_HEIGHT, CAMPUS_GRID_WIDTH } from './types';
import { ROAD_FIRST_ROW, parsePathTileKey, pathTileKey } from './campusMap';
import {
  QUAD_DOORWAY_DEPTH, QUAD_DOORWAY_WIDTH, QUAD_GREEN_WEIGHT, QUAD_MAX_AREA, QUAD_MIN_AREA,
  QUAD_MIN_ENCLOSURE, QUAD_NAMES, QUAD_PATH_WEIGHT,
} from '../data/quadData';

// Quads (ported from v2's quads.ts): the open spaces the buildings enclose,
// detected rather than declared. A quad is ground that is not built on and
// not road, does not reach the edge of the parcel, is neither a light well
// nor the rest of the campus, and is mostly walled. The game finds them and
// names them; the player can rename one, and can mark as a quad a space
// detection passes over. What they are worth is Phase E's.
//
// A placed Campus Quad (a facility of type 'quad') is lawn a quad is made
// of, not a wall. Every other placement is a wall.
//
// A quad's identity is its anchor, the first of its tiles in row-major order,
// so a name sticks to a space as long as its top corner does.
//
// The fill runs twice. First over open ground with paving underfoot, which
// finds the spaces the buildings enclose and lets a walk cross a green
// without cutting it in two. Then, through what the first pass did not
// claim, with paving as edge, which finds the lawns a player has drawn
// paths around. Before either, narrow gaps between buildings are sealed as
// doorways (see sealDoorways).
//
// Read by the map, and by campus beauty (systems/estate/beauty.ts), whose
// enclosure share counts the quads.

export interface QuadInput {
  placements: Placements;
  tech: ReadonlyArray<Pick<Buildable, 'id' | 'facilityType'>>;
  pathways: Pathways;
  quads?: QuadState;
}

export interface Quad {
  key: string;            // the anchor tile, as pathTileKey writes it
  tiles: number[];        // row * CAMPUS_GRID_WIDTH + col
  area: number;
  enclosure: number;      // 0–1: how much of its edge is wall, paving counting for less
  green: number;          // 0–1: the share of it that is lawn, not paving
  quality: number;        // 0–1: enclosure, lifted by how green it is
  name: string;
  centre: { col: number; row: number };
  // Made a quad by the player's mark rather than by detection.
  designated: boolean;
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

function nameFor(key: string, taken: Set<string>): string {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) % 1000003;
  for (let i = 0; i < QUAD_NAMES.length; i++) {
    const name = QUAD_NAMES[(h + i) % QUAD_NAMES.length];
    if (!taken.has(name)) return name;
  }
  return QUAD_NAMES[h % QUAD_NAMES.length];
}

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

function quadOf(region: Region, paved: Uint8Array, names: Record<string, string>, taken: Set<string>, designated: boolean): Quad {
  const { tiles } = region;
  const enclosure = region.boundary === 0 ? 0 : region.wall / region.boundary;
  const green = tiles.filter((i) => paved[i] !== 1).length / tiles.length;
  const key = pathTileKey(tileOf(tiles[0]));
  const name = names[key] ?? nameFor(key, taken);
  taken.add(name);
  let cols = 0;
  let rows = 0;
  for (const i of tiles) {
    const t = tileOf(i);
    cols += t.col;
    rows += t.row;
  }
  return {
    key, tiles, area: tiles.length,
    enclosure: Number(enclosure.toFixed(3)),
    green: Number(green.toFixed(3)),
    quality: Number((enclosure * (1 - QUAD_GREEN_WEIGHT + QUAD_GREEN_WEIGHT * green)).toFixed(3)),
    name,
    centre: { col: cols / tiles.length + 0.5, row: rows / tiles.length + 0.5 },
    designated,
  };
}

export function detectQuads(input: QuadInput): Quad[] {
  const { kind, paved } = grids(input);
  const names = input.quads?.names ?? {};
  const claimed = new Uint8Array(N);
  const queue = new Int32Array(N);
  const quads: Quad[] = [];
  const taken = new Set<string>(Object.values(names));

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
      quads.push(quadOf(region, paved, names, taken, false));
    }
  }

  // The player's marks: the open space under each, if detection left it and
  // it does not reach the parcel's edge.
  for (const key of input.quads?.designated ?? []) {
    const t = parsePathTileKey(key);
    if (!t || t.row < 0 || t.col < 0 || t.row >= H || t.col >= W) continue;
    const start = tileIndex(t.row, t.col);
    if (claimed[start] || kind[start] !== OPEN) continue;
    const region = flood(start, kind, paved, claimed, new Uint8Array(N), queue, false);
    if (region.touchesEdge || region.tiles.length < QUAD_MIN_AREA) continue;
    for (const i of region.tiles) claimed[i] = 1;
    quads.push(quadOf(region, paved, names, taken, true));
  }

  quads.sort((a, b) => a.tiles[0] - b.tiles[0]);
  return quads;
}

// Why a mark here would make no quad, or null if it would. The ground under
// the tile must be open, enclosed from the parcel's edge, and more than a
// light well.
export function designationRefusal(input: QuadInput, row: number, col: number): string | null {
  if (row < 0 || col < 0 || row >= ROAD_FIRST_ROW || col >= W) return 'not on the campus';
  const { kind, paved } = grids(input);
  const start = tileIndex(row, col);
  if (kind[start] !== OPEN) return kind[start] === DOORWAY ? 'a doorway, not a space' : 'built on';
  const region = flood(start, kind, paved, new Uint8Array(N), new Uint8Array(N), new Int32Array(N), false);
  if (region.touchesEdge) return 'open to the edge of the campus';
  if (region.tiles.length < QUAD_MIN_AREA) return 'too small for a quad';
  return null;
}
