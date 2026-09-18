import type { GameState, YearSnapshot } from '../state/types';
import { linePoints, MIN_SERIES_POINTS } from '../components/Sparkline';
import HelpHint from '../components/HelpHint';
import {
  prestigeBreakdown, researchStandingBreakdown, socialStandingBreakdown,
  type StandingBreakdown, type StandingInput, type StandingReading,
} from '../systems/prestige/prestigeSystem';

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

// ---------------------------------------------------------------------
// STANDING: the headline number, explained.
//
// Every figure here is read off prestigeSystem.ts's own breakdown, which is
// the object its target function sums — so this panel cannot disagree with
// the tick that produced the number, and Plan 15 changing the inputs
// changes that file alone. Nothing below names a row: the rows are data,
// and this renders whatever the breakdown contains.
//
// THE BAR IS TWO LAYERS, and that is the whole reason a bar is here rather
// than a number. The pale layer is what the input's own score reaches —
// weight × score — and the solid one is what it is actually WORTH after its
// multiplier. The gap between them is what a short library or a small
// student body is costing the school, which is the single most-asked
// question about this model and the one no screen could answer.
// ---------------------------------------------------------------------

function StandingRow({ input, max }: { input: StandingInput; max: number }) {
  const reach = input.weight * input.score;
  const pct = (v: number) => `${Math.max(0, Math.min(100, (v / max) * 100))}%`;
  return (
    <li className="standing-row">
      <div className="standing-row-head">
        <span className="standing-row-label">{input.label}</span>
        <span className="standing-row-figure">
          +{input.contribution.toFixed(1)}<span className="standing-row-of"> of {input.weight}</span>
        </span>
      </div>
      <div className="standing-bar" aria-hidden="true">
        <div className="standing-bar-reach" style={{ width: pct(reach) }} />
        <div className="standing-bar-fill" style={{ width: pct(input.contribution) }} />
      </div>
      <p className="standing-detail">
        {input.detail}
        {input.multiplier && (
          <>
            {' '}
            <span className="standing-multiplier">
              × {input.multiplier.value.toFixed(2)} {input.multiplier.label} — {input.multiplier.detail}
            </span>
          </>
        )}
      </p>
    </li>
  );
}

// A READING is an input that does not count yet (see prestigeSystem.ts's
// StandingReading): the same label, bar and line of prose, with only the
// pale layer drawn — what it would reach at its proposed weight — and no
// solid one, because it is worth nothing today. Plan 15's PR A puts four of
// these on the academic standing so the year of play before PR B counts
// them is a year of reading them. A reading with no weight is a ratio, not
// a future input, and is shown as the figure it is.
function ReadingRow({ item, max }: { item: StandingReading; max: number }) {
  const pct = (v: number) => `${Math.max(0, Math.min(100, (v / max) * 100))}%`;
  return (
    <li className="standing-row standing-reading">
      <div className="standing-row-head">
        <span className="standing-row-label">{item.label}</span>
        <span className="standing-row-figure">
          {item.weight === undefined
            ? `${Math.round(item.score * 100)}%`
            : <>{item.penalty ? '−' : '+'}{item.reach.toFixed(1)}<span className="standing-row-of"> of {item.weight}, not yet counted</span></>}
        </span>
      </div>
      {item.weight !== undefined && (
        <div className="standing-bar" aria-hidden="true">
          <div className="standing-bar-reach" style={{ width: pct(item.reach) }} />
        </div>
      )}
      <p className="standing-detail">{item.detail}</p>
    </li>
  );
}

function Standing({ breakdown }: { breakdown: StandingBreakdown }) {
  // Every bar is drawn against the SAME scale — the largest weight in this
  // standing — so a 90-weight term and a 12-weight one are comparable at a
  // glance instead of each filling its own box.
  const max = Math.max(...breakdown.inputs.map((i) => i.weight));
  const gap = breakdown.target - breakdown.current;
  return (
    <div className="standing">
      <div className="standing-head">
        <h3>{breakdown.label}</h3>
        <span className="standing-figure">
          {breakdown.current.toFixed(1)}
          <span className="standing-arrow"> → </span>
          {breakdown.target.toFixed(1)}
        </span>
      </div>
      <p className="standing-note">
        {Math.abs(gap) < 0.05
          ? 'Sitting at its target.'
          : `Drifting ${gap > 0 ? 'up' : 'down'} toward ${breakdown.target.toFixed(1)}, by `
            + `${(Math.abs(gap) * breakdown.driftRate).toFixed(3)} a week — about `
            + `${(Math.abs(gap) * breakdown.driftRate * 52).toFixed(1)} over a year if nothing changes.`}
        {' '}Everything starts from a baseline of {breakdown.baseline}.
      </p>
      <ul className="standing-rows">
        {breakdown.inputs.map((input) => (
          <StandingRow key={input.key} input={input} max={max} />
        ))}
      </ul>
      {breakdown.readings.length > 0 && (
        <>
          <p className="standing-note standing-readings-note">
            Read, not yet counted. What each would be worth at the weight Plan 15 proposes.
          </p>
          <ul className="standing-rows">
            {breakdown.readings.map((item) => (
              <ReadingRow key={item.key} item={item} max={max} />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function StandingPanel({ s }: { s: GameState }) {
  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Standing</h2>
        <HelpHint
          align="end"
          text="Each standing is a stock that drifts each week toward a target computed from these inputs. The pale part of a bar is what an input reaches on its own; the solid part is what it is worth after its multiplier."
        />
      </div>
      <div className="standings">
        <Standing breakdown={prestigeBreakdown(s)} />
        <Standing breakdown={researchStandingBreakdown(s)} />
        <Standing breakdown={socialStandingBreakdown(s)} />
      </div>
    </section>
  );
}

function HistoryTable({ rows }: { rows: YearSnapshot[] }) {
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
              {/* No longer withheld until the top-50 reveal fires. The
                  record always kept every year's rank; the view hid it
                  because a 56-school field made an unranked school's only
                  possible answer "last". See components/StatusHeader.tsx
                  for the same change and the reason the reveal itself is
                  unaffected. */}
              <td>#{h.rank}</td>
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
        {/* Standing needs no history at all — it is a reading of right now —
            so it is here as well as below, and a school in its first year
            has something on this tab besides an apology. */}
        <StandingPanel s={s} />
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
      <StandingPanel s={s} />
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
            note="The class each summer's funnel committed — fed by prestige, tuition and word of mouth. Beds scale the applicant pool, never a hard cap on enrollment."
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
        <HistoryTable rows={history} />
      </section>
    </div>
  );
}
