import { useEffect, useLayoutEffect, useRef, useState } from 'react';

// A small, dismissible '?' toggle for panel explainer copy that's useful
// once but busy if it's always on screen (see
// docs/architecture/ui-shell.md-adjacent UI notes) — the explanation is one
// click away instead of permanently taking up space as an italic paragraph
// under every panel heading. `align="end"` opens the popup leftward instead
// of rightward, for a hint sitting at a panel's right edge (see
// TreasuryTab.tsx) where the default would run off-screen.
export default function HelpHint({ text, align = 'start' }: { text: string; align?: 'start' | 'end' }) {
  const [open, setOpen] = useState(false);
  const [nudge, setNudge] = useState(0);
  const root = useRef<HTMLSpanElement>(null);
  const popup = useRef<HTMLParagraphElement>(null);
  // Kept on screen (Plan 70G): at phone width a hint near either edge would
  // open past it, so it slides back by what it overhangs, 8px in.
  useLayoutEffect(() => {
    if (!open || !popup.current) { setNudge(0); return; }
    const r = popup.current.getBoundingClientRect();
    const over = r.right - (window.innerWidth - 8);
    const under = 8 - r.left;
    setNudge(over > 0 ? -over : under > 0 ? under : 0);
  }, [open]);
  // Escape or a click anywhere else closes it (Plan 35: the map's long hint
  // stayed open over everything).
  useEffect(() => {
    if (!open) return;
    // Captured and stopped, so the Escape that closes the hint closes
    // nothing else (App.tsx's ladder and the map listen on window).
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); } };
    const onDown = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    window.addEventListener('keydown', onKey, true);
    document.addEventListener('pointerdown', onDown);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [open]);
  return (
    <span className="help-hint" ref={root}>
      <button
        type="button"
        className="help-hint-btn"
        aria-expanded={open}
        aria-label={open ? 'Hide explanation' : 'Explain this panel'}
        onClick={() => setOpen((v) => !v)}
      >
        ?
      </button>
      {open && (
        <p
          ref={popup}
          className={`help-hint-text ${align === 'end' ? 'align-end' : ''}`}
          style={nudge ? { transform: `translateX(${nudge}px)` } : undefined}
        >
          {text}
        </p>
      )}
    </span>
  );
}
