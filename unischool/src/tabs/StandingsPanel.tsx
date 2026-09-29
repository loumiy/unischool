import type { GameState } from '../state/types';
import HelpHint from '../components/HelpHint';
import { HistoryChart } from '../components/HistoryChart';
import { STANDINGS, rankedListBy } from '../systems/rivals/rivalsSystem';
import { SEMICENTENNIAL_YEAR } from '../state/types';
import { rivalRanks } from '../systems/rivals/collegeRival';
import { sportById } from '../data/studentLifeData';
import { researchStandingBreakdown, socialStandingBreakdown } from '../systems/prestige/prestigeSystem';
import { Standing } from './StandingBreakdown';

// The league table (Plan 31, V1-22, V1-33): where the college stands on each
// of the six axes this year, who leads each, and each rank charted over the
// run. Lower is better; the charts are drawn upside down to read that way.
// Under the cards, what the research and campus life rankings read (Plan
// 80C moved them here from the Prestige panel: neither feeds prestige).

export default function StandingsPanel({ s }: { s: GameState }) {
  const field = s.rivals.length + 1;
  const rows = s.history.filter((h) => h.standings !== undefined);
  const rival = rivalRanks(s);
  const series = rival ? s.orgs.rivalries[rival.sport] : undefined;
  return (
    <section className="panel standings-panel">
      <div className="panel-head">
        <span className="panel-head-title">
          <h2>The standings</h2>
          <HelpHint text="Six rankings, one field. Academics is the ranking the guide leads with, and the one Rank shows; the others say what the college is good at besides. Access reads the admit rate and how far the price sits under what the college's prestige could charge; financial strength the endowment per student." />
        </span>
        <span className="stat">of {field}</span>
      </div>
      {/* One card per axis (Plan 60): the rank, who leads, and the rank over
          the run beneath, instead of a label table and a separate chart grid
          that drifted apart. */}
      <div className="standings-cards">
        {STANDINGS.map(({ axis, label }) => {
          const list = rankedListBy(s, axis);
          const rank = list.findIndex((e) => e.isPlayer) + 1;
          const leader = list[0];
          return (
            <article key={axis} className="standings-card">
              <header className="standings-card-head">
                <span className="standings-card-label">{label}</span>
                <strong className="standings-card-rank">#{rank}</strong>
              </header>
              <p className="standings-card-leader">{leader.isPlayer ? 'The college leads.' : `Led by ${leader.name}`}</p>
              {rows.length > 1 && (
                <HistoryChart
                  label={label}
                  span={SEMICENTENNIAL_YEAR}
                  years={rows.map((h) => h.year)}
                  values={rows.map((h) => -(h.standings![axis] ?? field))}
                  format={(v) => `#${Math.round(-v)}`}
                  bare
                />
              )}
            </article>
          );
        })}
      </div>
      <p className="standing-note standing-readings-note">
        Research and campus life are standings of their own, scored as prestige is and ranked beside it; neither counts toward prestige.
      </p>
      <div className="standings">
        <Standing breakdown={researchStandingBreakdown(s)} />
        <Standing breakdown={socialStandingBreakdown(s)} />
      </div>
      {rival && (
        <p className="stat">
          The rival: {rival.rival.name} {rival.rival.mascot}, in {(sportById(rival.sport)?.teamName ?? rival.sport).replace(/ Team$/, '')} and in the guide, #{rival.theirs} to the college's #{rival.mine}.
          {series && ` The series stands ${series.wins}–${series.losses}.`}
        </p>
      )}
    </section>
  );
}
