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

export type TechStatus = 'locked' | 'available' | 'developing' | 'done';

export interface TechNode {
  id: string;
  name: string;
  description: string;
  tier: number;           // higher tier = longer to develop
  prereqs: string[];     // ids that must be 'done'
  status: TechStatus;
  unlocks?: Partial<GameEffects>; // applied once, when completed
}

// Effects a tech node can grant when finished.
export interface GameEffects {
  capacityBonus: number;
  reputationBonus: number;
  tuitionBonus: number;
  researchRateBonus: number;
}

export interface Rival {
  id: string;
  name: string;
  reputation: number;   // the metric the ranking sorts on
  momentum: number;     // hidden trend, makes rivals dynamic over decades
}

export interface University {
  name: string;
  reputation: number;   // player's own rank metric
}

export interface GameState {
  clock: GameClock;
  finance: Finance;
  students: StudentBody;
  faculty: Faculty[];
  tech: TechNode[];
  slots: number;                     // parallel development slots
  developing: Record<string, number>; // course id -> weeks remaining
  rivals: Rival[];
  self: University;
  log: LogEntry[];               // recent events, newest first
  gameOver: boolean;
}

export interface LogEntry {
  year: number;
  week: number;
  message: string;
  kind: 'info' | 'good' | 'bad';
}

export const WEEKS_PER_YEAR = 16; // your semester-length decision, one place to change it
