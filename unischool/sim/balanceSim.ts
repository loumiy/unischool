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
import { JOB_POSTING_COST } from '../src/data/facultyData';

// ---------------------------------------------------------------------
// Deterministic environment. The game rolls dice (faculty potentials,
// rival drift, posting timelines) and saves to localStorage; a harness
// wants the same run every time and no browser, so Math.random is seeded
// and localStorage is stubbed here rather than either being made optional
// anywhere in the game code. (crypto.randomUUID is left alone — Node has
// it, and faculty ids never affect a trajectory.)
// ---------------------------------------------------------------------
const INITIAL_SEED = 12345;
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

  // Faculty: hire for any field with an available course and no free slot,
  // and post openings for the fields that are blocking development.
  for (const candidate of get().candidates.map((c) => c.id)) {
    const s = get();
    const c = s.candidates.find((x) => x.id === candidate);
    if (!c) continue;
    const needed = s.tech.some(
      (t) => t.requiresFaculty === c.field && t.status === 'available' && !hasFreeFacultySlot(s, c.field),
    );
    if (needed && s.finance.cash > strategy.buffer(s) && hasHeadroom(s, strategy)) {
      dispatch({ type: 'HIRE_FACULTY', facultyId: c.id });
    }
  }
  if (strategy.buildsCourses && weeklyNet(get()) > 0) {
    const blocked = new Set(
      get().tech
        .filter((t) => t.status === 'available' && t.requiresFaculty && !hasFreeFacultySlot(get(), t.requiresFaculty))
        .map((t) => t.requiresFaculty as string),
    );
    for (const field of blocked) {
      const s = get();
      if (field in s.openPostings) continue;
      if (s.candidates.some((c) => c.field === field)) continue;
      if (hasHeadroom(s, strategy) && affordable(s, JOB_POSTING_COST, strategy)) {
        dispatch({ type: 'POST_JOB', field });
      }
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
  };
}

function play(strategy: Strategy, years: number): Row[] {
  let s = createPreStartState();
  s = reducer(s, { type: 'START_GAME', name: 'Test University', schoolType: strategy.schoolType });
  const dispatch = (a: Action) => { s = reducer(s, a); };
  const rows: Row[] = [];
  let weeksInTheRed = 0;
  let minCash = s.finance.cash;

  while (s.clock.year <= years) {
    if (s.pendingInterrupt) {
      if (s.pendingInterrupt.type === 'admissions') {
        dispatch({ type: 'RESOLVE_ADMISSIONS', tuition: strategy.tuition(s), financialAidRate: strategy.aid(s) });
        rows.push(snapshot(s, weeksInTheRed, minCash));
      } else {
        dispatch({ type: 'RESOLVE_REPORT' });
      }
      continue;
    }
    decide(() => s, strategy, weeksInTheRed, dispatch);
    dispatch({ type: 'TICK' });
    if (s.finance.cash < 0) weeksInTheRed += 1;
    minCash = Math.min(minCash, s.finance.cash);
  }
  return rows;
}

function fmt(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1e9) return `${sign}${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${sign}${(abs / 1e3).toFixed(0)}k`;
  return `${sign}${abs.toFixed(0)}`;
}

function report(strategy: Strategy, rows: Row[], every: number): void {
  console.log(`\n=== ${strategy.name} (${strategy.schoolType}) ===`);
  console.log('yr |     cash |   enr/cap   | prest | opex/wk | net/wk |  sat | crs | maj | fac |  tuition | aid |  applic | admit% |  endow');
  const last = rows[rows.length - 1];
  for (const r of rows) {
    if (r.year > 6 && r.year % every !== 0 && r !== last) continue;
    console.log(
      `${String(r.year).padStart(2)} | ${fmt(r.cash).padStart(8)} | ${fmt(r.enrolled).padStart(5)}/${fmt(r.capacity).padEnd(5)} | ` +
      `${r.prestige.toFixed(1).padStart(5)} | ${fmt(r.opex).padStart(7)} | ${fmt(r.net).padStart(6)} | ${r.satisfaction.toFixed(0).padStart(4)} | ` +
      `${String(r.courses).padStart(3)} | ${String(r.majors).padStart(3)} | ${String(r.faculty).padStart(3)} | ${fmt(r.tuition).padStart(8)} | ` +
      `${(r.aid * 100).toFixed(0).padStart(3)} | ${fmt(r.applicants).padStart(7)} | ${(r.admitRate * 100).toFixed(0).padStart(6)} | ${fmt(r.endowment).padStart(6)}`,
    );
  }
  console.log(`   weeks in the red: ${last.weeksInTheRed} of ${rows.length * 52}, min cash: ${fmt(last.minCash)}`);
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
