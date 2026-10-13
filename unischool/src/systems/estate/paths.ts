import type { GameState } from '../../state/types';
import { isLand, occupantAt, pathTileKey } from '../../state/campusMap';
import { desireLines, walkGrid } from '../../components/walkRoutes';

// The worn line paved (Plan 101E, desire-path): the longest run of lawn the
// busiest walks cross (walkRoutes.ts's desireLines, the line the map draws),
// laid as path tiles the way the path tool lays them.
export function wornLine(s: GameState): { col: number; row: number }[] {
  const input = { placements: s.placements, tech: s.tech, pathways: s.pathways };
  const runs = desireLines(input, walkGrid(input));
  const longest = runs.reduce<(typeof runs)[number] | undefined>((best, r) => (!best || r.length > best.length ? r : best), undefined) ?? [];
  const tiles = new Map<string, { col: number; row: number }>();
  for (const w of longest) {
    const tile = { col: Math.floor(w.col), row: Math.floor(w.row) };
    if (isLand(tile.row, tile.col) && occupantAt(s.placements, tile.row, tile.col) === undefined) tiles.set(pathTileKey(tile), tile);
  }
  return [...tiles.values()];
}
export function paveLine(s: GameState): void {
  for (const tile of wornLine(s)) s.pathways[pathTileKey(tile)] = true;
}
