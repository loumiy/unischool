import { quirkById } from '../data/quirkData';
import AdministrationPanel from './AdministrationPanel';
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

// The department board: every department the university could have (all 29,
// in the eight FACULTY_FIELD_GROUPS divisions), what each can teach, and who
// is in it. Empty departments are rendered too: seeing that twelve courses
// wait behind a missing department is information. Every row draws the same
// meter on the same scale (see CapacityMeter).
//
// Expanding a row shows the courses that pull on it (by major), its people,
// and the market. Recruiting is a standing, churning market (facultyData.ts's
// churn block, facultySystem.ts's tickCandidatePool); appointing is immediate
// and the cost is salary. Shortages are felt on the Curriculum tab; this
// board is for deciding whether to grow a department before that.

// Teaching or research as a bar, with the headroom to this person's
// potential shown behind the filled part.
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

// One person, as a card: portrait (FacultyPortrait.tsx), name, rank badge
// (facultyQualityTier) and stat bars. The face also carries salary, load and,
// for a listing, time left; everything else is behind the expand toggle.
// No flag glyph: emoji flags do not render everywhere, so nationality is
// plain text in the detail.
function FacultyCard(
  { s, act, f, isCandidate, commitment, waiting }:
  {
    s: GameState; act: (a: Action) => void; f: Faculty; isCandidate: boolean;
    // For a listing: the first course waiting on their department, so the
    // card can show the grade they would earn on it.
    waiting?: Buildable;
    // Their research commitment, if any (see the commitment map below): a
    // committed scholar teaches two courses fewer, so it shows on the card.
    commitment?: Commitment;
  },
) {
  const [open, setOpen] = useState(false);
  const taught = isCandidate ? [] : coursesTaughtBy(s, f);
  // Two-step dismissal, armed only when there is something to lose, and
  // reset on blur.
  const [confirmingDismiss, setConfirmingDismiss] = useState(false);
  const weeksLeft = Math.max(0, CANDIDATE_LISTING_WEEKS - f.weeksListed);
  const researches = !isCandidate && labEquippedFields(s).has(f.field);
  const slots = isCandidate ? f.courseSlots : effectiveCourseSlots(s, f);
  const load = isCandidate ? 0 : facultyLoad(s, f.id);
  const projected = isCandidate && waiting ? projectedQuality(s, waiting, f) : null;
  // Every card shows what this school pays, listing or roster: the market
  // rate is applied at payroll (financeSystem.ts's facultyPay).
  const pay = facultyPay(s, f.salary);
  const quirk = quirkById(f.quirk);

  return (
    <li className={`faculty-card${isCandidate ? ' listed' : ''}${commitment ? ' committed' : ''}`}>
      <div className="faculty-card-main">
        <FacultyPortrait f={portraitOf(f)} size={36} />
        <div className="faculty-card-body">
          <div className="faculty-card-head">
            <span className="faculty-name">{f.name}</span>
            {/* The prize badge: permanent (see types.ts's Faculty.acclaim). */}
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
          {quirk && <span className="faculty-quirk" title={quirk.line}>{quirk.name}</span>}
          <div className="faculty-bars">
            <StatBar label="T" value={f.teaching} potential={f.teachingPotential} />
            <StatBar label="R" value={f.research} potential={f.researchPotential} />
          </div>
          <div className="faculty-card-foot">
            <span className="faculty-card-salary" title={`${isCandidate ? 'Asks' : 'Salary'} ${money(f.salary)}; the college pays ${money(pay)} at its market rate`}>{moneyShort(pay)}/yr</span>
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
                  if (!confirmingDismiss && (taught.length > 0 || commitment)) { setConfirmingDismiss(true); return; }
                  act({ type: 'FIRE_FACULTY', facultyId: f.id });
                }}
                onBlur={() => setConfirmingDismiss(false)}
              >
                {confirmingDismiss ? (taught.length > 0 ? 'Confirm — leave them unstaffed' : 'Confirm — dismiss') : 'Dismiss'}
              </button>
            )}
          </div>
        </div>
      </div>
      {/* Dismissing someone orphans their courses (see the reducer's
          FIRE_FACULTY) and leaves any research team one short, so the
          second click is preceded by a named warning. Someone teaching
          nothing and on no project is dismissed on the first click. */}
      {confirmingDismiss && (taught.length > 0 || commitment) && (
        <p className="faculty-dismiss-warning">
          {taught.length > 0 && <>
            {f.name} teaches {taught.length} {taught.length === 1 ? 'course' : 'courses'}, which will be left
            without an instructor: {taught.map((c) => c.name.split(' · ')[0]).join(', ')}.
          </>}
          {taught.length > 0 && commitment && ' '}
          {commitment && <>{taught.length > 0 ? 'The' : `${f.name} is on a research project; the`} team on {commitment.topic} carries on one short.</>}
        </p>
      )}
      {open && (
        <div className="faculty-card-detail">
          <p className="faculty-bio">{f.bio}{quirk && <> <em>{quirk.line}</em></>}</p>
          <dl>
            <dt>Nationality</dt><dd>{f.nationality}</dd>
            <dt>Teaching</dt><dd>{f.teaching} <span className="outcome-note">(→ {f.teachingPotential})</span></dd>
            <dt>Research</dt><dd>{f.research} <span className="outcome-note">(→ {f.researchPotential})</span></dd>
            <dt>Salary</dt><dd>{money(f.salary)}/yr <span className="outcome-note">({money(Math.round(facultyPay(s, f.salary)))} paid, at the college's market rate)</span></dd>
            <dt>Course slots</dt><dd>{f.courseSlots}</dd>
            {!isCandidate && <><dt>Tenure</dt><dd>{Math.floor(f.tenureWeeks / WEEKS_PER_YEAR)} years</dd></>}
            {f.acclaim > 0 && <><dt>Prizes won</dt><dd>{f.acclaim}</dd></>}
            {/* Research output: roster only, since a candidate produces nothing yet. */}
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

// What somebody is committed to, flattened from the running initiatives.
interface Commitment {
  topic: string;
  labName: string;
  weeksRemaining: number;
  weeksTotal: number;
}

// Everyone committed to a project right now, by faculty id.
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

// Which revealed courses pull on each field, grouped by major: for an empty
// department this is the only content, and the reason to found one. Read off
// the same discovery metadata the Curriculum tab groups by, in one pass for
// all 29 fields. Locked courses do not count.
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

    // Anything the discovery metadata does not place lands here rather than vanishing.
  take('Elsewhere', [...wanted.keys()]);
  return byField;
}

function demandSentence(field: string, demand: DemandByMajor | undefined, catalogue: number): string {
  if (!demand || demand.length === 0) {
    return catalogue > 0
      ? `No ${field} course has been revealed yet — ${catalogue} in the catalog are waiting behind buildings and prerequisites.`
      : `Nothing in the catalog asks for ${field}.`;
  }
  const count = demand.reduce((n, g) => n + g.courses.length, 0);
  return `${count} revealed ${count === 1 ? 'course pulls' : 'courses pull'} on ${field}: `
    + demand.map((g) => `${g.group} (${g.courses.join(', ')})`).join('; ')
    + `. Each one occupies a slot in this department for as long as it is offered, whether or not somebody is teaching it.`;
}

// The row's action (hiringNext.ts's deptAction): appoint the listing, post a
// search or say one is running, or go to the unstaffed courses. A row with
// nothing to do shows nothing.
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
        title={`Appoint ${l.candidate.name} (teaching ${l.candidate.teaching}) at ${moneyShort(l.pay)}/yr${l.unblocks.length > 0 ? ` — opens ${l.unblocks.join(', ')}` : ''}; the listing withdraws in ${l.weeksLeft === 1 ? 'a week' : `${l.weeksLeft} weeks`}`}
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

// The meter: one per department, all on the same scale so departments rank
// by eye.
//   solid      slots the current courseload takes: every offered course,
//              staffed or not (techSystem.ts's usedFacultySlots).
//   half-tone  courses revealed but not yet developed.
//   dotted     the rest of the catalog, still locked.
//   the rule   what the roster supplies; the thing hiring moves.
// Rule past the ink: room. Inside the half-tone: at the ceiling, something
// revealed cannot start. Inside the solid: a course is unstaffed. A fainter
// second rule marks where supply would be without research commitments.
function CapacityMeter({ c, scale }: { c: FieldCapacity; scale: number }) {
  const pct = (n: number) => `${(Math.max(0, Math.min(scale, n)) / scale) * 100}%`;
  const locked = Math.max(0, c.catalogue - c.offered - c.available);
  const taken = c.grossSupply - c.supply;
  // A department hired past everything it will ever teach: the rule pins to
  // the track's end instead of squashing every other department's scale.
  const beyond = c.supply > c.catalogue;

  const title = [
    `${c.field}: ${c.supply} course ${c.supply === 1 ? 'slot' : 'slots'} supplied by ${c.hired} ${c.hired === 1 ? 'professor' : 'professors'}.`,
    `${c.offered} taken by courses on offer now, ${c.available} more revealed and not yet developed, ${c.catalogue} in the catalog all told.`,
    taken > 0 ? `${taken} ${taken === 1 ? 'slot is' : 'slots are'} with a research project.` : '',
    beyond ? 'The department can already teach its whole catalog.' : '',
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
      {/* A div, not a button, because the last cell holds a button. It still
          toggles on click, Enter and Space, and says so to screen readers. */}
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
        <span className="dept-catalogue" title={`${c.catalogue} courses in the catalog ask for ${c.field}`}>
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
              {/* A search, offered per short department. */}
              {(c.state === 'over' || c.state === 'short') && <SearchOffer s={s} act={act} field={c.field} />}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// Next up (hiringNext.ts): who is worth appointing this week and for how
// long, which departments only a search can help, which have courses nobody
// holds, and what payroll is doing. Empty readings are left out.
function FacultyNextUp({ s, act, fields, onOpenCurriculum }: {
  s: GameState; act: (a: Action) => void; fields: FieldCapacity[]; onOpenCurriculum?: (target: string) => void;
}) {
  const listings = worthTaking(s);
  const searches = searchable(s, fields);
  const over = fields.filter((c) => c.state === 'over');
  const unstaffed = over.length > 0 ? fields.reduce((n, c) => n + (c.state === 'over' ? Math.max(0, c.offered - c.supply) : 0), 0) : 0;
  // Payroll is never empty, so the strip always shows at least that line.
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
                title={`${l.candidate.name}, ${facultyQualityTier(l.candidate)} in ${l.field}: teaching ${l.candidate.teaching}, ${moneyShort(l.pay)}/yr at the college's rate${l.course ? `; would earn a ${l.grade} on ${l.course.name}` : ''}${l.unblocks.length > 0 ? `; opens ${l.unblocks.join(', ')}` : ''}. Withdraws in ${l.weeksLeft === 1 ? 'a week' : `${l.weeksLeft} weeks`}.`}
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

// Roster-only, market-only, or both (the default).
type View = 'both' | 'roster' | 'market';

const VIEWS: Array<{ id: View; label: string }> = [
  { id: 'both', label: 'Both' },
  { id: 'roster', label: 'Roster' },
  { id: 'market', label: 'Market' },
];

export default function FacultyTab({ s, act, target, onTargetConsumed, onOpenCurriculum }: {
  s: GameState; act: (a: Action) => void;
  // A department to open and scroll to on arrival (from the Curriculum tab's
  // wall or a drawer's dead end). Consumed on arrival.
  target?: string;
  onTargetConsumed?: () => void;
  // To the Curriculum tab: "field:<name>" for courses waiting on a
  // department, "unstaffed" for courses nobody holds.
  onOpenCurriculum?: (target: string) => void;
}) {
  const cap = useMemo(() => facultyCapacity(s), [s.faculty, s.candidates, s.tech, s.research.initiatives]);
  const commitments = useMemo(() => commitmentsByFaculty(s), [s.research.initiatives, s.tech]);
  const demand = useMemo(() => courseDemandByField(s), [s.tech]);

  // Strongest teacher first in a department; strongest listing first on the market.
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
  // Only the departments the college uses (Plan 29): a course offered or
  // revealed, or somebody on the roster. The rest wait behind a toggle, so
  // the market scans without scrolling every field there is.
  const [everyField, setEveryField] = useState(false);
  const developed = (c: FieldCapacity) => c.offered > 0 || c.available > 0 || c.hired > 0 || c.field === target;
  const hiddenFields = cap.fields.filter((c) => !developed(c)).length;
  // Expansion is stored as per-row overrides over a default (collapsed), so
  // "Expand all" and a row's own toggle compose.
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
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
  // Summed department by department (facultyCapacity.ts's total.shortfall):
  // school-wide totals would count one department's surplus against another's gap.
  const toFinish = cap.total.shortfall;

  return (
    <div className="tab-content">
      <section className="panel faculty-summary">
        <div className="panel-head">
          <span className="panel-head-title">
            <h2>Faculty</h2>
            <HelpHint text="Every department the college could have, whether or not anybody is in it. The meter on each row is drawn to one scale across the whole board: the solid part is the slots its courses take now, the half-tone the courses revealed but not yet developed, the dotted tail the rest of the catalog — and the upright rule is what the roster actually supplies, which is the thing hiring moves. A course holds its slot for as long as it is offered, whether or not somebody is teaching it, and a scholar on a research project supplies two fewer. Appointing is immediate and costs nothing up front; what costs is the salary." />
          </span>
          <span className="stat">{s.faculty.length} on payroll</span>
          <span className="stat">{s.candidates.length} on the market</span>
          {committedCount > 0 && <span className="stat">{committedCount} on projects</span>}
        </div>
        {/* The one school-wide figure, in people rather than slots. */}
        <FacultyNextUp s={s} act={act} fields={cap.fields} onOpenCurriculum={onOpenCurriculum} />
        <p className="faculty-horizon">
          <strong>{cap.total.supply}</strong> course slots supplied,
          {' '}<strong>{cap.total.offered}</strong> taken by what is on offer,
          {' '}<strong>{cap.total.available}</strong> more revealed and waiting.
          {toFinish > 0
            ? ` Teaching the whole catalog takes ${cap.total.catalogue} slots in the departments that hold them — ${toFinish} short, about ${hiresFor(toFinish)} more appointments at the slots a new hire brings, fewer if you keep them long enough to grow.`
            : ' Every department can already teach its whole catalog.'}
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
            {hiddenFields > 0 || everyField ? (
              <button type="button" aria-pressed={everyField} onClick={() => setEveryField((v) => !v)}>
                {everyField ? 'Only the fields in use' : `Show every field (${hiddenFields} more)`}
              </button>
            ) : null}
          </span>
        </div>

        <div className="dept-head">
          <span className="dept-name">Department</span>
          <span className="capacity-legend">
            <span className="capacity-key-pair"><span className="capacity-key offered" />offered</span>
            <span className="capacity-key-pair"><span className="capacity-key available" />revealed</span>
            <span className="capacity-key-pair"><span className="capacity-key locked" />catalog</span>
            <span className="capacity-key-pair"><span className="capacity-key rule" />slots supplied</span>
          </span>
          <span className="dept-slots">used/have</span>
          <span className="dept-catalogue">all</span>
          <span className="dept-people">people</span>
          <span className="dept-note">next</span>
        </div>

        {FACULTY_FIELD_GROUPS.filter((group) => everyField || group.fields.some((field) => developed(cap.byField.get(field)!))).map((group) => (
          <section key={group.name} className="dept-group">
            <h4>{group.name}</h4>
            {group.fields.filter((field) => everyField || developed(cap.byField.get(field)!)).map((field) => {
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

      <AdministrationPanel s={s} act={act} />
    </div>
  );
}
