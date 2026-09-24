import { useEffect, useState } from 'react';
import type { GameState } from '../state/types';
import type { Speed } from '../engine/useGame';

const DAY_TICKER_POLL_MS = 150;
const DAYS_PER_WEEK = 7;

// Purely cosmetic: the sim only advances whole weeks, so this paces seven
// squares across the current week to make the clock read as continuous.
// It keeps no timing of its own; it reads useGame.ts's week accumulator
// (see weekClock.ts) so the squares cannot drift from the real tick.
// It polls rather than subscribes because the accumulator is a ref, so a
// decorative square never re-renders the app. 150ms is well under the
// ~360ms between square changes; the poll stops while the clock is frozen.
export default function DayTicker({ s, speed, weekProgress }: {
  s: GameState;
  speed: Speed;
  // Reads the live week fraction, 0..1 (useGame.ts's weekProgress).
  weekProgress: () => number;
}) {
  const weekKey = `${s.clock.year}-${s.clock.week}`;
  const ticking = speed !== 'paused' && s.started && s.pendingInterrupt === null;
  const [litDays, setLitDays] = useState(0);

  useEffect(() => {
    // Read once up front so a frozen clock still shows where the week
    // stopped, rather than whatever the last poll happened to catch.
    const read = () => setLitDays(Math.min(DAYS_PER_WEEK, Math.floor(weekProgress() * DAYS_PER_WEEK)));
    read();
    if (!ticking) return;
    const id = setInterval(read, DAY_TICKER_POLL_MS);
    return () => clearInterval(id);
  }, [ticking, weekKey, weekProgress]);

  return (
    <div className="day-ticker" aria-hidden="true" title="Days elapsed this week">
      {Array.from({ length: DAYS_PER_WEEK }, (_, i) => (
        <span key={i} className={`day-ticker-cell ${i < litDays ? 'lit' : ''}`} />
      ))}
    </div>
  );
}
