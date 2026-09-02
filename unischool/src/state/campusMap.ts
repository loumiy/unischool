import type { Buildable, FacilityType, Footprint, GameState, Placement, Placements, TileCoord } from './types';
import { CAMPUS_GRID_HEIGHT, CAMPUS_GRID_WIDTH, PLACEABLE_KINDS } from './types';

// Pure helpers for the campus map's placement rules, shared by the
// reducer's PLACE_BUILDABLE case, the save loader's placement hygiene, and
// the map UI so "can this go here" has exactly one definition (the same way
// techSystem.ts's canStartDevelopment is shared by the reducer and the
// Campus tab).
//
// Nothing here mutates state and nothing here ticks — placement is a
// player action interpreted by the reducer, not a system.

// Courses are never placeable; buildings, dorms, and facilities are.
export function isPlaceableKind(t: Buildable): boolean {
  return PLACEABLE_KINDS.includes(t.kind);
}

// ---------------------------------------------------------------------
// FOOTPRINTS. How many tiles a placed Buildable covers, in grid units.
// A school hall, a dorm block and a lab are not the same size on a real
// campus, and a map of uniform squares reads as a spreadsheet — so size
// varies by what the thing IS.
//
// This is a placement RULE keyed on the Buildable's existing data (kind,
// and for facilities facilityType), NOT a new field on Buildable: the
// single Buildable model stays unforked, and `course` Buildables — which
// are never placeable — carry no vestigial map data (see README's "The
// central abstraction").
//
// Footprints are pure geometry: a bigger building grants nothing extra and
// costs nothing extra. Placement is still visual-only.
//
// Retuning these numbers only affects buildings placed AFTERWARDS —
// a placement stores the footprint it was made with (see types.ts's
// Placement), so an existing save's layout can never silently reshape into
// an overlap.
// ---------------------------------------------------------------------

const SINGLE_TILE: Footprint = { w: 1, h: 1 };

// Academic halls are the campus landmarks — the biggest thing on the map.
const SCHOOL_BUILDING_FOOTPRINT: Footprint = { w: 2, h: 2 };
// A dorm is a long block: wide, one deep.
const DORM_FOOTPRINT: Footprint = { w: 2, h: 1 };

// Per facility type; anything absent falls back to SINGLE_TILE, which is
// the right default for the small utilitarian ones (labs, health centers,
// dining halls).
const FACILITY_FOOTPRINTS: Partial<Record<FacilityType, Footprint>> = {
  quad: { w: 2, h: 2 },          // open ground, and the only "building" that is really a space
  library: { w: 2, h: 1 },
  studentCenter: { w: 2, h: 1 },
  recCenter: { w: 2, h: 1 },
  parking: { w: 2, h: 1 },       // lots sprawl sideways
};

export function footprintOf(t: Buildable): Footprint {
  if (t.kind === 'building') return SCHOOL_BUILDING_FOOTPRINT;
  if (t.kind === 'dorm') return DORM_FOOTPRINT;
  if (t.kind === 'facility' && t.facilityType) {
    return FACILITY_FOOTPRINTS[t.facilityType] ?? SINGLE_TILE;
  }
  return SINGLE_TILE;
}

// ---------------------------------------------------------------------
// Bounds and occupancy
// ---------------------------------------------------------------------

export function isInBounds(row: number, col: number): boolean {
  return Number.isInteger(row) && Number.isInteger(col)
    && row >= 0 && row < CAMPUS_GRID_HEIGHT
    && col >= 0 && col < CAMPUS_GRID_WIDTH;
}

// The whole footprint must fit, not just its anchor tile: a 2x2 anchored on
// the last column hangs off the edge even though the anchor itself is fine.
export function footprintFits(row: number, col: number, fp: Footprint): boolean {
  return Number.isInteger(fp.w) && Number.isInteger(fp.h) && fp.w >= 1 && fp.h >= 1
    && isInBounds(row, col)
    && isInBounds(row + fp.h - 1, col + fp.w - 1);
}

// Every tile a placement covers, anchor first. The one definition of "which
// tiles is this thing on", used by occupancy, placement and rendering alike.
export function placementTiles(p: Placement): TileCoord[] {
  const tiles: TileCoord[] = [];
  for (let r = 0; r < p.h; r++) {
    for (let c = 0; c < p.w; c++) tiles.push({ row: p.row + r, col: p.col + c });
  }
  return tiles;
}

export function placementCovers(p: Placement, row: number, col: number): boolean {
  return row >= p.row && row < p.row + p.h && col >= p.col && col < p.col + p.w;
}

// The Buildable id covering a tile, or undefined if the tile is empty.
// Linear over `placements`, which holds at most one entry per placeable
// Buildable (67 today) — no index worth keeping in state for that.
export function occupantAt(placements: Placements, row: number, col: number): string | undefined {
  for (const [id, p] of Object.entries(placements)) {
    if (placementCovers(p, row, col)) return id;
  }
  return undefined;
}

// A finished, placeable Buildable that hasn't been sited yet. Placement is
// optional and non-blocking: a building's effects already landed when it
// finished, so leaving this list full costs the player nothing mechanically.
export function isAwaitingPlacement(s: GameState, t: Buildable): boolean {
  return t.status === 'done' && isPlaceableKind(t) && !(t.id in s.placements);
}

export function awaitingPlacement(s: GameState): Buildable[] {
  return s.tech.filter((t) => isAwaitingPlacement(s, t));
}

// Would this footprint, anchored here, sit entirely on empty in-bounds
// tiles? Split out from canPlace so the map can preview a hovered/dragged
// footprint without re-deriving the rule.
export function footprintIsClear(placements: Placements, row: number, col: number, fp: Footprint): boolean {
  if (!footprintFits(row, col, fp)) return false;
  for (const tile of placementTiles({ row, col, ...fp })) {
    if (occupantAt(placements, tile.row, tile.col) !== undefined) return false;
  }
  return true;
}

// The one definition of a legal placement: a finished, placeable, not-yet-
// placed Buildable whose WHOLE footprint lands on empty, in-bounds tiles.
export function canPlace(s: GameState, t: Buildable, row: number, col: number): boolean {
  return isAwaitingPlacement(s, t)
    && footprintIsClear(s.placements, row, col, footprintOf(t));
}

// The placement PLACE_BUILDABLE writes: the anchor the player picked plus
// the footprint that Buildable gets, frozen in at the moment of placement.
export function placementFor(t: Buildable, row: number, col: number): Placement {
  return { row, col, ...footprintOf(t) };
}

// How many tiles are currently built on — the map header's "sited" readout.
// Tiles, not placements, now that one building can cover several.
export function tilesCovered(placements: Placements): number {
  let total = 0;
  for (const p of Object.values(placements)) total += p.w * p.h;
  return total;
}
