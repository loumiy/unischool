import type { SatisfactionAttributes, StudentDemand } from '../state/types';

// ---------------------------------------------------------------------
// Student demands as data (see docs/design/student-life.md). A demand is
// one concrete, buildable ask derived from the campus's worst shortfall,
// with a target and a deadline; demandSystem.ts holds only cadence and
// target logic. Both outcomes are transient nudges to the satisfaction
// stock, which drifts back toward its target, so timing relative to the
// summer funnel (word of mouth) is what bites. Demands never touch prestige.
//
// No spiral, by construction: a cooldown after any resolution, at most one
// demand open at a time, and satisfactionSystem.ts's ATTRIBUTE_SCORE_FLOOR
// keeps a school that ignores every demand stalling rather than dying.
// ---------------------------------------------------------------------

// --- Cadence: the threshold decides how unhappy a school must be before
// students ask, the cooldown how often they may ask again.

// Nothing is demanded during the founding ramp (cf. eventData.ts's
// DECISION_EVENT_FIRST_YEAR).
export const DEMAND_FIRST_YEAR = 3;

// The trigger: satisfaction below this and the student body organises.
// Under the founding value of 70 (WORD_OF_MOUTH_NEUTRAL), so a merely
// imperfect school never sees a demand.
export const DEMAND_SATISFACTION_THRESHOLD = 60;

// Once announced: a year and a half, enough to build any single rung of a
// facility chain and spanning two summer admissions decisions.
export const DEMAND_DEADLINE_WEEKS = 78;

// The floor between one demand resolving and the next being rolled, met or
// failed. The anti-spiral dial.
export const DEMAND_COOLDOWN_WEEKS = 104;

// Display only: when the Students tab's countdown reads as urgent.
export const DEMAND_URGENT_WEEKS = 13;

// --- Satisfaction nudges. Failing costs more than meeting pays, because
// the facility built to meet a demand already raises the satisfaction
// target for good.
export const DEMAND_MET_SATISFACTION_REWARD = 5;
// Matches the heaviest dent in the decision-event table.
export const DEMAND_FAILED_SATISFACTION_PENALTY = 8;

// --- The copy: one entry per subject, keyed by satisfaction attribute plus
// 'housing' and 'instruction'. Read at render time from the demand's
// metric/attribute, so a queued demand still says what it would have said
// on the day.
export type DemandSubject = keyof SatisfactionAttributes | 'housing' | 'instruction';

export interface DemandCopy {
  headline: string;   // the modal's title
  // The grievance, naming the Buildable the ask resolved to.
  grievance(askName: string): string;
  ask(askName: string): string;      // the one-line ask, as the tab lists it
  unit: string;                      // what `target` counts, for the progress line
}

// A building's name as a sentence carries it: "the Library", "the Original
// Dining Hall". The asks are buildings not yet built, named by what they
// will be called.
function theName(name: string): string {
  return name.startsWith('The ') ? `the ${name.slice(4)}` : `the ${name}`;
}

export const DEMAND_COPY: Record<DemandSubject, DemandCopy> = {
  basicNeeds: {
    headline: 'Students demand somewhere to eat',
    grievance: (ask) =>
      `The queue at the dining halls runs out of the door and round the building, and a petition with most of the student body's names on it has been handed to your office. They want ${theName(ask)} open, and they want a date.`,
    ask: (ask) => `Open ${theName(ask)}`,
    unit: 'students served by dining',
  },
  academic: {
    headline: 'Students demand somewhere to study',
    grievance: (ask) =>
      `There is nowhere to sit and read. Students are working in corridors and stairwells, and a sit-in in the reading room has produced a single written demand: ${theName(ask)}.`,
    ask: (ask) => `Build ${theName(ask)}`,
    unit: 'students served by study space',
  },
  social: {
    headline: 'Students demand somewhere to be',
    grievance: (ask) =>
      `A campus with nothing on it after five o'clock is the complaint, and it is a fair one. The student body has asked, formally, for ${theName(ask)}.`,
    ask: (ask) => `Build ${theName(ask)}`,
    unit: 'students served by student life space',
  },
  health: {
    headline: 'Students demand somewhere to be seen',
    grievance: (ask) =>
      `The wait for an appointment at the health service is measured in weeks, and the student government has stopped asking politely. They want ${theName(ask)}.`,
    ask: (ask) => `Build ${theName(ask)}`,
    unit: 'students served by health services',
  },
  housing: {
    headline: 'Students demand somewhere to live',
    grievance: (ask) =>
      `Every bed on campus is spoken for and the waiting list is longer than the incoming class. The demand is for beds — specifically, for ${ask} to be built.`,
    ask: (ask) => `Build ${ask}`,
    unit: 'beds of campus housing',
  },
  // Measured against the catalogue's seats (instructionCapacity.ts); the ask
  // is a course.
  instruction: {
    headline: 'Students demand a seat in class',
    grievance: (ask) =>
      `Every section is over its room and students are following lectures from the corridor. The Registrar has forwarded a petition with one demand on it: open ${ask}, and stop admitting people there is no seat for.`,
    ask: (ask) => `Develop ${ask}`,
    unit: 'seats across the catalogue',
  },
};

// Which copy entry a demand reads from, so no caller has to know that
// 'capacity' means housing.
export function demandSubject(demand: StudentDemand): DemandSubject {
  if (demand.metric === 'capacity') return 'housing';
  if (demand.metric === 'seats') return 'instruction';
  return demand.attribute ?? 'social';
}

export function demandCopy(demand: StudentDemand): DemandCopy {
  return DEMAND_COPY[demandSubject(demand)];
}
