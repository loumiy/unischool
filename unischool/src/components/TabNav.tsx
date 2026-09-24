import type { GameState } from '../state/types';
import { milestoneForTab } from '../data/ladderData';
import { ladderOpensTab } from '../systems/ladder/ladderSystem';

// Views that pop up over the campus map, which is always on screen and is not
// a tab. `active` is null when the player is looking at the map.
export type TabId = 'faculty' | 'curriculum' | 'research' | 'treasury' | 'students' | 'history' | 'athletics';

// The toolbar's order: academic core, campus life, the annual pages, then
// the record. Treasury is filtered out of the icon row (Toolbar.tsx's
// ICON_TAB_ORDER) because the funds figure opens it, but keeps its label
// for TabOverlay's header.
const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'curriculum', label: 'Curriculum' },
  { id: 'faculty', label: 'Faculty' },
  { id: 'research', label: 'Research' },
  { id: 'students', label: 'Students' },
  { id: 'athletics', label: 'Athletics' },
  { id: 'history', label: 'History' },
  { id: 'treasury', label: 'Treasury' },
];

// Tabs open from milestones on the ladder (data/ladderData.ts): Students
// and History at the first commencement, Research with the
// first lab, Athletics with the first sport club. The rest are open from the
// charter.
export const GATED_TABS: readonly TabId[] = TABS.map((t) => t.id).filter((id) => milestoneForTab(id) !== undefined);

// The one availability answer, used by the toolbar's icon row, by App (which
// refuses to open an unavailable tab) and by the unlock log line.
export function tabAvailable(s: GameState, id: TabId): boolean {
  return ladderOpensTab(s, id);
}

// Pure tab metadata: the toolbar's icon row (Toolbar.tsx) renders the tabs in
// this order, and TAB_LABELS supplies their aria-label/title and
// TabOverlay's header.
export const TAB_ORDER: readonly TabId[] = TABS.map((t) => t.id);

export const TAB_LABELS: Record<TabId, string> = Object.fromEntries(
  TABS.map((t) => [t.id, t.label]),
) as Record<TabId, string>;
