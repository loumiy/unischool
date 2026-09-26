import type { GameState } from '../state/types';
import ToolbarPopup from './ToolbarPopup';
import LogStrip from './LogStrip';
import { LogIcon } from './icons';
import { nextStep, waitingOnMap, type NextStep } from '../systems/guidance/nextStep';
import { nextMilestone } from '../systems/ladder/ladderSystem';
import type { Progress } from '../data/ladderData';
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
//
// While a tab hides the map (`mapHidden`), NEXT first points back to what
// waits there (nextStep.ts's waitingOnMap: the board, an event, a
// milestone, a demand), pulsing when it will not wait long (Plan 34).
// A milestone's progress as a count: "12/13 courses", "96.4/100 prestige".
function figure(n: number, unit: string): string {
  return unit === 'prestige' ? n.toFixed(1) : Math.floor(n).toLocaleString();
}
function progressShort(p: Progress): string {
  return `${figure(Math.min(p.value, p.target), p.unit)}/${figure(p.target, p.unit)}`;
}
function progressText(p: Progress): string {
  return `${figure(Math.min(p.value, p.target), p.unit)} of ${figure(p.target, p.unit)} ${p.unit}`;
}

export default function LogTicker({ s, open, onSetOpen, ladderOpen, onSetLadderOpen, onGo, mapHidden }: {
  s: GameState; open: boolean; onSetOpen: (open: boolean) => void;
  ladderOpen: boolean; onSetLadderOpen: (open: boolean) => void;
  onGo: (go: NonNullable<NextStep['go']>, hallId?: string) => void;
  mapHidden: boolean;
}) {
  const latest = s.log[0];
  const step = s.pendingInterrupt ? null : (mapHidden ? waitingOnMap(s) : null) ?? nextStep(s);
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
            title={`${milestone.name}: ${milestone.condition}${progress ? ` — ${progressText(progress)} so far` : ''}. Click for the ladder: every milestone and what it opens.`}
            onClick={() => onSetLadderOpen(!ladderOpen)}
          >
            <span className="log-ticker-next-label">Milestone</span>
            {milestone.name}
            {/* The count, not a percentage (the merge review, Plan 70E): a
                percentage near the top barely moved for years. */}
            {progress && <span className="log-ticker-ladder-progress">{progressShort(progress)}</span>}
          </button>
        )}
        {step && (
          <span className={`log-ticker-next${step.urgent ? ' urgent' : ''}`}>
            <span className="log-ticker-next-label">Next</span>
            {step.go ? (
              <button type="button" className="log-ticker-next-text" onClick={() => { if (step.go) onGo(step.go, step.hallId); }}>
                {step.text}
              </button>
            ) : (
              <span className="log-ticker-next-text">{step.text}</span>
            )}
          </span>
        )}
      </div>
      {open && (
        <ToolbarPopup title="Activity log" onClose={() => onSetOpen(false)} className="log-popup">
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
