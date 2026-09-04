import { forwardRef } from 'react';
import type { GameState } from '../state/types';

// The event log, docked over the map's bottom-left corner as a floating
// ticker (see App.tsx). Forwards its ref so App.tsx can measure its real
// height with useCssHeightVar — the map's interactive area insets away
// from it, so a tile is never left both on screen and unreachable under an
// opaque panel.
const LogStrip = forwardRef<HTMLElement, { s: GameState }>(({ s }, ref) => {
  return (
    <section ref={ref} className="panel log-strip">
      <ul className="log">
        {s.log.map((e, i) => (
          <li key={i} className={e.kind}>
            <span className="ts">Y{e.year}W{e.week}</span> {e.message}
          </li>
        ))}
      </ul>
    </section>
  );
});

export default LogStrip;
