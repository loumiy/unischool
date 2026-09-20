import type { Action } from '../state/actions';
import type { GameState } from '../state/types';
import { OPENING_STEPS } from '../data/openingData';
import { isActivationTarget, useHotkeys } from './hotkeys';

// THE OPENING WALKTHROUGH'S CARD (see state/opening.ts, which owns the
// stages and the transitions, and data/openingData.ts, which owns the
// copy; this only draws the current one). Two shapes:
//
//   - The WELCOME is a modal: backdrop, the modal card, the board's
//     eyebrow — the same register as a letter from the chair, because it
//     is one. It is the one step with a decline.
//   - Every other step is a COACH CARD pinned to the top-centre of the
//     screen with no backdrop, because the player has to work the screen
//     under it: click a tile in the build menu, click the ground, click a
//     course. It sits above a full-screen tab and below the build popup's
//     layer only in the sense of not overlapping it — the popup is at the
//     foot of the screen, this is at the head.
//
// A step that ends on a click carries the button. A step that ends on
// something DONE carries no button — the instruction is the whole card —
// and instead offers to open the door it needs (the build menu, Founders
// Hall's panel on the map) when the player has not, or closed it, so
// wandering off the step is never a dead end. Enter presses Next, guarded
// the way the interrupt modal guards it, so a Tab-focused button keeps its
// own Enter.
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
          <button type="button" onClick={() => act({ type: 'ADVANCE_OPENING' })}>{step.next}</button>
          <button type="button" className="letter-skip" onClick={() => act({ type: 'SKIP_OPENING' })}>
            I know the way — skip the walkthrough and the letters
          </button>
        </div>
      </div>
    );
  }

  const doorOpen = step.door === 'build' ? buildOpen : step.door === 'hall' ? hallOpen : true;
  const doorLabel = step.door === 'build' ? 'Open the Build menu' : 'Open Founders Hall';

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
    </aside>
  );
}
