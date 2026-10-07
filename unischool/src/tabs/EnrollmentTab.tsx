import type { CohortCounts, GameState } from '../state/types';
import { totalEnrolled } from '../state/types';
import { COHORTS } from '../systems/admissions/cohorts';
import { count, pct, satisfactionFigure } from '../format';
import { COHORT_COLOR } from '../components/cohortColors';

// ---------------------------------------------------------------------
// Enrollment (a section of the Students tab, Plan 29): who attends, and what the funnel is doing. Each
// class's cohort mix is recorded at admission and carried to graduation
// (types.ts's ClassCohorts), so the four bars compare what the school drew
// four years ago with what it draws now. Read-only: tuition is set only at
// the summer.
// ---------------------------------------------------------------------

// Youngest first, so the bars read as strata laid down in sequence; also
// the order Treasury lists classes and reducer.ts advances them.
const CLASS_ROWS: ReadonlyArray<[keyof GameState['students']['classes'], string]> = [
  ['freshman', 'Freshmen'],
  ['sophomore', 'Sophomores'],
  ['junior', 'Juniors'],
  ['senior', 'Seniors'],
];

// One funnel figure with an optional note underneath, in the same shape as
// TreasuryTab's StatementLine. The value is preformatted: the figures are in
// different units.
function FunnelLine({ label, note, value, net }: {
  label: string;
  note?: string;
  value: string;
  net?: boolean;
}) {
  return (
    <div className={net ? 'statement-net funnel-net' : 'statement-line'}>
      <div className="statement-line-label">
        <span>{label}</span>
        {note && <span className="statement-line-note">{note}</span>}
      </div>
      <span className="statement-line-amount">{value}</span>
    </div>
  );
}

function ClassBar({ label, total, counts, widest }: {
  label: string;
  total: number;
  counts: CohortCounts;
  widest: number;
}) {
  return (
    <div className="body-row">
      <div className="body-row-head">
        <span className="body-row-label">{label}</span>
        <span className="body-row-total">{count(total)}</span>
      </div>
      {/* Bar length is the class's size against the largest class, not a
          normalised row, so size differences stay visible beside the mix. */}
      <div
        className="body-bar"
        style={{ width: widest > 0 ? `${Math.max((total / widest) * 100, 2)}%` : '100%' }}
        role="img"
        aria-label={`${label}, ${total} students: ${COHORTS.map((c) => `${counts[c.id]} ${c.label}`).join(', ')}`}
      >
        {total === 0
          ? <div className="body-bar-empty" />
          : COHORTS.map((c) => (
              counts[c.id] > 0 && (
                <div
                  key={c.id}
                  className="body-bar-seg"
                  style={{ flexGrow: counts[c.id], background: COHORT_COLOR[c.id] }}
                  title={`${c.label}: ${count(counts[c.id])}`}
                />
              )
            ))}
      </div>
    </div>
  );
}

// `funnel` is false before the first commencement (Plan 78B): the founding
// class was not drawn by a summer, so there is no funnel to show.
export default function EnrollmentTab({ s, funnel = true }: { s: GameState; funnel?: boolean }) {
  const { classes, cohortsByClass } = s.students;
  const enrolled = totalEnrolled(s.students);

  // The whole body by cohort, derived rather than stored.
  const bodyTotals = COHORTS.map((c) => ({
    ...c,
    count: CLASS_ROWS.reduce((t, [k]) => t + cohortsByClass[k][c.id], 0),
  }));

  const widest = Math.max(...CLASS_ROWS.map(([k]) => classes[k]));

  return (
    <div className="tab-content">
      <section className="panel">
        <div className="panel-head"><h2>The student body</h2></div>
        <div className="body-legend">
          {bodyTotals.map((c) => (
            <span
              className={c.count > 0 ? 'body-legend-item' : 'body-legend-item is-absent'}
              key={c.id}
              title={c.driverLabel}
            >
              <span className="body-legend-swatch" style={{ background: COHORT_COLOR[c.id] }} />
              {c.label}
              <span className="body-legend-count">{count(c.count)}</span>
            </span>
          ))}
        </div>

        <div className="body-rows">
          {CLASS_ROWS.map(([k, label]) => (
            <ClassBar
              key={k}
              label={label}
              total={classes[k]}
              counts={cohortsByClass[k]}
              widest={widest}
            />
          ))}
        </div>
      </section>

      {funnel && <section className="panel">
        <div className="panel-head"><h2>Last summer's funnel</h2></div>
        <div className="funnel-lines">
          <FunnelLine
            label="Applicant pool"
            value={count(s.students.applicantPool)}
          />
          <FunnelLine
            label="Admit rate"
            value={pct(s.students.admitRate)}
          />
          <FunnelLine
            label="Incoming quality"
            note="The class that enrolled, on average."
            value={`${count(s.students.incomingQuality)}/100`}
          />
          <FunnelLine
            label="Satisfaction"
            value={satisfactionFigure(s.students.satisfaction)}
          />
          <FunnelLine
            label="Enrolled"
            note="The four classes."
            value={count(enrolled)}
            net
          />
        </div>
      </section>}
    </div>
  );
}
