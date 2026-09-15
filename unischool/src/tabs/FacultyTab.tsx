import { Fragment, useEffect, useMemo, useState } from 'react';
import type { Action } from '../state/actions';
import type { Faculty, GameState } from '../state/types';
import { WEEKS_PER_YEAR } from '../state/types';
import { facultyQualityTier, CANDIDATE_LISTING_WEEKS } from '../data/facultyData';
import { facultyResearchOutput, labEquippedFields } from '../data/researchData';
import { researchTopic } from '../data/researchTopics';
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

// Teaching and research as a bar rather than a bare number, with the
// headroom to this hire's POTENTIAL shown behind the filled part.
//
// The numbers were always there, but comparing "T 62 · R 41" across twenty
// listings is slow work, and the potential — the thing that decides whether
// a cheap 40 is a bargain or a dead end — was buried behind an expand
// toggle. A bar answers both at a glance: how good they are now, and how
// much of them is still ahead.
function StatBar({ label, value, potential }: { label: string; value: number; potential: number }) {
  return (
    <span className="faculty-bar" title={`${label} ${value} of a possible ${potential}`}>
      <span className="faculty-bar-label">{label}</span>
      <span className="faculty-bar-track">
        <span className="faculty-bar-headroom" style={{ width: `${Math.max(0, Math.min(100, potential))}%` }} />
        <span className="faculty-bar-fill" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </span>
      <span className="faculty-bar-value">{value}</span>
    </span>
  );
}

// One person, as a card rather than a row in a table.
//
// The information is almost all what the row already carried; what changes
// is that a hire reads as a PERSON — the procedural portrait
// (FacultyPortrait.tsx) at a size you can actually see, their name and rank
// given the weight of a heading, their two stats as bars. The rank badge is
// facultyQualityTier, which was already the familiar academic ladder
// (Adjunct through Distinguished) and was already on the row; it was just
// rendered as one more small tag among several.
//
// Everything beyond that — bio, nationality, salary detail, what they are
// actually teaching — still lives one click away behind the same expand
// toggle, so a fifty-name roster stays a roster rather than becoming fifty
// spreadsheets.
function FacultyCard(
  { s, act, f, isCandidate, needed = false }:
  { s: GameState; act: (a: Action) => void; f: Faculty; isCandidate: boolean; needed?: boolean },
) {
  const [open, setOpen] = useState(false);
  const taught = isCandidate ? [] : coursesTaughtBy(s, f);
  // Two-step dismissal, armed only when there is something to lose. Reset
  // on blur so an armed button never sits waiting across an unrelated
  // interaction.
  const [confirmingDismiss, setConfirmingDismiss] = useState(false);
  const weeksLeft = Math.max(0, CANDIDATE_LISTING_WEEKS - f.weeksListed);
  const researches = !isCandidate && labEquippedFields(s).has(f.field);

  return (
    <li className={`faculty-card${needed ? ' needed' : ''}`}>
      <div className="faculty-card-main">
        <FacultyPortrait f={f} size={44} />
        <div className="faculty-card-body">
          <div className="faculty-card-head">
            <span className="faculty-name">{f.name}</span>
            {/* The prize badge. Permanent, and the only mark on a card that
                isn't derived from stats — see types.ts's Faculty.acclaim. */}
            {f.acclaim > 0 && (
              <span className="faculty-acclaim" title={`${f.acclaim} research ${f.acclaim === 1 ? 'prize' : 'prizes'}`}>
                {'★'.repeat(f.acclaim)}
              </span>
            )}
            <span className="faculty-card-spacer" />
            <span className="kind-tag">{facultyQualityTier(f)}</span>
          </div>
          <div className="faculty-card-field">
            {f.field}{needed && <span className="faculty-needed"> · needed</span>}
          </div>
          <div className="faculty-bars">
            <StatBar label="T" value={f.teaching} potential={f.teachingPotential} />
            <StatBar label="R" value={f.research} potential={f.researchPotential} />
          </div>
          <div className="faculty-card-foot">
            <span className="faculty-card-salary">${Math.round(f.salary / 1000)}k/yr</span>
            {isCandidate && (
              <span className={weeksLeft <= 2 ? 'candidate-expiry soon' : 'candidate-expiry'}>{weeksLeft}w left</span>
            )}
            {!isCandidate && <span className="faculty-card-tenure">{Math.floor(f.tenureWeeks / WEEKS_PER_YEAR)}y tenure</span>}
            <span className="faculty-card-spacer" />
            <button
              type="button"
              className="faculty-expand-btn"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-label={open ? `Show less about ${f.name}` : `Show more about ${f.name}`}
            >
              {open ? '▾ less' : '▸ more'}
            </button>
            {isCandidate ? (
              <button className="appoint" onClick={() => act({ type: 'HIRE_FACULTY', facultyId: f.id })}>Appoint</button>
            ) : (
              <button
                className={confirmingDismiss ? 'dismiss-confirm' : undefined}
                onClick={() => {
                  if (!confirmingDismiss && taught.length > 0) { setConfirmingDismiss(true); return; }
                  act({ type: 'FIRE_FACULTY', facultyId: f.id });
                }}
                onBlur={() => setConfirmingDismiss(false)}
              >
                {confirmingDismiss ? 'Confirm — leave them unstaffed' : 'Dismiss'}
              </button>
            )}
          </div>
        </div>
      </div>
      {/* Dismissing someone now ORPHANS whatever they teach: their
          assignments are cleared and those courses go unstaffed until
          somebody else takes them (see the reducer's FIRE_FACULTY). That
          is a consequence that outlives the click and is invisible on this
          screen — the roster shrinking is obvious, four courses quietly
          losing their teacher is not — so it is spelled out, by name,
          BEFORE the second click rather than logged after it.

          Someone teaching nothing is dismissed on the first click, with no
          confirm step: there is nothing to warn about, and a confirmation
          that always fires is one people learn to click through. */}
      {confirmingDismiss && taught.length > 0 && (
        <p className="faculty-dismiss-warning">
          {f.name} teaches {taught.length} {taught.length === 1 ? 'course' : 'courses'}, which will be left
          without an instructor: {taught.map((c) => c.name.split(' · ')[0]).join(', ')}.
        </p>
      )}
      {open && (
        <div className="faculty-card-detail">
          <p className="faculty-bio">{f.bio}</p>
          <dl>
            <dt>Nationality</dt><dd>{f.nationality}</dd>
            <dt>Teaching</dt><dd>{f.teaching} <span className="outcome-note">(→ {f.teachingPotential})</span></dd>
            <dt>Research</dt><dd>{f.research} <span className="outcome-note">(→ {f.researchPotential})</span></dd>
            <dt>Salary</dt><dd>${f.salary.toLocaleString()}/yr</dd>
            <dt>Course slots</dt><dd>{f.courseSlots}</dd>
            {f.acclaim > 0 && <><dt>Prizes won</dt><dd>{f.acclaim}</dd></>}
            {/* Research output, shown for roster members only: a candidate
                produces nothing until they are appointed, and how much
                they'd produce depends on whether the school they'd join
                has a lab at all. */}
            {!isCandidate && (
              <>
                <dt>Scholarly output</dt>
                <dd>
                  {researches
                    ? `${facultyResearchOutput(f).toFixed(2)} pts/wk`
                    : `none — no research facility in ${f.field}'s school`}
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
// WHO IS AWAY, and until when.
//
// This panel used to be the whole research system: a banked-points figure,
// a weekly rate, output counters, a facilities multiplier, and a
// school-by-school lab gate. All of that described a model where the
// campus produced research for owning buildings, and every line of it
// was wrong the moment initiatives landed — the banked figure read zero
// forever because nothing writes that stock any more, and the rate
// reported what lab-equipped faculty COULD produce, which stopped
// corresponding to anything once production moved inside a running
// project.
//
// The whole of that belongs to the Research tab, where it now lives
// properly, and duplicating it here only gave a player two screens
// disagreeing about the same thing.
//
// What is left is the one part of research that is genuinely a FACULTY
// question: which of these people are committed, to what, and for how
// much longer — because a committed scholar is not teaching, and the
// roster screen is where the player notices their department is short.
// ---------------------------------------------------------------------
function ResearchPanel({ s, full }: { s: GameState; full: boolean }) {
  const equipped = labEquippedFields(s);
  const schools = researchSchools().filter((school) => school.labIds.length > 0);

  // Who is on what. Read off the running initiatives rather than asking
  // each person in turn, so the panel costs one pass over a handful of
  // projects instead of one over the whole roster per project.
  const commitments = new Map<string, { topic: string; weeksRemaining: number; weeksTotal: number }>();
  for (const initiative of Object.values(s.research.initiatives)) {
    const topic = researchTopic(initiative.topicId);
    for (const id of initiative.participantIds) {
      commitments.set(id, {
        topic: topic?.name ?? 'a project',
        weeksRemaining: initiative.weeksRemaining,
        weeksTotal: initiative.weeksTotal,
      });
    }
  }
  const committed = s.faculty.filter((f) => commitments.has(f.id));
  const free = s.faculty.filter((f) => equipped.has(f.field) && !commitments.has(f.id)).length;

  return (
    <section className={full ? 'panel panel-span-2' : 'panel'}>
      <div className="panel-head">
        <span className="panel-head-title">
          <h2>Research</h2>
          <HelpHint text="A scholar committed to a research project teaches a reduced load for its whole duration — two course slots fewer, so a junior professor may stop teaching entirely while a senior one keeps most of their catalogue. Whatever no longer fits is handed to a colleague in the same field who has room, and left without an instructor only if nobody does — their lowest-tier courses go first, so a capstone stays with the person who knows it. That is the real price of a deep project, and it is why a university needs a bench rather than just good people. Projects themselves, and the facilities that host them, are on the Research tab." />
        </span>
        <span className="stat">{committed.length} committed</span>
      </div>

      {schools.every((school) => !school.labIds.some((id) => s.tech.find((t) => t.id === id)?.status === 'done')) ? (
        <p className="empty-note">
          No research facility finished, so nobody can be committed to a project yet. Every school can
          build one — a lab, an institute, a studio or a computing centre — once its building and that
          major&apos;s entry course are done.
        </p>
      ) : committed.length === 0 ? (
        <p className="empty-note">
          Nobody is committed to a project. {free > 0
            ? `${free} of the roster could be — start one from the Research tab.`
            : 'No scholar is in a school with a finished facility.'}
        </p>
      ) : (
        <>
          {/* THE ROSTER'S SIDE of the initiative system, and the only part
              of it that belongs on this screen: which of these people are
              unavailable to teach, and until when. Everything about
              facilities, output and funding is the Research tab's — this
              panel used to carry all of it, describing a banked-points
              model that no longer exists. */}
          <div className="commitment-list">
            {committed.map((f) => {
              const on = commitments.get(f.id)!;
              return (
                <div key={f.id} className="commitment">
                  <span className="commitment-who">
                    <span className="commitment-name">{f.name}</span>
                    <span className="commitment-field">{f.field}</span>
                  </span>
                  <span className="commitment-what">
                    <span className="commitment-topic">{on.topic}</span>
                    <span className="commitment-left">
                      {on.weeksRemaining} of {on.weeksTotal} weeks left · not teaching
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
          {free > 0 && (
            <p className="outcome-note commitment-free">
              {free} more {free === 1 ? 'scholar is' : 'scholars are'} in a school with a facility and
              free to join a project.
            </p>
          )}
        </>
      )}
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
            {s.faculty.map((f) => <FacultyCard key={f.id} s={s} act={act} f={f} isCandidate={false} />)}
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
              <FacultyCard key={c.id} s={s} act={act} f={c} isCandidate={true} needed={shortFields.has(c.field)} />
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
