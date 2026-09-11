import { CAMPUS_GRID_HEIGHT, CAMPUS_GRID_WIDTH } from '../state/types';

// The campus map's projection: 2:1 dimetric, the angle this genre means by
// "isometric". Everything here is pure geometry — no React, no game state,
// no colour — so the map, the motifs and the ground markings all share one
// definition of where a tile is rather than each deriving their own.
//
// Why 2:1 and not a true 30-degree isometric: at 2:1 a tile's diagonals run
// exactly one pixel down for every two across, so grid lines and footprint
// edges land on clean pixel slopes instead of shimmering as they pan. It is
// also the ratio every sprite-based management sim uses, so it reads as
// "campus seen from an angle" rather than as a skewed diagram.
//
// IMPORTANT: this is a RENDERING projection only. Tile coordinates
// (row/col), footprints, occupancy, canPlace and the stored Placement are
// completely unaware of it — exactly as they were unaware of the flat map's
// own tileX/tileY. Nothing here changes what a building costs, gates or
// grants.

// One tile is TILE_W across and TILE_H down on screen at zoom 1. The flat
// map's tiles were 64px square; keeping TILE_W at 64 means a footprint
// covers the same width it used to, so the campus reads at a familiar size.
export const TILE_W = 64;
export const TILE_H = 32;

export interface Pt { x: number; y: number; }

// Grid CORNER (col, row) to world point. Note this takes corner
// coordinates, not tile indices: tile (row, col) spans corners (col, row)
// through (col + 1, row + 1), which is what lets a footprint of any size
// project by passing its far corner rather than looping its tiles.
export function project(col: number, row: number): Pt {
  return { x: (col - row) * (TILE_W / 2), y: (col + row) * (TILE_H / 2) };
}

// World point back to FRACTIONAL grid corner coordinates — the inverse of
// project, and what turns a mouse position into a tile.
//
//   x = (col - row) * TILE_W / 2      =>  col - row = 2x / TILE_W
//   y = (col + row) * TILE_H / 2      =>  col + row = 2y / TILE_H
//
// so col and row fall straight out of the half-sum and half-difference.
// This is the whole reason an angled map needs no per-tile hit-target: one
// division replaces CAMPUS_GRID_WIDTH * CAMPUS_GRID_HEIGHT DOM elements.
export function unproject(x: number, y: number): { col: number; row: number } {
  const a = x / TILE_W;   // half of (col - row)
  const b = y / TILE_H;   // half of (col + row)
  return { col: b + a, row: b - a };
}

// The tile a world point falls in, or null if it falls off the grid.
export function tileAt(x: number, y: number): { row: number; col: number } | null {
  const { col, row } = unproject(x, y);
  const c = Math.floor(col);
  const r = Math.floor(row);
  if (r < 0 || c < 0 || r >= CAMPUS_GRID_HEIGHT || c >= CAMPUS_GRID_WIDTH) return null;
  return { row: r, col: c };
}

// Raise a point by `h` screen units. Height is pure screen-space offset: an
// angled projection has no third axis of its own, a taller building simply
// draws further up the screen.
export function lift(p: Pt, h: number): Pt {
  return { x: p.x, y: p.y - h };
}

export function polyPoints(pts: Pt[]): string {
  return pts.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
}

// The visible faces of an axis-aligned box standing on the grid.
//
//   A ---- B      A is the BACK corner (smallest screen y)
//   |      |      C is the FRONT corner (largest screen y)
//   D ---- C      so the two faces the camera can see are always the ones
//                 meeting at C: D-C on the left, C-B on the right.
export interface BoxFaces {
  A: Pt; B: Pt; C: Pt; D: Pt;
  At: Pt; Bt: Pt; Ct: Pt; Dt: Pt;
  top: Pt[]; left: Pt[]; right: Pt[];
}
export function boxFaces(
  col: number, row: number, w: number, h: number, base: number, height: number,
): BoxFaces {
  const A = lift(project(col, row), base);
  const B = lift(project(col + w, row), base);
  const C = lift(project(col + w, row + h), base);
  const D = lift(project(col, row + h), base);
  const At = lift(A, height); const Bt = lift(B, height);
  const Ct = lift(C, height); const Dt = lift(D, height);
  return { A, B, C, D, At, Bt, Ct, Dt, top: [At, Bt, Ct, Dt], left: [D, C, Ct, Dt], right: [C, B, Bt, Ct] };
}

// A point on a wall face in the wall's OWN coordinates: u runs along the
// wall from `origin` to `along`, v runs up it from 0 to 1. Anything drawn
// through this comes out correctly skewed for free — a window is just a
// rectangle in (u, v).
export function facePoint(origin: Pt, along: Pt, height: number, u: number, v: number): Pt {
  return {
    x: origin.x + (along.x - origin.x) * u,
    y: origin.y + (along.y - origin.y) * u - height * v,
  };
}

// A circle drawn ON the ground, projected. Sampled as a polygon rather than
// emitted as an <ellipse> because the projection turns a circle into an
// ellipse whose axes are not screen-aligned; a sampled ring needs no
// rotation maths and stays correct if the projection is ever retuned.
export function projectedCircle(
  centreCol: number, centreRow: number, radius: number, segments = 40,
): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    out.push(project(centreCol + Math.cos(a) * radius, centreRow + Math.sin(a) * radius));
  }
  return out;
}

// An arc on the ground between two angles — the outfield boundary and the
// infield dirt of a ball field are both this.
export function projectedArc(
  centreCol: number, centreRow: number, radius: number,
  fromAngle: number, toAngle: number, segments = 28,
): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i <= segments; i++) {
    const a = fromAngle + (toAngle - fromAngle) * (i / segments);
    out.push(project(centreCol + Math.cos(a) * radius, centreRow + Math.sin(a) * radius));
  }
  return out;
}

// The whole grid's extent in world space. Unlike the flat map, x is
// SYMMETRIC about zero (the grid is a diamond, its left corner at negative
// x), so nothing may assume the world starts at the origin.
export const WORLD = (() => {
  const N = Math.max(CAMPUS_GRID_WIDTH, CAMPUS_GRID_HEIGHT);
  return {
    minX: project(0, CAMPUS_GRID_HEIGHT).x,
    maxX: project(CAMPUS_GRID_WIDTH, 0).x,
    minY: project(0, 0).y,
    maxY: project(CAMPUS_GRID_WIDTH, CAMPUS_GRID_HEIGHT).y,
    width: N * TILE_W,
    height: N * TILE_H,
  };
})();
