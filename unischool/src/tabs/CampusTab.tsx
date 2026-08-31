import type { Action } from '../state/actions';
import type { Buildable, FacilityType, GameState } from '../state/types';
import { nextSlotCost, MAX_SLOTS, hasFreeFacultySlot } from '../systems/techtree/techSystem';
import { STARTING_DORM_CAPACITY } from '../data/campusData';
import HelpHint from '../components/HelpHint';
import CampusMap from '../components/CampusMap';

// Campus: every physical building the university can have — housing, campus-
// life facilities, academic buildings, and labs — shown as ONE list of
// type groups (Housing, Library, Dining, ...) rather than the four separate
// panels this used to be split across. Each group lists every Buildable of
// that type that isn't 'locked': built ones (done), the one currently under
// construction (developing), and the one next available to build — styled
// differently so built/developing/available read apart at a glance. A
// locked Buildable (its prereqs or a population/prestige gate unmet) is
// hidden entirely rather than teased with an unlock note — nothing to
// decide about it yet, so it doesn't belong in this list.

const FACILITY_LABELS: Record<FacilityType, string> = {
  library: 'Library',
  studentCenter: 'Student Center',
  diningHall: 'Dining',
  recCenter: 'Recreation',
  healthCenter: 'Health & Counseling',
  parking: 'Parking',
  quad: 'Quad',
  lab: 'Labs',
};

interface TypeGroup {
  key: string;
  label: string;
  items: Buildable[];
}

// One row per type: dorm/dining/parking/library/studentCenter/recCenter/
// healthCenter/quad are each a single sequential chain (see campusData.ts/
// facilitiesData.ts), so at most one non-'done' entry is ever visible at a
// time; lab and academic building are independent multi-instance types (one
// per lab-gated major / one per school), so several can be visible — built,
// developing, and available — side by side.
const TYPE_MATCHERS: Array<{ key: string; label: string; match: (t: Buildable) => boolean }> = [
  { key: 'dorm', label: 'Housing', match: (t) => t.kind === 'dorm' },
  { key: 'library', label: FACILITY_LABELS.library, match: (t) => t.facilityType === 'library' },
  { key: 'studentCenter', label: FACILITY_LABELS.studentCenter, match: (t) => t.facilityType === 'studentCenter' },
  { key: 'diningHall', label: FACILITY_LABELS.diningHall, match: (t) => t.facilityType === 'diningHall' },
  { key: 'recCenter', label: FACILITY_LABELS.recCenter, match: (t) => t.facilityType === 'recCenter' },
  { key: 'healthCenter', label: FACILITY_LABELS.healthCenter, match: (t) => t.facilityType === 'healthCenter' },
  { key: 'parking', label: FACILITY_LABELS.parking, match: (t) => t.facilityType === 'parking' },
  { key: 'quad', label: FACILITY_LABELS.quad, match: (t) => t.facilityType === 'quad' },
  { key: 'lab', label: FACILITY_LABELS.lab, match: (t) => t.facilityType === 'lab' },
  { key: 'academicBuilding', label: 'Academic Buildings', match: (t) => t.kind === 'building' },
];

function buildGroups(s: GameState): TypeGroup[] {
  return TYPE_MATCHERS
    .map(({ key, label, match }) => ({ key, label, items: s.tech.filter((t) => match(t) && t.status !== 'locked') }))
    .filter((g) => g.items.length > 0);
}

function builtDetail(t: Buildable): string | undefined {
  if (t.facilityType === 'lab') return 'gates capstone coursework';
  if (t.kind === 'dorm') return `${(t.effects?.capacityBonus ?? STARTING_DORM_CAPACITY).toLocaleString()} beds`;
  const flat = t.effects?.flatSatisfactionBonus;
  if (flat) return `+${flat} flat`;
  const serves = t.effects?.servesPopulation;
  if (serves) return `serves ${serves.toLocaleString()}`;
  return undefined;
}

function BuildableRow({ s, act, t }: { s: GameState; act: (a: Action) => void; t: Buildable }) {
  const slotsUsed = Object.keys(s.developing).length;
  const missingFaculty = !!(t.requiresFaculty && !hasFreeFacultySlot(s, t.requiresFaculty));

  if (t.status === 'done') {
    const detail = builtDetail(t);
    return (
      <li className="available-item building-item done">
        <div className="available-item-main">
          <span>
            {t.name}
            {t.tier !== undefined && <span className="badge">Tier {t.tier}</span>}
          </span>
          {detail && <span className="requires-faculty-tag">{detail}</span>}
        </div>
      </li>
    );
  }

  if (t.status === 'developing') {
    return (
      <li className="available-item building-item developing">
        <div className="available-item-main">
          <span>{t.name}</span>
          <span className="badge">{s.developing[t.id]}w left</span>
        </div>
      </li>
    );
  }

  // available
  const disabledReason = s.finance.cash < 0
    ? 'Cash is negative — expansion is stalled until it recovers.'
    : missingFaculty
      ? `No free ${t.requiresFaculty} faculty slots — hire more or more senior ${t.requiresFaculty} faculty.`
      : undefined;
  return (
    <li className="available-item building-item available">
      <div className="available-item-main">
        <span>{t.name}</span>
        {t.requiresFaculty && <span className="requires-faculty-tag">needs {t.requiresFaculty}</span>}
      </div>
      <div className="available-item-meta">
        <span className="stat">{t.cost > 0 ? `$${t.cost.toLocaleString()} · ` : ''}{t.duration}w</span>
        <button
          disabled={slotsUsed >= s.slots || s.finance.cash < 0 || missingFaculty}
          title={disabledReason}
          onClick={() => act({ type: 'START_DEVELOPMENT', nodeId: t.id })}
        >
          develop →
        </button>
      </div>
    </li>
  );
}

export default function CampusTab({ s, act }: { s: GameState; act: (a: Action) => void }) {
  const slotsUsed = Object.keys(s.developing).length;
  const slotCost = nextSlotCost(s.slots);
  const groups = buildGroups(s);

  return (
    <div className="tab-content">
      <section className="panel">
        <div className="panel-head">
          <span className="panel-head-title">
            <h2>Campus</h2>
            <HelpHint text="Every building the university can have, grouped by type: what's built, what's under construction, and what's next available. A facility serves a fixed share of students against total planned capacity, not today's enrollment — building more housing raises the bar for the rest of campus life too. Anything not yet unlockable is left off the list rather than teased." />
          </span>
          <span className="stat">{s.students.enrolled.toLocaleString()}/{s.students.capacity.toLocaleString()} beds · satisfaction {Math.round(s.students.satisfaction)}</span>
        </div>
        {s.finance.cash < 0 && (
          <p className="stall-note">Cash is negative — new development is stalled until it recovers.</p>
        )}
        <div className="building-groups">
          {groups.map((group) => (
            <div className="building-group" key={group.key}>
              <div className="building-group-head">
                <h3>{group.label}</h3>
                <span className="stat">{group.items.filter((t) => t.status === 'done').length} built</span>
              </div>
              <ul className="available-list building-list">
                {group.items.map((t) => <BuildableRow key={t.id} s={s} act={act} t={t} />)}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <CampusMap s={s} act={act} />

      <section className="panel">
        <div className="panel-head"><h2>Development Slots</h2><span className="stat">{slotsUsed}/{s.slots}</span></div>
        <button
          className="buy-slot-btn"
          disabled={s.slots >= MAX_SLOTS || s.finance.cash < slotCost}
          title={s.slots >= MAX_SLOTS ? 'Maximum slots reached' : undefined}
          onClick={() => act({ type: 'BUY_SLOT' })}
        >
          Commission a Slot — ${slotCost.toLocaleString()}
        </button>
      </section>

      <section className="panel">
        <h2>Log</h2>
        <ul className="log">
          {s.log.map((e, i) => (
            <li key={i} className={e.kind}>
              <span className="ts">Y{e.year}W{e.week}</span> {e.message}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
