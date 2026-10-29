import type { Pathways, Placements, TileCoord } from '../state/types';
import { isLand, occupantAt, parsePathTileKey, pathTileKey } from '../state/campusMap';
import { surfaceOf, type PathSurface } from '../state/paving';

// The paving tool's shaped strokes (Plan 120B), kept apart from the map so
// they can be tested: a straight run with Shift held, a filled rectangle
// with Ctrl (or ⌘). CampusMap.tsx's paintStroke dispatches what they return
// as one PAINT_PATH_TILES.

// The tiles of an eight-connected line from `a` to `b`, both included.
export function tilesBetween(a: TileCoord, b: TileCoord): TileCoord[] {
  const steps = Math.max(Math.abs(b.row - a.row), Math.abs(b.col - a.col));
  const out: TileCoord[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = steps === 0 ? 0 : i / steps;
    out.push({ row: Math.round(a.row + (b.row - a.row) * t), col: Math.round(a.col + (b.col - a.col) * t) });
  }
  return out;
}

// The tiles of the rectangle with corners `a` and `b`, both included.
export function tilesInRect(a: TileCoord, b: TileCoord): TileCoord[] {
  const out: TileCoord[] = [];
  for (let row = Math.min(a.row, b.row); row <= Math.max(a.row, b.row); row++) {
    for (let col = Math.min(a.col, b.col); col <= Math.max(a.col, b.col); col++) out.push({ row, col });
  }
  return out;
}

// A stroke held down: where it began, the tiles it has laid (or, deleting,
// lifted), and what those tiles held before it.
export interface Stroke { anchor: TileCoord; laid: Set<string>; prior: Map<string, Pathways[string]> }

export interface ShapeChange {
  add: TileCoord[];
  remove: TileCoord[];
  restore: { tile: TileCoord; paving: Pathways[string] }[];
}

// The change that brings the map to the shape from the stroke's anchor to
// `here`, updating the stroke. Paving ('draw') lays the shape's tiles, and
// repaves those of another surface; deleting ('unpave') lifts its paths.
// Tiles the shape moves off go back to how they were. The shape skips
// water and the tiles under a building.
export function shapeStroke(
  pathways: Pathways, placements: Placements, stroke: Stroke, here: TileCoord,
  shape: 'line' | 'area', tool: 'draw' | 'unpave', surface: PathSurface,
): ShapeChange {
  const tiles = (shape === 'area' ? tilesInRect(stroke.anchor, here) : tilesBetween(stroke.anchor, here))
    .filter((t) => isLand(t.row, t.col) && occupantAt(placements, t.row, t.col) === undefined);
  const onShape = new Set(tiles.map(pathTileKey));
  const off = [...stroke.laid].filter((key) => !onShape.has(key));
  const remove = off.filter((key) => !stroke.prior.has(key)).map((key) => parsePathTileKey(key)!);
  const restore = off.filter((key) => stroke.prior.has(key)).map((key) => ({ tile: parsePathTileKey(key)!, paving: stroke.prior.get(key)! }));
  for (const key of off) { stroke.laid.delete(key); stroke.prior.delete(key); }
  const add: TileCoord[] = [];
  for (const t of tiles) {
    const key = pathTileKey(t);
    if (stroke.laid.has(key)) continue;
    const paved = key in pathways;
    if (tool === 'draw') {
      if (paved && surfaceOf(pathways[key]) === surface) continue;
      if (paved) stroke.prior.set(key, pathways[key]);
      stroke.laid.add(key);
      add.push(t);
    } else if (paved) {
      stroke.prior.set(key, pathways[key]);
      stroke.laid.add(key);
      remove.push(t);
    }
  }
  return { add, remove, restore };
}
