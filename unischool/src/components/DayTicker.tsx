import { useEffect, useRef, useState } from 'react';
import type { GameState } from '../state/types';
import { SPEEDS, type Speed } from '../engine/useGame';

const DAY_TICKER_POLL_MS = 150;
const DAYS_PER_WEEK = 7;

// Purely cosmetic — there is no day-level unit anywhere in GameState (see
// useGame.ts's SPEEDS comment: the sim only ever advances a whole week per
// TICK). This just paces seven squares across the real-time interval
// between one TICK and the next, so the clock beside it reads as moving
// continuously rather than jumping once every SPEEDS[speed] milliseconds.
// It resets the instant s.clock.week/year actually changes, so it can never
// drift out of sync with the tick it is illustrating, and freezes — rather
// than resets — whenever ticking itself is halted, mirroring the exact
// gate useGame.ts's own tick effect uses (paused speed, not yet started, or
// an interrupt pending).
export default function DayTicker({ s, speed }: { s: GameState; speed: Speed }) {
  const weekKey = `${s.clock.year}-${s.clock.week}`;
  const startRef = useRef(Date.now());
  const ticking = speed !== 'paused' && s.started && s.pendingInterrupt === null;
  const [litDays, setLitDays] = useState(0);

  useEffect(() => {
    startRef.current = Date.now();
    setLitDays(0);
    if (!ticking) return;
    const msPerWeek = SPEEDS[speed];
    const id = setInterval(() => {
      const elapsed = Date.now() - startRef.current;
      setLitDays(Math.min(DAYS_PER_WEEK, Math.floor((elapsed / msPerWeek) * DAYS_PER_WEEK)));
    }, DAY_TICKER_POLL_MS);
    return () => clearInterval(id);
  }, [ticking, speed, weekKey]);

  return (
    <div className="day-ticker" aria-hidden="true" title="Days elapsed this week">
      {Array.from({ length: DAYS_PER_WEEK }, (_, i) => (
        <span key={i} className={`day-ticker-cell ${i < litDays ? 'lit' : ''}`} />
      ))}
    </div>
  );
}
