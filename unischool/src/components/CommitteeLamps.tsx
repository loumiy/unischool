import { useEffect, useRef, useState } from 'react';
import type { GameState } from '../state/types';
import { committeeLamps } from '../systems/techtree/techSystem';

// The committee's lamps (Plan 91), under the Curriculum button's word: one
// small square per seat the committee has (techSystem.ts's committeeLamps).
// A seat writing a course is lit and fills from the bottom as the course
// nears done; a free seat breathes while a course could start there
// (committeeStatus's `ready`) and is dark otherwise. A course just done
// flashes once in the seat it left. Seats not yet earned have no lamp, so the
// row grows with prestige. The button carries the count for a screen reader
// (Toolbar.tsx); the lamps are drawn only, each titled for a hover.
const FLASH_MS = 1_200;

// A course just done, and when its flash ends.
export interface LampFlash { id: string; until: number }
// The flashes still lit at `now`.
export function liveFlashes(flashes: readonly LampFlash[], now: number): LampFlash[] {
  return flashes.filter((f) => f.until > now);
}

export default function CommitteeLamps({ s, ready }: { s: GameState; ready: boolean }) {
  const lamps = committeeLamps(s);
  const writingIds = lamps.flatMap((l) => (l.course ? [l.course.id] : []));
  const key = writingIds.join(',');

  // Courses that left the committee done since the last render, for a flash.
  // Each flash carries its own end, and one timer wakes for the earliest, so
  // a second course starting or finishing inside a flash cannot cancel the
  // first one's end (Plan 96C: a cancelled end left a seat lit white).
  const last = useRef<string[] | null>(null);
  const [flashes, setFlashes] = useState<LampFlash[]>([]);
  useEffect(() => {
    const was = last.current;
    last.current = writingIds;
    if (was === null) return;
    const finished = was.filter((id) => !writingIds.includes(id) && s.tech.find((t) => t.id === id)?.status === 'done');
    if (finished.length === 0) return;
    const until = Date.now() + FLASH_MS;
    setFlashes((f) => [...f, ...finished.map((id) => ({ id, until }))]);
    // `key` stands for writingIds; s.tech is read only when it changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  useEffect(() => {
    if (flashes.length === 0) return;
    const next = Math.min(...flashes.map((f) => f.until));
    const timer = window.setTimeout(() => setFlashes((f) => liveFlashes(f, Date.now())), Math.max(0, next - Date.now()));
    return () => window.clearTimeout(timer);
  }, [flashes]);
  let flashesLeft = flashes.length;
  return (
    <span className="committee-lamps" aria-hidden="true">
      {lamps.map((l, i) => {
        if (l.course) {
          return (
            <span
              key={l.course.id}
              className="committee-lamp lit"
              style={{ '--lamp-fill': `${Math.round(l.progress * 100)}%` } as React.CSSProperties}
              title={`${l.course.name}: ${l.weeksLeft} week${l.weeksLeft === 1 ? '' : 's'} left`}
            />
          );
        }
        if (flashesLeft > 0) {
          flashesLeft -= 1;
          return <span key={`done-${i}`} className="committee-lamp done" title="Course done" />;
        }
        return (
          <span
            key={`free-${i}`}
            className={`committee-lamp ${ready ? 'ready' : ''}`}
            title={ready ? 'Free seat: a course is ready to start' : 'Free seat: no course can start yet'}
          />
        );
      })}
    </span>
  );
}
