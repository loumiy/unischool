import { useId, type ReactNode } from 'react';
import type { Sentence } from '../data/figureHints';

// ---------------------------------------------------------------------
// Every number explains itself (Plan 34, v2's Figure): a label, a value and
// one sentence saying what the number is, shown on hover and on keyboard
// focus. The sentence is required, and must be one: a Figure without it
// does not typecheck (test/figures.test.ts). The words live in
// data/figureHints.ts.
// ---------------------------------------------------------------------

// A label and a value inside a <dl>. In a panel's two-column grid the pair
// sits in the grid as if unwrapped; in the summer's outcome lists it is the
// row. The value takes the focus and anchors the explanation.
export default function Figure({ label, value, hint, className }: {
  label: ReactNode;
  value: ReactNode;
  hint: Sentence;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={`figure ${className ?? ''}`}>
      <dt>{label}</dt>
      <dd tabIndex={0} aria-describedby={id}>
        {value}
        <span className="figure-hint" role="tooltip" id={id}>{hint}</span>
      </dd>
    </div>
  );
}

// Anything else that is a number with a sentence behind it: the status
// bar's stats, drawn their own way. `above` opens the sentence upward, for
// the bar along the bottom of the screen. With `door` the figure is a button
// that opens where it is explained (Plan 78C), named by `door.name`; the
// sentence stays its description.
export function FigureBox({ hint, className, above, door, children }: {
  hint: Sentence;
  className?: string;
  above?: boolean;
  door?: { name: string; onOpen: () => void };
  children: ReactNode;
}) {
  const id = useId();
  const tip = <span className={`figure-hint ${above ? 'above' : ''}`} role="tooltip" id={id}>{hint}</span>;
  if (door) {
    return (
      <button type="button" className={`figure-box ${className ?? ''}`} aria-label={door.name} aria-describedby={id} onClick={door.onOpen}>
        {children}
        {tip}
      </button>
    );
  }
  return (
    <div className={`figure-box ${className ?? ''}`} tabIndex={0} aria-describedby={id}>
      {children}
      {tip}
    </div>
  );
}
