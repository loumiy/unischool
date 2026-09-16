import type { SatisfactionAttributes, StudentDemand } from '../state/types';

// ---------------------------------------------------------------------
// STUDENT DEMANDS, AS DATA (see docs/design/student-life.md's "Student
// demands: the inverse of clubs"). Clubs are what students give the
// institution when they are happy; a demand is what they ask of it when
// they are not. Same discipline as the student-organisation layer:
// everything tunable is a named constant in this file, everything authored
// is a sentence in this file, and the one tick function that reads them
// (systems/demands/demandSystem.ts) contains only cadence and target logic.
//
// WHAT A DEMAND IS. One concrete, buildable ask — "somewhere to eat",
// "somewhere to study" — DERIVED from an actual shortfall rather than picked
// at random, with a target condition and a deadline. Meeting it is
// something the player DOES (they build the thing and the target reading
// crosses its threshold), never something they click past: there is no
// acknowledge button on the resolution side at all, only on the modal that
// raises it.
//
// WHAT IT IS WORTH, BOTH WAYS. Both halves are transient nudges to the
// satisfaction STOCK, exactly like the decision-event table's dents and the
// student-life digest's: the stock drifts back toward its facilities-derived
// target at SATISFACTION_DRIFT_RATE a week, so a hit taken in week 10 has
// mostly healed by week 40 while one taken near the summer funnel costs real
// applicants through word of mouth (see admissionsSystem.ts's
// WORD_OF_MOUTH_STRENGTH). Timing is the teeth; permanence is not — and the
// durable half of meeting a demand is the facility the school now owns,
// which raises the satisfaction TARGET on its own, forever, without this
// system doing anything.
//
// WHAT IT MAY NOT TOUCH. Prestige, for the same reason the decision events
// and student life leave it alone: s.self.reputation is a slow-moving stock
// that drifts toward a computed target once a year (see prestigeSystem.ts),
// and a demand is not one of that target's inputs. Demands move
// satisfaction and, through the summer funnel, admissions. Nothing else.
//
// NO SPIRAL, BY CONSTRUCTION. Three separate properties, none of them a
// special case:
//   1. DEMAND_COOLDOWN_WEEKS after ANY resolution, met or failed, so a
//      failed demand can never be followed by an immediate second one.
//   2. At most one demand open at a time (see EventState.activeDemand).
//   3. satisfactionSystem.ts's ATTRIBUTE_SCORE_FLOOR, untouched here: no
//      attribute reaches zero, so the satisfaction target bottoms out well
//      above it and word of mouth bottoms out around 0.63x rather than at
//      nothing. A school that ignores every demand it is ever given still
//      stalls rather than dies — the same "stall, don't die" property the
//      economy already guarantees.
// ---------------------------------------------------------------------

// =====================================================================
// TUNING — CADENCE. Together with DEMAND_SATISFACTION_THRESHOLD these are
// the two dials the PR's cadence question is answered with: the threshold
// decides HOW UNHAPPY a school has to be before students ask for anything
// at all, and the cooldown decides how often they may ask again.
// =====================================================================

// Nothing is demanded during the founding ramp, for the same reason no
// decision event fires then (see eventData.ts's DECISION_EVENT_FIRST_YEAR):
// year 1-2 is the tutorial-by-design stretch.
export const DEMAND_FIRST_YEAR = 3;

// The trigger. Satisfaction below this and the student body organises;
// above it, nothing is ever demanded. Sized well under the founding value
// of 70 (which is also WORD_OF_MOUTH_NEUTRAL, the satisfaction that neither
// helps nor hurts demand) so a school that is merely imperfect never sees a
// demand at all, and only one that is genuinely being neglected does.
export const DEMAND_SATISFACTION_THRESHOLD = 45;

// How long the school has, once the demand is announced. A year and a half:
// long enough to save for and build any single rung of the facility chains
// at the stage a school is likely to be short of them, and long enough that
// the deadline spans two summer admissions decisions, so the player has a
// pricing lever as well as a building one.
export const DEMAND_DEADLINE_WEEKS = 78;

// The floor between one demand resolving and the next being rolled — two
// years, whichever way the first one went. This is the anti-spiral dial:
// a school pinned under the threshold sees a demand roughly every three
// years rather than a rolling queue of them.
export const DEMAND_COOLDOWN_WEEKS = 104;

// Display only, and the one constant here that is not a mechanic: how
// close the deadline has to be before the Student Life tab's countdown
// reads as urgent. Nothing changes when it is crossed — a demand's
// consequences all land at the deadline itself.
export const DEMAND_URGENT_WEEKS = 13;

// =====================================================================
// TUNING — SATISFACTION. Both are nudges to the drifting stock (see the
// header). Failing costs noticeably more than meeting pays, because
// meeting one already carries its own durable reward: the facility the
// school built to meet it raises the satisfaction target every week from
// then on. This number is only the moment.
// =====================================================================
export const DEMAND_MET_SATISFACTION_REWARD = 5;
// Sized against the heaviest existing dent in the decision-event table
// (the deferred dining remediation, at 8) — a year and a half of being
// ignored should land like the worst single thing a school can shrug off.
export const DEMAND_FAILED_SATISFACTION_PENALTY = 8;

// =====================================================================
// TUNING — WHICH SHORTFALL. A demand is derived, not drawn: the system
// scores every candidate shortfall and asks for the worst one (see
// demandSystem.ts's rollShortfallDemand). Housing is scored the same way
// as every other shortfall now — off satisfactionSystem.ts's own
// attributeCoverage — so there is no separate gate constant for it here.
// =====================================================================
// THE COPY. One entry per shortfall a demand can be about, keyed by the
// satisfaction attribute it is measured against (plus 'housing', the one
// measured against capacity). Derived at RENDER time from the demand's
// metric/attribute rather than captured when the demand was rolled — the
// same rule describeMilestone follows, so a demand that waited three weeks
// for a quiet slot still says exactly what it would have said on the day.
// =====================================================================
export type DemandSubject = keyof SatisfactionAttributes | 'housing';

export interface DemandCopy {
  headline: string;   // the modal's title
  // The grievance: why the students are asking. Takes the name of the
  // Buildable the ask resolved to, so the sentence is about the actual next
  // rung of the actual chain rather than a generic noun.
  grievance(askName: string): string;
  ask(askName: string): string;      // the one-line ask, as the tab lists it
  unit: string;                      // what `target` counts, for the progress line
}

export const DEMAND_COPY: Record<DemandSubject, DemandCopy> = {
  basicNeeds: {
    headline: 'Students demand somewhere to eat',
    grievance: (ask) =>
      `The queue at the dining halls runs out of the door and round the building, and a petition with most of the student body's names on it has been handed to your office. They want ${ask} open, and they want a date.`,
    ask: (ask) => `Open ${ask}`,
    unit: 'students served by dining',
  },
  academic: {
    headline: 'Students demand somewhere to study',
    grievance: (ask) =>
      `There is nowhere to sit and read. Students are working in corridors and stairwells, and a sit-in in the reading room has produced a single written demand: ${ask}.`,
    ask: (ask) => `Build ${ask}`,
    unit: 'students served by study space',
  },
  social: {
    headline: 'Students demand somewhere to be',
    grievance: (ask) =>
      `A campus with nothing on it after five o'clock is the complaint, and it is a fair one. The student body has asked, formally, for ${ask}.`,
    ask: (ask) => `Build ${ask}`,
    unit: 'students served by student life space',
  },
  health: {
    headline: 'Students demand somewhere to be seen',
    grievance: (ask) =>
      `The wait for an appointment at the health service is measured in weeks, and the student government has stopped asking politely. They want ${ask}.`,
    ask: (ask) => `Build ${ask}`,
    unit: 'students served by health services',
  },
  housing: {
    headline: 'Students demand somewhere to live',
    grievance: (ask) =>
      `Every bed on campus is spoken for and the waiting list is longer than the incoming class. The demand is for beds — specifically, for ${ask} to be built.`,
    ask: (ask) => `Build ${ask}`,
    unit: 'beds of campus housing',
  },
};

// Which entry of the table above a demand reads from. The one place the
// metric/attribute pair is turned back into a subject, so no caller has to
// know that 'capacity' means housing.
export function demandSubject(demand: StudentDemand): DemandSubject {
  return demand.metric === 'capacity' ? 'housing' : (demand.attribute ?? 'social');
}

export function demandCopy(demand: StudentDemand): DemandCopy {
  return DEMAND_COPY[demandSubject(demand)];
}
