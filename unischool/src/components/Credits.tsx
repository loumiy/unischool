import { useHotkeys } from './hotkeys';
import { CloseIcon } from './icons';
import { buildLine } from '../build';
import { statsAvailable } from '../analytics/analytics';

// THE CREDITS (Plan 34, from v2's). The game is credited to Halifax Games,
// a pseudonym for now, with a footnote saying AI tools helped make it
// (Plan 97C, the owner's decision). What was made with them, part by part,
// is in docs/store/ai-disclosure.md and on the store pages.
export default function Credits({ onClose }: { onClose: () => void }) {
  useHotkeys((e) => { if (e.key === 'Escape') onClose(); });
  return (
    <div className="front-screen" role="dialog" aria-modal="true" aria-label="Credits">
      <section className="title-card credits">
        <div className="hall-head">
          <h2 className="hall-title">UniSchool</h2>
          <button type="button" className="close-btn" onClick={onClose} aria-label="Close"><CloseIcon /></button>
        </div>
        <p className="credits-lede">Fifty years to build a university.</p>
        <dl className="credits-list">
          <dt>Design and direction</dt>
          <dd>Halifax Games<sup className="credits-mark" aria-hidden="true">*</sup></dd>
          <dt>Made with</dt>
          <dd>React, TypeScript, Vite and the Web Audio API</dd>
          <dt>This build</dt>
          <dd>{buildLine()}</dd>
        </dl>
        {/* The privacy line (Plan 97E): true of a build that can send
            statistics, and of one that cannot. */}
        <p className="review-empty">
          {statsAvailable()
            ? 'Your runs and settings live on this device. If you allow it, the game sends anonymous play statistics: no names and nothing you type. Turn it off in Settings.'
            : 'Your runs, your settings and your hall of fame live in this browser and nowhere else.'}
        </p>
        <p className="credits-footnote"><span aria-hidden="true">* </span>Made with the help of AI tools.</p>
      </section>
    </div>
  );
}
