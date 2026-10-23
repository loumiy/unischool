import { useId, useState, type FocusEvent, type ReactNode } from 'react';

// The one way the game asks before something that loses or commits for good
// (Plan 47): the first click arms the button, which changes its label and,
// if given, shows what will be lost; the second click acts. Clicking or
// tabbing away, or Escape, puts it back. `needsConfirm: false` acts on the
// first click, for the case where there is nothing to lose this time.
//
// With `cancelLabel` the armed state is a question (Plan 104C, the
// walkthrough's skip): the warning reads first, as the question, over the
// armed button and a second one that puts it back, so declining is a button
// too and not only a click elsewhere. The button keeps its place in the DOM
// either way (styles.css moves the question up), so arming never loses focus.
//
// `tone` (Plan 111 PR E): armed, a loss that can't be undone (closing,
// demolishing, dismissing, erasing) turns red; a commitment (a move, a
// purchase, an appointment) arms in the primary fill, since a red button
// read as Cancel (Playtest 1, S3). The armed label says what happens.
export default function ConfirmButton({
  label, armedLabel, warning, onConfirm, className = '', disabled, title, ariaLabel, needsConfirm = true, cancelLabel, tone = 'loss',
}: {
  label: ReactNode;
  armedLabel: ReactNode;
  warning?: ReactNode;
  onConfirm: () => void;
  className?: string;
  disabled?: boolean;
  title?: string;
  // For a label that is only an icon; armed, the words name it.
  ariaLabel?: string;
  needsConfirm?: boolean;
  cancelLabel?: ReactNode;
  tone?: 'loss' | 'commit';
}) {
  const [armed, setArmed] = useState(false);
  const warningId = useId();
  const question = armed && cancelLabel !== undefined;
  // Focus moving between the question's two buttons keeps it armed.
  const onBlur = (e: FocusEvent<HTMLButtonElement>) => {
    const to = e.relatedTarget as Node | null;
    if (!question || !to || !e.currentTarget.parentElement?.contains(to)) setArmed(false);
  };
  const onKeyDown = (e: { key: string; stopPropagation: () => void }) => {
    if (e.key === 'Escape' && armed) { e.stopPropagation(); setArmed(false); }
  };
  return (
    <span className={`confirm-button${armed ? ' is-armed' : ''}${question ? ' has-question' : ''}`}>
      <button
        type="button"
        className={`${className}${armed ? ` confirm-armed${tone === 'commit' ? ' confirm-commit' : ''}` : ''}`}
        disabled={disabled}
        title={title}
        aria-label={armed ? undefined : ariaLabel}
        aria-pressed={armed}
        aria-describedby={armed && warning ? warningId : undefined}
        onClick={() => {
          if (needsConfirm && !armed) { setArmed(true); return; }
          setArmed(false);
          onConfirm();
        }}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
      >
        {armed ? armedLabel : label}
      </button>
      {question && (
        <button type="button" className="btn-quiet confirm-cancel" onClick={() => setArmed(false)} onBlur={onBlur} onKeyDown={onKeyDown}>
          {cancelLabel}
        </button>
      )}
      {armed && warning && <span className="confirm-warning" id={warningId} role="note">{warning}</span>}
    </span>
  );
}
