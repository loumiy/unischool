import type { GameState } from '../state/types';
import HelpHint from '../components/HelpHint';
import RankingsTable, { rankingsRows } from '../components/RankingsTable';
import { sectionAnchor } from '../components/sectionTarget';
import { SECTION_HEADINGS } from '../data/statChips';
import { TOP_50_CUTOFF, pillarColumns, rankedList, specializations } from '../systems/rivals/rivalsSystem';

// The guide (Plan 80C): the Rank chip's page. The table the top-fifty
// reveal prints (components/RankingsTable.tsx), read live off prestige, with
// each school's four pillars beside it (Plan 85B), and the college's own row
// and its neighbors when it sits below the fifty the guide prints.

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
          text={`The guide's ranking, which Rank shows: every college in the field by its prestige, highest first, with its four pillars beside it (academics, research, student life, athletics). Prestige is their blend, the same for every college: 35%, 25%, 25% and 15%. Each rival specializes in one pillar, tagged after its name, and runs higher there; without a specialization of its own, none of the college's pillars reaches the top. The guide prints the top ${TOP_50_CUTOFF}. Each pillar's own ranking is in the standings.`}
        />
      </div>
      <p className="stat">
        {rank <= TOP_50_CUTOFF
          ? `The college is #${rank} in the guide.`
          : `The college is #${rank}. The guide prints ${TOP_50_CUTOFF} names; the college is not yet among them.`}
      </p>
      <RankingsTable rows={rankingsRows(list, TOP_50_CUTOFF)} lastYear={false} pillars={pillarColumns(s)} specializations={specializations(s)} />
    </section>
  );
}
