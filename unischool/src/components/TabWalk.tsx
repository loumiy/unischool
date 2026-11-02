import { useEffect, useMemo, useState } from 'react';
import { TAB_WALKS, WALK_WORDS as W, type WalkStep, type WalkTab } from '../data/tabWalkData';

// A tab's walk (Plan 122G): a card at the foot of the screen that steps
// through the tab one section at a time, scrolling each into view and
// ringing it. The steps are data/tabWalkData.ts's; a step whose section the
// tab does not show yet is left out, read once when the walk starts (the
// tab is painted by then). Done or Skip ends it (`onEnd`); the shell marks
// the chapter's objective for the tab either way (App.tsx).
export default function TabWalk({ tab, label, onEnd }: { tab: WalkTab; label: string; onEnd: () => void }) {
  const [steps, setSteps] = useState<readonly WalkStep[] | null>(null);
  const [at, setAt] = useState(0);
  // The sections present, once the tab has painted.
  useEffect(() => {
    const id = requestAnimationFrame(() => setSteps(TAB_WALKS[tab].filter((step) => document.querySelector(step.selector) !== null)));
    return () => cancelAnimationFrame(id);
  }, [tab]);
  const step = steps?.[at] ?? null;
  // Ring the step's section and bring it into view.
  useEffect(() => {
    if (!step) return;
    const el = document.querySelector(step.selector);
    if (!el) return;
    el.classList.add('tab-walk-target');
    el.scrollIntoView({ block: 'start', behavior: 'smooth' });
    return () => el.classList.remove('tab-walk-target');
  }, [step]);
  // A tab with none of its sections showing has nothing to walk.
  const empty = useMemo(() => steps !== null && steps.length === 0, [steps]);
  useEffect(() => { if (empty) onEnd(); }, [empty, onEnd]);
  if (!steps || !step) return null;
  const last = at === steps.length - 1;
  return (
    <aside className="tab-walk" role="dialog" aria-label={W.label(label)}>
      <p className="letter-eyebrow">{label} · {W.step(at + 1, steps.length)}</p>
      <h2>{step.title}</h2>
      <p>{step.text}</p>
      <div className="tab-walk-actions">
        <button type="button" className="secondary tab-walk-skip" onClick={onEnd}>{W.skip}</button>
        <span className="tab-walk-moves">
          {at > 0 && <button type="button" className="secondary" onClick={() => setAt(at - 1)}>{W.back}</button>}
          <button type="button" className="btn-primary" onClick={() => (last ? onEnd() : setAt(at + 1))}>{last ? W.done : W.next}</button>
        </span>
      </div>
    </aside>
  );
}
