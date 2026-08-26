import { useGame, SPEEDS, type Speed } from './engine/useGame';
import { rankedList } from './systems/rivals/rivalsSystem';
import { nextSlotCost } from './systems/techtree/techSystem';
import type { GameState, TechNode } from './state/types';
import { WEEKS_PER_YEAR } from './state/types';
import './styles.css';

// Groups the flat tech list into school -> major -> courses, preserving the
// order courses were generated in (school, then major, then tier).
function groupTech(tech: TechNode[]) {
  const schools = new Map<string, Map<string, TechNode[]>>();
  for (const node of tech) {
    if (!schools.has(node.school)) schools.set(node.school, new Map());
    const majors = schools.get(node.school)!;
    if (!majors.has(node.major)) majors.set(node.major, []);
    majors.get(node.major)!.push(node);
  }
  return Array.from(schools.entries()).map(([school, majors]) => ({
    school,
    majors: Array.from(majors.entries()).map(([major, courses]) => ({ major, courses })),
  }));
}

// Fraction of a course list that's done, as a whole-number percentage.
function progressOf(courses: TechNode[]): { done: number; total: number; pct: number } {
  const total = courses.length;
  const done = courses.filter((t) => t.status === 'done').length;
  return { done, total, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
}

// The academic year is split into two terms purely for the header's display
// — WEEKS_PER_YEAR isn't otherwise divided into terms anywhere in state.
const TERM_LENGTH = WEEKS_PER_YEAR / 2;
function seasonOf(week: number): { term: string; weekInTerm: number } {
  return week <= TERM_LENGTH
    ? { term: 'Fall Term', weekInTerm: week }
    : { term: 'Spring Term', weekInTerm: week - TERM_LENGTH };
}

// Lifetime-average pace (courses/year) and a projected finish year at the
// current rate. The long arc is the whole point of the game, so this is a
// permanent header readout.
function computePace(s: GameState): { coursesPerYear: number; projectedFinishYear: number | null } {
  const weeksElapsed = (s.clock.year - 1) * WEEKS_PER_YEAR + s.clock.week;
  const total = s.tech.length;
  const done = s.tech.filter((t) => t.status === 'done').length;
  const remaining = total - done;
  if (weeksElapsed <= 0 || done <= 0) return { coursesPerYear: 0, projectedFinishYear: null };

  const coursesPerYear = (done / weeksElapsed) * WEEKS_PER_YEAR;
  if (remaining <= 0) return { coursesPerYear, projectedFinishYear: s.clock.year };
  const projectedFinishYear = s.clock.year + Math.ceil(remaining / coursesPerYear);
  return { coursesPerYear, projectedFinishYear };
}

export default function App() {
  const { state, act, speed, setSpeed } = useGame();
  const s = state;
  const ranks = rankedList(s);
  const schools = groupTech(s.tech);
  const overall = progressOf(s.tech);
  const cooking = s.tech.filter((t) => t.status === 'developing');
  const available = s.tech.filter((t) => t.status === 'available');
  const pace = computePace(s);
  const season = seasonOf(s.clock.week);
  const slotsUsed = Object.keys(s.developing).length;
  const slotsFull = slotsUsed >= s.slots;

  function startDevelopment(nodeId: string) {
    if (slotsFull) return;
    act({ type: 'START_DEVELOPMENT', nodeId });
  }

  return (
    <div className="console">
      <header className="console-header">
        <div>
          <div className="kicker">Office of the President</div>
          <div className="uni-name">{s.self.name}</div>
        </div>

        <div className="hstat-row">
          <div className="hstat">
            <div className="hstat-label">Academic Year</div>
            <div className="hstat-value">Year {s.clock.year}</div>
            <div className="hstat-sub">{season.term} · Week {season.weekInTerm}</div>
          </div>

          <div className="hstat">
            <div className="hstat-label">Operating Funds</div>
            <div className={`hstat-value ${s.finance.cash >= 0 ? 'positive' : 'negative'}`}>
              ${Math.round(s.finance.cash).toLocaleString()}
            </div>
            <div className="hstat-sub">-${Math.round(s.finance.weeklyOpEx).toLocaleString()}/wk</div>
          </div>

          <div className="hstat">
            <div className="hstat-label">Prestige</div>
            <div className="hstat-value brass">{Math.round(s.self.reputation)}</div>
          </div>

          <div className="hstat">
            <div className="hstat-label">Catalog</div>
            <div className="hstat-value">{overall.done} / {overall.total}</div>
            <div className="hstat-sub">{overall.pct}% of the tree</div>
          </div>

          <div className="hstat">
            <div className="hstat-label">Pace</div>
            <div className="hstat-value">{pace.coursesPerYear.toFixed(1)}/yr</div>
            <div className="hstat-sub">
              {pace.projectedFinishYear ? `finish ~Year ${pace.projectedFinishYear}` : 'gathering data'}
            </div>
          </div>
        </div>
      </header>

      <div className="controls-row">
        <div className="speeds">
          {(Object.keys(SPEEDS) as Speed[]).map((sp) => (
            <button
              key={sp}
              className={`btn ${sp === 'turbo' ? 'ghost' : ''} ${speed === sp ? 'active' : ''}`}
              onClick={() => setSpeed(sp)}
            >
              {sp}
            </button>
          ))}
        </div>
        {/* SANDBOX-ONLY: auto-develop toggle, remove before release (see sandboxSystem.ts). */}
        <button
          className={`btn ghost ${s.autoDevelop ? 'active' : ''}`}
          onClick={() => act({ type: 'TOGGLE_AUTO_DEVELOP' })}
        >
          auto-develop: {s.autoDevelop ? 'on' : 'off'}
        </button>
      </div>

      {s.gameOver && (
        <div className="gameover">
          <span>The university has been declared insolvent by order of the Board.</span>
          <button className="btn" onClick={() => act({ type: 'RESET' })}>Restart</button>
        </div>
      )}

      <main className="layout">
        <section className="panel catalog">
          <h2 className="panel-title">The Curriculum</h2>
          <div className="catalog-grid">
            {schools.map(({ school, majors }) => {
              const allCourses = majors.flatMap((m) => m.courses);
              const progress = progressOf(allCourses);
              return (
                <div key={school} className="school-block">
                  <div className="school-block-header">
                    <span className="school-block-name">{school}</span>
                    <span className="stat">{progress.done}/{progress.total}</span>
                  </div>
                  <div className="major-clusters">
                    {majors.map(({ major, courses }) => (
                      <div key={major} className="cluster" title={major}>
                        <div className="cluster-cells">
                          {courses.map((t) => (
                            <button
                              key={t.id}
                              className={`cell ${t.status}`}
                              title={`${t.name} — ${t.status}`}
                              disabled={t.status !== 'available' || slotsFull}
                              onClick={() => startDevelopment(t.id)}
                            />
                          ))}
                        </div>
                        <div className="cluster-label">{major}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <h3 className="panel-subtitle">Available to Develop ({available.length})</h3>
          <div className="available-list">
            {available.length === 0 ? (
              <p className="empty-note">Nothing awaiting development.</p>
            ) : (
              available.map((t) => (
                <button
                  key={t.id}
                  className="available-row"
                  disabled={slotsFull}
                  onClick={() => startDevelopment(t.id)}
                >
                  <span>{t.name}</span>
                  <span className="develop-hint">{slotsFull ? 'slots full' : 'develop →'}</span>
                </button>
              ))
            )}
          </div>
        </section>

        <aside className="sidebar">
          <section className="panel">
            <h2 className="panel-title">
              Development Slots <span className="stat">{slotsUsed}/{s.slots}</span>
            </h2>
            <button
              className="btn"
              disabled={s.finance.cash < nextSlotCost(s.slots)}
              onClick={() => act({ type: 'BUY_SLOT' })}
            >
              commission a slot — ${nextSlotCost(s.slots).toLocaleString()}
            </button>
            <div className="cooking">
              {cooking.length === 0 ? (
                <p className="empty-note">No courses in development.</p>
              ) : (
                <ul className="cooking-list">
                  {cooking.map((t) => (
                    <li key={t.id}>
                      <span>{t.name}</span>
                      <span className="badge">{Math.ceil(s.developing[t.id])}w left</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section className="panel">
            <h2 className="panel-title">Treasury</h2>
            <dl>
              <dt>Cash</dt><dd>${Math.round(s.finance.cash).toLocaleString()}</dd>
              <dt>Endowment</dt><dd>${Math.round(s.finance.endowment).toLocaleString()}</dd>
              <dt>Weekly OpEx</dt><dd>${Math.round(s.finance.weeklyOpEx).toLocaleString()}</dd>
              <dt>Tuition</dt><dd>${s.finance.tuitionPerStudent.toLocaleString()}/yr</dd>
            </dl>
            <div className="tuition-ctrl">
              <button className="btn" onClick={() => act({ type: 'SET_TUITION', amount: s.finance.tuitionPerStudent - 1000 })}>–</button>
              <span>set tuition</span>
              <button className="btn" onClick={() => act({ type: 'SET_TUITION', amount: s.finance.tuitionPerStudent + 1000 })}>+</button>
            </div>
          </section>

          <section className="panel">
            <h2 className="panel-title">Enrollment</h2>
            <dl>
              <dt>Enrolled</dt><dd>{s.students.enrolled} / {s.students.capacity}</dd>
              <dt>Satisfaction</dt><dd>{Math.round(s.students.satisfaction)}</dd>
              <dt>Applicant Pool</dt><dd>{Math.round(s.students.applicantPool)}</dd>
            </dl>
          </section>

          <section className="panel">
            <h2 className="panel-title">Faculty</h2>
            <ul className="faculty">
              {s.faculty.map((f) => (
                <li key={f.id}>
                  <span>{f.name} · {f.field}</span>
                  <span className="stat">T{f.teaching} R{f.research}</span>
                  <button className="btn danger" onClick={() => act({ type: 'FIRE_FACULTY', facultyId: f.id })}>dismiss</button>
                </li>
              ))}
            </ul>
            <h3 className="panel-subtitle">Candidates</h3>
            <ul className="candidates">
              {s.facultyPool.map((f) => (
                <li key={f.id}>
                  <span>{f.name} · {f.field}</span>
                  <span className="stat">T{f.teaching} R{f.research} · ${f.salary.toLocaleString()}/yr</span>
                  <button
                    className="btn"
                    disabled={s.finance.cash < f.salary}
                    onClick={() => act({ type: 'HIRE_FACULTY', facultyId: f.id })}
                  >
                    appoint
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section className="panel">
            <h2 className="panel-title">Standing Among Peers</h2>
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
            <h2 className="panel-title">Presidential Dispatches</h2>
            <ul className="log">
              {s.log.map((e, i) => (
                <li key={i} className={e.kind}>
                  <span className="ts">Y{e.year}W{e.week}</span> {e.message}
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </main>
    </div>
  );
}
