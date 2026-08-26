import { useState } from 'react';
import { useGame, SPEEDS, SANDBOX_SPEEDS, type Speed } from './engine/useGame';
import { rankedList } from './systems/rivals/rivalsSystem';
import { curriculumGroups } from './data/techData';
import { SLOT_COST, MAX_SLOTS } from './systems/techtree/techSystem';
import { weeklyNet } from './systems/finance/financeSystem';
import { SCHOOL_TYPE_PRESETS } from './data/schoolTypeData';
import type { GameState, PendingInterrupt, Buildable, SchoolType } from './state/types';
import { WEEKS_PER_YEAR } from './state/types';
import './styles.css';

const SPEED_LABELS: Record<Speed, string> = { paused: 'Paused', real: 'Play', fast: 'Fast (sandbox)' };

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

function termName(week: number): string {
  return week <= WEEKS_PER_YEAR / 2 ? 'Fall Term' : 'Spring Term';
}

// A small grid of squares, one per course in the group, colored by status —
// the "how far along is this major" tile from the curriculum overview.
function CourseTile({ label, courses }: { label: string; courses: Buildable[] }) {
  const done = courses.filter((c) => c.status === 'done').length;
  return (
    <div className="course-tile" title={`${label}: ${done}/${courses.length} done`}>
      <div className="course-tile-grid">
        {courses.map((c) => (
          <span key={c.id} className={`course-sq ${c.status}`} title={`${c.name} · ${c.status}`} />
        ))}
      </div>
      <div className="course-tile-label">{label}</div>
    </div>
  );
}

// Shown once, before play begins: name the university and pick private vs.
// public. That single choice sets starting conditions via
// SCHOOL_TYPE_PRESETS (see data/schoolTypeData.ts) — no other customization
// here, per README ("archetypes emerge, they are not chosen").
function StartupScreen({ onStart }: { onStart: (name: string, schoolType: SchoolType) => void }) {
  const [name, setName] = useState('');
  const [schoolType, setSchoolType] = useState<SchoolType>('private');

  return (
    <div className="startup">
      <div className="startup-card">
        <div className="eyebrow">Found a University</div>
        <h1>Name your school</h1>
        <input
          className="startup-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Ashcombe University"
          maxLength={60}
        />
        <div className="startup-types">
          {(Object.keys(SCHOOL_TYPE_PRESETS) as SchoolType[]).map((type) => (
            <button
              key={type}
              className={`startup-type-btn ${schoolType === type ? 'active' : ''}`}
              onClick={() => setSchoolType(type)}
            >
              <strong>{SCHOOL_TYPE_PRESETS[type].label}</strong>
              <span>{SCHOOL_TYPE_PRESETS[type].description}</span>
            </button>
          ))}
        </div>
        <button
          className="startup-begin-btn"
          disabled={name.trim().length === 0}
          onClick={() => onStart(name.trim(), schoolType)}
        >
          Open the Doors
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const { state, act, speed, setSpeed } = useGame();
  const s: GameState = state;

  if (!s.started) {
    return <StartupScreen onStart={(name, schoolType) => act({ type: 'START_GAME', name, schoolType })} />;
  }

  const ranks = rankedList(s);

  const doneCourses = s.tech.filter((t) => t.status === 'done').length;
  const availableCourses = s.tech.filter((t) => t.status === 'available');
  const developingCourses = s.tech.filter((t) => t.status === 'developing');
  const slotsUsed = Object.keys(s.developing).length;

  const netWeekly = weeklyNet(s);
  const elapsedYears = s.clock.year - 1 + (s.clock.week - 1) / WEEKS_PER_YEAR;
  const pace = elapsedYears > 0 ? doneCourses / elapsedYears : 0;
  const catalogPct = Math.round((doneCourses / s.tech.length) * 100);

  return (
    <div className="app">
      <header className="masthead">
        <div className="masthead-id">
          <div className="eyebrow">Office of the President</div>
          <h1>{s.self.name}</h1>
        </div>
        <div className="masthead-stats">
          <div className="stat-block">
            <div className="stat-label">Academic Year</div>
            <div className="stat-value">Year {s.clock.year}</div>
            <div className="stat-sub">{termName(s.clock.week)} · Week {s.clock.week}</div>
          </div>
          <div className="stat-block">
            <div className="stat-label">Operating Funds</div>
            <div className={`stat-value ${s.finance.cash < 0 ? 'money-negative' : 'money'}`}>${Math.round(s.finance.cash).toLocaleString()}</div>
            <div className="stat-sub">{netWeekly >= 0 ? '+' : '-'}${Math.round(Math.abs(netWeekly)).toLocaleString()}/wk</div>
          </div>
          <div className="stat-block">
            <div className="stat-label">Prestige</div>
            <div className="stat-value gold">{Math.round(s.self.reputation)}</div>
          </div>
          <div className="stat-block">
            <div className="stat-label">Catalog</div>
            <div className="stat-value">{doneCourses} / {s.tech.length}</div>
            <div className="stat-sub">{catalogPct}% of the tree</div>
          </div>
          <div className="stat-block">
            <div className="stat-label">Pace</div>
            <div className="stat-value">{elapsedYears < 0.5 ? '0.0/yr' : `${pace.toFixed(1)}/yr`}</div>
            <div className="stat-sub">{elapsedYears < 0.5 ? 'gathering data' : 'courses developed'}</div>
          </div>
        </div>
      </header>

      <div className="controlbar">
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
        <div className="controlbar-right">
          <button
            className={`auto-develop-toggle ${s.autoDevelop ? 'on' : ''}`}
            onClick={() => act({ type: 'TOGGLE_AUTO_DEVELOP' })}
          >
            auto-develop: {s.autoDevelop ? 'on' : 'off'}
          </button>
          {/* Scaffolding: proves the interrupt pause/resume cycle. Remove once a real interrupt exists. */}
          <button className="debug-interrupt-btn" onClick={() => act({ type: 'DEBUG_TRIGGER_TEST_INTERRUPT' })}>
            debug: trigger interrupt
          </button>
        </div>
      </div>

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

      <main className="layout">
        <section className="panel curriculum-panel">
          <div className="panel-head"><h2>The Curriculum</h2></div>

          <div className="curriculum-scroll">
            {curriculumGroups().map((school) => {
              const schoolCourses = school.groups.flatMap((g) => g.courseIds);
              const schoolDone = schoolCourses.filter((id) => s.tech.find((t) => t.id === id)?.status === 'done').length;
              return (
                <div key={school.name} className="school-group">
                  <div className="school-head">
                    <h3>{school.name}</h3>
                    <span className="stat">{schoolDone}/{schoolCourses.length}</span>
                  </div>
                  <div className="tile-row">
                    {school.groups.map((group) => (
                      <CourseTile
                        key={group.label}
                        label={group.label}
                        courses={group.courseIds.map((id) => s.tech.find((t) => t.id === id)!).filter(Boolean)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="available-head"><h3>Available to Develop ({availableCourses.length})</h3></div>
          {s.finance.cash < 0 && (
            <p className="stall-note">Cash is negative — new development is stalled until it recovers.</p>
          )}
          <ul className="available-list">
            {availableCourses.map((t) => (
              <li key={t.id}>
                <span>{t.name}</span>
                <button
                  disabled={slotsUsed >= s.slots || s.finance.cash < 0}
                  title={s.finance.cash < 0 ? 'Cash is negative — expansion is stalled until it recovers.' : undefined}
                  onClick={() => act({ type: 'START_DEVELOPMENT', nodeId: t.id })}
                >
                  develop →
                </button>
              </li>
            ))}
          </ul>
        </section>

        <aside className="sidebar">
          <section className="panel">
            <div className="panel-head"><h2>Development Slots</h2><span className="stat">{slotsUsed}/{s.slots}</span></div>
            <button
              className="buy-slot-btn"
              disabled={s.slots >= MAX_SLOTS || s.finance.cash < SLOT_COST}
              title={s.slots >= MAX_SLOTS ? 'Maximum slots reached' : undefined}
              onClick={() => act({ type: 'BUY_SLOT' })}
            >
              Commission a Slot — ${SLOT_COST.toLocaleString()}
            </button>
            {developingCourses.length === 0 ? (
              <p className="empty-note">No courses in development.</p>
            ) : (
              <ul className="developing-list">
                {developingCourses.map((t) => (
                  <li key={t.id}>
                    <span>{t.name}</span>
                    <span className="badge">{s.developing[t.id]}w left</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="panel">
            <h2>Treasury</h2>
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
            <h2>Enrollment</h2>
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
                  <button onClick={() => act({ type: 'FIRE_FACULTY', facultyId: f.id })}>Dismiss</button>
                </li>
              ))}
            </ul>
          </section>

          <section className="panel">
            <h2>Candidates</h2>
            <ul className="faculty candidates">
              {s.candidates.map((c) => (
                <li key={c.id}>
                  <span>{c.name} · {c.field}<br /><span className="stat">T{c.teaching} R{c.research} · ${c.salary.toLocaleString()}/yr</span></span>
                  <button className="appoint" onClick={() => act({ type: 'HIRE_FACULTY', facultyId: c.id })}>Appoint</button>
                </li>
              ))}
              {s.candidates.length === 0 && <li className="empty-note">No candidates right now.</li>}
            </ul>
          </section>
        </aside>
      </main>

      <main className="layout-secondary">
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
