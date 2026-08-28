import type { GameState } from '../state/types';

// Enrollment/admissions snapshot. Tuition and financial aid are only ever
// set once a year, at the summer admissions interrupt (see
// InterruptModal.tsx) — this tab is the read-only picture of where things
// stand between those decisions.
export default function AdmissionsTab({ s }: { s: GameState }) {
  return (
    <div className="tab-content">
      <section className="panel">
        <h2>Enrollment</h2>
        <dl>
          <dt>Enrolled</dt><dd>{s.students.enrolled} / {s.students.capacity}</dd>
          <dt>Satisfaction</dt><dd>{Math.round(s.students.satisfaction)}</dd>
          <dt>Applicant pool</dt><dd>{Math.round(s.students.applicantPool)}</dd>
          <dt>Admit rate</dt><dd>{Math.round(s.students.admitRate * 100)}%</dd>
          <dt>Incoming quality</dt><dd>{Math.round(s.students.incomingQuality)} / 100</dd>
          <dt>Financial aid</dt><dd>{Math.round(s.admissions.financialAidRate * 100)}%</dd>
        </dl>
      </section>
    </div>
  );
}
