import type { GameState } from '../state/types';
import ToolbarPopup from './ToolbarPopup';
import LogStrip from './LogStrip';
import { LogIcon } from './icons';
import { nextStep, type NextStep } from '../systems/guidance/nextStep';

// One line, always on screen above the toolbar (styles.css's .log-ticker):
// the newest entry in s.log (newest first). Only the icon on the left is a
// button; a whole-strip click target read as a mis-click waiting to happen.
// Clicking it opens LogStrip.tsx's full feed in a ToolbarPopup (.log-popup).
// The popup's open state is App's, since it is the innermost rung of the
// shell's one Escape ladder (see App.tsx).
//
// The next step (systems/guidance/nextStep.ts) rides at the strip's right
// end: the log says what just happened, the step says what to do about it.
// Suppressed while an interrupt is up.
export default function LogTicker({ s, open, onSetOpen, onGo }: {
  s: GameState; open: boolean; onSetOpen: (open: boolean) => void;
  onGo: (go: NonNullable<NextStep['go']>) => void;
}) {
  const latest = s.log[0];
  const step = s.pendingInterrupt ? null : nextStep(s);

  return (
    <>
      <div className="log-ticker">
        <button
          type="button"
          className="log-ticker-toggle"
          aria-expanded={open}
          aria-label={open ? 'Close activity log' : 'Open activity log'}
          onClick={() => onSetOpen(!open)}
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
        {step && (
          <span className="log-ticker-next">
            <span className="log-ticker-next-label">Next</span>
            {step.go ? (
              <button type="button" className="log-ticker-next-text" onClick={() => { if (step.go) onGo(step.go); }}>
                {step.text}
              </button>
            ) : (
              <span className="log-ticker-next-text">{step.text}</span>
            )}
          </span>
        )}
      </div>
      {open && (
        <ToolbarPopup title="Activity Log" onClose={() => onSetOpen(false)} className="log-popup">
          <LogStrip s={s} />
        </ToolbarPopup>
      )}
    </>
  );
}
