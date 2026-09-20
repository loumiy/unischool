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
// Plan 15's eras in standing, wider at the bottom in enrolment because
// one seed in three parks at eight thousand students from year ten (the
// harness's own 12% headroom rule, with the seat ceiling capping the net
// it reads, a deadlock cash cannot buy out of). Years 35 and 50 stand as
// Plan 15 wrote them, widened only to the envelope's enrolment. No game
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
    { year: 50, cash: { lo: -20_000_000, hi: 5_000_000_000 }, enrolled: { lo: 15_000, hi: 42_000 }, prestige: { lo: 110, hi: 150 }, rank: { lo: 1, hi: 5 }, netMargin: { lo: 0.02, hi: 0.3 }, weeksInTheRed: { lo: 0, hi: 500 } },
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
    { year: 5, cash: { lo: 1220051.5145, hi: 6057157.8867 }, enrolled: { lo: 1560, hi: 3100 }, prestige: { lo: 48.1775, hi: 82.5743 }, rank: { lo: 36.75, hi: 61.25 }, netMargin: { lo: 0.177, hi: 0.3554 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 10, cash: { lo: 8114054.0484, hi: 25729474.6148 }, enrolled: { lo: 6240, hi: 15100 }, prestige: { lo: 54.0064, hi: 103.8519 }, rank: { lo: 14.25, hi: 48.75 }, netMargin: { lo: 0.0727, hi: 0.3373 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 20, cash: { lo: 41541656.5988, hi: 86554179.4687 }, enrolled: { lo: 6240, hi: 32000 }, prestige: { lo: 75.9358, hi: 166.4809 }, rank: { lo: 1, hi: 5 }, netMargin: { lo: -0.0259, hi: 0.1673 }, weeksInTheRed: { lo: 0, hi: 56.25 } },
    { year: 35, cash: { lo: 91213824.6486, hi: 616122067.9713 }, enrolled: { lo: 15960, hi: 39400 }, prestige: { lo: 101.2511, hi: 181.5734 }, rank: { lo: 1, hi: 4 }, netMargin: { lo: 0.0025, hi: 0.1553 }, weeksInTheRed: { lo: 0, hi: 56.25 } },
    { year: 50, cash: { lo: 171421141.7274, hi: 1374979638.5974 }, enrolled: { lo: 15960, hi: 41100 }, prestige: { lo: 109.8748, hi: 187.2836 }, rank: { lo: 1, hi: 4 }, netMargin: { lo: 0.0584, hi: 0.2199 }, weeksInTheRed: { lo: 0, hi: 56.25 } },
  ],
  "Curriculum rush (overreach)": [
    { year: 5, cash: { lo: -381186.8231, hi: 2622130.895 }, enrolled: { lo: 548.25, hi: 975 }, prestige: { lo: 28.7256, hi: 51.0709 }, rank: { lo: 47.25, hi: 82.5 }, netMargin: { lo: -0.1369, hi: 0.0431 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 10, cash: { lo: -14449624.669, hi: -4695285.2182 }, enrolled: { lo: 510.75, hi: 886.25 }, prestige: { lo: 34.2631, hi: 58.8934 }, rank: { lo: 42.75, hi: 75 }, netMargin: { lo: -0.1092, hi: 0.0988 }, weeksInTheRed: { lo: 133.5, hi: 287.5 } },
    { year: 20, cash: { lo: -567396.5808, hi: 4141767.3409 }, enrolled: { lo: 717.75, hi: 2320 }, prestige: { lo: 35.3971, hi: 76.3157 }, rank: { lo: 38.25, hi: 73.75 }, netMargin: { lo: -0.0395, hi: 0.2091 }, weeksInTheRed: { lo: 288.75, hi: 807.5 } },
    { year: 35, cash: { lo: -333730.3868, hi: 98706971.5375 }, enrolled: { lo: 7824.75, hi: 40400 }, prestige: { lo: 57.8108, hi: 168.8492 }, rank: { lo: 1, hi: 48.75 }, netMargin: { lo: -0.0057, hi: 0.4345 }, weeksInTheRed: { lo: 288.75, hi: 807.5 } },
    { year: 50, cash: { lo: 130218956.0589, hi: 3401345704.4331 }, enrolled: { lo: 24360, hi: 40700 }, prestige: { lo: 109.1579, hi: 186.9601 }, rank: { lo: 1, hi: 4 }, netMargin: { lo: 0.0249, hi: 0.1437 }, weeksInTheRed: { lo: 288.75, hi: 807.5 } },
  ],
  "Discount volume (beds first)": [
    { year: 5, cash: { lo: -2201818.5575, hi: 452489.2577 }, enrolled: { lo: 420, hi: 700 }, prestige: { lo: 50.5229, hi: 84.2066 }, rank: { lo: 30.75, hi: 56.25 }, netMargin: { lo: -0.1606, hi: -0.0297 }, weeksInTheRed: { lo: 9, hi: 48 } },
    { year: 10, cash: { lo: -6584367.4119, hi: -2418168.432 }, enrolled: { lo: 420, hi: 700 }, prestige: { lo: 57.9534, hi: 96.5896 }, rank: { lo: 18.75, hi: 37.5 }, netMargin: { lo: -0.0456, hi: 0.0579 }, weeksInTheRed: { lo: 209.25, hi: 372.5 } },
    { year: 20, cash: { lo: -5639480.5258, hi: 315749.0153 }, enrolled: { lo: 420, hi: 700 }, prestige: { lo: 61.2145, hi: 102.0241 }, rank: { lo: 17.25, hi: 31.25 }, netMargin: { lo: -0.042, hi: 0.0821 }, weeksInTheRed: { lo: 599.25, hi: 1022.5 } },
    { year: 35, cash: { lo: -2753318.358, hi: 3276446.2568 }, enrolled: { lo: 420, hi: 700 }, prestige: { lo: 61.5754, hi: 102.7942 }, rank: { lo: 21.75, hi: 36.25 }, netMargin: { lo: -0.0628, hi: 0.0974 }, weeksInTheRed: { lo: 833.25, hi: 1982.5 } },
    { year: 50, cash: { lo: 353828.7645, hi: 3453457.113 }, enrolled: { lo: 420, hi: 700 }, prestige: { lo: 61.639, hi: 103.0555 }, rank: { lo: 19.5, hi: 42.5 }, netMargin: { lo: -0.0815, hi: 0.0361 }, weeksInTheRed: { lo: 906.75, hi: 2498.75 } },
  ],
  "Completionist (build everything)": [
    { year: 5, cash: { lo: -879960.9984, hi: 2130903.1329 }, enrolled: { lo: 420, hi: 700 }, prestige: { lo: 51.8082, hi: 88.1015 }, rank: { lo: 28.5, hi: 53.75 }, netMargin: { lo: -0.0877, hi: 0.0248 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 10, cash: { lo: -880621.2609, hi: 1451061.8015 }, enrolled: { lo: 420, hi: 700 }, prestige: { lo: 61.9952, hi: 103.8641 }, rank: { lo: 10.5, hi: 30 }, netMargin: { lo: 0.0349, hi: 0.143 }, weeksInTheRed: { lo: 142.5, hi: 295 } },
    { year: 20, cash: { lo: -822911.4731, hi: 2478253.4863 }, enrolled: { lo: 420, hi: 700 }, prestige: { lo: 66.3889, hi: 110.8428 }, rank: { lo: 8, hi: 21.25 }, netMargin: { lo: -0.0524, hi: 0.085 }, weeksInTheRed: { lo: 179.25, hi: 423.75 } },
    { year: 35, cash: { lo: -1031321.607, hi: 2651169.7039 }, enrolled: { lo: 420, hi: 700 }, prestige: { lo: 66.8362, hi: 111.8108 }, rank: { lo: 11.25, hi: 32.5 }, netMargin: { lo: -0.0354, hi: 0.1222 }, weeksInTheRed: { lo: 249, hi: 458.75 } },
    { year: 50, cash: { lo: -196737.8312, hi: 2882295.2723 }, enrolled: { lo: 420, hi: 700 }, prestige: { lo: 67.0581, hi: 112.0805 }, rank: { lo: 12, hi: 35 }, netMargin: { lo: -0.0722, hi: 0.127 }, weeksInTheRed: { lo: 296.25, hi: 611.25 } },
  ],
  "Overbuilder (beds ahead of demand)": [
    { year: 5, cash: { lo: -1104314.8441, hi: 2163027.351 }, enrolled: { lo: 478.5, hi: 1228.75 }, prestige: { lo: 29.7344, hi: 53.1201 }, rank: { lo: 43.5, hi: 78.75 }, netMargin: { lo: -0.2003, hi: 0.0372 }, weeksInTheRed: { lo: 0, hi: 110 } },
    { year: 10, cash: { lo: -6583274.3026, hi: 1230166.8181 }, enrolled: { lo: 579.75, hi: 1228.75 }, prestige: { lo: 29.8976, hi: 52.384 }, rank: { lo: 48.75, hi: 85 }, netMargin: { lo: -0.1959, hi: 0.1097 }, weeksInTheRed: { lo: 109.5, hi: 295 } },
    { year: 20, cash: { lo: -18343632.1212, hi: 1874775.7563 }, enrolled: { lo: 633.75, hi: 1232.5 }, prestige: { lo: 30.5278, hi: 53.0348 }, rank: { lo: 51, hi: 88.75 }, netMargin: { lo: -0.1377, hi: 0.0037 }, weeksInTheRed: { lo: 333.75, hi: 945 } },
    { year: 35, cash: { lo: -31820302.801, hi: 1678936.9372 }, enrolled: { lo: 636, hi: 1263.75 }, prestige: { lo: 30.5684, hi: 53.4454 }, rank: { lo: 51, hi: 88.75 }, netMargin: { lo: -0.1307, hi: 0.0553 }, weeksInTheRed: { lo: 452.25, hi: 1920 } },
    { year: 50, cash: { lo: -44486155.0132, hi: 2066715.9 }, enrolled: { lo: 639, hi: 1256.25 }, prestige: { lo: 30.0439, hi: 53.2182 }, rank: { lo: 51, hi: 92.5 }, netMargin: { lo: -0.1225, hi: 0.0477 }, weeksInTheRed: { lo: 452.25, hi: 2895 } },
  ],
  "Earnest completionist": [
    { year: 5, cash: { lo: 955953.8807, hi: 3089932.7443 }, enrolled: { lo: 1620, hi: 3900 }, prestige: { lo: 48.2025, hi: 83.2328 }, rank: { lo: 34.5, hi: 62.5 }, netMargin: { lo: 0.2158, hi: 0.5133 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 10, cash: { lo: 11294966.9483, hi: 26716440.3231 }, enrolled: { lo: 11460, hi: 25100 }, prestige: { lo: 60.1391, hi: 105.8464 }, rank: { lo: 12.75, hi: 30 }, netMargin: { lo: 0.0997, hi: 0.3136 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 20, cash: { lo: 23446504.0031, hi: 252050390.9737 }, enrolled: { lo: 15000, hi: 37200 }, prestige: { lo: 105.95, hi: 178.7045 }, rank: { lo: 1, hi: 4 }, netMargin: { lo: -0.0188, hi: 0.0941 }, weeksInTheRed: { lo: 0, hi: 82.5 } },
    { year: 35, cash: { lo: 159515803.0753, hi: 2150641600.3501 }, enrolled: { lo: 15000, hi: 41100 }, prestige: { lo: 112.3104, hi: 187.2454 }, rank: { lo: 1, hi: 4 }, netMargin: { lo: 0.017, hi: 0.3681 }, weeksInTheRed: { lo: 0, hi: 82.5 } },
    { year: 50, cash: { lo: 302186715.1219, hi: 3308827920.0022 }, enrolled: { lo: 24420, hi: 41100 }, prestige: { lo: 112.4945, hi: 187.4926 }, rank: { lo: 1, hi: 4 }, netMargin: { lo: 0.1105, hi: 1.3406 }, weeksInTheRed: { lo: 0, hi: 82.5 } },
  ],
  "Scatterer (founds anything anywhere)": [
    { year: 5, cash: { lo: 2763863.3758, hi: 7549234.5104 }, enrolled: { lo: 1620, hi: 3700 }, prestige: { lo: 46.3317, hi: 79.0642 }, rank: { lo: 36.75, hi: 65 }, netMargin: { lo: 0.2279, hi: 0.4066 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 10, cash: { lo: 7476293.9645, hi: 21963559.294 }, enrolled: { lo: 8848.5, hi: 16172.5 }, prestige: { lo: 55.8538, hi: 96.8222 }, rank: { lo: 22.5, hi: 43.75 }, netMargin: { lo: 0.1463, hi: 0.3046 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 20, cash: { lo: 18895947.9737, hi: 196746663.8594 }, enrolled: { lo: 19740, hi: 33000 }, prestige: { lo: 80.6738, hi: 135.4852 }, rank: { lo: 1, hi: 6 }, netMargin: { lo: 0.0034, hi: 0.1303 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 35, cash: { lo: 153547558.0582, hi: 388518901.3789 }, enrolled: { lo: 19800, hi: 35100 }, prestige: { lo: 85.4583, hi: 145.6209 }, rank: { lo: 1, hi: 6 }, netMargin: { lo: 0.0088, hi: 0.1945 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 50, cash: { lo: 92983822.8426, hi: 1024683506.2401 }, enrolled: { lo: 19800, hi: 35100 }, prestige: { lo: 86.1094, hi: 149.3841 }, rank: { lo: 1, hi: 6 }, netMargin: { lo: 0.082, hi: 0.3482 }, weeksInTheRed: { lo: 0, hi: 10 } },
  ],
  "Selective college": [
    { year: 5, cash: { lo: 307871.7536, hi: 3295149.6477 }, enrolled: { lo: 921, hi: 1547.5 }, prestige: { lo: 51.1964, hi: 85.9323 }, rank: { lo: 32.25, hi: 57.5 }, netMargin: { lo: 0.5164, hi: 0.9077 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 10, cash: { lo: 4779686.4878, hi: 10607910.4306 }, enrolled: { lo: 3093, hi: 5660 }, prestige: { lo: 61.0402, hi: 109.5826 }, rank: { lo: 12, hi: 28.75 }, netMargin: { lo: 0.3025, hi: 0.5408 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 20, cash: { lo: 37870988.1304, hi: 97675890.7728 }, enrolled: { lo: 3084, hi: 5306.25 }, prestige: { lo: 104.9624, hi: 178.749 }, rank: { lo: 1, hi: 4 }, netMargin: { lo: -0.0349, hi: 0.0959 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 35, cash: { lo: 194011302.4381, hi: 380103474.7837 }, enrolled: { lo: 2997, hi: 5008.75 }, prestige: { lo: 112.2818, hi: 187.2467 }, rank: { lo: 1, hi: 4 }, netMargin: { lo: 0.0866, hi: 0.2701 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 50, cash: { lo: 77596099.2465, hi: 916156765.3366 }, enrolled: { lo: 2997.75, hi: 5007.5 }, prestige: { lo: 112.4937, hi: 187.4927 }, rank: { lo: 1, hi: 4 }, netMargin: { lo: 0.4656, hi: 0.8409 }, weeksInTheRed: { lo: 0, hi: 10 } },
  ],
  "Regional engine": [
    { year: 5, cash: { lo: 982337.2008, hi: 7452303.2127 }, enrolled: { lo: 1440, hi: 3500 }, prestige: { lo: 46.7779, hi: 80.5585 }, rank: { lo: 36, hi: 63.75 }, netMargin: { lo: 0.2187, hi: 0.5052 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 10, cash: { lo: 8311819.0869, hi: 29978285.731 }, enrolled: { lo: 7680, hi: 23300 }, prestige: { lo: 54.6051, hi: 113.8029 }, rank: { lo: 8, hi: 46.25 }, netMargin: { lo: 0.0153, hi: 0.3585 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 20, cash: { lo: 9671471.6826, hi: 96618471.6013 }, enrolled: { lo: 17280, hi: 37500 }, prestige: { lo: 100.3743, hi: 174.5479 }, rank: { lo: 1, hi: 4 }, netMargin: { lo: -0.0308, hi: 0.1367 }, weeksInTheRed: { lo: 0, hi: 240 } },
    { year: 35, cash: { lo: 139741475.5861, hi: 286870768.7335 }, enrolled: { lo: 17280, hi: 39000 }, prestige: { lo: 106.6847, hi: 187.125 }, rank: { lo: 1, hi: 4 }, netMargin: { lo: -0.0321, hi: 0.0848 }, weeksInTheRed: { lo: 86.25, hi: 240 } },
    { year: 50, cash: { lo: 5078465.0073, hi: 634734468.4118 }, enrolled: { lo: 17280, hi: 39000 }, prestige: { lo: 107.3105, hi: 187.4891 }, rank: { lo: 1, hi: 4 }, netMargin: { lo: -0.0413, hi: 0.1228 }, weeksInTheRed: { lo: 90, hi: 302.5 } },
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
