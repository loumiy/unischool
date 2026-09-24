import { boxFaces, project, type FaceDir, type Pt } from './isoProjection';
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

// The shadow a box throws on flat ground: the footprint translated away from
// the sun, projected. Not the swept hull: the half under the mass is covered
// because every shadow is drawn before every mass (CampusMap's shadow pass).
export function castShadow(col: number, row: number, w: number, h: number, height: number): Pt[] {
  const { dcol, drow } = shadowOffset(height);
  return boxFaces(col + dcol, row + drow, w, h, 0, 0).top;
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
