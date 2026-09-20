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
    { year: 5, cash: { lo: 1787739.0823, hi: 6329593.725 }, enrolled: { lo: 1800, hi: 3100 }, prestige: { lo: 48.2058, hi: 82.5743 }, rank: { lo: 36.75, hi: 63.75 }, netMargin: { lo: 0.199, hi: 0.3876 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 10, cash: { lo: 8114054.0484, hi: 29343099.6067 }, enrolled: { lo: 8280, hi: 15500 }, prestige: { lo: 57.1391, hi: 111.4249 }, rank: { lo: 8, hi: 40 }, netMargin: { lo: 0.0349, hi: 0.2342 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 20, cash: { lo: 388698.943, hi: 75449781.8974 }, enrolled: { lo: 13920, hi: 32300 }, prestige: { lo: 92.1981, hi: 169.6467 }, rank: { lo: 1, hi: 5 }, netMargin: { lo: -0.0212, hi: 0.146 }, weeksInTheRed: { lo: 0, hi: 68.75 } },
    { year: 35, cash: { lo: 42754805.7349, hi: 173003607.4243 }, enrolled: { lo: 24600, hi: 41400 }, prestige: { lo: 111.7078, hi: 186.8203 }, rank: { lo: 1, hi: 4 }, netMargin: { lo: -0.0173, hi: 0.1057 }, weeksInTheRed: { lo: 0, hi: 68.75 } },
    { year: 50, cash: { lo: 28732040.7707, hi: 415303907.2082 }, enrolled: { lo: 24660, hi: 41500 }, prestige: { lo: 112.4771, hi: 187.4803 }, rank: { lo: 1, hi: 4 }, netMargin: { lo: -0.0305, hi: 0.1234 }, weeksInTheRed: { lo: 0, hi: 68.75 } },
  ],
  "Curriculum rush (overreach)": [
    { year: 5, cash: { lo: -381186.8231, hi: 2622130.895 }, enrolled: { lo: 548.25, hi: 975 }, prestige: { lo: 28.7256, hi: 51.0709 }, rank: { lo: 47.25, hi: 82.5 }, netMargin: { lo: -0.1369, hi: 0.0431 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 10, cash: { lo: -14449624.669, hi: -4695285.2182 }, enrolled: { lo: 510.75, hi: 886.25 }, prestige: { lo: 34.2631, hi: 58.8934 }, rank: { lo: 42.75, hi: 75 }, netMargin: { lo: -0.1092, hi: 0.0988 }, weeksInTheRed: { lo: 133.5, hi: 287.5 } },
    { year: 20, cash: { lo: -567396.5808, hi: 4141767.3409 }, enrolled: { lo: 717.75, hi: 2320 }, prestige: { lo: 35.3971, hi: 76.3157 }, rank: { lo: 38.25, hi: 73.75 }, netMargin: { lo: -0.0395, hi: 0.2091 }, weeksInTheRed: { lo: 288.75, hi: 807.5 } },
    { year: 35, cash: { lo: -333730.3868, hi: 199402983.7801 }, enrolled: { lo: 7808.25, hi: 40400 }, prestige: { lo: 57.7543, hi: 162.6964 }, rank: { lo: 1, hi: 51.25 }, netMargin: { lo: -0.0259, hi: 0.4345 }, weeksInTheRed: { lo: 288.75, hi: 807.5 } },
    { year: 50, cash: { lo: 43162313.2484, hi: 6363070701.2803 }, enrolled: { lo: 24360, hi: 40700 }, prestige: { lo: 109.6337, hi: 186.7819 }, rank: { lo: 1, hi: 4 }, netMargin: { lo: 0.0391, hi: 0.1548 }, weeksInTheRed: { lo: 288.75, hi: 807.5 } },
  ],
  "Discount volume (beds first)": [
    { year: 5, cash: { lo: -2201818.5575, hi: 452489.2577 }, enrolled: { lo: 420, hi: 700 }, prestige: { lo: 50.5229, hi: 84.2066 }, rank: { lo: 30.75, hi: 56.25 }, netMargin: { lo: -0.1606, hi: -0.0297 }, weeksInTheRed: { lo: 9, hi: 48 } },
    { year: 10, cash: { lo: -6584367.4119, hi: -2418168.432 }, enrolled: { lo: 420, hi: 700 }, prestige: { lo: 57.9534, hi: 96.5896 }, rank: { lo: 18.75, hi: 37.5 }, netMargin: { lo: -0.0456, hi: 0.0579 }, weeksInTheRed: { lo: 209.25, hi: 372.5 } },
    { year: 20, cash: { lo: -5639480.5258, hi: 315749.0153 }, enrolled: { lo: 420, hi: 700 }, prestige: { lo: 61.2145, hi: 102.0241 }, rank: { lo: 17.25, hi: 31.25 }, netMargin: { lo: -0.042, hi: 0.0821 }, weeksInTheRed: { lo: 599.25, hi: 1022.5 } },
    { year: 35, cash: { lo: -2753318.358, hi: 3276446.2568 }, enrolled: { lo: 420, hi: 700 }, prestige: { lo: 61.5754, hi: 102.7942 }, rank: { lo: 21.75, hi: 36.25 }, netMargin: { lo: -0.0628, hi: 0.0974 }, weeksInTheRed: { lo: 833.25, hi: 1982.5 } },
    { year: 50, cash: { lo: 353828.7645, hi: 3453457.113 }, enrolled: { lo: 420, hi: 700 }, prestige: { lo: 61.639, hi: 103.0555 }, rank: { lo: 19.5, hi: 42.5 }, netMargin: { lo: -0.0815, hi: 0.0361 }, weeksInTheRed: { lo: 906.75, hi: 2498.75 } },
  ],
  "Completionist (build everything)": [
    { year: 5, cash: { lo: 1350895.3217, hi: 3944170.3596 }, enrolled: { lo: 1260, hi: 2100 }, prestige: { lo: 49.828, hi: 85.0359 }, rank: { lo: 33, hi: 58.75 }, netMargin: { lo: 0.1154, hi: 0.2512 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 10, cash: { lo: 4653924.2397, hi: 8223327.0441 }, enrolled: { lo: 5763.75, hi: 10100 }, prestige: { lo: 55.2589, hi: 98.204 }, rank: { lo: 21, hi: 41.25 }, netMargin: { lo: 0.1597, hi: 0.4194 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 20, cash: { lo: 21683745.9533, hi: 71807207.2602 }, enrolled: { lo: 16800, hi: 36100 }, prestige: { lo: 96.1279, hi: 171.0263 }, rank: { lo: 1, hi: 4 }, netMargin: { lo: -0.0208, hi: 0.2004 }, weeksInTheRed: { lo: 0, hi: 165 } },
    { year: 35, cash: { lo: 71239623.9793, hi: 333046084.6585 }, enrolled: { lo: 24840, hi: 41500 }, prestige: { lo: 111.9971, hi: 187.0231 }, rank: { lo: 1, hi: 4 }, netMargin: { lo: -0.0029, hi: 0.1116 }, weeksInTheRed: { lo: 0, hi: 165 } },
    { year: 50, cash: { lo: 245853483.7875, hi: 2465143617.62 }, enrolled: { lo: 24900, hi: 41500 }, prestige: { lo: 112.4854, hi: 187.4862 }, rank: { lo: 1, hi: 4 }, netMargin: { lo: 0.0189, hi: 0.2897 }, weeksInTheRed: { lo: 0, hi: 165 } },
  ],
  "Overbuilder (beds ahead of demand)": [
    { year: 5, cash: { lo: -1104314.8441, hi: 2163027.351 }, enrolled: { lo: 478.5, hi: 1228.75 }, prestige: { lo: 29.7344, hi: 53.1201 }, rank: { lo: 43.5, hi: 78.75 }, netMargin: { lo: -0.2003, hi: 0.0372 }, weeksInTheRed: { lo: 0, hi: 110 } },
    { year: 10, cash: { lo: -6583274.3026, hi: 1230166.8181 }, enrolled: { lo: 579.75, hi: 1228.75 }, prestige: { lo: 29.8976, hi: 52.384 }, rank: { lo: 48.75, hi: 85 }, netMargin: { lo: -0.1959, hi: 0.1097 }, weeksInTheRed: { lo: 109.5, hi: 295 } },
    { year: 20, cash: { lo: -18343632.1212, hi: 1874775.7563 }, enrolled: { lo: 633.75, hi: 1232.5 }, prestige: { lo: 30.5278, hi: 53.0348 }, rank: { lo: 51, hi: 88.75 }, netMargin: { lo: -0.1377, hi: 0.0037 }, weeksInTheRed: { lo: 333.75, hi: 945 } },
    { year: 35, cash: { lo: -31820302.801, hi: 1678936.9372 }, enrolled: { lo: 636, hi: 1263.75 }, prestige: { lo: 30.5684, hi: 53.4454 }, rank: { lo: 51, hi: 88.75 }, netMargin: { lo: -0.1307, hi: 0.0553 }, weeksInTheRed: { lo: 452.25, hi: 1920 } },
    { year: 50, cash: { lo: -44486155.0132, hi: 2066715.9 }, enrolled: { lo: 639, hi: 1256.25 }, prestige: { lo: 30.0439, hi: 53.2182 }, rank: { lo: 51, hi: 92.5 }, netMargin: { lo: -0.1225, hi: 0.0477 }, weeksInTheRed: { lo: 452.25, hi: 2895 } },
  ],
  "Earnest completionist": [
    { year: 5, cash: { lo: 1280334.0227, hi: 9767873.2472 }, enrolled: { lo: 3060, hi: 5400 }, prestige: { lo: 44.9914, hi: 78.902 }, rank: { lo: 36, hi: 65 }, netMargin: { lo: 0.3113, hi: 0.5929 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 10, cash: { lo: 12392814.7994, hi: 44091672.5192 }, enrolled: { lo: 13740, hi: 24100 }, prestige: { lo: 63.1636, hi: 121.893 }, rank: { lo: 1, hi: 27.5 }, netMargin: { lo: -0.0266, hi: 0.2247 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 20, cash: { lo: 35863590.0798, hi: 85261423.9747 }, enrolled: { lo: 20100, hi: 35700 }, prestige: { lo: 107.4543, hi: 180.2592 }, rank: { lo: 1, hi: 4 }, netMargin: { lo: 0.0008, hi: 0.1273 }, weeksInTheRed: { lo: 0, hi: 50 } },
    { year: 35, cash: { lo: 381236541.8619, hi: 1546033791.4953 }, enrolled: { lo: 24420, hi: 40700 }, prestige: { lo: 112.3539, hi: 187.2904 }, rank: { lo: 1, hi: 4 }, netMargin: { lo: 0.0245, hi: 0.2126 }, weeksInTheRed: { lo: 0, hi: 50 } },
    { year: 50, cash: { lo: 467722102.5924, hi: 4304360625.1581 }, enrolled: { lo: 24420, hi: 40700 }, prestige: { lo: 112.4958, hi: 187.4939 }, rank: { lo: 1, hi: 4 }, netMargin: { lo: 0.2471, hi: 0.6684 }, weeksInTheRed: { lo: 0, hi: 50 } },
  ],
  "Scatterer (founds anything anywhere)": [
    { year: 5, cash: { lo: 2763863.3758, hi: 7549234.5104 }, enrolled: { lo: 1620, hi: 3761.25 }, prestige: { lo: 46.3317, hi: 78.9097 }, rank: { lo: 36.75, hi: 62.5 }, netMargin: { lo: 0.2363, hi: 0.4066 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 10, cash: { lo: 8669087.0837, hi: 28086573.7512 }, enrolled: { lo: 9125.25, hi: 17051.25 }, prestige: { lo: 54.9715, hi: 94.3237 }, rank: { lo: 24, hi: 45 }, netMargin: { lo: 0.155, hi: 0.3255 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 20, cash: { lo: 39570622.6644, hi: 83692820.0345 }, enrolled: { lo: 20160, hi: 34300 }, prestige: { lo: 79.3143, hi: 134.4485 }, rank: { lo: 1, hi: 7 }, netMargin: { lo: 0.0194, hi: 0.1289 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 35, cash: { lo: 96773680.3356, hi: 314555592.4541 }, enrolled: { lo: 20820, hi: 34700 }, prestige: { lo: 87.3898, hi: 147.2582 }, rank: { lo: 1, hi: 5 }, netMargin: { lo: 0.0163, hi: 0.1926 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 50, cash: { lo: 203146856.7505, hi: 866877967.4577 }, enrolled: { lo: 20820, hi: 34700 }, prestige: { lo: 88.2777, hi: 149.2584 }, rank: { lo: 1, hi: 5 }, netMargin: { lo: 0.0481, hi: 0.3329 }, weeksInTheRed: { lo: 0, hi: 10 } },
  ],
  "Selective college": [
    { year: 5, cash: { lo: 1526618.5871, hi: 3833953.9407 }, enrolled: { lo: 861.75, hi: 1452.5 }, prestige: { lo: 50.7639, hi: 85.039 }, rank: { lo: 33, hi: 60 }, netMargin: { lo: 0.459, hi: 0.7805 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 10, cash: { lo: 3986244.9578, hi: 12911486.6314 }, enrolled: { lo: 2960.25, hi: 5431.25 }, prestige: { lo: 60.1872, hi: 108.4288 }, rank: { lo: 10.5, hi: 33.75 }, netMargin: { lo: 0.272, hi: 0.6203 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 20, cash: { lo: 10301318.2652, hi: 56741452.7629 }, enrolled: { lo: 3139.5, hi: 5271.25 }, prestige: { lo: 104.44, hi: 177.3515 }, rank: { lo: 1, hi: 4 }, netMargin: { lo: -0.0673, hi: 0.0983 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 35, cash: { lo: 39778485.1248, hi: 203325285.6944 }, enrolled: { lo: 3006.75, hi: 5038.75 }, prestige: { lo: 112.2667, hi: 187.2062 }, rank: { lo: 1, hi: 4 }, netMargin: { lo: -0.0253, hi: 0.3958 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 50, cash: { lo: 60078611.6408, hi: 688432599.0532 }, enrolled: { lo: 2997.75, hi: 5006.25 }, prestige: { lo: 112.4932, hi: 187.4915 }, rank: { lo: 1, hi: 4 }, netMargin: { lo: 0.042, hi: 1.21 }, weeksInTheRed: { lo: 0, hi: 10 } },
  ],
  "Regional engine": [
    { year: 5, cash: { lo: 2641651.743, hi: 6984441.9671 }, enrolled: { lo: 1920, hi: 3900 }, prestige: { lo: 46.7779, hi: 83.13 }, rank: { lo: 33.75, hi: 63.75 }, netMargin: { lo: 0.2051, hi: 0.5052 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 10, cash: { lo: 12537112.7507, hi: 42786073.3888 }, enrolled: { lo: 12480, hi: 26808.75 }, prestige: { lo: 64.0757, hi: 117.3039 }, rank: { lo: 5, hi: 22.5 }, netMargin: { lo: -0.0144, hi: 0.2335 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 20, cash: { lo: 15684456.2624, hi: 41227711.8533 }, enrolled: { lo: 19920, hi: 38800 }, prestige: { lo: 104.7597, hi: 177.2212 }, rank: { lo: 1, hi: 4 }, netMargin: { lo: -0.0735, hi: 0.0513 }, weeksInTheRed: { lo: 44.25, hi: 122.5 } },
    { year: 35, cash: { lo: 97727164.0022, hi: 249927812.5516 }, enrolled: { lo: 23400, hi: 40600 }, prestige: { lo: 111.1876, hi: 187.2021 }, rank: { lo: 1, hi: 4 }, netMargin: { lo: -0.0589, hi: 0.0569 }, weeksInTheRed: { lo: 44.25, hi: 137.5 } },
    { year: 50, cash: { lo: 91121499.896, hi: 345859426.899 }, enrolled: { lo: 24360, hi: 41000 }, prestige: { lo: 112.3912, hi: 187.4914 }, rank: { lo: 1, hi: 4 }, netMargin: { lo: -0.0773, hi: 0.0561 }, weeksInTheRed: { lo: 44.25, hi: 305 } },
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
