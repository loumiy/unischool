import { type ReactNode } from 'react';
import { CloseIcon } from './icons';

// The full-viewport frame every view other than the campus map renders in
// (see App.tsx): a titled header, a close button and a scroll container.
// The bottom dock (log ticker + toolbar) is laid over it, so this sits below
// the toolbar's layer (see styles.css), and .tab-overlay-body pads its bottom
// by --toolbar-height + --log-ticker-height so no content hides behind it.
// Unlike InterruptModal.tsx this is a dismissible view, and the interrupt
// modal's higher layer still covers it. Escape is not bound here: App.tsx
// owns the one Escape ladder for the whole shell.
// `split`: the body does not scroll as one page; its child fills it and
// scrolls its own panes (the inbox's list and reading pane, Plan 77).
// No `onClose`: the view cannot be left (the inbox while a stop waits on
// an answer, Plan 77).
export default function TabOverlay({ title, onClose, split = false, children }: {
  title: string;
  onClose?: () => void;
  split?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="tab-overlay" role="dialog" aria-modal="false" aria-label={title}>
      <div className="tab-overlay-head">
        <h2>{title}</h2>
        {onClose ? (
          <button type="button" className="tab-overlay-close" onClick={onClose} aria-label={`Close ${title}`}>
            Close <CloseIcon />
          </button>
        ) : (
          <span className="tab-overlay-held">Answer to go on</span>
        )}
      </div>
      <div className={`tab-overlay-body${split ? ' split' : ''}`}>{children}</div>
    </div>
  );
}
