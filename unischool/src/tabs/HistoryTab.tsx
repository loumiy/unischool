import type { GameState, YearSnapshot } from '../state/types';
import { linePoints, MIN_SERIES_POINTS } from '../components/Sparkline';
import HelpHint from '../components/HelpHint';

// ---------------------------------------------------------------------
// Institutional History: the long arc, made visible. Every other screen in
// the game is a "right now" reading — this is the only one that shows the
// decades. It reads s.history (see state/history.ts) and nothing else, and
// derives everything it displays; no state of its own, no numbers stored
// for its benefit.
//
// Plain SVG polylines, deliberately: no charting library, no new
// dependency, and the same parchment/gold visual language as every other
// panel. A chart here is a line, a baseline, and two end labels — anything
// more would be a different game's UI.
// ---------------------------------------------------------------------

// Chart geometry. The SVG scales to the width of its column while keeping
// this aspect ratio, so these are proportions, not pixels.
const CHART_WIDTH = 320;
const CHART_HEIGHT = 96;
const CHART_PAD_Y = 4; // vertical breathing room so peaks aren't clipped

// How many rows of the year-by-year table to show at once before it
// scrolls. A 50-year run would otherwise push the charts off the screen.
const TABLE_VISIBLE_ROWS = 12;

function formatMoney(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `${v < 0 ? '-' : ''}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${v < 0 ? '-' : ''}$${Math.round(abs / 1_000)}k`;
  return `${v < 0 ? '-' : ''}$${Math.round(abs)}`;
}

// One series over the years. `format` renders the y-axis end labels and the
// current-value caption, so each chart reports its own units (dollars,
// students, points) rather than the view guessing.
function HistoryChart({ label, years, values, format, note }: {
  label: string;
  years: number[];
  values: number[];
  format: (v: number) => string;
  note?: string;
}) {
  const points = linePoints(values, CHART_WIDTH, CHART_HEIGHT, CHART_PAD_Y);
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
        <span>Y{years[0]}</span>
        {/* A series that never moved reports one value, not "x – x". */}
        <span className="history-chart-range">{min === max ? format(min) : `${format(min)} – ${format(max)}`}</span>
        <span>Y{years[years.length - 1]}</span>
      </div>
      {note && <p className="history-chart-note">{note}</p>}
    </figure>
  );
}

function HistoryTable({ rows, showRank }: { rows: YearSnapshot[]; showRank: boolean }) {
  return (
    <div className="history-table-scroll" style={{ maxHeight: `${TABLE_VISIBLE_ROWS * 24 + 28}px` }}>
      <table className="history-table">
        <thead>
          <tr>
            <th>Year</th><th>Prestige</th><th>Rank</th><th>Enrolled</th>
            <th>Cash</th><th>Courses</th><th>Programs</th><th>Satisf.</th>
          </tr>
        </thead>
        <tbody>
          {/* Newest first: the years a player is actually asking about are
              the recent ones, while the charts above carry the long shape. */}
          {[...rows].reverse().map((h) => (
            <tr key={h.year}>
              <td>{h.year}</td>
              <td>{Math.round(h.prestige)}</td>
              {/* Standing is a mid-game reveal (see README's "Rankings"):
                  the record keeps every year's rank, but the view withholds
                  it until the reveal has fired, exactly like the header. */}
              <td>{showRank ? `#${h.rank}` : '—'}</td>
              <td>{h.enrolled.toLocaleString()}</td>
              <td>{formatMoney(h.cash)}</td>
              <td>{h.coursesDone}</td>
              <td>{h.programsEstablished}</td>
              <td>{Math.round(h.satisfaction)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function HistoryTab({ s }: { s: GameState }) {
  const history = s.history;
  const totalCourses = s.tech.filter((t) => t.kind === 'course').length;

  if (history.length < MIN_SERIES_POINTS) {
    return (
      <div className="tab-content">
        <section className="panel">
          <div className="panel-head">
            <h2>Institutional History</h2>
            <HelpHint align="end" text="One entry is filed each year, when the summer admissions decision resolves. Two years are needed before a trend can be drawn." />
          </div>
          <p className="empty-note">
            {history.length === 0
              ? 'No history yet. The first entry is filed at the end of this academic year, when admissions resolves.'
              : `One year on the books (Year ${history[0].year}). The charts open up once a second year is filed.`}
          </p>
        </section>
      </div>
    );
  }

  const years = history.map((h) => h.year);
  const latest = history[history.length - 1];
  const first = history[0];

  return (
    <div className="tab-content">
      <section className="panel">
        <div className="panel-head">
          <h2>Institutional History</h2>
          <HelpHint align="end" text="One entry is filed each year, at the summer admissions decision. Everything here is the record of what the school actually was at each of those moments." />
        </div>
        <p className="history-summary">
          {history.length} years on the books, Year {first.year} to Year {latest.year}: prestige{' '}
          {Math.round(first.prestige)} → {Math.round(latest.prestige)}, enrollment{' '}
          {first.enrolled.toLocaleString()} → {latest.enrolled.toLocaleString()}, catalogue{' '}
          {first.coursesDone} → {latest.coursesDone} of {totalCourses} courses.
        </p>

        <div className="history-charts">
          <HistoryChart
            label="Prestige"
            years={years}
            values={history.map((h) => h.prestige)}
            format={(v) => `${Math.round(v)}`}
            note="A slow-moving stock: it drifts a little each week toward a target set by curriculum breadth, selectivity, student quality, faculty and research."
          />
          <HistoryChart
            label="Enrollment"
            years={years}
            values={history.map((h) => h.enrolled)}
            format={(v) => Math.round(v).toLocaleString()}
            note="The class each summer's funnel committed — fed by prestige, tuition, scholarships and word of mouth. Beds scale the applicant pool, never a hard cap on enrollment."
          />
          <HistoryChart
            label="Operating funds"
            years={years}
            values={history.map((h) => h.cash)}
            format={formatMoney}
            note="Cash on hand each summer. Troughs are the years the school committed to something expensive."
          />
          <HistoryChart
            label="Catalogue"
            years={years}
            values={history.map((h) => h.coursesDone)}
            format={(v) => `${Math.round(v)} / ${totalCourses}`}
            note={`${latest.programsEstablished} program${latest.programsEstablished === 1 ? '' : 's'} established. Breadth is what lifts the prestige ceiling — the decades-long half of the climb.`}
          />
        </div>
      </section>

      <section className="panel">
        <h2>Year by Year</h2>
        <HistoryTable rows={history} showRank={s.hasEnteredRankings} />
      </section>
    </div>
  );
}
