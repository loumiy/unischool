import type { Faculty, GameState, LogEntry } from '../state/types';
import { WEEKS_PER_YEAR } from '../state/types';
import { FACULTY_FIELDS, generateCandidate } from './facultyData';
import { milestoneSchools } from './techData';

// ---------------------------------------------------------------------
// WEEK-TO-WEEK TEXTURE, AS AUTHORED DATA.
//
// Two things live here, and both ride entirely on the existing interrupt
// system (see README's "Interrupts: the decision-event system"). Neither
// is new core machinery: systems/events/eventSystem.ts is one ordinary
// pure tick function that reads this table and sets s.pendingInterrupt,
// exactly the way admissions and the U.S. News report already do.
//
//  1. MILESTONE CELEBRATIONS — a stop-the-clock moment for the handful of
//     genuinely special accomplishments (a major finished, a major
//     mastered, a school fully distinguished). Routine course completions
//     never qualify: which milestone kinds stop the clock is one named
//     constant (MILESTONE_INTERRUPT_KINDS) and how close together two
//     celebrations may land is another (MILESTONE_INTERRUPT_MIN_WEEKS
//     _BETWEEN), so the frequency is a one-line dial.
//
//  2. AUTHORED DECISION EVENTS — the donor offers, faculty departures and
//     facility failures that give the quiet weeks between milestones
//     something to react to. Content, not mechanism: each entry below is a
//     trigger condition, a prompt, and two or three choices whose effects
//     are routed through hooks that already exist — cash and endowment
//     (financeSystem.ts), student satisfaction (satisfactionSystem.ts's
//     drifting stock), the faculty roster and the hiring pool
//     (facultySystem.ts). Nothing here reaches for a new subsystem.
//
// WHAT A CHOICE MAY AND MAY NOT TOUCH:
//   - Prestige is deliberately never written directly. s.self.reputation
//     is a slow-moving STOCK that only ever drifts toward a computed
//     target once a year (see prestigeSystem.ts), and an event that
//     nudged it would be exactly the completion-bonus flow that model
//     exists to forbid. Events that are thematically "about" prestige
//     therefore pay into the ENDOWMENT, which is a real, capped input to
//     the prestige target — money buys standing slowly and expensively,
//     the same way an endowment campaign does.
//   - s.students.applicantPool is not used as a payoff either: the summer
//     funnel overwrites it wholesale every year (see the reducer's
//     RESOLVE_ADMISSIONS), so a bonus there is a number on a panel rather
//     than a consequence.
//   - Satisfaction hits are real but TRANSIENT by construction: the
//     headline number drifts back toward its facilities-derived target at
//     SATISFACTION_DRIFT_RATE a week, so a hit taken in week 10 has
//     mostly healed by week 40 — while a hit taken just before the summer
//     funnel costs real applicants through word of mouth. Timing is the
//     teeth; permanence is not.
//
// NO-SOFT-LOCK INVARIANT: every event must offer at least one choice that
// costs nothing, so a school with no cash always has a way out of every
// event it is shown. eventSystem.ts enforces this at fire time rather
// than trusting the table (see hasFreeChoice below) — a paid-only event
// simply never fires.
// ---------------------------------------------------------------------

// Weeks since founding, counting from 1. The one place the two-field
// clock is flattened into a single comparable number, so "how long since
// the last event" is subtraction rather than calendar arithmetic.
export function absoluteWeek(s: GameState): number {
  return (s.clock.year - 1) * WEEKS_PER_YEAR + s.clock.week;
}

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function money(n: number): string {
  return `$${Math.round(n).toLocaleString()}`;
}

// =====================================================================
// MILESTONE CELEBRATIONS — which accomplishments stop the clock
// =====================================================================

// The milestone keys techSystem.ts awards are `<kind>:<subject>`. Only
// these kinds are special enough to interrupt play. Every one of them is
// an aggregate accomplishment — a whole major, or a whole school — never
// a single course finishing, which is what keeps this from becoming the
// pop-up-every-few-weeks failure mode. Dial it down by removing entries
// (leaving only 'school-complete' fires roughly seven times in a full
// 330-course run); dial it up by adding kinds as they are invented.
export const MILESTONE_INTERRUPT_KINDS: readonly string[] = [
  'major-complete',
  'major-mastered',
  'school-complete',
];

// The floor on how close together two celebrations may land. Milestones
// that arrive inside the window are NOT dropped — they queue on
// s.events.pendingMilestones and are folded into the next celebration, so
// a burst of four majors finishing in the same month is one modal listing
// four accomplishments rather than four modals.
export const MILESTONE_INTERRUPT_MIN_WEEKS_BETWEEN = 12;

export function milestoneKind(key: string): string {
  return key.split(':')[0];
}

// Does this milestone deserve a stop-the-clock moment? Called by
// techSystem.ts as it awards, so the queue only ever holds keys that will
// actually be celebrated.
export function isCelebratedMilestone(key: string): boolean {
  return MILESTONE_INTERRUPT_KINDS.includes(milestoneKind(key));
}

// One line of the celebration modal. Derived from the milestone key at
// CELEBRATION time rather than captured when the milestone was awarded,
// so a queued celebration says the same true thing whether it fires the
// same week or six weeks later.
export interface MilestoneEntry {
  key: string;
  headline: string;
  detail: string;
  unlocks: string[]; // names of what this milestone opened up, if anything
}

export interface MilestonePayload {
  keys: string[];          // the milestone keys being celebrated — the modal asks prestigeSystem what they are worth
  entries: MilestoneEntry[];
}

function nameOf(s: GameState, id: string): string {
  return s.tech.find((t) => t.id === id)?.name ?? id;
}

export function describeMilestone(s: GameState, key: string): MilestoneEntry | null {
  const kind = milestoneKind(key);
  const subject = key.slice(key.indexOf(':') + 1); // the major prefix, or the school name

  if (kind === 'school-complete') {
    return {
      key,
      headline: `${subject} is fully distinguished`,
      detail: 'Every major in the school is complete and mastered. A finished school is the heaviest single contribution curriculum breadth can make to the prestige target.',
      unlocks: [],
    };
  }

  for (const school of milestoneSchools()) {
    for (const major of school.majors) {
      if (major.prefix !== subject) continue;
      if (kind === 'major-complete') {
        return {
          key,
          headline: `${major.name} is now a complete major`,
          detail: `Every tier-2 course in ${major.name} (${school.schoolName}) is finished. The major counts toward curriculum breadth from now on — the largest input to the prestige target — and its tier-3 catalogue is open.`,
          unlocks: major.tier3Ids.map((id) => nameOf(s, id)),
        };
      }
      if (kind === 'major-mastered') {
        return {
          key,
          headline: `${major.name} fully mastered`,
          detail: `All nine courses in ${major.name} (${school.schoolName}) are done. Mastery is a further, separate share of curriculum breadth on top of completing the major.`,
          unlocks: [],
        };
      }
    }
  }
  return null;
}

// =====================================================================
// AUTHORED DECISION EVENTS — the trigger model
// =====================================================================
//
// WEIGHTED RANDOM, GATED BY GAME STATE. Every week that no other
// interrupt is pending, the system rolls DECISION_EVENT_WEEKLY_CHANCE. On
// a hit it collects every event whose `eligible` condition the current
// state satisfies (and whose per-event cooldown and fire cap have
// cleared), then draws one weighted by `weight`. The weights set the mix;
// the conditions set what can appear at all at this stage of the run.
//
// The two global constants below are the frequency dial. At the values
// shipped here the expected gap between events is the cooldown plus
// 1/chance — about 33 weeks, so a bit over one event a year, against two
// fixed annual interrupts (summer admissions, the U.S. News report). Rare
// enough to read as an event; frequent enough that a decade of play has
// texture.
// =====================================================================

export const DECISION_EVENT_FIRST_YEAR = 3;             // nothing fires during the founding ramp — year 1-2 is the tutorial-by-design stretch
export const DECISION_EVENT_WEEKLY_CHANCE = 0.03;      // per quiet week, once the cooldown has cleared
export const DECISION_EVENT_COOLDOWN_WEEKS = 20;        // minimum quiet stretch between ANY two decision events
export const DECISION_EVENT_REPEAT_COOLDOWN_WEEKS = 156; // the same event may not return inside three years

// Money in this table is expressed in WEEKS OF OPERATING COST rather than
// dollars, so every figure scales itself across a run that spans four
// orders of magnitude of budget (see financeSystem.ts's stage table: ~$45k
// a week at founding, ~$7.5M a week late). A repair worth "1.5 weeks of
// opex" is a real but survivable bill at every stage; a flat $200k would
// be a crisis in year 3 and a rounding error in year 40.
const MIN_OPEX_SCALE = 45_000; // floor, so the very first eligible year still produces sane figures

function weeksOfOpEx(s: GameState, weeks: number): number {
  return Math.round(Math.max(s.finance.weeklyOpEx, MIN_OPEX_SCALE) * weeks);
}

// A rolled figure is fixed at FIRE time and carried in the interrupt
// payload (see DecisionEventContext.amount), never re-rolled at resolve
// time — the number in the modal is the number that is applied, the same
// contract the admissions preview and the endowment campaign follow.
function rollAmount(s: GameState, minWeeks: number, maxWeeks: number): number {
  return weeksOfOpEx(s, minWeeks + Math.random() * (maxWeeks - minWeeks));
}

// Whatever the event rolled about itself when it fired. Plain JSON: it
// rides in s.pendingInterrupt.payload and therefore through save/load.
export interface DecisionEventContext {
  subjectId?: string;    // a faculty id, or a Buildable id
  subjectName?: string;  // that subject's display name, resolved when the event fired
  subjectField?: string; // a Faculty field, for events that are about a discipline rather than a person
  amount?: number;       // a rolled sum of money, fixed at fire time
}

export interface DecisionChoice {
  id: string;
  label: string;
  // What taking this choice does, in numbers, given the state it was
  // offered against. Rendered in the modal and never recomputed after —
  // apply() below does exactly what this says.
  describe(s: GameState, ctx: DecisionEventContext): string;
  // Cash charged up front. 0 for a free choice; every event must have one
  // (see the no-soft-lock invariant at the top of this file). A choice the
  // school cannot afford is offered disabled and refused by the reducer,
  // the same way an unaffordable Buildable is simply not startable.
  cost(s: GameState, ctx: DecisionEventContext): number;
  // Mutates shared state through existing hooks only, and returns the log
  // line. The cash cost above is charged by the reducer, not here.
  apply(s: GameState, ctx: DecisionEventContext): LogEntry;
}

export interface DecisionEvent {
  id: string;
  title: string;
  weight: number;                     // relative draw weight among everything eligible this week
  maxFires?: number;                  // omitted = unlimited (subject to DECISION_EVENT_REPEAT_COOLDOWN_WEEKS)
  prompt(s: GameState, ctx: DecisionEventContext): string;
  // Can this event happen at all right now? Pure, reads state only.
  eligible(s: GameState): boolean;
  // Rolls whatever this event needs to know about itself. Returning null
  // means "not actually possible this week" — the draw simply moves on, so
  // an event can express a condition that is easier to check while picking
  // a subject than in eligible() above.
  rollContext?(s: GameState): DecisionEventContext | null;
  choices: DecisionChoice[];
}

function entry(s: GameState, message: string, kind: LogEntry['kind']): LogEntry {
  return { year: s.clock.year, week: s.clock.week, message, kind };
}

// Satisfaction is a drifting stock, so a hit here is a morale dent that
// heals over the following weeks rather than a permanent tax — see the
// note at the top of this file.
function dentSatisfaction(s: GameState, points: number): void {
  s.students.satisfaction = clamp(s.students.satisfaction - points, 0, 100);
}

function doneBuildings(s: GameState) {
  return s.tech.filter((t) => t.kind === 'building' && t.status === 'done');
}

function doneDiningHalls(s: GameState) {
  return s.tech.filter((t) => t.facilityType === 'diningHall' && t.status === 'done');
}

// A faculty member may only be put at risk by an event when their field
// has depth behind them. This is the whole reason no departure or
// dismissal can strand the curriculum: losing the only Economics hire
// would leave every Economics course unstartable until a posting cleared,
// so events never offer that. Losing one of two is a real cost — a course
// slot and a mature stat line — that the player can absorb or buy off.
const EVENT_MIN_FIELD_DEPTH = 2;

function facultyAtRisk(s: GameState): Faculty[] {
  const depth = new Map<string, number>();
  for (const f of s.faculty) depth.set(f.field, (depth.get(f.field) ?? 0) + 1);
  return s.faculty.filter((f) => (depth.get(f.field) ?? 0) >= EVENT_MIN_FIELD_DEPTH);
}

function removeFaculty(s: GameState, id: string | undefined): void {
  s.faculty = s.faculty.filter((f) => f.id !== id);
}

// --- per-event tuning ------------------------------------------------
const ESTATE_GIFT_MIN_WEEKS = 2;          // gift size, in weeks of opex
const ESTATE_GIFT_MAX_WEEKS = 5;
const ESTATE_GIFT_ENDOWED_MULTIPLIER = 1.7; // the donor gives more if it is endowed rather than spent

const NAMING_RIGHTS_MIN_WEEKS = 4;
const NAMING_RIGHTS_MAX_WEEKS = 8;
const NAMING_RIGHTS_PRESTIGE_GATE = 40;   // nobody buys naming rights at a school nobody has heard of
const NAMING_RIGHTS_SATISFACTION_HIT = 5;

const RETENTION_PACKAGE_SALARY_SHARE = 0.6; // a lump sum, as a share of the hire's current annual salary

const VISITING_SCHOLAR_PRESTIGE_GATE = 55;
const VISITING_SCHOLAR_COST_WEEKS = 3;
const VISITING_SCHOLAR_CANDIDATE_ROLLS = 4; // best of N rolls — a genuinely strong hire, not just a free one

const ROOF_REPAIR_COST_WEEKS = 1.5;
const ROOF_DEFERRAL_SATISFACTION_HIT = 5;

const DINING_REMEDIATION_COST_WEEKS = 1.2;
const DINING_DEFERRAL_SATISFACTION_HIT = 8; // basic needs is the heaviest satisfaction attribute — this one bites

const HEATING_PLANT_COST_WEEKS = 2.5;
const HEATING_PLANT_CAPACITY_GATE = 800;
const HEATING_DEFERRAL_SATISFACTION_HIT = 6;

const STATE_MATCH_FIRST_YEAR = 5;
const STATE_MATCH_COMMITMENT_WEEKS = 3;
const STATE_MATCH_MULTIPLIER = 2.5;       // the legislature's match on the school's own commitment

const STORM_CAPACITY_GATE = 500;
const STORM_FULL_REPAIR_WEEKS = 2.2;
const STORM_PARTIAL_SHARE = 0.45;         // share of the full bill a patch job costs
const STORM_PARTIAL_SATISFACTION_HIT = 3;
const STORM_DEFERRAL_SATISFACTION_HIT = 9;

const SCANDAL_DEFENCE_COST_WEEKS = 1.5;
const SCANDAL_DEFENCE_SATISFACTION_HIT = 3; // students protest the school standing behind them
const SCANDAL_DISMISSAL_SATISFACTION_GAIN = 2;

// =====================================================================
// THE TABLE. Ten authored events. Trigger conditions are deliberately
// state-driven rather than calendar-driven: a donor shows up once the
// school is worth donating to, a heating plant fails once there is a
// campus big enough to have one. That is the same "reveal on thresholds
// the loop already produces" rule the README applies to buildings.
// =====================================================================
export const DECISION_EVENTS: readonly DecisionEvent[] = [
  {
    id: 'estate-gift',
    title: 'An estate gift',
    weight: 10,
    eligible: () => true,
    rollContext: (s) => ({ amount: rollAmount(s, ESTATE_GIFT_MIN_WEEKS, ESTATE_GIFT_MAX_WEEKS) }),
    prompt: (_s, ctx) =>
      `The estate of a long-dead alumna has closed, and the university is named in the will. The executors will release ${money(ctx.amount ?? 0)} as unrestricted cash, or — if the school agrees to hold it in perpetuity as a named fund — considerably more.`,
    choices: [
      {
        id: 'cash',
        label: 'Take it as unrestricted cash',
        describe: (_s, ctx) => `${money(ctx.amount ?? 0)} into the operating account this week.`,
        cost: () => 0,
        apply: (s, ctx) => {
          const amount = ctx.amount ?? 0;
          s.finance.cash += amount;
          return entry(s, `Estate gift accepted: ${money(amount)} in unrestricted cash.`, 'good');
        },
      },
      {
        id: 'endow',
        label: 'Endow it as a named fund',
        describe: (_s, ctx) =>
          `${money((ctx.amount ?? 0) * ESTATE_GIFT_ENDOWED_MULTIPLIER)} into the endowment. No cash this week; it pays out every year from now on, and feeds the financial-resources input to prestige.`,
        cost: () => 0,
        apply: (s, ctx) => {
          const endowed = Math.round((ctx.amount ?? 0) * ESTATE_GIFT_ENDOWED_MULTIPLIER);
          s.finance.endowment += endowed;
          return entry(s, `Estate gift endowed: ${money(endowed)} added to the endowment in perpetuity.`, 'good');
        },
      },
    ],
  },

  {
    id: 'naming-rights',
    title: 'A naming-rights offer',
    weight: 8,
    eligible: (s) => s.self.reputation >= NAMING_RIGHTS_PRESTIGE_GATE && doneBuildings(s).length > 0,
    rollContext: (s) => {
      const buildings = doneBuildings(s);
      if (buildings.length === 0) return null;
      const target = pick(buildings);
      return {
        subjectId: target.id,
        subjectName: target.name,
        amount: rollAmount(s, NAMING_RIGHTS_MIN_WEEKS, NAMING_RIGHTS_MAX_WEEKS),
      };
    },
    prompt: (_s, ctx) =>
      `A regional holding company will pay ${money(ctx.amount ?? 0)} to put its name on ${ctx.subjectName}. The cheque clears immediately. The student paper has already written the editorial.`,
    choices: [
      {
        id: 'sign',
        label: 'Sign the agreement',
        describe: (_s, ctx) =>
          `${money(ctx.amount ?? 0)} in cash now, and a ${NAMING_RIGHTS_SATISFACTION_HIT}-point dent in student satisfaction that heals over the following weeks.`,
        cost: () => 0,
        apply: (s, ctx) => {
          s.finance.cash += ctx.amount ?? 0;
          dentSatisfaction(s, NAMING_RIGHTS_SATISFACTION_HIT);
          return entry(s, `Naming rights sold on ${ctx.subjectName}: ${money(ctx.amount ?? 0)} banked, students unimpressed.`, 'info');
        },
      },
      {
        id: 'decline',
        label: 'Turn it down',
        describe: () => 'Nothing changes. The building keeps its name.',
        cost: () => 0,
        apply: (s, ctx) => entry(s, `Naming-rights offer on ${ctx.subjectName} declined.`, 'info'),
      },
    ],
  },

  {
    id: 'faculty-outside-offer',
    title: 'An outside offer',
    weight: 11,
    eligible: (s) => facultyAtRisk(s).length > 0,
    rollContext: (s) => {
      const candidates = facultyAtRisk(s);
      if (candidates.length === 0) return null;
      const target = pick(candidates);
      return {
        subjectId: target.id,
        subjectName: target.name,
        subjectField: target.field,
        amount: Math.round(target.salary * RETENTION_PACKAGE_SALARY_SHARE),
      };
    },
    prompt: (_s, ctx) =>
      `${ctx.subjectName} (${ctx.subjectField}) has an offer from a better-funded department and is, politely, telling you before accepting it. A retention package of ${money(ctx.amount ?? 0)} would settle it.`,
    choices: [
      {
        id: 'retain',
        label: 'Fund the retention package',
        describe: (_s, ctx) =>
          `${money(ctx.amount ?? 0)} up front. ${ctx.subjectName} stays, keeps accruing tenure, and keeps their course slots.`,
        cost: (_s, ctx) => ctx.amount ?? 0,
        apply: (s, ctx) => entry(s, `${ctx.subjectName} retained for ${money(ctx.amount ?? 0)}.`, 'good'),
      },
      {
        id: 'release',
        label: 'Wish them well',
        describe: (_s, ctx) =>
          `${ctx.subjectName} leaves this week. Their salary comes off the payroll, and their ${ctx.subjectField} course slots go with them — courses already running are unaffected, but new ones in that field wait on a hire.`,
        cost: () => 0,
        apply: (s, ctx) => {
          removeFaculty(s, ctx.subjectId);
          return entry(s, `${ctx.subjectName} has left for another university.`, 'bad');
        },
      },
    ],
  },

  {
    id: 'visiting-scholar',
    title: 'A distinguished visitor',
    weight: 6,
    eligible: (s) => s.self.reputation >= VISITING_SCHOLAR_PRESTIGE_GATE,
    rollContext: (s) => ({ subjectField: pick(FACULTY_FIELDS), amount: weeksOfOpEx(s, VISITING_SCHOLAR_COST_WEEKS) }),
    prompt: (_s, ctx) =>
      `A well-regarded ${ctx.subjectField} scholar is between appointments and would consider a chair here — but only if the school funds the visit properly, at ${money(ctx.amount ?? 0)}.`,
    choices: [
      {
        id: 'fund',
        label: 'Fund the chair',
        describe: (_s, ctx) =>
          `${money(ctx.amount ?? 0)} up front. A strong ${ctx.subjectField} candidate joins the hiring pool immediately — no posting fee, no wait — and still has to be hired and paid like anyone else.`,
        cost: (_s, ctx) => ctx.amount ?? 0,
        apply: (s, ctx) => {
          const field = ctx.subjectField ?? pick(FACULTY_FIELDS);
          const existing = [...s.faculty, ...s.candidates].map((f) => f.name);
          // Best of N rolls: the point of paying for a visiting chair is
          // that it is reliably better than a posting, not merely faster.
          let best = generateCandidate(field, existing);
          for (let i = 1; i < VISITING_SCHOLAR_CANDIDATE_ROLLS; i += 1) {
            const next = generateCandidate(field, [...existing, best.name]);
            if (next.teachingPotential + next.researchPotential > best.teachingPotential + best.researchPotential) best = next;
          }
          s.candidates.push(best);
          return entry(s, `${best.name} (${field}) has accepted a visiting chair and is available to hire.`, 'good');
        },
      },
      {
        id: 'pass',
        label: 'Pass',
        describe: () => 'Nothing changes. They take the other offer.',
        cost: () => 0,
        apply: (s, ctx) => entry(s, `Passed on the visiting ${ctx.subjectField} chair.`, 'info'),
      },
    ],
  },

  {
    id: 'roof-failure',
    title: 'A roof gives way',
    weight: 9,
    eligible: (s) => doneBuildings(s).length > 0,
    rollContext: (s) => {
      const buildings = doneBuildings(s);
      if (buildings.length === 0) return null;
      const target = pick(buildings);
      return { subjectId: target.id, subjectName: target.name, amount: weeksOfOpEx(s, ROOF_REPAIR_COST_WEEKS) };
    },
    prompt: (_s, ctx) =>
      `Two decades of deferred maintenance have caught up with ${ctx.subjectName}: the roof is failing over the east wing. Facilities wants ${money(ctx.amount ?? 0)} to do it properly this term.`,
    choices: [
      {
        id: 'repair',
        label: 'Repair it now',
        describe: (_s, ctx) => `${money(ctx.amount ?? 0)} out of this week's cash. Nobody notices, which is the point.`,
        cost: (_s, ctx) => ctx.amount ?? 0,
        apply: (s, ctx) => entry(s, `Roof replaced on ${ctx.subjectName} for ${money(ctx.amount ?? 0)}.`, 'info'),
      },
      {
        id: 'defer',
        label: 'Buckets and tarpaulins',
        describe: () =>
          `No cash spent. Student satisfaction takes a ${ROOF_DEFERRAL_SATISFACTION_HIT}-point dent, which drifts back over the following weeks — unless the summer funnel arrives first.`,
        cost: () => 0,
        apply: (s, ctx) => {
          dentSatisfaction(s, ROOF_DEFERRAL_SATISFACTION_HIT);
          return entry(s, `Repairs on ${ctx.subjectName} deferred; the east wing is under tarpaulins.`, 'bad');
        },
      },
    ],
  },

  {
    id: 'dining-inspection',
    title: 'A failed health inspection',
    weight: 8,
    eligible: (s) => doneDiningHalls(s).length > 0,
    rollContext: (s) => {
      const halls = doneDiningHalls(s);
      if (halls.length === 0) return null;
      const target = pick(halls);
      return { subjectId: target.id, subjectName: target.name, amount: weeksOfOpEx(s, DINING_REMEDIATION_COST_WEEKS) };
    },
    prompt: (_s, ctx) =>
      `The county has cited ${ctx.subjectName} — refrigeration, mostly, and a ventilation hood nobody has looked at in years. Full remediation runs ${money(ctx.amount ?? 0)}; the alternative is a limited menu until further notice.`,
    choices: [
      {
        id: 'remediate',
        label: 'Remediate in full',
        describe: (_s, ctx) => `${money(ctx.amount ?? 0)} now, and the kitchen reopens at full service.`,
        cost: (_s, ctx) => ctx.amount ?? 0,
        apply: (s, ctx) => entry(s, `${ctx.subjectName} remediated for ${money(ctx.amount ?? 0)}; citation cleared.`, 'info'),
      },
      {
        id: 'limited',
        label: 'Run a limited menu',
        describe: () =>
          `No cash spent, and ${DINING_DEFERRAL_SATISFACTION_HIT} points off student satisfaction — the sharpest of the campus-life dents, because eating is the need students notice fastest.`,
        cost: () => 0,
        apply: (s, ctx) => {
          dentSatisfaction(s, DINING_DEFERRAL_SATISFACTION_HIT);
          return entry(s, `${ctx.subjectName} on a limited menu indefinitely; students are not quiet about it.`, 'bad');
        },
      },
    ],
  },

  {
    id: 'heating-plant',
    title: 'The heating plant fails',
    weight: 8,
    eligible: (s) => s.students.capacity >= HEATING_PLANT_CAPACITY_GATE,
    rollContext: (s) => ({ amount: weeksOfOpEx(s, HEATING_PLANT_COST_WEEKS) }),
    prompt: (_s, ctx) =>
      `The central plant's oldest boiler has cracked, three weeks into the cold. Replacing it costs ${money(ctx.amount ?? 0)}. The residence halls are on the same loop.`,
    choices: [
      {
        id: 'replace',
        label: 'Replace the boiler',
        describe: (_s, ctx) => `${money(ctx.amount ?? 0)} now. Heat stays on across the residence halls.`,
        cost: (_s, ctx) => ctx.amount ?? 0,
        apply: (s, ctx) => entry(s, `Boiler replaced for ${money(ctx.amount ?? 0)}; the plant is whole again.`, 'info'),
      },
      {
        id: 'space-heaters',
        label: 'Issue space heaters',
        describe: () => `No cash spent. A ${HEATING_DEFERRAL_SATISFACTION_HIT}-point satisfaction dent, and a winter nobody forgets.`,
        cost: () => 0,
        apply: (s) => {
          dentSatisfaction(s, HEATING_DEFERRAL_SATISFACTION_HIT);
          return entry(s, 'Space heaters issued to the residence halls for the winter.', 'bad');
        },
      },
    ],
  },

  {
    id: 'state-capital-match',
    title: 'A legislative capital match',
    weight: 7,
    // Public schools only — the one place an authored event reads the
    // single starting fork (see README's "Startup and school type").
    eligible: (s) => s.self.schoolType === 'public' && s.clock.year >= STATE_MATCH_FIRST_YEAR,
    rollContext: (s) => ({ amount: weeksOfOpEx(s, STATE_MATCH_COMMITMENT_WEEKS) }),
    prompt: (_s, ctx) =>
      `The state's capital committee has a matching programme with money left in it this biennium: commit ${money(ctx.amount ?? 0)} of the school's own funds and the state will match it several times over — into a restricted endowment, not into your operating account.`,
    choices: [
      {
        id: 'commit',
        label: 'Commit the match',
        describe: (_s, ctx) =>
          `${money(ctx.amount ?? 0)} out of cash now, ${money((ctx.amount ?? 0) * (1 + STATE_MATCH_MULTIPLIER))} into the endowment — permanent income, and a slow contribution to prestige.`,
        cost: (_s, ctx) => ctx.amount ?? 0,
        apply: (s, ctx) => {
          const endowed = Math.round((ctx.amount ?? 0) * (1 + STATE_MATCH_MULTIPLIER));
          s.finance.endowment += endowed;
          return entry(s, `State capital match taken up: ${money(endowed)} added to the endowment.`, 'good');
        },
      },
      {
        id: 'lapse',
        label: 'Let it lapse',
        describe: () => 'Nothing changes. The money goes to another campus in the system.',
        cost: () => 0,
        apply: (s) => entry(s, 'The state capital match lapsed unclaimed.', 'info'),
      },
    ],
  },

  {
    id: 'winter-storm',
    title: 'A storm crosses the campus',
    weight: 7,
    eligible: (s) => s.students.capacity >= STORM_CAPACITY_GATE,
    rollContext: (s) => ({ amount: weeksOfOpEx(s, STORM_FULL_REPAIR_WEEKS) }),
    prompt: (_s, ctx) =>
      `An overnight storm has taken out glazing, two transformers and most of the campus's trees. A full restoration is ${money(ctx.amount ?? 0)}; facilities can also do the safety-critical half and leave the rest until summer.`,
    choices: [
      {
        id: 'full',
        label: 'Restore everything now',
        describe: (_s, ctx) => `${money(ctx.amount ?? 0)} out of cash. The campus looks like nothing happened.`,
        cost: (_s, ctx) => ctx.amount ?? 0,
        apply: (s, ctx) => entry(s, `Storm damage fully restored for ${money(ctx.amount ?? 0)}.`, 'info'),
      },
      {
        id: 'partial',
        label: 'Safety-critical work only',
        describe: (_s, ctx) =>
          `${money((ctx.amount ?? 0) * STORM_PARTIAL_SHARE)} now and a ${STORM_PARTIAL_SATISFACTION_HIT}-point satisfaction dent while the rest waits for summer.`,
        cost: (_s, ctx) => Math.round((ctx.amount ?? 0) * STORM_PARTIAL_SHARE),
        apply: (s, ctx) => {
          dentSatisfaction(s, STORM_PARTIAL_SATISFACTION_HIT);
          return entry(s, `Storm: safety-critical repairs done for ${money((ctx.amount ?? 0) * STORM_PARTIAL_SHARE)}, the rest deferred to summer.`, 'info');
        },
      },
      {
        id: 'defer',
        label: 'Board it up and wait',
        describe: () => `No cash spent, and ${STORM_DEFERRAL_SATISFACTION_HIT} points off student satisfaction — the largest dent in the table.`,
        cost: () => 0,
        apply: (s) => {
          dentSatisfaction(s, STORM_DEFERRAL_SATISFACTION_HIT);
          return entry(s, 'Storm damage boarded up and left; the campus spends the term in plywood.', 'bad');
        },
      },
    ],
  },

  {
    id: 'faculty-scandal',
    title: 'A faculty controversy',
    weight: 5,
    eligible: (s) => facultyAtRisk(s).length > 0,
    rollContext: (s) => {
      const candidates = facultyAtRisk(s);
      if (candidates.length === 0) return null;
      const target = pick(candidates);
      return {
        subjectId: target.id,
        subjectName: target.name,
        subjectField: target.field,
        amount: weeksOfOpEx(s, SCANDAL_DEFENCE_COST_WEEKS),
      };
    },
    prompt: (_s, ctx) =>
      `${ctx.subjectName} (${ctx.subjectField}) is at the centre of a public controversy. Counsel and a communications firm want ${money(ctx.amount ?? 0)} to see it through; the student body would rather the school simply parted ways.`,
    choices: [
      {
        id: 'defend',
        label: 'Stand behind them',
        describe: (_s, ctx) =>
          `${money(ctx.amount ?? 0)} in legal and communications costs. ${ctx.subjectName} stays on the roster; satisfaction takes a ${SCANDAL_DEFENCE_SATISFACTION_HIT}-point dent.`,
        cost: (_s, ctx) => ctx.amount ?? 0,
        apply: (s, ctx) => {
          dentSatisfaction(s, SCANDAL_DEFENCE_SATISFACTION_HIT);
          return entry(s, `The university has stood behind ${ctx.subjectName}; the campus is divided.`, 'info');
        },
      },
      {
        id: 'dismiss',
        label: 'Part ways',
        describe: (_s, ctx) =>
          `No cash spent. ${ctx.subjectName} is off the roster and off the payroll, their ${ctx.subjectField} course slots with them, and the student body approves.`,
        cost: () => 0,
        apply: (s, ctx) => {
          removeFaculty(s, ctx.subjectId);
          s.students.satisfaction = clamp(s.students.satisfaction + SCANDAL_DISMISSAL_SATISFACTION_GAIN, 0, 100);
          return entry(s, `${ctx.subjectName} has been dismissed.`, 'bad');
        },
      },
    ],
  },
];

export function findDecisionEvent(id: string): DecisionEvent | undefined {
  return DECISION_EVENTS.find((e) => e.id === id);
}

// The no-soft-lock invariant, checked at fire time rather than assumed:
// an event with no zero-cost way out never reaches the player.
export function hasFreeChoice(s: GameState, event: DecisionEvent, ctx: DecisionEventContext): boolean {
  return event.choices.some((c) => c.cost(s, ctx) <= 0);
}
