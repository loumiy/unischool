import type {
  Buildable, EdgeOrientation, FacilityType, Footprint, GameState, PathEdge, Placement, Placements, TileCoord,
} from './types';
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
// for facilities facilityType, and — dining halls only, see below —
// effects.servesPopulation), NOT a new field on Buildable: the single
// Buildable model stays unforked, and `course` Buildables — which are
// never placeable — carry no vestigial map data (see README's "The
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
// the right default for the small utilitarian ones (labs, health centers).
// diningHall is deliberately absent here — its footprint isn't fixed by
// type, it's read off size (see DINING_MAJOR_FOOTPRINT below).
const FACILITY_FOOTPRINTS: Partial<Record<FacilityType, Footprint>> = {
  quad: { w: 2, h: 2 },          // open ground, and the only "building" that is really a space
  library: { w: 2, h: 1 },
  studentCenter: { w: 2, h: 1 },
  recCenter: { w: 2, h: 1 },
  gym: { w: 2, h: 1 },
  pool: { w: 2, h: 1 },          // a real pool needs the same footprint as a gym, not a utility-sized box
  // performingArtsCenter is the landmark of this batch: a concert hall and
  // theater reads as a real building, same footprint as a school hall/quad.
  performingArtsCenter: { w: 2, h: 2 },
  // tennisCourts and artGallery are absent on purpose — small facilities
  // (a handful of courts, one gallery room) fall back to SINGLE_TILE, the
  // same default labs/health centers already use.

  // Varsity athletics venues (facilitiesData.ts): real competition venues,
  // sized accordingly. The football stadium is deliberately the largest
  // footprint of any Buildable in the game — the pinnacle venue should read
  // as one on the map, not just in its cost.
  athleticsField: { w: 2, h: 2 },
  athleticsArena: { w: 2, h: 2 },
  athleticsDiamond: { w: 2, h: 1 },
  athleticsNatatorium: { w: 2, h: 1 },
  footballStadium: { w: 3, h: 2 },
};

// Dining halls are the one facility type sized by how many students they
// serve rather than by type alone (see facilitiesData.ts's dining chain):
// a compact campus restaurant stays SINGLE_TILE, but once a hall serves
// enough people to be a real "major dining hall" it earns the same 2x1
// footprint a dorm gets. Reads effects.servesPopulation — already on the
// Buildable for satisfactionSystem.ts's sake — rather than adding a field
// of its own.
const DINING_MAJOR_FOOTPRINT: Footprint = { w: 2, h: 1 };
const DINING_MAJOR_FOOTPRINT_SERVES_THRESHOLD = 1_000;

export function footprintOf(t: Buildable): Footprint {
  if (t.kind === 'building') return SCHOOL_BUILDING_FOOTPRINT;
  if (t.kind === 'dorm') return DORM_FOOTPRINT;
  if (t.kind === 'facility' && t.facilityType === 'diningHall') {
    return (t.effects?.servesPopulation ?? 0) >= DINING_MAJOR_FOOTPRINT_SERVES_THRESHOLD
      ? DINING_MAJOR_FOOTPRINT
      : SINGLE_TILE;
  }
  if (t.kind === 'facility' && t.facilityType) {
    return FACILITY_FOOTPRINTS[t.facilityType] ?? SINGLE_TILE;
  }
  return SINGLE_TILE;
}

// ---------------------------------------------------------------------
// ROTATION. A building picked up for siting can be turned 90 degrees before
// it's set down (see CampusMap.tsx's 'R' hotkey / rotate control). There is
// no separate "orientation" field anywhere: rotating just swaps which of a
// Buildable's own footprintOf() dimensions is w and which is h, and THAT
// swapped {row,col,w,h} is what PLACE_BUILDABLE writes into `placements` —
// the same field that already exists and is already saved. One source of
// truth, and the reason the v13 -> v14 migration needs no placement-shape
// change at all (see persistence.ts).
// ---------------------------------------------------------------------

// A square footprint reads identically rotated or not — offering a rotate
// control for one would be a control that visibly does nothing.
export function canRotate(fp: Footprint): boolean {
  return fp.w !== fp.h;
}

export function rotateFootprint(fp: Footprint): Footprint {
  return { w: fp.h, h: fp.w };
}

// The footprint actually being sited right now: a Buildable's base
// footprint, swapped if the player has rotated it. Square footprints never
// change regardless of `rotated` (see canRotate above).
export function orientedFootprint(t: Buildable, rotated: boolean): Footprint {
  const fp = footprintOf(t);
  return rotated && canRotate(fp) ? rotateFootprint(fp) : fp;
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
// `fp` is the footprint actually being sited — orientedFootprint(t, rotated)
// for a rotatable siting flow, or plain footprintOf(t) for anything that
// doesn't care about rotation — rather than always re-deriving the
// unrotated one, so a rotated footprint that no longer fits is refused
// exactly as an unrotated overflow already is.
export function canPlace(s: GameState, t: Buildable, row: number, col: number, fp: Footprint): boolean {
  return isAwaitingPlacement(s, t)
    && footprintIsClear(s.placements, row, col, fp);
}

// The placement PLACE_BUILDABLE writes: the anchor the player picked plus
// the footprint (already oriented — see orientedFootprint) it gets, frozen
// in at the moment of placement.
export function placementFor(row: number, col: number, fp: Footprint): Placement {
  return { row, col, ...fp };
}

// How many tiles are currently built on — the map header's "sited" readout.
// Tiles, not placements, now that one building can cover several.
export function tilesCovered(placements: Placements): number {
  let total = 0;
  for (const p of Object.values(placements)) total += p.w * p.h;
  return total;
}

// ---------------------------------------------------------------------
// PATHWAYS. See types.ts's Pathways/PathEdge for the edge-identification
// scheme (a 'h'/'v' edge on the grid of tile CORNERS, not on either tile it
// borders). Everything below is pure geometry, shared by the reducer's
// ADD_PATH_EDGE/REMOVE_PATH_EDGE cases, the save loader's edge hygiene, and
// the map UI — same one-definition rationale as footprintOf and friends.
// ---------------------------------------------------------------------

// The one string form an edge is ever stored or looked up by — a Pathways
// key. Also what makes drawing the same edge twice idempotent: two calls
// with the same edge produce the same key, so writing it a second time
// overwrites rather than duplicates.
export function edgeKey(e: PathEdge): string {
  return `${e.orientation}:${e.row}:${e.col}`;
}

// The inverse of edgeKey, for reading a saved Pathways record back into
// edges (rendering, migration hygiene). Returns null for a key that isn't
// shaped like one this version ever wrote — a defensive read, not a parser
// for a format with variants.
export function parseEdgeKey(key: string): PathEdge | null {
  const parts = key.split(':');
  if (parts.length !== 3) return null;
  const [orientation, rowStr, colStr] = parts;
  if (orientation !== 'h' && orientation !== 'v') return null;
  const row = Number(rowStr);
  const col = Number(colStr);
  if (!Number.isInteger(row) || !Number.isInteger(col)) return null;
  return { orientation: orientation as EdgeOrientation, row, col };
}

// Is this edge one that actually exists on the CURRENT grid? A 'h' edge's
// row runs 0..HEIGHT inclusive (it's a line on the corner grid, one more
// than the tile grid has rows) and col runs 0..WIDTH-1; a 'v' edge is the
// mirror image. Grid dimensions only ever grow today, but this is what
// sanitizePathways (persistence.ts) leans on if that ever changes, the same
// way sanitizePlacements already leans on footprintFits.
export function isEdgeInBounds(e: PathEdge): boolean {
  if (!Number.isInteger(e.row) || !Number.isInteger(e.col)) return false;
  if (e.orientation === 'h') {
    return e.row >= 0 && e.row <= CAMPUS_GRID_HEIGHT && e.col >= 0 && e.col < CAMPUS_GRID_WIDTH;
  }
  return e.row >= 0 && e.row < CAMPUS_GRID_HEIGHT && e.col >= 0 && e.col <= CAMPUS_GRID_WIDTH;
}
