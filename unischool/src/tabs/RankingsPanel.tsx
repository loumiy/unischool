import type { GameState } from '../state/types';
import HelpHint from '../components/HelpHint';
import RankingsTable, { rankingsRows } from '../components/RankingsTable';
import { sectionAnchor } from '../components/sectionTarget';
import { SECTION_HEADINGS } from '../data/statChips';
import { TOP_50_CUTOFF, rankedList } from '../systems/rivals/rivalsSystem';

// The guide (Plan 80C): the Rank chip's page. The table the top-fifty
// reveal prints (components/RankingsTable.tsx), read live off the academic
// ranking, with the college's own row and its neighbors when it sits below
// the fifty the guide prints.

export default function RankingsPanel({ s }: { s: GameState }) {
  const list = rankedList(s);
  const rank = list.findIndex((e) => e.isPlayer) + 1;
  return (
    <section className="panel" {...sectionAnchor('history.rankings')}>
      <div className="panel-head">
        <div className="panel-head-title">
          <h2>{SECTION_HEADINGS['history.rankings']}</h2>
          <span className="panel-count">#{rank} of {list.length}</span>
        </div>
        <HelpHint
          align="end"
          text={`The guide's academic ranking, which Rank shows: every college in the field by its prestige, highest first. The guide prints the top ${TOP_50_CUTOFF}. The other five rankings are in the standings.`}
        />
      </div>
      <p className="stat">
        {rank <= TOP_50_CUTOFF
          ? `The college is #${rank} in the guide.`
          : `The college is #${rank}. The guide prints ${TOP_50_CUTOFF} names; the college is not yet among them.`}
      </p>
      <RankingsTable rows={rankingsRows(list, TOP_50_CUTOFF)} lastYear={false} />
    </section>
  );
}
