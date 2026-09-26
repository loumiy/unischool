import StandingsPanel from './StandingsPanel';
import type { Action } from '../state/actions';
import AlumniPanel from './AlumniPanel';
import type { GameState, YearSnapshot } from '../state/types';
import { MIN_SERIES_POINTS } from '../components/Sparkline';
import HelpHint from '../components/HelpHint';
import { HistoryChart } from '../components/HistoryChart';
import { MultiChart } from '../components/MultiChart';
import { moneyShort } from '../format';
import PromisesPanel from './PromisesPanel';
import ChroniclePanel from './ChroniclePanel';
import { finalReport } from '../state/finalReport';
import { REPORT_DRAFT_FROM, REPORT_WORDS } from '../data/reportData';
import FinalReportView from '../components/FinalReportView';
import { SEMICENTENNIAL_YEAR } from '../state/types';
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

// A penalty row (crowding) is drawn in the penalty color as a subtraction.
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
  const { riseRate, maxRise, fallRate, reportCard } = breakdown.summer!;
  const step = gap > 0 ? Math.min(gap * riseRate, maxRise) : Math.abs(gap) * fallRate;
  const grading = `This year is grading ${breakdown.target.toFixed(1)}; at the summer, prestige closes `
    + `${Math.round(riseRate * 100)}% of a gap upward (at most ${maxRise} points) and ${Math.round(fallRate * 100)}% downward`
    + (Math.abs(gap) < 0.05 ? '.' : ` — ${gap > 0 ? '+' : '−'}${step.toFixed(1)} if nothing changes.`);
  const last = reportCard
    ? ` Last summer graded ${reportCard.score.toFixed(0)} for Year ${reportCard.year}: ${reportCard.before.toFixed(1)} → ${reportCard.after.toFixed(1)}.`
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
      {breakdown.ceiling && (
        <p className={`standing-note standing-ceiling${breakdown.ceiling.value <= breakdown.target + 0.05 ? ' binding' : ''}`}>
          <strong>{breakdown.ceiling.label}:</strong> {breakdown.ceiling.detail}
          {breakdown.ceiling.value <= breakdown.target + 0.05 && ' It is holding the target down now.'}
        </p>
      )}
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
          text="Each standing is a stock. Academic standing is graded each summer and steps toward the grade — slowly up, quickly down — and trembles toward it between summers; the other two drift weekly. The pale part of a bar is what an input reaches on its own; the solid part is what it is worth after its multiplier. A bar whose figure reads − is a penalty, subtracted."
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
// The Final Report (Plan 33): written at the fiftieth summer and kept for
// good; until then the arc so far, in draft. The Epilogue's addenda follow.
// ---------------------------------------------------------------------
function FinalReportPanel({ s }: { s: GameState }) {
  const written = s.ending?.report;
  const report = written ?? (s.clock.year < REPORT_DRAFT_FROM ? null : finalReport(s));
  const left = SEMICENTENNIAL_YEAR - s.clock.year;
  return (
    <section className="panel">
      <div className="panel-head">
        <div className="panel-head-title">
          <h2>{REPORT_WORDS.title}</h2>
          <span className="panel-count">{written ? `written in Year ${written.year}` : `the arc to Year ${s.clock.year}`}</span>
        </div>
      </div>
      {!written && s.clock.year < REPORT_DRAFT_FROM ? (
        <p className="review-empty">{REPORT_WORDS.notYet}</p>
      ) : (
        <>
          {!written && (
            <p className="review-empty">
              {REPORT_WORDS.draft} {left > 0 ? `${left} year${left === 1 ? '' : 's'} to go.` : 'It is written this summer.'}
            </p>
          )}
          {report && <FinalReportView s={s} report={report} />}
        </>
      )}
      {(s.ending?.addenda ?? []).map((a) => (
        <div key={a.from} className="final-report-addendum">
          <h4>{REPORT_WORDS.addendum.replace('{from}', String(a.from)).replace('{to}', String(a.to))}</h4>
          <p>{a.lines.join(' ')}</p>
        </div>
      ))}
    </section>
  );
}

// "Year 23 of 50" within the fifty years; past them, the Epilogue.
function yearOfFifty(s: GameState): string {
  if (s.clock.year <= SEMICENTENNIAL_YEAR) return `Year ${s.clock.year} of ${SEMICENTENNIAL_YEAR}`;
  return `Year ${s.clock.year} · the Epilogue`;
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
        <FinalReportPanel s={s} />
        <PromisesPanel s={s} />
        <ChroniclePanel s={s} />
        <section className="panel">
          <div className="panel-head">
            <div className="panel-head-title">
              <h2>Institutional history</h2>
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
      <FinalReportPanel s={s} />
      <PromisesPanel s={s} />
      <ChroniclePanel s={s} />
      <section className="panel">
        <div className="panel-head">
          <div className="panel-head-title">
            <h2>Institutional history</h2>
            <span className="panel-count">{yearOfFifty(s)}</span>
          </div>
          <HelpHint align="end" text="One entry is filed each year, at the summer admissions decision. Everything here is the record of what the college actually was at each of those moments. The charts run to the fiftieth year, when the record is sealed." />
        </div>
        <p className="history-summary">
          {history.length} years on the books, Year {first.year} to Year {latest.year}: prestige{' '}
          {Math.round(first.prestige)} → {Math.round(latest.prestige)}, enrollment{' '}
          {first.enrolled.toLocaleString()} → {latest.enrolled.toLocaleString()}, catalog{' '}
          {first.coursesDone} → {latest.coursesDone} of {totalCourses} courses.
        </p>

        <div className="history-charts">
          <HistoryChart
            label="Prestige"
            span={SEMICENTENNIAL_YEAR}
            years={years}
            values={history.map((h) => h.prestige)}
            format={(v) => `${Math.round(v)}`}
            note="A slow-moving stock: graded each summer and stepped toward the grade, with a little drift toward it between summers. The grade reads the curriculum, the teaching, the students, research, satisfaction, campus life, the estate and the endowment."
          />
          <MultiChart
            title="Place in the guide, by year"
            invert
            yMin={1}
            yMax={s.rivals.length + 1}
            series={[{ name: 'Rank', points: history.map((h) => ({ x: h.year, y: h.rank })), format: (v) => `#${Math.round(v)}` }]}
            note={`Of ${s.rivals.length + 1} colleges, on the academic table the rest of the game means by rank. One is the top of the chart.`}
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
            note="Cash on hand each summer. Troughs are the years the college committed to something expensive."
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
        <h2>Year by year</h2>
        <HistoryTable rows={history} />
      </section>
    </div>
  );
}
