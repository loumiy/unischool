import { useState } from 'react';
import { useGame, SPEEDS, SANDBOX_SPEEDS, type Speed } from './engine/useGame';
import { curriculumGroups } from './data/techData';
import { nextSlotCost, MAX_SLOTS } from './systems/techtree/techSystem';
import { weeklyNet } from './systems/finance/financeSystem';
import { SCHOOL_TYPE_PRESETS } from './data/schoolTypeData';
import type { GameState, PendingInterrupt, Buildable, SchoolType } from './state/types';
import { WEEKS_PER_YEAR } from './state/types';
import './styles.css';

const SPEED_LABELS: Record<Speed, string> = { paused: 'Paused', real: 'Play', fast: 'Fast (sandbox)' };

// Placeholder modal content for interrupt types with no dedicated form (see
// AdmissionsInterruptForm below for 'admissions'). The 'debug-test' case is
// scaffolding — remove it once a real interrupt other than admissions
// exists (the U.S. News report, the tutorial) and needs the same treatment.
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

interface AdmissionsDraft {
  tuition: number;
  financialAidRate: number;
  selectivity: number;
  targetEnrollment: number;
}

// The once-a-year summer admissions decision (see README's "Admissions: an
// annual summer decision"). Resolving it stores tuition/aid/selectivity/
// target enrollment, which then drive the sim passively for the rest of
// the year — see admissionsSystem.ts. This is the only place tuition is
// ever set; there is no live, continuously adjustable tuition control.
function AdmissionsInterruptForm({ payload, tuitionCeiling, onResolve }: {
  payload: AdmissionsDraft;
  tuitionCeiling: number;
  onResolve: (settings: AdmissionsDraft) => void;
}) {
  const [tuition, setTuition] = useState(payload.tuition);
  const [financialAidRate, setFinancialAidRate] = useState(payload.financialAidRate);
  const [selectivity, setSelectivity] = useState(payload.selectivity);
  const [targetEnrollment, setTargetEnrollment] = useState(payload.targetEnrollment);

  return (
    <>
      <h2>Summer Admissions</h2>
      <p>Set next year's policy. These choices drive enrollment, satisfaction, and revenue passively for the whole year.</p>

      <label className="admissions-field">
        <span>Tuition <strong>${tuition.toLocaleString()}/yr</strong> (cap ${tuitionCeiling.toLocaleString()})</span>
        <input type="range" min={0} max={tuitionCeiling} step={500} value={tuition}
          onChange={(e) => setTuition(Number(e.target.value))} />
      </label>

      <label className="admissions-field">
        <span>Financial aid <strong>{Math.round(financialAidRate * 100)}%</strong> avg. discount</span>
        <input type="range" min={0} max={1} step={0.01} value={financialAidRate}
          onChange={(e) => setFinancialAidRate(Number(e.target.value))} />
      </label>

      <label className="admissions-field">
        <span>Selectivity <strong>{Math.round(selectivity * 100)}%</strong></span>
        <input type="range" min={0} max={0.95} step={0.01} value={selectivity}
          onChange={(e) => setSelectivity(Number(e.target.value))} />
      </label>

      <label className="admissions-field">
        <span>Target enrollment</span>
        <input type="number" min={0} className="admissions-number" value={targetEnrollment}
          onChange={(e) => setTargetEnrollment(Number(e.target.value))} />
      </label>

      <button onClick={() => onResolve({ tuition, financialAidRate, selectivity, targetEnrollment })}>
        Confirm Policy
      </button>
    </>
  );
}

interface RankingsReportPayload {
  rank: number;
  standings: Array<{ name: string; reputation: number; isPlayer: boolean }>;
}

// Renders both rankings-related interrupts: the one-time "you've entered
// the top 50" reveal and the recurring annual report (see README's
// "Rankings: the U.S. News report"). Standing is otherwise never shown in
// the dashboard — this modal is the only touchpoint, once a year at most.
function RankingsReportView({ payload, isFirstReveal, onDismiss }: {
  payload: RankingsReportPayload;
  isFirstReveal: boolean;
  onDismiss: () => void;
}) {
  return (
    <>
      <h2>{isFirstReveal ? "You've Entered the Rankings" : 'Annual U.S. News Report'}</h2>
      <p>
        {isFirstReveal
          ? `Your university has cracked the top 50, landing at #${payload.rank}. The annual report will keep you posted from here on.`
          : `This year's standings are in — you're ranked #${payload.rank}.`}
      </p>
      <ol className="report-standings">
        {payload.standings.map((r, i) => (
          <li key={r.name} className={r.isPlayer ? 'me' : ''}>
            <span>{i + 1}. {r.name}</span>
            <span className="stat">{Math.round(r.reputation)}</span>
          </li>
        ))}
      </ol>
      <button onClick={onDismiss}>Dismiss</button>
    </>
  );
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

  const doneCourses = s.tech.filter((t) => t.status === 'done').length;
  const availableCourses = s.tech.filter((t) => t.status === 'available');
  const developingCourses = s.tech.filter((t) => t.status === 'developing');
  const slotsUsed = Object.keys(s.developing).length;
  const hasFaculty = (field: string) => s.faculty.some((f) => f.field === field);

  const netWeekly = weeklyNet(s);
  const catalogPct = Math.round((doneCourses / s.tech.length) * 100);
  const slotCost = nextSlotCost(s.slots);

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
            {s.pendingInterrupt.type === 'admissions' ? (
              <AdmissionsInterruptForm
                payload={s.pendingInterrupt.payload as AdmissionsDraft}
                tuitionCeiling={s.finance.tuitionCeiling}
                onResolve={(settings) => act({ type: 'RESOLVE_ADMISSIONS', ...settings })}
              />
            ) : s.pendingInterrupt.type === 'rankings-entry' || s.pendingInterrupt.type === 'annual-report' ? (
              <RankingsReportView
                payload={s.pendingInterrupt.payload as RankingsReportPayload}
                isFirstReveal={s.pendingInterrupt.type === 'rankings-entry'}
                onDismiss={() => act({ type: 'RESOLVE_REPORT' })}
              />
            ) : (
              <>
                <h2>{interruptBody(s.pendingInterrupt).title}</h2>
                <p>{interruptBody(s.pendingInterrupt).body}</p>
                <button onClick={() => act({ type: 'RESOLVE_INTERRUPT' })}>Resolve</button>
              </>
            )}
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
            {availableCourses.map((t) => {
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
                      {t.kind === 'building' && <span className="kind-tag">Building</span>}
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
          </ul>
        </section>

        <aside className="sidebar">
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
            <p className="empty-note">Tuition is set once a year, at the summer admissions decision.</p>
          </section>

          <section className="panel">
            <h2>Enrollment</h2>
            <dl>
              <dt>Enrolled</dt><dd>{s.students.enrolled} / {s.students.capacity}</dd>
              <dt>Satisfaction</dt><dd>{Math.round(s.students.satisfaction)}</dd>
              <dt>Applicant pool</dt><dd>{Math.round(s.students.applicantPool)}</dd>
              <dt>Target enrollment</dt><dd>{s.admissions.targetEnrollment}</dd>
              <dt>Selectivity</dt><dd>{Math.round(s.admissions.selectivity * 100)}%</dd>
              <dt>Financial aid</dt><dd>{Math.round(s.admissions.financialAidRate * 100)}%</dd>
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

      {/* Standing among peers isn't shown constantly — the annual report
          interrupt above is the only touchpoint (see README's "Rankings"). */}
      <main className="layout-secondary">
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
