// ---------------------------------------------------------------------
// THE SCORECARD: what each strategy's trajectory currently looks like, as
// numbers something can be held to.
//
// test/balance-regression.test.ts pins no figures — every assertion in it
// is a sign or an inequality ("ends solvent", "recovers", "beats idling"),
// which is why the September 2026 review could find the Balanced builder
// ending year 20 overdrawn, and 70,000 students on 9,000 beds, with the
// whole suite green. A rebalance needs something to rebalance TOWARD.
//
// TWO KINDS OF BAND (Plan 15's PR G). TARGETS, below, are hand-written:
// where the game SHOULD be, for the Balanced builder and the two controls
// — the design decision recorded as data, and the run that falls inside
// them is the evidence. REFERENCE, at the bottom, is generated: where
// every other strategy IS, the envelope of three seeds at ±25% (see
// TOLERANCE and bandsAcross), written by `npm run sim -- --write-reference`
// so that a change which moves a trajectory is noticed. Plan 09 wrote
// this file as a report; test/balance-scorecard.test.ts fails on either
// kind now.
//
// Not part of the game: nothing in src/ imports this.
// ---------------------------------------------------------------------

import type { Row } from './balanceSim';

// The years a trajectory is read at (Plan 15's PR G): the early pinch, the
// build-out, the review's own horizon, the end of build-out at 35, and the
// endpoint at 50. Three eras — found (1-12), build (12-35), defend (35-50).
export const REFERENCE_YEARS = [5, 10, 20, 35, 50] as const;
export const REFERENCE_HORIZON = 50;

// The two extra streams `--write-reference` plays beside the default seed,
// so a band is the envelope of three runs rather than a claim about one.
export const REFERENCE_EXTRA_SEEDS = [4242, 777];

// How far either side of the recorded figure still counts as "the same
// run". Wide on purpose: this economy is a threshold system — a strategy
// builds when cash clears a buffer — so small changes move WHICH WEEK a
// dorm goes up, and forty years compounds the difference (see
// balanceSim.ts's own note on the Overbuilder's non-monotone price sweep).
// A band that fits the current seed exactly would fail on the next one and
// teach everybody to ignore it.
//
// ONE TOLERANCE FOR EVERY METRIC, and it suits some better than others.
// Cash and enrolment span orders of magnitude over a run, so ±25% is tight
// on them; prestige lives on a bounded 5..150 scale, so the same 25% is a
// band of ±13 points at year 5, wide enough to pass trajectories a tuning
// pass would call different. That is the honest state of a first version
// generated rather than chosen — per-metric tolerances are a decision about
// what "the same run" means for each figure, and Plan 15, the plan that has
// to answer that, is where the decision belongs.
export const TOLERANCE = 0.25;

// A floor on each band's half-width, in the metric's own units, because a
// percentage of a number near zero is not a band at all: ±25% of "0 weeks
// in the red" is [0, 0], which would report every run that hits one bad
// week. Each floor is roughly "noise, at the scale this metric lives on".
const FLOOR: Record<Metric, number> = {
  cash: 1_000_000,      // a million dollars is a rounding error by year 10
  enrolled: 100,        // a hundred students
  prestige: 2,          // two points on a 5..150 scale
  rank: 3,              // three places in a hundred-school field
  netMargin: 0.05,      // five points of margin
  weeksInTheRed: 10,    // ten weeks over the five years a sample covers
};

export type Metric = 'cash' | 'enrolled' | 'prestige' | 'rank' | 'netMargin' | 'weeksInTheRed';

export const METRICS: Metric[] = ['cash', 'enrolled', 'prestige', 'rank', 'netMargin', 'weeksInTheRed'];

export interface Band { lo: number; hi: number }
export type ReferenceRow = { year: number } & Record<Metric, Band>;
export type Reference = Record<string, ReferenceRow[]>;

// Net weekly margin as a share of weekly operating cost — the review's own
// health reading, and the one figure in the table that says whether a
// school is comfortable rather than merely large. Opex of zero (an
// un-started run) reads 0 rather than dividing.
export function netMargin(row: Row): number {
  return row.opex > 0 ? row.net / row.opex : 0;
}

export function metricOf(row: Row, metric: Metric): number {
  switch (metric) {
    case 'cash': return row.cash;
    case 'enrolled': return row.enrolled;
    case 'prestige': return row.prestige;
    case 'rank': return row.rank;
    case 'netMargin': return netMargin(row);
    case 'weeksInTheRed': return row.weeksInTheRed;
  }
}

// A band around one figure. Written so a NEGATIVE value bands correctly:
// -14M ±25% is [-17.5M, -10.5M], not the inside-out range the naive
// arithmetic gives.
export function bandAround(value: number, metric: Metric): Band {
  const half = Math.max(Math.abs(value) * TOLERANCE, FLOOR[metric]);
  // Two of the five metrics cannot be negative, and a band whose floor is
  // "-10 weeks in the red" is noise in the file rather than a statement.
  const floorAtZero = metric === 'weeksInTheRed' || metric === 'enrolled';
  if (metric === 'rank') return { lo: Math.max(1, value - half), hi: value + half };
  return { lo: floorAtZero ? Math.max(0, value - half) : value - half, hi: value + half };
}

// The bands a run implies — what `--write-reference` commits.
export function bandsFrom(rows: Row[]): ReferenceRow[] {
  const out: ReferenceRow[] = [];
  for (const year of REFERENCE_YEARS) {
    const row = rows.find((r) => r.year === year);
    if (!row) continue;
    out.push({
      year,
      cash: bandAround(row.cash, 'cash'),
      enrolled: bandAround(row.enrolled, 'enrolled'),
      prestige: bandAround(row.prestige, 'prestige'),
      rank: bandAround(row.rank, 'rank'),
      netMargin: bandAround(netMargin(row), 'netMargin'),
      weeksInTheRed: bandAround(row.weeksInTheRed, 'weeksInTheRed'),
    });
  }
  return out;
}

// The envelope across several runs of one strategy — the three seeds
// `--write-reference` plays (Plan 15's PR G): each band's low is the
// lowest of the seeds' lows and its high the highest of their highs, so a
// figure inside it is inside what the game does across the dice.
export function bandsAcross(runs: Row[][]): ReferenceRow[] {
  const perSeed = runs.map((rows) => bandsFrom(rows));
  const out: ReferenceRow[] = [];
  for (const year of REFERENCE_YEARS) {
    const rows = perSeed.map((bands) => bands.find((r) => r.year === year)).filter((r): r is ReferenceRow => r !== undefined);
    if (rows.length === 0) continue;
    const merged = { year } as ReferenceRow;
    for (const metric of METRICS) {
      merged[metric] = {
        lo: Math.min(...rows.map((r) => r[metric].lo)),
        hi: Math.max(...rows.map((r) => r[metric].hi)),
      };
    }
    out.push(merged);
  }
  return out;
}

// The bands a strategy is held to: a hand-written TARGET where one exists,
// the generated envelope otherwise (see TARGETS below).
export function bandsFor(strategyName: string): ReferenceRow[] | undefined {
  return TARGETS[strategyName] ?? REFERENCE[strategyName];
}

export interface Finding {
  strategy: string;
  year: number;
  metric: Metric;
  value: number;
  band: Band;
  side: 'HIGH' | 'LOW';
}

// Every figure outside its band, for one strategy's run. A year with no
// recorded band (a shorter run than the reference, or a strategy added
// since it was written) is skipped rather than reported: an absent band is
// a missing statement, not a failing one.
export function findingsFor(strategyName: string, rows: Row[]): Finding[] {
  const reference = bandsFor(strategyName);
  if (!reference) return [];
  const findings: Finding[] = [];
  for (const expected of reference) {
    const row = rows.find((r) => r.year === expected.year);
    if (!row) continue;
    for (const metric of METRICS) {
      const value = metricOf(row, metric);
      const band = expected[metric];
      if (value < band.lo) findings.push({ strategy: strategyName, year: expected.year, metric, value, band, side: 'LOW' });
      else if (value > band.hi) findings.push({ strategy: strategyName, year: expected.year, metric, value, band, side: 'HIGH' });
    }
  }
  return findings;
}

function short(n: number, metric: Metric): string {
  if (metric === 'netMargin') return `${(n * 100).toFixed(0)}%`;
  if (metric === 'weeksInTheRed' || metric === 'rank') return n.toFixed(0);
  if (metric === 'prestige') return n.toFixed(1);
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1e9) return `${sign}${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${sign}${(abs / 1e3).toFixed(0)}k`;
  return `${sign}${abs.toFixed(0)}`;
}

// One line per finding, in the shape the plan asked for:
//   year 20 enrolled 42,000 (band 8,000–14,000) HIGH
export function describeFinding(f: Finding): string {
  return `year ${String(f.year).padStart(2)} ${f.metric.padEnd(13)} `
    + `${short(f.value, f.metric).padStart(8)} (band ${short(f.band.lo, f.metric)}–${short(f.band.hi, f.metric)}) ${f.side}`;
}

// The generated source of the block below, so `--write-reference` writes
// this file the way a human would have.
export function serialiseReference(reference: Reference): string {
  const round = (n: number) => Number(n.toFixed(4));
  const entries = Object.entries(reference).map(([name, rows]) => {
    const body = rows.map((row) => {
      const fields = METRICS
        .map((m) => `${m}: { lo: ${round(row[m].lo)}, hi: ${round(row[m].hi)} }`)
        .join(', ');
      return `    { year: ${row.year}, ${fields} },`;
    }).join('\n');
    return `  ${JSON.stringify(name)}: [\n${body}\n  ],`;
  }).join('\n');
  return `export const REFERENCE: Reference = {\n${entries}\n};`;
}

// =====================================================================
// TARGETS — where the game SHOULD be (Plan 15's PR G).
//
// Hand-written, never generated, and they take precedence over the
// envelope below for the strategies they name. The Balanced builder's rows
// are Plan 15 §6's table, the design decision recorded as data: enrolment,
// net as a share of opex, prestige and rank at the five years, with cash
// left to the envelope because "one to three years of surplus" is a
// relation and not a figure. The two controls carry the plan's own
// sentences: the Idle school FALLS, and the Overbuilder is underwater by
// year 5 and out of it by year 15. A run that lands inside these is the
// evidence that the re-fit worked; one that does not is a regression.
// =====================================================================
//
// Where the fitted game lands beside the plan's table, and why the bands
// below are what they are:
//   - The Balanced builder's found era is slower than the table (about
//     2,000 enrolled at year 10, not 4,000-7,000) and its standing dips
//     while it builds — a campus growing faster than its dining hall is
//     crowded, which is the model working — so those two rows are wider
//     at the bottom than the table; from year 20 it is inside the table,
//     and by 35 it has finished the catalogue and sits at the top of the
//     scale, which the table did not anticipate (Plan 17's endpoint is
//     where the elite band closes). Net margin holds 5-15% from year 35,
//     and is 25-40% in the found and build eras, where the surplus is what
//     the halls and programs are bought with.
//   - The Idle school used to fall further than "into the 30s" — to the
//     bottom of the field, because a campus with nothing built took the
//     full crowding penalty and no welfare. Since Plan 19 the college opens
//     teaching (three programs, six graded courses, 480 seats), so idled
//     it is a small college that never grows: ten points under its
//     founding standing within five years and held there, at the rooms it
//     opened with. The claim is the same — idling costs standing and never
//     earns it back — and the band's ceiling is the founding standing less
//     a margin, its enrolment the founding seats.
//   - The Overbuilder is underwater by year 5 and STALLS rather than
//     recovering by 15: it hovers at break-even for the rest of the run,
//     in and out of the red, at seven hundred students. Recovery would
//     take a price change the scripted archetype never makes.
//     AND SO IS WHETHER IT STALLS OR SINKS, measured at Plan 21's end
//     across eight seeds on the base commit (6441664) before any of the
//     plan landed: on four streams it holds at its trough from year 20 on
//     (-1M to -2M), on the other four it is still sinking a few percent
//     of opex a week at year 20 (-5M, -11M, -13M, -25M). Plan 21 re-phased
//     the stream twice (its PR A and PR J) and the default seed landed on
//     the sinking half, so the cash floors of the year-20, 35 and 50 rows
//     below now cover it (-30M, -40M, -50M) rather than the stalling half
//     alone; the regression test's treading-water and not-always-red
//     claims are the robust statement of "stall, don't die", and the
//     above-its-trough claim is judged across seeds there.
//     "BY YEAR 5" IS A COIN FLIP ON THE DICE, measured at Plan 21's PR A:
//     year-5 cash sits within a few hundred thousand of zero either side
//     against a ~$12M/yr opex, and across eight seeds it was under at
//     five of them before that PR re-phased the stream and four after.
//     The year-5 row's cash ceiling and red-weeks floor read "or within
//     a million of it" now, and the sentence is held where it is robust:
//     the year-10 row still requires a red week, and
//     test/balance-regression.test.ts still asserts the trough goes
//     negative and that year 5 is underwater at a majority of seeds.
//
// PLAN 19 MOVED THE FOUND ERA, and the Balanced builder's first three rows
// with it. The college opens teaching — three Social Sciences & Humanities
// programs in a six-slot Founders Hall, six courses, 480 seats — and the
// three programs that dedicate the opening school fit in the rooms it
// already owns, so the balanced builder founds its first school in year six
// where it used to in year fifteen. Plan 15's concentration term then pays
// a decade early, and everything downstream of standing (the pool, the
// class, the price) follows: top fifty at year five, the undergraduate
// catalogue finished around year fourteen at two of three seeds, rank #1
// by year twenty. The design table's rows 5, 10 and 20 were written for a
// college that opened with an empty catalogue and a one-slot hall, so
// they are re-read here to the founding college — about a decade ahead of
// Plan 15's eras in standing, and wide in enrolment because the three
// seeds diverge on when the catalogue gets finished. Years 35 and 50 stand
// as Plan 15 wrote them, widened only to the envelope's enrolment and, at
// fifty, to a net margin that is positive rather than two percent: with
// the harness's headroom rule read against the first million of opex
// (balanceSim.ts's HEADROOM_OPEX_CAP) a mature balanced builder keeps
// building to the horizon instead of freezing at twelve percent, and
// what it nets there is a few percent of a very large opex. No game
// constant moved: the pace is the opening the plan asked for, and the
// plan's own levers if it is too fast (a four-slot Founders Hall; Reyes
// back in Physics with an opening-school offer guaranteed instead) are
// recorded there rather than pulled here.
export const TARGETS: Reference = {
  'Balanced builder': [
    { year: 5, cash: { lo: -2_000_000, hi: 20_000_000 }, enrolled: { lo: 1_000, hi: 3_500 }, prestige: { lo: 45, hi: 75 }, rank: { lo: 30, hi: 70 }, netMargin: { lo: 0.1, hi: 0.6 }, weeksInTheRed: { lo: 0, hi: 60 } },
    { year: 10, cash: { lo: -2_000_000, hi: 40_000_000 }, enrolled: { lo: 4_000, hi: 16_000 }, prestige: { lo: 55, hi: 95 }, rank: { lo: 12, hi: 60 }, netMargin: { lo: 0.05, hi: 0.5 }, weeksInTheRed: { lo: 0, hi: 120 } },
    { year: 20, cash: { lo: -5_000_000, hi: 300_000_000 }, enrolled: { lo: 8_000, hi: 32_000 }, prestige: { lo: 80, hi: 140 }, rank: { lo: 1, hi: 20 }, netMargin: { lo: -0.05, hi: 0.4 }, weeksInTheRed: { lo: 0, hi: 200 } },
    { year: 35, cash: { lo: -20_000_000, hi: 2_000_000_000 }, enrolled: { lo: 12_000, hi: 40_000 }, prestige: { lo: 100, hi: 150 }, rank: { lo: 1, hi: 8 }, netMargin: { lo: -0.05, hi: 0.2 }, weeksInTheRed: { lo: 0, hi: 400 } },
    { year: 50, cash: { lo: -20_000_000, hi: 5_000_000_000 }, enrolled: { lo: 15_000, hi: 42_000 }, prestige: { lo: 110, hi: 150 }, rank: { lo: 1, hi: 5 }, netMargin: { lo: 0, hi: 0.3 }, weeksInTheRed: { lo: 0, hi: 500 } },
  ],
  'Idle (builds nothing)': [
    { year: 5, cash: { lo: 0, hi: 50_000_000 }, enrolled: { lo: 0, hi: 480 }, prestige: { lo: 5, hi: 45 }, rank: { lo: 60, hi: 100 }, netMargin: { lo: -1, hi: 3 }, weeksInTheRed: { lo: 0, hi: 100 } },
    { year: 10, cash: { lo: 0, hi: 50_000_000 }, enrolled: { lo: 0, hi: 480 }, prestige: { lo: 5, hi: 44 }, rank: { lo: 60, hi: 100 }, netMargin: { lo: -1, hi: 3 }, weeksInTheRed: { lo: 0, hi: 200 } },
    { year: 20, cash: { lo: 0, hi: 50_000_000 }, enrolled: { lo: 0, hi: 480 }, prestige: { lo: 5, hi: 44 }, rank: { lo: 60, hi: 100 }, netMargin: { lo: -1, hi: 3 }, weeksInTheRed: { lo: 0, hi: 500 } },
    { year: 35, cash: { lo: 0, hi: 50_000_000 }, enrolled: { lo: 0, hi: 480 }, prestige: { lo: 5, hi: 44 }, rank: { lo: 60, hi: 100 }, netMargin: { lo: -1, hi: 3 }, weeksInTheRed: { lo: 0, hi: 1_000 } },
    { year: 50, cash: { lo: 0, hi: 50_000_000 }, enrolled: { lo: 0, hi: 480 }, prestige: { lo: 5, hi: 44 }, rank: { lo: 60, hi: 100 }, netMargin: { lo: -1, hi: 3 }, weeksInTheRed: { lo: 0, hi: 1_500 } },
  ],
  'Overbuilder (beds ahead of demand)': [
    { year: 5, cash: { lo: -6_000_000, hi: 1_000_000 }, enrolled: { lo: 300, hi: 2_000 }, prestige: { lo: 30, hi: 65 }, rank: { lo: 40, hi: 90 }, netMargin: { lo: -0.5, hi: 0.15 }, weeksInTheRed: { lo: 0, hi: 260 } },
    { year: 10, cash: { lo: -8_000_000, hi: 3_000_000 }, enrolled: { lo: 300, hi: 3_000 }, prestige: { lo: 30, hi: 70 }, rank: { lo: 35, hi: 90 }, netMargin: { lo: -0.5, hi: 0.2 }, weeksInTheRed: { lo: 1, hi: 520 } },
    { year: 20, cash: { lo: -30_000_000, hi: 10_000_000 }, enrolled: { lo: 300, hi: 5_000 }, prestige: { lo: 30, hi: 75 }, rank: { lo: 30, hi: 90 }, netMargin: { lo: -0.4, hi: 0.3 }, weeksInTheRed: { lo: 1, hi: 1_040 } },
    { year: 35, cash: { lo: -40_000_000, hi: 30_000_000 }, enrolled: { lo: 300, hi: 8_000 }, prestige: { lo: 30, hi: 80 }, rank: { lo: 25, hi: 90 }, netMargin: { lo: -0.4, hi: 0.4 }, weeksInTheRed: { lo: 1, hi: 1_820 } },
    { year: 50, cash: { lo: -50_000_000, hi: 60_000_000 }, enrolled: { lo: 300, hi: 10_000 }, prestige: { lo: 30, hi: 85 }, rank: { lo: 20, hi: 90 }, netMargin: { lo: -0.4, hi: 0.5 }, weeksInTheRed: { lo: 1, hi: 2_600 } },
  ],
};

// The markers below are what `--write-reference` rewrites between:
// everything above them is hand-written and stays, everything between them
// is measurement. The marker TEXT lives in balanceSim.ts rather than here
// as a pair of exported constants, which was tried first and is a trap —
// a constant declaring the marker contains the marker, so the writer finds
// its own declaration instead and eats it.

// --- GENERATED by `npm run sim -- --write-reference`. Do not hand-edit lightly. ---
export const REFERENCE: Reference = {
  "Balanced builder": [
    { year: 5, cash: { lo: 2159872.863, hi: 6319653.5483 }, enrolled: { lo: 1860, hi: 3200 }, prestige: { lo: 47.5794, hi: 80.895 }, rank: { lo: 34.5, hi: 62.5 }, netMargin: { lo: 0.2197, hi: 0.3758 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 10, cash: { lo: 8290676.5893, hi: 30649551.0839 }, enrolled: { lo: 7020, hi: 15371.25 }, prestige: { lo: 56.4547, hi: 97.7392 }, rank: { lo: 21, hi: 41.25 }, netMargin: { lo: 0.1132, hi: 0.2858 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 20, cash: { lo: 24372815.6567, hi: 59666600.4958 }, enrolled: { lo: 15840, hi: 35000 }, prestige: { lo: 98.8505, hi: 171.0881 }, rank: { lo: 1, hi: 4 }, netMargin: { lo: -0.0451, hi: 0.1607 }, weeksInTheRed: { lo: 13, hi: 151.25 } },
    { year: 35, cash: { lo: 35866720.9954, hi: 299167940.3668 }, enrolled: { lo: 25140, hi: 41900 }, prestige: { lo: 111.9733, hi: 187.0249 }, rank: { lo: 1, hi: 4 }, netMargin: { lo: -0.0029, hi: 0.1001 }, weeksInTheRed: { lo: 13, hi: 151.25 } },
    { year: 50, cash: { lo: 186398191.0393, hi: 2109028007.1611 }, enrolled: { lo: 25140, hi: 41900 }, prestige: { lo: 112.4848, hi: 187.4862 }, rank: { lo: 1, hi: 4 }, netMargin: { lo: -0.0119, hi: 0.3072 }, weeksInTheRed: { lo: 13, hi: 151.25 } },
  ],
  "Curriculum rush (overreach)": [
    { year: 5, cash: { lo: -756136.166, hi: 3812819.134 }, enrolled: { lo: 526.5, hi: 1000 }, prestige: { lo: 31.6804, hi: 55.0788 }, rank: { lo: 44.25, hi: 73.75 }, netMargin: { lo: -0.0952, hi: 0.0575 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 10, cash: { lo: -964446.2804, hi: 1580851.7507 }, enrolled: { lo: 556.5, hi: 1076.25 }, prestige: { lo: 34.0918, hi: 59.8875 }, rank: { lo: 43.5, hi: 73.75 }, netMargin: { lo: -0.0069, hi: 0.1677 }, weeksInTheRed: { lo: 25, hi: 173.75 } },
    { year: 20, cash: { lo: -432010.3649, hi: 3221734.1702 }, enrolled: { lo: 747.75, hi: 2546.25 }, prestige: { lo: 35.6057, hi: 65.4617 }, rank: { lo: 40.5, hi: 76.25 }, netMargin: { lo: 0.0852, hi: 0.5029 }, weeksInTheRed: { lo: 25, hi: 307.5 } },
    { year: 35, cash: { lo: 996419.4452, hi: 12803048.9172 }, enrolled: { lo: 2170.5, hi: 39200 }, prestige: { lo: 47.6458, hi: 125.7166 }, rank: { lo: 9.75, hi: 67.5 }, netMargin: { lo: 0.0088, hi: 0.4297 }, weeksInTheRed: { lo: 25, hi: 307.5 } },
    { year: 50, cash: { lo: 56678250.2081, hi: 2790500324.7104 }, enrolled: { lo: 24480, hi: 41900 }, prestige: { lo: 102.8803, hi: 185.7114 }, rank: { lo: 1, hi: 4 }, netMargin: { lo: 0.0216, hi: 0.1411 }, weeksInTheRed: { lo: 25, hi: 308.75 } },
  ],
  "Discount volume (beds first)": [
    { year: 5, cash: { lo: -2188538.3976, hi: 75548.7576 }, enrolled: { lo: 420, hi: 700 }, prestige: { lo: 50.518, hi: 84.2091 }, rank: { lo: 33, hi: 58.75 }, netMargin: { lo: -0.1514, hi: -0.0471 }, weeksInTheRed: { lo: 20, hi: 47 } },
    { year: 10, cash: { lo: -6352945.1321, hi: -3426448.4104 }, enrolled: { lo: 420, hi: 700 }, prestige: { lo: 57.9519, hi: 96.5906 }, rank: { lo: 19.5, hi: 38.75 }, netMargin: { lo: -0.0474, hi: 0.061 }, weeksInTheRed: { lo: 217.5, hi: 371.25 } },
    { year: 20, cash: { lo: -4872882.0399, hi: -1465170.6282 }, enrolled: { lo: 420, hi: 700 }, prestige: { lo: 61.2143, hi: 102.0243 }, rank: { lo: 15.75, hi: 36.25 }, netMargin: { lo: -0.0425, hi: 0.0783 }, weeksInTheRed: { lo: 607.5, hi: 1021.25 } },
    { year: 35, cash: { lo: -2187466.6417, hi: 841308.8467 }, enrolled: { lo: 420, hi: 700 }, prestige: { lo: 61.5754, hi: 103.299 }, rank: { lo: 19.5, hi: 35 }, netMargin: { lo: -0.0206, hi: 0.1074 }, weeksInTheRed: { lo: 1047.75, hi: 1995 } },
    { year: 50, cash: { lo: -1133414.8117, hi: 1569552.6507 }, enrolled: { lo: 420, hi: 700 }, prestige: { lo: 60.8907, hi: 103.6552 }, rank: { lo: 21, hi: 40 }, netMargin: { lo: -0.1156, hi: 0.115 }, weeksInTheRed: { lo: 1293, hi: 2471.25 } },
  ],
  "Completionist (build everything)": [
    { year: 5, cash: { lo: -414615.2354, hi: 2536147.3502 }, enrolled: { lo: 600, hi: 1500 }, prestige: { lo: 51.255, hi: 86.2204 }, rank: { lo: 33, hi: 58.75 }, netMargin: { lo: -0.0405, hi: 0.1726 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 10, cash: { lo: -789070.8669, hi: 3636300.5538 }, enrolled: { lo: 600, hi: 2600 }, prestige: { lo: 55.9998, hi: 102.9925 }, rank: { lo: 18.75, hi: 43.75 }, netMargin: { lo: -0.0404, hi: 0.21 }, weeksInTheRed: { lo: 0, hi: 66.25 } },
    { year: 20, cash: { lo: 534372.3324, hi: 34153112.3728 }, enrolled: { lo: 600, hi: 15300 }, prestige: { lo: 65.7208, hi: 131.9705 }, rank: { lo: 1, hi: 22.5 }, netMargin: { lo: -0.0425, hi: 0.1249 }, weeksInTheRed: { lo: 0, hi: 66.25 } },
    { year: 35, cash: { lo: 194842.1027, hi: 105440137.7146 }, enrolled: { lo: 600, hi: 41500 }, prestige: { lo: 66.5379, hi: 185.0456 }, rank: { lo: 1, hi: 28.75 }, netMargin: { lo: -0.0544, hi: 0.1191 }, weeksInTheRed: { lo: 0, hi: 66.25 } },
    { year: 50, cash: { lo: -883591.8335, hi: 798957408.6167 }, enrolled: { lo: 600, hi: 42700 }, prestige: { lo: 67.241, hi: 187.4289 }, rank: { lo: 1, hi: 31.25 }, netMargin: { lo: -0.0736, hi: 0.1558 }, weeksInTheRed: { lo: 0, hi: 81.25 } },
  ],
  "Overbuilder (beds ahead of demand)": [
    { year: 5, cash: { lo: -1632055.7726, hi: 1423337.1505 }, enrolled: { lo: 664.5, hi: 1215 }, prestige: { lo: 28.8577, hi: 50.2411 }, rank: { lo: 48.75, hi: 83.75 }, netMargin: { lo: -0.202, hi: 0.0761 }, weeksInTheRed: { lo: 0, hi: 70 } },
    { year: 10, cash: { lo: -4994777.0475, hi: -965089.1241 }, enrolled: { lo: 522.75, hi: 1052.5 }, prestige: { lo: 28.3398, hi: 50.6571 }, rank: { lo: 49.5, hi: 86.25 }, netMargin: { lo: -0.1399, hi: 0.0155 }, weeksInTheRed: { lo: 183.75, hi: 395 } },
    { year: 20, cash: { lo: -13776604.3961, hi: -1704260.4678 }, enrolled: { lo: 530.25, hi: 1123.75 }, prestige: { lo: 28.6164, hi: 51.3852 }, rank: { lo: 49.5, hi: 85 }, netMargin: { lo: -0.1421, hi: 0.0635 }, weeksInTheRed: { lo: 573.75, hi: 1045 } },
    { year: 35, cash: { lo: -24847833.745, hi: 822347.0135 }, enrolled: { lo: 537, hi: 1141.25 }, prestige: { lo: 28.7424, hi: 51.5907 }, rank: { lo: 51.75, hi: 91.25 }, netMargin: { lo: -0.1279, hi: 0.0797 }, weeksInTheRed: { lo: 1158.75, hi: 2020 } },
    { year: 50, cash: { lo: -34708763.0981, hi: 352642.5685 }, enrolled: { lo: 528.75, hi: 1203.75 }, prestige: { lo: 28.556, hi: 51.3952 }, rank: { lo: 55.5, hi: 95 }, netMargin: { lo: -0.1652, hi: 0.0272 }, weeksInTheRed: { lo: 1520.25, hi: 2995 } },
  ],
  "Earnest completionist": [
    { year: 5, cash: { lo: 946451.2103, hi: 6360903.5929 }, enrolled: { lo: 1920, hi: 5411.25 }, prestige: { lo: 47.3362, hi: 80.4558 }, rank: { lo: 37.5, hi: 65 }, netMargin: { lo: 0.2513, hi: 0.6146 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 10, cash: { lo: 11500653.6195, hi: 39001439.3526 }, enrolled: { lo: 11940, hi: 26400 }, prestige: { lo: 61.9486, hi: 115.1522 }, rank: { lo: 9, hi: 23.75 }, netMargin: { lo: 0.0289, hi: 0.2299 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 20, cash: { lo: 14579172.586, hi: 96486661.9882 }, enrolled: { lo: 19620, hi: 38200 }, prestige: { lo: 106.1828, hi: 179.3536 }, rank: { lo: 1, hi: 4 }, netMargin: { lo: -0.0096, hi: 0.0982 }, weeksInTheRed: { lo: 0, hi: 390 } },
    { year: 35, cash: { lo: 349857523.1615, hi: 761176834.3144 }, enrolled: { lo: 25140, hi: 41900 }, prestige: { lo: 112.3092, hi: 187.2642 }, rank: { lo: 1, hi: 4 }, netMargin: { lo: 0.037, hi: 0.2255 }, weeksInTheRed: { lo: 0, hi: 390 } },
    { year: 50, cash: { lo: 338998507.0706, hi: 5401811996.0376 }, enrolled: { lo: 25140, hi: 41900 }, prestige: { lo: 112.4945, hi: 187.4932 }, rank: { lo: 1, hi: 4 }, netMargin: { lo: 0.2703, hi: 0.8792 }, weeksInTheRed: { lo: 0, hi: 390 } },
  ],
  "Scatterer (founds anything anywhere)": [
    { year: 5, cash: { lo: 856542.2961, hi: 4361256.4452 }, enrolled: { lo: 1884.75, hi: 3857.5 }, prestige: { lo: 45.4907, hi: 79.4979 }, rank: { lo: 37.5, hi: 66.25 }, netMargin: { lo: 0.2212, hi: 0.6004 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 10, cash: { lo: 11055127.2362, hi: 30509404.4409 }, enrolled: { lo: 7680, hi: 18982.5 }, prestige: { lo: 56.4749, hi: 100.8312 }, rank: { lo: 17.25, hi: 40 }, netMargin: { lo: 0.093, hi: 0.4341 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 20, cash: { lo: 97354644.9304, hi: 202621433.7191 }, enrolled: { lo: 20580, hi: 34300 }, prestige: { lo: 77.567, hi: 134.8916 }, rank: { lo: 1, hi: 8 }, netMargin: { lo: 0.0136, hi: 0.138 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 35, cash: { lo: 247779643.9497, hi: 607141309.5503 }, enrolled: { lo: 20580, hi: 34300 }, prestige: { lo: 83.341, hi: 149.4557 }, rank: { lo: 1, hi: 10 }, netMargin: { lo: 0.0605, hi: 0.2683 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 50, cash: { lo: 552616394.9392, hi: 1547900241.8609 }, enrolled: { lo: 20580, hi: 34300 }, prestige: { lo: 85.2521, hi: 151.8222 }, rank: { lo: 1, hi: 6 }, netMargin: { lo: 0.1413, hi: 0.5002 }, weeksInTheRed: { lo: 0, hi: 10 } },
  ],
  "Selective college": [
    { year: 5, cash: { lo: 267944.3626, hi: 3966222.5117 }, enrolled: { lo: 862.5, hi: 1483.75 }, prestige: { lo: 50.4371, hi: 86.2744 }, rank: { lo: 29.25, hi: 57.5 }, netMargin: { lo: 0.4455, hi: 0.8046 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 10, cash: { lo: 5123111.8272, hi: 12445381.4886 }, enrolled: { lo: 3142.5, hi: 5811.25 }, prestige: { lo: 63.2109, hi: 113.3127 }, rank: { lo: 5, hi: 25 }, netMargin: { lo: 0.2236, hi: 0.6023 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 20, cash: { lo: -1412513.4375, hi: 35090078.642 }, enrolled: { lo: 3073.5, hi: 5182.5 }, prestige: { lo: 106.5143, hi: 179.7611 }, rank: { lo: 1, hi: 4 }, netMargin: { lo: -0.0898, hi: 0.0403 }, weeksInTheRed: { lo: 0, hi: 16 } },
    { year: 35, cash: { lo: 4563316.8687, hi: 219144991.8414 }, enrolled: { lo: 2994, hi: 5035 }, prestige: { lo: 112.3267, hi: 187.276 }, rank: { lo: 1, hi: 4 }, netMargin: { lo: -0.048, hi: 0.3789 }, weeksInTheRed: { lo: 0, hi: 741.25 } },
    { year: 50, cash: { lo: 10877833.4572, hi: 1005307944.6676 }, enrolled: { lo: 2999.25, hi: 5010 }, prestige: { lo: 112.495, hi: 187.4935 }, rank: { lo: 1, hi: 4 }, netMargin: { lo: -0.0385, hi: 0.8502 }, weeksInTheRed: { lo: 0, hi: 741.25 } },
  ],
  "Regional engine": [
    { year: 5, cash: { lo: 2799721.9451, hi: 6431985.9843 }, enrolled: { lo: 1920, hi: 3700 }, prestige: { lo: 46.684, hi: 81.195 }, rank: { lo: 36.75, hi: 62.5 }, netMargin: { lo: 0.2192, hi: 0.4495 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 10, cash: { lo: 7576605.6686, hi: 45570263.3212 }, enrolled: { lo: 7260, hi: 16300 }, prestige: { lo: 54.3989, hi: 107.6053 }, rank: { lo: 12.75, hi: 43.75 }, netMargin: { lo: 0.0671, hi: 0.3871 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 20, cash: { lo: 33853499.2638, hi: 163350167.6422 }, enrolled: { lo: 22200, hi: 37700 }, prestige: { lo: 97.3719, hi: 169.3534 }, rank: { lo: 1, hi: 4 }, netMargin: { lo: -0.0496, hi: 0.0961 }, weeksInTheRed: { lo: 0, hi: 138.75 } },
    { year: 35, cash: { lo: 10919087.444, hi: 215684112.7636 }, enrolled: { lo: 23340, hi: 41900 }, prestige: { lo: 112.0214, hi: 186.9131 }, rank: { lo: 1, hi: 4 }, netMargin: { lo: -0.0288, hi: 0.0889 }, weeksInTheRed: { lo: 0, hi: 138.75 } },
    { year: 50, cash: { lo: 69607485.5257, hi: 317600696.1303 }, enrolled: { lo: 24300, hi: 41900 }, prestige: { lo: 112.4861, hi: 187.483 }, rank: { lo: 1, hi: 5 }, netMargin: { lo: -0.0433, hi: 0.0857 }, weeksInTheRed: { lo: 0, hi: 138.75 } },
  ],
  "Idle (builds nothing)": [
    { year: 5, cash: { lo: 4514572.838, hi: 7845611.8133 }, enrolled: { lo: 311.25, hi: 518.75 }, prestige: { lo: 30.5246, hi: 50.8743 }, rank: { lo: 46.5, hi: 80 }, netMargin: { lo: 0.1132, hi: 0.2132 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 10, cash: { lo: 5818632.5823, hi: 10211251.449 }, enrolled: { lo: 339, hi: 565 }, prestige: { lo: 30.6277, hi: 51.0615 }, rank: { lo: 46.5, hi: 83.75 }, netMargin: { lo: 0.0296, hi: 0.1304 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 20, cash: { lo: 8775561.8855, hi: 15213386.9544 }, enrolled: { lo: 338.25, hi: 563.75 }, prestige: { lo: 31.0891, hi: 51.837 }, rank: { lo: 50.25, hi: 86.25 }, netMargin: { lo: 0.0534, hi: 0.1616 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 35, cash: { lo: 14616020.7476, hi: 25890075.2205 }, enrolled: { lo: 339, hi: 565 }, prestige: { lo: 31.2864, hi: 52.2386 }, rank: { lo: 54, hi: 92.5 }, netMargin: { lo: 0.0973, hi: 0.2158 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 50, cash: { lo: 22852848.7399, hi: 41493772.2725 }, enrolled: { lo: 339.75, hi: 566.25 }, prestige: { lo: 31.4764, hi: 52.6414 }, rank: { lo: 53.25, hi: 93.75 }, netMargin: { lo: 0.1511, hi: 0.2924 }, weeksInTheRed: { lo: 0, hi: 10 } },
  ],
};
// --- END GENERATED ---
