import { useCallback, useEffect, useRef, useState } from 'react';
import type { Action } from '../state/actions';
import type { Buildable, GameState } from '../state/types';
import { discoverySchools, graduateGateMet, graduatePrograms, professionalSchools } from '../data/techData';
import { canStartDevelopment, hasFreeFacultySlot } from '../systems/techtree/techSystem';
import { instructorOf } from '../systems/faculty/facultyAssignment';
import HelpHint from '../components/HelpHint';
import { ProgressRing } from '../components/Progress';
import { isTestUniversity } from '../components/StatusHeader';

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
//     `program-established:<prefix>` milestone), that major splits into its
//     own labeled sub-group within the section, and its tier-3s appear
//     there — the same event, per the task.
//   - Once a GRADUATE PROGRAM's parent-school gate opens (see
//     techData.ts's graduateGateMet — five of six majors complete for a
//     professional school, a finished lab for a doctorate), the MBA and
//     each PhD doctorate appear as one more labeled sub-group inside their
//     home school's section, marked as the higher tier they are and
//     captioned with the gate they just cleared — unchanged from before.
//   - Medicine and Law are different: they award an external professional
//     degree rather than building on their parent school's own subject
//     matter, so each stands as its OWN top-level section (own heading, own
//     completion ring, own building), structurally parallel to an
//     undergraduate school rather than a sub-group inside one. Their
//     section reveals once their OWN building is done — the same boolean
//     an undergraduate school section reveals on — not merely once the
//     academic gate that makes the building buildable is met. Reveal, not
//     scarcity: before the building is done there is no Med/Law section on
//     screen at all, in the same way there is no wall of tier-3 courses
//     before a major completes.
// A course, once revealed, is never hidden again — only its cell state
// (locked/available/developing/done) changes as the underlying Buildable
// status does. "Locked" here means revealed-but-blocked (a faculty gate or
// a cross-major prereq bridge still unmet), never "not yet discovered".
// ---------------------------------------------------------------------

// Ring sizes: the catalogue's own completion is the panel's headline
// figure, a school section's is a marginal note next to its title.
const CATALOG_RING_SIZE = 46;
const SECTION_RING_SIZE = 26;

// A sub-group inside a school section: a completed major (its own tier-3
// catalogue now visible) or a revealed graduate program. `graduate` is set
// only for the latter, and carries the two things a graduate group has to
// say that a major does not — which credential it awards, and which gate
// it cleared to appear at all.
export interface DiscoverySubgroup {
  key: string;
  label: string;
  courseIds: string[];
  graduate?: { degree: string; gate: string };
}

export interface DiscoverySection {
  key: string;
  label: string | null; // null = the top-level ungrouped pool
  // The section head's full title. "School of {label}" for every school
  // that hasn't sold its naming rights; the donor's full display text
  // verbatim once it has (see buildSections below and eventData.ts's
  // 'naming-rights' event). '' for the pool, which has no head.
  heading: string;
  courseIds: string[];
  subgroups: DiscoverySubgroup[];
  // Every course id this school will ever own (all tiers of all its
  // majors), whether revealed yet or not — the denominator of the
  // section head's completion ring. Empty for the pool, which has no
  // head and must not advertise a total (see the pool's comment below).
  schoolCourseIds: string[];
}

// The gen-ed core (General Studies' coreIds — no other school has any) is
// the shared prereq gating every major's tier-1 (see techData.ts). Whether
// it's complete decides both what joins the pool and what the pool caption
// below says, so it's computed once and threaded through.
function isGenEdComplete(s: GameState): boolean {
  const coreIds = discoverySchools().flatMap((school) => school.coreIds);
  return coreIds.length > 0 && coreIds.every((id) => s.tech.find((t) => t.id === id)?.status === 'done');
}

// Which graduate programs are currently revealed — the one reading the
// whole graduate half of this view runs on. Two readings, matching how
// each program is gated in the engine (see techSystem.ts's
// meetsUnlockGates):
//   - a program with no building of its own (the MBA, each PhD doctorate)
//     reveals the moment techData.ts's graduateGateMet is true — the same
//     predicate that unlocks its courses, so the tab can never show one the
//     engine has not opened, or hide one it has.
//   - a program WITH a building (Medicine, Law) reveals only once that
//     building is 'done' — graduateGateMet being true only makes the
//     building itself buildable (see meetsUnlockGates), the same
//     distinction an undergraduate school section already draws between
//     "tier-1s done" and "school built".
function revealedGraduatePrograms(s: GameState): Set<string> {
  const revealed = new Set<string>();
  for (const program of graduatePrograms()) {
    if (program.buildingId) {
      if (s.tech.find((t) => t.id === program.buildingId)?.status === 'done') revealed.add(program.id);
    } else if (graduateGateMet(s, program.id)) {
      revealed.add(program.id);
    }
  }
  return revealed;
}

function buildSections(s: GameState, genEdComplete: boolean, revealedGrad: Set<string>): DiscoverySection[] {
  const findBuilding = (id: string) => s.tech.find((t) => t.id === id);
  const coreIds: string[] = [];
  const looseTier1Ids: string[] = [];
  const sections: DiscoverySection[] = [];

  for (const school of discoverySchools()) {
    coreIds.push(...school.coreIds); // gen-ed core (General Studies only) — never leaves the pool

    if (school.majors.length === 0) continue; // nothing further to discover (General Studies has no majors)
    if (!genEdComplete) continue; // every major's tier-1 waits on the shared gen-ed core

    const building = findBuilding(school.buildingId);
    const schoolBuilt = building?.status === 'done';
    if (!schoolBuilt) {
      for (const major of school.majors) looseTier1Ids.push(major.tier1Id);
      continue;
    }

    const sharedIds: string[] = [];
    const subgroups: DiscoverySubgroup[] = [];
    for (const major of school.majors) {
      const programEstablished = !!s.milestones[`program-established:${major.prefix}`];
      if (programEstablished) {
        subgroups.push({
          key: major.prefix,
          label: major.name,
          courseIds: [major.tier1Id, ...major.tier2Ids, ...major.tier3Ids],
        });
      } else {
        sharedIds.push(major.tier1Id, ...major.tier2Ids);
      }
    }
    // Graduate programs come last inside the section, after every major,
    // because that is where they sit in the climb.
    const gradIds: string[] = [];
    for (const program of school.graduate) {
      if (!revealedGrad.has(program.id)) continue;
      gradIds.push(...program.courseIds);
      subgroups.push({
        key: program.id,
        label: program.name,
        courseIds: program.courseIds,
        graduate: { degree: program.degree, gate: program.gate },
      });
    }

    // A donor's `name` overwrite is only ever applied alongside
    // `donorSurname` (see eventData.ts's 'naming-rights' event), so its
    // presence is what distinguishes "the seeded building name changed" from
    // "the school was renamed" — read it straight through rather than
    // re-wrapping it as "School of X".
    const heading = building?.donorSurname ? building.name : `School of ${school.name}`;

    sections.push({
      key: school.buildingId,
      label: school.name,
      heading,
      courseIds: sharedIds,
      subgroups,
      // A school's completion ring counts its graduate programs only once
      // they are revealed. Counting them earlier would put a medical
      // school in the denominator of a Health Science ring years before
      // the player has any way of knowing one exists — the same leak the
      // pool's missing "x / 42" avoids.
      schoolCourseIds: [...school.majors.flatMap((m) => [m.tier1Id, ...m.tier2Ids, ...m.tier3Ids]), ...gradIds],
    });
  }

  // The pool is deliberately ordered core-first, then the loose tier-1s
  // SORTED BY COURSE CODE rather than left in seed order. Seed order walks
  // school by school, which quietly clustered each school's six entry
  // courses into adjacent cells — a structural hint the progressive-
  // discovery design does not intend to give away this early. Sorting by
  // the code the player can already read on the face of the cell scatters
  // those neighbours and adds nothing that wasn't already on screen.
  const poolIds = [...coreIds, ...looseTier1Ids.sort((a, b) => a.localeCompare(b))];

  // Medicine and Law, each its own top-level section — structurally
  // parallel to an undergraduate school section above (own heading, own
  // ring, its own building as the section key), never a sub-group of
  // Health Science or Social Sciences & Humanities. Appended last, after
  // every undergraduate school, the same place graduate sub-groups sit
  // inside a school section. Gated on revealedGrad, which for these two
  // (see revealedGraduatePrograms above) means their OWN building is
  // 'done' — not merely that the academic gate making it buildable is
  // met, so there is no section on screen at all until the building
  // stands. No naming-rights read here: unlike an undergraduate school
  // building, BLDG-MED/BLDG-LAW are deliberately excluded from the
  // naming-rights event's donor pool (see eventData.ts), so `heading` is
  // always the seeded program name.
  for (const program of professionalSchools()) {
    if (!revealedGrad.has(program.id)) continue;
    sections.push({
      key: program.buildingId,
      label: program.name,
      heading: program.name,
      courseIds: program.courseIds,
      subgroups: [],
      schoolCourseIds: program.courseIds,
    });
  }

  return [{ key: 'pool', label: null, heading: '', courseIds: poolIds, subgroups: [], schoolCourseIds: [] }, ...sections];
}

// The same section list buildSections computes for this tab's own render,
// exposed for anything else that needs a school/professional-school's
// completion without re-deriving genEdComplete/revealedGrad itself — the
// campus map's building info popover, in particular (see CampusMap.tsx).
// Each section's `key` is the Buildable id of the building it belongs to
// (a school's buildingId, or MED/LAW's), so a caller with only a placed
// building's id can find its section with a plain lookup. General Studies
// has no section of its own (see buildSections above — it has no majors),
// so a caller needing its completion falls back to discoverySchools()'s
// own coreIds directly.
export function discoverySections(s: GameState): DiscoverySection[] {
  const genEdComplete = isGenEdComplete(s);
  const revealedGrad = revealedGraduatePrograms(s);
  return buildSections(s, genEdComplete, revealedGrad);
}

// Every course id currently rendered somewhere on this tab — the pool, every
// school section, and every subgroup inside one — regardless of that
// course's own status. This is the curriculum alert badge's definition of
// "visible" (see types.ts's SeenState): a course counts as new the instant
// it's REVEALED, whether it arrives already 'available' (a freshly-unlocked
// tier-1, once gen-ed clears) or still 'locked' pending its own prereqs (a
// tier-2 sharing a brand-new school section with a tier-1 that isn't done
// yet) — both are a cell appearing on screen where there was none before,
// which is the moment there's something new to notice.
export function visibleCourseIds(s: GameState): string[] {
  const ids: string[] = [];
  for (const section of discoverySections(s)) {
    ids.push(...section.courseIds);
    for (const sub of section.subgroups) ids.push(...sub.courseIds);
  }
  return ids;
}

type CellState = 'locked' | 'blocked' | 'available' | 'developing' | 'done';

function cellState(s: GameState, t: Buildable): CellState {
  if (t.status === 'done') return 'done';
  if (t.status === 'developing') return 'developing';
  if (t.status === 'locked') return 'locked';
  return canStartDevelopment(s, t) ? 'available' : 'blocked';
}

// ---------------------------------------------------------------------
// Tooltip placement. The tooltip hangs below its cell, which clips as soon
// as the cell nears the bottom of the overlay's scroll box
// (.tab-overlay-body) — and flipping it above the cell isn't enough on its
// own, because early on that box is only a couple of hundred pixels tall
// and neither side of the cell has room inside it.
//
// So the tooltip escapes the box: it is positioned FIXED, in viewport
// coordinates, measured at the moment it is shown. It prefers to sit below
// its cell, flips above when the window has no room there, and is clamped
// into the viewport as a last resort, so it is always fully readable. Its
// content is untouched by any of this.
// ---------------------------------------------------------------------

// The gap between the cell and its tooltip, both directions. Mirrors the
// fallback offset in styles.css's .course-tooltip.
const TOOLTIP_GAP = 4;

// How close to the window edge the tooltip may sit once clamped.
const TOOLTIP_VIEWPORT_MARGIN = 8;

interface TooltipPos { top: number; left: number }

// Where to put a tooltip of this size for a cell at this rect, in viewport
// coordinates. Below by default; above when below would run off the bottom
// and above actually fits; clamped into the window if neither does (a
// window shorter than the tooltip itself), because a tooltip overlapping
// its own cell still reads, and one running off the screen doesn't.
function tooltipPosition(cell: DOMRect, width: number, height: number): TooltipPos {
  const below = cell.bottom + TOOLTIP_GAP;
  const above = cell.top - TOOLTIP_GAP - height;
  const maxTop = window.innerHeight - height - TOOLTIP_VIEWPORT_MARGIN;

  let top = below;
  if (below > maxTop && above >= TOOLTIP_VIEWPORT_MARGIN) top = above;
  top = Math.max(TOOLTIP_VIEWPORT_MARGIN, Math.min(top, maxTop));

  const maxLeft = window.innerWidth - width - TOOLTIP_VIEWPORT_MARGIN;
  const left = Math.max(TOOLTIP_VIEWPORT_MARGIN, Math.min(cell.left, maxLeft));

  return { top, left };
}

// One course cell: shows its course code (e.g. "FINA 101"), fills brass
// when done, pulses while developing, and is directly clickable to start
// development when eligible. The code is split into department and number
// so a wall of forty-odd codes reads as a column of departments with a
// number attached, rather than eight undifferentiated characters.
//
// Two things are drawn ON the cell rather than left to hover: the fill
// bar tracking how far a developing course has run, and a dot marking a
// course whose faculty field currently has no free slot (see the legend
// under the panel head). Everything else stays in the tooltip: full name,
// description, prereqs (met/unmet), the faculty gate, cost, and duration.
//
// The dot is a neutral marker, NOT the field's initial: which field a
// course needs is already in its tooltip, but same-field cells lighting up
// together with a letter on them would draw the eye to clusters that
// correlate with school membership the pool is not meant to reveal yet.
function CourseCell({ s, act, t, lookup }: { s: GameState; act: (a: Action) => void; t: Buildable; lookup: Map<string, Buildable> }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<TooltipPos | null>(null);

  // Measured at the moment the tooltip is about to be shown, so it uses
  // where the cell actually is right now. The tooltip is only
  // visibility:hidden until then, never display:none, so it already has
  // its real laid-out size to measure.
  const placeTooltip = useCallback(() => {
    const wrap = wrapRef.current;
    const tip = tooltipRef.current;
    if (!wrap || !tip) return;
    setPos(tooltipPosition(wrap.getBoundingClientRect(), tip.offsetWidth, tip.offsetHeight));
  }, []);

  // A fixed tooltip doesn't travel with its cell, so while one is up the
  // cell re-measures on any scroll (capture: the overlay body scrolls, not
  // the window) or resize. Only the one open tooltip listens — every other
  // cell has pos === null and registers nothing.
  useEffect(() => {
    if (!pos) return;
    window.addEventListener('scroll', placeTooltip, true);
    window.addEventListener('resize', placeTooltip);
    return () => {
      window.removeEventListener('scroll', placeTooltip, true);
      window.removeEventListener('resize', placeTooltip);
    };
  }, [pos, placeTooltip]);

  const state = cellState(s, t);
  const code = t.name.split(' · ')[0];
  const spaceAt = code.lastIndexOf(' ');
  const dept = spaceAt === -1 ? code : code.slice(0, spaceAt);
  const num = spaceAt === -1 ? '' : code.slice(spaceAt + 1);
  const missingFaculty = !!(t.requiresFaculty && !hasFreeFacultySlot(s, t.requiresFaculty));
  // Only a DONE course has an instructor to name — an available or
  // developing course hasn't been assigned a slot in the round-robin's
  // eyes yet (see facultyAssignment.ts), so implying a teacher for it
  // would be a claim the projection can't back up.
  const instructor = t.status === 'done' ? instructorOf(s, t) : undefined;
  // The gate is only news while the course is still ahead of the player:
  // a developing or finished course already holds its slot.
  const showGateDot = missingFaculty && state !== 'developing' && state !== 'done';

  const weeksLeft = s.developing[t.id] ?? 0;
  const elapsed = t.duration > 0 ? (t.duration - weeksLeft) / t.duration : 1;

  // Same order the build rail uses: price first, then the faculty gate.
  // `state` is derived from canStartDevelopment (see cellState above), so
  // the reason always explains the actual refusal. Kept to a fragment:
  // the cost is on the meta line right above it and the faculty line
  // above that already names the field, so the reason only has to say
  // which of the two is in the way, and by how much.
  const shortfall = t.cost - s.finance.cash;
  const blockedReason = state === 'blocked'
    ? shortfall > 0
      ? `$${Math.ceil(shortfall).toLocaleString()} short.`
      : missingFaculty
        ? `No free ${t.requiresFaculty} slot.`
        : undefined
    : undefined;

  return (
    <div
      className="course-cell-wrap"
      ref={wrapRef}
      onPointerEnter={placeTooltip}
      onPointerLeave={() => setPos(null)}
      onFocus={placeTooltip}
      onBlur={() => setPos(null)}
    >
      <button
        type="button"
        className={`course-cell ${state}${t.graduateProgram ? ' graduate' : ''}`}
        disabled={state !== 'available'}
        onClick={() => act({ type: 'START_DEVELOPMENT', nodeId: t.id })}
      >
        <span className="cell-code">
          <span className="cell-code-dept">{dept}</span>
          {num && <span className="cell-code-num">{num}</span>}
        </span>
        {showGateDot && <span className="cell-gate-dot" aria-hidden="true" />}
        {state === 'developing' && (
          <span className="cell-progress" aria-hidden="true">
            <span className="cell-progress-fill" style={{ width: `${Math.round(elapsed * 100)}%` }} />
          </span>
        )}
      </button>
      <div
        className="course-tooltip"
        role="tooltip"
        ref={tooltipRef}
        style={pos ? { position: 'fixed', top: pos.top, left: pos.left } : undefined}
      >
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
        {instructor && <div className="course-tooltip-instructor">Taught by: {instructor.name}</div>}
        <div className="course-tooltip-meta">
          ${t.cost.toLocaleString()} · {t.duration}w
          {state === 'developing' && ` · ${weeksLeft}w left`}
        </div>
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

// The one-line key under the panel head. It explains the four cell states
// and the faculty-gate dot in the same breath, so the two things the
// player would otherwise have to hover for — what a shade means, and why a
// cell won't start — are both answered on sight.
function CellLegend() {
  return (
    <p className="cell-legend">
      <span className="cell-legend-item"><span className="cell-legend-swatch done" />done</span>
      <span className="cell-legend-item"><span className="cell-legend-swatch developing" />developing</span>
      <span className="cell-legend-item"><span className="cell-legend-swatch available" />ready to start</span>
      <span className="cell-legend-item"><span className="cell-legend-swatch blocked" />blocked</span>
      <span className="cell-legend-item"><span className="cell-legend-dot" />no free faculty slot in its field — hire to start it</span>
    </p>
  );
}

// Completion of an arbitrary set of course ids. Used for the catalogue as
// a whole and for one school's own curriculum. Exported so anything else
// showing a school's completion (the campus map's building info popover)
// computes it the exact same way this tab's own rings do, rather than
// re-deriving the done/total logic a second time.
export function completion(s: GameState, ids: string[]): { done: number; total: number; fraction: number } {
  const done = ids.filter((id) => s.tech.find((t) => t.id === id)?.status === 'done').length;
  return { done, total: ids.length, fraction: ids.length > 0 ? done / ids.length : 0 };
}

export default function CurriculumTab({ s, act }: { s: GameState; act: (a: Action) => void }) {
  const revealedGrad = revealedGraduatePrograms(s);
  // The headline ring counts the undergraduate catalogue plus whatever
  // graduate work has been revealed — never the whole seed. A "0 / 421"
  // in year one would announce that thirty-seven courses exist somewhere
  // the player has no way to see, which is precisely what progressive
  // discovery is for.
  const courses = s.tech.filter(
    (t) => t.kind === 'course' && (!t.graduateProgram || revealedGrad.has(t.graduateProgram)),
  );
  const doneCourses = courses.filter((t) => t.status === 'done').length;
  const catalogFraction = courses.length > 0 ? doneCourses / courses.length : 0;
  const catalogPct = Math.round(catalogFraction * 100);

  const lookup = new Map(s.tech.map((t) => [t.id, t]));
  const genEdComplete = isGenEdComplete(s);
  const sections = buildSections(s, genEdComplete, revealedGrad);
  const [pool, ...schoolSections] = sections;

  // The curriculum alert badge (see types.ts's SeenState): every currently
  // visible course id this tab hasn't reported seeing yet. Marked the
  // moment the tab is open, and again whenever a fresh reveal (a school
  // built, gen-ed cleared) adds to the visible set while it stays open —
  // the dependency is the exact unseen id set, so this fires again on any
  // change to it, not just a change in count. That's what makes "already
  // had curriculum open when new courses unlocked" show no badge: the
  // toolbar and this tab agree the instant this runs.
  const unseenIds = visibleCourseIds(s).filter((id) => !s.seen.courseIds[id]);
  const unseenKey = unseenIds.join('|');
  useEffect(() => {
    if (unseenIds.length > 0) act({ type: 'MARK_SEEN', kind: 'course', ids: unseenIds });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unseenKey]);

  return (
    <div className="tab-content">
      <section className="panel curriculum-panel">
        <div className="panel-head">
          <span className="panel-head-title">
            <h2>The Curriculum</h2>
            {isTestUniversity(s.self.name) && (
              <button
                type="button"
                className="grant-funds-btn"
                onClick={() => act({ type: 'DEVELOP_ALL_AVAILABLE_COURSES' })}
                title="Playtest only — starts development on every course currently available, cash and faculty slots permitting. Same effect as clicking each one's own Develop button."
              >
                Develop All
              </button>
            )}
          </span>
          <span className="panel-head-figure">
            <span className="progress-figure">
              <ProgressRing
                fraction={catalogFraction}
                size={CATALOG_RING_SIZE}
                center={`${catalogPct}%`}
                title={`${doneCourses} of ${courses.length} courses developed`}
              />
              <span className="stat">{doneCourses} / {courses.length}<br />developed</span>
            </span>
            <HelpHint
              align="end"
              text={genEdComplete
                ? "Open to all incoming students — not yet organized by school. Complete a school's entry courses to raise its building."
                : 'The general-education core — every major waits on it. Complete it to unlock every major\'s entry course.'}
            />
          </span>
        </div>
        <CellLegend />
        {s.finance.cash < 0 && (
          <p className="stall-note">Cash is negative — the school is running an operating deficit, so nothing can be started until the balance recovers.</p>
        )}

        <div className="curriculum-scroll">
          {/* The pool carries no completion indicator of its own on
              purpose: a "x / 42" here would count the majors that exist
              before the player has met any of them. */}
          <div className="discovery-pool">
            <CellGrid s={s} act={act} ids={pool.courseIds} lookup={lookup} />
          </div>

          {schoolSections.map((section) => {
            const school = completion(s, section.schoolCourseIds);
            return (
              <div key={section.key} className="discovery-section">
                <div className="discovery-section-head">
                  <h3>{section.heading}</h3>
                  <span className="progress-figure">
                    <ProgressRing
                      fraction={school.fraction}
                      size={SECTION_RING_SIZE}
                      title={`${school.done} of ${school.total} ${section.label} courses developed`}
                    />
                    <span className="stat">{school.done} / {school.total}</span>
                  </span>
                </div>
                {section.courseIds.length > 0 && <CellGrid s={s} act={act} ids={section.courseIds} lookup={lookup} />}
                {section.subgroups.map((sub) => (
                  <div key={sub.key} className={`discovery-subgroup${sub.graduate ? ' graduate' : ''}`}>
                    <h4>
                      {sub.label}
                      {sub.graduate && <span className="subgroup-degree">{sub.graduate.degree}</span>}
                    </h4>
                    {sub.graduate && (
                      <p className="subgroup-note">Graduate · opened by {sub.graduate.gate}</p>
                    )}
                    <CellGrid s={s} act={act} ids={sub.courseIds} lookup={lookup} />
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
