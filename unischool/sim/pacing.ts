// ---------------------------------------------------------------------
// The pacing scorecard (Plans 66 and 68): whether a college grows steadily
// over forty years and coasts the last ten, rather than sprinting to the top
// by year 12 or 20. Read by `npm run natural -- --pacing`, which plays three
// players on three seeds and prints each target against the median.
// Measures, never fails: like every balance number since Plan 56, it is
// reported, not gated.
//
// Three players, because what a college charges changes how fast it fills:
//   Natural        the owner's natural line (sim/harness/natural.ts), which
//                  prices just short of the red tier: the high-price line
//   Guided         the guided player, priced at "fair"
//   Completionist  the archetype that builds everything, priced at "fair"
//
// Four measures, each read as a year opens (the summer just closed):
// enrollment, prestige, rank and the operating net per week (the year's
// weeks averaged). "Growth" is a measure's rise from year 1 to year 50 of
// the same run, so a target in shares holds whatever the ceilings are.
// Plan 68 adds the catalogue, the same for every player: programs housed,
// courses taught, schools founded and distinguished, graduate courses.
// ---------------------------------------------------------------------

import type { GameState } from '../src/state/types';
import { totalEnrolled } from '../src/state/types';
import { playerRank } from '../src/systems/rivals/rivalsSystem';
import { financeBreakdown, weeklyNet } from '../src/systems/finance/financeSystem';
import { milestoneSchools, programs } from '../src/data/techData';
import { schoolFoundedKey } from '../src/systems/techtree/schools';
import { foundGame, playYears, type Player } from './harness/game';

export interface PaceYear {
  year: number;
  enrolled: number;
  prestige: number;
  rank: number;
  netPerWeek: number;
  // The catalogue (Plan 68).
  programs: number;
  courses: number;
  schools: number;
  distinguished: number;
  gradCourses: number;
  // What is still to build: majors and graduate programs to found, courses
  // to teach, schools to distinguish (Plan 69). 0 means everything.
  left: number;
  // The guardrails.
  cash: number;
  opexPerWeek: number;
  lowestAttribute: number;
}

export const PACING_PLAYERS = ['Natural', 'Guided', 'Completionist'] as const;
export type PacingPlayer = (typeof PACING_PLAYERS)[number];
export const PACING_SEEDS = [12345, 4242, 777] as const;
export const PACING_NAME = 'Blackmoor';
const YEARS = 50;

function readYear(s: GameState, year: number, netPerWeek: number): PaceYear {
  const scores = s.students.satisfactionBreakdown;
  const courses = s.tech.filter((t) => t.kind === 'course');
  const housed = Object.values(s.halls).flat().filter((slot) => slot.programId !== null).length;
  const left = (programs().length - housed)
    + courses.filter((t) => t.status !== 'done').length
    + milestoneSchools().filter((m) => !s.milestones[`school-distinguished:${m.schoolName}`]).length;
  return {
    left,
    year,
    enrolled: totalEnrolled(s.students),
    prestige: s.self.reputation,
    rank: playerRank(s),
    netPerWeek,
    programs: Object.values(s.halls).flat().filter((slot) => slot.programId !== null).length,
    courses: s.tech.filter((t) => t.kind === 'course' && t.graduateProgram === undefined && t.status === 'done').length,
    schools: milestoneSchools().filter((m) => s.milestones[schoolFoundedKey(m.schoolName)]).length,
    distinguished: milestoneSchools().filter((m) => s.milestones[`school-distinguished:${m.schoolName}`]).length,
    gradCourses: s.tech.filter((t) => t.graduateProgram !== undefined && t.status === 'done').length,
    cash: s.finance.cash,
    opexPerWeek: financeBreakdown(s).totalExpenses,
    lowestAttribute: Math.min(...Object.values(scores)),
  };
}

// Plays `player` fifty years and reads each year as the next one opens.
export function trackYears(player: Player, seed: number): PaceYear[] {
  const years: PaceYear[] = [];
  let year = 0;
  let netSum = 0;
  let weeks = 0;
  const tracked: Player = {
    name: player.name,
    answer: player.answer,
    act(g) {
      if (g.s.clock.year !== year) {
        if (year !== 0) years.push(readYear(g.s, year, weeks > 0 ? netSum / weeks : 0));
        year = g.s.clock.year;
        netSum = 0;
        weeks = 0;
      }
      netSum += weeklyNet(g.s);
      weeks += 1;
      player.act(g);
    },
  };
  const g = foundGame({ seed, name: PACING_NAME });
  playYears(g, tracked, YEARS);
  years.push(readYear(g.s, year, weeks > 0 ? netSum / weeks : 0));
  return years;
}

// A band: the median must fall in [min, max] (either may be open).
interface Band { min?: number; max?: number }
type Measure = 'enrolled' | 'prestige' | 'netPerWeek';
const MEASURE_NAME: Record<Measure, string> = { enrolled: 'Enrollment', prestige: 'Prestige', netPerWeek: 'Net $/wk' };

// ---- The targets ----

// When each measure reaches half, and 90%, of its growth, and when the rank
// first reaches the top 25, the top 10 and first place. The high-price line
// is Plan 66's; a player priced at "fair" may fill a little sooner.
const WHEN: Record<'high' | 'fair', { measures: Record<Measure, { half: Band; ninety: Band }>; rank: Array<{ top: number; band: Band }> }> = {
  high: {
    measures: {
      enrolled: { half: { min: 18, max: 22 }, ninety: { min: 36, max: 40 } },
      prestige: { half: { min: 18, max: 22 }, ninety: { min: 36, max: 40 } },
      netPerWeek: { half: { min: 20, max: 24 }, ninety: { min: 37, max: 41 } },
    },
    rank: [{ top: 25, band: { min: 12, max: 16 } }, { top: 10, band: { min: 20, max: 25 } }, { top: 1, band: { min: 34, max: 40 } }],
  },
  fair: {
    measures: {
      enrolled: { half: { min: 16, max: 22 }, ninety: { min: 32, max: 40 } },
      prestige: { half: { min: 18, max: 22 }, ninety: { min: 36, max: 40 } },
      netPerWeek: { half: { min: 18, max: 26 }, ninety: { min: 34, max: 42 } },
    },
    rank: [{ top: 25, band: { min: 12, max: 16 } }, { top: 10, band: { min: 20, max: 25 } }, { top: 1, band: { min: 33, max: 40 } }],
  },
};
const PRICE: Record<PacingPlayer, 'high' | 'fair'> = { Natural: 'high', Guided: 'fair', Completionist: 'fair' };

// The high-price line's checkpoints, decades and coast (Plan 66).
export const CHECKPOINTS: Array<{ year: number; enrolledShare: Band; prestige: Band; rank: Band; netShare: Band }> = [
  { year: 10, enrolledShare: { min: 0.17, max: 0.29 }, prestige: { min: 72, max: 82 }, rank: { min: 25, max: 40 }, netShare: { min: 0.1, max: 0.2 } },
  { year: 20, enrolledShare: { min: 0.43, max: 0.55 }, prestige: { min: 96, max: 106 }, rank: { min: 8, max: 15 }, netShare: { min: 0.35, max: 0.5 } },
  { year: 30, enrolledShare: { min: 0.7, max: 0.81 }, prestige: { min: 120, max: 130 }, rank: { min: 2, max: 5 }, netShare: { min: 0.65, max: 0.8 } },
  { year: 40, enrolledShare: { min: 0.94 }, prestige: { min: 145 }, rank: { max: 1 }, netShare: { min: 0.9 } },
];
export const COAST = { enrolledOverY40: { max: 0.05 }, netOverY40: { max: 0.1 }, prestigeY50: { min: 149.5 }, rankY50: { max: 1 } };
export const STEADY = {
  enrolledYearGain: { max: 0.08 },
  prestigeYearGain: { max: 6 },
  decade: { min: 0.15, max: 0.35 },
  lastDecade: { max: 0.1 },
  netFalls: { max: 0 },
};

// The catalogue (Plan 68), the same for every player: the year each reaches
// its mark, and the last year anything was added (nothing may be left to
// found or develop only before year 35).
type Catalogue = 'programs' | 'courses' | 'schools' | 'distinguished' | 'gradCourses';
export const CATALOGUE: Array<{ label: string; key: Catalogue; mark: (end: number, first: PaceYear) => number; band: Band }> = [
  { label: 'Programs: half founded', key: 'programs', mark: (end, first) => first.programs + (end - first.programs) / 2, band: { min: 12, max: 18 } },
  { label: 'Programs: 90% founded', key: 'programs', mark: (end, first) => first.programs + (end - first.programs) * 0.9, band: { min: 30, max: 36 } },
  { label: 'Courses: half taught', key: 'courses', mark: (end, first) => first.courses + (end - first.courses) / 2, band: { min: 15, max: 20 } },
  { label: 'Courses: 90% taught', key: 'courses', mark: (end, first) => first.courses + (end - first.courses) * 0.9, band: { min: 34, max: 40 } },
  { label: 'Schools: the first founded', key: 'schools', mark: () => 1, band: { min: 3, max: 6 } },
  { label: 'Schools: the fourth founded', key: 'schools', mark: () => 4, band: { min: 12, max: 18 } },
  { label: 'Schools: the seventh founded', key: 'schools', mark: () => 7, band: { min: 26, max: 34 } },
  { label: 'Schools: the first distinguished', key: 'distinguished', mark: () => 1, band: { min: 8, max: 14 } },
  { label: 'Schools: all seven distinguished', key: 'distinguished', mark: () => 7, band: { min: 32, max: 38 } },
  { label: 'Graduate courses: the first', key: 'gradCourses', mark: () => 1, band: { min: 15, max: 20 } },
  { label: 'Graduate courses: all', key: 'gradCourses', mark: (end) => Math.max(end, 1), band: { min: 36, max: 42 } },
];

// Guardrails: the guided player's buffer, price mattering both ways, the
// natural line's welfare, and (watched only) the money it piles up.
export const BUFFER = { enrolledShare: { min: 0.85 }, prestigeShare: { min: 0.85 }, rank: { max: 10 } };
export const PRICE_MATTERS = { fairEnrolledOverNatural: { min: 1.1 }, naturalNetOverFair: { min: 1.25 } };
export const WELFARE = { yearsBelow50AfterY5: { max: 0 } };
export const MONEY = { cashY40InDecadesOfOpex: { max: 1 } };

// ---- The scoring ----

export interface ScoreRow {
  section: string;
  label: string;
  target: string;
  median: number;
  values: number[];
  pass: boolean;
  // Reported, never counted in the tally.
  watch?: true;
  format: (n: number) => string;
}

const median = (xs: number[]) => {
  // "Never" is Infinity and sorts last; NaN (no reading) is left out.
  const sorted = xs.filter((x) => !Number.isNaN(x)).sort((a, b) => a - b);
  return sorted.length === 0 ? NaN : sorted[Math.floor((sorted.length - 1) / 2)];
};
const within = (v: number, b: Band) => !Number.isNaN(v) && (b.min === undefined || v >= b.min) && (b.max === undefined || v <= b.max);
const pct = (n: number) => (Number.isFinite(n) ? `${Math.round(n * 100)}%` : '—');
const yr = (n: number) => (Number.isFinite(n) ? `Y${n}` : 'never');
const num = (n: number) => (Number.isFinite(n) ? `${Math.round(n)}` : '—');
const dec = (n: number) => (Number.isFinite(n) ? n.toFixed(1) : '—');
const times = (n: number) => (Number.isFinite(n) ? `${n.toFixed(2)}×` : '—');
const bandText = (b: Band, f: (n: number) => string) => (
  b.min !== undefined && b.max !== undefined ? (b.min === b.max ? f(b.min) : `${f(b.min)}–${f(b.max)}`)
    : b.min !== undefined ? `≥ ${f(b.min)}` : b.max !== undefined ? `≤ ${f(b.max)}` : 'any'
);

const at = (run: PaceYear[], year: number) => run.find((y) => y.year === year);
function growth(run: PaceYear[], m: Measure, year: number): number {
  const start = at(run, 1)?.[m];
  const end = at(run, 50)?.[m];
  const v = at(run, year)?.[m];
  if (start === undefined || end === undefined || v === undefined || end === start) return NaN;
  return (v - start) / (end - start);
}
const firstYear = (run: PaceYear[], test: (y: PaceYear) => boolean) => run.find(test)?.year ?? Infinity;

export function scorecard(runs: Record<PacingPlayer, PaceYear[][]>): ScoreRow[] {
  const rows: ScoreRow[] = [];
  const add = (section: string, label: string, band: Band, format: (n: number) => string, values: number[], watch?: true) => {
    const m = median(values);
    rows.push({ section, label, target: bandText(band, format), median: m, values, pass: within(m, band), format, watch });
  };

  for (const player of PACING_PLAYERS) {
    const rs = runs[player];
    const when = WHEN[PRICE[player]];
    const section = `${player}: when`;
    // A college at "fair" runs a flat net (Plan 69, the owner's call): its
    // net's shape is watched, not counted.
    const netWatched = PRICE[player] === 'fair' ? true : undefined;
    for (const m of ['enrolled', 'prestige', 'netPerWeek'] as const) {
      const watch = m === 'netPerWeek' ? netWatched : undefined;
      add(section, `${MEASURE_NAME[m]}: half its growth`, when.measures[m].half, yr, rs.map((run) => firstYear(run, (y) => growth(run, m, y.year) >= 0.5)), watch);
      add(section, `${MEASURE_NAME[m]}: 90% of its growth`, when.measures[m].ninety, yr, rs.map((run) => firstYear(run, (y) => growth(run, m, y.year) >= 0.9)), watch);
    }
    for (const { top, band } of when.rank) {
      add(section, top === 1 ? 'Rank: first #1' : `Rank: first in the top ${top}`, band, yr, rs.map((run) => firstYear(run, (y) => y.rank <= top)));
    }
    add(section, 'Largest one-year enrollment gain, share of Y50', STEADY.enrolledYearGain, pct,
      rs.map((run) => Math.max(...run.slice(1).map((y, i) => y.enrolled - run[i].enrolled)) / (at(run, 50)?.enrolled ?? NaN)));
    add(section, 'Net $/wk: second straight falls after Y5', STEADY.netFalls, num, rs.map((run) => {
      let falls = 0;
      for (let i = 2; i < run.length; i += 1) {
        if (run[i].year > 5 && run[i].netPerWeek < run[i - 1].netPerWeek && run[i - 1].netPerWeek < run[i - 2].netPerWeek) falls += 1;
      }
      return falls;
    }), netWatched);
    // Whatever the price, the top and the whole catalogue by year 50 (Plan 69).
    add(section, 'Rank at Y50', { max: 1 }, num, rs.map((run) => at(run, 50)?.rank ?? NaN));
    add(section, 'Left to build at Y50 (programs, courses, schools to distinguish)', { max: 0 }, num, rs.map((run) => at(run, 50)?.left ?? NaN));

    for (const c of CATALOGUE) {
      add(`${player}: the catalogue`, c.label, c.band, yr, rs.map((run) => {
        const target = c.mark(at(run, 50)?.[c.key] ?? NaN, run[0]);
        return firstYear(run, (y) => y[c.key] >= target - 1e-9);
      }));
    }
    add(`${player}: the catalogue`, 'The last year anything was added', { min: 35 }, yr, rs.map((run) => {
      let last = NaN;
      for (let i = 1; i < run.length; i += 1) {
        const [a, b] = [run[i - 1], run[i]];
        if (b.courses > a.courses || b.programs > a.programs || b.gradCourses > a.gradCourses) last = b.year;
      }
      return last;
    }));
  }

  // The high-price line's full Plan 66 card: checkpoints, coast, decades.
  const nat = runs.Natural;
  for (const c of CHECKPOINTS) {
    const share = (run: PaceYear[], m: Measure) => (at(run, c.year)?.[m] ?? NaN) / (at(run, 50)?.[m] ?? NaN);
    add(`Natural: year ${c.year}`, 'Enrollment, share of Y50', c.enrolledShare, pct, nat.map((run) => share(run, 'enrolled')));
    add(`Natural: year ${c.year}`, 'Prestige', c.prestige, dec, nat.map((run) => at(run, c.year)?.prestige ?? NaN));
    add(`Natural: year ${c.year}`, 'Rank', c.rank, num, nat.map((run) => at(run, c.year)?.rank ?? NaN));
    add(`Natural: year ${c.year}`, 'Net $/wk, share of Y50', c.netShare, pct, nat.map((run) => share(run, 'netPerWeek')));
  }
  const over40 = (run: PaceYear[], m: Measure) => (at(run, 50)?.[m] ?? NaN) / (at(run, 40)?.[m] ?? NaN) - 1;
  add('Natural: year 50', 'Enrollment over Y40', COAST.enrolledOverY40, pct, nat.map((run) => over40(run, 'enrolled')));
  add('Natural: year 50', 'Net $/wk over Y40', COAST.netOverY40, pct, nat.map((run) => over40(run, 'netPerWeek')));
  add('Natural: year 50', 'Prestige', COAST.prestigeY50, dec, nat.map((run) => at(run, 50)?.prestige ?? NaN));
  add('Natural: year 50', 'Rank', COAST.rankY50, num, nat.map((run) => at(run, 50)?.rank ?? NaN));
  add('Natural: steady', 'Largest one-year prestige gain (points)', STEADY.prestigeYearGain, dec,
    nat.map((run) => Math.max(...run.slice(1).map((y, i) => y.prestige - run[i].prestige))));
  for (const m of ['enrolled', 'prestige', 'netPerWeek'] as const) {
    for (let d = 1; d <= 5; d += 1) {
      add('Natural: steady', `${MEASURE_NAME[m]}: growth in years ${d === 1 ? 1 : (d - 1) * 10}–${d * 10}`, d === 5 ? STEADY.lastDecade : STEADY.decade, pct,
        nat.map((run) => growth(run, m, d * 10) - (d === 1 ? 0 : growth(run, m, (d - 1) * 10))));
    }
  }

  // Guardrails.
  const y50 = (run: PaceYear[]) => at(run, 50);
  const g = runs.Guided;
  add('Guardrails', 'Buffer: guided Y50 enrollment, share of natural', BUFFER.enrolledShare, pct, g.map((run, i) => (y50(run)?.enrolled ?? NaN) / (y50(nat[i])?.enrolled ?? NaN)));
  add('Guardrails', 'Buffer: guided Y50 prestige, share of natural', BUFFER.prestigeShare, pct, g.map((run, i) => (y50(run)?.prestige ?? NaN) / (y50(nat[i])?.prestige ?? NaN)));
  add('Guardrails', 'Buffer: guided Y50 rank', BUFFER.rank, num, g.map((run) => y50(run)?.rank ?? NaN));
  const fairEnrolled = (i: number) => Math.max(y50(g[i])?.enrolled ?? NaN, y50(runs.Completionist[i])?.enrolled ?? NaN);
  const fairNet = (i: number) => Math.max(y50(g[i])?.netPerWeek ?? NaN, y50(runs.Completionist[i])?.netPerWeek ?? NaN);
  add('Guardrails', 'Price matters: fair-price Y50 enrollment over natural', PRICE_MATTERS.fairEnrolledOverNatural, times, nat.map((run, i) => fairEnrolled(i) / (y50(run)?.enrolled ?? NaN)));
  add('Guardrails', 'Price matters: natural Y50 net over fair-price', PRICE_MATTERS.naturalNetOverFair, times, nat.map((run, i) => (y50(run)?.netPerWeek ?? NaN) / fairNet(i)));
  add('Guardrails', 'Welfare: natural years after Y5 with an attribute under 50', WELFARE.yearsBelow50AfterY5, num, nat.map((run) => run.filter((y) => y.year > 5 && y.lowestAttribute < 50).length));
  add('Guardrails', 'Money (watched): natural Y40 cash, in decades of opex', MONEY.cashY40InDecadesOfOpex, dec,
    nat.map((run) => (at(run, 40)?.cash ?? NaN) / ((at(run, 40)?.opexPerWeek ?? NaN) * 520)), true);
  return rows;
}

// The scorecard as markdown: one table per section, then the tally.
export function scorecardText(rows: ScoreRow[], seeds: readonly number[] = PACING_SEEDS): string {
  const out: string[] = [];
  let section = '';
  for (const r of rows) {
    if (r.section !== section) {
      section = r.section;
      out.push('', `**${section}**`, '', `| | Target | Median | ${seeds.map((s) => `Seed ${s}`).join(' | ')} | |`, `|---|---|---|${seeds.map(() => '---').join('|')}|---|`);
    }
    out.push(`| ${r.label} | ${r.target} | ${r.format(r.median)} | ${r.values.map(r.format).join(' | ')} | ${r.watch ? (r.pass ? '(✓)' : '(✗)') : r.pass ? '✓' : '✗'} |`);
  }
  const counted = rows.filter((r) => !r.watch);
  out.push('', `**${counted.filter((r) => r.pass).length} of ${counted.length} targets met.** Rows in brackets are watched, not counted.`);
  return out.join('\n');
}
