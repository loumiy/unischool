import { linePoints } from './Sparkline';

// ---------------------------------------------------------------------
// One series over the years, as a plain SVG polyline — the chart the
// History tab draws four of (tabs/HistoryTab.tsx) and the final report
// draws again for the fifty-year curves (Plan 17's PR C). Lifted out of
// the tab so the two cannot drift: a chart here is a line, a baseline and
// two end labels, and anything more would be a different game's UI.
// ---------------------------------------------------------------------

// Chart geometry. The SVG scales to the width of its column while keeping
// this aspect ratio, so these are proportions, not pixels.
const CHART_WIDTH = 320;
const CHART_HEIGHT = 96;
const CHART_PAD_Y = 4; // vertical breathing room so peaks aren't clipped

export function formatMoney(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `${v < 0 ? '-' : ''}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${v < 0 ? '-' : ''}$${Math.round(abs / 1_000)}k`;
  return `${v < 0 ? '-' : ''}$${Math.round(abs)}`;
}

// One series over the years. `format` renders the y-axis end labels and the
// current-value caption, so each chart reports its own units (dollars,
// students, points) rather than the view guessing.
export function HistoryChart({ label, years, values, format, note, span }: {
  label: string;
  years: number[];
  values: number[];
  format: (v: number) => string;
  note?: string;
  // The last year the x-axis reaches (Plan 17's PR F). Given, the axis is
  // fixed from year 1 to this year whatever the series holds — the History
  // tab passes the fiftieth, so the curves have somewhere to go — and a run
  // that has played past it extends the axis to its own last year. Omitted,
  // the series spans the full width as it always did.
  span?: number;
}) {
  const last = years[years.length - 1];
  const end = span === undefined ? last : Math.max(span, last);
  const points = span === undefined
    ? linePoints(values, CHART_WIDTH, CHART_HEIGHT, CHART_PAD_Y)
    : linePoints(values, CHART_WIDTH, CHART_HEIGHT, CHART_PAD_Y, (i) => (years[i] - 1) / Math.max(1, end - 1));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const latest = values[values.length - 1];

  return (
    <figure className="history-chart">
      <figcaption>
        <span className="history-chart-label">{label}</span>
        <span className="history-chart-latest">{format(latest)}</span>
      </figcaption>
      <svg
        className="history-chart-svg"
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        role="img"
        aria-label={`${label}: ${format(min)} to ${format(max)} across years ${years[0]} to ${years[years.length - 1]}`}
      >
        {/* Baseline and ceiling rules, so a line has something to sit against. */}
        <line className="history-chart-rule" x1={0} y1={CHART_HEIGHT} x2={CHART_WIDTH} y2={CHART_HEIGHT} />
        <line className="history-chart-rule faint" x1={0} y1={0} x2={CHART_WIDTH} y2={0} />
        <polyline className="history-chart-line" points={points} />
      </svg>
      <div className="history-chart-axis">
        <span>Y{span === undefined ? years[0] : 1}</span>
        {/* A series that never moved reports one value, not "x – x". */}
        <span className="history-chart-range">{min === max ? format(min) : `${format(min)} – ${format(max)}`}</span>
        <span>Y{end}</span>
      </div>
      {note && <p className="history-chart-note">{note}</p>}
    </figure>
  );
}

