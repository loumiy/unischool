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

// Students are modeled as aggregate cohorts, not individuals.
export interface StudentBody {
  enrolled: number;
  capacity: number;      // driven by unlocked buildings/tech
  satisfaction: number;  // 0..100, affects retention & reputation
  applicantPool: number; // this cycle's applicants
}

// Faculty ARE individuals with attributes.
export interface Faculty {
  id: string;
  name: string;
  field: string;
  teaching: number;   // 0..100
  research: number;   // 0..100
  salary: number;
  morale: number;     // 0..100
}

export type BuildableStatus = 'locked' | 'available' | 'developing' | 'done';

// courses, academic buildings, dorms, and campus-life facilities (and later
// sports) are all the same kind of thing: a Buildable. They differ only in
// their data, not their machinery — see README's "The central abstraction".
export type BuildableKind = 'course' | 'building' | 'dorm' | 'facility';

export interface Buildable {
  id: string;
  kind: BuildableKind;
  name: string;
  description: string;
  cost: number;            // money spent up front, at the moment development starts
  duration: number;        // weeks of development, occupying a development slot
  prereqs: string[];       // other Buildable ids that must be 'done'; may cross kinds and majors
  requiresFaculty?: string; // a Faculty `field` that must be present on the roster to start
  status: BuildableStatus;
  effects?: Partial<BuildableEffects>; // applied once, when completed
}

// Effects a Buildable can grant when finished.
export interface BuildableEffects {
  capacityBonus: number;
  reputationBonus: number;
  tuitionBonus: number;
  researchRateBonus: number;
  slotBonus: number;    // grants additional development slots
  unlockIds: string[];  // force these Buildable ids to 'available', regardless of their own prereqs
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
}

export interface LogEntry {
  year: number;
  week: number;
  message: string;
  kind: 'info' | 'good' | 'bad';
}

export const WEEKS_PER_YEAR = 16; // your semester-length decision, one place to change it
