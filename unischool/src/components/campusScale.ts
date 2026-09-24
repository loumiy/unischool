import { TILE_H, TILE_W } from './isoProjection';

// The campus's unit system: how a real dimension in metres becomes a
// distance on this map, and the one place any above-ground size may come
// from, so storeys, windows and doors are proportional across buildings.
// `across` converts ground metres to tiles; `up` converts height metres to
// screen units (the two differ because the map is drawn at an angle).

// Ground per tile, for drawing. 9 m makes an 8-tile academic hall a
// realistic 72 m facade. Footprints are not restated here; the stadium
// reads a little small, an accepted stylisation.
export const METRES_PER_TILE = 9;

// The camera's pitch and the vertical foreshortening that follows. Derived,
// not chosen: isoProjection's `project` pins sin(pitch) = TILE_H / TILE_W
// (30 degrees), so one tile of height rises (TILE_W / sqrt2) * cos(pitch),
// about 39.19 units, not TILE_W / 2. No stylistic stretch is needed. Heights
// are authored at the default pitch; isoProjection's `lift` re-foreshortens
// them when the camera tilts.
export const PITCH = Math.asin(TILE_H / TILE_W);
export const UNITS_PER_TILE_UP = (TILE_W / Math.SQRT2) * Math.cos(PITCH);
const UNITS_PER_METRE = UNITS_PER_TILE_UP / METRES_PER_TILE;

// A metre measured ACROSS the ground, in tiles — the unit footprints, wall
// spans and anything else on the grid is already in.
export function across(metres: number): number {
  return metres / METRES_PER_TILE;
}

// A metre measured UP, in the screen units `lift` and the motifs' heights use.
export function up(metres: number): number {
  return metres * UNITS_PER_METRE;
}

// Floor to floor, one number for every institutional building so a storey
// means the same thing everywhere.
export const STOREY_METRES = 3.9;

// One storey on screen, about 16.98.
export const STOREY = up(STOREY_METRES);
