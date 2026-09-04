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
// PLACE_BUILDABLE is now the combined build-and-site action for placeable
// kinds (building/dorm/facility — see types.ts's PLACEABLE_KINDS): siting a
// location is no longer something that happens to an already-finished
// Buildable, it's how one starts. A placeable Buildable therefore gets its
// s.placements entry the SAME week it starts developing, not the week it
// finishes — that entry is the single source of truth for "where is this",
// exactly as s.developing stays the single source of truth for "how long
// left", for a placeable and a course alike (a course never has a
// placements entry, at any status, because it was never placeable). This is
// what makes an in-progress placeable renderable at its footprint and its
// tiles reserved from week one: footprintIsClear below reads every entry in
// s.placements regardless of the Buildable's status, so it already treats a
// developing placement as occupied, with no special case needed.
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

// Defensive fallback only. Every FacilityType below (diningHall included,
// via its own branch in footprintOf) has a real named entry, so this is
// never actually read against today's catalogue — it exists so a future
// facilityType added without a table entry renders as a small building
// rather than a 1x1 speck beside a 9x9 hall. Sized like the smallest real
// facility (a lab).
const DEFAULT_FACILITY_FOOTPRINT: Footprint = { w: 3, h: 3 };

// Academic halls are the campus landmarks — the biggest thing on the map,
// and the anchor every other footprint below is sized relative to (see the
// PR notes for the full table and the coverage math against
// CAMPUS_GRID_WIDTH/HEIGHT in types.ts).
const SCHOOL_BUILDING_FOOTPRINT: Footprint = { w: 9, h: 9 };
// A dorm is a long block: as wide as a hall, much shallower.
const DORM_FOOTPRINT: Footprint = { w: 9, h: 3 };

// Per facility type; anything absent falls back to DEFAULT_FACILITY_FOOTPRINT
// (see above — in practice never, every type has an entry).
// diningHall is deliberately absent here — its footprint isn't fixed by
// type, it's read off size (see DINING_MAJOR_FOOTPRINT below).
const FACILITY_FOOTPRINTS: Partial<Record<FacilityType, Footprint>> = {
  quad: { w: 7, h: 7 },          // open ground, second only to a hall among the squares
  library: { w: 7, h: 5 },       // broad reading rooms and stacks, not a tall narrow tower
  studentCenter: { w: 6, h: 5 },
  recCenter: { w: 6, h: 5 },
  healthCenter: { w: 5, h: 4 },
  lab: { w: 3, h: 3 },           // small and utilitarian — one per lab-gated major
  gym: { w: 5, h: 4 },
  tennisCourts: { w: 6, h: 3 },  // courts read long and narrow, not square
  pool: { w: 6, h: 4 },          // a real pool needs a footprint like a gym's, not a utility-sized box
  // performingArtsCenter is the landmark of this batch: a concert hall and
  // theater reads as a real building — grand, just a notch under a hall.
  performingArtsCenter: { w: 8, h: 7 },
  artGallery: { w: 4, h: 3 },    // small, but no longer a bare utility box

  // Varsity athletics venues (facilitiesData.ts): real competition venues,
  // sized accordingly. athleticsField is deliberately RECTANGULAR — a
  // soccer pitch, not a square lot — clearly wider than deep (5:3). The
  // football stadium is deliberately the largest footprint of any Buildable
  // in the game, bigger even than a 9x9 academic hall — the pinnacle venue
  // should read as one on the map, not just in its cost.
  athleticsField: { w: 10, h: 6 },
  athleticsArena: { w: 8, h: 6 },
  athleticsDiamond: { w: 7, h: 7 },
  athleticsNatatorium: { w: 6, h: 5 },
  footballStadium: { w: 12, h: 9 },
};

// Dining halls are the one facility type sized by how many students they
// serve rather than by type alone (see facilitiesData.ts's dining chain):
// a compact campus restaurant stays DINING_MINOR_FOOTPRINT, but once a hall
// serves enough people to be a real "major dining hall" it earns a footprint
// on the order of a student center. Reads effects.servesPopulation —
// already on the Buildable for satisfactionSystem.ts's sake — rather than
// adding a field of its own.
const DINING_MAJOR_FOOTPRINT: Footprint = { w: 7, h: 4 };
const DINING_MINOR_FOOTPRINT: Footprint = { w: 3, h: 3 }; // the founding hall / a compact campus restaurant
const DINING_MAJOR_FOOTPRINT_SERVES_THRESHOLD = 1_000;

export function footprintOf(t: Buildable): Footprint {
  if (t.kind === 'building') return SCHOOL_BUILDING_FOOTPRINT;
  if (t.kind === 'dorm') return DORM_FOOTPRINT;
  if (t.kind === 'facility' && t.facilityType === 'diningHall') {
    return (t.effects?.servesPopulation ?? 0) >= DINING_MAJOR_FOOTPRINT_SERVES_THRESHOLD
      ? DINING_MAJOR_FOOTPRINT
      : DINING_MINOR_FOOTPRINT;
  }
  if (t.kind === 'facility' && t.facilityType) {
    return FACILITY_FOOTPRINTS[t.facilityType] ?? DEFAULT_FACILITY_FOOTPRINT;
  }
  return DEFAULT_FACILITY_FOOTPRINT;
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

// The one definition of a legal placement TARGET: a placeable Buildable
// that hasn't started construction yet (status 'available') and isn't
// already sited, whose WHOLE footprint lands on empty, in-bounds tiles.
// `fp` is the footprint actually being sited — orientedFootprint(t, rotated)
// for a rotatable siting flow, or plain footprintOf(t) for anything that
// doesn't care about rotation — rather than always re-deriving the
// unrotated one, so a rotated footprint that no longer fits is refused
// exactly as an unrotated overflow already is.
//
// Deliberately geometry + status only — it says nothing about whether the
// school can actually AFFORD to start this Buildable (see
// techSystem.ts's canStartDevelopment, the one gate for that, which every
// call site here combines this with before actually committing a build —
// see the reducer's PLACE_BUILDABLE case). That split is the same one
// START_DEVELOPMENT and the old cosmetic-only PLACE_BUILDABLE always had
// between them; collapsing the two actions into one for placeable kinds
// didn't collapse the two CONCERNS, it just moved where they're combined.
export function canPlace(s: GameState, t: Buildable, row: number, col: number, fp: Footprint): boolean {
  return isPlaceableKind(t)
    && t.status === 'available'
    && !(t.id in s.placements)
    && footprintIsClear(s.placements, row, col, fp);
}

// A deterministic "first empty spot" scan: top-left to bottom-right, the
// first anchor whose footprint lands entirely on clear tiles. This is NOT
// part of the ordinary player-facing placement flow — an ordinary
// PLACE_BUILDABLE always names the row/col the player chose. It exists for
// the handful of places a Buildable needs a location nobody was ever asked
// to pick: the founding Buildables that start already 'done' (see
// actions.ts's createInitialState), a save migrated from the old two-step
// shape (see persistence.ts's v17 -> v18), and an authored event that
// manufactures a finished Buildable on the spot (eventData.ts's chapter
// house). The full catalogue covers under a third of the grid (see
// types.ts's CAMPUS_GRID_WIDTH/HEIGHT comment), so in every case this is
// actually used for today, room is always found; callers still handle a
// null result rather than assuming it.
export function firstFreeSpot(placements: Placements, fp: Footprint): TileCoord | null {
  for (let row = 0; row + fp.h <= CAMPUS_GRID_HEIGHT; row++) {
    for (let col = 0; col + fp.w <= CAMPUS_GRID_WIDTH; col++) {
      if (footprintIsClear(placements, row, col, fp)) return { row, col };
    }
  }
  return null;
}

// The placement PLACE_BUILDABLE writes: the anchor the player picked plus
// the footprint (already oriented — see orientedFootprint) it gets, frozen
// in at the moment of placement.
export function placementFor(row: number, col: number, fp: Footprint): Placement {
  return { row, col, ...fp };
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
