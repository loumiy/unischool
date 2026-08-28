import type { Action } from '../state/actions';
import type { GameState } from '../state/types';
import { nextSlotCost, MAX_SLOTS } from '../systems/techtree/techSystem';

// Campus: physical infrastructure — the shared development-slot capacity
// (bought here since "Commission a Slot" is itself a construction action)
// and the buildings available to construct with it. Courses share the same
// slot pool but live in the Curriculum tab; a course's develop button there
// is disabled exactly the same way a building's is here, by slot/cash
// availability, so buying capacity here is what unblocks either tab.
export default function CampusTab({ s, act }: { s: GameState; act: (a: Action) => void }) {
  const developing = s.tech.filter((t) => t.status === 'developing');
  const availableBuildings = s.tech.filter((t) => t.status === 'available' && t.kind === 'building');
  const slotsUsed = Object.keys(s.developing).length;
  const slotCost = nextSlotCost(s.slots);
  const hasFaculty = (field: string) => s.faculty.some((f) => f.field === field);

  return (
    <div className="tab-content">
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
                <span>{t.kind === 'building' && <span className="kind-tag">Building</span>}{t.name}</span>
                <span className="badge">{s.developing[t.id]}w left</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel">
        <div className="panel-head"><h2>Buildings</h2><span className="stat">{availableBuildings.length} available</span></div>
        {s.finance.cash < 0 && (
          <p className="stall-note">Cash is negative — new development is stalled until it recovers.</p>
        )}
        <ul className="available-list">
          {availableBuildings.map((t) => {
            const missingFaculty = !!(t.requiresFaculty && !hasFaculty(t.requiresFaculty));
            const disabledReason = s.finance.cash < 0
              ? 'Cash is negative — expansion is stalled until it recovers.'
              : missingFaculty
                ? `Requires a ${t.requiresFaculty} faculty member on the roster.`
                : undefined;
            return (
              <li key={t.id} className="available-item">
                <div className="available-item-main">
                  <span>
                    <span className="kind-tag">Building</span>
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
