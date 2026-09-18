// ---------------------------------------------------------------------
// LAY A CAMPUS OUT LIKE A CAMPUS. Takes a save written by tools/scenario.ts,
// re-sites every placed Buildable onto a hand-designed plan, draws the
// walkways between them, regrows the woodland around the result, and
// writes the save back out — a campus to photograph.
//
// Why this exists: the scripted player in sim/balanceSim.ts sites every
// building at campusMap.ts's firstFreeSpot, a plain top-left scan, so a
// scenario's campus is a strip along one edge of the grid. That is fine
// for measuring a trajectory and useless for a picture. Placement is
// visual-only by design (see campusMap.ts) — no system reads a location —
// so moving the buildings after the fact changes nothing the simulation
// ever computed; the school in the file is still the one the run produced.
//
//   npm run scenario -- --strategy Completionist --year 30 --clear-modal \
//     --name "Blackmoor University" /tmp/in.json
//   npm run layout -- /tmp/in.json /tmp/out.json [--ascii]
//   npm run shot -- /tmp/out.json /tmp/campus.png --zoom=-2
//
// The plan below is a PRECINCT plan, the way a real campus is read: an
// academic core round the Grand Quad, a research court to its west, the
// union to its east with the residential quad beyond, a medical campus to
// the south, and the venues along the north edge.
//
// THE RULES, checked rather than trusted:
//   - every placement lands on clear tiles (campusMap.ts's own
//     footprintIsClear, so this is a layout the game could have made);
//   - every door the camera can see stands on a path, with nothing built
//     in front of it. The motifs draw a door in the middle of the south
//     face and of the east face, the two faces the projection shows, and
//     both must be clear and paved. Open ground and a village have no
//     single door, and count as served by any path touching their edge;
//   - walks are one tile wide, and every path tile is reachable from every
//     other. Buildings may touch.
// The hand-drawn walks below give the plan its structure; a doorstep pass
// then adds the shortest run from any unserved door to the nearest path,
// and a final pass joins any islands, so the rules hold whatever the
// scenario happened to build.
//
// Not part of the game: nothing in src/ imports it.
// ---------------------------------------------------------------------
import { readFileSync, writeFileSync } from 'node:fs';
import type { Buildable, GameState, Placement, Placements, TileCoord } from '../src/state/types';
import { CAMPUS_GRID_HEIGHT, CAMPUS_GRID_WIDTH } from '../src/state/types';
import {
  footprintIsClear, footprintOf, orientedFootprint, pathTileKey, placementFor, placementTiles,
} from '../src/state/campusMap';
import { seedTrees } from '../src/data/treeData';
import { doorFamilyOf } from '../src/components/buildingSpec';

interface Site { id: string; row: number; col: number; rotated?: boolean }

// ---------------------------------------------------------------------
// THE PLAN. Anchors are top-left tiles; `rotated` swaps the footprint's
// w and h exactly as the map's R key does. Screen-up is the (-row, -col)
// diagonal; the camera sees a building's south (row + h) and east (col + w)
// faces, so the halls that should be seen fronting a green stand to its
// north and west. Nothing with a door is rotated onto an even side: a door
// centred on an even face sits on the seam between two tiles.
// ---------------------------------------------------------------------
const PLAN: Site[] = [
  // --- The academic core: the Grand Quad and the halls around it. The
  // academic halls are the chain in techData.ts (HALL-01 .. HALL-12), placed
  // in build order round the quad, then down the west and south walks. ---
  { id: 'QUAD-T2', row: 57, col: 57 },                     // 13x13, the heart of the place
  { id: 'BLDG-GENSTUDIES', row: 50, col: 60 },             // Founders Hall, at the head of the quad
  { id: 'HALL-01', row: 50, col: 51 },
  { id: 'HALL-02', row: 50, col: 70 },
  { id: 'HALL-03', row: 56, col: 50, rotated: true },      // west side, fronting the quad
  { id: 'HALL-04', row: 64, col: 50, rotated: true },
  { id: 'LIB-T2', row: 71, col: 59 },                      // the research library closes the south side
  { id: 'HALL-05', row: 72, col: 47 },                     // on the west walk
  { id: 'HALL-06', row: 72, col: 70 },
  { id: 'SCTR-T2', row: 57, col: 72 },                     // the union, on the east side
  { id: 'SCTR-T1', row: 63, col: 72 },
  { id: 'HLTH-T1', row: 68, col: 74 },
  // Behind the north row: the arts, the first dining hall, and the concert
  // hall closing the axis behind Founders Hall.
  { id: 'ARTS-PAC', row: 38, col: 60 },
  { id: 'LAB-ECON', row: 45, col: 47 },
  { id: 'LAB-HIST', row: 45, col: 54 },
  { id: 'DINING-01', row: 45, col: 61 },
  { id: 'ART-GALLERY', row: 45, col: 66 },
  { id: 'LAB-FILM', row: 45, col: 72 },

  // --- West: each hall's labs behind it on a small grid of lanes, the
  // founding dorm and the early dining hall on the north walk, and a
  // residential corner past the labs. ---
  { id: 'LAB-BIOL', row: 56, col: 44 },
  { id: 'LAB-CHMY', row: 60, col: 44 },
  { id: 'LAB-MECH', row: 64, col: 44 },
  { id: 'LAB-ELEC', row: 68, col: 44 },
  { id: 'LAB-PHYS', row: 56, col: 37 },
  { id: 'LAB-CIVE', row: 60, col: 37 },
  { id: 'LAB-AERO', row: 64, col: 37 },
  { id: 'LAB-CHEM', row: 68, col: 37 },
  { id: 'DORM-01', row: 50, col: 43 },
  { id: 'DININGHALL-02', row: 50, col: 37 },
  { id: 'DORM-02', row: 74, col: 30 },
  { id: 'DININGHALL-06', row: 80, col: 30 },
  { id: 'DININGHALL-03', row: 80, col: 41 },
  { id: 'HALL-07', row: 81, col: 49 },
  { id: 'DORM-04', row: 87, col: 31 },
  { id: 'DORM-05', row: 87, col: 41 },
  { id: 'LAB-COMP', row: 87, col: 51 },
  // The last three halls of the chain and the second quad: a south-west
  // court off the west walk, below the residential corner.
  { id: 'HALL-10', row: 93, col: 47 },
  { id: 'HALL-11', row: 100, col: 47 },
  { id: 'HALL-12', row: 93, col: 38 },
  { id: 'QUAD-S2', row: 100, col: 30 },

  // --- South: the old library and the medical campus, with a tower and a
  // market hall at its foot. ---
  { id: 'LIB-T1', row: 81, col: 58 },
  { id: 'HALL-08', row: 81, col: 71 },
  { id: 'HLTH-T3', row: 89, col: 59 },                     // the hospital, 11x11
  { id: 'HALL-09', row: 89, col: 71 },
  { id: 'LAB-NEUR', row: 95, col: 71 },
  { id: 'DININGHALL-07', row: 101, col: 59 },
  { id: 'DORM-12', row: 101, col: 71 },

  // --- East: the athletics complex and natatorium by the venues; the
  // grocery, clinic, gym and rec centre on the lanes behind the union; the
  // Campus Quad with a dining hall on it; villages and a court of towers. ---
  { id: 'REC-T2', row: 39, col: 82 },
  { id: 'ATH-NATATORIUM', row: 39, col: 90 },
  { id: 'TENNIS-COURTS', row: 39, col: 99 },
  { id: 'GROCERY-01', row: 45, col: 82 },
  { id: 'HLTH-T2', row: 45, col: 88 },
  { id: 'GYM', row: 45, col: 94 },
  { id: 'REC-T1', row: 45, col: 100 },
  { id: 'QUAD-T1', row: 60, col: 88 },
  { id: 'DORM-06', row: 59, col: 82, rotated: true },
  { id: 'DORM-08', row: 54, col: 88 },
  { id: 'DORM-07', row: 54, col: 105, rotated: true },
  { id: 'DININGHALL-05', row: 62, col: 98 },
  { id: 'DORM-09', row: 70, col: 88 },
  { id: 'DORM-10', row: 70, col: 100 },
  { id: 'DININGHALL-04', row: 81, col: 82 },
  { id: 'DORM-03', row: 81, col: 90 },
  { id: 'POOL', row: 81, col: 100 },
  { id: 'DORM-13', row: 88, col: 82 },
  { id: 'DORM-14', row: 88, col: 90 },
  { id: 'DORM-15', row: 88, col: 98 },
  { id: 'DININGHALL-08', row: 96, col: 82 },
  { id: 'DORM-11', row: 96, col: 94 },

  // --- North campus: the venues. ---
  { id: 'ATH-STADIUM', row: 28, col: 23 },
  { id: 'ATH-FIELD', row: 24, col: 49 },
  { id: 'ATH-ARENA', row: 36, col: 47 },
  { id: 'ATH-DIAMOND', row: 24, col: 70 },
];

// Where anything the plan does not name goes — a chapter house granted by
// an event carries an id minted at fire time (see eventData.ts's
// chapterHouseId), so no plan can list it. Greek Row: north of the
// residence halls, scanned row by row for the first clear spot.
// How much of the open ground inside the campus gets a tree (see the
// planting pass at the end). Sparse: a lawn with trees on it, not a wood.
const INTERIOR_TREE_DENSITY = 0.07;

const OVERFLOW = { row: 84, col: 108, h: 24, w: 10 };

// ---------------------------------------------------------------------
// THE WALKS. Straight runs between two tiles, inclusive; one tile wide.
// ---------------------------------------------------------------------
function run(r0: number, c0: number, r1: number, c1: number): TileCoord[] {
  const tiles: TileCoord[] = [];
  const dr = Math.sign(r1 - r0);
  const dc = Math.sign(c1 - c0);
  if (dr !== 0 && dc !== 0) throw new Error(`run is not straight: ${r0},${c0} -> ${r1},${c1}`);
  const n = Math.max(Math.abs(r1 - r0), Math.abs(c1 - c0));
  for (let i = 0; i <= n; i++) tiles.push({ row: r0 + dr * i, col: c0 + dc * i });
  return tiles;
}
function ring(r0: number, c0: number, r1: number, c1: number): TileCoord[] {
  return [...run(r0, c0, r0, c1), ...run(r1, c0, r1, c1), ...run(r0, c0, r1, c0), ...run(r0, c1, r1, c1)];
}

const WALKS: TileCoord[] = [
  // The Grand Quad's ring; the north walk along the halls' fronts; the back
  // lane behind them, with connectors through the gaps.
  ...ring(56, 56, 70, 70),
  ...run(55, 36, 55, 80),
  ...run(48, 36, 48, 80),
  ...run(49, 50, 54, 50), ...run(49, 59, 54, 59), ...run(49, 68, 54, 68), ...run(46, 77, 55, 77),
  // The west walk, the south walk, the east walk.
  ...run(56, 56, 108, 56),
  ...run(79, 29, 79, 80),
  ...run(38, 80, 108, 80),
  // West: the science court's grid of lanes, and the residential corner.
  ...run(48, 36, 71, 36), ...run(48, 42, 71, 42), ...run(55, 49, 79, 49),
  ...run(59, 36, 59, 49), ...run(63, 36, 63, 55), ...run(67, 36, 67, 49), ...run(71, 36, 71, 55),
  ...run(71, 39, 86, 39), ...run(79, 29, 91, 29), ...run(86, 29, 86, 56), ...run(91, 29, 91, 56),
  ...run(79, 46, 86, 46), ...run(86, 40, 91, 40), ...run(86, 50, 91, 50),
  // The union's lanes, and the lane between the two libraries' successors.
  ...run(62, 71, 62, 80), ...run(62, 77, 79, 77), ...run(67, 71, 67, 77), ...run(71, 71, 71, 77),
  ...run(71, 68, 79, 68),
  // South: the medical spine and its cross lanes.
  ...run(80, 70, 108, 70), ...run(88, 57, 88, 79), ...run(100, 57, 100, 80), ...run(108, 57, 108, 80),
  ...run(80, 67, 88, 67), ...run(88, 78, 94, 78), ...run(94, 71, 94, 80), ...run(94, 76, 100, 76),
  ...run(100, 78, 108, 78),
  // East: the Campus Quad's ring, and the lanes that tie the blocks into
  // loops off the east walk.
  ...ring(59, 87, 69, 97),
  ...run(44, 81, 44, 111), ...run(50, 81, 50, 111),
  ...run(44, 87, 59, 87), ...run(44, 93, 50, 93), ...run(44, 99, 50, 99), ...run(44, 105, 50, 105),
  ...run(38, 89, 44, 89), ...run(38, 97, 44, 97),
  ...run(50, 99, 59, 99), ...run(59, 97, 59, 99),
  ...run(65, 105, 65, 111), ...run(68, 98, 68, 111),
  ...run(69, 87, 80, 87), ...run(70, 81, 70, 87), ...run(69, 98, 69, 99), ...run(69, 99, 80, 99),
  ...run(75, 87, 75, 99),
  ...run(80, 81, 80, 111), ...run(85, 89, 85, 111), ...run(87, 81, 87, 111), ...run(95, 81, 95, 111),
  ...run(106, 81, 106, 111),
  ...run(80, 89, 95, 89), ...run(80, 99, 87, 99), ...run(80, 107, 87, 107),
  ...run(87, 97, 95, 97), ...run(87, 105, 95, 105), ...run(95, 93, 106, 93),
  ...run(38, 111, 106, 111),
  // North campus: between the venues, tied back to the back lane.
  ...run(35, 49, 35, 69), ...run(35, 59, 48, 59), ...run(35, 69, 48, 69),
  ...run(38, 70, 38, 111),
];

// ---------------------------------------------------------------------
// Apply it.
// ---------------------------------------------------------------------
// Slides the whole plan so its SCREEN extent (see the report at the end) is
// centred on the grid, which is where the map opens centred: the plan was
// drawn with Founders Hall at the grid's centre, but the campus that grew
// round it leans east and south of there.
const OFFSET = { row: -1, col: -7 };
for (const site_ of PLAN) { site_.row += OFFSET.row; site_.col += OFFSET.col; }
for (const t of WALKS) { t.row += OFFSET.row; t.col += OFFSET.col; }

const [inPath, outPath, ...flags] = process.argv.slice(2);
if (!inPath || !outPath) {
  console.error('usage: layout <in.json> <out.json> [--ascii]');
  process.exit(2);
}
const payload = JSON.parse(readFileSync(inPath, 'utf8')) as { version: number; savedAt: number; state: GameState };
const s = payload.state;
const byId = new Map<string, Buildable>(s.tech.map((t) => [t.id, t]));
const wasPlaced = new Set(Object.keys(s.placements));

const placements: Placements = {};
const problems: string[] = [];

function site(id: string, row: number, col: number, rotated: boolean): void {
  const node = byId.get(id);
  if (!node) { problems.push(`${id}: not in this save's catalogue`); return; }
  const fp = orientedFootprint(node, rotated);
  if (!footprintIsClear(placements, row, col, fp)) {
    const hit = Object.entries(placements).find(([, p]) =>
      placementTiles(placementFor(row, col, fp)).some((t) => covers(p, t)));
    problems.push(`${id} at ${row},${col} (${fp.w}x${fp.h}) ${hit ? `overlaps ${hit[0]}` : 'is off the grid'}`);
    return;
  }
  placements[id] = placementFor(row, col, fp);
}
function covers(p: Placement, t: TileCoord): boolean {
  return t.row >= p.row && t.row < p.row + p.h && t.col >= p.col && t.col < p.col + p.w;
}

for (const site_ of PLAN) {
  if (!wasPlaced.has(site_.id)) continue; // not built in this run; nothing to site
  site(site_.id, site_.row, site_.col, site_.rotated ?? false);
}
// Anything the run built that the plan never named.
const planned = new Set(PLAN.map((p) => p.id));
for (const id of wasPlaced) {
  if (planned.has(id)) continue;
  const node = byId.get(id)!;
  const fp = footprintOf(node);
  let found = false;
  for (let r = OVERFLOW.row; r + fp.h <= OVERFLOW.row + OVERFLOW.h && !found; r++) {
    for (let c = OVERFLOW.col; c + fp.w <= OVERFLOW.col + OVERFLOW.w; c++) {
      if (footprintIsClear(placements, r, c, fp)) { placements[id] = placementFor(r, c, fp); found = true; break; }
    }
  }
  if (!found) problems.push(`${id} (${node.name}): unplanned and no room in the overflow block`);
  else console.log(`unplanned ${id} (${node.name}) sited in the overflow block at ${placements[id].row},${placements[id].col}`);
}
if (problems.length) {
  console.error('the plan does not fit:\n  ' + problems.join('\n  '));
  process.exit(1);
}

// ---------------------------------------------------------------------
// The walks, then the doorsteps, then the joins.
// ---------------------------------------------------------------------
const occupied = new Set<string>();
for (const p of Object.values(placements)) for (const t of placementTiles(p)) occupied.add(pathTileKey(t));
const inBounds = (t: TileCoord) => t.row >= 0 && t.col >= 0 && t.row < CAMPUS_GRID_HEIGHT && t.col < CAMPUS_GRID_WIDTH;
const free = (t: TileCoord) => inBounds(t) && !occupied.has(pathTileKey(t));

const pathways: Record<string, true> = {};
const isPath = (t: TileCoord) => pathways[pathTileKey(t)] === true;
for (const t of WALKS) if (free(t)) pathways[pathTileKey(t)] = true;

const N4 = [[-1, 0], [1, 0], [0, -1], [0, 1]] as const;
const step = (t: TileCoord, [dr, dc]: readonly [number, number]) => ({ row: t.row + dr, col: t.col + dc });

// The doors the camera can see: the middle of the south face and of the
// east face. Open ground and a village have no single door; for those the
// answer is empty, and any path touching the edge serves (see edgeTiles).
function visibleDoors(node: Buildable, p: Placement): TileCoord[] {
  if (doorFamilyOf(node) === null) return [];
  return [
    { row: p.row + p.h, col: p.col + Math.floor(p.w / 2) },
    { row: p.row + Math.floor(p.h / 2), col: p.col + p.w },
  ];
}
function edgeTiles(p: Placement): TileCoord[] {
  const edge: TileCoord[] = [];
  for (let c = p.col; c < p.col + p.w; c++) edge.push({ row: p.row + p.h, col: c }, { row: p.row - 1, col: c });
  for (let r = p.row; r < p.row + p.h; r++) edge.push({ row: r, col: p.col + p.w }, { row: r, col: p.col - 1 });
  return edge;
}

// Breadth-first over free tiles from `from` (in priority order) until a
// tile satisfying `goal` is reached; returns the route including both
// ends, or null. What draws a doorstep and what joins two islands.
function route(from: TileCoord[], goal: (t: TileCoord) => boolean): TileCoord[] | null {
  const prev = new Map<string, string | null>();
  const queue: TileCoord[] = [];
  for (const t of from) {
    if (!free(t) || prev.has(pathTileKey(t))) continue;
    prev.set(pathTileKey(t), null);
    queue.push(t);
  }
  while (queue.length) {
    const t = queue.shift()!;
    if (goal(t)) {
      const out: TileCoord[] = [];
      for (let k: string | null = pathTileKey(t); k; k = prev.get(k) ?? null) {
        const [r, c] = k.split(',').map(Number);
        out.push({ row: r, col: c });
      }
      return out;
    }
    for (const d of N4) {
      const n = step(t, d);
      if (!free(n) || prev.has(pathTileKey(n))) continue;
      prev.set(pathTileKey(n), pathTileKey(t));
      queue.push(n);
    }
  }
  return null;
}

// Dead ends: a walk should end at a door or a junction, never in the grass.
// Leaves (one path neighbour) are pruned repeatedly, keeping any tile a
// visible door opens onto; open ground has no door to keep a stub for, and
// gets a doorstep below only if the pruning left it unserved.
const keep = new Set<string>();
for (const [id, p] of Object.entries(placements)) {
  for (const t of visibleDoors(byId.get(id)!, p)) keep.add(pathTileKey(t));
}
const neighbours = (t: TileCoord) => N4.filter((d) => isPath(step(t, d))).length;
let pruned = 0;
for (let changed = true; changed;) {
  changed = false;
  for (const key of Object.keys(pathways)) {
    if (keep.has(key)) continue;
    const [r, c] = key.split(',').map(Number);
    if (neighbours({ row: r, col: c }) <= 1) { delete pathways[key]; pruned += 1; changed = true; }
  }
}

const doorsteps: string[] = [];
for (const [id, p] of Object.entries(placements)) {
  const node = byId.get(id)!;
  const doors = visibleDoors(node, p);
  if (doors.length === 0) {
    // Open ground: any path along the edge will do.
    const edge = edgeTiles(p).filter(free);
    if (edge.some(isPath)) continue;
    const r = route(edge, isPath);
    if (!r) { problems.push(`${id}: no edge can reach a path`); continue; }
    for (const t of r) pathways[pathTileKey(t)] = true;
    doorsteps.push(`${id} +${r.length - 1}`);
    continue;
  }
  // A doored building: BOTH visible doors, each clear of other buildings
  // and each on a path — a drawn door with grass or a wall in front of it
  // is exactly what this rule exists to prevent.
  for (const [i, door] of doors.entries()) {
    const face = i === 0 ? 'south' : 'east';
    if (!inBounds(door)) { problems.push(`${id}: ${face} door is off the grid`); continue; }
    if (occupied.has(pathTileKey(door))) {
      const blocker = Object.entries(placements).find(([, q]) => covers(q, door))![0];
      problems.push(`${id}: ${face} door is blocked by ${blocker}`);
      continue;
    }
    if (isPath(door)) continue;
    const r = route([door], isPath);
    if (!r) { problems.push(`${id}: ${face} door cannot reach a path`); continue; }
    for (const t of r) pathways[pathTileKey(t)] = true;
    doorsteps.push(`${id}:${face[0]} +${r.length - 1}`);
  }
}

// Islands: flood from one tile; anything unreached gets joined to the
// reached set by the shortest free route, and the flood runs again.
function components(): TileCoord[][] {
  const seen = new Set<string>();
  const out: TileCoord[][] = [];
  for (const key of Object.keys(pathways)) {
    if (seen.has(key)) continue;
    const [r, c] = key.split(',').map(Number);
    const comp: TileCoord[] = [];
    const queue = [{ row: r, col: c }];
    seen.add(key);
    while (queue.length) {
      const t = queue.shift()!;
      comp.push(t);
      for (const d of N4) {
        const n = step(t, d);
        const k = pathTileKey(n);
        if (isPath(n) && !seen.has(k)) { seen.add(k); queue.push(n); }
      }
    }
    out.push(comp);
  }
  return out.sort((a, b) => b.length - a.length);
}
const joins: number[] = [];
for (let comps = components(); comps.length > 1; comps = components()) {
  const main = new Set(comps[0].map(pathTileKey));
  const island = comps[1];
  const r = route(
    island.flatMap((t) => N4.map((d) => step(t, d))).filter((t) => free(t) && !isPath(t)),
    (t) => N4.some((d) => main.has(pathTileKey(step(t, d)))),
  );
  if (!r) { problems.push(`an island of ${island.length} path tiles at ${island[0].row},${island[0].col} cannot be joined`); break; }
  for (const t of r) pathways[pathTileKey(t)] = true;
  joins.push(r.length);
}
if (problems.length) {
  console.error('the walks do not work:\n  ' + problems.join('\n  '));
  process.exit(1);
}

s.placements = placements;
s.pathways = pathways;
// The woodland the campus was founded on, regrown around the new layout:
// the trees the sim felled were under buildings that are no longer there.
s.trees = seedTrees(placements);
// The founding woodland keeps its groves out of the middle, which leaves a
// built-out campus bare between its walks. Real grounds are planted: a
// light scatter over the open tiles inside the campus, kept a tile clear
// of every building so no facade is stood in front of, and off the paths
// (a tree under paving is hidden at render time anyway).
{
  const rows: number[] = [], cols: number[] = [];
  for (const p of Object.values(placements)) { rows.push(p.row, p.row + p.h - 1); cols.push(p.col, p.col + p.w - 1); }
  const [r0, r1, c0, c1] = [Math.min(...rows), Math.max(...rows), Math.min(...cols), Math.max(...cols)];
  const nearBuilding = (t: TileCoord) => N4.some((d) => occupied.has(pathTileKey(step(t, d))));
  let planted = 0;
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      const t = { row: r, col: c };
      const key = pathTileKey(t);
      if (!free(t) || isPath(t) || nearBuilding(t) || key in s.trees) continue;
      if (Math.random() < INTERIOR_TREE_DENSITY) { s.trees[key] = Math.floor(Math.random() * (1 << 20)); planted += 1; }
    }
  }
  console.log(`planted ${planted} trees inside the campus`);
}

// ---------------------------------------------------------------------
// Report.
// ---------------------------------------------------------------------
if (flags.includes('--ascii')) {
  const rows: number[] = [], cols: number[] = [];
  for (const p of Object.values(placements)) { rows.push(p.row, p.row + p.h - 1); cols.push(p.col, p.col + p.w - 1); }
  const r0 = Math.min(...rows) - 2, r1 = Math.max(...rows) + 2, c0 = Math.min(...cols) - 2, c1 = Math.max(...cols) + 2;
  const grid: string[][] = [];
  for (let r = r0; r <= r1; r++) grid.push(Array.from({ length: c1 - c0 + 1 }, () => '.'));
  for (const key of Object.keys(pathways)) { const [r, c] = key.split(',').map(Number); if (r >= r0 && r <= r1 && c >= c0 && c <= c1) grid[r - r0][c - c0] = '#'; }
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const legend: string[] = [];
  Object.entries(placements).forEach(([id, p], i) => {
    const ch = letters[i % letters.length];
    legend.push(`${ch}=${id}`);
    for (const t of placementTiles(p)) grid[t.row - r0][t.col - c0] = ch;
  });
  console.log('     ' + Array.from({ length: c1 - c0 + 1 }, (_, i) => ((c0 + i) % 10 === 0 ? String((c0 + i) / 10 % 10) : ' ')).join(''));
  grid.forEach((line, i) => console.log(String(r0 + i).padStart(4) + ' ' + line.join('')));
  console.log(legend.join('  '));
}
// Screen extents: x follows col - row, y follows col + row (isoProjection.ts).
let dMin = Infinity, dMax = -Infinity, sMin = Infinity, sMax = -Infinity;
for (const p of Object.values(placements)) {
  for (const [r, c] of [[p.row, p.col], [p.row, p.col + p.w], [p.row + p.h, p.col], [p.row + p.h, p.col + p.w]]) {
    dMin = Math.min(dMin, c - r); dMax = Math.max(dMax, c - r); sMin = Math.min(sMin, c + r); sMax = Math.max(sMax, c + r);
  }
}
console.log(`screen extent: col-row ${dMin}..${dMax} (${dMax - dMin} half-tiles wide), col+row ${sMin}..${sMax} (${sMax - sMin} half-tiles tall), centre ${((dMin + dMax) / 2).toFixed(1)}, ${((sMin + sMax) / 2).toFixed(1)}`);
if (pruned) console.log(`dead ends pruned: ${pruned} tiles`);
const leaves = Object.keys(pathways).filter((key) => { const [r, c] = key.split(',').map(Number); return neighbours({ row: r, col: c }) <= 1; });
console.log(`dead ends left: ${leaves.length}${leaves.length ? ` (${leaves.join(' ')})` : ''} — each a doorstep`);
if (doorsteps.length) console.log(`doorsteps drawn: ${doorsteps.join(', ')}`);
if (joins.length) console.log(`islands joined: ${joins.length} (${joins.join(', ')} tiles)`);
writeFileSync(outPath, JSON.stringify(payload));
console.log(`${outPath}: ${Object.keys(placements).length} buildings sited, ${Object.keys(pathways).length} path tiles, ${Object.keys(s.trees).length} trees`);
