import AdministrationPanel from './AdministrationPanel';
import { useEffect, useMemo, useState } from 'react';
import type { Action } from '../state/actions';
import type { Faculty, GameState } from '../state/types';
import { facultyQualityTier, CANDIDATE_LISTING_WEEKS, FACULTY_FIELD_GROUPS } from '../data/facultyData';
import { researchTopic } from '../data/researchTopics';
import { discoverySchools } from '../data/techData';
import { hasFreeSlot, unstaffedCourses } from '../systems/techtree/techSystem';
import { facultyCapacity, hiresFor, type FieldCapacity } from '../systems/faculty/facultyCapacity';
import { facultyLoads, type FacultyLoads } from '../systems/faculty/facultyAssignment';
import HelpHint from '../components/HelpHint';
import { DisclosureIcon } from '../components/icons';
import { GradeChip, SearchOffer } from './CurriculumTab';
import { searchCost } from '../systems/faculty/facultySearch';
import {
  deptAction, payroll, searchable, waitingCourses, worthTaking, type Listing,
} from '../systems/faculty/hiringNext';
import {
  FACULTY_SORTS, GROUP_SCOPE, NO_GRID_FILTER, compareFaculty, retiringSoon, showsDepartment, showsPerson,
  type FacultyFilter, type FacultySort, type GridFilter,
} from './facultySort';
import FacultyTile, { waitingCount, type Commitment, type FieldWaiting } from './FacultyTile';
import { money, moneyShort, pct, surnameOf, weeksShort } from '../format';

// The Faculty tab (Plan 84D): the faculty as a grid of tiles (FacultyTile.tsx)
// to sort and filter, the market as the same tiles, and the department board.
//
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
      ? `No ${field} course is open yet — ${catalogue} in the catalog are waiting behind buildings and prerequisites.`
      : `Nothing in the catalog asks for ${field}.`;
  }
  const count = demand.reduce((n, g) => n + g.courses.length, 0);
  return `${count} open ${count === 1 ? 'course pulls' : 'courses pull'} on ${field}: `
    + demand.map((g) => `${g.group} (${g.courses.join(', ')})`).join('; ')
    + `. Each one occupies a course slot in this department for as long as it is offered, whether or not somebody is teaching it.`;
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
        title={`Appoint ${l.candidate.name} (teaching ${l.candidate.teaching}) at ${money(l.pay)}/yr${l.unblocks.length > 0 ? ` — opens ${l.unblocks.join(', ')}` : ''}; the listing withdraws in ${l.weeksLeft === 1 ? 'a week' : `${l.weeksLeft} weeks`}`}
      >
        Appoint {surnameOf(l.candidate.name)}
        {l.grade && <GradeChip grade={l.grade} />}
        <span className="dept-action-meta">{moneyShort(l.pay)} · {weeksShort(l.weeksLeft)}</span>
      </button>
    );
  }
  if (action.kind === 'searching') {
    return <span className="dept-note short">searching · {weeksShort(action.weeksLeft)}</span>;
  }
  if (action.kind === 'search') {
    return (
      <button
        type="button"
        className="dept-action search"
        disabled={!action.canPost}
        onClick={(e) => { e.stopPropagation(); act({ type: 'POST_SEARCH', field: c.field }); }}
        title={`Nobody is listed in ${c.field}. A search runs half a year with a much better chance every week that somebody is: ${money(action.cost)}.`}
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
  const widthOf = (n: number) => `${(Math.max(0, Math.min(scale, n)) / scale) * 100}%`;
  const locked = Math.max(0, c.catalogue - c.offered - c.available);
  const taken = c.grossSupply - c.supply;
  // A department hired past everything it will ever teach: the rule pins to
  // the track's end instead of squashing every other department's scale.
  const beyond = c.supply > c.catalogue;

  const title = [
    `${c.field}: ${c.supply} course ${c.supply === 1 ? 'slot' : 'slots'} supplied by ${c.hired} ${c.hired === 1 ? 'professor' : 'professors'}.`,
    `${c.offered} taken by courses on offer now, ${c.available} more open and not yet developed, ${c.catalogue} in the catalog all told.`,
    taken > 0 ? `${taken} ${taken === 1 ? 'course slot is' : 'course slots are'} with a research project.` : '',
    beyond ? 'The department can already teach its whole catalog.' : '',
  ].filter(Boolean).join(' ');

  return (
    <span className={`capacity-meter ${c.state}`} role="img" aria-label={title} title={title}>
      <span className="capacity-track">
        <span className="capacity-seg offered" style={{ width: widthOf(c.offered) }} />
        <span className="capacity-seg available" style={{ width: widthOf(c.available) }} />
        <span className="capacity-seg locked" style={{ width: widthOf(locked) }} />
        {taken > 0 && !beyond && <span className="capacity-rule gross" style={{ left: widthOf(c.grossSupply) }} />}
        <span
          className={`capacity-rule${beyond ? ' beyond' : ''}${c.supply === 0 ? ' at-zero' : ''}`}
          style={{ left: widthOf(c.supply) }}
        />
      </span>
    </span>
  );
}

// One department: the row you scan, and everything it opens into.
function DepartmentRow(
  { s, act, c, scale, demand, open, onToggle, hired, listed, commitments, waiting, loads, onOpenCurriculum }:
  {
    s: GameState; act: (a: Action) => void; c: FieldCapacity; scale: number;
    demand: DemandByMajor | undefined;
    open: boolean; onToggle: () => void;
    hired: Faculty[]; listed: Faculty[];
    commitments: Map<string, Commitment>;
    waiting: FieldWaiting | undefined;
    loads: FacultyLoads;
    onOpenCurriculum?: (target: string) => void;
  },
) {
  const openCourses = waiting?.open ?? [];
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
          <span className="dept-caret"><DisclosureIcon open={open} /></span>
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
                  {openCourses.length === 0
                    ? 'Open in Curriculum →'
                    : c.state === 'short' || c.state === 'over'
                      ? `${openCourses.length} waiting on faculty →`
                      : `${openCourses.length} still ahead →`}
                </button>
              </>
            )}
          </p>

          {hired.length > 0 ? (
            <ul className="faculty-list">
              {hired.map((f) => (
                <FacultyTile key={f.id} s={s} act={act} f={f} isCandidate={false} commitment={commitments.get(f.id)} waiting={waiting} load={loads.get(f.id) ?? 0} />
              ))}
            </ul>
          ) : (
            <p className="empty-note">
              Nobody in {c.field}.{c.offered > 0
                ? ` ${c.offered} ${c.offered === 1 ? 'course is' : 'courses are'} offered with no one to teach them.`
                : ''}
            </p>
          )}

          {(listed.length > 0 || c.state === 'over' || c.state === 'short') && (
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
                    <FacultyTile key={cand.id} s={s} act={act} f={cand} isCandidate={true} waiting={waiting} />
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
function FacultyNextUp({ s, act, fields, onOpenCurriculum, onOpenMarket }: {
  s: GameState; act: (a: Action) => void; fields: FieldCapacity[]; onOpenCurriculum?: (target: string) => void;
  // To the market, filtered to a field: a retirement's successor (Plan 84D).
  onOpenMarket: (field: string) => void;
}) {
  // Everyone whose year's notice has been given, soonest first.
  const retiring = s.faculty.filter(retiringSoon).sort((a, b) => b.tenureWeeks - a.tenureWeeks);
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
                title={`${l.candidate.name}, ${facultyQualityTier(l.candidate)} in ${l.field}: teaching ${l.candidate.teaching}, ${money(l.pay)}/yr at the college's rate${l.course ? `; would earn a ${l.grade} on ${l.course.name}` : ''}${l.unblocks.length > 0 ? `; opens ${l.unblocks.join(', ')}` : ''}. Withdraws in ${l.weeksLeft === 1 ? 'a week' : `${l.weeksLeft} weeks`}.`}
              >
                Appoint {surnameOf(l.candidate.name)} · {l.field}
                {l.grade && <GradeChip grade={l.grade} />}
                <span className="next-up-meta">{moneyShort(l.pay)} · {weeksShort(l.weeksLeft)}</span>
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
                ? <span key={x.field} className="next-up-note">{x.field} · searching, {weeksShort(x.running)} left</span>
                : (
                  <button
                    key={x.field}
                    type="button"
                    className="next-up-door"
                    disabled={s.finance.cash < searchCost(s)}
                    onClick={() => act({ type: 'POST_SEARCH', field: x.field })}
                    title={`${x.waiting} ${x.waiting === 1 ? 'course is' : 'courses are'} waiting on ${x.field} and nobody is on the market. A search runs half a year: ${money(searchCost(s))}.`}
                  >
                    Post a search · {x.field} <span className="next-up-meta">{moneyShort(searchCost(s))} · {x.waiting} waiting</span>
                  </button>
                )
            ))}
          </span>
        </div>
      )}
      {retiring.length > 0 && (
        <div className="next-up-item retiring">
          <span className="next-up-label">Retiring</span>
          <span className="next-up-doors">
            {retiring.slice(0, 4).map((f) => (
              <button
                key={f.id}
                type="button"
                className="next-up-door"
                onClick={() => onOpenMarket(f.field)}
                title={`${f.name} retires within the year. The market in ${f.field}, to find a successor.`}
              >
                {surnameOf(f.name)} · {f.field} <span className="next-up-meta">the market →</span>
              </button>
            ))}
            {retiring.length > 4 && <span className="next-up-note">+{retiring.length - 4} more</span>}
          </span>
        </div>
      )}
      {over.length > 0 && (
        <div className="next-up-item wall">
          <span className="next-up-label">Short-staffed</span>
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
          <span className="next-up-meta">{moneyShort(pay.weekly)}/wk · {pct(pay.share)} of expenses</span>
          {pay.wouldAdd > 0 && <span className="next-up-note"> — the appointments above would add {money(pay.wouldAdd)}/wk</span>}
        </span>
      </div>
    </div>
  );
}

// The view, sort and filters (Plans 72F and 84D), kept for the session:
// closing the tab unmounts it, and the choice should be there when it
// opens again.
type View = 'faculty' | 'market' | 'departments';

const VIEWS: Array<{ id: View; label: string; title: string }> = [
  { id: 'faculty', label: 'Faculty', title: 'On the faculty' },
  { id: 'market', label: 'Market', title: 'On the market' },
  { id: 'departments', label: 'Departments', title: 'Departments' },
];

const session: { view: View; sort: FacultySort; grid: GridFilter; board: FacultyFilter } = {
  view: 'faculty', sort: 'teaching', grid: NO_GRID_FILTER, board: { field: null, shortOnly: false },
};

// A target the tab can open on: a department on the board (the Curriculum's
// doors), or the market in a field (a retirement's notice).
export const MARKET_TARGET = 'market:';

// The courses waiting in each field, read once for every tile.
function waitingByField(s: GameState): Map<string, FieldWaiting> {
  const map = new Map<string, FieldWaiting>();
  const at = (field: string) => {
    let w = map.get(field);
    if (!w) { w = { unstaffed: 0, open: waitingCourses(s, field) }; map.set(field, w); }
    return w;
  };
  for (const t of unstaffedCourses(s)) at(t.requiresFaculty!).unstaffed += 1;
  for (const f of [...s.faculty, ...s.candidates]) at(f.field);
  return map;
}

// The filter bar over the grid: sort, field or division, the two toggles,
// search, and the departments short of people as one-click filters.
function GridTools({ sort, setSort, filter, setFilter, fields, market, shown, total }: {
  sort: FacultySort; setSort: (s: FacultySort) => void;
  filter: GridFilter; setFilter: (f: GridFilter) => void;
  fields: FieldCapacity[]; market: boolean; shown: number; total: number;
}) {
  const inUse = new Set(fields.filter((c) => c.offered > 0 || c.available > 0 || c.hired > 0 || c.listed > 0).map((c) => c.field));
  const short = fields.filter((c) => c.state === 'short' || c.state === 'over');
  const narrowed = filter.scope !== null || filter.retiring || filter.canTake || filter.query !== '';
  return (
    <div className="faculty-grid-tools">
      <div className="dept-tools">
        <label className="dept-tool">
          Sort by
          <select value={sort} onChange={(e) => setSort(e.target.value as FacultySort)}>
            {FACULTY_SORTS.filter((o) => !market || (o.id !== 'here' && o.id !== 'years')).map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </label>
        <label className="dept-tool">
          Field
          <select value={filter.scope ?? ''} onChange={(e) => setFilter({ ...filter, scope: e.target.value === '' ? null : e.target.value })}>
            <option value="">All</option>
            {FACULTY_FIELD_GROUPS.filter((g) => g.fields.some((f) => inUse.has(f) || filter.scope === f)).map((g) => (
              <optgroup key={g.name} label={g.name}>
                {g.fields.length > 1 && <option value={`${GROUP_SCOPE}${g.name}`}>All of {g.name}</option>}
                {g.fields.filter((f) => inUse.has(f) || filter.scope === f).map((f) => <option key={f} value={f}>{f}</option>)}
              </optgroup>
            ))}
          </select>
        </label>
        {!market && (
          <label className="dept-tool dept-tool-check">
            <input type="checkbox" checked={filter.retiring} onChange={(e) => setFilter({ ...filter, retiring: e.target.checked })} />
            Retiring soon
          </label>
        )}
        <label className="dept-tool dept-tool-check" title={market ? 'Candidates in a field with a course waiting' : 'Professors with a free course slot in a field with a course waiting'}>
          <input type="checkbox" checked={filter.canTake} onChange={(e) => setFilter({ ...filter, canTake: e.target.checked })} />
          Can take a course
        </label>
        <input
          type="search"
          className="faculty-search"
          placeholder="Search names, fields, quirks"
          aria-label="Search the faculty"
          value={filter.query}
          onChange={(e) => setFilter({ ...filter, query: e.target.value })}
        />
        <span className="dept-tool-count">
          {narrowed ? `${shown} of ${total}` : `${total}`}
          {narrowed && <button type="button" className="faculty-clear" onClick={() => setFilter(NO_GRID_FILTER)}>Clear</button>}
        </span>
      </div>
      {/* The departments short of people (Plan 72F's flags), one click from
          their people or their market. */}
      {short.length > 0 && (
        <div className="faculty-short">
          <span className="faculty-short-label">Short-staffed</span>
          {short.map((c) => (
            <button
              key={c.field}
              type="button"
              className={`dept-note ${c.state}${filter.scope === c.field ? ' on' : ''}`}
              aria-pressed={filter.scope === c.field}
              onClick={() => setFilter({ ...filter, scope: filter.scope === c.field ? null : c.field })}
              title={c.state === 'over'
                ? `${c.field} offers ${c.offered - c.supply} more ${c.offered - c.supply === 1 ? 'course' : 'courses'} than its people can teach`
                : `${c.field} has courses open and no course slot free to develop them`}
            >
              {c.field} · {c.state === 'over' ? `over by ${c.offered - c.supply}` : 'short'}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function FacultyTab({ s, act, target, onTargetConsumed, onOpenCurriculum }: {
  s: GameState; act: (a: Action) => void;
  // A department to open on the board (from the Curriculum tab's wall or a
  // drawer's dead end), or MARKET_TARGET and a field (a retirement's
  // notice). Consumed on arrival.
  target?: string;
  onTargetConsumed?: () => void;
  // To the Curriculum tab: "field:<name>" for courses waiting on a
  // department, "unstaffed" for courses nobody holds.
  onOpenCurriculum?: (target: string) => void;
}) {
  const cap = useMemo(() => facultyCapacity(s), [s.faculty, s.candidates, s.tech, s.research.initiatives]);
  const commitments = useMemo(() => commitmentsByFaculty(s), [s.research.initiatives, s.tech]);
  const demand = useMemo(() => courseDemandByField(s), [s.tech]);
  const waiting = useMemo(() => waitingByField(s), [s.tech, s.courseFaculty, s.programOffers, s.faculty, s.candidates]);
  const loads = useMemo(() => facultyLoads(s), [s.tech, s.courseFaculty]);

  const [view, setViewState] = useState<View>(session.view);
  const [sort, setSortState] = useState<FacultySort>(session.sort);
  const [grid, setGridState] = useState<GridFilter>(session.grid);
  const [board, setBoardState] = useState<FacultyFilter>(session.board);
  const setView = (next: View) => { session.view = next; setViewState(next); };
  const setSort = (next: FacultySort) => { session.sort = next; setSortState(next); };
  const setGrid = (next: GridFilter) => { session.grid = next; setGridState(next); };
  const setBoard = (next: FacultyFilter) => { session.board = next; setBoardState(next); };
  const openMarket = (field: string) => {
    setView('market');
    setGrid({ ...NO_GRID_FILTER, scope: field });
    window.setTimeout(() => document.querySelector('.faculty-people')?.scrollIntoView({ block: 'start', behavior: 'smooth' }), 0);
  };

  // Years here and years left mean nothing on the market.
  const gridSort: FacultySort = view === 'market' && (sort === 'here' || sort === 'years') ? 'teaching' : sort;
  const market = view === 'market';
  const people = market ? s.candidates : s.faculty;
  const canTake = (f: Faculty) => waitingCount(waiting.get(f.field)) > 0 && (market || hasFreeSlot(s, f));
  const shownPeople = useMemo(
    () => (view === 'departments' ? [] : people.filter((f) => showsPerson(grid, f, !grid.canTake || canTake(f))).sort(compareFaculty(gridSort))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [view, people, grid, gridSort, waiting, loads],
  );

  // The board's people, by field, in the chosen order.
  const byField = (list: Faculty[]) => {
    const map = new Map<string, Faculty[]>();
    for (const f of list) {
      if (!map.has(f.field)) map.set(f.field, []);
      map.get(f.field)!.push(f);
    }
    for (const l of map.values()) l.sort(compareFaculty(sort));
    return map;
  };
  const hired = useMemo(() => byField(s.faculty), [s.faculty, sort]);
  const listed = useMemo(() => byField(s.candidates), [s.candidates, sort]);

  // Only the departments the college uses (Plan 29): a course offered or
  // revealed, or somebody on the roster. The rest wait behind a toggle.
  const [everyField, setEveryField] = useState(false);
  const developed = (c: FieldCapacity) => c.offered > 0 || c.available > 0 || c.hired > 0 || c.field === target || c.field === board.field;
  const shownDept = (c: FieldCapacity) => (everyField || developed(c)) && showsDepartment(board, c.field, c.state);
  const departments = cap.fields.filter(developed).map((c) => c.field).sort();
  const hiddenFields = cap.fields.filter((c) => !developed(c)).length;
  // Expansion is stored as per-row overrides over a default (collapsed), so
  // "Expand all" and a row's own toggle compose.
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const isOpen = (c: FieldCapacity) => overrides[c.field] ?? false;
  const setAll = (open: boolean) => {
    const next: Record<string, boolean> = {};
    for (const c of cap.fields) next[c.field] = open;
    setOverrides(next);
  };

  useEffect(() => {
    if (!target) return;
    if (target.startsWith(MARKET_TARGET)) {
      openMarket(target.slice(MARKET_TARGET.length));
    } else {
      setView('departments');
      setOverrides((o) => ({ ...o, [target]: true }));
      window.setTimeout(() => document.querySelector(`[data-field="${CSS.escape(target)}"]`)?.scrollIntoView({ block: 'start', behavior: 'smooth' }), 0);
    }
    onTargetConsumed?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  const committedCount = commitments.size;
  // Summed department by department (facultyCapacity.ts's total.shortfall):
  // school-wide totals would count one department's surplus against another's gap.
  const toFinish = cap.total.shortfall;
  // The field the market is narrowed to, if it is one field.
  const scopedField = grid.scope !== null && !grid.scope.startsWith(GROUP_SCOPE) ? cap.byField.get(grid.scope) : undefined;

  return (
    <div className="tab-content">
      <section className="panel faculty-summary">
        <div className="panel-head">
          <span className="panel-head-title">
            <h2>Faculty</h2>
            <HelpHint text="Every professor and every candidate as a tile: teaching and research as letters on the scale courses are graded on, with the letter each is growing toward. Sort and filter the grid, or open the Departments view for each department's course slots against what its courses take. A course holds its slot for as long as it is offered, whether or not somebody is teaching it, and a scholar on a research project supplies two fewer. Appointing is immediate and costs nothing up front; what costs is the salary." />
          </span>
          <span className="stat">{s.faculty.length} on payroll</span>
          <span className="stat">{s.candidates.length} on the market</span>
          {committedCount > 0 && <span className="stat">{committedCount} on projects</span>}
        </div>
        {/* The one school-wide figure, in people rather than slots. */}
        <FacultyNextUp s={s} act={act} fields={cap.fields} onOpenCurriculum={onOpenCurriculum} onOpenMarket={openMarket} />
        <p className="faculty-horizon">
          <strong>{cap.total.supply}</strong> course slots supplied,
          {' '}<strong>{cap.total.offered}</strong> taken by what is on offer,
          {' '}<strong>{cap.total.available}</strong> more open and waiting.
          {toFinish > 0
            ? ` Teaching the whole catalog takes ${cap.total.catalogue} course slots in the departments that hold them — ${toFinish} short, about ${hiresFor(toFinish)} more appointments at the course slots a new hire brings, fewer if you keep them long enough to grow.`
            : ' Every department can already teach its whole catalog.'}
        </p>
      </section>

      <section className="panel faculty-people">
        <div className="panel-head">
          <span className="panel-head-title"><h3>{VIEWS.find((v) => v.id === view)!.title}</h3></span>
          <span className="dept-views segmented">
            {VIEWS.map((v) => (
              <button key={v.id} type="button" className={view === v.id ? 'on' : undefined} aria-pressed={view === v.id} onClick={() => setView(v.id)}>
                {v.label}
              </button>
            ))}
          </span>
          {view === 'departments' && (
            <span className="dept-bulk">
              <button type="button" onClick={() => setAll(true)}>Expand all</button>
              <button type="button" onClick={() => setAll(false)}>Collapse all</button>
              {hiddenFields > 0 || everyField ? (
                <button type="button" aria-pressed={everyField} onClick={() => setEveryField((v) => !v)}>
                  {everyField ? 'Only the fields in use' : `Show every field (${hiddenFields} more)`}
                </button>
              ) : null}
            </span>
          )}
        </div>

        {view !== 'departments' && (
          <>
            <GridTools
              sort={gridSort} setSort={setSort} filter={grid} setFilter={setGrid}
              fields={cap.fields} market={market} shown={shownPeople.length} total={people.length}
            />
            {market && (
              <p className="faculty-market-note">
                {s.candidates.length} listed · a listing withdraws after {CANDIDATE_LISTING_WEEKS} weeks, and the market turns over every week.
              </p>
            )}
            {shownPeople.length > 0 ? (
              <ul className="faculty-list faculty-grid">
                {shownPeople.map((f) => (
                  <FacultyTile
                    key={f.id} s={s} act={act} f={f} isCandidate={market}
                    commitment={market ? undefined : commitments.get(f.id)}
                    waiting={waiting.get(f.field)}
                    load={market ? 0 : loads.get(f.id) ?? 0}
                  />
                ))}
              </ul>
            ) : (
              <p className="empty-note">
                {people.length === 0
                  ? (market ? 'Nobody is on the market this week.' : 'Nobody is on the faculty yet. Appoint someone from the market.')
                  : market && scopedField
                    ? `No ${scopedField.field} candidate is listed. The market turns over every week — or pay for a search.`
                    : 'Nobody matches.'}
              </p>
            )}
            {/* A search, when the market is narrowed to one field that is
                short of people or has nobody listed (a retirement's). */}
            {market && scopedField && (scopedField.state === 'over' || scopedField.state === 'short' || shownPeople.length === 0) && (
              <SearchOffer s={s} act={act} field={scopedField.field} />
            )}
          </>
        )}

        {view === 'departments' && (
          <>
            {/* Sort and filter (Plan 72F). */}
            <div className="dept-tools">
              <label className="dept-tool">
                Sort people by
                <select value={sort} onChange={(e) => setSort(e.target.value as FacultySort)}>
                  {FACULTY_SORTS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>
              </label>
              <label className="dept-tool">
                Department
                <select
                  value={board.field ?? ''}
                  onChange={(e) => {
                    const field = e.target.value === '' ? null : e.target.value;
                    setBoard({ ...board, field });
                    if (field) setOverrides((o) => ({ ...o, [field]: true }));
                  }}
                >
                  <option value="">All</option>
                  {departments.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </label>
              <label className="dept-tool dept-tool-check">
                <input type="checkbox" checked={board.shortOnly} onChange={(e) => setBoard({ ...board, shortOnly: e.target.checked })} />
                Short-staffed only
              </label>
              {(board.field !== null || board.shortOnly) && !cap.fields.some(shownDept) && (
                <span className="dept-tool-empty">No department matches.</span>
              )}
            </div>

            <div className="dept-head">
              <span className="dept-name">Department</span>
              <span className="capacity-legend">
                <span className="capacity-key-pair"><span className="capacity-key offered" />offered</span>
                <span className="capacity-key-pair"><span className="capacity-key available" />open</span>
                <span className="capacity-key-pair"><span className="capacity-key locked" />catalog</span>
                <span className="capacity-key-pair"><span className="capacity-key rule" />course slots supplied</span>
              </span>
              <span className="dept-slots">used/have</span>
              <span className="dept-catalogue">all</span>
              <span className="dept-people">people</span>
              <span className="dept-note">next</span>
            </div>

            {FACULTY_FIELD_GROUPS.filter((group) => group.fields.some((field) => shownDept(cap.byField.get(field)!))).map((group) => (
              <section key={group.name} className="dept-group">
                <h4>{group.name}</h4>
                {group.fields.filter((field) => shownDept(cap.byField.get(field)!)).map((field) => {
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
                      waiting={waiting.get(field)}
                      loads={loads}
                      onOpenCurriculum={onOpenCurriculum}
                    />
                  );
                })}
              </section>
            ))}
          </>
        )}
      </section>

      <AdministrationPanel s={s} act={act} />
    </div>
  );
}
