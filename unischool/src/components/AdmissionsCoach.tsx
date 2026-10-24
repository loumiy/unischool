import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { money } from '../format';

// ---------------------------------------------------------------------
// The first summer, walked through (Plan 112C). A player in a guided run
// met the admissions page cold, and one playtester never found that the
// line on the plot moves: he took the opening standard every summer. So
// on the first summer of a guided run (gates.ts's guidedRun) the page
// steps through its controls as the opening walkthrough steps through
// Founders Hall (OpeningCoach.tsx, whose card this wears): a small card
// beside each control in turn, the control rung, the price, its lock, the
// applicants, the line, the class it makes, and the offers. A step moves on
// when its control is used, or on Next; the tips can be put away at any
// step. Not saved: a reload in the summer walks it again.
// ---------------------------------------------------------------------

export type CoachStep = 'tuition' | 'lock' | 'applicants' | 'line' | 'rate' | 'send';
export const COACH_ORDER: readonly CoachStep[] = ['tuition', 'lock', 'applicants', 'line', 'rate', 'send'];

// Where a card sits against its control: beside it, on the left (the
// panel's controls, with the plot to their left), or off to the right of
// the line's handle, below it or, low on the plot, above its label, or
// inside the top corner (the plot itself).
type Side = 'left' | 'beside-handle' | 'inside';
// Where it landed, for the notch.
type Placed = 'left' | 'below' | 'below-right' | 'above-right' | 'inside';
// The handle's label above it to the right (AdmissionsPage.tsx), cleared
// by a card placed above.
const LABEL_RISE = 40;

interface CoachCopy {
  title: string;
  body: (ctx: { expect: number }) => string;
  // Absent where the control itself is the way on (the lock, the offers).
  next?: string;
  side: Side;
}

export const COACH_COPY: Record<CoachStep, CoachCopy> = {
  tuition: {
    title: 'Set the price',
    body: ({ expect }) => `Drag the tuition slider. The words under the price say how it compares with your prestige, from a bargain to far too much. Families expect about ${money(expect)}. This class pays it for all four years.`,
    next: 'Next',
    side: 'left',
  },
  lock: {
    title: 'Lock the price',
    body: () => "You see who applies only once the price is locked, and it can't change after. Lock it when it looks right.",
    side: 'left',
  },
  applicants: {
    title: 'Your applicants',
    body: () => 'Each dot is one or more applicants, placed by SAT across and GPA up, and coloured by who they are. The strongest students sit up and to the right.',
    next: 'Next',
    side: 'inside',
  },
  line: {
    title: 'Raise the bar',
    body: () => 'Everyone above this line gets an offer. Drag its handle up to be more selective and get a smaller, stronger class. Drag it down to admit more. The arrow keys move it too.',
    next: 'Next',
    side: 'beside-handle',
  },
  rate: {
    title: 'Read the class',
    body: () => 'The admit rate, the class size and its quality follow the line. So do the money and the mood below. The line stops where the hall is full.',
    next: 'Next',
    side: 'left',
  },
  send: {
    title: 'Send the offers',
    body: () => 'When the class looks right, send the offers. The admitted take their seats in the hall, and the summer moves on to the students.',
    side: 'left',
  },
};

const GAP = 16;

// The card, placed beside the control marked `data-coach="<step>"` inside
// the page (the scrolling `.admissions-page`, the card's containing block:
// a child's layout effect runs before the page's ref is set), and kept
// there as the page lays out again.
export default function AdmissionsCoach({ step, expect, layoutKey, onNext, onDismiss }: {
  step: CoachStep;
  // What families expect to pay, for the price's card.
  expect: number;
  // Anything that moves the control (the line's place): re-measured on it.
  layoutKey: string;
  onNext: () => void;
  onDismiss: () => void;
}) {
  const copy = COACH_COPY[step];
  const card = useRef<HTMLElement>(null);
  // `notch`: where the notch points, down the card, when it is not the middle.
  const [place, setPlace] = useState<{ top: number; left: number; side: Placed; notch?: number } | null>(null);

  // The offers stick to the panel's foot (Plan 114G). Their step scrolls the
  // page to the panel's end first, where the button stands in its own place,
  // so the card measured beside it stays beside it. Before the measure,
  // which runs next; once per step, not as the line moves.
  useLayoutEffect(() => {
    if (step !== 'send') return;
    const target = card.current?.closest('.admissions-page')?.querySelector(`[data-coach="${step}"]`);
    target?.closest('.admissions-panel')?.scrollIntoView({ block: 'end' });
  }, [step]);

  useLayoutEffect(() => {
    const measure = () => {
      const el = card.current;
      const root = el?.closest('.admissions-page');
      const target = root?.querySelector(`[data-coach="${step}"]`);
      if (!root || !target || !el) return;
      const r = root.getBoundingClientRect();
      const t = target.getBoundingClientRect();
      const w = el.offsetWidth, h = el.offsetHeight;
      // Page coordinates, which scroll with the page.
      const x = t.left - r.left + root.scrollLeft, y = t.top - r.top + root.scrollTop;
      const maxLeft = root.clientWidth - w - GAP;
      if (copy.side === 'inside') {
        setPlace({ top: y + GAP, left: Math.min(maxLeft, x + GAP), side: 'inside' });
      } else if (copy.side === 'beside-handle') {
        const left = Math.max(GAP, Math.min(maxLeft, x + t.width + GAP / 2));
        // Low on the page, the card goes above the handle's label.
        if (t.top - r.top > root.clientHeight / 2) setPlace({ top: Math.max(GAP, y - LABEL_RISE - h), left, side: 'above-right' });
        else setPlace({ top: y + t.height + GAP / 2, left, side: 'below-right' });
      } else if (x - w - GAP >= GAP) {
        // Kept above the fold, so the stuck offers' card shows whole
        // (Plan 114G); the notch still points at the control.
        const mid = y + t.height / 2;
        const top = Math.max(GAP, Math.min(mid - h / 2, root.scrollTop + root.clientHeight - h - GAP));
        setPlace({ top, left: x - w - GAP, side: 'left', notch: mid - top });
      } else {
        // No room beside it (a narrow screen, the panel under the plot).
        setPlace({ top: y + t.height + GAP / 2, left: Math.max(GAP, Math.min(maxLeft, x)), side: 'below' });
      }
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [step, layoutKey, copy.side]);

  const n = COACH_ORDER.indexOf(step) + 1;
  return (
    <aside
      ref={card}
      className={`opening-coach admissions-coach side-${place?.side ?? 'left'}`}
      style={place ? { top: place.top, left: place.left, ...(place.notch !== undefined ? { '--notch': `${place.notch}px` } as CSSProperties : {}) } : { visibility: 'hidden' }}
      role="status"
      aria-live="polite"
      aria-label={copy.title}
    >
      <p className="letter-eyebrow">Your first admissions · {n} of {COACH_ORDER.length}</p>
      <h2>{copy.title}</h2>
      <p>{copy.body({ expect })}</p>
      <div className="opening-coach-actions">
        {copy.next && <button type="button" onClick={onNext}>{copy.next}</button>}
        <button type="button" className="secondary" onClick={onDismiss}>Hide these tips</button>
      </div>
    </aside>
  );
}
