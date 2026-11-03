import { useEffect, useRef, useState } from 'react';
import type { GameState } from '../state/types';
import type { FinalReport } from '../state/finalReport';
import { founderFigures } from '../state/finalReport';
import { REPORT_WORDS } from '../data/reportData';
import { STANDINGS } from '../systems/rivals/rivalsSystem';
import { MultiChart } from './MultiChart';
import HelpHint from './HelpHint';
import GradeMark from './GradeMark';
import AnimatedNumber from './AnimatedNumber';
import { audio } from './audio/engine';
import { reducedMotion } from '../settings';
import { count } from '../format';

// The Final Report (Plan 33, state/finalReport.ts), as the fiftieth summer
// shows it and the History tab keeps it: the title and the mark, the
// guide's last word, six of the seven standings graded over the arc (all
// but prestige, which the last word reads), the money, the
// eras, the founder's figures, and all seven charted.
//
// Staged (Plan 124 M3), where the fiftieth summer files it: the page opens
// over the campus, the six grades stamp in one by one with a tick each,
// "Students taught" counts up beneath them, and the final grade lands last
// with the fanfare (which the 50th summer's resolve no longer plays,
// audio/director.ts). Reduced motion shows the end state at once, with the
// fanfare. The History tab's copy is never staged.

// The page settles before the first stamp; then one every STAMP_GAP_MS.
export const STAMP_DELAY_MS = 800;
export const STAMP_GAP_MS = 450;

// How many marks are down: 0 to the axes' count, then one more for the
// final grade.
function useStamps(staged: boolean, axes: number): number {
  const end = axes + 1;
  const [down, setDown] = useState(() => (staged && !reducedMotion() ? 0 : end));
  const heard = useRef(false);
  useEffect(() => {
    if (!staged) return;
    if (down >= end) {
      // The fanfare once, on the final grade (or at once, reduced).
      if (!heard.current) { heard.current = true; audio.play('fanfare'); }
      return;
    }
    const t = setTimeout(() => {
      setDown(down + 1);
      if (down + 1 < end) audio.play('tick');
    }, down === 0 ? STAMP_DELAY_MS : STAMP_GAP_MS);
    return () => clearTimeout(t);
  }, [staged, down, end]);
  return down;
}

const fill = (t: string, vars: Record<string, string | number>) => t.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));

// "a, b and c".
function listWords(items: string[]): string {
  return items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

export default function FinalReportView({ s, report, staged = false }: { s: GameState; report: FinalReport; staged?: boolean }) {
  // As the report stood when written: play past the fiftieth summer grows
  // neither the figures nor the chart.
  const figures = report.figures ?? founderFigures(s);
  const rows = s.history.filter((h) => h.standingValues !== undefined && h.year <= report.year);
  const down = useStamps(staged, report.axes.length);
  const stamped = (i: number) => down > i;
  const finalDown = down > report.axes.length;
  return (
    <div className="final-report">
      <h3 className="final-report-title">{report.title}</h3>
      <div className="final-report-mark">
        <span className={`final-report-stamp${staged ? ' staged' : ''}${finalDown ? ' down final' : ''}`}>
          {finalDown && <GradeMark grade={report.mark} size="lg" />}
        </span>
        <span>{REPORT_WORDS.mark} · {report.markScore.toFixed(0)}</span>
        <HelpHint align="start" text={REPORT_WORDS.markHint} />
      </div>
      <p className="final-report-last-word">{fill(REPORT_WORDS.rank, { rank: report.rank, total: report.total })}</p>

      <h4>{REPORT_WORDS.axes}</h4>
      <p className="final-report-axes-note">{REPORT_WORDS.axesNote}</p>
      <ul className="final-report-axes">
        {report.axes.map((a, i) => (
          <li key={a.axis}>
            <span className={`final-report-stamp${staged ? ' staged' : ''}${stamped(i) ? ' down' : ''}`}>
              {stamped(i) && <GradeMark grade={a.grade} size="lg" />}
            </span>
            <span className="final-report-axis-label">{a.label}</span>
            <span className="final-report-axis-line">{fill(REPORT_WORDS.axisLine, { mean: a.mean.toFixed(0), first: a.first.toFixed(0), last: a.last.toFixed(0) })}</span>
          </li>
        ))}
      </ul>

      <h4>{REPORT_WORDS.finances}</h4>
      <p>{report.finances.join(' ')}</p>

      {report.offices && (
        <>
          <h4>{REPORT_WORDS.administration}</h4>
          <p>
            {report.offices.length === 0
              ? REPORT_WORDS.administrationNone
              : fill(REPORT_WORDS.administrationLine, { offices: listWords(report.offices) })}
          </p>
        </>
      )}

      <h4>{REPORT_WORDS.chronicle}</h4>
      <p>{report.eras.join(' · ')}</p>

      <dl className="admissions-outcomes final-report-figures">
        {/* Counts up while the grades stamp in. */}
        <div><dt>Students taught</dt><dd><AnimatedNumber value={down > 0 ? figures.studentsTaught : 0} durationMs={STAMP_GAP_MS * report.axes.length} /></dd></div>
        <div><dt>Faculty who served</dt><dd>{count(figures.facultyServed)}</dd></div>
        <div><dt>Prizes</dt><dd>{count(figures.prizes)}</dd></div>
        <div><dt>National titles</dt><dd>{count(figures.titles)}</dd></div>
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
