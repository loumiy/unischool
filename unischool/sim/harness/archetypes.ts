// ---------------------------------------------------------------------
// The archetypes (Plan 63, the rebuild's third layer): four ways to run a
// college, each a policy over the harness's moves (moves.ts) and the guided
// player's plain sense (guided.ts), so a rule change reaches them all
// through one move. Do different plans finish differently?
//
//   Completionist  builds and develops everything it can afford, fields
//                  every team, keeps research running; a thin reserve
//   Selective      three schools and no more, all of their courses, priced
//                  over the market and admitting fewer; a deep reserve
//   Lean           spends only while the week's net is in the black, and
//                  builds only for a real shortfall
//   Idle           does nothing: every interrupt takes the game's default
//
// Checked for what must hold (test/archetypes.test.ts); how they finish is
// the report's (sim/report.ts, `npm run sim`), never a gate.
//
// Not part of the game: nothing in src/ imports this.
// ---------------------------------------------------------------------

import type { Action } from '../../src/state/actions';
import type { GameState, SatisfactionAttributes } from '../../src/state/types';
import { standsOnCampus, totalEnrolled } from '../../src/state/types';
import { milestoneSchools, programById } from '../../src/data/techData';
import { GRADUATE_HOSTS } from '../../src/data/projectData';
import { hostOffers } from '../../src/systems/techtree/programOffers';
import { schoolFoundedKey } from '../../src/systems/techtree/schools';
import { weeklyNet } from '../../src/systems/finance/financeSystem';
import { priceTolerance } from '../../src/systems/admissions/admissionsSystem';
import { playerRank } from '../../src/systems/rivals/rivalsSystem';
import { defaultAnswer } from '../../src/engine/defaultAnswers';
import { unstaffedIn } from '../../src/systems/faculty/restaffing';
import type { Game, Player } from './game';
import { buildDorm, buildable, developCourse, foundOffer, hireForBlocked, homeFor, moveHome, site, siteNextHall } from './moves';
import { buildFor, carry, createGuidedPlayer, foundIn, reserveOf } from './guided';
import { createNaturalPlayer } from './natural';

export const ARCHETYPES = ['Completionist', 'Selective', 'Lean', 'Idle'] as const;
export type ArchetypeName = (typeof ARCHETYPES)[number];

export interface ArchetypeYear {
  year: number;
  cash: number;
  net: number;
  enrolled: number;
  prestige: number;
  rank: number;
  satisfaction: number;
  schools: number;
  programs: number;
  courses: number;
  buildings: number;
  faculty: number;
  teams: number;
}

export interface ArchetypeRecord {
  years: ArchetypeYear[];
  weeksInRed: number;
  minCash: number;
}

const cheapest = <T extends { cost: number }>(items: readonly T[]): T | undefined => [...items].sort((a, b) => a.cost - b.cost)[0];

function worstAttribute(s: GameState): [keyof SatisfactionAttributes, number] {
  const scores = s.students.satisfactionBreakdown;
  const key = (Object.keys(scores) as Array<keyof SatisfactionAttributes>).sort((a, b) => scores[a] - scores[b])[0];
  return [key, scores[key]];
}

// Courses left dark by a retirement, staffed from the payroll and the market.
function restaffIfDark(g: Game): void {
  if (unstaffedIn(g.s).length > 0) g.act({ type: 'RESTAFF', school: null });
}

// A graduate program wherever a host offers one.
function foundGraduate(g: Game, reserve: number): void {
  for (const hostId of new Set(Object.values(GRADUATE_HOSTS))) {
    const host = g.s.tech.find((t) => t.id === hostId);
    if (!host || !standsOnCampus(host)) continue;
    const offers = hostOffers(g.s, hostId).map((p) => p.id);
    if (offers.length > 0 && foundIn(g, hostId, offers, reserve)) return;
  }
}

// Every idle lab put to work on its cheapest initiative.
function keepLabsBusy(g: Game, reserve: number): void {
  for (const lab of g.s.tech.filter((t) => t.facilityType === 'lab' && t.status === 'done' && !g.s.research.initiatives[t.id])) {
    carry(g, { kind: 'research', labId: lab.id }, reserve);
  }
}

// The summer's price, at the admissions screen's "fair" times a factor.
function summerAnswer(g: Game, factor: number, admitRate?: number): Action | null {
  if (g.s.pendingInterrupt?.type !== 'summer') return null;
  const tuition = Math.round((priceTolerance(g.s.self.reputation) * factor) / 100) * 100;
  return defaultAnswer(g.s, { tuition, admitRate: admitRate ?? g.s.students.admitRate });
}

interface Policy {
  act(g: Game): void;
  answer?(g: Game): Action | null;
}

const COMPLETIONIST: Policy = {
  act(g) {
    const reserve = reserveOf(g.s, 4);
    restaffIfDark(g);
    moveHome(g);
    foundOffer(g, { reserve });
    foundGraduate(g, reserve);
    hireForBlocked(g, { reserve });
    developCourse(g, { reserve });
    buildDorm(g, 0.85, { reserve });
    const [worst, score] = worstAttribute(g.s);
    if (score < 70) buildFor(g, worst, reserve);
    siteNextHall(g, { reserve });
    // Everything else the menu offers, the cheapest first: labs, projects,
    // venues, the rest of the estate.
    const next = cheapest(buildable(g.s, reserve).filter((t) => t.kind === 'facility'));
    if (next) site(g, next);
    keepLabsBusy(g, reserve);
  },
  answer: (g) => summerAnswer(g, 1),
};

// The Selective college stays narrow: twelve programs at most, its own
// schools' offers first. Not three schools outright: offers change only
// when one is founded, so a college refusing every other school's offer
// never sees its own come round (Plan 63's report says so).
const SELECTIVE_PROGRAMS = 12;
function programsStanding(s: GameState): string[] {
  return Object.values(s.halls).flat().map((slot) => slot.programId).filter((x): x is string => x !== null);
}
const SELECTIVE: Policy = {
  act(g) {
    const reserve = reserveOf(g.s, 12);
    restaffIfDark(g);
    moveHome(g);
    const standing = programsStanding(g.s);
    if (standing.length < SELECTIVE_PROGRAMS) {
      const mine = new Set(standing.map((id) => programById(id)?.school));
      const offers = [...g.s.programOffers].sort((x, y) => Number(!mine.has(programById(x)?.school)) - Number(!mine.has(programById(y)?.school)));
      for (const id of offers) {
        const program = programById(id);
        const where = program ? homeFor(g.s, program) : null;
        if (where && foundIn(g, where.hallId, [id], reserve)) break;
      }
    }
    hireForBlocked(g, { reserve });
    developCourse(g, { reserve });
    buildDorm(g, 0.9, { reserve });
    const [worst, score] = worstAttribute(g.s);
    if (score < 65) buildFor(g, worst, reserve);
    siteNextHall(g, { reserve });
    const lab = cheapest(buildable(g.s, reserve).filter((t) => t.facilityType === 'lab'));
    if (lab) site(g, lab);
    keepLabsBusy(g, reserve);
  },
  answer: (g) => summerAnswer(g, 1.15, 0.45),
};

const LEAN: Policy = {
  act(g) {
    const reserve = reserveOf(g.s, 16);
    restaffIfDark(g);
    moveHome(g);
    const [worst, score] = worstAttribute(g.s);
    if (score < 40) buildFor(g, worst, reserve);
    buildDorm(g, 0.98, { reserve });
    if (weeklyNet(g.s) <= 0) return;
    hireForBlocked(g, { reserve, pick: (items) => items[0] });
    foundOffer(g, { reserve, pick: (items) => items[0] });
    developCourse(g, { reserve, pick: (items) => cheapest(items as never) as never });
    siteNextHall(g, { reserve });
  },
  answer: (g) => summerAnswer(g, 1),
};

const IDLE: Policy = { act() {} };

const POLICIES: Record<ArchetypeName, Policy> = { Completionist: COMPLETIONIST, Selective: SELECTIVE, Lean: LEAN, Idle: IDLE };

export function createArchetype(name: ArchetypeName): Player & { record: ArchetypeRecord } {
  const policy = POLICIES[name];
  const record: ArchetypeRecord = { years: [], weeksInRed: 0, minCash: Infinity };
  let lastYear = 0;
  const observe = (s: GameState) => {
    if (s.finance.cash < 0) record.weeksInRed += 1;
    record.minCash = Math.min(record.minCash, s.finance.cash);
    if (s.clock.year === lastYear) return;
    lastYear = s.clock.year;
    record.years.push({
      year: s.clock.year,
      cash: s.finance.cash,
      net: weeklyNet(s),
      enrolled: totalEnrolled(s.students),
      prestige: s.self.reputation,
      rank: playerRank(s),
      satisfaction: s.students.satisfaction,
      schools: milestoneSchools().filter((m) => s.milestones[schoolFoundedKey(m.schoolName)]).length,
      programs: Object.values(s.halls).flat().filter((slot) => slot.programId !== null).length,
      courses: s.tech.filter((t) => t.kind === 'course' && t.status === 'done').length,
      buildings: Object.keys(s.placements).length,
      faculty: s.faculty.length,
      teams: s.orgs.teams.length,
    });
  };
  return {
    name,
    record,
    act(g) {
      observe(g.s);
      policy.act(g);
    },
    answer: policy.answer ? (g) => policy.answer!(g) : undefined,
  };
}

// Every player the harness has, by name (the tools' `--player`): the four
// archetypes, the guided player and the natural one (natural.ts).
export const PLAYERS = ['Guided', 'Natural', ...ARCHETYPES] as const;
export function playerNamed(name: string): Player | undefined {
  const lower = name.toLowerCase();
  const hit = PLAYERS.find((p) => p.toLowerCase().startsWith(lower));
  if (!hit) return undefined;
  return hit === 'Guided' ? createGuidedPlayer() : hit === 'Natural' ? createNaturalPlayer() : createArchetype(hit);
}
