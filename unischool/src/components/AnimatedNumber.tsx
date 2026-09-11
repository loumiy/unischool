import { useEffect, useRef, useState } from 'react';

// Ticks from whatever is currently on screen to a new `value` over a
// short, fixed duration instead of snapping straight to it — the "quick
// animation" the admissions form wants whenever a lever (tuition,
// scholarships) moves a downstream number (applicants, yield, enrolled).
// Purely cosmetic: the settled display always equals `value` exactly, and
// interrupting mid-tween (dragging a slider quickly) just re-tweens from
// wherever the animation currently is, never fights or resets.
const DURATION_MS = 450;

// This tween is driven by requestAnimationFrame, not by CSS, so the
// stylesheet's blanket prefers-reduced-motion rule cannot reach it — it has
// to ask for itself. A reader who has asked for less motion gets the settled
// figure immediately, which is the same number either way.
function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export default function AnimatedNumber({ value, format = defaultFormat }: {
  value: number;
  format?: (n: number) => string;
}) {
  const [displayed, setDisplayed] = useState(value);
  const displayedRef = useRef(value);
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
      const t = Math.min(1, (now - start) / DURATION_MS);
      const eased = 1 - (1 - t) ** 3; // ease-out: settles gently, doesn't slide linearly
      const next = from + (to - from) * eased;
      displayedRef.current = next;
      setDisplayed(next);
      if (t < 1) frameRef.current = requestAnimationFrame(tick);
    }
    frameRef.current = requestAnimationFrame(tick);
    return () => { if (frameRef.current !== null) cancelAnimationFrame(frameRef.current); };
  }, [value]);

  return <>{format(displayed)}</>;
}

function defaultFormat(n: number): string {
  return Math.round(n).toLocaleString();
}
