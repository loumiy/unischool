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
    { year: 20, cash: { lo: 9382861.8253, hi: 40511839.8398 }, enrolled: { lo: 9642.75, hi: 23420 }, prestige: { lo: 52.3549, hi: 101.3984 }, rank: { lo: 20.25, hi: 55 }, netMargin: { lo: 0.1582, hi: 0.447 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 35, cash: { lo: 145994275.6934, hi: 344182271.7312 }, enrolled: { lo: 21900, hi: 39900 }, prestige: { lo: 107.4141, hi: 183.7894 }, rank: { lo: 1, hi: 4 }, netMargin: { lo: 0.032, hi: 0.1827 }, weeksInTheRed: { lo: 0, hi: 22 } },
    { year: 50, cash: { lo: 518468169.0078, hi: 1285252317.2652 }, enrolled: { lo: 24660, hi: 41300 }, prestige: { lo: 112.2665, hi: 187.3926 }, rank: { lo: 1, hi: 4 }, netMargin: { lo: 0.0548, hi: 0.3595 }, weeksInTheRed: { lo: 0, hi: 22 } },
  ],
  "Curriculum rush (overreach)": [
    { year: 5, cash: { lo: -734523.703, hi: 2291039.5804 }, enrolled: { lo: 904.5, hi: 1693.75 }, prestige: { lo: 34.1594, hi: 59.9461 }, rank: { lo: 41.25, hi: 75 }, netMargin: { lo: 0.3079, hi: 0.5857 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 10, cash: { lo: -928053.2114, hi: 1285803.6126 }, enrolled: { lo: 1087.5, hi: 2240 }, prestige: { lo: 36.7372, hi: 63.1534 }, rank: { lo: 42, hi: 73.75 }, netMargin: { lo: 0.0803, hi: 0.2746 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 20, cash: { lo: 1177077.5072, hi: 7157810.3565 }, enrolled: { lo: 2129.25, hi: 4207.5 }, prestige: { lo: 42.0633, hi: 72.9843 }, rank: { lo: 39.75, hi: 70 }, netMargin: { lo: 0.1481, hi: 0.3378 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 35, cash: { lo: 35287.0744, hi: 179633268.4496 }, enrolled: { lo: 15302.25, hi: 40600 }, prestige: { lo: 60.6169, hi: 137.7557 }, rank: { lo: 2, hi: 37.5 }, netMargin: { lo: -0.0172, hi: 0.4112 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 50, cash: { lo: 69269130.7172, hi: 1409593758.4254 }, enrolled: { lo: 24960, hi: 41700 }, prestige: { lo: 110.1986, hi: 185.975 }, rank: { lo: 1, hi: 4 }, netMargin: { lo: 0.0071, hi: 0.1522 }, weeksInTheRed: { lo: 0, hi: 44 } },
  ],
  "Discount volume (beds first)": [
    { year: 5, cash: { lo: -2696991.6015, hi: 2888185.6442 }, enrolled: { lo: 360, hi: 1488.75 }, prestige: { lo: 39.5497, hi: 86.1832 }, rank: { lo: 29.25, hi: 68.75 }, netMargin: { lo: -0.2135, hi: 0.1519 }, weeksInTheRed: { lo: 0, hi: 63.75 } },
    { year: 10, cash: { lo: -8596850.7755, hi: 7883190.0703 }, enrolled: { lo: 360, hi: 3131.25 }, prestige: { lo: 39.9495, hi: 100.1452 }, rank: { lo: 17.25, hi: 73.75 }, netMargin: { lo: -0.0544, hi: 0.4005 }, weeksInTheRed: { lo: 0, hi: 388.75 } },
    { year: 20, cash: { lo: -8539420.2687, hi: 17326778.4432 }, enrolled: { lo: 360, hi: 7900 }, prestige: { lo: 46.9158, hi: 106.0269 }, rank: { lo: 13.5, hi: 62.5 }, netMargin: { lo: -0.0537, hi: 0.0624 }, weeksInTheRed: { lo: 0, hi: 1038.75 } },
    { year: 35, cash: { lo: -5874987.29, hi: 5289716.8083 }, enrolled: { lo: 360, hi: 7900 }, prestige: { lo: 55.5499, hi: 106.6705 }, rank: { lo: 17.25, hi: 52.5 }, netMargin: { lo: -0.0566, hi: 0.0677 }, weeksInTheRed: { lo: 66, hi: 2013.75 } },
    { year: 50, cash: { lo: -2753532.9817, hi: 1270334.6329 }, enrolled: { lo: 360, hi: 7900 }, prestige: { lo: 56.3889, hi: 106.7508 }, rank: { lo: 18.75, hi: 50 }, netMargin: { lo: -0.0572, hi: 0.072 }, weeksInTheRed: { lo: 66, hi: 2988.75 } },
  ],
  "Completionist (build everything)": [
    { year: 5, cash: { lo: 180424.9395, hi: 5756101.0344 }, enrolled: { lo: 908.25, hi: 1841.25 }, prestige: { lo: 30.8316, hi: 63.1189 }, rank: { lo: 41.25, hi: 78.75 }, netMargin: { lo: 0.2502, hi: 0.6087 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 10, cash: { lo: 368626.666, hi: 14012789.8805 }, enrolled: { lo: 1635.75, hi: 3253.75 }, prestige: { lo: 34.0958, hi: 72.3159 }, rank: { lo: 39.75, hi: 75 }, netMargin: { lo: 0.1988, hi: 0.4927 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 20, cash: { lo: 26407956.6375, hi: 63104555.6339 }, enrolled: { lo: 9702, hi: 28000 }, prestige: { lo: 54.6756, hi: 120.9684 }, rank: { lo: 9.75, hi: 46.25 }, netMargin: { lo: 0.02, hi: 0.3666 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 35, cash: { lo: 68518830.3098, hi: 356217531.5412 }, enrolled: { lo: 13320, hi: 36000 }, prestige: { lo: 109.1632, hi: 184.4024 }, rank: { lo: 1, hi: 4 }, netMargin: { lo: 0.0004, hi: 0.122 }, weeksInTheRed: { lo: 0, hi: 126.25 } },
    { year: 50, cash: { lo: 147433368.2747, hi: 831565689.0564 }, enrolled: { lo: 13320, hi: 42000 }, prestige: { lo: 112.4034, hi: 187.4103 }, rank: { lo: 1, hi: 4 }, netMargin: { lo: 0.0401, hi: 0.1629 }, weeksInTheRed: { lo: 0, hi: 126.25 } },
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
    { year: 10, cash: { lo: 10391444.4619, hi: 19524089.9776 }, enrolled: { lo: 11340, hi: 24462.5 }, prestige: { lo: 52.7406, hi: 94.1639 }, rank: { lo: 26.25, hi: 53.75 }, netMargin: { lo: 0.2675, hi: 0.5597 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 20, cash: { lo: 36817239.3263, hi: 346432123.0808 }, enrolled: { lo: 22560, hi: 39400 }, prestige: { lo: 104.9457, hi: 177.4116 }, rank: { lo: 1, hi: 4 }, netMargin: { lo: 0.0013, hi: 0.1219 }, weeksInTheRed: { lo: 0, hi: 177.5 } },
    { year: 35, cash: { lo: 814494207.3713, hi: 2781704679.1513 }, enrolled: { lo: 24780, hi: 42100 }, prestige: { lo: 112.2813, hi: 187.2079 }, rank: { lo: 1, hi: 4 }, netMargin: { lo: 0.1213, hi: 0.3215 }, weeksInTheRed: { lo: 0, hi: 177.5 } },
    { year: 50, cash: { lo: 1044231231.4277, hi: 3642438742.1274 }, enrolled: { lo: 24780, hi: 42100 }, prestige: { lo: 112.4937, hi: 187.4915 }, rank: { lo: 1, hi: 4 }, netMargin: { lo: 0.5211, hi: 1.2698 }, weeksInTheRed: { lo: 0, hi: 177.5 } },
  ],
  "Scatterer (founds anything anywhere)": [
    { year: 5, cash: { lo: -294.8329, hi: 2497088.6805 }, enrolled: { lo: 957.75, hi: 1693.75 }, prestige: { lo: 31.5267, hi: 54.8549 }, rank: { lo: 42.75, hi: 78.75 }, netMargin: { lo: 0.2521, hi: 0.543 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 10, cash: { lo: 763215.5944, hi: 5600914.4717 }, enrolled: { lo: 1169.25, hi: 3068.75 }, prestige: { lo: 34.9719, hi: 65.6052 }, rank: { lo: 42, hi: 77.5 }, netMargin: { lo: 0.096, hi: 0.3354 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 20, cash: { lo: 5313653.3447, hi: 59039153.6579 }, enrolled: { lo: 2761.5, hi: 23342.5 }, prestige: { lo: 42.7487, hi: 92.4179 }, rank: { lo: 24, hi: 71.25 }, netMargin: { lo: 0.1116, hi: 0.4706 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 35, cash: { lo: 81127160.9559, hi: 301741080.1727 }, enrolled: { lo: 20820, hi: 34900 }, prestige: { lo: 59.951, hi: 116.9306 }, rank: { lo: 10.5, hi: 42.5 }, netMargin: { lo: 0.1451, hi: 0.2741 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 50, cash: { lo: 197393479.7868, hi: 1488828679.6197 }, enrolled: { lo: 20940, hi: 34900 }, prestige: { lo: 68.4315, hi: 120.5273 }, rank: { lo: 11.25, hi: 26.25 }, netMargin: { lo: 0.254, hi: 0.479 }, weeksInTheRed: { lo: 0, hi: 10 } },
  ],
  "Selective college": [
    { year: 5, cash: { lo: -92961.2369, hi: 2466928.8467 }, enrolled: { lo: 661.5, hi: 1136.25 }, prestige: { lo: 44.9874, hi: 77.0822 }, rank: { lo: 36.75, hi: 67.5 }, netMargin: { lo: 0.411, hi: 0.7144 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 10, cash: { lo: 2372230.6177, hi: 7320598.7268 }, enrolled: { lo: 1713.75, hi: 3548.75 }, prestige: { lo: 52.0436, hi: 97.4879 }, rank: { lo: 16.5, hi: 52.5 }, netMargin: { lo: 0.1763, hi: 0.4547 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 20, cash: { lo: 7554796.2091, hi: 30645013.096 }, enrolled: { lo: 3318.75, hi: 6237.5 }, prestige: { lo: 98.2858, hi: 172.3009 }, rank: { lo: 1, hi: 4 }, netMargin: { lo: -0.0763, hi: 0.0677 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 35, cash: { lo: 24983530.671, hi: 79580695.4532 }, enrolled: { lo: 3011.25, hi: 5032.5 }, prestige: { lo: 111.3387, hi: 187.06 }, rank: { lo: 1, hi: 4 }, netMargin: { lo: 0.0286, hi: 0.2096 }, weeksInTheRed: { lo: 0, hi: 377.5 } },
    { year: 50, cash: { lo: 89391688.6891, hi: 368660519.1018 }, enrolled: { lo: 3003.75, hi: 5015 }, prestige: { lo: 112.4583, hi: 187.4873 }, rank: { lo: 1, hi: 4 }, netMargin: { lo: 0.1492, hi: 0.4078 }, weeksInTheRed: { lo: 0, hi: 377.5 } },
  ],
  "Regional engine": [
    { year: 5, cash: { lo: 717984.9612, hi: 4715191.2734 }, enrolled: { lo: 1484.25, hi: 2718.75 }, prestige: { lo: 34.2129, hi: 60.0756 }, rank: { lo: 42, hi: 75 }, netMargin: { lo: 0.4742, hi: 0.9058 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 10, cash: { lo: 5600518.3934, hi: 21141293.1562 }, enrolled: { lo: 4200, hi: 9900 }, prestige: { lo: 42.0779, hi: 76.4445 }, rank: { lo: 37.5, hi: 68.75 }, netMargin: { lo: 0.2678, hi: 0.5291 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 20, cash: { lo: -35069483.6269, hi: 53806593.7932 }, enrolled: { lo: 20400, hi: 38700 }, prestige: { lo: 93.5228, hi: 167.299 }, rank: { lo: 1, hi: 4 }, netMargin: { lo: -0.0431, hi: 0.133 }, weeksInTheRed: { lo: 0, hi: 202.5 } },
    { year: 35, cash: { lo: 72127450.5349, hi: 149055253.7328 }, enrolled: { lo: 22920, hi: 39400 }, prestige: { lo: 107.306, hi: 186.915 }, rank: { lo: 1, hi: 4 }, netMargin: { lo: -0.0391, hi: 0.1074 }, weeksInTheRed: { lo: 0, hi: 202.5 } },
    { year: 50, cash: { lo: 100708443.3234, hi: 436572765.569 }, enrolled: { lo: 22920, hi: 40000 }, prestige: { lo: 112.3484, hi: 187.4831 }, rank: { lo: 1, hi: 4 }, netMargin: { lo: -0.0444, hi: 0.1032 }, weeksInTheRed: { lo: 0, hi: 202.5 } },
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
