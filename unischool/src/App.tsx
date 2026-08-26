import { useGame, SPEEDS, SANDBOX_SPEEDS, type Speed } from './engine/useGame';
import { rankedList } from './systems/rivals/rivalsSystem';
import type { PendingInterrupt } from './state/types';
import './styles.css';

const SPEED_LABELS: Record<Speed, string> = { paused: 'paused', real: 'play', fast: 'fast ⚡ (sandbox)' };

// Placeholder modal content per interrupt `type`. Real interrupts (admissions,
// the U.S. News report, the tutorial) each add a case here with their own
// content; the 'debug-test' case is scaffolding — remove it once a real
// interrupt exists (see DEBUG_TRIGGER_TEST_INTERRUPT in reducer.ts).
function interruptBody(interrupt: PendingInterrupt): { title: string; body: string } {
  switch (interrupt.type) {
    case 'debug-test':
      return {
        title: 'Debug: test interrupt',
        body: (interrupt.payload as { message?: string } | undefined)?.message ?? 'No payload.',
      };
    default:
      return { title: interrupt.type, body: 'No content registered for this interrupt type.' };
  }
}

export default function App() {
  const { state, act, speed, setSpeed } = useGame();
  const s = state;
  const ranks = rankedList(s);

  return (
    <div className="app">
      <header className="topbar">
        <div className="clock">Year {s.clock.year} · Week {s.clock.week}</div>
        <div className="speeds">
          {(Object.keys(SPEEDS) as Speed[]).map((sp) => (
            <button
              key={sp}
              className={[
                speed === sp ? 'active' : '',
                SANDBOX_SPEEDS.includes(sp) ? 'sandbox' : '',
              ].join(' ').trim()}
              onClick={() => setSpeed(sp)}
              title={SANDBOX_SPEEDS.includes(sp) ? 'Playtesting only — not intended for normal play' : undefined}
            >
              {SPEED_LABELS[sp]}
            </button>
          ))}
        </div>
        <div className="cash">${Math.round(s.finance.cash).toLocaleString()}</div>
        {/* Scaffolding: proves the interrupt pause/resume cycle. Remove once a real interrupt exists. */}
        <button className="debug-interrupt-btn" onClick={() => act({ type: 'DEBUG_TRIGGER_TEST_INTERRUPT' })}>
          debug: trigger interrupt
        </button>
      </header>

      {s.gameOver && <div className="gameover">Game Over — <button onClick={() => act({ type: 'RESET' })}>Restart</button></div>}

      {s.pendingInterrupt && (
        <div className="modal-backdrop">
          <div className="modal">
            <h2>{interruptBody(s.pendingInterrupt).title}</h2>
            <p>{interruptBody(s.pendingInterrupt).body}</p>
            <button onClick={() => act({ type: 'RESOLVE_INTERRUPT' })}>Resolve</button>
          </div>
        </div>
      )}

      <main className="grid">
        <section className="panel">
          <h2>Finances</h2>
          <dl>
            <dt>Cash</dt><dd>${Math.round(s.finance.cash).toLocaleString()}</dd>
            <dt>Endowment</dt><dd>${Math.round(s.finance.endowment).toLocaleString()}</dd>
            <dt>Weekly OpEx</dt><dd>${Math.round(s.finance.weeklyOpEx).toLocaleString()}</dd>
            <dt>Tuition</dt><dd>${s.finance.tuitionPerStudent.toLocaleString()}/yr</dd>
          </dl>
          <div className="tuition-ctrl">
            <button onClick={() => act({ type: 'SET_TUITION', amount: s.finance.tuitionPerStudent - 1000 })}>–</button>
            <span>set tuition</span>
            <button onClick={() => act({ type: 'SET_TUITION', amount: s.finance.tuitionPerStudent + 1000 })}>+</button>
          </div>
        </section>

        <section className="panel">
          <h2>Students</h2>
          <dl>
            <dt>Enrolled</dt><dd>{s.students.enrolled} / {s.students.capacity}</dd>
            <dt>Satisfaction</dt><dd>{Math.round(s.students.satisfaction)}</dd>
            <dt>Applicant pool</dt><dd>{Math.round(s.students.applicantPool)}</dd>
          </dl>
        </section>

        <section className="panel">
          <h2>Faculty</h2>
          <ul className="faculty">
            {s.faculty.map((f) => (
              <li key={f.id}>
                <span>{f.name} · {f.field}</span>
                <span className="stat">T{f.teaching} R{f.research}</span>
                <button onClick={() => act({ type: 'FIRE_FACULTY', facultyId: f.id })}>fire</button>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel">
          <h2>Research <span className="stat">{Object.keys(s.developing).length}/{s.slots} slots</span></h2>
          <ul className="tech">
            {s.tech.map((t) => (
              <li key={t.id} className={t.status}>
                <div className="tech-head">
                  <strong>{t.name}</strong>
                  {t.status === 'available' && (
                    <button
                      disabled={Object.keys(s.developing).length >= s.slots}
                      onClick={() => act({ type: 'START_DEVELOPMENT', nodeId: t.id })}
                    >
                      develop
                    </button>
                  )}
                  {t.status === 'developing' && <span className="badge">{s.developing[t.id]}w left</span>}
                  {t.status === 'done' && <span className="badge done">done</span>}
                  {t.status === 'locked' && <span className="badge locked">locked</span>}
                </div>
                <p>{t.description}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel">
          <h2>Rankings</h2>
          <ol className="ranks">
            {ranks.map((r, i) => (
              <li key={r.name} className={r.isPlayer ? 'me' : ''}>
                <span>{i + 1}. {r.name}</span>
                <span className="stat">{Math.round(r.reputation)}</span>
              </li>
            ))}
          </ol>
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
      </main>
    </div>
  );
}
