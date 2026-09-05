import type { Buildable, FacilityType, SatisfactionAttributes } from '../state/types';

// ---------------------------------------------------------------------
// Campus-life facilities: the six non-housing, non-lab needs a campus has
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
//   - Repeatable chains (dining hall): like campusData.ts's dorm chain — a
//     starting instance seeded 'done', then a strictly sequential queue of
//     more instances. Real campuses have several dining halls, so "build
//     another" is the natural action.
//   - Single buildings with tier upgrades (library, student center, rec
//     center, health center, quad): a campus typically has ONE of these,
//     upgraded in place. Tier 2 is a genuinely bigger facility (more seats,
//     sometimes a different unlock gate), not a repeat of tier 1.
//
// Every facility carries upkeepPerWeek (see financeSystem.ts) scaled off
// how many students it serves (or a flat rate for the two that don't scale
// with population) at a per-type rate reflecting how labor/equipment-heavy
// that need is — dining (food service staff) and health (clinical staff)
// cost the most per seat served.
// ---------------------------------------------------------------------

// ---------------------------------------------------------------------
// FACILITY TUNING. Facilities are the relief valve of the growth loop and
// they are deliberately priced as a COST THAT ARRIVES FIRST: a dorm
// dilutes every ratio attribute the week it finishes, so the dining hall
// that fixes it has to be bought (and its upkeep carried) before the
// enrollment that dilutes it has paid for anything. Build costs are sized
// against the dorm chain — roughly a third to a half of the dorm whose
// capacity forced them — and per-served upkeep is sized so a fully served
// campus spends a real, visible slice of tuition on keeping the lights on.
// ---------------------------------------------------------------------
const UPKEEP_PER_SERVED_PER_WEEK: Record<string, number> = {
  diningHall: 2.2,
  library: 0.9,
  studentCenter: 1.0,
  recCenter: 1.1,
  healthCenter: 1.6,
  gym: 1.0,               // fitness staff and equipment upkeep, in line with the student center
  tennisCourts: 0.5,      // outdoor courts, minimal staffing
  pool: 1.5,              // lifeguards plus chemical/mechanical upkeep — pricier per head than a gym
  performingArtsCenter: 1.0, // venue/production staff, a campus-wide draw like the student center
  artGallery: 0.7,        // curatorial and security staff, lighter than a working venue
  // Varsity athletics venues (see the block below): grounds crew and
  // officiating overhead, distinct from — and pricier per head than — the
  // recreational trio above, since these host real competition rather than
  // open-use fitness.
  athleticsField: 0.9,
  athleticsArena: 1.4,
  athleticsDiamond: 1.0,
  athleticsNatatorium: 1.8, // a competition pool: timing equipment and certified officials, pricier than the rec Swimming Pool above
  footballStadium: 1.2,
};

function servedUpkeep(facilityType: keyof typeof UPKEEP_PER_SERVED_PER_WEEK, servesPopulation: number): number {
  return Math.round(UPKEEP_PER_SERVED_PER_WEEK[facilityType] * servesPopulation);
}

// --- Dining hall: repeatable chain, basic need, scales hard with capacity ---
// Deliberately the steepest under-capacity penalty of the four attributes
// (see satisfactionSystem.ts's BASIC_NEEDS_PENALTY_CURVATURE) — going
// hungry reads as an acute problem, not a gentle drift.
//
// Sized at roughly one dining hall per 3-4 dorms rather than one per dorm:
// the OLD chain (13 instances averaging ~690 served each) could never
// actually cover a maxed-out dorm chain even fully built (its ceiling was
// ~8,900 served against dorms' ~21,300 capacity ceiling) — every dining
// hall was cheap and small, but there were too few of them to ever exist
// to close that gap. This chain is short (5 instances) and each one
// dramatically bigger, so five real decisions comfortably cover the whole
// dorm chain (~21,700 served against ~21,300 capacity) instead of thirteen
// small ones that ran out partway through it.
//
// Size is what the campus map draws, too (see campusMap.ts's footprintOf):
// a hall at or above DINING_MAJOR_FOOTPRINT_SERVES_THRESHOLD is a real "major
// dining hall" and gets a footprint on the order of a student center; a
// smaller one reads as a compact campus restaurant and stays small. Only
// the founding hall is small enough to be a restaurant here — everything
// the school adds afterward is sized to matter.
const DINING_STARTING_ID = 'DINING-01';
const DINING_STARTING_SERVES = 350; // matches STARTING_DORM_CAPACITY: the campus opens adequately fed, not just adequately housed
const DINING_ADDITIONAL_COUNT = 4;
const DINING_BASE_SERVES = 1_600;
const DINING_SERVES_GROWTH = 1.9;
const DINING_BASE_COST = 2_400_000; // ~$1,500/seat at the base, the same rough rate the old chain built at
const DINING_COST_GROWTH = 2.0; // outpaces servesGrowth on purpose — cost-per-seat still climbs at the high end, same shape as the dorm chain's own cost-outgrows-capacity curve
const DINING_BASE_WEEKS = 14;
const DINING_WEEKS_GROWTH = 1.12;
// One name per instance in the chain: the starting hall plus every one of
// DINING_ADDITIONAL_COUNT, so no built hall ever falls back to a generated
// stand-in (the build panel lists these by name once the group collapses).
const DINING_NAMES = [
  'The Original Dining Hall', 'Union Square Eatery', 'Commons Cafeteria', 'The Grand Table',
  'Founders Commons',
];

function repeatableChain(opts: {
  facilityType: 'diningHall';
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
  fallbackName: string; // only used if additionalCount is raised past `names` — a plain numbered name, never a copy of the starting instance's
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
      name: opts.names[i - 1] ?? `${opts.fallbackName} ${i + 1}`,
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
const LIBRARY_TIER1_COST = 360_000;
const LIBRARY_TIER1_WEEKS = 12;
const LIBRARY_TIER2_ID = 'LIB-T2';
const LIBRARY_TIER2_SERVES = 3_500;
const LIBRARY_TIER2_COST = 1_400_000;
const LIBRARY_TIER2_WEEKS = 24;
export const LIBRARY_TIER2_PRESTIGE_GATE = 70;
// The research library is the one campus-life facility that touches
// research: a real research collection makes every lab-equipped
// department more productive. Read live off effects.researchRateBonus,
// exactly as the labs' own bonuses are (see techData.ts's
// LAB_RESEARCH_RATE_BONUS). It MULTIPLIES output and never creates it —
// a campus with a research library and no lab still researches nothing,
// because the gate is labs.
const LIBRARY_TIER2_RESEARCH_RATE_BONUS = 0.15;

// --- Student center: single building, two tiers, social + passive retention ---
const STUDENT_CENTER_TIER1_ID = 'SCTR-T1';
const STUDENT_CENTER_TIER1_SERVES = 1_000;
const STUDENT_CENTER_TIER1_COST = 330_000;
const STUDENT_CENTER_TIER1_WEEKS = 10;
const STUDENT_CENTER_TIER2_ID = 'SCTR-T2';
const STUDENT_CENTER_TIER2_SERVES = 3_000;
const STUDENT_CENTER_TIER2_COST = 1_150_000;
const STUDENT_CENTER_TIER2_WEEKS = 20;

// --- Recreation/athletics center: single building, two tiers, social + prestige ---
const REC_CENTER_TIER1_ID = 'REC-T1';
const REC_CENTER_TIER1_SERVES = 1_200;
const REC_CENTER_TIER1_COST = 450_000;
const REC_CENTER_TIER1_WEEKS = 12;
const REC_CENTER_TIER1_PRESTIGE = 0.05;
const REC_CENTER_TIER2_ID = 'REC-T2';
const REC_CENTER_TIER2_SERVES = 3_500;
const REC_CENTER_TIER2_COST = 1_900_000;
const REC_CENTER_TIER2_WEEKS = 28;
const REC_CENTER_TIER2_PRESTIGE = 0.10;
export const REC_CENTER_TIER2_PRESTIGE_GATE = 55;

// --- Recreational facilities: gym, tennis courts, pool ---
// Deliberately ONE-OFF (no `tier` field, no tier-2 upgrade) rather than the
// library/studentCenter/recCenter shape: each is a single, smaller amenity
// alongside the rec center rather than a second thing to grow in place — the
// rec center already IS the tiered "recreation" building. These exist to
// give `social` more levers now that TARGET_RATIO.social is 0.34 (see
// satisfactionSystem.ts's note on the harshening pass): more capacity to
// hold the ratio as a campus keeps growing past what the rec center +
// student center alone can cover, not a replacement for either.
//
// RESOLVED (the athletics PR this flag was left for): the rec pool stays,
// unchanged, alongside a separate NATATORIUM below, and the same split
// applies to every other rec/competition pair. DESIGN FORK, made explicit
// rather than resolved silently: "shared" in the varsity-athletics feature
// means shared AMONG VARSITY TEAMS in one sport's category, not shared with
// open-use recreation — a swim team does not compete in the rec center's
// lap pool any more than the football team would play its games on the
// intramural field. The alternative (letting an existing rec facility
// double as a team's competition venue once a sport goes varsity) was
// considered and rejected: it would make a rec facility's later social-
// satisfaction contribution silently do double duty as an athletics gate,
// coupling two systems that are otherwise cleanly separate, and it would
// mean two very differently-scoped things (an open gym anyone can walk
// into; a conference-regulation venue with real capacity) sharing one
// Buildable id. Keeping them distinct costs exactly what this file already
// costs for gym/pool/tennis vs. the rec center: another one-off facility
// row, not a new subsystem.
const GYM_ID = 'GYM';
const GYM_SERVES = 1_000;
const GYM_COST = 350_000;
const GYM_WEEKS = 12;
const TENNIS_COURTS_ID = 'TENNIS-COURTS';
const TENNIS_COURTS_SERVES = 400;
const TENNIS_COURTS_COST = 140_000;
const TENNIS_COURTS_WEEKS = 6;
const POOL_ID = 'POOL';
const POOL_SERVES = 700;
const POOL_COST = 320_000;
const POOL_WEEKS = 10;

// --- Arts facilities: performing arts center (landmark), art gallery ---
// Also one-off, same reasoning as the recreational trio above. Both feed
// `social` like any other campus-life facility, and the performing arts
// center ALSO gates the Arts & Media school's three majors' tier-3
// (capstone) courses — see techData.ts's ARTS_GATED_MAJOR_PREFIXES, wired
// the exact same way a science major's Lab Buildable gates its own
// capstone quartet. Only the performing arts center carries that gate: one
// coupling is enough to give the arts curriculum a building of its own
// without splitting a two-major gate across two half-relevant facilities.
// Exported because techData.ts's course-prereq wiring needs the id.
export const PERFORMING_ARTS_CENTER_ID = 'ARTS-PAC';
const PERFORMING_ARTS_CENTER_SERVES = 1_500;
const PERFORMING_ARTS_CENTER_COST = 1_100_000;
const PERFORMING_ARTS_CENTER_WEEKS = 20;
const ART_GALLERY_ID = 'ART-GALLERY';
const ART_GALLERY_SERVES = 500;
const ART_GALLERY_COST = 220_000;
const ART_GALLERY_WEEKS = 8;

// --- Varsity athletics venues: shared competition facilities, HIDDEN until demanded ---
// See data/studentLifeData.ts's SPORTS for the sport -> category mapping and
// eventData.ts's 'varsity-petition' for what reveals one. Every entry below
// is seeded 'locked' with `athleticsVenueReveal: true` and EMPTY prereqs —
// unlike every other facility in this file, prereqs alone would let
// unlockAvailable() open it on the very first tick, so the reveal gate is
// what actually keeps it hidden (see techSystem.ts's meetsUnlockGates,
// following the Medicine/Law reveal-on-gate pattern). One-off, no tier
// upgrades, same shape as the recreational trio above — but a fully
// separate FacilityType per venue (see the design-fork note above GYM_ID),
// so none of them are "the gym, but varsity".
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

// The pinnacle venue: the most expensive facility in the game (well past
// the athletics complex tier and the dorm chain's own early rungs), the
// largest footprint on the map (see campusMap.ts's footprintOf), and gated
// behind football's own petition and nothing else — no other sport can
// reveal or share it.
const FOOTBALL_STADIUM_ID = 'ATH-STADIUM';
const FOOTBALL_STADIUM_SERVES = 2_500;
const FOOTBALL_STADIUM_COST = 6_500_000;
const FOOTBALL_STADIUM_WEEKS = 40;

// ---------------------------------------------------------------------
// CATEGORIES. A grouping layer ABOVE FacilityType, for UI organisation only
// (the build popup's sectioning today — see BuildPopup.tsx's TYPE_MATCHERS —
// and whatever later reads it). Nothing in the engine branches on this: it
// exists purely so "which facilities are athletics and which are
// recreation" is authored ONCE, here,
// rather than re-derived (or, worse, drifted) at every place that needs to
// group them.
//
// The line is exactly the design fork documented above GYM_ID: ATHLETICS is
// the five varsity COMPETITION venues — the ones data/studentLifeData.ts's
// SPORTS maps a team's `venueCategory` to, real facilities gated behind a
// team actually going varsity. RECREATION is the open-use amenities no team
// is ever tied to. A rec facility never becomes "athletics" just because a
// club happens to practice on it informally, and a varsity venue never
// becomes "recreation" just because it also has open hours — see the
// GYM_ID comment for why that coupling was rejected outright. Every other
// FacilityType (library, dorm-adjacent facilities, etc.) is absent here on
// purpose: it already has its own natural grouping and doesn't need a
// second one.
export type FacilityCategory = 'athletics' | 'recreation';

export const FACILITY_CATEGORY_OF: Partial<Record<FacilityType, FacilityCategory>> = {
  gym: 'recreation',
  tennisCourts: 'recreation',
  pool: 'recreation',
  performingArtsCenter: 'recreation',
  artGallery: 'recreation',
  athleticsField: 'athletics',
  athleticsArena: 'athletics',
  athleticsDiamond: 'athletics',
  athleticsNatatorium: 'athletics',
  footballStadium: 'athletics',
};

// --- Health/counseling center: single building, two tiers, gated by population ---
// "Unlocks at a population threshold" per the design ask: below
// HEALTH_CENTER_TIER1_CAPACITY_GATE, a school is small enough that not
// having one yet doesn't cost anything — see satisfactionSystem.ts's
// dormancy rule. Cross it and neglecting health becomes a real, scoring
// need like any other.
export const HEALTH_CENTER_TIER1_CAPACITY_GATE = 1_500;
const HEALTH_CENTER_TIER1_ID = 'HLTH-T1';
const HEALTH_CENTER_TIER1_SERVES = 2_000;
const HEALTH_CENTER_TIER1_COST = 560_000;
const HEALTH_CENTER_TIER1_WEEKS = 14;
export const HEALTH_CENTER_TIER2_CAPACITY_GATE = 6_000;
const HEALTH_CENTER_TIER2_ID = 'HLTH-T2';
const HEALTH_CENTER_TIER2_SERVES = 6_000;
const HEALTH_CENTER_TIER2_COST = 2_100_000;
const HEALTH_CENTER_TIER2_WEEKS = 26;

// --- Green space/quad: single, cheap, FLAT (non-population-scaling) bonus ---
// The one attribute contributor that doesn't play the capacity-ratio game
// at all: a quad is worth the same whether the campus has 400 students or
// 40,000, which is exactly why it's cheap and worth building early.
const QUAD_TIER1_ID = 'QUAD-T1';
const QUAD_TIER1_FLAT_BONUS = 8;
const QUAD_TIER1_COST = 60_000;
const QUAD_TIER1_WEEKS = 4;
const QUAD_TIER1_UPKEEP = 400;
const QUAD_TIER2_ID = 'QUAD-T2';
const QUAD_TIER2_FLAT_BONUS = 12;
const QUAD_TIER2_COST = 190_000;
const QUAD_TIER2_WEEKS = 8;
const QUAD_TIER2_UPKEEP = 1_000;

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
      fallbackName: 'Dining Hall',
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
      description: `Adds ${LIBRARY_TIER2_SERVES.toLocaleString()} more seats and a real research collection, lifting research output across every lab-equipped department. Unlocks at prestige ${LIBRARY_TIER2_PRESTIGE_GATE}+.`,
      cost: LIBRARY_TIER2_COST,
      duration: LIBRARY_TIER2_WEEKS,
      prereqs: [LIBRARY_TIER1_ID],
      minPrestigeToUnlock: LIBRARY_TIER2_PRESTIGE_GATE,
      status: 'locked',
      effects: {
        servesPopulation: LIBRARY_TIER2_SERVES,
        satisfactionAttribute: 'academic',
        upkeepPerWeek: servedUpkeep('library', LIBRARY_TIER2_SERVES),
        researchRateBonus: LIBRARY_TIER2_RESEARCH_RATE_BONUS,
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

    // Recreational facilities: gym, tennis courts, pool — one-off, social
    {
      id: GYM_ID,
      kind: 'facility',
      facilityType: 'gym',
      name: 'Gym & Fitness Center',
      description: `Weight room and cardio floor for ${GYM_SERVES.toLocaleString()} students.`,
      cost: GYM_COST,
      duration: GYM_WEEKS,
      prereqs: [],
      status: 'available',
      effects: {
        servesPopulation: GYM_SERVES,
        satisfactionAttribute: 'social',
        upkeepPerWeek: servedUpkeep('gym', GYM_SERVES),
      },
    },
    {
      id: TENNIS_COURTS_ID,
      kind: 'facility',
      facilityType: 'tennisCourts',
      name: 'Tennis Courts',
      description: `A handful of courts open to ${TENNIS_COURTS_SERVES.toLocaleString()} students — cheap, and a quick early win for campus life.`,
      cost: TENNIS_COURTS_COST,
      duration: TENNIS_COURTS_WEEKS,
      prereqs: [],
      status: 'available',
      effects: {
        servesPopulation: TENNIS_COURTS_SERVES,
        satisfactionAttribute: 'social',
        upkeepPerWeek: servedUpkeep('tennisCourts', TENNIS_COURTS_SERVES),
      },
    },
    {
      id: POOL_ID,
      kind: 'facility',
      facilityType: 'pool',
      name: 'Swimming Pool',
      description: `An indoor pool for ${POOL_SERVES.toLocaleString()} students.`,
      cost: POOL_COST,
      duration: POOL_WEEKS,
      prereqs: [],
      status: 'available',
      effects: {
        servesPopulation: POOL_SERVES,
        satisfactionAttribute: 'social',
        upkeepPerWeek: servedUpkeep('pool', POOL_SERVES),
      },
    },

    // Arts facilities: performing arts center (landmark) and gallery
    {
      id: PERFORMING_ARTS_CENTER_ID,
      kind: 'facility',
      facilityType: 'performingArtsCenter',
      name: 'Performing Arts Center',
      description: `A campus landmark: a concert hall and theater seating ${PERFORMING_ARTS_CENTER_SERVES.toLocaleString()} students, and the venue the Arts & Media school's capstone courses perform and exhibit in.`,
      cost: PERFORMING_ARTS_CENTER_COST,
      duration: PERFORMING_ARTS_CENTER_WEEKS,
      prereqs: [],
      status: 'available',
      effects: {
        servesPopulation: PERFORMING_ARTS_CENTER_SERVES,
        satisfactionAttribute: 'social',
        upkeepPerWeek: servedUpkeep('performingArtsCenter', PERFORMING_ARTS_CENTER_SERVES),
      },
    },
    {
      id: ART_GALLERY_ID,
      kind: 'facility',
      facilityType: 'artGallery',
      name: 'Art Gallery',
      description: `A rotating-exhibit gallery for ${ART_GALLERY_SERVES.toLocaleString()} students.`,
      cost: ART_GALLERY_COST,
      duration: ART_GALLERY_WEEKS,
      prereqs: [],
      status: 'available',
      effects: {
        servesPopulation: ART_GALLERY_SERVES,
        satisfactionAttribute: 'social',
        upkeepPerWeek: servedUpkeep('artGallery', ART_GALLERY_SERVES),
      },
    },

    // Varsity athletics venues — locked from the start, revealed only once
    // a team needing the category is granted (see the block above).
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
        upkeepPerWeek: servedUpkeep('athleticsField', ATHLETICS_FIELD_SERVES),
      },
    },
    {
      id: ATHLETICS_ARENA_ID,
      kind: 'facility',
      facilityType: 'athleticsArena',
      name: 'Arena',
      description: `An indoor competition arena for ${ATHLETICS_ARENA_SERVES.toLocaleString()} students' worth of social capacity, shared by basketball and volleyball.`,
      cost: ATHLETICS_ARENA_COST,
      duration: ATHLETICS_ARENA_WEEKS,
      prereqs: [],
      athleticsVenueReveal: true,
      status: 'locked',
      effects: {
        servesPopulation: ATHLETICS_ARENA_SERVES,
        satisfactionAttribute: 'social',
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
        upkeepPerWeek: servedUpkeep('athleticsDiamond', ATHLETICS_DIAMOND_SERVES),
      },
    },
    {
      id: ATHLETICS_NATATORIUM_ID,
      kind: 'facility',
      facilityType: 'athleticsNatatorium',
      name: 'Natatorium',
      description: `A competition pool for ${ATHLETICS_NATATORIUM_SERVES.toLocaleString()} students' worth of social capacity — distinct from the rec Swimming Pool, and where the swim & dive team actually competes.`,
      cost: ATHLETICS_NATATORIUM_COST,
      duration: ATHLETICS_NATATORIUM_WEEKS,
      prereqs: [],
      athleticsVenueReveal: true,
      status: 'locked',
      effects: {
        servesPopulation: ATHLETICS_NATATORIUM_SERVES,
        satisfactionAttribute: 'social',
        upkeepPerWeek: servedUpkeep('athleticsNatatorium', ATHLETICS_NATATORIUM_SERVES),
      },
    },
    {
      id: FOOTBALL_STADIUM_ID,
      kind: 'facility',
      facilityType: 'footballStadium',
      name: 'Football Stadium',
      description: `The pinnacle varsity venue: a full football stadium seating for ${FOOTBALL_STADIUM_SERVES.toLocaleString()} students' worth of social capacity, and the largest building on campus. Revealed only once the football program itself goes varsity.`,
      cost: FOOTBALL_STADIUM_COST,
      duration: FOOTBALL_STADIUM_WEEKS,
      prereqs: [],
      athleticsVenueReveal: true,
      status: 'locked',
      effects: {
        servesPopulation: FOOTBALL_STADIUM_SERVES,
        satisfactionAttribute: 'social',
        upkeepPerWeek: servedUpkeep('footballStadium', FOOTBALL_STADIUM_SERVES),
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
