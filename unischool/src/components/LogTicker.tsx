import type { GameState } from '../state/types';
import ToolbarPopup from './ToolbarPopup';
import LogStrip, { SuccessorDoor, retirementNotice } from './LogStrip';
import { LogIcon } from './icons';
import { inboxPointer, nextStep, type NextStep } from '../systems/guidance/nextStep';
import { nextMilestone } from '../systems/ladder/ladderSystem';
import type { Progress } from '../data/ladderData';
import LadderPanel from './LadderPanel';
import { count, prestigeFigure } from '../format';

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
// NEXT first points at the inbox for what will not wait (Plan 77,
// nextStep.ts's inboxPointer: the board's letter, an event in its last
// week), pulsing, except while the inbox itself is open.
// A milestone's progress as a count: "12/13 courses", "96.4/100.0 prestige".
function figure(n: number, unit: string): string {
  return unit === 'prestige' ? prestigeFigure(n) : count(Math.floor(n));
}
function progressShort(p: Progress): string {
  return `${figure(Math.min(p.value, p.target), p.unit)}/${figure(p.target, p.unit)}`;
}
function progressText(p: Progress): string {
  return `${figure(Math.min(p.value, p.target), p.unit)} of ${figure(p.target, p.unit)} ${p.unit}`;
}

export default function LogTicker({ s, open, onSetOpen, ladderOpen, onSetLadderOpen, onGo, inboxOpen, onOpenMarket }: {
  s: GameState; open: boolean; onSetOpen: (open: boolean) => void;
  ladderOpen: boolean; onSetLadderOpen: (open: boolean) => void;
  onGo: (go: NonNullable<NextStep['go']>, hallId?: string, programId?: string) => void;
  inboxOpen: boolean;
  // A retirement's notice opens the market in its field (Plan 84D).
  onOpenMarket?: (field: string) => void;
}) {
  const latest = s.log[0];
  const leaving = latest && onOpenMarket ? retirementNotice(s, latest) : undefined;
  const step = s.pendingInterrupt ? null : (inboxOpen ? null : inboxPointer(s)) ?? nextStep(s);
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
        {/* The date stands beside the line, not in it, so a narrow strip
            cuts the message and keeps the year ("Y31", not "Y.": Plan 95K,
            the second review's B2-7). */}
        {latest ? (
          <>
            <span className="ts">Y{latest.year}W{latest.week}</span>
            <span className={latest.kind}>
              {latest.message}
              {leaving && onOpenMarket && <> <SuccessorDoor f={leaving} onOpenMarket={onOpenMarket} /></>}
            </span>
          </>
        ) : (
          <span className="log-ticker-empty">No activity yet.</span>
        )}
        {milestone && (
          <button
            type="button"
            className="log-ticker-ladder"
            aria-expanded={ladderOpen}
            title={`${milestone.name}: ${milestone.condition}${progress ? ` — ${progressText(progress)} so far` : ''}`}
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
              <button type="button" className="log-ticker-next-text" onClick={() => { if (step.go) onGo(step.go, step.hallId, step.programId); }}>
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
          <LogStrip s={s} onOpenMarket={onOpenMarket ? (field) => { onSetOpen(false); onOpenMarket(field); } : undefined} />
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
