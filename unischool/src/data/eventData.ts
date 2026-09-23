import type { Buildable, Coach, FacilityType, Faculty, GameState, GreekChapter, LogEntry, LogTopic, VarsityTeam } from '../state/types';
import { WEEKS_PER_YEAR, institutionName } from '../state/types';
import { PLAYOFF_WEEK } from '../systems/athletics/playoffs';
import { FACULTY_FIELDS, generateCandidate, rollSurname } from './facultyData';
import { appointFaculty } from '../systems/faculty/facultySystem';
import { rollAmount, weeksOfOpEx } from './moneyScale';
import {
  CHAPTER_HOUSE_CAPACITY_BONUS, CHAPTER_HOUSED_SOCIAL_BONUS, CHAPTER_SOCIAL_BONUS, orgMembership,
  promoteToVarsityTeam, sportById, sportClubsAwaitingVarsity, VARSITY_PETITION_MIN_TENURE_YEARS, venueForCategory,
  CHAIR_LABEL, coachNamesInUse, fieldForChair, generateCoachCandidate, inTitleYear, seatCoach, vacantChairs, departmentPot, sportEconomics} from './studentLifeData';
import { FIRST_HALL_COURSE_GATE, FOUNDERS_HALL_ID, graduateProgram, isAcademicHall, milestoneSchools, programById, programs } from './techData';
import { FOUNDING_PROGRAMS } from './foundingData';
import { dedicatedHalls, dedicatedSchool } from '../systems/techtree/schools';
import { buildReportPayload, rankBy } from '../systems/rivals/rivalsSystem';
import { money } from '../format';
import { clamp } from '../math';
import { random } from '../engine/random';

// ---------------------------------------------------------------------
// WEEK-TO-WEEK TEXTURE, AS AUTHORED DATA.
//
// Two things live here, and both ride entirely on the existing interrupt
// system (see docs/architecture/interrupts.md). Neither is new core
// machinery: systems/events/eventSystem.ts is one ordinary pure tick
// function that reads this table and sets s.pendingInterrupt, exactly
// the way admissions and the U.S. News report already do.
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
  return items[Math.floor(random() * items.length)];
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
  // Founding a school (Plan 14): six programs of one school in one hall.
  // Seven in a run at most, each the naming of a school — the celebration
  // IS the reveal of the name.
  'school-founded',
  'program-established',
  'program-distinguished',
  'school-distinguished',
  // Founding a graduate program (see docs/design/graduate-programs.md). It
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
        : `Every course in the ${program.degree} program is finished. A research degree counts toward curriculum breadth AND toward the school's research standing, both as capped inputs to the prestige target.`,
      unlocks: [],
    };
  }

  if (kind === 'school-founded') {
    return {
      key,
      headline: `This is the School of ${subject}`,
      detail: `Six programs, one building. Until now these were ${subject}'s programs in a colour with no name; housed together, they are a school, and the hall they share is ${subject} Hall. The name is permanent, and a donor may now put a family name on it.`,
      unlocks: s.tech
        .filter((t) => t.schoolGate === subject && t.status !== 'locked')
        .map((t) => t.name),
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
  // A whole person, rolled at fire time (see 'visiting-scholar'). Plain
  // JSON like everything else in a context, because a context is saved
  // inside the pending interrupt. Rolled HERE rather than in apply() so the
  // modal can name them and quote their salary, and so the person described
  // is exactly the person appointed — two rolls would be two different
  // people, one of them fictional.
  candidate?: Faculty;
  // A whole COACH, rolled at fire time for the same reason `candidate` is
  // (see 'ad-shortage'): the modal quotes their name, quality and salary,
  // and the only way that quote is honest is if the person described is the
  // person seated.
  coach?: Coach;
}

export interface DecisionChoice {
  id: string;
  label: string;
  // Not offered at all against this context (Plan 21's PR E: the capital
  // match's venue choice, when nothing is revealed to aim at). Omitted =
  // always offered. A hidden choice is never the free one an event relies
  // on for hasFreeChoice below.
  hidden?(s: GameState, ctx: DecisionEventContext): boolean;
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
  // A multiplier on that weight, read at draw time against the state — for
  // an event whose likelihood a moment should lift without rewriting its
  // weight (Plan 21's PR E: the donor events draw more often in a title
  // year). Omitted = 1.
  boost?(s: GameState): number;
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

function entry(s: GameState, message: string, kind: LogEntry['kind'], topic?: LogTopic, subject?: string): LogEntry {
  return { year: s.clock.year, week: s.clock.week, message, kind, topic, subject };
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

// The buildings a naming-rights offer may be made on: a DEDICATED hall —
// six programs of one school (see systems/techtree/schools.ts) — whose
// rights have not been sold. A school is only ever named once, so a hall
// already carrying a `donorSurname` leaves the pool; the pool empties the
// same way once every founded school is named. Founders Hall is on offer
// like any other once the opening school fills it (Plan 19). Read live, so
// a hall that has lost its purity is not on offer this week — a donor
// names a school, and there has to be one standing in the building.
function unnamedSchoolBuildings(s: GameState): Buildable[] {
  return dedicatedHalls(s)
    .map(({ hallId }) => s.tech.find((t) => t.id === hallId))
    .filter((t): t is Buildable => t !== undefined && !t.donorSurname && t.status === 'done');
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
export function chapterHouseId(chapterId: string): string {
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
// A title year lifts the donor events' draw weight (Plan 21's PR E — see
// studentLifeData.ts's inTitleYear): a championship is the moment an
// alumnus's cheque book opens.
const TITLE_YEAR_DONOR_BOOST = 1.6;

// What a donor's name goes on when the naming-rights offer aims at a venue
// (Plan 21's PR E): the building's own kind, not "Whitfield Multi-Sport
// Field". Only the five athletics venues are named this way; a school
// building keeps the "X School of Y" form above.
const VENUE_NAMING: Partial<Record<FacilityType, string>> = {
  athleticsField: 'Field',
  athleticsArena: 'Arena',
  athleticsDiamond: 'Park',
  athleticsNatatorium: 'Aquatic Center',
  footballStadium: 'Stadium',
  fieldHouse: 'Field House',
};

function unnamedVenues(s: GameState): Buildable[] {
  return s.tech.filter((t) => t.status === 'done' && !t.donorSurname && t.facilityType !== undefined && VENUE_NAMING[t.facilityType] !== undefined);
}

// A venue revealed for construction and not yet built — what the state
// capital match can aim at (Plan 21's PR E). The priciest first: a match
// against a stadium is the one worth asking about.
function unbuiltVenues(s: GameState): Buildable[] {
  return s.tech
    .filter((t) => t.athleticsVenueReveal && t.status === 'available')
    .sort((a, b) => b.cost - a.cost);
}
const STATE_MATCH_VENUE_SHARE_CAP = 0.6; // the state will not pay for more than this share of a building

// How exposed the department is (Plan 21's PR P): a multiplier on the
// scandal's weight that rises with the pot (a million and a half of pot is a
// point), with every program above the funded line, and with how far the
// department's standing has outrun the school's — a football power at an
// unranked college is the one the papers watch.
const SCANDAL_LEGAL_COST_WEEKS = 2;
const SCANDAL_SATISFACTION_HIT = 3;
const SCANDAL_FOUGHT_SATISFACTION_HIT = 5;
const SCANDAL_FIGHT_SUCCESS = 0.5;

function scandalExposure(s: GameState): number {
  const pot = departmentPot(s);
  const flagships = pot.programs.filter((p) => p.band === 'flagship').length;
  const outrun = Math.max(0, rankBy(s, 'reputation') - rankBy(s, 'athleticStrength')) / 25;
  return Math.min(6, 0.5 + pot.pot / 1_500_000 + 0.4 * flagships + outrun);
}

// Who a bigger program would come for (Plan 21's PR L): a head coach at
// COACH_POACH_QUALITY or better with COACH_POACH_MIN_TENURE_YEARS behind
// them. Head coaches only — an assistant's departure is a Tuesday.
const COACH_POACH_QUALITY = 75;
const COACH_POACH_MIN_TENURE_YEARS = 2;
const COACH_RETENTION_PACKAGE_SALARY_SHARE = 0.6;

function coachesAtRisk(s: GameState): Array<{ team: VarsityTeam; coach: Coach }> {
  const out: Array<{ team: VarsityTeam; coach: Coach }> = [];
  for (const team of s.orgs.teams) {
    const coach = team.headCoach;
    if (team.status !== 'active' || !coach) continue;
    if (coach.quality >= COACH_POACH_QUALITY && coach.tenureWeeks >= COACH_POACH_MIN_TENURE_YEARS * WEEKS_PER_YEAR) out.push({ team, coach });
  }
  return out;
}

// What a commitment takes off a venue's price: the school's own money plus
// the state's match, capped at STATE_MATCH_VENUE_SHARE_CAP of the building
// so a small stadium is never free.
function venueMatchDiscount(venueCost: number, commitment: number): number {
  return Math.round(Math.min(venueCost * STATE_MATCH_VENUE_SHARE_CAP, commitment * (1 + STATE_MATCH_MULTIPLIER)));
}

const RETENTION_PACKAGE_SALARY_SHARE = 0.6; // a lump sum, as a share of the hire's current annual salary

// THE TRUSTEES' RESPONSE (Plan 17's PR D, 'rival-passed'): what a board
// offers the year a rival passes the school. Both paid choices are priced
// as a serious commitment — several weeks of operating cost — because a
// response that cost nothing would not be one. The chair is the visiting
// scholar's own best-of-N roll, in a field the school already teaches; the
// campaign converts cash into endowment at a match the ordinary campaign
// never reaches, which is what a board rallying behind a school can do
// once. Nothing here writes prestige (see the module note).
const TRUSTEE_RESPONSE_COST_WEEKS = 3;
const TRUSTEE_CHAIR_CANDIDATE_ROLLS = 5;
const TRUSTEE_CAMPAIGN_MULTIPLIER = 2.2;

const VISITING_SCHOLAR_PRESTIGE_GATE = 55;
// Down from 3 weeks of opex, because what the choice costs changed. Funding
// a chair used to buy a NAME ON A LIST: the money bought access to a strong
// candidate the player could then hire, or not. It now buys the
// appointment itself, so the salary — every week, for as long as they stay
// — is part of the price, and the up-front gift is the smaller half of a
// commitment rather than the whole of it.
const VISITING_SCHOLAR_COST_WEEKS = 1.5;
// The AD's own shortage ask (see 'ad-shortage'). Cheaper than a visiting
// scholar and a shallower roll: a coach is a smaller commitment than a
// chaired professor, and the event should read as the director doing their
// job rather than as a once-a-decade coup.
const AD_SHORTAGE_COST_WEEKS = 0.8;
const AD_SHORTAGE_COACH_ROLLS = 3;
const VISITING_SCHOLAR_CANDIDATE_ROLLS = 4; // best of N rolls — a genuinely strong hire, not just a free one

// CAPITAL EVENTS SCALE TO WHAT BROKE (Plan 15's PR D), not to opex. The
// September 2026 review found the late-game boiler costing $10M against
// $21M a week of income because these four amounts were sized in weeks of
// operating cost; a roof is a share of the building under it, a kitchen a
// share of the dining hall, the boiler a share of the residence halls on
// its loop, a storm a share of everything standing. Floored at the small
// end so a founding campus's first roof is still a bill.
const ROOF_REPAIR_SHARE = 0.25;             // of the building's own cost
const ROOF_DEFERRAL_SATISFACTION_HIT = 5;

const DINING_REMEDIATION_SHARE = 0.3;       // of the dining hall's own cost
const DINING_DEFERRAL_SATISFACTION_HIT = 8; // basic needs is the heaviest satisfaction attribute — this one bites

const HEATING_PLANT_SHARE = 0.12;           // of the standing dorms' combined cost
const HEATING_PLANT_CAPACITY_GATE = 800;
const HEATING_DEFERRAL_SATISFACTION_HIT = 6;
const CAPITAL_EVENT_FLOOR = 60_000;         // no repair is cheaper than this

// A share of what stands: the sum of every finished Buildable's own cost
// that matches, floored.
function shareOfCost(items: ReadonlyArray<{ cost: number }>, share: number): number {
  return Math.max(CAPITAL_EVENT_FLOOR, Math.round(items.reduce((sum, t) => sum + t.cost, 0) * share));
}

const STATE_MATCH_FIRST_YEAR = 5;
const STATE_MATCH_COMMITMENT_WEEKS = 3;
const STATE_MATCH_MULTIPLIER = 2.5;       // the legislature's match on the school's own commitment

const STORM_CAPACITY_GATE = 500;
const STORM_FULL_REPAIR_SHARE = 0.03;       // of every standing building's cost
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
// Like the Greek house grant above, going varsity does not manufacture an
// already-'done', already-sited Buildable: the required venue is only
// REVEALED here (see techSystem.ts's meetsUnlockGates, which flips it
// 'locked' -> 'available' the moment promoteToVarsityTeam below pushes a
// team referencing its category) and still has to be placed — player-
// chosen — through the ordinary build-rail PLACE_BUILDABLE cycle, like a
// gym or a pool. A football stadium (or any shared venue) reads as a
// genuine construction project the player commits capacity to, not a line
// item this event's own cost quietly pre-pays. VARSITY_ESTABLISH_COST
// below therefore prices the PROGRAM (a coach, uniforms, a conference's
// dues) — never the building. The coaching staff itself is no longer
// costed here at all: a head coach, assistant coach, and trainer are hired
// separately from the Athletics tab's own candidate pool, each drawing
// their own salary the same way a faculty hire does (see
// studentLifeData.ts's coachSalaryFor) — VARSITY_ESTABLISH_COST_WEEKS below
// prices only the program's launch (uniforms, a conference's dues).
const VARSITY_ESTABLISH_COST_WEEKS = 2.5;
const VARSITY_TEAM_UPKEEP_WEEKS_OF_OPEX = 0.003;        // the program's own running cost, on top of its coaching staff — travel, equipment, officiating
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
// THE TABLE. Fourteen authored events. Trigger conditions are deliberately
// state-driven rather than calendar-driven: a donor shows up once the
// school is worth donating to, a heating plant fails once there is a
// campus big enough to have one. That is the same "reveal on thresholds
// the loop already produces" rule the docs/design/economy.mdapplies to
// buildings.
// =====================================================================
export const DECISION_EVENTS: readonly DecisionEvent[] = [
  {
    id: 'estate-gift',
    title: 'An estate gift',
    weight: 10,
    boost: (s) => (inTitleYear(s) ? TITLE_YEAR_DONOR_BOOST : 1),
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
    boost: (s) => (inTitleYear(s) ? TITLE_YEAR_DONOR_BOOST : 1),
    eligible: (s) => s.self.reputation >= NAMING_RIGHTS_PRESTIGE_GATE && (unnamedSchoolBuildings(s).length > 0 || unnamedVenues(s).length > 0),
    // Rolls the donor's surname and the resulting name TOGETHER, at fire
    // time, like the amount below — the modal shows exactly the name that
    // apply() will set, never a re-roll (see the comment at the top of
    // this file on why cost/effects are fixed at roll time).
    //
    // AIMS AT VENUES TOO (Plan 21's PR E): a done athletics venue without a
    // donor's name is on the list beside the unnamed schools, and a venue
    // offer is marked by subjectField 'venue' so the prompt and the rename
    // can read it. The one pool, so a school with both gets one or the
    // other, never a second stream of offers.
    rollContext: (s) => {
      const buildings = [...unnamedSchoolBuildings(s), ...unnamedVenues(s)];
      if (buildings.length === 0) return null;
      const target = pick(buildings);
      const donor = rollSurname();
      const venueKind = target.facilityType ? VENUE_NAMING[target.facilityType] : undefined;
      if (venueKind) {
        return {
          subjectId: target.id,
          subjectName: target.name,
          subjectField: 'venue',
          donorName: donor,
          newName: `${donor} ${venueKind}`,
          amount: rollAmount(s, NAMING_RIGHTS_MIN_WEEKS, NAMING_RIGHTS_MAX_WEEKS),
        };
      }
      const school = dedicatedSchool(s, target.id);
      if (!school) return null;
      return {
        subjectId: target.id,
        subjectName: school, // the school's own name, e.g. "Science" — not its hall's name
        donorName: donor,
        newName: `${donor} School of ${school}`,
        amount: rollAmount(s, NAMING_RIGHTS_MIN_WEEKS, NAMING_RIGHTS_MAX_WEEKS),
      };
    },
    prompt: (_s, ctx) => (ctx.subjectField === 'venue'
      ? `An alumnus, ${ctx.donorName}, offers ${money(ctx.amount ?? 0)} to put the family name over the gate of the ${ctx.subjectName} — permanently. It would become ${ctx.newName}. The cheque clears immediately. The student section has opinions.`
      : `An alumnus, ${ctx.donorName}, offers ${money(ctx.amount ?? 0)} to put the family name on the School of ${ctx.subjectName} — permanently. It would become the ${ctx.newName}. The cheque clears immediately. The student paper has already written the editorial.`),
    choices: [
      {
        id: 'sign',
        label: 'Accept the gift',
        describe: (_s, ctx) => (ctx.subjectField === 'venue'
          ? `${money(ctx.amount ?? 0)} in cash now, the venue permanently renamed ${ctx.newName}, and a ${NAMING_RIGHTS_SATISFACTION_HIT}-point dent in student satisfaction that heals over the following weeks.`
          : `${money(ctx.amount ?? 0)} in cash now, the school permanently renamed to the ${ctx.newName}, and a ${NAMING_RIGHTS_SATISFACTION_HIT}-point dent in student satisfaction that heals over the following weeks.`),
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
          return entry(s, ctx.subjectField === 'venue'
            ? `Naming rights sold: the ${ctx.subjectName} is now ${ctx.newName}. ${money(ctx.amount ?? 0)} banked, students unimpressed.`
            : `Naming rights sold: the School of ${ctx.subjectName} is now the ${ctx.newName}. ${money(ctx.amount ?? 0)} banked, students unimpressed.`, 'info');
        },
      },
      {
        id: 'decline',
        label: 'Turn it down',
        describe: () => 'Nothing changes. The building keeps its name.',
        cost: () => 0,
        apply: (s, ctx) => entry(s, ctx.subjectField === 'venue'
          ? `Naming-rights offer on the ${ctx.subjectName} declined.`
          : `Naming-rights offer on the School of ${ctx.subjectName} declined.`, 'info'),
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
          return entry(s, `${ctx.subjectName} has left for another university.`, 'bad', 'departure', ctx.subjectId);
        },
      },
    ],
  },

  {
    id: 'visiting-scholar',
    title: 'A distinguished visitor',
    weight: 6,
    eligible: (s) => s.self.reputation >= VISITING_SCHOLAR_PRESTIGE_GATE,
    // The person is rolled HERE, at fire time, rather than inside the
    // choice's apply: the modal quotes their name and their salary, and
    // the only way that quote can be honest is if the person described is
    // the person appointed.
    //
    // Best of N rolls: what the player is buying is QUALITY, not access.
    // Against the old post-and-wait model this event also saved a fee and
    // a countdown; against a standing candidate market that half is
    // worthless — anyone can appoint off the list any week — so the
    // best-of-N roll is the entire proposition, and the one thing the
    // market itself never offers on demand.
    rollContext: (s) => {
      const field = pick(FACULTY_FIELDS);
      const existing = [...s.faculty, ...s.candidates].map((f) => f.name);
      let best = generateCandidate(field, existing);
      for (let i = 1; i < VISITING_SCHOLAR_CANDIDATE_ROLLS; i += 1) {
        const next = generateCandidate(field, [...existing, best.name]);
        if (next.teachingPotential + next.researchPotential > best.teachingPotential + best.researchPotential) best = next;
      }
      return { subjectField: field, subjectName: best.name, amount: weeksOfOpEx(s, VISITING_SCHOLAR_COST_WEEKS), candidate: best };
    },
    prompt: (_s, ctx) =>
      `${ctx.subjectName}, a well-regarded ${ctx.subjectField} scholar, is between appointments and would take a chair here — but only if the school funds the visit properly, at ${money(ctx.amount ?? 0)}.`,
    choices: [
      {
        id: 'fund',
        label: 'Appoint them',
        // Both numbers, because they are two different commitments: the
        // gift is once, the salary is every week for as long as they stay.
        describe: (_s, ctx) => {
          const c = ctx.candidate;
          return `${money(ctx.amount ?? 0)} up front, and ${c ? `${money(c.salary)}/yr` : 'a salary'} thereafter. `
            + `${ctx.subjectName} joins the faculty this week${c ? `, teaching ${c.teaching} · researching ${c.research}` : ''} — better than the job market normally turns up.`;
        },
        cost: (_s, ctx) => ctx.amount ?? 0,
        apply: (s, ctx) => {
          // Appointed outright rather than added to the candidate pool.
          // There was no decision left in that second step — the money was
          // already spent, so "find them in the market and hire them" was
          // an errand, not a choice. Same path an ordinary hire takes (see
          // facultySystem.ts's appointFaculty), so nothing about an
          // appointed visitor differs from anyone else on the roster.
          //
          // The fallback roll is for a save written before the person was
          // part of the context: an interrupt frozen mid-flight must still
          // resolve into somebody.
          const field = ctx.subjectField ?? pick(FACULTY_FIELDS);
          const person = ctx.candidate
            ?? generateCandidate(field, [...s.faculty, ...s.candidates].map((f) => f.name));
          appointFaculty(s, person);
          return entry(s, `${person.name} (${field}) has accepted a visiting chair and joined the faculty at ${money(person.salary)}/yr.`, 'good', 'appointment', person.id);
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
      return { subjectId: target.id, subjectName: target.name, amount: shareOfCost([target], ROOF_REPAIR_SHARE) };
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
      return { subjectId: target.id, subjectName: target.name, amount: shareOfCost([target], DINING_REMEDIATION_SHARE) };
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
    rollContext: (s) => ({ amount: shareOfCost(s.tech.filter((t) => t.kind === 'dorm' && t.status === 'done'), HEATING_PLANT_SHARE) }),
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
    // EVERY school, since Plan 07's PR C. This used to be the one authored
    // event that read the private/public fork, and it was gated to public
    // schools only. The fork is gone, so the gate had to go somewhere — and
    // widening it is better than deleting it: a state capital-matching
    // programme is something private universities really do win, and
    // keeping it leaves a little of the public-money flavour in the game as
    // something that HAPPENS to a school rather than something it was
    // founded as. Which is what progression.md's "archetypes emerge, they
    // are not chosen" asks for in the first place.
    eligible: (s) => s.clock.year >= STATE_MATCH_FIRST_YEAR,
    // AIMS AT A VENUE when one is revealed and unbuilt (Plan 21's PR E): the
    // same commitment can go toward the building instead of the endowment,
    // and the state's match comes off its price. Carried in the context so
    // the choice below names the building it would help pay for.
    rollContext: (s) => {
      const venue = unbuiltVenues(s)[0];
      return {
        amount: weeksOfOpEx(s, STATE_MATCH_COMMITMENT_WEEKS),
        subjectId: venue?.id,
        subjectName: venue?.name,
      };
    },
    prompt: (_s, ctx) =>
      `The state's capital committee has a matching programme with money left in it this biennium: commit ${money(ctx.amount ?? 0)} of the school's own funds and the state will match it several times over — into a restricted endowment, not into your operating account.`
      + (ctx.subjectName ? ` The committee has also noticed the ${ctx.subjectName} on the school's plans, and a capital match can be spent on bricks.` : ''),
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
        describe: () => 'Nothing changes. The money goes to a campus that asked for it.',
        cost: () => 0,
        apply: (s) => entry(s, 'The state capital match lapsed unclaimed.', 'info'),
      },
      // Offered only when the context found a venue; a choice whose describe
      // says "there is no building" is not a choice, so it is hidden rather
      // than disabled (see InterruptModal.tsx's decision choices, which skip
      // a choice whose `hidden` reads true).
      {
        id: 'venue',
        label: 'Put it toward the venue',
        hidden: (_s, ctx) => !ctx.subjectId,
        describe: (s, ctx) => {
          const venue = s.tech.find((t) => t.id === ctx.subjectId);
          const off = venue ? venueMatchDiscount(venue.cost, ctx.amount ?? 0) : 0;
          return `${money(ctx.amount ?? 0)} out of cash now, and ${money(off)} comes off the price of the ${ctx.subjectName} — the state pays its match toward the building instead of the endowment.`;
        },
        cost: (_s, ctx) => ctx.amount ?? 0,
        apply: (s, ctx) => {
          const venue = s.tech.find((t) => t.id === ctx.subjectId);
          if (!venue) return entry(s, 'The venue the match was aimed at is no longer on the plans.', 'info');
          const off = venueMatchDiscount(venue.cost, ctx.amount ?? 0);
          venue.cost = Math.max(0, venue.cost - off);
          return entry(s, `State capital match aimed at the ${venue.name}: ${money(off)} off its price, now ${money(venue.cost)}.`, 'good');
        },
      },
    ],
  },

  {
    id: 'winter-storm',
    title: 'A storm crosses the campus',
    weight: 7,
    eligible: (s) => s.students.capacity >= STORM_CAPACITY_GATE,
    rollContext: (s) => ({ amount: shareOfCost(s.tech.filter((t) => t.status === 'done' && t.kind !== 'course'), STORM_FULL_REPAIR_SHARE) }),
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
          return entry(s, `${ctx.subjectName} has been dismissed.`, 'bad', 'departure', ctx.subjectId);
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
          `${money(ctx.amount ?? 0)} up front and ${money(weeksOfOpEx(s, GREEK_HOUSE_UPKEEP_WEEKS_OF_OPEX))} a week to run it, forever. ${ctx.subjectName} contributes a further ${CHAPTER_HOUSED_SOCIAL_BONUS} points of social satisfaction from the week it opens and adds ${CHAPTER_HOUSE_CAPACITY_BONUS} beds of campus housing, both effective immediately — the house itself is revealed in the build menu, under Housing, for you to place on campus.`,
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
            // Real student housing, the same as a dorm's capacityBonus
            // effect would grant on completion (see
            // studentLifeData.ts's CHAPTER_HOUSE_CAPACITY_BONUS) — applied
            // directly here since a chapter house isn't a Buildable with
            // effects of its own.
            s.students.capacity += CHAPTER_HOUSE_CAPACITY_BONUS;
            // Revealed in the build menu instead of manufactured already
            // 'done' and auto-placed — the same fork away from the old
            // pattern varsity athletics venues already took (see the note
            // above VARSITY_ESTABLISH_COST_WEEKS). `cost: 0` and
            // `duration: 0` because the school's share was already charged
            // above and there is no construction left to decide, only a
            // spot to choose — canStartDevelopment (the ordinary
            // PLACE_BUILDABLE gate) admits it unconditionally the instant
            // the player clicks an empty tile. `chapterHouse: true` is what
            // BuildPopup.tsx groups it under Housing (alongside, but never
            // interleaved with, the sequential dorm chain) by, and what
            // gives it a beds figure on its tile despite carrying no
            // `effects` of its own — the satisfaction bonus and upkeep it
            // represents are already live-read off
            // `chapter.housed`/`upkeepPerWeek` above, and giving the
            // Buildable its own effects would double them.
            const house: Buildable = {
              id: chapterHouseId(chapter.id),
              kind: 'facility',
              name: `${chapter.name} House`,
              description: `The dedicated chapter house built for ${chapter.name}.`,
              cost: 0,
              duration: 0,
              prereqs: [],
              status: 'available',
              chapterHouse: true,
            };
            s.tech.push(house);
          }
          return entry(s, `A chapter house has been approved for ${ctx.subjectName} — place it from the build menu.`, 'good');
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
    id: 'ad-shortage',
    title: 'The director wants a chair filled',
    // IN THE LOTTERY, not on a cadence of its own — deliberately, and against
    // the plan, which put it in the varsity petition's guaranteed slot.
    //
    // PR 2A measured what that slot already does: on one strategy, 61 of 96
    // decision events across forty years were varsity petitions. A second
    // athletics beat with its own guarantee would compound exactly that, and
    // docs/architecture/interrupts.md states the rule this table lives
    // under — a decision event changes the MIX of what stops the clock, never
    // how often it stops. A weight does that; a cadence does not.
    weight: 7,
    // The director is the voice, so there has to be one. A department with
    // nobody running it has nobody to raise the shortage — which is also the
    // honest reading: the AD offer is the thing to answer first.
    eligible: (s) => s.orgs.athleticDirector !== null && vacantChairs(s).length > 0,
    rollContext: (s) => {
      const chairs = vacantChairs(s);
      if (chairs.length === 0) return null;
      // A head coach first when one is open: teamQuality weights that chair
      // heaviest, and it is the one a director would actually raise.
      const chair = chairs.find((c) => c.role === 'head') ?? pick(chairs);
      const field = fieldForChair(chair);

      // Best of N, exactly as 'visiting-scholar' rolls its scholar and for
      // the same reason: what the money buys is QUALITY. Anyone can hire off
      // the market any week, so access is worth nothing — a better coach than
      // the market usually turns up is the whole proposition.
      const used = coachNamesInUse(s);
      const adQuality = s.orgs.athleticDirector?.quality ?? 0;
      let best = generateCoachCandidate(field, used, random, undefined, adQuality);
      for (let i = 1; i < AD_SHORTAGE_COACH_ROLLS; i += 1) {
        const next = generateCoachCandidate(field, used, random, undefined, adQuality);
        if (next.qualityPotential > best.qualityPotential) best = next;
      }
      return {
        subjectId: chair.team.id,
        subjectName: chair.team.name,
        subjectField: chair.role, // a plain string slot, as 'varsity-petition' also uses it
        amount: weeksOfOpEx(s, AD_SHORTAGE_COST_WEEKS),
        coach: best,
      };
    },
    prompt: (s, ctx) => {
      const ad = s.orgs.athleticDirector;
      const role = CHAIR_LABEL[(ctx.subjectField ?? 'head') as 'head' | 'assistant' | 'trainer'];
      return `${ad?.name ?? 'The athletic director'} has been on at you about ${ctx.subjectName}: it has been running without a ${role}, `
        + `and they have somebody in mind who will not be on the open market for long.`;
    },
    choices: [
      {
        id: 'appoint',
        label: 'Let them make the hire',
        describe: (_s, ctx) => {
          const c = ctx.coach;
          const role = CHAIR_LABEL[(ctx.subjectField ?? 'head') as 'head' | 'assistant' | 'trainer'];
          return `${money(ctx.amount ?? 0)} to get it done, and ${c ? `${money(c.salary)}/yr` : 'a salary'} thereafter. `
            + `${c ? `${c.name} takes the ${role}'s chair at quality ${c.quality}` : `The chair is filled`} — better than the market usually turns up.`;
        },
        cost: (_s, ctx) => ctx.amount ?? 0,
        apply: (s, ctx) => {
          const team = s.orgs.teams.find((t) => t.id === ctx.subjectId);
          const role = (ctx.subjectField ?? 'head') as 'head' | 'assistant' | 'trainer';
          if (!team) return entry(s, 'The appointment could not be made.', 'info');
          // The fallback roll is for a save written before the coach was part
          // of the context: an interrupt frozen mid-flight must still resolve
          // into somebody. Same guard 'visiting-scholar' carries.
          const coach = ctx.coach ?? generateCoachCandidate(fieldForChair({ team, role }), coachNamesInUse(s));
          seatCoach(team, role, coach);
          return entry(s, `${coach.name} joins ${team.name} as ${role === 'head' ? 'head coach' : CHAIR_LABEL[role]} at ${money(coach.salary)}/yr.`, 'good');
        },
      },
      {
        id: 'wait',
        label: 'Leave it to the open market',
        describe: () => 'Nothing is spent. The chair stays empty until somebody on the market is hired into it — which costs the team quality for as long as it takes.',
        cost: () => 0,
        apply: (s, ctx) => entry(s, `${ctx.subjectName} will go on without the appointment for now.`, 'info'),
      },
    ],
  },
  {
    // THE SCANDAL (Plan 21's PR P). "Nothing can go wrong that the player
    // can't ignore" was the review's finding about the whole game, and
    // athletics is the right place to answer it first, because the exposure
    // is something the player CHOSE: the probability rises with the pot,
    // with how many programs sit above the funded line, and with how far
    // athletics has outrun the academic school. The penalty is a postseason
    // ban for a season or two, not a cash cost. Authored into the shared
    // table, taking weight from the existing budget rather than adding a
    // stream.
    id: 'recruiting-scandal',
    title: 'A recruiting scandal',
    weight: 4,
    boost: (s) => scandalExposure(s),
    eligible: (s) => s.orgs.athleticDirector !== null && departmentPot(s).programs.some((p) => p.band === 'flagship'),
    rollContext: (s) => {
      const flagships = departmentPot(s).programs.filter((p) => p.band === 'flagship');
      if (flagships.length === 0) return null;
      // Revenue programs first: that is where the boosters are.
      const revenue = flagships.filter((p) => sportEconomics(p.team.sport).scale === 'revenue');
      const program = pick(revenue.length > 0 ? revenue : flagships);
      return {
        subjectId: program.team.id,
        subjectName: program.team.name,
        amount: weeksOfOpEx(s, SCANDAL_LEGAL_COST_WEEKS),
      };
    },
    prompt: (s, ctx) =>
      `A booster's payments to recruits for ${ctx.subjectName} have reached the papers, and the association has opened an inquiry. ${s.orgs.athleticDirector?.name ?? 'The athletic director'} says the program can self-report and take the season's ban, or the school can fight it — ${money(ctx.amount ?? 0)} in lawyers, and no promise.`,
    choices: [
      {
        id: 'cooperate',
        label: 'Self-report and take the ban',
        describe: (s, ctx) => `Nothing spent. ${ctx.subjectName} sits out this season's postseason${s.clock.week >= PLAYOFF_WEEK ? "'s and next" : ''}; a ${SCANDAL_SATISFACTION_HIT}-point dent in satisfaction that heals.`,
        cost: () => 0,
        apply: (s, ctx) => {
          const team = s.orgs.teams.find((t) => t.id === ctx.subjectId);
          const through = s.clock.week >= PLAYOFF_WEEK ? s.clock.year + 1 : s.clock.year;
          if (team) team.postseasonBanThroughYear = through;
          dentSatisfaction(s, SCANDAL_SATISFACTION_HIT);
          return entry(s, `${ctx.subjectName} self-reported and is barred from the postseason through ${through}.`, 'bad');
        },
      },
      {
        id: 'fight',
        label: 'Fight it',
        describe: (_s, ctx) => `${money(ctx.amount ?? 0)} to the lawyers now. Half the time the inquiry finds nothing and no ban follows; the other half it finds more, and the ban is two seasons with a ${SCANDAL_FOUGHT_SATISFACTION_HIT}-point dent.`,
        cost: (_s, ctx) => ctx.amount ?? 0,
        apply: (s, ctx) => {
          const team = s.orgs.teams.find((t) => t.id === ctx.subjectId);
          if (random() < SCANDAL_FIGHT_SUCCESS) {
            return entry(s, `The inquiry into ${ctx.subjectName} found nothing it could act on. No ban.`, 'good');
          }
          const through = (s.clock.week >= PLAYOFF_WEEK ? s.clock.year + 1 : s.clock.year) + 1;
          if (team) team.postseasonBanThroughYear = through;
          dentSatisfaction(s, SCANDAL_FOUGHT_SATISFACTION_HIT);
          return entry(s, `The inquiry into ${ctx.subjectName} found more than the papers had: barred from the postseason through ${through}.`, 'bad');
        },
      },
    ],
  },

  {
    // A COACH WHO SUCCEEDS GETS POACHED (Plan 21's PR L) — the leak in the
    // loop the market's reputation gate opens, on the shape
    // 'faculty-outside-offer' already uses. A head coach at the top of the
    // market with a couple of seasons behind them gets an offer; match it
    // with a retention package or let them go and hire again. This is what
    // turns "wait six years" into "keep what you built".
    id: 'coach-poached',
    title: 'A coach with an offer',
    weight: 9,
    eligible: (s) => coachesAtRisk(s).length > 0,
    rollContext: (s) => {
      const at = coachesAtRisk(s);
      if (at.length === 0) return null;
      const { team, coach } = pick(at);
      return {
        subjectId: team.id,
        subjectName: coach.name,
        subjectField: team.name,
        amount: Math.round(coach.salary * COACH_RETENTION_PACKAGE_SALARY_SHARE),
      };
    },
    prompt: (_s, ctx) =>
      `${ctx.subjectName} has been offered the head job at a bigger program, and has been honest enough to say so. ${ctx.subjectField} is what it is because of them. A retention package of ${money(ctx.amount ?? 0)} would keep them.`,
    choices: [
      {
        id: 'keep',
        label: 'Match the offer',
        describe: (_s, ctx) => `${money(ctx.amount ?? 0)} now, and ${ctx.subjectName} stays with ${ctx.subjectField}.`,
        cost: (_s, ctx) => ctx.amount ?? 0,
        apply: (s, ctx) => entry(s, `${ctx.subjectName} turned the offer down and stays with ${ctx.subjectField}.`, 'good'),
      },
      {
        id: 'release',
        label: 'Wish them well',
        describe: (_s, ctx) => `Nothing spent. ${ctx.subjectName} leaves, and ${ctx.subjectField} has a head coach's chair to fill — the market will list somebody for it next week.`,
        cost: () => 0,
        apply: (s, ctx) => {
          const team = s.orgs.teams.find((t) => t.id === ctx.subjectId);
          if (team && team.headCoach?.name === ctx.subjectName) team.headCoach = null;
          return entry(s, `${ctx.subjectName} has left ${ctx.subjectField} for a bigger program.`, 'bad');
        },
      },
    ],
  },

  {
    // THE TOP HAS TO BE HELD (Plan 17's PR D). A rival that passes the
    // school fires this once, for that rival, on the first quiet week the
    // shared cadence allows (eventSystem.ts's fireTrusteeResponse): a
    // trustee proposes a response at a real cost. Fired directly rather
    // than drawn, like the varsity petition, because being passed is a
    // moment and not a mood — but it spends the same decision-event
    // budget, so the defend era's years are not busier than the build
    // era's, only about something else.
    id: 'rival-passed',
    title: 'The board wants a response',
    weight: 0, // never drawn by the weighted lottery — fired by eventSystem.ts's fireTrusteeResponse
    eligible: () => false,
    rollContext: (s) => {
      if (s.history.length === 0) return null;
      const passedBy = buildReportPayload(s).passedBy;
      const name = passedBy.find((n) => {
        const rival = s.rivals.find((r) => r.name === n);
        return rival !== undefined && !s.events.passedResponses.includes(rival.id);
      });
      const rival = name ? s.rivals.find((r) => r.name === name) : undefined;
      if (!rival) return null;
      // A chair in a field the school already teaches — a department to
      // deepen rather than a new one to open — rolled best of N exactly as
      // the visiting scholar is.
      const fields = [...new Set(s.faculty.map((f) => f.field))];
      const field = fields.length > 0 ? pick(fields) : pick(FACULTY_FIELDS);
      const existing = [...s.faculty, ...s.candidates].map((f) => f.name);
      let best = generateCandidate(field, existing);
      for (let i = 1; i < TRUSTEE_CHAIR_CANDIDATE_ROLLS; i += 1) {
        const next = generateCandidate(field, [...existing, best.name]);
        if (next.teachingPotential + next.researchPotential > best.teachingPotential + best.researchPotential) best = next;
      }
      return {
        subjectId: rival.id,
        subjectName: rival.name,
        subjectField: field,
        amount: weeksOfOpEx(s, TRUSTEE_RESPONSE_COST_WEEKS),
        candidate: best,
      };
    },
    prompt: (s, ctx) =>
      `${ctx.subjectName} has passed ${institutionName(s.self)} in this year's table, and the board has noticed. `
      + `A trustee is proposing a response, and either would cost ${money(ctx.amount ?? 0)}: an endowed chair in ${ctx.subjectField}, `
      + `or a campaign the board would put its own name to.`,
    choices: [
      {
        id: 'chair',
        label: `Endow the chair`,
        describe: (_s, ctx) => {
          const c = ctx.candidate;
          return `${money(ctx.amount ?? 0)} up front, and ${c ? `${money(c.salary)}/yr` : 'a salary'} thereafter. `
            + `${c ? `${c.name} takes the chair in ${ctx.subjectField}, teaching ${c.teaching} · researching ${c.research}` : 'A scholar takes the chair'} — the best the board could find.`;
        },
        cost: (_s, ctx) => ctx.amount ?? 0,
        apply: (s, ctx) => {
          const field = ctx.subjectField ?? pick(FACULTY_FIELDS);
          const person = ctx.candidate
            ?? generateCandidate(field, [...s.faculty, ...s.candidates].map((f) => f.name));
          appointFaculty(s, person);
          return entry(s, `${person.name} (${field}) takes the trustees' chair, endowed in answer to ${ctx.subjectName}, at ${money(person.salary)}/yr.`, 'good', 'appointment', person.id);
        },
      },
      {
        id: 'campaign',
        label: "Run the board's campaign",
        describe: (_s, ctx) =>
          `${money(ctx.amount ?? 0)} committed; ${money((ctx.amount ?? 0) * TRUSTEE_CAMPAIGN_MULTIPLIER)} into the endowment at the board's own match. `
          + 'It pays out every year from now on, and feeds the financial-resources input to prestige.',
        cost: (_s, ctx) => ctx.amount ?? 0,
        apply: (s, ctx) => {
          const raised = Math.round((ctx.amount ?? 0) * TRUSTEE_CAMPAIGN_MULTIPLIER);
          s.finance.endowment += raised;
          return entry(s, `The board's campaign, in answer to ${ctx.subjectName}: ${money(raised)} raised into the endowment.`, 'good', 'money');
        },
      },
      {
        id: 'hold',
        label: 'Hold the course',
        describe: () => 'Nothing is spent. The school answers on the field, or does not.',
        cost: () => 0,
        apply: (s, ctx) => entry(s, `The board's response to ${ctx.subjectName} is to hold the course.`, 'info'),
      },
    ],
  },
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
          return `${money(ctx.amount ?? 0)} up front for a program budget — the coaching staff is hired separately, from the Athletics tab's own candidate pool. ` + (
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
          const team = promoteToVarsityTeam(s, club, {
            sport: sport.id,
            name: sport.teamName,
            venueCategory: sport.venueCategory,
            upkeepPerWeek: weeksOfOpEx(s, VARSITY_TEAM_UPKEEP_WEEKS_OF_OPEX),
            status,
          });
          return entry(
            s,
            status === 'active'
              ? `${team.name} is now a varsity program — head coach, assistant coach, and trainer all still to be hired from the Athletics tab.`
              : `${team.name} is now a varsity program, awaiting its venue before it can compete — head coach, assistant coach, and trainer all still to be hired from the Athletics tab.`,
            'good',
          );
        },
      },
      {
        id: 'decline',
        label: 'Stay a club',
        describe: () => `No cash spent. ${VARSITY_DECLINE_SATISFACTION_HIT}-point satisfaction dent that heals over the following weeks. The club keeps everything it already contributes and will petition again in ${VARSITY_PETITION_MIN_TENURE_YEARS} years.`,
        cost: () => 0,
        apply: (s, ctx) => {
          const club = s.orgs.clubs.find((c) => c.id === ctx.subjectId);
          if (club) club.varsityLastAskedYear = s.clock.year;
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
  return offeredChoices(s, event, ctx).some((c) => c.cost(s, ctx) <= 0);
}

// The choices actually put to the player against this context — every
// choice not hidden by it. The modal renders these and the reducer accepts
// only these.
export function offeredChoices(s: GameState, event: DecisionEvent, ctx: DecisionEventContext): DecisionChoice[] {
  return event.choices.filter((c) => !c.hidden?.(s, ctx));
}

// =====================================================================
// THE FIRST YEAR (Plan 16's PR F) — a scripted opening, as letters from
// the board's chair.
//
// The September review found the first year was one click and a wait: a
// new player develops the core, then has nothing to do and no idea what
// comes next, and the first year is the one that decides whether anyone
// sees the tenth. So the opening is scripted — four letters, each with ONE
// thing to do and a "Done" that reads state — and the toolbar carries the
// letter's ask as a next-step line until it is done (see
// systems/guidance/nextStep.ts).
//
// Data, not mechanism: each letter fires through the ordinary interrupt
// system (eventSystem.ts's fireOpeningLetter) on the first quiet week at or
// after its week of year one, exactly as a milestone or a charter does, and
// is skippable from the first letter ("I know the way") for the second
// run. Nothing here grants anything or gates anything: the letters point at
// things the game already offers, and `done` is a reading of the same state
// the build menu and the Curriculum tab read.
// =====================================================================

export interface OpeningLetter {
  id: string;
  week: number;                 // of year one; fires on the first quiet week at or after it
  title: string;
  body: (s: GameState) => string;
  ask: string;                  // the one thing to do, as the toolbar's next-step line carries it
  done: (s: GameState) => boolean;
}

// A placeable Buildable that has been sited — under construction or
// standing — which is what "site a hall" asks for. Read off placements
// rather than status, since placement is how a placeable starts.
function sited(s: GameState, test: (t: Buildable) => boolean): boolean {
  return s.tech.some((t) => test(t) && t.id in s.placements);
}

// How many programs are housed anywhere — the founding three, plus every
// one founded since.
function housedProgramCount(s: GameState): number {
  return Object.values(s.halls).reduce((n, slots) => n + slots.filter((slot) => slot.programId !== null).length, 0);
}

// The opening school's story, read live for letter two (Plan 19): which
// of its majors are still to be founded, and which of those the roster
// could teach today. Named rather than gestured at, because the
// dedication goal is countable — three rooms, three programs — and a
// letter that says "hire in general" is a letter that says nothing.
function openingSchoolGap(s: GameState): { school: string; staffable: string[]; unstaffed: string[] } {
  const school = programById(FOUNDING_PROGRAMS[0])?.school ?? '';
  const missing = programs().filter((p) => p.kind === 'major' && p.school === school && !FOUNDING_PROGRAMS.includes(p.id));
  const staffable: string[] = [];
  const unstaffed: string[] = [];
  for (const program of missing) {
    const housed = Object.values(s.halls).some((slots) => slots.some((slot) => slot.programId === program.id));
    if (housed) continue;
    (s.faculty.some((f) => f.field === program.field) ? staffable : unstaffed).push(program.name);
  }
  return { school, staffable, unstaffed };
}

function list(names: string[]): string {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

// Small counts in words, as a letter would write them.
const COUNT_WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
function count(n: number): string {
  return COUNT_WORDS[n] ?? String(n);
}

export const OPENING_LETTERS: readonly OpeningLetter[] = [
  {
    id: 'doors-open',
    week: 1,
    title: 'The doors open',
    body: (s) => {
      const founding = FOUNDING_PROGRAMS.map((id) => programById(id)?.name ?? id);
      const offers = s.programOffers.map((id) => programById(id)?.name ?? id);
      return `The ${s.self.name} board wishes you well. Three hundred and fifty students are on the books, five professors are on the payroll, and Founders Hall is the only building we own — and it is teaching: ${list(founding)}, two courses each, with three rooms still empty. ${offers.length > 0 ? `${list(offers)} are on offer. ` : ''}Open Founders Hall on the map and found one of them into a free room: the program's first course starts the moment you pick who teaches it. A fourth program is the first decision this college makes, and the one every decision after it is shaped like.`;
    },
    ask: 'Found a fourth program in Founders Hall (Curriculum)',
    done: (s) => housedProgramCount(s) > FOUNDING_PROGRAMS.length,
  },
  {
    id: 'a-building',
    week: 5,
    title: 'One school, or a building of your own',
    body: (s) => {
      const gap = openingSchoolGap(s);
      const want = [...gap.staffable, ...gap.unstaffed];
      const staffing = gap.staffable.length > 0 && gap.unstaffed.length > 0
        ? `The roster can already teach ${list(gap.staffable)}; ${list(gap.unstaffed)} needs an appointment first, and that is the one hire the school still asks of us.`
        : gap.unstaffed.length > 0
          ? `Each of them needs an appointment before its first course can start.`
          : `The roster can teach every one of them.`;
      return `Six programs of one school in one hall is what founds a school, and we are half-way to one: ${count(FOUNDING_PROGRAMS.length)} of the six ${gap.school} programs are in Founders Hall, which has exactly ${count(want.length)} rooms left, and ${list(want)} would fill them. ${staffing} The other road is a hall of your own: the first academic hall holds six programs, costs three quarters of a million, and opens once this college teaches ${count(FIRST_HALL_COURSE_GATE)} courses. Depth costs professors; breadth costs a building. Where you put it matters only to the eye.`;
    },
    ask: 'Fill Founders Hall with one school, or site a hall of your own (Build)',
    done: (s) => dedicatedSchool(s, FOUNDERS_HALL_ID) !== null || sited(s, (t) => isAcademicHall(t) && t.id !== FOUNDERS_HALL_ID),
  },
  {
    id: 'somewhere-to-sleep',
    week: 9,
    title: 'Somewhere to sleep, somewhere to eat',
    body: (s) => `Satisfaction is ${s.students.satisfaction.toFixed(0)} and falling, and the students are right: every one of the ${s.students.classes.freshman + s.students.classes.sophomore + s.students.classes.junior + s.students.classes.senior} commutes, there is nowhere on campus to eat, and there is no library. Housing is not a cap on how many we admit — this college can grow with no bed at all — but a school with nowhere to sleep and nowhere to eat talks itself down, and next summer's applicants hear it. Site a residence hall and a dining hall.`,
    ask: 'Site a residence hall and a dining hall (Build)',
    done: (s) => sited(s, (t) => t.kind === 'dorm') && sited(s, (t) => t.facilityType === 'diningHall'),
  },
  {
    id: 'summer-is-coming',
    week: 48,
    title: 'Summer is coming',
    body: () => 'At week 52 the clock stops for the summer, and it stops once. Four beats: the year in review, where the school stands, admissions, and the students. Admissions asks two things — the price, and how much of the pool to take. Understand one thing before you set the price: it is set blind, it locks, and the class that pays it pays it for four years. What a family is quoted is what they pay, and a school nobody has heard of cannot charge what a famous one does.',
    ask: 'Summer at week 52: the price locks for four years',
    done: () => true,
  },
];

export function findOpeningLetter(id: string): OpeningLetter | undefined {
  return OPENING_LETTERS.find((letter) => letter.id === id);
}
