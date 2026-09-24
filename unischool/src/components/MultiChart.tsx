import { useId } from 'react';

// ---------------------------------------------------------------------
// Several series over the years on one set of axes (Plan 34, v2's
// HistoryChart): rank in History, money in the Treasury, the classes in
// Students, the six standings in the Final Report. Each series is named
// and its last value printed at its end; ranks draw with one at the top;
// the figure carries a text alternative. Colours are tokens, so the
// colour-vision-safe set reads it, and lines past the third are dashed so
// none is told apart by colour alone.
// ---------------------------------------------------------------------

export interface Series {
  name: string;
  points: { x: number; y: number }[];
  // A token, e.g. 'var(--ink)'; defaults by position.
  colour?: string;
  format?: (y: number) => string;
}

const W = 520;
const H = 150;
const PAD = { top: 12, right: 64, bottom: 22, left: 40 };
// The end labels: about this wide a character at 10px, and never closer
// together than a line.
const CHAR_W = 6.6;
const LABEL_GAP = 11;
const COLOURS = [
  'var(--school-primary)',
  'var(--ink)',
  'var(--ok-on-light)',
  'var(--bad-on-light)',
  'var(--warn-on-light)',
  'var(--ink-muted)',
];
const DASHES = [undefined, undefined, undefined, '6 3', '2 3', '8 3 2 3'];

const fmt = (s: Series, y: number) => (s.format ? s.format(y) : String(Math.round(y)));
const lastOf = (s: Series) => s.points[s.points.length - 1];

// End labels spread so no two share a line: sorted by where their lines
// end, each pushed below the one above it if they would touch. Returns
// each series' label y by its index.
export function spreadLabels(ends: number[], gap = LABEL_GAP): number[] {
  const out: number[] = Array.from({ length: ends.length }, () => 0);
  let floor = -Infinity;
  for (const e of ends.map((y, i) => ({ y, i })).sort((a, b) => a.y - b.y)) {
    const y = Math.max(e.y, floor + gap);
    out[e.i] = y;
    floor = y;
  }
  return out;
}

// The chart's scales. `invert` puts the low value at the top (a rank).
export function chartScales(series: Series[], opts: { invert?: boolean; yMin?: number; yMax?: number } = {}) {
  const all = series.flatMap((s) => s.points);
  const xs = all.map((p) => p.x);
  const ys = all.map((p) => p.y);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const lo = opts.yMin ?? Math.min(...ys);
  const hi = opts.yMax ?? Math.max(...ys);
  const span = hi - lo || 1;
  // Room on the right for the longest end label, so none runs off the edge.
  const right = Math.max(
    PAD.right,
    ...series.filter((s) => s.points.length).map((s) => `${s.name} ${fmt(s, lastOf(s).y)}`.length * CHAR_W + 10),
  );
  const sx = (x: number) => PAD.left + ((x - x0) / (x1 - x0 || 1)) * (W - PAD.left - right);
  const sy = (y: number) => {
    const t = (y - lo) / span;
    return PAD.top + (opts.invert ? t : 1 - t) * (H - PAD.top - PAD.bottom);
  };
  return { x0, x1, lo, hi, right, sx, sy };
}

export function MultiChart({ title, series, invert = false, yMin, yMax, xLabel = 'Year', note }: {
  title: string;
  series: Series[];
  invert?: boolean;
  yMin?: number;
  yMax?: number;
  xLabel?: string;
  note?: string;
}) {
  const id = useId();
  const drawn = series.filter((s) => s.points.length > 0);
  if (drawn.flatMap((s) => s.points).length < 2) return null;
  const { x0, x1, lo, hi, right, sx, sy } = chartScales(drawn, { invert, yMin, yMax });
  const top = invert ? lo : hi;
  const bottom = invert ? hi : lo;
  const summary = drawn
    .map((s) => `${s.name}: ${fmt(s, s.points[0].y)} in ${s.points[0].x}, ${fmt(s, lastOf(s).y)} in ${lastOf(s).x}`)
    .join('; ');
  const labelY = spreadLabels(drawn.map((s) => sy(lastOf(s).y)));
  return (
    <figure className="multi-chart">
      <figcaption id={`${id}-t`}>{title}</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby={`${id}-t ${id}-d`} preserveAspectRatio="xMidYMid meet">
        <desc id={`${id}-d`}>{summary}</desc>
        <line className="chart-axis" x1={PAD.left} y1={H - PAD.bottom} x2={W - right} y2={H - PAD.bottom} />
        <line className="chart-axis" x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={H - PAD.bottom} />
        <text className="chart-tick" x={PAD.left - 4} y={sy(top) + 4} textAnchor="end">{fmt(drawn[0], top)}</text>
        <text className="chart-tick" x={PAD.left - 4} y={sy(bottom) + 4} textAnchor="end">{fmt(drawn[0], bottom)}</text>
        <text className="chart-tick" x={PAD.left} y={H - 6}>{xLabel} {x0}</text>
        <text className="chart-tick" x={W - right} y={H - 6} textAnchor="end">{x1}</text>
        {drawn.map((s, i) => {
          const colour = s.colour ?? COLOURS[i % COLOURS.length];
          const d = s.points.map((p, k) => `${k ? 'L' : 'M'}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join('');
          const last = lastOf(s);
          return (
            <g key={s.name}>
              <path className="chart-line" d={d} stroke={colour} strokeDasharray={DASHES[i % DASHES.length]} />
              <text className="chart-end" x={sx(last.x) + 5} y={labelY[i] + 4} fill={colour}>
                {s.name} {fmt(s, last.y)}
              </text>
            </g>
          );
        })}
      </svg>
      {note && <p className="history-chart-note">{note}</p>}
    </figure>
  );
}
