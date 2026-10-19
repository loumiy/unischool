import { useEffect, useMemo, useRef, useState } from 'react';
import type { GameState } from '../state/types';
import { WEEKS_PER_YEAR } from '../state/types';
import { curriculumAt, radialDrawing } from '../systems/techtree/radialLayout';
import RadialSvg from './RadialSvg';
import HelpHint from './HelpHint';
import { count } from '../format';

// ---------------------------------------------------------------------
// THE CURRICULUM, YEAR BY YEAR (Plan 105F): the Curriculum tab's drawing as
// it stood at the end of any year of the run, from the founding to now,
// with a Play that grows it a year at a time. The owner put it in the
// History tab's record and the Final Report (decision 2): the Curriculum
// tab is for what to write next, this is the record of what was. It reads
// each course's completedWeek (Plan 105E).
// ---------------------------------------------------------------------

const STEP_MS = 450;

export default function CurriculumReplay({ s, lastYear, compact = false }: {
  s: GameState;
  // The last year it runs to: the present, or the Final Report's year.
  lastYear?: number;
  compact?: boolean;
}) {
  const end = Math.max(1, Math.min(lastYear ?? s.clock.year, s.clock.year));
  const [year, setYear] = useState(end);
  const [playing, setPlaying] = useState(false);
  const timer = useRef<number | null>(null);

  const stop = () => {
    if (timer.current !== null) window.clearInterval(timer.current);
    timer.current = null;
    setPlaying(false);
  };
  useEffect(() => () => { if (timer.current !== null) window.clearInterval(timer.current); }, []);

  const play = () => {
    if (playing) { stop(); return; }
    setYear(1);
    setPlaying(true);
    timer.current = window.setInterval(() => {
      setYear((y) => {
        if (y + 1 >= end) { stop(); return end; }
        return y + 1;
      });
    }, STEP_MS);
  };

  const drawing = useMemo(() => radialDrawing(curriculumAt(s, year * WEEKS_PER_YEAR)), [s, year]);
  const lookup = useMemo(() => new Map(s.tech.map((t) => [t.id, t])), [s.tech]);
  const taught = [...drawing.programs.values()].reduce((n, p) => n + p.done, 0);

  return (
    <section className={`panel curriculum-replay${compact ? ' compact' : ''}`}>
      <div className="panel-head">
        <div className="panel-head-title">
          <h2>The curriculum, year by year</h2>
        </div>
        <HelpHint
          align="end"
          text="The curriculum as it stood at the end of each year: every course taught by then, from the entry courses at the centre to the capstones at the rim, in the Curriculum tab's drawing. Play runs it from the founding."
        />
      </div>
      <div className="curriculum-replay-controls">
        <button type="button" className={playing ? 'on' : undefined} aria-pressed={playing} onClick={play}>
          {playing ? 'Pause' : 'Play from Year 1'}
        </button>
        <label className="curriculum-replay-year">
          <span>Year</span>
          <input
            type="range"
            min={1}
            max={end}
            step={1}
            value={year}
            onChange={(e) => { stop(); setYear(Number(e.target.value)); }}
            aria-valuetext={`Year ${year}`}
          />
          <span className="curriculum-replay-figure">Year {year}</span>
        </label>
        <span className="curriculum-replay-note">{taught === 0 ? 'Nothing taught yet.' : `${count(taught)} courses taught`}</span>
      </div>
      <div className="curriculum-replay-square">
        <RadialSvg drawing={drawing} lookup={lookup} zoom={null} caption="taught" />
      </div>
    </section>
  );
}
