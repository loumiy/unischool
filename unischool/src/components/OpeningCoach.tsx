import type { Action } from '../state/actions';
import type { GameState } from '../state/types';
import { isCoachStage, OPENING_STEPS, SKIP_WORDS, WALKTHROUGH_LENGTH } from '../data/openingData';
import { isActivationTarget, isKey, useHotkeys } from './hotkeys';
import ConfirmButton from './ConfirmButton';
import { openingSkipped } from '../analytics/analytics';

// The opening walkthrough's card. state/opening.ts owns the stages and
// data/openingData.ts the copy; this only draws the current step. The
// welcome is a modal (the one step with a decline); every other step is a
// coach card pinned top-right (clear of the hall just placed and of the
// building panel, Plan 78F) with no backdrop, since the player has to
// work the screen under it. A step that ends on something done has no Next
// button, but offers to reopen the door it needs (build menu, Founders
// Hall's panel) so wandering off is never a dead end, and every card can
// skip the rest, so a step the player can't finish never holds the clock. A skip asks first
// (Plan 104C, ConfirmButton's question): the walk doesn't come back. Enter presses Next,
// guarded so a focused button keeps its own Enter.
export default function OpeningCoach({ s, act, buildOpen, hallOpen, placing, onOpenBuild, onOpenHall }: {
  s: GameState;
  act: (a: Action) => void;
  buildOpen: boolean;
  // Whether Founders Hall's panel is open on the map (see App.tsx).
  hallOpen: boolean;
  // A building in hand: on a phone the map's touch bar (its Place button)
  // takes the top of the screen, so the card steps aside (styles.css).
  placing: boolean;
  onOpenBuild: () => void;
  onOpenHall: () => void;
}) {
  const stage = s.events.opening.stage;
  const step = isCoachStage(stage) ? OPENING_STEPS[stage] : null;

  useHotkeys((e) => {
    if (!isKey(e, 'answer') || !step?.next || isActivationTarget(e.target)) return;
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
          <p className="letter-length">{WALKTHROUGH_LENGTH}</p>
          <div className="modal-actions letter-actions">
            <button type="button" onClick={() => act({ type: 'ADVANCE_OPENING' })}>{step.next}</button>
          </div>
          <div className="letter-skip-row">
            <ConfirmButton
              className="letter-skip-link"
              label={SKIP_WORDS.welcome}
              armedLabel={SKIP_WORDS.confirm}
              warning={SKIP_WORDS.question}
              cancelLabel={SKIP_WORDS.keep}
              onConfirm={() => { openingSkipped(stage, false); act({ type: 'SKIP_OPENING' }); }}
            />
          </div>
        </div>
      </div>
    );
  }

  const doors = {
    build: { open: buildOpen, label: 'Open the build menu', go: onOpenBuild },
    hall: { open: hallOpen, label: 'Open Founders Hall', go: onOpenHall },
  };
  const door = step.door ? doors[step.door] : undefined;
  const doorOpen = door?.open ?? true;
  const doorLabel = door?.label;
  const onDoor = door?.go;

  return (
    // On a phone the hall's panel and a tab take the top of the screen, so a
    // step done in one drops the card to the foot, over the dock (styles.css).
    <aside className={`opening-coach${step.door === 'hall' && hallOpen ? ' under-panel' : ''}${placing ? ' placing' : ''}`} role="status" aria-live="polite" aria-label={step.title}>
      <p className="letter-eyebrow">{step.eyebrow}</p>
      <h2>{step.title}</h2>
      <p>{step.body(s)}</p>
      <div className="opening-coach-actions">
        {step.next && (
          <button type="button" onClick={() => act({ type: 'ADVANCE_OPENING' })}>{step.next}</button>
        )}
        {step.door && !doorOpen && (
          <button type="button" onClick={onDoor}>{doorLabel}</button>
        )}
        {step.door && doorOpen && (
          <span className="opening-coach-wait">The clock is held until this is done</span>
        )}
      </div>
      <ConfirmButton
        className="letter-skip"
        label={SKIP_WORDS.rest}
        armedLabel={SKIP_WORDS.confirm}
        warning={SKIP_WORDS.question}
        cancelLabel={SKIP_WORDS.keep}
        onConfirm={() => { openingSkipped(stage, true); act({ type: 'SKIP_OPENING', keepLetters: true }); }}
      />
    </aside>
  );
}
