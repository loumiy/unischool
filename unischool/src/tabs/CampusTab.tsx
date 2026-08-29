import type { Action } from '../state/actions';
import type { Buildable, FacilityType, GameState } from '../state/types';
import { nextSlotCost, MAX_SLOTS, hasFreeFacultySlot } from '../systems/techtree/techSystem';
import { STARTING_DORM_CAPACITY } from '../data/campusData';

// Campus: physical infrastructure — housing (dorms, the sole source of
// student capacity — see campusData.ts), campus-life facilities (library,
// dining, student center, ... — see facilitiesData.ts), academic buildings
// and labs, and the shared development-slot capacity (bought here since
// "Commission a Slot" is itself a construction action) they're all built
// with. Courses share the same slot pool but live in the Curriculum tab; a
// course's develop button there is disabled exactly the same way anything
// here is, by slot/cash/faculty-slot availability, so buying capacity here
// is what unblocks either tab.
//
// Every built (status 'done') Buildable stays visible here permanently —
// see the Built Assets panel at the bottom — rather than disappearing once
// finished the way the old "available to build" lists otherwise would.

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

const KIND_TAGS: Record<string, string> = {
  building: 'Building',
  dorm: 'Dorm',
};

function kindTag(t: Buildable): string {
  if (t.facilityType) return FACILITY_LABELS[t.facilityType];
  return KIND_TAGS[t.kind] ?? t.kind;
}

// Facility types with a persistent "what's next to build" queue in the
// Campus Life panel — everything except labs (course-gating only, built
// per-major inline in the Curriculum tab's logic, not a player-facing
// queue here) and dorms (their own Housing panel above).
const CAMPUS_LIFE_TYPES: FacilityType[] = ['library', 'studentCenter', 'diningHall', 'recCenter', 'healthCenter', 'parking', 'quad'];

function unlockGateNote(t: Buildable): string | undefined {
  if (t.minCapacityToUnlock !== undefined) return `Unlocks once campus capacity reaches ${t.minCapacityToUnlock.toLocaleString()} beds.`;
  if (t.minPrestigeToUnlock !== undefined) return `Unlocks at prestige ${t.minPrestigeToUnlock}+.`;
  return undefined;
}

export default function CampusTab({ s, act }: { s: GameState; act: (a: Action) => void }) {
  const developing = s.tech.filter((t) => t.status === 'developing');
  // Labs (facilityType 'lab') live in this same panel rather than Campus
  // Life's queue above — they're academic infrastructure that gates
  // coursework, not a satisfaction-serving facility, so they belong beside
  // the school buildings, not the library/dining/etc. queue.
  const isAcademicBuilding = (t: Buildable) => t.kind === 'building' || t.facilityType === 'lab';
  const availableBuildings = s.tech.filter((t) => t.status === 'available' && isAcademicBuilding(t));
  const builtBuildings = s.tech.filter((t) => t.status === 'done' && isAcademicBuilding(t));
  const dormsBuilt = s.tech.filter((t) => t.kind === 'dorm' && t.status === 'done');
  const nextDorm = s.tech.find((t) => t.kind === 'dorm' && t.status === 'available');
  const slotsUsed = Object.keys(s.developing).length;
  const slotCost = nextSlotCost(s.slots);

  const builtAssets = s.tech.filter((t) => t.status === 'done' && t.kind !== 'course');

  return (
    <div className="tab-content">
      <section className="panel">
        <div className="panel-head"><h2>Housing</h2><span className="stat">{s.students.enrolled.toLocaleString()}/{s.students.capacity.toLocaleString()} beds</span></div>
        <p className="empty-note">
          {dormsBuilt.length} dorm{dormsBuilt.length === 1 ? '' : 's'} built. Capacity is tied entirely to dormitories —
          enrollment can never exceed it, however high demand runs.
        </p>
        {nextDorm ? (
          <ul className="available-list">
            <li className="available-item">
              <div className="available-item-main">
                <span><span className="kind-tag">Dorm</span>{nextDorm.name}</span>
                <span className="requires-faculty-tag">+{nextDorm.effects?.capacityBonus?.toLocaleString()} beds</span>
              </div>
              <div className="available-item-meta">
                <span className="stat">${nextDorm.cost.toLocaleString()} · {nextDorm.duration}w</span>
                <button
                  disabled={slotsUsed >= s.slots || s.finance.cash < 0}
                  title={s.finance.cash < 0 ? 'Cash is negative — expansion is stalled until it recovers.' : undefined}
                  onClick={() => act({ type: 'START_DEVELOPMENT', nodeId: nextDorm.id })}
                >
                  develop →
                </button>
              </div>
            </li>
          </ul>
        ) : (
          <p className="empty-note">Every dorm in the housing chain has been built.</p>
        )}
      </section>

      <section className="panel">
        <div className="panel-head"><h2>Campus Life</h2><span className="stat">satisfaction {Math.round(s.students.satisfaction)}</span></div>
        <p className="empty-note">
          Each facility serves a fixed number of students against total capacity, not today's enrollment — needs scale
          with how big the campus is planned to be. See the Admissions tab to expand the satisfaction breakdown.
        </p>
        <ul className="available-list">
          {CAMPUS_LIFE_TYPES.map((type) => {
            const built = s.tech.filter((t) => t.facilityType === type && t.status === 'done');
            const next = s.tech.find((t) => t.facilityType === type && t.status === 'available');
            const lockedNext = s.tech.find((t) => t.facilityType === type && t.status === 'locked');
            const totalServes = built.reduce((sum, t) => sum + (t.effects?.servesPopulation ?? 0), 0);
            const totalFlat = built.reduce((sum, t) => sum + (t.effects?.flatSatisfactionBonus ?? 0), 0);
            const coverage = totalFlat > 0
              ? `+${totalFlat} flat`
              : totalServes > 0
                ? `${totalServes.toLocaleString()} served`
                : undefined;
            return (
              <li key={type} className="available-item">
                <div className="available-item-main">
                  <span>
                    <span className="kind-tag">{FACILITY_LABELS[type]}</span>
                    {built.length > 0 ? built.map((t) => t.name).join(', ') : 'Not built yet'}
                  </span>
                  {coverage && <span className="requires-faculty-tag">{coverage}</span>}
                </div>
                <div className="available-item-meta">
                  {next ? (
                    <>
                      <span className="stat">next: {next.name} — ${next.cost.toLocaleString()} · {next.duration}w</span>
                      <button
                        disabled={slotsUsed >= s.slots || s.finance.cash < 0}
                        title={s.finance.cash < 0 ? 'Cash is negative — expansion is stalled until it recovers.' : undefined}
                        onClick={() => act({ type: 'START_DEVELOPMENT', nodeId: next.id })}
                      >
                        develop →
                      </button>
                    </>
                  ) : lockedNext ? (
                    <span className="stat">{unlockGateNote(lockedNext) ?? 'Locked.'}</span>
                  ) : (
                    <span className="stat">Fully built.</span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

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
        {developing.length === 0 ? (
          <p className="empty-note">No development underway.</p>
        ) : (
          <ul className="developing-list">
            {developing.map((t) => (
              <li key={t.id}>
                <span><span className="kind-tag">{kindTag(t)}</span>{t.name}</span>
                <span className="badge">{s.developing[t.id]}w left</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel">
        <div className="panel-head"><h2>Academic Buildings</h2><span className="stat">{availableBuildings.length} available · {builtBuildings.length} built</span></div>
        {s.finance.cash < 0 && (
          <p className="stall-note">Cash is negative — new development is stalled until it recovers.</p>
        )}
        <ul className="available-list">
          {availableBuildings.map((t) => {
            const missingFaculty = !!(t.requiresFaculty && !hasFreeFacultySlot(s, t.requiresFaculty));
            const disabledReason = s.finance.cash < 0
              ? 'Cash is negative — expansion is stalled until it recovers.'
              : missingFaculty
                ? `No free ${t.requiresFaculty} faculty slots — hire more or more senior ${t.requiresFaculty} faculty.`
                : undefined;
            return (
              <li key={t.id} className="available-item">
                <div className="available-item-main">
                  <span>
                    <span className="kind-tag">{kindTag(t)}</span>
                    {t.name}
                  </span>
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
          })}
          {availableBuildings.length === 0 && <li className="empty-note">No buildings currently available to construct.</li>}
        </ul>
      </section>

      <section className="panel">
        <div className="panel-head"><h2>Built Assets</h2><span className="stat">{builtAssets.length}</span></div>
        <p className="empty-note">Every dorm, facility, and academic building the university has finished, in one persistent list.</p>
        <ul className="available-list">
          {builtAssets.map((t) => {
            const serves = t.effects?.servesPopulation;
            const flat = t.effects?.flatSatisfactionBonus;
            const detail = t.facilityType === 'lab'
              ? 'gates capstone coursework'
              : t.kind === 'dorm'
                // The starting dorm carries no capacityBonus effect (its
                // capacity is folded into the founding baseline instead —
                // see campusData.ts) — fall back to that baseline so it
                // doesn't read as "0 beds".
                ? `${(t.effects?.capacityBonus ?? STARTING_DORM_CAPACITY).toLocaleString()} beds`
                : flat
                  ? `+${flat} flat`
                  : serves
                    ? `serves ${serves.toLocaleString()}`
                    : undefined;
            return (
              <li key={t.id} className="available-item">
                <div className="available-item-main">
                  <span>
                    <span className="kind-tag">{kindTag(t)}</span>
                    {t.name}
                    {t.tier !== undefined && <span className="badge">Tier {t.tier}</span>}
                  </span>
                  {detail && <span className="requires-faculty-tag">{detail}</span>}
                </div>
              </li>
            );
          })}
          {builtAssets.length === 0 && <li className="empty-note">Nothing built yet.</li>}
        </ul>
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
