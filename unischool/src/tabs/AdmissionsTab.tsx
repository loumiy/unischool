import type { GameState } from '../state/types';
import { totalEnrolled } from '../state/types';

// Enrollment/admissions snapshot. Tuition and scholarships are only ever
// set once a year, at the summer admissions interrupt (see
// InterruptModal.tsx) — this tab is the read-only picture of where things
// stand between those decisions.
//
// Satisfaction is shown here as a bare number: it's load-bearing for the
// enrollment picture, since its consequence is word of mouth — it scales
// next summer's applicant pool (see admissionsSystem.ts's
// WORD_OF_MOUTH_STRENGTH), so the note below says so rather than leaving
// it unexplained. The expandable five-attribute breakdown lives in the
// Student Life tab, alongside the rest of what drives that number.
export default function AdmissionsTab({ s }: { s: GameState }) {
  return (
    <div className="tab-content">
      <section className="panel">
        <h2>Enrollment</h2>
        <dl>
          <dt>Enrolled</dt><dd>{totalEnrolled(s.students).toLocaleString()}</dd>
          <dt>Classes</dt><dd>{s.students.classes.freshman.toLocaleString()} Fr · {s.students.classes.sophomore.toLocaleString()} So · {s.students.classes.junior.toLocaleString()} Jr · {s.students.classes.senior.toLocaleString()} Sr</dd>
          <dt>Satisfaction</dt><dd>{Math.round(s.students.satisfaction)}</dd>
          <dt>Applicant pool</dt><dd>{Math.round(s.students.applicantPool)}</dd>
          <dt>Admit rate</dt><dd>{Math.round(s.students.admitRate * 100)}%</dd>
          <dt>Incoming quality</dt><dd>{Math.round(s.students.incomingQuality)} / 100</dd>
          <dt>Scholarships</dt><dd>{Math.round(s.admissions.scholarshipRate * 100)}%</dd>
        </dl>
        <p className="empty-note demand-note">Word of mouth: student satisfaction scales next summer's applicant pool.</p>
      </section>
    </div>
  );
}
