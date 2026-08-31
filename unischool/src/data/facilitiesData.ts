import type { Buildable, SatisfactionAttributes } from '../state/types';

// ---------------------------------------------------------------------
// Campus-life facilities: the seven non-housing, non-lab needs a campus has
// (see README's "central abstraction" — these are all just `facility`-kind
// Buildables, same develop/build machinery as everything else; do not fork
// a subsystem). Each instance "serves" a fixed number of students against
// s.students.capacity — CAPACITY, not today's enrollment, on purpose: needs
// scale with how big the campus is planned to be, so expanding housing
// carries a felt, plan-ahead satisfaction cost, not just an upkeep bill.
// satisfactionSystem.ts sums servesPopulation across every 'done' facility
// of a given satisfactionAttribute and compares it to capacity to score
// that attribute 0..100 each week — see BuildableEffects in state/types.ts
// for the live-read-not-applied contract these effects follow.
//
// Two shapes, per the design pass on this feature:
//
//   - Repeatable chains (dining hall, parking): like campusData.ts's dorm
//     chain — a starting instance seeded 'done', then a strictly sequential
//     queue of more instances. Real campuses have several dining halls and
//     parking structures, so "build another" is the natural action.
//   - Single buildings with tier upgrades (library, student center, rec
//     center, health center, quad): a campus typically has ONE of these,
//     upgraded in place. Tier 2 is a genuinely bigger facility (more seats,
//     sometimes a different unlock gate), not a repeat of tier 1.
//
// Every facility carries upkeepPerWeek (see financeSystem.ts) scaled off
// how many students it serves (or a flat rate for the two that don't scale
// with population) at a per-type rate reflecting how labor/equipment-heavy
// that need is — dining (food service staff) and health (clinical staff)
// cost the most per seat served; parking the least.
// ---------------------------------------------------------------------

const UPKEEP_PER_SERVED_PER_WEEK: Record<string, number> = {
  diningHall: 1.2,
  parking: 0.15,
  library: 0.4,
  studentCenter: 0.5,
  recCenter: 0.6,
  healthCenter: 0.8,
};

function servedUpkeep(facilityType: keyof typeof UPKEEP_PER_SERVED_PER_WEEK, servesPopulation: number): number {
  return Math.round(UPKEEP_PER_SERVED_PER_WEEK[facilityType] * servesPopulation);
}

// --- Dining hall: repeatable chain, basic need, scales hard with capacity ---
// Deliberately the steepest under-capacity penalty of the five attributes
// (see satisfactionSystem.ts's BASIC_NEEDS_PENALTY_CURVATURE) — going
// hungry reads as an acute problem, not a gentle drift, so this chain is
// tuned to need topping up almost as often as dorms.
const DINING_STARTING_ID = 'DINING-01';
const DINING_STARTING_SERVES = 300;
const DINING_ADDITIONAL_COUNT = 12;
const DINING_BASE_SERVES = 280;
const DINING_SERVES_GROWTH = 1.16;
const DINING_BASE_COST = 140_000;
const DINING_COST_GROWTH = 1.26;
const DINING_BASE_WEEKS = 10;
const DINING_WEEKS_GROWTH = 1.05;
const DINING_NAMES = [
  'The Original Dining Hall', 'Eastgate Dining Hall', 'Commons Cafeteria', 'Harborview Dining Hall',
  'Union Square Eatery', 'Northside Dining Hall', 'The Refectory', 'Gateway Food Hall',
  'Southpoint Dining Hall', 'Millrace Cafeteria', 'The Grand Table', 'Terrace Dining Hall',
];

// --- Parking/infrastructure: repeatable chain, boring need, scales with population ---
const PARKING_STARTING_ID = 'PARKING-01';
const PARKING_STARTING_SERVES = 300;
const PARKING_ADDITIONAL_COUNT = 12;
const PARKING_BASE_SERVES = 320;
const PARKING_SERVES_GROWTH = 1.15;
const PARKING_BASE_COST = 85_000;
const PARKING_COST_GROWTH = 1.24;
const PARKING_BASE_WEEKS = 8;
const PARKING_WEEKS_GROWTH = 1.04;
const PARKING_NAMES = [
  'Lot A', 'Lot B', 'Lot C', 'Lot D', 'Lot E', 'Lot F',
  'North Parking Deck', 'South Parking Deck', 'East Parking Structure', 'West Parking Structure',
  'Transit Center Deck', 'Overflow Parking Annex',
];

function repeatableChain(opts: {
  facilityType: 'diningHall' | 'parking';
  startingId: string;
  startingName: string;
  startingServes: number;
  satisfactionAttribute: keyof SatisfactionAttributes;
  additionalCount: number;
  baseServes: number;
  servesGrowth: number;
  baseCost: number;
  costGrowth: number;
  baseWeeks: number;
  weeksGrowth: number;
  names: string[];
}): Buildable[] {
  const nodes: Buildable[] = [
    {
      id: opts.startingId,
      kind: 'facility',
      facilityType: opts.facilityType,
      name: opts.startingName,
      description: `Serves ${opts.startingServes.toLocaleString()} students. Standing since the university's founding.`,
      cost: 0,
      duration: 0,
      prereqs: [],
      status: 'done',
      // UNLIKE the starting dorm's capacityBonus (an apply-ONCE effect that
      // would double-count if granted here on top of the folded-in starting
      // baseline — see campusData.ts), servesPopulation/upkeepPerWeek are
      // LIVE-READ every tick straight off whatever's currently 'done' (see
      // BuildableEffects in state/types.ts) — so this starting instance
      // MUST carry them, or satisfactionSystem/financeSystem would silently
      // undercount it forever.
      effects: {
        servesPopulation: opts.startingServes,
        satisfactionAttribute: opts.satisfactionAttribute,
        upkeepPerWeek: servedUpkeep(opts.facilityType, opts.startingServes),
      },
    },
  ];

  let previousId = opts.startingId;
  for (let i = 1; i <= opts.additionalCount; i++) {
    const id = `${opts.facilityType.toUpperCase()}-${String(i + 1).padStart(2, '0')}`;
    const servesPopulation = Math.round(opts.baseServes * opts.servesGrowth ** (i - 1));
    const cost = Math.round(opts.baseCost * opts.costGrowth ** (i - 1));
    const duration = Math.round(opts.baseWeeks * opts.weeksGrowth ** (i - 1));
    nodes.push({
      id,
      kind: 'facility',
      facilityType: opts.facilityType,
      name: opts.names[i - 1] ?? `${opts.startingName} ${i + 1}`,
      description: `Serves ${servesPopulation.toLocaleString()} more students.`,
      cost,
      duration,
      prereqs: [previousId], // strictly sequential, same reasoning as the dorm chain
      status: i === 1 ? 'available' : 'locked',
      effects: {
        servesPopulation,
        satisfactionAttribute: opts.satisfactionAttribute,
        upkeepPerWeek: servedUpkeep(opts.facilityType, servesPopulation),
      },
    });
    previousId = id;
  }

  return nodes;
}

// --- Library: single building, two tiers, academic ---
// Tier 2 (the research library) is a real prestige gate, not just a bigger
// tier 1 — see prestigeSystem.ts's library-adequacy cap for why staying
// under-seated caps how far curriculum breadth alone can push prestige.
const LIBRARY_TIER1_ID = 'LIB-T1';
const LIBRARY_TIER1_SERVES = 1_200;
const LIBRARY_TIER1_COST = 120_000;
const LIBRARY_TIER1_WEEKS = 12;
const LIBRARY_TIER2_ID = 'LIB-T2';
const LIBRARY_TIER2_SERVES = 3_500;
const LIBRARY_TIER2_COST = 400_000;
const LIBRARY_TIER2_WEEKS = 24;
export const LIBRARY_TIER2_PRESTIGE_GATE = 70;

// --- Student center: single building, two tiers, social + passive retention ---
const STUDENT_CENTER_TIER1_ID = 'SCTR-T1';
const STUDENT_CENTER_TIER1_SERVES = 1_000;
const STUDENT_CENTER_TIER1_COST = 110_000;
const STUDENT_CENTER_TIER1_WEEKS = 10;
const STUDENT_CENTER_TIER2_ID = 'SCTR-T2';
const STUDENT_CENTER_TIER2_SERVES = 3_000;
const STUDENT_CENTER_TIER2_COST = 320_000;
const STUDENT_CENTER_TIER2_WEEKS = 20;

// --- Recreation/athletics center: single building, two tiers, social + prestige ---
const REC_CENTER_TIER1_ID = 'REC-T1';
const REC_CENTER_TIER1_SERVES = 1_200;
const REC_CENTER_TIER1_COST = 150_000;
const REC_CENTER_TIER1_WEEKS = 12;
const REC_CENTER_TIER1_PRESTIGE = 0.05;
const REC_CENTER_TIER2_ID = 'REC-T2';
const REC_CENTER_TIER2_SERVES = 3_500;
const REC_CENTER_TIER2_COST = 550_000;
const REC_CENTER_TIER2_WEEKS = 28;
const REC_CENTER_TIER2_PRESTIGE = 0.10;
export const REC_CENTER_TIER2_PRESTIGE_GATE = 55;

// --- Health/counseling center: single building, two tiers, gated by population ---
// "Unlocks at a population threshold" per the design ask: below
// HEALTH_CENTER_TIER1_CAPACITY_GATE, a school is small enough that not
// having one yet doesn't cost anything — see satisfactionSystem.ts's
// dormancy rule. Cross it and neglecting health becomes a real, scoring
// need like any other.
export const HEALTH_CENTER_TIER1_CAPACITY_GATE = 1_500;
const HEALTH_CENTER_TIER1_ID = 'HLTH-T1';
const HEALTH_CENTER_TIER1_SERVES = 2_000;
const HEALTH_CENTER_TIER1_COST = 190_000;
const HEALTH_CENTER_TIER1_WEEKS = 14;
export const HEALTH_CENTER_TIER2_CAPACITY_GATE = 6_000;
const HEALTH_CENTER_TIER2_ID = 'HLTH-T2';
const HEALTH_CENTER_TIER2_SERVES = 6_000;
const HEALTH_CENTER_TIER2_COST = 600_000;
const HEALTH_CENTER_TIER2_WEEKS = 26;

// --- Green space/quad: single, cheap, FLAT (non-population-scaling) bonus ---
// The one attribute contributor that doesn't play the capacity-ratio game
// at all: a quad is worth the same whether the campus has 400 students or
// 40,000, which is exactly why it's cheap and worth building early.
const QUAD_TIER1_ID = 'QUAD-T1';
const QUAD_TIER1_FLAT_BONUS = 8;
const QUAD_TIER1_COST = 20_000;
const QUAD_TIER1_WEEKS = 4;
const QUAD_TIER1_UPKEEP = 150;
const QUAD_TIER2_ID = 'QUAD-T2';
const QUAD_TIER2_FLAT_BONUS = 12;
const QUAD_TIER2_COST = 60_000;
const QUAD_TIER2_WEEKS = 8;
const QUAD_TIER2_UPKEEP = 400;

export function initialFacilities(): Buildable[] {
  return [
    ...repeatableChain({
      facilityType: 'diningHall',
      startingId: DINING_STARTING_ID,
      startingName: DINING_NAMES[0]!,
      startingServes: DINING_STARTING_SERVES,
      satisfactionAttribute: 'basicNeeds',
      additionalCount: DINING_ADDITIONAL_COUNT,
      baseServes: DINING_BASE_SERVES,
      servesGrowth: DINING_SERVES_GROWTH,
      baseCost: DINING_BASE_COST,
      costGrowth: DINING_COST_GROWTH,
      baseWeeks: DINING_BASE_WEEKS,
      weeksGrowth: DINING_WEEKS_GROWTH,
      names: DINING_NAMES.slice(1),
    }),
    ...repeatableChain({
      facilityType: 'parking',
      startingId: PARKING_STARTING_ID,
      startingName: PARKING_NAMES[0]!,
      startingServes: PARKING_STARTING_SERVES,
      satisfactionAttribute: 'infrastructure',
      additionalCount: PARKING_ADDITIONAL_COUNT,
      baseServes: PARKING_BASE_SERVES,
      servesGrowth: PARKING_SERVES_GROWTH,
      baseCost: PARKING_BASE_COST,
      costGrowth: PARKING_COST_GROWTH,
      baseWeeks: PARKING_BASE_WEEKS,
      weeksGrowth: PARKING_WEEKS_GROWTH,
      names: PARKING_NAMES.slice(1),
    }),

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
    {
      id: LIBRARY_TIER2_ID,
      kind: 'facility',
      facilityType: 'library',
      tier: 2,
      name: 'Research Library',
      description: `Adds ${LIBRARY_TIER2_SERVES.toLocaleString()} more seats and a real research collection. Unlocks at prestige ${LIBRARY_TIER2_PRESTIGE_GATE}+.`,
      cost: LIBRARY_TIER2_COST,
      duration: LIBRARY_TIER2_WEEKS,
      prereqs: [LIBRARY_TIER1_ID],
      minPrestigeToUnlock: LIBRARY_TIER2_PRESTIGE_GATE,
      status: 'locked',
      effects: {
        servesPopulation: LIBRARY_TIER2_SERVES,
        satisfactionAttribute: 'academic',
        upkeepPerWeek: servedUpkeep('library', LIBRARY_TIER2_SERVES),
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

    // Recreation / athletics center
    {
      id: REC_CENTER_TIER1_ID,
      kind: 'facility',
      facilityType: 'recCenter',
      tier: 1,
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
      id: REC_CENTER_TIER2_ID,
      kind: 'facility',
      facilityType: 'recCenter',
      tier: 2,
      name: 'Athletics Complex',
      description: `A varsity-grade complex: ${REC_CENTER_TIER2_SERVES.toLocaleString()} more capacity and a bigger prestige draw. Unlocks at prestige ${REC_CENTER_TIER2_PRESTIGE_GATE}+.`,
      cost: REC_CENTER_TIER2_COST,
      duration: REC_CENTER_TIER2_WEEKS,
      prereqs: [REC_CENTER_TIER1_ID],
      minPrestigeToUnlock: REC_CENTER_TIER2_PRESTIGE_GATE,
      status: 'locked',
      effects: {
        servesPopulation: REC_CENTER_TIER2_SERVES,
        satisfactionAttribute: 'social',
        prestigeContribution: REC_CENTER_TIER2_PRESTIGE,
        upkeepPerWeek: servedUpkeep('recCenter', REC_CENTER_TIER2_SERVES),
      },
    },

    // Health / counseling center
    {
      id: HEALTH_CENTER_TIER1_ID,
      kind: 'facility',
      facilityType: 'healthCenter',
      tier: 1,
      name: 'Health & Counseling Center',
      description: `Care for ${HEALTH_CENTER_TIER1_SERVES.toLocaleString()} students. Only needed once the campus crosses ${HEALTH_CENTER_TIER1_CAPACITY_GATE.toLocaleString()} beds of capacity.`,
      cost: HEALTH_CENTER_TIER1_COST,
      duration: HEALTH_CENTER_TIER1_WEEKS,
      prereqs: [],
      minCapacityToUnlock: HEALTH_CENTER_TIER1_CAPACITY_GATE,
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
      name: 'Health & Wellness Complex',
      description: `Adds ${HEALTH_CENTER_TIER2_SERVES.toLocaleString()} more capacity for a campus past ${HEALTH_CENTER_TIER2_CAPACITY_GATE.toLocaleString()} beds.`,
      cost: HEALTH_CENTER_TIER2_COST,
      duration: HEALTH_CENTER_TIER2_WEEKS,
      prereqs: [HEALTH_CENTER_TIER1_ID],
      minCapacityToUnlock: HEALTH_CENTER_TIER2_CAPACITY_GATE,
      status: 'locked',
      effects: {
        servesPopulation: HEALTH_CENTER_TIER2_SERVES,
        satisfactionAttribute: 'health',
        upkeepPerWeek: servedUpkeep('healthCenter', HEALTH_CENTER_TIER2_SERVES),
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
  ];
}
