import type { Buildable } from '../state/types';

// ---------------------------------------------------------------------
// Housing capacity is tied exclusively to dormitories — a `dorm` Buildable
// chain built on the exact same shared machinery as courses and academic
// buildings (see docs/architecture/buildables.md — do not build a parallel
// subsystem here). techSystem.ts's applyEffects already applies
// `capacityBonus` generically for any kind, so no engine change is needed,
// only content: capacity no longer ticks up from curriculum development
// (see techData.ts), it only grows when a dorm finishes construction here.
//
// The university starts with NO housing built: the founding hall
// (STARTING_DORM_ID below) is seeded 'available', not 'done', so the player
// builds and sites it like any other dorm — a founding campus opens fully
// commuter, and its students are just as enrolled without a bed (see
// admissionsSystem.ts: enrollment is never capacity-gated) as with one. Its
// beds are granted the normal way, through effects.capacityBonus on
// completion, so nothing is double-counted. The founding ACADEMIC hall
// (techData.ts's General Studies building, "Founders Hall") is what opens
// pre-built instead — see actions.ts's createInitialState. Every dorm after
// the starter unlocks strictly in order — the second hall requires the
// first, the third the second, and so on — so "build more dorms over time
// to grow capacity" is a straight queue in the Campus tab: there's always
// exactly one next dorm to build, with a visible cost and payoff, never a
// grid of independent choices.
// ---------------------------------------------------------------------

// ---------------------------------------------------------------------
// DORM CHAIN TUNING. Housing is the growth loop's most expensive turn and
// its longest lag: the cost is charged the week construction starts, the
// beds start costing seat upkeep the week it finishes (see
// financeSystem.ts), every satisfaction ratio dilutes against the new
// capacity IMMEDIATELY (see satisfactionSystem.ts) — and the students who
// pay for any of it only arrive at the NEXT summer's admissions funnel,
// and only if prestige and satisfaction have earned them.
//
// FOUR KINDS OF BUILDING, NOT ONE GEOMETRIC SERIES. The chain used to be a
// starter hall plus seventeen instances of `350 * 1.18^n` beds at
// `2.8M * 1.37^n` — which worked as a cost curve and failed as a campus.
// Every hall on the map was the same 9x3 block whatever it housed, so the
// eighteenth one slept 4,945 students in the footprint the first one slept
// 350 in. The cost curve is preserved (see the totals below); what changes
// is that a bed count is now something you can SEE:
//
//   - FOUNDING HALL, 350 beds. The modest first hall, cheap and quick.
//   - EARLY HALLS, 500 beds each (four of them). The ordinary
//     four-storey residence a young campus adds one at a time.
//   - MID-GAME HALLS, 1,000 beds each (four). Genuinely bigger buildings:
//     more ground, and taller — see campusMap.ts's DORM_FOOTPRINTS and
//     buildingMotifs.tsx's motifOf, both of which read the bed count off
//     `effects.capacityBonus` rather than needing a field of their own.
//   - VILLAGES, 1,500 beds each (two). One large plot holding an
//     ARRANGEMENT of small residences around shared green — the real
//     answer a campus that has run out of single-building sites reaches
//     for, and a distinct motif on the map rather than another slab.
//   - RESIDENTIAL TOWERS, 5,000 beds each (four). The late-game rung:
//     apartment towers with RETAIL AT STREET LEVEL, which is why a tower
//     alone among housing also feeds `basicNeeds` (see TOWER_RETAIL_SERVES
//     below) — a ground-floor market and food hall genuinely feed people.
//
// Cost per bed still climbs the whole way down the chain (7k -> 13k early,
// 14k -> 20k mid, 27k/31k for the villages, 40k -> 72k for the towers), so
// the marginal bed keeps getting more expensive relative to the tuition it
// earns, exactly as the geometric chain made it.
//
// THE COST CURVE IS MATCHED TO THE OLD CHAIN'S, RUNG BY RUNG, not just in
// total — and that is a thing to check by CUMULATIVE COST AT A GIVEN BED
// COUNT rather than by per-rung price, because the two chains do not have
// rungs in the same places. The first authoring of this table read as a
// reasonable climb per rung and was 20-30% dearer than the old chain at
// every bed count a 20-year run actually reaches, which the balance
// regression caught as the discount-heavy strategy dropping into a
// distress cycle it used to have cleared. These numbers track it: ~$20M to
// 2,350 beds (old: ~$21M), ~$88M to 6,350 (old: ~$103M), ~$174M to 9,350
// (old: ~$193M). A full build-out is 29,350 beds for about $1.28bn against
// the old chain's 30,826 for $1.59bn — cheaper only at the very top, where
// the old chain's final rungs ran to $87k a bed. Housing's own target asks
// that just 35% of ENROLLED students have a bed (TARGET_RATIO.housing in
// satisfactionSystem.ts), so this still covers a ~80,000-student campus,
// well past anything a 40-year run reaches.
// ---------------------------------------------------------------------

export const STARTING_DORM_ID = 'DORM-01';
export const STARTING_DORM_CAPACITY = 350; // the founding hall's bed count, granted via its capacityBonus effect when built
// Kept a CHEAP, quick starter, a fraction of the escalating chain's per-bed
// cost below, so it reads as the modest first hall it is rather than one of
// the major later capital builds — a school's first dorm is a real, felt
// decision (its own cost and 12-week build), not a founding freebie.
const STARTING_DORM_COST = 350_000;
const STARTING_DORM_WEEKS = 12;

// How many students' worth of `basicNeeds` one residential tower's
// street-level retail covers. Towers are the ONLY housing that carries a
// satisfaction effect at all: a ground-floor market, pharmacy and food hall
// in a building of five thousand people is a real amenity for the
// surrounding campus, not only for the residents. Mechanically this is an
// ordinary servesPopulation/satisfactionAttribute pair — the same live-read
// contract every facility in facilitiesData.ts follows (see
// BuildableEffects in state/types.ts) — so satisfactionSystem.ts needs no
// idea that the building it is counting is a dorm. The four towers together
// add 6,000, a real top-up against the dining chain's own ~60,000 rather
// than a replacement for it.
const TOWER_RETAIL_SERVES = 1_500;

// The chain, authored rung by rung rather than generated from a growth
// rate. Each entry is one hall; `beds` is what campusMap.ts and
// buildingMotifs.tsx read to decide how much ground it covers and what it
// looks like, so the four size classes above are visible in this table
// rather than hidden in an exponent.
interface DormRung {
  id: string;
  name: string;
  beds: number;
  cost: number;
  weeks: number;
  // A one-line description of what KIND of building this is, shared by
  // every rung in a size class — the build panel's tile reads it, and it
  // is the only place the class names ("village", "tower") are spelled for
  // the player.
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

  // --- Villages: one large plot, many small residences around shared green ---
  { id: 'DORM-10', name: 'Overlook Village', beds: 1_500, cost: 40_000_000, weeks: 32, blurb: 'A residential village: a dozen small houses around shared green, on one large plot.' },
  { id: 'DORM-11', name: 'Ridgeline Village', beds: 1_500, cost: 46_000_000, weeks: 32, blurb: 'A residential village: a dozen small houses around shared green, on one large plot.' },

  // --- Residential towers: the late-game rung, with retail at street level ---
  { id: 'DORM-12', name: 'Meridian Tower', beds: 5_000, cost: 200_000_000, weeks: 40, blurb: 'A residential tower with shops and a food hall at street level.', retailServes: TOWER_RETAIL_SERVES },
  { id: 'DORM-13', name: 'Beacon Tower', beds: 5_000, cost: 250_000_000, weeks: 40, blurb: 'A residential tower with shops and a food hall at street level.', retailServes: TOWER_RETAIL_SERVES },
  { id: 'DORM-14', name: 'Horizon Tower', beds: 5_000, cost: 300_000_000, weeks: 44, blurb: 'A residential tower with shops and a food hall at street level.', retailServes: TOWER_RETAIL_SERVES },
  { id: 'DORM-15', name: 'Aurora Tower', beds: 5_000, cost: 360_000_000, weeks: 44, blurb: 'A residential tower with shops and a food hall at street level.', retailServes: TOWER_RETAIL_SERVES },
];

// A tower's retail costs something to run, like any other basicNeeds
// capacity on campus. Priced at the grocery store's own per-seat rate
// (facilitiesData.ts's UPKEEP_PER_SERVED_PER_WEEK.grocery, 1.0/served/wk)
// rather than a full dining hall's, since that is what it is: shelves and
// registers, not a kitchen brigade. Written as a literal rather than
// imported so campusData.ts stays free of facility imports — the one
// number it would pull is this one, and the comment is the link.
const TOWER_RETAIL_UPKEEP_PER_WEEK = TOWER_RETAIL_SERVES * 1.0;

export function initialDorms(): Buildable[] {
  const nodes: Buildable[] = [
    {
      id: STARTING_DORM_ID,
      kind: 'dorm',
      name: 'University Hall',
      description: 'The university’s first student housing hall — build it to give students somewhere to live on campus.',
      cost: STARTING_DORM_COST,
      duration: STARTING_DORM_WEEKS,
      prereqs: [],
      // Available from day one, like the founding dining hall — the campus
      // opens with no housing built at all (see the module comment above),
      // so this is the player's first real housing decision rather than a
      // founding freebie. Every dorm after it grants its beds the usual way
      // too, on completion.
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
      // Strictly sequential: only ever one dorm buildable at a time, so it
      // reads as a queue rather than a menu (see the file header above).
      prereqs: [previousId],
      // Every additional dorm starts locked and unlocks the normal way, the
      // tick its prereq (the dorm before it) finishes.
      status: 'locked',
      effects: {
        capacityBonus: rung.beds,
        // Towers only — see TOWER_RETAIL_SERVES. A dorm with no retail
        // carries no satisfaction effect at all, exactly as before, so it
        // dilutes only its own Housing attribute.
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
