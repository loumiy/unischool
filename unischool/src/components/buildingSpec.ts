import type { Buildable, FacilityType, Vernacular } from '../state/types';
import { METRES_PER_TILE, STOREY, across, up } from './campusScale';
import type { FaceDir } from './isoProjection';
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
  | 'chapel'       // the chapel: a nave, a tower at its west end, tall windows (CHAPELS)
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
  // its own drawing (Plan 80I, CHAPELS); the rest are open ground with
  // something on it.
  'AMENITY-BELLTOWER': 'landmark',
  'AMENITY-CHAPEL': 'chapel',
  // The capital projects (Plan 33), each in the motif of what it is.
  'PROJ-ARTS': 'portico',
  'PROJ-RESEARCH-PARK': 'works',
  'PROJ-GRADUATE': 'residential',
  'PROJ-MUSEUM': 'portico',
  // The professional schools (Plan 51): a courthouse, and an office block.
  'PROJ-LAW': 'portico',
  'PROJ-BUSINESS': 'block',
  // The Faculty Training Institute (Plan 85E): an academic hall, for the
  // teaching it is about, in the civic stone and under a cupola.
  'PROJ-TRAINING': 'hall',
  // The Athletic Performance Complex (Plan 85G): a big modern block, glazed
  // from plinth to eaves, with a running track on its roof.
  'PROJ-ATHLETICS-COMPLEX': 'block',
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

// One mark per building that would otherwise share its drawing with a
// building that does something else (Plan 74F, review A1-2), in the way
// LAB_FEATURES marks the sciences: the map should say where the dining hall
// is without a click.
export type Signifier =
  | 'kitchen'     // dining halls: kitchen stacks and a terrace awning
  | 'clock'       // the student center: a clock on its front
  | 'shopfront'   // the grocery: a painted signboard over its glazing
  | 'gantry'      // Mechanical Engineering: a gantry crane over the shed
  | 'windTunnel'  // Aerospace: a wind-tunnel duct along the roof
  | 'testTower'   // Civil Engineering: a test tower at the corner
  | 'column'      // Chemical Engineering: a distillation column by the flues
  | 'soundstage'  // Film: a taller stage door and its red lamp
  | 'banners'     // the Museum: banners between its columns
  | 'scales'      // the Law School: a pediment with the scales
  | 'lantern'     // the Humanities Research Institute: a reading-room lantern
  | 'exhibition'  // the Art Gallery: one tall exhibition banner a front
  | 'mast'        // Computing: a mast and a dish
  | 'tanks'       // Neuroscience: the scanners' cryogen tanks
  | 'cupola'      // the Faculty Training Institute: a glazed cupola astride the ridge
  | 'track';      // the Athletic Performance Complex: a running track on the roof
const SIGNIFIERS_BY_ID: Partial<Record<string, Signifier>> = {
  'LAB-MECH': 'gantry',
  'LAB-AERO': 'windTunnel',
  'LAB-CIVE': 'testTower',
  'LAB-CHEN': 'column',
  'LAB-FILM': 'soundstage',
  'PROJ-MUSEUM': 'banners',
  'PROJ-LAW': 'scales',
  'LAB-HIST': 'lantern',
  'LAB-COMP': 'mast',
  'LAB-NEUR': 'tanks',
  'PROJ-TRAINING': 'cupola',
  'PROJ-ATHLETICS-COMPLEX': 'track',
};
const SIGNIFIERS_BY_TYPE: Partial<Record<FacilityType, Signifier>> = {
  diningHall: 'kitchen',
  studentCenter: 'clock',
  grocery: 'shopfront',
  artGallery: 'exhibition',
};
export function signifierOf(t: Buildable): Signifier | undefined {
  if (t.chapterHouse) return undefined;
  return SIGNIFIERS_BY_ID[t.id] ?? (t.facilityType ? SIGNIFIERS_BY_TYPE[t.facilityType] : undefined);
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
//
// A feature sets two signatures apart from the civic buildings they share a
// motif with (Plan 61: Arts & Media drew as the library, Business as a
// hospital): a studio's sawtooth north-light roof, and an exchange's
// pedimented temple front under a dome.
export type SignatureFeature = 'studio' | 'exchange';
export interface Signature { motif: Motif; material: keyof MaterialSet; feature?: SignatureFeature }
export const SCHOOL_SIGNATURES: Readonly<Record<string, Signature>> = {
  'Science': { motif: 'block', material: 'render' },
  'Engineering': { motif: 'works', material: 'render' },
  'Health Science': { motif: 'block', material: 'clinical' },
  'Computer Science': { motif: 'block', material: 'curtain' },
  'Arts & Media': { motif: 'portico', material: 'brickRed', feature: 'studio' },
  'Business': { motif: 'portico', material: 'limestone', feature: 'exchange' },
  'Social Sciences & Humanities': { motif: 'hall', material: 'limestone' },
};

export function signatureOf(t: Buildable): Signature | undefined {
  const school = (t as Buildable & { signature?: string }).signature;
  return school === undefined ? undefined : SCHOOL_SIGNATURES[school];
}

// The residence halls' forms (Plan 72D), from v2's residence types
// (loumiy/unischool-v2's content/buildings.json): the Residence Hall, a long
// gabled block of ranked windows with balconies; the House, gabled in red
// brick with a tutor's door and no balconies; the Suites (v2's Graduate
// House), in buff brick behind a formal door; the Apartment Block,
// flat-roofed and balconied, in render, since a block is modern in every
// vernacular (VERNACULAR_INVARIANT_MOTIFS; v2 builds it in buff brick); and
// the Residential College, in the civic stone, rooms
// round one formal front door. The eight hall rungs (campusData.ts) take
// one each, so no two neighbouring rungs read the same; beds, costs and
// footprints are the rungs' own. Keyed by id, like the research facilities
// above, so nothing is stored. Meadow House, the villages and the towers
// keep their own.
export type ResidenceForm = 'residence-hall' | 'house' | 'suites' | 'apartments' | 'college';
interface ResidenceStyle { motif: 'residential' | 'block'; material: keyof MaterialSet; balconies: boolean; door: DoorFamily }
const RESIDENCE_STYLES: Record<ResidenceForm, ResidenceStyle> = {
  'residence-hall': { motif: 'residential', material: 'brickDark', balconies: true, door: 'residential' },
  house: { motif: 'residential', material: 'brickRed', balconies: false, door: 'residential' },
  suites: { motif: 'residential', material: 'brickBuff', balconies: false, door: 'formal' },
  apartments: { motif: 'block', material: 'render', balconies: true, door: 'residential' },
  college: { motif: 'residential', material: 'limestone', balconies: false, door: 'formal' },
};
export const RESIDENCE_FORMS: Readonly<Record<string, ResidenceForm>> = {
  'DORM-02': 'house',
  'DORM-03': 'residence-hall',
  'DORM-04': 'suites',
  'DORM-05': 'apartments',
  'DORM-06': 'college',
  'DORM-07': 'apartments',
  'DORM-08': 'residence-hall',
  'DORM-09': 'suites',
};

// A residence hall's style: its rung's, or the Residence Hall's.
function residenceStyleOf(t: Buildable): ResidenceStyle {
  return RESIDENCE_STYLES[RESIDENCE_FORMS[t.id] ?? 'residence-hall'];
}

// Whether a residence draws balconies: a tall one, in a form that has them.
export function hasBalconies(t: Buildable): boolean {
  return t.kind === 'dorm' && (motifOf(t) === 'residential' || motifOf(t) === 'block') && residenceStyleOf(t).balconies && storeysOf(t) >= 4;
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
    return residenceStyleOf(t).motif;
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
      // A terrace hall (Plan 87D) has a floor over its dining room.
      if (serves >= DINING_TERRACE_MIN_SERVES) return 2;
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
  // An academic hall a story lower than the halls, in the civic stone
  // rather than their brick.
  'PROJ-TRAINING': { storeys: 3, material: 'limestone' },
  // A training center as tall as a sports hall and a floor more, in the
  // curtain wall the natatorium shares: glass, not brick.
  'PROJ-ATHLETICS-COMPLEX': { storeys: 3, material: 'curtain' },
};

// How many floors this building has. Zero means open ground, or a clear-span
// volume whose height comes from CLEAR_SPAN_METRES instead.
export function storeysOf(t: Buildable): number {
  const motif = motifOf(t);
  if (motif === 'grounds' || motif === 'hangar' || motif === 'bowl' || motif === 'landmark' || motif === 'chapel') return 0;
  // A refectory is one tall room (Plan 87D): its height is wallHeightOf's.
  if (diningBandOf(t) === 'refectory') return 0;
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
// about two and a half stories tall, and a stadium's rim is higher. A
// chapel's nave is one tall room to its eaves.
const CLEAR_SPAN_METRES: Partial<Record<Motif, number>> = {
  hangar: 10,
  bowl: 16,
  chapel: 9.5,
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
  // A refectory is one tall room, a clear span like the chapel's (Plan 87D).
  if (diningBandOf(t) === 'refectory') return up(refectoryEavesMetres(t));
  const storeys = storeysOf(t);
  if (storeys > 0) return storeys * STOREY;
  // An arena or a natatorium rises a storey with each expansion (Plan 54).
  const risen = motif === 'hangar' && (t.facilityType === 'athleticsArena' || t.facilityType === 'athleticsNatatorium')
    ? (t.expansions ?? 0) * STOREY
    : 0;
  return up(CLEAR_SPAN_METRES[motif] ?? 0) + risen;
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
  if (gothicCivicOf(t, v)) return up(GOTHIC_CIVIC_RIDGE_METRES);
  if (motif === 'chapel') return up(CHAPELS[v].ridgeMetres);
  if (diningBandOf(t) === 'refectory') return up(REFECTORIES[v].ridgeMetres);
  return up(roof.ridgeMetres[motif] ?? 0);
}

// Collegiate Gothic's library and gallery (Plan 74G, review A1-9): the
// signature buildings of the style (think Sterling or Harper), so they leave
// the pale flat portico for a steep roof, lancets, a Gothic porch, and on
// the library a crenellated tower.
const GOTHIC_CIVIC_RIDGE_METRES = 11.0;
export function gothicCivicOf(t: Buildable, v: Vernacular): 'library' | 'gallery' | undefined {
  if (v !== 'gothic') return undefined;
  return t.facilityType === 'library' ? 'library' : t.facilityType === 'artGallery' ? 'gallery' : undefined;
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
  // An academic hall's portal, the Faculty Training Institute's too (Plan 85E).
  if (t.kind === 'building' || motif === 'hall') return 'formal';
  if (t.kind === 'dorm') return motif === 'tower' ? 'shopfront' : residenceStyleOf(t).door;
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
export const ARCADE_BAY_METRES = 7.5;   // wider than a window bay: bold enough to read at the opening zoom (Plan 74G)
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
  // Every pitched roof on a hall or civic building in this color, whatever
  // the wall material under it (Plan 74G: Mission's tile reaches the
  // limestone halls). Absent means each material keeps its own roof.
  pitchedRoof?: string;
  // Wall height above the cornice, in units. Zero means no parapet (the roof
  // springs from the eaves).
  parapet: number;
  // Roof overhang past the walls, in meters. Absent means none.
  eavesMetres?: number;
  // A hall's roof shape: a hip (the default), or a mansard, whose ridge
  // table then gives the height of its steep lower slope (Second Empire).
  form?: 'hip' | 'mansard';
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

// What finishes the parapet of a flat-roofed block, lab or shed (Plan 74E).
export type CrestPart =
  | 'coping'     // a stone coping in the trim
  | 'merlons'    // crenellations — Gothic
  | 'balustrade' // balusters under a rail — Classical
  | 'tile'       // a clay-tile coping — Mission
  | 'none';

// What stands on top of the campus's one landmark (see hasClockTower).
export type ApexPart =
  | 'cupola'     // drum, dome and finial — the gilded thing
  | 'spire'      // Gothic
  | 'campanile'  // Mission
  | 'dome'       // a broad stone dome on a drum — Classical
  | 'core'       // a blank stair core — Modern
  | 'gatehouse'  // a brick gate tower between four capped turrets — Tudor
  | 'belvedere'  // a square lookout, arched on every face, under bracketed eaves — Italianate
  | 'pavilionTower' // a clock stage under a tall mansard and iron cresting — Second Empire
  | 'ziggurat'   // stepped setbacks, fluted, to a gilt mast — Art Deco
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
  // Tudor: the upper floors half-timbered over a brick ground floor.
  timbering?: boolean;
  // Italianate: paired brackets under the deep eaves.
  brackets?: boolean;
  // Art Deco: full-height piers between the bays of a hall's front.
  piers?: boolean;
  // The surface the invariant massing wears (Plan 74E): the way in at a
  // block's, a lab's or a shed's door, and the crest on its parapet.
  surfaceEntrance: EntrancePart;
  crest: CrestPart;
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
    surfaceEntrance: 'canopy',
    crest: 'coping',
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
    // Slate over the limestone halls and the library too (Plan 74G).
    pitchedRoof: GOTHIC_SLATE,
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
    surfaceEntrance: 'canopy',
    crest: 'merlons',
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
    surfaceEntrance: 'canopy',
    crest: 'none',
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
    surfaceEntrance: 'portico',
    crest: 'balustrade',
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
    pitchedRoof: CLAY_TILE,
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
    surfaceEntrance: 'archway',
    crest: 'tile',
    bellGable: true,
  },
  massing: 'solid',
};

// --- Bonus vernaculars (prototype) -------------------------------------
// Seven sets that are drawn and tested but not offered at founding
// (BONUS_VERNACULAR_CHOICES): candidates for sets a run can unlock. Each
// keeps the invariant walls (render, curtain, clinical) and the lead deck.

const BONUS_DECK = '#7c8377';
const INVARIANT = {
  render: { wall: '#b0a992', roof: BONUS_DECK },
  curtain: { wall: '#93a9b4', roof: BONUS_DECK },
  clinical: { wall: '#eef1f2', roof: '#c2ccd1' },
} as const;

// Tudor: plum-red brick, the upper floors close-studded in oak over a
// limewashed infill, steep tile-dark roofs, tall stacks, and a gatehouse.
const TUDOR_ROOF = '#4f5560';
const TUDOR: VernacularSpec = {
  materials: {
    brickRed: { wall: '#8f4a3e', roof: TUDOR_ROOF },
    brickBuff: { wall: '#c4955e', roof: TUDOR_ROOF },
    limestone: { wall: '#d9cfb0', roof: BONUS_DECK },
    ...INVARIANT,
    brickDark: { wall: '#4e3a33', roof: BONUS_DECK },
  },
  stone: {
    trim: '#e8dcc0',
    gilt: '#b9a46a',
    // The gatehouse is brick, darker than the halls so it reads against them.
    towerStone: '#9a5646',
    // Leaded lights: darker than a painted sash.
    glass: 'rgba(58, 66, 74, 0.62)',
  },
  roof: {
    ridgeMetres: { hall: 11.0, village: 6.0, pavilion: 5.0 },
    residentialRidgeMetres: (storeys: number) => (storeys <= 3 ? 7.0 : 6.0),
    parapet: 0,
    eavesMetres: 0.3,
  },
  windowShape: 'rect',
  parts: {
    entrance: { hall: 'porch', portico: 'colonnade', pavilion: 'canopy', residential: 'canopy', village: 'none' },
    rooflineEnd: 'none',
    apex: 'gatehouse',
    surfaceEntrance: 'canopy',
    crest: 'merlons',
    hood: true,
    chimneys: true,
    pairedLights: true,
    timbering: true,
  },
  massing: 'solid',
};

// Italianate: warm ochre stucco, low hips on deep bracketed eaves, tall
// round-headed windows, and a belvedere.
const ITALIANATE_ROOF = '#5a5550';
const ITALIANATE: VernacularSpec = {
  materials: {
    brickRed: { wall: '#d4a373', roof: ITALIANATE_ROOF },
    brickBuff: { wall: '#a15a45', roof: ITALIANATE_ROOF },
    limestone: { wall: '#e6dcc4', roof: BONUS_DECK },
    ...INVARIANT,
    brickDark: { wall: '#5e4a3c', roof: BONUS_DECK },
  },
  stone: { trim: '#f4ecd8', gilt: '#b8913a', towerStone: '#e3cfa9', glass: 'rgba(70, 64, 58, 0.55)' },
  roof: {
    ridgeMetres: { hall: 2.8, village: 3.0, pavilion: 2.2 },
    residentialRidgeMetres: (storeys: number) => (storeys <= 3 ? 3.0 : 2.4),
    parapet: 0,
    eavesMetres: 1.4,
  },
  windowShape: 'arched',
  parts: {
    entrance: { hall: 'portico', portico: 'colonnade', pavilion: 'canopy', residential: 'canopy', village: 'none' },
    rooflineEnd: 'none',
    apex: 'belvedere',
    surfaceEntrance: 'archway',
    crest: 'coping',
    hood: true,
    brackets: true,
  },
  massing: 'solid',
};

// Second Empire: pale sandstone under a steep slate mansard pierced by
// dormers, iron cresting, and a clock pavilion under its own mansard.
const MANSARD_SLATE = '#4d5566';
const SECOND_EMPIRE: VernacularSpec = {
  materials: {
    brickRed: { wall: '#d2c6a8', roof: MANSARD_SLATE },
    brickBuff: { wall: '#8e6a5a', roof: MANSARD_SLATE },
    limestone: { wall: '#a88c6b', roof: MANSARD_SLATE },
    ...INVARIANT,
    brickDark: { wall: '#4a3f3a', roof: BONUS_DECK },
  },
  stone: { trim: '#ece4d0', gilt: '#b89b4a', towerStone: '#ddd2b8', glass: PAINTED_SASH },
  roof: {
    // The mansard's lower slope, not a ridge: it is nearly a storey.
    ridgeMetres: { hall: 5.6, village: 4.0, pavilion: 4.0 },
    residentialRidgeMetres: (storeys: number) => (storeys <= 3 ? 4.4 : 4.0),
    parapet: 0,
    eavesMetres: 0.35,
    form: 'mansard',
  },
  windowShape: 'rect',
  parts: {
    entrance: { hall: 'portico', portico: 'colonnade', pavilion: 'portico', residential: 'canopy', village: 'none' },
    rooflineEnd: 'none',
    apex: 'pavilionTower',
    surfaceEntrance: 'portico',
    crest: 'coping',
  },
  massing: 'solid',
};

// Art Deco: cream limestone in vertical piers, flat roofs behind a tall
// parapet, and a stepped tower to a gilt mast.
const ART_DECO: VernacularSpec = {
  materials: {
    brickRed: { wall: '#ddd3bd', roof: BONUS_DECK },
    brickBuff: { wall: '#b88a5a', roof: BONUS_DECK },
    limestone: { wall: '#e0b98f', roof: BONUS_DECK },
    ...INVARIANT,
    brickDark: { wall: '#3f4a4f', roof: BONUS_DECK },
  },
  stone: { trim: '#efe8d6', gilt: '#c8a040', towerStone: '#e6dec9', glass: 'rgba(45, 60, 70, 0.65)' },
  roof: {
    ridgeMetres: {},
    residentialRidgeMetres: () => 0,
    parapet: up(1.2),
  },
  windowShape: 'rect',
  parts: {
    entrance: { hall: 'recess', portico: 'colonnade', pavilion: 'canopy', residential: 'canopy', village: 'none' },
    rooflineEnd: 'none',
    apex: 'ziggurat',
    surfaceEntrance: 'recess',
    crest: 'coping',
    piers: true,
  },
  massing: 'solid',
};

export const VERNACULARS: Record<Vernacular, VernacularSpec> = {
  georgian: GEORGIAN,
  gothic: GOTHIC,
  classical: CLASSICAL,
  mission: MISSION,
  modern: MODERN,
  tudor: TUDOR,
  italianate: ITALIANATE,
  secondEmpire: SECOND_EMPIRE,
  artDeco: ART_DECO,
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

// The seven motifs whose massing no vernacular may change: a Gothic campus's
// gym is still a shed and its hospital a modern hospital, and a grand
// landmark is its own statement (landmarks.tsx). Three of them still wear
// the vernacular's surface; see SURFACE_FOLLOWS_MOTIFS.
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

// Three of the seven keep their massing but take the vernacular's surface
// (Plan 74E): a Gothic science block is still a flat-roofed block, but it
// has lancets, merlons and a hooded door; a Mission one arched windows, a
// tile coping and an arched porch. By year 50 the school halls built on
// these motifs are most of a campus, so without this about half of it
// looked the same whatever was chosen at the founding (review A1-1). Their
// walls stay invariant materials; see materialOf.
export const SURFACE_FOLLOWS_MOTIFS = ['block', 'works', 'hangar'] as const satisfies readonly Motif[];

export function surfaceFollowsVernacular(m: Motif): boolean {
  return variesByVernacular(m) || (SURFACE_FOLLOWS_MOTIFS as readonly Motif[]).includes(m);
}

// What shape this building's openings are. The invariance is enforced here,
// not at each place a window is drawn.
export function paneShapeOf(t: Buildable, v: Vernacular): WindowShape {
  return surfaceFollowsVernacular(motifOf(t)) ? windowShapeOf(v) : 'rect';
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

// The bonus sets (prototype): drawn and tested, not offered at founding
// until something unlocks them.
export const BONUS_VERNACULAR_CHOICES: VernacularChoice[] = [
  { id: 'tudor', label: 'Tudor', blurb: 'Plum brick and black-and-white timbering, under tall stacks and a gatehouse.' },
  { id: 'italianate', label: 'Italianate', blurb: 'Ochre stucco and arched windows, on bracketed eaves under a belvedere.' },
  { id: 'secondEmpire', label: 'Second Empire', blurb: 'Pale stone under slate mansards, dormers and iron cresting.' },
  { id: 'artDeco', label: 'Art Deco', blurb: 'Cream limestone in soaring piers, stepping up to a gilt mast.' },
];

export function partsFor(v: Vernacular): VernacularParts {
  return VERNACULARS[v].parts;
}

// What goes at this building's entrance: the table's part for a varying
// motif, the vernacular's surface entrance for a block, lab or shed, and
// nothing for the other invariant motifs.
export function entrancePartOf(t: Buildable, v: Vernacular): EntrancePart {
  const motif = motifOf(t);
  if (gothicCivicOf(t, v)) return 'porch';
  if (!variesByVernacular(motif)) return surfaceFollowsVernacular(motif) ? partsFor(v).surfaceEntrance : 'none';
  return partsFor(v).entrance[motif] ?? 'none';
}

// What finishes a flat parapet on a block, lab or shed; 'none' elsewhere.
export function crestOf(t: Buildable, v: Vernacular): CrestPart {
  const motif = motifOf(t);
  return !variesByVernacular(motif) && surfaceFollowsVernacular(motif) ? partsFor(v).crest : 'none';
}

// The vernacular's roof, which the invariant massing wears on its plant
// screens and a tile coping (Plan 74E): the academic hall's own roof.
export function surfaceRoofOf(v: Vernacular): string {
  return materialsFor(v).brickRed.roof;
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
export const IMPLEMENTED_APEX_PARTS: ApexPart[] = ['cupola', 'spire', 'core', 'campanile', 'dome', 'gatehouse', 'belvedere', 'pavilionTower', 'ziggurat', 'none'];
export const IMPLEMENTED_CREST_PARTS: CrestPart[] = ['coping', 'merlons', 'balustrade', 'tile', 'none'];

// Whether this vernacular has a roof at all: derived (something pitched or a
// parapet), not declared, so it cannot be flagged off to dodge the palette check.
export function hasRoofForm(v: Vernacular): boolean {
  const r = roofFor(v);
  return Object.keys(r.ridgeMetres).length > 0 || r.parapet > 0;
}

export function parapetOf(v: Vernacular): number {
  return VERNACULARS[v].roof.parapet;
}

export function isMansard(v: Vernacular): boolean {
  return VERNACULARS[v].roof.form === 'mansard';
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
// Tall enough that a Modern front reads as glass between its bands, not as
// a parking garage's open decks (Plan 74G).
const RIBBON_HEIGHT = 0.66;
const RIBBON_DROP = 0.18;   // where the band sits within its own rank

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
  const own = baseMaterialOf(t, v);
  const pitched = roofFor(v).pitchedRoof;
  // The halls and the civic porticos; housing and the pavilions keep their
  // own roofs.
  const motif = motifOf(t);
  if (motif === 'chapel') return chapelMaterialOf(v);
  if (!pitched || own.roof === pitched || (motif !== 'hall' && motif !== 'portico') || ridgeOf(t, v) <= 0) return own;
  // One stable object per material, so BuildingMotif's memo still holds.
  let tiled = PITCHED_ROOFED.get(own);
  if (!tiled) { tiled = { ...own, roof: pitched }; PITCHED_ROOFED.set(own, tiled); }
  return tiled;
}
const PITCHED_ROOFED = new Map<Material, Material>();

function baseMaterialOf(t: Buildable, v: Vernacular): Material {
  const MATERIALS = materialsFor(v);
  if (t.kind === 'building') {
    const signature = signatureOf(t);
    return signature ? MATERIALS[signature.material] : MATERIALS.brickRed;
  }
  if (t.kind === 'dorm') {
    const motif = motifOf(t);
    if (motif === 'tower') return MATERIALS.curtain;
    return motif === 'village' ? MATERIALS.brickDark : MATERIALS[residenceStyleOf(t).material];
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

// The chapel (Plan 80I): its own drawing in every vernacular, where it had
// been a pavilion in stone. A nave under a steep roof runs down the long
// axis, with a tower at its west end (-col; -row when the footprint runs
// down the column) and a lower, narrower chancel at its east end, so the
// nave sits on the footprint's middle and its side doors on the doors
// walkRoutes.ts walks to. Tall windows down the nave, a rose in the east
// gable; buttresses where the set has them. What varies by set is this
// table; the geometry is chapelPlan's, shared with the weathering.
export type ChapelTower =
  | 'spire'        // a stone spire over a louvred belfry, pinnacles at its corners — Gothic
  | 'steeple'      // a belfry stage in the trim under a slim lead spire — Georgian, Second Empire
  | 'cupola'       // an open belfry in the trim under a small dome — Classical
  | 'campanile'    // an arcaded belfry under a low tile pyramid — Mission, Italianate
  | 'battlements'  // a crenellated tower with corner pinnacles — Tudor
  | 'stepped'      // two setbacks with gilt bands (8 m of the cap), to a gilt mast — Art Deco
  | 'blade';       // a slim slab with an open bell slot, no cap — Modern
export interface ChapelSpec {
  wall: keyof MaterialSet;   // the nave's, chancel's and tower's wall; the roof is the halls'
  window: WindowShape;       // the nave's tall windows and the doors' heads
  tower: ChapelTower;
  ridgeMetres: number;       // the nave roof's rise over its eaves
  towerMetres: number;       // the tower's shaft, to the top of its belfry
  capMetres: number;         // what stands on the shaft
  buttresses: boolean;
}
export const CHAPELS: Readonly<Record<Vernacular, ChapelSpec>> = {
  // Red brick under a white belfry and a lead spire: the college chapel of
  // a Georgian campus.
  georgian: { wall: 'brickRed', window: 'arched', tower: 'steeple', ridgeMetres: 5.5, towerMetres: 19, capMetres: 14, buttresses: false },
  // Pale ashlar, set apart from the gray halls, under the steepest roof.
  gothic: { wall: 'limestone', window: 'lancet', tower: 'spire', ridgeMetres: 9, towerMetres: 20, capMetres: 17, buttresses: true },
  classical: { wall: 'limestone', window: 'arched', tower: 'cupola', ridgeMetres: 4.2, towerMetres: 17, capMetres: 7, buttresses: false },
  mission: { wall: 'brickRed', window: 'arched', tower: 'campanile', ridgeMetres: 4.2, towerMetres: 18, capMetres: 4.5, buttresses: false },
  // White render under a steep deck roof, lit by slots, with a bell blade.
  modern: { wall: 'brickRed', window: 'slot', tower: 'blade', ridgeMetres: 8, towerMetres: 22, capMetres: 0, buttresses: false },
  tudor: { wall: 'brickRed', window: 'lancet', tower: 'battlements', ridgeMetres: 7, towerMetres: 19, capMetres: 3, buttresses: true },
  italianate: { wall: 'brickRed', window: 'arched', tower: 'campanile', ridgeMetres: 3.8, towerMetres: 20, capMetres: 4.5, buttresses: false },
  secondEmpire: { wall: 'brickRed', window: 'arched', tower: 'steeple', ridgeMetres: 6.5, towerMetres: 18, capMetres: 12, buttresses: false },
  artDeco: { wall: 'brickRed', window: 'slot', tower: 'stepped', ridgeMetres: 5, towerMetres: 17, capMetres: 15, buttresses: false },
};

// The chapel's wall, under the roof the halls wear. One stable object per
// vernacular, so BuildingMotif's memo still holds.
const CHAPEL_MATERIALS = new Map<Vernacular, Material>();
function chapelMaterialOf(v: Vernacular): Material {
  let m = CHAPEL_MATERIALS.get(v);
  if (!m) { m = { wall: materialsFor(v)[CHAPELS[v].wall].wall, roof: surfaceRoofOf(v) }; CHAPEL_MATERIALS.set(v, m); }
  return m;
}

export interface ChapelBox { col: number; row: number; w: number; h: number }
export interface ChapelPlan {
  // Whether the nave runs along the columns (the footprint is wide).
  alongW: boolean;
  // The tower's end and the chancel's, by grid direction, and the long sides.
  west: FaceDir; east: FaceDir; sides: [FaceDir, FaceDir];
  tower: ChapelBox; nave: ChapelBox; chancel: ChapelBox;
  // Screen units: the nave's and the chancel's eaves and ridges, the tower's shaft.
  naveHeight: number; naveRidge: number;
  chancelHeight: number; chancelRidge: number;
  towerHeight: number; capRise: number;
  // The nave's bays (odd, so its side doors stand in the middle one).
  bays: number;
}
const CHAPEL_TOWER_METRES = 10.5;     // the tower's plan
const CHAPEL_NAVE_SHARE = 0.8;        // of the footprint's short side
const CHAPEL_CHANCEL_SHARE = 0.62;    // of the nave's width
const CHAPEL_CHANCEL_EAVES = 0.78;    // of the nave's eaves
const CHAPEL_BAY_METRES = 4.6;

export function chapelPlan(p: ChapelBox, v: Vernacular): ChapelPlan {
  const spec = CHAPELS[v];
  const alongW = p.w >= p.h;
  const L = alongW ? p.w : p.h; const S = alongW ? p.h : p.w;
  const T = Math.min(across(CHAPEL_TOWER_METRES), S * 0.42);
  const N = S * CHAPEL_NAVE_SHARE; const Cw = N * CHAPEL_CHANCEL_SHARE;
  // x down the long axis from the tower's end, y across it.
  const box = (x0: number, x1: number, width: number): ChapelBox => {
    const y0 = (S - width) / 2;
    return alongW
      ? { col: p.col + x0, row: p.row + y0, w: x1 - x0, h: width }
      : { col: p.col + y0, row: p.row + x0, w: width, h: x1 - x0 };
  };
  const naveHeight = up(CLEAR_SPAN_METRES.chapel ?? 0);
  const naveRidge = up(spec.ridgeMetres);
  const bays = Math.max(3, Math.round(((L - 2 * T) * METRES_PER_TILE) / CHAPEL_BAY_METRES) | 1);
  return {
    alongW,
    west: alongW ? 'negCol' : 'negRow', east: alongW ? 'posCol' : 'posRow',
    sides: alongW ? ['negRow', 'posRow'] : ['negCol', 'posCol'],
    tower: box(0, T, T),
    nave: box(T, L - T, N),
    chancel: box(L - T, L, Cw),
    naveHeight, naveRidge,
    chancelHeight: naveHeight * CHAPEL_CHANCEL_EAVES,
    // The same pitch over the narrower span.
    chancelRidge: naveRidge * CHAPEL_CHANCEL_SHARE,
    towerHeight: up(spec.towerMetres), capRise: up(spec.capMetres),
    bays,
  };
}

// The dining halls (Plan 87D). One low hipped shed scaled up read as a barn
// at the large sizes, so the chain is drawn in three bands by what it
// serves (as built, as storeysOf reads it): a café under a striped awning
// with tables out front; a hall over a dining terrace of tables and
// parasols; and from the 9x6 up a refectory, one tall room under a steep
// roof (Christ Church's hall, Harvard's Annenberg) with its kitchen at the
// service end. The terrace lies along the long wall the camera sees, as the
// doors do, so the mass stands back from it: the plan turns with the view.
// Thresholds are campusMap.ts's dining ladder's, kept as literals.
const DINING_TERRACE_MIN_SERVES = 1_200;
const DINING_REFECTORY_MIN_SERVES = 7_000;
export type DiningBand = 'cafe' | 'terrace' | 'refectory';
export function diningBandOf(t: Buildable): DiningBand | undefined {
  if (t.kind !== 'facility' || t.facilityType !== 'diningHall') return undefined;
  const serves = asBuilt(t).effects?.servesPopulation ?? 0;
  if (serves >= DINING_REFECTORY_MIN_SERVES) return 'refectory';
  return serves >= DINING_TERRACE_MIN_SERVES ? 'terrace' : 'cafe';
}

// The refectory by vernacular: its windows ('glazed' is plinth-to-eaves
// glass), its roof, what stands on the ridge, and its long front.
export type RefectoryRoof = 'gable' | 'mansard' | 'flat';
export type RefectoryLantern =
  | 'louvre'   // a hexagonal open louvre under a spirelet — the medieval hall's smoke vent
  | 'cupola'   // a white octagonal cupola under a lead dome
  | 'none';
export interface RefectorySpec {
  window: WindowShape | 'glazed';
  roof: RefectoryRoof;
  ridgeMetres: number;
  lantern: RefectoryLantern;
  buttresses: boolean;
  // An arcade (Mission's) along the front, or a flat roof's deep oversail
  // over the terrace (Modern's glass pavilion), in metres.
  arcade: boolean;
  oversailMetres: number;
}
export const REFECTORIES: Readonly<Record<Vernacular, RefectorySpec>> = {
  georgian: { window: 'arched', roof: 'gable', ridgeMetres: 8, lantern: 'cupola', buttresses: false, arcade: false, oversailMetres: 0 },
  gothic: { window: 'lancet', roof: 'gable', ridgeMetres: 13, lantern: 'louvre', buttresses: true, arcade: false, oversailMetres: 0 },
  classical: { window: 'arched', roof: 'gable', ridgeMetres: 6, lantern: 'cupola', buttresses: false, arcade: false, oversailMetres: 0 },
  mission: { window: 'arched', roof: 'gable', ridgeMetres: 6, lantern: 'none', buttresses: false, arcade: true, oversailMetres: 0 },
  modern: { window: 'glazed', roof: 'flat', ridgeMetres: 0, lantern: 'none', buttresses: false, arcade: false, oversailMetres: 4.5 },
  tudor: { window: 'lancet', roof: 'gable', ridgeMetres: 12, lantern: 'louvre', buttresses: true, arcade: false, oversailMetres: 0 },
  italianate: { window: 'arched', roof: 'gable', ridgeMetres: 5.5, lantern: 'cupola', buttresses: false, arcade: false, oversailMetres: 0 },
  secondEmpire: { window: 'arched', roof: 'mansard', ridgeMetres: 7, lantern: 'cupola', buttresses: false, arcade: false, oversailMetres: 0 },
  artDeco: { window: 'slot', roof: 'flat', ridgeMetres: 0, lantern: 'none', buttresses: false, arcade: false, oversailMetres: 0 },
};
// The hall's eaves at the 9x6; the two largest stand a little taller. The
// kitchen and the back range as shares of them.
function refectoryEavesMetres(t: Buildable): number {
  return (asBuilt(t).effects?.servesPopulation ?? 0) >= 10_000 ? 13.5 : 12;
}
export const REFECTORY_KITCHEN_EAVES = 0.72;
export const REFECTORY_BACK_EAVES = 0.4;

export interface DiningPlan {
  band: DiningBand;
  // Whether the long axis runs along the columns.
  alongW: boolean;
  // The long wall the terrace lies along, and the end the kitchen takes.
  front: FaceDir; service: FaceDir;
  terrace: ChapelBox;
  // The café's or hall's own mass.
  hall: ChapelBox;
  // A refectory's kitchen at the service end and its lower range behind.
  kitchen?: ChapelBox; back?: ChapelBox;
}

// The plan, given the walls the camera sees (isoProjection's visibleWalls).
export function diningPlan(t: Buildable, p: ChapelBox, seen: { left: FaceDir; right: FaceDir }, v: Vernacular): DiningPlan {
  const band = diningBandOf(t) ?? 'cafe';
  const alongW = p.w >= p.h;
  const L = alongW ? p.w : p.h; const S = alongW ? p.h : p.w;
  const rowWall = (d: FaceDir) => d === 'posRow' || d === 'negRow';
  const front = [seen.left, seen.right].find((d) => rowWall(d) === alongW) ?? (alongW ? 'posRow' : 'posCol');
  const service: FaceDir = alongW ? 'posCol' : 'posRow';
  // x down the long axis, y in from the front.
  const box = (x0: number, x1: number, y0: number, y1: number): ChapelBox => {
    switch (front) {
      case 'posRow': return { col: p.col + x0, row: p.row + p.h - y1, w: x1 - x0, h: y1 - y0 };
      case 'negRow': return { col: p.col + x0, row: p.row + y0, w: x1 - x0, h: y1 - y0 };
      case 'posCol': return { col: p.col + p.w - y1, row: p.row + x0, w: y1 - y0, h: x1 - x0 };
      default: return { col: p.col + y0, row: p.row + x0, w: y1 - y0, h: x1 - x0 };
    }
  };
  if (band !== 'refectory') {
    const T = band === 'cafe' ? 0.8 : Math.min(1.6, Math.max(1.2, S * 0.3));
    return { band, alongW, front, service, terrace: box(0, L, 0, T), hall: box(0, L, T, S) };
  }
  const spec = REFECTORIES[v];
  // Modern's roof oversails the terrace, so its tables stand further out.
  const T = Math.min(1.7, Math.max(1.3, S * 0.24)) + across(spec.oversailMetres) * 0.5;
  const G = Math.min(3.0, Math.max(2.3, S * 0.4));
  const K = Math.min(2.3, Math.max(1.8, L * 0.2));
  const B = Math.min(2.2, S - T - G);
  return {
    band, alongW, front, service,
    terrace: box(0, L, 0, T),
    hall: box(0, L - K, T, T + G),
    // The kitchen square, as the college kitchens are; the range runs on
    // behind it.
    kitchen: box(L - K, L, T + 0.2, T + 0.2 + Math.min(G + B - 0.2, K * 1.1)),
    back: box(0.35, L - 0.3, T + G, T + G + B),
  };
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

// The Triumphal Gate (landmarks.tsx), its passages cut through (Plan 75B):
// the body inset from its plot, the great arch through the long faces and
// the lesser arch through the ends, as shares of the body's faces and of the
// gate's height. The map's walkers route through the passages
// (walkRoutes.ts) and are hidden by the masonry either side and over them
// (Walkers.tsx), so all three read the gate from here.
export const GATE_ID = 'LANDMARK-GATE';
export const GATE_INSET = 0.2;
export const GATE_BODY_SHARE = 0.8;       // of the height; the attic is the rest
export const GATE_ARCH_HALF = 0.14;       // of the long face's width
export const GATE_ARCH_TOP = 0.6;         // of the height
export const GATE_SIDE_ARCH_HALF = 0.18;  // of the end face's width
export const GATE_SIDE_ARCH_TOP = 0.4;    // of the height

export interface GateBox { col: number; row: number; w: number; h: number; z0: number; z1: number }

// The gate's masonry as boxes: four piers from the ground to the top, and
// the spans over the two passages from each arch's crown to the top.
export function gatePieces(p: { col: number; row: number; w: number; h: number }, height: number): GateBox[] {
  const alongW = p.w >= p.h;
  const L = alongW ? p.w : p.h; const S = alongW ? p.h : p.w;
  const l0 = (alongW ? p.col : p.row) + GATE_INSET; const l1 = l0 + L - GATE_INSET * 2;
  const s0 = (alongW ? p.row : p.col) + GATE_INSET; const s1 = s0 + S - GATE_INSET * 2;
  const lc = (l0 + l1) / 2; const sc = (s0 + s1) / 2;
  const lh = GATE_ARCH_HALF * (l1 - l0); const sh = GATE_SIDE_ARCH_HALF * (s1 - s0);
  const box = (a0: number, a1: number, b0: number, b1: number, z0: number, z1: number): GateBox => (alongW
    ? { col: a0, row: b0, w: a1 - a0, h: b1 - b0, z0, z1 }
    : { col: b0, row: a0, w: b1 - b0, h: a1 - a0, z0, z1 });
  return [
    box(l0, lc - lh, s0, sc - sh, 0, height), box(l0, lc - lh, sc + sh, s1, 0, height),
    box(lc + lh, l1, s0, sc - sh, 0, height), box(lc + lh, l1, sc + sh, s1, 0, height),
    box(lc - lh, lc + lh, s0, s1, height * GATE_ARCH_TOP, height),
    box(l0, l1, sc - sh, sc + sh, height * GATE_SIDE_ARCH_TOP, height),
  ];
}

// The tiles a walker crosses the gate on: the great passage across its
// middle and the lesser one down its length.
export function gatePassageTiles(p: { col: number; row: number; w: number; h: number }): { col: number; row: number }[] {
  const alongW = p.w >= p.h;
  const out: { col: number; row: number }[] = [];
  for (let r = p.row; r < p.row + p.h; r++) {
    for (let c = p.col; c < p.col + p.w; c++) {
      const across = alongW ? c - p.col === Math.floor(p.w / 2) : r - p.row === Math.floor(p.h / 2);
      const down = alongW ? r - p.row === Math.floor(p.h / 2) : c - p.col === Math.floor(p.w / 2);
      if (across || down) out.push({ col: c, row: r });
    }
  }
  return out;
}
