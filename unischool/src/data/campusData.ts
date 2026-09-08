import type { Buildable } from '../state/types';

// ---------------------------------------------------------------------
// Housing capacity is tied exclusively to dormitories — a `dorm` Buildable
// chain built on the exact same shared machinery as courses and academic
// buildings (see README's "The central abstraction: Buildables" — do not
// build a parallel subsystem here). techSystem.ts's applyEffects already
// applies `capacityBonus` generically for any kind, so no engine change is
// needed, only content: capacity no longer ticks up from curriculum
// development (see techData.ts), it only grows when a dorm finishes
// construction here.
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
// the starter unlocks strictly in order — Dorm II requires Dorm I, Dorm III
// requires Dorm II, and so on — so "build more dorms over time to grow
// capacity" is a straight queue in the Campus tab: there's always exactly
// one next dorm to build, with a visible cost and payoff, never a grid of
// independent choices.
//
// Both capacity and cost grow geometrically down the chain — an
// escalating-investment shape, with cost growing a little faster than
// capacity, so later dorms cost more per bed than earlier ones. That makes a fully built-out housing
// chain a genuine decades-long capital investment (see README's "Pacing
// model: money is the throttle"), not a handful of cheap early clicks.
// ---------------------------------------------------------------------

export const STARTING_DORM_ID = 'DORM-01';
export const STARTING_DORM_CAPACITY = 350; // the founding hall's bed count, granted via its capacityBonus effect when built
// Kept a CHEAP, quick starter, a fraction of the escalating chain's per-bed
// cost below, so it reads as the modest first hall it is rather than one of
// the major later capital builds — a school's first dorm is a real, felt
// decision (its own cost and 12-week build), not a founding freebie.
const STARTING_DORM_COST = 350_000;
const STARTING_DORM_WEEKS = 12;

// ---------------------------------------------------------------------
// DORM CHAIN TUNING. Housing is the growth loop's most expensive turn and
// its longest lag: the cost is charged the week construction starts, the
// beds start costing seat upkeep the week it finishes (see
// financeSystem.ts), every satisfaction ratio dilutes against the new
// capacity IMMEDIATELY (see satisfactionSystem.ts) — and the students who
// pay for any of it only arrive at the NEXT summer's admissions funnel,
// and only if prestige and satisfaction have earned them.
//
// So the base cost is deliberately sized at several months of a young
// school's entire net income, and cost outgrows capacity down the chain,
// so the marginal bed keeps getting more expensive relative to the
// tuition it earns — the late-game equivalent of a real capital project.
// ---------------------------------------------------------------------
const ADDITIONAL_DORM_COUNT = 14;    // how many more dorms can be queued up after the starter
const DORM_BASE_CAPACITY = 350;      // Dorm II's capacity bonus
const DORM_CAPACITY_GROWTH = 1.18;   // each dorm after houses ~18% more than the last
const DORM_BASE_COST = 2_800_000;  // Dorm II's cost — ~$8k a bed, so a dorm pays itself back over a year or more of the tuition margin it unlocks, not in a couple of months
const DORM_COST_GROWTH = 1.37;       // costs outgrow capacity — the late-game cost-per-bed climbs
const DORM_BASE_WEEKS = 14;          // Dorm II's build time
const DORM_WEEKS_GROWTH = 1.05;      // build time grows slowly — money, not time, is the late-game bottleneck

// One name per hall in the chain — the starter plus every one of
// ADDITIONAL_DORM_COUNT — so no built dorm ever falls back to the
// generated `Dorm N` below (the build panel lists these by name once the
// Housing group collapses its built rows).
const DORM_NAMES = [
  'University Hall', 'Lakeside Hall', 'Riverside Commons', 'Hillcrest Hall',
  'Meridian Tower', 'Cascade Hall', 'Summit Commons', 'Vanguard Hall',
  'Beacon Tower', 'Overlook Commons', 'Sterling Hall', 'Horizon Tower',
  'Ridgeline Commons', 'Pinnacle Hall', 'Zenith Tower',
];

export function initialDorms(): Buildable[] {
  const nodes: Buildable[] = [
    {
      id: STARTING_DORM_ID,
      kind: 'dorm',
      name: DORM_NAMES[0],
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
  for (let i = 1; i <= ADDITIONAL_DORM_COUNT; i++) {
    const id = `DORM-${String(i + 1).padStart(2, '0')}`;
    const capacity = Math.round(DORM_BASE_CAPACITY * DORM_CAPACITY_GROWTH ** (i - 1));
    const cost = Math.round(DORM_BASE_COST * DORM_COST_GROWTH ** (i - 1));
    const duration = Math.round(DORM_BASE_WEEKS * DORM_WEEKS_GROWTH ** (i - 1));
    nodes.push({
      id,
      kind: 'dorm',
      name: DORM_NAMES[i] ?? `Dorm ${i + 1}`,
      description: `Adds ${capacity.toLocaleString()} beds of student housing.`,
      cost,
      duration,
      // Strictly sequential: only ever one dorm buildable at a time, so it
      // reads as a queue rather than a menu (see the file header above).
      prereqs: [previousId],
      // Every additional dorm starts locked and unlocks the normal way, the
      // tick its prereq (the dorm before it) finishes.
      status: 'locked',
      effects: { capacityBonus: capacity },
    });
    previousId = id;
  }

  return nodes;
}
