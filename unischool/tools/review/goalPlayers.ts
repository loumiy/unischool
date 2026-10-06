// ---------------------------------------------------------------------
// THE GOAL PLAYERS (Plan 73, area 4). Seven players, each chasing one goal
// a real player might set themselves, playing the real reducer to year 50
// through the harness (sim/harness/game.ts) and its moves (moves.ts,
// guided.ts). Unlike the harness's players they are not a line of play the
// game suggests: each adapts to what its college is doing, logs a reason
// for every decision, and records every moment it wanted a lever the game
// does not have.
//
//   revenue        tuition, admit rate, draw rate and the sweep tuned for
//                  net income each summer; builds only what pays
//   prestige       teaching quality, hand-picked faculty and research depth
//                  first; grows only as prestige allows
//   satisfaction   whatever need is lowest, each term; never lets crowding in
//   assets         the cheapest path to the whole catalogue of placeables;
//                  borrows when it must
//   championships  athletics first: venues, coaches, the director, the
//                  budget, and one or two flagships on full scholarships
//   good-then-big  a small, excellent college for twenty years, then grows
//   big-then-good  grows as fast as money allows, then fixes quality
//
//   npm run review:goals                        every goal, five seeds, two names
//   npm run review:goals -- --goals revenue,prestige --seeds 12345 --years 20
//   npm run review:goals -- --run --goal revenue --seed 7 --name Blackmoor --out f.json
//   npm run review:goals -- --report <dir>      re-write the report from saved runs
//   npm run review:goals -- --goals championships --specialization athletics
//                                               a fixed pick at the milestone
//                                               (Plan 85D's hook), for every run
//
// The specialization (Plan 85D): at the rank milestone each goal takes the
// pillar its goal implies (GOAL_SPECIALIZATION below), not the harness's
// strongest pillar, and builds that pillar's building when it opens.
// --specialization overrides it for every run ('strongest', 'never' or a
// pillar).
//
// Each run is its own process (the harness binds one random stream per
// process), four at a time. Runs land in node_modules/.tmp/goals/ as JSON;
// the report is <dir>/goals.md. Measures, never fails.
//
// Not part of the game: nothing in src/ imports this.
// ---------------------------------------------------------------------

import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { availableParallelism } from 'node:os';
import { join } from 'node:path';
import type { Action } from '../../src/state/actions';
import type { Buildable, GameState, SatisfactionAttributes } from '../../src/state/types';
import { WEEKS_PER_YEAR, standsOnCampus, totalEnrolled } from '../../src/state/types';
import { SUMMER_LAST_BEAT } from '../../src/state/types';
import { firstFreeSpot, footprintOf, isPlaceableKind } from '../../src/state/campusMap';
import { isAcademicHall, milestoneSchools, programById } from '../../src/data/techData';
import { GRADUATE_HOSTS } from '../../src/data/projectData';
import { initiativeOffers } from '../../src/data/researchData';
import { promiseById } from '../../src/data/promiseData';
import { findDecisionEvent, offeredChoices, type DecisionEventContext } from '../../src/data/eventData';
import {
  TRAINER_FIELD, isFlagship, orderedTeams, scholarshipCostFor, teamQuality, venueForCategory,
} from '../../src/data/studentLifeData';
import { nextVenueExpansion } from '../../src/data/facilitiesData';
import { TUITION_SLIDER_MAX } from '../../src/data/foundingData';
import {
  canRelocateProgram, canStartDevelopment, hasFreeFacultySlot, planCommitmentCoverage,
} from '../../src/systems/techtree/techSystem';
import { claimedSchool, schoolFoundedKey, schoolHall } from '../../src/systems/techtree/schools';
import { hostOffers } from '../../src/systems/techtree/programOffers';
import { intakeCeiling } from '../../src/systems/techtree/instructionCapacity';
import { financeBreakdown, marginalStudentMargin, weeklyNet } from '../../src/systems/finance/financeSystem';
import { borrowingRoom, debtOutstanding, drawRate, DRAW_RATE_MAX, giftFunds } from '../../src/systems/finance/treasury';
import { tuitionFloor } from '../../src/systems/finance/distress';
import {
  priceTolerance, projectAdmissions, topBandShare, trailingYearSatisfaction,
} from '../../src/systems/admissions/admissionsSystem';
import { deriveCohortSignals } from '../../src/systems/admissions/cohorts';
import { projectConsequences } from '../../src/systems/admissions/consequences';
import { CROWDING_GRACE, crowdingScore, teachingCeiling, prestigeBreakdown } from '../../src/systems/prestige/prestigeSystem';
import { athleticRank, playerRank, rankBy } from '../../src/systems/rivals/rivalsSystem';
import { canAppoint, heldSeat, seatCandidates, staffingSeats } from '../../src/systems/delegation/seats';
import { STAFFING_POLICY, seatDef } from '../../src/data/seatData';
import { marketRateMultiplier } from '../../src/data/facultyData';
import { openCampaigns } from '../../src/systems/alumni/campaigns';
import { canExtend, extensionCost } from '../../src/systems/estate/estate';
import { unstaffedIn } from '../../src/systems/faculty/restaffing';
import { canPostSearch, searchCost } from '../../src/systems/faculty/facultySearch';
import { courseQuality } from '../../src/systems/faculty/facultyAssignment';
import { GRADE_A, GRADE_B } from '../../src/data/courseQuality';
import { finalReport } from '../../src/state/finalReport';
import { defaultAnswer } from '../../src/engine/defaultAnswers';
import { foundGame, playWeek, type Game, type Player } from '../../sim/harness/game';
import {
  buildable, developCourse, foundOffer, hireForBlocked, homeFor, moveHome, relieveCrowding, site,
  siteNextHall, tendTeaching, TEACHING, TEND_EVERY_WEEKS,
} from '../../sim/harness/moves';
import { buildFor, foundIn, reserveOf } from '../../sim/harness/guided';
import { brokenRules } from '../../sim/harness/invariants';
import type { SpecializationRule } from '../../sim/harness/specialization';
import { ATHLETICS_COMPLEX_ID, complexFlagships } from '../../src/data/athleticsComplexData';
import { cutRefusal } from '../../src/systems/athletics/cut';
import { TRAINING_INSTITUTE_ID, instituteStands, isTrained } from '../../src/data/trainingData';
import { RESEARCH_PARK_ID } from '../../src/data/researchParkData';
import { PILLARS, pillarValue } from '../../src/systems/prestige/prestigeSystem';
import { specializationOf } from '../../src/systems/prestige/specialization';
import { declineUnteachable } from '../../sim/harness/moves';
import type { Pillar } from '../../src/state/types';
import { slotFree } from '../../src/systems/administration/offices';

export const GOALS = ['revenue', 'prestige', 'satisfaction', 'assets', 'championships', 'good-then-big', 'big-then-good'] as const;
export type Goal = (typeof GOALS)[number];

const DEFAULT_SEEDS = [12345, 4242, 777, 31337, 2026];
const DEFAULT_NAMES = ['Blackmoor', 'Saint Aldric'];
const YEARS = 50;
// The switch in the two "then" goals.
const SWITCH_YEAR = 20;

// The pillar each goal chooses at the milestone (Plan 85D), and why: what
// the goal itself would read off the four cards.
export const GOAL_SPECIALIZATION: Record<Goal, { pillar: Pillar; why: string }> = {
  revenue: { pillar: 'research', why: 'The research park lifts every lab\'s output, and the grants that ride on it: the only card that names money coming in.' },
  prestige: { pillar: 'academics', why: 'The teaching standard caps the target; the faculty training program is the lever October\'s player wanted.' },
  satisfaction: { pillar: 'studentLife', why: 'The downtown meets the students\' social, dining and housing needs, and the festival lifts their mood.' },
  assets: { pillar: 'research', why: 'The research park was the catalogue\'s last gate in October; it is the asset the goal had been working toward.' },
  championships: { pillar: 'athletics', why: 'The athletic performance complex: more flagships, better recruiting, a smaller edge for the powers.' },
  'good-then-big': { pillar: 'academics', why: 'A college known first for its teaching: the faculty training program.' },
  'big-then-good': { pillar: 'studentLife', why: 'A big college needs beds and a town: the downtown meets the needs a large body outgrows.' },
};
// The building only a pillar's specialization may build (the downtown has none).
const SPECIALTY_BUILDING: Partial<Record<Pillar, string>> = {
  academics: TRAINING_INSTITUTE_ID, research: RESEARCH_PARK_ID, athletics: ATHLETICS_COMPLEX_ID,
};

const ATTRIBUTES: Array<keyof SatisfactionAttributes> = ['academic', 'social', 'basicNeeds', 'health', 'housing'];

// ---------------------------------------------------------------------
// The journal: what a run records.
// ---------------------------------------------------------------------

export interface Row {
  year: number;
  cash: number;
  net: number;
  endowment: number;
  debt: number;
  enrolled: number;
  applicants: number;
  admitRate: number;
  tuition: number;
  priceRatio: number;         // listed price over what the standing tolerates
  prestige: number;
  target: number;             // the academic target the summer grades toward
  ceiling: number;            // the teaching standard's cap on it
  rank: number;
  researchRank: number;
  lifeRank: number;
  athleticRank: number;
  satisfaction: number;
  attributes: SatisfactionAttributes;
  crowding: number;           // the year's crowding shortfall so far, 0..1
  courses: number;
  gradCourses: number;
  programs: number;
  schools: number;
  placeables: number;         // placeable Buildables standing or going up
  faculty: number;
  gradeA: number;             // share of taught courses graded A
  gradeAB: number;            // share graded A or B
  teams: number;
  titles: number;
  clubs: number;
  chapters: number;
  publications: number;
  breakthroughs: number;
  prizes: number;
  initiatives: number;        // under way
  seats: number;              // administrative seats held
  pillars: number[];          // academics, research, student life, athletics (Plan 85B)
  trained: number;            // professors on the roster trained by the institute (Plan 85E)
}

interface WantRecord { lever: string; why: string; first: [number, number]; weeks: number; years: number[] }

export interface RunRecord {
  goal: Goal;
  seed: number;
  name: string;
  years: Row[];
  // year -> decision key -> count. A decision is a player action (not an
  // answer to an interrupt), keyed by the reason it was taken.
  decisions: Record<string, Record<string, number>>;
  // decision key -> the reason, in words.
  reasons: Record<string, string>;
  // year -> interrupt type -> answers given (a modal the player sees).
  interrupts: Record<string, Record<string, number>>;
  // year -> weeks with nothing done and nothing asked.
  idleWeeks: Record<string, number>;
  // year -> weeks the player only answered what was put to it.
  answerOnlyWeeks: Record<string, number>;
  wants: WantRecord[];
  // The first year each of the goal's markers was reached.
  marks: Record<string, number>;
  switched?: number;
  promisesTaken: string[];
  final?: { title: string; mark: string; axes: Array<{ label: string; grade: string; mean: number }>; kept: number; missed: number };
  // The championships player's flagships (Plan 80G's target): the year each
  // was chosen and put on full scholarships, and its first final four.
  flagships?: Array<{ sport: string; chosen: number; finalFour?: number }>;
  // The championships player's programs cut (Plan 95V), by sport and year.
  cuts?: Array<{ sport: string; year: number }>;
  // The specialization chosen at the milestone (Plan 85D), and when.
  specialization?: string;
  specializationYear?: number;
  // Instructor swaps a year (Plan 95S): the player's own
  // (REASSIGN_COURSE_FACULTY), and the Provost's on Staff for the A.
  playerSwaps?: Record<string, number>;
  seatSwaps?: Record<string, number>;
  broken: string[];
  seconds: number;
  error?: string;
}

const yearKey = (y: number) => String(y);

class Journal {
  rec: RunRecord;
  private why: { key: string; reason: string } | null = null;
  private weekActions = 0;
  private weekAnswers = 0;
  private wantsByLever = new Map<string, WantRecord>();
  private wantedThisWeek = new Set<string>();
  private lastModal = '';

  constructor(goal: Goal, seed: number, name: string) {
    this.rec = {
      goal, seed, name, years: [], decisions: {}, reasons: {}, interrupts: {}, idleWeeks: {}, answerOnlyWeeks: {},
      wants: [], marks: {}, promisesTaken: [], broken: [], seconds: 0,
    };
  }

  // Wraps the game's dispatch so every action is counted: an answer when an
  // interrupt stands, else a decision under the reason in force.
  attach(g: Game): void {
    const inner = g.act;
    g.act = (a: Action) => {
      const year = yearKey(g.s.clock.year);
      if (a.type === 'TICK') {
        // A course whose instructor changed during the week, from one
        // professor to another, under a staffing seat, was moved by the seat
        // (Plan 95S; a departure's colleague cover is counted with it).
        if (staffingSeats(g.s).length === 0) { inner.call(g, a); return; }
        const before = { ...g.s.courseFaculty };
        inner.call(g, a);
        const after = g.s.courseFaculty;
        const moved = Object.keys(before).filter((id) => after[id] !== undefined && after[id] !== before[id]).length;
        if (moved > 0) (this.rec.seatSwaps ??= {})[year] = (this.rec.seatSwaps?.[year] ?? 0) + moved;
        return;
      }
      if (g.s.pendingInterrupt) {
        // A modal seen, once: the summer's four beats are one summer.
        const type = g.s.pendingInterrupt.type;
        const seen = type === 'summer' ? `summer:${g.s.clock.year}` : `${type}:${g.s.clock.year}:${g.s.clock.week}:${JSON.stringify(g.s.pendingInterrupt.payload ?? null).slice(0, 80)}`;
        if (seen !== this.lastModal) {
          this.lastModal = seen;
          const bucket = (this.rec.interrupts[year] ??= {});
          bucket[type] = (bucket[type] ?? 0) + 1;
        }
        this.weekAnswers += 1;
      } else {
        if (a.type === 'REASSIGN_COURSE_FACULTY') (this.rec.playerSwaps ??= {})[year] = (this.rec.playerSwaps?.[year] ?? 0) + 1;
        const key = this.why?.key ?? a.type;
        if (this.why && !this.rec.reasons[key]) this.rec.reasons[key] = this.why.reason;
        const bucket = (this.rec.decisions[year] ??= {});
        bucket[key] = (bucket[key] ?? 0) + 1;
        this.weekActions += 1;
      }
      inner.call(g, a);
    };
  }

  // Runs `fn` with a reason in force; true if it sent anything.
  because(key: string, reason: string, fn: () => boolean | void): boolean {
    const before = this.weekActions;
    const prior = this.why;
    this.why = { key, reason };
    try { fn(); } finally { this.why = prior; }
    return this.weekActions > before;
  }

  want(s: GameState, lever: string, why: string): void {
    if (s.clock.year === 1 && s.clock.week < 4) return;
    if (this.wantedThisWeek.has(lever)) return;
    this.wantedThisWeek.add(lever);
    let w = this.wantsByLever.get(lever);
    if (!w) {
      w = { lever, why, first: [s.clock.year, s.clock.week], weeks: 0, years: [] };
      this.wantsByLever.set(lever, w);
      this.rec.wants.push(w);
    }
    w.weeks += 1;
    if (!w.years.includes(s.clock.year)) w.years.push(s.clock.year);
  }

  mark(s: GameState, key: string): void {
    if (this.rec.marks[key] === undefined) this.rec.marks[key] = s.clock.year;
  }

  // Closes a week: idle if nothing was done and nothing asked.
  endWeek(s: GameState): void {
    const year = yearKey(s.clock.year);
    if (this.weekActions === 0 && this.weekAnswers === 0) this.rec.idleWeeks[year] = (this.rec.idleWeeks[year] ?? 0) + 1;
    else if (this.weekActions === 0) this.rec.answerOnlyWeeks[year] = (this.rec.answerOnlyWeeks[year] ?? 0) + 1;
    this.weekActions = 0;
    this.weekAnswers = 0;
    this.wantedThisWeek.clear();
  }

  row(s: GameState): void {
    const done = s.tech.filter((t) => t.kind === 'course' && t.status === 'done');
    const graded = done.map((t) => courseQuality(s, t)).filter((q): q is NonNullable<typeof q> => q !== null);
    const breakdown = prestigeBreakdown(s);
    this.rec.years.push({
      year: s.clock.year,
      cash: Math.round(s.finance.cash),
      net: Math.round(weeklyNet(s)),
      endowment: Math.round(s.finance.endowment),
      debt: Math.round(debtOutstanding(s)),
      enrolled: totalEnrolled(s.students),
      applicants: s.students.applicantPool,
      admitRate: s.students.admitRate,
      tuition: s.finance.listedTuition,
      priceRatio: s.finance.listedTuition / priceTolerance(s.self.reputation),
      prestige: s.self.reputation,
      target: breakdown.target,
      ceiling: teachingCeiling(s).value,
      rank: playerRank(s),
      researchRank: rankBy(s, 'researchStanding'),
      lifeRank: rankBy(s, 'socialStanding'),
      athleticRank: athleticRank(s),
      satisfaction: s.students.satisfaction,
      attributes: { ...s.students.satisfactionBreakdown },
      crowding: crowdingScore(s),
      courses: done.filter((t) => t.graduateProgram === undefined).length,
      gradCourses: done.filter((t) => t.graduateProgram !== undefined).length,
      programs: Object.values(s.halls).flat().filter((x) => x.programId !== null).length,
      schools: milestoneSchools().filter((m) => s.milestones[schoolFoundedKey(m.schoolName)]).length,
      placeables: s.tech.filter((t) => isPlaceableKind(t) && (t.status === 'done' || t.status === 'developing')).length,
      faculty: s.faculty.length,
      gradeA: graded.length > 0 ? graded.filter((q) => q.score >= GRADE_A).length / graded.length : 0,
      gradeAB: graded.length > 0 ? graded.filter((q) => q.score >= GRADE_B).length / graded.length : 0,
      teams: s.orgs.teams.length,
      titles: s.orgs.titles.length,
      clubs: s.orgs.clubs.length,
      chapters: s.orgs.chapters.length,
      publications: s.research.publications,
      breakthroughs: s.research.breakthroughs,
      prizes: s.research.prizes,
      initiatives: Object.keys(s.research.initiatives).length,
      seats: (s.seats ?? []).length,
      pillars: PILLARS.map((p) => Math.round(pillarValue(s, p) * 10) / 10),
      trained: s.faculty.filter(isTrained).length,
    });
  }
}

// ---------------------------------------------------------------------
// Shared moves, each under a reason.
// ---------------------------------------------------------------------

const cheapest = <T extends { cost: number }>(items: readonly T[]): T | undefined => [...items].sort((a, b) => a.cost - b.cost)[0];
const affords = (s: GameState, cost: number, reserve: number) => s.finance.cash - cost >= reserve;

function menu(s: GameState): Buildable[] {
  return s.tech.filter((t) => t.status === 'available' && isPlaceableKind(t) && !(t.id in s.placements));
}

// Site a placeable: restricted gift money first, then cash; with `borrow`,
// a loan for what cash does not cover (the build menu's own financing).
function place(g: Game, t: Buildable, reserve: number, borrow = false): boolean {
  const s = g.s;
  const spot = firstFreeSpot(s, t, footprintOf(t));
  if (!spot) return false;
  const base = { type: 'PLACE_BUILDABLE' as const, buildableId: t.id, row: spot.row, col: spot.col, facing: 0 as const };
  if (giftFunds(s) >= t.cost) {
    g.act({ ...base, gift: true });
  } else if (affords(s, t.cost, reserve)) {
    g.act(base);
  } else if (borrow && borrowingRoom(s) > 0 && canStartDevelopment(s, t, undefined, 'loan')) {
    g.act({ ...base, borrow: true });
  } else {
    return false;
  }
  return t.id in g.s.placements;
}

function restaff(g: Game, j: Journal): void {
  if (unstaffedIn(g.s).length === 0) return;
  j.because('restaff', 'A course went dark when its teacher left; restaffing it keeps its seats.', () => g.act({ type: 'RESTAFF', school: null }));
}

// A school spread over two halls while another school's offer has nowhere
// to go: the smaller hall's programs move into the larger (natural.ts's
// consolidate). The game never suggests this; the player has to see it.
function consolidate(g: Game, j: Journal): void {
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
  for (const halls of bySchool.values()) {
    if (halls.length < 2) continue;
    const housed = (hallId: string) => g.s.halls[hallId].filter((x) => x.programId !== null).length;
    const [keep, ...spare] = [...halls].sort((a, b) => housed(b) - housed(a));
    j.want(s, 'merge a split school', 'A school sits in two halls while another school has no hall; nothing on screen offers to merge them, and the offers wait until one is freed.');
    for (const from of spare) {
      for (const programId of g.s.halls[from].map((x) => x.programId).filter((x): x is string => x !== null)) {
        const slot = g.s.halls[keep].findIndex(slotFree);
        const move = { programId, hallId: keep, slot };
        if (slot >= 0 && canRelocateProgram(g.s, move)) {
          j.because('merge-school', 'Merging a school split over two halls frees one for a school with nowhere to go.', () => g.act({ type: 'RELOCATE_PROGRAM', ...move }));
        }
      }
    }
  }
}

function foundGraduate(g: Game, j: Journal, reserve: number): void {
  for (const hostId of new Set(Object.values(GRADUATE_HOSTS))) {
    const host = g.s.tech.find((t) => t.id === hostId);
    if (!host || !standsOnCampus(host)) continue;
    const offers = hostOffers(g.s, hostId).map((p) => p.id);
    if (offers.length > 0 && j.because('found-graduate', 'A graduate program its host offers: breadth and the grad-school bound applicants.', () => foundIn(g, hostId, offers, reserve))) return;
  }
}

// Research: every idle lab, the deepest (or cheapest) initiative that
// leaves no course without its teacher.
function fundResearch(g: Game, j: Journal, reserve: number, deepest: boolean, reason: string): void {
  const labs = g.s.tech.filter((t) => t.facilityType === 'lab' && t.status === 'done' && !g.s.research.initiatives[t.id]);
  for (const lab of labs) {
    const offers = initiativeOffers(g.s, lab.id)
      .filter((o) => !o.blockedReason && affords(g.s, o.fundingCost, reserve))
      .filter((o) => planCommitmentCoverage(g.s, o.suggested.map((f) => f.id)).orphaned.length === 0);
    const pick = deepest ? offers[offers.length - 1] : [...offers].sort((a, b) => a.fundingCost - b.fundingCost)[0];
    if (!pick) continue;
    j.because(`research-${deepest ? 'deep' : 'cheap'}`, reason, () => g.act({
      type: 'START_INITIATIVE', labId: lab.id, topicId: pick.topic.id, depth: pick.depth.key, facultyIds: pick.suggested.map((f) => f.id),
    }));
  }
}

// Staff every chair with the best candidate listed; with `upgrade`, replace
// a coach a clearly better candidate outclasses.
function staffTeams(g: Game, j: Journal, reserve: number, upgrade: boolean): void {
  for (const team of g.s.orgs.teams) {
    const venue = venueForCategory(g.s, team.venueCategory);
    if (venue && venue.status === 'available' && !(venue.id in g.s.placements)) {
      j.because('venue-for-team', 'A varsity team waits on its venue; it cannot compete until it stands.', () => place(g, venue, reserve, true));
    }
    for (const role of ['head', 'assistant', 'trainer'] as const) {
      const slot = role === 'head' ? 'headCoach' : role === 'assistant' ? 'assistantCoach' : 'trainer';
      const field = role === 'trainer' ? TRAINER_FIELD : team.sport;
      const card = (c: { scouted?: [number, number]; quality: number }) => (c.scouted ? (c.scouted[0] + c.scouted[1]) / 2 : c.quality);
      const best = g.s.orgs.coachCandidates.filter((c) => c.field === field).sort((a, b) => card(b) - card(a) || b.quality - a.quality)[0];
      const current = team[slot];
      if (current === null) {
        if (best) j.because('hire-coach', 'An empty coaching chair scores at the floor.', () => g.act({ type: 'HIRE_COACH', candidateId: best.id, teamId: team.id, role }));
        continue;
      }
      // What a card shows is the scouted range, not the potential.
      const shown = (c: typeof current) => (c.scouted ? (c.scouted[0] + c.scouted[1]) / 2 : c.quality);
      if (upgrade && best && current.tenureWeeks >= 104 && shown(best) >= Math.max(current.quality, shown(current)) + 15) {
        j.because('replace-coach', 'A listed coach would outgrow the incumbent by fifteen points or more.', () => {
          g.act({ type: 'FIRE_COACH', teamId: team.id, role });
          g.act({ type: 'HIRE_COACH', candidateId: best.id, teamId: team.id, role });
        });
      }
    }
  }
}

// A Provost opens 4x (seats.ts's speedLock), so every player a person
// would be appoints one once the week can carry the salary; the VP of
// Advancement is what campaigns need.
function appoint(g: Game, j: Journal, seatId: 'provost' | 'advancement' | 'facilities' | 'dean-of-students', reason: string): void {
  const s = g.s;
  // A Provost held is put on Staff for the A (Plan 95S): it answers the
  // routine as the default does, and makes the teaching swaps tendTeaching
  // then leaves to it.
  const held = heldSeat(s, seatId, null);
  if (seatId === 'provost' && held && held.policy !== STAFFING_POLICY) {
    j.because('provost-staffing', 'The Provost puts the best free instructor on each course below A, so the player need not.', () => g.act({ type: 'SET_SEAT_POLICY', seatId, school: null, policy: STAFFING_POLICY }));
  }
  if (held || !canAppoint(s, seatId, null)) return;
  const def = seatDef(seatId);
  if (!def || weeklyNet(s) <= (2 * def.outsideSalary * marketRateMultiplier(s.self.reputation)) / 52) return;
  const inside = seatCandidates(s, seatId, null)[0];
  // From inside only if it orphans nothing: a professor who takes a seat
  // leaves teaching for good.
  const internal = inside && planCommitmentCoverage(s, [inside.id]).orphaned.length === 0 ? inside.id : undefined;
  j.because(`appoint-${seatId}`, reason, () => g.act({ type: 'APPOINT_SEAT', seatId, school: null, facultyId: internal }));
}

function launchCampaigns(g: Game, j: Journal, kinds: Array<'building' | 'endowment'>): void {
  const open = openCampaigns(g.s).filter((c) => kinds.includes(c.kind));
  if (open.length === 0) return;
  j.because('campaign', 'A campaign the alumni would answer: money raised rather than earned.', () => g.act({ type: 'LAUNCH_CAMPAIGN', id: open[0].id }));
}

// Develop courses, the lowest rung first, hiring for a field that blocks
// one; with `standard`, only a course someone could teach to a B.
function developCourses(g: Game, j: Journal, reserve: number, reason: string, limit = 8): void {
  for (let i = 0; i < limit; i += 1) {
    if (!j.because('develop-course', reason, () => developCourse(g, { reserve }))) {
      if (!j.because('hire-for-course', 'A course waits on a field nobody on the roster can take.', () => hireForBlocked(g, { reserve }))) return;
    }
  }
}

function postSearchIfStuck(g: Game, j: Journal, reserve: number): void {
  const s = g.s;
  const blocked = s.tech.find((t) => t.kind === 'course' && t.status === 'available' && t.requiresFaculty
    && !hasFreeFacultySlot(s, t.requiresFaculty) && !s.candidates.some((c) => c.field === t.requiresFaculty));
  if (!blocked?.requiresFaculty) return;
  if (canPostSearch(s, blocked.requiresFaculty) && affords(s, searchCost(s), reserve)) {
    j.because('post-search', 'Nobody in the field is listed; a paid search finds someone.', () => g.act({ type: 'POST_SEARCH', field: blocked.requiresFaculty! }));
  }
}

function siteHallIfNeeded(g: Game, j: Journal, reserve: number): void {
  const s = g.s;
  const waiting = s.programOffers.some((id) => { const p = programById(id); return p && !homeFor(s, p); });
  if (!waiting || s.tech.some((t) => isAcademicHall(t) && t.status === 'developing')) return;
  j.because('site-hall', 'A program is on offer and no hall has a slot for it.', () => siteNextHall(g, { reserve }));
}

function foundOffers(g: Game, j: Journal, reserve: number, reason: string, limit = 6): void {
  for (let i = 0; i < limit; i += 1) {
    if (!j.because('found-program', reason, () => foundOffer(g, { reserve }))) {
      // The first instructor, off the market, when nobody can teach the entry course.
      const hired = j.because('hire-for-offer', 'An offered program needs its first instructor.', () => {
        for (const id of g.s.programOffers) {
          const p = programById(id);
          const where = p ? homeFor(g.s, p) : null;
          if (where && foundIn(g, where.hallId, [id], reserve)) return;
        }
      });
      if (!hired) {
        // An offer nobody can teach, declined for another (Plan 78D): one a year.
        j.because('decline-offer', 'An offered program nobody on the payroll or the market can teach; declined, the draw puts another in its place.', () => { declineUnteachable(g); });
        return;
      }
    }
  }
}

// Crowding first (moves.ts's relieveCrowding): true when the fix is not
// affordable yet and the week is spent saving for it.
function crowdingFirst(g: Game, j: Journal, reserve: number, reason: string): boolean {
  const box: { result: 'built' | 'short' | 'fine' } = { result: 'fine' };
  j.because('crowding', reason, () => { box.result = relieveCrowding(g, buildFor, reserve); });
  return box.result === 'short';
}

function worstAttribute(s: GameState): [keyof SatisfactionAttributes, number] {
  const scores = s.students.satisfactionBreakdown;
  const key = [...ATTRIBUTES].sort((a, b) => scores[a] - scores[b])[0];
  return [key, scores[key]];
}

// What the build menu (or a floor on a standing building) offers for an
// attribute now, affordable or not: empty means no lever.
function remedyExists(s: GameState, attribute: keyof SatisfactionAttributes): boolean {
  const serves = (t: Buildable) => (t.kind === 'dorm' ? attribute === 'housing' : t.effects?.satisfactionAttribute === attribute);
  // Something for it is already going up.
  if (s.tech.some((t) => t.status === 'developing' && serves(t))) return true;
  if (attribute === 'housing' && menu(s).some((t) => t.kind === 'dorm')) return true;
  if (menu(s).some((t) => t.kind === 'facility' && t.effects?.satisfactionAttribute === attribute && !t.athleticsVenueReveal)) return true;
  return s.tech.some((t) => canExtend(t) && (t.kind === 'dorm' ? attribute === 'housing' : t.effects?.satisfactionAttribute === attribute));
}

// Extend a standing building for an attribute (a floor on the library, a
// dining hall, a residence) when the menu has nothing for it.
function extendFor(g: Game, j: Journal, attribute: keyof SatisfactionAttributes, reserve: number): boolean {
  const t = g.s.tech
    .filter((x) => canExtend(x) && (x.kind === 'dorm' ? attribute === 'housing' : x.effects?.satisfactionAttribute === attribute))
    .sort((a, b) => extensionCost(a) - extensionCost(b))[0];
  if (!t || !affords(g.s, extensionCost(t), reserve)) return false;
  return j.because(`extend-${attribute}`, `Another floor on a standing building is the cheapest way to raise ${attribute}.`, () => g.act({ type: 'EXTEND_BUILDING', id: t.id }));
}

// ---------------------------------------------------------------------
// The summer.
// ---------------------------------------------------------------------

interface SummerPlan { tuition: number; admitRate: number }

const STEP = 500;
function priceAt(s: GameState, factor: number): number {
  const tol = priceTolerance(s.self.reputation);
  const raw = Math.round((tol * factor) / STEP) * STEP;
  return Math.max(tuitionFloor(s), Math.min(TUITION_SLIDER_MAX, Math.max(STEP, raw)));
}

// The admissions screen's own projection at a price and a rate: the pool,
// the class, and what committing would do (consequences.ts).
function project(s: GameState, tuition: number, rate: number) {
  const ceiling = intakeCeiling(s);
  const outcome = projectAdmissions(s.self.reputation, tuition, s.students.capacity, trailingYearSatisfaction(s), deriveCohortSignals(s), rate, ceiling.seatsLeft);
  const consequence = projectConsequences(s, outcome.enrolled, tuition, outcome.avgIncomingQuality);
  return { outcome, consequence, seatsLeft: ceiling.seatsLeft };
}

// The rate at which the class fills the room: the slider's own end.
function fillRate(s: GameState, tuition: number): number {
  const probe = project(s, tuition, 1);
  return probe.outcome.applicants > 0 ? Math.max(0.01, Math.min(1, probe.seatsLeft / probe.outcome.applicants)) : 1;
}

const RATES = Array.from({ length: 20 }, (_, i) => 0.05 * (i + 1));

// ---------------------------------------------------------------------
// A goal player.
// ---------------------------------------------------------------------

interface Policy {
  act(g: Game, j: Journal): void;
  summer(g: Game, j: Journal): SummerPlan;
  // Promise condition keys the goal cares about.
  promises: readonly string[];
  // How a decision event is answered: 'thrifty' spends least, 'popular'
  // lands best, 'default' is the game's own (the first affordable).
  events: 'thrifty' | 'popular' | 'default' | 'athletics';
  // Every petition in the summer digest?
  petitions: boolean;
}

// ---- Revenue ----
// Adapts the price each summer by what the last change did to income: a
// hill climb on the price over the standing's tolerance, since the price
// is set blind and only next year's figures say what it did.
function revenuePolicy(): Policy {
  let factor = 1.15;
  let direction = 1;
  let lastIncome: number | null = null;
  return {
    promises: ['cashOver', 'endowmentOver', 'debtUnder', 'backlogUnder'],
    events: 'thrifty',
    petitions: true,
    act(g, j) {
      const s = g.s;
      const reserve = reserveOf(s, 4);
      restaff(g, j);
      j.because('move-home', 'A program away from its school earns nothing extra; home is where the game suggests.', () => moveHome(g));
      consolidate(g, j);
      appoint(g, j, 'provost', 'A Provost lets the year run at 4x and answers the academic routine.');
      appoint(g, j, 'advancement', 'A VP of Advancement runs the campaigns that bring money in.');
      launchCampaigns(g, j, ['endowment', 'building']);
      if (s.finance.maintenanceFunding === undefined || s.finance.maintenanceFunding > 0.9) {
        j.because('trim-maintenance', 'Maintenance at 90% trims a cost line; the backlog grows slowly.', () => g.act({ type: 'SET_MAINTENANCE_FUNDING', level: 0.9 }));
      }
      if (s.finance.endowment > 0 && drawRate(s) < DRAW_RATE_MAX) {
        j.because('draw-max', 'The endowment pays out more at the top of the draw range: income now.', () => g.act({ type: 'SET_DRAW_RATE', rate: DRAW_RATE_MAX }));
      }
      if (s.finance.sweepWeeks === undefined && s.finance.cash > financeBreakdown(s).totalExpenses * 52) {
        j.because('sweep', 'Idle cash earns nothing; swept into the endowment it pays out.', () => g.act({ type: 'SET_SWEEP', weeks: 13 }));
      }
      if (s.orgs.athleticsBudget !== 'low' && s.orgs.teams.length > 0) {
        j.because('athletics-low', 'The athletics subsidy is a cost; the gate is what pays.', () => g.act({ type: 'SET_ATHLETICS_BUDGET', tier: 'low' }));
      }
      // Crowding shrinks next year's pool: fix it first.
      if (crowdingFirst(g, j, reserve, 'Crowding shrinks next year\'s pool steeply.')) return;
      // Builds only what pays: seats, while the marginal student pays.
      const margin = marginalStudentMargin(s);
      const room = intakeCeiling(s);
      const capped = room.seatsLeft < Math.max(400, s.students.classes.freshman * 0.5);
      if (margin > 0) {
        foundOffers(g, j, reserve, 'A new program adds seats, and the next student pays more than they cost.');
        siteHallIfNeeded(g, j, reserve);
        if (capped) developCourses(g, j, reserve, 'The class filled the room: seats are revenue.');
      } else {
        j.want(s, 'a cheaper next student', `The next thousand students cost more than they pay (margin ${Math.round(margin)} a week); the only levers are the price and the catalogue, not the cost lines.`);
      }
      j.because('dorm', 'Beds keep the pool full and the crowding penalty away.', () => {
        const enrolled = totalEnrolled(s.students);
        if (s.students.capacity > 0 && enrolled / s.students.capacity < 0.95) return;
        const dorm = buildable(s, reserve).find((t) => t.kind === 'dorm');
        if (dorm) site(g, dorm);
      });
      // Labs pay: grants return about twice their cost.
      if (s.clock.week % 4 === 0) {
        const lab = cheapest(buildable(s, reserve).filter((t) => t.facilityType === 'lab'));
        if (lab) j.because('lab', 'A lab\'s grants return about twice what its initiatives cost.', () => site(g, lab));
      }
      fundResearch(g, j, reserveOf(s, 6), true, 'The deepest initiative carries the largest grant.');
      staffTeams(g, j, reserve, false);
      // A venue expanded is more gate.
      for (const team of orderedTeams(s)) {
        const venue = venueForCategory(s, team.venueCategory);
        const plan = venue && venue.status === 'done' ? nextVenueExpansion(venue) : null;
        if (venue && plan && affords(s, plan.cost, reserveOf(s, 12))) {
          j.because('expand-venue', 'A full venue\'s gate is capped by its seats; a rung adds seats.', () => g.act({ type: 'EXPAND_VENUE', venueId: venue.id }));
          break;
        }
      }
      if (margin <= 0 && room.seatsLeft > 2000) {
        j.want(s, 'fewer, fuller sections', 'Empty sections cost the same as full ones; there is no way to merge sections or retire a course to cut the instruction bill.');
      }
    },
    summer(g, j) {
      const s = g.s;
      const income = financeBreakdown(s).tuitionRevenue * 52;
      if (lastIncome !== null) {
        if (income < lastIncome) {
          direction = -direction;
          j.want(s, 'see demand before pricing', 'Last year\'s price change lost income; the price is set blind, so the only test is a year.');
        }
      }
      lastIncome = income;
      factor = Math.min(1.6, Math.max(0.8, factor + 0.05 * direction));
      const tuition = priceAt(s, factor);
      // The admit rate that projects the best weekly net: the modal shows it.
      let best = { rate: s.students.admitRate, net: -Infinity };
      const max = fillRate(s, tuition);
      for (const rate of [...RATES.filter((r) => r < max), max]) {
        const net = project(s, tuition, rate).consequence.weeklyNet;
        if (net > best.net) best = { rate, net };
      }
      return { tuition, admitRate: best.rate };
    },
  };
}

// ---- Prestige ----
// How long a standing that does not move is borne before the player stops
// admitting selectively and fills the class (`adaptive`): a person who sees
// prestige flat for this many summers on a small body tries growth.
const STALL_SUMMERS = 4;
const STALL_RISE = 2;
function prestigePolicy(adaptive = true): Policy {
  const history: number[] = [];
  let fills = false;
  return {
    promises: ['reputationOver', 'teachingOver', 'selectivityOver', 'rankAtLeast'],
    events: 'default',
    petitions: true,
    act(g, j) {
      const s = g.s;
      const reserve = reserveOf(s, 4);
      TEACHING.care = true;
      restaff(g, j);
      j.because('move-home', 'A school gathered in its hall is what concentration counts.', () => moveHome(g));
      consolidate(g, j);
      appoint(g, j, 'provost', 'A Provost lets the year run at 4x and answers the academic routine.');
      appoint(g, j, 'advancement', 'Endowment per student is a prestige input; campaigns build it.');
      launchCampaigns(g, j, ['endowment']);
      if (s.finance.sweepWeeks === undefined && s.finance.cash > financeBreakdown(s).totalExpenses * 26) {
        j.because('sweep', 'Endowment per student is a prestige input.', () => g.act({ type: 'SET_SWEEP', weeks: 26 }));
      }
      if (s.clock.week % 2 === 0) {
        j.because('tend-teaching', 'The teaching standard caps the target: every course a B or better, as many A\'s as can be found.', () => tendTeaching(g, { reserve, hires: 4 }));
      }
      if (crowdingFirst(g, j, reserve, 'Crowding is subtracted from the academic target.')) return;
      const [worst, score] = worstAttribute(s);
      if (score < 70) {
        if (!j.because(`build-${worst}`, 'Welfare is graded on the year\'s average satisfaction.', () => buildFor(g, worst, reserve))) extendFor(g, j, worst, reserve);
      }
      // Library adequacy multiplies breadth.
      j.because('library', 'Library adequacy multiplies curriculum breadth.', () => {
        const lib = s.tech.find((t) => t.facilityType === 'library' && canExtend(t));
        if (lib && s.students.satisfactionBreakdown.academic < 80 && affords(s, extensionCost(lib), reserve)) g.act({ type: 'EXTEND_BUILDING', id: lib.id });
      });
      // Breadth, but only what can be taught well.
      const ceiling = teachingCeiling(s);
      const target = prestigeBreakdown(s).target;
      if (target >= ceiling.value - 1) {
        // Plan 85E: the training program is the lever, for a college
        // specialized in academics once the institute stands.
        if (instituteStands(s)) {
          j.want(s, 'train more of the faculty', `The teaching standard still caps the target at ${ceiling.value.toFixed(0)} with the institute's picks spent: the rest is hiring and firing.`);
        } else {
          j.want(s, 'train the faculty', `The teaching standard caps the target at ${ceiling.value.toFixed(0)}; ${specializationOf(s) ? 'specialized elsewhere, ' : ''}the only way up is to hire better teachers and fire weaker ones — no training for the ones on the roster without the academics specialization's institute.`);
        }
      }
      foundOffers(g, j, reserve, 'Breadth is the heaviest input (50).');
      siteHallIfNeeded(g, j, reserve);
      developCourses(g, j, reserve, 'Every course a finished major needs raises breadth, once it can be taught.', 4);
      postSearchIfStuck(g, j, reserve);
      foundGraduate(g, j, reserve);
      if (s.clock.week % 4 === 0) {
        const lab = cheapest(buildable(s, reserve).filter((t) => t.facilityType === 'lab' || t.project !== undefined));
        if (lab) j.because('lab', 'Research standing and the academic research input need labs.', () => site(g, lab));
      }
      fundResearch(g, j, reserveOf(s, 5), true, 'Depth: a landmark program is worth more to research standing than two small ones.');
      // Incoming quality: once the admit rate is at the top band and still
      // low, there is nothing else to spend on it.
      const quality = s.students.incomingQuality;
      if (quality < 70 && s.students.admitRate <= topBandShare(s.self.reputation, s.finance.listedTuition) + 0.02) {
        j.want(s, 'merit aid', `Incoming quality is ${quality.toFixed(0)} with the admit rate already at the top band; there is no scholarship or aid lever to draw stronger applicants.`);
      }
      if (s.clock.week === 26) {
        const [label, sc] = worstAttribute(s);
        if (sc < 40 && !remedyExists(s, label)) j.want(s, `raise ${label}`, `${label} is ${sc.toFixed(0)} and nothing on the menu serves it.`);
      }
    },
    summer(g, j) {
      const s = g.s;
      const tuition = priceAt(s, 1.0);
      history.push(s.self.reputation);
      // Selectivity that has not moved the standing in STALL_SUMMERS
      // summers is given up for good (Plan 85's slower prestige made this
      // the October rule's trap: see 4-strategy.md).
      const back = history[history.length - 1 - STALL_SUMMERS];
      if (adaptive && !fills && back !== undefined && s.self.reputation - back < STALL_RISE && playerRank(s) > 20) {
        fills = true;
        j.mark(s, 'gave up selectivity');
        j.want(s, 'a way up for a small college', `Prestige moved ${(s.self.reputation - back).toFixed(1)} in ${STALL_SUMMERS} summers of selective admissions; the standing says why in pillars, but a small college has no pillar it can raise without growing.`);
      }
      // The top band and a little of the next: quality over size.
      const rate = fills ? fillRate(s, tuition) : Math.min(fillRate(s, tuition), Math.max(0.05, topBandShare(s.self.reputation, tuition) + 0.12));
      return { tuition, admitRate: rate };
    },
  };
}

// ---- Satisfaction ----
// Crowding starts below 85% coverage (prestigeSystem.ts's CROWDING_GRACE);
// this college keeps a margin over it.
const NEVER_CROWDED = CROWDING_GRACE + 0.05;
function satisfactionPolicy(): Policy {
  return {
    promises: ['satisfactionOver', 'beautyOver', 'warmthOver', 'moodOver'],
    events: 'popular',
    petitions: true,
    act(g, j) {
      const s = g.s;
      const reserve = reserveOf(s, 3);
      TEACHING.care = true;
      restaff(g, j);
      j.because('move-home', 'Programs at home.', () => moveHome(g));
      consolidate(g, j);
      appoint(g, j, 'provost', 'A Provost lets the year run at 4x.');
      appoint(g, j, 'dean-of-students', 'A Dean of Students answers the student routine by what lands best.');
      if (s.clock.week % 13 === 0 || s.clock.week === 1) {
        // Each term: whatever need is lowest.
        for (const attribute of [...ATTRIBUTES].sort((a, b) => s.students.satisfactionBreakdown[a] - s.students.satisfactionBreakdown[b])) {
          const score = s.students.satisfactionBreakdown[attribute];
          if (score >= 90) break;
          const built = j.because(`build-${attribute}`, `The lowest need this term is ${attribute}.`, () => buildFor(g, attribute, reserve))
            || extendFor(g, j, attribute, reserve);
          if (built) break;
          if (!remedyExists(s, attribute)) {
            j.want(s, `raise ${attribute}`, `${attribute} is ${score.toFixed(0)} and nothing on the build menu serves it — the chain is built out or gated.`);
          }
        }
      }
      if (crowdingFirst(g, j, reserve, 'Crowding is the one thing this college never allows.')) return;
      if (s.clock.week % TEND_EVERY_WEEKS === 0) {
        j.because('tend-teaching', 'Academic satisfaction reads every course\'s grade against what the students expect.', () => tendTeaching(g, { reserve, hires: 2 }));
      }
      foundOffers(g, j, reserve, 'Programs add seats and study places; the college grows at the pace it can house.');
      siteHallIfNeeded(g, j, reserve);
      developCourses(g, j, reserve, 'Courses add seats; a crowded class is a crowded campus.', 3);
      postSearchIfStuck(g, j, reserve);
      staffTeams(g, j, reserve, false);
      // Social: the rec center and student center chain are satisfaction too.
      const social = cheapest(buildable(s, reserve).filter((t) => t.effects?.satisfactionAttribute === 'social' && !t.athleticsVenueReveal));
      if (social && s.students.satisfactionBreakdown.social < 95) j.because('build-social', 'Social space is a need too.', () => site(g, social));
      // Beauty (amenities) lifts the pool and the mood.
      const amenity = cheapest(buildable(s, reserveOf(s, 8)).filter((t) => t.facilityType === 'amenity'));
      if (amenity) j.because('amenity', 'A campus that looks cared for is one students like.', () => site(g, amenity));
      if (s.students.satisfaction < 60 && ATTRIBUTES.every((a) => s.students.satisfactionBreakdown[a] >= 70)) {
        j.want(s, 'see why satisfaction is low', `Satisfaction is ${s.students.satisfaction.toFixed(0)} while every need scores 70 or more.`);
      }
    },
    summer(g, j) {
      const s = g.s;
      // A price students feel is fair lifts basic needs (affordability).
      const tuition = priceAt(s, 0.85);
      // The largest class that leaves every need covered.
      const max = fillRate(s, tuition);
      let chosen = RATES[0];
      for (const rate of [...RATES.filter((r) => r < max), max]) {
        const c = project(s, tuition, rate).consequence;
        if (c.tightestCoverage >= NEVER_CROWDED) chosen = rate;
      }
      const c = project(s, tuition, chosen).consequence;
      if (c.tightestCoverage < NEVER_CROWDED) {
        j.want(s, 'shrink the student body', 'Even the smallest class leaves a need short: the body on the books is already too big for the campus, and nothing but attrition can shrink it.');
      }
      return { tuition, admitRate: chosen };
    },
  };
}

// ---- Every campus asset ----
function assetsPolicy(): Policy {
  return {
    promises: ['buildingsOver', 'projectsOver', 'schoolsOver', 'programsOver', 'beautyOver'],
    events: 'default',
    petitions: true,
    act(g, j) {
      const s = g.s;
      const reserve = reserveOf(s, 2);
      restaff(g, j);
      j.because('move-home', 'Schools founded open labs and graduate projects.', () => moveHome(g));
      consolidate(g, j);
      appoint(g, j, 'provost', 'A Provost lets the year run at 4x.');
      if (crowdingFirst(g, j, reserve, 'Crowding first: it shrinks the pool that pays for everything.')) return;
      // The whole catalogue of placeables: the cheapest on the menu first,
      // borrowing when cash will not cover it.
      const next = cheapest(menu(s));
      if (next) {
        const placed = j.because('build-next-asset', 'The cheapest asset on the menu; borrow for it if cash is short.', () => place(g, next, reserve, true));
        if (!placed && !affords(s, next.cost, reserve)) j.because('save', 'Saving for the next asset.', () => false);
      }
      // What stands between the menu and the rest: gates.
      if (s.clock.week === 1) {
        const locked = s.tech.filter((t) => isPlaceableKind(t) && t.status === 'locked');
        const blocked = locked.filter((t) => t.facilityType !== 'landmark').slice(0, 3);
        if (menu(s).length === 0 && blocked.length > 0) {
          j.want(s, 'build what is locked', `Everything on the menu stands; ${locked.length} assets are still gated (${blocked.map((t) => t.name).join(', ')}…) by enrolment, prestige or a school.`);
        }
      }
      // The curriculum opens labs, graduate projects and the rest.
      foundOffers(g, j, reserve, 'Schools founded open their labs and, distinguished, the graduate projects.');
      siteHallIfNeeded(g, j, reserve);
      developCourses(g, j, reserve, 'A distinguished school opens its graduate project.', 4);
      postSearchIfStuck(g, j, reserve);
      foundGraduate(g, j, reserve);
      staffTeams(g, j, reserve, false);
      fundResearch(g, j, reserveOf(s, 4), false, 'The Research Park waits on every standing lab having seen an initiative through (and, since Plan 85F, on a specialization in research).');
      if (s.clock.week % TEND_EVERY_WEEKS === 0) j.because('tend-teaching', 'Keep the teaching up.', () => tendTeaching(g, { reserve }));
    },
    summer(g) {
      const s = g.s;
      const tuition = priceAt(s, 1.0);
      return { tuition, admitRate: fillRate(s, tuition) };
    },
  };
}

// ---- Championships ----
// A finish that reached the last four.
const FINAL_FOUR: readonly string[] = ['semifinal', 'final', 'champion'];
// How many sports it makes its flagships (Plan 80G: "one or two").
const CHOSEN_FLAGSHIPS = 2;

function championshipsPolicy(): Policy {
  // Postseasons missed in a row, per sport (lastSeason is overwritten yearly).
  const missedSeasons = new Map<string, number>();
  const counted = new Set<string>();
  // The sports it chose as flagships, in the order it chose them, kept.
  const chosen: string[] = [];
  return {
    promises: ['varsityAtLeast', 'titlesAtLeast', 'satisfactionOver'],
    events: 'athletics',
    petitions: true,
    act(g, j) {
      const s = g.s;
      const reserve = reserveOf(s, 3);
      for (const result of Object.values(s.orgs.lastSeason ?? {})) {
        const key = `${result.sport}:${result.year}`;
        if (counted.has(key)) continue;
        counted.add(key);
        missedSeasons.set(result.sport, result.finish === 'missed' ? (missedSeasons.get(result.sport) ?? 0) + 1 : 0);
        const flagship = j.rec.flagships?.find((f) => f.sport === result.sport);
        if (flagship && flagship.finalFour === undefined && FINAL_FOUR.includes(result.finish)) flagship.finalFour = result.year;
      }
      restaff(g, j);
      j.because('move-home', 'Programs at home.', () => moveHome(g));
      consolidate(g, j);
      appoint(g, j, 'provost', 'A Provost lets the year run at 4x.');
      // A student center first: clubs, then sport clubs, then varsity.
      const center = cheapest(menu(s).filter((t) => t.facilityType === 'studentCenter'));
      if (center && !s.tech.some((t) => t.facilityType === 'studentCenter' && (t.status === 'done' || t.status === 'developing'))) {
        j.because('student-center', 'Sport clubs form only once a student center stands.', () => place(g, center, reserve, true));
      }
      if (s.orgs.teams.length === 0 && s.clock.year >= 4) {
        j.want(s, 'found a team', 'No varsity program yet: a team can only come from a student sport club, three years old, petitioning in the summer — there is no way to start one.');
      }
      if (s.orgs.teams.length > 0 && s.orgs.athleticsBudget !== 'high') {
        j.because('athletics-high', 'The high tier funds more programs to full strength.', () => g.act({ type: 'SET_ATHLETICS_BUDGET', tier: 'high' }));
      }
      staffTeams(g, j, reserve, true);
      // The flagships: one or two sports chosen once and kept — the
      // strongest active program when a place is free — at the top of the
      // list, the rest by strength below them.
      const teams = orderedTeams(s).filter((t) => t.status === 'active');
      // The Athletic Performance Complex's slots (Plan 85G) are chosen too.
      const chooses = CHOSEN_FLAGSHIPS + complexFlagships(s);
      if (chosen.length < chooses) {
        const next = [...teams].filter((t) => !chosen.includes(t.sport)).sort((a, b) => teamQuality(b, s) - teamQuality(a, s))[0];
        if (next) chosen.push(next.sport);
      }
      if (teams.length > 1 && s.clock.week % 13 === 0) {
        const rank = (sport: string) => (chosen.includes(sport) ? chosen.indexOf(sport) : chooses);
        const sorted = [...teams].sort((a, b) => rank(a.sport) - rank(b.sport) || teamQuality(b, s) - teamQuality(a, s));
        const order = sorted.map((t) => t.id);
        const current = (s.orgs.teamOrder ?? []).filter((id) => order.includes(id));
        if (order.join() !== current.join()) {
          j.because('team-order', 'The chosen flagships first on the list, the strongest of the rest below them.', () => g.act({ type: 'SET_TEAM_ORDER', order: [...order, ...(s.orgs.teamOrder ?? []).filter((id) => !order.includes(id))] }));
        }
      }
      // Full scholarships on each chosen flagship, once the week can carry them.
      for (const team of teams) {
        if (!chosen.includes(team.sport) || team.scholarships === 'full' || !isFlagship(s, team)) continue;
        if (weeklyNet(s) * WEEKS_PER_YEAR < scholarshipCostFor(team.sport, 'full')) continue;
        if (j.because('scholarships', 'A chosen flagship on full scholarships: recruiting builds the team a class a year.', () => g.act({ type: 'SET_SCHOLARSHIPS', teamId: team.id, level: 'full' }))) {
          const list = (j.rec.flagships ??= []);
          if (!list.some((f) => f.sport === team.sport)) list.push({ sport: team.sport, chosen: s.clock.year });
        }
      }
      // More seats at the venues: more gate, more pot.
      for (const team of teams) {
        const venue = venueForCategory(s, team.venueCategory);
        const plan = venue && venue.status === 'done' ? nextVenueExpansion(venue) : null;
        if (venue && plan && affords(s, plan.cost, reserve)) {
          j.because('expand-venue', 'A bigger venue is a bigger gate, and the gate is the department\'s pot.', () => g.act({ type: 'EXPAND_VENUE', venueId: venue.id }));
          break;
        }
      }
      const house = menu(s).find((t) => t.id === 'ATH-FIELDHOUSE');
      if (house) j.because('field-house', 'The field house lifts every program\'s coaching.', () => place(g, house, reserve, true));
      // Specialized in athletics (Plan 85G): the complex, once it opens.
      const complex = menu(s).find((t) => t.id === ATHLETICS_COMPLEX_ID);
      if (complex) j.because('athletics-complex', 'The Athletic Performance Complex: more flagships, better recruiting, a stronger college deep in the postseason.', () => place(g, complex, reserve, true));
      // Titles need rivals beaten; once coaches and budget are maxed, nothing else moves team quality.
      if (s.clock.week === 40 && teams.length > 0) {
        const weakest = [...teams].sort((a, b) => teamQuality(a, s) - teamQuality(b, s))[0];
        const staffed = teams.every((t) => t.headCoach && t.assistantCoach && t.trainer);
        if (staffed && s.orgs.athleticsBudget === 'high' && !isFlagship(s, weakest) && teamQuality(weakest, s) < 70) {
          j.want(s, 'recruit athletes', `Every chair is filled and the budget is at its top; ${weakest.name} still scores ${teamQuality(weakest, s).toFixed(0)}, and only a flagship can recruit.`);
        }
        // Cutting the program (Plan 95V): the rule that wanted it, now acted
        // on. A flagship is not cut in season; the weakest rarely is one.
        const missed = missedSeasons.get(weakest.sport) ?? 0;
        if (missed >= 5 && cutRefusal(s, weakest.id) === null) {
          const sport = weakest.sport;
          if (j.because('cut-program', 'A program that has missed the postseason five times is cut: its money goes to the rest.', () => g.act({ type: 'CUT_TEAM', teamId: weakest.id }))) {
            (j.rec.cuts ??= []).push({ sport, year: s.clock.year });
            missedSeasons.delete(sport);
          }
        }
      }
      // Money to pay for it: the academic core, Completionist-style.
      if (crowdingFirst(g, j, reserve, 'Crowding shrinks the pool that pays for athletics.')) return;
      const [worst, score] = worstAttribute(s);
      if (score < 55) j.because(`build-${worst}`, 'Keep the campus livable.', () => buildFor(g, worst, reserve));
      foundOffers(g, j, reserve, 'Programs grow the college that pays for the department.');
      siteHallIfNeeded(g, j, reserve);
      developCourses(g, j, reserve, 'Seats are students, and students fill stands.', 3);
      j.because('dorm', 'Beds keep the pool full.', () => {
        const enrolled = totalEnrolled(s.students);
        if (s.students.capacity > 0 && enrolled / s.students.capacity < 0.9) return;
        const dorm = buildable(s, reserve).find((t) => t.kind === 'dorm');
        if (dorm) site(g, dorm);
      });
      if (s.clock.week % TEND_EVERY_WEEKS === 0) j.because('tend-teaching', 'Keep the teaching up.', () => tendTeaching(g, { reserve }));
      // Rec facilities that come with athletics (gym, pool, tennis) are
      // the athletes' too.
      const rec = cheapest(buildable(s, reserveOf(s, 6)).filter((t) => ['gym', 'pool', 'tennisCourts', 'recCenter'].includes(t.facilityType ?? '')));
      if (rec) j.because('rec', 'Recreation facilities are where a sporting culture starts.', () => site(g, rec));
    },
    summer(g) {
      const s = g.s;
      const tuition = priceAt(s, 1.0);
      return { tuition, admitRate: fillRate(s, tuition) };
    },
  };
}

// ---- Good then big / big then good ----
function phasedPolicy(goodFirst: boolean): Policy {
  // Good first stays small whatever the standing does: that is its premise.
  const small = prestigePolicy(!goodFirst);
  const big: Policy = {
    promises: ['enrolledOver', 'programsOver', 'schoolsOver', 'buildingsOver'],
    events: 'default',
    petitions: true,
    act(g, j) {
      const s = g.s;
      const reserve = reserveOf(s, 2);
      TEACHING.care = goodFirst;   // growing first means cheapest hires
      restaff(g, j);
      j.because('move-home', 'Programs at home.', () => moveHome(g));
      consolidate(g, j);
      appoint(g, j, 'provost', 'A Provost lets the year run at 4x.');
      if (crowdingFirst(g, j, reserve, 'Growth stalls if the pool shrinks from crowding.')) return;
      foundOffers(g, j, reserve, 'Every program adds seats: grow.', 8);
      siteHallIfNeeded(g, j, reserve);
      developCourses(g, j, reserve, 'Seats are the ceiling on enrolment.', 10);
      postSearchIfStuck(g, j, reserve);
      j.because('dorm', 'Beds keep the pool full.', () => {
        const enrolled = totalEnrolled(s.students);
        if (s.students.capacity > 0 && enrolled / s.students.capacity < 0.85) return;
        const dorm = buildable(s, reserve).find((t) => t.kind === 'dorm');
        if (dorm) site(g, dorm);
      });
      const [worst, score] = worstAttribute(s);
      if (score < 55) j.because(`build-${worst}`, 'Keep the campus livable while it grows.', () => buildFor(g, worst, reserve));
      foundGraduate(g, j, reserve);
      staffTeams(g, j, reserve, false);
      if (goodFirst && s.clock.week % TEND_EVERY_WEEKS === 0) j.because('tend-teaching', 'Keep the standard it built.', () => tendTeaching(g, { reserve }));
      if (s.clock.week % 4 === 0) {
        const lab = cheapest(buildable(s, reserve).filter((t) => t.facilityType === 'lab' || t.project !== undefined));
        if (lab) j.because('lab', 'Labs and projects as they open.', () => site(g, lab));
      }
      fundResearch(g, j, reserveOf(s, 5), false, 'Keep the labs busy, cheaply.');
      const room = intakeCeiling(s);
      if (room.seatsLeft < 200 && s.tech.every((t) => !(t.kind === 'course' && t.status === 'available' && canStartDevelopment(s, t)))) {
        j.want(s, 'more seats now', 'The class fills every seat and no course can be started this week: the committee\'s seats, the faculty market or the hall slots are the ceiling on growth, not money.');
      }
    },
    summer(g) {
      const s = g.s;
      const tuition = priceAt(s, goodFirst ? 1.0 : 0.9);
      return { tuition, admitRate: fillRate(s, tuition) };
    },
  };
  // Good first: the prestige policy with a cap on programs; big first: grow.
  const smallCapped: Policy = {
    ...small,
    act(g, j) {
      const standing = Object.values(g.s.halls).flat().filter((x) => x.programId !== null).length;
      if (standing >= 12) {
        // Twelve programs: stop founding, deepen and tend.
        const offers = g.s.programOffers;
        g.s.programOffers = [];
        try { small.act(g, j); } finally { g.s.programOffers = offers; }
        if (g.s.clock.week === 1) j.want(g.s, 'stay small on purpose', 'Twelve programs and the offers keep coming; the only way to stay small is to ignore them.');
        return;
      }
      small.act(g, j);
    },
  };
  const bigThenFix: Policy = {
    ...small,
    act(g, j) {
      small.act(g, j);
      // Fixing quality on a big body: selective admissions, and the
      // teaching tended; nothing lets the body shrink faster than it
      // graduates.
      if (g.s.clock.week === 26 && totalEnrolled(g.s.students) > intakeCeiling(g.s).capacity) {
        j.want(g.s, 'shrink the student body', 'The body is bigger than the catalogue seats; only graduation shrinks it.');
      }
    },
  };
  const early = goodFirst ? smallCapped : big;
  const late = goodFirst ? big : bigThenFix;
  return {
    promises: [...new Set([...early.promises, ...late.promises])],
    events: 'default',
    petitions: true,
    act(g, j) {
      if (g.s.clock.year > SWITCH_YEAR) {
        if (j.rec.switched === undefined) j.rec.switched = g.s.clock.year;
        late.act(g, j);
      } else {
        early.act(g, j);
      }
    },
    summer(g, j) {
      return (g.s.clock.year >= SWITCH_YEAR ? late : early).summer(g, j);
    },
  };
}

function policyFor(goal: Goal): Policy {
  switch (goal) {
    case 'revenue': return revenuePolicy();
    case 'prestige': return prestigePolicy();
    case 'satisfaction': return satisfactionPolicy();
    case 'assets': return assetsPolicy();
    case 'championships': return championshipsPolicy();
    case 'good-then-big': return phasedPolicy(true);
    case 'big-then-good': return phasedPolicy(false);
  }
}

// ---------------------------------------------------------------------
// Answers.
// ---------------------------------------------------------------------

function answerFor(g: Game, j: Journal, policy: Policy, plan: { current: SummerPlan | null }): Action | null {
  const s = g.s;
  const pending = s.pendingInterrupt;
  if (!pending) return null;
  if (pending.type === 'summer') {
    const payload = pending.payload as { beat?: number } | undefined;
    const beat = payload?.beat ?? 0;
    if (beat === 0) {
      // The promises on offer, if the goal cares about every condition.
      const offer = s.promises?.offer?.ids ?? [];
      const take = offer.filter((id) => {
        const def = promiseById(id);
        return !!def && Object.keys(def.goal).every((k) => policy.promises.includes(k));
      });
      j.rec.promisesTaken.push(...take);
      plan.current = null;
      return { type: 'RESOLVE_SUMMER_BEAT', promises: take };
    }
    if (beat < SUMMER_LAST_BEAT - 1) return { type: 'RESOLVE_SUMMER_BEAT' };
    plan.current ??= policy.summer(g, j);
    if (beat === SUMMER_LAST_BEAT - 1) return { type: 'RESOLVE_SUMMER_BEAT', decision: plan.current };
    const petitions = policy.petitions ? s.orgs.pendingPetitions.map((p) => p.id) : [];
    return { type: 'RESOLVE_ADMISSIONS', ...plan.current, approvedPetitionIds: petitions };
  }
  // The specialization is the goal's: null hands it to game.ts's rule (the
  // player is asked first, so the game's default here would put it off for
  // good, which is what every goal player did before this line).
  if (pending.type === 'specialization') return null;
  if (pending.type === 'athletic-director' && policy.events === 'athletics') {
    const payload = pending.payload as { candidates?: Array<{ quality: number }>; mascotSuggestion?: string } | undefined;
    const best = [...(payload?.candidates ?? [])].sort((a, b) => b.quality - a.quality)[0] ?? null;
    return { type: 'RESOLVE_ATHLETIC_DIRECTOR', candidate: best as never, mascot: payload?.mascotSuggestion ?? '' };
  }
  if (pending.type === 'decision-event' && policy.events !== 'default') {
    const payload = pending.payload as { eventId: string; ctx: DecisionEventContext } | undefined;
    const event = payload ? findDecisionEvent(payload.eventId) : undefined;
    if (event && payload) {
      const offered = offeredChoices(s, event, payload.ctx).filter((c) => c.cost(s, payload.ctx) <= s.finance.cash);
      if (offered.length > 0) {
        let choice = offered[0];
        if (policy.events === 'thrifty') choice = [...offered].sort((a, b) => a.cost(s, payload.ctx) - b.cost(s, payload.ctx))[0];
        if (policy.events === 'popular') choice = [...offered].sort((a, b) => (b.mood ?? 0) - (a.mood ?? 0) || a.cost(s, payload.ctx) - b.cost(s, payload.ctx))[0];
        if (policy.events === 'athletics') {
          const athletic = ['varsity-petition', 'coach-poached', 'ad-shortage', 'recruiting-scandal'].includes(event.id);
          choice = athletic ? offered[0] : [...offered].sort((a, b) => a.cost(s, payload.ctx) - b.cost(s, payload.ctx))[0];
        }
        return { type: 'RESOLVE_DECISION_EVENT', eventId: event.id, choiceId: choice.id, ctx: payload.ctx };
      }
    }
  }
  return defaultAnswer(s);
}

// ---------------------------------------------------------------------
// One run.
// ---------------------------------------------------------------------

function goalMarks(s: GameState, j: Journal, goal: Goal): void {
  const rank = playerRank(s);
  if (rank <= 50) j.mark(s, 'top 50');
  if (rank <= 25) j.mark(s, 'top 25');
  if (rank <= 20) j.mark(s, 'top 20');
  if (rank <= 10) j.mark(s, 'top 10');
  if (rank === 1) j.mark(s, 'first');
  if (s.orgs.titles.length > 0) j.mark(s, 'first title');
  if (Object.values(s.orgs.lastSeason ?? {}).some((r) => FINAL_FOUR.includes(r.finish))) j.mark(s, 'final four');
  if (s.orgs.teams.length > 0) j.mark(s, 'first team');
  if (totalEnrolled(s.students) >= 10_000) j.mark(s, '10,000 students');
  if (s.students.satisfaction >= 90) j.mark(s, 'satisfaction 90');
  if (weeklyNet(s) >= 1_000_000) j.mark(s, 'net $1M/wk');
  const left = s.tech.filter((t) => isPlaceableKind(t) && t.status !== 'done' && t.status !== 'developing' && t.facilityType !== 'landmark');
  if (left.length === 0) j.mark(s, 'every asset');
  // Plan 85: three of the four specialization buildings never open.
  const closed = new Set(Object.entries(SPECIALTY_BUILDING).filter(([p]) => p !== specializationOf(s)).map(([, id]) => id));
  if (left.every((t) => closed.has(t.id))) j.mark(s, 'every asset open to it');
  if (milestoneSchools().every((m) => s.milestones[schoolFoundedKey(m.schoolName)])) j.mark(s, 'every school');
  if (goal === 'satisfaction' && ATTRIBUTES.every((a) => s.students.satisfactionBreakdown[a] >= 90)) j.mark(s, 'every need 90');
}

// Once specialized: the pillar's own building, as soon as it is on the
// menu (borrowing if it must), and what the choice closed off.
function specialty(g: Game, j: Journal, goal: Goal): void {
  const s = g.s;
  const chosen = specializationOf(s);
  if (!chosen) return;
  if (j.rec.specialization === undefined) {
    j.rec.specialization = chosen;
    j.rec.specializationYear = s.specializationYear;
    const why = specializationRule === undefined ? GOAL_SPECIALIZATION[goal].why : 'A fixed pick for the run.';
    j.rec.reasons[`specialize-${chosen}`] = why;
  }
  const id = SPECIALTY_BUILDING[chosen];
  const building = id ? menu(s).find((t) => t.id === id) : undefined;
  if (building) j.because(`specialty-${chosen}`, 'The specialization\'s own building, the moment it opens.', () => place(g, building, reserveOf(s, 2), true));
  if (goal === 'assets' && s.clock.week === 1) {
    const closed = Object.entries(SPECIALTY_BUILDING).filter(([p]) => p !== chosen).map(([, b]) => s.tech.find((t) => t.id === b)?.name).filter(Boolean);
    j.want(s, 'build every specialization\'s building', `The choice is for good: ${closed.join(', ')} can never stand on this campus.`);
  }
}
let specializationRule: SpecializationRule | undefined;

export function playGoal(goal: Goal, seed: number, name: string, years = YEARS, specialization?: SpecializationRule): RunRecord {
  const t0 = Date.now();
  specializationRule = specialization;
  const j = new Journal(goal, seed, name);
  const policy = policyFor(goal);
  const plan: { current: SummerPlan | null } = { current: null };
  const g = foundGame({ seed, name });
  j.attach(g);
  let lastYear = 0;
  const pick = GOAL_SPECIALIZATION[goal];
  const player: Player = {
    name: goal,
    // Plan 85D's hook: the goal's own pillar, or a fixed rule given.
    specialization: specialization ?? pick.pillar,
    // The championships player runs its own department; specialized in
    // athletics it also fills the complex's flagship slots (Plan 85G).
    ...(goal === 'championships' ? { athletics: false as const } : {}),
    act(game) {
      if (game.s.clock.year !== lastYear) {
        lastYear = game.s.clock.year;
        j.row(game.s);
        const broken = brokenRules(game.s);
        for (const b of broken) if (!j.rec.broken.includes(b)) j.rec.broken.push(b);
      }
      goalMarks(game.s, j, goal);
      specialty(game, j, goal);
      policy.act(game, j);
      j.endWeek(game.s);
    },
    answer: (game) => answerFor(game, j, policy, plan),
  };
  const endYear = g.s.clock.year + years;
  const limit = years * 52 * 4 + 100;
  try {
    for (let i = 0; i < limit && g.s.clock.year < endYear; i += 1) playWeek(g, player);
    j.row(g.s);
  } catch (e) {
    j.rec.error = e instanceof Error ? `${e.message}\n${e.stack}` : String(e);
  }
  if (g.s.specialization !== 'none') {
    j.rec.specialization = g.s.specialization;
    j.rec.specializationYear = g.s.specializationYear;
  }
  const report = g.s.ending?.report ?? (g.s.clock.year >= 50 ? finalReport(g.s) : null);
  if (report) {
    j.rec.final = {
      title: report.title, mark: report.mark,
      axes: report.axes.map((a) => ({ label: a.label, grade: a.grade, mean: Math.round(a.mean) })),
      kept: report.kept.length, missed: report.missed.length,
    };
  }
  j.rec.seconds = (Date.now() - t0) / 1000;
  return j.rec;
}

// ---------------------------------------------------------------------
// The report.
// ---------------------------------------------------------------------

const median = (xs: number[]) => {
  const v = xs.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  return v.length === 0 ? NaN : v[Math.floor((v.length - 1) / 2)];
};
const fmtMoney = (n: number) => {
  const a = Math.abs(n);
  const s = a >= 1e9 ? `$${(a / 1e9).toFixed(1)}B` : a >= 1e6 ? `$${(a / 1e6).toFixed(1)}M` : a >= 1e3 ? `$${(a / 1e3).toFixed(0)}k` : `$${a.toFixed(0)}`;
  return n < 0 ? `−${s}` : s;
};
const fmt = (n: number, d = 0) => (Number.isFinite(n) ? n.toFixed(d) : '—');

function rowAt(r: RunRecord, year: number): Row | undefined {
  return r.years.find((y) => y.year === year) ?? (year >= 50 ? r.years[r.years.length - 1] : undefined);
}

export function writeReport(runs: RunRecord[], out: string): void {
  const lines: string[] = [];
  const goals = GOALS.filter((gl) => runs.some((r) => r.goal === gl));
  const seeds = [...new Set(runs.map((r) => r.seed))];
  const names = [...new Set(runs.map((r) => r.name))];
  lines.push('# The goal players', '');
  lines.push(`Written by \`npm run review:goals\` (\`tools/review/goalPlayers.ts\`): ${goals.length} goals × ${seeds.length} seeds (${seeds.join(', ')}) × ${names.length} names (${names.join(', ')}), ${runs.length} runs, ${Math.round(runs.reduce((t, r) => t + r.seconds, 0) / 60)} run-minutes. Medians across every run of a goal unless said.`, '');
  const errors = runs.filter((r) => r.error);
  if (errors.length > 0) {
    lines.push('## Runs that failed', '');
    for (const r of errors) lines.push(`- ${r.goal} seed ${r.seed} ${r.name}: ${r.error!.split('\n')[0]}`);
    lines.push('');
  }
  const broken = runs.filter((r) => r.broken.length > 0);
  if (broken.length > 0) {
    lines.push('## Rules broken (sim/harness/invariants.ts)', '');
    for (const r of broken) lines.push(`- ${r.goal} seed ${r.seed} ${r.name}: ${r.broken.slice(0, 5).join('; ')}`);
    lines.push('');
  }

  // The comparison table.
  lines.push('## The seven compared, at year 50', '');
  lines.push('| Goal | Rank | Prestige | Students | Satisfaction | Net/wk | Cash | Endowment | Courses | Schools | Placeables | Teams | Titles | Grade A share | Title (most common) |');
  lines.push('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
  for (const goal of goals) {
    const rs = runs.filter((r) => r.goal === goal && !r.error);
    const at = rs.map((r) => rowAt(r, 51) ?? r.years[r.years.length - 1]).filter((x): x is Row => !!x);
    const titles = new Map<string, number>();
    for (const r of rs) if (r.final) titles.set(r.final.title, (titles.get(r.final.title) ?? 0) + 1);
    const title = [...titles.entries()].sort((a, b) => b[1] - a[1])[0];
    lines.push(`| ${goal} | ${fmt(median(at.map((x) => x.rank)))} | ${fmt(median(at.map((x) => x.prestige)))} | ${fmt(median(at.map((x) => x.enrolled)))} | ${fmt(median(at.map((x) => x.satisfaction)))} | ${fmtMoney(median(at.map((x) => x.net)))} | ${fmtMoney(median(at.map((x) => x.cash)))} | ${fmtMoney(median(at.map((x) => x.endowment)))} | ${fmt(median(at.map((x) => x.courses)))} | ${fmt(median(at.map((x) => x.schools)))} | ${fmt(median(at.map((x) => x.placeables)))} | ${fmt(median(at.map((x) => x.teams)))} | ${fmt(median(at.map((x) => x.titles)))} | ${fmt(median(at.map((x) => x.gradeA)) * 100)}% | ${title ? `${title[0]} (${title[1]}/${rs.length})` : '—'} |`);
  }
  lines.push('');

  // The specializations (Plan 85D).
  lines.push('## The specializations', '', 'The pillar each goal chose at the milestone (the top 20) and when; the four pillars\' values at Year 50 (academics / research / student life / athletics, median), and the college\'s place in the research, campus-life and athletic standings.', '');
  lines.push('| Goal | Chose (runs) | Year (median, range) | Never offered | Pillars Y50 | Research / life / athletic rank Y50 | Trained professors Y50 |');
  lines.push('|---|---|---|---|---|---|---|');
  for (const goal of goals) {
    const rs = runs.filter((r) => r.goal === goal && !r.error);
    const picks = new Map<string, number>();
    for (const r of rs) if (r.specialization) picks.set(r.specialization, (picks.get(r.specialization) ?? 0) + 1);
    const yrs = rs.map((r) => r.specializationYear).filter((y): y is number => y !== undefined);
    const at = rs.map((r) => rowAt(r, 51) ?? r.years[r.years.length - 1]).filter((x): x is Row => !!x && !!x.pillars);
    const pill = [0, 1, 2, 3].map((i) => fmt(median(at.map((x) => x.pillars[i])))).join(' / ');
    lines.push(`| ${goal} | ${[...picks.entries()].map(([p, n]) => `${p} ×${n}`).join(', ') || '—'} | ${yrs.length ? `${median(yrs)} (${Math.min(...yrs)}–${Math.max(...yrs)})` : '—'} | ${rs.length - yrs.length}/${rs.length} | ${pill} | ${fmt(median(at.map((x) => x.researchRank)))} / ${fmt(median(at.map((x) => x.lifeRank)))} / ${fmt(median(at.map((x) => x.athleticRank)))} | ${fmt(median(at.map((x) => x.trained)))} |`);
  }
  lines.push('');

  // The curves.
  lines.push('## The curves', '', 'Median across runs, at years 5, 10, 20, 30, 40 and 50.', '');
  const AT = [5, 10, 20, 30, 40, 50];
  for (const [label, read] of [
    ['Rank', (x: Row) => x.rank], ['Prestige', (x: Row) => x.prestige], ['Students', (x: Row) => x.enrolled],
    ['Satisfaction', (x: Row) => x.satisfaction], ['Net a week', (x: Row) => x.net], ['Courses', (x: Row) => x.courses],
  ] as const) {
    lines.push(`**${label}**`, '');
    lines.push(`| Goal | ${AT.map((y) => `Y${y}`).join(' | ')} |`);
    lines.push(`|---|${AT.map(() => '---').join('|')}|`);
    for (const goal of goals) {
      const rs = runs.filter((r) => r.goal === goal && !r.error);
      const cells = AT.map((y) => {
        const v = median(rs.map((r) => rowAt(r, y)).filter((x): x is Row => !!x).map(read));
        return label === 'Net a week' ? fmtMoney(v) : fmt(v);
      });
      lines.push(`| ${goal} | ${cells.join(' | ')} |`);
    }
    lines.push('');
  }

  // Marks: when each goal got there.
  lines.push('## When each got there', '', 'The median year a marker was first reached, and in how many runs.', '');
  const markKeys = [...new Set(runs.flatMap((r) => Object.keys(r.marks)))].sort();
  lines.push(`| Goal | ${markKeys.join(' | ')} |`);
  lines.push(`|---|${markKeys.map(() => '---').join('|')}|`);
  for (const goal of goals) {
    const rs = runs.filter((r) => r.goal === goal && !r.error);
    const cells = markKeys.map((k) => {
      const ys = rs.map((r) => r.marks[k]).filter((y): y is number => y !== undefined);
      return ys.length === 0 ? '—' : `${median(ys)} (${ys.length}/${rs.length})`;
    });
    lines.push(`| ${goal} | ${cells.join(' | ')} |`);
  }
  lines.push('');

  // Plan 80G's target: a player who picks one or two flagships and funds
  // their recruiting reaches the final four within eight to twelve years.
  const withFlagships = runs.filter((r) => !r.error && (r.flagships?.length ?? 0) > 0);
  if (withFlagships.length > 0) {
    lines.push('## Flagships on full scholarships', '', 'Years from putting a chosen flagship on full scholarships to its first final four (the fastest of its flagships; a run whose flagships never got there counts as never). Plan 80G\'s target is eight to twelve, median across runs.', '');
    lines.push('| Run | Flagships (year chosen → first final four) | Years |', '|---|---|---|');
    const spans: number[] = [];
    for (const r of withFlagships) {
      const got = r.flagships!.filter((f) => f.finalFour !== undefined).map((f) => f.finalFour! - f.chosen);
      const span = got.length > 0 ? Math.min(...got) : Infinity;
      spans.push(span);
      lines.push(`| ${r.goal} ${r.seed} ${r.name} | ${r.flagships!.map((f) => `${f.sport} Y${f.chosen} → ${f.finalFour !== undefined ? `Y${f.finalFour}` : 'never'}`).join('; ')} | ${Number.isFinite(span) ? span : 'never'} |`);
    }
    const sorted = [...spans].sort((a, b) => a - b);
    const mid = sorted[Math.floor((sorted.length - 1) / 2)];
    lines.push('', `Median: ${Number.isFinite(mid) ? `${mid} years` : 'never'} (${spans.filter(Number.isFinite).length}/${spans.length} runs reached a final four).`, '');
  }

  // Programs cut (Plan 95V): the players whose rule cuts one, and when.
  const withCuts = runs.filter((r) => !r.error && r.goal === 'championships');
  if (withCuts.length > 0) {
    lines.push('## Programs cut', '', 'The championships player cuts a program that has missed the postseason five times (Plan 95V).', '');
    lines.push('| Run | Programs cut |', '|---|---|');
    for (const r of withCuts) lines.push(`| ${r.goal} ${r.seed} ${r.name} | ${(r.cuts ?? []).map((c) => `${c.sport} Y${c.year}`).join('; ') || 'none'} |`);
    lines.push('', `${withCuts.filter((r) => (r.cuts?.length ?? 0) > 0).length} of ${withCuts.length} runs cut a program.`, '');
  }

  // Per goal: decisions, tedium, wants.
  for (const goal of goals) {
    const rs = runs.filter((r) => r.goal === goal && !r.error);
    if (rs.length === 0) continue;
    lines.push(`## ${goal}`, '');
    const finals = rs.map((r) => r.final).filter((f): f is NonNullable<typeof f> => !!f);
    if (finals.length > 0) {
      const marks = new Map<string, number>();
      for (const f of finals) marks.set(f.mark, (marks.get(f.mark) ?? 0) + 1);
      lines.push(`**The Final Report.** Marks: ${[...marks.entries()].sort((a, b) => b[1] - a[1]).map(([m, n]) => `${m} ×${n}`).join(', ')}. Titles: ${[...new Set(finals.map((f) => f.title))].map((t) => `*${t}*`).join('; ')}.`, '');
      const axes = finals[0].axes.map((a) => a.label);
      lines.push(`Axis grades (median mean score): ${axes.map((label) => `${label} ${fmt(median(finals.map((f) => f.axes.find((a) => a.label === label)?.mean ?? NaN)))}`).join(', ')}.`, '');
    }
    if (rs.some((r) => r.switched !== undefined)) lines.push(`Switched strategy in year ${median(rs.map((r) => r.switched ?? NaN))}.`, '');
    // Decisions per year, summed across the run, median across runs.
    const keys = [...new Set(rs.flatMap((r) => Object.values(r.decisions).flatMap((d) => Object.keys(d))))];
    const perRun = (r: RunRecord, key: string) => Object.values(r.decisions).reduce((t, d) => t + (d[key] ?? 0), 0);
    const byCount = keys.map((k) => ({ k, n: median(rs.map((r) => perRun(r, k))) })).sort((a, b) => b.n - a.n);
    lines.push('**What it did** (median actions over the run, most first):', '');
    lines.push('| Decision | Actions | Busiest year (median of runs\' max) | Why |');
    lines.push('|---|---|---|---|');
    for (const { k, n } of byCount.slice(0, 18)) {
      const peak = median(rs.map((r) => Math.max(0, ...Object.values(r.decisions).map((d) => d[k] ?? 0))));
      const why = rs.map((r) => r.reasons[k]).find((x) => x) ?? '';
      lines.push(`| ${k} | ${fmt(n)} | ${fmt(peak)} | ${why} |`);
    }
    lines.push('');
    // Instructor swaps (Plan 95S): the player's own, and the Provost's.
    const swaps = (by: Record<string, number> | undefined) => Object.values(by ?? {}).reduce((t, n) => t + n, 0);
    lines.push(`**Instructor swaps over the run** (median): the player's own ${fmt(median(rs.map((r) => swaps(r.playerSwaps))))}, the Provost's on Staff for the A ${fmt(median(rs.map((r) => swaps(r.seatSwaps))))}.`, '');
    // Tedium.
    const idle = (r: RunRecord, from: number, to: number) => Object.entries(r.idleWeeks).filter(([y]) => +y >= from && +y <= to).reduce((t, [, n]) => t + n, 0);
    const answers = (r: RunRecord, from: number, to: number) => Object.entries(r.answerOnlyWeeks).filter(([y]) => +y >= from && +y <= to).reduce((t, [, n]) => t + n, 0);
    const modals = (r: RunRecord) => Object.values(r.interrupts).reduce((t, d) => t + Object.values(d).reduce((a, b) => a + b, 0), 0);
    lines.push('**Tedium.** Weeks with nothing done and nothing asked (idle), and weeks it only answered what was put to it, per decade (median):', '');
    lines.push('| Years | Idle weeks | Answer-only weeks | Of |');
    lines.push('|---|---|---|---|');
    for (const [a, b] of [[1, 10], [11, 20], [21, 30], [31, 40], [41, 50]]) {
      lines.push(`| ${a}–${b} | ${fmt(median(rs.map((r) => idle(r, a, b))))} | ${fmt(median(rs.map((r) => answers(r, a, b))))} | 520 |`);
    }
    lines.push('');
    const repeated = byCount.filter(({ k }) => median(rs.map((r) => Object.values(r.decisions).filter((d) => (d[k] ?? 0) > 10).length)) > 0);
    if (repeated.length > 0) {
      lines.push(`**Repeated more than ten times in a year:** ${repeated.map(({ k }) => `${k} (${fmt(median(rs.map((r) => Object.values(r.decisions).filter((d) => (d[k] ?? 0) > 10).length)))} years)`).join(', ')}.`, '');
    }
    lines.push(`Modals answered over the run (median): ${fmt(median(rs.map(modals)))}. By type (median over runs): ${(() => {
      const types = [...new Set(rs.flatMap((r) => Object.values(r.interrupts).flatMap((d) => Object.keys(d))))];
      return types.map((t) => `${t} ${fmt(median(rs.map((r) => Object.values(r.interrupts).reduce((n, d) => n + (d[t] ?? 0), 0))))}`).join(', ');
    })()}.`, '');
    // Wants.
    const levers = [...new Set(rs.flatMap((r) => r.wants.map((w) => w.lever)))];
    if (levers.length > 0) {
      lines.push('**Where control ran out** (a lever it wanted and the game does not have; runs, median first year, median weeks felt):', '');
      lines.push('| Wanted | Runs | First year | Weeks | Why |');
      lines.push('|---|---|---|---|---|');
      const rowsW = levers.map((lever) => {
        const ws = rs.map((r) => r.wants.find((w) => w.lever === lever)).filter((w): w is WantRecord => !!w);
        return { lever, n: ws.length, first: median(ws.map((w) => w.first[0])), weeks: median(ws.map((w) => w.weeks)), why: ws[0]?.why ?? '' };
      }).sort((a, b) => b.n - a.n || b.weeks - a.weeks);
      for (const w of rowsW) lines.push(`| ${w.lever} | ${w.n}/${rs.length} | ${fmt(w.first)} | ${fmt(w.weeks)} | ${w.why} |`);
      lines.push('');
    }
    const taken = rs.flatMap((r) => r.promisesTaken);
    if (taken.length > 0) lines.push(`Promises taken (all runs): ${[...new Set(taken)].map((id) => `${promiseById(id)?.title ?? id} ×${taken.filter((x) => x === id).length}`).join(', ')}.`, '');
  }

  // Do the goals diverge? Distance between the year-50 colleges.
  lines.push('## Do the goals make different colleges?', '');
  const FEATURES: Array<[string, (x: Row) => number, number]> = [
    ['students', (x) => x.enrolled, 30000], ['prestige', (x) => x.prestige, 150], ['satisfaction', (x) => x.satisfaction, 100],
    ['courses', (x) => x.courses + x.gradCourses, 431], ['teams', (x) => x.teams, 20], ['placeables', (x) => x.placeables, 120],
    ['price ratio', (x) => x.priceRatio, 1.6], ['research', (x) => Math.log10(1 + x.publications), 4],
  ];
  const centroid = (goal: string) => {
    const at = runs.filter((r) => r.goal === goal && !r.error).map((r) => r.years[r.years.length - 1]).filter((x): x is Row => !!x);
    return FEATURES.map(([, read, scale]) => median(at.map(read)) / scale);
  };
  lines.push(`Each college at year 50 as ${FEATURES.length} features scaled to 0–1 (${FEATURES.map(([k]) => k).join(', ')}); the distance between two goals' medians (0 = the same college; 1 = very different).`, '');
  lines.push(`| | ${goals.join(' | ')} |`);
  lines.push(`|---|${goals.map(() => '---').join('|')}|`);
  const cs = Object.fromEntries(goals.map((gl) => [gl, centroid(gl)]));
  for (const a of goals) {
    lines.push(`| ${a} | ${goals.map((b) => fmt(Math.sqrt(cs[a].reduce((t, v, i) => t + (v - cs[b][i]) ** 2, 0) / FEATURES.length), 2)).join(' | ')} |`);
  }
  lines.push('');
  // Plan 85's question: do the pillars differ? The four pillar values at
  // year 50, each over 150.
  const pillarsOf = (goal: string) => {
    const at = runs.filter((r) => r.goal === goal && !r.error).map((r) => r.years[r.years.length - 1]).filter((x): x is Row => !!x && !!x.pillars);
    return [0, 1, 2, 3].map((i) => median(at.map((x) => x.pillars[i])) / 150);
  };
  lines.push('The same, on the four pillars alone (academics, research, student life, athletics, each over 150): the shape of the college\'s standing (Plan 85).', '');
  lines.push(`| | ${goals.join(' | ')} |`);
  lines.push(`|---|${goals.map(() => '---').join('|')}|`);
  const ps = Object.fromEntries(goals.map((gl) => [gl, pillarsOf(gl)]));
  for (const a of goals) {
    lines.push(`| ${a} | ${goals.map((b) => fmt(Math.sqrt(ps[a].reduce((t, v, i) => t + (v - ps[b][i]) ** 2, 0) / 4), 2)).join(' | ')} |`);
  }
  lines.push('');
  writeFileSync(out, lines.join('\n'));
}

// ---------------------------------------------------------------------
// The command line.
// ---------------------------------------------------------------------

const argv = process.argv.slice(2);
const arg = (flag: string) => {
  const i = argv.indexOf(flag);
  return i >= 0 ? argv[i + 1] : undefined;
};
const OUT_DIR = arg('--dir') ?? 'node_modules/.tmp/goals';

if (argv.includes('--run')) {
  const goal = arg('--goal') as Goal;
  if (!GOALS.includes(goal)) throw new Error(`no goal "${goal}". Known: ${GOALS.join(', ')}`);
  const rec = playGoal(goal, Number(arg('--seed') ?? DEFAULT_SEEDS[0]), arg('--name') ?? DEFAULT_NAMES[0], Number(arg('--years') ?? YEARS), arg('--specialization') as SpecializationRule | undefined);
  writeFileSync(arg('--out') ?? join(OUT_DIR, `${goal}.json`), JSON.stringify(rec));
  console.log(`${goal} seed ${rec.seed} ${rec.name}: ${rec.seconds.toFixed(0)} s${rec.error ? ` — FAILED: ${rec.error.split('\n')[0]}` : ''}`);
} else if (argv.includes('--report')) {
  const dir = arg('--report') ?? OUT_DIR;
  const runs = readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')) as RunRecord);
  const out = arg('--out') ?? join(dir, 'goals.md');
  writeReport(runs, out);
  console.log(`wrote ${out} from ${runs.length} runs`);
} else if (process.argv[1] && !process.argv[1].includes('.test')) {
  // Orchestrate: every goal × seed × name, a process each.
  const goals = (arg('--goals')?.split(',') ?? [...GOALS]) as Goal[];
  const seeds = arg('--seeds')?.split(',').map(Number) ?? DEFAULT_SEEDS;
  const names = arg('--names')?.split(',') ?? DEFAULT_NAMES;
  const years = arg('--years') ?? String(YEARS);
  mkdirSync(OUT_DIR, { recursive: true });
  const jobs = goals.flatMap((goal) => seeds.flatMap((seed) => names.map((name) => ({ goal, seed, name }))));
  const file = (j: { goal: string; seed: number; name: string }) => join(OUT_DIR, `${j.goal}-${j.seed}-${j.name.replace(/\W+/g, '_')}.json`);
  const todo = argv.includes('--resume') ? jobs.filter((j) => !existsSync(file(j))) : jobs;
  const t0 = Date.now();
  let done = 0;
  const run = (job: (typeof jobs)[number]) => new Promise<void>((resolve) => {
    const pick = arg('--specialization');
    const child = spawn(process.execPath, [process.argv[1], '--run', '--goal', job.goal, '--seed', String(job.seed), '--name', job.name, '--years', years, '--out', file(job), ...(pick ? ['--specialization', pick] : [])], { stdio: ['ignore', 'pipe', 'inherit'] });
    child.stdout.on('data', (d) => process.stdout.write(`[${++done}/${todo.length}] ${d}`));
    child.on('close', () => resolve());
  });
  const queue = [...todo];
  await Promise.all(Array.from({ length: Math.min(Number(process.env.GOALS_JOBS) || availableParallelism(), queue.length) }, async () => {
    for (let job = queue.shift(); job; job = queue.shift()) await run(job);
  }));
  const runs = jobs.filter((j) => existsSync(file(j))).map((j) => JSON.parse(readFileSync(file(j), 'utf8')) as RunRecord);
  writeReport(runs, join(OUT_DIR, 'goals.md'));
  console.log(`${todo.length} runs in ${((Date.now() - t0) / 60000).toFixed(1)} min; wrote ${join(OUT_DIR, 'goals.md')}`);
}
