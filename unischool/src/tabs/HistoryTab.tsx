import StandingsPanel from './StandingsPanel';
import type { Action } from '../state/actions';
import AlumniPanel from './AlumniPanel';
import type { GameState, YearSnapshot } from '../state/types';
import { MIN_SERIES_POINTS } from '../components/Sparkline';
import HelpHint from '../components/HelpHint';
import { HistoryChart } from '../components/HistoryChart';
import { moneyShort } from '../format';
import PromisesPanel from './PromisesPanel';
import { legacy } from '../state/legacy';
import { SEMICENTENNIAL_YEAR } from '../state/types';
import { LegacyAxes } from '../components/LegacyAxes';
import {
  prestigeBreakdown, researchStandingBreakdown, socialStandingBreakdown,
  type StandingBreakdown, type StandingInput, type StandingReading,
} from '../systems/prestige/prestigeSystem';

// Institutional History: the one screen that shows the decades. It reads
// s.history (state/history.ts) and live readings, and stores nothing of its
// own.

// Rows of the year-by-year table shown before it scrolls.
const TABLE_VISIBLE_ROWS = 12;

// ---------------------------------------------------------------------
// Standing: the headline numbers, explained. Every figure comes from
// prestigeSystem.ts's breakdown, the object its target function sums, so
// this panel cannot disagree with the tick; nothing here names a row.
//
// Each bar has two layers: pale is what the input's score reaches (weight
// x score), solid is what it is worth after its multiplier. The gap is what
// a shortfall (a small library, a small student body) is costing.
// ---------------------------------------------------------------------

// A penalty row (crowding) is drawn in the penalty colour as a subtraction.
// `grade`, when present, is what the input was worth at last summer's report
// card (prestigeSystem.ts's gradeYear), shown beside its worth now.
function StandingRow({ input, max, grade }: { input: StandingInput; max: number; grade?: number }) {
  const reach = input.weight * input.score;
  const worth = Math.abs(input.contribution);
  const sign = input.penalty ? '−' : '+';
  const pct = (v: number) => `${Math.max(0, Math.min(100, (v / max) * 100))}%`;
  return (
    <li className={`standing-row${input.penalty ? ' standing-penalty' : ''}`}>
      <div className="standing-row-head">
        <span className="standing-row-label">{input.label}</span>
        <span className="standing-row-figure">
          {grade !== undefined && (
            <span className="standing-row-grade" title="Graded last summer">{sign}{Math.abs(grade).toFixed(1)} → </span>
          )}
          {sign}{worth.toFixed(1)}<span className="standing-row-of"> of {input.weight}</span>
        </span>
      </div>
      <div className="standing-bar" aria-hidden="true">
        <div className="standing-bar-reach" style={{ width: pct(reach) }} />
        <div className="standing-bar-fill" style={{ width: pct(worth) }} />
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

// A reading is an input that does not count yet (prestigeSystem.ts's
// StandingReading): only the pale layer, at its proposed weight. A reading
// with no weight is a ratio and is shown as a percentage.
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

// The summer model, in a sentence: what the year is grading toward, how
// the step works, and last summer's card if there is one.
function summerNote(breakdown: StandingBreakdown, gap: number): string {
  const { riseRate, fallRate, reportCard } = breakdown.summer!;
  const grading = `This year is grading ${breakdown.target.toFixed(1)}; at the summer prestige closes `
    + `${Math.round(riseRate * 100)}% of a gap upward and ${Math.round(fallRate * 100)}% downward`
    + (Math.abs(gap) < 0.05 ? '.' : ` — ${gap > 0 ? '+' : '−'}${(Math.abs(gap) * (gap > 0 ? riseRate : fallRate)).toFixed(1)} if nothing changes.`);
  const last = reportCard
    ? ` Last summer graded ${reportCard.score.toFixed(0)} for year ${reportCard.year}: ${reportCard.before.toFixed(1)} → ${reportCard.after.toFixed(1)}.`
    : ' No summer has graded it yet.';
  return grading + last;
}

function Standing({ breakdown }: { breakdown: StandingBreakdown }) {
  // All bars share one scale, the largest weight in this standing, so terms
  // are comparable at a glance.
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
        {breakdown.summer
          ? summerNote(breakdown, gap)
          : Math.abs(gap) < 0.05
            ? 'Sitting at its target.'
            : `Drifting ${gap > 0 ? 'up' : 'down'} toward ${breakdown.target.toFixed(1)}, by `
              + `${(Math.abs(gap) * breakdown.driftRate).toFixed(3)} a week — about `
              + `${(Math.abs(gap) * breakdown.driftRate * 52).toFixed(1)} over a year if nothing changes.`}
        {' '}Everything starts from a baseline of {breakdown.baseline}.
      </p>
      <ul className="standing-rows">
        {breakdown.inputs.map((input) => (
          <StandingRow key={input.key} input={input} max={max} grade={breakdown.summer?.reportCard?.grades[input.key]} />
        ))}
      </ul>
      {breakdown.readings.length > 0 && (
        <>
          <p className="standing-note standing-readings-note">
            Read, not counted.
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
          text="Each standing is a stock. Academic standing is graded each summer and steps toward the grade — slowly up, quickly down — and trembles toward it between summers; the other two drift weekly. The pale part of a bar is what an input reaches on its own; the solid part is what it is worth after its multiplier. A red bar is a penalty."
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

// ---------------------------------------------------------------------
// The legacy: six graded axes and a name. Sealed onto s.self.legacy at the
// fiftieth summer; until then the same reading, taken live.
// ---------------------------------------------------------------------
function LegacyPanel({ s }: { s: GameState }) {
  const sealed = s.self.legacy;
  const record = sealed ?? legacy(s);
  return (
    <section className="panel">
      <div className="panel-head">
        <div className="panel-head-title">
          <h2>Legacy</h2>
          <span className="panel-count">{sealed ? `sealed in year ${sealed.year}` : `as it stands in year ${s.clock.year}`}</span>
        </div>
        <HelpHint
          align="end"
          text={`Six axes graded A to F from what the school has actually done, and a name from the pattern of grades. The record is sealed at the fiftieth summer's final report and nothing after it changes it; before then this is the reading as it stands today. Fifty years is the run; play continues past it.`}
        />
      </div>
      <p className="legacy-name">
        {sealed
          ? <>The record, sealed in the fiftieth year: <strong>{record.name}</strong>.</>
          : <>Today the school would be called <strong>{record.name}</strong>. {SEMICENTENNIAL_YEAR - s.clock.year > 0 ? `${SEMICENTENNIAL_YEAR - s.clock.year} year${SEMICENTENNIAL_YEAR - s.clock.year === 1 ? '' : 's'} to the final report.` : 'The final report is filed this summer.'}</>}
      </p>
      <LegacyAxes axes={record.axes} />
    </section>
  );
}

// "Year 23 of 50" within the fifty years; past them, the year the record was
// sealed (the clock keeps running, the record does not).
function yearOfFifty(s: GameState): string {
  if (s.clock.year <= SEMICENTENNIAL_YEAR) return `Year ${s.clock.year} of ${SEMICENTENNIAL_YEAR}`;
  return `Year ${s.clock.year} · the record sealed in year ${s.self.legacy?.year ?? SEMICENTENNIAL_YEAR}`;
}

function HistoryTable({ rows }: { rows: YearSnapshot[] }) {
  return (
    <div className="history-table-scroll" style={{ maxHeight: `${TABLE_VISIBLE_ROWS * 24 + 28}px` }}>
      <table className="history-table">
        <thead>
          <tr>
            <th>Year</th><th>Prestige</th><th>Rank</th><th>Enrolled</th>
            <th>Cash</th><th>Net</th><th>Applicants</th><th>Admit</th>
            <th>Courses</th><th>Programs</th><th>Satisf.</th><th>Left</th>
          </tr>
        </thead>
        <tbody>
          {/* Newest first: the years a player is actually asking about are
              the recent ones, while the charts above carry the long shape. */}
          {[...rows].reverse().map((h) => (
            <tr key={h.year}>
              <td>{h.year}</td>
              <td>{Math.round(h.prestige)}</td>
              <td>#{h.rank}</td>
              <td>{h.enrolled.toLocaleString()}</td>
              <td>{moneyShort(h.cash)}</td>
              {/* The year's own figures, as the summer's review beat reads
                  them: what the year did, not only what it was. */}
              <td className={h.net < 0 ? 'bad' : ''}>{h.net >= 0 ? '+' : ''}{moneyShort(h.net)}</td>
              <td>{h.applicants.toLocaleString()}</td>
              <td>{Math.round(h.admitRate * 100)}%</td>
              <td>{h.coursesDone}<span className="history-delta"> +{h.coursesFinished}</span></td>
              <td>{h.programsEstablished}</td>
              <td>{Math.round(h.satisfaction)}<span className="history-delta"> avg {Math.round(h.satisfactionAverage)}</span></td>
              <td className={h.attrition > 0 ? 'bad' : ''}>{h.attrition > 0 ? h.attrition.toLocaleString() : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function HistoryTab({ s, act }: { s: GameState; act: (a: Action) => void }) {
  const history = s.history;
  const totalCourses = s.tech.filter((t) => t.kind === 'course').length;

  if (history.length < MIN_SERIES_POINTS) {
    return (
      <div className="tab-content">
        {/* Standing needs no history, so a first-year school still sees it. */}
        <StandingPanel s={s} />
        <LegacyPanel s={s} />
        <PromisesPanel s={s} />
        <section className="panel">
          <div className="panel-head">
            <div className="panel-head-title">
              <h2>Institutional History</h2>
              <span className="panel-count">{yearOfFifty(s)}</span>
            </div>
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
      <LegacyPanel s={s} />
      <PromisesPanel s={s} />
      <section className="panel">
        <div className="panel-head">
          <div className="panel-head-title">
            <h2>Institutional History</h2>
            <span className="panel-count">{yearOfFifty(s)}</span>
          </div>
          <HelpHint align="end" text="One entry is filed each year, at the summer admissions decision. Everything here is the record of what the school actually was at each of those moments. The charts run to the fiftieth year, when the record is sealed." />
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
            span={SEMICENTENNIAL_YEAR}
            years={years}
            values={history.map((h) => h.prestige)}
            format={(v) => `${Math.round(v)}`}
            note="A slow-moving stock: it drifts a little each week toward a target set by curriculum breadth, selectivity, student quality, faculty and research."
          />
          <HistoryChart
            label="Enrollment"
            span={SEMICENTENNIAL_YEAR}
            years={years}
            values={history.map((h) => h.enrolled)}
            format={(v) => Math.round(v).toLocaleString()}
            note="The class each summer's funnel committed — fed by prestige, tuition and word of mouth. Beds scale the applicant pool, never a hard cap on enrollment."
          />
          <HistoryChart
            label="Operating funds"
            span={SEMICENTENNIAL_YEAR}
            years={years}
            values={history.map((h) => h.cash)}
            format={moneyShort}
            note="Cash on hand each summer. Troughs are the years the school committed to something expensive."
          />
          <HistoryChart
            label="Catalogue"
            span={SEMICENTENNIAL_YEAR}
            years={years}
            values={history.map((h) => h.coursesDone)}
            format={(v) => `${Math.round(v)} / ${totalCourses}`}
            note={`${latest.programsEstablished} program${latest.programsEstablished === 1 ? '' : 's'} established. Breadth is what lifts the prestige ceiling — the decades-long half of the climb.`}
          />
        </div>
      </section>

      <StandingsPanel s={s} />

      <AlumniPanel s={s} act={act} />

      <section className="panel">
        <h2>Year by Year</h2>
        <HistoryTable rows={history} />
      </section>
    </div>
  );
}
