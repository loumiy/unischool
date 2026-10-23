import type { GameState } from '../state/types';
import { SUMMER_CALL, summerOpenLabel } from '../systems/inbox/inbox';

// The summer's call (Plan 112C). Week 52 stops the clock, but the summer no
// longer opens over whatever the player has open: this note stands over the
// map, above the clock, for as long as the summer waits (bar over the
// inbox, whose first row is the same door), and can't be put away, since
// the clock runs again only through the summer. The play
// button is rung with it (StatusHeader.tsx), and the summer's row in the
// inbox opens it too. App.tsx keeps whether it is open.
export default function SummerCall({ s, onOpen }: { s: GameState; onOpen: () => void }) {
  return (
    <aside className="summer-call" role="status" aria-live="polite" aria-label={SUMMER_CALL.title}>
      <span className="summer-call-sun" aria-hidden="true">☀</span>
      <div className="summer-call-text">
        <p className="summer-call-eyebrow">Week 52 · Year {s.clock.year}</p>
        <h2>{SUMMER_CALL.title}</h2>
        <p>{SUMMER_CALL.body}</p>
      </div>
      <button type="button" className="btn-primary summer-call-open" onClick={onOpen}>{summerOpenLabel(s)}</button>
    </aside>
  );
}
