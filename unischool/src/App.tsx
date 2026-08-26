import { useState } from 'react';
import { useGame, SPEEDS, type Speed } from './engine/useGame';
import { rankedList } from './systems/rivals/rivalsSystem';
import { nextSlotCost } from './systems/techtree/techSystem';
import type { TechNode } from './state/types';
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

export default function App() {
  const { state, act, speed, setSpeed } = useGame();
  const s = state;
  const ranks = rankedList(s);
  const schools = groupTech(s.tech);
  const [openSchools, setOpenSchools] = useState<Set<string>>(new Set());

  function toggleSchool(school: string) {
    setOpenSchools((prev) => {
      const next = new Set(prev);
      if (next.has(school)) next.delete(school);
      else next.add(school);
      return next;
    });
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="clock">Year {s.clock.year} · Week {s.clock.week}</div>
        <div className="speeds">
          {(Object.keys(SPEEDS) as Speed[]).map((sp) => (
            <button
              key={sp}
              className={speed === sp ? 'active' : ''}
              onClick={() => setSpeed(sp)}
            >
              {sp}
            </button>
          ))}
        </div>
        <div className="cash">${Math.round(s.finance.cash).toLocaleString()}</div>
      </header>

      {s.gameOver && <div className="gameover">Game Over — <button onClick={() => act({ type: 'RESET' })}>Restart</button></div>}

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
          <h3>Candidates</h3>
          <ul className="candidates">
            {s.facultyPool.map((f) => (
              <li key={f.id}>
                <span>{f.name} · {f.field}</span>
                <span className="stat">T{f.teaching} R{f.research} · ${f.salary.toLocaleString()}/yr</span>
                <button
                  disabled={s.finance.cash < f.salary}
                  onClick={() => act({ type: 'HIRE_FACULTY', facultyId: f.id })}
                >
                  hire
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel">
          <h2>
            Research <span className="stat">{Object.keys(s.developing).length}/{s.slots} slots</span>
          </h2>
          <div className="slot-buy">
            <button
              disabled={s.finance.cash < nextSlotCost(s.slots)}
              onClick={() => act({ type: 'BUY_SLOT' })}
            >
              buy slot — ${nextSlotCost(s.slots).toLocaleString()}
            </button>
          </div>
          <div className="schools">
            {schools.map(({ school, majors }) => {
              const courseCount = majors.reduce((n, m) => n + m.courses.length, 0);
              const doneCount = majors.reduce(
                (n, m) => n + m.courses.filter((c) => c.status === 'done').length,
                0,
              );
              const isOpen = openSchools.has(school);
              return (
                <div key={school} className="school">
                  <button className="school-toggle" onClick={() => toggleSchool(school)}>
                    <span>{isOpen ? '▾' : '▸'} {school}</span>
                    <span className="stat">{doneCount}/{courseCount}</span>
                  </button>
                  {isOpen && majors.map(({ major, courses }) => (
                    <div key={major} className="major-group">
                      <h4>{major}</h4>
                      <ul className="tech">
                        {courses.map((t) => (
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
                              {t.status === 'developing' && <span className="badge">{Math.ceil(s.developing[t.id])}w left</span>}
                              {t.status === 'done' && <span className="badge done">done</span>}
                              {t.status === 'locked' && <span className="badge locked">locked</span>}
                            </div>
                            <p>{t.description}</p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
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
