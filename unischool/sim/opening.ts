// ---------------------------------------------------------------------
// The opening (Plan 96B): the first five years, year by year, which the
// pacing scorecard (sim/pacing.ts) reads only from year 10. Read by
// `npm run natural -- --opening`, which plays the pacing scorecard's three
// players on its three seeds, and the natural line again at the owner's
// own prices (the second playthrough: $25,000 in year 1, $20,000 in year 2),
// for five years each.
//
// Each row is read as a year opens, the summer just closed, as the
// scorecard reads its rows: that summer's tuition, its pool and the pool's
// factors (FunnelFactors, the product of which is the pool), and the year's
// operating net averaged over its weeks.
//
// Measures, never fails, and sets no targets: the numbers are for choosing
// what to tune (Plan 96I). Not part of the game.
// ---------------------------------------------------------------------

import type { Action } from '../src/state/actions';
import type { GameState } from '../src/state/types';
import { totalEnrolled } from '../src/state/types';
import { weeklyNet } from '../src/systems/finance/financeSystem';
import { computePrestigeTarget } from '../src/systems/prestige/prestigeSystem';
import { priceTolerance } from '../src/systems/admissions/admissionsSystem';
import { defaultAnswer } from '../src/engine/defaultAnswers';
import { foundGame, playYears, type Player } from './harness/game';
import { PACING_NAME } from './pacing';

export const OPENING_YEARS = 5;

export interface OpeningYear {
  year: number;
  tuition: number;
  tolerance: number;     // the families' tolerance at the prestige the summer priced at
  applicants: number;
  enrolled: number;
  netPerWeek: number;
  cash: number;
  prestige: number;
  prestigeTarget: number;
  satisfaction: number;
  coursesDone: number;
  coursesDeveloping: number;
  // The pool's factors (FunnelFactors), 1 where a factor was absent.
  prestigePool: number;
  priceFactor: number;
  stickerShock: number;
  capacityFactor: number;
  wordOfMouth: number;
  crowding: number;
  beauty: number;
  cohortDemand: number;
}

function readYear(s: GameState, year: number, netPerWeek: number, pricedAt: number): OpeningYear {
  const courses = s.tech.filter((t) => t.kind === 'course');
  const f = s.students.lastFunnel?.factors;
  return {
    year,
    tuition: s.finance.listedTuition,
    tolerance: priceTolerance(pricedAt),
    applicants: s.students.applicantPool,
    enrolled: totalEnrolled(s.students),
    netPerWeek,
    cash: s.finance.cash,
    prestige: s.self.reputation,
    prestigeTarget: computePrestigeTarget(s),
    satisfaction: s.students.satisfaction,
    coursesDone: courses.filter((t) => t.status === 'done').length,
    coursesDeveloping: courses.filter((t) => t.status === 'developing').length,
    prestigePool: f?.prestigePool ?? 0,
    priceFactor: f?.priceFactor ?? 1,
    stickerShock: f?.stickerShock ?? 1,
    capacityFactor: f?.capacityFactor ?? 1,
    wordOfMouth: f?.wordOfMouth ?? 1,
    crowding: f?.crowding ?? 1,
    beauty: f?.beauty ?? 1,
    cohortDemand: f?.cohortDemand ?? 1,
  };
}

// The natural line with the summer's tuition fixed for the years `prices`
// names (year → tuition), and its own price after.
export function pricedPlayer(player: Player, prices: Record<number, number>): Player {
  return {
    ...player,
    name: `${player.name} at the owner's prices`,
    answer(g): Action | null {
      const a = player.answer?.(g) ?? defaultAnswer(g.s);
      const fixed = prices[g.s.clock.year];
      if (fixed === undefined) return a;
      // The price rides the Admissions beat's decision, and is committed
      // with RESOLVE_ADMISSIONS: both carry it.
      if (a?.type === 'RESOLVE_SUMMER_BEAT' && a.decision) return { ...a, decision: { ...a.decision, tuition: fixed } };
      if (a?.type === 'RESOLVE_ADMISSIONS') return { ...a, tuition: fixed };
      return a;
    },
  };
}

// Plays `player` OPENING_YEARS years and reads each year as the next opens.
export function trackOpening(player: Player, seed: number): OpeningYear[] {
  const years: OpeningYear[] = [];
  let year = 0;
  let netSum = 0;
  let weeks = 0;
  let pricedAt = 0; // prestige while the summer is open, which is what its price is read against
  const tracked: Player = {
    name: player.name,
    act(g) {
      if (g.s.clock.year !== year) {
        if (year !== 0) years.push(readYear(g.s, year, weeks > 0 ? netSum / weeks : 0, pricedAt));
        year = g.s.clock.year;
        netSum = 0;
        weeks = 0;
      }
      netSum += weeklyNet(g.s);
      weeks += 1;
      player.act(g);
    },
    answer(g) {
      if (g.s.pendingInterrupt?.type === 'summer') pricedAt = g.s.self.reputation;
      return player.answer?.(g) ?? null;
    },
  };
  const g = foundGame({ seed, name: PACING_NAME });
  // The clock stops as year OPENING_YEARS + 1 opens, which has pushed the
  // last row.
  playYears(g, tracked, OPENING_YEARS);
  return years;
}

const k = (n: number) => `$${Math.round(n / 1000).toLocaleString('en-US')}k`;
const money = (n: number) => (Math.abs(n) >= 1e6 ? `${n < 0 ? '−' : ''}$${(Math.abs(n) / 1e6).toFixed(1)}M` : `${n < 0 ? '−' : ''}${k(Math.abs(n))}`);
const n0 = (n: number) => Math.round(n).toLocaleString('en-US');
const d1 = (n: number) => n.toFixed(1);
const d2 = (n: number) => n.toFixed(2);

export function openingText(runs: Array<{ player: string; seed: number; years: OpeningYear[] }>): string {
  const out: string[] = [];
  for (const run of runs) {
    out.push(`### ${run.player}, seed ${run.seed}`, '');
    out.push('| Year | Tuition | Tolerance | Applicants | Enrolled | Net/wk | Cash | Prestige → target | Satisfaction | Courses (writing) |');
    out.push('|---|---|---|---|---|---|---|---|---|---|');
    for (const y of run.years) {
      out.push(`| ${y.year} | ${k(y.tuition)} | ${k(y.tolerance)} | ${n0(y.applicants)} | ${n0(y.enrolled)} | ${money(y.netPerWeek)} | ${money(y.cash)} | ${d1(y.prestige)} → ${d1(y.prestigeTarget)} | ${d1(y.satisfaction)} | ${y.coursesDone} (${y.coursesDeveloping}) |`);
    }
    out.push('', 'The pool, factor by factor (applicants are about their product):', '');
    out.push('| Year | Prestige pool | Price | Sticker shock | Beds | Word of mouth | Crowding | Beauty | Cohorts |');
    out.push('|---|---|---|---|---|---|---|---|---|');
    for (const y of run.years) {
      out.push(`| ${y.year} | ${n0(y.prestigePool)} | ${d2(y.priceFactor)} | ${d2(y.stickerShock)} | ${d2(y.capacityFactor)} | ${d2(y.wordOfMouth)} | ${d2(y.crowding)} | ${d2(y.beauty)} | ${d2(y.cohortDemand)} |`);
    }
    out.push('');
  }
  return out.join('\n');
}
