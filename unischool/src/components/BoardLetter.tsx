import type { GameState } from '../state/types';
import type { Action } from '../state/actions';
import { BOARD_LETTERS } from '../data/boardData';
import { IDLE_CASH_AGAIN_LETTER, IDLE_CASH_LETTER, SWEEP_DEFAULT_WEEKS } from '../systems/finance/sweep';

// A letter from the board on the distress ladder (systems/finance/
// distress.ts) or about idle cash (sweep.ts): one card at a time, oldest
// first, over the map. Like a
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
        {(id === IDLE_CASH_LETTER || id === IDLE_CASH_AGAIN_LETTER) ? (
          <>
            {/* The letter's ask (Plan 70D): setting the sweep puts it away. */}
            <button type="button" onClick={() => act({ type: 'SET_SWEEP', weeks: SWEEP_DEFAULT_WEEKS })}>Sweep above {SWEEP_DEFAULT_WEEKS} weeks</button>
            <button type="button" className="secondary" onClick={() => act({ type: 'READ_BOARD_LETTER' })}>Not now</button>
          </>
        ) : (
          <button type="button" onClick={() => act({ type: 'READ_BOARD_LETTER' })}>Noted</button>
        )}
      </div>
    </aside>
  );
}
