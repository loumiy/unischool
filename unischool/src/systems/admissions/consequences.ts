import type { GameState } from '../../state/types';
import { totalEnrolled } from '../../state/types';
import { advanceClasses, attritionRate, trailingYearSatisfaction } from './admissionsSystem';
import { instructionCoverage } from '../techtree/instructionCapacity';
import { baseShareCohortCounts } from './cohorts';
import { financeBreakdown } from '../finance/financeSystem';
import { attributeCoverage, satisfactionTarget } from '../satisfaction/satisfactionSystem';
import { gradeYear } from '../prestige/prestigeSystem';

// ---------------------------------------------------------------------
// WHAT COMMITTING WOULD DO (Plan 05's PR D). The summer panel's second
// decision — how much of the pool to take — moves the size of the whole
// school, and its consequences land on money and on how the students who
// are already here feel. Both were invisible until the year had already
// run.
//
// Nothing here is a model. It is the shipped state, advanced by the
// shipped advance (admissionsSystem.ts's advanceClasses — the very
// function reducer.ts commits with), read by the shipped readings
// (financeBreakdown, satisfactionTarget). There is deliberately no
// arithmetic in this file beyond a subtraction for the deltas: a panel
// that projects with its own copy of a formula is a panel that will one
// day disagree with the tick that follows it, and this is the one screen
// where the player is being asked to trust a number before paying for it.
//
// THE COPY IS SHALLOW, and that is a correctness claim, not a shortcut.
// The advance touches exactly two slices — students.classes and
// finance.tuitionByClass — so those are replaced and everything else is
// shared by reference with the live state. Both readings below are pure
// (they take a GameState and return numbers; neither writes), so sharing
// the rest cannot leak a mutation back into the real game. It also keeps
// this cheap enough to run on every frame of a slider drag.
// ---------------------------------------------------------------------

export interface AdmissionsConsequence {
  // The body this commit would produce: the three classes still enrolled
  // (the seniors having graduated) plus the incoming class.
  totalEnrolled: number;
  graduating: number;

  // Money, per week, exactly as the Treasury's income statement reads it.
  weeklyNet: number;
  weeklyNetNow: number;
  tuitionRevenue: number;

  // Where satisfaction would be HEADED at that body — the target, not the
  // stock, because the stock is sticky and drifts toward this over weeks
  // (see satisfactionSystem.ts's tickSatisfaction). The target is what the
  // decision actually moves; showing the stock would show nothing at all
  // on the day it is taken.
  satisfactionTarget: number;
  satisfactionTargetNow: number;

  // The campus need this class would stretch furthest, and how far
  // (satisfactionSystem.ts's attributeCoverage, which is served over
  // needed, clamped to 0..1). Reported as the WORST of the two capacity
  // needs rather than both, because both read a flat 100% for any school
  // that is not actually short — a row that says "fine" every year is not
  // a row anybody reads, and what the player needs here is a warning, not
  // a gauge.
  //
  // It is here at all because the satisfaction TARGET above stops
  // answering exactly when the question gets urgent: every ratio attribute
  // is floored at ATTRIBUTE_SCORE_FLOOR so demand can never collapse to
  // nothing, which means a school already at that floor reads the same
  // +0.0 whether it admits 60 students or 6,000. Coverage keeps falling
  // after the score has stopped.
  tightestNeed: 'housing' | 'basicNeeds';
  tightestCoverage: number;
  tightestCoverageNow: number;

  // ATTRITION (Plan 15's PR F): who will not return this summer, and the
  // two shortfalls most to blame — named, so the reveal can say "340
  // students did not return — housing, dining" rather than a smaller
  // number arriving in silence.
  notReturning: number;
  attritionReasons: string[];
}

const COVERAGE_LABELS: Array<[string, (s: GameState) => number]> = [
  ['housing', (s) => attributeCoverage(s, 'housing')],
  ['dining', (s) => attributeCoverage(s, 'basicNeeds')],
  ['study space', (s) => attributeCoverage(s, 'academic')],
  ['social space', (s) => attributeCoverage(s, 'social')],
  ['classes', (s) => instructionCoverage(s)],
];

// The two worst-covered needs under 90%, worst first — what a student who
// left would have named.
export function attritionReasons(s: GameState): string[] {
  return COVERAGE_LABELS
    .map(([label, read]) => ({ label, coverage: read(s) }))
    .filter((c) => c.coverage < 0.9)
    .sort((a, b) => a.coverage - b.coverage)
    .slice(0, 2)
    .map((c) => c.label);
}

// The attrition this summer applies, off the same year's average the
// reducer reads at RESOLVE_ADMISSIONS.
export function summerAttrition(s: GameState): number {
  return attritionRate(trailingYearSatisfaction(s));
}

// Whichever of the two capacity needs the projected body leaves shortest.
// Ties go to housing, which is the one the player can actually build their
// way out of in a single year.
function tightest(s: GameState, projected: GameState): Pick<
  AdmissionsConsequence, 'tightestNeed' | 'tightestCoverage' | 'tightestCoverageNow'
> {
  const housing = attributeCoverage(projected, 'housing');
  const basicNeeds = attributeCoverage(projected, 'basicNeeds');
  const need = housing <= basicNeeds ? 'housing' : 'basicNeeds';
  return {
    tightestNeed: need,
    tightestCoverage: need === 'housing' ? housing : basicNeeds,
    tightestCoverageNow: attributeCoverage(s, need),
  };
}

export function projectConsequences(
  s: GameState,
  incoming: number,
  incomingPrice: number,
): AdmissionsConsequence {
  // The cohort split does not affect anything this projection measures —
  // money, satisfaction and coverage all read head counts — so the incoming
  // mix is carried through as the neutral prior rather than re-deriving the
  // funnel's own. Nothing downstream of here reads it; the REAL split is
  // written by RESOLVE_ADMISSIONS from projectAdmissions's own figure.
  const advanced = advanceClasses(
    {
      classes: s.students.classes,
      tuitionByClass: s.finance.tuitionByClass,
      cohortsByClass: s.students.cohortsByClass,
    },
    { count: incoming, price: incomingPrice, cohorts: baseShareCohortCounts(incoming) },
    summerAttrition(s),
  );

  // The summer also STEPS PRESTIGE (Plan 15's PR B — reducer.ts applies
  // prestigeSystem.ts's report card right after the funnel), and the
  // prestige dividend and the pride term of satisfaction both read it, so
  // the projection carries the same step on its copy. The card grades the
  // state before the funnel, which is exactly the state this holds.
  const stepped = gradeYear(s).after;
  const projected: GameState = {
    ...s,
    self: { ...s.self, reputation: stepped },
    students: { ...s.students, classes: advanced.classes, cohortsByClass: advanced.cohortsByClass },
    finance: { ...s.finance, tuitionByClass: advanced.tuitionByClass, listedTuition: incomingPrice },
  };

  const flow = financeBreakdown(projected);
  return {
    totalEnrolled: totalEnrolled(projected.students),
    graduating: advanced.graduating,
    weeklyNet: flow.net,
    weeklyNetNow: financeBreakdown(s).net,
    tuitionRevenue: flow.tuitionRevenue,
    satisfactionTarget: satisfactionTarget(projected),
    satisfactionTargetNow: satisfactionTarget(s),
    ...tightest(s, projected),
    notReturning: advanced.notReturning,
    attritionReasons: attritionReasons(s),
  };
}
