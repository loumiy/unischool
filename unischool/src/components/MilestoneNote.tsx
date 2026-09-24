import type { GameState } from '../state/types';
import type { Action } from '../state/actions';
import { milestoneById } from '../data/ladderData';

// A milestone just reached (data/ladderData.ts): one card at a time, oldest
// first, over the map. It never holds the clock; "Noted" puts it away.
export default function MilestoneNote({ s, act }: { s: GameState; act: (a: Action) => void }) {
  const id = s.ladder.unread[0];
  const m = id ? milestoneById(id) : undefined;
  if (!id || !m || s.pendingInterrupt) return null;
  return (
    <aside className="milestone-note" role="note" aria-label={m.name}>
      <p className="letter-eyebrow">A milestone · {m.tier} · Year {s.ladder.reached[id]}</p>
      <h3 className="milestone-note-title">{m.name}</h3>
      <p className="milestone-note-text">{m.letter}</p>
      <ul className="milestone-opens">
        {m.opens.map((line) => <li key={line}>{line}</li>)}
      </ul>
      <div className="opening-coach-actions">
        <button type="button" onClick={() => act({ type: 'READ_MILESTONE', id })}>Noted</button>
      </div>
    </aside>
  );
}
