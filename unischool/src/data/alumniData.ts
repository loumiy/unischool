// The alumni ledger's memory clauses (Plan 30, ported from v2's
// alumni.json). A graduating class earns every clause whose condition its
// four years met (systems/alumni/ledger.ts reads the conditions); warmth
// counts them all, and the line shows the loudest few.
//
// v2's clauses about losing beds to a demolition, a department closing and
// graduates' outcomes are left out: this game has none of those facts.

export type MemoryCondition =
  | 'always' | 'thinned' | 'poorlyTaught' | 'wellTaught' | 'happy' | 'unhappy'
  | 'building' | 'newSchool' | 'firstOfProgram' | 'freeze' | 'austerity' | 'receivership'
  | 'deficits' | 'beautiful';

export interface MemoryClause {
  id: string;
  when: MemoryCondition;
  text: string;
  warmth: number;
}

export const MEMORY_CLAUSES: readonly MemoryClause[] = [
  { id: 'thinned', when: 'thinned', text: 'thinned by the years', warmth: -6 },
  { id: 'under-taught', when: 'poorlyTaught', text: 'under-taught', warmth: -8 },
  { id: 'well-taught', when: 'wellTaught', text: 'properly taught', warmth: 8 },
  { id: 'happy', when: 'happy', text: 'happy in it', warmth: 9 },
  { id: 'unhappy', when: 'unhappy', text: 'miserable in it', warmth: -10 },
  { id: 'building-years', when: 'building', text: 'there for the building years', warmth: 6 },
  { id: 'new-school', when: 'newSchool', text: 'there when a new school was founded', warmth: 5 },
  { id: 'first-of-program', when: 'firstOfProgram', text: 'the first to read a subject that did not exist before them', warmth: 6 },
  { id: 'freeze', when: 'freeze', text: 'graduated out of a freeze', warmth: -4 },
  { id: 'austerity', when: 'austerity', text: 'an austerity class', warmth: -8 },
  { id: 'receivership', when: 'receivership', text: 'here when the receivers were', warmth: -12 },
  { id: 'deficits', when: 'deficits', text: 'four years of bad news from the bursary', warmth: -3 },
  { id: 'handsome', when: 'beautiful', text: 'on the handsomest campus in the county', warmth: 6 },
  { id: 'quiet', when: 'always', text: 'unremarkable, and fond of it', warmth: 2 },
];

export const MEMORY_LINE = 'The class of {year}: {clauses}.';
// How many clauses the line shows; warmth counts them all.
export const MEMORY_CLAUSE_LIMIT = 3;

// The thresholds the conditions read.
export const MEMORY_THINNED_SHARE = 0.18;   // attrition across their years, of the class
export const MEMORY_BUILDINGS = 2;          // buildings finished while they were here
export const MEMORY_DEFICIT_YEARS = 2;      // years that closed with less cash than they opened
export const MEMORY_POORLY_TAUGHT = 40;     // mean course quality
export const MEMORY_WELL_TAUGHT = 60;
export const MEMORY_HAPPY = 70;             // their years' mean satisfaction
export const MEMORY_UNHAPPY = 50;
export const MEMORY_BEAUTIFUL = 70;         // campus beauty at commencement

// Warmth at graduation, before the clauses: 50 for an ordinary class (a
// satisfaction and a teaching grade of 60), moved by how far above or below
// that they felt and were taught. v2 summed the raw readings, which on this
// game's scales left every good college's classes at the ceiling.
export const WARMTH_BASE = 50;
export const WARMTH_ORDINARY = 60;
export const WARMTH_FROM_SATISFACTION = 0.5;
export const WARMTH_FROM_TEACHING = 0.3;

export function clauseById(id: string): MemoryClause | undefined {
  return MEMORY_CLAUSES.find((c) => c.id === id);
}
