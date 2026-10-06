import { hostedPrograms, isGraduateHost, MEDICAL_CENTER_ID, MEDICAL_CENTER_PROJECT, PROJECTS, projectOpens } from './projectData';
import type { Buildable, FacilityType } from '../state/types';
import { WEEKS_PER_YEAR } from '../state/types';
import { FOUNDING_BODY } from './foundingData';
import { count, pct } from '../format';

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
// costs are roughly a third to a half of the dorm with a similar bed count.
//
// Upkeep is a share of the price, in two parts (Plan 80F), the owner's
// call: charge mainly for overbuilding.
//
// - Every building that serves a need costs FACILITY_UPKEEP_SHARE of what it
//   cost a year to keep, its added floors and expansions with it
//   (estate.ts's facilityUpkeepOf): the Treasury's "Campus upkeep". About
//   what the old flat $0.5–$2.2 a week a place came to, which was a
//   twentieth to a third of the price a year.
// - Capacity past BEYOND_NEED_FROM of what the students need, in each need a
//   facility serves (dining, health, social space, study space), costs
//   BEYOND_NEED_UPKEEP times as much: the Treasury's "Space beyond need"
//   (systems/estate/beyondNeed.ts). Each building in a need pays it on the
//   need's share past the line, so a college with twice the dining it needs
//   pays three times the dining upkeep, and three times the need four.
//
// Fitted to the harness (`npm run sim`, the plan's note): a college that
// builds to need pays almost nothing past the line and finishes its
// catalog; one that builds everything pays for it. A flat share of 1.0 (a
// year's running costs equal to the price) was tried first and slowed every
// college's late game instead.
export const FACILITY_UPKEEP_SHARE = 0.1;
export const BEYOND_NEED_FROM = 1.2;
export const BEYOND_NEED_UPKEEP = 6;
export function priceUpkeep(price: number): number {
  return Math.round((price * FACILITY_UPKEEP_SHARE) / WEEKS_PER_YEAR);
}

// The facilities whose upkeep is a share of their price: every building
// that serves students a need (the grocery, dining, library, the social,
// fitness and health buildings, the varsity venues), each priced by
// priceUpkeep. The towers' shops follow the grocery's price a place
// (campusData.ts's TOWER_RETAIL_UPKEEP_PER_WEEK). Quads, amenities,
// landmarks, capital projects (the Medical Center among them), labs, halls
// and dorms keep their own upkeep.
export const PRICE_UPKEEP_TYPES: ReadonlySet<FacilityType> = new Set<FacilityType>([
  'diningHall', 'grocery', 'library', 'studentCenter', 'recCenter', 'healthCenter', 'gym', 'tennisCourts', 'pool', 'artGallery',
  'athleticsField', 'athleticsArena', 'athleticsDiamond', 'athleticsNatatorium', 'footballStadium', 'fieldHouse',
]);

// --- Dining hall: repeatable chain, basic need, scales hard with capacity ---
// basicNeeds carries the steepest under-capacity penalty
// (satisfactionSystem.ts's BASIC_NEEDS_PENALTY_CURVATURE).
//
// Eight authored halls (350 to 16,000) that roughly double at the small end
// and taper to ~1.35x, so each is a meaningful share of campus dining and
// visibly bigger on the map (campusMap.ts's DINING_FOOTPRINTS reads
// servesPopulation). The chain serves 47,050; with the grocery and the
// towers' retail (campusData.ts) the campus feeds about 70,000 at 1:1, but
// those shops count for at most RETAIL_FOOD_SHARE of the need, so a campus
// of 34,000 needs the dining halls through the seventh. Cost per seat climbs
// (1.3k -> 2.4k), like the dorm chain.
const DINING_STARTING_ID = 'DINING-01';
const DINING_STARTING_SERVES = FOUNDING_BODY; // one founding hall feeds exactly the founding (all-commuter) class
// Cheap and quick, so feeding the founding class does not swallow the
// opening budget.
const DINING_STARTING_COST = 250_000;
const DINING_STARTING_WEEKS = 16;

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
      description: `The college's first dining hall — build it to feed the founding class. Serves ${count(DINING_STARTING_SERVES)} students.`,
      cost: DINING_STARTING_COST,
      duration: DINING_STARTING_WEEKS,
      prereqs: [],
      // Available from day one: the campus opens empty. Effects are
      // live-read, so they count only once it is built.
      status: 'available',
      effects: {
        servesPopulation: DINING_STARTING_SERVES,
        satisfactionAttribute: 'basicNeeds',
        upkeepPerWeek: priceUpkeep(DINING_STARTING_COST),
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
      description: `Serves ${count(rung.serves)} more students.`,
      cost: rung.cost,
      duration: rung.weeks,
      prereqs: [previousId], // strictly sequential, same reasoning as the dorm chain
      // Each unlocks the tick its prereq finishes.
      status: 'locked',
      effects: {
        servesPopulation: rung.serves,
        satisfactionAttribute: 'basicNeeds',
        upkeepPerWeek: priceUpkeep(rung.cost),
      },
    });
    previousId = rung.id;
  }

  return nodes;
}

// --- Campus grocery store: single building, basicNeeds, population-gated ---
// A second basicNeeds feeder: one building unlocked past a population gate,
// a late-game top-up beside the dining chain, counted to RETAIL_FOOD_SHARE
// of the need with the towers' shops. Cheaper per seat, and so in upkeep,
// than a dining hall (no kitchen).
export const GROCERY_POPULATION_GATE = 8_000;
const GROCERY_ID = 'GROCERY-01';
const GROCERY_SERVES = 17_500;
const GROCERY_COST = 15_750_000; // 900/seat
const GROCERY_WEEKS = 26;
// What a place at the grocery cost: the towers' shops are kept at it
// (campusData.ts's TOWER_RETAIL_UPKEEP_PER_WEEK).
export const GROCERY_PRICE_PER_PLACE = GROCERY_COST / GROCERY_SERVES;

// Food (Plan 80F): the grocery and the towers' shops (campusData.ts's
// TOWER_RETAIL_SERVES) feed students, but together they count for at most
// RETAIL_FOOD_SHARE of what the students need to eat
// (satisfactionSystem.ts's servedPopulationFor); the dining halls carry the
// rest. Before, the grocery's 17,500 places at $900 each, beside five dining
// halls, fed a campus of 34,000, and the last three halls were never needed.
export const RETAIL_FOOD_SHARE = 0.4;
export function isRetailFood(t: Buildable): boolean {
  return t.effects?.satisfactionAttribute === 'basicNeeds' && (t.facilityType === 'grocery' || t.kind === 'dorm');
}

// --- Library: single building, academic ---
// One building, its capacity grown by renovation (floors on tier 1). The
// research library that was its second tier is gone (Plan 53): the Research
// Park is research's building now.
export const LIBRARY_TIER1_ID = 'LIB-T1';
const LIBRARY_TIER1_SERVES = 1_200;
const LIBRARY_TIER1_COST = 360_000;
const LIBRARY_TIER1_WEEKS = 16;

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
const LIBRARY_FLOOR_BASE_WEEKS = 34;
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
const STUDENT_CENTER_TIER1_WEEKS = 13;
const STUDENT_CENTER_TIER2_ID = 'SCTR-T2';
const STUDENT_CENTER_TIER2_SERVES = 3_000;
const STUDENT_CENTER_TIER2_COST = 1_150_000;
const STUDENT_CENTER_TIER2_WEEKS = 26;

// --- The fitness chain: Gym -> Pool -> Tennis Courts -> Sports & Recreation Complex ---
// Four one-off facilities chained strictly in order, like the dorm and
// dining chains, so recreation reads as a queue. The gym opens behind the
// Health & Counseling Center, not the Recreation Center (Plan 68): a college
// short of health could not see the way to it through a social building. BuildPopup.tsx's
// TYPE_MATCHERS groups the four as Fitness, under Health. Costs are not monotonic
// along the chain; the order is judgment. The Sports & Recreation Complex also needs
// REC_CENTER_TIER2_PRESTIGE_GATE (techSystem.ts's meetsUnlockGates).
//
// The Recreation Center feeds `social`; the gym, pool, tennis courts and,
// since Plan 80F, the Sports & Recreation Complex feed `health`, which needs scaling
// capacity of its own. The build menu files the four under Health.
//
// Rec facilities are never varsity venues: competition venues are separate
// Buildables below (the rec pool vs. the natatorium), so a rec facility's
// social contribution never doubles as an athletics gate.
const REC_CENTER_TIER1_ID = 'REC-T1';
const REC_CENTER_TIER1_SERVES = 1_200;
const REC_CENTER_TIER1_COST = 450_000;
const REC_CENTER_TIER1_WEEKS = 16;
const REC_CENTER_TIER1_PRESTIGE = 0.05;
// Gym/pool/tennis serve figures carry real `health` capacity, priced at the
// same $/seat each was built at.
const GYM_ID = 'GYM';
const GYM_SERVES = 4_000;
const GYM_COST = 1_400_000;
const GYM_WEEKS = 29;
const POOL_ID = 'POOL';
const POOL_SERVES = 3_000;
const POOL_COST = 1_370_000;
const POOL_WEEKS = 26;
const TENNIS_COURTS_ID = 'TENNIS-COURTS';
const TENNIS_COURTS_SERVES = 2_000;
const TENNIS_COURTS_COST = 700_000;
const TENNIS_COURTS_WEEKS = 18;
// Exported for the build menu, which files it with the fitness chain
// under Health (BuildPopup.tsx).
export const REC_CENTER_TIER2_ID = 'REC-T2';
const REC_CENTER_TIER2_SERVES = 3_500;
const REC_CENTER_TIER2_COST = 1_900_000;
const REC_CENTER_TIER2_WEEKS = 36;
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
const ART_GALLERY_WEEKS = 10;

// --- Varsity athletics venues: shared competition facilities, HIDDEN until demanded ---
// Sport -> category mapping: studentLifeData.ts's SPORTS; reveal:
// eventData.ts's 'varsity-petition'. Each is seeded 'locked' with
// `athleticsVenueReveal: true` and empty prereqs, so the reveal gate
// (techSystem.ts's meetsUnlockGates) is what keeps it hidden.
const ATHLETICS_FIELD_ID = 'ATH-FIELD';
const ATHLETICS_FIELD_SERVES = 700;
const ATHLETICS_FIELD_COST = 650_000;
const ATHLETICS_FIELD_WEEKS = 21;

const ATHLETICS_ARENA_ID = 'ATH-ARENA';
const ATHLETICS_ARENA_SERVES = 1_400;
const ATHLETICS_ARENA_COST = 1_800_000;
const ATHLETICS_ARENA_WEEKS = 31;

const ATHLETICS_DIAMOND_ID = 'ATH-DIAMOND';
const ATHLETICS_DIAMOND_SERVES = 500;
const ATHLETICS_DIAMOND_COST = 480_000;
const ATHLETICS_DIAMOND_WEEKS = 16;

const ATHLETICS_NATATORIUM_ID = 'ATH-NATATORIUM';
const ATHLETICS_NATATORIUM_SERVES = 550;
const ATHLETICS_NATATORIUM_COST = 950_000;
const ATHLETICS_NATATORIUM_WEEKS = 23;

// The pinnacle venue: most expensive, largest footprint (campusMap.ts's
// footprintOf), revealed only by football's own petition.
const FOOTBALL_STADIUM_ID = 'ATH-STADIUM';
const FOOTBALL_STADIUM_SERVES = 2_500;
const FOOTBALL_STADIUM_COST = 6_500_000;
const FOOTBALL_STADIUM_WEEKS = 52;

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
const FIELD_HOUSE_WEEKS = 18;
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
// and the recreational and cultural buildings; 'health' is the health chain
// and the gym, pool and tennis courts, whose capacity is health's (Plan
// 80B); 'academic' is the library and labs (halls are assigned by kind in
// the build menu). Unlisted types have their own grouping.
export type FacilityCategory = 'athletics' | 'social' | 'health' | 'academic';

export const FACILITY_CATEGORY_OF: Partial<Record<FacilityType, FacilityCategory>> = {
  library: 'academic',
  lab: 'academic',
  studentCenter: 'social',
  recCenter: 'social',
  healthCenter: 'health',
  gym: 'health',
  tennisCourts: 'health',
  pool: 'health',
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
const HEALTH_CENTER_TIER1_WEEKS = 18;
// Exported for techData.ts's CLINICAL_PRACTICUM_GATE.
export const HEALTH_CENTER_TIER2_POPULATION_GATE = 6_000;
export const HEALTH_CENTER_TIER2_ID = 'HLTH-T2';
const HEALTH_CENTER_TIER2_SERVES = 6_000;
const HEALTH_CENTER_TIER2_COST = 2_400_000; // 400/seat
const HEALTH_CENTER_TIER2_WEEKS = 34;
export const HEALTH_CENTER_TIER3_POPULATION_GATE = 20_000;
export const HEALTH_CENTER_TIER3_ID = 'HLTH-T3';
const HEALTH_CENTER_TIER3_SERVES = 30_000;
const HEALTH_CENTER_TIER3_COST = 19_500_000; // 650/seat
const HEALTH_CENTER_TIER3_WEEKS = 62;
// The Medical Center is a capital project (projectData.ts), and keeps an
// authored upkeep as the other projects do ($30k–$55k a week): what it was
// at $1.60 a week for each of its 30,000 places before Plan 80F. It pays
// nothing for space beyond need, and its places are left out of that
// reckoning (systems/estate/beyondNeed.ts), though they count toward health.
const HEALTH_CENTER_TIER3_UPKEEP = 48_000;

// --- Green space/quad: single, cheap, FLAT (non-population-scaling) bonus ---
// Worth the same at any enrollment, which is why it is cheap and worth
// building early.
const QUAD_TIER1_ID = 'QUAD-T1';
const QUAD_TIER1_FLAT_BONUS = 8;
const QUAD_TIER1_COST = 60_000;
const QUAD_TIER1_WEEKS = 5;
const QUAD_TIER1_UPKEEP = 400;
// The Second Quad (QUAD-S2) is gone since Plan 59; a save that built one
// keeps it (persistence.ts).
const QUAD_TIER2_ID = 'QUAD-T2';
const QUAD_TIER2_FLAT_BONUS = 12;
const QUAD_TIER2_COST = 190_000;
const QUAD_TIER2_WEEKS = 10;
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
    description: 'A domed rotunda over a great hall, the kind of room people travel to stand in.',
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
  { id: 'AMENITY-STATUE', name: "The Founder's Statue", description: 'The founder in bronze on a stone plinth, a little larger than life, and a meeting place from the day it goes up.', cost: 150_000, weeks: 10, upkeep: 300, beauty: 0.6 },
  { id: 'AMENITY-FOUNTAIN', name: 'The Fountain', description: 'A basin and a jet on a paved circle: somewhere to sit, and the first photograph on every tour.', cost: 400_000, weeks: 13, upkeep: 800, beauty: 1 },
  { id: 'AMENITY-GARDEN', name: 'The Japanese Garden', description: 'A koi pond under a red bridge, a torii over the path, a three-tiered pagoda, a stone lantern and cherry trees in blossom: the quietest acre on campus.', cost: 300_000, weeks: 16, upkeep: 1_500, beauty: 1.5 },
  { id: 'AMENITY-CHAPEL', name: 'The Chapel', description: 'A small stone chapel, used for concerts and quiet as often as for services.', cost: 1_500_000, weeks: 39, upkeep: 2_000, beauty: 1.5 },
  { id: 'AMENITY-BELLTOWER', name: 'The Bell Tower', description: 'A slim tower with a peal of bells that marks the hours across the campus.', cost: 1_800_000, weeks: 47, upkeep: 1_500, beauty: 2 },
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
      description: `A full grocery store for ${count(GROCERY_SERVES)} students — a second basic-needs option alongside the dining halls, though with the towers' shops it covers ${pct(RETAIL_FOOD_SHARE)} of meals at most. Can be built once enrollment passes ${count(GROCERY_POPULATION_GATE)}.`,
      cost: GROCERY_COST,
      duration: GROCERY_WEEKS,
      prereqs: [],
      status: 'locked',
      effects: {
        servesPopulation: GROCERY_SERVES,
        satisfactionAttribute: 'basicNeeds',
        upkeepPerWeek: priceUpkeep(GROCERY_COST),
      },
    },

    // Library
    {
      id: LIBRARY_TIER1_ID,
      kind: 'facility',
      facilityType: 'library',
      tier: 1,
      name: 'Library',
      description: `Study seats and stacks for ${count(LIBRARY_TIER1_SERVES)} students.`,
      cost: LIBRARY_TIER1_COST,
      duration: LIBRARY_TIER1_WEEKS,
      prereqs: [],
      status: 'available',
      effects: {
        servesPopulation: LIBRARY_TIER1_SERVES,
        satisfactionAttribute: 'academic',
        upkeepPerWeek: priceUpkeep(LIBRARY_TIER1_COST),
      },
    },

    // Student center
    {
      id: STUDENT_CENTER_TIER1_ID,
      kind: 'facility',
      facilityType: 'studentCenter',
      tier: 1,
      name: 'Student Center',
      description: `Social space for ${count(STUDENT_CENTER_TIER1_SERVES)} students — happier students mean a bigger applicant pool next cycle.`,
      cost: STUDENT_CENTER_TIER1_COST,
      duration: STUDENT_CENTER_TIER1_WEEKS,
      prereqs: [],
      status: 'available',
      effects: {
        servesPopulation: STUDENT_CENTER_TIER1_SERVES,
        satisfactionAttribute: 'social',
        upkeepPerWeek: priceUpkeep(STUDENT_CENTER_TIER1_COST),
      },
    },
    {
      id: STUDENT_CENTER_TIER2_ID,
      kind: 'facility',
      facilityType: 'studentCenter',
      tier: 2,
      name: 'Student Union Expansion',
      description: `Adds ${count(STUDENT_CENTER_TIER2_SERVES)} more social capacity.`,
      cost: STUDENT_CENTER_TIER2_COST,
      duration: STUDENT_CENTER_TIER2_WEEKS,
      prereqs: [STUDENT_CENTER_TIER1_ID],
      status: 'locked',
      effects: {
        servesPopulation: STUDENT_CENTER_TIER2_SERVES,
        satisfactionAttribute: 'social',
        upkeepPerWeek: priceUpkeep(STUDENT_CENTER_TIER2_COST),
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
      description: `Recreation and intramural space for ${count(REC_CENTER_TIER1_SERVES)} students: social life, and a little prestige.`,
      cost: REC_CENTER_TIER1_COST,
      duration: REC_CENTER_TIER1_WEEKS,
      prereqs: [],
      status: 'available',
      effects: {
        servesPopulation: REC_CENTER_TIER1_SERVES,
        satisfactionAttribute: 'social',
        prestigeContribution: REC_CENTER_TIER1_PRESTIGE,
        upkeepPerWeek: priceUpkeep(REC_CENTER_TIER1_COST),
      },
    },
    {
      id: GYM_ID,
      kind: 'facility',
      facilityType: 'gym',
      name: 'Gym & Fitness Center',
      description: `Weight room and cardio floor for ${count(GYM_SERVES)} students.`,
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
        upkeepPerWeek: priceUpkeep(GYM_COST),
      },
    },
    {
      id: POOL_ID,
      kind: 'facility',
      facilityType: 'pool',
      name: 'Swimming Pool',
      description: `An outdoor Olympic-length pool and its deck, for ${count(POOL_SERVES)} students.`,
      cost: POOL_COST,
      duration: POOL_WEEKS,
      prereqs: [GYM_ID],
      status: 'locked',
      effects: {
        servesPopulation: POOL_SERVES,
        satisfactionAttribute: 'health',
        upkeepPerWeek: priceUpkeep(POOL_COST),
      },
    },
    {
      id: TENNIS_COURTS_ID,
      kind: 'facility',
      facilityType: 'tennisCourts',
      name: 'Tennis Courts',
      description: `Courts open to ${count(TENNIS_COURTS_SERVES)} students.`,
      cost: TENNIS_COURTS_COST,
      duration: TENNIS_COURTS_WEEKS,
      prereqs: [POOL_ID],
      status: 'locked',
      effects: {
        servesPopulation: TENNIS_COURTS_SERVES,
        satisfactionAttribute: 'health',
        upkeepPerWeek: priceUpkeep(TENNIS_COURTS_COST),
      },
    },
    {
      id: REC_CENTER_TIER2_ID,
      kind: 'facility',
      facilityType: 'recCenter',
      name: 'Sports & Recreation Complex',
      description: `The last of the fitness buildings: a complex keeping ${count(REC_CENTER_TIER2_SERVES)} more students fit, and a bigger prestige lift, though not a competition venue. Can be built at prestige ${REC_CENTER_TIER2_PRESTIGE_GATE}.`,
      cost: REC_CENTER_TIER2_COST,
      duration: REC_CENTER_TIER2_WEEKS,
      prereqs: [TENNIS_COURTS_ID],
      status: 'locked',
      effects: {
        servesPopulation: REC_CENTER_TIER2_SERVES,
        // Fitness is health (Plan 80F); the Recreation Center stays social.
        satisfactionAttribute: 'health',
        prestigeContribution: REC_CENTER_TIER2_PRESTIGE,
        upkeepPerWeek: priceUpkeep(REC_CENTER_TIER2_COST),
      },
    },

    // The art gallery, gated only on Studio Art's tier-2 quartet.
    {
      id: ART_GALLERY_ID,
      kind: 'facility',
      facilityType: 'artGallery',
      name: 'Art Gallery',
      description: `A rotating-exhibit gallery for ${count(ART_GALLERY_SERVES)} students, and the venue Studio Art's advanced courses and its senior exhibition show in.`,
      cost: ART_GALLERY_COST,
      duration: ART_GALLERY_WEEKS,
      prereqs: [...STUDIO_ART_TIER2_IDS],
      status: 'locked',
      effects: {
        servesPopulation: ART_GALLERY_SERVES,
        satisfactionAttribute: 'social',
        upkeepPerWeek: priceUpkeep(ART_GALLERY_COST),
      },
    },

    // Varsity venues, revealed once a team needing the category is granted.
    {
      id: ATHLETICS_FIELD_ID,
      kind: 'facility',
      facilityType: 'athleticsField',
      name: 'Multi-Sport Field',
      description: `A competition-grade outdoor field for ${count(ATHLETICS_FIELD_SERVES)} students' worth of social capacity, shared by soccer, lacrosse, field hockey, and track and field.`,
      cost: ATHLETICS_FIELD_COST,
      duration: ATHLETICS_FIELD_WEEKS,
      prereqs: [],
      athleticsVenueReveal: true,
      status: 'locked',
      effects: {
        servesPopulation: ATHLETICS_FIELD_SERVES,
        satisfactionAttribute: 'social',
        prestigeContribution: ATHLETICS_FIELD_PRESTIGE,
        upkeepPerWeek: priceUpkeep(ATHLETICS_FIELD_COST),
      },
    },
    {
      id: ATHLETICS_ARENA_ID,
      kind: 'facility',
      facilityType: 'athleticsArena',
      name: 'Arena',
      description: `An indoor competition arena for ${count(ATHLETICS_ARENA_SERVES)} students' worth of social capacity, shared by basketball, volleyball and ice hockey.`,
      cost: ATHLETICS_ARENA_COST,
      duration: ATHLETICS_ARENA_WEEKS,
      prereqs: [],
      athleticsVenueReveal: true,
      status: 'locked',
      effects: {
        servesPopulation: ATHLETICS_ARENA_SERVES,
        satisfactionAttribute: 'social',
        prestigeContribution: ATHLETICS_ARENA_PRESTIGE,
        upkeepPerWeek: priceUpkeep(ATHLETICS_ARENA_COST),
      },
    },
    {
      id: ATHLETICS_DIAMOND_ID,
      kind: 'facility',
      facilityType: 'athleticsDiamond',
      name: 'Baseball & Softball Diamond',
      description: `A regulation diamond for ${count(ATHLETICS_DIAMOND_SERVES)} students' worth of social capacity, shared by baseball and softball.`,
      cost: ATHLETICS_DIAMOND_COST,
      duration: ATHLETICS_DIAMOND_WEEKS,
      prereqs: [],
      athleticsVenueReveal: true,
      status: 'locked',
      effects: {
        servesPopulation: ATHLETICS_DIAMOND_SERVES,
        satisfactionAttribute: 'social',
        prestigeContribution: ATHLETICS_DIAMOND_PRESTIGE,
        upkeepPerWeek: priceUpkeep(ATHLETICS_DIAMOND_COST),
      },
    },
    {
      id: ATHLETICS_NATATORIUM_ID,
      kind: 'facility',
      facilityType: 'athleticsNatatorium',
      name: 'Natatorium',
      description: `A competition pool for ${count(ATHLETICS_NATATORIUM_SERVES)} students' worth of social capacity — distinct from the rec Swimming Pool, and where swim & dive and water polo compete.`,
      cost: ATHLETICS_NATATORIUM_COST,
      duration: ATHLETICS_NATATORIUM_WEEKS,
      prereqs: [],
      athleticsVenueReveal: true,
      status: 'locked',
      effects: {
        servesPopulation: ATHLETICS_NATATORIUM_SERVES,
        satisfactionAttribute: 'social',
        prestigeContribution: ATHLETICS_NATATORIUM_PRESTIGE,
        upkeepPerWeek: priceUpkeep(ATHLETICS_NATATORIUM_COST),
      },
    },
    {
      id: FOOTBALL_STADIUM_ID,
      kind: 'facility',
      facilityType: 'footballStadium',
      name: 'Football Stadium',
      description: `The pinnacle varsity venue: a full football stadium, and ${count(FOOTBALL_STADIUM_SERVES)} students' worth of social capacity. Listed once football goes varsity.`,
      cost: FOOTBALL_STADIUM_COST,
      duration: FOOTBALL_STADIUM_WEEKS,
      prereqs: [],
      athleticsVenueReveal: true,
      status: 'locked',
      effects: {
        servesPopulation: FOOTBALL_STADIUM_SERVES,
        satisfactionAttribute: 'social',
        prestigeContribution: FOOTBALL_STADIUM_PRESTIGE,
        upkeepPerWeek: priceUpkeep(FOOTBALL_STADIUM_COST),
      },
    },
    {
      id: 'ATH-FIELDHOUSE',
      kind: 'facility',
      facilityType: 'fieldHouse',
      name: 'Field House',
      description: `Weight rooms, an indoor training floor and treatment rooms for every varsity program at once — ${count(FIELD_HOUSE_SERVES)} students' worth of social capacity, and a lift to every team the college fields.`,
      cost: FIELD_HOUSE_COST,
      duration: FIELD_HOUSE_WEEKS,
      prereqs: [],
      athleticsDepartmentReveal: true,
      status: 'locked',
      effects: {
        servesPopulation: FIELD_HOUSE_SERVES,
        satisfactionAttribute: 'social',
        prestigeContribution: FIELD_HOUSE_PRESTIGE,
        upkeepPerWeek: priceUpkeep(FIELD_HOUSE_COST),
      },
    },

    // The health chain: one institution upgraded in place, so it keeps `tier`.
    {
      id: HEALTH_CENTER_TIER1_ID,
      kind: 'facility',
      facilityType: 'healthCenter',
      tier: 1,
      name: 'Health & Counseling Center',
      description: `Care for ${count(HEALTH_CENTER_TIER1_SERVES)} students. Can be built once enrollment passes ${count(HEALTH_CENTER_TIER1_POPULATION_GATE)}.`,
      cost: HEALTH_CENTER_TIER1_COST,
      duration: HEALTH_CENTER_TIER1_WEEKS,
      prereqs: [],
      status: 'locked',
      effects: {
        servesPopulation: HEALTH_CENTER_TIER1_SERVES,
        satisfactionAttribute: 'health',
        upkeepPerWeek: priceUpkeep(HEALTH_CENTER_TIER1_COST),
      },
    },
    {
      id: HEALTH_CENTER_TIER2_ID,
      kind: 'facility',
      facilityType: 'healthCenter',
      tier: 2,
      name: 'University Clinic',
      description: `Full outpatient care for ${count(HEALTH_CENTER_TIER2_SERVES)} more students, and the practicum site Nursing's and Pharmacy's clinical coursework trains in. Can be built once enrollment passes ${count(HEALTH_CENTER_TIER2_POPULATION_GATE)}.`,
      cost: HEALTH_CENTER_TIER2_COST,
      duration: HEALTH_CENTER_TIER2_WEEKS,
      prereqs: [HEALTH_CENTER_TIER1_ID],
      status: 'locked',
      effects: {
        servesPopulation: HEALTH_CENTER_TIER2_SERVES,
        satisfactionAttribute: 'health',
        upkeepPerWeek: priceUpkeep(HEALTH_CENTER_TIER2_COST),
      },
    },
    {
      id: HEALTH_CENTER_TIER3_ID,
      kind: 'facility',
      facilityType: 'healthCenter',
      tier: 3,
      name: 'Medical Center',
      description: `A teaching hospital with the college's name over the door, caring for ${count(HEALTH_CENTER_TIER3_SERVES)} more students: where the MD's clerkship year is spent, and a lift to the college's academics and research while it stands. Opens from Year ${MEDICAL_CENTER_PROJECT.fromYear}, for a campus past ${count(HEALTH_CENTER_TIER3_POPULATION_GATE)} students enrolled.`,
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
        upkeepPerWeek: HEALTH_CENTER_TIER3_UPKEEP,
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
      description: 'A landscaped centerpiece expansion: more social life, at any size.',
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
      description: `${p.description} ${projectOpens(p.project)}`,
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
