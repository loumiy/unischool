import type { Buildable, Faculty, GameState, GreekChapter, LogEntry } from '../state/types';
import { WEEKS_PER_YEAR } from '../state/types';
import { FACULTY_FIELDS, generateCandidate, rollCoachName, rollSurname } from './facultyData';
import { money, rollAmount, weeksOfOpEx } from './moneyScale';
import { firstFreeSpot, footprintOf, placementFor } from '../state/campusMap';
import {
  CHAPTER_HOUSED_SOCIAL_BONUS, CHAPTER_SOCIAL_BONUS, orgMembership,
  promoteToVarsityTeam, sportById, sportClubsAwaitingVarsity, venueForCategory,
} from './studentLifeData';
import { discoverySchools, graduateProgram, milestoneSchools } from './techData';

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
//     genuinely special accomplishments (a program established, a program
//     distinguished, a school fully distinguished). Routine course completions
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

// =====================================================================
// MILESTONE CELEBRATIONS — which accomplishments stop the clock
// =====================================================================

// The milestone keys techSystem.ts awards are `<kind>:<subject>`. Only
// these kinds are special enough to interrupt play. Every one of them is
// an aggregate accomplishment — a whole major, or a whole school — never
// a single course finishing, which is what keeps this from becoming the
// pop-up-every-few-weeks failure mode. Dial it down by removing entries
// (leaving only 'school-distinguished' fires roughly seven times in a full
// 330-course run); dial it up by adding kinds as they are invented.
export const MILESTONE_INTERRUPT_KINDS: readonly string[] = [
  'program-established',
  'program-distinguished',
  'school-distinguished',
  // Founding a graduate program (see README's "Graduate programs"). It
  // qualifies on the same test the other three do — an aggregate
  // accomplishment, never a single course — and there are only six of them
  // in a whole run, all of them late, so this adds a handful of
  // celebrations to the very end of the arc rather than to its middle.
  'grad-program-complete',
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

  if (kind === 'grad-program-complete') {
    const program = graduateProgram(subject);
    if (!program) return null;
    return {
      key,
      headline: `${program.name} is founded`,
      detail: program.type === 'professional'
        ? `Every course in the ${program.degree} program is finished. A professional school counts toward curriculum breadth — the largest input to the prestige target — and is weighted there above its course count, though still inside that input's cap.`
        : `Every course in the ${program.degree} program is finished. A research doctorate counts toward curriculum breadth AND toward the school's research standing, both as capped inputs to the prestige target.`,
      unlocks: [],
    };
  }

  if (kind === 'school-distinguished') {
    return {
      key,
      headline: `${subject} is fully distinguished`,
      detail: 'Every program in the school is distinguished. A distinguished school is the heaviest single contribution curriculum breadth can make to the prestige target.',
      unlocks: [],
    };
  }

  for (const school of milestoneSchools()) {
    for (const major of school.majors) {
      if (major.prefix !== subject) continue;
      if (kind === 'program-established') {
        return {
          key,
          headline: `${major.name} is now an established program`,
          detail: `Every tier-2 course in ${major.name} (${school.schoolName}) is finished. The program counts toward curriculum breadth from now on — the largest input to the prestige target — and its tier-3 catalogue is open.`,
          unlocks: major.tier3Ids.map((id) => nameOf(s, id)),
        };
      }
      if (kind === 'program-distinguished') {
        return {
          key,
          headline: `${major.name} is now a distinguished program`,
          detail: `All nine courses in ${major.name} (${school.schoolName}) are done. Distinguishing a program is a further, separate share of curriculum breadth on top of establishing it.`,
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
// be a crisis in year 3 and a rounding error in year 40. The conversion
// itself lives in moneyScale.ts, because the student-organisation layer
// sizes itself the same way and neither file may import the other.
//
// A rolled figure is fixed at FIRE time and carried in the interrupt
// payload (see DecisionEventContext.amount), never re-rolled at resolve
// time — the number in the modal is the number that is applied, the same
// contract the admissions preview and the endowment campaign follow.

// Whatever the event rolled about itself when it fired. Plain JSON: it
// rides in s.pendingInterrupt.payload and therefore through save/load.
export interface DecisionEventContext {
  subjectId?: string;    // a faculty id, or a Buildable id
  subjectName?: string;  // that subject's display name, resolved when the event fired
  subjectField?: string; // a Faculty field, for events that are about a discipline rather than a person
  amount?: number;       // a rolled sum of money, fixed at fire time
  donorName?: string;    // a rolled person surname, for events framed as a named gift (see 'naming-rights')
  newName?: string;      // the new display name a choice would apply, fixed at fire time (see 'naming-rights')
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

// School buildings whose naming rights haven't been sold yet — a school is
// only ever renamed once (see the 'naming-rights' event's apply()), so the
// donor pool this event draws from excludes any building already carrying
// a `donorSurname`.
//
// Also excludes the two professional-school buildings (BLDG-MED, BLDG-LAW
// — see techData.ts's GraduateProgramSeed.buildingId), which is a
// deliberate scope decision rather than an oversight: rollContext below
// looks up the building's school through discoverySchools(), which only
// ever covers the seven undergraduate schools, so an un-excluded
// professional building would occasionally get drawn as the target and
// then fail that lookup, silently wasting the week's roll instead of
// firing an event. A "Johnson School of Law" naming-rights offer is a
// thematically obvious follow-up, but wiring it in for real needs more
// than a filter change here — discoverySchools()-shaped lookup for a
// professional school, and a heading path in CurriculumTab.tsx's
// buildSections that reads a professional section's donorSurname the way
// an undergraduate one already does — so it's flagged as follow-up scope
// rather than attempted alongside the buildings themselves.
function unnamedSchoolBuildings(s: GameState) {
  const eligibleIds = new Set(discoverySchools().map((school) => school.buildingId));
  return doneBuildings(s).filter((b) => !b.donorSurname && eligibleIds.has(b.id));
}

function doneDiningHalls(s: GameState) {
  return s.tech.filter((t) => t.facilityType === 'diningHall' && t.status === 'done');
}

// A faculty member may only be put at risk by an event when their field
// has depth behind them. This is the whole reason no departure or
// dismissal can strand the curriculum: losing the only Economics hire
// would leave every Economics course unstartable until the job market
// happened to offer another one — which, in a thin-market field, can be
// months (see facultyData.ts's churn block) — so events never offer that.
// Losing one of two is a real cost — a course slot and a mature stat
// line — that the player can absorb or buy off.
const EVENT_MIN_FIELD_DEPTH = 2;

function facultyAtRisk(s: GameState): Faculty[] {
  const depth = new Map<string, number>();
  for (const f of s.faculty) depth.set(f.field, (depth.get(f.field) ?? 0) + 1);
  return s.faculty.filter((f) => (depth.get(f.field) ?? 0) >= EVENT_MIN_FIELD_DEPTH);
}

function removeFaculty(s: GameState, id: string | undefined): void {
  s.faculty = s.faculty.filter((f) => f.id !== id);
}

function findChapter(s: GameState, id: string | undefined): GreekChapter | undefined {
  return s.orgs.chapters.find((c) => c.id === id);
}

// Chapters that have never been asked about housing. A chapter is asked at
// most once, whatever the answer was, so the school is never nagged about
// the same house twice and the petition can never become a modal spiral —
// the supply of asks is bounded by the number of chapters that exist.
function chaptersAwaitingHousing(s: GameState): GreekChapter[] {
  return s.orgs.chapters.filter((c) => !c.housed && !c.housingAsked);
}

// The chapter house's own Buildable id, deterministic from the chapter it
// belongs to — one house per chapter, and the pairing survives save/load
// without a separate lookup table (see 'greek-housing' below).
function chapterHouseId(chapterId: string): string {
  return `chapter-house:${chapterId}`;
}

// Chapters are dissolvable (see 'greek-scandal's "disband" choice) whether
// or not they are housed, so a housed chapter's house must be torn down
// with it — otherwise a disbanded chapter would leave an ownerless building
// sitting in the siting tray, or on the map, forever.
function removeChapterHouse(s: GameState, chapterId: string): void {
  const id = chapterHouseId(chapterId);
  s.tech = s.tech.filter((t) => t.id !== id);
  delete s.placements[id];
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

// --- student organisations (see data/studentLifeData.ts) ---------------
//
// WHY THE GREEK BEATS ARE IN THIS TABLE AT ALL. Clubs and new chapters are
// the light half of student life and never stop the clock — they raise a
// petition and are answered in a batch at the summer admissions boundary
// (see systems/studentlife/studentLifeSystem.ts). What is left is the
// consequential half — the one-time question of whether the school has
// Greek life at all, a chapter in disgrace, and a chapter asking for a
// house — and every one of those is a prompt with choices and a cash cost,
// which is exactly what this table is. Authoring them here rather than
// giving student life a second interrupt stream means they SHARE the
// existing event budget (DECISION_EVENT_WEEKLY_CHANCE and its cooldown)
// rather than adding to it: the number of stop-the-clock modals a year does
// not move, only the mix of what they are about. The weights below are
// therefore the dial for how much of that fixed budget Greek life takes.
//
// THE GREEK GATE. Every Greek entry's eligible() reads
// s.orgs.hellenicCouncilApproved, so no scandal and no housing petition can
// fire at a school that never approved a council — and the council question
// itself is maxFires: 1, so declining closes Greek life for the whole run.
// Lowered from 5: the council should arrive within 3-5 years of the
// student center that seeds the club scene, and a 60-year playtest at 5
// clubs saw eligibility itself not clear until year 7-10 — before the
// weight below even gets a chance to draw. 2 clubs is still a real
// delegation (the flavour text's "joint delegation"), just one a
// fast-building school reaches a couple of years after its student center
// rather than most of a decade later, which is what leaves the weight
// below room to land the question inside the 3-5 year window instead of
// racing it from further back.
export const HELLENIC_COUNCIL_MIN_CLUBS = 2;
const GREEK_SCANDAL_PR_COST_WEEKS = 1.8;
const GREEK_SCANDAL_PR_SATISFACTION_HIT = 3; // standing behind the chapter costs goodwill, as standing behind a professor does
const GREEK_HOUSE_BUILD_COST_WEEKS = 3.5;   // a chapter house is a real building, priced against the facility chain
const GREEK_HOUSE_UPKEEP_WEEKS_OF_OPEX = 0.004; // and it roughly doubles that chapter's weekly line, forever
const GREEK_HOUSE_REFUSAL_SATISFACTION_HIT = 2;

// --- varsity athletics (see data/studentLifeData.ts) -------------------
//
// UNLIKE the Greek house grant above, going varsity does NOT manufacture an
// already-'done' Buildable and place it for the player: the required
// venue is only REVEALED here (see techSystem.ts's meetsUnlockGates, which
// flips it 'locked' -> 'available' the moment promoteToVarsityTeam below
// pushes a team referencing its category) and still has to be built —
// player-placed — through the ordinary build-rail PLACE_BUILDABLE cycle,
// like a gym or a pool. That is a deliberate fork from the chapter-house
// pattern this event is otherwise modeled on, flagged rather than resolved
// silently: a
// football stadium (or any shared venue) reads as a genuine construction
// project the player commits capacity to, not a line item this event's own
// cost quietly pre-pays. VARSITY_ESTABLISH_COST below therefore prices the
// PROGRAM (a coach, uniforms, a conference's dues) — never the building.
const VARSITY_ESTABLISH_COST_WEEKS = 2.5;
const VARSITY_COACH_BASE_SALARY_WEEKS_OF_OPEX = 0.0018; // fixed at hire; appreciates live with tenure (see studentLifeData.ts's coachSalary)
const VARSITY_TEAM_UPKEEP_WEEKS_OF_OPEX = 0.003;        // the program's own running cost, on top of the coach — travel, equipment, officiating
const VARSITY_DECLINE_SATISFACTION_HIT = 2;             // same weight as a chapter's housing refusal — the club stays exactly as it was, just told no

// The week a club's five-year mark (studentLifeData.ts's VARSITY_PETITION_
// MIN_TENURE_YEARS) actually turns into an interrupt — see eventSystem.ts's
// fireVarsityPetition. Deliberately NOT WEEKS_PER_YEAR (summer admissions,
// the moment a club is typically founded, so "5 years later" would
// otherwise land on the same summer week every time) and NOT REPORT_WEEK's
// WEEKS_PER_YEAR/2 (the U.S. News report) — three-quarters through the
// year sits an even 13 weeks from each, so a varsity ask reads as its own
// moment rather than another summer or midyear thing.
export const VARSITY_PETITION_WEEK = Math.floor((WEEKS_PER_YEAR * 3) / 4);

// =====================================================================
// THE TABLE. Thirteen authored events. Trigger conditions are deliberately
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
    // Raised from 8: a 60-year playtest saw only 4-5 of the ~8 undergraduate
    // schools ever get named, even though the prestige gate below clears in
    // year 1 for most strategies — the bottleneck was purely this weight
    // losing the draw to the rest of the table, not the gate. At this
    // weight most runs sell naming rights on every unnamed school well
    // before year 60; eligible() below still empties the donor pool once
    // they're all named, so the extra weight is never wasted, only retired.
    weight: 18,
    eligible: (s) => s.self.reputation >= NAMING_RIGHTS_PRESTIGE_GATE && unnamedSchoolBuildings(s).length > 0,
    // Rolls the donor's surname and the resulting name TOGETHER, at fire
    // time, like the amount below — the modal shows exactly the name that
    // apply() will set, never a re-roll (see the comment at the top of
    // this file on why cost/effects are fixed at roll time).
    rollContext: (s) => {
      const buildings = unnamedSchoolBuildings(s);
      if (buildings.length === 0) return null;
      const target = pick(buildings);
      const school = discoverySchools().find((sc) => sc.buildingId === target.id);
      if (!school) return null;
      const donor = rollSurname();
      return {
        subjectId: target.id,
        subjectName: school.name, // the school's own name, e.g. "Science" — not its building's name
        donorName: donor,
        newName: `${donor} School of ${school.name}`,
        amount: rollAmount(s, NAMING_RIGHTS_MIN_WEEKS, NAMING_RIGHTS_MAX_WEEKS),
      };
    },
    prompt: (_s, ctx) =>
      `An alumnus, ${ctx.donorName}, offers ${money(ctx.amount ?? 0)} to put the family name on the School of ${ctx.subjectName} — permanently. It would become the ${ctx.newName}. The cheque clears immediately. The student paper has already written the editorial.`,
    choices: [
      {
        id: 'sign',
        label: 'Accept the gift',
        describe: (_s, ctx) =>
          `${money(ctx.amount ?? 0)} in cash now, the school permanently renamed to the ${ctx.newName}, and a ${NAMING_RIGHTS_SATISFACTION_HIT}-point dent in student satisfaction that heals over the following weeks.`,
        cost: () => 0,
        apply: (s, ctx) => {
          s.finance.cash += ctx.amount ?? 0;
          dentSatisfaction(s, NAMING_RIGHTS_SATISFACTION_HIT);
          // The rename IS the building's own `name` field — already a
          // stored, mutable, per-save property (see types.ts's Buildable)
          // — so every existing reader of it (the campus map label, its
          // tooltip, the build tray) picks the new name up with no changes
          // of its own. `donorSurname` is the one addition: it marks the
          // name as donor text rather than the seeded catalogue name, which
          // is what tells the Curriculum tab's section heading (see
          // CurriculumTab.tsx's buildSections) to show it verbatim instead
          // of re-wrapping it as "School of X".
          const building = s.tech.find((t) => t.id === ctx.subjectId);
          if (building && ctx.newName && ctx.donorName) {
            building.name = ctx.newName;
            building.donorSurname = ctx.donorName;
          }
          return entry(s, `Naming rights sold: the School of ${ctx.subjectName} is now the ${ctx.newName}. ${money(ctx.amount ?? 0)} banked, students unimpressed.`, 'info');
        },
      },
      {
        id: 'decline',
        label: 'Turn it down',
        describe: () => 'Nothing changes. The school keeps its name.',
        cost: () => 0,
        apply: (s, ctx) => entry(s, `Naming-rights offer on the School of ${ctx.subjectName} declined.`, 'info'),
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
          `${money(ctx.amount ?? 0)} up front. A ${ctx.subjectField} candidate better than the job market normally turns up joins the pool immediately, and still has to be appointed and paid like anyone else.`,
        cost: (_s, ctx) => ctx.amount ?? 0,
        apply: (s, ctx) => {
          const field = ctx.subjectField ?? pick(FACULTY_FIELDS);
          const existing = [...s.faculty, ...s.candidates].map((f) => f.name);
          // Best of N rolls: what the player is buying is QUALITY, not
          // access. Against the old post-and-wait model this event also
          // saved a fee and a countdown; against a standing candidate
          // market that half is worthless — anyone can appoint off the
          // list any week — so the best-of-N roll is now the entire
          // proposition, and the one thing the market itself never
          // offers on demand.
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

  // ---------------------------------------------------------------------
  // GREEK LIFE. Three entries, all gated on student organisations the
  // player already has (see data/studentLifeData.ts). The first is the
  // opt-in; the other two can only ever fire once it has been taken.
  // ---------------------------------------------------------------------

  {
    id: 'hellenic-council',
    title: 'A petition for a Hellenic Council',
    // Weighted heavily and capped at one firing: it is a one-shot question
    // that a run should actually get ASKED rather than one that might
    // never come up, and once answered it can never return. Raised from 16
    // to 45 because "heavily" wasn't heavy enough in practice — a 60-year
    // playtest at weight 16 still lost the draw to the rest of the table
    // for several years after eligibility, landing around year 13. At 45 it
    // dominates the pool it competes in (nothing else is eligible before
    // Greek life is chartered — see the eligible() gate below), so once the
    // club-count gate clears it wins within a year or two on most runs.
    weight: 45,
    maxFires: 1,
    eligible: (s) => !s.orgs.hellenicCouncilOffered && s.orgs.clubs.length >= HELLENIC_COUNCIL_MIN_CLUBS,
    prompt: (s) =>
      `The ${s.orgs.clubs.length} recognised student societies have sent a joint delegation: they want the school to charter a Hellenic Council and permit Greek-letter organisations on campus. Fraternities and sororities would bring a great deal of student life with them, and a great deal of everything that comes with student life.`,
    choices: [
      {
        id: 'charter',
        label: 'Charter the council',
        describe: () =>
          `Chapters begin forming from here on, each petitioning for recognition at summer admissions like any other society. A chapter is worth ${CHAPTER_SOCIAL_BONUS} points of social satisfaction against a club's fraction of that, carries a real recurring cost, and will eventually bring you its own problems.`,
        cost: () => 0,
        apply: (s) => {
          s.orgs.hellenicCouncilApproved = true;
          s.orgs.hellenicCouncilOffered = true;
          return entry(s, 'A Hellenic Council has been chartered; Greek-letter organisations may now form on campus.', 'good');
        },
      },
      {
        id: 'decline',
        label: 'Decline — no Greek life here',
        describe: () =>
          'Nothing changes, permanently. No fraternity or sorority will ever form at this school, and you will not be asked again. Clubs are unaffected.',
        cost: () => 0,
        apply: (s) => {
          s.orgs.hellenicCouncilOffered = true;
          return entry(s, 'The trustees have declined to charter a Hellenic Council. This school will not have Greek life.', 'info');
        },
      },
    ],
  },

  {
    id: 'greek-scandal',
    title: 'A chapter in disgrace',
    // The dial the cadence note in the PR summary refers to: raising this
    // takes a bigger share of the fixed decision-event budget for
    // scandals, lowering it makes them rarer against everything else.
    weight: 7,
    eligible: (s) => s.orgs.hellenicCouncilApproved && s.orgs.chapters.length > 0,
    rollContext: (s) => {
      const chapters = s.orgs.chapters;
      if (chapters.length === 0) return null;
      const target = pick(chapters);
      return {
        subjectId: target.id,
        subjectName: target.name,
        amount: weeksOfOpEx(s, GREEK_SCANDAL_PR_COST_WEEKS),
      };
    },
    prompt: (s, ctx) => {
      const chapter = findChapter(s, ctx.subjectId);
      const size = chapter ? orgMembership(chapter, s) : 0;
      return `${ctx.subjectName} — ${size} members, chartered in ${chapter?.foundedYear ?? '?'} — is on the front page, and not for its philanthropy. Counsel and a communications firm will see the chapter through for ${money(ctx.amount ?? 0)}. The alternative is to pull its charter.`;
    },
    choices: [
      {
        id: 'pr',
        label: 'Fund a public-relations campaign',
        describe: (_s, ctx) =>
          `${money(ctx.amount ?? 0)} up front. ${ctx.subjectName} keeps its charter and everything it contributes; satisfaction takes a ${GREEK_SCANDAL_PR_SATISFACTION_HIT}-point dent that heals over the following weeks.`,
        cost: (_s, ctx) => ctx.amount ?? 0,
        apply: (s, ctx) => {
          dentSatisfaction(s, GREEK_SCANDAL_PR_SATISFACTION_HIT);
          return entry(s, `The university has stood behind ${ctx.subjectName}; the campus is divided.`, 'info');
        },
      },
      {
        // The zero-cost path, which is what satisfies the no-soft-lock
        // invariant for this event — and it is also the DURABLE one. What
        // disbanding costs is not a dent that heals: it is the permanent
        // removal of an ongoing contribution to the satisfaction target
        // and of the chapter's line on the weekly statement.
        id: 'disband',
        label: 'Pull the charter',
        describe: (s, ctx) => {
          const chapter = findChapter(s, ctx.subjectId);
          const bonus = chapter
            ? CHAPTER_SOCIAL_BONUS + (chapter.housed ? CHAPTER_HOUSED_SOCIAL_BONUS : 0)
            : CHAPTER_SOCIAL_BONUS;
          return `No cash spent. ${ctx.subjectName} is dissolved permanently: ${bonus.toFixed(1)} points of social satisfaction and ${money(chapter?.upkeepPerWeek ?? 0)} a week of cost go with it. It cannot be re-chartered.`;
        },
        cost: () => 0,
        apply: (s, ctx) => {
          s.orgs.chapters = s.orgs.chapters.filter((c) => c.id !== ctx.subjectId);
          if (ctx.subjectId) removeChapterHouse(s, ctx.subjectId);
          return entry(s, `${ctx.subjectName} has been dissolved and its charter withdrawn.`, 'bad');
        },
      },
    ],
  },

  {
    id: 'greek-housing',
    title: 'A chapter asks for a house',
    // Raised from 6: each chapter only ever asks once (see the housingAsked
    // guard below), so the supply is already bounded by chapter count — a
    // 60-year playtest still only saw 3 of 10 chapters get around to
    // petitioning before the run ended, because the event kept losing the
    // draw to the rest of the table. This is the dial that share of the
    // fixed event budget takes; the at-most-once-per-chapter guard is
    // unchanged.
    weight: 14,
    eligible: (s) => s.orgs.hellenicCouncilApproved && chaptersAwaitingHousing(s).length > 0,
    // ONE GROUP AT A TIME, and each chapter at most once: the draw picks a
    // single chapter that has never been asked, and BOTH answers set
    // housingAsked, so a chapter whose house was refused does not come
    // back around and a chapter whose house was built has nothing left to
    // ask for.
    rollContext: (s) => {
      const waiting = chaptersAwaitingHousing(s);
      if (waiting.length === 0) return null;
      const target = pick(waiting);
      return {
        subjectId: target.id,
        subjectName: target.name,
        amount: weeksOfOpEx(s, GREEK_HOUSE_BUILD_COST_WEEKS),
      };
    },
    prompt: (s, ctx) => {
      const chapter = findChapter(s, ctx.subjectId);
      const size = chapter ? orgMembership(chapter, s) : 0;
      return `${ctx.subjectName} has outgrown its meeting room: ${size} members, and an alumni committee with drawings for a dedicated chapter house on the edge of campus. The school's share of the build is ${money(ctx.amount ?? 0)}.`;
    },
    choices: [
      {
        id: 'build',
        label: 'Build the chapter house',
        describe: (s, ctx) =>
          `${money(ctx.amount ?? 0)} up front and ${money(weeksOfOpEx(s, GREEK_HOUSE_UPKEEP_WEEKS_OF_OPEX))} a week to run it, forever. ${ctx.subjectName} contributes a further ${CHAPTER_HOUSED_SOCIAL_BONUS} points of social satisfaction from the week it opens, and the house itself takes its place on campus immediately.`,
        cost: (_s, ctx) => ctx.amount ?? 0,
        apply: (s, ctx) => {
          const chapter = findChapter(s, ctx.subjectId);
          if (chapter) {
            chapter.housed = true;
            chapter.housingAsked = true;
            // Folded into the chapter's own line rather than kept
            // separately, so disbanding the chapter takes the house's
            // running cost with it — there is exactly one place a Greek
            // organisation's cost lives.
            chapter.upkeepPerWeek += weeksOfOpEx(s, GREEK_HOUSE_UPKEEP_WEEKS_OF_OPEX);
            // A real, sitable campus asset, through the same placement path
            // every other building uses (see state/campusMap.ts and
            // README's "The central abstraction") — pushed in already
            // 'done' since the money and the running cost above are what
            // pay for it, not a develop/finish cycle of its own. It carries
            // no `effects`: the satisfaction bonus and upkeep it represents
            // are already live-read off `chapter.housed`/`upkeepPerWeek`
            // above, and giving the Buildable its own effects would double
            // them. Its only job is to exist so it can be sited.
            const house: Buildable = {
              id: chapterHouseId(chapter.id),
              kind: 'facility',
              name: `${chapter.name} House`,
              description: `The dedicated chapter house built for ${chapter.name}.`,
              cost: ctx.amount ?? 0,
              duration: 0,
              prereqs: [],
              status: 'done',
            };
            s.tech.push(house);
            // Sited immediately, at whatever spot a plain top-left scan
            // finds first — the same firstFreeSpot every other Buildable
            // that starts 'done' without ever asking the player where it
            // goes uses (see actions.ts's createInitialState and
            // persistence.ts's v17 -> v18 migration). There is no siting
            // tray to defer this into any more: placement is how a
            // placeable Buildable comes to exist on the map, and this one
            // is manufactured whole rather than built through the ordinary
            // PLACE_BUILDABLE cycle, so it has to place itself. The
            // pathological case where no room is found is left unplaced —
            // it stays a real, 'done' chapter house with its bonus and
            // upkeep already live, simply invisible on the map — rather
            // than blocking the event or crashing.
            const fp = footprintOf(house);
            const spot = firstFreeSpot(s.placements, fp);
            if (spot) s.placements[house.id] = placementFor(spot.row, spot.col, fp);
          }
          return entry(s, `A chapter house has been built for ${ctx.subjectName}.`, 'good');
        },
      },
      {
        id: 'refuse',
        label: 'They can keep meeting where they are',
        describe: (_s, ctx) =>
          `No cash spent, and a ${GREEK_HOUSE_REFUSAL_SATISFACTION_HIT}-point satisfaction dent that heals over the following weeks. ${ctx.subjectName} keeps its charter and everything it already contributes, and will not ask again.`,
        cost: () => 0,
        apply: (s, ctx) => {
          const chapter = findChapter(s, ctx.subjectId);
          if (chapter) chapter.housingAsked = true;
          dentSatisfaction(s, GREEK_HOUSE_REFUSAL_SATISFACTION_HIT);
          return entry(s, `${ctx.subjectName}'s request for a chapter house was refused.`, 'bad');
        },
      },
    ],
  },

  // ---------------------------------------------------------------------
  // VARSITY ATHLETICS. A sport club's ONE petition to go varsity — modeled
  // on 'greek-housing' immediately above (an authored event, gated on a
  // per-organisation "already asked" guard, drawing one waiting candidate
  // at a time), with the one deliberate fork noted on the constants above.
  //
  // TRIGGER: DETERMINISTIC, NOT THE SHARED LOTTERY. Unlike every other
  // entry in this table, this one is never drawn by rollDecisionEvent's
  // weighted random pick — `eligible` below always reads false there, and
  // `weight` is unused. A club's petition instead fires on a fixed
  // schedule (five years after founding — see studentLifeData.ts's
  // VARSITY_PETITION_MIN_TENURE_YEARS — from VARSITY_PETITION_WEEK
  // onward) via eventSystem.ts's fireVarsityPetition, which calls this
  // entry's own rollContext/choices/apply directly. Still the SAME
  // 'decision-event' interrupt shape, so nothing downstream (the modal,
  // the reducer, save/load) needs to know the trigger differs.
  // ---------------------------------------------------------------------
  {
    id: 'varsity-petition',
    title: 'A petition to go varsity',
    weight: 0, // never drawn by the weighted lottery — see the trigger note above
    eligible: () => false, // fired directly by eventSystem.ts's fireVarsityPetition instead
    rollContext: (s) => {
      const waiting = sportClubsAwaitingVarsity(s);
      if (waiting.length === 0) return null;
      const club = pick(waiting);
      return {
        subjectId: club.id,
        subjectName: club.name,
        subjectField: club.sport ?? undefined, // reused as a plain string slot for the SPORTS id — see studentLifeData.ts
        amount: weeksOfOpEx(s, VARSITY_ESTABLISH_COST_WEEKS),
      };
    },
    prompt: (s, ctx) => {
      const sport = sportById(ctx.subjectField);
      const venue = sport ? venueForCategory(s, sport.venueCategory) : undefined;
      const venueLine = venue?.status === 'done'
        ? `${venue.name} already stands and could host them immediately.`
        : `The school has no venue for ${sport?.teamName ?? 'this sport'} yet — going varsity means building ${venue ? venue.name : 'one'} before the team can actually compete.`;
      return `${ctx.subjectName} has outgrown intramural play and wants varsity status: real recruiting, a paid coach, and a conference schedule. ${venueLine} Establishing the program costs ${money(ctx.amount ?? 0)}.`;
    },
    choices: [
      {
        id: 'establish',
        label: 'Go varsity',
        describe: (s, ctx) => {
          const sport = sportById(ctx.subjectField);
          const venue = sport ? venueForCategory(s, sport.venueCategory) : undefined;
          const ready = venue?.status === 'done';
          return `${money(ctx.amount ?? 0)} up front for a coach and a program budget. ` + (
            ready
              ? `${venue!.name} is already standing, so the team is varsity-active immediately.`
              : `${venue ? venue.name : 'A shared venue'} is revealed for construction on the build rail — the team is varsity-active once it is built, and shared with any other team in the same category.`
          );
        },
        cost: (_s, ctx) => ctx.amount ?? 0,
        apply: (s, ctx) => {
          const club = s.orgs.clubs.find((c) => c.id === ctx.subjectId);
          const sport = sportById(ctx.subjectField);
          if (!club || !sport) return entry(s, 'The petition could not be resolved.', 'info');
          const venue = venueForCategory(s, sport.venueCategory);
          const status = venue?.status === 'done' ? 'active' : 'awaitingVenue';
          const coachName = rollCoachName();
          const team = promoteToVarsityTeam(s, club, {
            sport: sport.id,
            name: sport.teamName,
            venueCategory: sport.venueCategory,
            coachName,
            coachBaseSalary: weeksOfOpEx(s, VARSITY_COACH_BASE_SALARY_WEEKS_OF_OPEX),
            upkeepPerWeek: weeksOfOpEx(s, VARSITY_TEAM_UPKEEP_WEEKS_OF_OPEX),
            status,
          });
          return entry(
            s,
            status === 'active'
              ? `${team.name} is now a varsity program, coached by ${coachName}.`
              : `${team.name} is now a varsity program, coached by ${coachName} — awaiting its venue before it can compete.`,
            'good',
          );
        },
      },
      {
        id: 'decline',
        label: 'Stay a club',
        describe: () => `No cash spent. ${VARSITY_DECLINE_SATISFACTION_HIT}-point satisfaction dent that heals over the following weeks. The club keeps everything it already contributes and will not ask again.`,
        cost: () => 0,
        apply: (s, ctx) => {
          const club = s.orgs.clubs.find((c) => c.id === ctx.subjectId);
          if (club) club.varsityAsked = true;
          dentSatisfaction(s, VARSITY_DECLINE_SATISFACTION_HIT);
          return entry(s, `${ctx.subjectName}'s petition to go varsity was declined.`, 'bad');
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
