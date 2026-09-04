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
// ---------------------------------------------------------------------

import { reducer } from '../src/engine/reducer';
import type { Action } from '../src/state/actions';
import { createPreStartState } from '../src/state/actions';
import type { GameState, Buildable, SchoolType } from '../src/state/types';
import { financeBreakdown, endowmentCampaign, weeklyNet } from '../src/systems/finance/financeSystem';
import { canStartDevelopment, hasFreeFacultySlot } from '../src/systems/techtree/techSystem';
import { findDecisionEvent, HELLENIC_COUNCIL_MIN_CLUBS } from '../src/data/eventData';
import { weeklyResearchPoints } from '../src/data/researchData';
import { studentLifeSatisfaction } from '../src/systems/satisfaction/satisfactionSystem';
import { demandProgress } from '../src/systems/demands/demandSystem';
import { demandSubject } from '../src/data/demandData';
import type { DecisionEventContext } from '../src/data/eventData';
import { discoverySchools } from '../src/data/techData';
import { hasStudentCenter } from '../src/data/studentLifeData';

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
const INITIAL_SEED = Number(process.env.SIM_SEED ?? 12345);
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
// A strategy is a scripted player: a policy for the two annual levers
// (tuition, aid) plus rules for what it commits cash to during the year.
// These are deliberately crude — they are not meant to play well, they
// are meant to be REPRODUCIBLE and to span the space of things a real
// player does (build breadth first, build enrollment first, overreach,
// sit still).
// ---------------------------------------------------------------------
interface Strategy {
  name: string;
  schoolType: SchoolType;
  tuition(s: GameState): number;
  aid(s: GameState): number;
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

// The recovery lever every stalled player has and no Buildable can take
// away: payroll. Fires the single most expensive hire, once a run has been
// underwater long enough that a real player would have acted. This is the
// harness's test of "stall, don't die" — a school that overreached has to
// be able to climb back out without any special-case rescue in the engine.
const STALL_WEEKS_BEFORE_CUTS = 26;
function cutPayrollIfStalled(get: () => GameState, weeksInTheRed: number, dispatch: (a: Action) => void): void {
  const s = get();
  if (s.finance.cash >= 0 || weeksInTheRed < STALL_WEEKS_BEFORE_CUTS) return;
  if (weeklyNet(s) >= 0 || s.faculty.length === 0) return;
  const priciest = s.faculty.slice().sort((a, b) => b.salary - a.salary)[0];
  dispatch({ type: 'FIRE_FACULTY', facultyId: priciest.id });
}

// One week of player decisions, dispatched through exactly the actions the
// UI dispatches.
//
// Every block re-reads the state through `get()` rather than closing over
// one snapshot: each dispatch produces a NEW state (the reducer clones),
// so a stale local would let the scripted player spend the same cash
// twice in a week — the harness would then be measuring an economy the
// game doesn't have.
function decide(
  get: () => GameState,
  strategy: Strategy,
  weeksInTheRed: number,
  dispatch: (a: Action) => void,
): void {
  cutPayrollIfStalled(get, weeksInTheRed, dispatch);

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
    const needed = s.tech.some(
      (t) => t.requiresFaculty === c.field && t.status === 'available' &&
        !hasFreeFacultySlot(s, c.field) && affordable(s, t.cost, strategy),
    );
    if (needed && s.finance.cash > strategy.buffer(s) && hasHeadroom(s, strategy)) {
      dispatch({ type: 'HIRE_FACULTY', facultyId: c.id });
    }
  }

  // Housing FIRST, when the campus is full: a player watching a waitlist
  // build up buys beds before they buy more curriculum, because beds are
  // the only thing that turns demand into revenue. Ordering matters in
  // this harness for the same reason it matters in play — whatever comes
  // first in the week gets the cash.
  if (strategy.buildsDorms) {
    const s = get();
    const next = s.tech.find((t) => t.kind === 'dorm' && t.status === 'available');
    const full = s.students.capacity > 0 &&
      s.students.enrolled / s.students.capacity >= strategy.dormFillThreshold;
    if (next && full && canCommitCapital(s, strategy) && affordable(s, next.cost, strategy)) {
      dispatch({ type: 'START_DEVELOPMENT', nodeId: next.id });
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
  const savingForDorm = strategy.buildsDorms && nextDorm !== undefined &&
    beforeCurriculum.students.capacity > 0 &&
    beforeCurriculum.students.enrolled / beforeCurriculum.students.capacity >= strategy.dormFillThreshold &&
    !affordable(beforeCurriculum, nextDorm.cost, strategy);

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
      if (canStartDevelopment(s, c)) dispatch({ type: 'START_DEVELOPMENT', nodeId: id });
    }
    for (const id of get().tech.filter((t) => t.kind === 'building' && t.status === 'available').map((t) => t.id)) {
      const s = get();
      const b = s.tech.find((t) => t.id === id);
      if (b && b.status === 'available' && canCommitCapital(s, strategy) && affordable(s, b.cost, strategy)) {
        dispatch({ type: 'START_DEVELOPMENT', nodeId: id });
      }
    }
    for (const id of get().tech.filter((t) => t.facilityType === 'lab' && t.status === 'available').map((t) => t.id)) {
      const s = get();
      const l = s.tech.find((t) => t.id === id);
      if (l && l.status === 'available' && canCommitCapital(s, strategy) && affordable(s, l.cost, strategy)) {
        dispatch({ type: 'START_DEVELOPMENT', nodeId: id });
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
        dispatch({ type: 'START_DEVELOPMENT', nodeId: id });
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
interface Row {
  year: number; cash: number; enrolled: number; capacity: number; prestige: number;
  opex: number; net: number; satisfaction: number; courses: number; majors: number;
  faculty: number; tuition: number; aid: number; applicants: number; admitRate: number;
  endowment: number; weeksInTheRed: number; minCash: number;
  // Student life as the year closed: how many organisations are live, what
  // they cost a week, and what they are actually adding to the
  // satisfaction TARGET (read off the model, never a parallel tally).
  clubs: number; chapters: number; orgUpkeep: number; orgSatisfaction: number;
  // Research, as the year closed: what it is producing a week, and the two
  // durable counts its outputs have accumulated. `grantIncome` is the
  // cumulative cash side — the figure that says whether grants are
  // trivialising the cash throttle.
  researchRate: number; breakthroughs: number; grantIncome: number;
  // Graduate programs, as the year closed (see README's "Graduate
  // programs"). These are the numbers the feature's whole balance claim
  // rests on: WHEN a strategy reaches them, whether it can afford them
  // without going into the red, and what they cost to run once founded.
  // The harness needs no new decision rule to buy them — a graduate course
  // is a `course` Buildable, so the curriculum block below already picks
  // them up, sorted last because their ids end in 5xx/7xx.
  gradCourses: number; gradPrograms: number; gradUpkeep: number;
}

function snapshot(s: GameState, weeksInTheRed: number, minCash: number): Row {
  const flow = financeBreakdown(s);
  return {
    year: s.clock.year - 1,
    cash: s.finance.cash,
    enrolled: s.students.enrolled,
    capacity: s.students.capacity,
    prestige: s.self.reputation,
    opex: flow.totalExpenses,
    net: flow.net,
    satisfaction: s.students.satisfaction,
    courses: s.tech.filter((t) => t.kind === 'course' && t.status === 'done').length,
    majors: Object.keys(s.milestones).filter((k) => k.startsWith('major-complete:')).length,
    faculty: s.faculty.length,
    tuition: s.finance.tuitionPerStudent,
    aid: s.admissions.financialAidRate,
    applicants: s.students.applicantPool,
    admitRate: s.students.admitRate,
    endowment: s.finance.endowment,
    weeksInTheRed,
    minCash,
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
  };
}

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
}

// The scripted player's event policy: take the FIRST affordable choice —
// which in every entry in the table is the "deal with it properly, and
// pay" option — and fall back to a free one when the money isn't there.
// That is the most expensive reasonable policy, so the tally below is an
// upper bound on what events cost a run.
// The Greek-life entries of the shared decision-event table (see
// src/data/eventData.ts). Named here only so the report can say how much of
// the run's FIXED event budget student life took — they do not get a budget
// of their own, which is the whole point of authoring them into that table.
const GREEK_EVENT_IDS = ['hellenic-council', 'greek-scandal', 'greek-housing'];

function chooseEventOption(s: GameState): { eventId: string; choiceId: string; ctx: DecisionEventContext } | null {
  const payload = s.pendingInterrupt?.payload as { eventId: string; ctx: DecisionEventContext } | undefined;
  if (!payload) return null;
  const event = findDecisionEvent(payload.eventId);
  if (!event) return null;
  const affordable = event.choices.find((c) => c.cost(s, payload.ctx) <= s.finance.cash);
  const choice = affordable ?? event.choices.find((c) => c.cost(s, payload.ctx) <= 0);
  if (!choice) return null;
  return { eventId: event.id, choiceId: choice.id, ctx: payload.ctx };
}

function play(strategy: Strategy, years: number): { rows: Row[]; tally: EventTally } {
  let s = createPreStartState();
  s = reducer(s, { type: 'START_GAME', name: 'Test University', schoolType: strategy.schoolType });
  const dispatch = (a: Action) => { s = reducer(s, a); };
  const rows: Row[] = [];
  let weeksInTheRed = 0;
  let minCash = s.finance.cash;

  const tally: EventTally = {
    milestones: 0, decisions: 0, cash: 0, prizes: 0,
    petitionsApproved: 0, greekEventsSeen: 0,
    demandsRaised: 0, demandsMet: 0, demandsFailed: 0, demandSubjects: {},
    schoolsNamed: 0, chaptersFormed: 0, chaptersAskedForHousing: 0,
    hellenicCouncilYear: null, hellenicCouncilEligibleYear: null, studentCenterYear: null,
    eventFireCounts: {},
  };

  while (s.clock.year <= years) {
    if (tally.studentCenterYear === null && hasStudentCenter(s)) tally.studentCenterYear = s.clock.year;
    if (tally.hellenicCouncilEligibleYear === null && s.orgs.clubs.length >= HELLENIC_COUNCIL_MIN_CLUBS) {
      tally.hellenicCouncilEligibleYear = s.clock.year;
    }
    if (s.pendingInterrupt) {
      if (s.pendingInterrupt.type === 'admissions') {
        // The student-life digest rides on this interrupt (see the
        // reducer's RESOLVE_ADMISSIONS). The scripted player recognises
        // EVERY petition, which is the most expensive answer available —
        // it is the only one that takes on recurring cost — so the opex
        // and satisfaction figures these runs print are the upper bound on
        // what student life does to a trajectory, exactly as the event
        // policy below is an upper bound on what events cost.
        const approvedPetitionIds = s.orgs.pendingPetitions.map((p) => p.id);
        tally.petitionsApproved += approvedPetitionIds.length;
        tally.chaptersFormed += s.orgs.pendingPetitions.filter((p) => p.kind === 'chapter').length;
        dispatch({
          type: 'RESOLVE_ADMISSIONS',
          tuition: strategy.tuition(s),
          financialAidRate: strategy.aid(s),
          approvedPetitionIds,
        });
        rows.push(snapshot(s, weeksInTheRed, minCash));
      } else if (s.pendingInterrupt.type === 'milestone') {
        tally.milestones += 1;
        dispatch({ type: 'RESOLVE_MILESTONE' });
      } else if (s.pendingInterrupt.type === 'research-prize') {
        tally.prizes += 1;
        dispatch({ type: 'RESOLVE_PRIZE' });
      } else if (s.pendingInterrupt.type === 'demand') {
        // A student demand (see src/systems/demands/demandSystem.ts). The
        // scripted player acknowledges it and does nothing else — there is
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
        dispatch({ type: 'RESOLVE_DEMAND' });
      } else if (s.pendingInterrupt.type === 'charter') {
        // The scripted player always takes the charter. It costs nothing
        // and changes nothing mechanical (it renames the school), so
        // there is no trajectory to compare the other answer against.
        dispatch({ type: 'RESOLVE_CHARTER', accept: true });
      } else if (s.pendingInterrupt.type === 'decision-event') {
        const taken = chooseEventOption(s);
        const before = s.finance.cash;
        if (taken) {
          tally.decisions += 1;
          if (GREEK_EVENT_IDS.includes(taken.eventId)) tally.greekEventsSeen += 1;
          tally.eventFireCounts[taken.eventId] = (tally.eventFireCounts[taken.eventId] ?? 0) + 1;
          if (taken.eventId === 'naming-rights' && taken.choiceId === 'sign') tally.schoolsNamed += 1;
          if (taken.eventId === 'greek-housing') tally.chaptersAskedForHousing += 1;
          if (taken.eventId === 'hellenic-council' && tally.hellenicCouncilYear === null) {
            tally.hellenicCouncilYear = s.clock.year;
          }
          dispatch({ type: 'RESOLVE_DECISION_EVENT', ...taken });
        } else {
          dispatch({ type: 'RESOLVE_DECISION_EVENT', eventId: '', choiceId: '', ctx: {} });
        }
        tally.cash += s.finance.cash - before;
      } else {
        dispatch({ type: 'RESOLVE_REPORT' });
      }
      continue;
    }
    decide(() => s, strategy, weeksInTheRed, dispatch);
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
  }
  return { rows, tally };
}

function fmt(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1e9) return `${sign}${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${sign}${(abs / 1e3).toFixed(0)}k`;
  return `${sign}${abs.toFixed(0)}`;
}

function report(strategy: Strategy, run: { rows: Row[]; tally: EventTally }, every: number): void {
  const { rows, tally } = run;
  console.log(`\n=== ${strategy.name} (${strategy.schoolType}) ===`);
  console.log('yr |     cash |   enr/cap   | prest | opex/wk | net/wk |  sat | crs | maj | fac |  tuition | aid |  applic | admit% |  endow | rsch/wk | brk | orgs | grad');
  const last = rows[rows.length - 1];
  for (const r of rows) {
    if (r.year > 6 && r.year % every !== 0 && r !== last) continue;
    console.log(
      `${String(r.year).padStart(2)} | ${fmt(r.cash).padStart(8)} | ${fmt(r.enrolled).padStart(5)}/${fmt(r.capacity).padEnd(5)} | ` +
      `${r.prestige.toFixed(1).padStart(5)} | ${fmt(r.opex).padStart(7)} | ${fmt(r.net).padStart(6)} | ${r.satisfaction.toFixed(0).padStart(4)} | ` +
      `${String(r.courses).padStart(3)} | ${String(r.majors).padStart(3)} | ${String(r.faculty).padStart(3)} | ${fmt(r.tuition).padStart(8)} | ` +
      `${(r.aid * 100).toFixed(0).padStart(3)} | ${fmt(r.applicants).padStart(7)} | ${(r.admitRate * 100).toFixed(0).padStart(6)} | ${fmt(r.endowment).padStart(6)} | ` +
      `${r.researchRate.toFixed(1).padStart(7)} | ${String(r.breakthroughs).padStart(3)} | ` +
      // clubs/chapters live at the close of that year — the column that
      // says WHEN student life actually starts for a given strategy, which
      // is the whole question the opex share below can't answer.
      `${String(r.clubs).padStart(2)}/${String(r.chapters).padEnd(2)} | ` +
      // graduate courses developed / programs founded, at the close of
      // that year — the column that answers "when does a strategy reach
      // the graduate tier, and does it finish anything".
      `${String(r.gradCourses).padStart(2)}/${r.gradPrograms}`,
    );
  }
  console.log(`   weeks in the red: ${last.weeksInTheRed} of ${rows.length * 52}, min cash: ${fmt(last.minCash)}`);
  console.log(`   milestone celebrations: ${tally.milestones}, decision events: ${tally.decisions}, net event cash: ${fmt(tally.cash)}`);
  // The cadence question, answered directly: how often is the clock
  // stopped by something that is NOT one of the two fixed annual
  // interrupts (summer admissions, the U.S. News report). Demands are in
  // this total rather than beside it because they spend the same cooldown
  // the decision events do — the point of the line is that adding them
  // moves it very little.
  const years = rows.length;
  const texture = tally.milestones + tally.decisions + tally.prizes + tally.demandsRaised;
  const subjects = Object.entries(tally.demandSubjects)
    .sort((a, b) => b[1] - a[1])
    .map(([subject, n]) => `${subject} x${n}`)
    .join(', ');
  console.log(
    `   student demands: ${tally.demandsRaised} raised (${tally.demandsMet} met, ${tally.demandsFailed} failed)` +
    `${subjects ? ` — ${subjects}` : ''}`,
  );
  console.log(
    `   texture modals (milestones + events + prizes + demands): ${texture} over ${years} years ` +
    `= ${(texture / Math.max(years, 1)).toFixed(2)}/yr, on top of the ${years} annual admissions decisions`,
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
const rampTuition = (perPrestigePoint: number) => (s: GameState) =>
  Math.min(s.finance.tuitionCeiling, Math.round((4_000 + s.self.reputation * perPrestigePoint) / 500) * 500);

const STRATEGIES: Strategy[] = [
  {
    // The intended line of play: grow one thing at a time, never take on a
    // commitment the current cash flow can't carry.
    name: 'Balanced builder', schoolType: 'private',
    tuition: rampTuition(300), aid: () => 0.25,
    buffer: (s) => Math.max(150_000, s.finance.weeklyOpEx * 4),
    netMargin: 0.12,
    buildsCourses: true, buildsDorms: true, buildsFacilities: true,
    dormFillThreshold: 0.85, facilityThreshold: 72, campaigns: true,
  },
  {
    // Deliberate overreach: buys everything the moment cash allows,
    // ignoring the flow. Should stall hard, then claw back out — never die.
    name: 'Curriculum rush (overreach)', schoolType: 'private',
    tuition: rampTuition(300), aid: () => 0.2,
    buffer: () => 20_000,
    netMargin: 0,
    buildsCourses: true, buildsDorms: true, buildsFacilities: true,
    dormFillThreshold: 0.98, facilityThreshold: 45, campaigns: false,
  },
  {
    // The volume archetype: cheap, heavily discounted, beds first. Tests
    // that a big low-selectivity school is a viable, different shape.
    name: 'Discount volume (beds first)', schoolType: 'private',
    tuition: rampTuition(150), aid: () => 0.5,
    buffer: (s) => Math.max(200_000, s.finance.weeklyOpEx * 8),
    netMargin: 0.08,
    buildsCourses: true, buildsDorms: true, buildsFacilities: true,
    dormFillThreshold: 0.7, facilityThreshold: 80, campaigns: true,
  },
  {
    name: 'Public flagship', schoolType: 'public',
    tuition: rampTuition(300), aid: () => 0.2,
    buffer: (s) => Math.max(150_000, s.finance.weeklyOpEx * 4),
    netMargin: 0.12,
    buildsCourses: true, buildsDorms: true, buildsFacilities: true,
    dormFillThreshold: 0.85, facilityThreshold: 72, campaigns: true,
  },
  {
    // The stall test: beds far ahead of demand, at a price the school's
    // prestige cannot support. Every mistake the pacing model is supposed
    // to punish, made at once. It must go deep into the red and CLIMB BACK
    // OUT — that is the whole content of "stall, don't die".
    name: 'Overbuilder (beds ahead of demand)', schoolType: 'private',
    tuition: (s) => Math.min(s.finance.tuitionCeiling, 45_000), aid: () => 0.1,
    buffer: () => 0,
    netMargin: -1,
    buildsCourses: true, buildsDorms: true, buildsFacilities: false,
    dormFillThreshold: 0, facilityThreshold: 0, campaigns: false,
  },
  {
    // The control: builds nothing, ever. Prestige and cash here are the
    // floor the whole loop has to beat, or growth is optional.
    name: 'Idle (builds nothing)', schoolType: 'private',
    tuition: () => 12_000, aid: () => 0.2,
    buffer: () => Number.MAX_SAFE_INTEGER,
    netMargin: Number.MAX_SAFE_INTEGER,
    buildsCourses: false, buildsDorms: false, buildsFacilities: false,
    dormFillThreshold: 2, facilityThreshold: 0, campaigns: false,
  },
];

const years = Number(process.argv[2] ?? 40);
const every = Number(process.argv[3] ?? 2);
const filter = process.argv[4];
for (const strategy of STRATEGIES) {
  if (filter && !strategy.name.toLowerCase().includes(filter.toLowerCase())) continue;
  seed = INITIAL_SEED;
  fakeStorage.clear();
  report(strategy, play(strategy, years), every);
}
