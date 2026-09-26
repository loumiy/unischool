import { useEffect, useState } from 'react';

// ---------------------------------------------------------------------
// Titles on a touch screen (Plan 70G). A `title=` tooltip is hover-only, and
// many carry meaning: why a button is disabled, what an instructor's bar
// means, what a figure counts. On a touch screen a tap on a disabled
// control, or on something that is not a control at all, shows its title in
// a small bubble by the finger; the next tap anywhere, or a few seconds,
// closes it. A tap on a working control does what it does, and nothing
// else, so the hint never gets in the way of an action.
// ---------------------------------------------------------------------

const SHOW_MS = 4_500;
const CONTROLS = 'button, a[href], input, select, textarea, [role="button"], [role="radio"], [role="tab"]';

interface Bubble {
  text: string;
  x: number;
  y: number;
}

// The title a tap at (x, y) should explain, if any.
export function titleForTap(target: Element | null): string | null {
  for (let n: Element | null = target; n && n !== document.body; n = n.parentElement) {
    const title = n.getAttribute('title');
    if (!title) continue;
    const control = n.closest(CONTROLS);
    const disabled = control !== null && (control.hasAttribute('disabled') || control.getAttribute('aria-disabled') === 'true');
    return control === null || disabled ? title : null;
  }
  return null;
}

export default function TouchTitles() {
  const [bubble, setBubble] = useState<Bubble | null>(null);

  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') return;
      // Read at the point, not the target: a disabled button is not always
      // an event's target.
      const text = titleForTap(document.elementFromPoint(e.clientX, e.clientY));
      setBubble(text ? { text, x: e.clientX, y: e.clientY } : null);
    };
    document.addEventListener('pointerdown', onDown, true);
    return () => document.removeEventListener('pointerdown', onDown, true);
  }, []);

  useEffect(() => {
    if (!bubble) return;
    const timer = window.setTimeout(() => setBubble(null), SHOW_MS);
    return () => window.clearTimeout(timer);
  }, [bubble]);

  if (!bubble) return null;
  // Above the finger, kept on screen: a 260px bubble centred on the tap,
  // clamped to a 12px margin.
  const width = Math.min(260, window.innerWidth - 24);
  const left = Math.max(12, Math.min(window.innerWidth - width - 12, bubble.x - width / 2));
  const below = bubble.y < 120;
  return (
    <div
      className="touch-title"
      role="tooltip"
      style={{ left, width, ...(below ? { top: bubble.y + 28 } : { bottom: window.innerHeight - bubble.y + 28 }) }}
    >
      {bubble.text}
    </div>
  );
}
