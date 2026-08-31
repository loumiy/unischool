// The campus map is the game's base layer and is always on screen (see
// App.tsx), so it is NOT one of these — every id here is a view that pops
// up over the map and can be dismissed to get back to it. `active` is null
// when nothing is open and the player is looking at the map itself.
export type TabId = 'faculty' | 'curriculum' | 'treasury' | 'admissions' | 'athletics';

const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'faculty', label: 'Faculty' },
  { id: 'curriculum', label: 'Curriculum' },
  { id: 'treasury', label: 'Treasury' },
  { id: 'admissions', label: 'Admissions' },
  { id: 'athletics', label: 'Athletics' },
];

// Tabs whose system doesn't exist yet: still in TabId and still routed in
// App.tsx (and TAB_LABELS below still names them), just not offered as a
// nav button — a permanent "Coming Soon" tab is noise. Drop the id from
// here to light the tab up once its system lands. See README's roadmap:
// athletics rides on Buildables + hiring + rivals all being mature.
const HIDDEN_TABS: readonly TabId[] = ['athletics'];

const VISIBLE_TABS = TABS.filter((t) => !HIDDEN_TABS.includes(t.id));

export const TAB_LABELS: Record<TabId, string> = Object.fromEntries(
  TABS.map((t) => [t.id, t.label]),
) as Record<TabId, string>;

// Clicking the open view's own button closes it, so the same button both
// opens and dismisses — one control, no separate "back to map" affordance.
export default function TabNav({ active, onChange }: { active: TabId | null; onChange: (tab: TabId | null) => void }) {
  return (
    <nav className="tabnav">
      {VISIBLE_TABS.map((t) => (
        <button
          key={t.id}
          className={active === t.id ? 'active' : ''}
          aria-expanded={active === t.id}
          onClick={() => onChange(active === t.id ? null : t.id)}
        >
          {t.label}
        </button>
      ))}
    </nav>
  );
}
