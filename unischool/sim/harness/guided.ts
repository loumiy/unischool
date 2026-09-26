// ---------------------------------------------------------------------
// The guided player (Plan 58): does what the game tells it. Each week it
// carries out the toolbar's next step — the line's intent
// (systems/guidance/nextStep.ts, intent.ts), which is a letter's ask while
// one is open — and otherwise plays with plain money sense: a cash reserve
// of RESERVE_WEEKS of expenses (three since Plan 69: eight starved a college
// priced at "fair", whose margin is thin), research only from what lies
// above RESEARCH_RESERVE_WEEKS, nothing recurring while the week runs at a
// loss, the cheapest course next, a dorm when the beds are nearly full, a
// lab or a capital project when it opens and can be paid for, a graduate
// program where its host offers one. The summer is priced at what the
// college's standing tolerates, the line the admissions screen colors as
// fair; the intake is the screen's own.
//
// It never plans past what it is told, so what it reaches is what the
// guidance leads a player to; told to develop a course nobody can teach
// and nobody is listed, it posts a faculty search (Plan 69). It records
// what it saw (GuidedRecord) for the
// report and the checks (test/guided.test.ts, `npm run guided`).
//
// Not part of the game: nothing in src/ imports this.
// ---------------------------------------------------------------------

import type { Action } from '../../src/state/actions';
import type { Buildable, GameState, SatisfactionAttributes } from '../../src/state/types';
import { standsOnCampus } from '../../src/state/types';
import { nextStep } from '../../src/systems/guidance/nextStep';
import type { StepIntent } from '../../src/systems/guidance/intent';
import { OPENING_LETTERS } from '../../src/data/eventData';
import { FOUNDERS_HALL_ID, milestoneSchools, programById } from '../../src/data/techData';
import { GRADUATE_HOSTS } from '../../src/data/projectData';
import { initiativeOffers } from '../../src/data/researchData';
import { canFoundProgram, canRelocateProgram, canStartDevelopment, eligibleInstructors, hasFreeFacultySlot } from '../../src/systems/techtree/techSystem';
import { hostOffers } from '../../src/systems/techtree/programOffers';
import { claimedSchool, schoolFoundedKey } from '../../src/systems/techtree/schools';
import { financeBreakdown, weeklyNet } from '../../src/systems/finance/financeSystem';
import { priceTolerance } from '../../src/systems/admissions/admissionsSystem';
import { playerRank } from '../../src/systems/rivals/rivalsSystem';
import { defaultAnswer } from '../../src/engine/defaultAnswers';
import { totalEnrolled } from '../../src/state/types';
import type { Game, Player } from './game';
import { LIBRARY_TIER1_ID } from '../../src/data/facilitiesData';
import { canExtend, extensionCost } from '../../src/systems/estate/estate';
import { unstaffedIn } from '../../src/systems/faculty/restaffing';
import { canPostSearch, searchCost } from '../../src/systems/faculty/facultySearch';
import { buildDorm, buildable, developCourse, foundOffer, hireForBlocked, site } from './moves';

// The cash the player's own spending leaves behind, in weeks of expenses.
// What the line asks for needs only ASK_RESERVE_WEEKS: a player told to
// site a dining hall with the money in hand sites it.
export const RESERVE_WEEKS = 3;
export const ASK_RESERVE_WEEKS = 2;
// A research initiative the line asks for is funded only from above this
// (Plan 69), so the catalogue's courses and hires are paid first.
export const RESEARCH_RESERVE_WEEKS = 5;
// Plain sense keeps every satisfaction attribute above this, and treats
// one under EMERGENCY as worth breaking the saving for.
export const LIVABLE = 60;
export const EMERGENCY = 25;
const cheapest = <T extends { cost: number }>(items: readonly T[]) => [...items].sort((a, b) => a.cost - b.cost)[0];

export interface GuidedYear {
  year: number;
  cash: number;
  enrolled: number;
  prestige: number;
  rank: number;
  schools: number;
  courses: number;
  foundersHoused: number;
}

export interface GuidedRecord {
  // When each letter was delivered and its ask done, as [year, week].
  delivered: Record<string, [number, number]>;
  done: Record<string, [number, number]>;
  // The year each school was founded.
  schools: Record<string, number>;
  // The year the last school sorted settled in Founders Hall (Plan 59):
  // every purchased hall sited, and Founders Hall one school's.
  foundersHome: number | null;
  // Weeks each kind of intent was the line, and weeks it was carried out.
  asked: Record<string, number>;
  carried: Record<string, number>;
  // Weeks the line was silent, and weeks spent saving for its ask.
  quiet: number;
  saving: number;
  years: GuidedYear[];
}

export function reserveOf(s: GameState, weeks = RESERVE_WEEKS): number {
  return weeks * financeBreakdown(s).totalExpenses;
}

function affords(s: GameState, cost: number, reserve: number): boolean {
  return s.finance.cash - cost >= reserve;
}

// Hire someone who can teach a course waiting on its field, if the market
// has anyone and the week's net can carry the salary.
// When the market lists nobody in the field, it posts a search, as the
// course drawer offers (Plan 69): told to develop a course nobody can teach,
// a player looks for someone rather than waiting on the market forever.
function hireFor(g: Game, field: string | undefined, reserve: number): boolean {
  if (!field || weeklyNet(g.s) <= 0) return false;
  const c = cheapest(g.s.candidates.filter((x) => x.field === field).map((x) => ({ ...x, cost: x.salary })));
  if (!c) {
    if (canPostSearch(g.s, field) && affords(g.s, searchCost(g.s), reserve)) g.act({ type: 'POST_SEARCH', field });
    return false;
  }
  if (!affords(g.s, c.salary / 52, reserve)) return false;
  g.act({ type: 'HIRE_FACULTY', facultyId: c.id });
  return true;
}

// Found a program in a hall (an academic hall, or a graduate host), hiring
// its first instructor if nobody can teach its entry course.
export function foundIn(g: Game, hallId: string, programIds: string[], reserve: number): boolean {
  for (const programId of programIds) {
    const program = programById(programId);
    const entry = program ? g.s.tech.find((t) => t.id === program.entryCourseId) : undefined;
    const slot = g.s.halls[hallId]?.findIndex((x) => x.programId === null) ?? -1;
    if (!program || !entry || slot < 0 || !affords(g.s, entry.cost, reserve)) continue;
    let teacher = eligibleInstructors(g.s, entry)[0];
    if (!teacher && hireFor(g, entry.requiresFaculty, reserve)) teacher = eligibleInstructors(g.s, entry)[0];
    if (!teacher) continue;
    const founding = { programId, hallId, slot, facultyId: teacher.id };
    if (!canFoundProgram(g.s, founding)) continue;
    g.act({ type: 'FOUND_PROGRAM', ...founding });
    return true;
  }
  return false;
}

// What the build menu offers for an attribute: a facility that serves it,
// the next residence hall for housing, the library's next floor for study
// space.
export function buildFor(g: Game, attribute: keyof SatisfactionAttributes, reserve: number): boolean {
  const s = g.s;
  if (attribute === 'housing') {
    const dorm = buildable(s, reserve).find((x) => x.kind === 'dorm');
    if (dorm) return site(g, dorm);
  }
  if (attribute === 'academic') {
    // The library's next story, from its panel (Plan 59).
    const lib = s.tech.find((x) => x.id === LIBRARY_TIER1_ID);
    if (lib && canExtend(lib) && affords(s, extensionCost(lib), reserve)) {
      g.act({ type: 'EXTEND_BUILDING', id: lib.id });
      return true;
    }
  }
  const t = cheapest(buildable(s, reserve).filter((x) => x.kind === 'facility' && x.effects?.satisfactionAttribute === attribute && !x.athleticsVenueReveal));
  return t ? site(g, t) : false;
}

// What the line's ask would cost now, if it costs money: the cheapest way
// to do it. Undefined for a move, a wait, or an ask with nothing to buy.
export function intentCost(s: GameState, intent: StepIntent): number | undefined {
  const costs = (items: Array<{ cost: number }>) => (items.length > 0 ? Math.min(...items.map((x) => x.cost)) : undefined);
  switch (intent.kind) {
    case 'site':
      return costs(s.tech.filter((t) => intent.buildableIds.includes(t.id) && t.status === 'available' && !(t.id in s.placements)));
    case 'found': {
      const ids = intent.programId ? [intent.programId] : s.programOffers;
      return costs(ids.map((id) => s.tech.find((t) => t.id === programById(id)?.entryCourseId)).filter((t): t is Buildable => t !== undefined));
    }
    case 'develop':
      return s.tech.find((t) => t.id === intent.courseId)?.cost;
    case 'build-for':
      return costs(buildable(s).filter((x) => (x.kind === 'facility' && x.effects?.satisfactionAttribute === intent.attribute) || (intent.attribute === 'housing' && x.kind === 'dorm')));
    case 'research':
      return costs(initiativeOffers(s, intent.labId).filter((o) => !o.blockedReason).map((o) => ({ cost: o.fundingCost })));
    default:
      return undefined;
  }
}

// Carries out what the line asks; true if it did.
export function carry(g: Game, intent: StepIntent, reserve: number): boolean {
  const s = g.s;
  switch (intent.kind) {
    case 'found':
      return foundIn(g, intent.hallId, intent.programId ? [intent.programId] : [...s.programOffers], reserve);
    case 'move': {
      const move = { programId: intent.programId, hallId: intent.hallId, slot: intent.slot };
      if (!canRelocateProgram(s, move)) return false;
      g.act({ type: 'RELOCATE_PROGRAM', ...move });
      return true;
    }
    case 'site': {
      for (const id of intent.buildableIds) {
        const t = buildable(s, reserve).find((x) => x.id === id);
        if (t && site(g, t)) return true;
      }
      return false;
    }
    case 'develop': {
      const t = s.tech.find((x) => x.id === intent.courseId);
      if (!t || t.status !== 'available' || !affords(s, t.cost, reserve)) return false;
      if (!canStartDevelopment(s, t)) {
        // Hire only when faculty is what blocks it (Plan 68: the committee's
        // seats are not a hiring problem).
        if (!t.requiresFaculty || hasFreeFacultySlot(s, t.requiresFaculty)) return false;
        if (!hireFor(g, t.requiresFaculty, reserve) || !canStartDevelopment(g.s, t)) return false;
      }
      g.act({ type: 'START_DEVELOPMENT', nodeId: t.id });
      return true;
    }
    case 'build-for':
      return buildFor(g, intent.attribute, reserve);
    case 'research': {
      // Funded down to the ask's reserve, research drained a college at
      // "fair" below what the catalogue's courses and hires need (Plan 69).
      const floor = reserveOf(s, RESEARCH_RESERVE_WEEKS);
      const offer = [...initiativeOffers(s, intent.labId)]
        .filter((o) => !o.blockedReason && affords(s, o.fundingCost, floor))
        .sort((a, b) => a.fundingCost - b.fundingCost)[0];
      if (!offer) return false;
      g.act({ type: 'START_INITIATIVE', labId: intent.labId, topicId: offer.topic.id, depth: offer.depth.key, facultyIds: offer.suggested.map((f) => f.id) });
      return true;
    }
    case 'restaff': {
      const before = unstaffedIn(s).length;
      g.act({ type: 'RESTAFF', school: intent.school });
      return unstaffedIn(g.s).length < before;
    }
    case 'wait':
      return false;
  }
}

// Plain money sense, after the line: one of each a week.
function background(g: Game, reserve: number): void {
  const growing = () => weeklyNet(g.s) > 0;
  foundOffer(g, { reserve });
  if (growing()) hireForBlocked(g, { reserve });
  if (growing()) developCourse(g, { reserve, pick: (items) => cheapest(items as readonly Buildable[]) as never });
  buildDorm(g, 0.9, { reserve });
  // The campus livable, when the line is busy with something else: the
  // students' worst attribute under LIVABLE.
  const scores = g.s.students.satisfactionBreakdown;
  const worst = (Object.keys(scores) as Array<keyof SatisfactionAttributes>).sort((a, b) => scores[a] - scores[b])[0];
  if (scores[worst] < LIVABLE) buildFor(g, worst, reserve);
  // What opens and nothing on the line mentions: a lab, a capital project,
  // and a building a course waits on (Plan 69: the Art Gallery, the Clinic).
  const waitedOn = new Set(g.s.tech
    .filter((t) => t.kind === 'course' && t.status === 'locked')
    .flatMap((t) => t.prereqs));
  const opened = buildable(g.s, reserve).filter((t) => t.facilityType === 'lab' || t.project !== undefined || waitedOn.has(t.id));
  const next = cheapest(opened);
  if (next) site(g, next);
  // A graduate program its host offers.
  for (const hostId of new Set(Object.values(GRADUATE_HOSTS))) {
    const host = g.s.tech.find((t) => t.id === hostId);
    if (!host || !standsOnCampus(host)) continue;
    const offers = hostOffers(g.s, hostId).map((p) => p.id);
    if (offers.length > 0 && foundIn(g, hostId, offers, reserve)) break;
  }
}

export function createGuidedPlayer(): Player & { record: GuidedRecord } {
  const record: GuidedRecord = { delivered: {}, done: {}, schools: {}, foundersHome: null, asked: {}, carried: {}, quiet: 0, saving: 0, years: [] };
  let lastYear = 0;

  function observe(s: GameState): void {
    const when: [number, number] = [s.clock.year, s.clock.week];
    for (const id of s.events.opening.read) record.delivered[id] ??= when;
    for (const letter of OPENING_LETTERS) {
      if (record.delivered[letter.id] && !record.done[letter.id] && letter.done(s)) record.done[letter.id] = when;
    }
    for (const school of milestoneSchools()) {
      if (s.milestones[schoolFoundedKey(school.schoolName)] && record.schools[school.schoolName] === undefined) record.schools[school.schoolName] = s.clock.year;
    }
    const housed = (s.halls[FOUNDERS_HALL_ID] ?? []).filter((x) => x.programId !== null).length;
    if (record.foundersHome === null && claimedSchool(s, FOUNDERS_HALL_ID) !== null) record.foundersHome = s.clock.year;
    if (s.clock.year !== lastYear) {
      lastYear = s.clock.year;
      record.years.push({
        year: s.clock.year,
        cash: s.finance.cash,
        enrolled: totalEnrolled(s.students),
        prestige: s.self.reputation,
        rank: playerRank(s),
        schools: Object.keys(record.schools).length,
        courses: s.tech.filter((t) => t.kind === 'course' && t.status === 'done').length,
        foundersHoused: housed,
      });
    }
  }

  return {
    name: 'Guided',
    record,
    act(g) {
      observe(g.s);
      const reserve = reserveOf(g.s, ASK_RESERVE_WEEKS);
      const step = nextStep(g.s);
      if (!step) record.quiet += 1;
      // Saving: the line asks for something the cash does not cover yet, so
      // nothing else is bought until it does.
      let saving = false;
      if (step?.intent) {
        const kind = step.intent.kind;
        record.asked[kind] = (record.asked[kind] ?? 0) + 1;
        if (carry(g, step.intent, reserve)) record.carried[kind] = (record.carried[kind] ?? 0) + 1;
        else {
          const cost = intentCost(g.s, step.intent);
          // A research ask is not worth freezing the college for (Plan 69):
          // saving for one starved the courses the line had stopped asking
          // about.
          saving = kind !== 'research' && cost !== undefined && g.s.finance.cash - cost < reserve;
          if (saving) record.saving += 1;
        }
      }
      // An emergency breaks the saving.
      const scores = g.s.students.satisfactionBreakdown;
      const worst = (Object.keys(scores) as Array<keyof SatisfactionAttributes>).sort((a, b) => scores[a] - scores[b])[0];
      if (scores[worst] < EMERGENCY) buildFor(g, worst, reserve);
      if (!saving) background(g, reserveOf(g.s));
      observe(g.s);
    },
    answer(g): Action | null {
      if (g.s.pendingInterrupt?.type !== 'summer') return null;
      const tuition = Math.round(priceTolerance(g.s.self.reputation) / 100) * 100;
      return defaultAnswer(g.s, { tuition, admitRate: g.s.students.admitRate });
    },
  };
}
