import type { Faculty, GameState, LogEntry } from '../state/types';
import { retiringSoon } from '../tabs/facultySort';

// The full event feed, oldest-entries-cut-off-first the same as s.log
// itself. Opened from LogTicker.tsx's click handler, inside a ToolbarPopup
// (see styles.css's .log-popup) — the one-line ticker is deliberately only
// the latest entry; this is where the rest of it lives.
//
// A retirement's notice (facultySystem.ts's tickRetirements) carries a door
// to the market in that field while the professor is still here (Plan 84D).

// The professor a line gives a year's notice for, while it still stands.
export function retirementNotice(s: GameState, e: LogEntry): Faculty | undefined {
  if (e.topic !== 'departure' || !e.subject) return undefined;
  const f = s.faculty.find((x) => x.id === e.subject);
  return f && retiringSoon(f) ? f : undefined;
}

export function SuccessorDoor({ f, onOpenMarket }: { f: Faculty; onOpenMarket: (field: string) => void }) {
  return (
    <button
      type="button"
      className="log-door"
      onClick={() => onOpenMarket(f.field)}
      title={`The market in ${f.field}, to find a successor for ${f.name}`}
    >
      Find a successor →
    </button>
  );
}

export default function LogStrip({ s, onOpenMarket }: { s: GameState; onOpenMarket?: (field: string) => void }) {
  return (
    <ul className="log">
      {s.log.map((e, i) => {
        const leaving = onOpenMarket ? retirementNotice(s, e) : undefined;
        return (
          <li key={i} className={e.kind}>
            <span className="ts">Y{e.year}W{e.week}</span> {e.message}
            {leaving && onOpenMarket && <> <SuccessorDoor f={leaving} onOpenMarket={onOpenMarket} /></>}
          </li>
        );
      })}
    </ul>
  );
}
