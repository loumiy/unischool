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

export const TAB_LABELS: Record<TabId, string> = Object.fromEntries(
  TABS.map((t) => [t.id, t.label]),
) as Record<TabId, string>;

// Clicking the open view's own button closes it, so the same button both
// opens and dismisses — one control, no separate "back to map" affordance.
export default function TabNav({ active, onChange }: { active: TabId | null; onChange: (tab: TabId | null) => void }) {
  return (
    <nav className="tabnav">
      {TABS.map((t) => (
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
