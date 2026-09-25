import type { GameState } from '../state/types';
import type { Action } from '../state/actions';
import { BOARD_LETTERS } from '../data/boardData';

// A letter from the board on the distress ladder (systems/finance/
// distress.ts): one card at a time, oldest first, over the map. Like a
// milestone's note it never holds the clock; "Noted" puts it away.
export default function BoardLetter({ s, act }: { s: GameState; act: (a: Action) => void }) {
  const id = s.finance.distress?.letters[0];
  const letter = id ? BOARD_LETTERS[id] : undefined;
  if (!id || !letter || s.pendingInterrupt) return null;
  return (
    <aside className="milestone-note board-letter" role="note" aria-label={letter.title}>
      <p className="letter-eyebrow">From the board · Year {s.clock.year}</p>
      <h3 className="milestone-note-title">{letter.title}</h3>
      <p className="milestone-note-text">{letter.text}</p>
      <div className="opening-coach-actions">
        <button type="button" onClick={() => act({ type: 'READ_BOARD_LETTER' })}>Noted</button>
      </div>
    </aside>
  );
}
