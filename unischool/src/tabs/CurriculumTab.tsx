import { useCallback, useEffect, useState } from 'react';
import { facultyPay } from '../systems/finance/financeSystem';
import type { Action } from '../state/actions';
import type { Buildable, GameState } from '../state/types';
import { discoverySchools, graduatePrograms, programById, type ProgramInfo } from '../data/techData';
import { hallOf, isHoused, isInTransit } from '../systems/techtree/programOffers';
import { programOfCourse } from '../data/techData';
import { isSchoolFounded } from '../systems/techtree/schools';
import { schoolMark } from '../data/schoolPalette';
import { canPostSearch, searchCost, searchWeeksLeft } from '../systems/faculty/facultySearch';
import {
  canStartDevelopment, facultyGate, eligibleInstructors, assignedInstructor,
  isUnstaffed, facultyLoad, hallOfCourse, canSwapInstructors, effectiveCourseSlots, neededFacultyFields,
} from '../systems/techtree/techSystem';
import { hallDisplayName } from '../systems/techtree/schools';
import { milestoneLine, programProgress, tierBands, unmetPrereqNames, type ProgramProgress } from '../systems/techtree/programProgress';
import { SEATS_PER_COURSE } from '../systems/techtree/instructionCapacity';
import { facultyQualityTier } from '../data/facultyData';
import { gradeFor, qualityOf, tierOf, type Grade } from '../data/courseQuality';
import {
  averageCourseQuality, courseQuality, facultyLoads, projectedQuality, type FacultyLoads,
} from '../systems/faculty/facultyAssignment';
import HelpHint from '../components/HelpHint';
import FacultyPortrait, { portraitOf } from '../components/FacultyPortrait';
import { ProgressRing } from '../components/Progress';
import type { Faculty } from '../state/types';
import { money, moneyShort, surnameOf } from '../format';

// Progressive discovery: what the tab shows is derived from existing
// unlock/milestone state, with no gating of its own.
//   - Programs are founded from an academic hall on the map (see
//     programOffers.ts and BuildingInfoPanel.tsx); this tab shows only
//     programs that have a home.
//   - A school forms a section once one of its programs is housed, drawn one
//     row per program (nine cells in tier order, unrevealed ones empty),
//     under the school's color and mark, and its name once founded.
//   - A major whose tier-2 quartet is complete (`program-established:<prefix>`)
//     becomes its own sub-group and reveals its tier-3s.
//   - A housed graduate program appears as a sub-group of its home school.
// A revealed course is never hidden again; "locked" means revealed but
// blocked (a faculty gate or cross-major prereq), never "undiscovered".

// The catalog's own completion is the panel's headline figure.
const CATALOG_RING_SIZE = 46;

// A sub-group inside a school section: a completed major or a revealed
// graduate program (`graduate` carries its degree and the gate it cleared).
export interface DiscoverySubgroup {
  key: string;
  label: string;
  courseIds: string[];
  graduate?: { degree: string; gate: string };
}

export interface DiscoverySection {
  key: string;
  label: string;
  // "School of {label}", or the donor's display text verbatim once naming
  // rights are sold (eventData.ts's 'naming-rights').
  heading: string;
  courseIds: string[];
  subgroups: DiscoverySubgroup[];
  // Every course id this school will ever own, revealed or not: the
  // denominator of the section's completion ring.
  schoolCourseIds: string[];
}

// Graduate programs revealed on this tab: those that are housed, the same
// rule an undergraduate major follows.
function revealedGraduatePrograms(s: GameState): Set<string> {
  const revealed = new Set<string>();
  for (const program of graduatePrograms()) {
    if (isHoused(s, program.id)) revealed.add(program.id);
  }
  return revealed;
}

function buildSections(s: GameState, revealedGrad: Set<string>): DiscoverySection[] {
  const sections: DiscoverySection[] = [];

  for (const school of discoverySchools()) {
    // A school appears once one of its programs is housed; unfounded majors
    // are founded from the hall panel, not here.
    const housedMajors = school.majors.filter((major) => isHoused(s, major.prefix));
    if (housedMajors.length === 0) continue;

    const sharedIds: string[] = [];
    const subgroups: DiscoverySubgroup[] = [];
    for (const major of housedMajors) {
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
    // Graduate programs come last in the section, where they sit in the climb.
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

    // A school's name is revealed on founding (six programs housed in one
    // hall); until then it shows only its color and mark. A hall with a
    // `donorSurname` carries donor text as its `name`, used verbatim.
    const founded = isSchoolFounded(s, school.name);
    const mark = schoolMark(school.name);
    const namedHall = founded
      ? housedMajors
        .map((major) => hallOf(s, major.prefix))
        .map((hallId) => (hallId ? s.tech.find((t) => t.id === hallId) : undefined))
        .find((hall) => hall?.donorSurname)
      : undefined;
    sections.push({
      key: school.name,
      label: founded ? school.name : `${mark.motif} unfounded school`,
      heading: namedHall ? namedHall.name : founded ? `School of ${school.name}` : `${mark.motif} An unfounded school`,
      courseIds: sharedIds,
      subgroups,
      // Graduate programs count toward the ring only once revealed, so the
      // ring never hints at programs the player cannot know about yet.
      schoolCourseIds: [...school.majors.flatMap((m) => [m.tier1Id, ...m.tier2Ids, ...m.tier3Ids]), ...gradIds],
    });
  }

  // There is no ungrouped pool: a course appears only once its program has a home.
  return sections;
}

// The section list, for callers outside this tab such as the campus map's
// building popover. Each section's `key` is the school's name.
export function discoverySections(s: GameState): DiscoverySection[] {
  const revealedGrad = revealedGraduatePrograms(s);
  return buildSections(s, revealedGrad);
}

// Every course id rendered on this tab, whatever its status: the curriculum
// alert badge's definition of "visible" (see types.ts's SeenState). A course
// counts as new the moment its cell appears.
export function visibleCourseIds(s: GameState): string[] {
  const ids: string[] = [];
  for (const section of discoverySections(s)) {
    ids.push(...section.courseIds);
    for (const sub of section.subgroups) ids.push(...sub.courseIds);
  }
  return ids;
}

// Schools and program rows: a regrouping of the same revealed set, never a
// second set of reveal rules. The fixed 1/4/4 tier shape is carried by
// position (three bands per row) rather than by drawn prereq edges; only
// cross-major bridges are called out, on demand.
interface ProgramRow {
  program: ProgramInfo;
  revealed: Set<string>; // courses shown as cells; the rest are placeholders
}

interface SchoolGroup {
  key: string;      // the school's name
  heading: string;  // the section heading: the name once founded, the mark alone before
  founded: boolean;
  mark: { hue: string; motif: string };
  rows: ProgramRow[];
}

function schoolGroups(s: GameState, sections: DiscoverySection[]): SchoolGroup[] {
  const schools = new Map(discoverySchools().map((school) => [school.name, school]));
  const groups: SchoolGroup[] = [];
  for (const section of sections) {
    const school = schools.get(section.key);
    if (!school) continue;
    const revealed = new Set<string>([...section.courseIds, ...section.subgroups.flatMap((g) => g.courseIds)]);
    const rows: ProgramRow[] = [];
    for (const major of school.majors) {
      if (!isHoused(s, major.prefix)) continue;
      const program = programById(major.prefix);
      if (program) rows.push({ program, revealed });
    }
    // Graduate programs come last inside a school.
    for (const grad of school.graduate) {
      const program = programById(grad.id);
      if (program && isHoused(s, grad.id)) rows.push({ program, revealed });
    }
    if (rows.length === 0) continue;
    groups.push({
      key: section.key,
      heading: section.heading,
      founded: isSchoolFounded(s, section.key),
      mark: schoolMark(section.key),
      rows,
    });
  }
  return groups;
}

// Which school each course belongs to (static catalog, memoized).
let courseSchoolMap: Map<string, { key: string; school: string }> | null = null;
function courseSchools(): Map<string, { key: string; school: string }> {
  if (courseSchoolMap) return courseSchoolMap;
  const map = new Map<string, { key: string; school: string }>();
  for (const school of discoverySchools()) {
    const entry = { key: school.name, school: school.name };
    for (const major of school.majors) {
      for (const id of [major.tier1Id, ...major.tier2Ids, ...major.tier3Ids]) map.set(id, entry);
    }
    for (const program of school.graduate) {
      for (const id of program.courseIds) map.set(id, entry);
    }
  }
  courseSchoolMap = map;
  return map;
}

// The cross-major prereqs of a course: prereqs that are themselves courses
// from a different major. The kind check matters: tier-3 courses require
// their major's lab (e.g. LAB-CHEN for CHEN230), which a prefix test alone
// would call a cross-listed course.
function crossMajorPrereqs(t: Buildable, lookup: Map<string, Buildable>): string[] {
  const prefix = t.id.replace(/[0-9]+$/, '');
  return t.prereqs.filter((id) => {
    if (lookup.get(id)?.kind !== 'course') return false;
    return id.replace(/[0-9]+$/, '') !== prefix;
  });
}

type CellState = 'locked' | 'blocked' | 'available' | 'developing' | 'done';

function cellState(s: GameState, t: Buildable): CellState {
  if (t.status === 'done') return 'done';
  if (t.status === 'developing') return 'developing';
  if (t.status === 'locked') return 'locked';
  return canStartDevelopment(s, t) ? 'available' : 'blocked';
}

// The grade chip, for a course's own grade and for aggregates alike. The
// letter always shows; the tint is only a cue (color-blind players, small sizes).
export function GradeChip({ grade, title, size = 'sm' }: { grade: Grade; title?: string; size?: 'sm' | 'lg' }) {
  return (
    <span className={`grade-chip grade-${grade.toLowerCase()} ${size}`} title={title}>
      {grade}
    </span>
  );
}

// An aggregate grade across a set of courses, or nothing when none are graded.
function AggregateGrade({ s, ids, label, loads }: { s: GameState; ids: string[]; label: string; loads: FacultyLoads }) {
  const avg = averageCourseQuality(s, ids, loads);
  if (avg === null) return null;
  return <GradeChip grade={gradeFor(avg)} title={`${label} averages ${Math.round(avg)} / 100 across its developed courses`} />;
}

// One course cell: code over title, filled when done, with a progress bar
// while developing. Clicking opens the course drawer; there is deliberately
// no hover card. The cell shows only what must read at a glance: state,
// progress, an unstaffed marker, and a neutral gate dot (not the field's
// initial, which would hint at school membership).
//
// Developed courses carry an instructor chip that drags onto another course
// to swap instructors, previewing both grades. An illegal drop (see
// techSystem.ts's canSwapInstructors) is a no-op.
export interface DragState {
  courseId: string;   // the course whose chip is being dragged
  facultyId: string;  // who is on it
}
export interface DragHandlers {
  drag: DragState | null;
  over: string | null; // the course the chip is currently held over
  onDragStart: (courseId: string, facultyId: string) => void;
  onDragOver: (courseId: string) => void;
  onDragEnd: () => void;
  onDrop: (courseId: string) => void;
}

function InstructorChip({ f, grade, draggable, onDragStart, onDragEnd }: {
  f: Faculty; grade: Grade | null; draggable: boolean;
  onDragStart?: (e: React.DragEvent) => void; onDragEnd?: () => void;
}) {
  return (
    <span
      className={`instructor-chip${draggable ? ' draggable' : ''}`}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      title={`${f.name}${draggable ? ' — drag onto another course in this department to swap' : ''}`}
    >
      <FacultyPortrait f={portraitOf(f)} size={18} />
      <span className="instructor-chip-name">{surnameOf(f.name)}</span>
      {grade && <span className={`instructor-chip-grade grade-${grade.toLowerCase()}`}>{grade}</span>}
    </span>
  );
}

export function CourseCell({ s, t, selected, onSelect, loads, dnd }: {
  s: GameState; t: Buildable; selected: boolean; onSelect: (id: string) => void; loads: FacultyLoads;
  // Only inside the rows; the worklist's cells carry none.
  dnd?: DragHandlers;
}) {
  const state = cellState(s, t);
  const [code, titleFromName] = t.name.split(' · ');
  const title = titleFromName ?? code;
  // "Would waiting help", not just "is the field full" (techSystem.ts's facultyGate).
  const gate = t.requiresFaculty ? facultyGate(s, t.requiresFaculty) : 'open';
  // An offered course whose instructor has left (types.ts's CourseFaculty).
  const unstaffed = isUnstaffed(s, t);
  // Only an offered, staffed course has a grade (see courseQuality).
  const quality = courseQuality(s, t, loads);
  const instructor = assignedInstructor(s, t);
  // The gate matters only for a course not yet started.
  const showGateDot = gate !== 'open' && state !== 'developing' && state !== 'done';

  const weeksLeft = s.developing[t.id] ?? 0;
  const elapsed = t.duration > 0 ? (t.duration - weeksLeft) / t.duration : 1;
  // For a course still ahead: its cost and the strongest free teacher with
  // the grade they would earn.
  const ahead = state === 'available' || state === 'blocked';
  const best = ahead && t.requiresFaculty ? eligibleInstructors(s, t)[0] : undefined;
  const bestGrade = best ? projectedQuality(s, t, best, loads).grade : null;
  // A program between halls is not taught or advancing.
  const programId = programOfCourse(t.id);
  const transit = programId !== undefined && isInTransit(s, programId);

  // Swap preview: while a chip is over a legal target, both cells show their
  // would-be grade. Derived from the drag state, not stored.
  const dragging = dnd?.drag ?? null;
  const isSource = dragging?.courseId === t.id;
  const isTarget = !!dragging && dnd?.over === t.id && !isSource;
  const legalTarget = !!dragging && !isSource && canSwapInstructors(s, dragging.courseId, t.id);
  let preview: { grade: Grade; delta: number } | null = null;
  if (dragging && instructor && (isTarget || (isSource && dnd?.over))) {
    const otherId = isSource ? dnd!.over! : dragging.courseId;
    const other = s.tech.find((x) => x.id === otherId);
    const incoming = other ? assignedInstructor(s, other) : undefined;
    if (other && incoming && canSwapInstructors(s, dragging.courseId, isSource ? otherId : t.id)) {
      const projected = projectedQuality(s, t, incoming, loads);
      preview = { grade: projected.grade, delta: projected.score - (quality?.score ?? 0) };
    }
  }

  return (
    <button
      type="button"
      id={`course-${t.id}`}
      className={`course-cell ${state}${t.graduateProgram ? ' graduate' : ''}${unstaffed ? ' unstaffed' : ''}${transit ? ' transit' : ''}${selected ? ' selected' : ''}${isSource ? ' drag-source' : ''}${legalTarget ? ' drop-target' : ''}${isTarget && legalTarget ? ' drop-over' : ''}`}
      aria-pressed={selected}
      onClick={() => onSelect(t.id)}
      onDragOver={dnd && legalTarget ? (e) => { e.preventDefault(); if (dnd.over !== t.id) dnd.onDragOver(t.id); } : undefined}
      onDrop={dnd && legalTarget ? (e) => { e.preventDefault(); dnd.onDrop(t.id); } : undefined}
    >
      <span className="cell-code">{code}</span>
      <span className="cell-title" title={title}>{title}</span>
      {ahead && (
        <span className="cell-next">
          {moneyShort(t.cost)}
          {best
            ? <> · {surnameOf(best.name)} <span className={`instructor-chip-grade grade-${bestGrade!.toLowerCase()}`}>{bestGrade}</span></>
            : t.requiresFaculty ? ' · no free slot' : ''}
        </span>
      )}
      {/* The chip replaces the done-tick on a staffed course. */}
      {instructor && (state === 'developing' || state === 'done') && (
        <InstructorChip
          f={instructor}
          grade={quality?.grade ?? null}
          draggable={!!dnd && !transit}
          onDragStart={dnd ? (e) => { e.dataTransfer.setData('text/plain', t.id); e.dataTransfer.effectAllowed = 'move'; dnd.onDragStart(t.id, instructor.id); } : undefined}
          onDragEnd={dnd ? dnd.onDragEnd : undefined}
        />
      )}
      {preview && (
        <span className={`swap-preview${preview.delta > 0 ? ' up' : preview.delta < 0 ? ' down' : ''}`} aria-live="polite">
          → {preview.grade} ({preview.delta > 0 ? '+' : ''}{Math.round(preview.delta)})
        </span>
      )}
      {state === 'done' && !instructor && !unstaffed && <span className="cell-stamp" aria-hidden="true">✓</span>}
      {unstaffed && <span className="cell-stamp unstaffed" title="No instructor">!</span>}
      {transit && !unstaffed && <span className="cell-stamp transit" title="Its program is moving halls — dark until it settles">⇄</span>}
      {/* Yellow: one appointment away. Red: nobody to appoint, only time fixes it. */}
      {showGateDot && (
        <span
          className={`cell-gate-dot ${gate}`}
          aria-hidden="true"
          title={gate === 'hireable'
            ? `No free ${t.requiresFaculty} slot — a candidate is on the market`
            : `No free ${t.requiresFaculty} slot, and nobody on the market`}
        />
      )}
      {state === 'developing' && (
        <span className="cell-progress" aria-hidden="true">
          <span className="cell-progress-fill" style={{ width: `${Math.round(elapsed * 100)}%` }} />
        </span>
      )}
    </button>
  );
}

// The course drawer: facts, the itemized grade, prereqs as links, and the
// choice of instructor, which is stored (types.ts's CourseFaculty) and
// editable for the life of the course. Cases: several eligible (choose),
// exactly one (pre-selected), department full (list who and their loads),
// nobody in the field (hire here from the market, or say it is empty).

// One selectable person, styled like the Faculty tab's roster card, plus
// teaching and current load.
export function InstructorOption(
  { s, f, selected, disabled = false, projectedFor, onPick }:
  { s: GameState; f: Faculty; selected: boolean; disabled?: boolean; projectedFor?: Buildable; onPick?: () => void },
) {
  const load = facultyLoad(s, f.id);
  // The grade this course would get with them. The load used is what theirs
  // would become (current plus this course, unless they already teach it).
  const projected = projectedFor
    ? qualityOf({
      teaching: f.teaching,
      acclaim: f.acclaim,
      load: s.courseFaculty[projectedFor.id] === f.id ? load : load + 1,
      slots: f.courseSlots,
      tier: tierOf(projectedFor.id),
    })
    : null;
  return (
    <button
      type="button"
      className={`instructor-option${selected ? ' selected' : ''}${disabled ? ' full' : ''}`}
      disabled={disabled}
      aria-pressed={selected}
      onClick={onPick}
    >
      <FacultyPortrait f={portraitOf(f)} size={34} />
      <span className="instructor-option-body">
        <span className="instructor-option-name">{f.name}</span>
        <span className="instructor-option-meta">
          {facultyQualityTier(f)} · {f.field}
        </span>
        <span className="instructor-option-bars">
          <span className="instructor-stat" title={`Teaching ${f.teaching} of a possible ${f.teachingPotential}`}>
            <span className="instructor-stat-label">Teaching</span>
            <span className="instructor-bar-track">
              <span className="instructor-bar-headroom" style={{ width: `${f.teachingPotential}%` }} />
              <span className="instructor-bar-fill" style={{ width: `${f.teaching}%` }} />
            </span>
            <span className="instructor-stat-value">{f.teaching}</span>
          </span>
        </span>
      </span>
      <span className="instructor-option-right">
        {projected && (
          <GradeChip
            grade={projected.grade}
            title={`This course would be graded ${projected.grade} (${Math.round(projected.score)} / 100) with them`}
          />
        )}
        <span className={`instructor-option-load${load >= f.courseSlots ? ' full' : ''}`}>
          {load} / {f.courseSlots}
          <span className="instructor-load-label">courses</span>
        </span>
      </span>
    </button>
  );
}

// The search offer, where a shortage is felt (see facultySearch.ts). Shared
// with the hall panel's course strip and the Faculty board.
export function SearchOffer({ s, act, field }: { s: GameState; act: (a: Action) => void; field: string }) {
  const left = searchWeeksLeft(s, field);
  if (left > 0) {
    return (
      <p className="course-drawer-note search-running">
        A {field} search is running — {left} week{left === 1 ? '' : 's'} left. Every week it may turn somebody up.
      </p>
    );
  }
  const cost = searchCost(s);
  return (
    <button
      type="button"
      className="course-drawer-action search-post"
      disabled={!canPostSearch(s, field)}
      onClick={() => act({ type: 'POST_SEARCH', field })}
      title={`Advertise, headhunt and visit conferences for ${SEARCH_WEEKS_LABEL}: a much better chance every week that a ${field} candidate is listed.`}
    >
      Post a search in {field} · {money(cost)}
    </button>
  );
}
const SEARCH_WEEKS_LABEL = 'half a year';

// Every candidate listed in a field, with Appoint buttons and the search
// offer. Shared by the drawer and the hall panel's course strip and picker.
export function MarketInField({ s, act, field, projectedFor }: {
  s: GameState; act: (a: Action) => void; field: string; projectedFor?: Buildable;
}) {
  const listed = s.candidates.filter((c) => c.field === field).sort((a, b) => b.teaching - a.teaching);
  return (
    <div className="course-drawer-hire">
      <h5>On the market in {field}</h5>
      {listed.length === 0 ? (
        <p className="course-drawer-note quiet">
          No {field} candidates are listed this week. The market turns over constantly — or pay for a search.
        </p>
      ) : (
        listed.map((c) => (
          <div key={c.id} className="course-drawer-candidate">
            <InstructorOption s={s} f={c} selected={false} projectedFor={projectedFor} />
            <button
              type="button"
              className="course-drawer-appoint"
              onClick={() => act({ type: 'HIRE_FACULTY', facultyId: c.id })}
              title={`Appoint ${c.name} to the ${field} department; asks ${money(c.salary)}, paid ${money(Math.round(facultyPay(s, c.salary)))} at the market rate`}
            >
              {/* No cash gate: an appointment costs nothing up front, here
                  as on every other Appoint; what it costs is the salary,
                  shown as this college pays it. */}
              Appoint · {money(Math.round(facultyPay(s, c.salary)))}/yr
            </button>
          </div>
        ))
      )}
      <SearchOffer s={s} act={act} field={field} />
    </div>
  );
}

function CourseDrawer(
  { s, act, t, lookup, onClose, loads, onGoToCourse, onOpenFaculty }:
  {
    s: GameState; act: (a: Action) => void; t: Buildable; lookup: Map<string, Buildable>;
    onClose: () => void; loads: FacultyLoads; onGoToCourse: (id: string) => void;
    onOpenFaculty?: (field: string) => void;
  },
) {
  const state = cellState(s, t);
  const offered = t.status === 'developing' || t.status === 'done';
  const instructor = assignedInstructor(s, t);
  const unstaffed = isUnstaffed(s, t);
  const quality = courseQuality(s, t, loads);
  const bridges = crossMajorPrereqs(t, lookup);

  // An offered course's current instructor stays eligible for it (see
  // eligibleInstructors' `except`), even when full.
  const eligible = eligibleInstructors(s, t, offered ? t.id : undefined);
  const inField = t.requiresFaculty ? s.faculty.filter((f) => f.field === t.requiresFaculty) : [];

  // The pick resets with the course and defaults to the current instructor
  // or the strongest eligible, so the one-candidate case is a single click.
  const [picked, setPicked] = useState<string | null>(null);
  useEffect(() => { setPicked(null); }, [t.id]);
  const chosen = picked ?? instructor?.id ?? eligible[0]?.id ?? null;

  const [code, titleFromName] = t.name.split(' · ');
  const title = titleFromName ?? code;
  const weeksLeft = s.developing[t.id] ?? 0;
  const shortfall = t.cost - s.finance.cash;

  function develop() {
    if (chosen) act({ type: 'START_DEVELOPMENT', nodeId: t.id, facultyId: chosen });
  }
  function reassign() {
    if (chosen && chosen !== instructor?.id) act({ type: 'REASSIGN_COURSE_FACULTY', courseId: t.id, facultyId: chosen });
  }

  return (
    <aside className="course-drawer" aria-label={`${title} detail`}>
      <div className="course-drawer-head">
        <div>
          <span className="course-drawer-code">{code}</span>
          <h3>{title}</h3>
        </div>
        <button type="button" className="course-drawer-close" onClick={onClose} aria-label="Close course detail">✕</button>
      </div>

      <div className="course-drawer-body">
        <p className="course-drawer-desc">{t.description}</p>

        <dl className="course-drawer-facts">
          <div><dt>Cost</dt><dd>{money(t.cost)}</dd></div>
          <div><dt>Duration</dt><dd>{t.duration} weeks</dd></div>
          <div><dt>Department</dt><dd>{t.requiresFaculty ?? '—'}</dd></div>
          {(() => {
            const hallId = hallOfCourse(s, t.id);
            const hall = hallId ? lookup.get(hallId) : undefined;
            return hall ? <div><dt>Housed in</dt><dd>{hall.name}</dd></div> : null;
          })()}
          {state === 'developing' && <div><dt>Remaining</dt><dd>{weeksLeft} weeks</dd></div>}
        </dl>

        {/* The grade itemized, so the player sees what to change. */}
        {quality && (
          <section className="course-drawer-section">
            <h4>Quality</h4>
            <div className="course-drawer-grade">
              <GradeChip grade={quality.grade} size="lg" />
              <div className="course-drawer-grade-body">
                <span className="course-drawer-grade-score">{Math.round(quality.score)} / 100</span>
                <ul className="course-drawer-factors">
                  {quality.factors.map((factor) => (
                    <li key={factor.label} className={factor.value < 0 ? 'down' : 'up'}>
                      <span>{factor.label}</span>
                      <span className="num">{factor.value > 0 ? '+' : '−'}{Math.abs(Math.round(factor.value))}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        )}

        {t.prereqs.length > 0 && (
          <section className="course-drawer-section">
            <h4>Prerequisites</h4>
            {/* Each prereq links to its course (opens its school, selects it,
                clears filters). Cross-major bridges are marked. */}
            <ul className="course-drawer-prereqs">
              {t.prereqs.map((id) => {
                const p = lookup.get(id);
                const met = p?.status === 'done';
                const bridge = bridges.includes(id);
                // Only a course is somewhere to go; other prereqs (a lab) are built.
                if (p?.kind !== 'course') {
                  return (
                    <li key={id} className={met ? 'met' : 'unmet'}>
                      <span className="prereq-static">
                        {met ? '✓' : '✗'} {p?.name ?? id}
                        <span className="prereq-bridge" title="Built on the campus map, not developed here">build</span>
                      </span>
                    </li>
                  );
                }
                return (
                  <li key={id} className={met ? 'met' : 'unmet'}>
                    <button type="button" className="prereq-link" onClick={() => onGoToCourse(id)}>
                      {met ? '✓' : '✗'} {p.name}
                      {bridge && <span className="prereq-bridge" title="A prerequisite from another program">cross-listed</span>}
                      <span className="prereq-go" aria-hidden="true">→</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {t.requiresFaculty && (
          <section className="course-drawer-section">
            <h4>{offered ? 'Instructor' : 'Choose an instructor'}</h4>

            {unstaffed && (
              <p className="course-drawer-warning">
                This course has no instructor and is not being taught. Assign someone to restore it.
              </p>
            )}

            {/* Cases 1 and 2: somebody can take it. */}
            {eligible.length > 0 && (
              <>
                <div className="instructor-options">
                  {eligible.map((f) => (
                    <InstructorOption
                      key={f.id}
                      s={s}
                      f={f}
                      selected={chosen === f.id}
                      projectedFor={t}
                      onPick={() => setPicked(f.id)}
                    />
                  ))}
                </div>

                {state === 'available' && (
                  <button type="button" className="course-drawer-action" disabled={!chosen || !canStartDevelopment(s, t, chosen)} onClick={develop}>
                    {chosen
                      ? `Develop with ${eligible.find((f) => f.id === chosen)?.name ?? 'selected faculty'}`
                      : 'Develop'}
                  </button>
                )}
                {offered && (
                  <button type="button" className="course-drawer-action" disabled={!chosen || chosen === instructor?.id} onClick={reassign}>
                    {chosen && chosen !== instructor?.id ? 'Move this course to them' : 'Currently assigned'}
                  </button>
                )}
              </>
            )}

            {/* Case 3: everyone in the department is full; name them and their loads. */}
            {eligible.length === 0 && inField.length > 0 && (
              <>
                <p className="course-drawer-note">
                  Every {t.requiresFaculty} professor is at capacity. Free a slot by moving one of their
                  courses, or appoint someone new.
                </p>
                <div className="instructor-options">
                  {inField.map((f) => <InstructorOption key={f.id} s={s} f={f} selected={false} disabled />)}
                </div>
              </>
            )}

            {/* Case 4: nobody in the department at all. */}
            {eligible.length === 0 && inField.length === 0 && (
              <p className="course-drawer-note">
                The college has no {t.requiresFaculty} faculty. Appoint someone to open this course.
              </p>
            )}

            {/* Hiring from the course: the whole answer when nobody can take
                it, otherwise tucked behind "appoint someone new". */}
            {eligible.length === 0
              ? (
                <>
                  <MarketInField s={s} act={act} field={t.requiresFaculty} projectedFor={t} />
                  {onOpenFaculty && (
                    <button type="button" className="course-drawer-door" onClick={() => onOpenFaculty(t.requiresFaculty!)}>
                      Open the {t.requiresFaculty} department →
                    </button>
                  )}
                </>
              )
              : (
                <details className="course-drawer-more">
                  <summary>Appoint someone new in {t.requiresFaculty}</summary>
                  <MarketInField s={s} act={act} field={t.requiresFaculty} projectedFor={t} />
                </details>
              )}
          </section>
        )}

        {state === 'blocked' && shortfall > 0 && (
          <p className="course-drawer-warning">{money(Math.ceil(shortfall))} short of the development cost.</p>
        )}
        {state === 'locked' && (
          <p className="course-drawer-note quiet">Locked until its prerequisites are complete.</p>
        )}
        {(() => {
          const programId = programOfCourse(t.id);
          return programId !== undefined && isInTransit(s, programId)
            ? <p className="course-drawer-warning">Its program is moving halls: not taught, not advancing, and counting toward nothing until it settles.</p>
            : null;
        })()}
      </div>
    </aside>
  );
}

// The row's own action: the next start (course, strongest eligible teacher,
// projected grade, cost) with a Develop button, "choose…" for the drawer,
// and what the start is worth toward the next milestone. When several
// courses in the same tier band are ready and the teacher has the slots, a
// batch button starts them all with grades previewed as the load climbs.
// Each start is its own START_DEVELOPMENT, so one that becomes illegal
// mid-batch is refused.
function RowAction({ s, act, program, progress, lookup, loads, onSelect }: {
  s: GameState; act: (a: Action) => void; program: ProgramInfo; progress: ProgramProgress;
  lookup: Map<string, Buildable>; loads: FacultyLoads; onSelect: (id: string) => void;
}) {
  const next = progress.next;
  const worth = (
    <span className="row-action-worth">
      {milestoneLine(progress)}
      {progress.toMilestone > 0 && <> · +{SEATS_PER_COURSE} seats</>}
    </span>
  );

  if (progress.inTransit) {
    return <p className="row-action"><span className="row-action-note">Moving halls — nothing can start until it settles.</span></p>;
  }
  if (!next) {
    const developing = program.courseIds.map((id) => lookup.get(id)).filter((t) => t?.status === 'developing') as Buildable[];
    const soonest = developing.length > 0 ? Math.min(...developing.map((t) => s.developing[t.id] ?? 0)) : null;
    const needs = progress.waiting ? unmetPrereqNames(s, progress.waiting, lookup) : [];
    return (
      <p className="row-action">
        <span className="row-action-note">
          {soonest !== null && `${developing.length} in development · next finishes in ${soonest} wk. `}
          {progress.waiting
            ? <><span className="cell-code">{progress.waiting.name.split(' · ')[0]}</span> needs {needs.length > 0 ? needs.join(', ') : 'its prerequisites'}.</>
            : soonest === null ? 'Every course is developed.' : null}
        </span>
        {worth}
      </p>
    );
  }

  const [code, titleFromName] = next.name.split(' · ');
  const eligible = eligibleInstructors(s, next);
  const best = eligible[0];
  const shortfall = next.cost - s.finance.cash;

  if (!best) {
    const gate = next.requiresFaculty ? facultyGate(s, next.requiresFaculty) : 'open';
    return (
      <p className="row-action">
        <span className="row-action-note">
          Next <span className="cell-code">{code}</span> {titleFromName ?? code} — no free {next.requiresFaculty} slot
          {gate === 'hireable' ? ', and a candidate is listed.' : ', and nobody is on the market.'}
        </span>
        <button type="button" className="row-action-secondary" onClick={() => onSelect(next.id)}>
          {gate === 'hireable' ? 'Appoint…' : 'Open…'}
        </button>
        {worth}
      </p>
    );
  }

  const projected = projectedQuality(s, next, best, loads);
  const canStart = canStartDevelopment(s, next, best.id);

  // The batch: other ready courses in the same band, up to the teacher's free slots.
  const bands = tierBands(program);
  const band = bands ? [bands.tier2, bands.tier3].find((ids) => ids.includes(next.id)) : undefined;
  const ready = (band ?? []).map((id) => lookup.get(id)).filter((t): t is Buildable => !!t && t.status === 'available');
  const free = Math.max(0, effectiveCourseSlots(s, best) - (loads.get(best.id) ?? 0));
  const batch = ready.slice(0, free);
  const batchCost = batch.reduce((sum, t) => sum + t.cost, 0);
  const batchOk = batch.length >= 2 && batchCost <= s.finance.cash;
  const batchGrades = batch.map((t, i) => qualityOf({
    teaching: best.teaching, acclaim: best.acclaim,
    load: (loads.get(best.id) ?? 0) + i + 1, slots: best.courseSlots, tier: tierOf(t.id),
  }).grade);

  return (
    <p className="row-action">
      <button
        type="button"
        className="row-action-develop"
        disabled={!canStart}
        title={canStart
          ? `Start ${next.name} with ${best.name}: ${next.duration} weeks, ${money(next.cost)}`
          : shortfall > 0 ? `${money(Math.ceil(shortfall))} short of the development cost` : 'Cannot start this course right now'}
        onClick={() => act({ type: 'START_DEVELOPMENT', nodeId: next.id, facultyId: best.id })}
      >
        Develop <span className="cell-code">{code}</span> with {surnameOf(best.name)}
        <GradeChip grade={projected.grade} title={`${next.name} would be graded ${projected.grade} with ${best.name}`} />
      </button>
      <span className="row-action-cost">{moneyShort(next.cost)} · {next.duration} wk{shortfall > 0 ? ` · ${moneyShort(shortfall)} short` : ''}</span>
      <button type="button" className="row-action-secondary" onClick={() => onSelect(next.id)} title="Choose a different instructor, or read the course">choose…</button>
      {batchOk && (
        <button
          type="button"
          className="row-action-secondary batch"
          title={`Start all ${batch.length} with ${best.name}: ${money(batchCost)} — grades ${batchGrades.join(' ')} as their load climbs`}
          onClick={() => { for (const t of batch) act({ type: 'START_DEVELOPMENT', nodeId: t.id, facultyId: best.id }); }}
        >
          all {batch.length} with {surnameOf(best.name)} → {batchGrades.join(' ')}
        </button>
      )}
      {worth}
    </p>
  );
}

function ProgramRowView(
  { s, act, row, lookup, selectedId, onSelect, loads, dnd }:
  {
    s: GameState; act: (a: Action) => void; row: ProgramRow; lookup: Map<string, Buildable>;
    selectedId: string | null; onSelect: (id: string) => void; loads: FacultyLoads; dnd: DragHandlers;
  },
) {
  const { program } = row;
  const avg = averageCourseQuality(s, program.courseIds, loads);
  const progress = programProgress(s, program, lookup);
  const graduate = program.kind === 'graduate';
  const grad = graduate ? graduatePrograms().find((g) => g.id === program.id) : undefined;
  const hallId = hallOfCourse(s, program.entryCourseId);
  const hall = hallId ? lookup.get(hallId) : undefined;

  return (
    <section className={`program-row${graduate ? ' graduate' : ''}`} data-program={program.id}>
      <header className="program-row-head">
        <h4>{program.name}</h4>
        {grad && <span className="subgroup-degree">{grad.degree}</span>}
        {avg !== null && <GradeChip grade={gradeFor(avg)} title={`${program.name} averages ${Math.round(avg)} / 100`} />}
        {hall && <span className="program-row-hall" title="Where it is housed">{hallDisplayName(s, hall)}</span>}
        <span className="lane-count">{progress.done} / {progress.total}</span>
      </header>
      <RowAction s={s} act={act} program={program} progress={progress} lookup={lookup} loads={loads} onSelect={onSelect} />
      <div className={`program-row-cells${graduate ? ' graduate' : ''}`} style={graduate ? { gridTemplateColumns: `repeat(${program.courseIds.length}, minmax(0, 1fr))` } : undefined}>
        {program.courseIds.map((id, i) => {
          const t = lookup.get(id);
          // The rules between tier bands are their own grid tracks, so all
          // nine cells stay the same width.
          const rule = !graduate && (i === 1 || i === 5) ? <span key={`rule-${i}`} className="tier-rule" aria-hidden="true" /> : null;
          const cell = !t || !row.revealed.has(id)
            ? <span key={id} className="course-cell placeholder" aria-hidden="true" />
            : <CourseCell key={id} s={s} t={t} selected={selectedId === id} onSelect={onSelect} loads={loads} dnd={dnd} />;
          return rule ? [rule, cell] : cell;
        })}
      </div>
    </section>
  );
}

// A school's group: heading (name once founded, color and mark before; see
// data/schoolPalette.ts), grade and rows.
function SchoolGroupView(
  { s, act, group, lookup, selectedId, onSelect, loads, dnd }:
  {
    s: GameState; act: (a: Action) => void; group: SchoolGroup; lookup: Map<string, Buildable>;
    selectedId: string | null; onSelect: (id: string) => void; loads: FacultyLoads; dnd: DragHandlers;
  },
) {
  const ids = group.rows.flatMap((row) => row.program.courseIds);
  const avg = averageCourseQuality(s, ids, loads);
  const done = completion(s, ids);
  return (
    <section
      className={`school-group${group.founded ? ' founded' : ' unfounded'}`}
      data-school={group.key}
      style={{ ['--school-hue' as string]: group.mark.hue }}
    >
      <header className="school-group-head">
        <span className="school-group-mark" aria-hidden="true">{group.mark.motif}</span>
        <h3>{group.founded ? group.heading : <span className="school-group-unnamed">{group.rows.length} {group.rows.length === 1 ? 'program' : 'programs'} of a school not yet founded</span>}</h3>
        {avg !== null && <GradeChip grade={gradeFor(avg)} title={`Averages ${Math.round(avg)} / 100 across its developed courses`} />}
        <span className="lane-count">{done.done} / {done.total}</span>
      </header>
      <div className="program-rows">
        {group.rows.map((row) => (
          <ProgramRowView key={row.program.id} s={s} act={act} row={row} lookup={lookup} selectedId={selectedId} onSelect={onSelect} loads={loads} dnd={dnd} />
        ))}
      </div>
    </section>
  );
}

// Filters turn the map into a worklist: one flat cross-school list of what
// matched, rather than dimming the rows.

type StatusFilter = 'all' | 'available' | 'developing' | 'done' | 'unstaffed';
type GradeFilter = 'all' | 'weak';

const WEAK_GRADES = new Set<Grade>(['D', 'F']);

interface Filters {
  query: string;
  status: StatusFilter;
  grade: GradeFilter;
  // A department (from the strip's "wall" item): revealed courses still
  // ahead of the player that need this field.
  field: string | null;
}

const NO_FILTERS: Filters = { query: '', status: 'all', grade: 'all', field: null };

function filtersActive(f: Filters): boolean {
  return f.query.trim() !== '' || f.status !== 'all' || f.grade !== 'all' || f.field !== null;
}

function matchesFilters(s: GameState, t: Buildable, f: Filters, loads: FacultyLoads): boolean {
  const query = f.query.trim().toLowerCase();
  if (query !== '' && !t.name.toLowerCase().includes(query)) return false;

  if (f.field !== null && (t.requiresFaculty !== f.field || t.status !== 'available')) return false;

  if (f.status !== 'all') {
    if (f.status === 'unstaffed') {
      if (!isUnstaffed(s, t)) return false;
    } else if (cellState(s, t) !== f.status) return false;
  }

  if (f.grade === 'weak') {
    const q = courseQuality(s, t, loads);
    // An unstaffed course has no grade but belongs in the weak worklist.
    if (!q) return isUnstaffed(s, t);
    if (!WEAK_GRADES.has(q.grade)) return false;
  }
  return true;
}

function FilterBar(
  { filters, onChange, resultCount }:
  { filters: Filters; onChange: (f: Filters) => void; resultCount: number | null },
) {
  return (
    <div className="curriculum-filters">
      <input
        id="curriculum-search"
        type="search"
        className="curriculum-search"
        aria-label="Search courses"
        placeholder="Search courses…"
        value={filters.query}
        onChange={(e) => onChange({ ...filters, query: e.target.value })}
      />
      <select
        id="curriculum-status"
        className="curriculum-select"
        aria-label="Filter by status"
        value={filters.status}
        onChange={(e) => onChange({ ...filters, status: e.target.value as StatusFilter })}
      >
        <option value="all">Any status</option>
        <option value="available">Ready to start</option>
        <option value="developing">In development</option>
        <option value="done">Developed</option>
        <option value="unstaffed">Unstaffed</option>
      </select>
      <button
        type="button"
        className={`curriculum-chip${filters.grade === 'weak' ? ' on' : ''}`}
        aria-pressed={filters.grade === 'weak'}
        onClick={() => onChange({ ...filters, grade: filters.grade === 'weak' ? 'all' : 'weak' })}
        title="Every developed course graded D or F, plus any left unstaffed"
      >
        Needs attention
      </button>
      {filters.field !== null && (
        <button
          type="button"
          className="curriculum-chip on"
          onClick={() => onChange({ ...filters, field: null })}
          title="Courses waiting on this department — click to clear"
        >
          waiting on {filters.field} ×
        </button>
      )}
      {resultCount !== null && (
        <span className="curriculum-result-count">
          {resultCount} {resultCount === 1 ? 'course' : 'courses'}
        </span>
      )}
      {filtersActive(filters) && (
        <button type="button" className="curriculum-chip clear" onClick={() => onChange(NO_FILTERS)}>
          Clear
        </button>
      )}
    </div>
  );
}

// Next up: the strip answering "what now". Each item is a door: programs on
// offer and halls with room, programs near a milestone, courses ready this
// week, and the short department ("the wall"). Empty items are omitted.
const NEAR_MILESTONE = 2;

function NextUp({ s, groups, lookup, onGoToProgram, onFilter, onInspectHall, onOpenFaculty }: {
  s: GameState; groups: SchoolGroup[]; lookup: Map<string, Buildable>;
  onGoToProgram: (id: string) => void;
  onFilter: (f: Partial<Filters>) => void;
  onInspectHall?: (hallId: string) => void;
  onOpenFaculty?: (field: string) => void;
}) {
  // The offer is global, so it is stated once with every hall that has room;
  // founding happens in the hall's panel on the map.
  const offers = s.programOffers.map((id) => programById(id)).filter((p): p is ProgramInfo => p !== undefined);
  const hallsWithRoom = Object.entries(s.halls)
    .map(([hallId, slots]) => ({ hall: lookup.get(hallId), free: slots.filter((slot) => slot.programId === null).length }))
    .filter((h): h is { hall: Buildable; free: number } => !!h.hall && h.free > 0);

  // Programs a course or two from a milestone, nearest first.
  const near = groups
    .flatMap((g) => g.rows.map((row) => ({ row, progress: programProgress(s, row.program, lookup) })))
    .filter(({ progress }) => progress.toMilestone > 0 && progress.toMilestone <= NEAR_MILESTONE && !progress.inTransit && (progress.next || progress.developing > 0))
    .sort((a, b) => a.progress.toMilestone - b.progress.toMilestone);

  // Revealed courses that could start this week (cash and a free slot).
  const revealed = visibleCourseIds(s).map((id) => lookup.get(id)).filter((t): t is Buildable => !!t && t.status === 'available');
  const ready = revealed.filter((t) => canStartDevelopment(s, t));
  const readyCost = ready.reduce((sum, t) => sum + t.cost, 0);

  // Departments holding up revealed courses, by how many.
  const wallCounts = new Map<string, number>();
  for (const field of neededFacultyFields(s)) {
    wallCounts.set(field, revealed.filter((t) => t.requiresFaculty === field).length);
  }
  const wall = [...wallCounts.entries()].filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);

  if (offers.length === 0 && near.length === 0 && ready.length === 0 && wall.length === 0) return null;

  return (
    <div className="next-up" aria-label="What next">
      {offers.length > 0 && (
        <div className="next-up-item offers">
          <span className="next-up-label">On offer</span>
          <span className="next-up-body">
            {offers.map((p, i) => {
              const mark = schoolMark(p.school);
              const entry = lookup.get(p.entryCourseId);
              return (
                <span key={p.id} className="next-up-offer" style={{ ['--school-hue' as string]: mark.hue }} title={`${p.name} — ${entry ? `${money(entry.cost)} · ${entry.requiresFaculty ?? ''}` : ''}`}>
                  {i > 0 && <span className="next-up-sep"> · </span>}
                  <span className="next-up-mark" aria-hidden="true">{mark.motif}</span> {p.name}
                </span>
              );
            })}
          </span>
          <span className="next-up-doors">
            {hallsWithRoom.length === 0
              ? <span className="next-up-note">no free slot — site an academic hall</span>
              : hallsWithRoom.map(({ hall, free }) => (
                <button
                  key={hall.id}
                  type="button"
                  className="next-up-door"
                  disabled={!onInspectHall}
                  onClick={() => onInspectHall?.(hall.id)}
                  title={`Open ${hallDisplayName(s, hall)} on the map and found a program in one of its ${free} free slot${free === 1 ? '' : 's'}`}
                >
                  Found in {hallDisplayName(s, hall)} · {free} free
                </button>
              ))}
          </span>
        </div>
      )}
      {near.length > 0 && (
        <div className="next-up-item">
          <span className="next-up-label">Near a milestone</span>
          <span className="next-up-doors">
            {near.slice(0, 5).map(({ row, progress }) => (
              <button key={row.program.id} type="button" className="next-up-door" onClick={() => onGoToProgram(row.program.id)} style={{ ['--school-hue' as string]: schoolMark(row.program.school).hue }}>
                <span className="next-up-mark" aria-hidden="true">{schoolMark(row.program.school).motif}</span> {row.program.name} · {milestoneLine(progress)}
              </button>
            ))}
            {near.length > 5 && <span className="next-up-note">+{near.length - 5} more</span>}
          </span>
        </div>
      )}
      {ready.length > 0 && (
        <div className="next-up-item">
          <span className="next-up-label">Ready now</span>
          <span className="next-up-doors">
            <button type="button" className="next-up-door" onClick={() => onFilter({ status: 'available', field: null })} title="Every course that could start this week: a free slot and the cash for it">
              {ready.length} {ready.length === 1 ? 'course' : 'courses'} · {moneyShort(readyCost)} to start them all
            </button>
            {revealed.length > ready.length && (
              <span className="next-up-note">{revealed.length - ready.length} more revealed, short of cash or a slot</span>
            )}
          </span>
        </div>
      )}
      {wall.length > 0 && (
        <div className="next-up-item wall">
          <span className="next-up-label">The wall</span>
          <span className="next-up-doors">
            {wall.slice(0, 3).map(([field, n]) => {
              const gate = facultyGate(s, field);
              return (
                <span key={field} className="next-up-pair">
                  <button type="button" className="next-up-door" onClick={() => onFilter({ field, status: 'all' })} title={`${n} revealed ${n === 1 ? 'course is' : 'courses are'} waiting on a free ${field} slot${gate === 'hireable' ? ' — a candidate is listed' : ' — nobody on the market'}`}>
                    {field} short · {n} waiting{gate === 'hireable' ? ' · candidate listed' : ''}
                  </button>
                  {onOpenFaculty && (
                    <button type="button" className="next-up-door quiet" onClick={() => onOpenFaculty(field)} title={`Open the Faculty board on ${field}: its people, the market, a search`}>
                      {gate === 'hireable' ? 'Appoint →' : 'Department →'}
                    </button>
                  )}
                </span>
              );
            })}
          </span>
        </div>
      )}
    </div>
  );
}

// Completion of a set of course ids. Exported so other views (the campus
// map's popover) compute it the same way.
export function completion(s: GameState, ids: string[]): { done: number; total: number; fraction: number } {
  const done = ids.filter((id) => s.tech.find((t) => t.id === id)?.status === 'done').length;
  return { done, total: ids.length, fraction: ids.length > 0 ? done / ids.length : 0 };
}

export default function CurriculumTab(
  { s, act, target, onTargetConsumed, onInspectHall, onOpenFaculty }:
  {
    s: GameState; act: (a: Action) => void;
    // Where to go on arrival: a school's name, "program:<id>", "field:<name>"
    // or "unstaffed". Consumed and cleared by the caller.
    target?: string;
    onTargetConsumed?: () => void;
    // Back to the map, opening a hall's panel (where founding happens).
    onInspectHall?: (hallId: string) => void;
    // To the Faculty board, opened on a department.
    onOpenFaculty?: (field: string) => void;
  },
) {
  const revealedGrad = revealedGraduatePrograms(s);
  // The headline ring counts undergraduate courses plus revealed graduate
  // work, never the whole seed.
  const courses = s.tech.filter(
    (t) => t.kind === 'course' && (!t.graduateProgram || revealedGrad.has(t.graduateProgram)),
  );
  const doneCourses = courses.filter((t) => t.status === 'done').length;
  const catalogFraction = courses.length > 0 ? doneCourses / courses.length : 0;
  const catalogPct = Math.round(catalogFraction * 100);

  const lookup = new Map(s.tech.map((t) => [t.id, t]));
  // Built once per render and shared: counting loads per cell would be quadratic.
  const loads = facultyLoads(s);
  const sections = buildSections(s, revealedGrad);
  const groups = schoolGroups(s, sections);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);

  // Drag-and-drop state, shared so source and target draw the same preview.
  // A drop dispatches SWAP_COURSE_FACULTY; illegal targets refuse the drop.
  const [drag, setDrag] = useState<DragState | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const dnd: DragHandlers = {
    drag,
    over,
    onDragStart: (courseId, facultyId) => { setDrag({ courseId, facultyId }); setOver(null); },
    onDragOver: (courseId) => setOver(courseId),
    onDragEnd: () => { setDrag(null); setOver(null); },
    onDrop: (courseId) => {
      if (drag && canSwapInstructors(s, drag.courseId, courseId)) act({ type: 'SWAP_COURSE_FACULTY', courseA: drag.courseId, courseB: courseId });
      setDrag(null); setOver(null);
    },
  };

  const selected = selectedId ? lookup.get(selectedId) ?? null : null;
  const onSelect = useCallback((id: string) => {
    setSelectedId((cur) => (cur === id ? null : id));
  }, []);

  // Jump to a course from a search result or a prereq link.
  const goToCourse = useCallback((id: string) => {
    setSelectedId(id);
    setFilters(NO_FILTERS);
    window.setTimeout(() => document.getElementById(`course-${id}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 0);
  }, []);

  // Scroll to a program's row, clearing selection and filters.
  const goToProgram = useCallback((id: string) => {
    setSelectedId(null);
    setFilters(NO_FILTERS);
    window.setTimeout(() => document.querySelector(`[data-program="${CSS.escape(id)}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 0);
  }, []);
  useEffect(() => {
    if (!target) return;
    if (target.startsWith('program:')) {
      goToProgram(target.slice('program:'.length));
    } else if (target.startsWith('field:')) {
      setSelectedId(null);
      setFilters({ ...NO_FILTERS, field: target.slice('field:'.length) });
    } else if (target === 'unstaffed') {
      setSelectedId(null);
      setFilters({ ...NO_FILTERS, status: 'unstaffed' });
    } else {
      setSelectedId(null);
      setFilters(NO_FILTERS);
      window.setTimeout(() => document.querySelector(`[data-school="${CSS.escape(target)}"]`)?.scrollIntoView({ block: 'start', behavior: 'smooth' }), 0);
    }
    onTargetConsumed?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  const unseenIds = visibleCourseIds(s).filter((id) => !s.seen.courseIds[id]);
  const unseenKey = unseenIds.join('|');
  useEffect(() => {
    if (unseenIds.length > 0) act({ type: 'MARK_SEEN', kind: 'course', ids: unseenIds });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unseenKey]);

  const filtering = filtersActive(filters);
  const matches = filtering
    ? visibleCourseIds(s)
      .map((id) => lookup.get(id))
      .filter((t): t is Buildable => !!t && matchesFilters(s, t, filters, loads))
    : [];

  return (
    <div className={`tab-content curriculum-layout${selected ? ' with-drawer' : ''}`}>
      <section className="panel curriculum-panel">
        <div className="panel-head">
          <span className="panel-head-title">
            {/* While filtering, the crumb shows the whole-catalogue search. */}
            {filtering ? (
              <h2 className="curriculum-crumbs">
                <button type="button" className="crumb" onClick={() => setFilters(NO_FILTERS)}>The Curriculum</button>
                <span className="crumb-sep" aria-hidden="true">›</span>
                <span className="crumb-current">Matching courses</span>
              </h2>
            ) : (
              <h2>The Curriculum</h2>
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
            <AggregateGrade s={s} ids={courses.map((c) => c.id)} label="The catalog" loads={loads} />
            <HelpHint
              align="end"
              text='One row per program, grouped by school — a school is named once six of its programs share a hall. Each row leads with its next start: the course, the strongest free teacher and the grade they would earn; Develop takes it, "choose…" opens the course to pick somebody else. Programs are founded from an academic hall on the map — the strip above says which halls have room. Drag a professor onto another course in the same department to swap them, and both grades preview while you hold.'
            />
          </span>
        </div>

        {!filtering && (
          <NextUp
            s={s}
            groups={groups}
            lookup={lookup}
            onGoToProgram={goToProgram}
            onFilter={(f) => setFilters({ ...NO_FILTERS, ...f })}
            onInspectHall={onInspectHall}
            onOpenFaculty={onOpenFaculty}
          />
        )}

        <FilterBar filters={filters} onChange={setFilters} resultCount={filtering ? matches.length : null} />

        {s.finance.cash < 0 && (
          <p className="stall-note">Cash is negative — the college is running an operating deficit, so no course can be started until the balance recovers.</p>
        )}

        <div className="curriculum-scroll">
          {/* A filter replaces the map with a cross-school worklist. */}
          {filtering ? (
            matches.length === 0 ? (
              <p className="empty-note">Nothing matches those filters.</p>
            ) : (
              <div className="worklist">
                {matches.map((t) => {
                  const home = courseSchools().get(t.id);
                  return (
                    <div key={t.id} className="worklist-row">
                      <CourseCell s={s} t={t} selected={selectedId === t.id} onSelect={onSelect} loads={loads} />
                      <span className="worklist-where">{home?.school ?? ''}</span>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            groups.map((group) => (
              <SchoolGroupView key={group.key} s={s} act={act} group={group} lookup={lookup} selectedId={selectedId} onSelect={onSelect} loads={loads} dnd={dnd} />
            ))
          )}
        </div>
      </section>
      {selected && (
        <CourseDrawer
          s={s}
          act={act}
          t={selected}
          lookup={lookup}
          onClose={() => setSelectedId(null)}
          loads={loads}
          onGoToCourse={goToCourse}
          onOpenFaculty={onOpenFaculty}
        />
      )}
    </div>
  );
}
