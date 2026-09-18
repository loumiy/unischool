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
//   - The Idle school falls further than "into the 30s": to the bottom of
//     the field, because a campus with nothing built takes the full
//     crowding penalty and no welfare, which is the penalty working.
//   - The Overbuilder is underwater by year 5 and STALLS rather than
//     recovering by 15: it hovers at break-even for the rest of the run,
//     in and out of the red, at seven hundred students. Recovery would
//     take a price change the scripted archetype never makes.
export const TARGETS: Reference = {
  'Balanced builder': [
    { year: 5, cash: { lo: -2_000_000, hi: 20_000_000 }, enrolled: { lo: 1_000, hi: 2_500 }, prestige: { lo: 42, hi: 62 }, rank: { lo: 40, hi: 70 }, netMargin: { lo: 0.1, hi: 0.6 }, weeksInTheRed: { lo: 0, hi: 60 } },
    { year: 10, cash: { lo: -2_000_000, hi: 40_000_000 }, enrolled: { lo: 1_800, hi: 7_000 }, prestige: { lo: 40, hi: 76 }, rank: { lo: 30, hi: 75 }, netMargin: { lo: 0.1, hi: 0.6 }, weeksInTheRed: { lo: 0, hi: 120 } },
    { year: 20, cash: { lo: -5_000_000, hi: 300_000_000 }, enrolled: { lo: 10_000, hi: 18_000 }, prestige: { lo: 60, hi: 100 }, rank: { lo: 8, hi: 55 }, netMargin: { lo: 0.05, hi: 0.5 }, weeksInTheRed: { lo: 0, hi: 200 } },
    { year: 35, cash: { lo: -20_000_000, hi: 2_000_000_000 }, enrolled: { lo: 15_000, hi: 32_000 }, prestige: { lo: 100, hi: 150 }, rank: { lo: 1, hi: 8 }, netMargin: { lo: -0.05, hi: 0.2 }, weeksInTheRed: { lo: 0, hi: 400 } },
    { year: 50, cash: { lo: -20_000_000, hi: 5_000_000_000 }, enrolled: { lo: 18_000, hi: 35_000 }, prestige: { lo: 110, hi: 150 }, rank: { lo: 1, hi: 5 }, netMargin: { lo: 0.02, hi: 0.3 }, weeksInTheRed: { lo: 0, hi: 500 } },
  ],
  'Idle (builds nothing)': [
    { year: 5, cash: { lo: 0, hi: 50_000_000 }, enrolled: { lo: 0, hi: 600 }, prestige: { lo: 5, hi: 40 }, rank: { lo: 60, hi: 100 }, netMargin: { lo: -1, hi: 3 }, weeksInTheRed: { lo: 0, hi: 100 } },
    { year: 10, cash: { lo: 0, hi: 50_000_000 }, enrolled: { lo: 0, hi: 300 }, prestige: { lo: 5, hi: 35 }, rank: { lo: 60, hi: 100 }, netMargin: { lo: -1, hi: 3 }, weeksInTheRed: { lo: 0, hi: 200 } },
    { year: 20, cash: { lo: 0, hi: 50_000_000 }, enrolled: { lo: 0, hi: 300 }, prestige: { lo: 5, hi: 35 }, rank: { lo: 60, hi: 100 }, netMargin: { lo: -1, hi: 3 }, weeksInTheRed: { lo: 0, hi: 500 } },
    { year: 35, cash: { lo: 0, hi: 50_000_000 }, enrolled: { lo: 0, hi: 300 }, prestige: { lo: 5, hi: 35 }, rank: { lo: 60, hi: 100 }, netMargin: { lo: -1, hi: 3 }, weeksInTheRed: { lo: 0, hi: 1_000 } },
    { year: 50, cash: { lo: 0, hi: 50_000_000 }, enrolled: { lo: 0, hi: 300 }, prestige: { lo: 5, hi: 35 }, rank: { lo: 60, hi: 100 }, netMargin: { lo: -1, hi: 3 }, weeksInTheRed: { lo: 0, hi: 1_500 } },
  ],
  'Overbuilder (beds ahead of demand)': [
    { year: 5, cash: { lo: -6_000_000, hi: 0 }, enrolled: { lo: 300, hi: 2_000 }, prestige: { lo: 30, hi: 65 }, rank: { lo: 40, hi: 90 }, netMargin: { lo: -0.5, hi: 0.15 }, weeksInTheRed: { lo: 1, hi: 260 } },
    { year: 10, cash: { lo: -8_000_000, hi: 3_000_000 }, enrolled: { lo: 300, hi: 3_000 }, prestige: { lo: 30, hi: 70 }, rank: { lo: 35, hi: 90 }, netMargin: { lo: -0.5, hi: 0.2 }, weeksInTheRed: { lo: 1, hi: 520 } },
    { year: 20, cash: { lo: -10_000_000, hi: 10_000_000 }, enrolled: { lo: 300, hi: 5_000 }, prestige: { lo: 30, hi: 75 }, rank: { lo: 30, hi: 90 }, netMargin: { lo: -0.4, hi: 0.3 }, weeksInTheRed: { lo: 1, hi: 1_040 } },
    { year: 35, cash: { lo: -15_000_000, hi: 30_000_000 }, enrolled: { lo: 300, hi: 8_000 }, prestige: { lo: 30, hi: 80 }, rank: { lo: 25, hi: 90 }, netMargin: { lo: -0.4, hi: 0.4 }, weeksInTheRed: { lo: 1, hi: 1_820 } },
    { year: 50, cash: { lo: -20_000_000, hi: 60_000_000 }, enrolled: { lo: 300, hi: 10_000 }, prestige: { lo: 30, hi: 85 }, rank: { lo: 20, hi: 90 }, netMargin: { lo: -0.4, hi: 0.5 }, weeksInTheRed: { lo: 1, hi: 2_600 } },
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
    { year: 5, cash: { lo: 180424.9395, hi: 5756101.0344 }, enrolled: { lo: 908.25, hi: 1841.25 }, prestige: { lo: 30.8316, hi: 63.1189 }, rank: { lo: 41.25, hi: 78.75 }, netMargin: { lo: 0.2502, hi: 0.6087 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 10, cash: { lo: 58245.344, hi: 12816031.8815 }, enrolled: { lo: 1555.5, hi: 3343.75 }, prestige: { lo: 34.0958, hi: 67.5111 }, rank: { lo: 42, hi: 75 }, netMargin: { lo: 0.1882, hi: 0.4927 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 20, cash: { lo: 9382861.8253, hi: 23751770.0022 }, enrolled: { lo: 9642.75, hi: 28031.25 }, prestige: { lo: 52.3549, hi: 113.8664 }, rank: { lo: 10.5, hi: 55 }, netMargin: { lo: 0.1296, hi: 0.4184 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 35, cash: { lo: 220574200.9162, hi: 591872465.853 }, enrolled: { lo: 21900, hi: 39000 }, prestige: { lo: 107.5243, hi: 185.0553 }, rank: { lo: 1, hi: 4 }, netMargin: { lo: 0.0516, hi: 0.1912 }, weeksInTheRed: { lo: 0, hi: 137.5 } },
    { year: 50, cash: { lo: 312212954.3407, hi: 1980265845.2106 }, enrolled: { lo: 24780, hi: 41300 }, prestige: { lo: 112.3436, hi: 187.4292 }, rank: { lo: 1, hi: 4 }, netMargin: { lo: 0.1337, hi: 0.2618 }, weeksInTheRed: { lo: 0, hi: 137.5 } },
  ],
  "Curriculum rush (overreach)": [
    { year: 5, cash: { lo: -734523.703, hi: 2291039.5804 }, enrolled: { lo: 904.5, hi: 1693.75 }, prestige: { lo: 34.1594, hi: 59.9461 }, rank: { lo: 41.25, hi: 75 }, netMargin: { lo: 0.3079, hi: 0.5857 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 10, cash: { lo: -928053.2114, hi: 1285803.6126 }, enrolled: { lo: 1087.5, hi: 2240 }, prestige: { lo: 36.7372, hi: 63.1534 }, rank: { lo: 42, hi: 73.75 }, netMargin: { lo: 0.0803, hi: 0.2746 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 20, cash: { lo: 1177077.5072, hi: 7157810.3565 }, enrolled: { lo: 2129.25, hi: 4207.5 }, prestige: { lo: 42.0633, hi: 72.9843 }, rank: { lo: 39.75, hi: 70 }, netMargin: { lo: 0.1481, hi: 0.3378 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 35, cash: { lo: 136337925.7833, hi: 293777896.8939 }, enrolled: { lo: 16907.25, hi: 40500 }, prestige: { lo: 62.665, hi: 138.3911 }, rank: { lo: 3, hi: 32.5 }, netMargin: { lo: -0.0034, hi: 0.4487 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 50, cash: { lo: 32372408.0583, hi: 394397190.9256 }, enrolled: { lo: 24900, hi: 41700 }, prestige: { lo: 110.6386, hi: 185.9739 }, rank: { lo: 1, hi: 4 }, netMargin: { lo: 0.0136, hi: 0.1623 }, weeksInTheRed: { lo: 0, hi: 10 } },
  ],
  "Discount volume (beds first)": [
    { year: 5, cash: { lo: -2696991.6015, hi: 2888185.6442 }, enrolled: { lo: 360, hi: 1488.75 }, prestige: { lo: 39.5497, hi: 86.1832 }, rank: { lo: 26.25, hi: 68.75 }, netMargin: { lo: -0.2135, hi: 0.1519 }, weeksInTheRed: { lo: 0, hi: 63.75 } },
    { year: 10, cash: { lo: -8596850.7755, hi: 7883190.0703 }, enrolled: { lo: 360, hi: 3131.25 }, prestige: { lo: 39.9495, hi: 100.1452 }, rank: { lo: 17.25, hi: 73.75 }, netMargin: { lo: -0.0544, hi: 0.4005 }, weeksInTheRed: { lo: 0, hi: 388.75 } },
    { year: 20, cash: { lo: -8539420.2687, hi: 17326778.4432 }, enrolled: { lo: 360, hi: 7900 }, prestige: { lo: 46.9158, hi: 106.0269 }, rank: { lo: 16.5, hi: 62.5 }, netMargin: { lo: -0.0537, hi: 0.0624 }, weeksInTheRed: { lo: 0, hi: 1038.75 } },
    { year: 35, cash: { lo: -5874987.29, hi: 1228480.5059 }, enrolled: { lo: 360, hi: 7900 }, prestige: { lo: 55.3028, hi: 106.6705 }, rank: { lo: 15.75, hi: 51.25 }, netMargin: { lo: -0.0385, hi: 0.0715 }, weeksInTheRed: { lo: 53.25, hi: 2013.75 } },
    { year: 50, cash: { lo: -2753532.9817, hi: 4970793.9176 }, enrolled: { lo: 360, hi: 7900 }, prestige: { lo: 56.3712, hi: 106.8038 }, rank: { lo: 21, hi: 56.25 }, netMargin: { lo: -0.1041, hi: 0.072 }, weeksInTheRed: { lo: 90, hi: 2988.75 } },
  ],
  "Completionist (build everything)": [
    { year: 5, cash: { lo: 180424.9395, hi: 5756101.0344 }, enrolled: { lo: 908.25, hi: 1841.25 }, prestige: { lo: 30.8316, hi: 63.1189 }, rank: { lo: 41.25, hi: 78.75 }, netMargin: { lo: 0.2502, hi: 0.6087 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 10, cash: { lo: 368626.666, hi: 14012789.8805 }, enrolled: { lo: 1635.75, hi: 3253.75 }, prestige: { lo: 34.0958, hi: 72.3159 }, rank: { lo: 39.75, hi: 75 }, netMargin: { lo: 0.1988, hi: 0.4927 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 20, cash: { lo: 26719061.9012, hi: 70314443.3322 }, enrolled: { lo: 9702, hi: 27300 }, prestige: { lo: 54.6756, hi: 133.5852 }, rank: { lo: 3, hi: 46.25 }, netMargin: { lo: -0.0742, hi: 0.3666 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 35, cash: { lo: 126243201.8437, hi: 325510566.3249 }, enrolled: { lo: 16380, hi: 38800 }, prestige: { lo: 104.9701, hi: 184.9429 }, rank: { lo: 1, hi: 4 }, netMargin: { lo: 0.0109, hi: 0.1684 }, weeksInTheRed: { lo: 0, hi: 196.25 } },
    { year: 50, cash: { lo: 72948531.8127, hi: 334890513.9485 }, enrolled: { lo: 24960, hi: 42100 }, prestige: { lo: 112.2388, hi: 187.426 }, rank: { lo: 1, hi: 4 }, netMargin: { lo: 0.0626, hi: 0.1859 }, weeksInTheRed: { lo: 0, hi: 196.25 } },
  ],
  "Overbuilder (beds ahead of demand)": [
    { year: 5, cash: { lo: -2394424.3629, hi: 751323.4642 }, enrolled: { lo: 420, hi: 900 }, prestige: { lo: 37.8259, hi: 66.6353 }, rank: { lo: 40.5, hi: 71.25 }, netMargin: { lo: -0.1062, hi: 0.0333 }, weeksInTheRed: { lo: 12, hi: 128.75 } },
    { year: 10, cash: { lo: -3151635.2545, hi: 1499474.5994 }, enrolled: { lo: 420, hi: 900 }, prestige: { lo: 38.0362, hi: 69.2564 }, rank: { lo: 39.75, hi: 73.75 }, netMargin: { lo: -0.1373, hi: 0.0314 }, weeksInTheRed: { lo: 96.75, hi: 453.75 } },
    { year: 20, cash: { lo: -4201367.6207, hi: 1079175.4703 }, enrolled: { lo: 420, hi: 900 }, prestige: { lo: 38.4073, hi: 70.9916 }, rank: { lo: 40.5, hi: 73.75 }, netMargin: { lo: -0.0757, hi: 0.0618 }, weeksInTheRed: { lo: 373.5, hi: 1103.75 } },
    { year: 35, cash: { lo: -6540592.6017, hi: 1144685.9033 }, enrolled: { lo: 420, hi: 1100 }, prestige: { lo: 36.6112, hi: 71.2842 }, rank: { lo: 41.25, hi: 78.75 }, netMargin: { lo: -0.0679, hi: 0.1109 }, weeksInTheRed: { lo: 767.25, hi: 2078.75 } },
    { year: 50, cash: { lo: -8540761.4699, hi: 948715.2221 }, enrolled: { lo: 420, hi: 1100 }, prestige: { lo: 34.5256, hi: 71.3516 }, rank: { lo: 41.25, hi: 85 }, netMargin: { lo: -0.0619, hi: 0.1285 }, weeksInTheRed: { lo: 1059, hi: 3053.75 } },
  ],
  "Earnest completionist": [
    { year: 5, cash: { lo: 502209.4296, hi: 5001357.0851 }, enrolled: { lo: 1380, hi: 4003.75 }, prestige: { lo: 42.692, hi: 73.837 }, rank: { lo: 40.5, hi: 68.75 }, netMargin: { lo: 0.3303, hi: 0.6908 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 10, cash: { lo: 9519087.483, hi: 36444564.6628 }, enrolled: { lo: 10560, hi: 24263.75 }, prestige: { lo: 52.0215, hi: 94.1247 }, rank: { lo: 28.5, hi: 55 }, netMargin: { lo: 0.2555, hi: 0.6022 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 20, cash: { lo: 9553351.7015, hi: 89999990.0062 }, enrolled: { lo: 19980, hi: 37500 }, prestige: { lo: 102.4858, hi: 176.0555 }, rank: { lo: 1, hi: 4 }, netMargin: { lo: 0.0122, hi: 0.1261 }, weeksInTheRed: { lo: 107.25, hi: 278.75 } },
    { year: 35, cash: { lo: 583936075.7048, hi: 1596470592.3911 }, enrolled: { lo: 24780, hi: 42100 }, prestige: { lo: 112.1897, hi: 187.1687 }, rank: { lo: 1, hi: 4 }, netMargin: { lo: 0.052, hi: 0.247 }, weeksInTheRed: { lo: 107.25, hi: 278.75 } },
    { year: 50, cash: { lo: 2719801049.2994, hi: 5741988192.3057 }, enrolled: { lo: 24780, hi: 42100 }, prestige: { lo: 112.491, hi: 187.4904 }, rank: { lo: 1, hi: 4 }, netMargin: { lo: 0.3575, hi: 0.6977 }, weeksInTheRed: { lo: 107.25, hi: 278.75 } },
  ],
  "Scatterer (founds anything anywhere)": [
    { year: 5, cash: { lo: -294.8329, hi: 2497088.6805 }, enrolled: { lo: 957.75, hi: 1693.75 }, prestige: { lo: 31.5267, hi: 54.8549 }, rank: { lo: 42.75, hi: 78.75 }, netMargin: { lo: 0.2521, hi: 0.543 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 10, cash: { lo: 763215.5944, hi: 5600914.4717 }, enrolled: { lo: 1169.25, hi: 3068.75 }, prestige: { lo: 34.9719, hi: 65.6052 }, rank: { lo: 42, hi: 77.5 }, netMargin: { lo: 0.096, hi: 0.3354 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 20, cash: { lo: 5313653.3447, hi: 33080402.9205 }, enrolled: { lo: 2761.5, hi: 28035 }, prestige: { lo: 42.7487, hi: 95.4054 }, rank: { lo: 24, hi: 71.25 }, netMargin: { lo: 0.1116, hi: 0.4706 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 35, cash: { lo: 66299749.5141, hi: 284028566.9385 }, enrolled: { lo: 19620, hi: 34900 }, prestige: { lo: 59.7101, hi: 126.6754 }, rank: { lo: 8, hi: 45 }, netMargin: { lo: 0.1388, hi: 0.3272 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 50, cash: { lo: 151755935.1006, hi: 1256154721.4796 }, enrolled: { lo: 20940, hi: 34900 }, prestige: { lo: 69.359, hi: 130.3432 }, rank: { lo: 5, hi: 30 }, netMargin: { lo: 0.2533, hi: 0.4466 }, weeksInTheRed: { lo: 0, hi: 10 } },
  ],
  "Idle (builds nothing)": [
    { year: 5, cash: { lo: 11602386.7347, hi: 19539570.9579 }, enrolled: { lo: 98, hi: 298 }, prestige: { lo: 13.806, hi: 23.0205 }, rank: { lo: 68.25, hi: 116.25 }, netMargin: { lo: 0.5444, hi: 0.9274 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 10, cash: { lo: 12468229.6168, hi: 20925237.858 }, enrolled: { lo: 0, hi: 157 }, prestige: { lo: 10.3183, hi: 17.3336 }, rank: { lo: 71.25, hi: 118.75 }, netMargin: { lo: -0.2406, hi: -0.1173 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 20, cash: { lo: 11008194.5976, hi: 18597038.3322 }, enrolled: { lo: 0, hi: 150 }, prestige: { lo: 10.5602, hi: 17.8181 }, rank: { lo: 68.25, hi: 120 }, netMargin: { lo: -0.2317, hi: -0.1048 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 35, cash: { lo: 10123737.9077, hi: 17173479.2842 }, enrolled: { lo: 0, hi: 156 }, prestige: { lo: 11.3254, hi: 18.8992 }, rank: { lo: 69.75, hi: 120 }, netMargin: { lo: -0.0181, hi: 0.0871 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 50, cash: { lo: 11384889.5634, hi: 19373866.7419 }, enrolled: { lo: 0, hi: 163 }, prestige: { lo: 11.9818, hi: 20.1109 }, rank: { lo: 71.25, hi: 118.75 }, netMargin: { lo: 0.1883, hi: 0.3576 }, weeksInTheRed: { lo: 0, hi: 10 } },
  ],
};
// --- END GENERATED ---
