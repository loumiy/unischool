import type { Buildable } from '../state/types';

// Housing capacity comes only from this `dorm` Buildable chain on the shared
// machinery (docs/architecture/buildables.md), via effects.capacityBonus.
// The campus opens with no housing (enrollment is never capacity-gated),
// and each dorm requires the one before.
//
// Dorm chain tuning. Bed counts come in size classes (see DORM_RUNGS) that
// drive footprint and motif (campusMap.ts's DORM_FOOTPRINTS,
// buildingMotifs.tsx's motifOf). Cost per bed climbs down the chain (7k to
// 72k). Check changes by cumulative cost at a given bed count, not per-rung
// price: ~$20M to 2,350 beds, ~$88M to 6,350, ~$174M to 9,350; a full
// build-out is 29,350 beds for about $1.28bn. Dearer curves pushed the
// discount-heavy balance strategy into a distress cycle. Housing's target is
// 35% of enrolled (satisfactionSystem.ts's TARGET_RATIO.housing), so the
// chain covers a ~80,000-student campus.

export const STARTING_DORM_ID = 'DORM-01';
export const STARTING_DORM_CAPACITY = 350; // the founding hall's bed count, granted via its capacityBonus effect when built
// A cheap, quick starter, but still a real decision rather than a freebie.
const STARTING_DORM_COST = 350_000;
const STARTING_DORM_WEEKS = 12;

// basicNeeds capacity of one tower's street-level retail, via the ordinary
// servesPopulation/satisfactionAttribute pair: a top-up, not a replacement.
const TOWER_RETAIL_SERVES = 1_500;

// The chain, authored rung by rung. `beds` drives footprint and motif.
interface DormRung {
  id: string;
  name: string;
  beds: number;
  cost: number;
  weeks: number;
  // The size class's description, shown on the build panel's tile.
  blurb: string;
  // Set on the towers only: the street-level retail's basicNeeds capacity.
  retailServes?: number;
}

const DORM_RUNGS: DormRung[] = [
  // --- Early halls: 500 beds ---
  { id: 'DORM-02', name: 'Lakeside Hall', beds: 500, cost: 3_500_000, weeks: 16, blurb: 'A four-storey residence hall.' },
  { id: 'DORM-03', name: 'Riverside Commons', beds: 500, cost: 4_500_000, weeks: 16, blurb: 'A four-storey residence hall.' },
  { id: 'DORM-04', name: 'Hillcrest Hall', beds: 500, cost: 5_500_000, weeks: 17, blurb: 'A four-storey residence hall.' },
  { id: 'DORM-05', name: 'Cascade Hall', beds: 500, cost: 6_500_000, weeks: 17, blurb: 'A four-storey residence hall.' },

  // --- Mid-game halls: 1,000 beds, on more ground and several storeys taller ---
  { id: 'DORM-06', name: 'Summit Commons', beds: 1_000, cost: 14_000_000, weeks: 22, blurb: 'A high-rise hall — twice the beds, on more ground and several storeys taller.' },
  { id: 'DORM-07', name: 'Vanguard Hall', beds: 1_000, cost: 16_000_000, weeks: 22, blurb: 'A high-rise hall — twice the beds, on more ground and several storeys taller.' },
  { id: 'DORM-08', name: 'Sterling Hall', beds: 1_000, cost: 18_000_000, weeks: 23, blurb: 'A high-rise hall — twice the beds, on more ground and several storeys taller.' },
  { id: 'DORM-09', name: 'Crestline Hall', beds: 1_000, cost: 20_000_000, weeks: 23, blurb: 'A high-rise hall — twice the beds, on more ground and several storeys taller.' },

  // --- Villages: one large plot, many small residences around a shared green ---
  { id: 'DORM-10', name: 'Overlook Village', beds: 1_500, cost: 40_000_000, weeks: 32, blurb: 'A residential village: a dozen small houses around a shared green, on one large plot.' },
  { id: 'DORM-11', name: 'Ridgeline Village', beds: 1_500, cost: 46_000_000, weeks: 32, blurb: 'A residential village: a dozen small houses around a shared green, on one large plot.' },

  // --- Residential towers: the late-game rung, with retail at street level ---
  { id: 'DORM-12', name: 'Meridian Tower', beds: 5_000, cost: 200_000_000, weeks: 40, blurb: 'A residential tower with shops and a food hall at street level.', retailServes: TOWER_RETAIL_SERVES },
  { id: 'DORM-13', name: 'Beacon Tower', beds: 5_000, cost: 250_000_000, weeks: 40, blurb: 'A residential tower with shops and a food hall at street level.', retailServes: TOWER_RETAIL_SERVES },
  { id: 'DORM-14', name: 'Horizon Tower', beds: 5_000, cost: 300_000_000, weeks: 44, blurb: 'A residential tower with shops and a food hall at street level.', retailServes: TOWER_RETAIL_SERVES },
  { id: 'DORM-15', name: 'Aurora Tower', beds: 5_000, cost: 360_000_000, weeks: 44, blurb: 'A residential tower with shops and a food hall at street level.', retailServes: TOWER_RETAIL_SERVES },
];

// Priced at the grocery rate (facilitiesData.ts's
// UPKEEP_PER_SERVED_PER_WEEK.grocery, 1.0/served/wk). A literal so this file
// stays free of facility imports; keep the two in step.
const TOWER_RETAIL_UPKEEP_PER_WEEK = TOWER_RETAIL_SERVES * 1.0;

export function initialDorms(): Buildable[] {
  const nodes: Buildable[] = [
    {
      id: STARTING_DORM_ID,
      kind: 'dorm',
      name: 'University Hall',
      description: 'The college\'s first residence hall — build it to give students somewhere to live on campus.',
      cost: STARTING_DORM_COST,
      duration: STARTING_DORM_WEEKS,
      prereqs: [],
      // Available from day one: the player's first housing decision.
      status: 'available',
      effects: { capacityBonus: STARTING_DORM_CAPACITY },
    },
  ];

  let previousId = STARTING_DORM_ID;
  for (const rung of DORM_RUNGS) {
    nodes.push({
      id: rung.id,
      kind: 'dorm',
      name: rung.name,
      description: `${rung.blurb} Adds ${rung.beds.toLocaleString()} beds${rung.retailServes ? `, and feeds ${rung.retailServes.toLocaleString()} students from its shops` : ''}.`,
      cost: rung.cost,
      duration: rung.weeks,
      // Strictly sequential: one dorm buildable at a time.
      prereqs: [previousId],
      status: 'locked',
      effects: {
        capacityBonus: rung.beds,
        // Towers only (TOWER_RETAIL_SERVES); other dorms carry no
        // satisfaction effect beyond Housing.
        ...(rung.retailServes
          ? {
              servesPopulation: rung.retailServes,
              satisfactionAttribute: 'basicNeeds' as const,
              upkeepPerWeek: TOWER_RETAIL_UPKEEP_PER_WEEK,
            }
          : {}),
      },
    });
    previousId = rung.id;
  }

  return nodes;
}
