import { project, type FaceDir, type Pt } from './isoProjection';
import { shade } from './tint';

// The sun: one light for the whole campus, fixed to the world (a direction
// across the grid), not the screen. That keeps a building's south wall lit
// and its shadow on the same lawn whichever way the camera turns.
//
// Pure geometry and one table of tones; no React, no game state.
// isoProjection.ts turns it into screen coordinates at every azimuth and pitch.

// Where the light comes from, as a unit direction across the grid: mostly
// from -col, a little from -row (upper left at the default camera). Matches
// the roof and wall tones: -col brightest, -row next, +row dimmer, +col darkest.
const FROM_ANGLE = (21 * Math.PI) / 180;
export const SUN_FROM = { col: -Math.cos(FROM_ANGLE), row: -Math.sin(FROM_ANGLE) };

// How far a cast shadow reaches per screen unit of height (as authored at
// the default pitch; see campusScale.ts's `up`), in tiles along the ground.
const SHADOW_TILES_PER_UNIT = 0.006875;

// The ground offset a point at `height` casts its shadow to: away from the
// sun, further the higher it is. A world vector — project it, never add it
// to screen coordinates.
export function shadowOffset(height: number): { dcol: number; drow: number } {
  return {
    dcol: -SUN_FROM.col * SHADOW_TILES_PER_UNIT * height,
    drow: -SUN_FROM.row * SHADOW_TILES_PER_UNIT * height,
  };
}

// The ground a box's shadow covers, in grid coordinates: the footprint and
// the footprint thrown away from the sun, and everything between, which for
// a box is the hull of the two (a hexagon, or the rectangle stretched when
// the throw runs along an axis). The throw alone, which this was until the
// owner asked why a shadow did not meet its building's corner, left a step
// at the two side corners: the strip joining base to throw was missing, so
// the shadow seemed to start away from the wall.
export function shadowGround(col: number, row: number, w: number, h: number, height: number): { col: number; row: number }[] {
  const { dcol, drow } = shadowOffset(height);
  const base = [{ col, row }, { col: col + w, row }, { col: col + w, row: row + h }, { col, row: row + h }];
  return hull([...base, ...base.map((p) => ({ col: p.col + dcol, row: p.row + drow }))]);
}

// The shadow a box throws on flat ground, projected. The part under the
// mass is covered, since every shadow is drawn before every mass
// (CampusMap's shadow pass).
export function castShadow(col: number, row: number, w: number, h: number, height: number): Pt[] {
  return shadowGround(col, row, w, h, height).map((p) => project(p.col, p.row));
}

// A convex hull (Andrew's monotone chain), counter-clockwise in grid
// coordinates. The projection is affine, so the hull of the grid points
// projects to the hull of their screen points.
function hull(pts: { col: number; row: number }[]): { col: number; row: number }[] {
  const s = [...pts].sort((a, b) => a.col - b.col || a.row - b.row);
  const cross = (o: { col: number; row: number }, a: { col: number; row: number }, b: { col: number; row: number }) =>
    (a.col - o.col) * (b.row - o.row) - (a.row - o.row) * (b.col - o.col);
  const lower: typeof s = [];
  for (const p of s) { while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 1e-12) lower.pop(); lower.push(p); }
  const upper: typeof s = [];
  for (const p of s.reverse()) { while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 1e-12) upper.pop(); upper.push(p); }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

// A polygon in grid coordinates clipped to a box (Sutherland-Hodgman, one
// edge at a time): a shadow kept inside its own plot.
export function clipToBox(poly: { col: number; row: number }[], c0: number, r0: number, c1: number, r1: number): { col: number; row: number }[] {
  type G = { col: number; row: number };
  const edge = (pts: G[], inside: (p: G) => boolean, cut: (a: G, b: G) => G): G[] => {
    const out: G[] = [];
    for (let i = 0; i < pts.length; i += 1) {
      const a = pts[i]; const b = pts[(i + 1) % pts.length];
      if (inside(b)) { if (!inside(a)) out.push(cut(a, b)); out.push(b); } else if (inside(a)) out.push(cut(a, b));
    }
    return out;
  };
  const atCol = (x: number) => (a: G, b: G): G => ({ col: x, row: a.row + ((x - a.col) * (b.row - a.row)) / (b.col - a.col) });
  const atRow = (y: number) => (a: G, b: G): G => ({ col: a.col + ((y - a.row) * (b.col - a.col)) / (b.row - a.row), row: y });
  let p = edge(poly, (q) => q.col >= c0, atCol(c0));
  p = edge(p, (q) => q.col <= c1, atCol(c1));
  p = edge(p, (q) => q.row >= r0, atRow(r0));
  return edge(p, (q) => q.row <= r1, atRow(r1));
}

// Which way across the SCREEN the light comes from at the current camera,
// unit length — for the few things drawn as billboards rather than as
// projected geometry, like the lit cap on a tree's crown.
export function sunScreenDir(): Pt {
  const p = project(SUN_FROM.col, SUN_FROM.row);
  const len = Math.hypot(p.x, p.y) || 1;
  return { x: p.x / len, y: p.y / len };
}

// How bright a vertical face is by the grid direction it points, relative
// to the wall's own tone: -col faces the sun and is brightest, +col darkest,
// the row walls between with -row lighter (as buildingMotifs' SLOPE). Fixed
// to the world so turning the camera never changes which side is lit.
export const WALL_LIGHT: Record<FaceDir, number> = { negCol: 1.14, negRow: 1.02, posRow: 0.98, posCol: 0.78 };

// The tone for a face pointing `dir`, given the two tones a motif authored
// for +row and +col (the faces the default camera sees). The other two are
// derived from the +row tone by the WALL_LIGHT ratios.
export function faceTone(dir: FaceDir, posRow: string, posCol: string): string {
  switch (dir) {
    case 'posRow': return posRow;
    case 'posCol': return posCol;
    case 'negRow': return shade(posRow, WALL_LIGHT.negRow / WALL_LIGHT.posRow);
    default: return shade(posRow, WALL_LIGHT.negCol / WALL_LIGHT.posRow);
  }
}
