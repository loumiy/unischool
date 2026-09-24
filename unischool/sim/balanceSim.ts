// ---------------------------------------------------------------------
// The balance harness: a headless fast-forward through the real reducer.
//
// Pacing claims are claims about trajectories and cannot be checked by
// reading constants, so this drives the actual game loop for N years under
// scripted strategies and prints the year-by-year cash / enrolled /
// prestige / opex table the tuning constants were fitted against.
//
// Not part of the game: nothing imports it, and it only reads state and
// dispatches the actions the UI dispatches.
//
//   npm run sim            # 40 years, every 2nd year, all strategies
//   npm run sim -- 60 5    # 60 years, every 5th year
//   npm run sim -- 40 2 public   # only strategies matching "public"
//
// Each table is followed by its scorecard against sim/reference.ts's bands.
//
//   npm run sim -- --write-reference      # re-record the bands from this run
//   npm run sim -- --save last.json       # keep this run's sampled rows
//   npm run sim -- --compare last.json    # print what moved against them
// ---------------------------------------------------------------------

import { readFileSync, writeFileSync } from 'node:fs';
import { reducer } from '../src/engine/reducer';
import { defaultAnswer } from '../src/engine/defaultAnswers';
import { METRICS, TOLERANCE, describeFinding, findingsFor, metricOf, serialiseReference, type Metric, type Reference, bandsAcross, REFERENCE_HORIZON, REFERENCE_EXTRA_SEEDS, bandsFor } from './reference';
import type { Action } from '../src/state/actions';
import { createPreStartState } from '../src/state/actions';
import type { AthleticsBudgetTier, GameState, Buildable, InitiativeReport, Legacy, SummerPayload } from '../src/state/types';
import { SUMMER_LAST_BEAT, totalEnrolled, WEEKS_PER_YEAR } from '../src/state/types';
import { playerRank } from '../src/systems/rivals/rivalsSystem';
import { intakeCeiling } from '../src/systems/techtree/instructionCapacity';
import { financeBreakdown, endowmentCampaign, weeklyNet, instructionCostPerStudentWith, SERVICES_PER_STUDENT_PER_WEEK } from '../src/systems/finance/financeSystem';
import { admitRate, priceTolerance, topBandShare } from '../src/systems/admissions/admissionsSystem';
import { TUITION_SLIDER_MAX, FOUNDING_VERNACULAR } from '../src/data/foundingData';
import { FOUNDING_COLORS, schoolColorsOf } from '../src/data/schoolColors';
import {
  canStartDevelopment, hasFreeFacultySlot, eligibleInstructors, unstaffedCourses,
  isCommitted, effectiveCourseSlots, totalFacultySlots, usedFacultySlots,
} from '../src/systems/techtree/techSystem';
import { facultyLoads, projectedQuality } from '../src/systems/faculty/facultyAssignment';
import { initiativeDepth, initiativeFundingCost, initiativeOffers } from '../src/data/researchData';
import { isAcademicHall, programById, programOfCourse, programs, researchSchools } from '../src/data/techData';
import { ATTRIBUTE_SHORTFALL } from '../src/systems/guidance/nextStep';
import { canFoundProgram } from '../src/systems/techtree/techSystem';
import { isHoused } from '../src/systems/techtree/programOffers';
import { canPostSearch, searchCost } from '../src/systems/faculty/facultySearch';
import { firstFreeSpot, footprintOf } from '../src/state/campusMap';
import { HELLENIC_COUNCIL_MIN_CLUBS } from '../src/data/eventData';
import { weeklyResearchPoints } from '../src/data/researchData';
import { studentLifeSatisfaction } from '../src/systems/satisfaction/satisfactionSystem';
import { demandProgress } from '../src/systems/demands/demandSystem';
import { demandSubject } from '../src/data/demandData';
import { discoverySchools } from '../src/data/techData';
import { TRAINER_FIELD, hasStudentCenter, varsityTeamUpkeep } from '../src/data/studentLifeData';
import { LIBRARY_TIER1_ID, nextLibraryFloor } from '../src/data/facilitiesData';
import { bindScriptStream } from '../src/engine/random';

// ---------------------------------------------------------------------
// Deterministic environment: a run carries its own seeded random stream
// (engine/random.ts); localStorage is stubbed. SIM_SEED overrides the fixed
// default. Any change to the number of draws reshuffles the whole stream, so
// run a few seeds before believing a balance claim.
//   SIM_SEED=7 npm run sim -- 60 5
// ---------------------------------------------------------------------
export const DEFAULT_SIM_SEED = Number(process.env.SIM_SEED ?? 12345);
const fakeStorage = new Map<string, string>();
(globalThis as unknown as { localStorage: unknown }).localStorage = {
  getItem: (k: string) => fakeStorage.get(k) ?? null,
  setItem: (k: string, v: string) => { fakeStorage.set(k, v); },
  removeItem: (k: string) => { fakeStorage.delete(k); },
};

// ---------------------------------------------------------------------
// A strategy is a scripted player: a tuition policy plus rules for what it
// commits cash to. Deliberately crude: reproducible, and spanning what real
// players do (breadth first, enrolment first, overreach, sit still).
// ---------------------------------------------------------------------
export interface Strategy {
  name: string;
  tuition(s: GameState): number;
  // The share of the applicant pool to take. Omitted means the slider's own
  // opening position for this standing; only the probes set it.
  admitRate?(s: GameState): number;
  buffer(s: GameState): number;   // cash held back before any discretionary start
  // The flow gate: no new recurring commitment unless this week's net clears
  // this fraction of weekly opex (see hasHeadroom). 0 spends to the wire.
  netMargin: number;
  buildsCourses: boolean;
  buildsDorms: boolean;
  buildsFacilities: boolean;
  dormFillThreshold: number;      // start the next dorm once enrolled/capacity passes this
  facilityThreshold: number;      // build for any satisfaction attribute scoring under this
  campaigns: boolean;             // run endowment campaigns with the late-game surplus
  // Project a course's recurring cost before committing, not just its build
  // cost (see courseStaysSustainable). For thin-margin strategies, whose
  // saved-up buffer would otherwise buy courses they cannot run.
  courseAffordabilityAware?: boolean;
  // Staff the varsity department and raise the athletics budget once flush.
  // Without coaches no team seeds high enough to win a title.
  playsCoachingMarket?: boolean;
  // Keep every faculty chair filled: hire into any field with a course it
  // cannot staff, not only one blocking an affordable start (see decide()).
  fillsEveryChair?: boolean;
  // How this strategy founds programs (see foundPrograms):
  //   'cheapest'      default: cheapest affordable offer it can staff, into a
  //                   same-school hall with room, else an empty one
  //   'school-first'  prefers schools it has started; keeps every hall pure
  //   'scatter'       the control: first offer, first free slot
  founding?: 'cheapest' | 'school-first' | 'scatter';
  // Post a faculty search when an affordable course is blocked on a
  // department with no free slot and nobody on the market.
  postsSearches?: boolean;
  // How deep it goes in a lab: 'deep' (default) commits the deepest
  // affordable initiative in every idle lab; 'shallow' only the cheapest
  // depth; 'none' never commissions, so labs only gate courses.
  research?: 'deep' | 'shallow' | 'none';
  // At most this many schools (see foundPrograms): past it, an offer from
  // another school is taken only when every offer is from another school,
  // and into a hall of its own. Unlimited by default.
  maxSchools?: number;
  // Play teaching: move each course to the eligible instructor who would
  // grade it best (see balanceTeaching).
  balancesTeaching?: boolean;
}

// The course's tier from its id (101 / 1x0 / 2x0), so the harness can
// develop cheap things first; the engine has no notion of tier. Graduate
// courses (5xx / 7xx) land in tier 3 and sort last by cost.
function tierOf(t: Buildable): number {
  const m = /(\d{3})$/.exec(t.id);
  if (!m) return 0;
  const n = Number(m[1]);
  return n === 101 ? 1 : n < 200 ? 2 : 3;
}

function affordable(s: GameState, cost: number, strategy: Strategy): boolean {
  return s.finance.cash - cost >= strategy.buffer(s);
}

// Whether one more course would leave this strategy's net tuition per student
// covering instruction (see Strategy.courseAffordabilityAware). Developing
// courses are counted too, or a week of starts would each look affordable.
function courseStaysSustainable(s: GameState, strategy: Strategy): boolean {
  if (!strategy.courseAffordabilityAware) return true;
  const netTuitionPerStudentPerWeek = strategy.tuition(s) / WEEKS_PER_YEAR;
  const developingCourses = s.tech.filter((t) => t.kind === 'course' && t.status === 'developing').length;
  // Instruction is charged per section, so "one more course" is read off the
  // same model with the developing ones counted in, plus per-student services.
  const projectedPerStudent = instructionCostPerStudentWith(s, developingCourses + 1) + SERVICES_PER_STUDENT_PER_WEEK;
  return netTuitionPerStudentPerWeek >= projectedPerStudent;
}

// Whether this week's cash flow leaves room for a new recurring commitment
// (a hire, or a course). The margin is read against opex capped at a million
// a week: a commitment costs the same few thousand at any size, and a pure
// share froze mature schools whose net is a few percent of a huge opex.
const HEADROOM_OPEX_CAP = 1_000_000;
function hasHeadroom(s: GameState, strategy: Strategy): boolean {
  return weeklyNet(s) >= strategy.netMargin * Math.min(s.finance.weeklyOpEx, HEADROOM_OPEX_CAP);
}

// Capital projects (dorms, school buildings, facilities) are judged more
// loosely than recurring ones: a player with money in the bank and a full
// campus builds, as long as this week isn't already bleeding.
function canCommitCapital(s: GameState, strategy: Strategy): boolean {
  return strategy.buildsDorms && weeklyNet(s) >= 0;
}

// Courses orphaned by a dismissal or an initiative get restaffed, as a player
// would, or the harness reports its own neglect as a satisfaction collapse.
function restaffOrphans(get: () => GameState, dispatch: (a: Action) => void, strategy: Strategy): void {
  for (const course of unstaffedCourses(get())) {
    const s = get();
    const replacement = eligibleInstructors(s, course, course.id)[0];
    if (replacement) {
      dispatch({ type: 'REASSIGN_COURSE_FACULTY', courseId: course.id, facultyId: replacement.id });
      continue;
    }
    // Nobody free: appoint someone from the standing market if the field
    // has anyone listed and the school can carry the salary.
    const candidate = s.candidates.find((c) => c.field === course.requiresFaculty);
    // Same affordability gate as the ordinary hiring loop, or the harness
    // ends a run with three times the faculty a school that size would carry.
    if (candidate && s.finance.cash > strategy.buffer(s) && hasHeadroom(s, strategy)) {
      dispatch({ type: 'HIRE_FACULTY', facultyId: candidate.id });
    }
  }
}

// Commission research as a cautious player would: fill a vacant facility
// with the deepest option affordable, without gutting a thin department.
// Orphaned courses are covered by restaffOrphans.
function commissionScholarship(
  get: () => GameState, dispatch: (a: Action) => void, strategy: Strategy,
): void {
  if (!strategy.buildsCourses) return;
  if (strategy.research === 'none') return;
  const schools = researchSchools();

  for (const school of schools) {
    for (const labId of school.labIds) {
      const s = get();
      const lab = s.tech.find((t) => t.id === labId);
      if (!lab || lab.status !== 'done' || s.research.initiatives[labId]) continue;

      const offers = initiativeOffers(s, labId);
      // Deepest first ('shallow' looks only at the cheapest depth).
      const considered = strategy.research === 'shallow' ? offers.slice(0, 1) : [...offers].reverse();
      for (const offer of considered) {
        if (offer.blockedReason) continue;
        if (offer.suggested.length !== offer.depth.participants) continue;
        if (!affordable(s, offer.fundingCost, strategy)) continue;
        // Don't gut a thin department: only commit out of a field that
        // keeps a couple of people teaching afterwards.
        const wouldGut = offer.topic.fields.some((field) => {
          const inField = s.faculty.filter((f) => f.field === field).length;
          const taken = offer.suggested.filter((f) => f.field === field).length;
          return inField - taken < 2;
        });
        if (wouldGut) continue;
        dispatch({
          type: 'START_INITIATIVE',
          labId,
          topicId: offer.topic.id,
          depth: offer.depth.key,
          facultyIds: offer.suggested.map((f) => f.id),
        });
        break;
      }
    }
  }
}

// Playing teaching (Strategy.balancesTeaching): the Curriculum tab's
// drag-and-drop, using the same projectedQuality and the same action.
const REBALANCE_EVERY_WEEKS = 1;
const REBALANCE_MIN_GAIN = 1;
// Small classes: the same strategy hires the best teacher on the market into
// any field whose people carry more than this share of their slots.
const LIGHT_LOAD_SHARE = 0.6;
// Teaching hires need twice the reserve, or playing teaching spends the
// school into the red (at one reserve: 1,800 weeks in the red).
const LIGHT_LOAD_RESERVE_MULTIPLE = 2;

function balanceTeaching(get: () => GameState, dispatch: (a: Action) => void, strategy: Strategy): void {
  if (!strategy.balancesTeaching) return;
  const s0 = get();
  if (s0.clock.week % REBALANCE_EVERY_WEEKS !== 0) return;
  const courses = s0.tech.filter((t) => t.requiresFaculty && (t.status === 'done' || t.status === 'developing') && s0.courseFaculty[t.id]);
  for (const course of courses) {
    const s = get();
    const loads = facultyLoads(s);
    const current = s.faculty.find((f) => f.id === s.courseFaculty[course.id]);
    if (!current) continue;
    const now = projectedQuality(s, course, current, loads).score;
    let best: { id: string; score: number } | null = null;
    // Walked in roster (hire) order, not eligibleInstructors' own: that list
    // breaks ties by id, and faculty ids are random UUIDs, so ties made runs
    // nondeterministic.
    const eligible = new Set(eligibleInstructors(s, course, course.id).map((f) => f.id));
    for (const f of s.faculty) {
      if (!eligible.has(f.id) || f.id === current.id) continue;
      const score = projectedQuality(s, course, f, loads).score;
      if (score - now >= REBALANCE_MIN_GAIN && (best === null || score > best.score)) best = { id: f.id, score };
    }
    if (best) dispatch({ type: 'REASSIGN_COURSE_FACULTY', courseId: course.id, facultyId: best.id });
  }
  // Small classes: a field more than LIGHT_LOAD_SHARE loaded gets the best
  // teacher on the market, cash and flow permitting.
  const s1 = get();
  const loads = facultyLoads(s1);
  const fields = new Set(s1.faculty.map((f) => f.field));
  for (const field of fields) {
    const s = get();
    const people = s.faculty.filter((f) => f.field === field);
    const load = people.reduce((sum, f) => sum + (loads.get(f.id) ?? 0), 0);
    const slots = people.reduce((sum, f) => sum + f.courseSlots, 0);
    if (slots === 0 || load / slots <= LIGHT_LOAD_SHARE) continue;
    const candidate = [...s.candidates].filter((c) => c.field === field).sort((a, b) => b.teachingPotential - a.teachingPotential)[0];
    if (!candidate) continue;
    if (s.finance.cash > strategy.buffer(s) * LIGHT_LOAD_RESERVE_MULTIPLE && hasHeadroom(s, strategy)) {
      dispatch({ type: 'HIRE_FACULTY', facultyId: candidate.id });
    }
  }
}

// The payroll lever: the harness's test of "stall, don't die". An overreached
// school must climb back out with no special-case rescue in the engine. A
// dismissal orphans courses, so the lever is limited, or it strips a school
// to zero faculty.
//
// Order: price before people. If the strategy would charge more than the
// school charges now, a raise is already waiting for an admissions round.
//
// Floor: never dismantle the capacity to teach what is offered. Candidates:
//   1. never anyone committed to an initiative (funding was paid up front);
//   2. the priciest teaching nothing;
//   3. the priciest whose department still covers its offered courses
//      without them (usedFacultySlots counts unstaffed courses too).
// If nothing passes, the run recovers on price alone.
export const STALL_WEEKS_BEFORE_CUTS = 26;
//
// Exported for test/balance-regression.test.ts, which calls it directly:
// the collapse it guards against took about thirty years.
export function cutPayrollIfStalled(
  get: () => GameState, weeksInTheRed: number, dispatch: (a: Action) => void, strategy: Strategy,
): void {
  const s = get();
  if (s.finance.cash >= 0 || weeksInTheRed < STALL_WEEKS_BEFORE_CUTS) return;
  if (weeklyNet(s) >= 0 || s.faculty.length === 0) return;

  // Price first: a raise or a discount cut already decided but not yet
  // applied is cheaper than anybody's job.
  if (strategy.tuition(s) > s.finance.listedTuition) return;

  const loads = facultyLoads(s);
  const byCost = s.faculty
    .filter((f) => !isCommitted(s, f.id))
    .sort((a, b) => b.salary - a.salary);

  const idle = byCost.find((f) => (loads.get(f.id) ?? 0) === 0);
  const sparable = idle ?? byCost.find(
    (f) => totalFacultySlots(s, f.field) - effectiveCourseSlots(s, f) >= usedFacultySlots(s, f.field),
  );
  if (!sparable) return;

  dispatch({ type: 'FIRE_FACULTY', facultyId: sparable.id });
}

// PLACE_BUILDABLE needs a site: the harness takes campusMap.ts's
// firstFreeSpot, unrotated, and skips the start if there is no room.
function dispatchPlaceable(get: () => GameState, dispatch: (a: Action) => void, nodeId: string): void {
  const s = get();
  const node = s.tech.find((t) => t.id === nodeId);
  if (!node) return;
  const fp = footprintOf(node);
  const spot = firstFreeSpot(s.placements, fp);
  if (!spot) return;
  dispatch({ type: 'PLACE_BUILDABLE', buildableId: nodeId, row: spot.row, col: spot.col, rotated: false });
}

// The coaching market (Strategy.playsCoachingMarket): three roles per active
// team from the pool the Athletics tab lists, under the faculty-hire flow
// gate since salaries recur; plus the budget dial once comfortably flush.
function staffTheDepartment(get: () => GameState, dispatch: (a: Action) => void, strategy: Strategy): void {
  if (!strategy.playsCoachingMarket) return;

  // The budget dial is free and reversible: raised to high once the school
  // runs well clear of its buffer.
  const s0 = get();
  const flush = s0.finance.cash > strategy.buffer(s0) * 3 && weeklyNet(s0) > 0;
  const wanted: AthleticsBudgetTier = flush ? 'high' : 'medium';
  if (s0.orgs.athleticsBudget !== wanted) dispatch({ type: 'SET_ATHLETICS_BUDGET', tier: wanted });

  for (const teamId of get().orgs.teams.filter((t) => t.status === 'active').map((t) => t.id)) {
    for (const role of ['head', 'assistant', 'trainer'] as const) {
      const s = get();
      const team = s.orgs.teams.find((t) => t.id === teamId);
      if (!team) continue;
      const slot = role === 'head' ? 'headCoach' : role === 'assistant' ? 'assistantCoach' : 'trainer';
      if (team[slot] !== null) continue;
      if (s.finance.cash <= strategy.buffer(s) || !hasHeadroom(s, strategy)) continue;
      const field = role === 'trainer' ? TRAINER_FIELD : team.sport;
      // The strongest coach listed in the field this role needs.
      const candidate = [...s.orgs.coachCandidates]
        .filter((c) => c.field === field)
        .sort((a, b) => b.quality - a.quality)[0];
      if (!candidate) continue;
      dispatch({ type: 'HIRE_COACH', candidateId: candidate.id, teamId, role });
    }
  }
}

// Founding: FOUND_PROGRAM takes a hall slot and starts the entry course with
// an instructor; the only way to start a tier-1 course.
//
// The chosen schools (Strategy.maxSchools): the first N schools to get a
// hall, by hall-chain order, which is stable where counts flip on ties. Null
// with no quota, and while fewer than N schools have a hall.
function chosenSchools(s: GameState, strategy: Strategy): Set<string> | null {
  if (strategy.maxSchools === undefined) return null;
  const firstHall = new Map<string, string>();
  for (const [hallId, slots] of Object.entries(s.halls)) {
    for (const slot of slots) {
      if (slot.programId === null) continue;
      const q = programById(slot.programId);
      if (!q) continue;
      const seen = firstHall.get(q.school);
      if (seen === undefined || hallId < seen) firstHall.set(q.school, hallId);
    }
  }
  if (firstHall.size < strategy.maxSchools) return null; // still choosing
  return new Set([...firstHall.entries()].sort((a, b) => a[1].localeCompare(b[1]) || a[0].localeCompare(b[0])).slice(0, strategy.maxSchools).map(([school]) => school));
}

// The offers this strategy will take: all until its schools are chosen, then
// the chosen ones, or all when every offer is a stray (offers stand until
// one is taken). A stray costs a slot and nothing else: it is never
// developed past its entry course.
function allowedOffers(s: GameState, strategy: Strategy): string[] {
  const chosen = chosenSchools(s, strategy);
  if (chosen === null) return s.programOffers;
  const inside = s.programOffers.filter((id) => { const p = programById(id); return p !== undefined && chosen.has(p.school); });
  return inside.length > 0 ? inside : s.programOffers;
}

function isStray(s: GameState, strategy: Strategy, school: string): boolean {
  const chosen = chosenSchools(s, strategy);
  return chosen !== null && !chosen.has(school);
}

// Where a program of this school goes: a stray into a hall holding only
// strays with room, else an empty hall, else nowhere; anything else by the
// strategy's founding policy (slotFor).
function slotForProgram(s: GameState, strategy: Strategy, school: string): { hallId: string; slot: number } | null {
  const policy = strategy.founding ?? 'cheapest';
  if (!isStray(s, strategy, school)) return slotFor(s, school, policy);
  const chosen = chosenSchools(s, strategy)!;
  const halls = Object.keys(s.halls).filter((hallId) => s.halls[hallId].some((x) => x.programId === null) && isAcademicHall(s.tech.find((t) => t.id === hallId)!));
  const firstFree = (hallId: string) => ({ hallId, slot: s.halls[hallId].findIndex((x) => x.programId === null) });
  const strays = halls.find((hallId) => { const sc = hallSchools(s, hallId); return sc.size > 0 && [...sc].every((x) => !chosen.has(x)); });
  if (strays) return firstFree(strays);
  const empty = halls.find((hallId) => hallSchools(s, hallId).size === 0);
  return empty ? firstFree(empty) : null;
}

function foundPrograms(get: () => GameState, dispatch: (a: Action) => void, strategy: Strategy): void {
  const policy = strategy.founding ?? 'cheapest';
  for (;;) {
    const s = get();
    if (!freeSlot(s)) return;
    let offers = allowedOffers(s, strategy)
      .map((id) => programById(id))
      .filter((p) => p !== undefined)
      .map((p) => ({ p, entry: s.tech.find((t) => t.id === p.entryCourseId) }))
      .filter((o) => o.entry !== undefined);
    if (policy === 'cheapest') offers = offers.sort((a, b) => a.entry!.cost - b.entry!.cost);
    if (policy === 'school-first') {
      // Most-housed school first, so a started school converges on six.
      const housedIn = (school: string) => programs().filter((q) => q.school === school && isHoused(s, q.id)).length;
      offers = offers.sort((a, b) => housedIn(b.p.school) - housedIn(a.p.school) || a.entry!.cost - b.entry!.cost);
    }
    let founded = false;
    for (const { p, entry } of offers) {
      if (!hasHeadroom(s, strategy) || !affordable(s, entry!.cost, strategy)) continue;
      if (!courseStaysSustainable(s, strategy)) continue;
      const instructor = eligibleInstructors(s, entry!)[0];
      if (!instructor) continue;
      const slot = slotForProgram(s, strategy, p.school);
      if (!slot) continue;
      const founding = { programId: p.id, hallId: slot.hallId, slot: slot.slot, facultyId: instructor.id };
      if (!canFoundProgram(s, founding)) continue;
      dispatch({ type: 'FOUND_PROGRAM', ...founding });
      founded = true;
      break;
    }
    if (!founded) return;
  }
}

// The schools a hall's housed programs belong to; more than one means mixed.
function hallSchools(s: GameState, hallId: string): Set<string> {
  const schools = new Set<string>();
  for (const slot of s.halls[hallId]) {
    if (slot.programId === null) continue;
    const program = programById(slot.programId);
    if (program) schools.add(program.school);
  }
  return schools;
}

function slotFor(s: GameState, school: string, policy: NonNullable<Strategy['founding']>): { hallId: string; slot: number } | null {
  const halls = Object.keys(s.halls).filter((hallId) => s.halls[hallId].some((x) => x.programId === null) && isAcademicHall(s.tech.find((t) => t.id === hallId)!));
  const firstFree = (hallId: string) => ({ hallId, slot: s.halls[hallId].findIndex((x) => x.programId === null) });
  if (policy === 'scatter') return halls.length > 0 ? firstFree(halls[0]) : null;
  // A hall already holding this school, with room.
  const sameSchool = halls.find((hallId) => { const sc = hallSchools(s, hallId); return sc.size === 1 && sc.has(school); });
  if (sameSchool) return firstFree(sameSchool);
  const empty = halls.find((hallId) => hallSchools(s, hallId).size === 0);
  if (empty) return firstFree(empty);
  // Nobody prudent mixes a hall: a single-school hall is what founds a
  // school, and concentration is worth thirty points of standing. Only the
  // scatter control mixes.
  return null;
}

function freeSlot(s: GameState): { hallId: string; slot: number } | null {
  for (const [hallId, slots] of Object.entries(s.halls)) {
    const slot = slots.findIndex((x) => x.programId === null);
    if (slot >= 0) return { hallId, slot };
  }
  return null;
}

// Whether seats, not beds, stop the school growing: little room left for
// next summer's class, and a program to found or a hall to site about it.
function seatsAreTheConstraint(s: GameState): boolean {
  // Tight means the catalogue holds little more than the body it has (in
  // steady state the room left each summer is the class that just graduated).
  const enrolled = totalEnrolled(s.students);
  const tight = intakeCeiling(s).capacity - enrolled < Math.max(60, 0.15 * enrolled);
  if (!tight) return false;
  const canFound = s.programOffers.length > 0 && freeSlot(s) !== null;
  const canSite = s.tech.some((t) => isAcademicHall(t) && (t.status === 'available' || t.status === 'developing'));
  return canFound || canSite;
}

// A hall is sited when programs are on offer and there is nowhere to put
// them, with no hall already going up; one capital decision under the dorm
// block's gate. The two spend-to-the-wire strategies (netMargin <= 0) site
// ahead of need, since overreaching is what they model and the "stall, don't
// die" checks in test/balance-regression.test.ts depend on it.
function siteHallIfNeeded(get: () => GameState, dispatch: (a: Action) => void, strategy: Strategy): void {
  const s = get();
  const eager = strategy.netMargin <= 0;
  // Nowhere to found: no free slot, or (for the pure-hall policies) none of
  // the standing offers may take the slots there are, a deadlock without a
  // second hall.
  const policy = strategy.founding ?? 'cheapest';
  const offers = allowedOffers(s, strategy);
  const nowhere = !freeSlot(s) || (
    policy !== 'scatter' &&
    !offers.some((id) => { const p = programById(id); return p && slotForProgram(s, strategy, p.school) !== null; })
  );
  // A prudent strategy also sites a hall when seats are the constraint and
  // every slot is taken: "seats before beds" for the one line that adds seats.
  const seatsShort = strategy.netMargin > 0 && seatsAreTheConstraint(s) && !freeSlot(s);
  if (!eager && !seatsShort && (offers.length === 0 || !nowhere)) return;
  if (s.tech.some((t) => isAcademicHall(t) && t.status === 'developing')) return;
  const next = s.tech.find((t) => isAcademicHall(t) && t.status === 'available');
  if (!next) return;
  if (canCommitCapital(s, strategy) && affordable(s, next.cost, strategy)) dispatchPlaceable(get, dispatch, next.id);
}

// One week of player decisions, through the actions the UI dispatches. Every
// block re-reads state through `get()`: each dispatch produces a new state,
// and a stale snapshot would spend the same cash twice.
function decide(
  get: () => GameState,
  strategy: Strategy,
  weeksInTheRed: number,
  dispatch: (a: Action) => void,
): void {
  commissionScholarship(get, dispatch, strategy);
  restaffOrphans(get, dispatch, strategy);
  balanceTeaching(get, dispatch, strategy);
  cutPayrollIfStalled(get, weeksInTheRed, dispatch, strategy);
  staffTheDepartment(get, dispatch, strategy);

  // Faculty: hire off the market when a field blocks a course this strategy
  // could afford to start today; otherwise it carries professors for years.
  // Don't also gate on savingForDorm: that starves hiring outright.
  if (strategy.buildsCourses) for (const candidate of get().candidates.map((c) => c.id)) {
    const s = get();
    const c = s.candidates.find((x) => x.id === candidate);
    if (!c) continue;
    // `fillsEveryChair` drops the affordability half. A program on offer
    // counts: founding it needs an instructor in the field.
    const offeredEntryIds = new Set(s.programOffers.map((id) => programById(id)?.entryCourseId));
    const needed = s.tech.some(
      (t) => t.requiresFaculty === c.field && (t.status === 'available' || offeredEntryIds.has(t.id)) &&
        !hasFreeFacultySlot(s, c.field) &&
        (strategy.fillsEveryChair || affordable(s, t.cost, strategy)),
    );
    if (needed && s.finance.cash > strategy.buffer(s) && hasHeadroom(s, strategy)) {
      dispatch({ type: 'HIRE_FACULTY', facultyId: c.id });
    }
  }

  // A search, when a department is the wall: an affordable course or offered
  // program needs a field with no free slot and nobody on the market. Same
  // gates as hiring.
  if (strategy.postsSearches) {
    const s = get();
    const offeredEntryIds = new Set(s.programOffers.map((id) => programById(id)?.entryCourseId));
    const blockedFields = new Set(
      s.tech
        .filter((t) => (t.status === 'available' || offeredEntryIds.has(t.id)) && t.requiresFaculty && affordable(s, t.cost, strategy))
        .map((t) => t.requiresFaculty!)
        .filter((field) => !hasFreeFacultySlot(s, field) && !s.candidates.some((c) => c.field === field)),
    );
    for (const field of blockedFields) {
      const now = get();
      if (!canPostSearch(now, field)) continue;
      if (now.finance.cash - searchCost(now) > strategy.buffer(now) && hasHeadroom(now, strategy)) {
        dispatch({ type: 'POST_SEARCH', field });
      }
    }
  }

  // Housing first when full (whatever comes first gets the week's cash), but
  // seats before beds: the freshman class is capped by the catalogue, so while
  // seats bind a prudent strategy founds and sites halls first.
  const seatsBound = strategy.netMargin > 0 && seatsAreTheConstraint(get());

  if (strategy.buildsDorms && !seatsBound) {
    const s = get();
    const next = s.tech.find((t) => t.kind === 'dorm' && t.status === 'available');
    // The founding campus opens with no beds, so zero beds with students
    // enrolled is its own trigger for the first dorm.
    const needsFoundingBeds = s.students.capacity === 0 && totalEnrolled(s.students) > 0;
    const full = s.students.capacity > 0 &&
      totalEnrolled(s.students) / s.students.capacity >= strategy.dormFillThreshold;
    if (next && (needsFoundingBeds || full) && canCommitCapital(s, strategy) && affordable(s, next.cost, strategy)) {
      dispatchPlaceable(get, dispatch, next.id);
    }
  }

  // Saving up: with a full campus the next dorm is the best buy, so stop
  // committing elsewhere until it is paid for, or every surplus week
  // dribbles into cheap courses and the lump never accumulates.
  const beforeCurriculum = get();
  const nextDorm = beforeCurriculum.tech.find((t) => t.kind === 'dorm' && t.status === 'available');
  const wantsDorm = !seatsBound && nextDorm !== undefined && (
    // No beds yet but students to house, or a campus past the fill threshold.
    (beforeCurriculum.students.capacity === 0 && totalEnrolled(beforeCurriculum.students) > 0) ||
    (beforeCurriculum.students.capacity > 0 &&
      totalEnrolled(beforeCurriculum.students) / beforeCurriculum.students.capacity >= strategy.dormFillThreshold)
  );
  const savingForDorm = strategy.buildsDorms && wantsDorm &&
    !affordable(beforeCurriculum, nextDorm!.cost, strategy);

  // Campus life before curriculum: the facility students are shortest of (an
  // attribute under ATTRIBUTE_SHORTFALL) comes before the next course, and a
  // prudent strategy saves for it. Only that one, not every rung its
  // threshold would buy, or a build-everything strategy saves for years.
  let shortFacility: Buildable | undefined;
  if (strategy.buildsFacilities) {
    let worst = ATTRIBUTE_SHORTFALL;
    for (const t of beforeCurriculum.tech) {
      if (t.kind !== 'facility' || t.status !== 'available' || t.facilityType === 'lab') continue;
      const attr = t.effects?.satisfactionAttribute;
      if (!attr) continue;
      const score = beforeCurriculum.students.satisfactionBreakdown[attr];
      if (score < worst) { worst = score; shortFacility = t; }
    }
  }
  const savingForFacility = strategy.netMargin > 0 && shortFacility !== undefined &&
    !affordable(beforeCurriculum, shortFacility.cost, strategy);
  const saving = savingForDorm || savingForFacility;

  // Campus life: build whatever the satisfaction breakdown says is short.
  if (strategy.buildsFacilities && !savingForDorm) {
    const ids = get().tech
      .filter((t) => t.kind === 'facility' && t.status === 'available' && t.facilityType !== 'lab')
      .map((t) => t.id);
    for (const id of ids) {
      const s = get();
      const f = s.tech.find((t) => t.id === id);
      const attr = f?.effects?.satisfactionAttribute;
      if (!f || f.status !== 'available' || !attr) continue;
      // A venue is wanted by the team waiting for it (revealed only after a
      // varsity petition, so one is awaiting it), not by its social
      // attribute, which campus-life-first keeps high.
      const wanted = f.athleticsVenueReveal
        ? s.orgs.teams.some((team) => team.status === 'awaitingVenue' && team.venueCategory === f.facilityType)
        : s.students.satisfactionBreakdown[attr] < strategy.facilityThreshold;
      if (!wanted) continue;
      if (canCommitCapital(s, strategy) && affordable(s, f.cost, strategy)) {
        dispatchPlaceable(get, dispatch, id);
      }
    }
  }

  // The tier-1 library's renovations (nextLibraryFloor) keep the node 'done',
  // so the loop above never sees them; same threshold and affordability.
  if (strategy.buildsFacilities && !savingForDorm) {
    const s = get();
    const lib = s.tech.find((t) => t.id === LIBRARY_TIER1_ID);
    const plan = lib ? nextLibraryFloor(lib) : null;
    if (
      lib && plan && lib.status === 'done' &&
      s.students.satisfactionBreakdown.academic < strategy.facilityThreshold &&
      canCommitCapital(s, strategy) && affordable(s, plan.cost, strategy)
    ) {
      dispatch({ type: 'RENOVATE_LIBRARY' });
    }
  }

  // Founding and halls come before the rest of the curriculum, since every
  // later course sits behind a founding. The spend-to-the-wire strategies do
  // this even while "saving": with no margin to keep they save for nothing.
  if (strategy.buildsCourses && (!saving || strategy.netMargin <= 0)) {
    foundPrograms(get, dispatch, strategy);
    siteHallIfNeeded(get, dispatch, strategy);
  }

  // Curriculum: cheapest tier first, plus the buildings/labs that gate it.
  if (strategy.buildsCourses && !saving) {
    const courseIds = beforeCurriculum.tech
      .filter((t) => t.kind === 'course' && t.status === 'available')
      .sort((a, b) => tierOf(a) - tierOf(b) || a.cost - b.cost)
      .map((t) => t.id);
    for (const id of courseIds) {
      const s = get();
      const c = s.tech.find((t) => t.id === id);
      if (!c || c.status !== 'available') continue;
      // A stray's courses stay where founding left them (see allowedOffers).
      const programId = programOfCourse(id);
      const school = programId ? programById(programId)?.school : undefined;
      if (school !== undefined && isStray(s, strategy, school)) continue;
      if (!hasHeadroom(s, strategy) || !affordable(s, c.cost, strategy)) continue;
      if (!courseStaysSustainable(s, strategy)) continue;
      if (canStartDevelopment(s, c)) dispatch({ type: 'START_DEVELOPMENT', nodeId: id });
    }
    for (const id of get().tech.filter((t) => t.facilityType === 'lab' && t.status === 'available').map((t) => t.id)) {
      const s = get();
      const l = s.tech.find((t) => t.id === id);
      if (l && l.status === 'available' && canCommitCapital(s, strategy) && affordable(s, l.cost, strategy)) {
        dispatchPlaceable(get, dispatch, id);
      }
    }
  }

  // The late-game sink: pour anything well past the reserve into the
  // endowment (see financeSystem.ts's endowment campaigns).
  if (strategy.campaigns) {
    const s = get();
    const campaign = endowmentCampaign(s);
    if (campaign.available && s.finance.cash - campaign.cost >= strategy.buffer(s) * 3) {
      dispatch({ type: 'LAUNCH_ENDOWMENT_CAMPAIGN' });
    }
  }
}

// ---------------------------------------------------------------------
// One year's row of the trajectory table, captured at the admissions
// boundary right after the funnel and the prestige drift resolve.
// ---------------------------------------------------------------------
export interface Row {
  year: number; cash: number; enrolled: number; capacity: number; prestige: number;
  rank: number; // national rank at the boundary (rivalsSystem.ts's playerRank)
  opex: number; net: number; satisfaction: number; courses: number; majors: number;
  faculty: number; tuition: number; applicants: number; admitRate: number;
  endowment: number; weeksInTheRed: number; minCash: number;
  // `social` and `academic` alone: the headline blends four attributes.
  social: number;
  academic: number;
  // Student life as the year closed: live organisations, their weekly cost,
  // and their contribution to the satisfaction target (read off the model).
  clubs: number; chapters: number; orgUpkeep: number; orgSatisfaction: number;
  // Varsity athletics as the year closed. `sportClubs` are clubs yet to
  // petition; `athleticsUpkeep` is teams only (coaches + program fees), split
  // from `orgUpkeep`.
  sportClubs: number; varsityActive: number; varsityAwaiting: number; athleticsUpkeep: number;
  // Research as the year closed. `grantIncome` is cumulative: whether grants
  // trivialise the cash throttle.
  researchRate: number; breakthroughs: number; grantIncome: number;
  // Graduate programs (docs/design/graduate-programs.md). Graduate courses
  // are `course` Buildables, sorted last by their 5xx/7xx ids.
  gradCourses: number; gradPrograms: number; gradUpkeep: number;
  // What a year contained for the player:
  //   actions       discretionary dispatches (not modal answers)
  //   idleWeeks     nothing startable even in principle
  //   blockedWeeks  something startable, nothing affordable
  //   facultyBlockedWeeks  nothing startable only for want of a free slot
  // Week counts read raw cash, not the strategy's buffer: facts about the
  // game, not the policy.
  actions: number; idleWeeks: number; blockedWeeks: number; facultyBlockedWeeks: number;
}

// What the week offered, whatever the strategy did (see Row's idleWeeks /
// blockedWeeks). `startable` reads only the gates cash cannot buy past
// (status, a free faculty slot); `affordable` asks whether raw cash covers any.
function weekOffered(s: GameState): { startable: boolean; affordable: boolean; facultyBlocked: boolean } {
  let startable = false;
  let affordable = false;
  let facultyBlocked = false;
  const offeredEntryIds = new Set(s.programOffers.map((id) => programById(id)?.entryCourseId));
  for (const node of s.tech) {
    // A program on offer counts: founding it needs a free slot in its field,
    // like starting a course.
    if (node.status !== 'available' && !offeredEntryIds.has(node.id)) continue;
    if (node.requiresFaculty && !hasFreeFacultySlot(s, node.requiresFaculty)) { facultyBlocked = true; continue; }
    startable = true;
    if (s.finance.cash >= node.cost) { affordable = true; break; }
  }
  // Blocked on people only when nothing at all was startable otherwise.
  return { startable, affordable, facultyBlocked: facultyBlocked && !startable };
}

function snapshot(
  s: GameState, weeksInTheRed: number, minCash: number, year: YearActivity,
): Row {
  const flow = financeBreakdown(s);
  return {
    year: s.clock.year - 1,
    cash: s.finance.cash,
    enrolled: totalEnrolled(s.students),
    capacity: s.students.capacity,
    prestige: s.self.reputation,
    rank: playerRank(s),
    opex: flow.totalExpenses,
    net: flow.net,
    satisfaction: s.students.satisfaction,
    courses: s.tech.filter((t) => t.kind === 'course' && t.status === 'done').length,
    majors: Object.keys(s.milestones).filter((k) => k.startsWith('program-established:')).length,
    faculty: s.faculty.length,
    tuition: s.finance.listedTuition,
    applicants: s.students.applicantPool,
    admitRate: s.students.admitRate,
    endowment: s.finance.endowment,
    weeksInTheRed,
    minCash,
    social: s.students.satisfactionBreakdown.social,
    academic: s.students.satisfactionBreakdown.academic,
    researchRate: weeklyResearchPoints(s),
    breakthroughs: s.research.breakthroughs,
    grantIncome: s.research.grantIncome,
    gradCourses: s.tech.filter((t) => t.graduateProgram !== undefined && t.status === 'done').length,
    gradPrograms: Object.keys(s.milestones).filter((k) => k.startsWith('grad-program-complete:')).length,
    gradUpkeep: s.tech
      .filter((t) => t.graduateProgram !== undefined && t.status === 'done')
      .reduce((sum, t) => sum + (t.effects?.upkeepPerWeek ?? 0), 0),
    clubs: s.orgs.clubs.length,
    chapters: s.orgs.chapters.length,
    orgUpkeep: flow.studentLifeUpkeep,
    orgSatisfaction: studentLifeSatisfaction(s).totalTargetContribution,
    sportClubs: s.orgs.clubs.filter((c) => c.sport !== null).length,
    varsityActive: s.orgs.teams.filter((t) => t.status === 'active').length,
    varsityAwaiting: s.orgs.teams.filter((t) => t.status === 'awaitingVenue').length,
    athleticsUpkeep: varsityTeamUpkeep(s),
    actions: year.actions,
    idleWeeks: year.idleWeeks,
    blockedWeeks: year.blockedWeeks,
    facultyBlockedWeeks: year.facultyBlockedWeeks,
  };
}

// The player-facing counts for one year, reset at each snapshot.
interface YearActivity { actions: number; idleWeeks: number; blockedWeeks: number; facultyBlockedWeeks: number }
function newYear(): YearActivity { return { actions: 0, idleWeeks: 0, blockedWeeks: 0, facultyBlockedWeeks: 0 }; }

// What the authored decision events did over a run: meant to be a rounding
// error against the growth loop, not a second economy.
interface EventTally {
  milestones: number;   // stop-the-clock celebrations shown
  decisions: number;    // authored decision events resolved
  cash: number;         // net cash effect of every choice the scripted player took
  // Student life. None of these stop the clock; Greek decisions that do are
  // already in `decisions`.
  petitionsApproved: number;
  greekEventsSeen: number; // of `decisions`, how many were Greek-life ones
  // Research (researchSystem.ts): a quiet second income or a second economy?
  // Prizes are the only one that stops the clock.
  prizes: number;
  // Research initiatives, counted from transitions in s.research.initiatives:
  // the funding ladder (INITIATIVE_DEPTHS) is tuned against concurrency.
  initiativesStarted: number;
  peakConcurrent: number;
  reports: number;           // completions that stopped the clock (see researchSystem.ts)
  initiativeSpend: number;   // cumulative up-front funding, against lifetime opex below
  // Student demands: a well-run school should almost never be asked. They
  // share the decision events' cooldown.
  demandsRaised: number;
  demandsMet: number;
  demandsFailed: number;
  demandSubjects: Record<string, number>; // which shortfall each demand was about
  // The tuned student-life/event cadences.
  schoolsNamed: number;             // naming-rights fired with the 'sign' choice
  chaptersFormed: number;           // chapter petitions approved over the run
  chaptersAskedForHousing: number;  // greek-housing fired (built or refused) — bounded by chaptersFormed
  hellenicCouncilYear: number | null;      // year the council question fired, or null if it never did
  hellenicCouncilEligibleYear: number | null; // year the club-count gate first cleared
  studentCenterYear: number | null;        // year a student center first stood
  eventFireCounts: Record<string, number>; // every decision-event id, by how many times it fired
  // Varsity petitions fire on their own schedule, outside the shared
  // decision-event budget.
  varsityPetitions: number;
  varsityGranted: number;
  titles: number; // championships won over the run (see systems/athletics/playoffs.ts)
  // The sealed record from the fiftieth summer, or null.
  legacy: Legacy | null;
  // Every interrupt the run answered, by type: which modals the player
  // actually sees, as distinct from the texture line below.
  modals: Record<string, number>;
}

// The Greek-life entries of the shared decision-event table, named only so
// the report can say how much of the fixed event budget student life took.
const GREEK_EVENT_IDS = ['hellenic-council', 'greek-scandal', 'greek-housing'];

// The athletics venue ids (facilitiesData.ts), named here so play() can
// report which ones a run finished.
const VENUE_IDS = ['ATH-FIELD', 'ATH-ARENA', 'ATH-DIAMOND', 'ATH-NATATORIUM', 'ATH-STADIUM'];

// Resets seed and fake storage so each `play` is deterministic within one
// process.
function resetSimEnvironment(seedOverride?: number): number {
  const seed = seedOverride ?? DEFAULT_SIM_SEED;
  bindScriptStream(seed); // for the harness's own direct calls into game code
  fakeStorage.clear();
  return seed;
}

// `onWeek`, when given, is called with the post-tick state every week, finer
// than `rows` (one a year); sim/milestones.ts uses it.
export function play(
  strategy: Strategy,
  years: number,
  onWeek?: (s: GameState) => void,
  // Runs on a different stream, so test/balance-regression.test.ts can ask
  // whether a failed claim fails everywhere or only here (its `holds`).
  seedOverride?: number,
  // Halts at the top of a week, before any pending interrupt is answered,
  // so the state comes back with its modal still on screen: what a scenario
  // (tools/scenarios.ts) wants, and no year boundary lands on.
  stopWhen?: (s: GameState) => boolean,
  // Continue from another run's state instead of founding (the recovery
  // scenario). Deep-cloned, so the source is untouched.
  from?: GameState,
): { rows: Row[]; tally: EventTally; venuesBuilt: string[]; state: GameState } {
  const seed = resetSimEnvironment(seedOverride);
  let s: GameState;
  if (from) {
    s = structuredClone(from);
  } else {
    s = createPreStartState();
    s = reducer(s, { type: 'START_GAME', name: 'Test University', vernacular: FOUNDING_VERNACULAR, colors: schoolColorsOf(FOUNDING_COLORS), seed });
  }
  const dispatch = (a: Action) => { s = reducer(s, a); };
  // The same dispatch, counted. Handed to decide() alone, so it measures
  // discretionary play, never modal answers (tallied by type).
  const dispatchCounted = (a: Action) => { year.actions += 1; dispatch(a); };
  let year = newYear();
  const rows: Row[] = [];
  let weeksInTheRed = 0;
  let minCash = s.finance.cash;
  const liveInitiatives = new Set<string>();

  const tally: EventTally = {
    milestones: 0, decisions: 0, cash: 0, prizes: 0,
    initiativesStarted: 0, peakConcurrent: 0, initiativeSpend: 0, reports: 0,
    petitionsApproved: 0, greekEventsSeen: 0,
    demandsRaised: 0, demandsMet: 0, demandsFailed: 0, demandSubjects: {},
    schoolsNamed: 0, chaptersFormed: 0, chaptersAskedForHousing: 0,
    hellenicCouncilYear: null, hellenicCouncilEligibleYear: null, studentCenterYear: null,
    eventFireCounts: {}, varsityPetitions: 0, varsityGranted: 0, titles: 0,
    legacy: null,
    modals: {},
  };

  while (s.clock.year <= years) {
    if (stopWhen?.(s)) break;
    if (tally.studentCenterYear === null && hasStudentCenter(s)) tally.studentCenterYear = s.clock.year;
    if (tally.hellenicCouncilEligibleYear === null && s.orgs.clubs.length >= HELLENIC_COUNCIL_MIN_CLUBS) {
      tally.hellenicCouncilEligibleYear = s.clock.year;
    }
    if (s.pendingInterrupt) {
      // Answered by the shared defaults (engine/defaultAnswers.ts) so the
      // debug panel's Jump plays the same game; tallies are read first.
      const type = s.pendingInterrupt.type;
      // The summer is four beats of one modal (types.ts's SummerPayload),
      // one per pass through this loop. It counts as one modal, on its
      // opening beat; the digest and the row are read on the last.
      const summerBeat = type === 'summer' ? (s.pendingInterrupt.payload as SummerPayload).beat : null;
      const summerCloses = summerBeat === SUMMER_LAST_BEAT;
      if (summerBeat === null || summerBeat === 0) tally.modals[type] = (tally.modals[type] ?? 0) + 1;
      const answer = defaultAnswer(s, {
        tuition: strategy.tuition(s),
        // Unless the strategy sets it, the slider's opening position for the
        // current standing: s.students.admitRate is sticky by design.
        admitRate: strategy.admitRate ? strategy.admitRate(s) : admitRate(s.self.reputation),
      });

      if (summerCloses) {
        // The digest is the summer's last beat. Recognising every petition
        // makes these runs an upper bound on student life's cost.
        tally.petitionsApproved += s.orgs.pendingPetitions.length;
        tally.chaptersFormed += s.orgs.pendingPetitions.filter((p) => p.kind === 'chapter').length;
      } else if (type === 'milestone') {
        tally.milestones += 1;
      } else if (type === 'research-complete') {
        // The completion report carries the award if the work won one.
        const { report } = s.pendingInterrupt.payload as { report: InitiativeReport };
        tally.reports += 1;
        if (report.award) tally.prizes += 1;
      } else if (type === 'demand') {
        // A demand is answered by building before the deadline; the default
        // answer only acknowledges it.
        const demand = s.events.activeDemand;
        tally.demandsRaised += 1;
        if (demand) {
          const subject = demandSubject(demand);
          tally.demandSubjects[subject] = (tally.demandSubjects[subject] ?? 0) + 1;
        }
      } else if (type === 'championship') {
        tally.titles += 1;
      }

      const before = s.finance.cash;
      if (answer) dispatch(answer);

      if (summerCloses) {
        rows.push(snapshot(s, weeksInTheRed, minCash, year));
        year = newYear();
        // The record, the summer it is sealed, read off the state so the
        // harness asserts against what a player was shown.
        if (tally.legacy === null && s.self.legacy) tally.legacy = s.self.legacy;
      }
      if (type === 'decision-event') {
        const taken = answer?.type === 'RESOLVE_DECISION_EVENT' && answer.eventId !== ''
          ? { eventId: answer.eventId, choiceId: answer.choiceId }
          : null;
        if (taken) {
          tally.decisions += 1;
          if (GREEK_EVENT_IDS.includes(taken.eventId)) tally.greekEventsSeen += 1;
          tally.eventFireCounts[taken.eventId] = (tally.eventFireCounts[taken.eventId] ?? 0) + 1;
          if (taken.eventId === 'naming-rights' && taken.choiceId === 'sign') tally.schoolsNamed += 1;
          if (taken.eventId === 'greek-housing') tally.chaptersAskedForHousing += 1;
          if (taken.eventId === 'varsity-petition') {
            tally.varsityPetitions += 1;
            if (taken.choiceId === 'establish') tally.varsityGranted += 1;
          }
          if (taken.eventId === 'hellenic-council' && tally.hellenicCouncilYear === null) {
            // A decision event never falls on the week the clock turns over,
            // so the post-dispatch year is the year it fired.
            tally.hellenicCouncilYear = s.clock.year;
          }
        }
        tally.cash += s.finance.cash - before;
      }
      continue;
    }
    // Read before the week's decisions: the week the player woke up to.
    const offered = weekOffered(s);
    if (offered.facultyBlocked) year.facultyBlockedWeeks += 1;
    else if (!offered.startable) year.idleWeeks += 1;
    else if (!offered.affordable) year.blockedWeeks += 1;
    decide(() => s, strategy, weeksInTheRed, dispatchCounted);
    // A demand resolves silently inside a tick (meeting one is finishing a
    // building), so its outcome is read from the transition. Safe against
    // the post-tick state because neither reading it is measured on can fall.
    const demandBefore = s.events.activeDemand;
    dispatch({ type: 'TICK' });
    if (demandBefore && !s.events.activeDemand) {
      if (demandProgress(s, demandBefore).met) tally.demandsMet += 1;
      else tally.demandsFailed += 1;
    }
    if (s.finance.cash < 0) weeksInTheRed += 1;
    minCash = Math.min(minCash, s.finance.cash);
    const running = Object.keys(s.research.initiatives);
    for (const labId of running) {
      if (!liveInitiatives.has(labId)) {
        tally.initiativesStarted += 1;
        tally.initiativeSpend += initiativeFundingCost(s, initiativeDepth(s.research.initiatives[labId].depth));
      }
    }
    liveInitiatives.clear();
    for (const labId of running) liveInitiatives.add(labId);
    tally.peakConcurrent = Math.max(tally.peakConcurrent, running.length);
    onWeek?.(s);
  }
  const venuesBuilt = VENUE_IDS.filter((id) => s.tech.find((t) => t.id === id)?.status === 'done');
  // The final state rides along: a run halted by `stopWhen` stops between
  // weeks, so `onWeek` never sees it. tools/scenario.ts writes it out.
  return { rows, tally, venuesBuilt, state: s };
}

function fmt(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1e9) return `${sign}${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${sign}${(abs / 1e3).toFixed(0)}k`;
  return `${sign}${abs.toFixed(0)}`;
}

function report(strategy: Strategy, run: { rows: Row[]; tally: EventTally; venuesBuilt: string[] }, every: number): void {
  const { rows, tally } = run;
  console.log(`\n=== ${strategy.name} ===`);
  console.log('yr |     cash |   enr/cap   | prest | opex/wk | net/wk |  sat | soc | aca | crs | maj | fac |  tuition |  applic | admit% |  endow | rsch/wk | brk | orgs | grad | act | idle | blkd | fblk');
  const last = rows[rows.length - 1];
  for (const r of rows) {
    if (r.year > 6 && r.year % every !== 0 && r !== last) continue;
    console.log(
      `${String(r.year).padStart(2)} | ${fmt(r.cash).padStart(8)} | ${fmt(r.enrolled).padStart(5)}/${fmt(r.capacity).padEnd(5)} | ` +
      `${r.prestige.toFixed(1).padStart(5)} | ${fmt(r.opex).padStart(7)} | ${fmt(r.net).padStart(6)} | ${r.satisfaction.toFixed(0).padStart(4)} | ` +
      `${r.social.toFixed(0).padStart(3)} | ${r.academic.toFixed(0).padStart(3)} | ` +
      `${String(r.courses).padStart(3)} | ${String(r.majors).padStart(3)} | ${String(r.faculty).padStart(3)} | ${fmt(r.tuition).padStart(8)} | ` +
      `${fmt(r.applicants).padStart(7)} | ${(r.admitRate * 100).toFixed(0).padStart(6)} | ${fmt(r.endowment).padStart(6)} | ` +
      `${r.researchRate.toFixed(1).padStart(7)} | ${String(r.breakthroughs).padStart(3)} | ` +
      // clubs/chapters live at year end: when student life starts.
      `${String(r.clubs).padStart(2)}/${String(r.chapters).padEnd(2)} | ` +
      // graduate courses developed / programs founded at year end.
      `${String(r.gradCourses).padStart(2)}/${r.gradPrograms} | ` +
      // The year for the player: actions, idle weeks, money-blocked weeks,
      // faculty-blocked weeks.
      `${String(r.actions).padStart(3)} | ${String(r.idleWeeks).padStart(4)} | ${String(r.blockedWeeks).padStart(4)} | ${String(r.facultyBlockedWeeks).padStart(4)}`,
    );
  }
  console.log(`   weeks in the red: ${last.weeksInTheRed} of ${rows.length * 52}, min cash: ${fmt(last.minCash)}`);
  console.log(`   milestone celebrations: ${tally.milestones}, decision events: ${tally.decisions}, net event cash: ${fmt(tally.cash)}`);
  // How often the clock is stopped by something other than the summer.
  // Demands are in the total because they spend the decision events'
  // cooldown, so adding them moves it very little.
  const years = rows.length;
  const texture = tally.milestones + tally.decisions + tally.reports + tally.demandsRaised;
  const subjects = Object.entries(tally.demandSubjects)
    .sort((a, b) => b[1] - a[1])
    .map(([subject, n]) => `${subject} x${n}`)
    .join(', ');
  console.log(
    `   student demands: ${tally.demandsRaised} raised (${tally.demandsMet} met, ${tally.demandsFailed} failed)` +
    `${subjects ? ` — ${subjects}` : ''}`,
  );
  console.log(
    `   texture modals (milestones + events + research reports + demands): ${texture} over ${years} years ` +
    `= ${(texture / Math.max(years, 1)).toFixed(2)}/yr, on top of the ${years} summers`,
  );
  const modalTotal = Object.values(tally.modals).reduce((sum, n) => sum + n, 0);
  const modalMix = Object.entries(tally.modals)
    .sort((a, b) => b[1] - a[1])
    .map(([type, n]) => `${type} ${n}`)
    .join(' · ');
  console.log(
    `   modals answered: ${modalTotal} over ${years} years = ${(modalTotal / Math.max(years, 1)).toFixed(1)}/yr — ${modalMix}`,
  );
  // And what the player had to do: reported as a run average and as the
  // last decade's, because the shape over time is the finding.
  const decade = rows.slice(-10);
  const mean = (list: Row[], pick: (r: Row) => number) =>
    list.reduce((sum, r) => sum + pick(r), 0) / Math.max(list.length, 1);
  console.log(
    `   what a year contained: ${mean(rows, (r) => r.actions).toFixed(1)} actions/yr ` +
    `(last decade ${mean(decade, (r) => r.actions).toFixed(1)}), ` +
    `${mean(rows, (r) => r.idleWeeks).toFixed(1)} idle weeks/yr ` +
    `(last decade ${mean(decade, (r) => r.idleWeeks).toFixed(1)}), ` +
    `${mean(rows, (r) => r.blockedWeeks).toFixed(1)} money-blocked weeks/yr ` +
    `(last decade ${mean(decade, (r) => r.blockedWeeks).toFixed(1)}), ` +
    `${mean(rows, (r) => r.facultyBlockedWeeks).toFixed(1)} faculty-blocked weeks/yr ` +
    `(last decade ${mean(decade, (r) => r.facultyBlockedWeeks).toFixed(1)})`,
  );
  // Grants as a share of lifetime opex: whether they trivialise the cash
  // throttle.
  const lifetimeOpEx = rows.reduce((sum, r) => sum + r.opex * 52, 0);
  const grantShare = lifetimeOpEx > 0 ? (last.grantIncome / lifetimeOpEx) * 100 : 0;
  console.log(
    `   research: ${last.researchRate.toFixed(1)} pts/wk at close, ${last.breakthroughs} breakthroughs, ` +
    `${tally.prizes} prizes, ${fmt(last.grantIncome)} in grants (${grantShare.toFixed(1)}% of lifetime opex)`,
  );
  // The funding ladder's line: two or three projects at once in a mature
  // school is the target; eight means funding is too cheap, none too dear.
  const spendShare = lifetimeOpEx > 0 ? (tally.initiativeSpend / lifetimeOpEx) * 100 : 0;
  console.log(
    `   initiatives: ${tally.initiativesStarted} started, ${tally.peakConcurrent} running at once at the peak, ` +
    `${fmt(tally.initiativeSpend)} of funding (${spendShare.toFixed(1)}% of lifetime opex), ` +
    `${tally.reports} concluded with a report`,
  );
  // Graduate programs: when they arrive and their share of opex (a late-game
  // sink or a mid-game tax?). `firstGrad` is the year the first graduate
  // course finished, when the tier starts costing money.
  const firstGrad = rows.find((r) => r.gradCourses > 0);
  const firstProgram = rows.find((r) => r.gradPrograms > 0);
  const gradShare = last.opex > 0 ? (last.gradUpkeep / last.opex) * 100 : 0;
  console.log(
    `   graduate: ${last.gradCourses} courses, ${last.gradPrograms} programs founded at close; ` +
    `first course yr ${firstGrad ? firstGrad.year : '-'}, first program yr ${firstProgram ? firstProgram.year : '-'}; ` +
    `${fmt(last.gradUpkeep)}/wk upkeep (${gradShare.toFixed(2)}% of opex)`,
  );
  // Student life as a share of opex: did it move the throttle?
  const orgShare = last.opex > 0 ? (last.orgUpkeep / last.opex) * 100 : 0;
  console.log(
    `   student life: ${last.clubs} clubs, ${last.chapters} chapters at close ` +
    `(${tally.petitionsApproved} recognised over the run), ${fmt(last.orgUpkeep)}/wk upkeep ` +
    `(${orgShare.toFixed(2)}% of opex), +${last.orgSatisfaction.toFixed(2)} on the satisfaction target; ` +
    `${tally.greekEventsSeen} of ${tally.decisions} decision events were Greek-life ones`,
  );
  // Varsity athletics as a share of opex. The petition fires on its own
  // schedule, so its share of `decisions` is a read on modal traffic only.
  const athleticsShare = last.opex > 0 ? (last.athleticsUpkeep / last.opex) * 100 : 0;
  console.log(
    `   varsity athletics: ${last.sportClubs} sport clubs, ${last.varsityActive} active teams, ` +
    `${last.varsityAwaiting} awaiting venue at close; ${tally.varsityGranted}/${tally.varsityPetitions} petitions granted; ` +
    `${fmt(last.athleticsUpkeep)}/wk upkeep (${athleticsShare.toFixed(2)}% of opex); ` +
    `${run.tally.titles} national title${run.tally.titles === 1 ? '' : 's'}; ` +
    `${tally.varsityPetitions} of ${tally.decisions} decision events were varsity petitions; ` +
    `venues built: ${run.venuesBuilt.length > 0 ? run.venuesBuilt.join(', ') : 'none'}`,
  );
  // The tuned cadences, each measured against the outcome a long run should
  // show, not just whether the event fired.
  const totalSchools = discoverySchools().length;
  const housingFraction = tally.chaptersFormed > 0
    ? (tally.chaptersAskedForHousing / tally.chaptersFormed) * 100 : 0;
  const councilLine = tally.hellenicCouncilYear === null
    ? 'never fired'
    : `year ${tally.hellenicCouncilYear}` +
      (tally.hellenicCouncilEligibleYear !== null
        ? ` (${tally.hellenicCouncilYear - tally.hellenicCouncilEligibleYear} yr after ${HELLENIC_COUNCIL_MIN_CLUBS}-club eligibility in yr ${tally.hellenicCouncilEligibleYear}` +
          (tally.studentCenterYear !== null ? `, ${tally.hellenicCouncilYear - tally.studentCenterYear} yr after the student center in yr ${tally.studentCenterYear})` : ')')
        : '');
  console.log(
    `   cadence tuning: naming rights ${tally.schoolsNamed}/${totalSchools} schools named; ` +
    `greek housing ${tally.chaptersAskedForHousing}/${tally.chaptersFormed} chapters asked (${housingFraction.toFixed(0)}%); ` +
    `hellenic council ${councilLine}`,
  );
  if (tally.legacy) {
    console.log(
      `   legacy (sealed year ${tally.legacy.year}): ${tally.legacy.name} — `
      + tally.legacy.axes.map((a) => `${a.label} ${a.grade}`).join(', '),
    );
  }
  const eventBreakdown = Object.entries(tally.eventFireCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([id, n]) => `${id} x${n}`)
    .join(', ');
  console.log(`   event mix: ${eventBreakdown}`);
}

// ---------------------------------------------------------------------
// The strategies. Tuition ramps with prestige; no strategy should ever be
// unable to recover.
// ---------------------------------------------------------------------
//
// Underwater, rampTuition charges 15% more ("price before people"). Small on
// purpose: enrolment is a four-class stock, so a jump to the cap collects
// from students who applied at the old price before the pool reacts.
// The clamp to TUITION_SLIDER_MAX is purely defensive.
const DEFICIT_SURCHARGE = 1.15;
const rampTuition = (perPrestigePoint: number, base = 4_000) => (s: GameState) => {
  const ramped = Math.round((base + s.self.reputation * perPrestigePoint) / 500) * 500;
  const surcharged = s.finance.cash < 0 ? Math.round(ramped * DEFICIT_SURCHARGE / 500) * 500 : ramped;
  return Math.min(TUITION_SLIDER_MAX, surcharged);
};

// The selective college's policy: the body it holds itself to, and the band
// its admit rate lives in.
const SELECTIVE_COLLEGE_BODY = 4_000;
const SELECTIVE_COLLEGE_ADMIT_CEILING = 0.15;
const SELECTIVE_COLLEGE_ADMIT_FLOOR = 0.005; // a pool of a quarter million against a class of a thousand
const SELECTIVE_COLLEGE_PRICE_OVER_TOLERANCE = 1.2;
// The regional engine's: take most of what applies.
const REGIONAL_ENGINE_ADMIT_RATE = 0.6; // three quarters crowded the campus faster than it could build

export const STRATEGIES: Strategy[] = [
  {
    // The intended line of play: grow one thing at a time, never take on a
    // commitment the current cash flow can't carry.
    name: 'Balanced builder',
    tuition: rampTuition(225, 3_000),
    buffer: (s) => Math.max(150_000, s.finance.weeklyOpEx * 4),
    netMargin: 0.12,
    buildsCourses: true, buildsDorms: true, buildsFacilities: true,
    dormFillThreshold: 0.85, facilityThreshold: 72, campaigns: true,
  },
  {
    // Deliberate overreach: buys everything the moment cash allows,
    // ignoring the flow. Should stall hard, then claw back out — never die.
    name: 'Curriculum rush (overreach)',
    tuition: rampTuition(240, 3_200),
    buffer: () => 20_000,
    netMargin: 0,
    buildsCourses: true, buildsDorms: true, buildsFacilities: true,
    dormFillThreshold: 0.98, facilityThreshold: 45, campaigns: false,
  },
  {
    // The volume archetype: the cheapest school here, beds first. Tests
    // that a big low-selectivity school is a viable, different shape.
    name: 'Discount volume (beds first)',
    // A discount, not a giveaway: a sixth to a fifth under the balanced
    // ramp. Cheaper, and per-student costs that rise with standing lose
    // money on every student forever.
    tuition: rampTuition(180, 2_500),
    buffer: (s) => Math.max(200_000, s.finance.weeklyOpEx * 8),
    netMargin: 0.08,
    buildsCourses: true, buildsDorms: true, buildsFacilities: true,
    dormFillThreshold: 0.7, facilityThreshold: 80, campaigns: true,
    // Its low net tuition does not clear instruction cost at a full
    // catalogue (see Strategy.courseAffordabilityAware).
    courseAffordabilityAware: true,
  },
  {
    // Balanced builder's discipline, with facilityThreshold Infinity: every
    // available facility is built regardless of satisfaction. The only
    // strategy that reaches the whole catalogue (see sim/milestones.ts).
    name: 'Completionist (build everything)',
    tuition: rampTuition(225, 3_000),
    buffer: (s) => Math.max(150_000, s.finance.weeklyOpEx * 4),
    netMargin: 0.12,
    buildsCourses: true, buildsDorms: true, buildsFacilities: true,
    dormFillThreshold: 0.85, facilityThreshold: Infinity, campaigns: true,
  },
  {
    // The stall test: beds far ahead of demand, priced too cheaply to carry
    // them, no buffer or margin. It must go deep into the red and climb back
    // out. Tune it across many seeds: the response to price is not monotone.
    name: 'Overbuilder (beds ahead of demand)',
    tuition: rampTuition(150, 2_000),
    buffer: () => 0,
    netMargin: -1,
    // The barest facilities, only when an attribute is dire: with welfare
    // and attrition modelled, a campus that never feeds its students cannot
    // recover, and "stall, don't die" is a claim about beds, not hunger.
    buildsCourses: true, buildsDorms: true, buildsFacilities: true,
    dormFillThreshold: 0, facilityThreshold: 40, campaigns: false,
  },
  {
    // The earnest completionist: the September 2026 review's policy
    // (docs/reviews/2026-09-design-review.md, Appendix A). The others are
    // archetypes; this is a player who intends to develop every course, build
    // every asset, stay solvent and see everything the game has.
    //
    //   price      90% of what prestige makes tolerable: the highest price
    //              that does not start driving the pool away
    //   admit      clamp(1.35 - prestige/100, 0.08, 0.65): broad while
    //              small, narrowing hard as standing builds
    //   build      cheapest tier first, on a four-week-opex buffer
    //   facilities every rung whose attribute is under 80
    //   beds       35% of the enrolled body
    //   research   deepest affordable in every idle lab, without gutting a
    //              department
    //   people     every chair filled, and the varsity department staffed
    //   money      campaigns with the surplus, athletics budget high once
    //              flush
    name: 'Earnest completionist',
    tuition: (s) => Math.min(TUITION_SLIDER_MAX, Math.round(priceTolerance(s.self.reputation) * 0.9 / 500) * 500),
    admitRate: (s) => Math.max(0.08, Math.min(0.65, 1.35 - s.self.reputation / 100)),
    buffer: (s) => Math.max(150_000, s.finance.weeklyOpEx * 4),
    netMargin: 0.1,
    buildsCourses: true, buildsDorms: true, buildsFacilities: true,
    // Beds at 35% of enrolled, in the units the dorm rule reads
    // (enrolled/capacity ≈ 2.86).
    dormFillThreshold: 1 / 0.35,
    facilityThreshold: 80,
    campaigns: true,
    playsCoachingMarket: true,
    fillsEveryChair: true,
    founding: 'school-first',
    postsSearches: true,
  },
  {
    // The scatterer: a control, not a player. The Balanced builder, except it
    // founds whatever is offered first into whatever slot is free first. It
    // should visibly under-perform on schools founded
    // (test/balance-regression.test.ts).
    name: 'Scatterer (founds anything anywhere)',
    tuition: rampTuition(225, 3_000),
    buffer: (s) => Math.max(150_000, s.finance.weeklyOpEx * 4),
    netMargin: 0.12,
    buildsCourses: true, buildsDorms: true, buildsFacilities: true,
    dormFillThreshold: 0.85, facilityThreshold: 72, campaigns: true,
    founding: 'scatter',
  },
  {
    // The selective college: small, deep in two or three schools. Target: an
    // A in teaching, concentration and selectivity, and prestige near the
    // completionist's; if tuning cannot meet it, fix the prestige model.
    name: 'Selective college',
    // A notch above what its standing tolerates: it takes one applicant in a
    // hundred, so it can. At tolerance exactly it could not fund the teaching
    // hires it exists to make.
    tuition: (s) => Math.min(TUITION_SLIDER_MAX, Math.round(priceTolerance(s.self.reputation) * SELECTIVE_COLLEGE_PRICE_OVER_TOLERANCE / 500) * 500),
    // Held by the class: each summer's class is a quarter of the body, taken
    // from last summer's pool (the best estimate before the funnel runs).
    admitRate: (s) => Math.max(
      SELECTIVE_COLLEGE_ADMIT_FLOOR,
      Math.min(SELECTIVE_COLLEGE_ADMIT_CEILING, (SELECTIVE_COLLEGE_BODY / 4) / Math.max(1, s.students.applicantPool)),
    ),
    buffer: (s) => Math.max(150_000, s.finance.weeklyOpEx * 4),
    netMargin: 0.1,
    buildsCourses: true, buildsDorms: true, buildsFacilities: true,
    dormFillThreshold: 1 / 0.5, // beds for half the body — a residential college
    // Every rung whose attribute is short of excellent, not every facility
    // in the game: at Infinity its tuition line could not also finish its
    // own schools' capstones.
    facilityThreshold: 85,
    campaigns: true,
    // No coaching market and no fill-every-chair: on this tuition line they
    // put the school in the red for decades. Its people money goes to
    // teaching hires (balancesTeaching).
    founding: 'school-first',
    maxSchools: 3,
    postsSearches: true,
    balancesTeaching: true,
  },
  {
    // The regional engine: cheap, broad, big, and not a research university.
    // Target: an A in reach, a C in research, solvency, and a legacy of its
    // own.
    name: 'Regional engine',
    // Cheap later, not at founding: under the founding line it cannot carry
    // its first curriculum; a quarter under the balanced ramp late, its
    // standing-driven costs outrun it.
    tuition: rampTuition(200, 5_500),
    admitRate: () => REGIONAL_ENGINE_ADMIT_RATE,
    // The balanced builder's reserve and flow gate: big and cheap, not careless.
    buffer: (s) => Math.max(150_000, s.finance.weeklyOpEx * 4),
    netMargin: 0.08,
    buildsCourses: true, buildsDorms: true, buildsFacilities: true,
    // Builds for its students sooner: a big school's standing is its
    // welfare and its crowding.
    dormFillThreshold: 0.7, facilityThreshold: 80, campaigns: true,
    // Hires only for a course it can afford to start: filling every chair on
    // a founding budget sinks it in year two.
    //
    // No research, not 'shallow': a big school's pilot projects still add up
    // to an A in research over thirty years.
    research: 'none',
    // Its thin margin needs the same caution as the discount archetype's.
    courseAffordabilityAware: true,
  },
  {
    // The control: builds nothing, ever. Prestige and cash here are the
    // floor the whole loop has to beat, or growth is optional.
    name: 'Idle (builds nothing)',
    tuition: () => 9_600,
    buffer: () => Number.MAX_SAFE_INTEGER,
    netMargin: Number.MAX_SAFE_INTEGER,
    buildsCourses: false, buildsDorms: false, buildsFacilities: false,
    dormFillThreshold: 2, facilityThreshold: 0, campaigns: false,
  },
];

// ---------------------------------------------------------------------
// Admit-rate probes: experiments, not archetypes. Each is the Balanced
// builder with only the share of the pool changed.
//
// Deliberately not in STRATEGIES: balance-regression.test.ts asserts every
// strategy stalls rather than dies, a promise about reasonable lines of
// play. A probe that dies is a finding here; promote one into STRATEGIES to
// support it.
//
// What they found on the 40-year run when written: broad-then-narrow beat
// the default curve; open door ended rich and mediocre (capped by
// libraryAdequacyScore, and by word of mouth shrinking its pool); ivory
// tower and band skimming starved the school of the tuition that buys
// breadth.
// ---------------------------------------------------------------------
const balancedBase = STRATEGIES.find((s) => s.name.startsWith('Balanced builder'))!;

export const ADMIT_PROBES: Strategy[] = [
  // The control: whatever the slider opens at. Identical to the archetype.
  { ...balancedBase, name: 'Probe: default curve' },

  // Take everyone, forever.
  { ...balancedBase, name: 'Probe: open door (100%)', admitRate: () => 1 },

  // Ivory tower from day one, well inside the top band at any prestige.
  { ...balancedBase, name: 'Probe: ivory tower (8%)', admitRate: () => 0.08 },

  // The intended arc: broad while small, narrowing as standing builds.
  // 100% at founding prestige, ~20% by prestige 100, floored at 10%.
  {
    ...balancedBase,
    name: 'Probe: broad then narrow',
    admitRate: (s) => Math.max(0.1, Math.min(1, 1.5 - s.self.reputation / 80)),
  },

  // The suspected exploit: sit exactly where incoming quality saturates.
  // Any less buys no quality and costs class size; any more starts diluting.
  {
    ...balancedBase,
    name: 'Probe: band skimmer',
    admitRate: (s) => topBandShare(s.self.reputation, s.finance.listedTuition),
  },
];

// ---------------------------------------------------------------------
// The scorecard (sim/reference.ts): one line per figure outside the band
// the last committed measurement recorded. Silence means the trajectory
// matches the reference, not that it is right.
// ---------------------------------------------------------------------
function reportScorecard(strategy: Strategy, rows: Row[]): void {
  if (!bandsFor(strategy.name)) {
    console.log(`   scorecard: no reference bands for "${strategy.name}" — run \`npm run sim -- --write-reference\``);
    return;
  }
  const findings = findingsFor(strategy.name, rows);
  if (findings.length === 0) {
    console.log('   scorecard: every sampled figure inside its band');
    return;
  }
  console.log(`   scorecard: ${findings.length} figure${findings.length === 1 ? '' : 's'} out of band`);
  for (const finding of findings) console.log(`     ${describeFinding(finding)}`);
}

// ---------------------------------------------------------------------
// Run-to-run comparison: `--save last.json` writes every sampled row;
// `--compare last.json` prints what moved by more than COMPARE_THRESHOLD, so
// a PR can quote the sim as a diff.
// ---------------------------------------------------------------------
const COMPARE_THRESHOLD = 0.05;

interface SavedRun { seed: number; years: number; strategies: Record<string, Row[]> }

function reportComparison(previous: SavedRun, current: Record<string, Row[]>): void {
  console.log(`\n=== compared against a run of ${previous.years} years at seed ${previous.seed} ===`);
  let moved = 0;
  for (const [name, rows] of Object.entries(current)) {
    const before = previous.strategies[name];
    if (!before) {
      console.log(`   ${name}: not in the saved run`);
      continue;
    }
    for (const row of rows) {
      const was = before.find((r) => r.year === row.year);
      if (!was) continue;
      for (const metric of METRICS) {
        const then = metricOf(was, metric);
        const now = metricOf(row, metric);
        // Against the larger magnitude, so a move away from zero reads as a
        // change rather than a division by nothing.
        const scale = Math.max(Math.abs(then), Math.abs(now));
        if (scale === 0) continue;
        if (Math.abs(now - then) / scale <= COMPARE_THRESHOLD) continue;
        moved += 1;
        console.log(`   ${name} · year ${row.year} ${metric}: ${fmtMetric(then, metric)} -> ${fmtMetric(now, metric)}`);
      }
    }
  }
  if (moved === 0) console.log(`   nothing moved by more than ${(COMPARE_THRESHOLD * 100).toFixed(0)}%`);
}

function fmtMetric(value: number, metric: Metric): string {
  if (metric === 'netMargin') return `${(value * 100).toFixed(1)}%`;
  if (metric === 'weeksInTheRed') return value.toFixed(0);
  if (metric === 'prestige') return value.toFixed(1);
  // Enrolment prints in full: "5k -> 5k" is worse than no line.
  if (metric === 'enrolled') return Math.round(value).toLocaleString();
  return fmt(value);
}

// Rewrites the generated block of sim/reference.ts in place, leaving the
// hand-written lines above it alone. Relative to the package root.
const REFERENCE_PATH = 'sim/reference.ts';
// The marker lines live here, not as constants in the file being written:
// a constant declaring the marker contains it, so the writer would eat it.
const GENERATED_START = '// --- GENERATED by `npm run sim -- --write-reference`. Do not hand-edit lightly. ---';
const GENERATED_END = '// --- END GENERATED ---';

function writeReference(runs: Record<string, Row[][]>): void {
  const reference: Reference = {};
  for (const [name, seeds] of Object.entries(runs)) reference[name] = bandsAcross(seeds);

  const source = readFileSync(REFERENCE_PATH, 'utf8');
  const start = source.indexOf(GENERATED_START);
  const end = source.indexOf(GENERATED_END);
  if (start === -1 || end === -1) throw new Error(`${REFERENCE_PATH}: generated markers not found`);
  const rewritten = source.slice(0, start)
    + GENERATED_START + '\n' + serialiseReference(reference) + '\n'
    + source.slice(end);
  writeFileSync(REFERENCE_PATH, rewritten);
  const years = Object.values(reference)[0]?.map((r) => r.year).join(', ') ?? 'none';
  console.log(
    `\nwrote ${REFERENCE_PATH}: ${Object.keys(reference).length} strategies at years ${years}, `
    + `each band the envelope of ${1 + REFERENCE_EXTRA_SEEDS.length} seeds at ±${(TOLERANCE * 100).toFixed(0)}%`,
  );
}

// Guarded so `npm run sim` prints the report while tests can import
// STRATEGIES and play without triggering a run.
const isCliEntry = process.argv[1]?.includes('balanceSim') ?? false;
if (isCliEntry) {
  const argv = process.argv.slice(2);
  const flag = (name: string) => argv.includes(`--${name}`);
  const flagValue = (name: string) => {
    const at = argv.indexOf(`--${name}`);
    return at === -1 ? undefined : argv[at + 1];
  };
  // Positionals are what is left once flags and their values are taken
  // out, so `npm run sim -- 40 2 --compare last.json` still works.
  const consumed = new Set<string>();
  for (const name of ['compare', 'save']) {
    const value = flagValue(name);
    if (value) consumed.add(value);
  }
  const positional = argv.filter((a) => !a.startsWith('--') && !consumed.has(a));

  const writingReference = flag('write-reference');
  // The reference covers the full horizon, so writing it ignores a shorter one.
  const years = writingReference ? REFERENCE_HORIZON : Number(positional[0] ?? 40);
  const every = Number(positional[1] ?? 2);
  const filter = writingReference ? undefined : positional[2];

  const runs: Record<string, Row[]> = {};
  const seedRuns: Record<string, Row[][]> = {};
  for (const strategy of STRATEGIES) {
    if (filter && !strategy.name.toLowerCase().includes(filter.toLowerCase())) continue;
    const run = play(strategy, years);
    runs[strategy.name] = run.rows;
    report(strategy, run, every);
    if (!writingReference) reportScorecard(strategy, run.rows);
    // Three-seed bands: a band fitted to one seed is a claim about that
    // seed, so each band is the envelope of three streams.
    if (writingReference) {
      seedRuns[strategy.name] = [run.rows, ...REFERENCE_EXTRA_SEEDS.map((seed) => play(strategy, years, undefined, seed).rows)];
    }
  }

  if (writingReference) writeReference(seedRuns);

  const comparePath = flagValue('compare');
  if (comparePath) {
    reportComparison(JSON.parse(readFileSync(comparePath, 'utf8')) as SavedRun, runs);
  }

  const savePath = flagValue('save');
  if (savePath) {
    const saved: SavedRun = { seed: DEFAULT_SIM_SEED, years, strategies: runs };
    writeFileSync(savePath, JSON.stringify(saved));
    console.log(`\nwrote ${savePath}: ${Object.keys(runs).length} strategies, ${years} years at seed ${DEFAULT_SIM_SEED}`);
  }
}
