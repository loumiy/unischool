// Central type definitions. Every system reads and writes this shared state.
// Keep this file authoritative: if a concept exists in the game, its shape lives here.

export interface GameClock {
  year: number;      // in-game year, starts at 1
  week: number;      // 1..WEEKS_PER_YEAR
}

export interface Finance {
  cash: number;          // liquid funds
  endowment: number;     // long-term reserve, grows/shrinks slowly
  tuitionPerStudent: number;
  tuitionCeiling: number;        // hard cap on tuitionPerStudent, set by school type at founding
  baselineFundingPerWeek: number; // steady non-tuition income (e.g. state appropriations), set by school type
  weeklyOpEx: number;    // salaries + upkeep, recomputed each tick
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
  salary: number;      // current annual salary — recomputed from current stats + a separate seniority premium curve
  morale: number;     // 0..100
  courseSlots: number; // how many courses in `field` this hire can keep staffed at once — rolled at hire, grows slowly with tenure (see facultyData.ts's grownSlots). A course whose requiresFaculty is `field` occupies one slot in that field for as long as it stays 'developing' or 'done' (see techSystem.ts's canStartDevelopment) — offering more courses in a subject means hiring more (or more tenured) faculty in it.
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
  duration: number;        // weeks of development, occupying a development slot
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
// servesPopulation/satisfactionAttribute/flatSatisfactionBonus/
// churnReductionBonus; prestigeSystem.ts sums prestigeContribution;
// financeSystem.ts sums upkeepPerWeek) — so a facility's contribution stays
// current even though nothing "happens" on the weeks after it finishes.
export interface BuildableEffects {
  capacityBonus: number;
  tuitionBonus: number;
  researchRateBonus: number;
  slotBonus: number;    // grants additional development slots
  applicantPoolBonus: number; // one-time bump to the applicant pool (see README's milestone chain)
  unlockIds: string[];  // force these Buildable ids to 'available', regardless of their own prereqs

  // --- live-read, every tick, never mutated into state (see above) ---
  servesPopulation: number;    // how many students' worth of this need one instance covers, compared against s.students.capacity (needs scale with planned campus size, not today's enrollment)
  satisfactionAttribute: keyof SatisfactionAttributes; // which breakdown attribute servesPopulation/flatSatisfactionBonus feeds
  flatSatisfactionBonus: number; // added directly to the attribute score, NOT ratio/population-scaled (the quad: cheap, and its contribution doesn't shrink as the campus grows)
  churnReductionBonus: number; // multiplicatively shrinks weekly attrition (see admissionsSystem.ts) — the student center's passive retention effect
  prestigeContribution: number; // 0..1 share fed into prestige's campus-life input (see prestigeSystem.ts) — the rec center's "small prestige contribution"
  upkeepPerWeek: number; // recurring operating cost, summed into weeklyOpEx alongside salaries/dorm-seat upkeep (see financeSystem.ts)
}

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

export interface GameState {
  clock: GameClock;
  finance: Finance;
  students: StudentBody;
  admissions: AdmissionsSettings;
  faculty: Faculty[];
  tech: Buildable[];
  slots: number;                     // parallel development slots
  developing: Record<string, number>; // course id -> weeks remaining
  rivals: Rival[];
  self: University;
  log: LogEntry[];               // recent events, newest first
  gameOver: boolean;
  pendingInterrupt: PendingInterrupt | null; // set => clock halts until resolved
  autoDevelop: boolean;          // when true, tickTech fills open development slots itself
  candidates: Faculty[];         // hireable faculty pool, distinct from the hired roster
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
