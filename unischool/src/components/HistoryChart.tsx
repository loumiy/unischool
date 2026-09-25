import { linePoints } from './Sparkline';

// ---------------------------------------------------------------------
// One series over the years as a plain SVG polyline, shared by the History
// tab and the final report so the two can't drift.
// ---------------------------------------------------------------------

// Proportions, not pixels: the SVG scales to its column at this aspect.
const CHART_WIDTH = 320;
const CHART_HEIGHT = 96;
const CHART_PAD_Y = 4; // vertical breathing room so peaks aren't clipped

// `format` renders the end labels and the current-value caption in the
// series' own units.
export function HistoryChart({ label, years, values, format, note, span, bare = false }: {
  label: string;
  // Without the caption, when the card around it already names the axis and
  // its latest value (StandingsPanel.tsx).
  bare?: boolean;
  years: number[];
  values: number[];
  format: (v: number) => string;
  note?: string;
  // The last year the x-axis reaches. Given, the axis runs from year 1 to
  // this (or the series' last year, if later); omitted, the series spans
  // the full width.
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
      {!bare && (
        <figcaption>
          <span className="history-chart-label">{label}</span>
          <span className="history-chart-latest">{format(latest)}</span>
        </figcaption>
      )}
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

