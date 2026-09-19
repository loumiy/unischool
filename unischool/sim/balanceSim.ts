// ---------------------------------------------------------------------
// The balance harness: a headless fast-forward through the REAL reducer.
//
// Every pacing decision in this game is a claim about a trajectory —
// "cash pinches at tier-1", "the tier-2 loop forces dorms before the
// tuition that pays for them" — and none of those claims can be checked by
// reading constants. So this drives the actual game loop (the same
// reducer, the same systems, the same Buildable data the app ships) for
// N in-game years under a handful of scripted player strategies, and
// prints the year-by-year cash / enrolled / prestige / opex table the
// tuning constants were fitted against.
//
// It is NOT part of the game: no system imports it, it ships nothing into
// the bundle, and it may only ever READ the shared state and dispatch the
// same actions the UI dispatches. If it ever needs a hook the UI doesn't
// have, that is a signal the harness is wrong, not the engine.
//
//   npm run sim            # 40 years, every 2nd year, all strategies
//   npm run sim -- 60 5    # 60 years, every 5th year
//   npm run sim -- 40 2 public   # only strategies matching "public"
//
// Every table is followed by its SCORECARD: the figures that have left the
// bands sim/reference.ts records for that strategy (see there for what a
// band is and is not). Two more flags go with it:
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
import type { AthleticsBudgetTier, GameState, Buildable, InitiativeReport, SummerPayload } from '../src/state/types';
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
import { facultyLoads } from '../src/systems/faculty/facultyAssignment';
import { initiativeDepth, initiativeFundingCost, initiativeOffers } from '../src/data/researchData';
import { isAcademicHall, programById, programs, researchSchools } from '../src/data/techData';
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

// ---------------------------------------------------------------------
// Deterministic environment. The game rolls dice (faculty potentials,
// rival drift, posting timelines) and saves to localStorage; a harness
// wants the same run every time and no browser, so Math.random is seeded
// and localStorage is stubbed here rather than either being made optional
// anywhere in the game code. (crypto.randomUUID is left alone — Node has
// it, and faculty ids never affect a trajectory.)
// ---------------------------------------------------------------------
// One fixed seed by default, so `npm run sim` is the same run every time
// and a trajectory can be diffed against the last one. SIM_SEED overrides
// it, which is what makes a balance claim checkable rather than anecdotal:
// any content change that alters how many times Math.random is called —
// adding a faculty field, adding courses, anything that shifts the
// candidate-market draw — moves the whole stream, so a single seed cannot
// tell "this rebalanced the game" from "this reshuffled the dice". Run a
// few seeds before believing either.
//   SIM_SEED=7 npm run sim -- 60 5
export const DEFAULT_SIM_SEED = Number(process.env.SIM_SEED ?? 12345);
const INITIAL_SEED = DEFAULT_SIM_SEED;
let seed = INITIAL_SEED;
Math.random = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};
const fakeStorage = new Map<string, string>();
(globalThis as unknown as { localStorage: unknown }).localStorage = {
  getItem: (k: string) => fakeStorage.get(k) ?? null,
  setItem: (k: string, v: string) => { fakeStorage.set(k, v); },
  removeItem: (k: string) => { fakeStorage.delete(k); },
};

// ---------------------------------------------------------------------
// A strategy is a scripted player: a policy for the one annual lever
// (tuition) plus rules for what it commits cash to during the year.
// These are deliberately crude — they are not meant to play well, they
// are meant to be REPRODUCIBLE and to span the space of things a real
// player does (build breadth first, build enrollment first, overreach,
// sit still).
// ---------------------------------------------------------------------
export interface Strategy {
  name: string;
  tuition(s: GameState): number;
  // The share of the applicant pool to take. Optional: omitted means "take
  // the slider's own opening position for this standing", which is what
  // every archetype above does and what the harness measured before the
  // rate was a decision at all. The probes below are the only strategies
  // that set it, because they exist to ask what the lever does.
  admitRate?(s: GameState): number;
  buffer(s: GameState): number;   // cash held back before any discretionary start
  // The flow gate: a player who watches the Treasury does not take on a
  // new recurring commitment while this week's net is thin. Expressed as a
  // fraction of weekly opex the net has to clear — 0 means "spend to the
  // wire", which is what the overreach strategy does.
  netMargin: number;
  buildsCourses: boolean;
  buildsDorms: boolean;
  buildsFacilities: boolean;
  dormFillThreshold: number;      // start the next dorm once enrolled/capacity passes this
  facilityThreshold: number;      // build for any satisfaction attribute scoring under this
  campaigns: boolean;             // run endowment campaigns with the late-game surplus
  // Whether this strategy projects a course's RECURRING cost before
  // committing to it, rather than only checking the one-time build cost
  // against cash (canStartDevelopment's own gate). Optional, defaulting to
  // off (false/undefined) for every strategy this was tuned against
  // (market-rate private pricing comfortably outruns instruction cost —
  // see financeSystem.ts's own "an extra student is never a loss" claim).
  // Turned on for the one strategy whose thin, heavily-discounted margin
  // does NOT hold that claim: without it, a strategy that saves for years
  // then finally clears its cash buffer will happily start every available
  // course in one summer, and once they finish, their combined recurring
  // instruction cost can exceed what that strategy's OWN net tuition per
  // student brings in — a real, catastrophic emergent collapse this
  // harness caught (see the audit finding this field closes). A player
  // watching their own margin would not make that mistake twice; this is
  // that same ordinary caution, not a game-balance change.
  courseAffordabilityAware?: boolean;
  // Whether this strategy staffs its varsity department: hires a head
  // coach, an assistant and a trainer for every active team off the
  // standing coach market, and raises the athletics budget once it is
  // comfortably flush. Optional and off for every archetype that predates
  // it, which is why they have never won a national title between them —
  // teamQuality is what seeds a bracket (see systems/athletics/playoffs.ts)
  // and an unstaffed team never reaches its sport's strongest eight.
  playsCoachingMarket?: boolean;
  // Whether this strategy keeps every faculty CHAIR filled — hires into any
  // field with a course it cannot currently staff, rather than only into one
  // holding up a course it could afford to start this week (see decide()'s
  // hiring block). The completionist's own "fill every chair" policy.
  fillsEveryChair?: boolean;
  // HOW THIS STRATEGY FOUNDS PROGRAMS (Plan 14's PR I — see foundPrograms):
  //   'cheapest'      the default: the cheapest affordable offer it can
  //                   staff, into a hall already holding that school if
  //                   one has room, else anywhere free.
  //   'school-first'  the earnest completionist: prefers offers from
  //                   schools it has started, and keeps every hall PURE —
  //                   founds only into an empty hall or one of the same
  //                   school, siting a new hall rather than mixing.
  //   'scatter'       the control: whatever is offered first, wherever it
  //                   fits. Should visibly under-perform on schools founded.
  founding?: 'cheapest' | 'school-first' | 'scatter';
  // Whether this strategy posts a faculty SEARCH (Plan 14's PR H) when a
  // course it could afford is blocked on a department with no free slot
  // and nobody on the market. Off for the archetypes it predates.
  postsSearches?: boolean;
}

// The course's tier, recovered from its id (101 / 1x0 / 2x0) purely so the
// harness can develop cheap things first. The engine has no notion of
// tier (see techData.ts) — this is a harness-local reading of the data.
// Graduate courses (5xx / 7xx) fall into the same bucket as tier-3 and are
// then ordered behind them by cost, which is the right reading with no
// special case: they are the most expensive thing on the board, so a
// cheapest-first player reaches them last.
function tierOf(t: Buildable): number {
  const m = /(\d{3})$/.exec(t.id);
  if (!m) return 0;
  const n = Number(m[1]);
  return n === 101 ? 1 : n < 200 ? 2 : 3;
}

function affordable(s: GameState, cost: number, strategy: Strategy): boolean {
  return s.finance.cash - cost >= strategy.buffer(s);
}

// Whether adding one more course to the catalogue would still leave THIS
// strategy's own current net tuition per student covering instruction cost
// — see Strategy.courseAffordabilityAware. Instruction cost rises by
// exactly INSTRUCTION_PER_STUDENT_PER_COURSE_OFFERED (1.00/wk) per course
// OFFERED, and a course counts as offered the moment it is 'developing',
// not only once it is 'done' (see techData.ts) — but instructionCostPerStudent
// itself only reads 'done' nodes (financeSystem.ts), since that is the only
// state that actually charges the cost today. A strategy deciding whether
// to start ANOTHER course has to count every course already 'developing'
// too, or a whole week's worth of course starts (none of which have
// finished yet, so none show up in instructionCostPerStudent) would each
// individually look affordable while their COMBINED future cost is not —
// exactly the binge-then-collapse pattern this field exists to prevent.
function courseStaysSustainable(s: GameState, strategy: Strategy): boolean {
  if (!strategy.courseAffordabilityAware) return true;
  const netTuitionPerStudentPerWeek = strategy.tuition(s) / WEEKS_PER_YEAR;
  const developingCourses = s.tech.filter((t) => t.kind === 'course' && t.status === 'developing').length;
  // Instruction is charged per SECTION since Plan 15's PR D, so "one more
  // course" is read off the same model with the developing ones counted
  // in — and the services line every student carries sits beside it.
  const projectedPerStudent = instructionCostPerStudentWith(s, developingCourses + 1) + SERVICES_PER_STUDENT_PER_WEEK;
  return netTuitionPerStudentPerWeek >= projectedPerStudent;
}

// Whether this week's cash flow leaves room to take on a new RECURRING
// commitment — a hire, or a course that will need running forever.
function hasHeadroom(s: GameState, strategy: Strategy): boolean {
  return weeklyNet(s) >= strategy.netMargin * s.finance.weeklyOpEx;
}

// Capital projects (dorms, school buildings, facilities) are judged more
// loosely than recurring ones: a player with money in the bank and a full
// campus builds, as long as this week isn't already bleeding.
function canCommitCapital(s: GameState, strategy: Strategy): boolean {
  return strategy.buildsDorms && weeklyNet(s) >= 0;
}

// Courses lose their instructor two ways now — a dismissal, and a scholar
// being committed to an initiative — and a player faced with an unstaffed
// course reassigns somebody or hires. The harness has to do the same, or
// it models a university that lets its curriculum quietly go dark and then
// reports the resulting satisfaction collapse as a balance finding.
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
    // Same affordability gate the ordinary hiring loop uses — without it
    // the harness hires on any positive balance and ends a run with three
    // times the faculty a school that size would carry.
    if (candidate && s.finance.cash > strategy.buffer(s) && hasHeadroom(s, strategy)) {
      dispatch({ type: 'HIRE_FACULTY', facultyId: candidate.id });
    }
  }
}

// Scholarship is now something a player COMMISSIONS, so the harness has to
// commission it or it models a university that simply never does research
// (see systems/research/researchSystem.ts). Without this the sim lost every
// grant and the whole research prestige input overnight, which is a stale
// harness reporting a regression rather than a regression.
//
// The heuristic is a cautious player's: fill a vacant facility with the
// deepest option it can afford, but ONLY using scholars who are teaching
// nothing right now. Committing someone mid-course orphans it (decision
// 2's cost), and a model that ignored that would happily strip the
// faculty to run projects and then report the teaching collapse as a
// balance finding.
function commissionScholarship(
  get: () => GameState, dispatch: (a: Action) => void, strategy: Strategy,
): void {
  if (!strategy.buildsCourses) return;
  const schools = researchSchools();

  for (const school of schools) {
    for (const labId of school.labIds) {
      const s = get();
      const lab = s.tech.find((t) => t.id === labId);
      if (!lab || lab.status !== 'done' || s.research.initiatives[labId]) continue;

      const offers = initiativeOffers(s, labId);
      // Deepest first: a player with cash and a department deep enough to
      // spare the people commits them. Committing DOES orphan whatever
      // they teach — that is decision 2's cost, and restaffOrphans below
      // is the other half of modelling it, exactly as a player would
      // reassign or hire to cover the hole.
      for (const offer of [...offers].reverse()) {
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

// The recovery lever every stalled player has and no Buildable can take
// away: payroll. This is the harness's test of "stall, don't die" — a
// school that overreached has to be able to climb back out without any
// special-case rescue in the engine.
//
// It used to be one line: fire the single most expensive hire, every week,
// until the bleeding stopped. That was a fair model of payroll when
// faculty were interchangeable salary, and course quality is what made it
// false. A dismissal now orphans whatever that person taught, so the
// unbounded version walked a stalled run straight off a cliff — the
// discount-volume strategy ended a forty-year run at ZERO faculty and 91
// courses still on offer, a school with a full catalogue and nobody to
// teach any of it, reporting a prestige and an enrolment that no longer
// described anything. The runs it printed were measuring the harness.
//
// So the lever gets the two limits a real administration has.
//
// ORDER. Price before people. If this strategy would charge more than the
// school is currently charging — which underwater it will, since
// rampTuition reaches for the ceiling and trimAidWhenUnderwater pulls the
// discount back — then a decision to raise revenue is already made and
// simply hasn't reached an admissions round yet. Firing somebody this week
// pre-empts it. Strategies priced flat by design (the low-tuition stress
// case) are unaffected: what they charge already equals what they would
// charge, so the lever is free to fire immediately, and the stress test
// they exist to apply is untouched.
//
// FLOOR. A school may shed people it is not using; it may not dismantle
// the capacity to teach what it already offers. Candidates are taken in
// this order:
//
//   1. Nobody committed to an initiative. The funding was paid in full up
//      front, and a team that loses everybody has its work abandoned
//      outright (see researchSystem.ts's tickResearch) — writing off a
//      five-year programme to save one salary is not a saving.
//   2. Priciest of those teaching nothing. This is the honest cut and
//      usually the only one needed: an over-hired department carries
//      people no course depends on.
//   3. Failing that, the priciest whose department can still cover its own
//      offered courses without them. usedFacultySlots counts unstaffed
//      courses too, so this cannot be gamed by orphaning first.
//
// If nothing passes, the lever does not fire, and the run has to recover on
// price alone — which is the true position of a school whose every
// professor is in front of a class.
export const STALL_WEEKS_BEFORE_CUTS = 26;
//
// Exported for test/balance-regression.test.ts. The collapse this guards
// against took a stalled run about thirty years to complete, so a 20-year
// sweep cannot see it — the gate has to call the lever directly, on a
// state built to put it in the position the floor exists for.
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

// Placeable kinds (dorm/building/facility, including labs) now start
// through PLACE_BUILDABLE instead of START_DEVELOPMENT: it combines the
// same canStartDevelopment gate with siting a location in one step (see
// reducer.ts). The harness has no player to click a tile, so it picks the
// same location a fresh game or a migrated save would when nobody chose one
// (campusMap.ts's firstFreeSpot — a plain top-left scan), with no rotation.
// The full catalogue covers well under a third of the grid (see
// types.ts's CAMPUS_GRID_WIDTH/HEIGHT comment), so this is expected to
// always find room; if it somehow doesn't, the dispatch is simply skipped —
// exactly as an unaffordable or ungated start already is at every call
// site below, so a dry run of room never changes the shape of a decision,
// only whether it goes through this week.
function dispatchPlaceable(get: () => GameState, dispatch: (a: Action) => void, nodeId: string): void {
  const s = get();
  const node = s.tech.find((t) => t.id === nodeId);
  if (!node) return;
  const fp = footprintOf(node);
  const spot = firstFreeSpot(s.placements, fp);
  if (!spot) return;
  dispatch({ type: 'PLACE_BUILDABLE', buildableId: nodeId, row: spot.row, col: spot.col, rotated: false });
}

// THE COACHING MARKET, for the one strategy that plays it (see
// Strategy.playsCoachingMarket). Three roles per active team, hired off the
// same standing pool the Athletics tab lists, plus the budget dial once the
// school is comfortably flush.
//
// This exists because of a finding rather than for completeness: across all
// six archetypes over forty years, the harness had never won a single
// national title — not even the Completionist, which finishes every venue
// and fields all ten teams. Nobody hired a coach, and teamQuality is what
// seeds a bracket (see systems/athletics/playoffs.ts), so no scripted school
// ever reached its sport's strongest eight. A whole authored feature — the
// postseason, the championship modal, the titles term in campus-life
// standing — was invisible to every measured trajectory.
//
// A coach's salary is a recurring line, not an up-front cost (see the
// reducer's HIRE_COACH), so the gate is the same flow gate a faculty hire
// answers to: headroom on the week's net, and cash above the buffer.
function staffTheDepartment(get: () => GameState, dispatch: (a: Action) => void, strategy: Strategy): void {
  if (!strategy.playsCoachingMarket) return;

  // The budget dial is free and reversible, so the only question is whether
  // the school can carry the upkeep multiplier it applies. Raised once the
  // school is running well clear of its own buffer, which is the "budget
  // high once flush" half of the review's policy.
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
      // The best of whoever is listed in the field this role needs — a
      // program that hires the strongest available coach is what "plays the
      // coaching market" means, and it is what a player does.
      const candidate = [...s.orgs.coachCandidates]
        .filter((c) => c.field === field)
        .sort((a, b) => b.quality - a.quality)[0];
      if (!candidate) continue;
      dispatch({ type: 'HIRE_COACH', candidateId: candidate.id, teamId, role });
    }
  }
}

// One week of player decisions, dispatched through exactly the actions the
// UI dispatches.
//
// Every block re-reads the state through `get()` rather than closing over
// one snapshot: each dispatch produces a NEW state (the reducer clones),
// so a stale local would let the scripted player spend the same cash
// twice in a week — the harness would then be measuring an economy the
// game doesn't have.
// FOUNDING (Plan 14). A program enters the curriculum by taking a slot in
// a standing hall (FOUND_PROGRAM), which starts its entry course with an
// instructor in the same step — there is no other way to start a tier-1
// course. Which offer, and which slot, is the strategy's founding policy
// (see Strategy.founding): cheapest-first into a same-school hall where
// one has room; school-first and pure for the earnest completionist,
// whose whole game is dedicating halls; and scatter for the control that
// founds anything anywhere and should visibly under-perform.
function foundPrograms(get: () => GameState, dispatch: (a: Action) => void, strategy: Strategy): void {
  const policy = strategy.founding ?? 'cheapest';
  for (;;) {
    const s = get();
    if (!freeSlot(s)) return;
    let offers = s.programOffers
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
      const slot = slotFor(s, p.school, policy);
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

// Where a program of this school goes, under a founding policy. The
// school of a hall is whatever its housed programs belong to; a hall with
// programs of more than one school is mixed.
function hallSchools(s: GameState, hallId: string): Set<string> {
  const schools = new Set<string>();
  for (const slot of s.halls[hallId]) {
    if (slot.programId === null) continue;
    const program = programById(slot.programId);
    if (program && program.kind !== 'core') schools.add(program.school);
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
  // An empty hall.
  const empty = halls.find((hallId) => hallSchools(s, hallId).size === 0);
  if (empty) return firstFree(empty);
  // Nobody prudent mixes a hall (Plan 15's PR G): a hall of one school is
  // what founds it, and concentration is thirty points of standing, so
  // the cheapest-first and school-first policies both wait for a hall
  // rather than fill a slot with a stranger. Only the scatterer control
  // mixes, which is what it is for.
  return null;
}

function freeSlot(s: GameState): { hallId: string; slot: number } | null {
  for (const [hallId, slots] of Object.entries(s.halls)) {
    const slot = slots.findIndex((x) => x.programId === null);
    if (slot >= 0) return { hallId, slot };
  }
  return null;
}

// A hall is sited when programs are on offer and there is nowhere to put
// them: no free slot standing and no hall already going up. The next rung
// of the chain is the only one ever 'available' (techData.ts), so this is
// one capital decision with the same gate the dorm block uses.
//
// THE TWO SPEND-TO-THE-WIRE ARCHETYPES SITE HALLS AHEAD OF NEED. A
// strategy with no margin to keep (netMargin <= 0: the Overbuilder, who
// builds beds ahead of demand, and the Curriculum rush, who builds
// everything affordable every week) does not wait for its slots to fill
// before buying the next building — that is the whole of what those two
// archetypes are. Without this, the offer's own pacing (three programs at
// a time, six to a hall) would quietly make the Overbuilder prudent about
// the one capital line it is supposed to overreach on, and the
// "stall, don't die" checks in test/balance-regression.test.ts would be
// measuring a player who no longer exists.
// Whether the catalogue's seats, not beds, are what stops the school
// growing: little room left for next summer's class, and something a
// strategy could do about it — a program on offer with a slot to take, or
// a hall to site.
function seatsAreTheConstraint(s: GameState): boolean {
  // Tight means the catalogue holds little more than the body it has: in
  // steady state the room left each summer is exactly the class that just
  // graduated, so the test is seats against the whole body, not the room.
  const enrolled = totalEnrolled(s.students);
  const tight = intakeCeiling(s).capacity - enrolled < Math.max(60, 0.15 * enrolled);
  if (!tight) return false;
  const canFound = s.programOffers.length > 0 && freeSlot(s) !== null;
  const canSite = s.tech.some((t) => isAcademicHall(t) && (t.status === 'available' || t.status === 'developing'));
  return canFound || canSite;
}

function siteHallIfNeeded(get: () => GameState, dispatch: (a: Action) => void, strategy: Strategy): void {
  const s = get();
  const eager = strategy.netMargin <= 0;
  // "Nowhere to put them" is policy-shaped: the school-first player with
  // only mixed halls free has nowhere PURE to put an offer, and sites the
  // next hall rather than mixing one.
  // Nowhere to found: no free slot at all, or — for the two policies that
  // keep halls pure — none of the three offers may take the slots there
  // are, since the offer stands until one is taken and a pure hall with
  // room only for one school is a deadlock without a second hall.
  const policy = strategy.founding ?? 'cheapest';
  const nowhere = !freeSlot(s) || (
    policy !== 'scatter' &&
    !s.programOffers.some((id) => { const p = programById(id); return p && slotFor(s, p.school, policy) !== null; })
  );
  // A prudent strategy also sites a hall when its seats are the constraint
  // and every slot it has is taken (Plan 15's PR G) — that is what "seats
  // before beds" means for the one capital line that adds seats.
  const seatsShort = strategy.netMargin > 0 && seatsAreTheConstraint(s) && !freeSlot(s);
  if (!eager && !seatsShort && (s.programOffers.length === 0 || !nowhere)) return;
  if (s.tech.some((t) => isAcademicHall(t) && t.status === 'developing')) return;
  const next = s.tech.find((t) => isAcademicHall(t) && t.status === 'available');
  if (!next) return;
  if (canCommitCapital(s, strategy) && affordable(s, next.cost, strategy)) dispatchPlaceable(get, dispatch, next.id);
}

function decide(
  get: () => GameState,
  strategy: Strategy,
  weeksInTheRed: number,
  dispatch: (a: Action) => void,
): void {
  commissionScholarship(get, dispatch, strategy);
  restaffOrphans(get, dispatch, strategy);
  cutPayrollIfStalled(get, weeksInTheRed, dispatch, strategy);
  staffTheDepartment(get, dispatch, strategy);

  // Faculty: appoint straight off the standing candidate market when a
  // field is blocking a course this strategy could actually start today.
  // There is nothing to post for and nothing to wait on any more — the
  // scripted player just takes whoever the churn happens to be offering
  // in a field that is holding them up, which is exactly the decision the
  // real player makes.
  //
  // The "could actually start today" half is new, and it is the harness
  // catching up with the model rather than a policy change. Under
  // post-and-wait, a fee plus a 4-10 week countdown per field meant a
  // strategy hired at most a trickle however loose its rule was, so
  // hiring for a course it had no cash to develop barely showed up.
  // Against a standing market that same loose rule fires every single
  // week, and a strategy that keeps its cash near its buffer ends up
  // carrying professors for courses it will not start for years — an
  // economy no player would run, which would make these runs measure the
  // harness rather than the game. Requiring the blocked course to be
  // AFFORDABLE is the smallest gate that puts hiring back in step with
  // developing.
  //
  // Deliberately not tightened past that. Gating on savingForDorm as well
  // (the curriculum block's other condition) reads as the same idea and
  // is not: dorm-saving is a state a growing school sits in for years at
  // a stretch, so it starves hiring outright — tried, and the balanced
  // builder ends a 40-year run with an empty roster, no curriculum and
  // 563 weeks in the red.
  if (strategy.buildsCourses) for (const candidate of get().candidates.map((c) => c.id)) {
    const s = get();
    const c = s.candidates.find((x) => x.id === candidate);
    if (!c) continue;
    // `fillsEveryChair` drops the affordability half of this test: the
    // earnest completionist hires into any field that has a course it
    // cannot currently staff, whether or not it could start that course
    // this week, which is what "fill every chair" means and what a player
    // aiming at the whole catalogue actually does. The cash buffer and the
    // flow gate below still apply, so it is a wider rule, not a free one.
    // A program ON OFFER counts as a course this strategy could start:
    // its entry course is 'locked' until it is founded (Plan 14), but the
    // founding needs an instructor in its field, and a school that never
    // hires for an offered program never founds anything.
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

  // A SEARCH, when a department is the wall (Plan 14's PR H): a course this
  // strategy could afford — or a program on offer — needs a field with no
  // free slot and nobody on the market, and no search is running there.
  // The same affordability and flow gates the hiring loop uses.
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

  // Housing FIRST, when the campus is full: a player watching a waitlist
  // build up buys beds before they buy more curriculum, because beds are
  // the only thing that turns demand into revenue. Ordering matters in
  // this harness for the same reason it matters in play — whatever comes
  // first in the week gets the cash.
  // SEATS BEFORE BEDS (Plan 15's PR G). Since PR E the freshman class is
  // capped by the catalogue's seats, so a dorm bought while the catalogue
  // is the binding constraint houses students the school cannot admit.
  // A prudent strategy founds programs and sites halls first, and saves
  // for those rather than for the dorm; the spend-to-the-wire archetypes
  // (netMargin <= 0) keep overreaching on beds, which is what they are.
  const seatsBound = strategy.netMargin > 0 && seatsAreTheConstraint(get());

  if (strategy.buildsDorms && !seatsBound) {
    const s = get();
    const next = s.tech.find((t) => t.kind === 'dorm' && t.status === 'available');
    // The founding campus now opens with NO beds (see state/actions.ts), so
    // "the campus is full" can't be the only trigger — with capacity 0 the
    // fill ratio is undefined and no dorm would ever be the answer. A school
    // that has students and nowhere to house them plainly builds the founding
    // hall, so treat zero beds as its own reason to build the next (first)
    // dorm, on top of the ordinary full-campus trigger.
    const needsFoundingBeds = s.students.capacity === 0 && totalEnrolled(s.students) > 0;
    const full = s.students.capacity > 0 &&
      totalEnrolled(s.students) / s.students.capacity >= strategy.dormFillThreshold;
    if (next && (needsFoundingBeds || full) && canCommitCapital(s, strategy) && affordable(s, next.cost, strategy)) {
      dispatchPlaceable(get, dispatch, next.id);
    }
  }

  // Saving up. A full campus with a waitlist means the next dorm is the
  // best thing cash can buy, so a disciplined player stops committing to
  // anything else until it is paid for. Without this the harness dribbles
  // every surplus week into another cheap course and never accumulates
  // the lump a capital project needs — which is a real failure mode in
  // play too, just not the one these runs are meant to measure.
  const beforeCurriculum = get();
  const nextDorm = beforeCurriculum.tech.find((t) => t.kind === 'dorm' && t.status === 'available');
  const wantsDorm = !seatsBound && nextDorm !== undefined && (
    // No beds yet but students to house — the founding hall (see the dorm
    // block above), or a full campus past the fill threshold.
    (beforeCurriculum.students.capacity === 0 && totalEnrolled(beforeCurriculum.students) > 0) ||
    (beforeCurriculum.students.capacity > 0 &&
      totalEnrolled(beforeCurriculum.students) / beforeCurriculum.students.capacity >= strategy.dormFillThreshold)
  );
  const savingForDorm = strategy.buildsDorms && wantsDorm &&
    !affordable(beforeCurriculum, nextDorm!.cost, strategy);

  // Founding and halls (Plan 14) come before the rest of the curriculum,
  // since every course after the core sits behind a founding. The two
  // spend-to-the-wire archetypes (see siteHallIfNeeded) do this even while
  // "saving" for a dorm: a player with no buffer and no margin to keep is
  // not saving for anything, and gating their halls on a dorm they cannot
  // afford would make the one capital line they are meant to overreach on
  // the one they are prudent about.
  if (strategy.buildsCourses && (!savingForDorm || strategy.netMargin <= 0)) {
    foundPrograms(get, dispatch, strategy);
    siteHallIfNeeded(get, dispatch, strategy);
  }

  // Curriculum: cheapest tier first, plus the buildings/labs that gate it.
  if (strategy.buildsCourses && !savingForDorm) {
    const courseIds = beforeCurriculum.tech
      .filter((t) => t.kind === 'course' && t.status === 'available')
      .sort((a, b) => tierOf(a) - tierOf(b) || a.cost - b.cost)
      .map((t) => t.id);
    for (const id of courseIds) {
      const s = get();
      const c = s.tech.find((t) => t.id === id);
      if (!c || c.status !== 'available') continue;
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
      if (s.students.satisfactionBreakdown[attr] >= strategy.facilityThreshold) continue;
      if (canCommitCapital(s, strategy) && affordable(s, f.cost, strategy)) {
        dispatchPlaceable(get, dispatch, id);
      }
    }
  }

  // The tier-1 library's own renovations (facilitiesData.ts's
  // nextLibraryFloor) aren't a normal 'available' Buildable — the SAME
  // node stays 'done' between renovations — so the generic "build whatever
  // the satisfaction breakdown says is short" loop above never sees them.
  // This is the one extra decision rule RENOVATE_LIBRARY needs, mirroring
  // that loop's own threshold/affordability checks.
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
  rank: number; // national rank at the boundary (rivalsSystem.ts's playerRank) — Plan 15's PR G reads it on the scorecard
  opex: number; net: number; satisfaction: number; courses: number; majors: number;
  faculty: number; tuition: number; applicants: number; admitRate: number;
  endowment: number; weeksInTheRed: number; minCash: number;
  // The `social` and `academic` attributes alone, as the year closed (see
  // satisfactionSystem.ts's computeSatisfactionBreakdown) — the headline
  // `satisfaction` above is a weighted blend of four attributes, which
  // hides whether a facility pass aimed at ONE of them (see
  // TARGET_RATIO.social's harshening pass, and the recreational/arts
  // facilities that followed it) actually moved that attribute. `academic`
  // is tracked for the same reason since faculty quality started feeding it
  // alongside the library ratio — this is the column that shows whether a
  // well-staffed roster measurably lifts it without a free ride to 100.
  social: number;
  academic: number;
  // Student life as the year closed: how many organisations are live, what
  // they cost a week, and what they are actually adding to the
  // satisfaction TARGET (read off the model, never a parallel tally).
  clubs: number; chapters: number; orgUpkeep: number; orgSatisfaction: number;
  // Varsity athletics (see src/data/studentLifeData.ts), as the year closed.
  // `sportClubs` is clubs still waiting to petition (or never asked);
  // `athleticsUpkeep` is teams-only (coaches + program fees), split out from
  // `orgUpkeep` above so a balance pass can see athletics' own share rather
  // than reading it blended into clubs/chapters.
  sportClubs: number; varsityActive: number; varsityAwaiting: number; athleticsUpkeep: number;
  // Research, as the year closed: what it is producing a week, and the two
  // durable counts its outputs have accumulated. `grantIncome` is the
  // cumulative cash side — the figure that says whether grants are
  // trivialising the cash throttle.
  researchRate: number; breakthroughs: number; grantIncome: number;
  // Graduate programs, as the year closed (see
  // docs/design/graduate-programs.md). These are the numbers the feature's
  // whole balance claim rests on: WHEN a strategy reaches them, whether it
  // can afford them without going into the red, and what they cost to run
  // once founded. The harness needs no new decision rule to buy them — a
  // graduate course is a `course` Buildable, so the curriculum block below
  // already picks them up, sorted last because their ids end in 5xx/7xx.
  gradCourses: number; gradPrograms: number; gradUpkeep: number;
  // WHAT A YEAR ACTUALLY CONTAINED, for the player rather than the school.
  // Every other column here describes the institution; these three describe
  // the person playing it, and they are the measurements Plans 12 and 13
  // are checked against — the September review's run averaged 25 actions a
  // year and fell to between 4 and 14 after year 22, which is the finding
  // "half the playtime is dead" is made of.
  //
  //   actions       discretionary dispatches that year: every start, hire,
  //                 placement, commission and campaign the scripted player
  //                 made. NOT modal answers — those are counted by type in
  //                 the tally, since being asked something is not the same
  //                 as finding something to do.
  //   idleWeeks     weeks when the game offered NOTHING startable: no
  //                 available Buildable whose non-cash gates were met.
  //                 A week with nothing to decide even in principle.
  //   blockedWeeks  weeks when something was startable and nothing was
  //                 affordable — the cash throttle actually throttling.
  //   facultyBlockedWeeks
  //                 weeks when nothing was startable ONLY because no
  //                 department had a free slot for it — an available
  //                 course, or a program on offer, whose field has nobody
  //                 to teach it (Plan 14's PR H: the market as a gate). The
  //                 column that says whether a run stalls on money or on
  //                 people, which is what a search is for.
  //
  // The two week counts read AFFORDABILITY against raw cash rather than
  // against the strategy's own buffer, deliberately: "the game offered me
  // nothing I could buy" is a fact about the game, where "nothing that
  // cleared my eight-week reserve" is a fact about the policy, and the Idle
  // control (buffer: MAX_SAFE_INTEGER) would otherwise report every week of
  // forty years as money-blocked.
  actions: number; idleWeeks: number; blockedWeeks: number; facultyBlockedWeeks: number;
}

// What the WEEK offered, regardless of what the strategy did about it (see
// Row's idleWeeks/blockedWeeks). `startable` ignores cash and reads only the
// gates a Buildable cannot buy its way past — status, and a free faculty
// slot for a course. `affordable` then asks whether the school could pay
// for any of them out of raw cash.
function weekOffered(s: GameState): { startable: boolean; affordable: boolean; facultyBlocked: boolean } {
  let startable = false;
  let affordable = false;
  let facultyBlocked = false;
  const offeredEntryIds = new Set(s.programOffers.map((id) => programById(id)?.entryCourseId));
  for (const node of s.tech) {
    // A program on offer is something the week offered too: its entry
    // course is 'locked' until it is founded, and founding needs a free
    // slot in its field exactly as starting a course does.
    if (node.status !== 'available' && !offeredEntryIds.has(node.id)) continue;
    if (node.requiresFaculty && !hasFreeFacultySlot(s, node.requiresFaculty)) { facultyBlocked = true; continue; }
    startable = true;
    if (s.finance.cash >= node.cost) { affordable = true; break; }
  }
  // Blocked on people only when nothing at all was startable for any
  // other reason: a week with a startable, affordable course is not a
  // stall, whatever else it could not staff.
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

// The three player-facing counts, accumulated across a year and reset at
// each snapshot — they describe one year, not the run to date.
interface YearActivity { actions: number; idleWeeks: number; blockedWeeks: number; facultyBlockedWeeks: number }
function newYear(): YearActivity { return { actions: 0, idleWeeks: 0, blockedWeeks: 0, facultyBlockedWeeks: 0 }; }

// What the authored decision events (see src/data/eventData.ts) did over a
// run. Reported under the table so a balance pass can see at a glance
// whether the events are a rounding error against the growth loop or a
// second economy — they are meant to be the former.
interface EventTally {
  milestones: number;   // stop-the-clock celebrations shown
  decisions: number;    // authored decision events resolved
  cash: number;         // net cash effect of every choice the scripted player took
  // Student life (see src/data/studentLifeData.ts). Reported for the same
  // reason as the two above: so a balance pass can see whether recognising
  // student organisations is a texture line or a second economy. Note the
  // asymmetry — NONE of these stop the clock. Clubs and new chapters are
  // answered in a digest folded into the summer admissions interrupt the
  // run already pays for, and the Greek decisions that DO stop the clock
  // are entries in the shared decision-event table, so they are already
  // counted in `decisions` rather than added on top of it.
  petitionsApproved: number;
  greekEventsSeen: number; // of `decisions`, how many were Greek-life ones
  // Research (see src/systems/research/researchSystem.ts). Reported
  // alongside the events for the same reason: so a balance pass can see at
  // a glance whether research is a quiet second income line or a second
  // economy. Prizes are the only one of the three that stops the clock.
  prizes: number;
  // Research initiatives, which the funding ladder is tuned against (see
  // researchData.ts's INITIATIVE_DEPTHS). "How many projects can a school
  // afford to be running at once" is the question a funding change moves,
  // and it is invisible in the outputs — a school running eight cheap
  // projects and one running two expensive ones can bank the same number of
  // breakthroughs. Counted by watching the keys of s.research.initiatives
  // week to week, so a start is a transition rather than something the
  // harness has to be told about.
  initiativesStarted: number;
  peakConcurrent: number;
  reports: number;           // completions that stopped the clock (see researchSystem.ts)
  initiativeSpend: number;   // cumulative up-front funding, against lifetime opex below
  // Student demands (see src/systems/demands/demandSystem.ts). The
  // question these answer is the one the feature's whole cadence argument
  // rests on: a well-run school should almost never be asked for anything,
  // and a school pinned at the satisfaction floor should be asked
  // repeatedly and STILL only stall. `demandsRaised` also feeds the
  // combined modal count below — demands share the decision events'
  // cooldown, so they redistribute that budget rather than adding to it.
  demandsRaised: number;
  demandsMet: number;
  demandsFailed: number;
  demandSubjects: Record<string, number>; // which shortfall each demand was about
  // The three student-life/event cadences this tuning pass targets (see
  // eventData.ts / studentLifeData.ts). Reported separately from the
  // generic decision-event tally because "how many decision events fired"
  // says nothing about whether they were the RIGHT ones.
  schoolsNamed: number;             // naming-rights fired with the 'sign' choice
  chaptersFormed: number;           // chapter petitions approved over the run
  chaptersAskedForHousing: number;  // greek-housing fired (built or refused) — bounded by chaptersFormed
  hellenicCouncilYear: number | null;      // year the council question fired, or null if it never did
  hellenicCouncilEligibleYear: number | null; // year the club-count gate first cleared
  studentCenterYear: number | null;        // year a student center first stood
  eventFireCounts: Record<string, number>; // every decision-event id, by how many times it fired
  // Varsity athletics (see src/data/eventData.ts's 'varsity-petition' and
  // src/data/studentLifeData.ts). Unlike Greek life's events, this one no
  // longer shares the fixed decision-event budget — it fires on its own
  // deterministic five-year-tenure schedule — so `varsityPetitions` counts
  // how many of `decisions` were this event without implying it competed
  // for a slot the way `greekEventsSeen` does.
  varsityPetitions: number;
  varsityGranted: number;
  titles: number; // championships won over the run (see systems/athletics/playoffs.ts)
  // Every interrupt the run answered, by type. The review counted these by
  // hand — 223 modals over forty years, 61 of them research reports — and
  // "which modal is the player actually seeing" is a different question from
  // "how much texture is there", which the texture line below answers.
  modals: Record<string, number>;
}

// The scripted player's event policy — take the first affordable choice,
// fall back to a free one — moved to src/engine/defaultAnswers.ts when the
// debug panel's Jump needed to answer a modal the same way this does. The
// tally below is still an upper bound on what events cost a run, because
// that policy is still the most expensive reasonable one.
// The Greek-life entries of the shared decision-event table (see
// src/data/eventData.ts). Named here only so the report can say how much of
// the run's FIXED event budget student life took — they do not get a budget
// of their own, which is the whole point of authoring them into that table.
const GREEK_EVENT_IDS = ['hellenic-council', 'greek-scandal', 'greek-housing'];

// The five athletics venue ids (facilitiesData.ts), named here rather than
// imported — the same self-contained-defensive-check spirit persistence.ts's
// own VENUE_CATEGORIES list follows — purely so play() can report which ones
// a run actually finished building.
const VENUE_IDS = ['ATH-FIELD', 'ATH-ARENA', 'ATH-DIAMOND', 'ATH-NATATORIUM', 'ATH-STADIUM'];

// Resets the two pieces of shared, mutable module state a run depends on
// for reproducibility (the seeded RNG and the fake localStorage) so `play`
// is self-contained and deterministic regardless of what ran before it in
// the same process — the CLI loop below relies on this, and so does
// test/balance-regression.test.ts, which calls `play` for several
// strategies in one process and would otherwise have each run inherit
// RNG/storage state left over by whichever ran first.
function resetSimEnvironment(seedOverride?: number): void {
  seed = seedOverride ?? INITIAL_SEED;
  fakeStorage.clear();
}

// `onWeek`, when given, is called with the post-TICK state after every
// simulated week — finer-grained than `rows` (one snapshot a YEAR, at the
// admissions boundary). Optional and a no-op by default so every existing
// caller (the CLI report below, test/balance-regression.test.ts) is
// unaffected; sim/milestones.ts is the one caller that needs week-level
// resolution, to say which week a one-time completion milestone (a
// building, a full catalogue) first became true rather than which YEAR it
// fell in.
export function play(
  strategy: Strategy,
  years: number,
  onWeek?: (s: GameState) => void,
  // Runs this strategy on a DIFFERENT stream. Optional, and unused by the
  // CLI report — it exists so test/balance-regression.test.ts can ask
  // whether a claim that just failed fails everywhere or only here (see that
  // file's `holds`).
  seedOverride?: number,
  // Halts the run early, at the TOP of a week and BEFORE any pending
  // interrupt is answered — so a run stopped this way hands back a state
  // with its modal still on screen. That is the whole point: a scenario
  // (see tools/scenarios.ts) wants "the week a championship modal is
  // pending", which is a state that only exists between a system raising
  // the interrupt and the scripted player dismissing it, and no year
  // boundary will ever land on it. Optional; today's callers pass nothing
  // and run to `years` exactly as they did.
  stopWhen?: (s: GameState) => boolean,
  // Continue from a state another run left off at, instead of founding
  // (Plan 15's PR G): the recovery scenario stands a school up in crisis
  // under one strategy and asks whether another gets it out. Deep-cloned,
  // so the run it came from is untouched.
  from?: GameState,
): { rows: Row[]; tally: EventTally; venuesBuilt: string[]; state: GameState } {
  resetSimEnvironment(seedOverride);
  let s: GameState;
  if (from) {
    s = structuredClone(from);
  } else {
    s = createPreStartState();
    s = reducer(s, { type: 'START_GAME', name: 'Test University', vernacular: FOUNDING_VERNACULAR, colors: schoolColorsOf(FOUNDING_COLORS) });
  }
  const dispatch = (a: Action) => { s = reducer(s, a); };
  // The same dispatch, counted. Handed to decide() alone, so what it
  // measures is DISCRETIONARY play — the starts, hires, placements,
  // commissions and campaigns a player would have clicked — and never the
  // modal answers, which are counted by type in the tally instead.
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
    modals: {},
  };

  while (s.clock.year <= years) {
    if (stopWhen?.(s)) break;
    if (tally.studentCenterYear === null && hasStudentCenter(s)) tally.studentCenterYear = s.clock.year;
    if (tally.hellenicCouncilEligibleYear === null && s.orgs.clubs.length >= HELLENIC_COUNCIL_MIN_CLUBS) {
      tally.hellenicCouncilEligibleYear = s.clock.year;
    }
    if (s.pendingInterrupt) {
      // ANSWERED BY THE SHARED DEFAULTS (see src/engine/defaultAnswers.ts),
      // never by a policy of this file's own. The debug panel's Jump
      // fast-forwards through the same modals, and two fast-forwards that
      // answered a championship differently would be two different games —
      // so the answer lives in one module and both ask it for one.
      //
      // What stays here is the BOOKKEEPING, which is this harness's own
      // business: the tallies below are read off the interrupt (and off the
      // action that answers it) before the dispatch clears either.
      const type = s.pendingInterrupt.type;
      // THE SUMMER IS FOUR BEATS OF ONE MODAL (Plan 16's PR A — see
      // types.ts's SummerPayload), answered one beat per pass through this
      // loop. It counts as ONE modal, on its opening beat; the digest and
      // the row are read on the last, where the year actually turns over.
      const summerBeat = type === 'summer' ? (s.pendingInterrupt.payload as SummerPayload).beat : null;
      const summerCloses = summerBeat === SUMMER_LAST_BEAT;
      if (summerBeat === null || summerBeat === 0) tally.modals[type] = (tally.modals[type] ?? 0) + 1;
      const answer = defaultAnswer(s, {
        tuition: strategy.tuition(s),
        // Every strategy takes the slider's own opening position for its
        // CURRENT standing — what a school like this would normally take
        // (see admissionsSystem.ts's admitRate). Deliberately recomputed
        // each summer rather than read back off s.students.admitRate:
        // that field is sticky by design, so a scripted player echoing it
        // would freeze on its founding rate and go on taking a founding
        // school's share of the pool at top-50 prestige. No strategy here
        // plays the lever deliberately, so the harness measures what the
        // DEFAULT policy does — which is what it measured before PR C
        // made the rate a decision at all.
        admitRate: strategy.admitRate ? strategy.admitRate(s) : admitRate(s.self.reputation),
      });

      if (summerCloses) {
        // The student-life digest is the summer's last beat (see the
        // reducer's RESOLVE_ADMISSIONS). The default answer recognises
        // EVERY petition, which is the most expensive answer available —
        // it is the only one that takes on recurring cost — so the opex
        // and satisfaction figures these runs print are the upper bound on
        // what student life does to a trajectory, exactly as the event
        // policy is an upper bound on what events cost.
        tally.petitionsApproved += s.orgs.pendingPetitions.length;
        tally.chaptersFormed += s.orgs.pendingPetitions.filter((p) => p.kind === 'chapter').length;
      } else if (type === 'milestone') {
        tally.milestones += 1;
      } else if (type === 'research-complete') {
        // The completion report carries the award if the work won one — so
        // the prize tally is read off the payload rather than off an
        // interrupt of its own (see researchSystem.ts).
        const { report } = s.pendingInterrupt.payload as { report: InitiativeReport };
        tally.reports += 1;
        if (report.award) tally.prizes += 1;
      } else if (type === 'demand') {
        // A student demand (see src/systems/demands/demandSystem.ts). The
        // default answer acknowledges it and does nothing else — there is
        // nothing else to do: a demand is answered by BUILDING the thing
        // before the deadline, which every strategy's ordinary
        // facility/dorm rules either will or won't do on their own. That
        // is exactly the property worth measuring: the strategies that
        // build campus life meet their demands, and the ones that don't
        // (the overbuilder, which builds beds and nothing else) fail them
        // and must still stall rather than die.
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
      }
      if (type === 'decision-event') {
        // Which event, and which way it went, read off the answer the
        // shared defaults produced rather than re-derived here.
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
            // s.clock.year is the post-dispatch year; a decision event never
            // falls on the week the clock turns over, so this is the year it
            // fired in.
            tally.hellenicCouncilYear = s.clock.year;
          }
        }
        tally.cash += s.finance.cash - before;
      }
      continue;
    }
    // Read BEFORE the week's decisions, so "was there anything to do" is a
    // question about the week the player woke up to rather than about what
    // is left once they have done it.
    const offered = weekOffered(s);
    if (offered.facultyBlocked) year.facultyBlockedWeeks += 1;
    else if (!offered.startable) year.idleWeeks += 1;
    else if (!offered.affordable) year.blockedWeeks += 1;
    decide(() => s, strategy, weeksInTheRed, dispatchCounted);
    // A demand resolves inside a TICK, silently and with no interrupt (see
    // demandSystem.ts) — meeting one is finishing a building, not clicking
    // anything — so which way it went is read from the transition rather
    // than from a modal. Safe against the post-tick state because neither
    // reading a demand's target is measured against can fall.
    const demandBefore = s.events.activeDemand;
    dispatch({ type: 'TICK' });
    if (demandBefore && !s.events.activeDemand) {
      if (demandProgress(s, demandBefore).met) tally.demandsMet += 1;
      else tally.demandsFailed += 1;
    }
    if (s.finance.cash < 0) weeksInTheRed += 1;
    minCash = Math.min(minCash, s.finance.cash);
    // Research initiatives, read as a transition: any facility key that was
    // not running one last week and is now started one.
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
  // The final state rides along with the tables. tools/makeSave.ts used to
  // capture it through `onWeek` — the only hook there was — which a run
  // halted by `stopWhen` cannot use: it stops BETWEEN weeks, so the last
  // post-TICK state `onWeek` saw is a week older than the one the scenario
  // is about. Returning it costs nothing (it is the same object the loop
  // just finished with) and is what tools/scenario.ts writes out.
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
      // clubs/chapters live at the close of that year — the column that
      // says WHEN student life actually starts for a given strategy, which
      // is the whole question the opex share below can't answer.
      `${String(r.clubs).padStart(2)}/${String(r.chapters).padEnd(2)} | ` +
      // graduate courses developed / programs founded, at the close of
      // that year — the column that answers "when does a strategy reach
      // the graduate tier, and does it finish anything".
      `${String(r.gradCourses).padStart(2)}/${r.gradPrograms} | ` +
      // What the YEAR contained for the player: how many discretionary
      // things they did, how many weeks offered nothing startable at all,
      // and how many offered something they could not pay for.
      `${String(r.actions).padStart(3)} | ${String(r.idleWeeks).padStart(4)} | ${String(r.blockedWeeks).padStart(4)} | ${String(r.facultyBlockedWeeks).padStart(4)}`,
    );
  }
  console.log(`   weeks in the red: ${last.weeksInTheRed} of ${rows.length * 52}, min cash: ${fmt(last.minCash)}`);
  console.log(`   milestone celebrations: ${tally.milestones}, decision events: ${tally.decisions}, net event cash: ${fmt(tally.cash)}`);
  // The cadence question, answered directly: how often is the clock
  // stopped by something that is NOT the one fixed annual
  // interrupt (the summer — the U.S. News report is a beat of it now). Demands are in
  // this total rather than beside it because they spend the same cooldown
  // the decision events do — the point of the line is that adding them
  // moves it very little.
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
  // Every modal by type, and the total — the review's own count (223 over
  // forty years, 5.6 a year, 61 of them research reports) restated as
  // something the harness prints rather than something a person tallies.
  const modalTotal = Object.values(tally.modals).reduce((sum, n) => sum + n, 0);
  const modalMix = Object.entries(tally.modals)
    .sort((a, b) => b[1] - a[1])
    .map(([type, n]) => `${type} ${n}`)
    .join(' · ');
  console.log(
    `   modals answered: ${modalTotal} over ${years} years = ${(modalTotal / Math.max(years, 1)).toFixed(1)}/yr — ${modalMix}`,
  );
  // And what the PLAYER had to do, which is the other half of the same
  // question: a year of five modals and four actions is a quiet year; a
  // year of five modals and forty actions is a busy one. Reported as an
  // average and as the last decade's average, because the review's finding
  // was about the SHAPE — 25 actions a year, falling to 4-14 after year 22.
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
  // Grant income is compared against the run's total operating cost rather
  // than reported bare: "$40M of grants" means nothing on its own, "1.4% of
  // what the school spent" is the answer to whether grants trivialise the
  // cash throttle.
  const lifetimeOpEx = rows.reduce((sum, r) => sum + r.opex * 52, 0);
  const grantShare = lifetimeOpEx > 0 ? (last.grantIncome / lifetimeOpEx) * 100 : 0;
  console.log(
    `   research: ${last.researchRate.toFixed(1)} pts/wk at close, ${last.breakthroughs} breakthroughs, ` +
    `${tally.prizes} prizes, ${fmt(last.grantIncome)} in grants (${grantShare.toFixed(1)}% of lifetime opex)`,
  );
  // The funding ladder's own line. Two or three projects at once in a
  // mature school is the target; eight would mean the money came down too
  // far, and none would mean it never came down at all.
  const spendShare = lifetimeOpEx > 0 ? (tally.initiativeSpend / lifetimeOpEx) * 100 : 0;
  console.log(
    `   initiatives: ${tally.initiativesStarted} started, ${tally.peakConcurrent} running at once at the peak, ` +
    `${fmt(tally.initiativeSpend)} of funding (${spendShare.toFixed(1)}% of lifetime opex), ` +
    `${tally.reports} concluded with a report`,
  );
  // Graduate programs, judged the same way grants and student life are:
  // the bare figure means nothing, WHEN it arrives and what share of the
  // school's spending it takes is the answer to whether it is a late-game
  // sink or a mid-game tax. `firstGrad` is the year the first graduate
  // COURSE was finished, which is the moment the tier actually starts
  // costing money.
  const firstGrad = rows.find((r) => r.gradCourses > 0);
  const firstProgram = rows.find((r) => r.gradPrograms > 0);
  const gradShare = last.opex > 0 ? (last.gradUpkeep / last.opex) * 100 : 0;
  console.log(
    `   graduate: ${last.gradCourses} courses, ${last.gradPrograms} programs founded at close; ` +
    `first course yr ${firstGrad ? firstGrad.year : '-'}, first program yr ${firstProgram ? firstProgram.year : '-'}; ` +
    `${fmt(last.gradUpkeep)}/wk upkeep (${gradShare.toFixed(2)}% of opex)`,
  );
  // Student life is judged against opex the same way grants are judged
  // against it: the bare weekly figure means nothing, the share of the
  // school's spending is the answer to whether it moved the throttle.
  const orgShare = last.opex > 0 ? (last.orgUpkeep / last.opex) * 100 : 0;
  console.log(
    `   student life: ${last.clubs} clubs, ${last.chapters} chapters at close ` +
    `(${tally.petitionsApproved} recognised over the run), ${fmt(last.orgUpkeep)}/wk upkeep ` +
    `(${orgShare.toFixed(2)}% of opex), +${last.orgSatisfaction.toFixed(2)} on the satisfaction target; ` +
    `${tally.greekEventsSeen} of ${tally.decisions} decision events were Greek-life ones`,
  );
  // Varsity athletics (see src/data/studentLifeData.ts). Judged the same way
  // student life and grants are: bare figures mean nothing, share of opex
  // is the answer to whether this crowds out anything else. The petition
  // itself no longer draws on the fixed decision-event budget (it fires on
  // its own deterministic five-year-tenure schedule), so its share of
  // `decisions` below is a read on how much of the MODAL traffic it is,
  // not on how much of a scarce random slot it took.
  const athleticsShare = last.opex > 0 ? (last.athleticsUpkeep / last.opex) * 100 : 0;
  console.log(
    `   varsity athletics: ${last.sportClubs} sport clubs, ${last.varsityActive} active teams, ` +
    `${last.varsityAwaiting} awaiting venue at close; ${tally.varsityGranted}/${tally.varsityPetitions} petitions granted; ` +
    `${fmt(last.athleticsUpkeep)}/wk upkeep (${athleticsShare.toFixed(2)}% of opex); ` +
    `${run.tally.titles} national title${run.tally.titles === 1 ? '' : 's'}; ` +
    `${tally.varsityPetitions} of ${tally.decisions} decision events were varsity petitions; ` +
    `venues built: ${run.venuesBuilt.length > 0 ? run.venuesBuilt.join(', ') : 'none'}`,
  );
  // The three tuned cadences (see eventData.ts / studentLifeData.ts), each
  // measured against what the concern was actually about — not "did the
  // event fire" but "did it reach the outcome a long run should show".
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
  const eventBreakdown = Object.entries(tally.eventFireCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([id, n]) => `${id} x${n}`)
    .join(', ');
  console.log(`   event mix: ${eventBreakdown}`);
}

// ---------------------------------------------------------------------
// The strategies. Tuition ramps with prestige because that is what a real
// player does — the point of the sweep is that no strategy should ever be
// unable to recover, and that each one should show the tier-shaped
// cost-leads-revenue pinch.
// ---------------------------------------------------------------------
//
// Underwater, it charges a notch more instead. That is the other half of
// cutPayrollIfStalled's "price before people": a school running a deficit
// raises its own price before it starts dismissing professors, and the
// payroll lever defers to it while the raise is still waiting on an
// admissions round. It is a reach, not a rescue — the surcharge is 15% of
// a price that is itself pinned to prestige, so a school whose costs have
// outrun its standing cannot price its way back out.
//
// The clamp below is TUITION_SLIDER_MAX and is purely defensive. It used
// to be the per-school-type ceiling, and for the Public flagship strategy
// it was load-bearing rather than defensive — that strategy sat at exactly
// 22,000 from year 16 to year 40. Plan 07's PR A retired the ceiling and
// PR C retired the strategy along with the fork that defined it, so no
// strategy here comes within 60k of this number.
//
// Strategies priced FLAT are deliberately left out of this: their whole
// purpose is to hold a price still while costs climb (see the low-tuition
// stress case below), and giving them an escape hatch would delete the
// pressure they exist to apply.
//
// The size of the surcharge is the whole question, and 15% is small on
// purpose. Reaching straight for the ceiling was tried first and is an
// exploit, not a recovery: enrolment is a four-class stock, so a school
// can charge the cap for one year and collect from students who applied
// under the old price long before the applicant pool reacts. In the
// discount-volume run that single year printed +11.09M a week and an
// endowment that went from 4.43M to 466M — a harness teaching itself to
// play a trick no balance figure should be fitted against. A notch above
// list price, repeated for as long as the deficit lasts, is the lever a
// real administration actually has.
const DEFICIT_SURCHARGE = 1.15;
// `base` moved from a hardcoded 4,000 to a parameter when scholarships
// were retired (Plan 05's PR B). Each strategy's identity was its NET
// price — what it actually charged after its own discount — so converting
// it to a single price means folding that discount into both halves of the
// ramp, not just dropping the `scholarships` line and leaving the sticker
// where it was. A strategy that charged 4,000 + 300/point at 25% off is
// the same school as one charging 3,000 + 225/point at no discount, and
// this is how that is written.
const rampTuition = (perPrestigePoint: number, base = 4_000) => (s: GameState) => {
  const ramped = Math.round((base + s.self.reputation * perPrestigePoint) / 500) * 500;
  const surcharged = s.finance.cash < 0 ? Math.round(ramped * DEFICIT_SURCHARGE / 500) * 500 : ramped;
  return Math.min(TUITION_SLIDER_MAX, surcharged);
};

// NOTE: `trimAidWhenUnderwater` used to live here — a strategy tapering
// its own discount while underwater, the cheap non-destructive lever
// financeSystem.ts's "stall, don't die" note points at. Scholarships are
// gone (Plan 05's PR B) and the discount with them. The lever that
// survives is the DEFICIT_SURCHARGE inside rampTuition above: a school in
// the red raises its price before it touches anybody's job, which is the
// same ordering expressed with the one dial that is left.

export const STRATEGIES: Strategy[] = [
  {
    // The intended line of play: grow one thing at a time, never take on a
    // commitment the current cash flow can't carry.
    name: 'Balanced builder',
    tuition: rampTuition(225, 3_000), // was rampTuition(300) at 25% off
    buffer: (s) => Math.max(150_000, s.finance.weeklyOpEx * 4),
    netMargin: 0.12,
    buildsCourses: true, buildsDorms: true, buildsFacilities: true,
    dormFillThreshold: 0.85, facilityThreshold: 72, campaigns: true,
  },
  {
    // Deliberate overreach: buys everything the moment cash allows,
    // ignoring the flow. Should stall hard, then claw back out — never die.
    name: 'Curriculum rush (overreach)',
    tuition: rampTuition(240, 3_200), // was rampTuition(300) at 20% off
    buffer: () => 20_000,
    netMargin: 0,
    buildsCourses: true, buildsDorms: true, buildsFacilities: true,
    dormFillThreshold: 0.98, facilityThreshold: 45, campaigns: false,
  },
  {
    // The volume archetype: the cheapest school here, beds first. Tests
    // that a big low-selectivity school is a viable, different shape.
    //
    // RE-BASELINED at Plan 05's PR B. It was rampTuition(150) at 50% off,
    // tapering to 30% while underwater. The underwater taper is gone with
    // scholarships, but the school is not left without a response:
    // rampTuition's own DEFICIT_SURCHARGE raises its price 15% for as long
    // as it is in the red, the same "price before people" ordering the
    // taper existed to express.
    //
    // The price itself is NOT the old net price, and that is the honest
    // part. Halving the ramp to 2,000 + 75/point preserves what students
    // paid — but a sticker and a net price were doing two different jobs,
    // and one number cannot do both. The old 4,000 + 150/point STICKER was
    // also throttling this school's own pool, through sticker shock and
    // qualityMix's tuition shift; drop the sticker to the net price and
    // both throttles come off, and the school grew to 23k students it could
    // not fund and ended the run insolvent. 3,000 + 110/point sits between
    // the two prices it used to carry at once, which is the only place a
    // single number can sit: still far and away the cheapest school here
    // (~11k at the prestige it settles at, against ~35k for Balanced
    // builder) and still the volume archetype at ~26k enrolled and a ~67%
    // admit rate, but now carrying what it grows.
    name: 'Discount volume (beds first)',
    // A discount, not a giveaway (Plan 15's PR G): a sixth to a fifth under
    // the balanced ramp. At the old ramp — $9k at founding, $15k at prestige
    // 85 — a school whose per-student costs rise with its standing lost
    // money on every student forever, and an archetype that dies of its
    // price is not testing volume bought with aid.
    tuition: rampTuition(180, 2_500),
    buffer: (s) => Math.max(200_000, s.finance.weeklyOpEx * 8),
    netMargin: 0.08,
    buildsCourses: true, buildsDorms: true, buildsFacilities: true,
    dormFillThreshold: 0.7, facilityThreshold: 80, campaigns: true,
    // See Strategy.courseAffordabilityAware — its very low net
    // tuition does not clear instruction cost at a full catalogue, so
    // without this it eventually binges on years of saved-up cash and
    // collapses once the new courses' recurring cost lands.
    courseAffordabilityAware: true,
  },
  {
    // Same discipline as Balanced builder — nothing about finishing the
    // catalogue requires being reckless — with the one thing that stops
    // Balanced builder short of it removed. decide()'s facility rule only
    // builds "whatever satisfaction currently says is short", which
    // naturally settles once a handful of cheap facilities clear the
    // threshold: a second dining hall, the Arts Center (and the four
    // Music courses gated behind it), and every athletics venue (so no
    // varsity team this strategy ever forms actually fields, stuck
    // 'awaitingVenue' forever) are left permanently unbuilt — see
    // sim/milestones.ts, which this strategy exists to answer.
    // facilityThreshold: Infinity means "satisfaction is never high enough
    // to skip a facility", i.e. build every available one regardless —
    // the only strategy here that ever reaches 100% of the catalogue.
    name: 'Completionist (build everything)',
    tuition: rampTuition(225, 3_000), // was rampTuition(300) at 25% off
    buffer: (s) => Math.max(150_000, s.finance.weeklyOpEx * 4),
    netMargin: 0.12,
    buildsCourses: true, buildsDorms: true, buildsFacilities: true,
    dormFillThreshold: 0.85, facilityThreshold: Infinity, campaigns: true,
  },
  {
    // The stall test: beds far ahead of demand, priced too CHEAPLY to carry
    // them. Every mistake the pacing model is supposed to punish, made at
    // once. It must go deep into the red and CLIMB BACK OUT — that is the
    // whole content of "stall, don't die".
    //
    // Flat low tuition, not high, is what actually stresses this economy —
    // see the audit finding this replaced: a flat HIGH tuition (near the
    // ceiling) survives overbuilding comfortably, because net tuition per
    // enrolled student so vastly exceeds UPKEEP_PER_SEAT_PER_WEEK that even
    // a campus at a fraction of capacity nets positive. A flat LOW tuition
    // that never scales with prestige, paired with dorms built the moment
    // the campus is even nominally full (dormFillThreshold: 0) and a
    // growing course catalogue's rising per-student instruction cost (see
    // financeSystem.ts's INSTRUCTION_PER_STUDENT_PER_COURSE_OFFERED), is
    // the naive real mistake this strategy is supposed to model: "more
    // beds means I should charge less to fill them" — thin margin per
    // student, an ever-growing empty-seat bill from building ahead of
    // demand every single year, and instruction cost that outgrows a
    // stagnant tuition line as the curriculum matures.
    // RE-BASELINED at Plan 05's PR B, from 8,000. Nothing about the
    // strategy's intent changed; what changed underneath it is that
    // admissionsSystem.ts's YIELD_BASE absorbed the retired scholarship
    // term, so this school — which never discounted, and so never got the
    // old scholarship yield bonus — now enrolls far more students at the
    // same price. At 8,000 it stopped being a stress case at all: it
    // filled its own beds and never went into the red once across forty
    // years, which is precisely the audit finding the comment above says
    // this strategy was rewritten to fix. 5,500 restores the archetype at
    // BOTH horizons the harness reads: a real trough (~-190k, 157 weeks in
    // the red) inside the 20-year window, then a recovery that holds to
    // year 40 with no further red weeks.
    //
    // Picked by sweeping, not derived, and the sweep is worth recording:
    // the response is not monotone. This economy is a threshold system — a
    // strategy builds when cash clears a buffer — so small changes move
    // WHICH WEEK a dorm goes up and forty years compounds the difference.
    // Read a single price here as one sample of a noisy function, never as
    // a tuned optimum.
    //
    // KNOWN RESIDUAL, as of Plan 05's PR C: this holds at the 20-year
    // horizon balance-regression.test.ts actually asserts, but the 40-year
    // `npm run sim` display now ends deeply underwater where it used to end
    // solvent. That is not a price that wants nudging — a sweep from 5,500
    // to 11,000 finds no value that satisfies both horizons, because what
    // changed is upstream of price. Deleting yield let a selective school
    // keep the whole top band, so incoming quality (and through it,
    // prestige, and through that, the applicant pool) runs higher for
    // everyone; this strategy builds a dorm unconditionally, so a bigger
    // pool is a bigger bill every single year. See PR C's own note.
    // RE-SWEPT at 5,250 (Plan 08's PR 1A). Not a rebalance: nothing about
    // this strategy or the economy changed. Growing the rival field from 56
    // schools to 100 moved the seeded Math.random stream once — the draw is
    // pinned at one a year now, so it cannot move again from that direction —
    // and 5,500 landed the DEFAULT seed on the wrong side of a knife-edge,
    // bottoming out at +12,073 instead of going red at all.
    //
    // That the archetype could flip on a reshuffle is the real finding. At
    // 5,500 this strategy's trough was typically -100k to -200k against a
    // ~$12M/yr opex — about 1% of a year's spending — so `minCash < 0` was
    // riding a coin flip whichever stream it ran on, and the gate that asserts
    // it was not measuring a robust property. Re-swept the way the 5,500 above
    // it was ("picked by sweeping, not derived"), but against FOURTEEN seeds
    // rather than one, which is what the non-monotonicity below has always
    // implied you have to do:
    //
    //   5,500  9/10 seeds    4,750  8/10      4,500  7/10      4,250  5/10
    //   5,250  14/14 seeds
    //
    // The failures at the other prices are not all the same failure, and the
    // shape is why 5,250 is the answer rather than the nearest passing value:
    // above it the trough is too shallow to reliably go red, below it the
    // school stops RECOVERING and ends the run underwater, which would
    // falsify "stall, don't die" from the other direction. 5,250 clears both
    // at every seed tried, with troughs from -65k to -19M and a positive
    // weekly net at the horizon in all fourteen.
    //
    // At the default seed it reads -219,980 over 110 weeks in the red, which
    // is within noise of the -209,657 over 71 weeks that 5,500 produced on the
    // old stream — the same archetype, restated at a price that does not
    // depend on the dice.
    name: 'Overbuilder (beds ahead of demand)',
    // Priced a fifth under the balanced ramp rather than at a flat $5,250
    // (Plan 15's PR G): under the section-and-services cost model a school
    // charging less than it costs to teach a student cannot exist, and an
    // archetype that dies of its price is not testing beds ahead of demand.
    tuition: rampTuition(150, 2_000),
    buffer: () => 0,
    netMargin: -1,
    // It builds the barest facilities — only when an attribute is dire —
    // rather than none (Plan 15's PR G): with welfare and attrition in the
    // model a campus that never feeds its students cannot recover from
    // anything, and "stall, don't die" is a claim about beds, not hunger.
    buildsCourses: true, buildsDorms: true, buildsFacilities: true,
    dormFillThreshold: 0, facilityThreshold: 40, campaigns: false,
  },
  {
    // THE EARNEST COMPLETIONIST: the September 2026 review's own policy,
    // written down (see docs/reviews/2026-09-design-review.md, Appendix A).
    // Every other strategy here is an ARCHETYPE — a crude, reproducible
    // corner of the space a player might occupy. This one is a PLAYER: a
    // genre-literate person who intends to develop every course, build every
    // asset, keep the school solvent and see everything the game has.
    //
    // That makes it the most important row in the table for Plans 10 through
    // 13, because it is the run those plans are about. The review's finding
    // was not that some corner of the strategy space is degenerate; it was
    // that playing well, earnestly, for forty years produces rank #1 by year
    // 18, a finished catalogue by year 22, zero weeks in the red, and two
    // decades of nothing left to decide.
    //
    // The policy, item by item:
    //   price      90% of what the school's prestige makes tolerable, which
    //              is what a careful player converges on — it is the highest
    //              price that does not start driving the pool away
    //   admit      clamp(1.35 - prestige/100, 0.08, 0.65): broad while
    //              small, narrowing hard as standing builds
    //   build      cheapest tier first, on a four-week-opex buffer
    //   facilities every rung whose attribute is under 80
    //   beds       35% of the enrolled body (the dorm rule reads
    //              enrolled/capacity, so 1/0.35 is the same statement)
    //   research   deepest affordable in every idle lab, without gutting a
    //              department (decide()'s own commission rule)
    //   people     every chair filled, and the varsity department staffed —
    //              the first strategy here to hire a coach at all
    //   money      campaigns with the surplus, athletics budget high once
    //              flush
    name: 'Earnest completionist',
    tuition: (s) => Math.min(TUITION_SLIDER_MAX, Math.round(priceTolerance(s.self.reputation) * 0.9 / 500) * 500),
    admitRate: (s) => Math.max(0.08, Math.min(0.65, 1.35 - s.self.reputation / 100)),
    buffer: (s) => Math.max(150_000, s.finance.weeklyOpEx * 4),
    netMargin: 0.1,
    buildsCourses: true, buildsDorms: true, buildsFacilities: true,
    // Beds at 35% of enrolled, expressed in the units decide()'s dorm rule
    // reads: it builds once enrolled/capacity passes this, and capacity
    // being 35% of enrolled is enrolled/capacity ≈ 2.86.
    dormFillThreshold: 1 / 0.35,
    facilityThreshold: 80,
    campaigns: true,
    playsCoachingMarket: true,
    fillsEveryChair: true,
    founding: 'school-first',
    postsSearches: true,
  },
  {
    // THE SCATTERER: a control, not a player. The same school as the
    // Balanced builder in every respect but one — it founds whatever is
    // offered first, into whatever slot is free first, and never thinks
    // about which building a program goes in. Plan 14's claim is that the
    // slot is a decision; this is the run that does not make it, and it
    // should visibly under-perform on schools founded (see
    // test/balance-regression.test.ts's Plan 14 check).
    name: 'Scatterer (founds anything anywhere)',
    tuition: rampTuition(225, 3_000),
    buffer: (s) => Math.max(150_000, s.finance.weeklyOpEx * 4),
    netMargin: 0.12,
    buildsCourses: true, buildsDorms: true, buildsFacilities: true,
    dormFillThreshold: 0.85, facilityThreshold: 72, campaigns: true,
    founding: 'scatter',
  },
  {
    // The control: builds nothing, ever. Prestige and cash here are the
    // floor the whole loop has to beat, or growth is optional.
    name: 'Idle (builds nothing)',
    tuition: () => 9_600, // was 12,000 at 20% off
    buffer: () => Number.MAX_SAFE_INTEGER,
    netMargin: Number.MAX_SAFE_INTEGER,
    buildsCourses: false, buildsDorms: false, buildsFacilities: false,
    dormFillThreshold: 2, facilityThreshold: 0, campaigns: false,
  },
];

// Guarded so `npm run sim` (which invokes this file directly as the
// compiled entry point — process.argv[1] is then that entry's own path)
// prints the CLI report, while test/balance-regression.test.ts can import
// STRATEGIES/play/Strategy/Row above without also triggering a full,
// unwanted 40-year print run as a side effect of the import.
// ---------------------------------------------------------------------
// ADMIT-RATE PROBES. Not archetypes — experiments. Every one of these is
// "Balanced builder, with one thing changed": the same prices, buffers,
// build rules and thresholds, differing ONLY in what share of the pool it
// takes. Holding the rest constant is the whole point; a probe that also
// priced differently would not answer the question.
//
// Deliberately NOT in STRATEGIES. balance-regression.test.ts sweeps that
// array and asserts every member stalls rather than dies, which is a
// promise the game makes about strategies a player might reasonably adopt.
// These exist to find out whether the admit lever is broken, and a probe
// that dies is a FINDING here rather than a failing build. If one of them
// turns out to be a line of play worth supporting, promoting it into
// STRATEGIES is how that gets said.
//
// WHAT THEY FOUND, on the 40-year run at the time they were written. Kept
// here rather than in BACKLOG.md, which is for work that has not happened:
// this is a record of a measurement, and here is where the next person to
// re-run it will be standing.
//
//   broad then narrow   prestige 145.7   76k enrolled   794M cash
//   default curve               140.2    65k            836M
//   open door (100%)            106.3   273k            1.5B
//   ivory tower (8%)            101.6    18k           22.6M
//   band skimmer                 87.4    23k            6.1M
//
// 1. THE INTENDED ARC WINS, and beats simply accepting the slider's
//    default — with MORE students, not fewer. The gap is an early-game
//    one: broad-then-narrow has 218 courses by year 8 against the
//    default's 117, because a bigger opening class pays for the buildout.
//    That gap is the backlog's "admit-rate curve's early slope".
//
// 2. OPEN DOOR IS NOT AN EXPLOIT, and its ceiling is not where it looks.
//    It ends rich and mediocre — a plausible big-state-school shape. What
//    caps it is prestigeSystem.ts's libraryAdequacyScore, a seats-to-
//    enrolled ratio floored at 0.4 that MULTIPLIES the 90-weight breadth
//    term: at 273k students it sits on that floor, costing ~47 points of
//    prestige target, against only ~9 from the incoming-quality term.
//    Overcrowding capping academic prestige is exactly what that
//    multiplier was built to do. Note what is NOT in that chain:
//    satisfaction is not a prestige input at all (see computePrestigeTarget
//    — breadth, teaching, quality, research, campus life, endowment, and
//    nothing else). Satisfaction bites through word of mouth instead, and
//    hard: open door's applicant POOL is 69k against broad-then-narrow's
//    190k despite carrying four times the students.
//
// 3. PURE TOP-BAND SKIMMING IS A TRAP, NOT AN EXPLOIT, which is the
//    opposite of what the arithmetic suggested before this was run. The
//    quality dead zone is real — the skim runs best band first, so once
//    the rate is under the top band's share, further selectivity buys no
//    quality at all — but the top band is only ~5% of the pool at founding
//    prestige, and skimming it starves the school of the tuition that buys
//    the breadth that widens the band. The dead zone is only reachable by
//    a school that already grew broad.
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
// THE SCORECARD (see sim/reference.ts). Printed under each strategy's
// table: one line per figure that has left the band the last committed
// measurement recorded for it. Silence means the trajectory is the one the
// reference describes — which is not the same as the one it SHOULD be, and
// reference.ts's own header is careful about the difference.
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
// RUN-TO-RUN COMPARISON. `--save last.json` writes every sampled row;
// `--compare last.json` prints what moved by more than COMPARE_THRESHOLD
// against it. The point is that a PR summary can quote what the sim said
// as a DIFF — "year 20 cash -14.8M -> -2.1M" — rather than as the same
// eighty-line table pasted twice and left to the reader to subtract.
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
        // Against the LARGER magnitude, so a figure moving away from zero
        // (0 weeks in the red to 40) reads as the change it is rather than
        // as a division by nothing.
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
  // Enrolment prints in full rather than through fmt's k/M shortening: a
  // diff line reading "5k -> 5k" is worse than no line at all, and the
  // whole point of a diff is that both sides are legible.
  if (metric === 'enrolled') return Math.round(value).toLocaleString();
  return fmt(value);
}

// Rewrites the generated block of sim/reference.ts in place, leaving every
// hand-written line above it alone. Relative to the working directory,
// which is the package root under `npm run sim`.
const REFERENCE_PATH = 'sim/reference.ts';
// The comment lines the generated block sits between. They live here, in
// the writer, rather than as constants in the file being written: a
// constant declaring the marker contains the marker, so the writer would
// find its own declaration and eat it.
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

const isCliEntry = process.argv[1]?.includes('balanceSim') ?? false;
if (isCliEntry) {
  const argv = process.argv.slice(2);
  const flag = (name: string) => argv.includes(`--${name}`);
  const flagValue = (name: string) => {
    const at = argv.indexOf(`--${name}`);
    return at === -1 ? undefined : argv[at + 1];
  };
  // Positionals are whatever is left once the flags and their values are
  // taken out, so `npm run sim -- 40 2 --compare last.json` still means
  // forty years every second year.
  const consumed = new Set<string>();
  for (const name of ['compare', 'save']) {
    const value = flagValue(name);
    if (value) consumed.add(value);
  }
  const positional = argv.filter((a) => !a.startsWith('--') && !consumed.has(a));

  const writingReference = flag('write-reference');
  // The reference describes the full horizon, so writing it ignores a
  // shorter one rather than recording bands for years it never reached.
  const years = writingReference ? REFERENCE_HORIZON : Number(positional[0] ?? 40);
  const every = Number(positional[1] ?? 2);
  const filter = writingReference ? undefined : positional[2];

  const runs: Record<string, Row[]> = {};
  const seedRuns: Record<string, Row[][]> = {};
  for (const strategy of STRATEGIES) {
    if (filter && !strategy.name.toLowerCase().includes(filter.toLowerCase())) continue;
    // play() resets seed/fakeStorage itself (see resetSimEnvironment) — no
    // reset needed here.
    const run = play(strategy, years);
    runs[strategy.name] = run.rows;
    report(strategy, run, every);
    if (!writingReference) reportScorecard(strategy, run.rows);
    // THREE-SEED BANDS (Plan 15's PR G). A band fitted to one seed is a
    // claim about that seed: Plan 09's PR E found the earnest completionist
    // reproducing the review exactly at seed 4242 and running 144 weeks in
    // the red at seed 12345. So the reference is written from three
    // streams, and each band is the envelope of the three.
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
