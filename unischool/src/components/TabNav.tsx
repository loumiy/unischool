export type TabId = 'campus' | 'faculty' | 'curriculum' | 'treasury' | 'admissions' | 'athletics';

const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'campus', label: 'Campus' },
  { id: 'faculty', label: 'Faculty' },
  { id: 'curriculum', label: 'Curriculum' },
  { id: 'treasury', label: 'Treasury' },
  { id: 'admissions', label: 'Admissions' },
  { id: 'athletics', label: 'Athletics' },
];

export default function TabNav({ active, onChange }: { active: TabId; onChange: (tab: TabId) => void }) {
  return (
    <nav className="tabnav">
      {TABS.map((t) => (
        <button
          key={t.id}
          className={active === t.id ? 'active' : ''}
          onClick={() => onChange(t.id)}
        >
          {t.label}
        </button>
      ))}
    </nav>
  );
}
