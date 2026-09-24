import { type ReactNode } from 'react';

// The full-viewport frame every view other than the campus map renders in
// (see App.tsx): a titled header, a close button and a scroll container.
// The bottom dock (log ticker + toolbar) is laid over it, so this sits below
// the toolbar's layer (see styles.css), and .tab-overlay-body pads its bottom
// by --toolbar-height + --log-ticker-height so no content hides behind it.
// Unlike InterruptModal.tsx this is a dismissible view, and the interrupt
// modal's higher layer still covers it. Escape is not bound here: App.tsx
// owns the one Escape ladder for the whole shell.
export default function TabOverlay({ title, onClose, children }: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="tab-overlay" role="dialog" aria-modal="false" aria-label={title}>
      <div className="tab-overlay-head">
        <h2>{title}</h2>
        <button type="button" className="tab-overlay-close" onClick={onClose} aria-label={`Close ${title}`}>
          close ✕
        </button>
      </div>
      <div className="tab-overlay-body">{children}</div>
    </div>
  );
}
