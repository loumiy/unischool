import type { GameState } from '../state/types';
import { CHRONICLE_WORDS } from '../data/chronicleData';
import { chronicleOf, sagaLines } from '../systems/chronicle/chronicle';
import HelpHint from '../components/HelpHint';

// The chronicle (Plan 33, systems/chronicle/chronicle.ts): the run as the
// historians will divide it, era by era, and the rival's saga. In draft
// until the fiftieth summer; the Epilogue's addenda follow it.
export default function ChroniclePanel({ s }: { s: GameState }) {
  const { eras, rival } = chronicleOf(s);
  return (
    <section className="panel chronicle">
      <div className="panel-head">
        <div className="panel-head-title">
          <h2>{CHRONICLE_WORDS.title}</h2>
          <span className="panel-count">{eras.length === 1 ? '1 era' : `${eras.length} eras`}</span>
        </div>
        <HelpHint align="end" text={CHRONICLE_WORDS.draft} />
      </div>
      {eras.length === 0 ? (
        <p className="review-empty">{CHRONICLE_WORDS.none}</p>
      ) : (
        <ol className="chronicle-eras">
          {eras.map((era) => (
            <li key={`${era.from}-${era.to}`} className="chronicle-era">
              <h3 className="chronicle-era-name">{era.name}</h3>
              <p className="chronicle-era-lines">{era.lines.join(' ')}</p>
            </li>
          ))}
        </ol>
      )}
      <h3 className="chronicle-subhead">{CHRONICLE_WORDS.rival}</h3>
      <p className="chronicle-era-lines">{rival ? sagaLines(rival).join(' ') : CHRONICLE_WORDS.rivalNone}</p>
    </section>
  );
}
