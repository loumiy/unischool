import { institutionName, type GameState } from '../state/types';

// The pennant: the school's name on a banner in its colors, hung from the
// map's top-left corner (Plan 90). The game keeps no calendar, so it carries
// no founding year (Plan 96D: "Est. Year 1" was always the same). A name of
// any length (COLLEGE_NAME_MAX) shows whole: the longer it is, the smaller
// its type, so it wraps to a few balanced lines and never clips.
// App.tsx hides it while a tab is open (tabs put their own title in that
// corner). Inert, so clicks fall through to the map, bar the name (for its
// title). The college is renamed once, in the charter's letter (Plan 80D,
// InboxTab.tsx's CharterAnswer); the pennant only shows the name.
const NAME_SIZES: readonly [maxLength: number, size: string][] = [
  [12, 'full'],
  [24, 'long'],
  [40, 'longer'],
];
function nameSize(name: string): string {
  return NAME_SIZES.find(([max]) => name.length <= max)?.[1] ?? 'longest';
}

export default function Pennant({ s }: { s: GameState }) {
  const name = institutionName(s.self);
  return (
    <div className="pennant">
      <div className="pennant-body">
        <span className={`pennant-name ${nameSize(name)}`} title={name}>{name}</span>
      </div>
      <div className="pennant-tail" aria-hidden="true" />
    </div>
  );
}
