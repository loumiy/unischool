import { Fragment, useState } from 'react';
import type { Action } from '../state/actions';
import type { Buildable, Faculty, GameState } from '../state/types';
import { WEEKS_PER_YEAR } from '../state/types';
import { facultyQualityTier, FACULTY_FIELDS, JOB_POSTING_COST } from '../data/facultyData';
import { usedFacultySlots, totalFacultySlots } from '../systems/techtree/techSystem';
import HelpHint from '../components/HelpHint';

// Faculty roster, open job postings, and the pool of candidates postings
// have produced. Hiring is a job-posting model, not a passive draw-and-
// discard pool (see facultyData.ts's header comment): a candidate in a
// given field only ever shows up in Candidates below because the player
// posted (and paid for) an opening in that field and waited out the
// countdown — there is no free reroll. Growth (teaching/research rising
// toward each hire's rolled potential, salary rising with it, course slots
// growing on tenure milestones) happens passively on the weekly tick — see
// facultySystem.ts.
//
// Each roster/candidate row shows only a name, field, nationality flag, and
// quality tier by default — everything else (bio, full stats, and what
// they're actually teaching) is one click away behind an expand toggle, so
// the tab reads as a roster, not a spreadsheet.

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

function FacultyRow({ s, act, f, isCandidate }: { s: GameState; act: (a: Action) => void; f: Faculty; isCandidate: boolean }) {
  const [open, setOpen] = useState(false);
  const taught = isCandidate ? [] : coursesTaughtBy(s, f);

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
        <span className="faculty-flag" title={f.nationality}>{f.flag}</span>
        <span className="faculty-name">{f.name}</span>
        <span className="stat">{f.field}</span>
        <span className="kind-tag">{facultyQualityTier(f)}</span>
        <span className="faculty-row-spacer" />
        {isCandidate ? (
          <button className="appoint" onClick={() => act({ type: 'HIRE_FACULTY', facultyId: f.id })}>Appoint</button>
        ) : (
          <button onClick={() => act({ type: 'FIRE_FACULTY', facultyId: f.id })}>Dismiss</button>
        )}
      </div>
      {open && (
        <div className="faculty-row-detail">
          <p className="faculty-bio">{f.bio}</p>
          <dl>
            <dt>Nationality</dt><dd>{f.flag} {f.nationality}</dd>
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

export default function FacultyTab({ s, act }: { s: GameState; act: (a: Action) => void }) {
  const [postingField, setPostingField] = useState<string>(FACULTY_FIELDS[0]);

  // Every field a requiresFaculty-gated course actually needs, so the slots
  // summary only shows fields that matter for starting new development —
  // not the full candidate-generation pool in facultyData.ts.
  const gatedFields = [...new Set(s.tech.filter((t) => t.requiresFaculty).map((t) => t.requiresFaculty!))].sort();

  const postingAlreadyOpen = postingField in s.openPostings;
  const openableFields = FACULTY_FIELDS.filter((field) => !(field in s.openPostings));
  const affordableOpenings = Math.min(openableFields.length, Math.floor(s.finance.cash / JOB_POSTING_COST));

  return (
    <div className="tab-content">
      <section className="panel">
        <h2>Faculty</h2>
        <ul className="faculty-list">
          {s.faculty.map((f) => <FacultyRow key={f.id} s={s} act={act} f={f} isCandidate={false} />)}
          {s.faculty.length === 0 && <li className="empty-note">No faculty on the roster.</li>}
        </ul>
      </section>

      <section className="panel">
        <div className="panel-head">
          <span className="panel-head-title">
            <h2>Recruit Faculty</h2>
            <HelpHint text={`Post an opening in a field to recruit for it — a candidate arrives after a few weeks. At most one open posting per field at a time; re-post once it resolves for another candidate. "Recruit All" posts one in every field that doesn't already have an open posting, at the same $${JOB_POSTING_COST.toLocaleString()}/field rate, for as many fields as cash allows.`} />
          </span>
        </div>
        <div className="posting-control">
          <select value={postingField} onChange={(e) => setPostingField(e.target.value)}>
            {FACULTY_FIELDS.map((field) => (
              <option key={field} value={field}>
                {field}{field in s.openPostings ? ` — posted, ${s.openPostings[field]}w left` : ''}
              </option>
            ))}
          </select>
          <button
            disabled={s.finance.cash < JOB_POSTING_COST || postingAlreadyOpen}
            title={postingAlreadyOpen
              ? 'A posting for this field is already open.'
              : s.finance.cash < JOB_POSTING_COST
                ? 'Not enough cash to post this opening.'
                : undefined}
            onClick={() => act({ type: 'POST_JOB', field: postingField })}
          >
            Post Opening — ${JOB_POSTING_COST.toLocaleString()}
          </button>
          <button
            disabled={affordableOpenings === 0}
            title={openableFields.length === 0
              ? 'Every field already has an open posting.'
              : affordableOpenings === 0
                ? 'Not enough cash to post any openings.'
                : affordableOpenings < openableFields.length
                  ? `Posts as many as cash allows: ${affordableOpenings} of ${openableFields.length} remaining fields.`
                  : `Posts an opening for all ${openableFields.length} remaining fields.`}
            onClick={() => act({ type: 'POST_ALL_JOBS' })}
          >
            Recruit All — ${JOB_POSTING_COST.toLocaleString()}/field
          </button>
        </div>
      </section>

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

      <section className="panel">
        <h2>Candidates</h2>
        <ul className="faculty-list">
          {s.candidates.map((c) => <FacultyRow key={c.id} s={s} act={act} f={c} isCandidate={true} />)}
          {s.candidates.length === 0 && <li className="empty-note">No candidates right now — post an opening above.</li>}
        </ul>
      </section>
    </div>
  );
}
