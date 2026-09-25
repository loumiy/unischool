import type { Buildable, FacilityType, Vernacular } from '../state/types';
import { METRES_PER_TILE, STOREY, across, up } from './campusScale';
import { initialTech } from '../data/techData';
import { initialDorms } from '../data/campusData';
import { initialFacilities } from '../data/facilitiesData';

// What a placed Buildable is, dimensionally: its architectural motif, its
// story count and therefore its height. Free of JSX on purpose — this module
// answers questions about buildings and buildingMotifs.tsx turns the answers
// into polygons, so everything here would survive a renderer change. Every
// rule keys on data the Buildable already carries (kind, facilityType,
// effects, tier, floorsAdded), as campusMap.ts's footprintOf does.

export type Motif =
  | 'hall'         // academic halls: the campus's landmarks — a deep gabled roof
  | 'residential'  // dorms up to 1,000 beds: one long gable down a block, ranked windows
  | 'village'      // a residential village: many small houses on one plot, around green
  | 'tower'        // a residential tower: a small plan carried very high, over a retail podium
  | 'portico'      // library / performing arts / gallery: flat roof, rooflights
  | 'block'        // the university hospital: a big institutional mass, flat-roofed, rooftop plant
  | 'pavilion'     // student center, dining, health, grocery: low, a unit or two
  | 'hangar'       // rec center, gym, arena, natatorium: clear-span vault
  | 'works'        // labs: low, flat, crowded with rooftop plant
  | 'grounds'      // quad, field, courts, diamond, pool: markings, no mass
  | 'bowl'         // the football stadium: stands around a gridiron
  | 'landmark';    // a grand landmark: bespoke, built in stages (landmarks.tsx)

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
  // The rec pool is an open-air deck; the natatorium is a roofed venue.
  pool: 'grounds',
  artGallery: 'portico',
  athleticsField: 'grounds',
  athleticsArena: 'hangar',
  athleticsDiamond: 'grounds',
  athleticsNatatorium: 'hangar',
  footballStadium: 'bowl',
  fieldHouse: 'hangar',
  grocery: 'pavilion',
  landmark: 'landmark',
  amenity: 'grounds',
  project: 'block',
};

// Research facilities that are not laboratories. They keep facilityType 'lab'
// because that string is the research gate (techData.ts, researchData.ts and
// the Research tab read it), so they are restyled by id instead.
const RESEARCH_FACILITY_MOTIFS: Partial<Record<string, Motif>> = {
  'LAB-HIST': 'portico',
  'LAB-FILM': 'hangar',
  'LAB-COMP': 'block',
  'LAB-ECON': 'pavilion',
  // By discipline (Plan 25): the engineering test halls are clear-span
  // sheds, the neuroscience labs a clinical block.
  'LAB-CIVE': 'hangar',
  'LAB-MECH': 'hangar',
  'LAB-AERO': 'hangar',
  'LAB-NEUR': 'block',
  // The amenities (Plan 26): the bell tower is a small campanile, the chapel
  // a pavilion in stone; the rest are open ground with something on it.
  'AMENITY-BELLTOWER': 'landmark',
  'AMENITY-CHAPEL': 'pavilion',
  // The capital projects (Plan 33), each in the motif of what it is.
  'PROJ-ARTS': 'portico',
  'PROJ-RESEARCH-PARK': 'works',
  'PROJ-GRADUATE': 'residential',
  'PROJ-MUSEUM': 'portico',
  // The professional schools (Plan 51): a courthouse, and an office block.
  'PROJ-LAW': 'portico',
  'PROJ-BUSINESS': 'block',
};

// What a laboratory carries on its roof to say which science it is: an
// observatory's drum and dome for physics, a glasshouse for biology, a row of
// fume flues for chemistry.
export type LabFeature = 'observatory' | 'glasshouse' | 'flues';
const LAB_FEATURES: Partial<Record<string, LabFeature>> = {
  'LAB-PHYS': 'observatory',
  'LAB-BIOL': 'glasshouse',
  'LAB-CHEM': 'flues',
  'LAB-CHEN': 'flues',
};
export function labFeatureOf(t: Buildable): LabFeature | undefined {
  return LAB_FEATURES[t.id];
}

// Bed and serve thresholds at which a chain changes kind. Same numbers as
// campusMap.ts's DORM_FOOTPRINTS and FACILITY_SIZE_LADDERS, kept as literals so
// neither module imports the other; keep them in step.
const DORM_VILLAGE_MIN_BEDS = 1_500;
const DORM_TOWER_MIN_BEDS = 5_000;
const HOSPITAL_MIN_SERVES = 20_000;
const CLINIC_MIN_SERVES = 4_000;
const RESEARCH_LIBRARY_MIN_SERVES = 2_000;
const STUDENT_CENTRE_EXPANDED_MIN_SERVES = 2_000;

// A hall dedicated to one school is drawn as that school's signature
// building (Plan 25): a mixed hall is the generic gabled hall. The map's copy
// of the Buildable carries the school (campusLayout.ts); state never does.
export interface Signature { motif: Motif; material: keyof MaterialSet }
export const SCHOOL_SIGNATURES: Readonly<Record<string, Signature>> = {
  'Science': { motif: 'block', material: 'render' },
  'Engineering': { motif: 'works', material: 'render' },
  'Health Science': { motif: 'block', material: 'clinical' },
  'Computer Science': { motif: 'block', material: 'curtain' },
  'Arts & Media': { motif: 'portico', material: 'limestone' },
  'Business': { motif: 'portico', material: 'brickBuff' },
  'Social Sciences & Humanities': { motif: 'hall', material: 'limestone' },
};

export function signatureOf(t: Buildable): Signature | undefined {
  const school = (t as Buildable & { signature?: string }).signature;
  return school === undefined ? undefined : SCHOOL_SIGNATURES[school];
}

export function motifOf(t: Buildable): Motif {
  if (t.kind === 'building') return signatureOf(t)?.motif ?? 'hall';
  // A chapter house (eventData.ts) is a facility with no facilityType: a
  // small house, drawn as a one-story pavilion under its letters.
  if (t.chapterHouse) return 'pavilion';
  if (t.kind === 'dorm') {
    const beds = t.effects?.capacityBonus ?? 0;
    if (beds >= DORM_TOWER_MIN_BEDS) return 'tower';
    if (beds >= DORM_VILLAGE_MIN_BEDS) return 'village';
    return 'residential';
  }
  if (t.kind === 'facility' && t.facilityType) {
    const research = RESEARCH_FACILITY_MOTIFS[t.id];
    if (research) return research;
    // The health chain's teaching hospital is a block; the smaller rungs are pavilions.
    if (t.facilityType === 'healthCenter' && (t.effects?.servesPopulation ?? 0) >= HOSPITAL_MIN_SERVES) return 'block';
    return FACILITY_MOTIFS[t.facilityType] ?? 'pavilion';
  }
  return 'pavilion';
}

// Stories: the one number a building's height comes from.
// wallHeightOf = storeysOf * STOREY and windowRanksOf = storeysOf, so height
// and window ranks cannot disagree. A capacity ladder picks the floor count,
// as campusMap.ts's ladders pick the footprint.

// Stories added after the fact (the library renovation, see facilitiesData's
// nextLibraryFloor and the reducer's RENOVATE_LIBRARY). Read generically off
// floorsAdded so anything that gains floors gets the same treatment.
function addedFloors(t: Buildable): number {
  return Math.max(0, t.floorsAdded ?? 0);
}

// How many of those floors are not built yet. floorsAdded is bumped when the
// renovation starts, so storeysOf already counts the floor going up. At most
// one: a second renovation cannot start while the first is running.
export function floorsUnderConstruction(t: Buildable): number {
  return t.renovatingFrom !== undefined ? 1 : 0;
}

// Every academic hall stands four stories.
const ACADEMIC_HALL_STOREYS = 4;

// A residential tower is a shaft on a retail podium, counted separately
// because they are drawn separately (see buildingMotifs' 'tower').
export const TOWER_PODIUM_STOREYS = 2;
const TOWER_SHAFT_STOREYS = 12;

function dormStoreys(beds: number): number {
  if (beds >= DORM_TOWER_MIN_BEDS) return TOWER_PODIUM_STOREYS + TOWER_SHAFT_STOREYS;
  // A village is a plot of small houses, so its story count is one house's.
  if (beds >= DORM_VILLAGE_MIN_BEDS) return 2;
  if (beds >= 1_000) return 6;
  if (beds >= 500) return 4;     // campusData.ts describes a four-story residence hall
  return 3;
}

// The catalog's own entry for a Buildable, as it was first built: what its
// stories are read from. A library renovation or a dining hall's extension
// raises servesPopulation AND floorsAdded, so reading the live figure (as
// this did) counted the new floor twice, once by crossing a size rung and
// once as an added floor. Chapter houses are made at runtime and have none;
// they keep their own. Built once, on first use (as demolition.ts's
// templateOf).
let asBuiltById: Map<string, Buildable> | null = null;
function asBuilt(t: Buildable): Buildable {
  asBuiltById ??= new Map([...initialTech(), ...initialDorms(), ...initialFacilities()].map((x) => [x.id, x]));
  return asBuiltById.get(t.id) ?? t;
}

// A chapter house is a house: one story, the letters on a parapet over it
// (buildingMotifs.tsx's ChapterPediment).
const CHAPTER_HOUSE_STOREYS = 1;

function facilityStoreysOf(t: Buildable): number {
  return facilityStoreys(t.facilityType, asBuilt(t).effects?.servesPopulation ?? 0);
}

function facilityStoreys(facilityType: FacilityType | undefined, serves: number): number {
  switch (facilityType) {
    case 'library':
      return serves >= RESEARCH_LIBRARY_MIN_SERVES ? 4 : 3;
    case 'artGallery': return 2;
    case 'healthCenter':
      if (serves >= HOSPITAL_MIN_SERVES) return 8;
      if (serves >= CLINIC_MIN_SERVES) return 3;
      return 2;
    case 'diningHall':
      if (serves >= 10_000) return 3;
      if (serves >= 2_500) return 2;
      return 1;
    case 'studentCenter':
      return serves >= STUDENT_CENTRE_EXPANDED_MIN_SERVES ? 3 : 2;
    case 'grocery': return 1;
    case 'lab': return 2;
    default: return 2;
  }
}

// The capital projects (Plan 33, facilityType 'project'), each as tall as,
// and in the wall of, the building it is a grander version of. Unlisted
// ones are open ground or a stadium and have no stories.
interface ProjectSpec { storeys: number; material: keyof MaterialSet }
const PROJECT_SPECS: Partial<Record<string, ProjectSpec>> = {
  'PROJ-ARTS': { storeys: 3, material: 'limestone' },   // a concert hall's three storeys
  'PROJ-RESEARCH-PARK': { storeys: facilityStoreys('lab', 0), material: 'render' },
  // A quadrangle of rooms, drawn as a 600-bed residence hall (it adds no
  // beds: the game houses no graduate students).
  'PROJ-GRADUATE': { storeys: dormStoreys(600), material: 'brickDark' },
  'PROJ-MUSEUM': { storeys: facilityStoreys('artGallery', 0), material: 'limestone' },
  'PROJ-LAW': { storeys: 3, material: 'limestone' },
  'PROJ-BUSINESS': { storeys: 5, material: 'curtain' },
};

// How many floors this building has. Zero means open ground, or a clear-span
// volume whose height comes from CLEAR_SPAN_METRES instead.
export function storeysOf(t: Buildable): number {
  const motif = motifOf(t);
  if (motif === 'grounds' || motif === 'hangar' || motif === 'bowl' || motif === 'landmark') return 0;
  if (motif === 'tower') return dormStoreys(t.effects?.capacityBonus ?? 0);
  if (t.kind === 'building') {
    return ACADEMIC_HALL_STOREYS + addedFloors(t);
  }
  if (t.kind === 'dorm') return dormStoreys(t.effects?.capacityBonus ?? 0) + addedFloors(t);
  if (t.chapterHouse) return CHAPTER_HOUSE_STOREYS;
  if (t.facilityType === 'project') return (PROJECT_SPECS[t.id]?.storeys ?? facilityStoreys('project', 0)) + addedFloors(t);
  if (t.kind === 'facility') return facilityStoreysOf(t) + addedFloors(t);
  return 2;
}

// Height of the clear-span motifs, in meters: a sports hall is one volume
// about two and a half stories tall, and a stadium's rim is higher.
const CLEAR_SPAN_METRES: Partial<Record<Motif, number>> = {
  hangar: 10,
  bowl: 16,
};

// How tall the walls stand, in screen units, before any roof.
// The grand landmarks' full heights, in meters (landmarks.tsx draws them).
export const LANDMARK_HEIGHT_METRES: Record<string, number> = {
  'LANDMARK-CAMPANILE': 52,
  'LANDMARK-DOME': 34,
  'LANDMARK-GATE': 20,
  'AMENITY-BELLTOWER': 30,
};

export function wallHeightOf(t: Buildable): number {
  const motif = motifOf(t);
  if (motif === 'grounds') return 0;
  if (motif === 'landmark') return up(LANDMARK_HEIGHT_METRES[t.id] ?? 20);
  const storeys = storeysOf(t);
  if (storeys > 0) return storeys * STOREY;
  return up(CLEAR_SPAN_METRES[motif] ?? 0);
}

// Ranks of windows: one per story. A clear-span volume gets a single
// clerestory band instead.
export function windowRanksOf(t: Buildable): number {
  const storeys = storeysOf(t);
  return storeys > 0 ? storeys : 1;
}

// Ridge rise above the eaves, in meters. Unlisted motifs are flat-roofed.
const GEORGIAN_RIDGE_METRES: Partial<Record<Motif, number>> = {
  // Shallow: an academic hall's roof is a hip set behind a parapet, not a
  // barn gable.
  hall: 2.2,
  village: 3.0,
  pavilion: 2.0,
};

// A residence hall's ridge by story count: a three-story hall keeps a
// domestic pitch, taller halls get the academic halls' shallow hip.
function georgianResidentialRidgeMetres(storeys: number): number {
  if (storeys <= 3) return 4.2;
  if (storeys <= 5) return 2.4;
  return 2.2;
}

// Georgian's roof tables above are reached through the vernacular (see
// VERNACULARS below).
export function ridgeOf(t: Buildable, v: Vernacular): number {
  const roof = roofFor(v);
  const motif = motifOf(t);
  if (motif === 'residential') return up(roof.residentialRidgeMetres(storeysOf(t)));
  return up(roof.ridgeMetres[motif] ?? 0);
}

// Bays and windows. A window is a fixed real size; a wall gets as many bays as
// it has room for, and the same window goes in each, on every building,
// rotated or not.

// One structural bay: sixteen along an academic hall's eight-tile facade.
export const BAY_METRES = 4.5;

// A tall, narrow sash window, about a third of its bay.
const WINDOW_W_METRES = 1.5;
const WINDOW_H_METRES = 2.4;
const SILL_METRES = 0.85;

// Curtain-walled tower shafts and hospital ribbons get a wider window in the
// same bay: glassier without changing scale.
const WIDE_WINDOW_W_METRES = 2.8;
const WIDE_WINDOW_MOTIFS: Motif[] = ['tower', 'block'];

// A clerestory's head sits this far below the eaves.
const CLERESTORY_HEAD_DROP_METRES = 1.4;

export const WINDOW_HEIGHT = up(WINDOW_H_METRES);
export const SILL_HEIGHT = up(SILL_METRES);

// The band at each floor line; it still reads when panes are a few pixels.
export const FLOOR_COURSE = up(0.42);

// Bays along a wall of this many tiles. At least one, so tiny walls still get a window.
export function baysAcross(spanTiles: number): number {
  return Math.max(1, Math.round((spanTiles * METRES_PER_TILE) / BAY_METRES));
}

// A window's width, in tiles (the unit a wall span is measured in).
export function windowWidthOf(t: Buildable): number {
  return across(WIDE_WINDOW_MOTIFS.includes(motifOf(t)) ? WIDE_WINDOW_W_METRES : WINDOW_W_METRES);
}

// Each rank's sill height in screen units above the base, one per story.
export function rankSills(ranks: number): number[] {
  return Array.from({ length: Math.max(0, ranks) }, (_, i) => i * STOREY + SILL_HEIGHT);
}

// A clear-span volume's single band, hung from the eaves.
export function clerestorySill(wallHeight: number): number {
  return Math.max(0, wallHeight - up(CLERESTORY_HEAD_DROP_METRES) - WINDOW_HEIGHT);
}

// Floor lines in screen units above the base: stories - 1 of them.
export function floorLinesOf(t: Buildable): number[] {
  const storeys = storeysOf(t);
  return Array.from({ length: Math.max(0, storeys - 1) }, (_, i) => (i + 1) * STOREY);
}

// Doors: six families, each with one real width and height.

export type DoorFamily = 'formal' | 'civic' | 'residential' | 'service' | 'shopfront' | 'canopy';

interface DoorSpec {
  widthMetres: number;
  heightMetres: number;
  // Threshold height above grade, and the treads that climb to it.
  thresholdMetres: number;
  treads: number;
}

const DOOR_FAMILIES: Record<DoorFamily, DoorSpec> = {
  // Double height, reaching into the first floor, up a flight of five.
  formal: { widthMetres: 4.0, heightMetres: 5.4, thresholdMetres: 1.4, treads: 5 },
  // Must fit under the eaves course of its shortest user, the one-story
  // (3.9 m) campus restaurant; Door skips a door taller than its wall.
  civic: { widthMetres: 2.6, heightMetres: 3.0, thresholdMetres: 0.25, treads: 1 },
  residential: { widthMetres: 2.2, heightMetres: 3.0, thresholdMetres: 0.3, treads: 1 },
  service: { widthMetres: 1.6, heightMetres: 2.6, thresholdMetres: 0.15, treads: 1 },
  shopfront: { widthMetres: 6.0, heightMetres: 3.4, thresholdMetres: 0, treads: 0 },
  // An ambulance entrance drives straight in: no steps.
  canopy: { widthMetres: 8.0, heightMetres: 4.2, thresholdMetres: 0, treads: 0 },
};

// Which family a building's entrance belongs to, or null for something with no
// single front door (open ground, a stadium, a village of houses).
export function doorFamilyOf(t: Buildable): DoorFamily | null {
  const motif = motifOf(t);
  if (motif === 'grounds' || motif === 'bowl' || motif === 'village' || motif === 'landmark') return null;
  if (t.kind === 'building') return 'formal';
  if (t.kind === 'dorm') return motif === 'tower' ? 'shopfront' : 'residential';
  switch (t.facilityType) {
    // Every lab-gated building takes a service door whatever its motif.
    case 'lab': return 'service';
    case 'library':
    case 'grocery': return 'shopfront';
    case 'healthCenter':
      return (t.effects?.servesPopulation ?? 0) >= HOSPITAL_MIN_SERVES ? 'canopy' : 'civic';
    default: return 'civic';
  }
}

// Width in tiles; height, threshold and treads in screen units.
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

// Tread depth and how far the flight stands proud of the opening each side.
export const TREAD_DEPTH = across(0.42);
export const STEP_OVERHANG = across(0.8);

// The academic hall's vocabulary, as real dimensions. Everything goes on the
// shared `hall` motif; only the clock tower is singular.

// The stone base and the band capping it at the eaves. The plinth must stay
// below the ground-floor sill (SILL_METRES).
export const PLINTH = up(0.7);
export const CORNICE = up(1.05);
// The parapet above the cornice is per-vernacular: see parapetOf(v).

// The center bay projects, rises past the cornice and carries a pediment.
export const PAVILION_DEPTH = across(1.9);
export const PAVILION_BAYS = 4;
export const PAVILION_RISE = up(2.1);
export const PEDIMENT_RISE = up(2.9);

// The portico: four columns clear of the center bay under an entablature.
export const PORTICO_COLUMNS = 4;
export const PORTICO_HEIGHT = up(10.4);         // up to the second-floor line
export const PORTICO_COLUMN_PLAN = across(1.4);  // a column is round; this is its square
// The arcade (Mission): round arches on square piers along the front.
export const ARCADE_HEIGHT = up(7.2);
export const ARCADE_DEPTH = across(2.6);
export const ARCADE_PIER = across(0.75);
export const ARCADE_BAY_METRES = 6.0;   // wider than a window bay
export const ARCADE_MAX = 10;
// The campanile (Mission apex): a square bell tower with an open belfry.
export const CAMPANILE_PLAN = across(7.0);
export const CAMPANILE_RISE = up(13.0);
export const CAMPANILE_BELFRY_RISE = up(5.0);
export const CAMPANILE_CAP_RISE = up(4.4);

// The recess (Modern entrance): part of the ground floor cut away under an
// oversailing slab. RECESS_WIDTH is the share of the wall it occupies.
export const RECESS_WIDTH = 0.44;
export const RECESS_DEPTH = across(2.0);
export const RECESS_OVERHANG = across(1.1);
// The stair core (Modern apex): a blind shaft with the lift overrun on top.
export const CORE_PLAN = across(6.0);
export const CORE_RISE = up(15.0);
export const CORE_CAP_RISE = up(2.4);
// The porch (Gothic entrance) is the center bay itself, with a pointed arch
// and a steep gable. It stands lower than the wall so the main wall's lancets
// show above it.
export const PORCH_HEIGHT_FRACTION = 0.66;
export const PORCH_GABLE_RISE = up(6.0);
// The arch, as fractions of the bay's width and height.
export const PORCH_ARCH_WIDTH = 0.36;
export const PORCH_ARCH_HEIGHT = 0.66;
// Buttresses at the bay's front corners, stepping back once as they climb.
export const BUTTRESS_PLAN = across(1.15);
export const BUTTRESS_SETOFF_FRACTION = 0.58;
export const BUTTRESS_SETOFF_DEPTH = 0.45;
// Engaged portico: the columns stand just clear of the center bay.
export const PORTICO_STANDOFF = across(0.4);
export const ENTABLATURE = up(1.5);

// Raised brick blocks closing each end of the roofline.
export const END_PAVILION_PLAN = across(12.0);
export const END_PAVILION_RISE = up(1.9);
// How far into the plan a raised end reaches.
export const END_PAVILION_DEPTH = across(4.0);
// The coping capping a raised end, and how far it oversails.
export const COPING = up(0.45);
export const COPING_OVERHANG = across(0.35);

// The clock tower: Founders Hall only. The id is techData's FOUNDERS_HALL_ID,
// spelled as a literal so drawing code does not import course content.
const CLOCK_TOWER_ID = 'BLDG-GENSTUDIES';

export function hasClockTower(t: Buildable): boolean {
  return t.kind === 'building' && t.id === CLOCK_TOWER_ID;
}

// The tower, bottom to top: base, colonnaded drum, dome, finial.
export const TOWER_BASE_PLAN = across(11);
export const TOWER_BASE_RISE = up(12.5);
export const TOWER_DRUM_PLAN = across(8);
export const TOWER_DRUM_RISE = up(3.6);
export const TOWER_DOME_RISE = up(5.2);
export const TOWER_FINIAL_RISE = up(3.0);
// The spire (Gothic): a louvred belfry, then a tall tapering pyramid.
export const TOWER_BELFRY_PLAN = across(8.4);
export const TOWER_BELFRY_RISE = up(5.4);
export const TOWER_SPIRE_RISE = up(17.0);
// Pinnacles at the belfry's corners.
export const TOWER_PINNACLE_PLAN = across(1.5);
export const TOWER_PINNACLE_RISE = up(4.2);
// The clock face's radius, converted separately for the two wall axes.
const CLOCK_RADIUS_METRES = 2.1;
export const CLOCK_RADIUS = up(CLOCK_RADIUS_METRES);
export const CLOCK_RADIUS_TILES = across(CLOCK_RADIUS_METRES);

// Materials: what a building is made of. Each material has a wall and a roof
// (a roof must read apart from its walls), and trim is one shared stone.

export interface Material {
  wall: string;
  roof: string;
}

const SLATE = '#5f6b5f';
// The light roof: flat decks, and the residence halls, whose dark walls would
// merge with a dark slate roof.
const DECK = '#7c8377';

// The named walls every vernacular supplies. materialOf maps a Buildable onto
// one of these names, never onto a color.
export interface MaterialSet {
  brickRed: Material;
  brickBuff: Material;
  limestone: Material;
  render: Material;
  curtain: Material;
  brickDark: Material;
  clinical: Material;
}

const GEORGIAN_MATERIALS = {
  brickRed: { wall: '#a2564a', roof: SLATE },
  // Support buildings: refectories, shops, the union.
  brickBuff: { wall: '#bb9468', roof: SLATE },
  // The civic set: library, gallery, the arts center and the law school.
  limestone: { wall: '#d8cdb4', roof: DECK },
  // Labs, works, sheds: deliberately the dullest wall on the map.
  render: { wall: '#b0a992', roof: DECK },
  curtain: { wall: '#93a9b4', roof: DECK },
  // The residence halls: the one dark wall on the map, so the residential
  // quarter reads as a different kind of place and pale trim shows against it.
  brickDark: { wall: '#6d4b3c', roof: DECK },
  // The health chain: white panel and glazing.
  clinical: { wall: '#eef1f2', roof: '#c2ccd1' },
} as const satisfies MaterialSet;

// The limestone all trim is cut from; also the entrance steps.
const GEORGIAN_TRIM = '#efe9da';

// Painted sash glazing, translucent so the wall tints it.
const PAINTED_SASH = 'rgba(255, 253, 246, 0.5)';

// The gilding: only on Founders Hall's dome and finial. A vernacular may have
// none (NO_STONE).
const GEORGIAN_GILT = '#c9a227';

// The clock tower is white stone, not brick.
const GEORGIAN_TOWER_STONE = '#e4dcc8';

// The vernacular: which architecture the whole campus is built in (a Motif is
// what one building is). Seven motifs never vary by vernacular; see
// VERNACULAR_INVARIANT_MOTIFS.

// Stonework that is not a wall: trim, gilding, the clock tower's stone, glass.
export interface StonePalette {
  trim: string;
  gilt: string;
  towerStone: string;
  // The glazing fill. Lives here rather than in styles.css because a class
  // rule would override the fill a motif passes.
  glass: string;
}

export interface VernacularRoof {
  // Ridge rise above the eaves in meters, by motif. Absent means flat.
  ridgeMetres: Partial<Record<Motif, number>>;
  residentialRidgeMetres(storeys: number): number;
  // Wall height above the cornice, in units. Zero means no parapet (the roof
  // springs from the eaves).
  parapet: number;
  // Roof overhang past the walls, in meters. Absent means none.
  eavesMetres?: number;
}

export type WindowShape =
  | 'rect'     // a sash window: four corners
  | 'arched'   // round-headed, springing from the upper third
  | 'lancet'   // pointed, the Gothic light
  | 'slot'     // a deep narrow opening in a concrete wall
  | 'ribbon';  // a continuous horizontal strip of glazing

// Ornament slots, named rather than componentised so a new vernacular is a
// table row. There is no eaves slot: VernacularRoof.parapet already answers it.

// What stands at a building's way in, per motif as well as per vernacular.
export type EntrancePart =
  | 'portico'    // a rank of columns standing clear of a projecting center bay
  | 'colonnade'  // the same columns, run the length of the front
  | 'canopy'     // a slab on two posts
  | 'porch'      // buttressed, pointed-arched — the Gothic way in
  | 'arcade'     // round-arched, walked under — Mission
  | 'archway'    // a small masonry porch with one round-headed opening — the Mission door
  | 'recess'     // an opening set back under an overhang
  | 'none';

// What closes the ends of a pitched roofline.
export type RooflineEndPart = 'pavilion' | 'none';

// What stands on top of the campus's one landmark (see hasClockTower).
export type ApexPart =
  | 'cupola'     // drum, dome and finial — the gilded thing
  | 'spire'      // Gothic
  | 'campanile'  // Mission
  | 'dome'       // a broad stone dome on a drum — Classical
  | 'core'       // a blank stair core — Modern
  | 'none';

export interface VernacularParts {
  // Only the five varying motifs appear; absent means 'none'.
  entrance: Partial<Record<Motif, EntrancePart>>;
  rooflineEnd: RooflineEndPart;
  apex: ApexPart;
  // A pitched hood over a canopied door instead of a flat slab.
  hood?: boolean;
  chimneys?: boolean;
  dormers?: boolean;
  // A bell-gable (espadaña) above the center of a hall's and pavilion's front.
  bellGable?: boolean;
  // Gothic: buttresses at every bay line down the long walls,
  buttresses?: boolean;
  // a tower at the near corner of every hall and residence hall,
  turrets?: boolean;
  // crenellations on towers and flat civic roofs,
  crenellations?: boolean;
  // and two lights to a bay.
  pairedLights?: boolean;
  // Classical: a full-height six-column portico, and parapet balustrades.
  grandPortico?: boolean;
  balustrade?: boolean;
  // Modern: the civic set is curtain wall from plinth to eaves.
  glazedCivic?: boolean;
}

// How a building is massed: one solid mass, or stacked slabs with a
// cantilever.
export type Massing = 'solid' | 'stacked';

export interface VernacularSpec {
  materials: MaterialSet;
  stone: StonePalette;
  roof: VernacularRoof;
  windowShape: WindowShape;
  parts: VernacularParts;
  massing: Massing;
}

const GEORGIAN: VernacularSpec = {
  materials: GEORGIAN_MATERIALS,
  stone: {
    trim: GEORGIAN_TRIM,
    gilt: GEORGIAN_GILT,
    towerStone: GEORGIAN_TOWER_STONE,
    glass: PAINTED_SASH,
  },
  roof: {
    ridgeMetres: GEORGIAN_RIDGE_METRES,
    residentialRidgeMetres: georgianResidentialRidgeMetres,
    parapet: up(0.85),
  },
  windowShape: 'rect',
  parts: {
    entrance: {
      hall: 'portico',
      portico: 'colonnade',
      pavilion: 'canopy',
      residential: 'canopy',
      village: 'none',
    },
    rooflineEnd: 'pavilion',
    apex: 'cupola',
    chimneys: true,
  },
  massing: 'solid',
};

// Collegiate Gothic: gray ashlar, steep unparapeted roofs, a spire.
// `render`, `curtain` and `clinical` must equal Georgian's: those are the
// invariant motifs' walls (enforced in test/building-spec.test.ts).

// Bluer than Georgian's slate at the same lightness: roof faces are shaded
// multiplicatively off this color, so a darker slate makes a steep hip read
// as one flat plate.
const GOTHIC_SLATE = '#5a6270';
// Georgian's lead deck, to keep the campus to three roof tones.
const GOTHIC_DECK = '#7c8377';

const GOTHIC_MATERIALS = {
  // The academic halls: gray ashlar, kept clear of `render`.
  brickRed: { wall: '#8a8b86', roof: GOTHIC_SLATE },
  // Support buildings in warm sandstone, pushed warm enough to clear the
  // palette distance check against the halls and `render`.
  brickBuff: { wall: '#b8975f', roof: GOTHIC_SLATE },
  limestone: { wall: '#cbc5b0', roof: GOTHIC_DECK },
  // Invariant, see above.
  render: { wall: '#b0a992', roof: '#7c8377' },
  curtain: { wall: '#93a9b4', roof: '#7c8377' },
  clinical: { wall: '#eef1f2', roof: '#c2ccd1' },
  // The residence halls: the one dark wall.
  brickDark: { wall: '#585448', roof: GOTHIC_DECK },
} as const satisfies MaterialSet;

const GOTHIC: VernacularSpec = {
  materials: GOTHIC_MATERIALS,
  stone: {
    // Cooler than Georgian's so the bands read against gray walls.
    glass: PAINTED_SASH,
    trim: '#e6e3d6',
    // A pale lead rather than gold: the spire's finial must still show.
    gilt: '#b9bcc4',
    towerStone: '#d9d5c4',
  },
  roof: {
    ridgeMetres: {
      // Gothic's roof is the building. It must be deep to read as steep: a
      // hall's hip climbs 20-odd meters of span.
      hall: 13.0,
      village: 6.0,
      pavilion: 5.0,
    },
    residentialRidgeMetres: (storeys: number) => {
      if (storeys <= 3) return 7.5;
      return 6.5;
    },
    // No parapet: the roof springs straight from the eaves.
    parapet: 0,
  },
  windowShape: 'lancet',
  parts: {
    entrance: {
      hall: 'porch',
      portico: 'colonnade',
      pavilion: 'canopy',
      residential: 'canopy',
      village: 'none',
    },
    // A gable end closes its own roofline.
    rooflineEnd: 'none',
    apex: 'spire',
    hood: true,
    chimneys: true,
    dormers: true,
    buttresses: true,
    turrets: true,
    crenellations: true,
    pairedLights: true,
  },
  massing: 'solid',
};

// Modern: the postwar campus in white panel and glass. No pitched roof, no
// trim, no gilding; a thin parapet, ribbon glazing, a fully glazed civic set
// and a slab canopy at every door. Burnt-orange brick keeps it from failing
// the palette check as seven near-whites.

// Georgian's lead deck, to keep the campus to three roof tones.
const MODERN_DECK = '#7c8377';

const MODERN_MATERIALS = {
  // The academic halls: white render, kept distinct from `clinical`.
  brickRed: { wall: '#dcd9cf', roof: MODERN_DECK },
  brickBuff: { wall: '#b5623f', roof: MODERN_DECK },
  // The civic set in slate-blue panel, under the hospital's paler deck.
  limestone: { wall: '#5f7d8c', roof: '#c2ccd1' },
  // Invariant (see Gothic).
  render: { wall: '#b0a992', roof: '#7c8377' },
  curtain: { wall: '#93a9b4', roof: '#7c8377' },
  clinical: { wall: '#eef1f2', roof: '#c2ccd1' },
  // The residence halls: the one dark wall.
  brickDark: { wall: '#4d4f52', roof: '#7c8377' },
} as const satisfies MaterialSet;

const MODERN: VernacularSpec = {
  materials: MODERN_MATERIALS,
  stone: {
    // No trim: motifs skip the bands, and canopy and steps fall back to towerStone.
    trim: 'none',
    gilt: 'none',
    towerStone: '#e8e6df',
    glass: 'rgba(40, 60, 75, 0.7)',
  },
  roof: {
    ridgeMetres: {},
    residentialRidgeMetres: () => 0,
    parapet: up(0.6),
  },
  windowShape: 'ribbon',
  parts: {
    entrance: {
      hall: 'canopy',
      portico: 'canopy',
      pavilion: 'canopy',
      residential: 'canopy',
      village: 'none',
    },
    rooflineEnd: 'none',
    apex: 'core',
    glazedCivic: true,
  },
  massing: 'solid',
};

// Classical: Georgian's parapet-and-hip discipline in limestone, with a
// full-height portico, balustrades and a stone dome.

const COPPER_GREEN = '#5f7a63';
const CLASSICAL_DECK = '#7c8377';

const CLASSICAL_MATERIALS = {
  brickRed: { wall: '#d6cfbb', roof: COPPER_GREEN },
  brickBuff: { wall: '#9e5a48', roof: COPPER_GREEN },
  limestone: { wall: '#c9a86a', roof: CLASSICAL_DECK },
  // Invariant (see Gothic).
  render: { wall: '#b0a992', roof: '#7c8377' },
  curtain: { wall: '#93a9b4', roof: '#7c8377' },
  clinical: { wall: '#eef1f2', roof: '#c2ccd1' },
  brickDark: { wall: '#6e3f36', roof: CLASSICAL_DECK },
} as const satisfies MaterialSet;

const CLASSICAL: VernacularSpec = {
  materials: CLASSICAL_MATERIALS,
  stone: {
    trim: '#f3eee1',
    gilt: GEORGIAN_GILT,
    towerStone: '#e9e2d0',
    glass: PAINTED_SASH,
  },
  roof: {
    ridgeMetres: { hall: 2.4, village: 3.0, pavilion: 2.0 },
    residentialRidgeMetres: (storeys: number) => (storeys <= 3 ? 4.2 : 2.4),
    parapet: up(0.85),
  },
  windowShape: 'rect',
  parts: {
    entrance: {
      hall: 'portico',
      portico: 'colonnade',
      // Jefferson's Lawn: even pavilions are porticoed.
      pavilion: 'portico',
      residential: 'portico',
      village: 'none',
    },
    rooflineEnd: 'none',
    apex: 'dome',
    grandPortico: true,
    balustrade: true,
  },
  massing: 'solid',
};

// Mission: cream stucco under red clay tile, a shallow pitch with deep eaves,
// arcades and a campanile.

// Clay tile, with a facet spread close to Georgian slate's so a hip reads as
// pitched (see GOTHIC_SLATE).
const CLAY_TILE = '#9c4f3a';
const MISSION_DECK = '#7c8377';

const MISSION_MATERIALS = {
  brickRed: { wall: '#e3d6b6', roof: CLAY_TILE },
  brickBuff: { wall: '#b98763', roof: CLAY_TILE },
  // Ochre, not white: a white civic wall would sit too close to `clinical`.
  limestone: { wall: '#d4b276', roof: MISSION_DECK },
  // Invariant (see Gothic).
  render: { wall: '#b0a992', roof: MISSION_DECK },
  curtain: { wall: '#93a9b4', roof: MISSION_DECK },
  clinical: { wall: '#eef1f2', roof: '#c2ccd1' },
  // The residence halls: the one dark wall, dark enough to clear the tile roof.
  brickDark: { wall: '#5f5347', roof: CLAY_TILE },
} as const satisfies MaterialSet;

const MISSION: VernacularSpec = {
  materials: MISSION_MATERIALS,
  stone: {
    trim: '#fbf4e2',
    gilt: '#b08d3f',
    towerStone: '#ece0c4',
    glass: PAINTED_SASH,
  },
  roof: {
    // A tile roof cannot be steep; the eaves are deep instead.
    ridgeMetres: { hall: 3.4, village: 3.6, pavilion: 3.0 },
    residentialRidgeMetres: (storeys: number) => {
      if (storeys <= 3) return 3.6;
      return 3.0;
    },
    parapet: 0,
    eavesMetres: 0.9,
  },
  windowShape: 'arched',
  parts: {
    entrance: {
      hall: 'arcade',
      portico: 'arcade',
      pavilion: 'arcade',
      residential: 'archway',
      village: 'none',
    },
    rooflineEnd: 'none',
    apex: 'campanile',
    bellGable: true,
  },
  massing: 'solid',
};

export const VERNACULARS: Record<Vernacular, VernacularSpec> = {
  georgian: GEORGIAN,
  gothic: GOTHIC,
  classical: CLASSICAL,
  mission: MISSION,
  modern: MODERN,
};

// A vernacular without trim or gilding says so with this value.
export const NO_STONE = 'none';
export function hasTrim(v: Vernacular): boolean {
  return stoneFor(v).trim !== NO_STONE;
}
export function hasGilt(v: Vernacular): boolean {
  return stoneFor(v).gilt !== NO_STONE;
}

export function roofFor(v: Vernacular): VernacularRoof {
  return VERNACULARS[v].roof;
}

export function windowShapeOf(v: Vernacular): WindowShape {
  return VERNACULARS[v].windowShape;
}

// The seven motifs no vernacular may restyle: a Gothic campus's gym is still a
// shed and its hospital a modern hospital, and a grand landmark is its own
// statement (landmarks.tsx).
export const VERNACULAR_INVARIANT_MOTIFS = [
  'grounds',  // a gridiron is a gridiron
  'bowl',     // a concrete stadium in every era
  'hangar',   // clear-span sheds are engineering, not architecture
  'works',    // the dullest wall on the map, by design
  'block',    // a teaching hospital is a modern hospital
  'tower',    // a late-game apartment tower postdates the founding campus
  'landmark', // bespoke in limestone, whatever the campus around it
] as const satisfies readonly Motif[];

export function variesByVernacular(m: Motif): boolean {
  return !(VERNACULAR_INVARIANT_MOTIFS as readonly Motif[]).includes(m);
}

// What shape this building's openings are. The invariance is enforced here,
// not at each place a window is drawn.
export function paneShapeOf(t: Buildable, v: Vernacular): WindowShape {
  return variesByVernacular(motifOf(t)) ? windowShapeOf(v) : 'rect';
}

export function massingOf(t: Buildable, v: Vernacular): Massing {
  return variesByVernacular(motifOf(t)) ? VERNACULARS[v].massing : 'solid';
}

// The stack, as fractions of footprint and height. Two volumes stepped on one
// axis only (insetting all four sides reads as concentric rectangles, not a
// cantilever), both inside the footprint.
export const STACK_LOWER_TOP = 0.54;   // where the broad base stops
export const STACK_UPPER_INSET = 0.34; // how far the upper slab pulls back, on one axis
export const STACK_UPPER_OVERHANG = 0.10; // and how far it cantilevers past the other end

// What the founding screen calls each set, in offer order. Kept beside the
// palettes so an unnamed vernacular does not compile.
export interface VernacularChoice {
  id: Vernacular;
  label: string;
  blurb: string;
}

export const VERNACULAR_CHOICES: VernacularChoice[] = [
  { id: 'georgian', label: 'Georgian', blurb: 'Red brick and white trim, under a gilded cupola.' },
  { id: 'gothic', label: 'Collegiate Gothic', blurb: 'Gray ashlar and steep slate, under a spire.' },
  { id: 'classical', label: 'Classical', blurb: 'Limestone and columns under copper roofs, and a stone dome.' },
  { id: 'mission', label: 'Mission', blurb: 'Cream stucco and red tile, around a shaded arcade.' },
  { id: 'modern', label: 'Modern', blurb: 'White panel, glass and burnt-orange brick, under flat roofs.' },
];

export function partsFor(v: Vernacular): VernacularParts {
  return VERNACULARS[v].parts;
}

// What goes at this building's entrance; the invariant six always get 'none'.
export function entrancePartOf(t: Buildable, v: Vernacular): EntrancePart {
  const motif = motifOf(t);
  if (!variesByVernacular(motif)) return 'none';
  return partsFor(v).entrance[motif] ?? 'none';
}

export function rooflineEndPartOf(v: Vernacular): RooflineEndPart {
  return partsFor(v).rooflineEnd;
}

export function apexPartOf(v: Vernacular): ApexPart {
  return partsFor(v).apex;
}

// The parts that have geometry behind them. test/building-spec.test.ts
// asserts every part a vernacular names is listed here.
export const IMPLEMENTED_ENTRANCE_PARTS: EntrancePart[] = ['portico', 'colonnade', 'canopy', 'porch', 'recess', 'arcade', 'archway', 'none'];
export const IMPLEMENTED_ROOFLINE_END_PARTS: RooflineEndPart[] = ['pavilion', 'none'];
export const IMPLEMENTED_APEX_PARTS: ApexPart[] = ['cupola', 'spire', 'core', 'campanile', 'dome', 'none'];

// Whether this vernacular has a roof at all: derived (something pitched or a
// parapet), not declared, so it cannot be flagged off to dodge the palette check.
export function hasRoofForm(v: Vernacular): boolean {
  const r = roofFor(v);
  return Object.keys(r.ridgeMetres).length > 0 || r.parapet > 0;
}

export function parapetOf(v: Vernacular): number {
  return VERNACULARS[v].roof.parapet;
}

export function eavesOf(v: Vernacular): number {
  return across(VERNACULARS[v].roof.eavesMetres ?? 0);
}

// The opening itself, as a closed outline in the wall face's own (u, v); the
// caller maps it through facePoint. Every shape stays inside its
// [u0,u1] x [v0,v1] box (tested). v runs up the wall: v1 is the head.

// Share of an arched or lancet opening that is straight-sided below the head.
const ARCH_SPRING = 0.66;
const ARCH_STEPS = 6;
// A concrete slot is inset from its bay; the reveal reads as a thick wall.
const SLOT_INSET = 0.22;
// A ribbon fills its bay edge to edge and is short, so a row reads as one band.
const RIBBON_HEIGHT = 0.46;
const RIBBON_DROP = 0.30;   // where the band sits within its own rank

export function windowOutline(
  shape: WindowShape, u0: number, u1: number, v0: number, v1: number,
): Array<[number, number]> {
  const uc = (u0 + u1) / 2;
  const half = (u1 - u0) / 2;
  switch (shape) {
    case 'rect':
      return [[u0, v0], [u1, v0], [u1, v1], [u0, v1]];
    case 'arched': {
      const spring = v0 + (v1 - v0) * ARCH_SPRING;
      const head: Array<[number, number]> = [];
      for (let i = 0; i <= ARCH_STEPS; i++) {
        const a = Math.PI * (i / ARCH_STEPS);
        head.push([uc + half * Math.cos(a), spring + (v1 - spring) * Math.sin(a)]);
      }
      return [[u0, v0], [u1, v0], [u1, spring], ...head.slice(1, ARCH_STEPS), [u0, spring]];
    }
    case 'lancet': {
      const spring = v0 + (v1 - v0) * ARCH_SPRING;
      return [[u0, v0], [u1, v0], [u1, spring], [uc, v1], [u0, spring]];
    }
    case 'slot': {
      const i = half * SLOT_INSET;
      return [[u0 + i, v0], [u1 - i, v0], [u1 - i, v1], [u0 + i, v1]];
    }
    case 'ribbon': {
      // windows() widens u0/u1 to the bay edges for ribbons, so neighbors touch.
      const span = v1 - v0;
      const lo = v0 + span * RIBBON_DROP;
      return [[u0, lo], [u1, lo], [u1, lo + span * RIBBON_HEIGHT], [u0, lo + span * RIBBON_HEIGHT]];
    }
  }
}

export function materialsFor(v: Vernacular): MaterialSet {
  return VERNACULARS[v].materials;
}

// All three stones: anything drawing trim is drawing masonry.
export function stoneFor(v: Vernacular): StonePalette {
  return VERNACULARS[v].stone;
}

export function materialOf(t: Buildable, v: Vernacular): Material {
  const MATERIALS = materialsFor(v);
  if (t.kind === 'building') {
    const signature = signatureOf(t);
    return signature ? MATERIALS[signature.material] : MATERIALS.brickRed;
  }
  if (t.kind === 'dorm') {
    return motifOf(t) === 'tower' ? MATERIALS.curtain : MATERIALS.brickDark;
  }
  // A chapter house is housing, in the residence halls' wall.
  if (t.chapterHouse) return MATERIALS.brickDark;
  switch (t.facilityType) {
    case 'project': {
      const spec = PROJECT_SPECS[t.id];
      return spec ? MATERIALS[spec.material] : MATERIALS.render;
    }
    case 'library':
    case 'artGallery':
      return MATERIALS.limestone;
    // The chapel is built in the campus's stone; the others stand on open
    // ground or draw their own, so they take the material every vernacular
    // shares.
    case 'amenity':
      return t.id === 'AMENITY-CHAPEL' ? MATERIALS.limestone : MATERIALS.clinical;
    // A landmark draws its own stone (landmarks.tsx); for everything else
    // that asks, it is the one material every vernacular shares.
    case 'landmark':
      return MATERIALS.clinical;
    case 'healthCenter':
      return MATERIALS.clinical;
    case 'diningHall':
    case 'grocery':
    case 'studentCenter':
      return MATERIALS.brickBuff;
    case 'athleticsNatatorium':
      return MATERIALS.curtain;
    case 'lab':
      if (t.id === 'LAB-NEUR') return MATERIALS.clinical;
      return MATERIALS.render;
    case 'gym':
    case 'recCenter':
    case 'athleticsArena':
    case 'fieldHouse':
      return MATERIALS.render;
    // Open ground and venues drawn as markings take a wall color only for their props.
    default:
      return MATERIALS.render;
  }
}

// Neighboring residence halls differ by a few percent of brightness, hashed off the id.
const DORM_SHADE_STEPS = [0.94, 1.0, 1.06, 1.11];

export function wallShadeOf(t: Buildable): number {
  if (t.kind !== 'dorm') return 1;
  let h = 0;
  for (let i = 0; i < t.id.length; i++) h = (h * 31 + t.id.charCodeAt(i)) % 1000003;
  return DORM_SHADE_STEPS[h % DORM_SHADE_STEPS.length];
}

// The rest of the catalog: every roofed motif is assembled from the same
// parts (base course, cornice, bays, a door family) so the campus reads as one.

// Every roofed motif gets a base course and an eaves course.
export const BASE_COURSE = up(0.55);
export const EAVES_COURSE = up(0.5);

// A colonnade for the civic set: the portico's columns run the length of the front.
export const COLONNADE_HEIGHT = up(8.2);
export const COLONNADE_BAY_METRES = 6.5;
export const COLONNADE_MAX = 9;

// Piers at bay centers on the clear-span sheds.
export const PIER_WIDTH_METRES = 1.1;
export const PIER_PROJECTION = across(0.5);

export const CANOPY_DEPTH = across(2.6);
export const CANOPY_SLAB = up(0.45);
export const CANOPY_POST = across(0.35);

// The hospital: large `block` instances split into a tall ward slab and a
// lower glazed public wing. Small ones (the 4x3 computing center) stay a box.

export const BLOCK_SPLIT_MIN_TILES = 7;

// The ward slab takes the far half at full width; the wing sits across the
// near-left, leaving a forecourt near-right. Increasing row runs toward the
// camera, so the wing takes the high rows.
export const SLAB_ROW_FRACTION = 0.5;
export const WING_COL_FRACTION = 0.62;
// The wing's share of the slab's height, rounded to whole stories.
export const WING_STOREY_FRACTION = 0.6;

// The recessed, glazed ground floor both wings stand on.
export const UNDERCROFT_STOREYS = 1;

// The red cross on the slab's front.
export const CROSS_ARM_METRES = 4.2;
export const CROSS_BAR_METRES = 1.5;
