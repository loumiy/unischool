import { Fragment, useEffect, useMemo, useState } from 'react';
import type { Action } from '../state/actions';
import type { Faculty, GameState } from '../state/types';
import { WEEKS_PER_YEAR } from '../state/types';
import { facultyQualityTier, CANDIDATE_LISTING_WEEKS } from '../data/facultyData';
import {
  facultyResearchOutput, labEquippedFields, researchRateMultiplier, weeklyResearchPoints,
} from '../data/researchData';
import { researchSchools } from '../data/techData';
import { usedFacultySlots, totalFacultySlots, neededFacultyFields } from '../systems/techtree/techSystem';
import { coursesTaughtBy } from '../systems/faculty/facultyAssignment';
import HelpHint from '../components/HelpHint';
import FacultyPortrait from '../components/FacultyPortrait';

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

function FacultyRow(
  { s, act, f, isCandidate, needed = false }:
  { s: GameState; act: (a: Action) => void; f: Faculty; isCandidate: boolean; needed?: boolean },
) {
  const [open, setOpen] = useState(false);
  const taught = isCandidate ? [] : coursesTaughtBy(s, f);
  const weeksLeft = Math.max(0, CANDIDATE_LISTING_WEEKS - f.weeksListed);
  const researches = !isCandidate && labEquippedFields(s).has(f.field);

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
        <FacultyPortrait f={f} size={22} />
        <span className="faculty-name">{f.name}</span>
        {/* The prize badge. Permanent, and the only mark on a roster row
            that isn't derived from stats — see types.ts's Faculty.acclaim. */}
        {f.acclaim > 0 && (
          <span className="faculty-acclaim" title={`${f.acclaim} research ${f.acclaim === 1 ? 'prize' : 'prizes'}`}>
            {'★'.repeat(f.acclaim)}
          </span>
        )}
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
          <div className="faculty-detail-head">
            <FacultyPortrait f={f} size={48} />
            <p className="faculty-bio">{f.bio}</p>
          </div>
          <dl>
            <dt>Nationality</dt><dd>{f.nationality}</dd>
            <dt>Teaching</dt><dd>{f.teaching} <span className="outcome-note">(→ {f.teachingPotential})</span></dd>
            <dt>Research</dt><dd>{f.research} <span className="outcome-note">(→ {f.researchPotential})</span></dd>
            <dt>Salary</dt><dd>${f.salary.toLocaleString()}/yr</dd>
            {!isCandidate && <><dt>Tenure</dt><dd>{Math.floor(f.tenureWeeks / WEEKS_PER_YEAR)}y</dd></>}
            <dt>Course slots</dt><dd>{f.courseSlots}</dd>
            {f.acclaim > 0 && <><dt>Prizes won</dt><dd>{f.acclaim}</dd></>}
            {/* Research output, shown for roster members only: a candidate
                produces nothing until they are appointed, and how much
                they'd produce depends on whether the school they'd join
                has a lab at all. */}
            {!isCandidate && (
              <>
                <dt>Research output</dt>
                <dd>
                  {researches
                    ? `${facultyResearchOutput(f).toFixed(2)} pts/wk`
                    : `none — no lab in ${f.field}'s school`}
                </dd>
              </>
            )}
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

// ---------------------------------------------------------------------
// The research panel. Research is meant to be mostly silent (see README's
// "Research"): grants and breakthroughs land as log lines and nothing
// else, so this is where a player who wants to understand WHY comes to
// look. It reads the same pure functions the tick applies, so the rate
// shown is exactly the rate that accumulates.
//
// It lives on the Faculty tab rather than in a tab of its own because
// research is a property of the roster: who is producing it, and which
// schools have a lab for them to produce it in, are both faculty
// questions. A dedicated tab would be a fifth screen for one stock and
// three counters.
//
// Deliberately shows the LAB GATE first, including the schools that are
// producing nothing. That gate is the whole rule, and a player wondering
// why their thirty professors generate no research needs to be told
// which building answers it, not left to infer it.
// ---------------------------------------------------------------------
function ResearchPanel({ s, full }: { s: GameState; full: boolean }) {
  const equipped = labEquippedFields(s);
  const schools = researchSchools().filter((school) => school.labIds.length > 0);
  const producing = s.faculty.filter((f) => equipped.has(f.field));
  const rate = weeklyResearchPoints(s);
  const multiplier = researchRateMultiplier(s);

  return (
    <section className={full ? 'panel panel-span-2' : 'panel'}>
      <div className="panel-head">
        <span className="panel-head-title">
          <h2>Research</h2>
          <HelpHint text="Faculty in a school that has finished a laboratory produce research points every week, weighted by how strong and how senior they are. Points accumulate, and every so often they convert into a grant (cash), a breakthrough (which feeds the prestige target), or — rarely — a prize for the researcher behind it. No lab, no research: a school with no laboratory contributes nothing however it is staffed." />
        </span>
        <span className="stat">{rate.toFixed(1)} pts/wk</span>
      </div>

      {equipped.size === 0 ? (
        <p className="empty-note">
          No laboratories finished, so the university does no research yet. A lab needs its
          school's building and that major's entry course first; the schools that can build one
          are {schools.map((school) => school.schoolName).join(', ')}.
        </p>
      ) : (
        <dl>
          <dt>Research points banked</dt>
          <dd>{Math.round(s.research.points).toLocaleString()}</dd>
          <dt>Produced all-time</dt>
          <dd>{Math.round(s.research.lifetimePoints).toLocaleString()}</dd>
          <dt>Researching faculty</dt>
          <dd>{producing.length} of {s.faculty.length} on the roster</dd>
          <dt>Facilities multiplier</dt>
          <dd>×{multiplier.toFixed(2)} <span className="outcome-note">(labs and the research library)</span></dd>
          <dt>Grants received</dt>
          <dd>{s.research.grants} — ${Math.round(s.research.grantIncome).toLocaleString()} in total</dd>
          <dt>Breakthroughs published</dt>
          <dd>{s.research.breakthroughs} <span className="outcome-note">(feeds the prestige target)</span></dd>
          <dt>Prizes awarded</dt>
          <dd>{s.research.prizes}</dd>
        </dl>
      )}

      <div className="research-schools">
        {schools.map((school) => {
          const built = school.labIds.filter(
            (id) => s.tech.find((t) => t.id === id)?.status === 'done',
          ).length;
          return (
            <div key={school.schoolName} className="research-school">
              <span>{school.schoolName}</span>
              <span className={built > 0 ? 'stat' : 'empty-note'}>
                {built > 0 ? `${built} of ${school.labIds.length} labs` : 'no lab — no research'}
              </span>
            </div>
          );
        })}
      </div>
    </section>
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
  const shortFields = useMemo(() => neededFacultyFields(s), [s]);

  // The faculty alert badge (see types.ts's SeenState): every candidate
  // currently flagged "needed" that this view hasn't reported seeing yet.
  // Marked the moment this tab is open (and again whenever a fresh one
  // shows up while it stays open — the dependency is the exact id set, not
  // just its length, so a swap of one needed candidate for another still
  // re-fires), which is what makes the badge go dark on open and never come
  // back for a candidate already shown. A candidate never flagged "needed"
  // is deliberately never marked seen here — if their field goes short
  // later while they're still listed, that's a fresh thing worth a badge.
  const unseenNeededIds = s.candidates
    .filter((c) => shortFields.has(c.field) && !s.seen.candidateIds[c.id])
    .map((c) => c.id);
  const unseenNeededKey = unseenNeededIds.join('|');
  useEffect(() => {
    if (unseenNeededIds.length > 0) act({ type: 'MARK_SEEN', kind: 'candidate', ids: unseenNeededIds });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unseenNeededKey]);

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
        {/* Research and Course Slots pair up the same way Roster/Market do
            above — auto-flowing into this grid's second row. Course Slots
            only exists once a school has a gated field (a founding school
            has none), and a lone half-width Research panel next to an
            empty gutter would read as a layout bug, so Research spans the
            full row instead whenever there's no partner. Research's own
            empty state (no labs finished) doesn't get the same treatment
            when a partner IS present — the empty-note text still reads
            fine at half width, and pairing stays predictable rather than
            reshuffling on Research's content alone. */}
        <ResearchPanel s={s} full={gatedFields.length === 0} />

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
    </div>
  );
}
