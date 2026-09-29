import type { GameState } from '../../state/types';
import type { ConditionKey } from '../../data/eventCatalogueTypes';
import type { PromiseDef } from '../../data/promiseData';
import { MONEY_CONDITIONS, REPUTATION_SCALE, conditionReading, priceScale } from '../events/catalogue';
import { RUNG_NAMES } from '../finance/distress';
import { count, moneyShort, pct, prestigeFigure, satisfactionFigure } from '../../format';

// A promise's target, in words (Plan 80C): the measure, the figure, the
// summer it is judged and where the college stands now. "Admit rate 25% or
// lower at the summer of Year 14. Now 36%." Each goal key the promises use
// has its words here; test/promise-targets.test.ts holds every goal to it.
//
// `target` takes the goal's bound as whenMet reads it (money already at the
// promise's scale); `now` takes conditionReading's value, and `named` is the
// reading with its measure, for a goal of two parts.
interface GoalWords {
  target: (bound: number) => string;
  now: (value: number) => string;
  named?: (value: number) => string;
}

const plural = (n: number, one: string, many: string) => `${count(n)} ${n === 1 ? one : many}`;
// A count goal: "4 schools or more", now "2" (named "2 schools").
const counted = (one: string, many: string): GoalWords => ({
  target: (n) => `${plural(n, one, many)} or more`,
  now: (v) => count(v),
  named: (v) => plural(v, one, many),
});
// A figure out of 100 goal: "Campus beauty 72 or more", now "64".
const scored = (measure: string): GoalWords => ({
  target: (n) => `${measure} ${count(n)} or more`,
  now: (v) => String(Math.floor(v)),
  named: (v) => `${measure.toLowerCase()} ${Math.floor(v)}`,
});
// Money under $1,000 is v2's "none at all" (debtUnder: 1).
const NONE_BELOW = 1_000;

export const GOAL_WORDS: Partial<Record<ConditionKey, GoalWords>> = {
  schoolsOver: counted('school', 'schools'),
  enrolledOver: counted('student', 'students'),
  alumniOver: counted('graduate on the rolls', 'graduates on the rolls'),
  facultyOver: counted('professor', 'faculty'),
  programsOver: counted('program', 'programs'),
  buildingsOver: counted('structure', 'structures'),
  projectsOver: {
    target: (n) => (n <= 1 ? 'A capital project standing' : `${count(n)} capital projects standing`),
    now: (v) => (v === 0 ? 'none' : count(v)),
    named: (v) => plural(v, 'capital project', 'capital projects'),
  },
  endowmentOver: {
    target: (n) => `An endowment of ${moneyShort(n)} or more`,
    now: moneyShort,
    named: (v) => `an endowment of ${moneyShort(v)}`,
  },
  cashOver: {
    target: (n) => `Cash of ${moneyShort(n)} or more`,
    now: moneyShort,
    named: (v) => `cash of ${moneyShort(v)}`,
  },
  debtUnder: {
    target: (n) => (n < NONE_BELOW ? 'Nothing borrowed' : `Borrowing of ${moneyShort(n)} or less`),
    now: (v) => (v < 1 ? 'nothing owed' : `${moneyShort(v)} owed`),
  },
  backlogUnder: {
    target: (n) => (n < NONE_BELOW ? 'No building with work outstanding' : `Work outstanding of ${moneyShort(n)} or less`),
    now: (v) => (v < 1 ? 'none outstanding' : `${moneyShort(v)} of work outstanding`),
  },
  teachingOver: scored('Average course grade'),
  beautyOver: scored('Campus beauty'),
  warmthOver: scored('Alumni warmth'),
  satisfactionOver: {
    target: (n) => `Satisfaction ${count(n)} or more`,
    now: satisfactionFigure,
    named: (v) => `satisfaction ${satisfactionFigure(v)}`,
  },
  // The reading is 1 − the admit rate.
  selectivityOver: {
    target: (n) => `Admit rate ${pct(1 - n)} or lower`,
    now: (v) => pct(1 - v),
    named: (v) => `an admit rate of ${pct(1 - v)}`,
  },
  // v2's reputation, shown as the prestige it is.
  reputationOver: {
    target: (n) => `Prestige ${prestigeFigure(n * REPUTATION_SCALE)} or more`,
    now: (v) => prestigeFigure(v * REPUTATION_SCALE),
    named: (v) => `prestige ${prestigeFigure(v * REPUTATION_SCALE)}`,
  },
  rankAtMost: {
    target: (n) => `#${n} or better in the guide`,
    now: (v) => `#${v}`,
  },
  rungAtMost: {
    target: (n) => (n <= 0 ? `${RUNG_NAMES[0]} on the board's scale` : `${RUNG_NAMES[n]} or better on the board's scale`),
    now: (v) => RUNG_NAMES[v] ?? String(v),
  },
};

// The goal's parts, each with its words: a part without words is left out
// (the test forbids one).
function parts(def: PromiseDef): [ConditionKey, number, GoalWords][] {
  return (Object.entries(def.goal) as [ConditionKey, number][])
    .flatMap(([k, v]) => (GOAL_WORDS[k] ? [[k, v, GOAL_WORDS[k]!] as [ConditionKey, number, GoalWords]] : []));
}

const lower = (text: string) => text[0].toLowerCase() + text.slice(1);

// "Admit rate 25% or lower at the summer of Year 14." `scale` is the one the
// promise is held to (PromiseState's), so a money target is the figure it
// will be judged by.
export function promiseTarget(def: PromiseDef, dueYear: number, scale: number): string {
  const said = parts(def).map(([k, v, w]) => w.target(MONEY_CONDITIONS.has(k) ? v * scale : v));
  const joined = said.map((t, i) => (i === 0 ? t : lower(t))).join(' and ');
  return `${joined} at the summer of Year ${dueYear}.`;
}

// "Now 36%." For a goal of two parts, each with its measure.
export function promiseNow(s: GameState, def: PromiseDef): string {
  const ps = parts(def);
  const read = ps.map(([k, , w]) => {
    const v = conditionReading(s, k);
    return ps.length > 1 && w.named ? w.named(v) : w.now(v);
  });
  const joined = read.join(' and ');
  return `Now ${joined}.`;
}

// Both, as the offer and the Promises panel show them.
export function promiseTargetLine(s: GameState, def: PromiseDef, dueYear: number, scale = priceScale(s)): string {
  return `${promiseTarget(def, dueYear, scale)} ${promiseNow(s, def)}`;
}
