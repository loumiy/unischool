import { useEffect, useMemo, useState } from 'react';
import type { Action } from '../state/actions';
import type { Buildable, Faculty, GameState } from '../state/types';
import { WEEKS_PER_YEAR } from '../state/types';
import { facultyQualityTier, CANDIDATE_LISTING_WEEKS, FACULTY_FIELD_GROUPS } from '../data/facultyData';
import { facultyResearchOutput, labEquippedFields } from '../data/researchData';
import { researchTopic } from '../data/researchTopics';
import { discoverySchools } from '../data/techData';
import { effectiveCourseSlots, facultyLoad } from '../systems/techtree/techSystem';
import { facultyCapacity, hiresFor, type FieldCapacity } from '../systems/faculty/facultyCapacity';
import { facultyPay } from '../systems/finance/financeSystem';
import { coursesTaughtBy } from '../systems/faculty/facultyAssignment';
import HelpHint from '../components/HelpHint';
import { GradeChip, SearchOffer } from './CurriculumTab';
import { searchCost } from '../systems/faculty/facultySearch';
import { projectedQuality } from '../systems/faculty/facultyAssignment';
import {
  deptAction, payroll, searchable, waitingCourses, worthTaking, type Listing,
} from '../systems/faculty/hiringNext';
import FacultyPortrait, { portraitOf } from '../components/FacultyPortrait';
import { money, moneyShort, surnameOf } from '../format';

// THE DEPARTMENT BOARD — every department the university could have, what
// each one can teach, and who is in it.
//
// The version before this one was a roster by field: one section per
// department, people as full-width cards inside it, two columns of
// sections down the page. Three things were wrong with it, and they were
// all the same thing — the SECTION, not the person and not the
// arithmetic, owned the width.
//
//   - A card was half the screen wide to carry a 44px portrait, a name and
//     two 5px bars, so a roster of forty was a very long wall. Cards are a
//     grid now (auto-fill, ~250px), five to a row instead of two.
//   - A hire and a listing looked the same: same card, same paper, one
//     small line of text apart. A listing is DASHED and cooler-toned now —
//     not ours yet, carried by the paper rather than by a line you have to
//     read — and the whole tab can be switched to roster-only or
//     market-only when you are doing one job and not the other.
//   - The department header printed `used / total slots` and stopped.
//     That answers "am I over my ceiling", never "should I hire", because
//     it says nothing about what the curriculum is going to ask for next.
//
// So the tab is a BOARD first and a roster second: one compact row per
// department, all 29 of them, in the eight divisions FACULTY_FIELD_GROUPS
// now carries as data. Every row draws the same meter on the SAME SCALE,
// so departments compare against each other by eye and not just against
// themselves — see CapacityMeter below for what the segments mean.
//
// EVERY FIELD IS RENDERED, always. The old tab hid any department with
// nobody hired, nobody listed and no revealed course, on the reasoning
// that it was a string in a table rather than a department the university
// had. That reasoning had it backwards: knowing there is no Neuroscience
// department — and that twelve courses are waiting behind one — is exactly
// the kind of thing a player cannot discover by looking at what IS there.
// An absence you can see is information; an absence you cannot is a
// surprise later.
//
// Clicking a department expands it in place: the courses that pull on it
// (by major — the answer to "why would I ever want a kinesiologist"), its
// people, and the market underneath them. Departments with people start
// open, empty ones closed, and either can be overridden per row or in bulk.
//
// Recruiting is a standing, churning market (see facultyData.ts's churn
// block and facultySystem.ts's tickCandidatePool): there is no posting to
// pay for and no countdown to wait out. Every week some listings withdraw
// and new ones arrive, weighted so common fields are nearly always
// represented and thin-market specialists turn up only now and then.
// Appointing is immediate; what costs is the salary they start drawing.
//
// Hiring proper still belongs on the Curriculum tab, where the shortage is
// actually felt — you find out you need a kinesiologist when a course will
// not start. This screen is where you decide whether a department is worth
// growing BEFORE that happens, which is what the forward-looking half of
// the meter is for.

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
// (FacultyPortrait.tsx), their name and rank given the weight of a
// heading, their two stats as bars. The rank badge is facultyQualityTier,
// the familiar academic ladder (Adjunct through Distinguished).
//
// Everything beyond that — bio, nationality, salary detail, tenure, what
// they are actually teaching — lives one click away behind the expand
// toggle, so a forty-name roster stays a roster rather than becoming forty
// spreadsheets. The card is sized to the GRID now rather than to the
// column (see .faculty-list), which is what took it from two to the width
// of a playing card, so what stays on its face had to earn the room:
// salary, because it is the cost of the decision; how loaded they are,
// because it is what decides whether they can take a course; and, for a
// listing, how long it has left, because spotting a good specialist before
// it withdraws is the whole scanning job.
//
// The card carries no flag glyph: the emoji flags failed to render in some
// browsers, so nationality lives in the expanded detail as plain text only.
function FacultyCard(
  { s, act, f, isCandidate, commitment, waiting }:
  {
    s: GameState; act: (a: Action) => void; f: Faculty; isCandidate: boolean;
    // For a listing: the first course waiting on their department, so the
    // card can say what grade they would earn on it — the fact the
    // instructor picker leads with and this board never showed.
    waiting?: Buildable;
    // What this person is committed to, if anything (see the commitment map
    // below). A committed scholar is the single most useful thing this
    // screen can tell you about a department — they are teaching two
    // courses fewer for the next six months to five years — so it sits on
    // the card rather than in a panel of its own further down the page.
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
  const slots = isCandidate ? f.courseSlots : effectiveCourseSlots(s, f);
  const load = isCandidate ? 0 : facultyLoad(s, f.id);
  const projected = isCandidate && waiting ? projectedQuality(s, waiting, f) : null;
  // A listing's price is what THIS school would pay: the market rate is
  // applied at the payroll (financeSystem.ts's facultyPay), so the face
  // of the card carries that figure rather than the base the person asks.
  const pay = isCandidate ? facultyPay(s, f.salary) : f.salary;

  return (
    <li className={`faculty-card${isCandidate ? ' listed' : ''}${commitment ? ' committed' : ''}`}>
      <div className="faculty-card-main">
        <FacultyPortrait f={portraitOf(f)} size={36} />
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
            {projected && waiting && (
              <GradeChip grade={projected.grade} title={`Would earn a ${projected.grade} on ${waiting.name}`} />
            )}
            <span className="kind-tag">{facultyQualityTier(f)}</span>
          </div>
          <div className="faculty-card-field">
            {commitment ? (
              <span className="faculty-commitment" title={`${commitment.topic} · ${commitment.labName}`}>
                On <strong>{commitment.topic}</strong>
                <span className="faculty-commitment-left">
                  {' '}· {commitment.weeksRemaining}w left
                </span>
              </span>
            ) : isCandidate ? (
              <span className="faculty-card-listing">{f.courseSlots} slots if appointed</span>
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
            <span className="faculty-card-salary" title={isCandidate ? `Asks ${money(f.salary)}; this school pays ${money(pay)} at its market rate` : undefined}>{moneyShort(pay)}/yr</span>
            {isCandidate ? (
              <span className={weeksLeft <= 2 ? 'candidate-expiry soon' : 'candidate-expiry'}>withdraws in {weeksLeft}w</span>
            ) : (
              <span
                className={load >= slots ? 'faculty-card-load full' : 'faculty-card-load'}
                title={`Teaching ${load} of the ${slots} course slots they supply${commitment ? ' while committed to a project' : ''}`}
              >
                {load}/{slots} slots
              </span>
            )}
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
            <dt>Salary</dt><dd>{money(f.salary)}/yr <span className="outcome-note">({money(Math.round(facultyPay(s, f.salary)))} paid, at this school&rsquo;s market rate)</span></dd>
            <dt>Course slots</dt><dd>{f.courseSlots}</dd>
            {!isCandidate && <><dt>Tenure</dt><dd>{Math.floor(f.tenureWeeks / WEEKS_PER_YEAR)} years</dd></>}
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
// a card can read it without walking every project.
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

// WHICH COURSES PULL ON EACH FIELD, grouped by the major they belong to —
// the answer to "why do I need a kinesiologist", which no version of this
// tab gave until the rebuild before this one put it in a tooltip. It is
// not a tooltip any more: it is the first line inside an opened
// department, because for an EMPTY department it is the only content there
// is, and "twelve courses across two majors are waiting on this" is the
// whole reason to found one.
//
// Read off the same discovery metadata the Curriculum tab groups by, so
// the grouping the player sees here is the grouping they see there. One
// pass for all 29 fields rather than one walk of every school per field —
// the board renders every department, so the per-field version was 29
// walks of the whole curriculum per render.
//
// Only courses that EXIST as far as the player is concerned are counted: a
// locked course is not yet a reason for anything.
type DemandByMajor = Array<{ group: string; courses: string[] }>;

function courseDemandByField(s: GameState): Map<string, DemandByMajor> {
  const wanted = new Map<string, { field: string; name: string }>();
  for (const t of s.tech) {
    if (t.requiresFaculty && t.status !== 'locked') {
      wanted.set(t.id, { field: t.requiresFaculty, name: t.name.split(' · ').pop() ?? t.name });
    }
  }

  const byField = new Map<string, DemandByMajor>();
  const take = (group: string, ids: readonly string[]) => {
    const perField = new Map<string, string[]>();
    for (const id of ids) {
      const course = wanted.get(id);
      if (!course) continue;
      if (!perField.has(course.field)) perField.set(course.field, []);
      perField.get(course.field)!.push(course.name);
      wanted.delete(id);
    }
    for (const [field, courses] of perField) {
      if (!byField.has(field)) byField.set(field, []);
      byField.get(field)!.push({ group, courses });
    }
  };

  for (const school of discoverySchools()) {
    for (const major of school.majors) take(major.name, [major.tier1Id, ...major.tier2Ids, ...major.tier3Ids]);
    for (const program of school.graduate) take(program.name, program.courseIds);
  }

  // Anything the discovery metadata does not place (there is nothing
  // today, but a future course kind would land here rather than vanishing).
  take('Elsewhere', [...wanted.keys()]);
  return byField;
}

function demandSentence(field: string, demand: DemandByMajor | undefined, catalogue: number): string {
  if (!demand || demand.length === 0) {
    return catalogue > 0
      ? `No ${field} course has been revealed yet — ${catalogue} in the catalogue are waiting behind buildings and prerequisites.`
      : `Nothing in the catalogue asks for ${field}.`;
  }
  const count = demand.reduce((n, g) => n + g.courses.length, 0);
  return `${count} revealed ${count === 1 ? 'course pulls' : 'courses pull'} on ${field}: `
    + demand.map((g) => `${g.group} (${g.courses.join(', ')})`).join('; ')
    + `. Each one occupies a slot in this department for as long as it is offered, whether or not somebody is teaching it.`;
}

// THE ROW'S ACTION (hiringNext.ts's deptAction): the one thing a
// department's state calls for, as one button in the column the state
// word used to occupy. Appoint the listing, with what it unblocks; post
// a search, or say one is running; or send the player to the unstaffed
// courses. A row with nothing to do says nothing, as before.
function DeptActionCell({ s, act, c, onOpenCurriculum }: {
  s: GameState; act: (a: Action) => void; c: FieldCapacity; onOpenCurriculum?: (target: string) => void;
}) {
  const action = deptAction(s, c);
  if (action.kind === 'none') {
    return c.state === 'empty' ? <span className="dept-note empty">no department</span> : <span className="dept-note" />;
  }
  if (action.kind === 'appoint') {
    const l = action.listing;
    return (
      <button
        type="button"
        className="dept-action appoint"
        onClick={(e) => { e.stopPropagation(); act({ type: 'HIRE_FACULTY', facultyId: l.candidate.id }); }}
        title={`Appoint ${l.candidate.name} (teaching ${l.candidate.teaching}) at ${moneyShort(l.pay)}/yr${l.unblocks.length > 0 ? ` — opens ${l.unblocks.join(', ')}` : ''}; the listing withdraws in ${l.weeksLeft} weeks`}
      >
        Appoint {surnameOf(l.candidate.name)}
        {l.grade && <GradeChip grade={l.grade} />}
        <span className="dept-action-meta">{moneyShort(l.pay)} · {l.weeksLeft}w</span>
      </button>
    );
  }
  if (action.kind === 'searching') {
    return <span className="dept-note short">searching · {action.weeksLeft}w</span>;
  }
  if (action.kind === 'search') {
    return (
      <button
        type="button"
        className="dept-action search"
        disabled={!action.canPost}
        onClick={(e) => { e.stopPropagation(); act({ type: 'POST_SEARCH', field: c.field }); }}
        title={`Nobody is listed in ${c.field}. A search runs half a year with a much better chance every week that somebody is: ${moneyShort(action.cost)}.`}
      >
        Post a search <span className="dept-action-meta">{moneyShort(action.cost)}</span>
      </button>
    );
  }
  return (
    <button
      type="button"
      className="dept-action reassign"
      onClick={(e) => { e.stopPropagation(); onOpenCurriculum?.('unstaffed'); }}
      title={`${action.unstaffed} ${c.field} ${action.unstaffed === 1 ? 'course has' : 'courses have'} no instructor — open them in the Curriculum`}
    >
      {action.unstaffed} unstaffed →
    </button>
  );
}

// ---------------------------------------------------------------------
// THE METER. One instrument per department, every one of them drawn to the
// SAME SCALE, so the length of a bar means the same thing in Law as it
// does in Clinical Health and the eye can rank departments without reading
// a single number.
//
//   solid      slots the current courseload takes — every offered course,
//              staffed or not (techSystem.ts's usedFacultySlots, and see
//              its note on why an unstaffed course still counts).
//   half-tone  courses revealed and not yet developed: what the next few
//              clicks on the Curriculum tab would cost this department.
//   dotted     the rest of the catalogue, still locked behind buildings
//              and prerequisites. The long view, and deliberately the
//              faintest thing on the row — it is real, but it is not
//              something you can act on this week.
//   the rule   what the roster actually supplies. THE THING HIRING MOVES.
//
// Where the rule sits is the department's whole state, without a word:
// past the ink, there is room; inside the half-tone, the department is at
// its ceiling and something revealed cannot start; inside the solid, it is
// already teaching more than it supplies and somebody's course is
// unstaffed. A second, fainter rule appears when a research commitment has
// taken slots — it marks where supply WOULD be, which is the one question
// "my department went short and I didn't hire or fire anyone" asks.
// ---------------------------------------------------------------------
function CapacityMeter({ c, scale }: { c: FieldCapacity; scale: number }) {
  const pct = (n: number) => `${(Math.max(0, Math.min(scale, n)) / scale) * 100}%`;
  const locked = Math.max(0, c.catalogue - c.offered - c.available);
  const taken = c.grossSupply - c.supply;
  // A department hired past everything it will ever teach. The rule pins to
  // the end of the track and says so, rather than every other department's
  // curriculum being squashed to make room for it.
  const beyond = c.supply > c.catalogue;

  const title = [
    `${c.field}: ${c.supply} course ${c.supply === 1 ? 'slot' : 'slots'} supplied by ${c.hired} ${c.hired === 1 ? 'professor' : 'professors'}.`,
    `${c.offered} taken by courses on offer now, ${c.available} more revealed and not yet developed, ${c.catalogue} in the catalogue all told.`,
    taken > 0 ? `${taken} ${taken === 1 ? 'slot is' : 'slots are'} with a research project.` : '',
    beyond ? 'The department can already teach its whole catalogue.' : '',
  ].filter(Boolean).join(' ');

  return (
    <span className={`capacity-meter ${c.state}`} role="img" aria-label={title} title={title}>
      <span className="capacity-track">
        <span className="capacity-seg offered" style={{ width: pct(c.offered) }} />
        <span className="capacity-seg available" style={{ width: pct(c.available) }} />
        <span className="capacity-seg locked" style={{ width: pct(locked) }} />
        {taken > 0 && !beyond && <span className="capacity-rule gross" style={{ left: pct(c.grossSupply) }} />}
        <span
          className={`capacity-rule${beyond ? ' beyond' : ''}${c.supply === 0 ? ' at-zero' : ''}`}
          style={{ left: pct(c.supply) }}
        />
      </span>
    </span>
  );
}

// One department: the row you scan, and everything it opens into.
function DepartmentRow(
  { s, act, c, scale, demand, open, onToggle, hired, listed, commitments, view, onOpenCurriculum }:
  {
    s: GameState; act: (a: Action) => void; c: FieldCapacity; scale: number;
    demand: DemandByMajor | undefined;
    open: boolean; onToggle: () => void;
    hired: Faculty[]; listed: Faculty[];
    commitments: Map<string, Commitment>;
    view: View;
    onOpenCurriculum?: (target: string) => void;
  },
) {
  const showRoster = view !== 'market';
  const showMarket = view !== 'roster';
  const waiting = waitingCourses(s, c.field);
  const demandCount = demand ? demand.reduce((n, g) => n + g.courses.length, 0) : 0;

  return (
    <div className={`dept${open ? ' open' : ''}`} data-field={c.field}>
      {/* A div rather than a button, because the last cell holds a button
          of its own and a button cannot contain one. The row still toggles
          on click and on Enter or Space, and says so to a screen reader. */}
      <div
        className={`dept-row ${c.state}`}
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(); } }}
        aria-expanded={open}
      >
        <span className="dept-name">
          <span className="dept-caret">{open ? '▾' : '▸'}</span>
          {c.field}
        </span>
        <CapacityMeter c={c} scale={scale} />
        <span className="dept-slots" title="Course slots taken by what is offered now, against what the roster supplies">
          {c.offered}/{c.supply}
        </span>
        <span className="dept-catalogue" title={`${c.catalogue} courses in the catalogue ask for ${c.field}`}>
          {c.catalogue}
        </span>
        <span className="dept-people">
          {c.hired > 0 && <span className="dept-hired">{c.hired} hired</span>}
          {c.listed > 0 && <span className="dept-listed">{c.listed} listed</span>}
          {c.state === 'over' && <span className="dept-note over">over by {c.offered - c.supply}</span>}
          {c.state === 'short' && <span className="dept-note short">short</span>}
        </span>
        <span className="dept-action-cell" onClick={(e) => e.stopPropagation()}>
          <DeptActionCell s={s} act={act} c={c} onOpenCurriculum={onOpenCurriculum} />
        </span>
      </div>

      {open && (
        <div className="dept-body">
          <p className="dept-demand">
            {demandSentence(c.field, demand, c.catalogue)}
            {demandCount > 0 && onOpenCurriculum && (
              <>
                {' '}
                <button type="button" className="dept-demand-door" onClick={() => onOpenCurriculum(`field:${c.field}`)} title={`Open the Curriculum on the ${c.field} courses still ahead of you`}>
                  {waiting.length === 0
                    ? 'Open in Curriculum →'
                    : c.state === 'short' || c.state === 'over'
                      ? `${waiting.length} waiting on a slot →`
                      : `${waiting.length} still ahead →`}
                </button>
              </>
            )}
          </p>

          {showRoster && (hired.length > 0 ? (
            <ul className="faculty-list">
              {hired.map((f) => (
                <FacultyCard key={f.id} s={s} act={act} f={f} isCandidate={false} commitment={commitments.get(f.id)} />
              ))}
            </ul>
          ) : (
            <p className="empty-note">
              Nobody in {c.field}.{c.offered > 0
                ? ` ${c.offered} ${c.offered === 1 ? 'course is' : 'courses are'} offered with no one to teach them.`
                : ''}
            </p>
          ))}

          {showMarket && (listed.length > 0 || c.state === 'over' || c.state === 'short') && (
            <>
              <div className="faculty-market-head">
                <span>On the market</span>
                <span className="outcome-note">
                  {listed.length > 0
                    ? `${listed.length} listed · a listing withdraws after ${CANDIDATE_LISTING_WEEKS} weeks`
                    : 'nobody listed this week'}
                </span>
              </div>
              {listed.length > 0 ? (
                <ul className="faculty-list candidate-list">
                  {listed.map((cand) => (
                    <FacultyCard key={cand.id} s={s} act={act} f={cand} isCandidate={true} waiting={waiting[0]} />
                  ))}
                </ul>
              ) : (
                <p className="empty-note">
                  No {c.field} candidate is listed. The market turns over every week — or pay for a search.
                </p>
              )}
              {/* A search, per short department (Plan 14's PR H): the same
                  offer the instructor picker makes when nobody can take a
                  course, made here where the shortage is a row. */}
              {(c.state === 'over' || c.state === 'short') && <SearchOffer s={s} act={act} field={c.field} />}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// =====================================================================
// NEXT UP (hiringNext.ts). The strip at the head of the board that turns
// the market back into a stream of events: who is worth appointing this
// week and how long the window is, which departments only a search can
// help, which are teaching courses nobody holds, and what payroll is
// doing. Every item is a door or a button; an empty reading is left out.
// =====================================================================
function FacultyNextUp({ s, act, fields, onOpenCurriculum }: {
  s: GameState; act: (a: Action) => void; fields: FieldCapacity[]; onOpenCurriculum?: (target: string) => void;
}) {
  const listings = worthTaking(s);
  const searches = searchable(s, fields);
  const over = fields.filter((c) => c.state === 'over');
  const unstaffed = over.length > 0 ? fields.reduce((n, c) => n + (c.state === 'over' ? Math.max(0, c.offered - c.supply) : 0), 0) : 0;
  // Payroll is never empty, so the strip always stands — one quiet line
  // on a board with nothing else to do, which since Plan 15 made salaries
  // a fifth of expenses is a reading worth a glance every visit.
  const pay = payroll(s, listings);

  const appoint = (l: Listing) => act({ type: 'HIRE_FACULTY', facultyId: l.candidate.id });

  return (
    <div className="next-up faculty-next" aria-label="What next">
      {listings.length > 0 && (
        <div className="next-up-item listings">
          <span className="next-up-label">Worth taking</span>
          <span className="next-up-doors">
            {listings.slice(0, 5).map((l) => (
              <button
                key={l.candidate.id}
                type="button"
                className={`next-up-door${l.weeksLeft <= 2 ? ' soon' : ''}`}
                onClick={() => appoint(l)}
                title={`${l.candidate.name}, ${facultyQualityTier(l.candidate)} in ${l.field}: teaching ${l.candidate.teaching}, ${moneyShort(l.pay)}/yr at this school's rate${l.course ? `; would earn a ${l.grade} on ${l.course.name}` : ''}${l.unblocks.length > 0 ? `; opens ${l.unblocks.join(', ')}` : ''}. Withdraws in ${l.weeksLeft} weeks.`}
              >
                Appoint {surnameOf(l.candidate.name)} · {l.field}
                {l.grade && <GradeChip grade={l.grade} />}
                <span className="next-up-meta">{moneyShort(l.pay)} · {l.weeksLeft}w</span>
              </button>
            ))}
            {listings.length > 5 && <span className="next-up-note">+{listings.length - 5} more listed in short departments</span>}
          </span>
        </div>
      )}
      {searches.length > 0 && (
        <div className="next-up-item searches">
          <span className="next-up-label">Nobody listed</span>
          <span className="next-up-doors">
            {searches.slice(0, 4).map((x) => (
              x.running > 0
                ? <span key={x.field} className="next-up-note">{x.field} · searching, {x.running}w left</span>
                : (
                  <button
                    key={x.field}
                    type="button"
                    className="next-up-door"
                    disabled={s.finance.cash < searchCost(s)}
                    onClick={() => act({ type: 'POST_SEARCH', field: x.field })}
                    title={`${x.waiting} ${x.waiting === 1 ? 'course is' : 'courses are'} waiting on ${x.field} and nobody is on the market. A search runs half a year: ${moneyShort(searchCost(s))}.`}
                  >
                    Post a search · {x.field} <span className="next-up-meta">{moneyShort(searchCost(s))} · {x.waiting} waiting</span>
                  </button>
                )
            ))}
          </span>
        </div>
      )}
      {over.length > 0 && (
        <div className="next-up-item wall">
          <span className="next-up-label">Over</span>
          <span className="next-up-doors">
            <button type="button" className="next-up-door" onClick={() => onOpenCurriculum?.('unstaffed')} title="Departments teaching more than they supply — every course without an instructor, in the Curriculum">
              {over.map((c) => c.field).join(', ')} · {unstaffed} {unstaffed === 1 ? 'course' : 'courses'} unstaffed →
            </button>
          </span>
        </div>
      )}
      <div className="next-up-item">
        <span className="next-up-label">Payroll</span>
        <span className="next-up-body">
          <span className="next-up-meta">{moneyShort(pay.weekly)}/wk · {Math.round(pay.share * 100)}% of expenses</span>
          {pay.wouldAdd > 0 && <span className="next-up-note"> — the appointments above would add {moneyShort(pay.wouldAdd)}/wk</span>}
        </span>
      </div>
    </div>
  );
}

// Roster-only, market-only, or both. The market is what churns and the
// roster is what you own, and they are read for different reasons: one to
// decide whether to spend, one to see what you have. Showing both at once
// is the right default and the wrong thing to be stuck with.
type View = 'both' | 'roster' | 'market';

const VIEWS: Array<{ id: View; label: string }> = [
  { id: 'both', label: 'Both' },
  { id: 'roster', label: 'Roster' },
  { id: 'market', label: 'Market' },
];

export default function FacultyTab({ s, act, target, onTargetConsumed, onOpenCurriculum }: {
  s: GameState; act: (a: Action) => void;
  // A department to arrive on — opened and scrolled into view — when the
  // tab was opened from somewhere the shortage was felt (the Curriculum
  // tab's wall, a drawer's dead end). Consumed on arrival.
  target?: string;
  onTargetConsumed?: () => void;
  // The way to the courses: "field:<name>" for the ones waiting on a
  // department, "unstaffed" for the ones nobody holds.
  onOpenCurriculum?: (target: string) => void;
}) {
  const cap = useMemo(() => facultyCapacity(s), [s.faculty, s.candidates, s.tech, s.research.initiatives]);
  const commitments = useMemo(() => commitmentsByFaculty(s), [s.research.initiatives, s.tech]);
  const demand = useMemo(() => courseDemandByField(s), [s.tech]);

  // Strongest teacher first inside a department, which is the order a
  // player reads it in when deciding who covers what; strongest listing
  // first on the market, where the question is who is worth taking.
  const hired = useMemo(() => {
    const map = new Map<string, Faculty[]>();
    for (const f of s.faculty) {
      if (!map.has(f.field)) map.set(f.field, []);
      map.get(f.field)!.push(f);
    }
    for (const list of map.values()) list.sort((a, b) => b.teaching - a.teaching || a.name.localeCompare(b.name));
    return map;
  }, [s.faculty]);

  const listed = useMemo(() => {
    const map = new Map<string, Faculty[]>();
    for (const c of s.candidates) {
      if (!map.has(c.field)) map.set(c.field, []);
      map.get(c.field)!.push(c);
    }
    for (const list of map.values()) list.sort((a, b) => (b.teaching + b.research) - (a.teaching + a.research));
    return map;
  }, [s.candidates]);

  const [view, setView] = useState<View>('both');
  // Expansion is a set of OVERRIDES over a live default rather than a set
  // of open rows, so "departments with people are open" keeps being true
  // of a department founded after the tab was first rendered, while a row
  // the player has explicitly opened or closed stays that way.
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  // Every row starts COLLAPSED: with forty-two programs founded one at a
  // time, a board that opened every staffed department was a wall. The
  // row itself says everything the scan needs (meter, slots, listed); a
  // department is opened on purpose, and "Expand all" is one click away.
  const defaultOpen = (_c: FieldCapacity) => false;
  const isOpen = (c: FieldCapacity) => overrides[c.field] ?? defaultOpen(c);
  const setAll = (open: boolean) => {
    const next: Record<string, boolean> = {};
    for (const c of cap.fields) next[c.field] = open;
    setOverrides(next);
  };

  useEffect(() => {
    if (!target) return;
    setOverrides((o) => ({ ...o, [target]: true }));
    window.setTimeout(() => document.querySelector(`[data-field="${CSS.escape(target)}"]`)?.scrollIntoView({ block: 'start', behavior: 'smooth' }), 0);
    onTargetConsumed?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  const committedCount = commitments.size;
  // The gap added up DEPARTMENT BY DEPARTMENT (see facultyCapacity.ts's
  // total.shortfall). Subtracting the two school-wide totals instead would
  // tell a school with every slot in Mathematics that it can teach the
  // whole catalogue, which is the one comfortable falsehood this screen is
  // in a position to tell.
  const toFinish = cap.total.shortfall;

  return (
    <div className="tab-content">
      <section className="panel faculty-summary">
        <div className="panel-head">
          <span className="panel-head-title">
            <h2>Faculty</h2>
            <HelpHint text="Every department the university could have, whether or not anybody is in it. The meter on each row is drawn to one scale across the whole board: the solid part is the slots its courses take now, the half-tone the courses revealed but not yet developed, the dotted tail the rest of the catalogue — and the upright rule is what the roster actually supplies, which is the thing hiring moves. A course holds its slot for as long as it is offered, whether or not somebody is teaching it, and a scholar on a research project supplies two fewer. Appointing is immediate and costs nothing up front; what costs is the salary." />
          </span>
          <span className="stat">{s.faculty.length} on payroll</span>
          <span className="stat">{s.candidates.length} on the market</span>
          {committedCount > 0 && <span className="stat">{committedCount} on projects</span>}
        </div>
        {/* The one school-wide sentence, and the only place the long view is
            stated in people rather than in slots: every course in the game
            is faculty-gated and holds its slot forever, so the catalogue's
            cost is a number the player can actually aim at. */}
        <FacultyNextUp s={s} act={act} fields={cap.fields} onOpenCurriculum={onOpenCurriculum} />
        <p className="faculty-horizon">
          <strong>{cap.total.supply}</strong> course slots supplied,
          {' '}<strong>{cap.total.offered}</strong> taken by what is on offer,
          {' '}<strong>{cap.total.available}</strong> more revealed and waiting.
          {toFinish > 0
            ? ` Teaching the whole catalogue takes ${cap.total.catalogue} slots in the departments that hold them — ${toFinish} short, about ${hiresFor(toFinish)} more appointments at the slots a new hire brings, fewer if you keep them long enough to grow.`
            : ' Every department can already teach its whole catalogue.'}
        </p>
      </section>

      <section className="panel dept-board">
        <div className="panel-head">
          <span className="panel-head-title"><h3>Departments</h3></span>
          <span className="dept-views">
            {VIEWS.map((v) => (
              <button
                key={v.id}
                type="button"
                className={view === v.id ? 'dept-view on' : 'dept-view'}
                onClick={() => { setView(v.id); setOverrides({}); }}
              >
                {v.label}
              </button>
            ))}
          </span>
          <span className="dept-bulk">
            <button type="button" onClick={() => setAll(true)}>Expand all</button>
            <button type="button" onClick={() => setAll(false)}>Collapse all</button>
          </span>
        </div>

        <div className="dept-head">
          <span className="dept-name">Department</span>
          <span className="capacity-legend">
            <span className="capacity-key-pair"><span className="capacity-key offered" />offered</span>
            <span className="capacity-key-pair"><span className="capacity-key available" />revealed</span>
            <span className="capacity-key-pair"><span className="capacity-key locked" />catalogue</span>
            <span className="capacity-key-pair"><span className="capacity-key rule" />slots supplied</span>
          </span>
          <span className="dept-slots">used/have</span>
          <span className="dept-catalogue">all</span>
          <span className="dept-people">people</span>
          <span className="dept-note">next</span>
        </div>

        {FACULTY_FIELD_GROUPS.map((group) => (
          <section key={group.name} className="dept-group">
            <h4>{group.name}</h4>
            {group.fields.map((field) => {
              const c = cap.byField.get(field)!;
              return (
                <DepartmentRow
                  key={field}
                  s={s}
                  act={act}
                  c={c}
                  scale={cap.scale}
                  demand={demand.get(field)}
                  open={isOpen(c)}
                  onToggle={() => setOverrides((o) => ({ ...o, [field]: !isOpen(c) }))}
                  hired={hired.get(field) ?? []}
                  listed={listed.get(field) ?? []}
                  commitments={commitments}
                  view={view}
                  onOpenCurriculum={onOpenCurriculum}
                />
              );
            })}
          </section>
        ))}
      </section>
    </div>
  );
}
