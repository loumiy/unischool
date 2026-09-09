import type { GameState } from '../state/types';

// One line, always on screen, directly above the toolbar (see styles.css's
// .log-ticker): the single newest entry in s.log (newest first — see
// types.ts's LogEntry), which used to be generated every week — an
// admissions summary, a grant awarded, a professor testing the market,
// a demand met or missed — and simply thrown away, since nothing rendered
// it after C3's toolbar consolidation dropped its old slot (see Toolbar.tsx
// and LogStrip.tsx's own module comment). This is deliberately only the
// latest line, not the fuller scrollable feed LogStrip.tsx already renders
// correctly: that component still has no popup or icon to open it from,
// which stays open work rather than something this ticker takes on too.
export default function LogTicker({ s }: { s: GameState }) {
  const latest = s.log[0];
  return (
    <div className="log-ticker">
      {latest ? (
        <span className={latest.kind}>
          <span className="ts">Y{latest.year}W{latest.week}</span>
          {latest.message}
        </span>
      ) : (
        <span className="log-ticker-empty">No activity yet.</span>
      )}
    </div>
  );
}
