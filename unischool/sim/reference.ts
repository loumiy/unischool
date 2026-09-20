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
    { year: 5, cash: { lo: 760095.6524, hi: 5936666.3795 }, enrolled: { lo: 1680, hi: 3000 }, prestige: { lo: 45.4015, hi: 81.7767 }, rank: { lo: 36, hi: 65 }, netMargin: { lo: 0.1745, hi: 0.3858 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 10, cash: { lo: 7966215.1678, hi: 19866252.8458 }, enrolled: { lo: 7947, hi: 14960 }, prestige: { lo: 54.3333, hi: 95.2624 }, rank: { lo: 20.25, hi: 41.25 }, netMargin: { lo: 0.1675, hi: 0.3319 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 20, cash: { lo: 3757781.0128, hi: 74154743.4944 }, enrolled: { lo: 19140, hi: 37000 }, prestige: { lo: 101.3554, hi: 173.995 }, rank: { lo: 1, hi: 4 }, netMargin: { lo: -0.0156, hi: 0.1759 }, weeksInTheRed: { lo: 9, hi: 143.75 } },
    { year: 35, cash: { lo: 50945506.9003, hi: 648408902.0683 }, enrolled: { lo: 24840, hi: 42700 }, prestige: { lo: 112.1774, hi: 187.109 }, rank: { lo: 1, hi: 4 }, netMargin: { lo: -0.0145, hi: 0.1258 }, weeksInTheRed: { lo: 9, hi: 143.75 } },
    { year: 50, cash: { lo: 216824317.348, hi: 2732261229.4926 }, enrolled: { lo: 25140, hi: 42700 }, prestige: { lo: 112.4907, hi: 187.4887 }, rank: { lo: 1, hi: 4 }, netMargin: { lo: -0.0245, hi: 0.4161 }, weeksInTheRed: { lo: 9, hi: 143.75 } },
  ],
  "Curriculum rush (overreach)": [
    { year: 5, cash: { lo: -415721.9869, hi: 3442531.457 }, enrolled: { lo: 541.5, hi: 975 }, prestige: { lo: 30.7416, hi: 51.7227 }, rank: { lo: 46.5, hi: 78.75 }, netMargin: { lo: -0.1365, hi: 0.0695 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 10, cash: { lo: -7650792.0918, hi: 1659091.5387 }, enrolled: { lo: 547.5, hi: 1163.75 }, prestige: { lo: 35.2277, hi: 62.1458 }, rank: { lo: 41.25, hi: 72.5 }, netMargin: { lo: -0.0079, hi: 0.1834 }, weeksInTheRed: { lo: 0, hi: 256.25 } },
    { year: 20, cash: { lo: -773043.4639, hi: 4638997.9513 }, enrolled: { lo: 1053.75, hi: 2427.5 }, prestige: { lo: 36.4922, hi: 69.355 }, rank: { lo: 39, hi: 73.75 }, netMargin: { lo: 0.0426, hi: 0.2643 }, weeksInTheRed: { lo: 0, hi: 500 } },
    { year: 35, cash: { lo: 4806353.9246, hi: 101541651.9876 }, enrolled: { lo: 4548.75, hi: 40400 }, prestige: { lo: 50.8953, hi: 147.3019 }, rank: { lo: 1, hi: 61.25 }, netMargin: { lo: -0.0748, hi: 0.2328 }, weeksInTheRed: { lo: 0, hi: 500 } },
    { year: 50, cash: { lo: 55032032.0867, hi: 4198575917.5399 }, enrolled: { lo: 25140, hi: 42200 }, prestige: { lo: 107.3416, hi: 186.3363 }, rank: { lo: 1, hi: 4 }, netMargin: { lo: 0.017, hi: 0.1484 }, weeksInTheRed: { lo: 0, hi: 505 } },
  ],
  "Discount volume (beds first)": [
    { year: 5, cash: { lo: -2184809.7443, hi: 348959.143 }, enrolled: { lo: 420, hi: 700 }, prestige: { lo: 50.5219, hi: 84.2066 }, rank: { lo: 33, hi: 56.25 }, netMargin: { lo: -0.1544, hi: -0.0322 }, weeksInTheRed: { lo: 13, hi: 47 } },
    { year: 10, cash: { lo: -6537712.5083, hi: -2656686.5977 }, enrolled: { lo: 420, hi: 700 }, prestige: { lo: 57.9531, hi: 96.5896 }, rank: { lo: 18.75, hi: 42.5 }, netMargin: { lo: -0.049, hi: 0.0557 }, weeksInTheRed: { lo: 212.25, hi: 371.25 } },
    { year: 20, cash: { lo: -3740912.2665, hi: 35675.3241 }, enrolled: { lo: 420, hi: 700 }, prestige: { lo: 61.2144, hi: 102.0241 }, rank: { lo: 15.75, hi: 35 }, netMargin: { lo: -0.0229, hi: 0.0813 }, weeksInTheRed: { lo: 602.25, hi: 1021.25 } },
    { year: 35, cash: { lo: -1626964.2775, hi: 2361247.3474 }, enrolled: { lo: 420, hi: 700 }, prestige: { lo: 61.5754, hi: 102.6881 }, rank: { lo: 18.75, hi: 41.25 }, netMargin: { lo: -0.108, hi: 0.0709 }, weeksInTheRed: { lo: 837.75, hi: 1733.75 } },
    { year: 50, cash: { lo: -791625.041, hi: 2118882.4288 }, enrolled: { lo: 420, hi: 700 }, prestige: { lo: 61.682, hi: 104.8225 }, rank: { lo: 21.75, hi: 43.75 }, netMargin: { lo: -0.089, hi: 0.1077 }, weeksInTheRed: { lo: 990.75, hi: 1995 } },
  ],
  "Completionist (build everything)": [
    { year: 5, cash: { lo: -45794.4522, hi: 2322457.47 }, enrolled: { lo: 540, hi: 1200 }, prestige: { lo: 51.3481, hi: 86.3164 }, rank: { lo: 30.75, hi: 57.5 }, netMargin: { lo: -0.0483, hi: 0.1087 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 10, cash: { lo: -48668.1569, hi: 2888740.2897 }, enrolled: { lo: 540, hi: 1200 }, prestige: { lo: 61.2125, hi: 102.7103 }, rank: { lo: 12.75, hi: 27.5 }, netMargin: { lo: -0.0007, hi: 0.1294 }, weeksInTheRed: { lo: 0, hi: 82.5 } },
    { year: 20, cash: { lo: -182096.9684, hi: 2999957.34 }, enrolled: { lo: 540, hi: 1200 }, prestige: { lo: 66.0174, hi: 110.2405 }, rank: { lo: 9, hi: 20 }, netMargin: { lo: -0.0356, hi: 0.0971 }, weeksInTheRed: { lo: 0, hi: 82.5 } },
    { year: 35, cash: { lo: 653216.0876, hi: 4813119.4193 }, enrolled: { lo: 540, hi: 1200 }, prestige: { lo: 66.7437, hi: 111.9659 }, rank: { lo: 12.75, hi: 22.5 }, netMargin: { lo: -0.0602, hi: 0.0754 }, weeksInTheRed: { lo: 0, hi: 82.5 } },
    { year: 50, cash: { lo: -1211869.3704, hi: 2730264.9984 }, enrolled: { lo: 540, hi: 1200 }, prestige: { lo: 67.0299, hi: 112.4617 }, rank: { lo: 12.75, hi: 30 }, netMargin: { lo: -0.062, hi: 0.0684 }, weeksInTheRed: { lo: 0, hi: 147.5 } },
  ],
  "Overbuilder (beds ahead of demand)": [
    { year: 5, cash: { lo: -1226987.8023, hi: 1720637.7629 }, enrolled: { lo: 478.5, hi: 1291.25 }, prestige: { lo: 29.2068, hi: 53.181 }, rank: { lo: 44.25, hi: 77.5 }, netMargin: { lo: -0.1551, hi: -0.0313 }, weeksInTheRed: { lo: 0, hi: 38 } },
    { year: 10, cash: { lo: -5168142.342, hi: 1097953.6715 }, enrolled: { lo: 582.75, hi: 1178.75 }, prestige: { lo: 29.852, hi: 52.6336 }, rank: { lo: 45.75, hi: 83.75 }, netMargin: { lo: -0.151, hi: 0.0432 }, weeksInTheRed: { lo: 78.75, hi: 360 } },
    { year: 20, cash: { lo: -16871188.6206, hi: 295214.1398 }, enrolled: { lo: 618, hi: 1121.25 }, prestige: { lo: 30.2862, hi: 52.7251 }, rank: { lo: 48.75, hi: 88.75 }, netMargin: { lo: -0.1491, hi: 0.0764 }, weeksInTheRed: { lo: 303.75, hi: 1010 } },
    { year: 35, cash: { lo: -31919817.6143, hi: 379878.489 }, enrolled: { lo: 624, hi: 1147.5 }, prestige: { lo: 30.3428, hi: 52.7809 }, rank: { lo: 51.75, hi: 88.75 }, netMargin: { lo: -0.1277, hi: 0.1209 }, weeksInTheRed: { lo: 607.5, hi: 1985 } },
    { year: 50, cash: { lo: -45208282.862, hi: 1960270.0024 }, enrolled: { lo: 627.75, hi: 1163.75 }, prestige: { lo: 30.4262, hi: 52.8304 }, rank: { lo: 50.25, hi: 93.75 }, netMargin: { lo: -0.1258, hi: 0.0653 }, weeksInTheRed: { lo: 803.25, hi: 2960 } },
  ],
  "Earnest completionist": [
    { year: 5, cash: { lo: 1371161.6232, hi: 8275917.3835 }, enrolled: { lo: 2580, hi: 6146.25 }, prestige: { lo: 44.9984, hi: 78.9561 }, rank: { lo: 39.75, hi: 68.75 }, netMargin: { lo: 0.3256, hi: 0.6334 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 10, cash: { lo: 9997690.4484, hi: 35352449.2575 }, enrolled: { lo: 11040, hi: 22200 }, prestige: { lo: 62.2653, hi: 124.8163 }, rank: { lo: 1, hi: 22.5 }, netMargin: { lo: -0.0856, hi: 0.1988 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 20, cash: { lo: 30684562.8675, hi: 80409148.9819 }, enrolled: { lo: 11040, hi: 31300 }, prestige: { lo: 97.0058, hi: 178.4581 }, rank: { lo: 1, hi: 4 }, netMargin: { lo: 0.0054, hi: 0.12 }, weeksInTheRed: { lo: 0, hi: 370 } },
    { year: 35, cash: { lo: 74997447.1684, hi: 831321999.8816 }, enrolled: { lo: 24840, hi: 41900 }, prestige: { lo: 111.7515, hi: 187.2382 }, rank: { lo: 1, hi: 4 }, netMargin: { lo: 0.018, hi: 0.1872 }, weeksInTheRed: { lo: 0, hi: 370 } },
    { year: 50, cash: { lo: 707104531.5265, hi: 2291033875.1041 }, enrolled: { lo: 25140, hi: 41900 }, prestige: { lo: 112.4783, hi: 187.4924 }, rank: { lo: 1, hi: 4 }, netMargin: { lo: 0.1098, hi: 0.84 }, weeksInTheRed: { lo: 0, hi: 370 } },
  ],
  "Scatterer (founds anything anywhere)": [
    { year: 5, cash: { lo: 3313108.0815, hi: 6987843.7759 }, enrolled: { lo: 1980, hi: 3500 }, prestige: { lo: 46.9017, hi: 80.2664 }, rank: { lo: 36, hi: 65 }, netMargin: { lo: 0.1992, hi: 0.3561 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 10, cash: { lo: 7960056.7898, hi: 27113227.5359 }, enrolled: { lo: 7920, hi: 15400 }, prestige: { lo: 55.8665, hi: 93.723 }, rank: { lo: 24, hi: 41.25 }, netMargin: { lo: 0.1388, hi: 0.3174 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 20, cash: { lo: 43552305.5962, hi: 179088156.0865 }, enrolled: { lo: 20460, hi: 34300 }, prestige: { lo: 74.6151, hi: 139.1971 }, rank: { lo: 1, hi: 8 }, netMargin: { lo: -0.0056, hi: 0.1393 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 35, cash: { lo: 129620386.9131, hi: 271729190.5926 }, enrolled: { lo: 20580, hi: 34700 }, prestige: { lo: 79.7883, hi: 152.0666 }, rank: { lo: 1, hi: 7 }, netMargin: { lo: 0.0383, hi: 0.2675 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 50, cash: { lo: 200469941.5799, hi: 1073551623.4123 }, enrolled: { lo: 20580, hi: 34700 }, prestige: { lo: 81.2766, hi: 153.8143 }, rank: { lo: 1, hi: 9 }, netMargin: { lo: 0.0856, hi: 0.4819 }, weeksInTheRed: { lo: 0, hi: 10 } },
  ],
  "Selective college": [
    { year: 5, cash: { lo: 621409.1323, hi: 3643603.1641 }, enrolled: { lo: 861.75, hi: 1448.75 }, prestige: { lo: 50.7249, hi: 85.2163 }, rank: { lo: 32.25, hi: 55 }, netMargin: { lo: 0.4289, hi: 0.775 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 10, cash: { lo: 6174744.9326, hi: 12526367.511 }, enrolled: { lo: 2980.5, hi: 5528.75 }, prestige: { lo: 60.6709, hi: 107.8128 }, rank: { lo: 13.5, hi: 37.5 }, netMargin: { lo: 0.2517, hi: 0.5819 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 20, cash: { lo: 630526.4778, hi: 50376865.6755 }, enrolled: { lo: 3105.75, hi: 5235 }, prestige: { lo: 106.2839, hi: 178.2419 }, rank: { lo: 1, hi: 4 }, netMargin: { lo: -0.0778, hi: 0.0507 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 35, cash: { lo: 40828768.7887, hi: 334922270.1142 }, enrolled: { lo: 3006, hi: 5015 }, prestige: { lo: 112.32, hi: 187.232 }, rank: { lo: 1, hi: 4 }, netMargin: { lo: 0.1231, hi: 0.3973 }, weeksInTheRed: { lo: 0, hi: 223.75 } },
    { year: 50, cash: { lo: 44684212.9187, hi: 532192164.9215 }, enrolled: { lo: 3000, hi: 5007.5 }, prestige: { lo: 112.4948, hi: 187.4922 }, rank: { lo: 1, hi: 4 }, netMargin: { lo: 0.3177, hi: 1.1269 }, weeksInTheRed: { lo: 0, hi: 223.75 } },
  ],
  "Regional engine": [
    { year: 5, cash: { lo: 1074033.5654, hi: 8413714.3436 }, enrolled: { lo: 1920, hi: 3700 }, prestige: { lo: 46.8304, hi: 82.9468 }, rank: { lo: 35.25, hi: 65 }, netMargin: { lo: 0.2081, hi: 0.4816 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 10, cash: { lo: 12180493.8889, hi: 55594035.7726 }, enrolled: { lo: 9000, hi: 28500 }, prestige: { lo: 56.2366, hi: 108.25 }, rank: { lo: 11.25, hi: 46.25 }, netMargin: { lo: 0.0573, hi: 0.3432 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 20, cash: { lo: -11429722.5068, hi: 83331412.2621 }, enrolled: { lo: 19380, hi: 39700 }, prestige: { lo: 101.9501, hi: 176.8399 }, rank: { lo: 1, hi: 4 }, netMargin: { lo: -0.0315, hi: 0.0779 }, weeksInTheRed: { lo: 44.25, hi: 192.5 } },
    { year: 35, cash: { lo: 25185280.6052, hi: 81789613.4203 }, enrolled: { lo: 23100, hi: 40900 }, prestige: { lo: 111.522, hi: 187.0858 }, rank: { lo: 1, hi: 4 }, netMargin: { lo: -0.0562, hi: 0.0667 }, weeksInTheRed: { lo: 57, hi: 192.5 } },
    { year: 50, cash: { lo: 16650432.4162, hi: 100246609.3975 }, enrolled: { lo: 24060, hi: 41600 }, prestige: { lo: 112.2503, hi: 187.488 }, rank: { lo: 1, hi: 4 }, netMargin: { lo: -0.0614, hi: 0.0556 }, weeksInTheRed: { lo: 85.5, hi: 261.25 } },
  ],
  "Idle (builds nothing)": [
    { year: 5, cash: { lo: 4466425.3137, hi: 7787819.4063 }, enrolled: { lo: 309, hi: 518.75 }, prestige: { lo: 30.5246, hi: 50.8885 }, rank: { lo: 45, hi: 78.75 }, netMargin: { lo: 0.1132, hi: 0.2227 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 10, cash: { lo: 5912353.174, hi: 10051767.189 }, enrolled: { lo: 339, hi: 565 }, prestige: { lo: 30.6277, hi: 51.0885 }, rank: { lo: 47.25, hi: 82.5 }, netMargin: { lo: 0.0304, hi: 0.1391 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 20, cash: { lo: 8891530.9742, hi: 15216319.16 }, enrolled: { lo: 337.5, hi: 563.75 }, prestige: { lo: 31.0902, hi: 51.8673 }, rank: { lo: 47.25, hi: 85 }, netMargin: { lo: 0.0535, hi: 0.1634 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 35, cash: { lo: 15140750.2975, hi: 25512453.7749 }, enrolled: { lo: 339, hi: 565 }, prestige: { lo: 31.3108, hi: 52.2003 }, rank: { lo: 54, hi: 92.5 }, netMargin: { lo: 0.1063, hi: 0.2085 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 50, cash: { lo: 23666448.143, hi: 40128157.421 }, enrolled: { lo: 339.75, hi: 566.25 }, prestige: { lo: 31.5116, hi: 52.5827 }, rank: { lo: 52.5, hi: 90 }, netMargin: { lo: 0.1598, hi: 0.2788 }, weeksInTheRed: { lo: 0, hi: 10 } },
  ],
};
// --- END GENERATED ---
