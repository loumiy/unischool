// The shape of the event catalog (Plan 32, ported from v2's events.json).
// The catalog itself is data (eventCatalogue.ts); systems/events/
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
  | 'endowmentOver' | 'endowmentUnder' | 'cashOver' | 'cashUnder' | 'debtOver' | 'debtUnder' | 'deficitOver' | 'drawRateOver'
  | 'backlogOver' | 'backlogUnder' | 'maintenanceUnder' | 'conditionUnder' | 'projectsOver'
  | 'satisfactionOver' | 'satisfactionUnder' | 'moodOver' | 'moodUnder'
  | 'teachingOver' | 'teachingUnder'
  | 'selectivityOver' | 'selectivityUnder' | 'tuitionOver'
  | 'reputationOver' | 'reputationUnder' | 'rankAtLeast' | 'rankAtMost'
  | 'beautyOver' | 'beautyUnder'
  | 'warmthOver' | 'warmthUnder'
  | 'confidenceOver' | 'confidenceUnder' | 'rungAtLeast' | 'rungAtMost'
  | 'varsityAtLeast' | 'titlesAtLeast' | 'titleRecentAtLeast' | 'rivalAtLeast' | 'mascotAtMost'
  | 'adminShareOver' | 'payrollShareOver'
  | 'winterAtLeast' | 'springWeekAtMost';

// v2's effect levers this game applies. v2's standing payroll effects are
// not among them: events add no standing costs (V2 #11).
export type EffectKey =
  | 'cash' | 'endowment' | 'debt' | 'backlog'   // money: scaled to the college's budget
  | 'mood'        // satisfaction points, now
  | 'confidence'  // the board's (finance/distress.ts)
  | 'warmth'      // every alumni class's (alumni/ledger.ts)
  | 'quality'     // the incoming class's quality
  | 'enrollment'  // students gained or lost, as a share of a founding college's body
  | 'trees'       // stands planted or felled
  | 'replant'     // stands planted after any felling (Plan 76D: "fell and replant")
  | 'departs'     // the professor the event names ({faculty}) leaves (Plan 72B)
  | 'buildingFund' // money into the restricted building fund, not cash (Plan 76D)
  | 'historic'    // the building the event names ({building}) is declared historic (Plan 76D)
  | 'charter';    // the university charter's answer (Plan 78G): 1 takes "University", -1 keeps the name

// The facilities an event can need (v2's building ids, read as this game's
// facility types in systems/events/catalogue.ts).
export type NeedKey =
  | 'arts-centre' | 'championship-stadium' | 'dining-hall' | 'great-lawn' | 'health-center'
  | 'lab' | 'library' | 'playing-field' | 'research-park' | 'residence-hall';

export interface CatalogueChoice {
  id: string;
  label: string;
  effects: Partial<Record<EffectKey, number>>;
  // What an answer does beyond the levers (Plan 76D): a promise made in
  // the game's promise system, by id (data/promiseData.ts), and the mascot
  // it adopts.
  promise?: string;
  mascot?: string;
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
  title?: string;               // seismic letters, and the charter
  // Who the inbox says it is from, where not the domain's desk (the charter
  // comes from the board).
  from?: string;
  // May name {rival}, {class}, {faculty}, {program}, {building}, {sport},
  // {school} or {suitor}; systems/events/catalogue.ts fills them.
  text: string;
  // Which building and which class the text means (Plan 76D): the one that
  // made the event fire, not any. 'derelict' is the worst-kept building
  // below the derelict line, 'worst' the worst-kept roofed building,
  // 'listable' one old enough to be declared historic, 'founders' Founders
  // Hall; a 'reunion' class is five, ten or more years out, a 'veteran'
  // one twenty or more. And which professor (Plan 79D): 'researcher' the
  // strongest researcher, 'teacher' the strongest teacher, 'longest' the
  // longest-serving. Unnamed, {faculty} is anyone on the roster. An event
  // whose answer acts on the professor ('departs') leaves them unnamed:
  // naming would change who leaves, and so the run.
  names?: {
    building?: 'derelict' | 'worst' | 'listable' | 'founders';
    class?: 'reunion' | 'veteran';
    faculty?: 'researcher' | 'teacher' | 'longest';
  };
  timeoutWeeks: number;
  choices: CatalogueChoice[];
  default: string;
}
