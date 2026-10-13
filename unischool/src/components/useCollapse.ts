import { useState } from 'react';

// Collapsing (Plan 60): a section starts folded or open by its caller's
// rule (`foldedByDefault`); a click overrides that, and the override is
// remembered for the session (module state, so it survives a tab switch).
// Keys are namespaced by their caller ("program:", "school:", "team:"), so
// one map serves the Curriculum's programs (Plan 76B) and Athletics'
// (Plan 95I).
const collapseOverrides = new Map<string, boolean>();
export function useCollapse(key: string, foldedByDefault: boolean): [boolean, () => void] {
  const [, bump] = useState(0);
  const collapsed = collapseOverrides.get(key) ?? foldedByDefault;
  return [collapsed, () => { collapseOverrides.set(key, !collapsed); bump((n) => n + 1); }];
}

// Opens or folds a section from outside it: the walkthrough opens the row
// its step points at (Plan 103B). Takes effect on the section's next render.
export function setCollapsed(key: string, collapsed: boolean): void {
  collapseOverrides.set(key, collapsed);
}
