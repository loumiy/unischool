import type { GameState } from '../state/types';
import { labEquippedFields } from '../data/researchData';

// Views that pop up over the campus map, which is always on screen and is not
// a tab. `active` is null when the player is looking at the map.
export type TabId = 'faculty' | 'curriculum' | 'research' | 'treasury' | 'enrollment' | 'studentlife' | 'history' | 'athletics';

// The toolbar's order: academic core, campus life, the annual pages, then
// the record. Treasury is filtered out of the icon row (Toolbar.tsx's
// ICON_TAB_ORDER) because the funds figure opens it, but keeps its label
// for TabOverlay's header.
const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'curriculum', label: 'Curriculum' },
  { id: 'faculty', label: 'Faculty' },
  { id: 'research', label: 'Research' },
  { id: 'studentlife', label: 'Student Life' },
  { id: 'athletics', label: 'Athletics' },
  { id: 'enrollment', label: 'Enrollment' },
  { id: 'history', label: 'History' },
  { id: 'treasury', label: 'Treasury' },
];

// Tabs that appear only once their subject exists, each gated on the same
// condition its system uses: research on a finished lab (researchData.ts's
// labEquippedFields), athletics on the first sport club or team, history
// from year 2. Every other tab is always available.
const TAB_GATES: Partial<Record<TabId, (s: GameState) => boolean>> = {
  research: (s) => labEquippedFields(s).size > 0,
  athletics: (s) => s.orgs.teams.length > 0 || s.orgs.clubs.some((c) => c.sport !== null), // opens with the first sport club, empty and showing the path
  history: (s) => s.clock.year >= 2,
};

// The gated ids, so App.tsx can log a line the first time each opens.
export const GATED_TABS: readonly TabId[] = Object.keys(TAB_GATES) as TabId[];

// The one availability answer, used by the toolbar's icon row, by App (which
// refuses to open an unavailable tab) and by the unlock log line.
export function tabAvailable(s: GameState, id: TabId): boolean {
  return TAB_GATES[id]?.(s) ?? true;
}

// Pure tab metadata: the toolbar's icon row (Toolbar.tsx) renders the tabs in
// this order, and TAB_LABELS supplies their aria-label/title and
// TabOverlay's header.
export const TAB_ORDER: readonly TabId[] = TABS.map((t) => t.id);

export const TAB_LABELS: Record<TabId, string> = Object.fromEntries(
  TABS.map((t) => [t.id, t.label]),
) as Record<TabId, string>;
