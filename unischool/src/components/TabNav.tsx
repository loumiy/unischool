// The campus map is the game's base layer and is always on screen (see
// App.tsx), so it is NOT one of these — every id here is a view that pops
// up over the map and can be dismissed to get back to it. `active` is null
// when nothing is open and the player is looking at the map itself.
export type TabId = 'faculty' | 'curriculum' | 'treasury' | 'admissions' | 'studentlife' | 'history' | 'athletics';

const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'faculty', label: 'Faculty' },
  { id: 'curriculum', label: 'Curriculum' },
  { id: 'treasury', label: 'Treasury' },
  { id: 'admissions', label: 'Admissions' },
  { id: 'studentlife', label: 'Student Life' },
  { id: 'history', label: 'History' },
  { id: 'athletics', label: 'Athletics' },
];

// Tabs whose system doesn't exist yet: still in TabId and still routed in
// App.tsx (and TAB_LABELS below still names them), just not offered as a
// nav button — a permanent "Coming Soon" tab is noise. Drop the id from
// here to light the tab up once its system lands. See README's roadmap:
// athletics rides on Buildables + hiring + rivals all being mature.
const HIDDEN_TABS: readonly TabId[] = ['athletics'];

// The toolbar's icon row (see Toolbar.tsx) reads this order directly —
// this module is now pure tab metadata (ids, labels, which are offered)
// rather than a rendering component: the toolbar's icon buttons are what
// actually render a clickable tab nav, one unified band instead of a
// separate text-label strip in the topbar. TAB_LABELS survives as the
// aria-label/title source for those icon buttons, so a screen reader (or a
// hover tooltip) still gets the same words a text button used to show.
export const TAB_ORDER: readonly TabId[] = TABS.filter((t) => !HIDDEN_TABS.includes(t.id)).map((t) => t.id);

export const TAB_LABELS: Record<TabId, string> = Object.fromEntries(
  TABS.map((t) => [t.id, t.label]),
) as Record<TabId, string>;
