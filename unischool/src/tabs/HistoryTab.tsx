import StandingsPanel from './StandingsPanel';
import type { Action } from '../state/actions';
import AlumniPanel from './AlumniPanel';
import type { GameState, YearSnapshot } from '../state/types';
import { MIN_SERIES_POINTS } from '../components/Sparkline';
import HelpHint from '../components/HelpHint';
import { sectionAvailable } from '../components/TabNav';
import { sectionAnchor, useSectionTarget } from '../components/sectionTarget';
import { SECTION_HEADINGS } from '../data/statChips';
import { HistoryChart } from '../components/HistoryChart';
import { MultiChart } from '../components/MultiChart';
import { count, fraction, moneyShort, pct, prestigeFigure, satisfactionFigure } from '../format';
import { rankForecast } from '../systems/administration/forecast';
import PromisesPanel from './PromisesPanel';
import ChroniclePanel from './ChroniclePanel';
import { finalReport } from '../state/finalReport';
import { REPORT_DRAFT_FROM, REPORT_WORDS } from '../data/reportData';
import FinalReportView from '../components/FinalReportView';
import ReportCardActions from '../components/ReportCardActions';
import { hallEntryFor } from '../state/hall';
import { SEMICENTENNIAL_YEAR } from '../state/types';
import { prestigeBreakdown } from '../systems/prestige/prestigeSystem';
import { collegeSpecialization } from '../systems/prestige/milestone';
import { Standing, StandingFigure } from './StandingBreakdown';
import RankingsPanel from './RankingsPanel';
import { pillarShareRule, pillarWeightsWords } from '../data/prestigeWords';

// Institutional History: the one screen that shows the decades. It reads
// s.history (state/history.ts) and live readings, and stores nothing of its
// own.

// Rows of the year-by-year table shown before it scrolls.
const TABLE_VISIBLE_ROWS = 12;

// Prestige (Plans 80C, 85B): the Prestige chip's page, its breakdown and
// nothing else: the four pillars' blend, each pillar's make-up under its
// row.
function PrestigePanel({ s }: { s: GameState }) {
  const breakdown = prestigeBreakdown(s);
  const forecast = rankForecast(s);
  return (
    <section className="panel" {...sectionAnchor('history.prestige')}>
      <div className="panel-head">
        <div className="panel-head-title">
          <h2>{SECTION_HEADINGS['history.prestige']}</h2>
          <StandingFigure breakdown={breakdown} />
        </div>
        <HelpHint
          align="end"
          text={`Prestige is the college's overall standing, the number the guide ranks: the blend of four pillars, ${pillarWeightsWords()}, with the endowment added and neglect and crowding subtracted. It is graded each summer and steps toward the grade — slowly up, quickly down — and trembles toward it between summers. The pale part of a bar is what an input reaches on its own; the solid part is what it is worth after its multiplier. A bar whose figure reads − is a penalty, subtracted. Each pillar opens to show what it is made of, and each is ranked in the standings. ${pillarShareRule()} The college's specialization, once chosen, opens its own.`}
        />
      </div>
      <p className="stat specialization-status">{collegeSpecialization(s)}</p>
      {forecast && (
        <p className="stat rank-forecast">
          The Office of Institutional Research: graded today, the summer would leave the college at {prestigeFigure(forecast.prestige)},
          {' '}#{forecast.rank} in the guide{forecast.rank === forecast.now ? ', where it stands now' : ` (#${forecast.now} now)`}.
        </p>
      )}
      <Standing breakdown={breakdown} titled={false} />
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
          {/* The card once the report is written (Plan 70J). */}
          {written && report && <ReportCardActions entry={hallEntryFor(s, report)} />}
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
            <th>Courses</th><th>Programs</th><th>Satisfaction</th><th>Left</th>
          </tr>
        </thead>
        <tbody>
          {/* Newest first: the years a player is actually asking about are
              the recent ones, while the charts above carry the long shape. */}
          {[...rows].reverse().map((h) => (
            <tr key={h.year}>
              <td>{h.year}</td>
              <td>{prestigeFigure(h.prestige)}</td>
              <td>#{h.rank}</td>
              <td>{count(h.enrolled)}</td>
              <td>{moneyShort(h.cash)}</td>
              {/* The year's own figures, as the summer's review beat reads
                  them: what the year did, not only what it was. */}
              <td className={h.net < 0 ? 'bad' : ''}>{h.net >= 0 ? '+' : ''}{moneyShort(h.net)}</td>
              <td>{count(h.applicants)}</td>
              <td>{pct(h.admitRate)}</td>
              <td>{h.coursesDone}<span className="history-delta"> +{h.coursesFinished}</span></td>
              <td>{h.programsEstablished}</td>
              <td>{satisfactionFigure(h.satisfaction)}<span className="history-delta"> avg {satisfactionFigure(h.satisfactionAverage)}</span></td>
              <td className={h.attrition > 0 ? 'bad' : ''}>{h.attrition > 0 ? count(h.attrition) : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// `target`: a section to land on (the Prestige chip opens Prestige, the
// Rank chip the guide; Plans 78C and 80C).
export default function HistoryTab({ s, act, target, onTargetConsumed }: {
  s: GameState; act: (a: Action) => void; target?: string; onTargetConsumed?: () => void;
}) {
  const history = s.history;
  const totalCourses = s.tech.filter((t) => t.kind === 'course').length;
  useSectionTarget(target, onTargetConsumed);

  // Open from the first week for Prestige and the guide (Plans 78C and
  // 80C); the record of the years waits for the first commencement
  // (ladderData.ts's sections).
  if (!sectionAvailable(s, 'history.record')) {
    return (
      <div className="tab-content">
        <PrestigePanel s={s} />
        <RankingsPanel s={s} />
        <section className="panel">
          <h2>The record</h2>
          <p className="empty-note">
            The record of the years starts at the first commencement: the chronicle, the promises and the year-by-year charts are kept here from then on.
          </p>
        </section>
      </div>
    );
  }

  if (history.length < MIN_SERIES_POINTS) {
    return (
      <div className="tab-content">
        {/* Prestige and the guide need no history, so a first-year school
            still sees them. */}
        <PrestigePanel s={s} />
        <RankingsPanel s={s} />
        <FinalReportPanel s={s} />
        <PromisesPanel s={s} />
        <ChroniclePanel s={s} />
        <StandingsPanel s={s} />
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
      <PrestigePanel s={s} />
      <FinalReportPanel s={s} />
      <PromisesPanel s={s} />
      <ChroniclePanel s={s} />
      <section className="panel">
        <div className="panel-head">
          <div className="panel-head-title">
            <h2>Institutional history</h2>
            <span className="panel-count">{yearOfFifty(s)}</span>
          </div>
          <HelpHint align="end" text="One entry is filed each year, at the summer admissions decision. Everything here is the record of what the college actually was at each of those moments. The charts run to the fiftieth year, when the Final Report is written." />
        </div>
        <p className="history-summary">
          {history.length} years on the books, Year {first.year} to Year {latest.year}: prestige{' '}
          {prestigeFigure(first.prestige)} → {prestigeFigure(latest.prestige)}, enrollment{' '}
          {count(first.enrolled)} → {count(latest.enrolled)}, catalog{' '}
          {first.coursesDone} → {latest.coursesDone} of {totalCourses} courses.
        </p>

        <div className="history-charts">
          <HistoryChart
            label="Prestige"
            span={SEMICENTENNIAL_YEAR}
            years={years}
            values={history.map((h) => h.prestige)}
            format={prestigeFigure}
            note={`Slow to move: graded each summer and stepped toward the grade, with a little drift toward it between summers. The grade is the blend of four pillars, ${pillarWeightsWords()}, with the endowment added and neglect and crowding taken off.`}
          />
          <MultiChart
            title="Place in the guide, by year"
            invert
            yMin={1}
            yMax={s.rivals.length + 1}
            series={[{ name: 'Rank', points: history.map((h) => ({ x: h.year, y: h.rank })), format: (v) => `#${Math.round(v)}` }]}
            note={`Of ${s.rivals.length + 1} colleges, by prestige; #1 is the top.`}
          />
          <HistoryChart
            label="Enrolled"
            span={SEMICENTENNIAL_YEAR}
            years={years}
            values={history.map((h) => h.enrolled)}
            format={(v) => count(v)}
            note="The class each summer's funnel committed — fed by prestige, tuition and word of mouth. Beds scale the applicant pool, never a hard limit on enrollment."
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
            label="Catalog"
            span={SEMICENTENNIAL_YEAR}
            years={years}
            values={history.map((h) => h.coursesDone)}
            format={(v) => fraction(v, totalCourses)}
            note={`${latest.programsEstablished} program${latest.programsEstablished === 1 ? '' : 's'} established. Breadth counts toward prestige as one part of the academics pillar, Curriculum breadth.`}
          />
        </div>
      </section>

      <RankingsPanel s={s} />

      <StandingsPanel s={s} />

      <AlumniPanel s={s} act={act} />

      <section className="panel">
        <h2>Year by year</h2>
        <HistoryTable rows={history} />
      </section>
    </div>
  );
}
