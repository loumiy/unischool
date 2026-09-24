import type {
  Buildable, FacilityType, Footprint, GameState, Placement, Placements, TileCoord,
} from './types';
import { CAMPUS_GRID_HEIGHT, CAMPUS_GRID_WIDTH, PLACEABLE_KINDS } from './types';
import { accessRefusal, hasOpenRing, reachCache, siteRefusal, type SiteState } from './reach';

// Pure placement rules for the campus map, shared by the reducer's
// PLACE_BUILDABLE, the save loader's placement hygiene and the map UI, so
// "can this go here" has one definition. PLACE_BUILDABLE builds and sites in
// one action: a placeable Buildable gets its s.placements entry the week it
// starts developing, so its tiles are reserved from week one (footprintIsClear
// reads every entry regardless of status). Courses never have a placement.

export function isPlaceableKind(t: Buildable): boolean {
  return PLACEABLE_KINDS.includes(t.kind);
}

// Footprints, in tiles at 9m per tile (the scale the map draws at, see
// components/campusScale.ts), sized from what each thing really is. Keyed on
// existing Buildable data (kind, facilityType, servesPopulation, tier,
// capacityBonus), not a new field. Pure geometry: size grants and costs
// nothing. A placement stores the footprint it was made with, so retuning
// these only affects buildings placed afterwards.

// Defensive fallback for a facilityType with no entry; every current type
// has one. Sized like a lab.
const DEFAULT_FACILITY_FOOTPRINT: Footprint = { w: 3, h: 3 };

// Size ladders, for things whose instances differ in scale (a 350-seat dining
// hall vs a 16,000-seat one), read off servesPopulation or capacityBonus.
// Rungs are listed largest first and matched on `min`; the last (min 0) is
// the floor.
//
// Anything with a front door has an odd width, so its centred door sits on a
// tile a path can reach rather than on a seam (exempt: open ground, the
// stadium and the village; see buildingSpec.ts's doorFamilyOf). Pinned by
// test/building-spec.test.ts.
interface SizeRung { min: number; fp: Footprint }

function rungFootprint(rungs: SizeRung[], size: number): Footprint {
  return (rungs.find((r) => size >= r.min) ?? rungs[rungs.length - 1]).fp;
}

// Housing, by bed count (campusData.ts's size classes). The village is a plot
// of houses, so it covers more ground than the taller tower.
const DORM_FOOTPRINTS: SizeRung[] = [
  { min: 5_000, fp: { w: 7, h: 7 } },    // residential tower: a small plan, very tall (see buildingMotifs' 'tower')
  { min: 1_500, fp: { w: 11, h: 10 } },  // village: a dozen small houses around shared green
  { min: 1_000, fp: { w: 11, h: 5 } },   // mid-game high-rise hall
  { min: 500, fp: { w: 9, h: 4 } },      // early four-storey hall
  { min: 0, fp: { w: 7, h: 3 } },        // the founding hall
];

// Facilities whose footprint steps with students served. Everything else has
// one fixed size in FACILITY_FOOTPRINTS.
const FACILITY_SIZE_LADDERS: Partial<Record<FacilityType, SizeRung[]>> = {
  // facilitiesData.ts's DINING_RUNGS. Bigger halls are multi-storey, so
  // density climbs with size.
  diningHall: [
    { min: 14_000, fp: { w: 11, h: 9 } },
    { min: 10_000, fp: { w: 11, h: 7 } },
    { min: 7_000, fp: { w: 9, h: 6 } },
    { min: 4_000, fp: { w: 7, h: 6 } },
    { min: 2_500, fp: { w: 7, h: 5 } },
    { min: 1_200, fp: { w: 5, h: 4 } },
    { min: 700, fp: { w: 5, h: 3 } },
    { min: 0, fp: { w: 3, h: 3 } },
  ],
  healthCenter: [
    { min: 20_000, fp: { w: 11, h: 11 } }, // University Hospital — the largest BUILDING on campus
    { min: 4_000, fp: { w: 5, h: 5 } },    // University Clinic
    { min: 0, fp: { w: 3, h: 3 } },        // Health & Counseling Center
  ],
  // Renovating the general library adds storeys, not ground
  // (facilitiesData.ts's nextLibraryFloor).
  library: [
    { min: 2_000, fp: { w: 9, h: 6 } },
    { min: 0, fp: { w: 7, h: 5 } },
  ],
  studentCenter: [
    { min: 2_000, fp: { w: 7, h: 5 } },    // the Student Union Expansion
    { min: 0, fp: { w: 5, h: 4 } },
  ],
  // Covers both the Recreation Center and the Athletics Complex capstone.
  recCenter: [
    { min: 2_000, fp: { w: 7, h: 5 } },
    { min: 0, fp: { w: 5, h: 4 } },
  ],
};

// The quad is keyed on `tier`: it has no servesPopulation to read.
const QUAD_FOOTPRINTS: SizeRung[] = [
  { min: 2, fp: { w: 13, h: 13 } },  // Grand Quad & Gardens
  { min: 0, fp: { w: 9, h: 9 } },    // Campus Quad
];

// Academic halls: about 63m by 45m, rectangular so rotation matters, and odd
// width for the door (see above).
const SCHOOL_BUILDING_FOOTPRINT: Footprint = { w: 7, h: 5 };

// Per facility type, for everything not on a ladder.
const FACILITY_FOOTPRINTS: Partial<Record<FacilityType, Footprint>> = {
  lab: { w: 5, h: 3 },           // a teaching/research lab building — one per lab-gated major
  grocery: { w: 5, h: 4 },       // a full supermarket, not a corner shop
  // Square, so its door sits on a tile either way it is turned.
  gym: { w: 5, h: 5 },
  tennisCourts: { w: 12, h: 4 }, // six courts in a row, which is ~110m by 36m — open ground, no door to centre
  pool: { w: 7, h: 4 },          // a 50m pool and its deck
  performingArtsCenter: { w: 9, h: 7 },
  artGallery: { w: 5, h: 3 },

  // Varsity venues, sized from the real thing. The field holds a 400m track
  // (176m by 92m, see groundMarkings.tsx) with a 105m by 68m pitch inside and
  // room for a stand. The football stadium is the largest footprint in the game.
  athleticsField: { w: 22, h: 13 },
  athleticsArena: { w: 11, h: 9 },        // ~100m by 80m, the footprint of a real arena bowl
  athleticsDiamond: { w: 14, h: 14 },     // ~125m, a real outfield being ~120m to the fence
  athleticsNatatorium: { w: 7, h: 5 },    // a 50m competition pool, its deck and its stand
  footballStadium: { w: 24, h: 20 },      // ~220m by 180m: the largest venue short of the championship stadium (Plan 33)
  fieldHouse: { w: 9, h: 6 },             // an indoor training floor and the rooms around it
};

// The grand landmarks, each its own shape: a tower's square base, a
// rotunda, and an arch across a way.
const LANDMARK_FOOTPRINTS: Record<string, Footprint> = {
  'LANDMARK-CAMPANILE': { w: 5, h: 5 },
  'LANDMARK-DOME': { w: 9, h: 9 },
  'LANDMARK-GATE': { w: 9, h: 3 },
  // The small landmarks and amenities (Plan 26).
  'AMENITY-STATUE': { w: 2, h: 2 },
  'AMENITY-FOUNTAIN': { w: 3, h: 3 },
  'AMENITY-GARDEN': { w: 6, h: 6 },
  'AMENITY-CHAPEL': { w: 5, h: 3 },
  'AMENITY-BELLTOWER': { w: 3, h: 3 },
  // The capital projects (Plan 33): larger than anything else of their kind.
  'PROJ-LAWN': { w: 16, h: 12 },
  'PROJ-ARTS': { w: 11, h: 9 },
  'PROJ-RESEARCH-PARK': { w: 13, h: 8 },
  'PROJ-STADIUM': { w: 28, h: 24 },     // the real one: larger than the football stadium
  'PROJ-MEDICAL': { w: 13, h: 9 },
  'PROJ-GRADUATE': { w: 11, h: 9 },
  'PROJ-INSTITUTE': { w: 9, h: 7 },
  'PROJ-MUSEUM': { w: 11, h: 8 },
  'PROJ-COMMONS': { w: 11, h: 8 },
};

export function footprintOf(t: Buildable): Footprint {
  if (t.facilityType === 'landmark' || t.facilityType === 'amenity' || t.facilityType === 'project') return LANDMARK_FOOTPRINTS[t.id] ?? DEFAULT_FACILITY_FOOTPRINT;
  if (t.kind === 'building') return SCHOOL_BUILDING_FOOTPRINT;
  if (t.kind === 'dorm') return rungFootprint(DORM_FOOTPRINTS, t.effects?.capacityBonus ?? 0);
  if (t.kind === 'facility' && t.facilityType) {
    if (t.facilityType === 'quad') return rungFootprint(QUAD_FOOTPRINTS, t.tier ?? 1);
    const ladder = FACILITY_SIZE_LADDERS[t.facilityType];
    if (ladder) return rungFootprint(ladder, t.effects?.servesPopulation ?? 0);
    return FACILITY_FOOTPRINTS[t.facilityType] ?? DEFAULT_FACILITY_FOOTPRINT;
  }
  return DEFAULT_FACILITY_FOOTPRINT;
}

// Rotation swaps a footprint's w and h (CampusMap.tsx's 'R' control). There
// is no orientation field: the swapped footprint is what PLACE_BUILDABLE
// stores in `placements`.

// A square footprint looks the same rotated, so offer no control for it.
export function canRotate(fp: Footprint): boolean {
  return fp.w !== fp.h;
}

export function rotateFootprint(fp: Footprint): Footprint {
  return { w: fp.h, h: fp.w };
}

// The footprint being sited now: the base footprint, swapped if rotated.
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

// The road: the parcel's last ROAD_DEPTH rows, along its south edge. Fixed
// terrain, not state: nothing is built, paved or planted on it, and it is
// where every walk onto the campus starts (reach.ts).
export const ROAD_DEPTH = 2;
export const ROAD_FIRST_ROW = CAMPUS_GRID_HEIGHT - ROAD_DEPTH;

export function isRoadTile(row: number, col: number): boolean {
  return isInBounds(row, col) && row >= ROAD_FIRST_ROW;
}

// A tile a building, a path or a tree could stand on: on the grid, off the road.
export function isLand(row: number, col: number): boolean {
  return isInBounds(row, col) && row < ROAD_FIRST_ROW;
}

// The whole footprint must fit on the land, not just its anchor tile.
export function footprintFits(row: number, col: number, fp: Footprint): boolean {
  return Number.isInteger(fp.w) && Number.isInteger(fp.h) && fp.w >= 1 && fp.h >= 1
    && isLand(row, col)
    && isLand(row + fp.h - 1, col + fp.w - 1);
}

// Every tile a placement covers, anchor first.
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

// The Buildable id covering a tile, or undefined. A linear scan is fine: at
// most one entry per placeable Buildable.
export function occupantAt(placements: Placements, row: number, col: number): string | undefined {
  for (const [id, p] of Object.entries(placements)) {
    if (placementCovers(p, row, col)) return id;
  }
  return undefined;
}

// Split out from canPlace so the map can preview a footprint.
export function footprintIsClear(placements: Placements, row: number, col: number, fp: Footprint): boolean {
  if (!footprintFits(row, col, fp)) return false;
  for (const tile of placementTiles({ row, col, ...fp })) {
    if (occupantAt(placements, tile.row, tile.col) !== undefined) return false;
  }
  return true;
}

// A legal placement target: a placeable Buildable that is 'available' (or
// built and awaiting a site), not yet sited, on a site reach.ts accepts:
// clear land, a way to it from the road, and nothing walled off. Callers
// combine it with canStartDevelopment for cost.
export function canPlace(s: GameState, t: Buildable, row: number, col: number, fp: Footprint): boolean {
  return isPlaceableKind(t)
    && (t.status === 'available' || t.status === 'done')
    && !(t.id in s.placements)
    && siteRefusal(s, t, row, col, fp) === null;
}

// Built but unsited. Only Founders Hall, in a guided founding, where placing
// it is the walkthrough's first step (state/opening.ts). Siting it is free.
export function awaitsSite(s: GameState, t: Buildable): boolean {
  return isPlaceableKind(t) && t.status === 'done' && !(t.id in s.placements);
}

// The grid's centre for a footprint: Founders Hall's spot in a headless
// founding or a skipped opening.
export function centredPlacement(fp: Footprint): Placement {
  return placementFor(
    Math.floor((CAMPUS_GRID_HEIGHT - fp.h) / 2),
    Math.floor((CAMPUS_GRID_WIDTH - fp.w) / 2),
    fp,
  );
}

// Deterministic first-fit scan, top-left to bottom-right, for a site
// reach.ts accepts. Not the player's flow: it is for Buildables nobody picks
// a spot for (founding Buildables, the headless sim, tools). It prefers a
// site with a clear tile all round, which leaves a walk between buildings and
// is cheap to accept, and falls back to any site the walk allows. Callers
// must still handle null.
export function firstFreeSpot(s: SiteState, t: Buildable, fp: Footprint): TileCoord | null {
  const cache = reachCache(s);
  for (const strict of [true, false]) {
    for (let row = 0; row + fp.h <= ROAD_FIRST_ROW; row++) {
      for (let col = 0; col + fp.w <= CAMPUS_GRID_WIDTH; col++) {
        if (strict && !hasOpenRing(cache, row, col, fp)) continue;
        if (!footprintIsClear(s.placements, row, col, fp)) continue;
        if (accessRefusal(s, t, row, col, fp, cache) === null) return { row, col };
      }
    }
  }
  return null;
}

// The placement PLACE_BUILDABLE writes, with the already-oriented footprint.
export function placementFor(row: number, col: number, fp: Footprint): Placement {
  return { row, col, ...fp };
}

// Pathways: whole-tile paths (see types.ts's Pathways), shared by the
// reducer's ADD_PATH_TILE/REMOVE_PATH_TILE, the save loader and the map UI.
// A path tile's bounds check is just isInBounds.

// The one key form a path tile is stored under; also makes redrawing a tile
// idempotent.
export function pathTileKey(t: TileCoord): string {
  return `${t.row},${t.col}`;
}

// Inverse of pathTileKey; null for a malformed key.
export function parsePathTileKey(key: string): TileCoord | null {
  const parts = key.split(',');
  if (parts.length !== 2) return null;
  const [rowStr, colStr] = parts;
  const row = Number(rowStr);
  const col = Number(colStr);
  if (!Number.isInteger(row) || !Number.isInteger(col)) return null;
  return { row, col };
}
