import { type ReactNode } from 'react';
import { useHotkeys } from './hotkeys';

// Every view other than the campus map opens as an overlay ON TOP of the
// map (see App.tsx) rather than replacing it, so the map is the one screen
// the player always returns to. The tab components underneath are rendered
// unchanged — this only supplies the frame: a dimmed backdrop, a titled
// header with a close button, Escape-to-dismiss, and the scroll container
// the tab's own content sits in.
//
// Deliberately NOT the interrupt modal (InterruptModal.tsx): an interrupt
// halts the clock and must be resolved, while these are dismissible views.
// The interrupt modal sits at a higher layer, so it still covers this.
export default function TabOverlay({ title, onClose, children }: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  // Escape closes the sheet. The map binds Escape too (to drop a path tool
  // or a picked-up building), but App.tsx keeps the map's hotkeys switched
  // off for exactly as long as an overlay is open, so only one of the two
  // is ever listening.
  useHotkeys((e) => {
    if (e.key === 'Escape') onClose();
  });

  return (
    <div className="tab-overlay-backdrop" onClick={onClose}>
      {/* Clicks inside the sheet must not reach the backdrop's dismiss. */}
      <div className="tab-overlay" role="dialog" aria-modal="false" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="tab-overlay-head">
          <h2>{title}</h2>
          <button type="button" className="tab-overlay-close" onClick={onClose} aria-label={`Close ${title}`}>
            close ✕
          </button>
        </div>
        <div className="tab-overlay-body">{children}</div>
      </div>
    </div>
  );
}
