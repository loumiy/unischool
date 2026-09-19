import type { GameState } from '../state/types';

// THE PENNANT (Plan 18): the school's name, hung from the top-left corner
// of the map in the school's own colours — the one piece of chrome that is
// identity rather than instrument. It used to sit in the toolbar's right
// zone beside the clock; moving it out is what lets the band be one row.
//
// Two lines, not one: the name the player typed, then the fixed half of it
// ("College", and "University" once the charter is taken — see
// types.ts's University.suffix). Kept as two lines rather than the joined
// institutionName so the promotion reads as the second line changing,
// which is the whole of that feature's visible effect and deserves a
// surface that shows it.
//
// Shown over the map only. A tab is a full-bleed screen with its own title
// in the same corner (see TabOverlay.tsx), so App.tsx withholds this while
// one is open rather than hanging a pennant over the word "Curriculum".
// Inert — nothing to click — so it lets clicks fall through to the map.
export default function Pennant({ s }: { s: GameState }) {
  return (
    <div className="pennant" aria-label={`${s.self.name} ${s.self.suffix}`.trim()}>
      <div className="pennant-body">
        <span className="pennant-name">{s.self.name}</span>
        {s.self.suffix && <span className="pennant-suffix">{s.self.suffix}</span>}
      </div>
      <div className="pennant-tail" aria-hidden="true" />
    </div>
  );
}
