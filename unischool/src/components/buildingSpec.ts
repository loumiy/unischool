import type { Buildable, FacilityType } from '../state/types';
import { METRES_PER_TILE, STOREY, across, up } from './campusScale';

// WHAT a placed Buildable is, dimensionally: which architectural motif it
// wears, how many floors it has, and therefore how tall it stands.
//
// Deliberately free of JSX. This module answers questions about buildings;
// buildingMotifs.tsx turns those answers into polygons. The split is not
// tidiness — it is the half of the map that would SURVIVE a renderer change.
// A procedural building generator in three dimensions needs a footprint, a
// storey count, a storey height, a bay spacing, a door with real dimensions
// and a material; everything in that list either lives here already or is
// scheduled to, while nothing here knows what an SVG polygon is.
//
// Everything below is a RULE KEYED ON DATA THE BUILDABLE ALREADY CARRIES —
// kind, facilityType, effects.capacityBonus, effects.servesPopulation, tier,
// floorsAdded — exactly as campusMap.ts's footprintOf is. No new field on
// Buildable, no forked model, and a `course` Buildable still carries no map
// data of any kind.

export type Motif =
  | 'hall'         // academic halls: the campus's landmarks — a deep gabled roof
  | 'residential'  // dorms up to 1,000 beds: one long gable down a block, ranked windows
  | 'village'      // a residential village: many small houses on one plot, around green
  | 'tower'        // a residential tower: a small plan carried very high, over a retail podium
  | 'portico'      // library / performing arts / gallery: flat roof, rooflights
  | 'block'        // the university hospital: a big institutional mass, flat-roofed, rooftop plant
  | 'pavilion'     // student centre, dining, health, grocery: low, a unit or two
  | 'hangar'       // rec centre, gym, arena, natatorium: clear-span vault
  | 'works'        // labs: low, flat, crowded with rooftop plant
  | 'grounds'      // quad, field, courts, diamond, pool: markings, no mass
  | 'bowl';        // the football stadium: stands around a gridiron

const FACILITY_MOTIFS: Record<FacilityType, Motif> = {
  library: 'portico',
  studentCenter: 'pavilion',
  diningHall: 'pavilion',
  recCenter: 'hangar',
  healthCenter: 'pavilion',
  quad: 'grounds',
  lab: 'works',
  gym: 'hangar',
  tennisCourts: 'grounds',
  // The rec pool is an open-air deck; the natatorium is a roofed competition
  // venue. Same water, different building — the same distinction styles.css
  // already draws between their two blues.
  pool: 'grounds',
  performingArtsCenter: 'portico',
  artGallery: 'portico',
  athleticsField: 'grounds',
  athleticsArena: 'hangar',
  athleticsDiamond: 'grounds',
  athleticsNatatorium: 'hangar',
  footballStadium: 'bowl',
  grocery: 'pavilion',
};

// Research facilities that are not laboratories.
//
// Every facility that lets a school do scholarship carries facilityType 'lab',
// because that string is the GATE — techData.ts, researchData.ts and the
// Research tab all read it to decide what can host work. Four of them are not
// labs in any other sense: an institute with archives, a studio with sound
// stages, a computing centre, a behavioural lab suite. Drawn on the map they
// were all the same low industrial shed.
//
// Keyed by id rather than given facilityTypes of their own precisely so the
// gate stays one string. Adding four new types would mean widening every
// `=== 'lab'` test in three modules to keep one building from looking wrong,
// which is a lot of load-bearing code touched for a roof. This is the same
// shape as the health chain's split below: one facilityType, more than one
// building.
const RESEARCH_FACILITY_MOTIFS: Partial<Record<string, Motif>> = {
  // Archives and reading rooms — the library's own language.
  'LAB-HIST': 'portico',
  // Sound stages are clear-span volumes, which is what a hangar is.
  'LAB-FILM': 'hangar',
  // A compute cluster is an institutional mass with plant on the roof.
  'LAB-COMP': 'block',
  // Behavioural labs and simulation suites: a couple of rooms, not a works.
  'LAB-ECON': 'pavilion',
};

// Bed counts at which housing stops being a hall, and the serve count at which
// the health chain stops being a clinic. The same numbers campusMap.ts's
// DORM_FOOTPRINTS and FACILITY_SIZE_LADDERS step their footprints on, read off
// the same fields — so a village gets a village's plot AND a village's motif
// AND a village's storeys from one fact about the building, with no third
// place to keep in step. Kept as literals rather than imported: campusMap.ts
// is placement geometry and this is drawing, and neither should have to import
// the other to agree about what 5,000 beds looks like.
const DORM_VILLAGE_MIN_BEDS = 1_500;
const DORM_TOWER_MIN_BEDS = 5_000;
const HOSPITAL_MIN_SERVES = 20_000;
const CLINIC_MIN_SERVES = 4_000;
const RESEARCH_LIBRARY_MIN_SERVES = 2_000;
const STUDENT_CENTRE_EXPANDED_MIN_SERVES = 2_000;

export function motifOf(t: Buildable): Motif {
  if (t.kind === 'building') return 'hall';
  if (t.kind === 'dorm') {
    const beds = t.effects?.capacityBonus ?? 0;
    if (beds >= DORM_TOWER_MIN_BEDS) return 'tower';
    if (beds >= DORM_VILLAGE_MIN_BEDS) return 'village';
    return 'residential';
  }
  if (t.kind === 'facility' && t.facilityType) {
    const research = RESEARCH_FACILITY_MOTIFS[t.id];
    if (research) return research;
    // The health chain is three different institutions, not one building
    // relabelled twice (see facilitiesData.ts): a counselling centre and a
    // clinic are pavilions, a teaching hospital is not.
    if (t.facilityType === 'healthCenter' && (t.effects?.servesPopulation ?? 0) >= HOSPITAL_MIN_SERVES) return 'block';
    return FACILITY_MOTIFS[t.facilityType] ?? 'pavilion';
  }
  return 'pavilion';
}

// ---------------------------------------------------------------------
// STOREYS. The one number a building's height is allowed to come from.
//
// Height used to be an absolute per-motif constant and the number of window
// ranks a separate per-motif constant, with no arithmetic connecting them. So
// a storey was 6.1 m in a residential tower, 13.1 m in an academic hall and
// 26.3 m in a gym — which is the whole of "the height of buildings and the
// number of floors it has don't seem to be proportional", and it was not a
// tuning problem, it was a missing equation.
//
// The equation is `wallHeightOf = storeysOf * STOREY` and
// `windowRanksOf = storeysOf`. Both are below, both derive from this one
// function, and that is what makes the two impossible to disagree again.
//
// A ladder reads a capacity off the Buildable and maps it onto a floor count,
// exactly as campusMap.ts maps the same capacity onto ground. Between the two,
// a chain's capacity jumps are visible on the map twice over: a bigger rung
// covers more ground AND stands taller, instead of being the same block with a
// bigger number in its tooltip.
// ---------------------------------------------------------------------

// Storeys added after the fact. The library is renovated by adding FLOORS to
// the building already standing rather than by siting a second one (see
// facilitiesData's nextLibraryFloor and the reducer's RENOVATE_LIBRARY) — the
// one upgrade in the game whose whole point is that the same building gets
// bigger.
//
// This used to add 17 units per floor to a library whose own storeys were 34
// units tall, so a floor the player paid for arrived at half the height of the
// floors beside it. Now there is only one storey height on the map and this
// adds one of those, so the renovation reads as the extra floor it is.
//
// Read generically off Buildable.floorsAdded rather than keyed to the library,
// so anything else that ever gains floors gets the same treatment without
// another branch here.
function addedFloors(t: Buildable): number {
  return Math.max(0, t.floorsAdded ?? 0);
}

// The two professional schools (Medicine, Law) stand a storey taller than an
// undergraduate school building, the same way they cost a rung more and cover
// a rung more ground — identified by `graduateProgram`, which is set on
// exactly those two buildings and on nothing else of kind 'building'.
const ACADEMIC_HALL_STOREYS = 4;
const PROFESSIONAL_SCHOOL_STOREYS = 5;

// A residential tower is a shaft on a retail podium, and the two are counted
// separately because they are drawn separately (see buildingMotifs' 'tower').
export const TOWER_PODIUM_STOREYS = 2;
const TOWER_SHAFT_STOREYS = 12;

function dormStoreys(beds: number): number {
  if (beds >= DORM_TOWER_MIN_BEDS) return TOWER_PODIUM_STOREYS + TOWER_SHAFT_STOREYS;
  // A village is a plot of small houses, so its storey count is one HOUSE's.
  if (beds >= DORM_VILLAGE_MIN_BEDS) return 2;
  if (beds >= 1_000) return 6;   // the mid-game high-rise hall
  if (beds >= 500) return 4;     // "a four-storey residence hall" — campusData.ts says so, and now it is
  return 3;                      // the founding hall: modest, and reads it
}

function facilityStoreys(t: Buildable): number {
  const serves = t.effects?.servesPopulation ?? 0;
  switch (t.facilityType) {
    case 'library':
      return serves >= RESEARCH_LIBRARY_MIN_SERVES ? 4 : 3;
    case 'performingArtsCenter': return 3;
    case 'artGallery': return 2;
    case 'healthCenter':
      if (serves >= HOSPITAL_MIN_SERVES) return 8;   // the teaching hospital: the tallest thing that isn't a tower
      if (serves >= CLINIC_MIN_SERVES) return 3;
      return 2;
    case 'diningHall':
      if (serves >= 10_000) return 3;
      if (serves >= 2_500) return 2;
      return 1;                                      // the founding campus restaurant
    case 'studentCenter':
      return serves >= STUDENT_CENTRE_EXPANDED_MIN_SERVES ? 3 : 2;
    case 'grocery': return 1;                        // a supermarket is one storey, and looks it
    case 'lab': return 2;
    default: return 2;
  }
}

// How many floors this building has. Zero means it HAS no floors — open ground
// with nothing standing on it, or a clear-span volume whose height comes from
// CLEAR_SPAN_METRES below instead. A gym does not have storeys, and pretending
// it had one is how it ended up carrying the tallest windows on campus.
export function storeysOf(t: Buildable): number {
  const motif = motifOf(t);
  if (motif === 'grounds' || motif === 'hangar' || motif === 'bowl') return 0;
  if (motif === 'tower') return dormStoreys(t.effects?.capacityBonus ?? 0);
  if (t.kind === 'building') {
    return (t.graduateProgram ? PROFESSIONAL_SCHOOL_STOREYS : ACADEMIC_HALL_STOREYS) + addedFloors(t);
  }
  if (t.kind === 'dorm') return dormStoreys(t.effects?.capacityBonus ?? 0) + addedFloors(t);
  if (t.kind === 'facility') return facilityStoreys(t) + addedFloors(t);
  return 2;
}

// The two motifs that have a height but no floors, in metres.
//
// A sports hall, a pool hall and a sound stage are ONE volume tall enough to
// throw a ball across — about two and a half storeys — and a stadium's stands
// climb to a rim well above that. Stated in metres like everything else here,
// so they re-foreshorten with the rest of the campus if the camera ever tilts.
const CLEAR_SPAN_METRES: Partial<Record<Motif, number>> = {
  hangar: 10,
  bowl: 16,
};

// How tall this building's WALLS stand, in screen units — the mass, before any
// roof rises off it.
export function wallHeightOf(t: Buildable): number {
  const motif = motifOf(t);
  if (motif === 'grounds') return 0;
  const storeys = storeysOf(t);
  if (storeys > 0) return storeys * STOREY;
  return up(CLEAR_SPAN_METRES[motif] ?? 0);
}

// How many ranks of windows go on those walls. Equal to the storey count by
// construction — that is the whole point — except on a clear-span volume,
// which gets a single continuous band of glazing rather than ranks, because
// that is what actually lights one.
export function windowRanksOf(t: Buildable): number {
  const storeys = storeysOf(t);
  return storeys > 0 ? storeys : 1;
}

// How far a pitched roof's ridge rises above the eaves, in metres. Everything
// not listed is flat-roofed, which is what those buildings actually are.
const RIDGE_METRES: Partial<Record<Motif, number>> = {
  // Shallow, because an academic hall's roof is a HIP set back behind a
  // parapet, not a barn gable. The 6.0 m this carried was a ridge deeper than
  // a storey and a half, which is what made the campus's landmarks read as
  // sheds with windows.
  hall: 2.2,
  residential: 4.6,
  village: 3.0,
};

export function ridgeOf(t: Buildable): number {
  return up(RIDGE_METRES[motifOf(t)] ?? 0);
}

// ---------------------------------------------------------------------
// BAYS AND WINDOWS. The second half of what "proportional" asks for.
//
// Windows used to be a COUNT per motif — eight along a wall, whatever that
// wall's length. A window's width was therefore the wall's length divided by
// eight, which made it depend on the building rather than on the window. The
// two visible walls of one residence hall came out 5.94 m and 2.64 m wide, and
// rotating the building (which swaps w and h) resized every window on it.
// Heights were the same mistake on the other axis: a fraction of the wall, so
// a single-storey supermarket carried an 8.66 m pane and a residential tower a
// 2.68 m one.
//
// A window is a fixed real size. A wall gets as many BAYS as it has room for,
// and the same window goes in every one of them — on both walls of a building,
// on every building, at every footprint, rotated or not.
// ---------------------------------------------------------------------

// One structural bay. Two per tile at 9 m, which puts sixteen bays on the
// eight-tile facade of an academic hall — the bay count the building these
// motifs are drawn from actually has.
export const BAY_METRES = 4.5;

// The window itself. Tall and narrow — a sash window in a masonry wall, which
// is what most of this campus is built of, and the proportion the reference
// building's windows actually have: roughly one to one and three quarters,
// filling about a third of its bay. An earlier pass had these nearly square at
// 1.8 x 2.2, which read as punched holes rather than as windows.
const WINDOW_W_METRES = 1.5;
const WINDOW_H_METRES = 2.4;
const SILL_METRES = 0.85;

// The two families that are glazed rather than punched — a curtain-walled
// tower shaft and a hospital's ribbon windows. They get a WIDER window in the
// SAME bay, so they read as glassier without reading as a different scale. One
// dimension varies across the whole campus, and this is it.
const WIDE_WINDOW_W_METRES = 2.8;
const WIDE_WINDOW_MOTIFS: Motif[] = ['tower', 'block'];

// A clerestory's head sits this far below the eaves. A clear-span volume is
// lit from high up rather than through ranks (see windowRanksOf), because
// that is what actually lights a sports hall or a pool.
const CLERESTORY_HEAD_DROP_METRES = 1.4;

export const WINDOW_HEIGHT = up(WINDOW_H_METRES);
export const SILL_HEIGHT = up(SILL_METRES);

// How thick the band at each floor line is. A string course this size is what
// gives a multi-storey facade its horizontal structure, and it is the part
// that still reads when the panes themselves are a few pixels across.
export const FLOOR_COURSE = up(0.42);

// How many bays fit along a wall of this many tiles. At least one, so a
// footprint smaller than a single bay still gets a window rather than none.
export function baysAcross(spanTiles: number): number {
  return Math.max(1, Math.round((spanTiles * METRES_PER_TILE) / BAY_METRES));
}

// A window's width, in TILES — the unit a wall span is already measured in, so
// the caller needs no conversion of its own.
export function windowWidthOf(t: Buildable): number {
  return across(WIDE_WINDOW_MOTIFS.includes(motifOf(t)) ? WIDE_WINDOW_W_METRES : WINDOW_W_METRES);
}

// The sill height of each rank, in screen units above the building's base.
// One entry per storey, each one storey above the last — so a window's height
// above its own floor is the same on the ground floor and the eighth.
export function rankSills(ranks: number): number[] {
  return Array.from({ length: Math.max(0, ranks) }, (_, i) => i * STOREY + SILL_HEIGHT);
}

// A clear-span volume's single band, hung from the eaves rather than stacked
// from the ground.
export function clerestorySill(wallHeight: number): number {
  return Math.max(0, wallHeight - up(CLERESTORY_HEAD_DROP_METRES) - WINDOW_HEIGHT);
}

// Where the floor lines fall, in screen units above the base — one band per
// storey boundary, so a four-storey building shows three. Empty for a
// clear-span volume, which has no floors to mark.
export function floorLinesOf(t: Buildable): number[] {
  const storeys = storeysOf(t);
  return Array.from({ length: Math.max(0, storeys - 1) }, (_, i) => (i + 1) * STOREY);
}

// ---------------------------------------------------------------------
// DOORS. Six families, each a fixed real size.
//
// There used to be one door — a single parametric shape handed a width and a
// height and stretched into whatever box it was given. The boxes were a tile
// of width (so the same on every wall, which was right) and a FRACTION OF THE
// WALL'S HEIGHT (so a hall's door was 18.11 m tall, a lab's 7.03 m, and a
// retail podium's 0.88 m). Aspect ratios ran from 0.83 to 27.38. "The same
// shape stretched different ways" was not an impression; it was literally the
// implementation.
//
// A door is now a member of a family, and a family has one real width and one
// real height. Four of the six sit between 0.62 and 0.89 — one family of
// proportions, which is what a door looks like. The two that are wide are wide
// because the things they are, a shop window and an ambulance bay, are wide.
// ---------------------------------------------------------------------

export type DoorFamily = 'formal' | 'civic' | 'residential' | 'service' | 'shopfront' | 'canopy';

interface DoorSpec {
  widthMetres: number;
  heightMetres: number;
  // How far the threshold stands above grade, and how many treads climb to it.
  // A formal entrance is approached up a broad flight — it is the most
  // recognisable thing about the front of an academic building, and the old
  // three-pixel sliver of a step was the least.
  thresholdMetres: number;
  treads: number;
}

const DOOR_FAMILIES: Record<DoorFamily, DoorSpec> = {
  // The formal portal: double height, reaching into the first floor, which is
  // what an academic entrance IS. Up a flight of five.
  formal: { widthMetres: 4.0, heightMetres: 5.4, thresholdMetres: 1.4, treads: 5 },
  // Sized to fit a SINGLE STOREY, because its smallest user is one: the
  // founding campus restaurant is one storey of 3.9 m, and an earlier pass
  // gave this family 3.6 m of opening over a 0.45 m threshold — 4.05 m, taller
  // than the wall it was drawn on, so Door bailed and that building rendered
  // with no way in at all. Every family has to fit its shortest user; this is
  // the only one where that bites, and test/building-spec.test.ts now checks
  // all six against every building that uses them.
  civic: { widthMetres: 2.9, heightMetres: 3.2, thresholdMetres: 0.35, treads: 2 },
  residential: { widthMetres: 2.2, heightMetres: 3.0, thresholdMetres: 0.3, treads: 1 },
  service: { widthMetres: 1.6, heightMetres: 2.6, thresholdMetres: 0.15, treads: 1 },
  // A glazed bay, not a door with windows beside it.
  shopfront: { widthMetres: 6.0, heightMetres: 3.4, thresholdMetres: 0, treads: 0 },
  // An ambulance entrance drives straight in, so there is nothing to climb.
  canopy: { widthMetres: 8.0, heightMetres: 4.2, thresholdMetres: 0, treads: 0 },
};

// Which family a building's entrance belongs to, or null for something with no
// single front door — open ground, a stadium, and a village, whose houses each
// have their own (drawn by the motif).
export function doorFamilyOf(t: Buildable): DoorFamily | null {
  const motif = motifOf(t);
  if (motif === 'grounds' || motif === 'bowl' || motif === 'village') return null;
  if (t.kind === 'building') return 'formal';
  if (t.kind === 'dorm') return motif === 'tower' ? 'shopfront' : 'residential';
  switch (t.facilityType) {
    // Every lab-gated building takes a service door whatever roof its id
    // earned it (see RESEARCH_FACILITY_MOTIFS): an institute and a compute
    // centre are still back-of-house buildings to walk into.
    case 'lab': return 'service';
    case 'library':
    case 'performingArtsCenter': return 'formal';
    case 'grocery': return 'shopfront';
    case 'healthCenter':
      return (t.effects?.servesPopulation ?? 0) >= HOSPITAL_MIN_SERVES ? 'canopy' : 'civic';
    default: return 'civic';
  }
}

// A door's width in TILES and its height, threshold and tread count in screen
// units — the units the wall it goes on is already measured in.
export interface DoorDimensions {
  family: DoorFamily;
  widthTiles: number;
  height: number;
  threshold: number;
  treads: number;
}

export function doorOf(t: Buildable): DoorDimensions | null {
  const family = doorFamilyOf(t);
  if (!family) return null;
  return doorDimensions(family);
}

export function doorDimensions(family: DoorFamily): DoorDimensions {
  const d = DOOR_FAMILIES[family];
  return {
    family,
    widthTiles: across(d.widthMetres),
    height: up(d.heightMetres),
    threshold: up(d.thresholdMetres),
    treads: d.treads,
  };
}

// How deep one tread is, and how far the flight stands proud of the opening on
// each side. Both real measures, so a stair is the same stair everywhere.
export const TREAD_DEPTH = across(0.42);
export const STEP_OVERHANG = across(0.8);

// ---------------------------------------------------------------------
// THE ACADEMIC HALL'S VOCABULARY.
//
// Every element of the reference building, as a real dimension. They belong
// here rather than in the drawing because they are what the building IS: a
// three-dimensional renderer would need this exact list and these exact
// numbers, and would throw away only the polygons.
//
// All of it goes on the shared `hall` motif, which is what makes "the other
// academic buildings in the same style, without the spire" one flag rather
// than a second motif. Only the clock tower is singular.
// ---------------------------------------------------------------------

// The stone base the brick stands on, and the band that caps it at the eaves.
// Deliberately shallower than a ground-floor sill (SILL_METRES above): a base
// course runs UNDER the windows, and at 1.15 m against a 0.85 m sill it ate
// the bottom of every ground-floor opening on the campus's landmarks.
export const PLINTH = up(0.7);
export const CORNICE = up(1.05);
// The wall carries on a little above the cornice, so the roof sits BEHIND
// something rather than springing straight off the top of the windows.
export const PARAPET = up(0.85);

// The centre bay projects from the middle of each front, rises past the
// cornice and is capped with a pediment. This is what makes an entrance read
// as the front of a building rather than as a hole in a long wall.
export const PAVILION_DEPTH = across(1.9);
export const PAVILION_BAYS = 4;
export const PAVILION_RISE = up(2.1);
export const PEDIMENT_RISE = up(2.9);

// THE PORTICO. A rank of columns standing clear of the centre bay, carrying an
// entablature across their heads — the thing that makes an academic entrance
// read as one from across a lawn, and the most recognisable feature of the
// reference building's front after the tower itself.
//
// Four columns (a tetrastyle portico), because at this scale six read as a
// fence and two do not read as a portico at all. They are cut from the same
// limestone as the clock tower, not from the wall behind them.
export const PORTICO_COLUMNS = 4;
export const PORTICO_HEIGHT = up(10.4);         // up to the second-floor line, as in the reference
export const PORTICO_COLUMN_PLAN = across(1.4);  // a column is round; this is its square
export const PORTICO_STANDOFF = across(2.2);     // how far clear of the pavilion face it stands
export const ENTABLATURE = up(1.5);

// Raised brick blocks closing each end of the roofline.
export const END_PAVILION_PLAN = across(12.0);
export const END_PAVILION_RISE = up(1.9);
// How far into the plan a raised end reaches — enough to read as a section of
// wall carried up, not as a slab balanced on the roof.
export const END_PAVILION_DEPTH = across(4.0);
// The stone coping that caps a raised end, and how far it oversails the brick
// it sits on. A coping always projects — that overhang is what stops the top
// of a wall reading as a cut edge.
export const COPING = up(0.45);
export const COPING_OVERHANG = across(0.35);

// ---------------------------------------------------------------------
// THE CLOCK TOWER. Founders Hall only.
//
// Keyed by id, the same way RESEARCH_FACILITY_MOTIFS gives four lab-gated
// buildings four different roofs without widening the `=== 'lab'` gate that
// three other modules read. The id is techData's exported GENED_BUILDING_ID;
// spelled as a literal here rather than imported because this module is
// drawing geometry and that one is course content, and neither should have to
// depend on the other to agree about which building is the founding one.
// ---------------------------------------------------------------------
const CLOCK_TOWER_ID = 'BLDG-GENSTUDIES';

export function hasClockTower(t: Buildable): boolean {
  return t.kind === 'building' && t.id === CLOCK_TOWER_ID;
}

// The tower, bottom to top: a square brick-and-stone base rising out of the
// roof, a shorter colonnaded drum set back from it, a dome, and a finial.
export const TOWER_BASE_PLAN = across(11);
export const TOWER_BASE_RISE = up(12.5);
export const TOWER_DRUM_PLAN = across(8);
export const TOWER_DRUM_RISE = up(3.6);
export const TOWER_DOME_RISE = up(5.2);
export const TOWER_FINIAL_RISE = up(3.0);
// The clock face. A real radius, converted separately for the two axes of a
// wall's own coordinates — across the wall it is a distance in tiles, up it a
// distance in screen units, and they are not the same number.
const CLOCK_RADIUS_METRES = 2.1;
export const CLOCK_RADIUS = up(CLOCK_RADIUS_METRES);
export const CLOCK_RADIUS_TILES = across(CLOCK_RADIUS_METRES);

// ---------------------------------------------------------------------
// MATERIALS. What a building is MADE of, rather than what colour it was
// assigned.
//
// The campus used to carry twenty-two tints: one per facility type plus four
// for housing plus a landmark gold, each chosen against nothing in particular.
// Of the 253 pairs those 23 form, 40 sit within an RGB distance of 22 — the
// library and the gym are 4.7 apart, a difference no player will ever see —
// and not one of them is a material. Twenty-two near-neighbours is not a
// palette, it is a colour chart, and it is why a campus of well-drawn
// buildings still did not read as one place.
//
// Five materials instead, each with its own WALL and its own ROOF. That
// second field is the change that matters most on screen: roof tones used to
// be derived from the wall tint, so an academic hall was a gold box under a
// gold roof and the two read as one mass. Slate over brick is a building
// under a roof.
//
// The trim is shared by everything. A plinth, a cornice, a pediment and a
// window surround are the same limestone wherever they appear, which is what
// makes the vocabulary read as one vocabulary across a campus of five
// different walls.
// ---------------------------------------------------------------------

export interface Material {
  wall: string;
  roof: string;
}

// Slate and lead, on everything. A campus does not roof each building in a
// different colour, and the one place the map needs variety — which building
// is which — is answered by the walls.
const SLATE = '#5f6b5f';
// Flat roofs read lighter than pitched ones: you are looking at the deck
// rather than at a slope turned away from the light.
const DECK = '#7c8377';

const MATERIALS = {
  // The campus's default, and the reference building's own: warm red brick.
  brickRed: { wall: '#a2564a', roof: SLATE },
  // The support buildings — refectories, shops, the union. Buff brick reads
  // as the same family of construction at a lower key.
  brickBuff: { wall: '#bb9468', roof: SLATE },
  // The civic set: ashlar stone, for the buildings a campus puts its name on.
  limestone: { wall: '#d8cdb4', roof: DECK },
  // Rendered blockwork: labs, works, sheds. Deliberately the dullest wall on
  // the map, because that is what these buildings are.
  render: { wall: '#b0a992', roof: DECK },
  // Glass and steel, for the two things that are actually curtain-walled.
  curtain: { wall: '#93a9b4', roof: DECK },
} as const satisfies Record<string, Material>;

// The limestone every building's stonework is cut from, whatever its walls
// are made of — see the note above. Exported for the motifs' entrance steps,
// which are the one piece of trim drawn as a solid rather than as a band.
export const TRIM = '#efe9da';

// The gilding, and the only place it appears: the dome and finial of Founders
// Hall's clock tower. This is the campus's old BUILDING_TINT, which used to be
// the colour of all nine academic halls. It is not deleted, it is
// concentrated — a landmark reads as one because it is the single gilded
// thing in view, not because it is the ninth building painted gold.
export const GILT = '#c9a227';

// The clock tower is painted STONE, not brick — it is white in the reference
// photograph, and a white tower over a red building is most of what makes that
// building recognisable. Kept beside the trim it is cut from rather than given
// a material of its own, since nothing else on the campus is built of it.
export const TOWER_STONE = '#e4dcc8';

export function materialOf(t: Buildable): Material {
  if (t.kind === 'building') return MATERIALS.brickRed;
  if (t.kind === 'dorm') {
    return motifOf(t) === 'tower' ? MATERIALS.curtain : MATERIALS.brickRed;
  }
  switch (t.facilityType) {
    case 'library':
    case 'performingArtsCenter':
    case 'artGallery':
    case 'healthCenter':
      return MATERIALS.limestone;
    case 'diningHall':
    case 'grocery':
    case 'studentCenter':
      return MATERIALS.brickBuff;
    case 'athleticsNatatorium':
      return MATERIALS.curtain;
    case 'lab':
    case 'gym':
    case 'recCenter':
    case 'athleticsArena':
      return MATERIALS.render;
    // Open ground and the venues drawn as markings take a wall colour only so
    // their props (a stand, a fence, a fountain kerb) have something to shade
    // from; nothing of theirs is actually a wall.
    default:
      return MATERIALS.render;
  }
}

// Neighbouring residence halls should not be identical. The old tints gave
// housing four separate colours hashed off the id; that variety is worth
// keeping and a whole extra colour is not, so the SAME brick is nudged a few
// percent either way instead. A hall still differs from the one beside it,
// and both are still obviously brick.
const DORM_SHADE_STEPS = [0.94, 1.0, 1.06, 1.11];

export function wallShadeOf(t: Buildable): number {
  if (t.kind !== 'dorm') return 1;
  let h = 0;
  for (let i = 0; i < t.id.length; i++) h = (h * 31 + t.id.charCodeAt(i)) % 1000003;
  return DORM_SHADE_STEPS[h % DORM_SHADE_STEPS.length];
}
