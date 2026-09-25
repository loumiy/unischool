import type { Action } from '../state/actions';
import type { GameState } from '../state/types';
import { OPENING_STEPS } from '../data/openingData';
import { isActivationTarget, useHotkeys } from './hotkeys';

// The opening walkthrough's card. state/opening.ts owns the stages and
// data/openingData.ts the copy; this only draws the current step. The
// welcome is a modal (the one step with a decline); every other step is a
// coach card pinned top-center with no backdrop, since the player has to
// work the screen under it. A step that ends on something done has no Next
// button, but offers to reopen the door it needs (build menu, Founders
// Hall's panel) so wandering off is never a dead end, and every card can
// skip the rest, so a step the player can't finish never holds the clock. Enter presses Next,
// guarded so a focused button keeps its own Enter.
export default function OpeningCoach({ s, act, buildOpen, hallOpen, onOpenBuild, onOpenHall }: {
  s: GameState;
  act: (a: Action) => void;
  buildOpen: boolean;
  // Whether Founders Hall's panel is open on the map (see App.tsx).
  hallOpen: boolean;
  onOpenBuild: () => void;
  onOpenHall: () => void;
}) {
  const stage = s.events.opening.stage;
  const step = stage === 'play' ? null : OPENING_STEPS[stage];

  useHotkeys((e) => {
    if (e.key !== 'Enter' || !step?.next || isActivationTarget(e.target)) return;
    e.preventDefault();
    act({ type: 'ADVANCE_OPENING' });
  }, step !== null && step.next !== undefined);

  if (!step) return null;

  if (stage === 'welcome') {
    return (
      <div className="modal-backdrop">
        <div className="modal modal-narrow" data-interrupt="welcome" role="dialog" aria-modal="true" aria-label={step.title}>
          <p className="letter-eyebrow">{step.eyebrow}</p>
          <h2>{step.title}</h2>
          <p className="letter-body">{step.body(s)}</p>
          <div className="letter-actions">
            <button type="button" onClick={() => act({ type: 'ADVANCE_OPENING' })}>{step.next}</button>
            <button type="button" className="letter-skip" onClick={() => act({ type: 'SKIP_OPENING' })}>
              I know the way — skip the walkthrough and the letters
            </button>
          </div>
        </div>
      </div>
    );
  }

  const doorOpen = step.door === 'build' ? buildOpen : step.door === 'hall' ? hallOpen : true;
  const doorLabel = step.door === 'build' ? 'Open the build menu' : 'Open Founders Hall';

  return (
    <aside className="opening-coach" role="status" aria-live="polite" aria-label={step.title}>
      <p className="letter-eyebrow">{step.eyebrow}</p>
      <h2>{step.title}</h2>
      <p>{step.body(s)}</p>
      <div className="opening-coach-actions">
        {step.next && (
          <button type="button" onClick={() => act({ type: 'ADVANCE_OPENING' })}>{step.next}</button>
        )}
        {step.door && !doorOpen && (
          <button type="button" onClick={step.door === 'build' ? onOpenBuild : onOpenHall}>{doorLabel}</button>
        )}
        {step.door && doorOpen && (
          <span className="opening-coach-wait">The clock is held until this is done</span>
        )}
      </div>
      <button type="button" className="letter-skip" onClick={() => act({ type: 'SKIP_OPENING', keepLetters: true })}>
        Skip the rest of the walkthrough
      </button>
    </aside>
  );
}
