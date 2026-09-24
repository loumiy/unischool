import type { GameState } from '../state/types';
import type { Action } from '../state/actions';
import { DEMAND_DEADLINE_WEEKS, demandCopy } from '../data/demandData';
import { demandProgress, demandStakes } from '../systems/demands/demandSystem';
import { absoluteWeek } from '../data/eventData';

// A student demand (systems/demands/demandSystem.ts), announced as a note
// over the map rather than a modal (Plan 29, V1-16): what they ask, by
// when, and what missing it costs. The clock runs on; the Students tab
// keeps the demand in view until it is met or lapses.
export default function DemandNote({ s, act }: { s: GameState; act: (a: Action) => void }) {
  const demand = s.events.activeDemand;
  // One note at a time: a milestone's and the board's go first.
  if (!s.events.demandUnread || !demand || s.pendingInterrupt || s.ladder.unread.length > 0 || (s.finance.distress?.letters.length ?? 0) > 0) return null;
  const copy = demandCopy(demand);
  const progress = demandProgress(s, demand);
  const stakes = demandStakes(s);
  const weeksLeft = Math.max(0, demand.deadlineWeek - absoluteWeek(s));
  return (
    <aside className="milestone-note demand-note" role="note" aria-label={copy.headline}>
      <p className="letter-eyebrow">A student demand · {weeksLeft} of {DEMAND_DEADLINE_WEEKS} weeks left</p>
      <h3 className="milestone-note-title">{copy.headline}</h3>
      <p className="milestone-note-text">{copy.grievance(demand.askName)}</p>
      <p className="milestone-note-text">
        <strong>{copy.ask(demand.askName)}</strong>: {Math.round(progress.current).toLocaleString()} of {Math.round(progress.target).toLocaleString()} {copy.unit}.
        {' '}Met, satisfaction heads for {stakes.satisfactionIfMet.toFixed(0)}; missed, next summer&rsquo;s pool is {stakes.applicantsIfFailed.toLocaleString()} rather than {stakes.applicantsIfMet.toLocaleString()}.
      </p>
      <div className="opening-coach-actions">
        <button type="button" onClick={() => act({ type: 'READ_DEMAND' })}>Noted</button>
      </div>
    </aside>
  );
}
