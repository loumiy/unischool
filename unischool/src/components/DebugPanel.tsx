import { useState } from 'react';
import type { Action } from '../state/actions';
import type { GameState } from '../state/types';
import { totalEnrolled } from '../state/types';
import { weeklyNet } from '../systems/finance/financeSystem';
import { computePrestigeTarget } from '../systems/prestige/prestigeSystem';
import { DECISION_EVENTS } from '../data/eventData';
import type { DemandSubject } from '../data/demandData';
import { SAVE_KEY } from '../state/persistence';
import { playtestEnabled } from './playtest';
import { money } from '../format';

// The debug panel: read, set, jump, force and load, on top of the live game.
// Mounted only behind the playtest flag (see playtest.ts). Deliberately plain
// developer styling. Every change goes through the reducer as a DEBUG_ action
// (actions.ts's playtest block); this component computes and writes nothing.
//   READ   the simulation's state, including the prestige target
//   SET    cash, prestige, satisfaction, price
//   JUMP   N weeks or years, optionally answering modals with the balance
//          harness's default answers
//   FORCE  an event, a demand, the queued milestones, the annual report
//   LOAD   a save written by `npm run scenario` (see tools/scenario.ts)

const DEMAND_SUBJECTS: DemandSubject[] = [
  'academic', 'social', 'basicNeeds', 'health', 'housing', 'instruction',
];

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="debug-row">
      <span className="debug-row-label">{label}</span>
      <span className="debug-row-value">{value}</span>
    </div>
  );
}

// A number field and its commit button, each holding its own draft text so
// typing "1200" does not write 1, 12, 120 on the way. The draft starts empty
// with the live figure as placeholder, so it never shows a stale value.
function SetField({ label, current, onApply }: {
  label: string; current: number; onApply: (value: number) => void;
}) {
  const [draft, setDraft] = useState('');
  const parsed = Number(draft);
  const valid = draft.trim() !== '' && Number.isFinite(parsed);
  return (
    <div className="debug-set-row">
      <label className="debug-row-label" htmlFor={`debug-set-${label}`}>{label}</label>
      <input
        id={`debug-set-${label}`}
        className="debug-input"
        type="number"
        value={draft}
        placeholder={String(Math.round(current))}
        onChange={(e) => setDraft(e.target.value)}
      />
      <button type="button" className="debug-btn" disabled={!valid} onClick={() => onApply(parsed)}>
        Set
      </button>
    </div>
  );
}

export default function DebugPanel({ s, act, exportRun }: { s: GameState; act: (a: Action) => void; exportRun: () => string }) {
  const [open, setOpen] = useState(false);
  const [autoResolve, setAutoResolve] = useState(true);
  const [jump, setJump] = useState('1');
  const [eventId, setEventId] = useState(DECISION_EVENTS[0]?.id ?? '');
  const [demandSubject, setDemandSubject] = useState<DemandSubject>('housing');
  const [loadError, setLoadError] = useState<string | null>(null);

  if (!playtestEnabled(s)) return null;

  // Before founding, the panel renders with Load as its only section.
  const running = s.started;
  const jumpWeeks = Math.max(0, Math.round(Number(jump) || 0));
  const target = computePrestigeTarget(s);
  const attrs = s.students.satisfactionBreakdown;

  // Writes the picked file into the save slot and reloads, so a scenario
  // goes through useGame.ts's normal boot load (persistence.ts's loadGame:
  // version check, migrations, shape check) exactly like a player's save.
  async function loadSave(file: File): Promise<void> {
    try {
      const text = await file.text();
      const payload = JSON.parse(text) as { version?: number; state?: unknown };
      if (typeof payload?.version !== 'number' || typeof payload?.state !== 'object') {
        setLoadError('not a save payload');
        return;
      }
      localStorage.setItem(SAVE_KEY, text);
      window.location.reload();
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'could not read that file');
    }
  }

  return (
    <div className="debug-panel">
      <button
        type="button"
        className={`debug-toggle ${open ? 'active' : ''}`}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        title="Playtest panel — only present behind the debug flag"
      >
        {open ? '× debug' : '⚙ debug'}
      </button>

      {open && (
        <div className="debug-body" role="dialog" aria-label="Playtest panel">
          {running && <>
          <section className="debug-section">
            <h3>Read</h3>
            <Row label="clock" value={`Y${s.clock.year} W${s.clock.week}`} />
            <Row label="cash" value={`${money(s.finance.cash)} (${weeklyNet(s) >= 0 ? '+' : ''}${money(weeklyNet(s))}/wk)`} />
            <Row label="enrolled" value={`${totalEnrolled(s.students).toLocaleString()} / ${s.students.capacity.toLocaleString()} beds`} />
            {/* Where prestige is heading: current → target. */}
            <Row label="prestige" value={`${s.self.reputation.toFixed(1)} → ${target.toFixed(1)}`} />
            <Row label="research std" value={s.self.researchStanding.toFixed(1)} />
            <Row label="social std" value={s.self.socialStanding.toFixed(1)} />
            <Row label="satisfaction" value={s.students.satisfaction.toFixed(0)} />
            {/* The five satisfaction attributes in satisfactionSystem.ts's order. */}
            <Row
              label="  a/s/b/h/h"
              value={[attrs.academic, attrs.social, attrs.basicNeeds, attrs.health, attrs.housing]
                .map((v) => v.toFixed(0).padStart(3))
                .join(' ')}
            />
            <Row label="tuition" value={money(s.finance.listedTuition)} />
            <Row label="petitions" value={`${s.orgs.pendingPetitions.length} pending`} />
            <Row label="milestones" value={`${s.events.pendingMilestones.length} queued`} />
            <Row label="modal" value={s.pendingInterrupt?.type ?? 'none'} />
          </section>

          <section className="debug-section">
            <h3>Set</h3>
            <SetField label="cash" current={s.finance.cash} onApply={(amount) => act({ type: 'DEBUG_SET_CASH', amount })} />
            <SetField label="prestige" current={s.self.reputation} onApply={(value) => act({ type: 'DEBUG_SET_PRESTIGE', value })} />
            <SetField label="satisfaction" current={s.students.satisfaction} onApply={(value) => act({ type: 'DEBUG_SET_SATISFACTION', value })} />
            <SetField label="tuition" current={s.finance.listedTuition} onApply={(value) => act({ type: 'DEBUG_SET_TUITION', value })} />
            <div className="debug-set-row">
              <button type="button" className="debug-btn wide" onClick={() => act({ type: 'DEBUG_SET_CASH', amount: s.finance.cash + 1_000_000_000 })}>
                +$1B cash
              </button>
            </div>
          </section>

          <section className="debug-section">
            <h3>Jump</h3>
            <div className="debug-set-row">
              <input
                className="debug-input"
                type="number"
                min={1}
                value={jump}
                aria-label="how far to jump"
                onChange={(e) => setJump(e.target.value)}
              />
              <button
                type="button"
                className="debug-btn"
                onClick={() => act({ type: 'DEBUG_JUMP', weeks: jumpWeeks, autoResolve })}
              >
                weeks
              </button>
              <button
                type="button"
                className="debug-btn"
                onClick={() => act({ type: 'DEBUG_JUMP', weeks: jumpWeeks * 52, autoResolve })}
              >
                years
              </button>
            </div>
            <label className="debug-check">
              <input type="checkbox" checked={autoResolve} onChange={(e) => setAutoResolve(e.target.checked)} />
              {/* Off, the jump stops at the first modal. */}
              answer modals on the way
            </label>
          </section>

          <section className="debug-section">
            <h3>Force</h3>
            <div className="debug-set-row">
              <select className="debug-input" aria-label="decision event" value={eventId} onChange={(e) => setEventId(e.target.value)}>
                {DECISION_EVENTS.map((event) => (
                  <option key={event.id} value={event.id}>{event.id}</option>
                ))}
              </select>
              <button type="button" className="debug-btn" onClick={() => act({ type: 'DEBUG_FORCE_EVENT', eventId })}>
                fire
              </button>
            </div>
            <div className="debug-set-row">
              <select
                className="debug-input"
                aria-label="demand subject"
                value={demandSubject}
                onChange={(e) => setDemandSubject(e.target.value as DemandSubject)}
              >
                {DEMAND_SUBJECTS.map((subject) => (
                  <option key={subject} value={subject}>{subject}</option>
                ))}
              </select>
              <button type="button" className="debug-btn" onClick={() => act({ type: 'DEBUG_FORCE_DEMAND', subject: demandSubject })}>
                demand
              </button>
            </div>
            <div className="debug-set-row">
              <button type="button" className="debug-btn wide" onClick={() => act({ type: 'DEBUG_FORCE_MILESTONE' })}>
                celebrate queue
              </button>
              <button type="button" className="debug-btn wide" onClick={() => act({ type: 'DEBUG_FORCE_REPORT' })}>
                annual report
              </button>
            </div>
          </section>
          </>}

          <section className="debug-section">
            <h3>Load</h3>
            <p className="debug-note">A save from <code>npm run scenario</code>. Replaces this run.</p>
            <input
              className="debug-input file"
              type="file"
              accept="application/json,.json"
              aria-label="load a scenario save"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void loadSave(file);
              }}
            />
            {loadError && <p className="debug-note error">{loadError}</p>}
          </section>
          <section className="debug-section">
            <h3>Run</h3>
            <p className="debug-note">This session's start and every action since. Replays exactly (see engine/actionLog.ts).</p>
            <button type="button" className="debug-btn wide" onClick={() => downloadRun(exportRun())}>
              export run
            </button>
          </section>
        </div>
      )}
    </div>
  );
}

function downloadRun(json: string): void {
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `unischool-run-${Date.now()}.json`;
  link.click();
  URL.revokeObjectURL(url);
}
