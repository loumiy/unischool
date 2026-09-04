import { useEffect, type ReactNode } from 'react';

// The compact card a toolbar icon pops open (see Toolbar.tsx's build and
// log buttons) — deliberately NOT TabOverlay: TabOverlay's whole point is a
// dimmed, click-to-dismiss backdrop covering the map, which is exactly
// wrong here. The build popup in particular has to leave the campus map
// visible and clickable everywhere outside its own box, since the point of
// popping it up from the toolbar rather than reusing the old side rail is
// choosing a building while still seeing where it'll go — see B2's one-step
// placement flow. So this renders NO backdrop at all: just a positioned
// parchment card (position is the caller's job, via `className` — see
// styles.css's .build-popup / .log-popup), floating above the toolbar the
// same way the old build rail / log strip floated over the map.
export default function ToolbarPopup({ title, headExtra, onClose, className, children }: {
  title: string;
  headExtra?: ReactNode;
  onClose: () => void;
  className?: string;
  children: ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className={`toolbar-popup ${className ?? ''}`} role="dialog" aria-label={title}>
      <div className="toolbar-popup-head">
        <span className="panel-head-title">
          <h2>{title}</h2>
          {headExtra}
        </span>
        <button type="button" className="toolbar-popup-close" onClick={onClose} aria-label={`Close ${title}`}>
          ✕
        </button>
      </div>
      <div className="toolbar-popup-body">{children}</div>
    </div>
  );
}
