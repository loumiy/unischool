import { Fragment, useState } from 'react';
import type { GameState } from '../state/types';

const ATTRIBUTE_LABELS: Record<string, string> = {
  academic: 'Academic (library)',
  social: 'Social (student center, rec, quad, student orgs)',
  basicNeeds: 'Basic needs (dining)',
  health: 'Health (counseling center)',
  infrastructure: 'Infrastructure (parking)',
};

// Enrollment/admissions snapshot. Tuition and financial aid are only ever
// set once a year, at the summer admissions interrupt (see
// InterruptModal.tsx) — this tab is the read-only picture of where things
// stand between those decisions.
//
// Satisfaction stays ONE displayed number, but it's the weighted sum of
// five named attributes (see satisfactionSystem.ts) — the toggle below
// expands it into that breakdown so the player can see exactly what's
// dragging the number down and which building (Campus tab) fixes it.
// Satisfaction's consequence is word of mouth: it scales next summer's
// applicant pool (see admissionsSystem.ts's WORD_OF_MOUTH_STRENGTH), so
// the note below says so rather than leaving it a bare number.
export default function AdmissionsTab({ s }: { s: GameState }) {
  const [showBreakdown, setShowBreakdown] = useState(false);
  const breakdown = s.students.satisfactionBreakdown;

  return (
    <div className="tab-content">
      <section className="panel">
        <h2>Enrollment</h2>
        <dl>
          <dt>Enrolled</dt><dd>{s.students.enrolled} / {s.students.capacity}</dd>
          <dt>
            Satisfaction{' '}
            <button className="satisfaction-toggle" onClick={() => setShowBreakdown((v) => !v)}>
              {showBreakdown ? 'hide breakdown ▲' : 'breakdown ▼'}
            </button>
          </dt>
          <dd>{Math.round(s.students.satisfaction)}</dd>
          <dt>Applicant pool</dt><dd>{Math.round(s.students.applicantPool)}</dd>
          <dt>Admit rate</dt><dd>{Math.round(s.students.admitRate * 100)}%</dd>
          <dt>Incoming quality</dt><dd>{Math.round(s.students.incomingQuality)} / 100</dd>
          <dt>Financial aid</dt><dd>{Math.round(s.admissions.financialAidRate * 100)}%</dd>
        </dl>
        {showBreakdown && (
          <dl className="satisfaction-breakdown">
            {(Object.keys(breakdown) as Array<keyof typeof breakdown>).map((key) => (
              <Fragment key={key}>
                <dt>{ATTRIBUTE_LABELS[key]}</dt>
                <dd>{Math.round(breakdown[key])}</dd>
              </Fragment>
            ))}
          </dl>
        )}
        <p className="empty-note demand-note">Word of mouth: student satisfaction scales next summer's applicant pool.</p>
      </section>
    </div>
  );
}
