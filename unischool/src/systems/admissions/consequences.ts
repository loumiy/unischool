import type { GameState } from '../../state/types';
import { totalEnrolled } from '../../state/types';
import { advanceClasses, attritionRate, trailingYearSatisfaction } from './admissionsSystem';
import { instructionCoverage } from '../techtree/instructionCapacity';
import { baseShareCohortCounts } from './cohorts';
import { financeBreakdown } from '../finance/financeSystem';
import { attributeCoverage, satisfactionTarget } from '../satisfaction/satisfactionSystem';
import { gradeYear } from '../prestige/prestigeSystem';

// ---------------------------------------------------------------------
// What committing the summer admissions decision would do, to money and to
// how current students feel. Not a model: the shipped state, advanced by
// the shipped advanceClasses (what reducer.ts commits with) and read by the
// shipped readings (financeBreakdown, satisfactionTarget). Keep projection
// arithmetic out of this file, so the preview can never disagree with the
// tick that follows it.
//
// The copy is shallow on purpose: the advance touches only students.classes
// and finance.tuitionByClass, and both readings are pure, so sharing the
// rest can't leak a mutation. Cheap enough to run on every slider frame.
// ---------------------------------------------------------------------

export interface AdmissionsConsequence {
  // The three classes still enrolled plus the incoming class.
  totalEnrolled: number;
  graduating: number;

  // Money, per week, exactly as the Treasury's income statement reads it.
  weeklyNet: number;
  weeklyNetNow: number;
  tuitionRevenue: number;

  // Where satisfaction would be headed (the target, not the sticky stock,
  // which wouldn't move on the day).
  satisfactionTarget: number;
  satisfactionTargetNow: number;

  // The worse-covered of the two capacity needs (attributeCoverage). Here
  // because the satisfaction target stops responding once attributes hit
  // ATTRIBUTE_SCORE_FLOOR, while coverage keeps falling.
  tightestNeed: 'housing' | 'basicNeeds';
  tightestCoverage: number;
  tightestCoverageNow: number;

  // Who won't return this summer, and the two shortfalls most to blame.
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
// Ties go to housing, the need the player can build out of within a year.
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
  // Nothing measured here reads the cohort split, so the incoming mix is the
  // neutral prior; RESOLVE_ADMISSIONS writes the real one.
  const advanced = advanceClasses(
    {
      classes: s.students.classes,
      tuitionByClass: s.finance.tuitionByClass,
      cohortsByClass: s.students.cohortsByClass,
    },
    { count: incoming, price: incomingPrice, cohorts: baseShareCohortCounts(incoming) },
    summerAttrition(s),
  );

  // The summer also steps prestige (reducer.ts applies the report card after
  // the funnel), which the prestige dividend and satisfaction's pride term
  // read, so the projection applies the same step.
  const stepped = gradeYear(s).after;
  const projected: GameState = {
    ...s,
    self: { ...s.self, reputation: stepped },
    students: { ...s.students, classes: advanced.classes, cohortsByClass: advanced.cohortsByClass },
    finance: { ...s.finance, tuitionByClass: advanced.tuitionByClass, listedTuition: incomingPrice },
  };

  // Priced in the year the summer opens (resolveAdmissions.ts advances the
  // clock), which is when the annual fund's classes are a year further out.
  const flow = financeBreakdown({ ...projected, clock: { ...s.clock, year: s.clock.year + 1 } });
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
