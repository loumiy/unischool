import { type ReactNode } from 'react';
import { useHotkeys } from './hotkeys';

// Every view other than the campus map opens as an overlay ON TOP of the
// map (see App.tsx) rather than replacing it, so the map is the one screen
// the player always returns to. The tab components underneath are rendered
// unchanged — this only supplies the frame: a titled header with a close
// button, Escape-to-dismiss, and the scroll container the tab's own
// content sits in.
//
// Deliberately NOT the interrupt modal (InterruptModal.tsx): an interrupt
// halts the clock and must be resolved, while these are dismissible views.
// The interrupt modal sits at a higher layer, so it still covers this.
//
// TWO SHAPES, one frame. `fullBleed` picks between them, and which tabs ask
// for it is App.tsx's call (see FULL_BLEED_TABS there) — the tab components
// themselves still know nothing about how they are framed.
//
//   - The SHEET (default): a bordered card floating over a dimmed map, sized
//     to its content. Right for a view you dip into and leave — Treasury,
//     Admissions, History — where a full screen would only make a short page
//     look empty, and where keeping the map visible around the edges is the
//     reminder that you are one Escape from it.
//
//   - FULL BLEED: the tab owns the viewport and the bottom dock (log ticker
//     + toolbar) is laid OVER it rather than covered by it. Right for a view
//     the player works IN — a large canvas that wants every pixel, and wants
//     its own tools reachable without closing it first. This is what the
//     curriculum's map-shaped view needs, and it reads as a screen rather
//     than as a dialog standing in front of one.
//
// The dock staying on top is the whole point of the mode, and it is why a
// full-bleed backdrop sits BELOW the toolbar's layer rather than above it
// (see styles.css) — the ONE thing the two shapes genuinely disagree about.
// Everything below the dock's own height is reserved rather than drawn into:
// .tab-overlay-body pads its bottom by --toolbar-height + --log-ticker-height,
// for exactly the reason .campus-map-canvas insets by the same figures — the
// toolbar is opaque and always on screen, so content rendered behind it would
// be on screen but permanently unreachable.
export default function TabOverlay({ title, onClose, fullBleed = false, children }: {
  title: string;
  onClose: () => void;
  fullBleed?: boolean;
  children: ReactNode;
}) {
  // Escape closes the sheet. The map binds Escape too (to drop a path tool
  // or a picked-up building), but App.tsx keeps the map's hotkeys switched
  // off for exactly as long as an overlay is open, so only one of the two
  // is ever listening.
  useHotkeys((e) => {
    if (e.key === 'Escape') onClose();
  });

  const mode = fullBleed ? ' full-bleed' : '';

  return (
    // Click-to-dismiss on the backdrop is a SHEET affordance: in full-bleed
    // the panel covers the backdrop edge to edge, so there is no backdrop
    // left to click and the handler simply never fires. Escape and the close
    // button are what dismiss a full-bleed view.
    <div className={`tab-overlay-backdrop${mode}`} onClick={onClose}>
      {/* Clicks inside the sheet must not reach the backdrop's dismiss. */}
      <div className={`tab-overlay${mode}`} role="dialog" aria-modal="false" aria-label={title} onClick={(e) => e.stopPropagation()}>
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
