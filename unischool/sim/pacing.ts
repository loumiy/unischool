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
import { playerRank, selfFinancial } from '../src/systems/rivals/rivalsSystem';
import { financeBreakdown, weeklyNet } from '../src/systems/finance/financeSystem';
import { milestoneSchools, programs } from '../src/data/techData';
import { campusCourseScores } from '../src/systems/faculty/facultyAssignment';
import { gradeFor } from '../src/data/courseQuality';
import { teachingCeiling } from '../src/systems/prestige/prestigeSystem';
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
  // Money (Plan 70D): lifetime grants and initiative funding, the
  // endowment, and Financial strength on the report's 0–100 scale.
  grantIncome: number;
  funding: number;
  endowment: number;
  financial: number;
  // Teaching and demand (Plan 71): academic satisfaction, the share of
  // courses graded A, the teaching standard's cap on academic standing, the
  // last summer's pool and its crowding factor.
  academic: number;
  aShare: number;
  teachingCap: number;
  applicants: number;
  crowding: number;
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
    academic: s.students.satisfactionBreakdown.academic,
    aShare: (() => { const sc = campusCourseScores(s); return sc.length ? sc.filter((x) => gradeFor(x) === 'A').length / sc.length : 0; })(),
    teachingCap: teachingCeiling(s).value,
    applicants: s.students.applicantPool,
    crowding: s.students.lastFunnel?.factors.crowding ?? 1,
    grantIncome: s.research.grantIncome,
    funding: s.research.funding ?? 0,
    endowment: s.finance.endowment,
    financial: selfFinancial(s) * (100 / 150),
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
//
// Prestige's and the rank's years re-based on Plan 85's scale (Plan 95W,
// the second review's B4-11): Plan 85 moved the top of the field to about
// 118–121 and slowed the climb to it, so these are read from the current
// runs, the pacing card's own and the baseline's (\`npm run sim\`), not from
// October's. They were Y18–22 and Y36–40 for prestige's half and 90%, and
// Y12–16, Y20–25 and Y33–40 (Y34–40 at the high price) for the ranks.
const WHEN: Record<'high' | 'fair', { measures: Record<Measure, { half: Band; ninety: Band }>; rank: Array<{ top: number; band: Band }> }> = {
  // Enrollment's and the net's halves reset by Plan 72J (see CHECKPOINTS).
  high: {
    measures: {
      enrolled: { half: { min: 24, max: 28 }, ninety: { min: 36, max: 40 } },
      prestige: { half: { min: 22, max: 26 }, ninety: { min: 38, max: 42 } },
      netPerWeek: { half: { min: 29, max: 33 }, ninety: { min: 37, max: 41 } },
    },
    rank: [{ top: 25, band: { min: 24, max: 30 } }, { top: 10, band: { min: 33, max: 39 } }, { top: 1, band: { min: 38, max: 46 } }],
  },
  fair: {
    measures: {
      enrolled: { half: { min: 16, max: 22 }, ninety: { min: 32, max: 40 } },
      prestige: { half: { min: 24, max: 30 }, ninety: { min: 40, max: 46 } },
      netPerWeek: { half: { min: 18, max: 26 }, ninety: { min: 34, max: 42 } },
    },
    rank: [{ top: 25, band: { min: 26, max: 32 } }, { top: 10, band: { min: 37, max: 45 } }, { top: 1, band: { min: 43, max: 49 } }],
  },
};
const PRICE: Record<PacingPlayer, 'high' | 'fair'> = { Natural: 'high', Guided: 'fair', Completionist: 'fair' };

// The high-price line's checkpoints, decades and coast (Plan 66).
//
// Years 10–30 reset by Plan 72J (the owner's answer to Plan 71 §3): a
// college that charges well over the going rate fills slowly, and that is
// the price of charging it, so its enrollment and net targets for those
// years are what the line produces (medians across the seeds after Plan
// 72H and I, bands as wide as Plan 66's). Plan 66's were 17–29%, 43–55% and
// 70–81% of year-50 enrollment and 10–20%, 35–50% and 65–80% of year-50 net.
//
// Prestige and rank re-based on Plan 85's scale (Plan 95W, the second
// review's B4-11): the top of the field now sits at about 118–121, not 150,
// so the bands are what the line produces on that scale (medians across the
// seeds, bands as wide as Plan 66's). They were 72–82, 96–106, 120–130 and
// at least 145 for prestige; 25–40, 8–15, 2–5 and first for rank; and at
// least 149.5 at year 50.
export const CHECKPOINTS: Array<{ year: number; enrolledShare: Band; prestige: Band; rank: Band; netShare: Band }> = [
  { year: 10, enrolledShare: { min: 0.03, max: 0.1 }, prestige: { min: 48, max: 58 }, rank: { min: 50, max: 60 }, netShare: { min: 0.01, max: 0.07 } },
  { year: 20, enrolledShare: { min: 0.18, max: 0.3 }, prestige: { min: 71, max: 81 }, rank: { min: 28, max: 38 }, netShare: { min: 0.08, max: 0.2 } },
  { year: 30, enrolledShare: { min: 0.58, max: 0.72 }, prestige: { min: 87, max: 97 }, rank: { min: 15, max: 25 }, netShare: { min: 0.42, max: 0.58 } },
  { year: 40, enrolledShare: { min: 0.94 }, prestige: { min: 105 }, rank: { max: 5 }, netShare: { min: 0.9 } },
];
// Year 50's prestige: first place, a little under the field's top (Plan 95W).
export const COAST = { enrolledOverY40: { max: 0.05 }, netOverY40: { max: 0.1 }, prestigeY50: { min: 116 }, rankY50: { max: 1 } };
export const STEADY = {
  enrolledYearGain: { max: 0.08 },
  prestigeYearGain: { max: 6 },
  decade: { min: 0.15, max: 0.35 },
  lastDecade: { max: 0.1 },
  netFalls: { max: 0 },
};
// The high-price line's decades in years 1–30 where its slow start sets
// them (Plan 72J, as CHECKPOINTS): a decade here overrides STEADY.decade.
// The later decades keep Plan 66's bands.
export const SLOW_START_DECADES: Partial<Record<Measure, Record<number, Band>>> = {
  enrolled: { 1: { min: 0.02, max: 0.1 }, 3: { min: 0.32, max: 0.5 } },
  netPerWeek: { 1: { min: 0.01, max: 0.08 }, 2: { min: 0.05, max: 0.15 }, 3: { min: 0.28, max: 0.45 } },
};

// The catalogue (Plan 68): the year each reaches its mark, and the last year
// anything was added (nothing may be left to found or develop only before
// year 35). The same for every player, except where `byPrice` splits it.
//
// Programs and schools founded (Plan 71, the owner's reset): the old bands
// were set by the allowance of new majors, which the owner removed. With
// money the only limit, a college at "fair" founds majors early (a major is
// the cheapest thing in the catalogue) and a high-price one, with a smaller
// early pool, a decade later, so each price has its own band.
type Catalogue = 'programs' | 'courses' | 'schools' | 'distinguished' | 'gradCourses';
export const CATALOGUE: Array<{ label: string; key: Catalogue; mark: (end: number, first: PaceYear) => number } & ({ band: Band; byPrice?: never } | { band?: never; byPrice: Record<'high' | 'fair', Band> })> = [
  { label: 'Programs: half founded', key: 'programs', mark: (end, first) => first.programs + (end - first.programs) / 2,
    byPrice: { high: { min: 15, max: 23 }, fair: { min: 6, max: 14 } } },
  { label: 'Programs: 90% founded', key: 'programs', mark: (end, first) => first.programs + (end - first.programs) * 0.9,
    byPrice: { high: { min: 25, max: 33 }, fair: { min: 22, max: 32 } } },
  { label: 'Courses: half taught', key: 'courses', mark: (end, first) => first.courses + (end - first.courses) / 2, band: { min: 15, max: 20 } },
  { label: 'Courses: 90% taught', key: 'courses', mark: (end, first) => first.courses + (end - first.courses) * 0.9, band: { min: 34, max: 40 } },
  { label: 'Schools: the first founded', key: 'schools', mark: () => 1,
    byPrice: { high: { min: 8, max: 13 }, fair: { min: 3, max: 10 } } },
  { label: 'Schools: the fourth founded', key: 'schools', mark: () => 4,
    byPrice: { high: { min: 14, max: 23 }, fair: { min: 6, max: 15 } } },
  { label: 'Schools: the seventh founded', key: 'schools', mark: () => 7,
    byPrice: { high: { min: 17, max: 25 }, fair: { min: 8, max: 18 } } },
  { label: 'Schools: the first distinguished', key: 'distinguished', mark: () => 1, band: { min: 8, max: 14 } },
  { label: 'Schools: all seven distinguished', key: 'distinguished', mark: () => 7, band: { min: 32, max: 38 } },
  { label: 'Graduate courses: the first', key: 'gradCourses', mark: () => 1, band: { min: 15, max: 20 } },
  { label: 'Graduate courses: all', key: 'gradCourses', mark: (end) => Math.max(end, 1), band: { min: 36, max: 42 } },
];

// Guardrails: the guided player's buffer, price mattering both ways, the
// natural line's welfare, research as a modest profit (Plan 70D: lifetime
// grants over lifetime initiative funding), and (watched only) the money it
// piles up and each player's Financial strength.
export const BUFFER = { enrolledShare: { min: 0.85 }, prestigeShare: { min: 0.85 }, rank: { max: 10 } };
export const PRICE_MATTERS = { fairEnrolledOverNatural: { min: 1.1 }, naturalNetOverFair: { min: 1.25 } };
export const WELFARE = { yearsBelow50AfterY5: { max: 0 } };
export const MONEY = { cashY40InDecadesOfOpex: { max: 1 }, grantsOverFunding: { min: 1.7, max: 2.3 }, financialY50: { min: 60 } };
// The natural line's cash at year 40, in dollars (Plan 95W, the second
// review's B4-10): no more than $1B, about a year of the late college's
// operating cost (some $20M a week at year 40). A reserve of a year is
// prudence; past it the money has nothing left to buy. The relative row
// above passes at eight or nine years of opex, as opex grows with the college,
// so this one is counted.
export const NATURAL_CASH_Y40 = { max: 1e9 };
// Teaching (Plan 71, the owner's rule): building everything with no regard
// to who teaches reaches the top 25 and no further; the top ten and above
// take hand-picked faculty. Read off the guided player with TEACHING.care
// off (sim/harness/moves.ts).
export const TEACHING_BLIND = { rankY50: { min: 11, max: 25 }, left: { max: 0 } };

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
const usd = (n: number) => (!Number.isFinite(n) ? '—' : Math.abs(n) >= 1e9 ? `$${(n / 1e9).toFixed(1)}B` : `$${Math.round(n / 1e6)}M`);
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

export function scorecard(runs: Record<PacingPlayer, PaceYear[][]>, blind: PaceYear[][] = []): ScoreRow[] {
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
      add(`${player}: the catalogue`, c.label, c.byPrice ? c.byPrice[PRICE[player]] : c.band, yr, rs.map((run) => {
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
      add('Natural: steady', `${MEASURE_NAME[m]}: growth in years ${d === 1 ? 1 : (d - 1) * 10}–${d * 10}`, SLOW_START_DECADES[m]?.[d] ?? (d === 5 ? STEADY.lastDecade : STEADY.decade), pct,
        nat.map((run) => growth(run, m, d * 10) - (d === 1 ? 0 : growth(run, m, (d - 1) * 10))));
    }
  }

  // Guardrails.
  const y50 = (run: PaceYear[]) => at(run, 50);
  if (blind.length > 0) {
    add('Guardrails', 'Teaching-blind guided: rank at Y50', TEACHING_BLIND.rankY50, num, blind.map((run) => y50(run)?.rank ?? NaN));
    add('Guardrails', 'Teaching-blind guided: left to build at Y50', TEACHING_BLIND.left, num, blind.map((run) => y50(run)?.left ?? NaN));
  }
  const g = runs.Guided;
  add('Guardrails', 'Buffer: guided Y50 enrollment, share of natural', BUFFER.enrolledShare, pct, g.map((run, i) => (y50(run)?.enrolled ?? NaN) / (y50(nat[i])?.enrolled ?? NaN)));
  add('Guardrails', 'Buffer: guided Y50 prestige, share of natural', BUFFER.prestigeShare, pct, g.map((run, i) => (y50(run)?.prestige ?? NaN) / (y50(nat[i])?.prestige ?? NaN)));
  add('Guardrails', 'Buffer: guided Y50 rank', BUFFER.rank, num, g.map((run) => y50(run)?.rank ?? NaN));
  const fairEnrolled = (i: number) => Math.max(y50(g[i])?.enrolled ?? NaN, y50(runs.Completionist[i])?.enrolled ?? NaN);
  const fairNet = (i: number) => Math.max(y50(g[i])?.netPerWeek ?? NaN, y50(runs.Completionist[i])?.netPerWeek ?? NaN);
  add('Guardrails', 'Price matters: fair-price Y50 enrollment over natural', PRICE_MATTERS.fairEnrolledOverNatural, times, nat.map((run, i) => fairEnrolled(i) / (y50(run)?.enrolled ?? NaN)));
  add('Guardrails', 'Price matters: natural Y50 net over fair-price', PRICE_MATTERS.naturalNetOverFair, times, nat.map((run, i) => (y50(run)?.netPerWeek ?? NaN) / fairNet(i)));
  add('Guardrails', 'Welfare: natural years after Y5 with an attribute under 50', WELFARE.yearsBelow50AfterY5, num, nat.map((run) => run.filter((y) => y.year > 5 && y.lowestAttribute < 50).length));
  add('Guardrails', 'Research: natural lifetime grants over initiative funding', MONEY.grantsOverFunding, times,
    nat.map((run) => (y50(run)?.grantIncome ?? NaN) / (y50(run)?.funding ?? NaN)));
  add('Guardrails', 'Money (watched): natural Y40 cash, in decades of opex', MONEY.cashY40InDecadesOfOpex, dec,
    nat.map((run) => (at(run, 40)?.cash ?? NaN) / ((at(run, 40)?.opexPerWeek ?? NaN) * 520)), true);
  add('Guardrails', 'Money: natural Y40 cash', NATURAL_CASH_Y40, usd, nat.map((run) => at(run, 40)?.cash ?? NaN));
  for (const player of PACING_PLAYERS) {
    add('Guardrails', `Financial strength (watched): ${player} Y50, of 100`, MONEY.financialY50, num, runs[player].map((run) => y50(run)?.financial ?? NaN), true);
  }
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
