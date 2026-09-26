// ---------------------------------------------------------------------
// The natural player (Plan 65): the line of play the owner thinks a new
// player falls into, rule by rule, spending cash to zero. Each week, in
// order:
//
//   1. Satisfaction. Any attribute under 100 that a building would raise
//      gets the cheapest such building: a facility that serves it, the
//      next residence hall, or another story on the library, a dining hall
//      or a dorm. Nothing more is bought for it while one is going up.
//   2. Programs, breadth first. Every offer is founded where it belongs,
//      hiring its first instructor off the market (never a posted search);
//      when no hall has a slot, the next academic hall goes up as soon as
//      it can be paid for. Meanwhile, and once breadth is exhausted, the
//      programs go deeper: every course the game offers, the lowest tier
//      first, hiring off the market for a field with no free slot. A
//      course that waits on a building gets the building. Dark courses are
//      restaffed from the payroll and the market (the next-step line's
//      ask), so a program keeps seating students.
//   3. At seven academic halls, Founders Hall included, the programs are
//      sorted so every school has its hall: strays moved home as the game
//      suggests, and a school spread over two halls merged into one when
//      another school's offer has nowhere to go.
//   4. Varsity. Every petition is accepted, its venue built at once, and
//      every vacant coaching chair filled with the best candidate listed.
//   5. Research. Every idle lab funds the deepest initiative whose team
//      would leave no course without an instructor.
//   6. Everything else on the build menu: labs, the landmark, amenities,
//      chapter houses; and a graduate program wherever a host offers one.
//
// A capital project goes up the week it reaches the menu, before any of
// the rules; while one waits on money the player saves for it, spending
// only on satisfaction (rule 1) and restaffing.
//
// At admissions, tuition is the highest the slider allows short of the
// red "sticker shock" tier; every club and chapter petition is approved.
// Every other interrupt takes the game's default.
//
// It records what the report needs (NaturalRecord); the report is
// sim/natural.ts (`npm run natural`). Not part of the game: nothing in
// src/ imports this.
// ---------------------------------------------------------------------

import type { Action } from '../../src/state/actions';
import type { Buildable, GameState, SatisfactionAttributes } from '../../src/state/types';
import { standsOnCampus, totalEnrolled } from '../../src/state/types';
import { firstFreeSpot, footprintOf, isPlaceableKind } from '../../src/state/campusMap';
import { isAcademicHall, programById, programOfCourse } from '../../src/data/techData';
import { GRADUATE_HOSTS } from '../../src/data/projectData';
import { initiativeOffers } from '../../src/data/researchData';
import { TRAINER_FIELD, venueForCategory } from '../../src/data/studentLifeData';
import { canRelocateProgram, canStartDevelopment, hasFreeFacultySlot, planCommitmentCoverage } from '../../src/systems/techtree/techSystem';
import { claimedSchool, schoolHall } from '../../src/systems/techtree/schools';
import { hostOffers } from '../../src/systems/techtree/programOffers';
import { weeklyNet } from '../../src/systems/finance/financeSystem';
import { giftFunds } from '../../src/systems/finance/treasury';
import { tuitionFloor } from '../../src/systems/finance/distress';
import { priceTolerance, priceTier } from '../../src/systems/admissions/admissionsSystem';
import { computeSatisfactionBreakdown } from '../../src/systems/satisfaction/satisfactionSystem';
import { canExtend, extensionCost, extensionGain } from '../../src/systems/estate/estate';
import { unstaffedIn } from '../../src/systems/faculty/restaffing';
import { defaultAnswer } from '../../src/engine/defaultAnswers';
import { TUITION_SLIDER_MAX } from '../../src/data/foundingData';
import type { Game, Player } from './game';
import { homeFor, moveHome, site } from './moves';
import { foundIn } from './guided';

// Rule 3 waits for this many academic halls, Founders Hall included.
export const SORT_AT_HALLS = 7;
// The admissions slider's step (InterruptModal.tsx).
const TUITION_STEP = 500;
// A bound on actions per rule per week, so a rule that keeps succeeding
// cannot hang a run.
const MAX_PER_RULE = 40;

const ATTRIBUTES: Array<keyof SatisfactionAttributes> = ['academic', 'social', 'basicNeeds', 'health', 'housing'];

export interface NaturalYear {
  year: number;
  enrolled: number;
  applicants: number;
  // The operating net (the toolbar's $/wk), averaged over the year's weeks.
  netPerWeek: number;
  cash: number;
  programs: number;
  prestige: number;
  rank: number;
  satisfaction: number;
  breakdown: SatisfactionAttributes;
}

export interface NaturalRecord {
  years: NaturalYear[];
  // Buildable id -> the year it was first put up; standing at founding.
  built: Record<string, number>;
  founding: Set<string>;
  // Buildable id -> the year it was first offered on the build menu.
  offered: Record<string, number>;
  // Weeks spent saving for a capital project on the menu.
  projectSaving: number;
  // Research: what the initiatives cost up front, and how many by depth.
  invested: number;
  initiatives: Record<string, number>;
  // Why each satisfaction building went up: the attribute it was for.
  builtFor: Record<string, keyof SatisfactionAttributes>;
  extensions: Record<string, number>;
  hallsAt: Record<number, number>;
  sortedFrom: number | null;
  varsity: { accepted: number; refused: number; coaches: number };
  weeksInRed: number;
  // Buildings put up because a course waited on them.
  forCourses: Set<string>;
}

function programsStanding(s: GameState): number {
  return Object.values(s.halls).flat().filter((slot) => slot.programId !== null).length;
}

function academicHalls(s: GameState): number {
  return s.tech.filter((t) => isAcademicHall(t) && t.status === 'done').length;
}

function servesAttribute(t: Buildable): keyof SatisfactionAttributes | undefined {
  if (t.kind === 'dorm') return 'housing';
  if (t.athleticsVenueReveal) return undefined;
  return t.effects?.satisfactionAttribute;
}

// Pays for a placeable: restricted gift money first if it covers the cost
// (it can buy nothing else), else cash, never below zero.
// True only if the game took the order (a construction freeze refuses it).
function place(g: Game, t: Buildable): boolean {
  const s = g.s;
  const gift = giftFunds(s) >= t.cost;
  if (!gift && s.finance.cash < t.cost) return false;
  if (!gift) site(g, t);
  else {
    const spot = firstFreeSpot(s, t, footprintOf(t));
    if (!spot) return false;
    g.act({ type: 'PLACE_BUILDABLE', buildableId: t.id, row: spot.row, col: spot.col, rotated: false, gift: true });
  }
  return t.id in g.s.placements;
}

function menu(s: GameState): Buildable[] {
  return s.tech.filter((t) => t.status === 'available' && isPlaceableKind(t) && !(t.id in s.placements));
}

// ---- Rule 1: satisfaction ----

// The state as it will stand once everything going up for `attribute` is
// finished, plus `extra` (a building or a story): what a player reading
// the build menu would expect.
function projected(s: GameState, attribute: keyof SatisfactionAttributes, extra?: { id: string; story: boolean }): number {
  let capacity = s.students.capacity;
  const tech = s.tech.map((t) => {
    if (servesAttribute(t) !== attribute) return t;
    const building = t.status === 'developing' && t.renovatingFrom === undefined;
    const adding = extra?.id === t.id && !extra.story;
    const story = (t.extensionWeeks ?? 0) > 0 || (extra?.id === t.id && extra.story);
    if (!building && !adding && !story) return t;
    const gain = story ? extensionGain(t) : 0;
    if (t.kind === 'dorm') {
      capacity += (building || adding ? t.effects?.capacityBonus ?? 0 : 0) + gain;
      return t;
    }
    return { ...t, status: 'done' as const, effects: { ...t.effects, servesPopulation: (t.effects?.servesPopulation ?? 0) + gain } };
  });
  return computeSatisfactionBreakdown({ ...s, tech, students: { ...s.students, capacity } })[attribute];
}

interface Remedy { t: Buildable; cost: number; story: boolean }

function remedies(s: GameState, attribute: keyof SatisfactionAttributes): Remedy[] {
  const options: Remedy[] = menu(s)
    .filter((t) => servesAttribute(t) === attribute)
    .map((t) => ({ t, cost: t.cost, story: false }));
  for (const t of s.tech) {
    if (servesAttribute(t) === attribute && canExtend(t)) options.push({ t, cost: extensionCost(t), story: true });
  }
  return options.sort((a, b) => a.cost - b.cost);
}

function satisfaction(g: Game, record: NaturalRecord): void {
  const scores = g.s.students.satisfactionBreakdown;
  for (const attribute of [...ATTRIBUTES].sort((a, b) => scores[a] - scores[b])) {
    if (scores[attribute] >= 100) continue;
    const already = projected(g.s, attribute);
    if (already >= 100) continue;
    for (const option of remedies(g.s, attribute)) {
      if (projected(g.s, attribute, { id: option.t.id, story: option.story }) <= already + 0.01) continue;
      // The cheapest remedy that helps, or nothing this week: a player does
      // not skip to a dearer one because the cheap one is not yet paid for.
      if (option.story) {
        if (g.s.finance.cash < option.cost) break;
        g.act({ type: 'EXTEND_BUILDING', id: option.t.id });
        if ((option.t.extensionWeeks ?? 0) > 0) record.extensions[option.t.id] = (record.extensions[option.t.id] ?? 0) + 1;
      } else if (place(g, option.t)) {
        record.builtFor[option.t.id] = attribute;
      }
      break;
    }
  }
}

// ---- Rule 3: schools ----

// A school spread over two halls while a school with a program on offer has
// none: the smaller hall's programs move into the larger, freeing it. The
// game's suggestion (schools.ts's suggestedMove) only brings strays home,
// so it never frees the second hall, and offers change only when one is
// founded: without this a homeless school's offers stand forever.
function consolidate(g: Game): void {
  const s = g.s;
  const homeless = s.programOffers
    .map((id) => programById(id)?.school)
    .filter((school): school is string => !!school && schoolHall(s, school) === undefined);
  if (homeless.length === 0) return;
  const bySchool = new Map<string, string[]>();
  for (const hallId of Object.keys(s.halls)) {
    const claim = claimedSchool(s, hallId);
    if (claim) bySchool.set(claim.school, [...(bySchool.get(claim.school) ?? []), hallId]);
  }
  const housed = (hallId: string) => g.s.halls[hallId].filter((x) => x.programId !== null).length;
  for (const halls of bySchool.values()) {
    if (halls.length < 2) continue;
    const [keep, ...spare] = [...halls].sort((a, b) => housed(b) - housed(a));
    for (const from of spare) {
      const programIds = g.s.halls[from].map((x) => x.programId).filter((x): x is string => x !== null);
      for (const programId of programIds) {
        const slot = g.s.halls[keep].findIndex((x) => x.programId === null);
        const move = { programId, hallId: keep, slot };
        if (slot >= 0 && canRelocateProgram(g.s, move)) g.act({ type: 'RELOCATE_PROGRAM', ...move });
      }
    }
  }
}

// ---- Rule 2: programs ----

function hireInto(g: Game, field: string | undefined): boolean {
  if (!field) return false;
  const c = [...g.s.candidates].filter((x) => x.field === field).sort((a, b) => a.salary - b.salary)[0];
  if (!c) return false;
  g.act({ type: 'HIRE_FACULTY', facultyId: c.id });
  return true;
}

function foundEveryOffer(g: Game): boolean {
  let any = false;
  for (let i = 0; i < MAX_PER_RULE; i += 1) {
    const founded = g.s.programOffers.some((id) => {
      const program = programById(id);
      const where = program ? homeFor(g.s, program) : null;
      return !!where && foundIn(g, where.hallId, [id], 0);
    });
    if (!founded) break;
    any = true;
  }
  return any;
}

// An offer waits and no hall has a slot for it: the next hall, when it can
// be paid for and none is going up.
function nextHallIfFull(g: Game): void {
  const s = g.s;
  const waiting = s.programOffers.some((id) => {
    const program = programById(id);
    return program && !homeFor(s, program);
  });
  if (!waiting || s.tech.some((t) => isAcademicHall(t) && t.status === 'developing')) return;
  const hall = menu(s).find((t) => isAcademicHall(t));
  if (hall) place(g, hall);
}

// A course's rung in its program: 0 for the entry course.
function depthOf(courseId: string): number {
  const programId = programOfCourse(courseId);
  return programId ? programById(programId)?.courseIds.indexOf(courseId) ?? 0 : 0;
}

function developDeeper(g: Game): void {
  for (let i = 0; i < MAX_PER_RULE; i += 1) {
    const s = g.s;
    const courses = s.tech
      .filter((t) => t.kind === 'course' && t.status === 'available' && t.cost <= s.finance.cash)
      .sort((a, b) => depthOf(a.id) - depthOf(b.id) || a.cost - b.cost);
    let started = false;
    for (const course of courses) {
      // Hire only when faculty is what blocks it: the committee's seats
      // (Plan 68) are not a hiring problem.
      const facultyBlocks = !!course.requiresFaculty && !hasFreeFacultySlot(g.s, course.requiresFaculty);
      if (!canStartDevelopment(g.s, course) && !(facultyBlocks && hireInto(g, course.requiresFaculty) && canStartDevelopment(g.s, course))) continue;
      g.act({ type: 'START_DEVELOPMENT', nodeId: course.id });
      started = true;
      break;
    }
    if (!started) return;
  }
}

// A locked course whose only unmet prerequisites are buildings on the
// menu: build them.
function buildForCourses(g: Game, record: NaturalRecord): void {
  const s = g.s;
  const byId = new Map(s.tech.map((t) => [t.id, t]));
  const wanted = new Set<string>();
  for (const course of s.tech.filter((t) => t.kind === 'course' && t.status === 'locked')) {
    const unmet = course.prereqs.map((id) => byId.get(id)).filter((t): t is Buildable => !!t && t.status !== 'done');
    if (unmet.length > 0 && unmet.every((t) => isPlaceableKind(t) && t.status === 'available' && !(t.id in s.placements))) {
      for (const t of unmet) wanted.add(t.id);
    }
  }
  for (const id of wanted) {
    const t = byId.get(id)!;
    if (!isAcademicHall(t) && place(g, t)) record.forCourses.add(id);
  }
}

// ---- Rule 4: varsity ----

function staffTeams(g: Game, record: NaturalRecord): void {
  for (const team of g.s.orgs.teams) {
    const venue = venueForCategory(g.s, team.venueCategory);
    if (venue && venue.status === 'available' && !(venue.id in g.s.placements)) place(g, venue);
    for (const role of ['head', 'assistant', 'trainer'] as const) {
      const slot = role === 'head' ? 'headCoach' : role === 'assistant' ? 'assistantCoach' : 'trainer';
      if (team[slot] !== null) continue;
      const field = role === 'trainer' ? TRAINER_FIELD : team.sport;
      const best = g.s.orgs.coachCandidates.filter((c) => c.field === field).sort((a, b) => b.quality - a.quality)[0];
      if (!best) continue;
      g.act({ type: 'HIRE_COACH', candidateId: best.id, teamId: team.id, role });
      record.varsity.coaches += 1;
    }
  }
}

// ---- Rule 5: research ----

function fundResearch(g: Game, record: NaturalRecord): void {
  const labs = g.s.tech.filter((t) => t.facilityType === 'lab' && t.status === 'done' && !g.s.research.initiatives[t.id]);
  for (const lab of labs) {
    const offers = initiativeOffers(g.s, lab.id)
      .filter((o) => !o.blockedReason && o.fundingCost <= g.s.finance.cash)
      .filter((o) => planCommitmentCoverage(g.s, o.suggested.map((f) => f.id)).orphaned.length === 0);
    const deepest = offers[offers.length - 1];
    if (!deepest) continue;
    g.act({ type: 'START_INITIATIVE', labId: lab.id, topicId: deepest.topic.id, depth: deepest.depth.key, facultyIds: deepest.suggested.map((f) => f.id) });
    if (g.s.research.initiatives[lab.id]) {
      record.invested += deepest.fundingCost;
      record.initiatives[deepest.depth.key] = (record.initiatives[deepest.depth.key] ?? 0) + 1;
    }
  }
}

// ---- Capital projects: first, and saved for ----

// Every capital project on the menu, the cheapest first. True if one is
// waiting on money: the player then saves for it.
function buildProjects(g: Game): boolean {
  const waiting = menu(g.s).filter((t) => t.facilityType === 'project').sort((a, b) => a.cost - b.cost);
  for (const t of waiting) {
    if (!place(g, t)) return true;
  }
  return false;
}

// ---- Rule 6: everything else ----

function buildTheRest(g: Game): void {
  for (let i = 0; i < MAX_PER_RULE; i += 1) {
    const next = menu(g.s)
      .filter((t) => !isAcademicHall(t) && servesAttribute(t) === undefined)
      .sort((a, b) => a.cost - b.cost)[0];
    if (!next || !place(g, next)) break;
  }
  for (const hostId of new Set(Object.values(GRADUATE_HOSTS))) {
    const host = g.s.tech.find((t) => t.id === hostId);
    if (!host || !standsOnCampus(host)) continue;
    for (let i = 0; i < MAX_PER_RULE; i += 1) {
      if (!foundIn(g, hostId, hostOffers(g.s, hostId).map((p) => p.id), 0)) break;
    }
  }
}

// ---- Admissions ----

// The highest price on the slider short of the red tier.
export function naturalTuition(s: GameState): number {
  const tolerance = priceTolerance(s.self.reputation);
  let price = Math.min(TUITION_SLIDER_MAX, Math.floor((tolerance * 1.6) / TUITION_STEP) * TUITION_STEP);
  while (price > TUITION_STEP && priceTier(price, tolerance) === 'reckless') price -= TUITION_STEP;
  return Math.max(tuitionFloor(s), price);
}

export function createNaturalPlayer(): Player & { record: NaturalRecord } {
  const record: NaturalRecord = {
    years: [], built: {}, founding: new Set<string>(), offered: {}, projectSaving: 0, invested: 0, initiatives: {}, builtFor: {}, extensions: {},
    hallsAt: {}, sortedFrom: null, varsity: { accepted: 0, refused: 0, coaches: 0 }, weeksInRed: 0, forCourses: new Set<string>(),
  };
  let lastYear = 0;
  let netSum = 0;
  let netWeeks = 0;

  function observe(s: GameState): void {
    if (lastYear === 0) {
      for (const t of s.tech) if (isPlaceableKind(t) && (t.id in s.placements || t.status === 'done')) record.founding.add(t.id);
    }
    for (const t of s.tech) {
      if (!isPlaceableKind(t)) continue;
      if (t.status === 'available') record.offered[t.id] ??= s.clock.year;
      if ((t.id in s.placements || t.status === 'done' || t.status === 'developing') && record.built[t.id] === undefined) record.built[t.id] = s.clock.year;
    }
    // A new year: the summer has just committed the last one.
    if (s.clock.year !== lastYear && lastYear !== 0) {
      const h = s.history[s.history.length - 1];
      record.years.push({
        year: lastYear,
        enrolled: h?.enrolled ?? totalEnrolled(s.students),
        applicants: h?.applicants ?? s.students.applicantPool,
        netPerWeek: netWeeks > 0 ? netSum / netWeeks : weeklyNet(s),
        cash: s.finance.cash,
        programs: programsStanding(s),
        prestige: s.self.reputation,
        rank: h?.rank ?? 0,
        satisfaction: s.students.satisfaction,
        breakdown: { ...s.students.satisfactionBreakdown },
      });
      record.hallsAt[lastYear] = academicHalls(s);
      netSum = 0;
      netWeeks = 0;
    }
    lastYear = s.clock.year;
  }

  return {
    name: 'Natural',
    record,
    act(g) {
      observe(g.s);
      netSum += weeklyNet(g.s);
      netWeeks += 1;
      if (g.s.finance.cash < 0) record.weeksInRed += 1;

      // A capital project on the menu is built before anything else, and
      // saved for: only satisfaction and restaffing spend meanwhile.
      const saving = buildProjects(g);
      satisfaction(g, record);
      if (unstaffedIn(g.s).length > 0) g.act({ type: 'RESTAFF', school: null });
      if (saving) {
        record.projectSaving += 1;
        observe(g.s);
        return;
      }
      if (academicHalls(g.s) >= SORT_AT_HALLS) {
        record.sortedFrom ??= g.s.clock.year;
        for (let i = 0; i < MAX_PER_RULE && moveHome(g); i += 1);
        consolidate(g);
      }
      foundEveryOffer(g);
      nextHallIfFull(g);
      buildForCourses(g, record);
      developDeeper(g);
      staffTeams(g, record);
      fundResearch(g, record);
      buildTheRest(g);
      observe(g.s);
    },
    answer(g): Action | null {
      const pending = g.s.pendingInterrupt;
      if (pending?.type === 'summer') {
        const payload = pending.payload as { admitRate?: number } | undefined;
        return defaultAnswer(g.s, { tuition: naturalTuition(g.s), admitRate: payload?.admitRate ?? g.s.students.admitRate });
      }
      if (pending?.type === 'decision-event') {
        const payload = pending.payload as { eventId: string; ctx: { amount?: number } } | undefined;
        if (payload?.eventId === 'varsity-petition') {
          const affordable = (payload.ctx.amount ?? 0) <= g.s.finance.cash;
          if (affordable) record.varsity.accepted += 1;
          else record.varsity.refused += 1;
          return { type: 'RESOLVE_DECISION_EVENT', eventId: 'varsity-petition', choiceId: affordable ? 'establish' : 'decline', ctx: payload.ctx };
        }
      }
      return null;
    },
  };
}
