import { useEffect, useState } from 'react';
import type { Action } from '../state/actions';
import type { Quad } from '../state/quads';
import { QUAD_NAME_MAX } from '../data/quadData';
import { pct } from '../format';

// A quad's card, opened by clicking it on the map: its name, which the
// player can change, what it is, and the mark that made it if the player
// made it. Sits where the building panel does; the two never show at once.
export default function QuadPanel({ quad, act, onClose }: {
  quad: Quad; act: (a: Action) => void; onClose: () => void;
}) {
  const [draft, setDraft] = useState(quad.name);
  useEffect(() => setDraft(quad.name), [quad.key, quad.name]);
  const commit = () => {
    if (draft.trim() !== quad.name) act({ type: 'NAME_QUAD', key: quad.key, name: draft });
  };
  return (
    <aside className="building-info-panel quad-panel" aria-label={quad.name}>
      <div className="building-info-head">
        <h3>{quad.name}</h3>
        <button type="button" className="building-info-close" onClick={onClose} aria-label="Close">×</button>
      </div>
      <p className="building-info-line">
        {quad.designated ? 'Marked as a quad.' : 'A quad the buildings enclose.'}{' '}
        {quad.area.toLocaleString()} tiles, {pct(quad.enclosure)} walled, {pct(quad.green)} green.
      </p>
      <form
        className="quad-panel-name"
        onSubmit={(e) => { e.preventDefault(); commit(); }}
      >
        <label htmlFor="quad-name" className="building-info-line">Name</label>
        <input
          id="quad-name"
          value={draft}
          maxLength={QUAD_NAME_MAX}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
        />
      </form>
      {quad.designated && (
        <button type="button" className="building-info-jump" onClick={() => { act({ type: 'UNMARK_QUAD', key: quad.key }); onClose(); }}>
          Lift the mark
        </button>
      )}
    </aside>
  );
}
