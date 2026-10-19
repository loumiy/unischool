import { useSyncExternalStore } from 'react';

// Which view the Curriculum tab shows (Plan 105): the radial drawing, or the
// rows it replaced, kept as a second view (the owner's decision 1). A
// per-session choice like the folds of useCollapse.ts, not saved: a reload
// opens the drawing. App.tsx reads it too, since the drawing fills the tab
// overlay without a page scroll (TabOverlay's `split`).

export type CurriculumView = 'drawing' | 'list';

let view: CurriculumView = 'drawing';
const listeners = new Set<() => void>();

export function curriculumView(): CurriculumView {
  return view;
}

export function setCurriculumView(next: CurriculumView): void {
  if (next === view) return;
  view = next;
  for (const fn of listeners) fn();
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export function useCurriculumView(): CurriculumView {
  return useSyncExternalStore(subscribe, curriculumView, curriculumView);
}
