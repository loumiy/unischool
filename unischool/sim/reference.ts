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
    { year: 5, cash: { lo: 677724.9618, hi: 6093924.7753 }, enrolled: { lo: 1800, hi: 3100 }, prestige: { lo: 47.9353, hi: 80.3842 }, rank: { lo: 35.25, hi: 63.75 }, netMargin: { lo: 0.2182, hi: 0.3865 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 10, cash: { lo: 10304645.0694, hi: 33184208.2321 }, enrolled: { lo: 7260, hi: 14900 }, prestige: { lo: 53.8931, hi: 102.0028 }, rank: { lo: 14.25, hi: 42.5 }, netMargin: { lo: 0.1199, hi: 0.2853 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 20, cash: { lo: 2480421.9106, hi: 77602527.5489 }, enrolled: { lo: 15900, hi: 36500 }, prestige: { lo: 95.7596, hi: 170.6505 }, rank: { lo: 1, hi: 4 }, netMargin: { lo: -0.0101, hi: 0.1248 }, weeksInTheRed: { lo: 0, hi: 93.75 } },
    { year: 35, cash: { lo: 71190107.1663, hi: 249210625.6886 }, enrolled: { lo: 25020, hi: 42700 }, prestige: { lo: 111.8316, hi: 187.0088 }, rank: { lo: 1, hi: 4 }, netMargin: { lo: -0.0206, hi: 0.1132 }, weeksInTheRed: { lo: 0, hi: 93.75 } },
    { year: 50, cash: { lo: 385853968.5527, hi: 1081610122.3681 }, enrolled: { lo: 25140, hi: 42700 }, prestige: { lo: 112.4807, hi: 187.4858 }, rank: { lo: 1, hi: 4 }, netMargin: { lo: 0.0398, hi: 0.2918 }, weeksInTheRed: { lo: 0, hi: 93.75 } },
  ],
  "Curriculum rush (overreach)": [
    { year: 5, cash: { lo: 1227844.3347, hi: 3573947.9997 }, enrolled: { lo: 575.25, hi: 1063.75 }, prestige: { lo: 28.9723, hi: 55.2517 }, rank: { lo: 43.5, hi: 81.25 }, netMargin: { lo: -0.0914, hi: 0.1452 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 10, cash: { lo: -11418749.9774, hi: 1873920.6569 }, enrolled: { lo: 510.75, hi: 1142.5 }, prestige: { lo: 34.5739, hi: 58.7196 }, rank: { lo: 42, hi: 77.5 }, netMargin: { lo: -0.1017, hi: 0.1597 }, weeksInTheRed: { lo: 60, hi: 223.75 } },
    { year: 20, cash: { lo: 848505.0489, hi: 5541687.6663 }, enrolled: { lo: 1061.25, hi: 2205 }, prestige: { lo: 39.2729, hi: 65.9715 }, rank: { lo: 39.75, hi: 72.5 }, netMargin: { lo: 0.1594, hi: 0.3923 }, weeksInTheRed: { lo: 96, hi: 626.25 } },
    { year: 35, cash: { lo: 1736881.8435, hi: 47750942.5528 }, enrolled: { lo: 11391, hi: 40100 }, prestige: { lo: 57.7106, hi: 134.7688 }, rank: { lo: 1, hi: 47.5 }, netMargin: { lo: -0.0226, hi: 0.3854 }, weeksInTheRed: { lo: 96, hi: 626.25 } },
    { year: 50, cash: { lo: 609336807.692, hi: 7522126093.4728 }, enrolled: { lo: 25080, hi: 41900 }, prestige: { lo: 110.2086, hi: 185.9734 }, rank: { lo: 1, hi: 5 }, netMargin: { lo: 0.0329, hi: 0.1563 }, weeksInTheRed: { lo: 96, hi: 626.25 } },
  ],
  "Discount volume (beds first)": [
    { year: 5, cash: { lo: -1829043.2029, hi: 423132.143 }, enrolled: { lo: 420, hi: 700 }, prestige: { lo: 50.5229, hi: 84.2066 }, rank: { lo: 32.25, hi: 57.5 }, netMargin: { lo: -0.1328, hi: -0.032 }, weeksInTheRed: { lo: 10, hi: 39 } },
    { year: 10, cash: { lo: -4868715.3625, hi: -2571853.5977 }, enrolled: { lo: 420, hi: 700 }, prestige: { lo: 57.9534, hi: 96.5896 }, rank: { lo: 18, hi: 37.5 }, netMargin: { lo: -0.0477, hi: 0.0528 }, weeksInTheRed: { lo: 210, hi: 361.25 } },
    { year: 20, cash: { lo: -2104631.9274, hi: 91107.8776 }, enrolled: { lo: 420, hi: 700 }, prestige: { lo: 61.2145, hi: 102.0241 }, rank: { lo: 15.75, hi: 28.75 }, netMargin: { lo: -0.0211, hi: 0.0799 }, weeksInTheRed: { lo: 600, hi: 1011.25 } },
    { year: 35, cash: { lo: -1082256.7173, hi: 2645864.3216 }, enrolled: { lo: 420, hi: 700 }, prestige: { lo: 61.5905, hi: 102.6844 }, rank: { lo: 15, hi: 37.5 }, netMargin: { lo: -0.0937, hi: 0.0709 }, weeksInTheRed: { lo: 897.75, hi: 1542.5 } },
    { year: 50, cash: { lo: -575772.2664, hi: 2245734.6526 }, enrolled: { lo: 420, hi: 700 }, prestige: { lo: 61.6869, hi: 102.9059 }, rank: { lo: 20.25, hi: 41.25 }, netMargin: { lo: -0.125, hi: 0.0764 }, weeksInTheRed: { lo: 1050.75, hi: 1801.25 } },
  ],
  "Completionist (build everything)": [
    { year: 5, cash: { lo: 235904.7079, hi: 2857164.6747 }, enrolled: { lo: 660, hi: 1200 }, prestige: { lo: 51.2509, hi: 85.7925 }, rank: { lo: 31.5, hi: 57.5 }, netMargin: { lo: -0.0116, hi: 0.0967 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 10, cash: { lo: -695888.5874, hi: 2414495.4034 }, enrolled: { lo: 660, hi: 1200 }, prestige: { lo: 61.1387, hi: 103.369 }, rank: { lo: 15, hi: 30 }, netMargin: { lo: -0.0232, hi: 0.1222 }, weeksInTheRed: { lo: 0, hi: 19 } },
    { year: 20, cash: { lo: 189212.7645, hi: 3670531.3717 }, enrolled: { lo: 660, hi: 1200 }, prestige: { lo: 65.6769, hi: 112.2013 }, rank: { lo: 9, hi: 26.25 }, netMargin: { lo: -0.0367, hi: 0.0959 }, weeksInTheRed: { lo: 0, hi: 19 } },
    { year: 35, cash: { lo: -245647.4197, hi: 2315359.2548 }, enrolled: { lo: 660, hi: 1200 }, prestige: { lo: 66.1809, hi: 114.2557 }, rank: { lo: 12, hi: 28.75 }, netMargin: { lo: -0.0603, hi: 0.0811 }, weeksInTheRed: { lo: 0, hi: 52.5 } },
    { year: 50, cash: { lo: 110216.0689, hi: 3874626.5293 }, enrolled: { lo: 660, hi: 1200 }, prestige: { lo: 66.2346, hi: 114.4344 }, rank: { lo: 14.25, hi: 32.5 }, netMargin: { lo: -0.0912, hi: 0.1061 }, weeksInTheRed: { lo: 0, hi: 155 } },
  ],
  "Overbuilder (beds ahead of demand)": [
    { year: 5, cash: { lo: -1099760.8971, hi: 1477446.8323 }, enrolled: { lo: 473.25, hi: 1135 }, prestige: { lo: 29.9488, hi: 53.181 }, rank: { lo: 44.25, hi: 81.25 }, netMargin: { lo: -0.1857, hi: -0.0566 }, weeksInTheRed: { lo: 0, hi: 20 } },
    { year: 10, cash: { lo: -5049308.134, hi: 1741120.6178 }, enrolled: { lo: 597.75, hi: 1177.5 }, prestige: { lo: 30.1073, hi: 53.369 }, rank: { lo: 45, hi: 85 }, netMargin: { lo: -0.1069, hi: 0.0631 }, weeksInTheRed: { lo: 85.5, hi: 322.5 } },
    { year: 20, cash: { lo: -6989712.7695, hi: 1229910.8321 }, enrolled: { lo: 639, hi: 1171.25 }, prestige: { lo: 30.6452, hi: 52.4773 }, rank: { lo: 46.5, hi: 86.25 }, netMargin: { lo: -0.1312, hi: 0.0519 }, weeksInTheRed: { lo: 273.75, hi: 972.5 } },
    { year: 35, cash: { lo: -16879842.836, hi: 1182396.2716 }, enrolled: { lo: 589.5, hi: 1121.25 }, prestige: { lo: 29.8662, hi: 52.2337 }, rank: { lo: 50.25, hi: 91.25 }, netMargin: { lo: -0.1217, hi: 0.0657 }, weeksInTheRed: { lo: 720.75, hi: 1947.5 } },
    { year: 50, cash: { lo: -26674325.9051, hi: -2683538.697 }, enrolled: { lo: 597, hi: 1066.25 }, prestige: { lo: 29.8938, hi: 50.9325 }, rank: { lo: 51.75, hi: 97.5 }, netMargin: { lo: -0.1198, hi: 0.0325 }, weeksInTheRed: { lo: 1301.25, hi: 2922.5 } },
  ],
  "Earnest completionist": [
    { year: 5, cash: { lo: 1312114.5499, hi: 8627357.3005 }, enrolled: { lo: 2820, hi: 6013.75 }, prestige: { lo: 44.8524, hi: 78.0609 }, rank: { lo: 38.25, hi: 65 }, netMargin: { lo: 0.3226, hi: 0.8481 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 10, cash: { lo: 12307114.0863, hi: 34651125.0188 }, enrolled: { lo: 11220, hi: 32700 }, prestige: { lo: 65.6102, hi: 119.7244 }, rank: { lo: 4, hi: 15 }, netMargin: { lo: -0.005, hi: 0.162 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 20, cash: { lo: 12787141.8128, hi: 112481043.5394 }, enrolled: { lo: 21420, hi: 41800 }, prestige: { lo: 103.3512, hi: 180.7029 }, rank: { lo: 1, hi: 4 }, netMargin: { lo: -0.0096, hi: 0.108 }, weeksInTheRed: { lo: 0, hi: 325 } },
    { year: 35, cash: { lo: 220109115.5062, hi: 980909319.4367 }, enrolled: { lo: 25140, hi: 41900 }, prestige: { lo: 112.2351, hi: 187.3032 }, rank: { lo: 1, hi: 4 }, netMargin: { lo: 0.0097, hi: 0.3494 }, weeksInTheRed: { lo: 0, hi: 325 } },
    { year: 50, cash: { lo: 859730368.5203, hi: 6900023839.3132 }, enrolled: { lo: 25140, hi: 41900 }, prestige: { lo: 112.4923, hi: 187.4943 }, rank: { lo: 1, hi: 4 }, netMargin: { lo: 0.1525, hi: 0.9529 }, weeksInTheRed: { lo: 0, hi: 325 } },
  ],
  "Scatterer (founds anything anywhere)": [
    { year: 5, cash: { lo: 2475552.5959, hi: 6287950.3964 }, enrolled: { lo: 2157.75, hi: 4106.25 }, prestige: { lo: 45.2337, hi: 78.9786 }, rank: { lo: 37.5, hi: 65 }, netMargin: { lo: 0.2036, hi: 0.5577 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 10, cash: { lo: 8489928.5952, hi: 30456776.318 }, enrolled: { lo: 9480, hi: 17361.25 }, prestige: { lo: 55.0965, hi: 93.9029 }, rank: { lo: 22.5, hi: 45 }, netMargin: { lo: 0.1364, hi: 0.2943 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 20, cash: { lo: 47808372.1328, hi: 214424453.3268 }, enrolled: { lo: 20580, hi: 34500 }, prestige: { lo: 75.7356, hi: 133.1043 }, rank: { lo: 1, hi: 10 }, netMargin: { lo: 0.0254, hi: 0.1352 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 35, cash: { lo: 166990230.2526, hi: 488431639.854 }, enrolled: { lo: 20580, hi: 34700 }, prestige: { lo: 84.4094, hi: 144.7873 }, rank: { lo: 1, hi: 6 }, netMargin: { lo: 0.0054, hi: 0.1783 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 50, cash: { lo: 170104019.4713, hi: 1116826475.0374 }, enrolled: { lo: 20580, hi: 34700 }, prestige: { lo: 86.9143, hi: 147.2689 }, rank: { lo: 1, hi: 8 }, netMargin: { lo: 0.0701, hi: 0.3033 }, weeksInTheRed: { lo: 0, hi: 10 } },
  ],
  "Selective college": [
    { year: 5, cash: { lo: 467091.0607, hi: 3697137.7339 }, enrolled: { lo: 860.25, hi: 1471.25 }, prestige: { lo: 50.7453, hi: 85.1428 }, rank: { lo: 31.5, hi: 56.25 }, netMargin: { lo: 0.4194, hi: 0.7814 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 10, cash: { lo: 5579720.8666, hi: 13920991.696 }, enrolled: { lo: 2730, hi: 5220 }, prestige: { lo: 62.7853, hi: 109.6647 }, rank: { lo: 7, hi: 21.25 }, netMargin: { lo: 0.1968, hi: 0.5535 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 20, cash: { lo: -1466171.5524, hi: 53014783.6919 }, enrolled: { lo: 3077.25, hi: 5233.75 }, prestige: { lo: 106.2645, hi: 179.0584 }, rank: { lo: 1, hi: 4 }, netMargin: { lo: -0.0951, hi: 0.0335 }, weeksInTheRed: { lo: 0, hi: 15 } },
    { year: 35, cash: { lo: 39947822.6176, hi: 225919680.535 }, enrolled: { lo: 3009.75, hi: 5026.25 }, prestige: { lo: 112.3195, hi: 187.2556 }, rank: { lo: 1, hi: 4 }, netMargin: { lo: -0.0344, hi: 0.3343 }, weeksInTheRed: { lo: 0, hi: 401.25 } },
    { year: 50, cash: { lo: 62895256.1285, hi: 355718219.1836 }, enrolled: { lo: 2995.5, hi: 5007.5 }, prestige: { lo: 112.4948, hi: 187.4929 }, rank: { lo: 1, hi: 4 }, netMargin: { lo: 0.3305, hi: 0.8407 }, weeksInTheRed: { lo: 0, hi: 401.25 } },
  ],
  "Regional engine": [
    { year: 5, cash: { lo: 1060751.1587, hi: 6086819.0029 }, enrolled: { lo: 1680, hi: 4000 }, prestige: { lo: 48.343, hi: 81.2573 }, rank: { lo: 35.25, hi: 61.25 }, netMargin: { lo: 0.2036, hi: 0.4415 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 10, cash: { lo: 7720949.3441, hi: 23232481.7273 }, enrolled: { lo: 8280, hi: 25500 }, prestige: { lo: 57.2337, hi: 109.6337 }, rank: { lo: 8, hi: 35 }, netMargin: { lo: 0.1228, hi: 0.3281 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 20, cash: { lo: 36747104.8263, hi: 99129205.1765 }, enrolled: { lo: 21360, hi: 38700 }, prestige: { lo: 104.0802, hi: 178.8441 }, rank: { lo: 1, hi: 4 }, netMargin: { lo: -0.0494, hi: 0.0891 }, weeksInTheRed: { lo: 71.25, hi: 223.75 } },
    { year: 35, cash: { lo: 72075723.7762, hi: 163090889.5227 }, enrolled: { lo: 24540, hi: 41900 }, prestige: { lo: 112.2562, hi: 187.2494 }, rank: { lo: 1, hi: 4 }, netMargin: { lo: -0.0435, hi: 0.0685 }, weeksInTheRed: { lo: 96.75, hi: 223.75 } },
    { year: 50, cash: { lo: -3636980.387, hi: 20650438.4363 }, enrolled: { lo: 24900, hi: 42500 }, prestige: { lo: 112.4929, hi: 187.4927 }, rank: { lo: 1, hi: 4 }, netMargin: { lo: -0.0631, hi: 0.0682 }, weeksInTheRed: { lo: 96.75, hi: 258.75 } },
  ],
  "Idle (builds nothing)": [
    { year: 5, cash: { lo: 4622079.4158, hi: 7757158.0633 }, enrolled: { lo: 311.25, hi: 518.75 }, prestige: { lo: 30.5246, hi: 50.8888 }, rank: { lo: 46.5, hi: 80 }, netMargin: { lo: 0.1132, hi: 0.2227 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 10, cash: { lo: 5944833.4963, hi: 10171039.9814 }, enrolled: { lo: 339, hi: 565 }, prestige: { lo: 30.6426, hi: 51.0947 }, rank: { lo: 47.25, hi: 83.75 }, netMargin: { lo: 0.0309, hi: 0.1391 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 20, cash: { lo: 8858548.0483, hi: 15410996.5659 }, enrolled: { lo: 338.25, hi: 563.75 }, prestige: { lo: 31.1034, hi: 51.8994 }, rank: { lo: 47.25, hi: 83.75 }, netMargin: { lo: 0.0616, hi: 0.1723 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 35, cash: { lo: 15126002.6262, hi: 26305388.7138 }, enrolled: { lo: 339, hi: 565 }, prestige: { lo: 31.3264, hi: 52.2754 }, rank: { lo: 48.75, hi: 88.75 }, netMargin: { lo: 0.108, hi: 0.2203 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 50, cash: { lo: 23966417.3604, hi: 42076580.6957 }, enrolled: { lo: 339.75, hi: 566.25 }, prestige: { lo: 31.5686, hi: 52.6709 }, rank: { lo: 50.25, hi: 88.75 }, netMargin: { lo: 0.1749, hi: 0.2994 }, weeksInTheRed: { lo: 0, hi: 10 } },
  ],
};
// --- END GENERATED ---
