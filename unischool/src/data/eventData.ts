import type { EventDomain } from './seatData';
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
import { FIRST_HALL_COURSE_GATE, FOUNDERS_HALL_ID, academicHallId, graduateProgram, milestoneSchools, programById } from './techData';
import { FOUNDING_PROGRAMS } from './foundingData';
import { claimedHalls, dedicatedHalls, dedicatedSchool, nextSchoolToMove, programsAwayFromHome, type Claim } from '../systems/techtree/schools';
import { FOUNDERS_MOVE_WEEKS, RELOCATION_WEEKS } from '../systems/techtree/techSystem';
import { buildReportPayload, rankBy } from '../systems/rivals/rivalsSystem';
import { money } from '../format';
import { clamp } from '../math';
import { random } from '../engine/random';

// ---------------------------------------------------------------------
// Week-to-week texture, as authored data. Both halves ride the existing
// interrupt system (docs/architecture/interrupts.md): eventSystem.ts is an
// ordinary pure tick that reads these tables and sets s.pendingInterrupt.
//
//  1. Milestone celebrations: a stop-the-clock moment for aggregate
//     accomplishments only (MILESTONE_INTERRUPT_KINDS), spaced at least
//     MILESTONE_INTERRUPT_MIN_WEEKS_BETWEEN apart.
//  2. Authored decision events: a trigger condition, a prompt, and choices
//     whose effects go through existing hooks (cash, endowment,
//     satisfaction, the faculty roster).
//
// What a choice may touch:
//   - Never prestige directly: s.self.reputation is a stock that drifts
//     toward a computed target (prestigeSystem.ts). Prestige-flavoured
//     events pay into the endowment, a capped input to that target.
//   - Never s.students.applicantPool: the summer funnel overwrites it.
//   - Satisfaction hits are transient (the stock drifts back at
//     SATISFACTION_DRIFT_RATE); their teeth are in landing before summer.
//
// No-soft-lock invariant: every event must offer a choice that costs
// nothing. eventSystem.ts checks it at fire time (hasFreeChoice), so a
// paid-only event never fires.
// ---------------------------------------------------------------------

// Weeks since founding, counting from 1: the clock flattened into one
// comparable number.
export function absoluteWeek(s: GameState): number {
  return (s.clock.year - 1) * WEEKS_PER_YEAR + s.clock.week;
}

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(random() * items.length)];
}

// =====================================================================
// MILESTONE CELEBRATIONS — which accomplishments stop the clock
// =====================================================================

// Milestone keys are `<kind>:<subject>`. Only these kinds interrupt play,
// all aggregate accomplishments (a whole major or school), never a single
// course. This list is the frequency dial.
export const MILESTONE_INTERRUPT_KINDS: readonly string[] = [
  // Six programs of one school in one hall; the celebration reveals the
  // school's name.
  'school-founded',
  'program-established',
  'program-distinguished',
  'school-distinguished',
  // Founding a graduate program (docs/design/graduate-programs.md): a few
  // per run, all late.
  'grad-program-complete',
];

// Minimum weeks between celebrations. Milestones inside the window queue on
// s.events.pendingMilestones and fold into the next one, so a burst is one
// modal.
export const MILESTONE_INTERRUPT_MIN_WEEKS_BETWEEN = 12;

export function milestoneKind(key: string): string {
  return key.split(':')[0];
}

// Called by techSystem.ts as it awards, so the queue only holds keys that
// will be celebrated.
export function isCelebratedMilestone(key: string): boolean {
  return MILESTONE_INTERRUPT_KINDS.includes(milestoneKind(key));
}

// One line of the celebration modal, derived from the key at celebration
// time so a queued celebration is still accurate when it fires.
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
        : `Every course in the ${program.degree} program is finished. A research degree counts toward curriculum breadth AND toward the college's research standing, both as capped inputs to the prestige target.`,
      unlocks: [],
    };
  }

  if (kind === 'school-founded') {
    return {
      key,
      headline: `This is the School of ${subject}`,
      detail: `Six programs, one building. Until now these were ${subject}'s programs in a color with no name; housed together, they are a school, and the hall they share is ${subject} Hall. The name is permanent, and a donor may now put a family name on it.`,
      unlocks: s.tech
        .filter((t) => t.schoolGate === subject && t.status !== 'locked')
        .map((t) => t.name),
    };
  }

  if (kind === 'school-distinguished') {
    return {
      key,
      headline: `${subject} is fully distinguished`,
      detail: 'Every program in the school is distinguished. A distinguished school is the heaviest single contribution curriculum breadth can make to the prestige target, and it can train its successors: once every one of its courses is taught, its graduate programs open in the capital project built to house them.',
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
          detail: `Every tier-2 course in ${major.name} (${school.schoolName}) is finished. The program counts toward curriculum breadth from now on — the largest input to the prestige target — and its tier-3 catalog is open.`,
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
// Authored decision events: the trigger model
// =====================================================================
// Each quiet week (no other interrupt pending) rolls
// DECISION_EVENT_WEEKLY_CHANCE. On a hit, one event is drawn by `weight`
// from those whose `eligible` holds and whose cooldown and fire cap have
// cleared. The expected gap is the cooldown plus 1/chance, about 33 weeks.
// =====================================================================

export const DECISION_EVENT_FIRST_YEAR = 3;             // nothing fires during the founding ramp — year 1-2 is the tutorial-by-design stretch
export const DECISION_EVENT_WEEKLY_CHANCE = 0.03;      // per quiet week, once the cooldown has cleared
export const DECISION_EVENT_COOLDOWN_WEEKS = 20;        // minimum quiet stretch between ANY two decision events
export const DECISION_EVENT_REPEAT_COOLDOWN_WEEKS = 156; // the same event may not return inside three years

// Money here is in weeks of operating cost (moneyScale.ts), so each figure
// scales across a run whose budget spans four orders of magnitude. A rolled
// figure is fixed at fire time and carried in the payload
// (DecisionEventContext.amount), never re-rolled: the number in the modal is
// the number applied.

// Whatever the event rolled about itself when it fired. Plain JSON: it
// rides in s.pendingInterrupt.payload and therefore through save/load.
export interface DecisionEventContext {
  subjectId?: string;    // a faculty id, or a Buildable id
  subjectName?: string;  // that subject's display name, resolved when the event fired
  subjectField?: string; // a Faculty field, for events that are about a discipline rather than a person
  amount?: number;       // a rolled sum of money, fixed at fire time
  donorName?: string;    // a rolled person surname, for events framed as a named gift (see 'naming-rights')
  newName?: string;      // the new display name a choice would apply, fixed at fire time (see 'naming-rights')
  // A whole person, rolled at fire time (see 'visiting-scholar') so the
  // modal names and prices exactly the person appointed.
  candidate?: Faculty;
  // A whole coach, rolled at fire time for the same reason (see
  // 'ad-shortage').
  coach?: Coach;
}

export interface DecisionChoice {
  id: string;
  label: string;
  // Not offered against this context when true (omitted = always offered).
  // A hidden choice never counts as the event's free choice.
  hidden?(s: GameState, ctx: DecisionEventContext): boolean;
  // What taking this choice does, in numbers. Rendered in the modal;
  // apply() does exactly what this says.
  describe(s: GameState, ctx: DecisionEventContext): string;
  // Cash charged up front, by the reducer; 0 for a free choice. An
  // unaffordable choice is shown disabled and refused by the reducer.
  cost(s: GameState, ctx: DecisionEventContext): number;
  // Mutates shared state through existing hooks only, and returns the log
  // line. The cash cost above is charged by the reducer, not here.
  apply(s: GameState, ctx: DecisionEventContext): LogEntry;
  // How the choice lands with the people it touches, for a seat's
  // "popular" policy (systems/delegation/seats.ts): the satisfaction it
  // costs as a negative, goodwill as a positive. Omitted = 0.
  mood?: number;
}

export interface DecisionEvent {
  id: string;
  title: string;
  // Whose routine it is (data/seatData.ts): a seat covering the domain
  // answers it by policy. 'board' is the president's own.
  domain: EventDomain;
  weight: number;                     // relative draw weight among everything eligible this week
  // A multiplier on weight, read at draw time (e.g. donor events in a title
  // year). Omitted = 1.
  boost?(s: GameState): number;
  maxFires?: number;                  // omitted = unlimited (subject to DECISION_EVENT_REPEAT_COOLDOWN_WEEKS)
  prompt(s: GameState, ctx: DecisionEventContext): string;
  // Can this event happen at all right now? Pure, reads state only.
  eligible(s: GameState): boolean;
  // Rolls what the event needs to know about itself. Null means "not
  // possible this week" and the draw moves on.
  rollContext?(s: GameState): DecisionEventContext | null;
  choices: DecisionChoice[];
}

function entry(s: GameState, message: string, kind: LogEntry['kind'], topic?: LogTopic, subject?: string): LogEntry {
  return { year: s.clock.year, week: s.clock.week, message, kind, topic, subject };
}

// Satisfaction is a drifting stock, so this dent heals over the following
// weeks.
function dentSatisfaction(s: GameState, points: number): void {
  s.students.satisfaction = clamp(s.students.satisfaction - points, 0, 100);
}

// Buildings a naming-rights offer may target: dedicated halls
// (systems/techtree/schools.ts) not yet carrying a `donorSurname`. Read live,
// so a hall that has lost its purity is not on offer: a donor names a school.
function unnamedSchoolBuildings(s: GameState): Buildable[] {
  return dedicatedHalls(s)
    .map(({ hallId }) => s.tech.find((t) => t.id === hallId))
    .filter((t): t is Buildable => t !== undefined && !t.donorSurname && t.status === 'done');
}

function findChapter(s: GameState, id: string | undefined): GreekChapter | undefined {
  return s.orgs.chapters.find((c) => c.id === id);
}

// Chapters never asked about housing. Each is asked at most once, so the
// petition can never become a modal spiral.
function chaptersAwaitingHousing(s: GameState): GreekChapter[] {
  return s.orgs.chapters.filter((c) => !c.housed && !c.housingAsked);
}

// One house per chapter, derived from its id, so the pairing survives
// save/load.
export function chapterHouseId(chapterId: string): string {
  return `chapter-house:${chapterId}`;
}

// A disbanded chapter's house must be torn down with it, or it would sit
// ownerless in the siting tray or on the map.
function removeChapterHouse(s: GameState, chapterId: string): void {
  const id = chapterHouseId(chapterId);
  s.tech = s.tech.filter((t) => t.id !== id);
  delete s.placements[id];
}

// --- per-event tuning ------------------------------------------------
const NAMING_RIGHTS_MIN_WEEKS = 4;
const NAMING_RIGHTS_MAX_WEEKS = 8;
const NAMING_RIGHTS_PRESTIGE_GATE = 40;   // nobody buys naming rights at a school nobody has heard of
const NAMING_RIGHTS_SATISFACTION_HIT = 5;
// A title year (studentLifeData.ts's inTitleYear) lifts the donor events'
// draw weight.
const TITLE_YEAR_DONOR_BOOST = 1.6;

// What a donor's name goes on for an athletics venue ("Whitfield Field");
// school halls use the "X School of Y" form.
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

// Recruiting-scandal exposure: a multiplier on its weight that rises with
// the pot (a point per $1.5M), with flagship programs, and with how far
// athletic standing has outrun the school's reputation.
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

// Head coaches a bigger program would come for: quality of at least
// COACH_POACH_QUALITY, with COACH_POACH_MIN_TENURE_YEARS behind them.
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

// The trustees' response ('rival-passed'). Paid choices cost several weeks
// of opex, because a free response would not be one. The chair is a best-of-N
// roll in a field the school already teaches; the campaign endows at a match
// the ordinary campaign never reaches. Neither writes prestige.
const TRUSTEE_RESPONSE_COST_WEEKS = 3;
const TRUSTEE_CHAIR_CANDIDATE_ROLLS = 5;
const TRUSTEE_CAMPAIGN_MULTIPLIER = 2.2;

// The AD's shortage ask ('ad-shortage'): a coach, at a shallow roll.
const AD_SHORTAGE_COST_WEEKS = 0.8;
const AD_SHORTAGE_COACH_ROLLS = 3;

// --- student organizations (see data/studentLifeData.ts) ---------------
//
// Clubs and new chapters never stop the clock (they are answered in a batch
// at summer admissions). The consequential Greek beats are authored here so
// they share the decision-event budget rather than adding to it: the weights
// set Greek life's share of the mix, not the number of modals.
//
// Every Greek entry's eligible() reads s.orgs.hellenicCouncilApproved, and
// the council question is maxFires: 1, so declining closes Greek life for
// the run. HELLENIC_COUNCIL_MIN_CLUBS is tuned so the question lands within
// 3-5 years of the student center that seeds the club scene.
export const HELLENIC_COUNCIL_MIN_CLUBS = 2;
const GREEK_SCANDAL_PR_COST_WEEKS = 1.8;
const GREEK_SCANDAL_PR_SATISFACTION_HIT = 3; // standing behind the chapter costs goodwill, as standing behind a professor does
const GREEK_HOUSE_BUILD_COST_WEEKS = 3.5;   // a chapter house is a real building, priced against the facility chain
const GREEK_HOUSE_UPKEEP_WEEKS_OF_OPEX = 0.004; // and it roughly doubles that chapter's weekly line, forever
const GREEK_HOUSE_REFUSAL_SATISFACTION_HIT = 2;

// --- varsity athletics (see data/studentLifeData.ts) -------------------
//
// Going varsity only reveals the required venue (techSystem.ts's
// meetsUnlockGates makes it 'available' once a team references its
// category); the player still places and builds it. So
// VARSITY_ESTABLISH_COST_WEEKS prices only the program's launch (uniforms,
// conference dues): never the building, and never the coaching staff, who
// are hired separately and draw their own salaries (studentLifeData.ts's
// coachSalaryFor).
const VARSITY_ESTABLISH_COST_WEEKS = 2.5;
const VARSITY_TEAM_UPKEEP_WEEKS_OF_OPEX = 0.003;        // the program's own running cost, on top of its coaching staff — travel, equipment, officiating
const VARSITY_DECLINE_SATISFACTION_HIT = 2;             // same weight as a chapter's housing refusal — the club stays exactly as it was, just told no

// The week of the year a club's varsity petition fires (eventSystem.ts's
// fireVarsityPetition): three-quarters through, 13 weeks from both summer
// admissions and the midyear U.S. News report, so it reads as its own moment.
export const VARSITY_PETITION_WEEK = Math.floor((WEEKS_PER_YEAR * 3) / 4);

// =====================================================================
// The table. Triggers are state-driven, not calendar-driven: a donor shows
// up once the school is worth donating to. Since Plan 32 it holds only the
// questions that belong to a system (naming, Greek life, athletics, the
// rival); the texture is the catalog's (data/eventCatalogue.ts). A saved
// interrupt naming a retired event resolves as "an event has passed".
// =====================================================================
export const DECISION_EVENTS: readonly DecisionEvent[] = [
  {
    id: 'naming-rights',
    title: 'A naming-rights offer',
    domain: 'board',
    // Tuned so most runs name every school before year 60; eligible()
    // retires the offer once the pool is empty.
    weight: 18,
    boost: (s) => (inTitleYear(s) ? TITLE_YEAR_DONOR_BOOST : 1),
    eligible: (s) => s.self.reputation >= NAMING_RIGHTS_PRESTIGE_GATE && (unnamedSchoolBuildings(s).length > 0 || unnamedVenues(s).length > 0),
    // Rolls the donor and the resulting name together at fire time, so the
    // modal shows exactly what apply() sets. Athletics venues share the pool
    // with unnamed schools (marked by subjectField 'venue'), so there is one
    // stream of offers.
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
      ? `An alumnus, ${ctx.donorName}, offers ${money(ctx.amount ?? 0)} to put the family name over the gate of the ${ctx.subjectName} — permanently. It would become ${ctx.newName}. The check clears immediately. The student section has opinions.`
      : `An alumnus, ${ctx.donorName}, offers ${money(ctx.amount ?? 0)} to put the family name on the School of ${ctx.subjectName} — permanently. It would become the ${ctx.newName}. The check clears immediately. The student paper has already written the editorial.`),
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
          // Renaming sets the Buildable's stored `name`, so every reader
          // picks it up. `donorSurname` marks it as donor text, which the
          // Curriculum tab (CurriculumTab.tsx's buildSections) shows
          // verbatim rather than as "School of X".
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

  // ---------------------------------------------------------------------
  // Greek life: the council opt-in, then two events that can fire only
  // once it has been taken.
  // ---------------------------------------------------------------------

  {
    id: 'hellenic-council',
    title: 'A petition for a Hellenic Council',
    domain: 'students',
    // A one-shot question a run should actually be asked: weighted to
    // dominate its pool once the club gate clears, and capped at one firing.
    weight: 45,
    maxFires: 1,
    eligible: (s) => !s.orgs.hellenicCouncilOffered && s.orgs.clubs.length >= HELLENIC_COUNCIL_MIN_CLUBS,
    prompt: (s) =>
      `The ${s.orgs.clubs.length} recognized student societies have sent a joint delegation: they want the college to charter a Hellenic Council and permit Greek-letter organizations on campus. Fraternities and sororities would bring a great deal of student life with them, and a great deal of everything that comes with student life.`,
    choices: [
      {
        id: 'charter',
        mood: 1,
        label: 'Charter the council',
        describe: () =>
          `Chapters begin forming from here on, each petitioning for recognition in the summer's Students beat like any other society. A chapter is worth ${CHAPTER_SOCIAL_BONUS} points of social satisfaction against a club's fraction of that, carries a real recurring cost, and will eventually bring you its own problems.`,
        cost: () => 0,
        apply: (s) => {
          s.orgs.hellenicCouncilApproved = true;
          s.orgs.hellenicCouncilOffered = true;
          return entry(s, 'A Hellenic Council has been chartered; Greek-letter organizations may now form on campus.', 'good');
        },
      },
      {
        id: 'decline',
        label: 'Decline — no Greek life here',
        describe: () =>
          'Nothing changes, permanently. No fraternity or sorority will ever form at the college, and you will not be asked again. Clubs are unaffected.',
        cost: () => 0,
        apply: (s) => {
          s.orgs.hellenicCouncilOffered = true;
          return entry(s, `The Hellenic Council is declined; ${institutionName(s.self)} will have no Greek life.`, 'info');
        },
      },
    ],
  },

  {
    id: 'greek-scandal',
    title: 'A chapter in disgrace',
    domain: 'students',
    // Greek life's share of the decision-event budget for scandals.
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
      return `${ctx.subjectName} — ${size} members, chartered in ${chapter ? `Year ${chapter.foundedYear}` : 'an earlier year'} — is on the front page, and not for its philanthropy. Counsel and a communications firm will see the chapter through for ${money(ctx.amount ?? 0)}. The alternative is to pull its charter.`;
    },
    choices: [
      {
        id: 'pr',
        mood: -GREEK_SCANDAL_PR_SATISFACTION_HIT,
        label: 'Fund a public-relations campaign',
        describe: (_s, ctx) =>
          `${money(ctx.amount ?? 0)} up front. ${ctx.subjectName} keeps its charter and everything it contributes; satisfaction takes a ${GREEK_SCANDAL_PR_SATISFACTION_HIT}-point dent that heals over the following weeks.`,
        cost: (_s, ctx) => ctx.amount ?? 0,
        apply: (s, ctx) => {
          dentSatisfaction(s, GREEK_SCANDAL_PR_SATISFACTION_HIT);
          return entry(s, `${institutionName(s.self)} has stood behind ${ctx.subjectName}; the campus is divided.`, 'info');
        },
      },
      {
        // The free choice (the no-soft-lock invariant), and the durable
        // one: it removes the chapter's satisfaction contribution and its
        // weekly cost for good.
        id: 'disband',
        mood: -CHAPTER_SOCIAL_BONUS,
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
          // A housed chapter's beds go with its house (they were added
          // straight to capacity when it was housed).
          if (findChapter(s, ctx.subjectId)?.housed) s.students.capacity = Math.max(0, s.students.capacity - CHAPTER_HOUSE_CAPACITY_BONUS);
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
    domain: 'students',
    // Each chapter asks at most once, so supply is bounded; the weight is
    // tuned so most chapters get to ask within a run.
    weight: 14,
    eligible: (s) => s.orgs.hellenicCouncilApproved && chaptersAwaitingHousing(s).length > 0,
    // One chapter at a time, never asked before; both answers set
    // housingAsked.
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
      return `${ctx.subjectName} has outgrown its meeting room: ${size} members, and an alumni committee with drawings for a dedicated chapter house on the edge of campus. The college's share of the build is ${money(ctx.amount ?? 0)}.`;
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
            // Folded into the chapter's own line, so disbanding takes the
            // house's cost with it.
            chapter.upkeepPerWeek += weeksOfOpEx(s, GREEK_HOUSE_UPKEEP_WEEKS_OF_OPEX);
            // Real beds, applied directly because a chapter house is not a
            // Buildable with effects of its own.
            s.students.capacity += CHAPTER_HOUSE_CAPACITY_BONUS;
            // Revealed for the player to place rather than auto-placed.
            // Cost and duration are 0: the school's share was charged
            // above, so only siting remains. `chapterHouse: true` groups it
            // under Housing in BuildPopup.tsx and gives its tile a beds
            // figure. No `effects`: its satisfaction and upkeep are already
            // read off the chapter and would be doubled.
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
        mood: -GREEK_HOUSE_REFUSAL_SATISFACTION_HIT,
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
  // Varsity athletics. 'varsity-petition' (below) is never drawn by the
  // weighted lottery: its eligible() is always false, and it fires on a
  // fixed schedule (VARSITY_PETITION_MIN_TENURE_YEARS after a club's
  // founding, from VARSITY_PETITION_WEEK) via eventSystem.ts's
  // fireVarsityPetition, as the same 'decision-event' interrupt.
  // ---------------------------------------------------------------------
  {
    id: 'ad-shortage',
    title: 'The director wants a chair filled',
    domain: 'board',
    // In the weighted lottery rather than on a cadence of its own: a
    // decision event changes the mix of what stops the clock, never how
    // often (docs/architecture/interrupts.md).
    weight: 7,
    // The director is the one raising it, so there has to be one.
    eligible: (s) => s.orgs.athleticDirector !== null && vacantChairs(s).length > 0,
    rollContext: (s) => {
      const chairs = vacantChairs(s);
      if (chairs.length === 0) return null;
      // A head coach first when one is open: teamQuality weights that chair
      // heaviest, and it is the one a director would actually raise.
      const chair = chairs.find((c) => c.role === 'head') ?? pick(chairs);
      const field = fieldForChair(chair);

      // Best of N, as 'visiting-scholar': what the money buys is quality.
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
      return `${ad?.name ?? 'The Athletic Director'} has been on at you about ${ctx.subjectName}: it has been running without a ${role}, `
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
          // The fallback roll resolves an interrupt saved before the coach
          // was part of the context.
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
    // The recruiting scandal. Its likelihood rises with exposure the player
    // chose (scandalExposure); the penalty is a postseason ban, not cash.
    id: 'recruiting-scandal',
    title: 'A recruiting scandal',
    domain: 'board',
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
      `A booster's payments to recruits for ${ctx.subjectName} have reached the papers, and the association has opened an inquiry. ${s.orgs.athleticDirector?.name ?? 'The Athletic Director'} says the program can self-report and take the season's ban, or the college can fight it — ${money(ctx.amount ?? 0)} in lawyers, and no promise.`,
    choices: [
      {
        id: 'cooperate',
        label: 'Self-report and take the ban',
        describe: (s, ctx) => `Nothing spent. ${ctx.subjectName} is barred from the postseason through Year ${s.clock.week >= PLAYOFF_WEEK ? s.clock.year + 1 : s.clock.year}; a ${SCANDAL_SATISFACTION_HIT}-point dent in satisfaction that heals.`,
        cost: () => 0,
        apply: (s, ctx) => {
          const team = s.orgs.teams.find((t) => t.id === ctx.subjectId);
          const through = s.clock.week >= PLAYOFF_WEEK ? s.clock.year + 1 : s.clock.year;
          if (team) team.postseasonBanThroughYear = through;
          dentSatisfaction(s, SCANDAL_SATISFACTION_HIT);
          return entry(s, `${ctx.subjectName} self-reported and is barred from the postseason through Year ${through}.`, 'bad');
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
    // A successful head coach gets an offer (coachesAtRisk): match it with a
    // retention package or hire again. Same shape as 'faculty-outside-offer'.
    id: 'coach-poached',
    title: 'A coach with an offer',
    domain: 'board',
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
    // Fired once per rival that passes the school, on the first quiet week
    // the shared cadence allows (eventSystem.ts's fireTrusteeResponse),
    // rather than drawn; it still spends the decision-event budget.
    id: 'rival-passed',
    title: 'The board wants a response',
    domain: 'board',
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
      // A chair in a field the school already teaches, rolled best of N as
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
        describe: () => 'Nothing is spent. The college answers on the field, or does not.',
        cost: () => 0,
        apply: (s, ctx) => entry(s, `The board's response to ${ctx.subjectName} is to hold the course.`, 'info'),
      },
    ],
  },
  {
    id: 'varsity-petition',
    title: 'A petition to go varsity',
    domain: 'board',
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
        : `The college has no venue for ${sport?.teamName ?? 'this sport'} yet — going varsity means building ${venue ? venue.name : 'one'} before the team can actually compete.`;
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
              : `${venue ? venue.name : 'A shared venue'} is revealed for construction in the build menu — the team is varsity-active once it is built, and shared with any other team in the same category.`
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
        describe: () => `No cash spent, and a ${VARSITY_DECLINE_SATISFACTION_HIT}-point satisfaction dent that heals over the following weeks. The club keeps everything it already contributes and will petition again in ${VARSITY_PETITION_MIN_TENURE_YEARS} years.`,
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
// The opening letters from the board's chair, each with one thing to do and
// a `done` that reads state. The toolbar carries the ask until it is done
// (systems/guidance/nextStep.ts). Each fires through the interrupt system
// (eventSystem.ts's fireOpeningLetter) on the first quiet week it is due,
// and the set is skippable. Letters grant and gate nothing.
//
// Two kinds (Plan 55). A calendar letter is due at its week of year one and
// is never sent after it. A letter with `arrives` waits on the college
// instead, in any year: these teach the line of play, which is to found
// programs in Founders Hall, then move them out, school by school, into
// halls of their own (systems/techtree/schools.ts's sorting readings).
// =====================================================================

// The one thing a letter asks, as the toolbar's next-step line carries it:
// the build menu, or a hall's panel on the map.
export interface LetterAsk {
  text: string;
  go?: 'build' | 'hall';
  hallId?: string;
}

export interface OpeningLetter {
  id: string;
  // Of year one: a calendar letter fires on the first quiet week at or after
  // it. Ignored when `arrives` is set.
  week: number;
  // A letter that waits on the college, not the calendar: due the first
  // quiet week this holds, in any year. One whose ask is already done by
  // then is recorded read and never sent.
  arrives?: (s: GameState) => boolean;
  title: string;
  body: (s: GameState) => string;
  ask: (s: GameState) => LetterAsk;
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

function list(names: string[]): string {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

// Small counts in words, as a letter would write them.
const COUNT_WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
function count(n: number): string {
  return COUNT_WORDS[n] ?? String(n);
}

// The chain's first two rungs, by their seeded names (techData.ts).
const FIRST_HALL_ID = academicHallId(0);
const SECOND_HALL_ID = academicHallId(1);
function hallName(s: GameState, hallId: string): string {
  return s.tech.find((t) => t.id === hallId)?.name ?? 'the new hall';
}
function standing(s: GameState, hallId: string): boolean {
  return s.tech.find((t) => t.id === hallId)?.status === 'done';
}

// The programs of a school still away from home, by name.
function awayNames(s: GameState, school: string): string[] {
  return programsAwayFromHome(s)
    .filter((p) => p.school === school)
    .map((p) => programById(p.programId)?.name ?? p.programId);
}

// The school furthest along in a hall of its own.
function leadingClaim(s: GameState): ({ hallId: string } & Claim) | undefined {
  return [...claimedHalls(s)].sort((a, b) => b.housed - a.housed)[0];
}

// Two schools each in a hall of its own.
function twoSchoolsHoused(s: GameState): boolean {
  return new Set(claimedHalls(s).map((c) => c.school)).size >= 2;
}

// Founders Hall's panel, where a move out of it starts.
const FOUNDERS_HALL_ASK = { go: 'hall', hallId: FOUNDERS_HALL_ID } as const;

export const OPENING_LETTERS: readonly OpeningLetter[] = [
  {
    id: 'doors-open',
    week: 1,
    title: 'The doors open',
    body: (s) => {
      const founding = FOUNDING_PROGRAMS.map((id) => programById(id)?.name ?? id);
      const offers = s.programOffers.map((id) => programById(id)?.name ?? id);
      return `The ${s.self.name} board wishes you well. Three hundred and fifty students are on the books, five professors are on the payroll, and Founders Hall is the only building we own — and it is teaching: ${list(founding)}, two courses each, with three rooms still empty. ${offers.length > 0 ? `${list(offers)} are on offer. ` : ''}Open Founders Hall on the map and found one of them into a free room: the program's first course starts the moment you pick who teaches it. Founders Hall is where every program begins, and none of them will stay: in time each moves into a hall of its own school.`;
    },
    ask: () => ({ text: 'Found a fourth program in Founders Hall', ...FOUNDERS_HALL_ASK }),
    done: (s) => housedProgramCount(s) > FOUNDING_PROGRAMS.length,
  },
  {
    id: 'a-hall-of-its-own',
    week: 1,
    // The ladder's 'curriculum' milestone opens the first hall.
    arrives: (s) => s.tech.some((t) => t.id === FIRST_HALL_ID && t.status !== 'locked'),
    title: 'A hall of its own',
    body: (s) => {
      const schools = [...new Set((s.halls[FOUNDERS_HALL_ID] ?? [])
        .map((slot) => (slot.programId ? programById(slot.programId)?.school : undefined))
        .filter((school): school is string => school !== undefined))];
      const elm = hallName(s, FIRST_HALL_ID);
      return `${count(FIRST_HALL_COURSE_GATE)[0].toUpperCase()}${count(FIRST_HALL_COURSE_GATE).slice(1)} courses: this college has a curriculum. Founders Hall teaches ${count(schools.length)} ${schools.length === 1 ? 'school' : 'schools'} under one roof${schools.length > 1 ? ` — ${list(schools)}` : ''} — and it will never be one school's hall: it is where programs start. A school is six of its programs in a hall of its own, and ${elm} is the first: six rooms, three quarters of a million, sixteen weeks to build. Site it now; when it stands, the first school moves in.`;
    },
    ask: (s) => ({ text: `Site ${hallName(s, FIRST_HALL_ID)}`, go: 'build' }),
    done: (s) => FIRST_HALL_ID in s.placements,
  },
  {
    id: 'somewhere-to-sleep',
    week: 9,
    title: 'Somewhere to sleep, somewhere to eat',
    body: (s) => {
      // What the students lack as the letter is written: each complaint only
      // while it is true.
      const has = (test: (t: Buildable) => boolean) => s.tech.some((t) => test(t) && t.status === 'done');
      const wants = [
        has((t) => t.kind === 'dorm') ? '' : 'most of them go home at night',
        has((t) => t.facilityType === 'diningHall') ? '' : 'there is nowhere on campus to eat',
        has((t) => t.facilityType === 'library') ? '' : 'there is no library',
      ].filter((w) => w !== '');
      const lack = wants.length > 0 ? ` As it stands, ${list(wants)}.` : '';
      return `Satisfaction is ${s.students.satisfaction.toFixed(0)}.${lack} Housing is not a cap on how many we admit — this college can grow with no bed at all — but a college with nowhere to sleep and nowhere to eat talks itself down, and next summer's applicants hear it. Site a residence hall and a dining hall.`;
    },
    ask: () => ({ text: 'Site a residence hall and a dining hall', go: 'build' }),
    done: (s) => sited(s, (t) => t.kind === 'dorm') && sited(s, (t) => t.facilityType === 'diningHall'),
  },
  {
    id: 'summer-is-coming',
    week: 48,
    title: 'Summer is coming',
    body: () => 'At week 52 the clock stops for the summer, and it stops once. Three beats: the year in review, admissions, and the students. Admissions asks two things — the price, and how much of the pool to take. Understand one thing before you set the price: it is set blind, it locks, and the class that pays it pays it for four years. What a family is quoted is what they pay, and a college nobody has heard of cannot charge what a famous one does.',
    ask: () => ({ text: 'Summer at week 52: the price locks for four years' }),
    // Done when the summer comes, not the moment the letter is read (Plan 35).
    done: (s) => s.clock.week >= WEEKS_PER_YEAR || s.pendingInterrupt?.type === 'summer',
  },
  {
    id: 'moving-in',
    week: 1,
    arrives: (s) => standing(s, FIRST_HALL_ID),
    title: 'Moving in',
    body: (s) => {
      const elm = hallName(s, FIRST_HALL_ID);
      const school = nextSchoolToMove(s);
      if (school === null) return `${elm} stands. Found a program into it, and every program of that school after it.`;
      const names = awayNames(s, school);
      const teaching = names.length === 1
        ? `${school} has one program in Founders Hall, ${names[0]}`
        : `${school} has ${count(names.length)} programs in Founders Hall — ${list(names)} — more than any other school`;
      return `${elm} stands, and it is empty. ${teaching}, so ${school} moves first. Open ${names[0]} in Founders Hall and move it: out of Founders Hall a move is ${count(FOUNDERS_MOVE_WEEKS)} weeks dark, not the ${count(RELOCATION_WEEKS)} a move between halls costs, because nothing has grown up around it yet. ${elm} is ${school}'s from then on.`;
    },
    ask: (s) => {
      const elm = hallName(s, FIRST_HALL_ID);
      const school = nextSchoolToMove(s);
      const first = school ? awayNames(s, school)[0] : undefined;
      return { text: first ? `Move ${first} into ${elm}` : `Move a program into ${elm}`, ...FOUNDERS_HALL_ASK };
    },
    done: (s) => claimedHalls(s).length > 0,
  },
  {
    id: 'a-school-grows',
    week: 1,
    arrives: (s) => claimedHalls(s).length > 0,
    title: 'A school takes shape',
    body: (s) => {
      const claim = leadingClaim(s);
      if (!claim) return 'A school needs six programs in a hall of its own.';
      const hall = hallName(s, claim.hallId);
      const away = awayNames(s, claim.school);
      const rest = away.length === 0
        ? ''
        : ` ${list(away)} still ${away.length === 1 ? 'teaches' : 'teach'} ${claim.school} from Founders Hall: move ${away.length === 1 ? 'it' : 'them'} across when you like, ${count(FOUNDERS_MOVE_WEEKS)} weeks each.`;
      return `${claim.school} is in ${hall}: ${count(claim.housed)} of six. From here, found every new ${claim.school} program straight into ${hall}, and anything else into Founders Hall, where programs still begin.${rest} Six ${claim.school} programs in ${hall} found the School of ${claim.school}, and the hall takes its name.`;
    },
    ask: (s) => {
      const claim = leadingClaim(s);
      return claim
        ? { text: `Grow ${claim.school} to three programs in ${hallName(s, claim.hallId)} (${claim.housed} of 6)`, go: 'hall', hallId: claim.hallId }
        : { text: 'Grow a school to three programs in a hall of its own' };
    },
    done: (s) => claimedHalls(s).some((c) => c.housed >= 3),
  },
  {
    id: 'a-second-school',
    week: 1,
    arrives: (s) => claimedHalls(s).some((c) => c.housed >= 3) && s.tech.some((t) => t.id === SECOND_HALL_ID && t.status !== 'locked'),
    title: 'A second school',
    body: (s) => {
      const claim = leadingClaim(s);
      const oak = hallName(s, SECOND_HALL_ID);
      const next = nextSchoolToMove(s);
      const names = next ? awayNames(s, next) : [];
      const who = next ? `${next}'s ${names.length === 1 ? 'program' : 'programs'} — ${list(names)} — ${names.length === 1 ? 'goes' : 'go'} there` : 'the next school goes there';
      return `${claim ? `${claim.school} has a hall of its own. ` : ''}${oak} is next: site it, and when it stands, ${who}. Every school leaves Founders Hall the same way, and the day Founders Hall stands empty, every program this college teaches is at home in a school of its own.`;
    },
    ask: (s) => {
      const oak = hallName(s, SECOND_HALL_ID);
      if (!(SECOND_HALL_ID in s.placements)) return { text: `Site ${oak}`, go: 'build' };
      const next = nextSchoolToMove(s);
      if (!standing(s, SECOND_HALL_ID)) return { text: `${oak} is rising: ${next ?? 'the next school'} moves in when it stands` };
      const program = next ? programsAwayFromHome(s).find((p) => p.school === next) : undefined;
      return program
        ? { text: `Move ${programById(program.programId)?.name ?? program.programId} into ${oak}`, go: 'hall', hallId: program.hallId }
        : { text: `Move a program into ${oak}`, ...FOUNDERS_HALL_ASK };
    },
    done: twoSchoolsHoused,
  },
];

export function findOpeningLetter(id: string): OpeningLetter | undefined {
  return OPENING_LETTERS.find((letter) => letter.id === id);
}
