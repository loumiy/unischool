import type { GameState, Placement, TileCoord } from './types';
import { CAMPUS_GRID_WIDTH } from './types';
import { ROAD_FIRST_ROW, isLand, pathTileKey, placementTiles } from './campusMap';
import { FOUNDERS_HALL_ID } from '../data/techData';
import { entrancesOf, walkGrid } from '../components/walkRoutes';
import { sidesOf } from '../components/facing';

// The founding drive (Plan 115B, the third review's C1-1): a path from
// Founders Hall's front door to the road, laid when the hall is first
// sited, so the young campus has a way in from the first week. Laid inside
// the action that sites the hall (placeBuildable.ts for a guided founding,
// actions.ts's foundState for a headless one), so the action log replays
// it. Nothing lays it again: siting the hall a second time, or loading an
// older save, leaves the paths as they are.
//
// A four-way search over open land, from the tile in front of the middle of
// the hall's front wall to the last row of land above the road. With
// nothing else standing it runs straight down, unless the hall faces away
// from the road, when it goes round. Paved the way the path tool paves.
// This lives in state/ because it reads the map, which systems/ may not.

const W = CAMPUS_GRID_WIDTH;
const LAST_LAND_ROW = ROAD_FIRST_ROW - 1;

// The drive's tiles, door first, or [] when the hall is unsited or walled in.
export function driveRoute(s: GameState): TileCoord[] {
  const p = s.placements[FOUNDERS_HALL_ID];
  if (!p) return [];
  const grid = walkGrid({ placements: s.placements, tech: s.tech, pathways: s.pathways });
  const doors = entrancesOf(p, grid);
  // The front door, else the door nearest the road.
  const front = sidesOf(p.facing).front;
  const door = doors.find((e) => e.side === front) ?? [...doors].sort((a, b) => b.row - a.row)[0];
  if (!door || !isLand(door.row, door.col)) return [];
  // Breadth first, the step toward the road tried first, so an open run is
  // straight. -1 in the walk grid is built over.
  const open = (row: number, col: number) => isLand(row, col) && grid[row * W + col] > 0;
  const steps = [[1, 0], [0, -1], [0, 1], [-1, 0]] as const;
  const start = door.row * W + door.col;
  const prev = new Map<number, number>([[start, start]]);
  const queue = [start];
  for (let q = 0; q < queue.length; q++) {
    const at = queue[q];
    const row = Math.floor(at / W);
    const col = at % W;
    if (row === LAST_LAND_ROW) {
      const route: TileCoord[] = [];
      for (let i = at; ; i = prev.get(i)!) {
        route.push({ row: Math.floor(i / W), col: i % W });
        if (i === start) break;
      }
      return route.reverse();
    }
    for (const [dr, dc] of steps) {
      const r = row + dr;
      const c = col + dc;
      const next = r * W + c;
      if (!open(r, c) || prev.has(next)) continue;
      prev.set(next, at);
      queue.push(next);
    }
  }
  return [];
}

// Paves the drive. A headless founding's only, since Plan 122J: a guided
// founding's player draws the path to the road themselves (state/opening.ts's
// 'path' step).
export function layDrive(s: GameState): void {
  for (const tile of driveRoute(s)) s.pathways[pathTileKey(tile)] = true;
}

// The walk along the road (Plan 122J, the owner): the last row of land,
// paved across the parcel at the founding, so the walkers have a pavement
// beside the road and the path to the road has something to join.
export const SIDEWALK_ROW = LAST_LAND_ROW;
export function laySidewalk(s: GameState): void {
  for (let col = 0; col < W; col++) {
    if (!isLand(SIDEWALK_ROW, col)) continue;
    const key = pathTileKey({ row: SIDEWALK_ROW, col });
    s.pathways[key] = true;
    // No tree stands on the walk: it was laid before anything grew there.
    delete s.trees[key];
  }
}

// The paths joined to Founders Hall (Plan 115D), as tile keys: every path
// tile reached from one beside the hall, a step at a time along the paths,
// diagonals included (the draw tool lays a diagonal run as one band,
// pathways.tsx). The founding drive is among them (state/drive.ts), and a
// path that joins it counts. A path under a building joins nothing.
export function pathsFromFounders(s: GameState): Set<string> {
  const hall = s.placements[FOUNDERS_HALL_ID];
  const joined = new Set<string>();
  if (!hall) return joined;
  const covered = new Set(Object.values(s.placements).flatMap((p) => placementTiles(p).map(pathTileKey)));
  const paved = (key: string) => key in s.pathways && !covered.has(key) && !joined.has(key);
  const queue = besideTiles(hall).filter((t) => paved(pathTileKey(t)));
  for (const t of queue) joined.add(pathTileKey(t));
  for (let q = 0; q < queue.length; q++) {
    const { row, col } = queue[q];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const next = { row: row + dr, col: col + dc };
        const key = pathTileKey(next);
        if (!paved(key)) continue;
        joined.add(key);
        queue.push(next);
      }
    }
  }
  return joined;
}

// The tiles round a placement's footprint, corners included.
export function besideTiles(p: Placement): TileCoord[] {
  const tiles: TileCoord[] = [];
  for (let row = p.row - 1; row <= p.row + p.h; row++) {
    for (let col = p.col - 1; col <= p.col + p.w; col++) {
      if (row < p.row || row >= p.row + p.h || col < p.col || col >= p.col + p.w) tiles.push({ row, col });
    }
  }
  return tiles;
}
