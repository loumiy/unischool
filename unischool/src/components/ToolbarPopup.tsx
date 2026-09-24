import { type ReactNode } from 'react';

// The compact card a toolbar icon pops open (see Toolbar.tsx's build and log
// buttons). Deliberately not TabOverlay: it renders no backdrop, so the campus
// map stays visible and clickable outside the card while choosing a building.
// Position is the caller's job via `className` (styles.css's .build-popup /
// .log-popup). It binds no keys: App.tsx owns the one Escape ladder.
export default function ToolbarPopup({ title, headExtra, onClose, className, children }: {
  title: string;
  headExtra?: ReactNode;
  onClose: () => void;
  className?: string;
  children: ReactNode;
}) {
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
