import { checkRivalStanding } from '../rivals/collegeRival';
import { turnPerception } from '../identity/tags';
import { stampGraduatingClass } from '../alumni/ledger';
import { tuitionFloor } from '../finance/distress';
import type { GameState } from '../../state/types';
import type { Action } from '../../state/actions';
import { TUITION_SLIDER_MAX } from '../../data/foundingData';
import { money } from '../../format';
import { advanceClock } from '../../state/clock';
import { captureYearSnapshot } from '../../state/history';
import { EPILOGUE_DECADE, finalReport } from '../../state/finalReport';
import { summariseYears } from '../chronicle/chronicle';
import { SEMICENTENNIAL_YEAR } from '../../state/types';
import { advanceClasses, attritionRate, priceTolerance, projectAdmissions, trailingYearSatisfaction } from './admissionsSystem';
import { cohortCounts, deriveCohortSignals } from './cohorts';
import { attritionReasons } from './consequences';
import { applyReportCard, crowdingScore, gradeYear } from '../prestige/prestigeSystem';
import { intakeCeiling } from '../techtree/instructionCapacity';
import {
  activatePetition,
  CHAPTER_APPROVAL_SATISFACTION_NUDGE,
  CHAPTER_DECLINE_SATISFACTION_HIT,
  CLUB_APPROVAL_SATISFACTION_NUDGE,
  CLUB_DECLINE_SATISFACTION_HIT,
} from '../../data/studentLifeData';

// The student-life digest (docs/design/student-life.md): the year's club and
// chapter petitions, answered at the summer boundary. The queue drains
// wholesale, so anything not ticked is declined and the digest never
// accumulates. Approving activates the petition as rolled, so the digest's
// figures are the ones applied. The satisfaction nudges here are transient,
// on top of the durable contribution a live organization makes to the
// target (satisfactionSystem.ts).
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
      // The first sport club triggers the mascot beat on the next quiet week.
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
    message: `Student life: ${recognised} organization${recognised === 1 ? '' : 's'} recognized, ${declined} declined.`,
    kind: declined > recognised ? 'bad' : 'good',
    topic: 'organisations',
  });
}

// The last beat of the summer, and the one that turns the calendar page.
export function resolveAdmissions(s: GameState, action: Extract<Action, { type: 'RESOLVE_ADMISSIONS' }>): void {
  // The fiftieth summer writes the Final Report (state/finalReport.ts),
  // read once before anything this summer changes, so it is the report the
  // summer showed. The clock keeps running: the Epilogue.
  if (s.clock.year === SEMICENTENNIAL_YEAR && !s.ending) {
    const report = finalReport(s);
    s.ending = { report, addenda: [] };
    s.log.unshift({
      year: s.clock.year, week: s.clock.week,
      message: `The fiftieth year closes. The Final Report: ${report.title}. Final mark ${report.mark}.`,
      kind: 'good',
    });
  }

  // Tuition is set only here, once a year (docs/design/admissions.md). This
  // is the listed price; it reaches only the incoming class, via
  // tuitionByClass below. Continuing classes keep their admitted price.
  // Under austerity the board will not let it fall (finance/distress.ts).
  s.finance.listedTuition = Math.max(tuitionFloor(s), Math.min(action.tuition, TUITION_SLIDER_MAX));

  resolveStudentLifeDigest(s, action.approvedPetitionIds);

  // Grade the year that just ended (prestigeSystem.ts's gradeYear) before
  // anything below resets its accumulators; the step is applied after the
  // funnel, so the class that enrolls is the one the panel projected.
  const reportCard = gradeYear(s);

  // Word of mouth: the trailing-year average satisfaction scales next
  // year's applicant pool. Record it, then reset this year's accumulators
  // (including the crowding one the report card just read).
  const priorYearAvgSatisfaction = trailingYearSatisfaction(s);
  // The year's overcrowding, read before its accumulators reset (Plan 71).
  const crowding = crowdingScore(s);
  s.students.priorYearAvgSatisfaction = priorYearAvgSatisfaction;
  s.students.satisfactionYearSum = 0;
  s.students.satisfactionYearWeeks = 0;
  s.students.crowdingYearSum = 0;
  s.students.crowdingYearWeeks = 0;

  // The funnel sizes the freshman class from demand and the player's chosen
  // admit rate; capacity only scales the pool. outcome.admitRate is the
  // realized admits/applicants, which can fall short of the choice.
  const chosenAdmitRate = Math.max(0, Math.min(1, action.admitRate));
  // The class is clipped to the seats the housed catalog has left after
  // graduation, from the same function the reveal shows.
  const ceiling = intakeCeiling(s);
  const outcome = projectAdmissions(
    s.self.reputation,
    s.finance.listedTuition,
    s.students.capacity,
    priorYearAvgSatisfaction,
    { ...deriveCohortSignals(s), crowding },
    chosenAdmitRate,
    ceiling.seatsLeft,
  );

  // Advance the classes: seniors graduate, others move up less attrition,
  // and the incoming class arrives at the price just set. advanceClasses is
  // the same pure function the admissions panel projects with
  // (consequences.ts), so projection and tick cannot diverge.
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
      // Written once, here, and never recomputed (types.ts's ClassCohorts).
      cohorts: outcome.enrolledCohorts,
    },
    attrition,
  );
  const graduating = advanced.graduating;
  s.students.classes = advanced.classes;
  s.finance.tuitionByClass = advanced.tuitionByClass;
  s.students.cohortsByClass = advanced.cohortsByClass;
  s.students.applicantPool = outcome.applicants;
  // The chosen rate, not the realized one: next summer's slider reopens on
  // the policy the player set.
  s.students.admitRate = chosenAdmitRate;
  s.students.incomingQuality = outcome.avgIncomingQuality;
  // What this funnel read, for next summer's reveal (types.ts's
  // FunnelRecord). The cohort split uses the same function as the reveal's
  // cards, so next year's "last year" is what this year's cards showed.
  s.students.lastFunnel = {
    year: s.clock.year,
    applicants: outcome.applicants,
    factors: outcome.factors,
    cohorts: cohortCounts(deriveCohortSignals(s), priceTolerance(s.self.reputation), s.finance.listedTuition, outcome.applicants),
  };

  // The summer step: prestige moves toward the year score, a small share
  // of the gap upward and a large one downward.
  applyReportCard(s, reportCard);

  // The one place the history record grows (state/history.ts): after the
  // funnel and the step, so the row is what the school carries into next
  // year, and before advanceClock, so it is filed under the closing year.
  s.history.push(captureYearSnapshot(s, {
    attrition: advanced.notReturning,
    satisfactionAverage: priorYearAvgSatisfaction,
    graduated: graduating,
  }));
  // The ledger (systems/alumni/ledger.ts): the class that just walked is
  // stamped with its four years; the ladder's year starts again.
  stampGraduatingClass(s, graduating, s.clock.year);
  // The turn of the year for what the guidebooks say (systems/identity/tags.ts).
  turnPerception(s);
  checkRivalStanding(s);
  // The Epilogue (Plan 33): every tenth summer after the fiftieth, the
  // chronicle gets an addendum for the decade just closed.
  if (s.ending && s.clock.year > SEMICENTENNIAL_YEAR && (s.clock.year - SEMICENTENNIAL_YEAR) % EPILOGUE_DECADE === 0) {
    const from = s.clock.year - EPILOGUE_DECADE + 1;
    s.ending.addenda.push({ from, to: s.clock.year, lines: summariseYears(s, from, s.clock.year) });
  }
  if (s.finance.distress) s.finance.distress.yearWorst = s.finance.distress.rung;

  s.pendingInterrupt = null;
  advanceClock(s); // resolving is what turns the calendar page into the new year
  s.log.unshift({
    year: s.clock.year,
    week: s.clock.week,
    message: `Admissions: tuition ${money(s.finance.listedTuition)}/yr — ${outcome.applicants.toLocaleString()} applicants, ${Math.round(outcome.admitRate * 100)}% admitted, ${outcome.enrolled.toLocaleString()} freshmen enrolled, ${graduating.toLocaleString()} graduated.`,
    kind: 'info',
    topic: 'admissions',
  });
  // Attrition gets its own line so a smaller student body is never
  // unexplained.
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
      message: `The catalog had room for ${ceiling.seatsLeft.toLocaleString()} more; the class was held to it.`,
      kind: 'info',
    });
  }
  s.log.unshift({
    year: s.clock.year,
    week: s.clock.week,
    message: `Report card for Year ${reportCard.year}: graded ${reportCard.score.toFixed(0)}. Prestige ${reportCard.before.toFixed(1)} → ${reportCard.after.toFixed(1)}.`,
    kind: reportCard.after >= reportCard.before ? 'good' : 'bad',
    topic: 'report-card',
  });

}
