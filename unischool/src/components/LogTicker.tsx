import type { GameState } from '../state/types';
import ToolbarPopup from './ToolbarPopup';
import LogStrip from './LogStrip';
import { LogIcon } from './icons';
import { nextStep, type NextStep } from '../systems/guidance/nextStep';
import { nextMilestone } from '../systems/ladder/ladderSystem';
import LadderPanel from './LadderPanel';

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
export default function LogTicker({ s, open, onSetOpen, ladderOpen, onSetLadderOpen, onGo }: {
  s: GameState; open: boolean; onSetOpen: (open: boolean) => void;
  ladderOpen: boolean; onSetLadderOpen: (open: boolean) => void;
  onGo: (go: NonNullable<NextStep['go']>) => void;
}) {
  const latest = s.log[0];
  const step = s.pendingInterrupt ? null : nextStep(s);
  const milestone = nextMilestone(s);
  const progress = milestone?.progress?.(s);

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
        {milestone && (
          <button
            type="button"
            className="log-ticker-ladder"
            aria-expanded={ladderOpen}
            title="The ladder: every milestone and what it opens"
            onClick={() => onSetLadderOpen(!ladderOpen)}
          >
            <span className="log-ticker-next-label">Milestone</span>
            {milestone.name}
            {progress && <span className="log-ticker-ladder-progress">{Math.min(100, Math.floor((progress.value / progress.target) * 100))}%</span>}
          </button>
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
      {ladderOpen && (
        <ToolbarPopup title="Milestones" onClose={() => onSetLadderOpen(false)} className="ladder-popup">
          <LadderPanel s={s} />
        </ToolbarPopup>
      )}
    </>
  );
}
