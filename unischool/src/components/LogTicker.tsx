import { useState } from 'react';
import type { GameState } from '../state/types';
import ToolbarPopup from './ToolbarPopup';
import LogStrip from './LogStrip';
import { LogIcon } from './icons';

// One line, always on screen, directly above the toolbar (see styles.css's
// .log-ticker): the single newest entry in s.log (newest first — see
// types.ts's LogEntry), which used to be generated every week — an
// admissions summary, a grant awarded, a demand met or missed — and simply
// thrown away, since nothing rendered it after C3's toolbar consolidation
// dropped its old slot (see Toolbar.tsx and LogStrip.tsx's own module
// comment). Only the small icon on the left is a button — the text itself
// is plain, un-clickable content, same as the toolbar's own funds/stats
// readouts below it: a whole wide strip acting as one giant click target
// read as a mis-click waiting to happen, not an affordance. LogIcon
// (icons.tsx) is the toolbar's own pre-C2 log glyph, otherwise unused
// since that refactor — the same glyph, just relocated rather than
// invented fresh. Clicking it expands into the fuller scrollable feed
// LogStrip.tsx already renders correctly, in the same ToolbarPopup shape
// the build menu uses (see styles.css's .log-popup, sized and positioned
// for exactly this since before this ticker existed).
export default function LogTicker({ s }: { s: GameState }) {
  const [open, setOpen] = useState(false);
  const latest = s.log[0];

  return (
    <>
      <div className="log-ticker">
        <button
          type="button"
          className="log-ticker-toggle"
          aria-expanded={open}
          aria-label={open ? 'Close activity log' : 'Open activity log'}
          onClick={() => setOpen((v) => !v)}
        >
          <LogIcon />
        </button>
        {latest ? (
          <span className={latest.kind}>
            <span className="ts">Y{latest.year}W{latest.week}</span>
            {latest.message}
          </span>
        ) : (
          <span className="log-ticker-empty">No activity yet.</span>
        )}
      </div>
      {open && (
        <ToolbarPopup title="Activity Log" onClose={() => setOpen(false)} className="log-popup">
          <LogStrip s={s} />
        </ToolbarPopup>
      )}
    </>
  );
}
