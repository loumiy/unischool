import type { GameState } from '../../state/types';
import { CAMPUS_GRID_HEIGHT, CAMPUS_GRID_WIDTH } from '../../state/types';
import { isLand, pathTileKey } from '../../state/campusMap';
import { absoluteWeek } from '../../data/eventData';

// The woodland, for the event catalog (Plan 32): how many trees stand,
// and an event's planting or felling. Kept in the estate, the one place the
// simulation reads the map (test/invariants.test.ts).

export function treeCount(s: GameState): number {
  return Object.keys(s.trees).length;
}

export function changeTrees(s: GameState, amount: number): void {
  if (amount < 0) {
    for (const key of Object.keys(s.trees).slice(0, -Math.round(amount))) delete s.trees[key];
    return;
  }
  // Planted on bare land, in a scan from the week, so a gift of trees does
  // not draw on the stream the run's events come from.
  const taken = new Set(Object.values(s.placements).flatMap((p) => {
    const tiles: string[] = [];
    for (let r = p.row; r < p.row + p.h; r++) for (let c = p.col; c < p.col + p.w; c++) tiles.push(pathTileKey({ row: r, col: c }));
    return tiles;
  }));
  let planted = 0;
  const want = Math.round(amount);
  const start = (absoluteWeek(s) * 7919) % (CAMPUS_GRID_WIDTH * CAMPUS_GRID_HEIGHT);
  for (let i = 0; i < CAMPUS_GRID_WIDTH * CAMPUS_GRID_HEIGHT && planted < want; i++) {
    const cell = (start + i * 97) % (CAMPUS_GRID_WIDTH * CAMPUS_GRID_HEIGHT);
    const row = Math.floor(cell / CAMPUS_GRID_WIDTH);
    const col = cell % CAMPUS_GRID_WIDTH;
    const key = pathTileKey({ row, col });
    if (!isLand(row, col) || taken.has(key) || key in s.trees || key in s.pathways) continue;
    // The seed trees.tsx draws the tree from.
    s.trees[key] = (cell * 2654435761) >>> 0;
    planted += 1;
  }
}
