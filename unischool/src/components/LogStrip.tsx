import type { GameState } from '../state/types';

// The event log, docked under the map as a full-width ticker. It used to be
// the last panel of the Campus tab; in the map-centric shell it belongs to
// the base layer, visible no matter which view is open over the map.
export default function LogStrip({ s }: { s: GameState }) {
  return (
    <section className="panel log-strip">
      <ul className="log">
        {s.log.map((e, i) => (
          <li key={i} className={e.kind}>
            <span className="ts">Y{e.year}W{e.week}</span> {e.message}
          </li>
        ))}
      </ul>
    </section>
  );
}
