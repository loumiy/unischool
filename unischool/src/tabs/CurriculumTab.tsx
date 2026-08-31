import type { Action } from '../state/actions';
import type { Buildable, GameState } from '../state/types';
import { discoverySchools } from '../data/techData';
import { canStartDevelopment, hasFreeFacultySlot } from '../systems/techtree/techSystem';
import HelpHint from '../components/HelpHint';

// ---------------------------------------------------------------------
// Progressive discovery: the curriculum is not laid out whole. What's
// visible is derived purely from existing unlock/milestone state — no new
// gating, just a different read of it:
//   - The gen-ed core is the only thing revealed at the very start — it's
//     the true root of the tree now (see techData.ts: every major's
//     tier-1 requires the whole core, not just its own school). It stays
//     in the pool for good; General Studies has no majors, so it has
//     nothing further of its own to reveal.
//   - Once the gen-ed core is complete, every major's tier-1 joins the
//     ungrouped POOL. A major's tier-1 then sits there until its school
//     is built (all that school's tier-1s done).
//   - Once a school is built, its courses leave the pool and form a
//     labeled section: completed tier-1s + newly-visible tier-2s, shared
//     across majors that haven't completed their tier-2 quartet yet.
//   - Once a major's tier-2 quartet is complete (the existing
//     `major-complete:<prefix>` milestone), that major splits into its
//     own labeled sub-group within the section, and its tier-3s appear
//     there — the same event, per the task.
// A course, once revealed, is never hidden again — only its cell state
// (locked/available/developing/done) changes as the underlying Buildable
// status does. "Locked" here means revealed-but-blocked (a faculty gate or
// a cross-major prereq bridge still unmet), never "not yet discovered".
// ---------------------------------------------------------------------

interface DiscoverySection {
  key: string;
  label: string | null; // null = the top-level ungrouped pool
  courseIds: string[];
  subgroups: Array<{ key: string; label: string; courseIds: string[] }>;
}

// The gen-ed core (General Studies' coreIds — no other school has any) is
// the shared prereq gating every major's tier-1 (see techData.ts). Whether
// it's complete decides both what joins the pool and what the pool caption
// below says, so it's computed once and threaded through.
function isGenEdComplete(s: GameState): boolean {
  const coreIds = discoverySchools().flatMap((school) => school.coreIds);
  return coreIds.length > 0 && coreIds.every((id) => s.tech.find((t) => t.id === id)?.status === 'done');
}

function buildSections(s: GameState, genEdComplete: boolean): DiscoverySection[] {
  const findStatus = (id: string) => s.tech.find((t) => t.id === id)?.status;
  const poolIds: string[] = [];
  const sections: DiscoverySection[] = [];

  for (const school of discoverySchools()) {
    poolIds.push(...school.coreIds); // gen-ed core (General Studies only) — never leaves the pool

    if (school.majors.length === 0) continue; // nothing further to discover (General Studies has no majors)
    if (!genEdComplete) continue; // every major's tier-1 waits on the shared gen-ed core

    const schoolBuilt = findStatus(school.buildingId) === 'done';
    if (!schoolBuilt) {
      for (const major of school.majors) poolIds.push(major.tier1Id);
      continue;
    }

    const sharedIds: string[] = [];
    const subgroups: DiscoverySection['subgroups'] = [];
    for (const major of school.majors) {
      const majorComplete = !!s.milestones[`major-complete:${major.prefix}`];
      if (majorComplete) {
        subgroups.push({
          key: major.prefix,
          label: major.name,
          courseIds: [major.tier1Id, ...major.tier2Ids, ...major.tier3Ids],
        });
      } else {
        sharedIds.push(major.tier1Id, ...major.tier2Ids);
      }
    }
    sections.push({ key: school.buildingId, label: school.name, courseIds: sharedIds, subgroups });
  }

  return [{ key: 'pool', label: null, courseIds: poolIds, subgroups: [] }, ...sections];
}

type CellState = 'locked' | 'blocked' | 'available' | 'developing' | 'done';

function cellState(s: GameState, t: Buildable): CellState {
  if (t.status === 'done') return 'done';
  if (t.status === 'developing') return 'developing';
  if (t.status === 'locked') return 'locked';
  return canStartDevelopment(s, t) ? 'available' : 'blocked';
}

// One course cell: shows its course code (e.g. "FINA 101"), fills brass
// when done, pulses while developing, and is directly clickable to start
// development when eligible — the scroll-through list this replaces is
// gone. A hover tooltip carries everything else: full name, description,
// prereqs (met/unmet), the faculty gate (kept visually distinct from
// prereqs), cost, and duration.
function CourseCell({ s, act, t, lookup }: { s: GameState; act: (a: Action) => void; t: Buildable; lookup: Map<string, Buildable> }) {
  const state = cellState(s, t);
  const code = t.name.split(' · ')[0];
  const missingFaculty = !!(t.requiresFaculty && !hasFreeFacultySlot(s, t.requiresFaculty));

  const blockedReason = state === 'blocked'
    ? s.finance.cash < 0
      ? 'Cash is negative — development is stalled until it recovers.'
      : missingFaculty
        ? `No free ${t.requiresFaculty} faculty slots — hire more or more senior ${t.requiresFaculty} faculty on the Campus tab.`
        : 'All development slots are busy — commission more on the Campus tab.'
    : undefined;

  return (
    <div className="course-cell-wrap">
      <button
        type="button"
        className={`course-cell ${state}`}
        disabled={state !== 'available'}
        onClick={() => act({ type: 'START_DEVELOPMENT', nodeId: t.id })}
      >
        {code}
      </button>
      <div className="course-tooltip" role="tooltip">
        <div className="course-tooltip-name">{t.name}</div>
        <p className="course-tooltip-desc">{t.description}</p>
        {t.prereqs.length > 0 && (
          <ul className="course-tooltip-prereqs">
            {t.prereqs.map((id) => {
              const p = lookup.get(id);
              const met = p?.status === 'done';
              return (
                <li key={id} className={met ? 'met' : 'unmet'}>
                  {met ? '✓' : '✗'} {p?.name ?? id}
                </li>
              );
            })}
          </ul>
        )}
        {t.requiresFaculty && (
          <div className={`course-tooltip-faculty ${missingFaculty ? 'unmet' : 'met'}`}>
            {missingFaculty ? '✗' : '✓'} Faculty: {t.requiresFaculty}
          </div>
        )}
        <div className="course-tooltip-meta">${t.cost.toLocaleString()} · {t.duration}w</div>
        {blockedReason && <p className="course-tooltip-reason">{blockedReason}</p>}
      </div>
    </div>
  );
}

function CellGrid({ s, act, ids, lookup }: { s: GameState; act: (a: Action) => void; ids: string[]; lookup: Map<string, Buildable> }) {
  return (
    <div className="cell-grid">
      {ids.map((id) => {
        const t = lookup.get(id);
        return t ? <CourseCell key={id} s={s} act={act} t={t} lookup={lookup} /> : null;
      })}
    </div>
  );
}

export default function CurriculumTab({ s, act }: { s: GameState; act: (a: Action) => void }) {
  const courses = s.tech.filter((t) => t.kind === 'course');
  const doneCourses = courses.filter((t) => t.status === 'done').length;
  const catalogPct = Math.round((doneCourses / courses.length) * 100);
  const slotsUsed = Object.keys(s.developing).length;

  const lookup = new Map(s.tech.map((t) => [t.id, t]));
  const genEdComplete = isGenEdComplete(s);
  const sections = buildSections(s, genEdComplete);
  const [pool, ...schoolSections] = sections;

  return (
    <div className="tab-content">
      <section className="panel curriculum-panel">
        <div className="panel-head">
          <h2>The Curriculum</h2>
          <span className="stat">{doneCourses}/{courses.length} done · {catalogPct}% · {slotsUsed}/{s.slots} slots used</span>
          <HelpHint
            align="end"
            text={genEdComplete
              ? "Open to all incoming students — not yet organized by school. Complete a school's entry courses to raise its building."
              : 'The general-education core — every major waits on it. Complete it to unlock every major\'s entry course.'}
          />
        </div>
        {s.finance.cash < 0 && (
          <p className="stall-note">Cash is negative — new development is stalled until it recovers.</p>
        )}

        <div className="curriculum-scroll">
          <div className="discovery-pool">
            <CellGrid s={s} act={act} ids={pool.courseIds} lookup={lookup} />
          </div>

          {schoolSections.map((section) => (
            <div key={section.key} className="discovery-section">
              <div className="discovery-section-head"><h3>School of {section.label}</h3></div>
              {section.courseIds.length > 0 && <CellGrid s={s} act={act} ids={section.courseIds} lookup={lookup} />}
              {section.subgroups.map((sub) => (
                <div key={sub.key} className="discovery-subgroup">
                  <h4>{sub.label}</h4>
                  <CellGrid s={s} act={act} ids={sub.courseIds} lookup={lookup} />
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
