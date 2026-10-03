import type { Facing } from '../state/types';
import { visibleWalls, type FaceDir } from './isoProjection';

// A building's own sides (four-way orientation). A placement's `facing`
// says which map edge its front faces (state/types.ts); the art asks here
// which wall is its front, back, left or right, and draws each side's
// features there when the camera sees that wall. A feature drawn this way
// stays on its side of the building as the camera turns, so a building may
// have a front unlike its back.
//
// `left` and `right` are the building's own, as someone facing its front
// from outside sees them: at facing 0 (front on +row, looking north) left is
// -col and right is +col.
export type Side = 'front' | 'left' | 'back' | 'right';
export const SIDES: readonly Side[] = ['front', 'left', 'back', 'right'];

// The front's wall at each facing, a quarter turn at a time; the left,
// back and right follow it in the same order.
const RING: readonly FaceDir[] = ['posRow', 'negCol', 'negRow', 'posCol'];

export type Sides = Readonly<Record<Side, FaceDir>>;
const SIDES_AT: readonly Sides[] = ([0, 1, 2, 3] as const).map((f) => ({
  front: RING[f], left: RING[(f + 1) % 4], back: RING[(f + 2) % 4], right: RING[(f + 3) % 4],
}));

// Each side's wall at this facing.
export function sidesOf(facing: Facing | undefined): Sides {
  return SIDES_AT[facing ?? 0];
}

// Which of the building's sides a wall is.
export function sideOf(facing: Facing | undefined, dir: FaceDir): Side {
  const k = (RING.indexOf(dir) - (facing ?? 0) + 4) % 4;
  return SIDES[k];
}

// The wall a side faces.
export function wallOfSide(facing: Facing | undefined, side: Side): FaceDir {
  return sidesOf(facing)[side];
}

// Whether the camera sees a side's wall now.
export function sideSeen(facing: Facing | undefined, side: Side): boolean {
  const dir = sidesOf(facing)[side];
  const seen = visibleWalls();
  return dir === seen.left || dir === seen.right;
}

// The two sides the camera sees, as its left and right walls.
export function seenSides(facing: Facing | undefined): { left: Side; right: Side } {
  const seen = visibleWalls();
  return { left: sideOf(facing, seen.left), right: sideOf(facing, seen.right) };
}

// The length in tiles of a wall of a w x h (stored, already turned)
// footprint: a wall facing along row spans the columns.
export function spanOfWall(w: number, h: number, dir: FaceDir): number {
  return dir === 'posRow' || dir === 'negRow' ? w : h;
}

// The base footprint's width across the front and depth front to back, from
// the stored one.
export function frontWidth(p: { w: number; h: number; facing?: Facing }): number {
  return (p.facing ?? 0) % 2 === 0 ? p.w : p.h;
}
export function frontDepth(p: { w: number; h: number; facing?: Facing }): number {
  return (p.facing ?? 0) % 2 === 0 ? p.h : p.w;
}

// A point given in the building's own frame mapped onto the map. `u` runs
// across the front from the building's left to its right, 0 to
// frontWidth; `d` from the front back, 0 to frontDepth. Returns grid corner
// coordinates (col, row), so the art can set out a part (a wing, a tower, a
// porch) at the same place on the building whichever way it faces.
export function localToGrid(p: { col: number; row: number; w: number; h: number; facing?: Facing }, u: number, d: number): { col: number; row: number } {
  switch (p.facing ?? 0) {
    // Front on +row: left is -col, so u runs +col along the front edge.
    case 0: return { col: p.col + u, row: p.row + p.h - d };
    // Front on -col (seen from the west): left is -row, so u runs +row.
    case 1: return { col: p.col + d, row: p.row + u };
    // Front on -row: u runs -col.
    case 2: return { col: p.col + p.w - u, row: p.row + d };
    // Front on +col: left is +row, so u runs -row.
    default: return { col: p.col + p.w - d, row: p.row + p.h - u };
  }
}

// A rectangle in the building's own frame (u0..u1 across, d0..d1 deep) as a
// grid box (col, row, w, h) on the map.
export function localBox(
  p: { col: number; row: number; w: number; h: number; facing?: Facing },
  u0: number, d0: number, u1: number, d1: number,
): { col: number; row: number; w: number; h: number } {
  const a = localToGrid(p, u0, d0);
  const b = localToGrid(p, u1, d1);
  const col = Math.min(a.col, b.col);
  const row = Math.min(a.row, b.row);
  return { col, row, w: Math.abs(a.col - b.col), h: Math.abs(a.row - b.row) };
}

// The facing whose front is the camera's left-hand wall: a building just
// picked up turns its front to the player.
export function facingToCamera(): Facing {
  return RING.indexOf(visibleWalls().left) as Facing;
}

// A building's drawn plot: the stored footprint (already turned), inset as
// the map draws it, with the facing it was placed at.
export interface Plot { col: number; row: number; w: number; h: number; facing?: Facing }
