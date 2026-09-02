import { Fragment, useMemo, useState } from 'react';
import type { Action } from '../state/actions';
import type { Buildable, Faculty, GameState } from '../state/types';
import { WEEKS_PER_YEAR } from '../state/types';
import { facultyQualityTier, CANDIDATE_LISTING_WEEKS } from '../data/facultyData';
import { usedFacultySlots, totalFacultySlots } from '../systems/techtree/techSystem';
import HelpHint from '../components/HelpHint';

// The two halves of the faculty picture, side by side: who you have, and
// who is on the market. They are half-width panels rather than stacked
// sections because the candidate list is the thing a player comes here to
// scan — a roster that has grown to fifty names must never push it below
// the fold.
//
// Recruiting is a standing, churning market (see facultyData.ts's churn
// block and facultySystem.ts's tickCandidatePool): there is no posting to
// pay for and no countdown to wait out. Every week some listings withdraw
// and new ones arrive, weighted so common fields are nearly always
// represented and thin-market specialists turn up only now and then.
// Appointing is immediate; what costs is the salary they start drawing.
//
// Growth (teaching/research rising toward each hire's rolled potential,
// salary rising with it, course slots growing on tenure milestones)
// happens passively on the weekly tick — see facultySystem.ts.
//
// Each roster/candidate row shows only a name, field, and quality tier by
// default — everything else (bio, full stats including nationality, and what
// they're actually teaching) is one click away behind an expand toggle, so
// the tab reads as a roster, not a spreadsheet. Candidate rows carry one
// extra always-visible line (stats and how long the listing has left),
// because spotting a good specialist before it withdraws is the whole
// scanning job this panel exists for. The row carries no flag glyph: the
// emoji flags failed to render in some browsers, so nationality lives in
// the expanded detail as plain text only.

// Course-to-teacher assignment is a display-only projection: the engine
// only tracks course-slot CAPACITY per field (courseSlots), never which
// specific hire teaches which specific course. Deterministically round-
// robins a field's currently-offered (developing/done) requiresFaculty-gated
// courses across that field's faculty, sorted by id, so "what are they
// teaching" reads as a stable, real-looking answer rather than nothing —
// without inventing new persisted state for it.
function coursesTaughtBy(s: GameState, f: Faculty): Buildable[] {
  const fieldFaculty = s.faculty.filter((x) => x.field === f.field).sort((a, b) => a.id.localeCompare(b.id));
  const idx = fieldFaculty.findIndex((x) => x.id === f.id);
  if (idx === -1 || fieldFaculty.length === 0) return [];
  const fieldCourses = s.tech
    .filter((t) => t.requiresFaculty === f.field && (t.status === 'developing' || t.status === 'done'))
    .sort((a, b) => a.id.localeCompare(b.id));
  return fieldCourses.filter((_, i) => i % fieldFaculty.length === idx);
}

function FacultyRow(
  { s, act, f, isCandidate, needed = false }:
  { s: GameState; act: (a: Action) => void; f: Faculty; isCandidate: boolean; needed?: boolean },
) {
  const [open, setOpen] = useState(false);
  const taught = isCandidate ? [] : coursesTaughtBy(s, f);
  const weeksLeft = Math.max(0, CANDIDATE_LISTING_WEEKS - f.weeksListed);

  return (
    <li className="faculty-row">
      <div className="faculty-row-summary">
        <button
          type="button"
          className="faculty-expand-btn"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? 'Show less' : 'Show more'}
        >
          {open ? '▾' : '▸'}
        </button>
        <span className="faculty-name">{f.name}</span>
        {!isCandidate && <span className="stat">{f.field}</span>}
        <span className="kind-tag">{facultyQualityTier(f)}</span>
        <span className="faculty-row-spacer" />
        {isCandidate ? (
          <button className="appoint" onClick={() => act({ type: 'HIRE_FACULTY', facultyId: f.id })}>Appoint</button>
        ) : (
          <button onClick={() => act({ type: 'FIRE_FACULTY', facultyId: f.id })}>Dismiss</button>
        )}
      </div>
      {/* Candidates only: the at-a-glance line. Field first and unabbreviated
          (it is what you are scanning for), marked when the school is
          actually short in it, then the two stats that decide whether
          they're worth the salary, then the deadline. */}
      {isCandidate && (
        <div className="candidate-meta">
          <span className={needed ? 'candidate-field needed' : 'candidate-field'}>
            {f.field}{needed ? ' · needed' : ''}
          </span>
          <span className="candidate-stats">T {f.teaching} · R {f.research}</span>
          <span className="candidate-salary">${Math.round(f.salary / 1000)}k</span>
          <span className={weeksLeft <= 2 ? 'candidate-expiry soon' : 'candidate-expiry'}>{weeksLeft}w left</span>
        </div>
      )}
      {open && (
        <div className="faculty-row-detail">
          <p className="faculty-bio">{f.bio}</p>
          <dl>
            <dt>Nationality</dt><dd>{f.nationality}</dd>
            <dt>Teaching</dt><dd>{f.teaching} <span className="outcome-note">(→ {f.teachingPotential})</span></dd>
            <dt>Research</dt><dd>{f.research} <span className="outcome-note">(→ {f.researchPotential})</span></dd>
            <dt>Salary</dt><dd>${f.salary.toLocaleString()}/yr</dd>
            {!isCandidate && <><dt>Tenure</dt><dd>{Math.floor(f.tenureWeeks / WEEKS_PER_YEAR)}y</dd></>}
            <dt>Course slots</dt><dd>{f.courseSlots}</dd>
          </dl>
          {!isCandidate && (
            <div className="faculty-courses">
              <span className="stat">Courses taught</span>
              {taught.length > 0 ? (
                <ul className="faculty-courses-list">
                  {taught.map((t) => <li key={t.id}>{t.name}{t.status === 'developing' ? ' — in development' : ''}</li>)}
                </ul>
              ) : (
                <p className="empty-note">No {f.field} courses currently offered.</p>
              )}
            </div>
          )}
        </div>
      )}
    </li>
  );
}

// Sentinel for the candidate filter's "show everything" option. A plain
// empty string rather than a field name so it can never collide with one.
const ALL_FIELDS = '';

export default function FacultyTab({ s, act }: { s: GameState; act: (a: Action) => void }) {
  const [fieldFilter, setFieldFilter] = useState<string>(ALL_FIELDS);

  // Every field a requiresFaculty-gated course actually needs, so the slots
  // summary only shows fields that matter for starting new development —
  // not every field the market can produce a candidate in.
  const gatedFields = [...new Set(s.tech.filter((t) => t.requiresFaculty).map((t) => t.requiresFaculty!))].sort();

  // Fields the school is actually short on right now: a gated course is
  // sitting available and there's no free slot to start it. This is what
  // turns a thirty-name list into a shortlist — the fields flagged here are
  // the ones worth appointing into today.
  const shortFields = useMemo(
    () => new Set(
      s.tech
        .filter((t) => t.status === 'available' && t.requiresFaculty)
        .map((t) => t.requiresFaculty!)
        .filter((field) => usedFacultySlots(s, field) >= totalFacultySlots(s, field)),
    ),
    [s],
  );

  // Grouped by field, then best first within a field, so scanning for a
  // specialist means finding one block rather than sweeping thirty rows.
  // Fields the school is short on sort to the top of the list.
  const sortedCandidates = useMemo(() => {
    const rank = (c: Faculty) => (shortFields.has(c.field) ? 0 : 1);
    return [...s.candidates].sort((a, b) =>
      rank(a) - rank(b) ||
      a.field.localeCompare(b.field) ||
      (b.teaching + b.research) - (a.teaching + a.research));
  }, [s.candidates, shortFields]);

  const fieldsInPool = useMemo(
    () => [...new Set(s.candidates.map((c) => c.field))].sort(),
    [s.candidates],
  );
  const visibleCandidates = fieldFilter === ALL_FIELDS
    ? sortedCandidates
    : sortedCandidates.filter((c) => c.field === fieldFilter);

  return (
    <div className="tab-content">
      <div className="faculty-columns">
        <section className="panel">
          <div className="panel-head">
            <span className="panel-head-title">
              <h2>Roster</h2>
              <HelpHint text="Everyone currently employed. Retained faculty grow toward their potential and get more expensive as they do; each carries course slots that gate how many courses in their field the school can offer at once." />
            </span>
            <span className="stat">{s.faculty.length} on payroll</span>
          </div>
          <ul className="faculty-list">
            {s.faculty.map((f) => <FacultyRow key={f.id} s={s} act={act} f={f} isCandidate={false} />)}
            {s.faculty.length === 0 && <li className="empty-note">No faculty on the roster.</li>}
          </ul>
        </section>

        <section className="panel">
          <div className="panel-head">
            <span className="panel-head-title">
              <h2>On the Market</h2>
              <HelpHint text={`The academic job market as it stands this week. Appointing is immediate — no posting, no fee, no waiting — but a listing withdraws after ${CANDIDATE_LISTING_WEEKS} weeks if nobody takes it, and the mix turns over constantly. Common fields are nearly always represented; specialists in thin markets show up only now and then, so take one when you see one. Fields you're short on are flagged and sorted to the top.`} />
            </span>
            <span className="stat">{s.candidates.length} listed</span>
          </div>
          <div className="candidate-filter">
            <select value={fieldFilter} onChange={(e) => setFieldFilter(e.target.value)}>
              <option value={ALL_FIELDS}>All fields ({s.candidates.length})</option>
              {fieldsInPool.map((field) => (
                <option key={field} value={field}>
                  {field} ({s.candidates.filter((c) => c.field === field).length}){shortFields.has(field) ? ' — needed' : ''}
                </option>
              ))}
            </select>
          </div>
          <ul className="faculty-list candidate-list">
            {visibleCandidates.map((c) => (
              <FacultyRow key={c.id} s={s} act={act} f={c} isCandidate={true} needed={shortFields.has(c.field)} />
            ))}
            {visibleCandidates.length === 0 && (
              <li className="empty-note">
                {s.candidates.length === 0
                  ? 'Nobody on the market this week.'
                  : `No ${fieldFilter} candidates listed right now — check back as the market turns over.`}
              </li>
            )}
          </ul>
        </section>
      </div>

      {gatedFields.length > 0 && (
        <section className="panel">
          <div className="panel-head">
            <span className="panel-head-title">
              <h2>Course Slots by Field</h2>
              <HelpHint text="A field-gated course occupies one slot in its field for as long as it's under development or done — hire more (or more tenured) faculty in a field to unlock offering more courses in it." />
            </span>
          </div>
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
    </div>
  );
}
