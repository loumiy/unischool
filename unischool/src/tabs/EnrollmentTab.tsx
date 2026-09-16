import type { CohortCounts, CohortId, GameState } from '../state/types';
import { totalEnrolled } from '../state/types';
import { COHORTS, baseShareCohortCounts } from '../systems/admissions/cohorts';

// ---------------------------------------------------------------------
// The Enrollment tab: who attends this university, and what the funnel
// that produced them is doing.
//
// The standing body is the half that needed new state to exist at all. A
// class's cohort composition is recorded when it is ADMITTED and carried to
// graduation (see types.ts's ClassCohorts) — so the four bars below are
// four different schools stacked on top of each other: the seniors are a
// reading of what this university pulled in four years ago, the freshmen
// are what it pulls in now. That comparison IS the content. Deriving the
// mix instead would have made every bar a reading of today's campus and
// left nothing to compare.
//
// Tuition is only ever set once a year, at the summer admissions interrupt
// (see InterruptModal.tsx) — this tab is the read-only picture of where
// things stand between those decisions.
// ---------------------------------------------------------------------

// Youngest first, top to bottom. Two readings agree on this order, which is
// why it is not a toss-up: it is the order Treasury lists classes in and the
// order reducer.ts advances them, AND it puts the most recently admitted
// class at the top with the oldest at the bottom, so the four bars read as
// strata laid down in sequence.
const CLASS_ROWS: ReadonlyArray<[keyof GameState['students']['classes'], string]> = [
  ['freshman', 'Freshmen'],
  ['sophomore', 'Sophomores'],
  ['junior', 'Juniors'],
  ['senior', 'Seniors'],
];

// SEVEN CATEGORICAL COLOURS ON PARCHMENT, which is the one genuinely new
// thing this screen asks of the palette — every chart in the game until now
// (see HistoryTab.tsx) has been a single line needing no hues at all.
//
// They are pigments rather than a spectrum: brass, ink-blue, moss, oxblood,
// terracotta, plum, ochre — the range a printed almanac of this era could
// actually be tinted in. All are desaturated and mid-dark so they sit ON
// parchment rather than glowing against it, and so white segment labels
// stay legible on every one of them. A bright categorical palette would
// read at a glance and would look like a different game's UI.
const COHORT_COLOR: Record<CohortId, string> = {
  highAchievers: '#8a6d14',    // brass — the same finished-work tone as --brass-deep
  preProfessional: '#3c4d6b',  // ink blue
  researchOriented: '#4a6b46', // moss
  social: '#8c4a3f',           // oxblood
  artsFocused: '#a9683a',      // terracotta
  priceSensitive: '#6a4a63',   // plum
  athletes: '#a98a3c',         // ochre
};

// A class whose mix carries NO PULL from anything the school had built —
// exactly the base shares, apportioned to its own head count.
//
// Derived rather than flagged in state, and the label is written to be true
// of every case that produces it rather than guessing between them. Three
// do: the founding body (four classes that arrived before the player had
// built anything), a save written before this record existed (filled in with
// the same prior — see persistence.ts's MIGRATIONS[39]), and a class genuinely
// admitted while the school had built nothing and priced at what its standing
// supported. All three mean the same thing about the bar, which is why the
// note says "no cohort signal" rather than claiming to know which it was.
function hasNoCohortSignal(counts: CohortCounts, total: number): boolean {
  const prior = baseShareCohortCounts(total);
  return COHORTS.every((c) => counts[c.id] === prior[c.id]);
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
      {/* The bar's LENGTH is the class's size, against the largest class —
          not a normalised 100% row. Normalising reads better for comparing
          proportions alone, and is the wrong trade here: class sizes vary by
          half again across four years, and a row that hides that shows four
          bars of identical length whose mixes differ by a few percent, which
          looks like four copies of one bar. Length carries the size, the
          segments carry the mix, and the two together are what makes one
          class visibly a different school from the one below it. */}
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

  // The whole body, cohort by cohort: the four classes summed. Derived here
  // rather than stored, for the reason totalEnrolled is — a second copy of a
  // sum is a second thing that can drift from what it sums.
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
            <span className="body-legend-item" key={c.id} title={c.driverLabel}>
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
        <h2>Enrollment</h2>
        <dl>
          <dt>Enrolled</dt><dd>{enrolled.toLocaleString()}</dd>
          <dt>Satisfaction</dt><dd>{Math.round(s.students.satisfaction)}</dd>
          <dt>Applicant pool</dt><dd>{Math.round(s.students.applicantPool)}</dd>
          <dt>Admit rate</dt><dd>{Math.round(s.students.admitRate * 100)}%</dd>
          <dt>Incoming quality</dt><dd>{Math.round(s.students.incomingQuality)} / 100</dd>
        </dl>
        <p className="empty-note demand-note">Word of mouth: student satisfaction scales next summer's applicant pool.</p>
      </section>
    </div>
  );
}
