import { useMemo, useState } from 'react';
import type { Action } from '../state/actions';
import type { Faculty, GameState } from '../state/types';
import { WEEKS_PER_YEAR } from '../state/types';
import { facultyQualityTier, CANDIDATE_LISTING_WEEKS, FACULTY_FIELDS } from '../data/facultyData';
import { facultyResearchOutput, labEquippedFields } from '../data/researchData';
import { researchTopic } from '../data/researchTopics';
import { discoverySchools, professionalSchools } from '../data/techData';
import { usedFacultySlots, totalFacultySlots, neededFacultyFields } from '../systems/techtree/techSystem';
import { coursesTaughtBy } from '../systems/faculty/facultyAssignment';
import HelpHint from '../components/HelpHint';
import FacultyPortrait from '../components/FacultyPortrait';

// THE ROSTER, BY FIELD — a place you look at your faculty, not a place you
// hire from.
//
// It used to be two half-width columns, Roster and On the Market, plus a
// research panel and a table of slot counts. That shape was built for a
// loop that no longer exists: develop everything, appoint everyone the
// game tagged "needed", repeat. Hiring moved to the Curriculum tab, where
// the shortage is actually felt — you find out you need a kinesiologist
// when a course will not start — and this screen was left as the place you
// went to answer a prompt it should never have been giving.
//
// So: ONE SECTION PER FIELD, in the FACULTY_FIELDS grouping the rest of the
// game uses (humanities, social sciences, sciences, health, computing,
// engineering, business, law) rather than alphabetically, because a
// department sits next to its neighbours. Each section carries its own slot
// arithmetic in the header, its people as cards, and the candidates in that
// field underneath them — the market is not a separate place any more, it
// is a row of people who could join this department.
//
// THE HEADER ANSWERS "WHY DO I NEED ONE OF THESE", which no version of this
// tab ever did: its tooltip names the courses that pull from the field,
// grouped by the major they belong to.
//
// WHAT IS NOT RENDERED. A field with nobody hired, nobody listed and no
// course asking for it is not a department this university has — it is one
// of twenty-nine strings in a table, and printing it would bury the eight
// that are real. A field with courses but nobody in it IS rendered, and
// reads as the vacancy it is.
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
// Each card shows a name, field-relevant stats and what the person is
// working on; everything else (bio, nationality, salary detail, the course
// list) is one click away behind an expand toggle, so a fifty-name roster
// stays a roster rather than becoming fifty spreadsheets. Candidate cards
// carry one extra always-visible line (how long the listing has left),
// because spotting a good specialist before it withdraws is the whole
// scanning job. The card carries no flag glyph: the emoji flags failed to
// render in some browsers, so nationality lives in the expanded detail as
// plain text only.

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
  { s, act, f, isCandidate, commitment }:
  {
    s: GameState; act: (a: Action) => void; f: Faculty; isCandidate: boolean;
    // What this person is committed to, if anything (see the roster's
    // commitment map below). The old research panel listed these
    // separately, which meant a player scanning a thin department for who
    // could cover a course had to read two lists and cross-reference them.
    commitment?: Commitment;
  },
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
    <li className={`faculty-card${commitment ? ' committed' : ''}`}>
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
          {/* WHAT THEY ARE WORKING ON. A committed scholar is the single
              most useful thing this screen can tell you about a
              department — they are teaching two courses fewer for the next
              six months to five years (techSystem.ts's
              RESEARCH_COMMITMENT_SLOTS) — so it sits on the card rather
              than in a panel of its own further down the page. The field
              itself is the section heading now, so the line that used to
              repeat it carries this instead. */}
          <div className="faculty-card-field">
            {commitment ? (
              <span className="faculty-commitment" title={`${commitment.topic} · ${commitment.labName}`}>
                On <strong>{commitment.topic}</strong>
                <span className="faculty-commitment-left">
                  {' '}· {commitment.weeksRemaining} of {commitment.weeksTotal} weeks left
                </span>
              </span>
            ) : isCandidate ? (
              <span className="faculty-card-listing">On the market</span>
            ) : taught.length > 0 ? (
              <span className="faculty-card-teaching">
                Teaching {taught.length} {taught.length === 1 ? 'course' : 'courses'}
              </span>
            ) : (
              <span className="faculty-card-teaching idle">Teaching nothing</span>
            )}
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

// What somebody is committed to, flattened from the running initiatives so
// a card can read it without walking every project (see the roster below).
interface Commitment {
  topic: string;
  labName: string;
  weeksRemaining: number;
  weeksTotal: number;
}

// Everyone committed to a project right now, by faculty id. One pass over a
// handful of initiatives rather than one pass over the roster per project.
function commitmentsByFaculty(s: GameState): Map<string, Commitment> {
  const map = new Map<string, Commitment>();
  for (const initiative of Object.values(s.research.initiatives)) {
    const topic = researchTopic(initiative.topicId);
    const commitment: Commitment = {
      topic: topic?.name ?? 'a project',
      labName: s.tech.find((t) => t.id === initiative.labId)?.name ?? 'a facility',
      weeksRemaining: initiative.weeksRemaining,
      weeksTotal: initiative.weeksTotal,
    };
    for (const id of initiative.participantIds) map.set(id, commitment);
  }
  return map;
}

// WHICH COURSES PULL FROM THIS FIELD, grouped by the major they belong to —
// the answer to "why do I need a kinesiologist", which no version of this
// tab has ever given. Read off the same discovery metadata the Curriculum
// tab groups by, so the grouping the player sees here is the grouping they
// see there.
//
// Only courses that EXIST as far as the player is concerned are counted:
// a locked course is not yet a reason for anything.
function courseDemandByMajor(s: GameState, field: string): Array<{ group: string; courses: string[] }> {
  const wanted = new Map<string, string>();
  for (const t of s.tech) {
    if (t.requiresFaculty === field && t.status !== 'locked') wanted.set(t.id, t.name.split(' · ').pop() ?? t.name);
  }
  if (wanted.size === 0) return [];

  const groups: Array<{ group: string; courses: string[] }> = [];
  const take = (group: string, ids: readonly string[]) => {
    const courses = ids.filter((id) => wanted.has(id)).map((id) => wanted.get(id)!);
    if (courses.length > 0) {
      groups.push({ group, courses });
      for (const id of ids) wanted.delete(id);
    }
  };

  for (const school of discoverySchools()) {
    take(`${school.name} core`, school.coreIds);
    for (const major of school.majors) {
      take(major.name, [major.tier1Id, ...major.tier2Ids, ...major.tier3Ids]);
    }
    for (const program of school.graduate) take(program.name, program.courseIds);
  }
  for (const program of professionalSchools()) take(program.name, program.courseIds);

  // Anything the discovery metadata does not place (there is nothing today,
  // but a future course kind would land here rather than vanishing).
  if (wanted.size > 0) groups.push({ group: 'Elsewhere', courses: [...wanted.values()] });
  return groups;
}

// One department: its slot arithmetic, its people, and who could join it.
function FieldSection(
  { s, act, field, hired, candidates, commitments, short }:
  {
    s: GameState; act: (a: Action) => void; field: string;
    hired: Faculty[]; candidates: Faculty[];
    commitments: Map<string, Commitment>;
    short: boolean;
  },
) {
  const used = usedFacultySlots(s, field);
  const total = totalFacultySlots(s, field);
  const demand = useMemo(() => courseDemandByMajor(s, field), [s, field]);

  const demandCount = demand.reduce((n, g) => n + g.courses.length, 0);
  const demandText = demand.length > 0
    ? `${field} teaches ${demandCount} ${demandCount === 1 ? 'course' : 'courses'} the school has revealed: `
      + demand.map((g) => `${g.group} (${g.courses.join(', ')})`).join('; ')
      + '. Every one of those occupies a slot in this field for as long as it is offered, whether or not somebody is teaching it.'
    : `No revealed course asks for ${field} yet. A hire in it can still join a research project, and will be ready when a course that needs them is revealed.`;

  return (
    <section className="faculty-field">
      <header className="faculty-field-head">
        <span className="panel-head-title">
          <h3>{field}</h3>
          <HelpHint text={demandText} />
        </span>
        <span className={`stat${short ? ' faculty-field-short' : ''}`}>
          {used} / {total} slots used{short ? ' · short' : ''}
        </span>
      </header>

      {hired.length > 0 ? (
        <ul className="faculty-list">
          {hired.map((f) => (
            <FacultyCard key={f.id} s={s} act={act} f={f} isCandidate={false} commitment={commitments.get(f.id)} />
          ))}
        </ul>
      ) : (
        <p className="empty-note">
          Nobody in {field}.{total === 0 && used > 0
            ? ` ${used} ${used === 1 ? 'course is' : 'courses are'} offered with no one to teach them.`
            : ''}
        </p>
      )}

      {candidates.length > 0 && (
        <>
          <div className="faculty-market-head">
            <span>On the market</span>
            <span className="outcome-note">
              {candidates.length} listed · a listing withdraws after {CANDIDATE_LISTING_WEEKS} weeks
            </span>
          </div>
          <ul className="faculty-list candidate-list">
            {candidates.map((c) => (
              <FacultyCard key={c.id} s={s} act={act} f={c} isCandidate={true} />
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

export default function FacultyTab({ s, act }: { s: GameState; act: (a: Action) => void }) {
  const commitments = useMemo(() => commitmentsByFaculty(s), [s.research.initiatives, s.tech]);
  const short = useMemo(() => neededFacultyFields(s), [s]);

  // Which fields are worth a section at all: anybody hired, anybody listed,
  // or any revealed course that asks for them. A field nothing on campus
  // has any relationship with is not a department, it is a string in a
  // table.
  const sections = useMemo(() => {
    const hired = new Map<string, Faculty[]>();
    for (const f of s.faculty) {
      if (!hired.has(f.field)) hired.set(f.field, []);
      hired.get(f.field)!.push(f);
    }
    const listed = new Map<string, Faculty[]>();
    for (const c of s.candidates) {
      if (!listed.has(c.field)) listed.set(c.field, []);
      listed.get(c.field)!.push(c);
    }
    const wanted = new Set(
      s.tech.filter((t) => t.requiresFaculty && t.status !== 'locked').map((t) => t.requiresFaculty!),
    );

    return FACULTY_FIELDS
      .filter((field) => hired.has(field) || listed.has(field) || wanted.has(field))
      .map((field) => ({
        field,
        // Strongest teacher first inside a department, which is the order a
        // player reads it in when deciding who covers what.
        hired: (hired.get(field) ?? []).sort((a, b) => b.teaching - a.teaching || a.name.localeCompare(b.name)),
        candidates: (listed.get(field) ?? []).sort((a, b) => (b.teaching + b.research) - (a.teaching + a.research)),
      }));
  }, [s.faculty, s.candidates, s.tech]);

  const committedCount = commitments.size;

  return (
    <div className="tab-content">
      <section className="panel faculty-summary">
        <div className="panel-head">
          <span className="panel-head-title">
            <h2>Faculty</h2>
            <HelpHint text="Everyone employed, by department, with whoever is on the market for that department underneath them. A field's slot count is what gates how many courses in it the school can offer at once: each offered course holds one slot whether or not somebody is teaching it, and each professor supplies slots that grow slowly with tenure. A scholar on a research project supplies two fewer for its duration. Appointing is immediate and costs nothing up front — what costs is the salary." />
          </span>
          <span className="stat">{s.faculty.length} on payroll</span>
          <span className="stat">{s.candidates.length} on the market</span>
          {committedCount > 0 && <span className="stat">{committedCount} on projects</span>}
        </div>
      </section>

      <div className="faculty-fields">
        {sections.map(({ field, hired, candidates }) => (
          <FieldSection
            key={field}
            s={s}
            act={act}
            field={field}
            hired={hired}
            candidates={candidates}
            commitments={commitments}
            short={short.has(field)}
          />
        ))}
        {sections.length === 0 && (
          <p className="empty-note">No faculty, no candidates and no courses that need either. Develop a course to start.</p>
        )}
      </div>
    </div>
  );
}
