import { hostedPrograms, isGraduateHost, MEDICAL_CENTER_ID, MEDICAL_CENTER_PROJECT, PROJECTS } from './projectData';
import type { Buildable, FacilityType } from '../state/types';
import { FOUNDING_BODY } from './foundingData';

// Campus-life facilities: `facility`-kind Buildables on the shared machinery
// (docs/architecture/buildables.md; do not fork a subsystem). Each serves a
// fixed number of students; satisfactionSystem.ts sums servesPopulation per
// satisfactionAttribute against enrolled students each week (live-read, see
// BuildableEffects in state/types.ts).
//
// Two shapes: repeatable sequential chains (dining halls), and single
// buildings upgraded by tier (library, student center, rec center, health
// center, quad).
//
// Facility tuning: facilities are a cost that arrives first. Enrollment
// dilutes every ratio the week admissions commits it, so the fix must be
// bought, and its upkeep carried, before that class's tuition lands. Build
// costs are roughly a third to a half of the dorm with a similar bed count;
// per-served upkeep is a visible slice of tuition, highest for dining and
// health (staff-heavy).
const UPKEEP_PER_SERVED_PER_WEEK: Record<string, number> = {
  diningHall: 2.2,
  grocery: 1.0,           // shelving/registers, lighter than a full-service dining hall's kitchen staff
  library: 0.9,
  studentCenter: 1.0,
  recCenter: 1.1,
  healthCenter: 1.6,
  gym: 1.0,               // fitness staff and equipment upkeep, in line with the student center
  tennisCourts: 0.5,      // outdoor courts, minimal staffing
  pool: 1.5,              // lifeguards plus chemical/mechanical upkeep — pricier per head than a gym
  artGallery: 0.7,        // curatorial and security staff, lighter than a working venue
  // Varsity venues host competition, so they cost more per head than the
  // recreational trio above.
  athleticsField: 0.9,
  athleticsArena: 1.4,
  athleticsDiamond: 1.0,
  athleticsNatatorium: 1.8, // a competition pool: timing equipment and certified officials, pricier than the rec Swimming Pool above
  footballStadium: 1.2,
  fieldHouse: 1.0,          // weight rooms, a training floor, treatment rooms — no stand
};

// Exported for engine/reducer.ts's RENOVATE_LIBRARY, so the rate lives in one place.
export function servedUpkeep(facilityType: keyof typeof UPKEEP_PER_SERVED_PER_WEEK, servesPopulation: number): number {
  return Math.round(UPKEEP_PER_SERVED_PER_WEEK[facilityType] * servesPopulation);
}

// --- Dining hall: repeatable chain, basic need, scales hard with capacity ---
// basicNeeds carries the steepest under-capacity penalty
// (satisfactionSystem.ts's BASIC_NEEDS_PENALTY_CURVATURE).
//
// Eight authored halls (350 to 16,000) that roughly double at the small end
// and taper to ~1.35x, so each is a meaningful share of campus dining and
// visibly bigger on the map (campusMap.ts's DINING_FOOTPRINTS reads
// servesPopulation). The chain serves 47,050; with the grocery and the
// towers' retail (campusData.ts) the campus feeds about 70,000 at 1:1. Cost
// per seat climbs (1.3k -> 2.4k), like the dorm chain.
const DINING_STARTING_ID = 'DINING-01';
const DINING_STARTING_SERVES = FOUNDING_BODY; // one founding hall feeds exactly the founding (all-commuter) class
// Cheap and quick, so feeding the founding class does not swallow the
// opening budget.
const DINING_STARTING_COST = 250_000;
const DINING_STARTING_WEEKS = 12;

// One rung per hall after the founding one, in build order.
interface DiningRung {
  id: string;
  name: string;
  serves: number;
  cost: number;
  weeks: number;
}

const DINING_RUNGS: DiningRung[] = [
  { id: 'DININGHALL-02', name: 'Union Square Eatery', serves: 900, cost: 1_200_000, weeks: 14 },
  { id: 'DININGHALL-03', name: 'Commons Cafeteria', serves: 1_800, cost: 2_700_000, weeks: 16 },
  { id: 'DININGHALL-04', name: 'The Grand Table', serves: 3_000, cost: 5_000_000, weeks: 18 },
  { id: 'DININGHALL-05', name: 'Old Well Commons', serves: 5_000, cost: 9_000_000, weeks: 20 },
  { id: 'DININGHALL-06', name: 'Waterside Commons', serves: 8_000, cost: 16_000_000, weeks: 22 },
  { id: 'DININGHALL-07', name: 'Harborview Market', serves: 12_000, cost: 26_400_000, weeks: 24 },
  { id: 'DININGHALL-08', name: 'Central Dining Pavilion', serves: 16_000, cost: 38_400_000, weeks: 26 },
];

function diningChain(): Buildable[] {
  const nodes: Buildable[] = [
    {
      id: DINING_STARTING_ID,
      kind: 'facility',
      facilityType: 'diningHall',
      name: 'The Original Commons',
      description: `The college's first dining hall — build it to feed the founding class. Serves ${DINING_STARTING_SERVES.toLocaleString()} students.`,
      cost: DINING_STARTING_COST,
      duration: DINING_STARTING_WEEKS,
      prereqs: [],
      // Available from day one: the campus opens empty. Effects are
      // live-read, so they count only once it is built.
      status: 'available',
      effects: {
        servesPopulation: DINING_STARTING_SERVES,
        satisfactionAttribute: 'basicNeeds',
        upkeepPerWeek: servedUpkeep('diningHall', DINING_STARTING_SERVES),
      },
    },
  ];

  let previousId = DINING_STARTING_ID;
  for (const rung of DINING_RUNGS) {
    nodes.push({
      id: rung.id,
      kind: 'facility',
      facilityType: 'diningHall',
      name: rung.name,
      description: `Serves ${rung.serves.toLocaleString()} more students.`,
      cost: rung.cost,
      duration: rung.weeks,
      prereqs: [previousId], // strictly sequential, same reasoning as the dorm chain
      // Each unlocks the tick its prereq finishes.
      status: 'locked',
      effects: {
        servesPopulation: rung.serves,
        satisfactionAttribute: 'basicNeeds',
        upkeepPerWeek: servedUpkeep('diningHall', rung.serves),
      },
    });
    previousId = rung.id;
  }

  return nodes;
}

// --- Campus grocery store: single building, basicNeeds, population-gated ---
// A second basicNeeds feeder: one building unlocked past a population gate,
// a late-game top-up to close the dining chain's max-buildout gap. Cheaper
// per seat and in upkeep than a dining hall (no kitchen).
export const GROCERY_POPULATION_GATE = 8_000;
const GROCERY_ID = 'GROCERY-01';
const GROCERY_SERVES = 17_500;
const GROCERY_COST = 15_750_000; // 900/seat
const GROCERY_WEEKS = 20;

// --- Library: single building, academic ---
// One building, its capacity grown by renovation (floors on tier 1). The
// research library that was its second tier is gone (Plan 53): the Research
// Park is research's building now.
export const LIBRARY_TIER1_ID = 'LIB-T1';
const LIBRARY_TIER1_SERVES = 1_200;
const LIBRARY_TIER1_COST = 360_000;
const LIBRARY_TIER1_WEEKS = 12;

// Renovations add floors to the existing tier-1 building rather than a new
// Buildable: engine/reducer.ts's RENOVATE_LIBRARY returns the placed node to
// 'developing' and on completion raises its servesPopulation/upkeepPerWeek
// in place. Existing floors keep serving during the work (types.ts's
// servingPopulation). The map shows a story per floor added
// (buildingMotifs.tsx's addedFloors).
//
// Maxed tier 1 (1,200 + 3 floors) plus tier 2 serves 12,325, adequate to
// ~82,000 enrolled at the 0.15 target ratio, past the 40k-56k the strongest
// balance strategies reach by year 40.
export const LIBRARY_FLOOR_MAX = 3;
const LIBRARY_FLOOR_BASE_SERVES = 2_000;
const LIBRARY_FLOOR_SERVES_GROWTH = 1.25;
const LIBRARY_FLOOR_BASE_COST = 2_200_000;
const LIBRARY_FLOOR_COST_GROWTH = 1.35;
const LIBRARY_FLOOR_BASE_WEEKS = 26;
const LIBRARY_FLOOR_WEEKS_GROWTH = 1.08;

export interface LibraryFloorPlan {
  servesGain: number;
  cost: number;
  weeks: number;
}

// The next renovation's plan, or null at LIBRARY_FLOOR_MAX. Derived from
// node.floorsAdded so the reducer and the build panel always agree.
export function nextLibraryFloor(node: Buildable): LibraryFloorPlan | null {
  const floorsAdded = node.floorsAdded ?? 0;
  if (floorsAdded >= LIBRARY_FLOOR_MAX) return null;
  return {
    servesGain: Math.round(LIBRARY_FLOOR_BASE_SERVES * LIBRARY_FLOOR_SERVES_GROWTH ** floorsAdded),
    cost: Math.round(LIBRARY_FLOOR_BASE_COST * LIBRARY_FLOOR_COST_GROWTH ** floorsAdded),
    weeks: Math.round(LIBRARY_FLOOR_BASE_WEEKS * LIBRARY_FLOOR_WEEKS_GROWTH ** floorsAdded),
  };
}

// --- Student center: single building, two tiers, social + passive retention ---
const STUDENT_CENTER_TIER1_ID = 'SCTR-T1';
const STUDENT_CENTER_TIER1_SERVES = 1_000;
const STUDENT_CENTER_TIER1_COST = 330_000;
const STUDENT_CENTER_TIER1_WEEKS = 10;
const STUDENT_CENTER_TIER2_ID = 'SCTR-T2';
const STUDENT_CENTER_TIER2_SERVES = 3_000;
const STUDENT_CENTER_TIER2_COST = 1_150_000;
const STUDENT_CENTER_TIER2_WEEKS = 20;

// --- The fitness chain: Gym -> Pool -> Tennis Courts -> Athletics Complex ---
// Four one-off facilities chained strictly in order, like the dorm and
// dining chains, so recreation reads as a queue. The gym opens behind the
// Health & Counseling Center, not the Recreation Center (Plan 68): a college
// short of health could not see the way to it through a social building. BuildPopup.tsx's
// TYPE_MATCHERS groups them under 'recCenter'. Costs are not monotonic
// along the chain; the order is judgment. The Athletics Complex also needs
// REC_CENTER_TIER2_PRESTIGE_GATE (techSystem.ts's meetsUnlockGates).
//
// Recreation Center and Athletics Complex feed `social`; gym, pool and
// tennis feed `health`, which needs scaling capacity of its own.
//
// Rec facilities are never varsity venues: competition venues are separate
// Buildables below (the rec pool vs. the natatorium), so a rec facility's
// social contribution never doubles as an athletics gate.
const REC_CENTER_TIER1_ID = 'REC-T1';
const REC_CENTER_TIER1_SERVES = 1_200;
const REC_CENTER_TIER1_COST = 450_000;
const REC_CENTER_TIER1_WEEKS = 12;
const REC_CENTER_TIER1_PRESTIGE = 0.05;
// Gym/pool/tennis serve figures carry real `health` capacity, priced at the
// same $/seat each was built at.
const GYM_ID = 'GYM';
const GYM_SERVES = 4_000;
const GYM_COST = 1_400_000;
const GYM_WEEKS = 22;
const POOL_ID = 'POOL';
const POOL_SERVES = 3_000;
const POOL_COST = 1_370_000;
const POOL_WEEKS = 20;
const TENNIS_COURTS_ID = 'TENNIS-COURTS';
const TENNIS_COURTS_SERVES = 2_000;
const TENNIS_COURTS_COST = 700_000;
const TENNIS_COURTS_WEEKS = 14;
const REC_CENTER_TIER2_ID = 'REC-T2';
const REC_CENTER_TIER2_SERVES = 3_500;
const REC_CENTER_TIER2_COST = 1_900_000;
const REC_CENTER_TIER2_WEEKS = 28;
const REC_CENTER_TIER2_PRESTIGE = 0.10;
export const REC_CENTER_TIER2_PRESTIGE_GATE = 55;

// The gallery's own major's tier-2 course ids, as literals because
// techData.ts imports from this file and importing back would be circular.
const STUDIO_ART_TIER2_IDS = ['SART110', 'SART120', 'SART130', 'SART140'];

// --- Arts facilities: the art gallery ---
// A one-off facility feeding `social` that also gates Studio Art's tier-3
// courses (techData.ts's ARTS_CAPSTONE_GATE, like a science Lab), hidden
// until Studio Art's tier-2 quartet is done, so the gate is never circular.
// The Performing Arts Center that did the same for Music is gone (Plan 51):
// the Arts Center, a capital project, is the concert hall now.
export const ART_GALLERY_ID = 'ART-GALLERY';
const ART_GALLERY_SERVES = 500;
const ART_GALLERY_COST = 220_000;
const ART_GALLERY_WEEKS = 8;

// --- Varsity athletics venues: shared competition facilities, HIDDEN until demanded ---
// Sport -> category mapping: studentLifeData.ts's SPORTS; reveal:
// eventData.ts's 'varsity-petition'. Each is seeded 'locked' with
// `athleticsVenueReveal: true` and empty prereqs, so the reveal gate
// (techSystem.ts's meetsUnlockGates) is what keeps it hidden.
const ATHLETICS_FIELD_ID = 'ATH-FIELD';
const ATHLETICS_FIELD_SERVES = 700;
const ATHLETICS_FIELD_COST = 650_000;
const ATHLETICS_FIELD_WEEKS = 16;

const ATHLETICS_ARENA_ID = 'ATH-ARENA';
const ATHLETICS_ARENA_SERVES = 1_400;
const ATHLETICS_ARENA_COST = 1_800_000;
const ATHLETICS_ARENA_WEEKS = 24;

const ATHLETICS_DIAMOND_ID = 'ATH-DIAMOND';
const ATHLETICS_DIAMOND_SERVES = 500;
const ATHLETICS_DIAMOND_COST = 480_000;
const ATHLETICS_DIAMOND_WEEKS = 12;

const ATHLETICS_NATATORIUM_ID = 'ATH-NATATORIUM';
const ATHLETICS_NATATORIUM_SERVES = 550;
const ATHLETICS_NATATORIUM_COST = 950_000;
const ATHLETICS_NATATORIUM_WEEKS = 18;

// The pinnacle venue: most expensive, largest footprint (campusMap.ts's
// footprintOf), revealed only by football's own petition.
const FOOTBALL_STADIUM_ID = 'ATH-STADIUM';
const FOOTBALL_STADIUM_SERVES = 2_500;
const FOOTBALL_STADIUM_COST = 6_500_000;
const FOOTBALL_STADIUM_WEEKS = 40;

// Seats per venue, for the gate. Keyed by id rather than stored in effects
// so saves need no migration. The stadium is far larger than any early
// crowd, so filling it takes decades.
export const VENUE_SEATS: Readonly<Record<string, number>> = {
  'ATH-FIELD': 4_000,
  'ATH-ARENA': 8_000,
  'ATH-DIAMOND': 3_000,
  'ATH-NATATORIUM': 1_500,
  'ATH-STADIUM': 40_000,
};

// Venue prestigeContribution, sized to the building. The five (0.40) plus the
// rec chain (0.15) reach 0.55 of prestigeSystem.ts's campus-life term; the
// rest comes from organizations, programs and titles.
const ATHLETICS_FIELD_PRESTIGE = 0.06;
const ATHLETICS_ARENA_PRESTIGE = 0.10;
const ATHLETICS_DIAMOND_PRESTIGE = 0.04;
const ATHLETICS_NATATORIUM_PRESTIGE = 0.05;
const FOOTBALL_STADIUM_PRESTIGE = 0.15;

// The field house: revealed once the school fields any team; lifts every
// program's coaching (studentLifeData.ts's fieldHouseLift, where its id lives).
const FIELD_HOUSE_SERVES = 800;
const FIELD_HOUSE_COST = 1_200_000;
const FIELD_HOUSE_WEEKS = 14;
const FIELD_HOUSE_PRESTIGE = 0.03;

// Venue expansions, in place like library renovations, up to
// VENUE_EXPANSIONS_MAX. Each adds seats, social capacity and a little
// prestige for a growing share of the original price. The only way the
// gate's ceiling rises.
export const VENUE_EXPANSIONS_MAX = 2;
// Each venue's own cap (Plan 54): the fields grow from the field alone to
// stands to full seating in two, the arena rises two storeys, and the
// natatorium one. The stadium has a third (Plan 61): a second deck all round.
const VENUE_EXPANSIONS_CAP: Readonly<Record<string, number>> = { 'ATH-NATATORIUM': 1, 'ATH-STADIUM': 3 };
export function venueExpansionsMax(id: string): number {
  return VENUE_EXPANSIONS_CAP[id] ?? VENUE_EXPANSIONS_MAX;
}
export const VENUE_EXPANSION_SEATS_GAIN = 0.5;
// The stadium's second deck adds this share of the full bowl's seats, rather
// than the base's half: a truly massive stadium (Plan 61).
const SECOND_DECK_SEATS_GAIN = 0.6;
const VENUE_EXPANSION_COST_SHARE = 0.45;
const VENUE_EXPANSION_COST_GROWTH = 1.3;
const VENUE_EXPANSION_WEEKS_SHARE = 0.5;
const VENUE_EXPANSION_SERVES_GAIN = 0.3;
const VENUE_EXPANSION_PRESTIGE_GAIN = 0.02;

export interface VenueExpansionPlan {
  cost: number;
  weeks: number;
  seatsGain: number;
  servesGain: number;
  prestigeGain: number;
}

// Seeded price and duration: stored `cost` may be reduced by a state match
// (eventData.ts's 'state-capital-match'), which must not discount expansions.
const VENUE_BASE: Readonly<Record<string, { cost: number; weeks: number }>> = {
  'ATH-FIELD': { cost: ATHLETICS_FIELD_COST, weeks: ATHLETICS_FIELD_WEEKS },
  'ATH-ARENA': { cost: ATHLETICS_ARENA_COST, weeks: ATHLETICS_ARENA_WEEKS },
  'ATH-DIAMOND': { cost: ATHLETICS_DIAMOND_COST, weeks: ATHLETICS_DIAMOND_WEEKS },
  'ATH-NATATORIUM': { cost: ATHLETICS_NATATORIUM_COST, weeks: ATHLETICS_NATATORIUM_WEEKS },
  'ATH-STADIUM': { cost: FOOTBALL_STADIUM_COST, weeks: FOOTBALL_STADIUM_WEEKS },
};

export function nextVenueExpansion(node: Buildable): VenueExpansionPlan | null {
  const base = VENUE_BASE[node.id];
  const seats = VENUE_SEATS[node.id];
  if (!base || seats === undefined) return null;
  const done = node.expansions ?? 0;
  if (done >= venueExpansionsMax(node.id)) return null;
  return {
    cost: Math.round(base.cost * VENUE_EXPANSION_COST_SHARE * VENUE_EXPANSION_COST_GROWTH ** done),
    weeks: Math.round(base.weeks * VENUE_EXPANSION_WEEKS_SHARE),
    seatsGain: venueSeatsOf({ ...node, expansions: done + 1 }) - venueSeatsOf(node),
    servesGain: Math.round((node.effects?.servesPopulation ?? 0) * VENUE_EXPANSION_SERVES_GAIN),
    prestigeGain: VENUE_EXPANSION_PRESTIGE_GAIN,
  };
}

// What a venue seats with its expansions (gate.ts reads this).
export function venueSeatsOf(node: Buildable): number {
  const base = VENUE_SEATS[node.id] ?? 0;
  const n = node.expansions ?? 0;
  const bowl = base * (1 + VENUE_EXPANSION_SEATS_GAIN * Math.min(n, VENUE_EXPANSIONS_MAX));
  return Math.round(n > VENUE_EXPANSIONS_MAX ? bowl * (1 + SECOND_DECK_SEATS_GAIN) : bowl);
}

// Categories: a UI-only grouping above FacilityType (BuildPopup.tsx's
// TYPE_MATCHERS), authored once here. 'athletics' is the varsity
// competition venues plus the field house; 'social' is the student center
// and the recreational and cultural buildings; 'academic' is the library
// and labs (halls are assigned by kind in the build menu). Unlisted types
// have their own grouping.
export type FacilityCategory = 'athletics' | 'social' | 'academic';

export const FACILITY_CATEGORY_OF: Partial<Record<FacilityType, FacilityCategory>> = {
  library: 'academic',
  lab: 'academic',
  studentCenter: 'social',
  recCenter: 'social',
  gym: 'social',
  tennisCourts: 'social',
  pool: 'social',
  artGallery: 'social',
  athleticsField: 'athletics',
  athleticsArena: 'athletics',
  athleticsDiamond: 'athletics',
  athleticsNatatorium: 'athletics',
  fieldHouse: 'athletics',
  footballStadium: 'athletics',
};

// --- The health chain: Health & Counseling Center -> University Clinic ---
// --- -> Medical Center ---
// Three different buildings, each unlocked past a population threshold:
//   - Health & Counseling Center (3x3).
//   - University Clinic (5x5): also the practicum site for clinical majors
//     (techData.ts's CLINICAL_PRACTICUM_GATE).
//   - Medical Center (11x11): the largest building on campus, and a capital
//     project (projectData.ts's MEDICAL_CENTER_PROJECT): it lifts academics
//     and research, opens from Year 15, and can be paid half from the
//     endowment. The MD's clerkship needs it. Until Plan 50 it was the
//     University Hospital, and waited on the School of Medicine.
//
// Capacity tracks footprint at about 220-250 served per tile; cost per seat
// climbs (280 -> 400 -> 650). Fully built the chain serves 38,000 (plus the
// fitness trio's 9,000).
export const HEALTH_CENTER_TIER1_POPULATION_GATE = 1_500;
const HEALTH_CENTER_TIER1_ID = 'HLTH-T1';
const HEALTH_CENTER_TIER1_SERVES = 2_000;
const HEALTH_CENTER_TIER1_COST = 560_000;
const HEALTH_CENTER_TIER1_WEEKS = 14;
// Exported for techData.ts's CLINICAL_PRACTICUM_GATE.
export const HEALTH_CENTER_TIER2_POPULATION_GATE = 6_000;
export const HEALTH_CENTER_TIER2_ID = 'HLTH-T2';
const HEALTH_CENTER_TIER2_SERVES = 6_000;
const HEALTH_CENTER_TIER2_COST = 2_400_000; // 400/seat
const HEALTH_CENTER_TIER2_WEEKS = 26;
export const HEALTH_CENTER_TIER3_POPULATION_GATE = 20_000;
export const HEALTH_CENTER_TIER3_ID = 'HLTH-T3';
const HEALTH_CENTER_TIER3_SERVES = 30_000;
const HEALTH_CENTER_TIER3_COST = 19_500_000; // 650/seat
const HEALTH_CENTER_TIER3_WEEKS = 48;

// --- Green space/quad: single, cheap, FLAT (non-population-scaling) bonus ---
// Worth the same at any enrollment, which is why it is cheap and worth
// building early.
const QUAD_TIER1_ID = 'QUAD-T1';
const QUAD_TIER1_FLAT_BONUS = 8;
const QUAD_TIER1_COST = 60_000;
const QUAD_TIER1_WEEKS = 4;
const QUAD_TIER1_UPKEEP = 400;
// The Second Quad (QUAD-S2) is gone since Plan 59; a save that built one
// keeps it (persistence.ts).
const QUAD_TIER2_ID = 'QUAD-T2';
const QUAD_TIER2_FLAT_BONUS = 12;
const QUAD_TIER2_COST = 190_000;
const QUAD_TIER2_WEEKS = 8;
const QUAD_TIER2_UPKEEP = 1_000;

// The grand landmarks: a long build and a large payoff, a share of prestige's
// campus-life input the size of the football stadium's twice over, and a
// one-time lift to the applicant pool. Never on the harness's path: none has
// a satisfaction attribute, which is how a strategy picks a facility.
export const GRAND_LANDMARK_COST = 30_000_000;
export const GRAND_LANDMARK_WEEKS = 156;
const GRAND_LANDMARK_PRESTIGE = 0.3;
const GRAND_LANDMARK_APPLICANTS = 1_500;
const GRAND_LANDMARK_UPKEEP = 30_000;
// Half of beauty's landmark target on its own (systems/estate/beauty.ts).
const GRAND_LANDMARK_BEAUTY = 3;
export const GRAND_LANDMARKS: ReadonlyArray<{ id: string; name: string; description: string }> = [
  {
    id: 'LANDMARK-CAMPANILE',
    name: 'The Campanile',
    description: 'A bell tower taller than anything for miles: the college on every postcard, and a clock the town sets its watches by.',
  },
  {
    id: 'LANDMARK-DOME',
    name: 'The Great Dome',
    description: 'A domed rotunda over a reading room, the kind of room people travel to stand in.',
  },
  {
    id: 'LANDMARK-GATE',
    name: 'The Triumphal Gate',
    description: 'An arch at the head of the campus with the college\'s name cut across it: the way every graduate walks out.',
  },
];
export const GRAND_LANDMARK_IDS: readonly string[] = GRAND_LANDMARKS.map((l) => l.id);

// The small landmarks and amenities (Plan 26): cheap, each worth a little
// campus beauty (systems/estate/beauty.ts), opened along the ladder. None has
// a satisfaction attribute, so no harness strategy builds one.
export const AMENITIES: ReadonlyArray<{ id: string; name: string; description: string; cost: number; weeks: number; upkeep: number; beauty: number }> = [
  { id: 'AMENITY-STATUE', name: "The Founder's Statue", description: 'The founder in bronze on a stone plinth, a little larger than life, and a meeting place from the day it goes up.', cost: 150_000, weeks: 8, upkeep: 300, beauty: 0.6 },
  { id: 'AMENITY-FOUNTAIN', name: 'The Fountain', description: 'A basin and a jet on a paved round: somewhere to sit, and the first photograph on every tour.', cost: 400_000, weeks: 10, upkeep: 800, beauty: 1 },
  { id: 'AMENITY-GARDEN', name: 'The Formal Garden', description: 'Clipped hedges, gravel walks and beds that change with the terms.', cost: 300_000, weeks: 12, upkeep: 1_500, beauty: 1.5 },
  { id: 'AMENITY-CHAPEL', name: 'The Chapel', description: 'A small stone chapel, used for concerts and quiet as often as for services.', cost: 1_500_000, weeks: 30, upkeep: 2_000, beauty: 1.5 },
  { id: 'AMENITY-BELLTOWER', name: 'The Bell Tower', description: 'A slim tower with a peal of bells that marks the hours across the campus.', cost: 1_800_000, weeks: 36, upkeep: 1_500, beauty: 2 },
];

export function initialFacilities(): Buildable[] {
  return [
    ...diningChain(),

    // Campus grocery store — see the block above GROCERY_POPULATION_GATE.
    {
      id: GROCERY_ID,
      kind: 'facility',
      facilityType: 'grocery',
      name: 'Campus Grocery Store',
      description: `A full grocery store for ${GROCERY_SERVES.toLocaleString()} students — a second basic-needs option alongside the dining halls. Unlocks once the campus passes ${GROCERY_POPULATION_GATE.toLocaleString()} students enrolled.`,
      cost: GROCERY_COST,
      duration: GROCERY_WEEKS,
      prereqs: [],
      status: 'locked',
      effects: {
        servesPopulation: GROCERY_SERVES,
        satisfactionAttribute: 'basicNeeds',
        upkeepPerWeek: servedUpkeep('grocery', GROCERY_SERVES),
      },
    },

    // Library
    {
      id: LIBRARY_TIER1_ID,
      kind: 'facility',
      facilityType: 'library',
      tier: 1,
      name: 'Library',
      description: `Study seats and stacks for ${LIBRARY_TIER1_SERVES.toLocaleString()} students.`,
      cost: LIBRARY_TIER1_COST,
      duration: LIBRARY_TIER1_WEEKS,
      prereqs: [],
      status: 'available',
      effects: {
        servesPopulation: LIBRARY_TIER1_SERVES,
        satisfactionAttribute: 'academic',
        upkeepPerWeek: servedUpkeep('library', LIBRARY_TIER1_SERVES),
      },
    },

    // Student center
    {
      id: STUDENT_CENTER_TIER1_ID,
      kind: 'facility',
      facilityType: 'studentCenter',
      tier: 1,
      name: 'Student Center',
      description: `Social space for ${STUDENT_CENTER_TIER1_SERVES.toLocaleString()} students — happier students mean a bigger applicant pool next cycle.`,
      cost: STUDENT_CENTER_TIER1_COST,
      duration: STUDENT_CENTER_TIER1_WEEKS,
      prereqs: [],
      status: 'available',
      effects: {
        servesPopulation: STUDENT_CENTER_TIER1_SERVES,
        satisfactionAttribute: 'social',
        upkeepPerWeek: servedUpkeep('studentCenter', STUDENT_CENTER_TIER1_SERVES),
      },
    },
    {
      id: STUDENT_CENTER_TIER2_ID,
      kind: 'facility',
      facilityType: 'studentCenter',
      tier: 2,
      name: 'Student Union Expansion',
      description: `Adds ${STUDENT_CENTER_TIER2_SERVES.toLocaleString()} more social capacity.`,
      cost: STUDENT_CENTER_TIER2_COST,
      duration: STUDENT_CENTER_TIER2_WEEKS,
      prereqs: [STUDENT_CENTER_TIER1_ID],
      status: 'locked',
      effects: {
        servesPopulation: STUDENT_CENTER_TIER2_SERVES,
        satisfactionAttribute: 'social',
        upkeepPerWeek: servedUpkeep('studentCenter', STUDENT_CENTER_TIER2_SERVES),
      },
    },

    // The recreation/fitness chain (see above REC_CENTER_TIER1_ID). No
    // `tier`: five different facilities at chain positions, which
    // BuildPopup.tsx's rowMarker labels #N.
    {
      id: REC_CENTER_TIER1_ID,
      kind: 'facility',
      facilityType: 'recCenter',
      name: 'Recreation Center',
      description: `Fitness and intramural space for ${REC_CENTER_TIER1_SERVES.toLocaleString()} students; a small draw on its own.`,
      cost: REC_CENTER_TIER1_COST,
      duration: REC_CENTER_TIER1_WEEKS,
      prereqs: [],
      status: 'available',
      effects: {
        servesPopulation: REC_CENTER_TIER1_SERVES,
        satisfactionAttribute: 'social',
        prestigeContribution: REC_CENTER_TIER1_PRESTIGE,
        upkeepPerWeek: servedUpkeep('recCenter', REC_CENTER_TIER1_SERVES),
      },
    },
    {
      id: GYM_ID,
      kind: 'facility',
      facilityType: 'gym',
      name: 'Gym & Fitness Center',
      description: `Weight room and cardio floor for ${GYM_SERVES.toLocaleString()} students.`,
      cost: GYM_COST,
      duration: GYM_WEEKS,
      // The health chain starts at the health center (Plan 68): behind the
      // Recreation Center, a social building, a college short of health
      // could not see the way to it.
      prereqs: [HEALTH_CENTER_TIER1_ID],
      status: 'locked',
      effects: {
        servesPopulation: GYM_SERVES,
        satisfactionAttribute: 'health',
        upkeepPerWeek: servedUpkeep('gym', GYM_SERVES),
      },
    },
    {
      id: POOL_ID,
      kind: 'facility',
      facilityType: 'pool',
      name: 'Swimming Pool',
      description: `An outdoor Olympic-length pool and its deck, for ${POOL_SERVES.toLocaleString()} students.`,
      cost: POOL_COST,
      duration: POOL_WEEKS,
      prereqs: [GYM_ID],
      status: 'locked',
      effects: {
        servesPopulation: POOL_SERVES,
        satisfactionAttribute: 'health',
        upkeepPerWeek: servedUpkeep('pool', POOL_SERVES),
      },
    },
    {
      id: TENNIS_COURTS_ID,
      kind: 'facility',
      facilityType: 'tennisCourts',
      name: 'Tennis Courts',
      description: `Courts open to ${TENNIS_COURTS_SERVES.toLocaleString()} students.`,
      cost: TENNIS_COURTS_COST,
      duration: TENNIS_COURTS_WEEKS,
      prereqs: [POOL_ID],
      status: 'locked',
      effects: {
        servesPopulation: TENNIS_COURTS_SERVES,
        satisfactionAttribute: 'health',
        upkeepPerWeek: servedUpkeep('tennisCourts', TENNIS_COURTS_SERVES),
      },
    },
    {
      id: REC_CENTER_TIER2_ID,
      kind: 'facility',
      facilityType: 'recCenter',
      name: 'Athletics Complex',
      description: `The chain's capstone: a varsity-grade complex adding ${REC_CENTER_TIER2_SERVES.toLocaleString()} more capacity and a bigger prestige draw. Unlocks at prestige ${REC_CENTER_TIER2_PRESTIGE_GATE}+.`,
      cost: REC_CENTER_TIER2_COST,
      duration: REC_CENTER_TIER2_WEEKS,
      prereqs: [TENNIS_COURTS_ID],
      status: 'locked',
      effects: {
        servesPopulation: REC_CENTER_TIER2_SERVES,
        satisfactionAttribute: 'social',
        prestigeContribution: REC_CENTER_TIER2_PRESTIGE,
        upkeepPerWeek: servedUpkeep('recCenter', REC_CENTER_TIER2_SERVES),
      },
    },

    // The art gallery, gated only on Studio Art's tier-2 quartet.
    {
      id: ART_GALLERY_ID,
      kind: 'facility',
      facilityType: 'artGallery',
      name: 'Art Gallery',
      description: `A rotating-exhibit gallery for ${ART_GALLERY_SERVES.toLocaleString()} students, and the venue Studio Art's capstone courses exhibit in.`,
      cost: ART_GALLERY_COST,
      duration: ART_GALLERY_WEEKS,
      prereqs: [...STUDIO_ART_TIER2_IDS],
      status: 'locked',
      effects: {
        servesPopulation: ART_GALLERY_SERVES,
        satisfactionAttribute: 'social',
        upkeepPerWeek: servedUpkeep('artGallery', ART_GALLERY_SERVES),
      },
    },

    // Varsity venues, revealed once a team needing the category is granted.
    {
      id: ATHLETICS_FIELD_ID,
      kind: 'facility',
      facilityType: 'athleticsField',
      name: 'Multi-Sport Field',
      description: `A competition-grade outdoor field for ${ATHLETICS_FIELD_SERVES.toLocaleString()} students' worth of social capacity, shared by every varsity team that plays on grass.`,
      cost: ATHLETICS_FIELD_COST,
      duration: ATHLETICS_FIELD_WEEKS,
      prereqs: [],
      athleticsVenueReveal: true,
      status: 'locked',
      effects: {
        servesPopulation: ATHLETICS_FIELD_SERVES,
        satisfactionAttribute: 'social',
        prestigeContribution: ATHLETICS_FIELD_PRESTIGE,
        upkeepPerWeek: servedUpkeep('athleticsField', ATHLETICS_FIELD_SERVES),
      },
    },
    {
      id: ATHLETICS_ARENA_ID,
      kind: 'facility',
      facilityType: 'athleticsArena',
      name: 'Arena',
      description: `An indoor competition arena for ${ATHLETICS_ARENA_SERVES.toLocaleString()} students' worth of social capacity, shared by basketball, volleyball and ice hockey.`,
      cost: ATHLETICS_ARENA_COST,
      duration: ATHLETICS_ARENA_WEEKS,
      prereqs: [],
      athleticsVenueReveal: true,
      status: 'locked',
      effects: {
        servesPopulation: ATHLETICS_ARENA_SERVES,
        satisfactionAttribute: 'social',
        prestigeContribution: ATHLETICS_ARENA_PRESTIGE,
        upkeepPerWeek: servedUpkeep('athleticsArena', ATHLETICS_ARENA_SERVES),
      },
    },
    {
      id: ATHLETICS_DIAMOND_ID,
      kind: 'facility',
      facilityType: 'athleticsDiamond',
      name: 'Baseball & Softball Diamond',
      description: `A regulation diamond for ${ATHLETICS_DIAMOND_SERVES.toLocaleString()} students' worth of social capacity, shared by baseball and softball.`,
      cost: ATHLETICS_DIAMOND_COST,
      duration: ATHLETICS_DIAMOND_WEEKS,
      prereqs: [],
      athleticsVenueReveal: true,
      status: 'locked',
      effects: {
        servesPopulation: ATHLETICS_DIAMOND_SERVES,
        satisfactionAttribute: 'social',
        prestigeContribution: ATHLETICS_DIAMOND_PRESTIGE,
        upkeepPerWeek: servedUpkeep('athleticsDiamond', ATHLETICS_DIAMOND_SERVES),
      },
    },
    {
      id: ATHLETICS_NATATORIUM_ID,
      kind: 'facility',
      facilityType: 'athleticsNatatorium',
      name: 'Natatorium',
      description: `A competition pool for ${ATHLETICS_NATATORIUM_SERVES.toLocaleString()} students' worth of social capacity — distinct from the rec Swimming Pool, and where swim & dive and water polo compete.`,
      cost: ATHLETICS_NATATORIUM_COST,
      duration: ATHLETICS_NATATORIUM_WEEKS,
      prereqs: [],
      athleticsVenueReveal: true,
      status: 'locked',
      effects: {
        servesPopulation: ATHLETICS_NATATORIUM_SERVES,
        satisfactionAttribute: 'social',
        prestigeContribution: ATHLETICS_NATATORIUM_PRESTIGE,
        upkeepPerWeek: servedUpkeep('athleticsNatatorium', ATHLETICS_NATATORIUM_SERVES),
      },
    },
    {
      id: FOOTBALL_STADIUM_ID,
      kind: 'facility',
      facilityType: 'footballStadium',
      name: 'Football Stadium',
      description: `The pinnacle varsity venue: a full football stadium, and ${FOOTBALL_STADIUM_SERVES.toLocaleString()} students' worth of social capacity. Revealed only once the football program itself goes varsity.`,
      cost: FOOTBALL_STADIUM_COST,
      duration: FOOTBALL_STADIUM_WEEKS,
      prereqs: [],
      athleticsVenueReveal: true,
      status: 'locked',
      effects: {
        servesPopulation: FOOTBALL_STADIUM_SERVES,
        satisfactionAttribute: 'social',
        prestigeContribution: FOOTBALL_STADIUM_PRESTIGE,
        upkeepPerWeek: servedUpkeep('footballStadium', FOOTBALL_STADIUM_SERVES),
      },
    },
    {
      id: 'ATH-FIELDHOUSE',
      kind: 'facility',
      facilityType: 'fieldHouse',
      name: 'Field House',
      description: `Weight rooms, an indoor training floor and treatment rooms for every varsity program at once — ${FIELD_HOUSE_SERVES.toLocaleString()} students' worth of social capacity, and a lift to every team the college fields.`,
      cost: FIELD_HOUSE_COST,
      duration: FIELD_HOUSE_WEEKS,
      prereqs: [],
      athleticsDepartmentReveal: true,
      status: 'locked',
      effects: {
        servesPopulation: FIELD_HOUSE_SERVES,
        satisfactionAttribute: 'social',
        prestigeContribution: FIELD_HOUSE_PRESTIGE,
        upkeepPerWeek: servedUpkeep('fieldHouse', FIELD_HOUSE_SERVES),
      },
    },

    // The health chain: one institution upgraded in place, so it keeps `tier`.
    {
      id: HEALTH_CENTER_TIER1_ID,
      kind: 'facility',
      facilityType: 'healthCenter',
      tier: 1,
      name: 'Health & Counseling Center',
      description: `Care for ${HEALTH_CENTER_TIER1_SERVES.toLocaleString()} students. Unlocks once the campus passes ${HEALTH_CENTER_TIER1_POPULATION_GATE.toLocaleString()} students enrolled.`,
      cost: HEALTH_CENTER_TIER1_COST,
      duration: HEALTH_CENTER_TIER1_WEEKS,
      prereqs: [],
      status: 'locked',
      effects: {
        servesPopulation: HEALTH_CENTER_TIER1_SERVES,
        satisfactionAttribute: 'health',
        upkeepPerWeek: servedUpkeep('healthCenter', HEALTH_CENTER_TIER1_SERVES),
      },
    },
    {
      id: HEALTH_CENTER_TIER2_ID,
      kind: 'facility',
      facilityType: 'healthCenter',
      tier: 2,
      name: 'University Clinic',
      description: `Full outpatient care for ${HEALTH_CENTER_TIER2_SERVES.toLocaleString()} more students, and the practicum site Nursing's and Pharmacy's clinical coursework trains in. Unlocks once the campus passes ${HEALTH_CENTER_TIER2_POPULATION_GATE.toLocaleString()} students enrolled.`,
      cost: HEALTH_CENTER_TIER2_COST,
      duration: HEALTH_CENTER_TIER2_WEEKS,
      prereqs: [HEALTH_CENTER_TIER1_ID],
      status: 'locked',
      effects: {
        servesPopulation: HEALTH_CENTER_TIER2_SERVES,
        satisfactionAttribute: 'health',
        upkeepPerWeek: servedUpkeep('healthCenter', HEALTH_CENTER_TIER2_SERVES),
      },
    },
    {
      id: HEALTH_CENTER_TIER3_ID,
      kind: 'facility',
      facilityType: 'healthCenter',
      tier: 3,
      name: 'Medical Center',
      description: `A teaching hospital with the college's name over the door, caring for ${HEALTH_CENTER_TIER3_SERVES.toLocaleString()} more students: where the MD's clerkship year is spent, and a lift to the college's academics and research while it stands. Opens from Year ${MEDICAL_CENTER_PROJECT.fromYear}, for a campus past ${HEALTH_CENTER_TIER3_POPULATION_GATE.toLocaleString()} students enrolled.`,
      cost: HEALTH_CENTER_TIER3_COST,
      duration: HEALTH_CENTER_TIER3_WEEKS,
      prereqs: [HEALTH_CENTER_TIER2_ID],
      project: MEDICAL_CENTER_PROJECT,
      // The School of Medicine's home (Plan 51).
      slots: hostedPrograms(MEDICAL_CENTER_ID).length,
      status: 'locked',
      effects: {
        servesPopulation: HEALTH_CENTER_TIER3_SERVES,
        satisfactionAttribute: 'health',
        upkeepPerWeek: servedUpkeep('healthCenter', HEALTH_CENTER_TIER3_SERVES),
      },
    },

    // Green space / quad
    {
      id: QUAD_TIER1_ID,
      kind: 'facility',
      facilityType: 'quad',
      tier: 1,
      name: 'Campus Quad',
      description: 'A green centerpiece for campus life. Cheap, and worth it at any size — its contribution never dilutes as enrollment grows.',
      cost: QUAD_TIER1_COST,
      duration: QUAD_TIER1_WEEKS,
      prereqs: [],
      status: 'available',
      effects: {
        satisfactionAttribute: 'social',
        flatSatisfactionBonus: QUAD_TIER1_FLAT_BONUS,
        upkeepPerWeek: QUAD_TIER1_UPKEEP,
      },
    },
    {
      id: QUAD_TIER2_ID,
      kind: 'facility',
      facilityType: 'quad',
      tier: 2,
      name: 'Grand Quad & Gardens',
      description: 'A landscaped centerpiece expansion — more flat, non-scaling social satisfaction.',
      cost: QUAD_TIER2_COST,
      duration: QUAD_TIER2_WEEKS,
      prereqs: [QUAD_TIER1_ID],
      status: 'locked',
      effects: {
        satisfactionAttribute: 'social',
        flatSatisfactionBonus: QUAD_TIER2_FLAT_BONUS,
        upkeepPerWeek: QUAD_TIER2_UPKEEP,
      },
    },

    // The grand landmarks (Plan 25): one of three, chosen once the college
    // has a national name (ladderData.ts's 'national'); choosing one closes
    // the others (techSystem.ts's meetsUnlockGates, placeBuildable.ts).
    ...AMENITIES.map((a): Buildable => ({
      id: a.id,
      kind: 'facility',
      facilityType: 'amenity',
      name: a.name,
      description: a.description,
      cost: a.cost,
      duration: a.weeks,
      prereqs: [],
      status: 'locked',
      effects: { upkeepPerWeek: a.upkeep, beauty: a.beauty },
    })),

    // The capital projects (Plan 33, data/projectData.ts).
    ...PROJECTS.map((p): Buildable => ({
      id: p.id,
      kind: 'facility',
      facilityType: 'project',
      name: p.name,
      description: p.description,
      cost: p.cost,
      duration: p.weeks,
      prereqs: [],
      status: 'locked',
      project: p.project,
      // A graduate program's host has a slot for each program it houses
      // (Plan 51), filled as a hall's are.
      ...(isGraduateHost(p.id) ? { slots: hostedPrograms(p.id).length } : {}),
      effects: {
        upkeepPerWeek: p.upkeep,
        ...(p.beauty !== undefined ? { beauty: p.beauty } : {}),
      },
    })),

    ...GRAND_LANDMARKS.map((l): Buildable => ({
      id: l.id,
      kind: 'facility',
      facilityType: 'landmark',
      name: l.name,
      description: l.description,
      cost: GRAND_LANDMARK_COST,
      duration: GRAND_LANDMARK_WEEKS,
      prereqs: [],
      status: 'locked',
      effects: {
        prestigeContribution: GRAND_LANDMARK_PRESTIGE,
        applicantPoolBonus: GRAND_LANDMARK_APPLICANTS,
        upkeepPerWeek: GRAND_LANDMARK_UPKEEP,
        beauty: GRAND_LANDMARK_BEAUTY,
      },
    })),
  ];
}
