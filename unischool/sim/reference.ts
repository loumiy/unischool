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
// WHAT THESE BANDS ARE, TODAY: a statement of where the game IS. Every one
// of them was generated from the current run by `npm run sim --
// --write-reference` and committed unedited, at ±25% (see TOLERANCE). They
// are not a design target and do not claim to be — several of them describe
// figures the review called broken.
//
// WHAT THEY BECOME: a statement of where the game SHOULD be. Plan 10 is a
// rebalance; when it edits a band here, that edit is the design decision,
// recorded as data, and the run that then falls inside it is the evidence.
// Plan 10's last PR is what turns the scorecard into a failing gate — see
// test/balance-scorecard.test.ts, which reports and passes until then.
//
// Not part of the game: nothing in src/ imports this.
// ---------------------------------------------------------------------

import type { Row } from './balanceSim';

// The years a trajectory is read at. Five samples over forty years: the
// early pinch, the build-out, the review's own horizon, and the two late
// decades whose emptiness is what Plans 12 and 13 are about.
export const REFERENCE_YEARS = [5, 10, 20, 30, 40] as const;

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
// what "the same run" means for each figure, and Plan 10, the plan that has
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
  netMargin: 0.05,      // five points of margin
  weeksInTheRed: 10,    // ten weeks over the five years a sample covers
};

export type Metric = 'cash' | 'enrolled' | 'prestige' | 'netMargin' | 'weeksInTheRed';

export const METRICS: Metric[] = ['cash', 'enrolled', 'prestige', 'netMargin', 'weeksInTheRed'];

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
      netMargin: bandAround(netMargin(row), 'netMargin'),
      weeksInTheRed: bandAround(row.weeksInTheRed, 'weeksInTheRed'),
    });
  }
  return out;
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
  const reference = REFERENCE[strategyName];
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
  if (metric === 'weeksInTheRed') return n.toFixed(0);
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

// The markers below are what `--write-reference` rewrites between:
// everything above them is hand-written and stays, everything between them
// is measurement. The marker TEXT lives in balanceSim.ts rather than here
// as a pair of exported constants, which was tried first and is a trap —
// a constant declaring the marker contains the marker, so the writer finds
// its own declaration instead and eats it.

// --- GENERATED by `npm run sim -- --write-reference`. Do not hand-edit lightly. ---
export const REFERENCE: Reference = {
  "Balanced builder": [
    { year: 5, cash: { lo: 4921215.32, hi: 8202025.5333 }, enrolled: { lo: 2043, hi: 3405 }, prestige: { lo: 39.7842, hi: 66.307 }, netMargin: { lo: 0.5709, hi: 0.9515 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 10, cash: { lo: 3519446.1404, hi: 5865743.5674 }, enrolled: { lo: 5744.25, hi: 9573.75 }, prestige: { lo: 46.7521, hi: 77.9202 }, netMargin: { lo: -0.0159, hi: 0.0841 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 20, cash: { lo: -5221488.5706, hi: -3132893.1424 }, enrolled: { lo: 24423, hi: 40705 }, prestige: { lo: 65.3228, hi: 108.8713 }, netMargin: { lo: -0.052, hi: 0.048 }, weeksInTheRed: { lo: 0, hi: 14 } },
    { year: 30, cash: { lo: 130795869.1709, hi: 217993115.2849 }, enrolled: { lo: 52716.75, hi: 87861.25 }, prestige: { lo: 86.5649, hi: 144.2749 }, netMargin: { lo: 0.0857, hi: 0.1857 }, weeksInTheRed: { lo: 45, hi: 75 } },
    { year: 40, cash: { lo: 447422522.9244, hi: 745704204.874 }, enrolled: { lo: 52841.25, hi: 88068.75 }, prestige: { lo: 103.1227, hi: 171.8712 }, netMargin: { lo: 0.2699, hi: 0.4499 }, weeksInTheRed: { lo: 45, hi: 75 } },
  ],
  "Curriculum rush (overreach)": [
    { year: 5, cash: { lo: -786100.4573, hi: 1213899.5427 }, enrolled: { lo: 1902.75, hi: 3171.25 }, prestige: { lo: 39.6094, hi: 66.0157 }, netMargin: { lo: 0.3124, hi: 0.5207 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 10, cash: { lo: 3957142.2236, hi: 6595237.0394 }, enrolled: { lo: 5535, hi: 9225 }, prestige: { lo: 47.0368, hi: 78.3947 }, netMargin: { lo: 0.2358, hi: 0.3931 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 20, cash: { lo: 2957309.1204, hi: 4957309.1204 }, enrolled: { lo: 20559, hi: 34265 }, prestige: { lo: 63.703, hi: 106.1717 }, netMargin: { lo: -0.047, hi: 0.053 }, weeksInTheRed: { lo: 89.25, hi: 148.75 } },
    { year: 30, cash: { lo: 155626787.8473, hi: 259377979.7455 }, enrolled: { lo: 44884.5, hi: 74807.5 }, prestige: { lo: 96.4863, hi: 160.8106 }, netMargin: { lo: 0.2186, hi: 0.3644 }, weeksInTheRed: { lo: 89.25, hi: 148.75 } },
    { year: 40, cash: { lo: 3346879655.0098, hi: 5578132758.3497 }, enrolled: { lo: 40068.75, hi: 66781.25 }, prestige: { lo: 108.1031, hi: 180.1719 }, netMargin: { lo: 0.3263, hi: 0.5438 }, weeksInTheRed: { lo: 89.25, hi: 148.75 } },
  ],
  "Discount volume (beds first)": [
    { year: 5, cash: { lo: 2751543.1282, hi: 4751543.1282 }, enrolled: { lo: 2431.5, hi: 4052.5 }, prestige: { lo: 40.3884, hi: 67.314 }, netMargin: { lo: 0.2698, hi: 0.4497 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 10, cash: { lo: 7491391.86, hi: 12485653.1 }, enrolled: { lo: 5810.25, hi: 9683.75 }, prestige: { lo: 45.2711, hi: 75.4519 }, netMargin: { lo: 0.2385, hi: 0.3975 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 20, cash: { lo: 53095184.9465, hi: 88491974.9108 }, enrolled: { lo: 17682, hi: 29470 }, prestige: { lo: 52.5992, hi: 87.6653 }, netMargin: { lo: 0.0562, hi: 0.1562 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 30, cash: { lo: 6574677.2378, hi: 10957795.3963 }, enrolled: { lo: 23282.25, hi: 38803.75 }, prestige: { lo: 56.8324, hi: 94.7207 }, netMargin: { lo: -0.0649, hi: 0.0351 }, weeksInTheRed: { lo: 199.5, hi: 332.5 } },
    { year: 40, cash: { lo: 672402.4745, hi: 2672402.4745 }, enrolled: { lo: 25386.75, hi: 42311.25 }, prestige: { lo: 58.5372, hi: 97.562 }, netMargin: { lo: -0.0133, hi: 0.0867 }, weeksInTheRed: { lo: 324.75, hi: 541.25 } },
  ],
  "Completionist (build everything)": [
    { year: 5, cash: { lo: 6260364.1497, hi: 10433940.2495 }, enrolled: { lo: 2025.75, hi: 3376.25 }, prestige: { lo: 39.9267, hi: 66.5446 }, netMargin: { lo: 0.7569, hi: 1.2615 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 10, cash: { lo: 5232938.4514, hi: 8721564.0857 }, enrolled: { lo: 5858.25, hi: 9763.75 }, prestige: { lo: 47.0618, hi: 78.4363 }, netMargin: { lo: 0.2553, hi: 0.4255 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 20, cash: { lo: 159502649.3552, hi: 265837748.9253 }, enrolled: { lo: 31786.5, hi: 52977.5 }, prestige: { lo: 67.7665, hi: 112.9441 }, netMargin: { lo: 0.126, hi: 0.226 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 30, cash: { lo: 115491826.6669, hi: 192486377.7782 }, enrolled: { lo: 49975.5, hi: 83292.5 }, prestige: { lo: 94.6427, hi: 157.7378 }, netMargin: { lo: 0.1554, hi: 0.259 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 40, cash: { lo: 1272497282.988, hi: 2120828804.9799 }, enrolled: { lo: 53846.25, hi: 89743.75 }, prestige: { lo: 107.6412, hi: 179.4021 }, netMargin: { lo: 0.391, hi: 0.6516 }, weeksInTheRed: { lo: 0, hi: 10 } },
  ],
  "Overbuilder (beds ahead of demand)": [
    { year: 5, cash: { lo: 143627.4314, hi: 2143627.4314 }, enrolled: { lo: 1931.25, hi: 3218.75 }, prestige: { lo: 40.473, hi: 67.455 }, netMargin: { lo: -0.0261, hi: 0.0739 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 10, cash: { lo: 779137.7635, hi: 2779137.7635 }, enrolled: { lo: 2790, hi: 4650 }, prestige: { lo: 44.0847, hi: 73.4746 }, netMargin: { lo: 0.01, hi: 0.11 }, weeksInTheRed: { lo: 52.5, hi: 87.5 } },
    { year: 20, cash: { lo: 417289.9622, hi: 2417289.9622 }, enrolled: { lo: 6804.75, hi: 11341.25 }, prestige: { lo: 51.7814, hi: 86.3023 }, netMargin: { lo: -0.0043, hi: 0.0957 }, weeksInTheRed: { lo: 65.25, hi: 108.75 } },
    { year: 30, cash: { lo: 9977992.8501, hi: 16629988.0835 }, enrolled: { lo: 11321.25, hi: 18868.75 }, prestige: { lo: 55.2839, hi: 92.1398 }, netMargin: { lo: -0.0103, hi: 0.0897 }, weeksInTheRed: { lo: 65.25, hi: 108.75 } },
    { year: 40, cash: { lo: -46263001.4319, hi: -27757800.8591 }, enrolled: { lo: 14566.5, hi: 24277.5 }, prestige: { lo: 55.0248, hi: 91.7079 }, netMargin: { lo: -0.0935, hi: 0.0065 }, weeksInTheRed: { lo: 369.75, hi: 616.25 } },
  ],
  "Earnest completionist": [
    { year: 5, cash: { lo: 3047388.2582, hi: 5078980.4303 }, enrolled: { lo: 3483.75, hi: 5806.25 }, prestige: { lo: 40.4618, hi: 67.4364 }, netMargin: { lo: 0.2545, hi: 0.4242 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 10, cash: { lo: 9872090.0483, hi: 16453483.4139 }, enrolled: { lo: 12015, hi: 20025 }, prestige: { lo: 52.1784, hi: 86.964 }, netMargin: { lo: 0.1168, hi: 0.2168 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 20, cash: { lo: 51886645.7667, hi: 86477742.9444 }, enrolled: { lo: 29659.5, hi: 49432.5 }, prestige: { lo: 63.6725, hi: 106.1208 }, netMargin: { lo: 0.02, hi: 0.12 }, weeksInTheRed: { lo: 108, hi: 180 } },
    { year: 30, cash: { lo: 221230971.1252, hi: 368718285.2087 }, enrolled: { lo: 69433.5, hi: 115722.5 }, prestige: { lo: 89.2321, hi: 148.7201 }, netMargin: { lo: 0.0899, hi: 0.1899 }, weeksInTheRed: { lo: 108, hi: 180 } },
    { year: 40, cash: { lo: 851290831.5803, hi: 1418818052.6338 }, enrolled: { lo: 53966.25, hi: 89943.75 }, prestige: { lo: 106.1691, hi: 176.9484 }, netMargin: { lo: 0.2637, hi: 0.4395 }, weeksInTheRed: { lo: 108, hi: 180 } },
  ],
  "Idle (builds nothing)": [
    { year: 5, cash: { lo: 25318439.3726, hi: 42197398.9543 }, enrolled: { lo: 803.25, hi: 1338.75 }, prestige: { lo: 33.4815, hi: 55.8024 }, netMargin: { lo: 2.0178, hi: 3.363 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 10, cash: { lo: 49782225.2791, hi: 82970375.4651 }, enrolled: { lo: 575.25, hi: 958.75 }, prestige: { lo: 30.819, hi: 51.3649 }, netMargin: { lo: 1.7572, hi: 2.9287 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 20, cash: { lo: 84056325.5381, hi: 140093875.8969 }, enrolled: { lo: 442.5, hi: 737.5 }, prestige: { lo: 28.8106, hi: 48.0177 }, netMargin: { lo: 1.5686, hi: 2.6143 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 30, cash: { lo: 113447945.0486, hi: 189079908.4144 }, enrolled: { lo: 417, hi: 695 }, prestige: { lo: 28.3887, hi: 47.3146 }, netMargin: { lo: 1.5619, hi: 2.6032 }, weeksInTheRed: { lo: 0, hi: 10 } },
    { year: 40, cash: { lo: 142634545.372, hi: 237724242.2866 }, enrolled: { lo: 417, hi: 695 }, prestige: { lo: 28.405, hi: 47.3417 }, netMargin: { lo: 1.6104, hi: 2.684 }, weeksInTheRed: { lo: 0, hi: 10 } },
  ],
};
// --- END GENERATED ---
