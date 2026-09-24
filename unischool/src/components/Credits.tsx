import { useHotkeys } from './hotkeys';

// THE CREDITS (Plan 34, from v2's).
export default function Credits({ onClose }: { onClose: () => void }) {
  useHotkeys((e) => { if (e.key === 'Escape') onClose(); });
  return (
    <div className="front-screen" role="dialog" aria-modal="true" aria-label="Credits">
      <section className="title-card credits">
        <div className="hall-head">
          <h2 className="hall-title">UniSchool</h2>
          <button type="button" className="toolbar-popup-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <p className="credits-lede">Fifty years to build a university.</p>
        <dl className="credits-list">
          <dt>Design and direction</dt>
          <dd>The UniSchool author, from the design documents in this repository</dd>
          <dt>Built with</dt>
          <dd>Claude Code, plan by plan</dd>
          <dt>Made with</dt>
          <dd>React, TypeScript, Vite and the Web Audio API</dd>
          <dt>With thanks to</dt>
          <dd>Every college that ever sent a letter about the car park</dd>
        </dl>
        <p className="review-empty">Your runs, your settings and your hall of fame live in this browser and nowhere else.</p>
      </section>
    </div>
  );
}
