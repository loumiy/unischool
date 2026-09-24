import { useEffect, useRef, useState } from 'react';

// Tweens from what is on screen to a new `value` rather than snapping.
// Cosmetic only: the settled display always equals `value`, and a new value
// mid-tween re-tweens from the current position.
const DEFAULT_DURATION_MS = 450;

// The tween runs on requestAnimationFrame, which the stylesheet's
// prefers-reduced-motion rule cannot reach, so it checks for itself.
function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export default function AnimatedNumber({
  value,
  format = defaultFormat,
  durationMs = DEFAULT_DURATION_MS,
  revealFrom,
}: {
  value: number;
  format?: (n: number) => string;
  // Longer than the default for a number that is the point of the screen,
  // such as the summer admissions reveal.
  durationMs?: number;
  // Where to start counting from on mount; without it a new number simply
  // appears, which is right everywhere except a reveal.
  revealFrom?: number;
}) {
  const [displayed, setDisplayed] = useState(revealFrom ?? value);
  const displayedRef = useRef(revealFrom ?? value);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const from = displayedRef.current;
    const to = value;
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    if (from === to) return;
    if (prefersReducedMotion()) {
      displayedRef.current = to;
      setDisplayed(to);
      return;
    }

    let start: number | null = null;
    function tick(now: number) {
      if (start === null) start = now;
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - (1 - t) ** 3; // ease-out
      const next = from + (to - from) * eased;
      displayedRef.current = next;
      setDisplayed(next);
      if (t < 1) frameRef.current = requestAnimationFrame(tick);
    }
    frameRef.current = requestAnimationFrame(tick);
    return () => { if (frameRef.current !== null) cancelAnimationFrame(frameRef.current); };
    // `durationMs` is deliberately not a dependency: changing it would
    // restart a tween mid-flight.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return <>{format(displayed)}</>;
}

function defaultFormat(n: number): string {
  return Math.round(n).toLocaleString();
}
