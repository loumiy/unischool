import type { Buildable, FacilityType, SatisfactionAttributes } from '../state/types';
import { FOUNDING_BODY } from './schoolTypeData';

// ---------------------------------------------------------------------
// Campus-life facilities: the six non-housing, non-lab needs a campus has
// (see README's "central abstraction" — these are all just `facility`-kind
// Buildables, same develop/build machinery as everything else; do not fork
// a subsystem). Each instance "serves" a fixed number of students against
// total ENROLLED students — a big commuter school with few dorms is still a
// big school that needs feeding, studying space, and so on; only Housing
// itself (satisfactionSystem.ts) is scored against bed capacity, since
// that ratio is the whole point of that one attribute.
// satisfactionSystem.ts sums servesPopulation across every 'done' facility
// of a given satisfactionAttribute and compares it to enrolled to score
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
// they are deliberately priced as a COST THAT ARRIVES FIRST: GROWING
// ENROLLMENT dilutes every ratio attribute the week the admissions funnel
// commits it, so the dining hall that fixes it has to be bought (and its
// upkeep carried) before the tuition that class pays has landed. Dorms no
// longer play this role at all — they dilute only their own Housing
// attribute, never basicNeeds/academic/social/health, since enrollment and
// bed count are independent (see admissionsSystem.ts). Build costs are
// sized against the dorm chain purely as a scale reference — roughly a
// third to a half of the dorm whose bed count is in the same ballpark —
// and per-served upkeep is sized so a fully served campus spends a real,
// visible slice of tuition on keeping the lights on.
// ---------------------------------------------------------------------
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

// Exported so engine/reducer.ts's RENOVATE_LIBRARY case can recompute
// tier 1's upkeep off its new, post-renovation servesPopulation with the
// exact same per-seat rate this file uses everywhere else, rather than a
// second copy of it living in the reducer.
export function servedUpkeep(facilityType: keyof typeof UPKEEP_PER_SERVED_PER_WEEK, servesPopulation: number): number {
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
// ~8,900 served) — every dining hall was cheap and small, but there were
// too few of them to ever exist to close that gap. This chain is short (5
// instances) and each one dramatically bigger, so five real decisions serve
// ~21,700 — a scale sized against the dorm chain as it stood at the time
// (see campusData.ts's own tuning comment for its current, larger total;
// dining scores against ENROLLED, not bed capacity, so it doesn't need to
// track the dorm chain exactly) instead of thirteen small ones that ran out
// partway through it.
//
// Size is what the campus map draws, too (see campusMap.ts's footprintOf):
// a hall at or above DINING_MAJOR_FOOTPRINT_SERVES_THRESHOLD is a real "major
// dining hall" and gets a footprint on the order of a student center; a
// smaller one reads as a compact campus restaurant and stays small. Only
// the founding hall is small enough to be a restaurant here — everything
// the school adds afterward is sized to matter.
const DINING_STARTING_ID = 'DINING-01';
const DINING_STARTING_SERVES = FOUNDING_BODY; // one founding hall feeds exactly the founding (all-commuter) class
// A cheap, quick starter, sized so a new school can feed its founding class
// without the build swallowing the whole opening budget. Cheaper per seat
// than the escalating chain below.
const DINING_STARTING_COST = 250_000;
const DINING_STARTING_WEEKS = 12;
// Raised from 4 to 5 (see the max-buildout note above SAVE_VERSION-scale
// tuning in satisfactionSystem.ts's TARGET_RATIO): even the rebalanced
// 5-instance chain this comment used to describe (~21,700 served) fell well
// short of feeding a fully built-out, large-enrollment campus at
// basicNeeds' strict 1:1 ratio. A sixth instance plus the new grocery store
// below (GROCERY_SERVES) together close that gap.
const DINING_ADDITIONAL_COUNT = 5;
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
  'Founders Commons', 'Lakeside Dining Commons',
];

function repeatableChain(opts: {
  facilityType: 'diningHall';
  startingId: string;
  startingName: string;
  startingServes: number;
  startingCost: number;
  startingWeeks: number;
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
      description: `The university's first dining hall — build it to feed the founding class. Serves ${opts.startingServes.toLocaleString()} students.`,
      cost: opts.startingCost,
      duration: opts.startingWeeks,
      prereqs: [],
      // Available (not 'done') from day one: the campus opens empty, so the
      // player builds the founding dining hall like any other facility (see
      // campusData.ts's founding dorm for the same treatment). Its
      // servesPopulation/upkeepPerWeek are LIVE-READ every tick straight off
      // whatever's currently 'done' (see BuildableEffects in state/types.ts),
      // so they only count once this is actually built — no fold-in, nothing
      // to double-count.
      status: 'available',
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
      // All locked; each unlocks the tick its prereq finishes — including the
      // first, now that the founding hall is itself built rather than seeded
      // 'done' (see the starting instance above).
      status: 'locked',
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

// --- Campus grocery store: single building, basicNeeds, population-gated ---
// A SECOND basicNeeds feeder alongside the dining chain, not another link in
// it: real campuses have several dining halls but typically one grocery, so
// this is shaped like the health center (one building, unlocked past a
// population threshold) rather than repeatable. Exists purely to close the
// max-buildout gap the dining chain alone couldn't (see the note above
// DINING_ADDITIONAL_COUNT) — a big, single, late-game capacity top-up, not
// an early strategic choice. Cheaper per seat than a full dining hall
// (~1,500/seat): a grocery needs shelving and registers, not a kitchen and
// a dining room, so its labor/equipment cost per student served is lower —
// see GROCERY's own rate in UPKEEP_PER_SERVED_PER_WEEK.
export const GROCERY_POPULATION_GATE = 8_000;
const GROCERY_ID = 'GROCERY-01';
const GROCERY_SERVES = 17_500;
const GROCERY_COST = 15_750_000; // 900/seat
const GROCERY_WEEKS = 20;

// --- Library: single building, academic ---
// Tier 2 (the research library) is a real prestige gate, not just a bigger
// tier 1 — see prestigeSystem.ts's library-adequacy cap for why staying
// under-seated caps how far curriculum breadth alone can push prestige. It
// is deliberately narrow rather than a general-capacity fix: a research
// collection reads as adjacent to the labs it multiplies output for (see
// LIBRARY_TIER2_RESEARCH_RATE_BONUS below), not as "the library gets
// bigger" — that's what renovating tier 1 (below) is for. It stays its own
// separate building, with its own footprint, unlike tier 1's renovations.
export const LIBRARY_TIER1_ID = 'LIB-T1';
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

// Renovations — added floors on the SAME tier-1 building, the fix for the
// real gap tier 1+2 always had: a hall built to serve a 350-student
// founding class and a once-only research wing don't add up to anything
// close to what a 50,000-student campus needs, and a THIRD SEPARATE
// building (a law library, a science library...) would only repeat the
// same mistake at a narrower scope — a specialized branch collection is
// exactly that, specialized, never the answer to "the general collection
// ran out of room, and there's nowhere left to put a new building for it."
//
// Unlike every other tiered facility in this file, this is NOT a second
// Buildable the player places on the map: engine/reducer.ts's
// RENOVATE_LIBRARY case puts the EXISTING tier-1 Buildable back into
// 'developing' status at its already-placed spot (no new footprint, no
// second entry in s.placements) and, on completion, raises that same
// node's own effects.servesPopulation/upkeepPerWeek in place — see
// nextLibraryFloor below for the plan a renovation commits to, and its
// floorsAdded read for why this needs no "which floor is this" state of
// its own. While renovating, the whole building reads as under
// construction and — like anything 'developing' — contributes nothing
// (see servedPopulationFor's `status === 'done'` filter): the old seats go
// away for those weeks along with the new ones not existing yet.
//
// Combined with tier 2's 3,500 (against satisfactionSystem.ts's
// TARGET_RATIO.academic and prestigeSystem.ts's own LIBRARY_TARGET_RATIO,
// both 0.15), a maxed-out tier 1 (1,200 base + all 3 renovations) plus
// tier 2 serves 12,325 — fully adequate up to ~82,000 enrolled, comfortably
// past the 40k-56k the balance sim's strongest strategies reach by year 40
// (see campusData.ts's own dorm-chain tuning comment for the matching fix
// on the housing side). A renovation now DOES show on the campus map: the
// map is drawn at an angle, so buildings have a height, and a renovated
// library grows a storey and a rank of windows per floor added — read
// generically off floorsAdded, see buildingMotifs.tsx's addedFloors.
const LIBRARY_FLOOR_MAX = 3;
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

// What the NEXT renovation on this Buildable would commit to, or null once
// LIBRARY_FLOOR_MAX is reached. Reads node.floorsAdded (defaulting to 0 for
// a tier 1 that has never been renovated) rather than taking an index, so
// the reducer and the build-panel tile that offers the button always agree
// on which renovation comes next without either one tracking it
// separately.
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

// --- The recreation/fitness chain: Recreation Center -> Gym -> Pool -> ---
// --- Tennis Courts -> Athletics Complex, strictly sequential ---
// Five distinctly-named, one-off facilities (not N copies of one repeatable
// thing, the way a dorm chain is) chained together the same way the dorm
// and dining chains are: one buildable at a time, in a fixed order, so
// "grow campus recreation" reads as a queue with one visible next step
// rather than five independent choices sitting open at once. Recreation
// Center is the founding rung — buildable from day one, exactly like the
// starting dorm/dining hall's first "additional" link — and everything
// after it unlocks only once the rung before it is done. BuildPopup.tsx's
// TYPE_MATCHERS folds all five into one 'recCenter'-keyed group (repeatable:
// true) so they collapse the same way Housing/Dining do, rather than each
// getting its own single-row group heading.
//
// The order itself (Recreation Center, then Gym, Pool, Tennis Courts, then
// the Athletics Complex capstone) is judgment, not a formula: cost doesn't
// climb monotonically down the chain (tennis is the cheapest of the middle
// three, yet sits third) because these were authored as independent one-off
// amenities before this pass, and re-costing them to fit a growth curve
// would be a balance change nobody asked for — only WHEN each becomes
// buildable changed here, not what it costs or grants. The Athletics
// Complex keeps its own prestige gate (REC_CENTER_TIER2_PRESTIGE_GATE) on
// top of the chain position — both are ADDITIONAL conditions, same as any
// other Buildable's minPrestigeToUnlock (see techSystem.ts's
// meetsUnlockGates), so it needs the whole chain built AND enough prestige,
// whichever clears second.
//
// Recreation Center keeps `social` (an open-use campus-life amenity, in the
// same family as the student center); gym/pool/tennis feed `health` instead
// (fitness is a wellness need on top of the health center itself — see
// satisfactionSystem.ts and the health center block below) now that they
// carry real capacity rather than a token gesture, and Athletics Complex
// (tier 2) stays `social`, the same "big capstone amenity" role tier 1 has.
// Splitting the chain's satisfactionAttribute per-facility rather than
// keeping the whole five-building run on one is deliberate: `health` needs
// its own scaling capacity just as much as `social` does, and this chain
// already has three facilities suited to carrying it.
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
const REC_CENTER_TIER1_ID = 'REC-T1';
const REC_CENTER_TIER1_SERVES = 1_200;
const REC_CENTER_TIER1_COST = 450_000;
const REC_CENTER_TIER1_WEEKS = 12;
const REC_CENTER_TIER1_PRESTIGE = 0.05;
// Serves figures raised well past their old "quick recreational win" scale
// (1,000/700/400) now that they carry real `health` capacity rather than a
// token social gesture — cost keeps the same $/seat rate each already built
// at, so the jump is honestly priced, not a freebie.
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

// Each arts facility's own major's tier-2 course ids (techData.ts builds
// these as nodeId(prefix, num) off NUMS/TIERS; listed here as the literal
// ids they resolve to) — referenced raw rather than imported, since
// techData.ts already imports PERFORMING_ARTS_CENTER_ID and ART_GALLERY_ID
// FROM this file and importing back would make the two data modules
// circular. Music for the Performing Arts Center (the school's performing
// half — concert hall and theater), Studio Art for the Art Gallery (the
// exhibited-visual-work half).
const MUSIC_TIER2_IDS = ['MUSC110', 'MUSC120', 'MUSC130', 'MUSC140'];
const STUDIO_ART_TIER2_IDS = ['SART110', 'SART120', 'SART130', 'SART140'];

// --- Arts facilities: performing arts center (landmark), art gallery ---
// One-off, same shape as the recreation/fitness chain's individual rungs
// (no tier field, no upgrade). Both feed `social` like any other campus-
// life facility, and each ALSO gates its own major's tier-3 (capstone)
// courses — see techData.ts's ARTS_CAPSTONE_GATE, wired the exact same way
// a science major's Lab Buildable gates its own capstone quartet. Graphic
// Design, the school's third major, sits outside both gates: a two-
// building, two-major split already covers the school's performing and
// exhibited halves, and there's no third facility for a third major to
// specialize into, so its tier-3 courses take the plain t2Ids prereq every
// non-gated major gets.
//
// Both are HIDDEN at founding and gate on their OWN major's tier-2 quartet
// rather than starting with empty prereqs like every other one-off
// facility here — "a certain amount of arts major completion", per the
// design ask. This can NEVER be circular with each facility's OWN capstone
// gate above: the unlock gate sits on tier-2 courses, one tier before the
// tier-3 courses the facility itself gates, so the facility always clears
// before anything that needs it.
// Exported because techData.ts's course-prereq wiring needs the ids.
export const PERFORMING_ARTS_CENTER_ID = 'ARTS-PAC';
const PERFORMING_ARTS_CENTER_SERVES = 1_500;
const PERFORMING_ARTS_CENTER_COST = 1_100_000;
const PERFORMING_ARTS_CENTER_WEEKS = 20;
export const ART_GALLERY_ID = 'ART-GALLERY';
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
// The line is exactly the design fork documented above REC_CENTER_TIER1_ID:
// ATHLETICS is the five varsity COMPETITION venues — the ones
// data/studentLifeData.ts's SPORTS maps a team's `venueCategory` to, real
// facilities gated behind a team actually going varsity. RECREATION is the
// open-use amenities no team is ever tied to (the fitness chain and the two
// arts facilities alike). A rec facility never becomes "athletics" just
// because a club happens to practice on it informally, and a varsity venue
// never becomes "recreation" just because it also has open hours — see the
// note above REC_CENTER_TIER1_ID for why that coupling was rejected
// outright. Every other FacilityType (library, dorm-adjacent facilities,
// etc.) is absent here on purpose: it already has its own natural grouping
// and doesn't need a second one.
export type FacilityCategory = 'athletics' | 'recreation';

export const FACILITY_CATEGORY_OF: Partial<Record<FacilityType, FacilityCategory>> = {
  recCenter: 'recreation',
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
// HEALTH_CENTER_TIER1_POPULATION_GATE ENROLLED students (not beds — a big
// commuter school with few dorms is still a big school), a school is small
// enough that not having one yet doesn't cost anything — see
// satisfactionSystem.ts's dormancy rule. Cross it and neglecting health
// becomes a real, scoring need like any other.
export const HEALTH_CENTER_TIER1_POPULATION_GATE = 1_500;
const HEALTH_CENTER_TIER1_ID = 'HLTH-T1';
const HEALTH_CENTER_TIER1_SERVES = 2_000;
const HEALTH_CENTER_TIER1_COST = 560_000;
const HEALTH_CENTER_TIER1_WEEKS = 14;
export const HEALTH_CENTER_TIER2_POPULATION_GATE = 6_000;
const HEALTH_CENTER_TIER2_ID = 'HLTH-T2';
const HEALTH_CENTER_TIER2_SERVES = 6_000;
const HEALTH_CENTER_TIER2_COST = 2_100_000;
const HEALTH_CENTER_TIER2_WEEKS = 26;
// A third tier, past a genuinely large-campus population gate: two tiers
// (8,000 served total) plus gym/pool/tennis's own health capacity (see the
// rec/fitness chain above) still fell well short of feeding `health`'s
// strict 1:1 ratio at a fully built-out, large-enrollment campus — the same
// max-buildout shortfall the extra dining hall/grocery store above address
// for basicNeeds. Continues the cost-per-seat climb tier 1 -> tier 2
// already set (280/seat -> 350/seat) rather than a discount at scale.
export const HEALTH_CENTER_TIER3_POPULATION_GATE = 20_000;
const HEALTH_CENTER_TIER3_ID = 'HLTH-T3';
const HEALTH_CENTER_TIER3_SERVES = 42_000;
const HEALTH_CENTER_TIER3_COST = 19_000_000;
const HEALTH_CENTER_TIER3_WEEKS = 40;

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
      startingCost: DINING_STARTING_COST,
      startingWeeks: DINING_STARTING_WEEKS,
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

    // Campus grocery store — see the block above DINING_ADDITIONAL_COUNT.
    {
      id: GROCERY_ID,
      kind: 'facility',
      facilityType: 'grocery',
      name: 'Campus Grocery Store',
      description: `A full grocery store for ${GROCERY_SERVES.toLocaleString()} students — a second basic-needs option alongside the dining halls. Only needed once the campus crosses ${GROCERY_POPULATION_GATE.toLocaleString()} students enrolled.`,
      cost: GROCERY_COST,
      duration: GROCERY_WEEKS,
      prereqs: [],
      minCapacityToUnlock: GROCERY_POPULATION_GATE,
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

    // The recreation/fitness chain — see the long note above
    // REC_CENTER_TIER1_ID for the sequencing and why it's authored this way.
    // No `tier` field on any of the five: unlike library/studentCenter (a
    // single building upgraded in place), this is five DIFFERENT named
    // facilities at fixed chain positions, the same shape as a dorm or
    // dining hall's own numbered rungs — BuildPopup.tsx's rowMarker gives
    // each a plain #N chip off that position instead.
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
      prereqs: [REC_CENTER_TIER1_ID],
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
      description: `An indoor pool for ${POOL_SERVES.toLocaleString()} students.`,
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
      minPrestigeToUnlock: REC_CENTER_TIER2_PRESTIGE_GATE,
      status: 'locked',
      effects: {
        servesPopulation: REC_CENTER_TIER2_SERVES,
        satisfactionAttribute: 'social',
        prestigeContribution: REC_CENTER_TIER2_PRESTIGE,
        upkeepPerWeek: servedUpkeep('recCenter', REC_CENTER_TIER2_SERVES),
      },
    },

    // Arts facilities: performing arts center (landmark) and gallery — each
    // hidden until its own major's tier-2 quartet is done (see the long note
    // above PERFORMING_ARTS_CENTER_ID). Independent of each other — nothing
    // orders the gallery against the performing arts center, only each
    // against its own major's coursework.
    {
      id: PERFORMING_ARTS_CENTER_ID,
      kind: 'facility',
      facilityType: 'performingArtsCenter',
      name: 'Performing Arts Center',
      description: `A campus landmark: a concert hall and theater seating ${PERFORMING_ARTS_CENTER_SERVES.toLocaleString()} students, and the venue Music's capstone courses perform in.`,
      cost: PERFORMING_ARTS_CENTER_COST,
      duration: PERFORMING_ARTS_CENTER_WEEKS,
      prereqs: [...MUSIC_TIER2_IDS],
      status: 'locked',
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
      description: `Care for ${HEALTH_CENTER_TIER1_SERVES.toLocaleString()} students. Only needed once the campus crosses ${HEALTH_CENTER_TIER1_POPULATION_GATE.toLocaleString()} students enrolled.`,
      cost: HEALTH_CENTER_TIER1_COST,
      duration: HEALTH_CENTER_TIER1_WEEKS,
      prereqs: [],
      minCapacityToUnlock: HEALTH_CENTER_TIER1_POPULATION_GATE,
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
      description: `Adds ${HEALTH_CENTER_TIER2_SERVES.toLocaleString()} more capacity for a campus past ${HEALTH_CENTER_TIER2_POPULATION_GATE.toLocaleString()} students enrolled.`,
      cost: HEALTH_CENTER_TIER2_COST,
      duration: HEALTH_CENTER_TIER2_WEEKS,
      prereqs: [HEALTH_CENTER_TIER1_ID],
      minCapacityToUnlock: HEALTH_CENTER_TIER2_POPULATION_GATE,
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
      name: 'University Health Center',
      description: `Adds ${HEALTH_CENTER_TIER3_SERVES.toLocaleString()} more capacity for a campus past ${HEALTH_CENTER_TIER3_POPULATION_GATE.toLocaleString()} students enrolled.`,
      cost: HEALTH_CENTER_TIER3_COST,
      duration: HEALTH_CENTER_TIER3_WEEKS,
      prereqs: [HEALTH_CENTER_TIER2_ID],
      minCapacityToUnlock: HEALTH_CENTER_TIER3_POPULATION_GATE,
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
  ];
}
