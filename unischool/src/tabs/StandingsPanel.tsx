import type { GameState } from '../state/types';
import HelpHint from '../components/HelpHint';
import { HistoryChart } from '../components/HistoryChart';
import { PILLAR_AXES, STANDINGS, rankedListBy, specializations } from '../systems/rivals/rivalsSystem';
import { ledBy } from '../data/specializationData';
import { SEMICENTENNIAL_YEAR } from '../state/types';
import { rivalRanks } from '../systems/rivals/collegeRival';
import { sportById } from '../data/studentLifeData';
import { PILLARS, pillarBreakdown } from '../systems/prestige/prestigeSystem';
import { Standing } from './StandingBreakdown';

// The league table (Plan 31, V1-22, V1-33): where the college stands on
// prestige, its four pillars, access and financial strength this year, who
// leads each, and each rank charted over the run. Lower is better; the
// charts are drawn upside down to read that way. Under the cards, what each
// pillar reads (Plan 85B): prestige is their blend.

export default function StandingsPanel({ s }: { s: GameState }) {
  const field = s.rivals.length + 1;
  const rows = s.history.filter((h) => h.standings !== undefined);
  const rival = rivalRanks(s);
  const series = rival ? s.orgs.rivalries[rival.sport] : undefined;
  const specs = specializations(s);
  return (
    <section className="panel standings-panel">
      <div className="panel-head">
        <span className="panel-head-title">
          <h2>The standings</h2>
          <HelpHint text="Seven rankings, one field. Prestige is the ranking the guide leads with, and the one Rank shows: the blend of four pillars, academics 35%, research 25%, student life 25% and athletics 15%, for the college and every rival alike. Each rival specializes in one pillar, which runs higher and steadier than its others; without a specialization, each of the college's pillars stops at a limit short of the top. Access reads the admit rate and how far the price sits under what the college's prestige could charge; financial strength the endowment per student. Neither counts toward prestige." />
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
              <p className="standings-card-leader">
                {leader.isPlayer
                  ? 'The college leads.'
                  : (axis === 'reputation' || PILLAR_AXES.includes(axis)) && specs.has(leader.key) ? ledBy(leader.name, specs.get(leader.key)!) : `Led by ${leader.name}`}
              </p>
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
        The four pillars, each on the prestige scale. Prestige is their blend: academics 35%, research 25%, student life 25%, athletics 15%.
      </p>
      <div className="standings">
        {PILLARS.map((p) => <Standing key={p} breakdown={pillarBreakdown(s, p)} />)}
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
