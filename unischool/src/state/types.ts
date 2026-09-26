import type { FinalReport } from './finalReport';
// Central type definitions. Every system reads and writes this shared state.
// Keep this file authoritative: if a concept exists in the game, its shape lives here.

export interface GameClock {
  year: number;      // in-game year, starts at 1
  week: number;      // 1..WEEKS_PER_YEAR
}

// The distress ladder (systems/finance/distress.ts): Sound, Tight, Deficit,
// Freeze, Austerity, Receivership.
export type DistressRung = 0 | 1 | 2 | 3 | 4 | 5;
export interface Distress {
  rung: DistressRung;
  termsAtRung: number;
  confidence: number;          // the board's, 0–100
  termNet: number;             // this term's operating result so far
  surplusRun: number;          // consecutive surplus terms
  deficitRun: number;          // consecutive deficit terms
  receivershipTermsLeft: number;
  letters: string[];           // board letters not yet read, oldest first
  scars: number[];             // the years receivership began
  // The college's own maintenance and draw, held while the board sets them.
  ownMaintenance?: number;
  ownDrawRate?: number | null;
  closedAt?: number;           // year * 100 + week of the last term closed
  yearWorst?: number;          // the worst rung since the year's history row
}

// One building's loan: what is still owed, the weekly payment that clears
// it, and the weeks left to pay.
export interface Loan {
  buildingId: string;
  balance: number;
  payment: number;
  weeksLeft: number;
}

// A filled seat of the administration (systems/delegation/seats.ts). Held
// for good: the seats are the administrative ratchet.
export interface Seat {
  seatId: string;           // data/seatData.ts
  school: string | null;    // a Dean's school; null for every other seat
  holder: string;           // who holds it
  internal: boolean;        // promoted from the faculty rather than hired in
  policy: string;           // one of the seat's policies
  salary: number;           // annual, at a prestige-50 market
  appointedYear: number;
}

export interface Finance {
  cash: number;          // liquid funds
  endowment: number;     // long-term reserve; pays a fixed share into income yearly (financeSystem.ts)
  endowmentCampaigns: number; // campaigns run; each costs more than the last
  // The listed price quoted to next year's class. Never touches enrolled
  // students; it becomes tuitionByClass.freshman at the next admissions.
  listedTuition: number;
  // Each class's price, locked at admission so a raise never reprices
  // enrolled students. Revenue is a sum of four products, never enrolled x price.
  tuitionByClass: ClassTuition;
  weeklyOpEx: number;    // salaries + upkeep + instruction, recomputed each tick
  // The share of the buildings' upkeep paid, 0 to 1 (systems/estate). What
  // goes unpaid becomes backlog. Undefined means all of it.
  maintenanceFunding?: number;
  // The endowment's annual draw, 0.03 to 0.07 (systems/finance/treasury.ts).
  // Undefined means the default 4%.
  drawRate?: number;
  // Buildings' loans, oldest first (systems/finance/treasury.ts). Undefined
  // means none.
  loans?: Loan[];
  // The distress ladder. Undefined means Sound, with no history.
  distress?: Distress;
  // The standing sweep into the endowment, in weeks of expenses kept as
  // cash (systems/finance/sweep.ts's SWEEP_STEPS). Undefined: off.
  sweepWeeks?: number;
  // The board's watch on idle cash (sweep.ts): the absolute week cash first
  // sat above a year of expenses, cleared when it drops back, and the year
  // the board last wrote about it.
  idleSince?: number;
  idleLetterYear?: number;
  // Lifetime count of weeks cash closed below zero, counted by tickFinance.
  // Read by the "Never in the red" ambition and the legacy's stewardship axis.
  weeksInTheRed: number;
}

// Satisfaction's named needs (satisfactionSystem.ts), each 0..100 and each
// tied to specific facilities, so the UI can show which building fixes it.
export interface SatisfactionAttributes {
  academic: number;       // library seats-to-enrolled ratio
  social: number;         // student + rec center (ratio), quad and student organizations (flat)
  basicNeeds: number;     // dining hall seats-to-enrolled ratio; the sharpest penalty curve
  health: number;         // health/counseling center; scores full below its population threshold
  // Dorm and housed-chapter beds. Most students commute, so housing a
  // healthy minority scores full (satisfactionSystem.ts's TARGET_RATIO).
  housing: number;
}

// Four aggregate classes (head counts), advanced each summer. "Class" means
// year group only; a kind of applicant is a cohort (cohorts.ts).
export interface ClassCounts {
  freshman: number;
  sophomore: number;
  junior: number;
  senior: number;
}

// ClassCounts' keys in dollars per year: its own type because the units differ.
export interface ClassTuition {
  freshman: number;
  sophomore: number;
  junior: number;
  senior: number;
}

// Kinds of applicant; their behavior lives in cohorts.ts.
export type CohortId =
  | 'highAchievers' | 'preProfessional' | 'researchOriented'
  | 'social' | 'artsFocused' | 'priceSensitive' | 'athletes'
  | 'gradBound';

// Whole students per cohort, for an applicant pool or an enrolled class,
// apportioned by largest remainder so they sum to the total.
export type CohortCounts = Record<CohortId, number>;

// Each class's cohort mix as admitted. Stored because pulls read the
// current campus, so recomputing would rewrite old classes in hindsight.
export interface ClassCohorts {
  freshman: CohortCounts;
  sophomore: CohortCounts;
  junior: CohortCounts;
  senior: CohortCounts;
}

export interface StudentBody {
  // Read the total via totalEnrolled(); it is never stored.
  classes: ClassCounts;
  // Advanced in lockstep with `classes` and finance.tuitionByClass.
  cohortsByClass: ClassCohorts;
  // Beds (dorms plus housed chapters), never an admissions ceiling; that is
  // catalog seats (intakeCeiling).
  capacity: number;
  satisfaction: number;  // 0..100, drifts toward the weighted sum of satisfactionBreakdown
  satisfactionBreakdown: SatisfactionAttributes; // this week's per-attribute scores
  // Trailing-year satisfaction as sum + count (exact and cheap to reset),
  // averaged at the summer boundary into next year's word of mouth.
  satisfactionYearSum: number;
  satisfactionYearWeeks: number;
  priorYearAvgSatisfaction: number; // last completed year's average, read by the funnel
  // Crowding shortfall, accumulated the same way: the report card grades the
  // year's average. Reset with satisfaction at RESOLVE_ADMISSIONS.
  crowdingYearSum: number;
  crowdingYearWeeks: number;
  applicantPool: number; // most recent cycle's total applicants (set by the annual funnel)
  admitRate: number;     // most recent cycle's admit rate; a prestige input
  incomingQuality: number; // most recent entering class's average quality, 0..100; a prestige input
  // Last summer's funnel, so the next reveal can say why the pool moved.
  // Null until the first summer.
  lastFunnel: FunnelRecord | null;
}

// The funnel's six multipliers (projectAdmissions), applicants being their
// product before rounding, so year-over-year ratios attribute the move.
export interface FunnelFactors {
  prestigePool: number;   // the pool prestige alone would draw, in applicants
  priceFactor: number;    // 0..1, the price discount against tolerance
  capacityFactor: number; // the beds floor-to-one scale
  wordOfMouth: number;    // satisfaction's multiplier, 1 at neutral
  cohortDemand: number;   // the blended cohort pull, 1 at neutral
  stickerShock: number;   // 0..1, the band-specific self-selection
  // Campus beauty's swing, 1 at neutral (systems/estate/beauty.ts). Absent
  // on a record from before Plan 26, which read as 1.
  beauty?: number;
  // The identity tags' pull (Plan 31), 1 at none. Absent before it.
  tags?: number;
  // Last year's overcrowding (Plan 71), 1 at none. Absent before it.
  crowding?: number;
}

export interface FunnelRecord {
  year: number;            // the year whose summer drew it
  applicants: number;      // the realized pool
  factors: FunnelFactors;
  cohorts: CohortCounts;   // the pool's split, summing to `applicants`
}

// teaching, research and salary are recomputed each tick from tenure and
// the fixed potentials (facultyData.ts), so hires grow and plateau.
export interface Faculty {
  id: string;
  name: string;
  field: string;
  teaching: number;   // 0..100, current — grows toward teachingPotential with tenure
  research: number;   // 0..100, current — grows toward researchPotential with tenure
  teachingPotential: number; // 0..100, rolled once
  researchPotential: number; // 0..100, rolled once
  tenureWeeks: number; // weeks on the roster; 0 for a candidate
  weeksListed: number; // weeks on the market, 0 once appointed; a listing withdraws at CANDIDATE_LISTING_WEEKS
  salary: number;      // annual; recomputed from current stats plus a seniority premium
  courseSlots: number; // courses in `field` this hire can staff at once; grows with tenure. A 'developing' or 'done' course holds one slot (techSystem.ts's canStartDevelopment)
  // Research prizes won. Its own field because teaching, research and salary
  // are recomputed every tick; facultySalary and facultyResearchOutput read it.
  acclaim: number;
  // Flavor, rolled once. Nationality follows the name's cultural pool
  // (facultyData.ts's rollNationality), weighted toward American.
  nationality: string; // e.g. "United States", "China" — full country name, shown expanded in the UI
  flag: string;        // flag emoji; unrendered (see FacultyTab.tsx)
  bio: string;         // one line, shown when the roster row is expanded
  // A quirk (data/quirkData.ts), picked from the id at generation. Its
  // effects are already in the potentials; the salary factor and morale are
  // read from it. Undefined for most founders and a share of candidates.
  quirk?: string;
  // Rolled before the name and used for both the first name and the
  // portrait (FacultyPortrait.tsx), so they always agree.
  gender: 'male' | 'female';
  // The name's cultural pool (facultyData.ts's NAME_POOLS), distinct from
  // nationality; FacultyPortrait.tsx biases skin tone by it.
  heritage: string;
}

export type BuildableStatus = 'locked' | 'available' | 'developing' | 'done';

// Courses, buildings, dorms and facilities differ only in data
// (docs/architecture/buildables.md). Graduate courses are plain `course`s
// marked by `graduateProgram`.
export type BuildableKind = 'course' | 'building' | 'dorm' | 'facility';

// Which need a `facility` Buildable serves (facilitiesData.ts). The engine
// never branches on it; effect-reading systems and the UI do.
export type FacilityType =
  | 'library' | 'studentCenter' | 'diningHall' | 'recCenter'
  | 'healthCenter' | 'quad' | 'lab'
  // Single-instance basicNeeds feeder beside the repeatable dining chain.
  | 'grocery'
  // One-off: gym/pool/tennis feed `health`, arts venues feed `social`.
  | 'gym' | 'tennisCourts' | 'pool' | 'artGallery'
  // Varsity competition venues, one per sport category, distinct from the
  // rec facilities. Hidden until a team needing one is granted varsity
  // status (Buildable.athleticsVenueReveal).
  | 'athleticsField' | 'athleticsArena' | 'athleticsDiamond' | 'athleticsNatatorium' | 'footballStadium'
  | 'fieldHouse' // a non-competition athletics facility that lifts every program
  // A grand landmark (Plan 25): one of three, a long build and a large payoff.
  | 'landmark'
  // A small landmark or amenity (Plan 26): cheap, beauty-bearing.
  | 'amenity'
  // A capital project (Plan 33, data/projectData.ts).
  | 'project';

export interface Buildable {
  id: string;
  kind: BuildableKind;
  facilityType?: FacilityType; // set only for kind 'facility'
  tier?: number;            // rung of a single-instance-with-upgrades facility; undefined for repeatable chains
  name: string;
  description: string;
  cost: number;            // money spent up front, at the moment development starts
  duration: number;        // weeks of development
  prereqs: string[];       // other Buildable ids that must be 'done'; may cross kinds and majors
  requiresFaculty?: string; // a Faculty `field` that must have a free course slot (see canStartDevelopment) to start
  // The GRADUATE_PROGRAMS id (techData.ts) on every course in that program:
  // both the graduate-course marker and the key for its parent-school gate
  // (techSystem.ts's meetsUnlockGates).
  graduateProgram?: string;
  // Dynamic gates, in addition to prereqs, re-checked every tick because
  // what they read can fall back (techSystem.ts's unlockAvailable).
  // Despite the name, a population gate on total enrolled students.
  // Locked until this many courses are developed, in any program. Only the
  // first purchased academic hall carries it, keeping it out of week one.
  // Athletics venues only: locked until a varsity team in this
  // facilityType's category exists (meetsUnlockGates reads s.orgs.teams).
  athleticsVenueReveal?: true;
  // Revealed once the school fields any varsity team (the field house).
  athleticsDepartmentReveal?: true;
  // Times this venue has been expanded in place (EXPAND_VENUE); read by
  // systems/athletics/gate.ts for seats.
  expansions?: number;
  // A Greek chapter's house, made at runtime ('greek-housing'). No
  // `effects`: its beds and satisfaction come via GreekChapter.housed.
  chapterHouse?: true;
  // Program slots in a hall; the slots themselves are in `s.halls`, and this
  // count lets the loader validate them.
  slots?: number;
  // Locked until this school is founded (the `school-founded:<School>`
  // milestone); set on lab-gated majors' labs. Checked in meetsUnlockGates.
  schoolGate?: string;
  status: BuildableStatus;
  effects?: Partial<BuildableEffects>;
  // Set when naming rights are sold ('naming-rights'), alongside overwriting
  // `name`; its presence tells CurriculumTab.tsx that `name` is donor text.
  donorSurname?: string;
  // In-place renovations (today only the tier-1 library: RENOVATE_LIBRARY).
  // The node itself goes back to 'developing' and grows its
  // servesPopulation; this count prices the next one. Undefined means 0.
  floorsAdded?: number;
  // servesPopulation before the renovation in progress, which stays in use
  // meanwhile. Set by RENOVATE_LIBRARY, cleared on completion.
  renovatingFrom?: number;
  // Unpaid maintenance, compounding (systems/estate/estate.ts); what its
  // condition reads. Undefined means none.
  backlog?: number;
  // How a building under construction was paid for, when not from cash
  // (systems/finance/treasury.ts's Financing), so calling it off returns the
  // money where it came from (state/demolition.ts). Cleared when it
  // is finished or called off.
  financing?: 'loan' | 'gift' | 'endowment';
  // Weeks left on a renovation, which it stays open through. Undefined means
  // none under way.
  renovationWeeks?: number;
  // Weeks left on an added story (systems/estate), built while it stays
  // open; floorsAdded counts the finished ones.
  extensionWeeks?: number;
  // Declared historic (systems/estate): prestige, a dearer upkeep, ivy.
  historic?: true;
  // The year a placeable Buildable was first finished, for the map's age
  // marks (components/ageMarks.tsx). Undefined for courses and for buildings
  // an older save finished.
  builtYear?: number;
  // A capital project (Plan 33, systems/estate/projects.ts): the year it
  // opens from, and the standings it lifts at full condition. One to a
  // campus.
  project?: CapitalProject;
}

export interface CapitalProject {
  fromYear: number;
  late?: true;      // the late tier: opens with the defend era (data/projectData.ts)
  // Waits on a school's whole undergraduate curriculum being taught (Plan
  // 51): a school's name, or ANY_SCHOOL for the first school to finish.
  curriculum?: string;
  // Waits on every standing lab having finished an initiative (Plan 53).
  everyLabFinished?: true;
  boosts: Partial<Record<'academics' | 'research' | 'experience' | 'athletics', number>>;
}

// Finished courses, counted off `tech` so no copy can drift: the one
// count the catalog, the budget, the ladder and the history all read.
export function coursesDone(s: { tech: Buildable[] }): number {
  return s.tech.filter((t) => t.kind === 'course' && t.status === 'done').length;
}

// Standing: finished, or open through in-place work (a library floor, a
// venue expansion), which flips it to 'developing' with renovatingFrom set
// while it stays in use. A first construction does not stand.
export function standsOnCampus(t: Buildable): boolean {
  return t.status === 'done' || (t.status === 'developing' && t.renovatingFrom !== undefined);
}

// What a Buildable serves right now: full when done, nothing before it
// opens, its pre-renovation figure while renovating. Shared by every sum
// and the drawer so they agree.
export function servingPopulation(t: Buildable): number {
  if (t.status === 'done') return t.effects?.servesPopulation ?? 0;
  if (t.status === 'developing' && t.renovatingFrom !== undefined) return t.renovatingFrom;
  return 0;
}

// Effects a finished Buildable grants. No reputation bonus: prestige is
// drifted toward a computed target (prestigeSystem.ts). The first block is
// applied once on completion (techSystem.ts's applyEffects); the second is
// read live every tick off finished Buildables by the system that cares.
export interface BuildableEffects {
  capacityBonus: number;
  tuitionBonus: number;
  // one-time bump to the applicant pool
  applicantPoolBonus: number;
  unlockIds: string[];  // force these Buildable ids to 'available', regardless of their own prereqs

  // --- live-read, every tick, never mutated into state (see above) ---
  researchRateBonus: number; // added to the campus-wide research multiplier; multiplies output, never creates it (researchData.ts)
  servesPopulation: number;    // students' worth of this need covered, against total enrolled
  satisfactionAttribute: keyof SatisfactionAttributes; // which breakdown attribute servesPopulation/flatSatisfactionBonus feeds
  flatSatisfactionBonus: number; // added to the attribute score, not population-scaled (the quad)
  prestigeContribution: number; // 0..1 share of prestige's campus-life input
  upkeepPerWeek: number; // summed into weeklyOpEx (financeSystem.ts)
  beauty: number;        // what a landmark adds to campus beauty (systems/estate/beauty.ts)
}

// The campus map (docs/architecture/campus-map.md). Placement is visual
// only and kept out of Buildable so courses carry no map fields.

// A fixed square grid of tiles. CampusMap.tsx's view and the Founders Hall
// centering are pure functions of these two constants; grow them together
// to keep the campus square. All 60 placeable Buildables' footprints total
// 2,179 tiles, under 14% of the grid.
export const CAMPUS_GRID_WIDTH = 126;  // tiles across (columns)
export const CAMPUS_GRID_HEIGHT = 126; // tiles down (rows)

// `course` must stay absent: a course is not a place.
export const PLACEABLE_KINDS: readonly BuildableKind[] = ['building', 'dorm', 'facility'];

// One tile on the campus grid. row is 0..CAMPUS_GRID_HEIGHT-1, col is
// 0..CAMPUS_GRID_WIDTH-1.
export interface TileCoord {
  row: number;
  col: number;
}

// Tiles a placement covers. Which footprint a Buildable gets is a rule in
// campusMap.ts's footprintOf, not a Buildable field.
export interface Footprint {
  w: number; // tiles across (columns), >= 1
  h: number; // tiles down (rows), >= 1
}

// Top-left anchor tile plus footprint; every covered tile must be in bounds
// and empty (campusMap.ts's canPlace). The footprint is stored so a retune
// can never reshape a saved layout into overlaps.
export interface Placement extends TileCoord, Footprint {}

// Placed Buildable id -> its placement; absent means not placed. GameState
// is JSON round-tripped whole, so no Map/Set anywhere in it.
export type Placements = Record<string, Placement>;

// Decorative walkway tiles keyed by campusMap.ts's pathTileKey(); read by
// no system. A record rather than a Set, for JSON.
export type Pathways = Record<string, true>;

// Trees on the founding land, one per tile, keyed by pathTileKey().
// Building over a tree fells it permanently (PLACE_BUILDABLE); a path over
// it only hides it at render time. The value is a seed from which
// components/trees.tsx derives species, size and offset. Visual only.
export type Trees = Record<string, number>;

// A lamp or a bench, by the tile it stands on.
export type DressingKind = 'lamp' | 'bench';
export type Dressing = Record<string, DressingKind>;

// The player's say in the campus's quads (state/quads.ts detects them).
export interface QuadState {
  // A player's name for a quad, by its anchor tile key.
  names: Record<string, string>;
  // Tile keys the player has marked: the open space under each is a quad
  // even where detection would not make it one.
  designated: string[];
}

export interface Ending {
  report: FinalReport;
  addenda: { from: number; to: number; lines: string[] }[];
}

// Promises (Plan 33). `offer` is this summer's, answered on the Review
// beat: one promise, or at a decade's close a list to take up to two from.
export interface PromiseState {
  active: { id: string; madeYear: number; dueYear: number }[];
  settled: { id: string; year: number; kept: boolean }[];
  declined: { id: string; year: number }[];
  offer: { ids: string[]; decade: boolean } | null;
}

// An event from the catalog waiting for an answer. The price scale and
// the names in its text are fixed when it fires, so what the panel shows is
// what is applied.
export interface PendingCatalogueEvent {
  instanceId: string;
  eventId: string;
  firedWeek: number;              // absolute (eventData.ts's absoluteWeek)
  vars: Record<string, string>;
  scale: number;
}

export interface CatalogueState {
  pending: PendingCatalogueEvent[];
  lastFired: Record<string, number>; // event id -> year
  lastInlineWeek: number;            // absolute
  lastSeismicWeek: number;           // absolute
  // The journal (Plan 33): every letter answered, and each year's inline
  // events by who answered them. Absent before the first.
  letters?: { eventId: string; choiceId: string; year: number }[];
  answered?: { year: number; player: number; seat: number; timeout: number }[];
}

// While `pendingInterrupt` is set the clock halts; the UI renders a modal by
// `type` (docs/architecture/interrupts.md).
export interface PendingInterrupt {
  type: string;
  payload?: unknown;
}

// The summer: one interrupt with three beats (SUMMER_BEATS), so a save
// between beats resumes with the clock halted and nothing slips in between.
// Review is read-and-continue, bar the year's promises (Plan 33, which also
// dropped the Standing beat: V1-1). RESOLVE_SUMMER_BEAT advances `beat`,
// carrying the admissions decision into `decision` so the last beat commits
// exactly what the player set; RESOLVE_ADMISSIONS, the last beat's action,
// is the only one that moves the calendar.
export type SummerBeat = 0 | 1 | 2;
export const SUMMER_BEATS = ['Review', 'Admissions', 'Students'] as const;
export const SUMMER_LAST_BEAT: SummerBeat = 2;

export interface SummerDecision {
  tuition: number;
  admitRate: number;
}

export interface SummerPayload {
  beat: SummerBeat;
  // The fiftieth summer, whose first beat is the final report. Stamped when
  // raised so a mid-summer save and modalLayout.ts can read it.
  final?: boolean;
  tuition: number;    // where the tuition slider opens: last year's listed price
  admitRate: number;  // where the admit slider opens: last year's chosen rate
  // The tuition set blind on the admissions beat, once locked. Kept here so a
  // reload cannot unlock it after the pool has been seen.
  lockedTuition?: number;
  decision?: SummerDecision; // set once the admissions beat has been left; what the last beat commits
}

// A student demand (docs/design/student-life.md, demandSystem.ts): below
// DEMAND_SATISFACTION_THRESHOLD students ask for one buildable thing on a
// deadline; at most one open at a time. Text is looked up from
// data/demandData.ts at render. The target is a reading the game already
// tracks, so a demand is met by building the thing, with no acknowledge.
export interface StudentDemand {
  id: string;
  // Served population, bed capacity, or catalog seats.
  metric: 'served' | 'capacity' | 'seats';
  // The attribute for metric 'served'; null otherwise.
  attribute: keyof SatisfactionAttributes | null;
  // The Buildable that inspired the ask, by name too so the modal stays true
  // if content changes before it resolves.
  askId: string;
  askName: string;
  target: number;       // met the moment the reading reaches this
  raisedWeek: number;   // absolute week the demand was announced; 0 while it is still queued
  deadlineWeek: number; // absolute week it expires unmet; 0 while it is still queued
}

// Cadence bookkeeping for celebrations, decision events and demands.
export interface EventState {
  // Awarded but uncelebrated milestone keys. Queued because only one
  // interrupt can be pending; a celebration is delayed, never lost.
  pendingMilestones: string[];
  lastMilestoneWeek: number;   // absolute week the last celebration fired; 0 = never
  lastDecisionWeek: number;    // absolute week the last authored decision event fired; 0 = never
  // Per event: fire count (for its cap) and last week (for its cooldown).
  decisionHistory: Record<string, { fires: number; lastWeek: number }>;
  // A rolled demand waiting for a free week. Its weeks are stamped when
  // announced, so waiting never shortens the deadline.
  pendingDemand: StudentDemand | null;
  // The outstanding demand, cleared when met (reward) or expired (penalty).
  activeDemand: StudentDemand | null;
  // The active demand's note is still over the map (Plan 29): a demand no
  // longer stops the clock. Undefined once read.
  demandUnread?: true;
  // Absolute week the last demand resolved; 0 = never. Its cooldown.
  lastDemandWeek: number;
  // The first year's letters (eventData.ts's OPENING_LETTERS): `read` is
  // the delivered ids, `skipped` the player's "I know the way". `stage` is
  // the opening walkthrough (state/opening.ts).
  opening: { read: string[]; skipped: boolean; stage: OpeningStage };
  // Rivals whose passing the player has been asked about ('rival-passed'),
  // stamped when the event fires, so each is asked once.
  passedResponses: string[];
  // The year the Deans last brought their restaffing recommendations
  // (eventSystem.ts's fireDeanRecommendations, Plan 59). Absent: never.
  deanYear?: number;
}

// See state/opening.ts, which owns the order and the meaning.
export type OpeningStage = 'welcome' | 'site-hall' | 'teaching' | 'found' | 'play';

export interface Rival {
  id: string;
  name: string;
  // Team name, flavor only (data/rivalData.ts). The player's is
  // University.mascot.
  mascot: string;
  // Dealt off the id (schoolColors.ts's rivalColorsFor); flavor only.
  colors: SchoolColors;
  reputation: number;   // the metric the ranking sorts on
  momentum: number;     // hidden trend, makes rivals dynamic over decades
  // Athletics standings axis, independent of reputation and drifting
  // annually on its own momentum (athleticStrengthFor, athleticRank). It is
  // department-wide; per-sport strength is derived (sportStrengthFor).
  athleticStrength: number;
  athleticMomentum: number;
  // The research and student-life ranking axes (standingsFor,
  // rankedListBy). Named like the player's University fields so one
  // rankedListBy(axis) serves every leaderboard. Seeded off the id and
  // drifted annually, each on its own momentum.
  socialStanding: number;
  researchStanding: number;
  socialMomentum: number;
  researchMomentum: number;
}

// Research (docs/design/research.md): initiatives keyed by facility id,
// plus institution-wide lifetime counters (nothing reads them per school).

// An awarded prize. Names are captured, not looked up, so the report stays
// true if the winner is dismissed before it fires.
export interface PrizeAward {
  facultyId: string;
  facultyName: string;
  field: string;
  prizeName: string;
}

// A concluded project's report, queued by researchSystem.ts and shown as
// the `research-complete` interrupt. Names are captured, since a professor
// or topic can change before it fires.
export interface InitiativeReport {
  topicId: string;
  topicName: string;
  labId: string;
  labName: string;
  depth: InitiativeDepth;
  years: number;              // rounded to one decimal, as the log line reports it
  facultyNames: string[];
  publications: number;
  breakthroughs: number;
  grantIncome: number;
  award: PrizeAward | null;   // the one thing that can only be won at conclusion
}

// Tuned in researchData.ts's INITIATIVE_DEPTHS; lives here because it is
// part of the saved shape and types.ts imports nothing.
export type InitiativeDepth = 'pilot' | 'project' | 'program' | 'landmark';

// A commissioned research run. Participants' course slots go to zero for
// its duration (techSystem.ts's isCommitted).
export interface Initiative {
  labId: string;            // the hosting facility, also its key in `initiatives`
  topicId: string;
  depth: InitiativeDepth;
  participantIds: string[];
  weeksTotal: number;
  weeksRemaining: number;
  // breakthroughs gates the award roll; the rest feed the report.
  publications: number;
  breakthroughs: number;
  grantIncome: number;
  banked: number;           // output toward the next publication (PUBLICATION_POINTS)
}

// The research record of finished projects, capped at
// INITIATIVE_HISTORY_LIMIT.
export interface CompletedInitiative {
  topicId: string;
  depth: InitiativeDepth;
  year: number;
  facultyNames: string[];
  publications: number;
  breakthroughs: number;
  grantIncome: number;
  award: string | null;     // the prize name, when the work took one
  cancelled?: true;         // ended early by the player, forfeiting its funding
}

export const INITIATIVE_HISTORY_LIMIT = 24;

export interface ResearchState {
  // Monotone lifetime counts. Publications, breakthroughs and prizes feed
  // prestigeSystem.ts's researchScore, in rising weight.
  publications: number;
  grants: number;
  grantIncome: number;     // shown in the Treasury as a running total
  // What initiatives have cost up front, lifetime (Plan 70D), against which
  // the grants are read. Optional: a save from before it reads as none.
  funding?: number;
  breakthroughs: number;
  prizes: number;
  // Keyed by hosting facility; a facility is vacant when it has no key.
  initiatives: Record<string, Initiative>;
  completedInitiatives: CompletedInitiative[]; // newest first, capped at INITIATIVE_HISTORY_LIMIT
  // The labs that have seen an initiative through, uncancelled (Plan 53):
  // the Research Park waits on every standing lab being among them.
  // Optional: a save from before it reads as none.
  finishedLabs?: string[];
  lastOutputWeek: number;  // absolute week of the last research output; 0 = never
  pendingCompletions: InitiativeReport[]; // queued like pendingMilestones; drained one per modal (eventSystem.ts)
}

// Student organizations (docs/design/student-life.md): clubs once there is
// a student center, and Greek chapters if the player approved a Hellenic
// Council. The live lists are the source of truth for upkeep and social
// contribution, summed weekly, so disbanding removes both.

// Membership is derived, not stored (studentLifeData.ts's orgMembership).
export interface StudentOrgBase {
  id: string;
  name: string;
  foundedYear: number;
  // Membership is derived from these: founding members and enrollment then.
  foundingMembers: number;
  foundingEnrolled: number;
  // Dollars per week, fixed at approval as a share of a week's opex
  // (ORG_UPKEEP_WEEKS_OF_OPEX); re-deriving from opex would be circular.
  upkeepPerWeek: number;
}

export interface StudentClub extends StudentOrgBase {
  // A SPORTS id for a sport club, null for an interest club. Set at
  // formation; varsity petitions read it.
  sport: string | null;
  // Year the club last declined the varsity petition, or null. It is asked
  // again VARSITY_PETITION_MIN_TENURE_YEARS later. An approval promotes
  // the club to a VarsityTeam and removes it, so this is never set then.
  varsityLastAskedYear: number | null;
}

// A Greek chapter: a scandal can disband exactly one, and the housing
// petition asks each at most once.
export interface GreekChapter extends StudentOrgBase {
  kind: 'fraternity' | 'sorority';
  // The name as Greek letters ('ΑΒΓ'), drawn on the chapter house.
  // Derived from `name` on load for older saves (persistence.ts).
  glyphs: string;
  housed: boolean;       // a dedicated chapter house has been built for them
  housingAsked: boolean; // already petitioned; never asked again
}

// A head coach, assistant or trainer. A separate hiring pool on Faculty's
// mechanism (a rolled ceiling grown toward over tenure, salary from current
// quality), with one `quality` stat.
export interface Coach {
  id: string;
  name: string;
  gender: 'male' | 'female';
  // As Faculty.heritage, for the portrait.
  heritage: string;
  // A coach's SPORTS id, so only this sport's candidates fit its roles; a
  // trainer's is always TRAINER_FIELD, one pool for every team.
  field: string;
  quality: number;          // current, 0..100, grown toward qualityPotential
  qualityPotential: number; // ceiling, rolled once; not what the card prints (see `scouted`)
  // Prospect or veteran: `startQuality` is where growth climbs from,
  // `plateauYears` how long it takes, `scouted` the range the card prints
  // (narrower with a better athletic director). Optional; readers default
  // them to a known-ceiling prospect of 40 (coachProfile).
  age?: number;
  startQuality?: number;
  plateauYears?: number;
  scouted?: [number, number];
  tenureWeeks: number;      // weeks on a roster; 0 for a candidate
  weeksListed: number;      // weeks on the market, as Faculty.weeksListed
  salary: number;           // annual, recomputed from quality + tenure (coachSalaryFor)
}

// A sport club granted varsity status, promoted with the same id
// (promoteToVarsityTeam).
export interface VarsityTeam extends StudentOrgBase {
  sport: string;               // a SPORTS id (see data/studentLifeData.ts)
  // Captured at grant time so a later sport -> venue retune cannot strand it.
  venueCategory: FacilityType;
  // Vacant (null) at promotion and hired from s.orgs.coachCandidates; a
  // vacancy scores at teamQuality's floor.
  headCoach: Coach | null;
  assistantCoach: Coach | null;
  trainer: Coach | null;
  // 'active' at once if a compatible venue already stands, else when the
  // venue it waits on finishes (studentLifeSystem.ts).
  status: 'awaitingVenue' | 'active';
  // Last year barred from the bracket (the recruiting scandal; playoffs.ts).
  // Absent or past means eligible.
  postseasonBanThroughYear?: number;
}

// A formed organization awaiting approval in the summer digest
// (docs/design/student-life.md), carrying everything needed to become live.
export interface OrgPetition {
  id: string;
  kind: 'club' | 'chapter';
  name: string;
  greekKind?: 'fraternity' | 'sorority'; // set only for kind 'chapter'
  // Clubs only: a SPORTS id or null, carried to the StudentClub unchanged.
  sport?: string | null;
  foundedYear: number;
  foundingMembers: number;
  foundingEnrolled: number;
  upkeepPerWeek: number; // sized in weeks of opex the week the petition was raised
}

// The department-wide athletics budget (ATHLETICS_BUDGET_TIERS): scales
// every team's social contribution, the program's upkeep, and teamQuality.
export type AthleticsBudgetTier = 'low' | 'medium' | 'high';

// One sport's postseason for the player. Outside the top eight is
// `finish: 'missed'`, a result rather than an absence.
export interface SeasonResult {
  year: number;
  sport: string;
  seed: number | null;      // the player's seed in the bracket; null = did not qualify
  finish: 'champion' | 'final' | 'semifinal' | 'quarterfinal' | 'missed';
  banned?: boolean;         // 'missed' because of a postseason ban
  beaten: string[];         // schools the player beat, in order, by name and mascot
  lostTo: string | null;
  champion: string;         // who took the title — may be the player
  championMascot: string;
}

// One occasion's result, in a season record (see StudentOrgState.season).
export interface OccasionResult {
  occasion: 'opener' | 'rivalry' | 'homecoming';
  week: number;
  opponent: string;      // name and mascot
  opponentStrength: number;
  won: boolean;
  upset: boolean;        // the weaker side by a wide margin won
}

export interface SeasonRecord {
  year: number;
  wins: number;
  losses: number;
  results: OccasionResult[];
}

// The all-time record against a sport's designated rival.
// `streak` is signed: positive is the player's run of consecutive wins,
// negative the rival's.
export interface RivalryRecord {
  wins: number;
  losses: number;
  streak: number;
}

export interface StudentOrgState {
  clubs: StudentClub[];
  chapters: GreekChapter[];
  teams: VarsityTeam[];
  // The athletics hiring pool (tickCoachCandidatePool), separate from
  // s.candidates.
  coachCandidates: Coach[];
  // Petitions raised since the last summer boundary, drained wholesale
  // there: approved ones become organizations, the rest are declined.
  pendingPetitions: OrgPetition[];
  // The Greek gate: every Greek eligible() reads `approved`; `offered`
  // means the one-time question was asked, so declining closes it.
  hellenicCouncilApproved: boolean;
  hellenicCouncilOffered: boolean;
  lastFormationWeek: number; // absolute week a club or chapter last formed; 0 = never
  athleticsBudget: AthleticsBudgetTier;
  // Team ids in the player's priority order: the only stored part. The pot,
  // funded line and bands are derived from it (departmentPot), which also
  // drops unknown ids and appends unlisted teams.
  teamOrder: string[];
  // `studentCenterWeek`: absolute week the first student center finished
  // (0 = not yet), for the first sport club's pity timer.
  // `mascotBeatPending`: set the summer the first sport club is recognized;
  // the mascot naming beat fires on the next quiet week.
  studentCenterWeek: number;
  mascotBeatPending: boolean;
  // Hired once the first team exists (fireAthleticDirectorOffer); a Coach
  // with field AD_FIELD. Their quality is a department-wide addend to
  // teamQuality, and shortage and championship reports speak in their voice.
  athleticDirector: Coach | null;
  // The postseason (playoffs.ts). `lastSeason` is per sport and overwritten
  // yearly so it cannot grow. `titles` is monotone and the only part read
  // back (prestigeSystem.ts). `pendingTitles` queues this year's titles for
  // report on a quiet week.
  lastSeason: Record<string, SeasonResult>;
  titles: Array<{ sport: string; year: number }>;
  pendingTitles: string[];
  // The regular season (season.ts). `season` is per sport and overwritten
  // yearly; `rivalries` is the all-time record against each sport's rival.
  season: Record<string, SeasonRecord>;
  rivalries: Record<string, RivalryRecord>;
  // Absolute week the AD offer last fired; 0 = never. The offer recurs
  // after a decline, and is stamped at fire time, not on decline: any path
  // that clears the interrupt without declining would otherwise re-fire it
  // every quiet week and starve other events.
  athleticDirectorAskedWeek: number;
}

// The campus architecture, chosen at founding and permanent. Lives here
// because it is saved; buildingSpec.ts's VERNACULARS holds the palettes.
export type Vernacular = 'georgian' | 'gothic' | 'classical' | 'mission' | 'modern';

// A color pair, presentation only. The player's pair is the game's theme
// (components/theme.ts).
export interface SchoolColors {
  primary: string;   // dominant: the dock, primary button outline, eyebrows
  secondary: string; // accent: active tab, primary button fill, focus ring
}

export interface University {
  // The name in two halves: the player's first half ("Blackmoor") and a
  // suffix, "College" until the one-time 'charter' offer makes it
  // "University". Separate so nothing parses a name to rename it.
  name: string;
  suffix: string;       // may be empty in a migrated old save (persistence.ts's v6 -> v7)
  universityCharterOffered: boolean; // set whether accepted or declined, so it never recurs
  // Team name, empty until the athletic director's interrupt asks for it.
  // Every reader must handle empty.
  mascot: string;
  reputation: number;   // the academic axis, and the one the economy reads (prestigeSystem.ts)
  // Last summer's report card, written only by gradeYear; null until the
  // first summer.
  reportCard: ReportCard | null;
  // The other two standings (docs/design/progression.md): drifted toward
  // weekly targets like reputation, but readings only: no system reads them.
  socialStanding: number;
  researchStanding: number;
  vernacular: Vernacular; // fixed at founding
  colors: SchoolColors;   // fixed at founding
  // Lifetime appointments including the founding five (appointFaculty).
  // Monotone; the final report's "faculty who served".
  facultyServed: number;
}

// The summer report card: the year's inputs graded into a year score on
// prestige's 5..150 scale; prestige steps a fraction of the gap toward it,
// small upward and large downward (gradeYear). `grades` is keyed by the
// breakdown's input keys.
export interface ReportCard {
  year: number;                    // the year that was graded
  score: number;                   // the year score, clamped to the band
  grades: Record<string, number>;  // input key -> the contribution it was graded
  before: number;                  // prestige the morning of the report
  after: number;                   // prestige after the step
}

// The half of the name the player writes: a trailing "College" or
// "University" typed into it is dropped, since the game supplies the suffix
// and later changes it (the University charter). Without this, "Blackmoor
// University" founded as "Blackmoor University College" and chartered as
// "Blackmoor University University".
export function bareSchoolName(typed: string): string {
  return typed.trim().replace(/(\s+(college|university))+$/i, '').trim();
}

// The full display name; handles an empty suffix without a stray space.
export function institutionName(u: University): string {
  return u.suffix ? `${u.name} ${u.suffix}` : u.name;
}

// Total enrolled: derived, never stored. Every per-student reading uses it.
export function totalEnrolled(s: StudentBody): number {
  return s.classes.freshman + s.classes.sophomore + s.classes.junior + s.classes.senior;
}

// One year's headline numbers, appended at RESOLVE_ADMISSIONS. Numbers
// only; anything derivable is derived by the views.
export interface YearSnapshot {
  year: number;           // the year that just CLOSED; the snapshot is the state the school carries into year + 1
  prestige: number;       // self.reputation after that year's drift
  rank: number;           // 1-indexed national rank, recorded even before the rankings reveal
  enrolled: number;       // the class the admissions funnel just committed
  cash: number;
  coursesDone: number;    // 'done' course Buildables
  programsEstablished: number; // program-established milestones awarded so far
  satisfaction: number;   // 0..100
  // What the year did, as opposed to the readings above, since the log is
  // capped.
  net: number;                 // cash now less cash a year ago
  applicants: number;          // the pool this summer's funnel drew
  admitRate: number;           // the share of it the school chose to take (0..1)
  incomingQuality: number;     // the average quality of the class that enrolled (0..100)
  satisfactionAverage: number; // the year's average satisfaction
  coursesFinished: number;     // courses that finished developing during the year
  attrition: number;           // students who did not return at this summer
  graduated: number;           // seniors who graduated this summer
  // For the alumni ledger (Plan 30), absent on rows from before it: the
  // distress ladder's worst rung during the year, and the schools founded
  // by its close.
  worstRung?: number;
  schoolsFounded?: number;
  // The year's rank on each of the six standings (Plan 31), by axis
  // (systems/rivals/rivalsSystem.ts's STANDINGS). Absent before it.
  standings?: Record<string, number>;
  // The college's own value on each of the six (Plan 33), on the 0–150
  // scale, so the Final Report can average a decade. Absent before it.
  standingValues?: Record<string, number>;
  // The endowment at the close (Plan 33), for the chronicle's money line.
  endowment?: number;
}

export interface RunningCampaign {
  campaignId: string;       // data/campaignData.ts
  startedYear: number;
  dueYear: number;
  // The week it closes, counted from founding: its full term to the week.
  // Optional: a campaign launched before it was kept closes on dueYear.
  dueWeek?: number;
  raised: number;
  target: number;
}
export interface Advancement {
  running: RunningCampaign | null;
  closed: { campaignId: string; year: number; raised: number; met: boolean }[];
  restrictedBuilding: number; // raised for buildings, spendable on nothing else
}

// A graduated class, stamped at commencement (systems/alumni/ledger.ts).
export interface AlumniClass {
  classYear: number;     // the year they graduated
  size: number;
  satisfaction: number;  // their years' mean
  quality: number;       // the incoming quality of the year they came
  memory: string[];      // clause ids (data/alumniData.ts), loudest first
  warmth: number;        // 0–100, set at commencement
  nudged: number;        // warmth added by reunions, capped
  reunionYear?: number;  // the year of the last reunion (systems/alumni/giving.ts)
}

// Where every program lives: hall Buildable id -> its slots, positional so
// the hall panel's grid never shuffles. A program id is a major's course
// prefix ('FINA') or a graduate program id ('MED'); a program is housed as
// a unit. A hall's entry is written empty when it finishes (Founders Hall
// is seeded with the three founding programs), and a school is founded by
// reading this record (six slots, one school; docs/design/curriculum.md).
// Systems read it (the tier-2 gate, dedication), so the loader's
// sanitizeHalls corrects bad entries rather than dropping them.
//
// `programOffers` holds the three programs foundable right now, the same at
// every free slot, with no reroll; founding one draws a replacement
// (programOffers.ts).
export interface HallSlot {
  programId: string | null;
  // Weeks left while relocating here. In transit, the program teaches
  // nothing, its courses cannot start or advance, and it does not count
  // toward dedication. Ticked down by techSystem.ts; absent means settled.
  transitWeeks?: number;
}

// Who teaches what: course id -> faculty id, chosen when development starts
// and editable (REASSIGN_COURSE_FACULTY). A separate record, like
// `placements`, so the Buildable model does not fork. Stored rather than
// computed so course quality grades stay stable when the roster changes.
// An entry goes stale when the person leaves; that course is then
// unstaffed (techSystem.ts's isUnstaffed), a real state the player fixes,
// and holds no slot.
export type CourseFaculty = Record<string, string>;

export interface GameState {
  rng: number;                   // the random stream's position (see engine/random.ts)
  clock: GameClock;
  finance: Finance;
  students: StudentBody;
  faculty: Faculty[];
  tech: Buildable[];
  developing: Record<string, number>; // course id -> weeks remaining
  courseFaculty: CourseFaculty;       // see CourseFaculty
  halls: Record<string, HallSlot[]>;  // see HallSlot
  programOffers: string[];            // see HallSlot
  searches: Record<string, number>;   // faculty field -> weeks left on a posted search (facultySearch.ts)
  placements: Placements;
  pathways: Pathways;
  trees: Trees;
  // Quad names and the player's marks (state/quads.ts). Optional: a campus
  // with neither has none.
  quads?: QuadState;
  // The administration's filled seats (Plan 28). Undefined means none.
  seats?: Seat[];
  // The alumni ledger, oldest class first (Plan 30). Undefined before the
  // first commencement stamps a class.
  alumni?: AlumniClass[];
  // Advancement (Plan 30): the campaign running, those closed, and building
  // money raised and not yet spent. Undefined before the first campaign.
  advancement?: Advancement;
  // What the guidebooks call the college (systems/identity/tags.ts): the
  // tags held, and the years each is toward being earned or shed.
  identity?: {
    tags: string[]; earning: Record<string, number>; shedding: Record<string, number>;
    // Every tag earned or shed, and the year (Plan 33's journal).
    log?: { id: string; year: number; earned: boolean }[];
  };
  // The ending (Plan 33): the Final Report written at the fiftieth summer
  // (state/finalReport.ts), and the Epilogue's addenda, a decade each.
  // Undefined before the fiftieth summer closes.
  ending?: Ending;
  // Promises (systems/promises/promises.ts): those open, those settled and
  // declined, and what this summer offers. Undefined before the first offer.
  promises?: PromiseState;
  // The college's rival (systems/rivals/collegeRival.ts) and whether the
  // college stood above it at the last summer. Undefined before one exists.
  rivalStanding?: { rivalId: string; above: boolean; since?: number }; // since: the year this rival was first named
  // The event catalog (systems/events/catalogueEngine.ts): events waiting
  // for an answer, the year each last fired, and when the last inline event
  // and the last letter fired. Undefined before the first fires.
  catalogue?: CatalogueState;
  // Lamps and benches the player has placed beside the paths, by tile key
  // (components/dressing.tsx). Optional: a campus may have none.
  dressing?: Dressing;
  rivals: Rival[];
  self: University;
  history: YearSnapshot[];       // one per completed year, oldest first
  log: LogEntry[];               // recent events, newest first
  pendingInterrupt: PendingInterrupt | null; // set => clock halts until resolved
  events: EventState;
  orgs: StudentOrgState;
  research: ResearchState;
  candidates: Faculty[];         // the churning academic job market (facultySystem.ts's tickCandidatePool)
  started: boolean;              // false only during the pre-game startup screen
  hasEnteredRankings: boolean;   // true once the one-time "you've entered the top 50" reveal has fired
  milestones: Record<string, boolean>; // milestone key -> awarded, so each curriculum milestone bonus fires once
  seen: SeenState;               // what the player has been shown, for alert badges
  ladder: LadderState;           // the milestones reached, and their letters not yet read (data/ladderData.ts)
}

// Alert badges, cleared when the player looks. Ids are only ever added
// (MARK_SEEN), bounded by the catalog:
//   - courseIds: courses the Curriculum tab has rendered (revealed, whatever
//     their status).
//   - buildableIds: placeable Buildables the build popup rendered while
//     their own category tab was active.
//   - tabIds: gated tabs (TabNav.tsx's TAB_GATES) seen open. Not a badge:
//     keeps the "now available" log line one-off across saves and gates
//     that close and reopen.
// The ladder: milestone id -> the year it was reached (never undone), and
// the milestones whose letters are still to be shown, oldest first.
export interface LadderState {
  reached: Record<string, number>;
  unread: string[];
}

export interface SeenState {
  courseIds: Record<string, true>;
  buildableIds: Record<string, true>;
  tabIds: Record<string, true>;
}

// What a log line reports, set on lines the year in review
// (state/yearInReview.ts) and the toasts group by. Tagged at write time so
// rewording a message cannot break them. Untagged lines are texture.
export type LogTopic =
  | 'course'              // a course finished developing
  | 'building'            // a hall, dorm or facility finished
  | 'program'             // a program founded in a hall
  | 'milestone'           // a milestone awarded (established, distinguished, a school founded)
  | 'ambition'            // a promise made, kept or missed (systems/promises)
  | 'appointment'         // somebody joined the faculty
  | 'departure'           // somebody left it
  | 'prize'               // a research prize
  | 'research-started'    // an initiative commissioned
  | 'research-concluded'  // an initiative ended with nothing worth a modal (papers, or nothing)
  | 'research-reported'   // an initiative ended and a report is queued
  | 'publication'
  | 'breakthrough'
  | 'grant'
  | 'demand-raised' | 'demand-met' | 'demand-failed'
  | 'petition'            // a club or chapter petitioned for recognition
  | 'organisations'       // the summer digest's answer
  | 'candidate'           // somebody worth noticing listed on the market
  | 'team'                // a varsity team's venue finished
  | 'admissions' | 'attrition' | 'report-card' | 'money';

export interface LogEntry {
  year: number;
  week: number;
  message: string;
  kind: 'info' | 'good' | 'bad';
  topic?: LogTopic;
  // The id of what the line is about, if any, for grouping and for a toast
  // to open the right place.
  subject?: string;
}

// Deep enough that a completion is still readable weeks later. Lives here
// because the year in review must say when a year's lines fall off.
export const LOG_CAP = 200;

export const WEEKS_PER_YEAR = 52; // the one place the year length lives

// The fiftieth summer files the final report and seals the legacy; the
// clock keeps running as a sandbox after.
export const SEMICENTENNIAL_YEAR = 50;
