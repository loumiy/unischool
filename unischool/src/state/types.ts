// Central type definitions. Every system reads and writes this shared state.
// Keep this file authoritative: if a concept exists in the game, its shape lives here.

export interface GameClock {
  year: number;      // in-game year, starts at 1
  week: number;      // 1..WEEKS_PER_YEAR
}

export interface Finance {
  cash: number;          // liquid funds
  endowment: number;     // long-term reserve; earns a return and pays a fixed share of itself into income every year (see financeSystem.ts)
  endowmentCampaigns: number; // how many endowment campaigns have been run — each one costs more than the last (see financeSystem.ts's endowmentCampaign)
  tuitionPerStudent: number;
  tuitionCeiling: number;        // hard cap on tuitionPerStudent, set by school type at founding
  baselineFundingPerWeek: number; // FLAT non-tuition income (a public school's institutional appropriation), set by school type
  appropriationPerStudentPerYear: number; // per-enrolled-student non-tuition income, set by school type; 0 for private. Kept as a number on state rather than a schoolType branch in financeSystem.ts, so no system ever has to know which fork the player picked.
  weeklyOpEx: number;    // salaries + upkeep + instruction, recomputed each tick
}

// The named needs satisfaction is broken into (see satisfactionSystem.ts).
// Each is 0..100 and is written to by a specific cluster of campus
// facilities/needs, never by an ad hoc catch-all formula — so the UI can
// show the player exactly what's dragging the single displayed number down
// and which building fixes it.
export interface SatisfactionAttributes {
  academic: number;       // library seats-to-capacity ratio
  social: number;         // student center + rec center (ratio) + quad (flat)
  basicNeeds: number;     // dining hall seats-to-capacity ratio — the sharpest penalty curve of the five
  health: number;         // health/counseling center — dormant (scores full) below the population threshold it unlocks at
  infrastructure: number; // parking/infrastructure ratio
}

// Students are modeled as aggregate cohorts, not individuals.
export interface StudentBody {
  enrolled: number;
  capacity: number;      // driven by unlocked buildings/tech
  satisfaction: number;  // 0..100, affects retention & reputation — the weighted sum of satisfactionBreakdown, drifted toward smoothly (see satisfactionSystem.ts)
  satisfactionBreakdown: SatisfactionAttributes; // this week's per-attribute scores that satisfaction's target is computed from — the expandable UI reads this directly
  applicantPool: number; // most recent admissions cycle's total applicants (set by the annual funnel)
  admitRate: number;     // most recent admissions cycle's admit rate — the emergent selectivity signal prestige reacts to (see prestigeSystem.ts)
  incomingQuality: number; // most recent admissions cycle's average quality score (0..100) of the enrolled class — prestige's other admissions-derived input
}

// Faculty ARE individuals with attributes. teaching/research/salary are
// CURRENT values, derived each tick from tenureWeeks and the two potential
// ceilings below — see facultyData.ts's growth-curve formulas and
// facultySystem.ts's weekly tick that applies them. A hire is an
// appreciating asset: retained faculty grow stronger (and pricier) toward
// their potential over years of tenure, then plateau.
export interface Faculty {
  id: string;
  name: string;
  field: string;
  teaching: number;   // 0..100, current — grows toward teachingPotential with tenure
  research: number;   // 0..100, current — grows toward researchPotential with tenure
  teachingPotential: number; // 0..100, ceiling teaching grows toward; rolled once, fixed for this hire's life
  researchPotential: number; // 0..100, ceiling research grows toward; rolled once, fixed for this hire's life
  tenureWeeks: number; // weeks since hire; 0 for an unhired candidate, increments weekly once on the roster
  weeksListed: number; // the mirror image of tenureWeeks: weeks this person has been sitting in the hiring market, 0 once appointed. Only the candidate pool reads it — facultySystem.ts's tickCandidatePool withdraws a listing at CANDIDATE_LISTING_WEEKS — exactly as only the roster reads tenureWeeks.
  salary: number;      // current annual salary — recomputed from current stats + a separate seniority premium curve
  morale: number;     // 0..100
  courseSlots: number; // how many courses in `field` this hire can keep staffed at once — rolled at hire, grows slowly with tenure (see facultyData.ts's grownSlots). A course whose requiresFaculty is `field` occupies one slot in that field for as long as it stays 'developing' or 'done' (see techSystem.ts's canStartDevelopment) — offering more courses in a subject means hiring more (or more tenured) faculty in it.
  // Flavor/biographical fields — rolled once at generation, never mutated.
  // Nationality is disproportionately American regardless of name origin
  // (reflecting how diverse American faculty rosters actually are), with the
  // remainder tied to the same cultural pool the name itself was drawn from
  // (see facultyData.ts's NAME_POOLS/rollNationality) — never assigned
  // independently of the name.
  nationality: string; // e.g. "United States", "China" — full country name, shown expanded in the UI
  flag: string;        // the nationality's flag emoji — authored data, currently unrendered (the glyphs failed to display in some browsers; see FacultyTab.tsx)
  bio: string;         // one-line biographical flavor text, shown only when the roster row is expanded
}

export type BuildableStatus = 'locked' | 'available' | 'developing' | 'done';

// courses, academic buildings, dorms, and campus-life facilities (and later
// sports) are all the same kind of thing: a Buildable. They differ only in
// their data, not their machinery — see README's "The central abstraction".
export type BuildableKind = 'course' | 'building' | 'dorm' | 'facility';

// The specific campus-life need a `facility`-kind Buildable serves — see
// facilitiesData.ts. Distinguishes facilities within the shared `facility`
// kind the same way a course's major prefix distinguishes it within
// `course`; the engine itself never branches on this, only the data-driven
// systems that read effects (satisfactionSystem.ts, prestigeSystem.ts) and
// the Campus tab's grouping/display do.
export type FacilityType =
  | 'library' | 'studentCenter' | 'diningHall' | 'recCenter'
  | 'healthCenter' | 'parking' | 'quad' | 'lab';

export interface Buildable {
  id: string;
  kind: BuildableKind;
  facilityType?: FacilityType; // set only for kind 'facility'
  tier?: number;            // 1, 2, 3... for a single-instance-with-upgrades facility (library, student center, rec center, health center, quad); undefined for repeatable-chain kinds (course, dorm, dining hall, parking) where each id is its own rung
  name: string;
  description: string;
  cost: number;            // money spent up front, at the moment development starts
  duration: number;        // weeks of development
  prereqs: string[];       // other Buildable ids that must be 'done'; may cross kinds and majors
  requiresFaculty?: string; // a Faculty `field` that must have a free course slot (see canStartDevelopment) to start
  // Dynamic availability gates, re-checked every tick (unlike prereqs, which
  // only re-resolve when something finishes) because the population/prestige
  // they read can also fall back below the threshold — see techSystem.ts's
  // unlockAvailable. Both are ADDITIONAL to prereqs, not a replacement.
  minCapacityToUnlock?: number; // e.g. the health center: large campuses only, see campusData/facilitiesData
  minPrestigeToUnlock?: number; // e.g. a research library / athletics complex tier
  status: BuildableStatus;
  effects?: Partial<BuildableEffects>; // read by the systems below; see each field's own comment for exactly when
}

// Effects a Buildable can grant when finished. Deliberately no reputation
// bonus here — prestige is a slow-moving stock computed and drifted toward
// separately (see prestigeSystem.ts), never a sum of completion bonuses.
//
// The first block below is applied ONCE, at the moment a Buildable finishes
// (techSystem.ts's applyEffects mutates state directly). The second block is
// never mutated into state — it's read LIVE, every tick, off every currently
// 'done' Buildable by the system that cares (satisfactionSystem.ts sums
// servesPopulation/satisfactionAttribute/flatSatisfactionBonus;
// prestigeSystem.ts sums prestigeContribution;
// financeSystem.ts sums upkeepPerWeek) — so a facility's contribution stays
// current even though nothing "happens" on the weeks after it finishes.
export interface BuildableEffects {
  capacityBonus: number;
  tuitionBonus: number;
  researchRateBonus: number;
  applicantPoolBonus: number; // one-time bump to the applicant pool (see README's milestone chain)
  unlockIds: string[];  // force these Buildable ids to 'available', regardless of their own prereqs

  // --- live-read, every tick, never mutated into state (see above) ---
  servesPopulation: number;    // how many students' worth of this need one instance covers, compared against s.students.capacity (needs scale with planned campus size, not today's enrollment)
  satisfactionAttribute: keyof SatisfactionAttributes; // which breakdown attribute servesPopulation/flatSatisfactionBonus feeds
  flatSatisfactionBonus: number; // added directly to the attribute score, NOT ratio/population-scaled (the quad: cheap, and its contribution doesn't shrink as the campus grows)
  prestigeContribution: number; // 0..1 share fed into prestige's campus-life input (see prestigeSystem.ts) — the rec center's "small prestige contribution"
  upkeepPerWeek: number; // recurring operating cost, summed into weeklyOpEx alongside salaries/dorm-seat upkeep (see financeSystem.ts)
}

// ---------------------------------------------------------------------
// The campus map (see README's "Courses and buildings share one screen":
// the map is its own layer reading the same state, with building/dorm/
// facility Buildables gaining placement). Placement is a
// PURELY VISUAL layer for now: where a finished building physically sits
// on campus. It grants nothing and gates nothing — a building's effects
// are applied when it finishes, never when (or whether) it is placed.
//
// Deliberately NOT a field on Buildable: keeping coordinates in a separate
// `placements` record on GameState leaves the single Buildable model
// unforked, so `course` Buildables — which are never placeable — carry no
// vestigial map fields (see README's "The central abstraction").
// ---------------------------------------------------------------------

// The campus is a fixed grid of tiles. It started deliberately small (8x6)
// while the map was one panel among many; now that the map IS the central
// interface it holds far more screen than 48 large tiles need, so the grid
// is wide and fine-grained instead: a campus of many small plots rather
// than a handful of oversized ones. Grow these two numbers to grow the
// campus.
//
// Sized against what can actually be built: the full catalogue is 67
// placeable Buildables (7 school buildings, 15 dorms, 45 facilities) whose
// footprints (see campusMap.ts's footprintOf) total 128 tiles, so a fully
// built-out campus covers a bit under 40% of the grid — open ground
// between buildings, room to arrange, and headroom for the content still
// on the roadmap (sports facilities), without the map reading as empty.
//
// The proportions are chosen for the space the map column actually gets
// (a wide, short box beside the build rail), so the grid fills its canvas
// instead of letterboxing into the middle of it.
export const CAMPUS_GRID_WIDTH = 28;  // tiles across (columns)
export const CAMPUS_GRID_HEIGHT = 12; // tiles down (rows)

// Which Buildable kinds can be sited on the map at all. `course` is
// absent on purpose and must stay absent — a course is not a place.
export const PLACEABLE_KINDS: readonly BuildableKind[] = ['building', 'dorm', 'facility'];

// One tile on the campus grid. row is 0..CAMPUS_GRID_HEIGHT-1, col is
// 0..CAMPUS_GRID_WIDTH-1.
export interface TileCoord {
  row: number;
  col: number;
}

// How many tiles a Buildable covers, in grid units. Buildings are not all
// the same size on a real campus — a school hall is not a parking lot —
// so a placement occupies a rectangle rather than a single tile. Which
// rectangle a given Buildable gets is a placement RULE, not a field on
// Buildable: it lives in campusMap.ts's footprintOf, keyed on kind (and
// facilityType), so the single Buildable model stays unforked.
export interface Footprint {
  w: number; // tiles across (columns), >= 1
  h: number; // tiles down (rows), >= 1
}

// Where one placed Buildable sits: its top-left ANCHOR tile plus the
// footprint it covers from there. It occupies rows row..row+h-1 and
// columns col..col+w-1, and every one of those tiles must be in bounds and
// otherwise empty (see campusMap.ts's canPlace).
//
// The footprint is STORED rather than re-derived from the Buildable on
// every read, so a save's layout can never silently reshape (and start
// overlapping) if the footprint table is retuned later. That is also what
// the SAVE_VERSION 3 -> 4 migration writes: a placement saved before
// footprints existed covered exactly one tile, so it loads as 1x1 (see
// persistence.ts).
export interface Placement extends TileCoord, Footprint {}

// Placed Buildable id -> the tiles it occupies. Absent id = not placed yet.
// Plain JSON (no Map/Set, no object references into `tech`) so it stays
// serializable and light for save/load — the same shape rationale as
// `developing` and `events`.
export type Placements = Record<string, Placement>;

// The generic pause-the-clock decision-event mechanism (see README's
// "Interrupts: the decision-event system"). Any system enqueues one by
// setting `pendingInterrupt` directly on state (the same way tickFinance
// sets gameOver); while it is set, the game loop halts ticking. The `type`
// tag identifies which interrupt this is — admissions, the U.S. News
// report, the tutorial, etc. — and `payload` carries whatever data that
// interrupt needs. The UI switches on `type` to render the right modal and
// dispatches an action that clears `pendingInterrupt` to let the clock
// resume. Nothing besides the mechanism itself lives here: no admissions,
// report, or tutorial content.
export interface PendingInterrupt {
  type: string;
  payload?: unknown;
}

// Cadence bookkeeping for the two interrupt kinds that are neither annual
// nor player-triggered: the milestone celebration (a stop-the-clock moment
// for a genuinely special accomplishment) and the authored decision events
// that give the quiet weeks between milestones their texture. See
// data/eventData.ts for the content and tuning constants, and
// systems/events/eventSystem.ts for the one tick function that fires both.
//
// Plain JSON — numbers, a string array and a string -> number record — the
// same shape rationale as `developing` and `placements`.
export interface EventState {
  // Milestone keys (the same keys techSystem.ts writes into s.milestones)
  // that have been awarded but not yet celebrated. A QUEUE rather than a
  // fire-it-immediately call, because the week a milestone lands may
  // already belong to the summer admissions decision or the U.S. News
  // report, and only one interrupt can be pending at a time. Draining the
  // queue on a later quiet week means a celebration is delayed, never
  // lost, and neither annual interrupt has to be special-cased anywhere.
  pendingMilestones: string[];
  lastMilestoneWeek: number;   // absolute week the last celebration fired; 0 = never
  lastDecisionWeek: number;    // absolute week the last authored decision event fired; 0 = never
  // Decision event id -> how many times it has fired and the absolute
  // week it last did. Both are needed: the count enforces a per-event
  // fire cap, the week enforces the per-event repeat cooldown.
  decisionHistory: Record<string, { fires: number; lastWeek: number }>;
}

// The player's admissions policy, set once a year via the summer interrupt
// (see README's "Admissions: an annual summer decision"). In the funnel
// model there are exactly two player inputs: tuition and average aid.
// Tuition itself lives on Finance (the single source of truth for the
// actual price charged); the only policy that lives here is the aid rate.
// Selectivity and enrollment are NOT inputs — they are emergent outcomes of
// the funnel (see admissionsSystem.ts). financialAidRate + tuition together
// describe the price the student actually faces.
export interface AdmissionsSettings {
  financialAidRate: number; // 0..1, average tuition discount across admits
}

export interface Rival {
  id: string;
  name: string;
  reputation: number;   // the metric the ranking sorts on
  momentum: number;     // hidden trend, makes rivals dynamic over decades
}

// Private/public is the only starting fork (see README's "Startup and
// school type") — everything else about the school emerges from play.
export type SchoolType = 'private' | 'public';

export interface University {
  name: string;
  reputation: number;   // player's own rank metric
  schoolType: SchoolType;
}

// One year's worth of the school's headline numbers, appended once a year
// at the admissions boundary (see reducer.ts's RESOLVE_ADMISSIONS — the
// game's only annual boundary). This is the game's time series: the long
// arc the README is about is otherwise invisible, because every stat on
// screen is a "right now" reading with no memory.
//
// Deliberately NUMBERS ONLY — no functions, no Dates, no references into
// `tech`/`rivals` — so the whole history survives a JSON round trip
// untouched when save/load lands, and so its size stays predictable: one
// small flat record per in-game year (a 50-year run is 50 of these).
// Anything derivable from these fields (catalogue percentage, year-over-
// year deltas) is derived at read time by the views, never stored here.
export interface YearSnapshot {
  year: number;           // the year that just CLOSED; the snapshot is the state the school carries into year + 1
  prestige: number;       // self.reputation after that year's drift
  rank: number;           // 1-indexed national rank at that moment, recorded whether or not the player has unlocked the rankings reveal yet
  enrolled: number;       // the class the admissions funnel just committed
  cash: number;
  coursesDone: number;    // 'done' course Buildables — the catalogue's progress
  majorsComplete: number; // major-complete milestones awarded so far
  satisfaction: number;   // 0..100
}

export interface GameState {
  clock: GameClock;
  finance: Finance;
  students: StudentBody;
  admissions: AdmissionsSettings;
  faculty: Faculty[];
  tech: Buildable[];
  developing: Record<string, number>; // course id -> weeks remaining
  placements: Placements;            // Buildable id -> the campus tiles it covers; visual only (see the campus map block above)
  rivals: Rival[];
  self: University;
  history: YearSnapshot[];       // one entry per completed in-game year, oldest first — the game's only time series (see YearSnapshot above)
  log: LogEntry[];               // recent events, newest first
  gameOver: boolean;
  pendingInterrupt: PendingInterrupt | null; // set => clock halts until resolved
  events: EventState;            // cadence bookkeeping for milestone celebrations and authored decision events (see EventState above)
  candidates: Faculty[];         // the standing academic job market: a long, always-churning list of people available to appoint right now. facultySystem.ts's tickCandidatePool ages every listing, withdraws the ones that have been up too long, and tops the pool back up to CANDIDATE_POOL_TARGET each week — there is no posting, no fee, and no wait (see facultyData.ts's churn block)
  started: boolean;              // false only during the pre-game startup screen (name + school type)
  hasEnteredRankings: boolean;   // true once the one-time "you've entered the top 50" reveal has fired
  milestones: Record<string, boolean>; // milestone key -> awarded, so each curriculum milestone bonus fires once
}

export interface LogEntry {
  year: number;
  week: number;
  message: string;
  kind: 'info' | 'good' | 'bad';
}

export const WEEKS_PER_YEAR = 52; // the one place the game's year length lives — every system (clock, annual interrupts, finance annualization) reads from this
