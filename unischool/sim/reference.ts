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
    { year: 5, cash: { lo: 698339.4535, hi: 7295152.8333 }, enrolled: { lo: 1800, hi: 3500 }, prestige: { lo: 45.031, hi: 82.3767 }, rank: { lo: 36.75, hi: 66.25 }, netMargin: { lo: 0.1935, hi: 0.4852 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 10, cash: { lo: 7117512.4319, hi: 29186757.2119 }, enrolled: { lo: 6720, hi: 14400 }, prestige: { lo: 57.9302, hi: 101.8616 }, rank: { lo: 15.75, hi: 35 }, netMargin: { lo: 0.037, hi: 0.2258 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 20, cash: { lo: 12516170.7412, hi: 51839127.8387 }, enrolled: { lo: 15000, hi: 38500 }, prestige: { lo: 95.3436, hi: 175.1591 }, rank: { lo: 1, hi: 4 }, netMargin: { lo: -0.0209, hi: 0.1246 }, weeksInTheRed: { lo: 0, hi: 116.25 } },
    { year: 35, cash: { lo: 120765126.5871, hi: 411732117.1306 }, enrolled: { lo: 24660, hi: 42300 }, prestige: { lo: 111.5677, hi: 187.1427 }, rank: { lo: 1, hi: 4 }, netMargin: { lo: -0.0065, hi: 0.1151 }, weeksInTheRed: { lo: 0, hi: 116.25 } },
    { year: 50, cash: { lo: 280022677.3168, hi: 1118835080.0456 }, enrolled: { lo: 25140, hi: 42300 }, prestige: { lo: 112.473, hi: 187.4897 }, rank: { lo: 1, hi: 4 }, netMargin: { lo: 0.0214, hi: 0.2456 }, weeksInTheRed: { lo: 0, hi: 116.25 } },
  ],
  "Curriculum rush (overreach)": [
    { year: 5, cash: { lo: 244483.4938, hi: 3723802.9715 }, enrolled: { lo: 515.25, hi: 1090 }, prestige: { lo: 31.0245, hi: 54.2149 }, rank: { lo: 47.25, hi: 78.75 }, netMargin: { lo: -0.0889, hi: 0.1559 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 10, cash: { lo: -1460942.4708, hi: 2756205.5954 }, enrolled: { lo: 504, hi: 3071.25 }, prestige: { lo: 32.8524, hi: 74.8507 }, rank: { lo: 41.25, hi: 78.75 }, netMargin: { lo: -0.0098, hi: 0.4897 }, weeksInTheRed: { lo: 0, hi: 151.25 } },
    { year: 20, cash: { lo: -839131.5859, hi: 3127161.0132 }, enrolled: { lo: 600, hi: 24620 }, prestige: { lo: 33.5877, hi: 100.3078 }, rank: { lo: 21.75, hi: 80 }, netMargin: { lo: -0.0532, hi: 0.4421 }, weeksInTheRed: { lo: 0, hi: 302.5 } },
    { year: 35, cash: { lo: -964347.4824, hi: 4113457654.6518 }, enrolled: { lo: 648.75, hi: 41900 }, prestige: { lo: 34.0726, hi: 184.4883 }, rank: { lo: 1, hi: 83.75 }, netMargin: { lo: -0.0461, hi: 0.1526 }, weeksInTheRed: { lo: 0, hi: 327.5 } },
    { year: 50, cash: { lo: 5017339.0457, hi: 14866277047.9622 }, enrolled: { lo: 1965.75, hi: 41900 }, prestige: { lo: 39.7584, hi: 187.4128 }, rank: { lo: 1, hi: 77.5 }, netMargin: { lo: 0.0367, hi: 0.4468 }, weeksInTheRed: { lo: 0, hi: 327.5 } },
  ],
  "Discount volume (beds first)": [
    { year: 5, cash: { lo: -1631816.3572, hi: 802030.9532 }, enrolled: { lo: 420, hi: 700 }, prestige: { lo: 50.519, hi: 84.2249 }, rank: { lo: 32.25, hi: 60 }, netMargin: { lo: -0.1465, hi: -0.0247 }, weeksInTheRed: { lo: 0, hi: 30 } },
    { year: 10, cash: { lo: -5136276.4397, hi: -2214637.1981 }, enrolled: { lo: 420, hi: 700 }, prestige: { lo: 57.9523, hi: 96.6511 }, rank: { lo: 20.25, hi: 35 }, netMargin: { lo: -0.0492, hi: 0.0631 }, weeksInTheRed: { lo: 200.25, hi: 350 } },
    { year: 20, cash: { lo: -3780767.037, hi: 231767.4036 }, enrolled: { lo: 420, hi: 700 }, prestige: { lo: 61.2143, hi: 102.1131 }, rank: { lo: 18.75, hi: 32.5 }, netMargin: { lo: -0.0405, hi: 0.0777 }, weeksInTheRed: { lo: 590.25, hi: 1000 } },
    { year: 35, cash: { lo: -1721434.3906, hi: 1057197.3581 }, enrolled: { lo: 420, hi: 700 }, prestige: { lo: 58.2646, hi: 102.7386 }, rank: { lo: 20.25, hi: 41.25 }, netMargin: { lo: -0.0718, hi: 0.0718 }, weeksInTheRed: { lo: 782.25, hi: 1947.5 } },
    { year: 50, cash: { lo: -1061191.7005, hi: 2936618.1199 }, enrolled: { lo: 420, hi: 700 }, prestige: { lo: 61.7941, hi: 105.9304 }, rank: { lo: 19.5, hi: 41.25 }, netMargin: { lo: -0.1239, hi: 0.0355 }, weeksInTheRed: { lo: 1019.25, hi: 2263.75 } },
  ],
  "Completionist (build everything)": [
    { year: 5, cash: { lo: 486916.3819, hi: 4857254.1211 }, enrolled: { lo: 600, hi: 2300 }, prestige: { lo: 50.3043, hi: 86.1588 }, rank: { lo: 31.5, hi: 61.25 }, netMargin: { lo: -0.0341, hi: 0.2435 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 10, cash: { lo: -896226.3412, hi: 4720082.8513 }, enrolled: { lo: 600, hi: 5500 }, prestige: { lo: 54.6966, hi: 102.7587 }, rank: { lo: 15.75, hi: 47.5 }, netMargin: { lo: -0.0381, hi: 0.3653 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 20, cash: { lo: -687826.2449, hi: 13953483.2603 }, enrolled: { lo: 600, hi: 30900 }, prestige: { lo: 66.2572, hi: 159.1818 }, rank: { lo: 1, hi: 22.5 }, netMargin: { lo: -0.0564, hi: 0.0691 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 35, cash: { lo: -228553.8045, hi: 546196094.8502 }, enrolled: { lo: 600, hi: 42700 }, prestige: { lo: 67.1623, hi: 186.6802 }, rank: { lo: 1, hi: 26.25 }, netMargin: { lo: -0.0602, hi: 0.1309 }, weeksInTheRed: { lo: 0, hi: 49 } },
    { year: 50, cash: { lo: -979044.2649, hi: 1267667501.9774 }, enrolled: { lo: 600, hi: 42700 }, prestige: { lo: 64.9789, hi: 187.4763 }, rank: { lo: 1, hi: 35 }, netMargin: { lo: -0.0371, hi: 0.6011 }, weeksInTheRed: { lo: 0, hi: 137.5 } },
  ],
  "Overbuilder (beds ahead of demand)": [
    { year: 5, cash: { lo: -1189395.708, hi: 1645746.8122 }, enrolled: { lo: 606, hi: 1053.75 }, prestige: { lo: 25.6096, hi: 52.5382 }, rank: { lo: 44.25, hi: 87.5 }, netMargin: { lo: -0.2725, hi: 0.0229 }, weeksInTheRed: { lo: 0, hi: 38 } },
    { year: 10, cash: { lo: -9282978.0829, hi: 2195926.5818 }, enrolled: { lo: 327.75, hi: 1205 }, prestige: { lo: 21.4866, hi: 53.8225 }, rank: { lo: 45, hi: 98.75 }, netMargin: { lo: -0.4411, hi: 0.0393 }, weeksInTheRed: { lo: 147, hi: 305 } },
    { year: 20, cash: { lo: -33477042.8477, hi: 2395518.2366 }, enrolled: { lo: 241, hi: 1331.25 }, prestige: { lo: 20.5815, hi: 54.2715 }, rank: { lo: 49.5, hi: 103.75 }, netMargin: { lo: -0.5282, hi: -0.0601 }, weeksInTheRed: { lo: 258.75, hi: 955 } },
    { year: 35, cash: { lo: -68461636.2078, hi: 1086299.4694 }, enrolled: { lo: 242, hi: 1310 }, prestige: { lo: 20.667, hi: 52.6816 }, rank: { lo: 48.75, hi: 103.75 }, netMargin: { lo: -0.5154, hi: -0.0309 }, weeksInTheRed: { lo: 522, hi: 1930 } },
    { year: 50, cash: { lo: -102499245.0685, hi: -11144297.4366 }, enrolled: { lo: 245, hi: 1063.75 }, prestige: { lo: 20.7564, hi: 51.0517 }, rank: { lo: 53.25, hi: 111.25 }, netMargin: { lo: -0.4967, hi: -0.0623 }, weeksInTheRed: { lo: 1103.25, hi: 2905 } },
  ],
  "Earnest completionist": [
    { year: 5, cash: { lo: 1188460.45, hi: 4436326.339 }, enrolled: { lo: 1920, hi: 5500 }, prestige: { lo: 46.5813, hi: 79.3933 }, rank: { lo: 37.5, hi: 66.25 }, netMargin: { lo: 0.2498, hi: 0.5432 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 10, cash: { lo: 14365016.9483, hi: 28805165.5149 }, enrolled: { lo: 13680, hi: 24800 }, prestige: { lo: 61.0835, hi: 109.9058 }, rank: { lo: 8, hi: 22.5 }, netMargin: { lo: 0.0641, hi: 0.2535 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 20, cash: { lo: 39373361.2425, hi: 288854760.7332 }, enrolled: { lo: 21780, hi: 41900 }, prestige: { lo: 104.5253, hi: 179.5287 }, rank: { lo: 1, hi: 4 }, netMargin: { lo: -0.0109, hi: 0.1032 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 35, cash: { lo: 408283995.7321, hi: 1582442793.8135 }, enrolled: { lo: 25140, hi: 41900 }, prestige: { lo: 112.2691, hi: 187.2692 }, rank: { lo: 1, hi: 4 }, netMargin: { lo: 0.1166, hi: 0.5686 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 50, cash: { lo: 2747085927.4069, hi: 9311413159.8337 }, enrolled: { lo: 25140, hi: 41900 }, prestige: { lo: 112.4933, hi: 187.4933 }, rank: { lo: 1, hi: 4 }, netMargin: { lo: 0.5099, hi: 1.7275 }, weeksInTheRed: { lo: 0, hi: 10 } },
  ],
  "Scatterer (founds anything anywhere)": [
    { year: 5, cash: { lo: 2429887.6286, hi: 6415558.8636 }, enrolled: { lo: 1620, hi: 3557.5 }, prestige: { lo: 45.1703, hi: 79.3474 }, rank: { lo: 39, hi: 66.25 }, netMargin: { lo: 0.234, hi: 0.5086 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 10, cash: { lo: 9906890.9008, hi: 25373695.9995 }, enrolled: { lo: 8400, hi: 16540 }, prestige: { lo: 53.5848, hi: 94.913 }, rank: { lo: 26.25, hi: 50 }, netMargin: { lo: 0.1449, hi: 0.457 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 20, cash: { lo: 6878494.9151, hi: 63701494.9361 }, enrolled: { lo: 20400, hi: 34300 }, prestige: { lo: 77.8078, hi: 140.4942 }, rank: { lo: 1, hi: 7 }, netMargin: { lo: -0.0351, hi: 0.1359 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 35, cash: { lo: 190562642.507, hi: 391278302.0552 }, enrolled: { lo: 20580, hi: 34300 }, prestige: { lo: 90.1601, hi: 151.0148 }, rank: { lo: 1, hi: 5 }, netMargin: { lo: 0.035, hi: 0.1676 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 50, cash: { lo: 375629485.5953, hi: 929456840.6006 }, enrolled: { lo: 20580, hi: 34300 }, prestige: { lo: 91.6535, hi: 153.2524 }, rank: { lo: 1, hi: 6 }, netMargin: { lo: 0.1243, hi: 0.2586 }, weeksInTheRed: { lo: 0, hi: 10 } },
  ],
  "Selective college": [
    { year: 5, cash: { lo: 801700.1746, hi: 3711263.6139 }, enrolled: { lo: 825.75, hi: 1555 }, prestige: { lo: 49.762, hi: 87.6202 }, rank: { lo: 31.5, hi: 57.5 }, netMargin: { lo: 0.4473, hi: 0.8346 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 10, cash: { lo: 4356568.0876, hi: 17185855.4565 }, enrolled: { lo: 2869.5, hi: 6063.75 }, prestige: { lo: 63.0732, hi: 114.3371 }, rank: { lo: 6, hi: 25 }, netMargin: { lo: 0.2226, hi: 0.4751 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 20, cash: { lo: -9338044.8429, hi: 87509695.3491 }, enrolled: { lo: 3066.75, hi: 5161.25 }, prestige: { lo: 107.2065, hi: 180.08 }, rank: { lo: 1, hi: 4 }, netMargin: { lo: -0.0932, hi: 0.0687 }, weeksInTheRed: { lo: 0, hi: 71.25 } },
    { year: 35, cash: { lo: 1671353.5256, hi: 307188024.6173 }, enrolled: { lo: 3005.25, hi: 5067.5 }, prestige: { lo: 112.3468, hi: 187.2852 }, rank: { lo: 1, hi: 4 }, netMargin: { lo: -0.0344, hi: 0.5177 }, weeksInTheRed: { lo: 0, hi: 406.25 } },
    { year: 50, cash: { lo: 2353033.8778, hi: 1092434435.0956 }, enrolled: { lo: 3000.75, hi: 5045 }, prestige: { lo: 112.4956, hi: 187.4938 }, rank: { lo: 1, hi: 4 }, netMargin: { lo: -0.0356, hi: 1.1796 }, weeksInTheRed: { lo: 0, hi: 406.25 } },
  ],
  "Regional engine": [
    { year: 5, cash: { lo: 1088214.0318, hi: 3479928.1894 }, enrolled: { lo: 1860, hi: 3800 }, prestige: { lo: 47.168, hi: 80.6382 }, rank: { lo: 35.25, hi: 63.75 }, netMargin: { lo: 0.2273, hi: 0.5144 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 10, cash: { lo: 9406483.4493, hi: 38187837.9447 }, enrolled: { lo: 10740, hi: 23700 }, prestige: { lo: 56.2018, hi: 104.3404 }, rank: { lo: 13.5, hi: 46.25 }, netMargin: { lo: 0.1068, hi: 0.3314 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 20, cash: { lo: 12745218.321, hi: 61792511.4327 }, enrolled: { lo: 21540, hi: 40100 }, prestige: { lo: 98.9177, hi: 177.3667 }, rank: { lo: 1, hi: 4 }, netMargin: { lo: -0.0464, hi: 0.0912 }, weeksInTheRed: { lo: 48, hi: 135 } },
    { year: 35, cash: { lo: 30173433.654, hi: 292336703.7402 }, enrolled: { lo: 23520, hi: 41800 }, prestige: { lo: 111.2657, hi: 187.2066 }, rank: { lo: 1, hi: 4 }, netMargin: { lo: -0.0423, hi: 0.0923 }, weeksInTheRed: { lo: 48, hi: 135 } },
    { year: 50, cash: { lo: 14246733.2066, hi: 363439823.798 }, enrolled: { lo: 24780, hi: 42100 }, prestige: { lo: 112.4643, hi: 187.4915 }, rank: { lo: 1, hi: 4 }, netMargin: { lo: -0.0559, hi: 0.0877 }, weeksInTheRed: { lo: 48, hi: 135 } },
  ],
  "Idle (builds nothing)": [
    { year: 5, cash: { lo: 4477904.5535, hi: 7675426.9517 }, enrolled: { lo: 311.25, hi: 518.75 }, prestige: { lo: 30.5332, hi: 50.8888 }, rank: { lo: 48, hi: 81.25 }, netMargin: { lo: 0.1227, hi: 0.2227 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 10, cash: { lo: 5944011.2691, hi: 10461227.1183 }, enrolled: { lo: 339, hi: 565 }, prestige: { lo: 30.653, hi: 51.0953 }, rank: { lo: 48, hi: 85 }, netMargin: { lo: 0.0391, hi: 0.1393 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 20, cash: { lo: 9115279.8757, hi: 15434817.3647 }, enrolled: { lo: 338.25, hi: 563.75 }, prestige: { lo: 31.1141, hi: 51.8899 }, rank: { lo: 48.75, hi: 88.75 }, netMargin: { lo: 0.0631, hi: 0.1718 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 35, cash: { lo: 15554445.615, hi: 26480340.0942 }, enrolled: { lo: 339, hi: 565 }, prestige: { lo: 31.3399, hi: 52.2852 }, rank: { lo: 52.5, hi: 91.25 }, netMargin: { lo: 0.1175, hi: 0.2277 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 50, cash: { lo: 24836716.8021, hi: 42603578.2489 }, enrolled: { lo: 339.75, hi: 566.25 }, prestige: { lo: 31.5596, hi: 52.6502 }, rank: { lo: 51.75, hi: 96.25 }, netMargin: { lo: 0.1699, hi: 0.2961 }, weeksInTheRed: { lo: 0, hi: 10 } },
  ],
};
// --- END GENERATED ---
