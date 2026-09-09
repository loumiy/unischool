import { useState } from 'react';
import type { GameState } from '../state/types';
import ToolbarPopup from './ToolbarPopup';
import LogStrip from './LogStrip';

// One line, always on screen, directly above the toolbar (see styles.css's
// .log-ticker): the single newest entry in s.log (newest first — see
// types.ts's LogEntry), which used to be generated every week — an
// admissions summary, a grant awarded, a professor testing the market,
// a demand met or missed — and simply thrown away, since nothing rendered
// it after C3's toolbar consolidation dropped its old slot (see Toolbar.tsx
// and LogStrip.tsx's own module comment). A click expands it into the
// fuller scrollable feed LogStrip.tsx already renders correctly, in the
// same ToolbarPopup shape the build menu uses (see styles.css's
// .log-popup, which has been sized and positioned for exactly this since
// before this ticker existed) — the click-to-expand affordance LogStrip
// was missing.
export default function LogTicker({ s }: { s: GameState }) {
  const [open, setOpen] = useState(false);
  const latest = s.log[0];

  return (
    <>
      <button
        type="button"
        className="log-ticker"
        aria-expanded={open}
        aria-label={open ? 'Close activity log' : 'Open activity log'}
        onClick={() => setOpen((v) => !v)}
      >
        {latest ? (
          <span className={latest.kind}>
            <span className="ts">Y{latest.year}W{latest.week}</span>
            {latest.message}
          </span>
        ) : (
          <span className="log-ticker-empty">No activity yet.</span>
        )}
      </button>
      {open && (
        <ToolbarPopup title="Activity Log" onClose={() => setOpen(false)} className="log-popup">
          <LogStrip s={s} />
        </ToolbarPopup>
      )}
    </>
  );
}
