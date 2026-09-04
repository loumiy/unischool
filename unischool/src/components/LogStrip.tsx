import type { GameState } from '../state/types';

// The full event feed — the toolbar's log icon (see Toolbar.tsx) opens this
// inside a ToolbarPopup, the same "compact card floating over the map"
// shape the build popup uses. C2 folded the log's own always-visible
// floating card into the toolbar's one-line ticker (the latest entry,
// rendered directly in Toolbar.tsx) plus this fuller feed one click away,
// rather than keeping a separate permanent card competing for space along
// the bottom of the screen.
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
