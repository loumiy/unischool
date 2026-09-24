import type { CohortCounts, CohortId, GameState } from '../state/types';
import { totalEnrolled } from '../state/types';
import { COHORTS, baseShareCohortCounts } from '../systems/admissions/cohorts';

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

// Categorical colours as muted, mid-dark pigments so they sit on parchment
// and white segment labels stay legible on each.
const COHORT_COLOR: Record<CohortId, string> = {
  highAchievers: '#8a6d14',    // brass — the same finished-work tone as --brass-deep
  preProfessional: '#3c4d6b',  // ink blue
  researchOriented: '#4a6b46', // moss
  social: '#8c4a3f',           // oxblood
  artsFocused: '#a9683a',      // terracotta
  priceSensitive: '#6a4a63',   // plum
  athletes: '#a98a3c',         // ochre
  gradBound: '#33706a',        // verdigris — aged copper, the eighth pigment
};

// A class whose mix is exactly the base shares: no cohort pull from anything
// built. Both the founding classes and a class admitted with nothing built
// produce it, so the note says "no cohort signal" rather than guessing.
function hasNoCohortSignal(counts: CohortCounts, total: number): boolean {
  const prior = baseShareCohortCounts(total);
  return COHORTS.every((c) => counts[c.id] === prior[c.id]);
}

// One funnel figure with its drivers underneath, in the same shape as
// TreasuryTab's StatementLine. The value is preformatted: the figures are in
// different units.
function FunnelLine({ label, note, value, net }: {
  label: string;
  note: string;
  value: string;
  net?: boolean;
}) {
  return (
    <div className={net ? 'statement-net funnel-net' : 'statement-line'}>
      <div className="statement-line-label">
        <span>{label}</span>
        <span className="statement-line-note">{note}</span>
      </div>
      <span className="statement-line-amount">{value}</span>
    </div>
  );
}

function ClassBar({ label, total, counts, unsignalled, widest }: {
  label: string;
  total: number;
  counts: CohortCounts;
  unsignalled: boolean;
  widest: number;
}) {
  return (
    <div className="body-row">
      <div className="body-row-head">
        <span className="body-row-label">{label}{unsignalled && <span className="body-row-mark" aria-hidden="true">†</span>}</span>
        <span className="body-row-total">{total.toLocaleString()}</span>
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
                  title={`${c.label}: ${counts[c.id].toLocaleString()}`}
                />
              )
            ))}
      </div>
    </div>
  );
}

export default function EnrollmentTab({ s }: { s: GameState }) {
  const { classes, cohortsByClass } = s.students;
  const enrolled = totalEnrolled(s.students);

  // The whole body by cohort, derived rather than stored.
  const bodyTotals = COHORTS.map((c) => ({
    ...c,
    count: CLASS_ROWS.reduce((t, [k]) => t + cohortsByClass[k][c.id], 0),
  }));

  const unsignalled = CLASS_ROWS.filter(([k]) => classes[k] > 0 && hasNoCohortSignal(cohortsByClass[k], classes[k]));
  const widest = Math.max(...CLASS_ROWS.map(([k]) => classes[k]));

  return (
    <div className="tab-content">
      <section className="panel">
        <h2>The Standing Body</h2>
        <p className="history-summary">
          {enrolled.toLocaleString()} students across four classes. Each was admitted
          under the school as it stood that summer, and keeps that composition until it
          graduates — so the bars differ by exactly as much as this university has changed.
        </p>

        <div className="body-legend">
          {bodyTotals.map((c) => (
            <span
              className={c.count > 0 ? 'body-legend-item' : 'body-legend-item is-absent'}
              key={c.id}
              title={c.driverLabel}
            >
              <span className="body-legend-swatch" style={{ background: COHORT_COLOR[c.id] }} />
              {c.label}
              <span className="body-legend-count">{c.count.toLocaleString()}</span>
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
              unsignalled={classes[k] > 0 && hasNoCohortSignal(cohortsByClass[k], classes[k])}
              widest={widest}
            />
          ))}
        </div>

        {unsignalled.length > 0 && (
          <p className="empty-note demand-note">
            † {unsignalled.length === 4 ? 'Every class carries' : `${unsignalled.map(([, l]) => l).join(', ')} carry`}{' '}
            no cohort signal: admitted when the school had built nothing for any particular
            audience, so they read as the model's neutral mix rather than as a choice. Each is
            replaced by a class you admitted as it graduates out.
          </p>
        )}
      </section>

      <section className="panel">
        <h2>Last Summer's Funnel</h2>
        <div className="funnel-lines">
          <FunnelLine
            label="Applicant pool"
            note="What the school drew. Prestige and price set its size; beds, word of mouth and what you have built for each audience scale it; sticker shock then takes a cut, hitting the quality bands unevenly."
            value={Math.round(s.students.applicantPool).toLocaleString()}
          />
          <FunnelLine
            label="Admit rate"
            note="Your decision, not a reading. Admitting deeper reaches further down the quality distribution, so it buys class size with incoming quality."
            value={`${Math.round(s.students.admitRate * 100)}%`}
          />
          <FunnelLine
            label="Incoming quality"
            note="The weighted average of the class that enrolled — everyone admitted comes, there is no yield step. Feeds prestige, which is what makes admitting deep cost something."
            value={`${Math.round(s.students.incomingQuality)} / 100`}
          />
          <FunnelLine
            label="Satisfaction"
            note="Next summer's word of mouth: the trailing-year average scales the pool above. The five attributes behind this number are at the top of this tab."
            value={`${Math.round(s.students.satisfaction)}`}
          />
          <FunnelLine
            label="Enrolled"
            note="The four classes summed. Set once a year at the summer decision and held: full progression, held. The one ceiling is the catalogue's seats: the freshman class cannot exceed what the housed courses have room to teach."
            value={enrolled.toLocaleString()}
            net
          />
        </div>
      </section>
    </div>
  );
}
