// ---------------------------------------------------------------------
// THE ARRANGEMENT CAMPUSES (Plan 73, area 1). Small test campuses, each one
// arrangement of paths or buildings a player could make, in every
// vernacular, written as saves the browser opens: paths straight, in a T,
// crossing, diagonal, curved, dead-ending and looped; buildings packed
// against each other, against open ground, against trees and against
// props; and the big set pieces side by side.
//
//   npm run scenario -- --player Completionist --year 50 --build-all --clear-modal \
//     --name Blackmoor node_modules/.tmp/all.json      # the base: every asset done
//   npm run review:arrangements                         # node_modules/.tmp/arrangements/
//   npm run review:arrangements -- --base <save> --out <dir> --only cross,trees
//   npm run review:arrangements -- --list
//
// Each save is the base run (a year-50 college, so walkers, bike racks and
// every building's finished form are all there) with its campus replaced
// by one arrangement, centered on the grid's middle, which is where the map
// opens and where the camera turns about (CampusMap.tsx's defaultView and
// applyCamera). `npm run review:views` photographs each in all four views;
// `npm run review:doors` checks each by rule.
//
// Placement is visual only (docs/architecture/campus-map.md), so nothing
// the simulation computed changes; every placement is still checked with
// the reducer's own footprintIsClear, and a path is never laid on a
// building. A door is placed by naming the tile it opens onto (`door`),
// using walkRoutes.ts's rule for where a wall's door is.
//
// Not part of the game: nothing in src/ imports this.
// ---------------------------------------------------------------------

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { BenchFacing, Buildable, Dressing, DressingKind, Facing, GameState, Placements, TileCoord, Vernacular } from '../../src/state/types';
import { benchItem, defaultBenchFacing } from '../../src/state/dressing';
import { footprintIsClear, isLand, orientedFootprint, pathTileKey, placementFor, placementTiles } from '../../src/state/campusMap';

export const VERNACULARS: readonly Vernacular[] = ['georgian', 'gothic', 'classical', 'mission', 'modern'];

type Wall = 'south' | 'east' | 'north' | 'west';

export interface Site {
  id: string;
  facing?: Facing;
  // Top-left tile, or the tile a named wall's door opens onto.
  at?: TileCoord;
  door?: { wall: Wall; tile: TileCoord };
}

export interface Arrangement {
  name: string;
  what: string;
  sites: Site[];
  paths: TileCoord[];
  trees?: TileCoord[];
  // A bench faces the way named, or the path beside it, as when placed.
  dressing?: Array<{ tile: TileCoord; kind: DressingKind; facing?: BenchFacing }>;
}

// ---- Drawing helpers ----
const T = (row: number, col: number): TileCoord => ({ row, col });
function run(r0: number, c0: number, r1: number, c1: number): TileCoord[] {
  const out: TileCoord[] = [];
  const dr = Math.sign(r1 - r0);
  const dc = Math.sign(c1 - c0);
  if (dr !== 0 && dc !== 0) throw new Error(`not straight: ${r0},${c0} -> ${r1},${c1}`);
  const n = Math.max(Math.abs(r1 - r0), Math.abs(c1 - c0));
  for (let i = 0; i <= n; i++) out.push(T(r0 + dr * i, c0 + dc * i));
  return out;
}
function ring(r0: number, c0: number, r1: number, c1: number): TileCoord[] {
  return [...run(r0, c0, r0, c1), ...run(r1, c0, r1, c1), ...run(r0, c0, r1, c0), ...run(r0, c1, r1, c1)];
}
// A 4-connected staircase from (r0,c0), n steps down-right.
function stair(r0: number, c0: number, n: number): TileCoord[] {
  const out: TileCoord[] = [];
  for (let i = 0; i < n; i++) out.push(T(r0 + i, c0 + i), T(r0 + i, c0 + i + 1));
  return out;
}
// A 4-connected quarter circle of radius r about (cr, cc), from east to north.
function arc(cr: number, cc: number, r: number): TileCoord[] {
  const out = new Map<string, TileCoord>();
  let prev: TileCoord | null = null;
  for (let a = 0; a <= 90; a += 1) {
    const rad = (a * Math.PI) / 180;
    const t = T(Math.round(cr - r * Math.sin(rad)), Math.round(cc + r * Math.cos(rad)));
    if (prev && prev.row !== t.row && prev.col !== t.col) out.set(`${prev.row},${t.col}`, T(prev.row, t.col));
    out.set(`${t.row},${t.col}`, t);
    prev = t;
  }
  return [...out.values()];
}
const rect = (r0: number, c0: number, h: number, w: number): TileCoord[] => {
  const out: TileCoord[] = [];
  for (let r = r0; r < r0 + h; r++) for (let c = c0; c < c0 + w; c++) out.push(T(r, c));
  return out;
};

// ---- The arrangements, drawn about the grid's middle (63, 63) ----
export const ARRANGEMENTS: Arrangement[] = [
  {
    name: 'straight',
    what: 'A straight east-west walk with halls fronting it from the north and residence halls backing onto it from the south; a straight north-south walk with a lab and a dining hall either side.',
    sites: [
      { id: 'HALL-01', door: { wall: 'south', tile: T(63, 53) } },
      { id: 'HALL-02', door: { wall: 'south', tile: T(63, 62) } },
      { id: 'LIB-T1', door: { wall: 'south', tile: T(63, 71) } },
      { id: 'DORM-02', at: T(64, 49) },
      { id: 'DORM-03', at: T(64, 59) },
      { id: 'DORM-04', at: T(64, 69) },
      { id: 'LAB-BIOL', door: { wall: 'east', tile: T(71, 79) } },
      { id: 'DININGHALL-03', at: T(70, 80) },
    ],
    paths: [...run(63, 46, 63, 80), ...run(56, 79, 78, 79)],
  },
  {
    name: 'tee',
    what: 'A T: an east-west walk with a stem running south from its middle, a building in each corner.',
    sites: [
      { id: 'HALL-01', door: { wall: 'south', tile: T(60, 57) } },
      { id: 'HALL-02', door: { wall: 'south', tile: T(60, 69) } },
      { id: 'DININGHALL-03', door: { wall: 'east', tile: T(63, 63) } },
      { id: 'LAB-CHEM', at: T(62, 64) },
      { id: 'SCTR-T1', at: T(68, 57) },
      { id: 'HLTH-T1', at: T(68, 64) },
    ],
    paths: [...run(60, 50, 60, 76), ...run(61, 63, 76, 63)],
  },
  {
    name: 'cross',
    what: 'Two walks crossing, a building in each quadrant (two with a door on a walk, two with their backs to it), lamps at the crossing and benches along the arms.',
    sites: [
      { id: 'HALL-01', door: { wall: 'south', tile: T(63, 58) } },
      { id: 'HALL-02', door: { wall: 'south', tile: T(63, 68) } },
      { id: 'DININGHALL-04', door: { wall: 'east', tile: T(66, 63) } },
      { id: 'LAB-PHYS', at: T(64, 64) },
      { id: 'HLTH-T1', at: T(54, 66) },
    ],
    paths: [...run(63, 48, 63, 78), ...run(48, 63, 78, 63)],
    dressing: [
      { tile: T(62, 62), kind: 'lamp' }, { tile: T(62, 64), kind: 'lamp' },
      { tile: T(64, 70), kind: 'bench' }, { tile: T(70, 62), kind: 'bench' }, { tile: T(62, 52), kind: 'bench' },
    ],
  },
  {
    name: 'diagonal',
    what: 'A diagonal walk (a staircase of tiles, the only diagonal the grid can draw) running between buildings set square to the grid.',
    sites: [
      { id: 'HALL-01', at: T(49, 56) },
      { id: 'HALL-03', at: T(58, 48) },
      { id: 'DORM-02', at: T(56, 66) },
      { id: 'LAB-ECON', at: T(66, 58) },
      { id: 'DININGHALL-02', at: T(64, 69) },
      { id: 'HLTH-T1', at: T(72, 66) },
    ],
    paths: stair(50, 50, 26),
  },
  {
    name: 'curve',
    what: 'A curved walk, a quarter circle of radius thirteen in tiles, with buildings on the outside of the bend and a quad on the inside.',
    sites: [
      { id: 'QUAD-T1', at: T(68, 50) },
      { id: 'HALL-01', at: T(56, 50) },
      { id: 'HALL-02', at: T(58, 62) },
      { id: 'LIB-T1', at: T(66, 66) },
      { id: 'DORM-02', at: T(50, 42) },
    ],
    paths: arc(76, 50, 13),
  },
  {
    name: 'dead-end',
    what: 'Walks that stop: one in the middle of the lawn, one at a blank wall, one at a door, and a one-tile stub off a longer walk.',
    sites: [
      { id: 'HALL-01', at: T(52, 55) },
      { id: 'HALL-02', door: { wall: 'south', tile: T(70, 70) } },
      { id: 'LAB-HIST', at: T(66, 50) },
    ],
    paths: [...run(58, 44, 58, 52), ...run(48, 58, 51, 58), ...run(71, 70, 76, 70), ...run(74, 55, 74, 69), T(73, 60), ...run(62, 60, 62, 64)],
  },
  {
    name: 'loop',
    what: 'A ring walk round a Campus Quad, a building on each side: the north one fronts the quad, the west one turned to front it, the east and south ones with their backs to it.',
    sites: [
      { id: 'QUAD-T1', at: T(59, 59) },
      { id: 'HALL-01', door: { wall: 'south', tile: T(57, 63) } },
      { id: 'HALL-02', facing: 1, door: { wall: 'east', tile: T(63, 57) } },
      { id: 'HALL-03', facing: 1, at: T(60, 70) },
      { id: 'LIB-T1', at: T(70, 58) },
    ],
    paths: [...ring(57, 57, 69, 69), ...run(68, 45, 68, 56), ...run(69, 70, 78, 70)],
  },
  {
    name: 'crowded',
    what: 'A tight block: residence halls built flush in a terrace, labs flush in a row behind a one-tile lane, a paved plaza, a two-wide walk, and a hall built against the library.',
    sites: [
      { id: 'DORM-02', at: T(52, 50) },
      { id: 'DORM-03', at: T(52, 59) },
      { id: 'DORM-04', at: T(52, 68) },
      { id: 'LAB-BIOL', at: T(57, 50) },
      { id: 'LAB-CHEM', at: T(57, 55) },
      { id: 'LAB-PHYS', at: T(57, 60) },
      { id: 'LAB-MECH', at: T(57, 65) },
      { id: 'LAB-ELEC', at: T(57, 70) },
      { id: 'HALL-01', at: T(66, 50) },
      { id: 'LIB-T1', at: T(66, 57) },
      { id: 'DININGHALL-03', at: T(66, 68) },
      { id: 'SCTR-T1', at: T(71, 68) },
    ],
    paths: [...run(56, 48, 56, 78), ...run(60, 48, 60, 78), ...rect(62, 60, 3, 3), ...run(64, 48, 64, 78), ...run(65, 48, 65, 78), ...run(72, 50, 72, 64)],
  },
  {
    name: 'ground',
    what: 'Doors onto open ground: a hall whose front is built against the tennis courts, one against the pool, a residence hall against a quad, the chapel against the Japanese garden, a lab against the statue.',
    sites: [
      { id: 'TENNIS-COURTS', at: T(58, 48) },
      { id: 'HALL-01', at: T(53, 50) },
      { id: 'POOL', at: T(55, 64) },
      { id: 'HALL-02', at: T(53, 57) },
      { id: 'QUAD-T1', at: T(67, 48) },
      { id: 'DORM-02', at: T(63, 48) },
      { id: 'AMENITY-GARDEN', at: T(66, 66) },
      { id: 'AMENITY-CHAPEL', at: T(63, 66) },
      { id: 'AMENITY-STATUE', at: T(73, 59) },
      { id: 'LAB-HIST', at: T(70, 58) },
    ],
    paths: [...run(62, 45, 62, 80), ...run(51, 72, 78, 72)],
  },
  {
    name: 'trees',
    what: 'Trees where a player may leave them: on a door\'s tile, in a row along a wall, a wood in front of a hall\'s face, trees on paved tiles (hidden) and beside a tower.',
    sites: [
      { id: 'HALL-01', at: T(52, 50) },
      { id: 'HALL-02', at: T(52, 62) },
      { id: 'DORM-12', at: T(62, 52) },
      { id: 'LAB-BIOL', at: T(64, 64) },
      { id: 'DININGHALL-02', at: T(70, 64) },
    ],
    paths: [...run(58, 48, 58, 76), ...run(59, 60, 76, 60)],
    trees: [
      // On the south and east door tiles of HALL-01 (rows 52–56, cols 50–56).
      T(57, 53), T(54, 57),
      // A row along HALL-02's south wall, and a wood in front of its east face.
      ...run(57, 62, 57, 68), ...rect(52, 69, 5, 3),
      // Paved tiles (hidden while the path is there).
      T(58, 55), T(58, 70),
      // Round the tower.
      T(61, 51), T(61, 55), T(65, 59), T(69, 53),
      // Against the lab's back walls, and on the dining hall's east door tile.
      ...run(63, 64, 63, 68), T(71, 69),
    ],
  },
  {
    name: 'props',
    what: 'Lamps and benches where a player may put them: on a door\'s tile, along a walk, facing a walk, at a junction; the flag at Founders Hall with a tree and a lamp beside its spots; bike racks by the residences.',
    sites: [
      { id: 'BLDG-GENSTUDIES', at: T(54, 55) },
      { id: 'DORM-02', door: { wall: 'south', tile: T(66, 55) } },
      { id: 'DORM-03', at: T(62, 66) },
      { id: 'HALL-01', at: T(69, 50) },
    ],
    paths: [...run(66, 46, 66, 78), ...run(52, 63, 78, 63)],
    trees: [T(53, 55)],
    dressing: [
      { tile: T(59, 58), kind: 'lamp' },     // Founders Hall's south door tile
      { tile: T(59, 55), kind: 'lamp' },     // where the flag would stand
      { tile: T(56, 62), kind: 'bench' },    // its east door tile
      ...[48, 51, 54, 57, 60, 68, 71, 74].map((col) => ({ tile: T(67, col), kind: 'lamp' as DressingKind })),
      ...[50, 56, 70].map((col) => ({ tile: T(67, col), kind: 'bench' as DressingKind })),
      { tile: T(66, 63), kind: 'bench' },    // on the junction itself
      { tile: T(64, 63), kind: 'lamp' },     // on the walk
    ],
  },
  {
    name: 'chapel',
    what: 'The chapel (Plan 80I) with a walk round it reaching all four doors, and benches along two walks at each of the four facings: the facing a bench takes beside a walk, and two turned away from it.',
    sites: [{ id: 'AMENITY-CHAPEL', at: T(57, 58) }],
    paths: [...ring(56, 57, 60, 63), ...run(61, 60, 63, 60), ...run(64, 50, 64, 72), ...run(58, 64, 58, 74), ...run(59, 74, 70, 74)],
    dressing: [
      ...[53, 57].map((col) => ({ tile: T(63, col), kind: 'bench' as DressingKind })),   // facing south, onto the walk
      ...[55, 59].map((col) => ({ tile: T(65, col), kind: 'bench' as DressingKind })),   // facing north
      ...[66, 69].map((row) => ({ tile: T(row, 73), kind: 'bench' as DressingKind })),   // facing east
      ...[66, 69].map((row) => ({ tile: T(row, 75), kind: 'bench' as DressingKind })),   // facing west
      { tile: T(63, 66), kind: 'bench', facing: 'n' },                                      // turned: its back to the walk
      { tile: T(65, 67), kind: 'bench', facing: 'e' },                                      // turned along it
    ],
  },
  {
    name: 'chapel-turned',
    what: 'The chapel turned to run down the column (Plan 80I), its tower to the north, with a walk round it.',
    sites: [{ id: 'AMENITY-CHAPEL', at: T(59, 62), facing: 1 }],
    paths: [...ring(58, 61, 64, 65), ...run(65, 63, 70, 63)],
  },
  {
    name: 'big',
    what: 'The set pieces side by side: the stadium beside the field, the hospital against the clinic, a tower against a village, the Grand Quad closed in by halls on four sides.',
    sites: [
      { id: 'ATH-STADIUM', at: T(30, 40) },
      { id: 'ATH-FIELD', at: T(30, 64) },
      { id: 'HLTH-T3', at: T(51, 40) },
      { id: 'HLTH-T2', at: T(51, 51) },
      { id: 'DORM-12', at: T(63, 40) },
      { id: 'DORM-10', at: T(63, 47) },
      { id: 'QUAD-T2', at: T(58, 67) },
      { id: 'HALL-01', at: T(53, 70) },
      { id: 'HALL-02', facing: 1, at: T(62, 62) },
      { id: 'HALL-03', facing: 1, at: T(62, 80) },
      { id: 'LIB-T1', at: T(71, 70) },
    ],
    paths: [...run(50, 38, 50, 86), ...run(57, 60, 78, 60), ...run(78, 38, 78, 86)],
  },
  {
    // Plan 86 (the second review): the specialization buildings of Plan 85.
    name: 'specialized',
    what: 'The specialization buildings (Plan 85) in a row fronting one walk: the Faculty Training Institute, the Athletic Performance Complex and the Research Park.',
    sites: [
      { id: 'PROJ-TRAINING', at: T(51, 38) },
      { id: 'PROJ-ATHLETICS-COMPLEX', at: T(49, 52) },
      { id: 'PROJ-RESEARCH-PARK', at: T(50, 68) },
    ],
    paths: [...run(58, 36, 58, 82), ...run(59, 58, 66, 58)],
  },
];

// Where a wall's door opens, for a placement: the tile outside the middle of
// that wall (the right-hand one of two on an even wall), as walkRoutes.ts's
// entrancesOf has it.
export function doorTile(p: { row: number; col: number; w: number; h: number }, wall: Wall): TileCoord {
  const midC = p.col + Math.floor(p.w / 2);
  const midR = p.row + Math.floor(p.h / 2);
  switch (wall) {
    case 'south': return T(p.row + p.h, midC);
    case 'north': return T(p.row - 1, midC);
    case 'east': return T(midR, p.col + p.w);
    case 'west': return T(midR, p.col - 1);
  }
}

function anchorFor(t: Buildable, site: Site): TileCoord {
  const fp = orientedFootprint(t, site.facing ?? 0);
  if (site.at) return site.at;
  if (!site.door) throw new Error(`${site.id}: neither at nor door`);
  const { wall, tile } = site.door;
  const probe = { row: 0, col: 0, w: fp.w, h: fp.h };
  const d = doorTile(probe, wall);
  return T(tile.row - d.row, tile.col - d.col);
}

export function applyArrangement(base: GameState, a: Arrangement, vernacular: Vernacular): { state: GameState; problems: string[] } {
  const s: GameState = structuredClone(base);
  const problems: string[] = [];
  const placements: Placements = {};
  const byId = new Map(s.tech.map((t) => [t.id, t]));
  for (const site of a.sites) {
    const t = byId.get(site.id);
    if (!t) { problems.push(`${site.id}: not in the base save`); continue; }
    const fp = orientedFootprint(t, site.facing ?? 0);
    const at = anchorFor(t, site);
    if (!footprintIsClear(placements, at.row, at.col, fp) || !isLand(at.row, at.col) || !isLand(at.row + fp.h - 1, at.col + fp.w - 1)) {
      problems.push(`${site.id} at ${at.row},${at.col} (${fp.w}x${fp.h}) overlaps or is off the land`);
      continue;
    }
    placements[site.id] = placementFor(at.row, at.col, fp, site.facing ?? 0);
    t.status = 'done';
    delete s.developing[t.id];
  }
  const built = new Set<string>();
  for (const p of Object.values(placements)) for (const tile of placementTiles(p)) built.add(pathTileKey(tile));
  const pathways: Record<string, true> = {};
  for (const tile of a.paths) {
    const key = pathTileKey(tile);
    if (built.has(key)) problems.push(`path tile ${key} is under a building`);
    else if (isLand(tile.row, tile.col)) pathways[key] = true;
  }
  const trees: Record<string, number> = {};
  let seed = 7;
  for (const tile of a.trees ?? []) {
    const key = pathTileKey(tile);
    if (built.has(key)) { problems.push(`tree ${key} is under a building`); continue; }
    seed = (seed * 1103515245 + 12345) % 2 ** 31;
    trees[key] = seed % (1 << 20);
  }
  const dressing: Dressing = {};
  for (const d of a.dressing ?? []) {
    const key = pathTileKey(d.tile);
    if (built.has(key)) { problems.push(`${d.kind} ${key} is under a building`); continue; }
    dressing[key] = d.kind === 'lamp' ? 'lamp' : benchItem(d.facing ?? defaultBenchFacing(pathways, d.tile.row, d.tile.col));
  }
  s.placements = placements;
  s.pathways = pathways;
  s.trees = trees;
  s.dressing = dressing;
  s.self.vernacular = vernacular;
  s.pendingInterrupt = null;
  s.events.pendingDemand = null;
  s.events.activeDemand = null;
  if (s.finance.distress) s.finance.distress.letters = [];
  s.ladder.unread = [];
  // No inline event card over the picture.
  if (s.catalogue) s.catalogue.pending = [];
  return { state: s, problems };
}

// A tile map of an arrangement: a letter per building, # a path, T a tree,
// L a lamp, B a bench.
export function ascii(s: GameState): string {
  const ids = Object.keys(s.placements);
  const rows: number[] = []; const cols: number[] = [];
  for (const p of Object.values(s.placements)) { rows.push(p.row, p.row + p.h - 1); cols.push(p.col, p.col + p.w - 1); }
  for (const key of [...Object.keys(s.pathways), ...Object.keys(s.trees)]) { const [r, c] = key.split(',').map(Number); rows.push(r); cols.push(c); }
  const r0 = Math.min(...rows) - 1, r1 = Math.max(...rows) + 1, c0 = Math.min(...cols) - 1, c1 = Math.max(...cols) + 1;
  const grid = Array.from({ length: r1 - r0 + 1 }, () => Array.from({ length: c1 - c0 + 1 }, () => '.'));
  const put = (r: number, c: number, ch: string) => { if (r >= r0 && r <= r1 && c >= c0 && c <= c1) grid[r - r0][c - c0] = ch; };
  for (const key of Object.keys(s.pathways)) { const [r, c] = key.split(',').map(Number); put(r, c, '#'); }
  for (const key of Object.keys(s.trees)) { const [r, c] = key.split(',').map(Number); put(r, c, key in s.pathways ? '%' : 'T'); }
  for (const [key, kind] of Object.entries(s.dressing ?? {})) { const [r, c] = key.split(',').map(Number); put(r, c, kind === 'lamp' ? 'L' : 'B'); }
  const letters = 'ABCDEFGHIJKMNOPQRSUVWXYZ';
  const legend: string[] = [];
  ids.forEach((id, i) => {
    legend.push(`${letters[i]}=${id}`);
    for (const t of placementTiles(s.placements[id])) put(t.row, t.col, letters[i]);
  });
  return [...grid.map((line, i) => `${String(r0 + i).padStart(3)} ${line.join('')}`), `    cols ${c0}..${c1}; ${legend.join(' ')}`].join('\n');
}

// ---- The command line ----
if (process.argv[1]?.includes('arrangements')) {
  const argv = process.argv.slice(2);
  const arg = (flag: string) => { const i = argv.indexOf(flag); return i >= 0 ? argv[i + 1] : undefined; };
  if (argv.includes('--list')) {
    for (const a of ARRANGEMENTS) console.log(`${a.name.padEnd(10)} ${a.what}`);
    process.exit(0);
  }
  const basePath = arg('--base') ?? 'node_modules/.tmp/all.json';
  const out = arg('--out') ?? 'node_modules/.tmp/arrangements';
  const only = arg('--only')?.split(',');
  const verns = (arg('--vernacular')?.split(',') ?? VERNACULARS) as Vernacular[];
  const payload = JSON.parse(readFileSync(basePath, 'utf8')) as { version: number; savedAt: number; state: GameState };
  mkdirSync(out, { recursive: true });
  let failed = false;
  for (const a of ARRANGEMENTS.filter((x) => !only || only.includes(x.name))) {
    for (const v of verns) {
      const { state, problems } = applyArrangement(payload.state, a, v);
      if (problems.length > 0) { failed = true; console.error(`${a.name}: ${problems.join('; ')}`); }
      writeFileSync(join(out, `${a.name}-${v}.json`), JSON.stringify({ ...payload, state }));
    }
    console.log(`${a.name}: ${a.sites.length} buildings, ${a.paths.length} path tiles, ${a.trees?.length ?? 0} trees, ${a.dressing?.length ?? 0} props × ${verns.length} vernaculars`);
    if (argv.includes('--ascii')) console.log(ascii(applyArrangement(payload.state, a, verns[0]).state));
  }
  if (failed) process.exit(1);
}
