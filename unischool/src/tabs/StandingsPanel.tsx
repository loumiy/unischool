import type { GameState } from '../state/types';
import HelpHint from '../components/HelpHint';
import { HistoryChart } from '../components/HistoryChart';
import { STANDINGS, rankedListBy } from '../systems/rivals/rivalsSystem';
import { SEMICENTENNIAL_YEAR } from '../state/types';
import { rivalRanks } from '../systems/rivals/collegeRival';
import { sportById } from '../data/studentLifeData';

// The league table (Plan 31, V1-22, V1-33): where the college stands on each
// of the six axes this year, who leads each, and each rank charted over the
// run. Lower is better; the charts are drawn upside down to read that way.

export default function StandingsPanel({ s }: { s: GameState }) {
  const field = s.rivals.length + 1;
  const rows = s.history.filter((h) => h.standings !== undefined);
  const rival = rivalRanks(s);
  const series = rival ? s.orgs.rivalries[rival.sport] : undefined;
  return (
    <section className="panel standings-panel">
      <div className="panel-head">
        <span className="panel-head-title">
          <h2>The Standings</h2>
          <HelpHint text="Six tables, one field. Academics is the ranking the rest of the game means by rank; the others say what the college is good at besides. Access reads the admit rate and how far the price sits under what the college's name could charge; financial strength the endowment per student." />
        </span>
        <span className="stat">of {field}</span>
      </div>
      <dl className="standings-table">
        {STANDINGS.map(({ axis, label }) => {
          const list = rankedListBy(s, axis);
          const rank = list.findIndex((e) => e.isPlayer) + 1;
          const leader = list[0];
          return (
            <div key={axis}>
              <dt>{label}</dt>
              <dd>
                <strong>#{rank}</strong>
                <span className="stat">{leader.isPlayer ? ' — the leader' : ` — led by ${leader.name}`}</span>
              </dd>
            </div>
          );
        })}
      </dl>
      {rival && (
        <p className="stat">
          The rival: {rival.rival.name} {rival.rival.mascot}, in {sportById(rival.sport)?.teamName ?? rival.sport} and in the rankings, #{rival.theirs} to the college&rsquo;s #{rival.mine}.
          {series && ` The series stands ${series.wins}–${series.losses}.`}
        </p>
      )}
      {rows.length > 1 && (
        <div className="standings-charts">
          {STANDINGS.map(({ axis, label }) => (
            <HistoryChart
              key={axis}
              label={label}
              span={SEMICENTENNIAL_YEAR}
              years={rows.map((h) => h.year)}
              values={rows.map((h) => -(h.standings![axis] ?? field))}
              format={(v) => `#${Math.round(-v)}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
