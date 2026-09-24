import type { GameState } from '../../state/types';
import type { Action } from '../../state/actions';
import { TUITION_SLIDER_MAX } from '../../data/foundingData';
import { money } from '../../format';
import { advanceClock } from '../../state/clock';
import { captureYearSnapshot } from '../../state/history';
import { legacy } from '../../state/legacy';
import { SEMICENTENNIAL_YEAR, institutionName } from '../../state/types';
import { advanceClasses, attritionRate, priceTolerance, projectAdmissions, trailingYearSatisfaction } from './admissionsSystem';
import { cohortCounts, deriveCohortSignals } from './cohorts';
import { attritionReasons } from './consequences';
import { applyReportCard, gradeYear } from '../prestige/prestigeSystem';
import { intakeCeiling } from '../techtree/instructionCapacity';
import {
  activatePetition,
  CHAPTER_APPROVAL_SATISFACTION_NUDGE,
  CHAPTER_DECLINE_SATISFACTION_HIT,
  CLUB_APPROVAL_SATISFACTION_NUDGE,
  CLUB_DECLINE_SATISFACTION_HIT,
} from '../../data/studentLifeData';

// ---------------------------------------------------------------------
// The student-life digest (see docs/design/student-life.md, and
// data/studentLifeData.ts). Clubs and Greek chapters form quietly during
// the year and queue as petitions; this is where the whole year's worth is
// answered, folded into the summer admissions interrupt rather than given
// a modal of its own. So the light beat costs the run ZERO extra
// stop-the-clock moments.
//
// The queue is drained WHOLESALE: anything the player did not tick is
// declined here and now. That is what keeps the digest a digest — it can
// never accumulate across years into a screen of decisions — and it is why
// declining has a consequence at all, since a petition that simply expired
// would be a decision nobody made.
//
// Approving is a MOVE, not a re-roll: everything mechanical about the
// organisation (its name, founding size, weekly cost) was rolled when the
// petition was raised, so the figures shown in the digest are the figures
// applied — the same contract the decision-event table follows.
//
// The satisfaction changes here are transient nudges to the STOCK, on top
// of the durable contribution a live organisation makes to the satisfaction
// TARGET every week (see satisfactionSystem.ts). The durable half is the
// real reward for approving; this half is what makes the moment land, and
// what gives declining teeth it would otherwise have none of.
function resolveStudentLifeDigest(s: GameState, approvedIds: string[]): void {
  const petitions = s.orgs.pendingPetitions;
  if (petitions.length === 0) return;
  s.orgs.pendingPetitions = [];

  const approved = new Set(approvedIds);
  let nudge = 0;
  let recognised = 0;
  let declined = 0;
  for (const petition of petitions) {
    if (approved.has(petition.id)) {
      // The first sport club is a named beat (Plan 21's PR O): the school
      // picks its mascot on the next quiet week, not in the director's
      // modal two decades on.
      const firstSport = !!petition.sport && !s.orgs.clubs.some((c) => c.sport !== null) && s.orgs.teams.length === 0;
      activatePetition(s, petition);
      if (firstSport && !s.self.mascot) s.orgs.mascotBeatPending = true;
      recognised += 1;
      nudge += petition.kind === 'club'
        ? CLUB_APPROVAL_SATISFACTION_NUDGE
        : CHAPTER_APPROVAL_SATISFACTION_NUDGE;
    } else {
      declined += 1;
      nudge -= petition.kind === 'club'
        ? CLUB_DECLINE_SATISFACTION_HIT
        : CHAPTER_DECLINE_SATISFACTION_HIT;
    }
  }
  s.students.satisfaction = Math.max(0, Math.min(100, s.students.satisfaction + nudge));

  s.log.unshift({
    year: s.clock.year,
    week: s.clock.week,
    message: `Student life: ${recognised} organisation${recognised === 1 ? '' : 's'} recognised, ${declined} declined.`,
    kind: declined > recognised ? 'bad' : 'good',
    topic: 'organisations',
  });
}

// THE LAST BEAT OF THE SUMMER, and the one that turns the calendar page.
export function resolveAdmissions(s: GameState, action: Extract<Action, { type: 'RESOLVE_ADMISSIONS' }>): void {
  // THE SEMICENTENNIAL (Plan 17's PR C). The fiftieth summer seals the
  // record: the legacy is read ONCE, here, before anything about this
  // summer changes the school — so it is exactly the reading the final
  // report (the summer's first beat) showed — and written to s.self,
  // where nothing ever writes it again. The clock does not stop: the
  // rest of this case runs as it does every year, and the sixtieth
  // summer files an ordinary year in review.
  if (s.clock.year === SEMICENTENNIAL_YEAR && s.self.legacy === null) {
    s.self.legacy = legacy(s);
    s.log.unshift({
      year: s.clock.year, week: s.clock.week,
      message: `The fiftieth year closes. The record is sealed: ${institutionName(s.self)} is ${s.self.legacy.name}.`,
      kind: 'good',
    });
  }

  // Tuition is set ONLY here, once a year — see
  // docs/design/admissions.md and the removed live SET_TUITION control.
  // This sets the LISTED price. It reaches a student only through the
  // freshman entry of tuitionByClass, below, after the classes advance:
  // the three classes already on the books keep the price they were
  // admitted under (see types.ts's tuitionByClass).
  s.finance.listedTuition = Math.max(0, Math.min(action.tuition, TUITION_SLIDER_MAX));

  resolveStudentLifeDigest(s, action.approvedPetitionIds);

  // THE REPORT CARD (Plan 15's PR B, see prestigeSystem.ts's gradeYear):
  // the year that just ended, graded — on the accumulators as they
  // stand and the class that spent the year — BEFORE anything below
  // resets or replaces either. The step itself is applied after the
  // funnel, so the class that enrolls is the one the panel projected.
  const reportCard = gradeYear(s);

  // Word of mouth: the trailing-year AVERAGE satisfaction (accumulated
  // weekly since last summer) scales next year's applicant pool — the
  // design's "current experience -> satisfaction -> next year's
  // applications". Read it, record it as this year's figure, then reset
  // the accumulator for the year now beginning — and the crowding
  // accumulator the report card just read, alongside it.
  const priorYearAvgSatisfaction = trailingYearSatisfaction(s);
  s.students.priorYearAvgSatisfaction = priorYearAvgSatisfaction;
  s.students.satisfactionYearSum = 0;
  s.students.satisfactionYearWeeks = 0;
  s.students.crowdingYearSum = 0;
  s.students.crowdingYearWeeks = 0;

  // Run the distribution funnel with the committed policy: it sizes the
  // incoming FRESHMAN class from demand and policy alone — dorm capacity
  // only scales the applicant pool now (see admissionsSystem.ts's
  // module comment), never a ceiling to fill or be capped by.
  // The admit rate is the player's second decision now (Plan 05's PR
  // C): the funnel takes it rather than computing one. What comes back
  // as outcome.admitRate is admits/applicants, which matches the choice
  // unless a thin top/mid band ran out before the share was filled.
  const chosenAdmitRate = Math.max(0, Math.min(1, action.admitRate));
  // THE CEILING (Plan 15's PR E): the class is clipped to the seats the
  // housed catalogue has left after graduation — read here, at the one
  // boundary, off the same function the reveal shows.
  const ceiling = intakeCeiling(s);
  const outcome = projectAdmissions(
    s.self.reputation,
    s.finance.listedTuition,
    s.students.capacity,
    priorYearAvgSatisfaction,
    deriveCohortSignals(s),
    chosenAdmitRate,
    ceiling.seatsLeft,
  );

  // Advance the classes a year: seniors graduate and leave, everyone
  // else moves up — less the share a bad year cost (Plan 15's PR F,
  // admissionsSystem.ts's attritionRate, off the same year's average
  // word of mouth reads) — and the incoming class arrives at the price
  // just set. The advance itself is a pure function in
  // admissionsSystem.ts because the admissions panel runs the SAME one
  // on a copy to project what this commit will do (see
  // consequences.ts) — two copies of it is how a projection starts
  // promising a body the tick does not produce.
  const attrition = attritionRate(priorYearAvgSatisfaction);
  const reasons = attritionReasons(s);
  const advanced = advanceClasses(
    {
      classes: s.students.classes,
      tuitionByClass: s.finance.tuitionByClass,
      cohortsByClass: s.students.cohortsByClass,
    },
    {
      count: outcome.enrolled,
      price: s.finance.listedTuition,
      // Written once, here, and never recomputed: what the class that
      // just enrolled is made of (see types.ts's ClassCohorts).
      cohorts: outcome.enrolledCohorts,
    },
    attrition,
  );
  const graduating = advanced.graduating;
  s.students.classes = advanced.classes;
  s.finance.tuitionByClass = advanced.tuitionByClass;
  s.students.cohortsByClass = advanced.cohortsByClass;
  s.students.applicantPool = outcome.applicants;
  // Stored as the CHOSEN rate, not the realized one, because this is
  // what next summer's slider opens at (see admissionsSystem.ts's
  // payload) — a school whose thin top band clipped its intake should
  // reopen on the policy it set, not on the clipped consequence.
  s.students.admitRate = chosenAdmitRate;
  s.students.incomingQuality = outcome.avgIncomingQuality;
  // What this funnel read, for next summer's reveal to be measured
  // against (Plan 16's PR C — see types.ts's FunnelRecord). The pool's
  // cohort split is apportioned by the same function the reveal's cards
  // use, off the same signals, so next year's "last year" is exactly
  // what this year's cards showed.
  s.students.lastFunnel = {
    year: s.clock.year,
    applicants: outcome.applicants,
    factors: outcome.factors,
    cohorts: cohortCounts(deriveCohortSignals(s), priceTolerance(s.self.reputation), s.finance.listedTuition, outcome.applicants),
  };

  // The summer step: prestige moves toward the year score — a small
  // share of the gap upward, a large one downward. This is the one
  // moment in the year prestige moves by more than a tremor.
  applyReportCard(s, reportCard);

  // The one annual boundary in the game, so the one place the history
  // record grows (see state/history.ts). Appended AFTER the funnel and
  // the step above, so the row is the class and the standing the school
  // actually carries into the next year, and BEFORE advanceClock, so it
  // is filed under the year that just closed. The year's own figures
  // that only this boundary knows — who left, what the year averaged —
  // are handed in rather than re-derived.
  s.history.push(captureYearSnapshot(s, {
    attrition: advanced.notReturning,
    satisfactionAverage: priorYearAvgSatisfaction,
    graduated: graduating,
  }));

  s.pendingInterrupt = null;
  advanceClock(s); // resolving is what turns the calendar page into the new year
  s.log.unshift({
    year: s.clock.year,
    week: s.clock.week,
    message: `Admissions: tuition ${money(s.finance.listedTuition)}/yr — ${outcome.applicants.toLocaleString()} applicants, ${Math.round(outcome.admitRate * 100)}% admitted, ${outcome.enrolled.toLocaleString()} freshmen enrolled, ${graduating.toLocaleString()} graduated.`,
    kind: 'info',
    topic: 'admissions',
  });
  // ATTRITION GETS ITS OWN LINE. A silently smaller number is the
  // single most likely source of "I don't understand what happened to
  // my school", and this plan added enough hidden machinery already.
  if (advanced.notReturning > 0) {
    s.log.unshift({
      year: s.clock.year,
      week: s.clock.week,
      message: `${advanced.notReturning.toLocaleString()} students did not return — ${reasons.length > 0 ? reasons.join(', ') : 'a year averaging ' + priorYearAvgSatisfaction.toFixed(0) + ' satisfaction'}.`,
      kind: 'bad',
      topic: 'attrition',
    });
  }
  if (outcome.capped) {
    s.log.unshift({
      year: s.clock.year,
      week: s.clock.week,
      message: `The catalogue had room for ${ceiling.seatsLeft.toLocaleString()} more; the class was held to it.`,
      kind: 'info',
    });
  }
  s.log.unshift({
    year: s.clock.year,
    week: s.clock.week,
    message: `Report card for year ${reportCard.year}: graded ${reportCard.score.toFixed(0)}. Prestige ${reportCard.before.toFixed(1)} → ${reportCard.after.toFixed(1)}.`,
    kind: reportCard.after >= reportCard.before ? 'good' : 'bad',
    topic: 'report-card',
  });

}
