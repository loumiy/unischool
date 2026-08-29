import { Fragment } from 'react';
import type { Action } from '../state/actions';
import type { GameState } from '../state/types';
import { WEEKS_PER_YEAR } from '../state/types';
import { facultyQualityTier } from '../data/facultyData';
import { usedFacultySlots, totalFacultySlots } from '../systems/techtree/techSystem';

// Faculty roster and the hireable candidate pool. Hiring/dismissal is the
// only place faculty are managed; growth (teaching/research rising toward
// each hire's rolled potential, salary rising with it, course slots
// growing on tenure milestones) happens passively on the weekly tick — see
// facultySystem.ts. Quality tier is a display-only bucketing of the same
// teaching/research stats already shown, so "hire more" (headcount, which
// gates course slots below) and "hire better" (this tier) read as visibly
// separate decisions rather than the same number twice.
export default function FacultyTab({ s, act }: { s: GameState; act: (a: Action) => void }) {
  // Every field a requiresFaculty-gated course actually needs, so the slots
  // summary only shows fields that matter for starting new development —
  // not the full candidate-generation pool in facultyData.ts.
  const gatedFields = [...new Set(s.tech.filter((t) => t.requiresFaculty).map((t) => t.requiresFaculty!))].sort();

  return (
    <div className="tab-content">
      <section className="panel">
        <h2>Faculty</h2>
        <ul className="faculty">
          {s.faculty.map((f) => (
            <li key={f.id}>
              <span>{f.name} · {f.field} <span className="kind-tag">{facultyQualityTier(f)}</span><br />
                <span className="stat">
                  T{f.teaching} R{f.research} <span className="outcome-note">(→ T{f.teachingPotential} R{f.researchPotential})</span> · ${f.salary.toLocaleString()}/yr · {Math.floor(f.tenureWeeks / WEEKS_PER_YEAR)}y tenure · {f.courseSlots} course slots
                </span>
              </span>
              <button onClick={() => act({ type: 'FIRE_FACULTY', facultyId: f.id })}>Dismiss</button>
            </li>
          ))}
          {s.faculty.length === 0 && <li className="empty-note">No faculty on the roster.</li>}
        </ul>
      </section>

      {gatedFields.length > 0 && (
        <section className="panel">
          <div className="panel-head"><h2>Course Slots by Field</h2></div>
          <p className="empty-note">
            A field-gated course occupies one slot in its field for as long as it's under development or done — hire more
            (or more tenured) faculty in a field to unlock offering more courses in it.
          </p>
          <dl>
            {gatedFields.map((field) => (
              <Fragment key={field}>
                <dt>{field}</dt>
                <dd>{usedFacultySlots(s, field)} / {totalFacultySlots(s, field)} slots used</dd>
              </Fragment>
            ))}
          </dl>
        </section>
      )}

      <section className="panel">
        <h2>Candidates</h2>
        <ul className="faculty candidates">
          {s.candidates.map((c) => (
            <li key={c.id}>
              <span>{c.name} · {c.field} <span className="kind-tag">{facultyQualityTier(c)}</span><br />
                <span className="stat">T{c.teaching} R{c.research} <span className="outcome-note">(→ T{c.teachingPotential} R{c.researchPotential})</span> · ${c.salary.toLocaleString()}/yr · {c.courseSlots} course slots</span>
              </span>
              <button className="appoint" onClick={() => act({ type: 'HIRE_FACULTY', facultyId: c.id })}>Appoint</button>
            </li>
          ))}
          {s.candidates.length === 0 && <li className="empty-note">No candidates right now.</li>}
        </ul>
      </section>
    </div>
  );
}
