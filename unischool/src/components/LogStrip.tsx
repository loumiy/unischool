import type { GameState } from '../state/types';

// The full event feed, oldest-entries-cut-off-first the same as s.log
// itself. NOT currently rendered anywhere: LogTicker.tsx (see App.tsx)
// restores the one-line "latest entry" ticker C2 folded away, but nothing
// yet opens this fuller scrollable feed from it — there is no log icon or
// popup to click for it. Kept ready (and correct) for whenever that click-
// to-expand affordance gets built, rather than deleted for being unused.
export default function LogStrip({ s }: { s: GameState }) {
  return (
    <ul className="log">
      {s.log.map((e, i) => (
        <li key={i} className={e.kind}>
          <span className="ts">Y{e.year}W{e.week}</span> {e.message}
        </li>
      ))}
    </ul>
  );
}
