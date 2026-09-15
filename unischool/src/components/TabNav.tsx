// The campus map is the game's base layer and is always on screen (see
// App.tsx), so it is NOT one of these — every id here is a view that pops
// up over the map and can be dismissed to get back to it. `active` is null
// when nothing is open and the player is looking at the map itself.
export type TabId = 'faculty' | 'curriculum' | 'research' | 'treasury' | 'admissions' | 'studentlife' | 'history' | 'athletics';

// THE ORDER IS THE TOOLBAR'S ORDER, and it is the playtest notes' order:
// the academic core first (what the university teaches, who teaches it,
// what it discovers), then the campus the students live on, then the two
// annual read-and-leave pages, then the record. Roughly how often a player
// opens each, which is the only ordering principle a nine-icon row can
// carry.
//
// Treasury is last here and is filtered out of the icon row entirely (see
// Toolbar.tsx's ICON_TAB_ORDER): it already has a permanent entry point in
// the funds figure at the left of the toolbar, which is why the notes'
// list omits it. It stays in this table because it is still a real tab with
// a real label — the label is what TabOverlay's header shows.
const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'curriculum', label: 'Curriculum' },
  { id: 'faculty', label: 'Faculty' },
  { id: 'research', label: 'Research' },
  { id: 'studentlife', label: 'Student Life' },
  { id: 'athletics', label: 'Athletics' },
  { id: 'admissions', label: 'Admissions' },
  { id: 'history', label: 'History' },
  { id: 'treasury', label: 'Treasury' },
];

// Tabs whose system doesn't exist yet: still in TabId and still routed in
// App.tsx (and TAB_LABELS below still names them), just not offered as a
// nav button — a permanent "Coming Soon" tab is noise. Drop the id from
// here to light the tab up once its system lands. Currently empty: varsity
// athletics moved out of Student Life and into its own live tab (see
// AthleticsTab.tsx), so there is nothing left to hide.
const HIDDEN_TABS: readonly TabId[] = [];

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
