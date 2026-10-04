import { institutionName, type GameState } from '../state/types';

// The game keeps no founding year: every college opens at Year 1
// (state/actions.ts's new game), so the patch says so.
const FOUNDED_YEAR = 1;

// The pennant: the school's name on an embroidered patch in its colors
// (Plan 89), the founding year stitched over it, in the map's top-left
// corner. One size; a long name wraps rather than shrinks, to two lines and
// an ellipsis, with the whole name in the title (Plan 76I).
// App.tsx hides it while a tab is open (tabs put their own title in that
// corner). Inert, so clicks fall through to the map, bar the name (for its
// title). The college is renamed once, in the charter's letter (Plan 80D,
// InboxTab.tsx's CharterAnswer); the pennant only shows the name.
export default function Pennant({ s }: { s: GameState }) {
  return (
    <div className="pennant">
      <div className="pennant-body">
        <span className="pennant-est">
          <span aria-hidden="true">★</span>Est. Year {FOUNDED_YEAR}<span aria-hidden="true">★</span>
        </span>
        <span className="pennant-name" title={institutionName(s.self)}>{institutionName(s.self)}</span>
      </div>
    </div>
  );
}
