// The shape of the event catalogue (Plan 32, ported from v2's events.json).
// The catalogue itself is data (eventCatalogue.ts); systems/events/
// catalogue.ts reads its conditions and applies its effects.

import type { EventDomain } from './seatData';

// v2's `when` keys this game can read. An event that needs any other was
// left out of the port.
export type ConditionKey =
  | 'yearAtLeast' | 'yearAtMost'
  | 'enrolledOver' | 'enrolledUnder'
  | 'alumniOver'
  | 'facultyOver' | 'facultyUnder' | 'studentsPerFacultyOver'
  | 'buildingsOver' | 'oldestBuildingOver' | 'derelictOver' | 'quadsOver' | 'treesUnder'
  | 'programsOver' | 'programsUnder' | 'schoolsOver'
  | 'endowmentOver' | 'endowmentUnder' | 'cashOver' | 'cashUnder' | 'debtOver' | 'deficitOver' | 'drawRateOver'
  | 'backlogOver' | 'maintenanceUnder' | 'conditionUnder'
  | 'satisfactionOver' | 'satisfactionUnder' | 'moodOver' | 'moodUnder'
  | 'teachingOver' | 'teachingUnder'
  | 'selectivityOver' | 'selectivityUnder' | 'tuitionOver'
  | 'reputationOver' | 'reputationUnder' | 'rankAtLeast'
  | 'beautyOver' | 'beautyUnder'
  | 'warmthOver' | 'warmthUnder'
  | 'confidenceOver' | 'confidenceUnder' | 'rungAtLeast'
  | 'varsityAtLeast' | 'titlesAtLeast' | 'rivalAtLeast'
  | 'adminShareOver' | 'payrollShareOver'
  | 'winterAtLeast';

// v2's effect levers this game applies. v2's standing payroll effects are
// not among them: events add no standing costs (V2 #11).
export type EffectKey =
  | 'cash' | 'endowment' | 'debt' | 'backlog'   // money: scaled to the college's budget
  | 'mood'        // satisfaction points, now
  | 'confidence'  // the board's (finance/distress.ts)
  | 'warmth'      // every alumni class's (alumni/ledger.ts)
  | 'quality'     // the incoming class's quality
  | 'enrollment'  // students gained or lost, as a share of a founding college's body
  | 'trees';      // stands planted or felled

// The facilities an event can need (v2's building ids, read as this game's
// facility types in systems/events/catalogue.ts).
export type NeedKey =
  | 'arts-centre' | 'championship-stadium' | 'dining-hall' | 'great-lawn' | 'health-center'
  | 'lab' | 'library' | 'playing-field' | 'research-park' | 'residence-hall';

export interface CatalogueChoice {
  id: string;
  label: string;
  effects: Partial<Record<EffectKey, number>>;
}

export interface CatalogueEvent {
  id: string;
  // Inline events wait in the panel and time out to their default; seismic
  // ones are the board's letters, and stop the clock.
  kind: 'inline' | 'seismic';
  domain: EventDomain;          // v2's 'money' is the president's own: 'board'
  weight: number;
  cooldownYears: number;
  when: Partial<Record<ConditionKey, number>>;
  needs?: NeedKey[];
  favours?: string[];           // identity tag ids (data/tagData.ts) that make it likelier
  title?: string;               // seismic letters only
  // May name {rival}, {class}, {faculty}, {program}, {building}, {sport},
  // {school} or {suitor}; systems/events/catalogue.ts fills them.
  text: string;
  timeoutWeeks: number;
  choices: CatalogueChoice[];
  default: string;
}
