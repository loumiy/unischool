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
// The university starts with one dorm already built (STARTING_DORM below,
// seeded 'done' the same way General Studies Hall is in techData.ts's
// initialTech — its capacity is folded straight into the founding baseline
// via STARTING_DORM_CAPACITY rather than granted through effects, to avoid
// double-counting). Every dorm after that unlocks strictly in order — Dorm
// II requires Dorm I, Dorm III requires Dorm II, and so on — so "build more
// dorms over time to grow capacity" is a straight queue in the Campus tab:
// there's always exactly one next dorm to build, with a visible cost and
// payoff, never a grid of independent choices.
//
// Both capacity and cost grow geometrically down the chain — an
// escalating-investment shape, with cost growing a little faster than
// capacity, so later dorms cost more per bed than earlier ones. That makes a fully built-out housing
// chain a genuine decades-long capital investment (see README's "Pacing
// model: money is the throttle"), not a handful of cheap early clicks.
// ---------------------------------------------------------------------

const STARTING_DORM_ID = 'DORM-01';
export const STARTING_DORM_CAPACITY = 350; // folded directly into students.capacity by createInitialState

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

const DORM_NAMES = [
  'Founders Hall', 'Lakeside Hall', 'Riverside Commons', 'Hillcrest Hall',
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
      description: 'The original student housing hall, standing since the university’s founding.',
      cost: 0,
      duration: 0,
      prereqs: [],
      status: 'done',
      // No effects: capacity is folded into the starting baseline (see
      // STARTING_DORM_CAPACITY above) rather than granted here, matching
      // techData.ts's General Studies Hall pattern.
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
      // The first additional dorm is buildable from day one, since its lone
      // prereq (the starting dorm) is seeded 'done' rather than completed
      // through the normal tick pipeline that would otherwise unlock it —
      // same reasoning as techData.ts's gen-ed core courses.
      status: i === 1 ? 'available' : 'locked',
      effects: { capacityBonus: capacity },
    });
    previousId = id;
  }

  return nodes;
}
