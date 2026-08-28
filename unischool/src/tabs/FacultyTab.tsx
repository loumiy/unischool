import type { Action } from '../state/actions';
import type { GameState } from '../state/types';
import { WEEKS_PER_YEAR } from '../state/types';

// Faculty roster and the hireable candidate pool. Hiring/dismissal is the
// only place faculty are managed; growth (teaching/research rising toward
// each hire's rolled potential, salary rising with it) happens passively
// on the weekly tick — see facultySystem.ts.
export default function FacultyTab({ s, act }: { s: GameState; act: (a: Action) => void }) {
  return (
    <div className="tab-content">
      <section className="panel">
        <h2>Faculty</h2>
        <ul className="faculty">
          {s.faculty.map((f) => (
            <li key={f.id}>
              <span>{f.name} · {f.field}<br />
                <span className="stat">
                  T{f.teaching} R{f.research} <span className="outcome-note">(→ T{f.teachingPotential} R{f.researchPotential})</span> · ${f.salary.toLocaleString()}/yr · {Math.floor(f.tenureWeeks / WEEKS_PER_YEAR)}y tenure
                </span>
              </span>
              <button onClick={() => act({ type: 'FIRE_FACULTY', facultyId: f.id })}>Dismiss</button>
            </li>
          ))}
          {s.faculty.length === 0 && <li className="empty-note">No faculty on the roster.</li>}
        </ul>
      </section>

      <section className="panel">
        <h2>Candidates</h2>
        <ul className="faculty candidates">
          {s.candidates.map((c) => (
            <li key={c.id}>
              <span>{c.name} · {c.field}<br /><span className="stat">T{c.teaching} R{c.research} <span className="outcome-note">(→ T{c.teachingPotential} R{c.researchPotential})</span> · ${c.salary.toLocaleString()}/yr</span></span>
              <button className="appoint" onClick={() => act({ type: 'HIRE_FACULTY', facultyId: c.id })}>Appoint</button>
            </li>
          ))}
          {s.candidates.length === 0 && <li className="empty-note">No candidates right now.</li>}
        </ul>
      </section>
    </div>
  );
}
