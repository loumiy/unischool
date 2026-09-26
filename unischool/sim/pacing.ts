// ---------------------------------------------------------------------
// The pacing scorecard (Plan 66): whether the natural line of play
// (sim/harness/natural.ts) grows steadily over forty years and coasts the
// last ten, rather than sprinting to the top by year 12. Read by
// `npm run natural -- --pacing`, which plays three seeds and prints each
// target against the median. Measures, never fails: like every balance
// number since Plan 56, it is reported, not gated.
//
// Four measures, each read at a summer's close: enrollment, prestige, rank
// and the operating net per week. "Growth" is a measure's rise from year 1
// to year 50 of the same run, so a target in shares holds whatever the
// ceilings end up being; prestige (capped at 150) and rank are also
// targeted in their own units.
// ---------------------------------------------------------------------

export interface PaceYear {
  year: number;
  enrolled: number;
  prestige: number;
  rank: number;
  netPerWeek: number;
}

// The guided player's year 50, for the buffer: a player who is not playing
// the natural line should still get most of the way.
export interface PaceFinish {
  enrolled: number;
  prestige: number;
  rank: number;
}

type Measure = 'enrolled' | 'prestige' | 'netPerWeek';
const MEASURE_NAME: Record<Measure | 'rank', string> = { enrolled: 'Enrollment', prestige: 'Prestige', netPerWeek: 'Net $/wk', rank: 'Rank' };

// A band: the median must fall in [min, max] (either may be open).
interface Band { min?: number; max?: number }

// ---- The targets ----

// The year a measure first reaches half, and 90%, of its growth.
export const MILESTONE_YEARS: Record<Measure, { half: Band; ninety: Band }> = {
  enrolled: { half: { min: 18, max: 22 }, ninety: { min: 36, max: 40 } },
  prestige: { half: { min: 18, max: 22 }, ninety: { min: 36, max: 40 } },
  netPerWeek: { half: { min: 20, max: 24 }, ninety: { min: 37, max: 41 } },
};

// The year the rank first reaches the top 25, the top 10, and first place.
export const RANK_MILESTONES: Array<{ top: number; band: Band }> = [
  { top: 25, band: { min: 12, max: 16 } },
  { top: 10, band: { min: 20, max: 25 } },
  { top: 1, band: { min: 34, max: 40 } },
];

// Checkpoints: enrollment and net as a share of year 50's value; prestige
// and rank in their own units.
export const CHECKPOINTS: Array<{ year: number; enrolledShare: Band; prestige: Band; rank: Band; netShare: Band }> = [
  { year: 10, enrolledShare: { min: 0.17, max: 0.29 }, prestige: { min: 72, max: 82 }, rank: { min: 25, max: 40 }, netShare: { min: 0.1, max: 0.2 } },
  { year: 20, enrolledShare: { min: 0.43, max: 0.55 }, prestige: { min: 96, max: 106 }, rank: { min: 8, max: 15 }, netShare: { min: 0.35, max: 0.5 } },
  { year: 30, enrolledShare: { min: 0.7, max: 0.81 }, prestige: { min: 120, max: 130 }, rank: { min: 2, max: 5 }, netShare: { min: 0.65, max: 0.8 } },
  { year: 40, enrolledShare: { min: 0.94 }, prestige: { min: 145 }, rank: { max: 1 }, netShare: { min: 0.9 } },
];

// The coast: the last decade adds little.
export const COAST = { enrolledOverY40: { max: 0.05 }, netOverY40: { max: 0.1 }, prestigeY50: { min: 149.5 }, rankY50: { max: 1 } };

// Steadiness: no sprint year, every decade pulls its weight.
export const STEADY = {
  // The largest one-year gain, as a share of year 50's enrollment.
  enrolledYearGain: { max: 0.08 },
  // The largest one-year gain in prestige points.
  prestigeYearGain: { max: 6 },
  // Each of the first four decades' share of growth, and the fifth's.
  decade: { min: 0.15, max: 0.35 },
  lastDecade: { max: 0.1 },
  // Years after year 5 that closed a second straight fall in the net.
  netFalls: { max: 0 },
};

// The buffer: the guided player's year 50 against the natural player's.
export const BUFFER = { enrolledShare: { min: 0.85 }, prestigeShare: { min: 0.85 }, rank: { max: 10 } };

// ---- The scoring ----

export interface ScoreRow {
  section: string;
  label: string;
  target: string;
  // The median across runs, and each run's value.
  median: number;
  values: number[];
  pass: boolean;
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
function firstYear(run: PaceYear[], test: (y: PaceYear) => boolean): number {
  return run.find(test)?.year ?? Infinity;
}

export function scorecard(runs: PaceYear[][], guided: PaceFinish[]): ScoreRow[] {
  const rows: ScoreRow[] = [];
  const add = (section: string, label: string, band: Band, format: (n: number) => string, per: (run: PaceYear[], i: number) => number) => {
    const values = runs.map(per);
    const m = median(values);
    rows.push({ section, label, target: bandText(band, format), median: m, values, pass: within(m, band), format });
  };

  for (const m of ['enrolled', 'prestige', 'netPerWeek'] as const) {
    add('When', `${MEASURE_NAME[m]}: half its growth`, MILESTONE_YEARS[m].half, yr, (run) => firstYear(run, (y) => growth(run, m, y.year) >= 0.5));
    add('When', `${MEASURE_NAME[m]}: 90% of its growth`, MILESTONE_YEARS[m].ninety, yr, (run) => firstYear(run, (y) => growth(run, m, y.year) >= 0.9));
  }
  for (const { top, band } of RANK_MILESTONES) {
    add('When', top === 1 ? 'Rank: first #1' : `Rank: first in the top ${top}`, band, yr, (run) => firstYear(run, (y) => y.rank <= top));
  }

  for (const c of CHECKPOINTS) {
    const share = (run: PaceYear[], m: Measure) => (at(run, c.year)?.[m] ?? NaN) / (at(run, 50)?.[m] ?? NaN);
    add(`Year ${c.year}`, 'Enrollment, share of Y50', c.enrolledShare, pct, (run) => share(run, 'enrolled'));
    add(`Year ${c.year}`, 'Prestige', c.prestige, dec, (run) => at(run, c.year)?.prestige ?? NaN);
    add(`Year ${c.year}`, 'Rank', c.rank, num, (run) => at(run, c.year)?.rank ?? NaN);
    add(`Year ${c.year}`, 'Net $/wk, share of Y50', c.netShare, pct, (run) => share(run, 'netPerWeek'));
  }

  const over40 = (run: PaceYear[], m: Measure) => (at(run, 50)?.[m] ?? NaN) / (at(run, 40)?.[m] ?? NaN) - 1;
  add('Year 50', 'Enrollment over Y40', COAST.enrolledOverY40, pct, (run) => over40(run, 'enrolled'));
  add('Year 50', 'Net $/wk over Y40', COAST.netOverY40, pct, (run) => over40(run, 'netPerWeek'));
  add('Year 50', 'Prestige', COAST.prestigeY50, dec, (run) => at(run, 50)?.prestige ?? NaN);
  add('Year 50', 'Rank', COAST.rankY50, num, (run) => at(run, 50)?.rank ?? NaN);

  const gains = (run: PaceYear[], m: Measure) => run.slice(1).map((y, i) => y[m] - run[i][m]);
  add('Steady', 'Largest one-year enrollment gain, share of Y50', STEADY.enrolledYearGain, pct,
    (run) => Math.max(...gains(run, 'enrolled')) / (at(run, 50)?.enrolled ?? NaN));
  add('Steady', 'Largest one-year prestige gain (points)', STEADY.prestigeYearGain, dec, (run) => Math.max(...gains(run, 'prestige')));
  for (const m of ['enrolled', 'prestige', 'netPerWeek'] as const) {
    for (let d = 1; d <= 5; d += 1) {
      const band = d === 5 ? STEADY.lastDecade : STEADY.decade;
      add('Steady', `${MEASURE_NAME[m]}: growth in years ${d === 1 ? 1 : (d - 1) * 10}–${d * 10}`, band, pct,
        (run) => growth(run, m, d * 10) - (d === 1 ? 0 : growth(run, m, (d - 1) * 10)));
    }
  }
  add('Steady', 'Net $/wk: second straight falls after Y5', STEADY.netFalls, num, (run) => {
    let falls = 0;
    for (let i = 2; i < run.length; i += 1) {
      if (run[i].year > 5 && run[i].netPerWeek < run[i - 1].netPerWeek && run[i - 1].netPerWeek < run[i - 2].netPerWeek) falls += 1;
    }
    return falls;
  });

  const finish = (i: number) => at(runs[i], 50);
  const bufferRow = (label: string, band: Band, format: (n: number) => string, per: (g: PaceFinish, i: number) => number) => {
    const values = guided.map(per);
    const m = median(values);
    rows.push({ section: 'Buffer', label, target: bandText(band, format), median: m, values, pass: within(m, band), format });
  };
  bufferRow('Guided Y50 enrollment, share of natural', BUFFER.enrolledShare, pct, (g, i) => g.enrolled / (finish(i)?.enrolled ?? NaN));
  bufferRow('Guided Y50 prestige, share of natural', BUFFER.prestigeShare, pct, (g, i) => g.prestige / (finish(i)?.prestige ?? NaN));
  bufferRow('Guided Y50 rank', BUFFER.rank, num, (g) => g.rank);
  return rows;
}

// The scorecard as markdown: one table per section, then the tally.
export function scorecardText(rows: ScoreRow[], seeds: readonly number[]): string {
  const out: string[] = [];
  let section = '';
  for (const r of rows) {
    if (r.section !== section) {
      section = r.section;
      out.push('', `**${section}**`, '', `| | Target | Median | ${seeds.map((s) => `Seed ${s}`).join(' | ')} | |`, `|---|---|---|${seeds.map(() => '---').join('|')}|---|`);
    }
    out.push(`| ${r.label} | ${r.target} | ${r.format(r.median)} | ${r.values.map(r.format).join(' | ')} | ${r.pass ? '✓' : '✗'} |`);
  }
  const passed = rows.filter((r) => r.pass).length;
  out.push('', `**${passed} of ${rows.length} targets met.**`);
  return out.join('\n');
}
