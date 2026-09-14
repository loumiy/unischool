import type { Buildable, FacilityType } from '../state/types';
import { STOREY, up } from './campusScale';

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
  hall: 6.0,
  residential: 4.6,
  village: 3.0,
};

export function ridgeOf(t: Buildable): number {
  return up(RIDGE_METRES[motifOf(t)] ?? 0);
}
