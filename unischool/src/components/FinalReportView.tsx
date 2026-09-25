import type { GameState } from '../state/types';
import type { FinalReport } from '../state/finalReport';
import { founderFigures } from '../state/finalReport';
import { REPORT_WORDS } from '../data/reportData';
import { STANDINGS } from '../systems/rivals/rivalsSystem';
import { MultiChart } from './MultiChart';
import HelpHint from './HelpHint';

// The Final Report (Plan 33, state/finalReport.ts), as the fiftieth summer
// shows it and the History tab keeps it: the title and the mark, the six
// standings graded over the arc, the promises, the money, the eras, the
// guide's last word, the founder's figures, and the six standings charted.

const fill = (t: string, vars: Record<string, string | number>) => t.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));

export default function FinalReportView({ s, report }: { s: GameState; report: FinalReport }) {
  // As the report stood when written: play past the fiftieth summer grows
  // neither the figures nor the chart.
  const figures = report.figures ?? founderFigures(s);
  const rows = s.history.filter((h) => h.standingValues !== undefined && h.year <= report.year);
  return (
    <div className="final-report">
      <h3 className="final-report-title">{report.title}</h3>
      <div className="final-report-mark">
        <span className={`grade-chip lg grade-${report.mark.toLowerCase()}`}>{report.mark}</span>
        <span>{REPORT_WORDS.mark} · {report.markScore.toFixed(0)}</span>
        <HelpHint align="start" text={REPORT_WORDS.markHint} />
      </div>
      <p className="final-report-last-word">{fill(REPORT_WORDS.rank, { rank: report.rank, total: report.total })}</p>

      <h4>{REPORT_WORDS.axes}</h4>
      <ul className="final-report-axes">
        {report.axes.map((a) => (
          <li key={a.axis}>
            <span className={`grade-chip lg grade-${a.grade.toLowerCase()}`}>{a.grade}</span>
            <span className="final-report-axis-label">{a.label}</span>
            <span className="final-report-axis-line">{fill(REPORT_WORDS.axisLine, { mean: a.mean.toFixed(0), first: a.first.toFixed(0), last: a.last.toFixed(0) })}</span>
          </li>
        ))}
      </ul>

      <h4>{REPORT_WORDS.promises}</h4>
      <p>
        {report.kept.length + report.missed.length + report.declined === 0
          ? REPORT_WORDS.promisesNone
          : fill(REPORT_WORDS.promisesLine, { kept: report.kept.length, missed: report.missed.length, declined: report.declined })}
        {report.kept.length > 0 && ` Kept: ${report.kept.join('; ')}.`}
        {report.missed.length > 0 && ` Missed: ${report.missed.join('; ')}.`}
      </p>

      <h4>{REPORT_WORDS.finances}</h4>
      <p>{report.finances.join(' ')}</p>

      <h4>{REPORT_WORDS.chronicle}</h4>
      <p>{report.eras.join(' · ')}</p>

      <dl className="admissions-outcomes final-report-figures">
        <div><dt>Students taught</dt><dd>{figures.studentsTaught.toLocaleString()}</dd></div>
        <div><dt>Faculty who served</dt><dd>{figures.facultyServed.toLocaleString()}</dd></div>
        <div><dt>Prizes</dt><dd>{figures.prizes.toLocaleString()}</dd></div>
        <div><dt>National titles</dt><dd>{figures.titles.toLocaleString()}</dd></div>
      </dl>

      {rows.length >= 2 && (
        <MultiChart
          title={REPORT_WORDS.chart}
          yMin={0}
          yMax={100}
          series={STANDINGS.map(({ axis, label }) => ({
            name: label,
            points: rows.map((h) => ({ x: h.year, y: (h.standingValues![axis] ?? 0) / 1.5 })),
          }))}
        />
      )}
    </div>
  );
}
