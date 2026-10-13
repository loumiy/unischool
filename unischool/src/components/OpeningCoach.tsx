import type { Action } from '../state/actions';
import type { GameState } from '../state/types';
import { isCoachStage, OPENING_STEPS } from '../data/openingData';
import { isActivationTarget, isKey, useHotkeys } from './hotkeys';

// The opening walkthrough's card. state/opening.ts owns the stages and
// data/openingData.ts the copy; this only draws the current step. The
// welcome is a modal (the one step with a decline); every other step is a
// coach card pinned top-right (clear of the hall just placed and of the
// building panel, Plan 78F) with no backdrop, since the player has to
// work the screen under it. A step that ends on something done has no Next
// button, but offers to reopen the door it needs (build menu, Founders
// Hall's panel, the Curriculum, Students) so wandering off is never a dead end, and every card can
// skip the rest, so a step the player can't finish never holds the clock. Enter presses Next,
// guarded so a focused button keeps its own Enter.
export default function OpeningCoach({ s, act, buildOpen, hallOpen, curriculumOpen, studentsOpen, placing, onOpenBuild, onOpenHall, onOpenCurriculum, onOpenStudents }: {
  s: GameState;
  act: (a: Action) => void;
  buildOpen: boolean;
  // Whether Founders Hall's panel is open on the map (see App.tsx).
  hallOpen: boolean;
  curriculumOpen: boolean;
  studentsOpen: boolean;
  // A building in hand: on a phone the map's touch bar (its Place button)
  // takes the top of the screen, so the card steps aside (styles.css).
  placing: boolean;
  onOpenBuild: () => void;
  onOpenHall: () => void;
  onOpenCurriculum: () => void;
  onOpenStudents: () => void;
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
          <div className="modal-actions letter-actions">
            <button type="button" onClick={() => act({ type: 'ADVANCE_OPENING' })}>{step.next}</button>
            <button type="button" className="letter-skip" onClick={() => act({ type: 'SKIP_OPENING' })}>
              Skip the walkthrough and the letters
            </button>
          </div>
        </div>
      </div>
    );
  }

  const doors = {
    build: { open: buildOpen, label: 'Open the build menu', go: onOpenBuild },
    hall: { open: hallOpen, label: 'Open Founders Hall', go: onOpenHall },
    curriculum: { open: curriculumOpen, label: 'Open the Curriculum', go: onOpenCurriculum },
    students: { open: studentsOpen, label: 'Open Students', go: onOpenStudents },
  };
  const door = step.door ? doors[step.door] : undefined;
  const doorOpen = door?.open ?? true;
  const doorLabel = door?.label;
  // Over a tab, the card sits below the tab's header, clear of its Close;
  // over Students, at the foot, clear of the needs row it rings.
  const overTab = (step.door === 'curriculum' || step.door === 'students') && doorOpen;
  const onDoor = door?.go;

  return (
    // On a phone the hall's panel and a tab take the top of the screen, so a
    // step done in one drops the card to the foot, over the dock (styles.css).
    <aside className={`opening-coach${(step.door === 'hall' && hallOpen) || overTab ? ' under-panel' : ''}${overTab ? ' over-tab' : ''}${overTab && step.door === 'students' ? ' low' : ''}${placing ? ' placing' : ''}`} role="status" aria-live="polite" aria-label={step.title}>
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
      <button type="button" className="letter-skip" onClick={() => act({ type: 'SKIP_OPENING', keepLetters: true })}>
        Skip the rest of the walkthrough
      </button>
    </aside>
  );
}
