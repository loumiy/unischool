import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import Keyed from './Keyed';

// A small, dismissible '?' toggle for panel explainer copy that's useful
// once but busy if it's always on screen (see
// docs/architecture/ui-shell.md-adjacent UI notes) — the explanation is one
// click away instead of permanently taking up space as an italic paragraph
// under every panel heading. `align="end"` opens the popup leftward instead
// of rightward, for a hint sitting at a panel's right edge (see
// TreasuryTab.tsx) where the default would run off-screen.
// An objective's help in the drawer (Plan 112A, ObjectivesPanel.tsx) is
// one too: `label` names what it explains, and `children` (its Show me)
// sit under the words. Opening one closes any other, since the click that
// opens it lands outside the one already open.
// A legend row (Plan 125 B): a mark as the panel draws it, and what it
// means in a few words. A panel whose help explained its marks in prose
// shows them instead, with the rules that are not about marks as short
// lines under them (`text`, split on a blank line).
export interface LegendRow { mark: ReactNode; says: string }

export default function HelpHint({ text, align = 'start', label, children, legend }: {
  text: string;
  align?: 'start' | 'end';
  label?: string;
  children?: ReactNode;
  legend?: readonly LegendRow[];
}) {
  const [open, setOpen] = useState(false);
  const [nudge, setNudge] = useState(0);
  const root = useRef<HTMLSpanElement>(null);
  const popup = useRef<HTMLDivElement & HTMLParagraphElement>(null);
  const id = useId();
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
    // Focus goes back to the button, so a keyboard player is where they
    // were.
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      setOpen(false);
      if (root.current?.contains(document.activeElement)) root.current.querySelector('button')?.focus();
    };
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
        aria-controls={open ? id : undefined}
        aria-label={label ?? (open ? 'Hide explanation' : 'Explain this panel')}
        onClick={() => setOpen((v) => !v)}
      >
        ?
      </button>
      {open && (legend !== undefined ? (
        <div
          ref={popup}
          id={id}
          role="group"
          aria-label={label ?? 'What the marks mean'}
          className={`help-hint-text help-hint-card help-hint-legend ${align === 'end' ? 'align-end' : ''}`}
          style={nudge ? { transform: `translateX(${nudge}px)` } : undefined}
        >
          <dl>
            {legend.map((row) => (
              <div key={row.says} className="help-legend-row"><dt>{row.mark}</dt><dd>{row.says}</dd></div>
            ))}
          </dl>
          {text.split(/\n\s*\n/).filter(Boolean).map((line) => <p key={line}><Keyed text={line} /></p>)}
          {children}
        </div>
      ) : children === undefined ? (
        <p
          ref={popup}
          id={id}
          className={`help-hint-text ${align === 'end' ? 'align-end' : ''}`}
          style={nudge ? { transform: `translateX(${nudge}px)` } : undefined}
        >
          <Keyed text={text} />
        </p>
      ) : (
        <div
          ref={popup}
          id={id}
          role="group"
          aria-label={label}
          className={`help-hint-text help-hint-card ${align === 'end' ? 'align-end' : ''}`}
          style={nudge ? { transform: `translateX(${nudge}px)` } : undefined}
        >
          <p><Keyed text={text} /></p>
          {children}
        </div>
      ))}
    </span>
  );
}
