import { institutionName, type GameState } from '../state/types';

// The pennant: the school's name in its colors, hung from the map's
// top-left corner. One line, one size; a long name wraps rather than
// shrinks. App.tsx hides it while a tab is open (tabs put their own title in
// that corner). Inert, so clicks fall through to the map.
export default function Pennant({ s }: { s: GameState }) {
  return (
    <div className="pennant">
      <div className="pennant-body">
        <span className="pennant-name">{institutionName(s.self)}</span>
      </div>
      <div className="pennant-tail" aria-hidden="true" />
    </div>
  );
}
