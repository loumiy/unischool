import { useState } from 'react';

// Collapsing (Plan 60): a section starts folded or open by its caller's
// rule (`foldedByDefault`); a click overrides that, and the override is
// remembered for the session (module state, so it survives a tab switch).
// Keys are namespaced by their caller ("program:", "school:", "team:"), so
// one map serves the Curriculum's programs (Plan 76B) and Athletics'
// (Plan 95I). When the section finishes (a program or school, Plan 107C),
// an earlier click gives way and the section folds: finishing is news. A
// click after that is kept as before. `finished` is the caller's rule
// unless it says otherwise: a program row's rule also folds it when its
// course starts and nothing else is ready, and that keeps your click
// (Plan 114H).
const collapseOverrides = new Map<string, boolean>();
const lastFinished = new Map<string, boolean>();
export function useCollapse(key: string, foldedByDefault: boolean, finished = foldedByDefault): [boolean, () => void] {
  const [, bump] = useState(0);
  if (finished && lastFinished.get(key) === false) collapseOverrides.delete(key);
  lastFinished.set(key, finished);
  const collapsed = collapseOverrides.get(key) ?? foldedByDefault;
  return [collapsed, () => { collapseOverrides.set(key, !collapsed); bump((n) => n + 1); }];
}

// Opens or folds a section from outside it: the walkthrough opens the row
// its step points at (Plan 103B). Takes effect on the section's next render.
export function setCollapsed(key: string, collapsed: boolean): void {
  collapseOverrides.set(key, collapsed);
}
