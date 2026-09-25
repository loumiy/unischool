import { useState, type ReactNode } from 'react';

// The one way the game asks before something that loses or commits for good
// (Plan 47): the first click arms the button, which changes its label and,
// if given, shows what will be lost; the second click acts. Clicking or
// tabbing away, or Escape, puts it back. `needsConfirm: false` acts on the
// first click, for the case where there is nothing to lose this time.
export default function ConfirmButton({
  label, armedLabel, warning, onConfirm, className = '', disabled, title, needsConfirm = true,
}: {
  label: ReactNode;
  armedLabel: ReactNode;
  warning?: ReactNode;
  onConfirm: () => void;
  className?: string;
  disabled?: boolean;
  title?: string;
  needsConfirm?: boolean;
}) {
  const [armed, setArmed] = useState(false);
  return (
    <span className={`confirm-button${armed ? ' is-armed' : ''}`}>
      <button
        type="button"
        className={`${className}${armed ? ' confirm-armed' : ''}`}
        disabled={disabled}
        title={title}
        aria-pressed={armed}
        onClick={() => {
          if (needsConfirm && !armed) { setArmed(true); return; }
          setArmed(false);
          onConfirm();
        }}
        onBlur={() => setArmed(false)}
        onKeyDown={(e) => { if (e.key === 'Escape' && armed) { e.stopPropagation(); setArmed(false); } }}
      >
        {armed ? armedLabel : label}
      </button>
      {armed && warning && <span className="confirm-warning" role="note">{warning}</span>}
    </span>
  );
}
