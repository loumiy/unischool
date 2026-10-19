import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import type { Action } from '../state/actions';
import type { Buildable, GameState } from '../state/types';
import { programById, programOfCourse, type ProgramInfo } from '../data/techData';
import { schoolMark } from '../data/schoolPalette';
import { walkProgram } from '../data/openingData';
import {
  fitScale, labelRadius, NODE_RADIUS, polar, radialDrawing, radialLayout, RADIAL,
  type DrawnCourse, type RadialDrawing, type RadialTier,
} from '../systems/techtree/radialLayout';
import { canSwapInstructors, hallOfCourse } from '../systems/techtree/techSystem';
import { hallDisplayName, isSchoolFounded } from '../systems/techtree/schools';
import { milestoneLine, programProgress, tierBands } from '../systems/techtree/programProgress';
import { averageCourseQuality, facultyLoads } from '../systems/faculty/facultyAssignment';
import { restaffPlan, unstaffedIn } from '../systems/faculty/restaffing';
import { count, fraction } from '../format';
import HelpHint from '../components/HelpHint';
import {
  CommitteeBox, CourseCell, CourseDrawer, FilterBar, GradeChip, RowAction, visibleCourseIds,
  type DragHandlers, type DragState,
} from './CurriculumTab';
import { NO_FILTERS, filtersActive, matchesFilters, targetFilters, type Filters } from './curriculumFilter';
import { setCurriculumView } from './curriculumView';

// ---------------------------------------------------------------------
// THE RADIAL CURRICULUM (Plan 105B–D): the Curriculum tab as one drawing of
// the whole catalog, entry courses at the centre and capstones at the rim,
// with the committee and the filters on the left and the program and course
// in focus on the right. What is drawn and where is radialLayout.ts's; this
// file draws it and wires it to the game.
// ---------------------------------------------------------------------

// Zoomed to one school: its sector turned to the top and scaled to fill.
const ZOOM_SCALE = 1.65;
const ZOOM_SHIFT = (RADIAL.label * ZOOM_SCALE) / 2;

const TIER_WORDS: Record<RadialTier, string> = { entry: 'Entry', core: 'Core', advanced: 'Advanced', capstone: 'Capstone' };
const STATE_WORDS: Record<DrawnCourse['state'], string> = {
  done: 'taught', developing: 'being written', ready: 'ready to start', held: 'ready, but held',
};

function f1(n: number): number { return Math.round(n * 10) / 10; }

// A five-pointed star of outer radius r, for a distinguished capstone.
function starPoints(cx: number, cy: number, r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 === 0 ? r : r * 0.45;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    pts.push(`${f1(cx + rr * Math.cos(a))},${f1(cy + rr * Math.sin(a))}`);
  }
  return pts.join(' ');
}

// The clock-face fill of a course being written: a pie wedge of `p`.
function piePath(cx: number, cy: number, r: number, p: number): string {
  if (p <= 0) return '';
  if (p >= 0.999) return `M${cx} ${cy - r}A${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r}Z`;
  const a = 2 * Math.PI * p;
  const x = cx + r * Math.sin(a);
  const y = cy - r * Math.cos(a);
  return `M${cx} ${cy}L${cx} ${cy - r}A${r} ${r} 0 ${p > 0.5 ? 1 : 0} 1 ${f1(x)} ${f1(y)}Z`;
}

function arcPath(r: number, a0: number, a1: number): string {
  const p = polar(r, a0);
  const q = polar(r, a1);
  return `M${f1(p.x)} ${f1(p.y)}A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${f1(q.x)} ${f1(q.y)}`;
}

// ---------------------------------------------------------------------
// The drawing itself. Read-only apart from the callbacks, so the History
// tab's replay (Plan 105F) draws a past year with it.
// ---------------------------------------------------------------------
export interface RadialSvgProps {
  drawing: RadialDrawing;
  lookup: Map<string, Buildable>;
  zoom: number | null;                 // a school's index, or the whole curriculum
  focusProgram?: string | null;
  selectedCourse?: string | null;
  dimmed?: Set<string> | null;          // courses a filter does not match
  fresh?: Set<string>;                  // courses new since the tab last opened
  onPick?: (courseId: string) => void;
  onPickProgram?: (programId: string) => void;
  onPickSchool?: (index: number) => void;
  onHover?: (text: { title: string; line: string } | null) => void;
  caption?: string;                     // under the seal's figure
}

export function RadialSvg({
  drawing, lookup, zoom, focusProgram = null, selectedCourse = null, dimmed = null, fresh,
  onPick, onPickProgram, onPickSchool, onHover, caption = 'taught',
}: RadialSvgProps) {
  const layout = radialLayout();
  const fit = fitScale(drawing.extent);
  const school = zoom !== null ? layout.schools[zoom] : null;
  const transform = school
    ? `translate(0px, ${f1(ZOOM_SHIFT)}px) scale(${ZOOM_SCALE}) rotate(${f1(-school.mid)}deg)`
    : `scale(${f1(fit)})`;
  const labelsAt = labelRadius(drawing.extent);
  const taughtTotal = [...drawing.programs.values()].reduce((n, p) => n + p.done, 0);

  // Keyboard (Plan 105D): along a ring with left and right, between rings
  // with up and down (outward) — to the nearest drawn course by angle.
  const ordered = useMemo(() => [...drawing.courses.values()].sort((a, b) => a.course.angle - b.course.angle), [drawing]);
  const ringOf = (tier: RadialTier) => ordered.filter((c) => c.course.tier === tier);
  const RINGS: RadialTier[] = ['entry', 'core', 'advanced', 'capstone'];
  function move(from: DrawnCourse, key: string): DrawnCourse | undefined {
    const ring = ringOf(from.course.tier);
    const i = ring.indexOf(from);
    if (key === 'ArrowRight') return ring[(i + 1) % ring.length];
    if (key === 'ArrowLeft') return ring[(i - 1 + ring.length) % ring.length];
    const r = RINGS.indexOf(from.course.tier) + (key === 'ArrowUp' ? 1 : -1);
    if (r < 0 || r >= RINGS.length) return undefined;
    const next = ringOf(RINGS[r]);
    let best: DrawnCourse | undefined;
    let gap = Infinity;
    for (const c of next) {
      const d = Math.abs(((c.course.angle - from.course.angle + 540) % 360) - 180);
      if (d < gap) { gap = d; best = c; }
    }
    return best;
  }
  function onKey(e: KeyboardEvent, c: DrawnCourse) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick?.(c.course.id); return; }
    if (!e.key.startsWith('Arrow')) return;
    e.preventDefault();
    const to = move(c, e.key);
    if (to) document.getElementById(`radial-${to.course.id}`)?.focus();
  }

  function describe(c: DrawnCourse) {
    const t = lookup.get(c.course.id);
    const program = programById(c.course.programId);
    return {
      title: t?.name ?? c.course.id,
      line: `${program?.name ?? ''} · ${TIER_WORDS[c.course.tier]} · ${STATE_WORDS[c.state]}`,
    };
  }

  return (
    <svg className="radial-svg" viewBox={`${-RADIAL.half} ${-RADIAL.half} ${RADIAL.half * 2} ${RADIAL.half * 2}`} role="group" aria-label="The curriculum, entry courses at the centre and capstones at the rim">
      <g className={`radial-world${school ? ' zoomed' : ''}`} style={{ transform }}>
        {/* Each school's arc fills in its colour as its courses are taught. */}
        {drawing.schools.map((x) => {
          if (x.done === 0) return null;
          const a0 = x.school.start + 0.6;
          const a1 = x.school.end - 0.6;
          return (
            <path
              key={`arc-${x.school.name}`}
              className={`radial-arc${x.distinguished ? ' distinguished' : ''}`}
              d={arcPath(drawing.arcRadius, a0, a0 + (a1 - a0) * (x.done / x.school.courseIds.length))}
              style={x.distinguished ? undefined : { stroke: schoolMark(x.school.name).hue }}
            />
          );
        })}
        <path className="radial-line open" d={drawing.lines.open} />
        <path className="radial-line writing" d={drawing.lines.writing} />
        <path className="radial-line taught" d={drawing.lines.taught} />
        {focusProgram && <path className="radial-line focus" d={drawing.branches.get(focusProgram) ?? ''} />}

        {[...drawing.courses.values()].map((c) => {
          const { x, y, id } = c.course;
          const r = NODE_RADIUS[c.course.tier];
          const program = drawing.programs.get(c.course.programId);
          const star = c.course.tier === 'capstone' && c.state === 'done' && program?.distinguished;
          const cls = [
            'radial-node', c.state,
            program?.dark ? 'dark' : '',
            program?.transit ? 'transit' : '',
            selectedCourse === id ? 'selected' : '',
            dimmed && dimmed.has(id) ? 'dimmed' : '',
            fresh?.has(id) ? 'fresh' : '',
          ].filter(Boolean).join(' ');
          const label = describe(c);
          return (
            <g
              key={id}
              id={`radial-${id}`}
              className={cls}
              tabIndex={onPick ? 0 : -1}
              role={onPick ? 'button' : undefined}
              aria-label={`${label.title}, ${label.line}`}
              onClick={onPick ? () => onPick(id) : undefined}
              onKeyDown={onPick ? (e) => onKey(e, c) : undefined}
              onMouseEnter={onHover ? () => onHover(label) : undefined}
              onFocus={onHover ? () => onHover(label) : undefined}
              onMouseLeave={onHover ? () => onHover(null) : undefined}
            >
              {star
                ? <polygon className="radial-star" points={starPoints(x, y, r * 1.7)} />
                : <circle cx={f1(x)} cy={f1(y)} r={r} />}
              {c.state === 'developing' && <path className="radial-pie" d={piePath(f1(x), f1(y), r - 1, c.progress)} />}
              <circle className="radial-hit" cx={f1(x)} cy={f1(y)} r={r + 5} />
            </g>
          );
        })}

        {/* Graduate programs beyond the rim, filling as their courses are taught. */}
        {[...drawing.programs.values()].filter((p) => p.program.kind === 'graduate').map((p) => {
          const node = p.program.node!;
          const fill = p.total > 0 ? p.done / p.total : 0;
          const r = NODE_RADIUS.graduate;
          const grad = programById(p.program.id);
          return (
            <g
              key={p.program.id}
              className={`radial-grad${focusProgram === p.program.id ? ' selected' : ''}${p.distinguished ? ' complete' : ''}`}
              tabIndex={onPickProgram ? 0 : -1}
              role={onPickProgram ? 'button' : undefined}
              aria-label={`${grad?.name ?? p.program.id}, ${p.done} of ${p.total} courses taught`}
              onClick={onPickProgram ? () => onPickProgram(p.program.id) : undefined}
              onKeyDown={onPickProgram ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPickProgram(p.program.id); } } : undefined}
              onMouseEnter={onHover ? () => onHover({ title: grad?.name ?? '', line: `${p.done} of ${p.total} courses taught` }) : undefined}
              onMouseLeave={onHover ? () => onHover(null) : undefined}
            >
              <line className="radial-grad-stem" x1={f1(polar(drawing.arcRadius + 6, p.program.angle).x)} y1={f1(polar(drawing.arcRadius + 6, p.program.angle).y)} x2={f1(polar(RADIAL.graduate - r, p.program.angle).x)} y2={f1(polar(RADIAL.graduate - r, p.program.angle).y)} />
              <rect x={f1(node.x - r)} y={f1(node.y - r)} width={r * 2} height={r * 2} transform={`rotate(45 ${f1(node.x)} ${f1(node.y)})`} />
              {fill > 0 && fill < 1 && (
                <rect className="radial-grad-fill" x={f1(node.x - r * fill)} y={f1(node.y - r * fill)} width={f1(r * 2 * fill)} height={f1(r * 2 * fill)} transform={`rotate(45 ${f1(node.x)} ${f1(node.y)})`} />
              )}
            </g>
          );
        })}

        {/* Program names along their branches, only zoomed in (decision 5). */}
        {school && [...drawing.programs.values()].filter((p) => p.program.kind === 'major' && p.program.school === school.name).map((p) => {
          const at = polar(RADIAL.entry + 16, p.program.angle);
          return (
            <text key={`name-${p.program.id}`} className="radial-program-name" x={f1(at.x)} y={f1(at.y)} transform={`rotate(${f1(p.program.angle - 90)} ${f1(at.x)} ${f1(at.y)})`}>
              {programById(p.program.id)?.name}
            </text>
          );
        })}

        {/* School names just outside what is drawn; a started school only. */}
        {drawing.schools.filter((x) => x.started).map((x) => {
          const at = polar(labelsAt, x.school.mid);
          const turn = ((x.school.mid % 360) + 360) % 360;
          const upright = turn > 90 && turn < 270 ? x.school.mid + 180 : x.school.mid;
          return (
            <text
              key={`label-${x.school.name}`}
              className={`radial-school-name${x.distinguished ? ' distinguished' : ''}${onPickSchool ? ' pickable' : ''}`}
              x={f1(at.x)} y={f1(at.y)}
              transform={`rotate(${f1(upright)} ${f1(at.x)} ${f1(at.y)})`}
              style={x.distinguished ? undefined : { fill: schoolMark(x.school.name).hue }}
              onClick={onPickSchool ? () => onPickSchool(x.school.index) : undefined}
            >
              {x.school.name}
            </text>
          );
        })}

        {/* The seal stays upright when a school is turned to the top. */}
        <g className="radial-seal" aria-hidden="true" style={school ? { transform: `rotate(${f1(school.mid)}deg)` } : undefined}>
          <circle r={RADIAL.seal - 6} />
          <text className="radial-seal-figure" y={6}>{count(taughtTotal)}</text>
          <text className="radial-seal-word" y={26}>{caption}</text>
        </g>
      </g>
    </svg>
  );
}

// ---------------------------------------------------------------------
// The program in focus, in the right panel: its standing, its next start
// (RowAction, with the opening's ring on it), and its courses by ring as
// the course cells the rows drew, whose instructor chips drag onto each
// other to swap (Plan 105D).
// ---------------------------------------------------------------------
function ProgramCard({ s, act, program, lookup, selectedId, onSelect, dnd }: {
  s: GameState; act: (a: Action) => void; program: ProgramInfo; lookup: Map<string, Buildable>;
  selectedId: string | null; onSelect: (id: string) => void; dnd: DragHandlers;
}) {
  const progress = programProgress(s, program, lookup);
  const loads = facultyLoads(s);
  const avg = averageCourseQuality(s, program.courseIds);
  const hallId = hallOfCourse(s, program.entryCourseId);
  const hall = hallId ? lookup.get(hallId) : undefined;
  const mark = schoolMark(program.school);
  const unstaffedHere = unstaffedIn(s, undefined, program.courseIds).length;
  const plan = unstaffedHere > 0 ? restaffPlan(s, undefined, program.courseIds) : [];
  const bands = tierBands(program);
  const groups: { label: string; ids: string[] }[] = bands
    ? [
      { label: 'Entry', ids: bands.entry },
      { label: 'Core', ids: bands.tier2 },
      { label: 'Advanced', ids: bands.tier3 },
      { label: 'Capstone', ids: program.courseIds.slice(-1) },
    ]
    : [{ label: 'Courses', ids: program.courseIds }];
  const established = !!s.milestones[`program-established:${program.id}`];
  const revealed = (id: string) => program.kind === 'graduate' || established || !(bands?.tier3.includes(id) || id === program.courseIds[program.courseIds.length - 1]);

  return (
    <section className="radial-card radial-program-card" data-program={program.id} style={{ ['--school-hue' as string]: mark.hue }}>
      <header className="radial-card-band">
        <span className="radial-card-mark" aria-hidden="true">{mark.motif}</span>
        <span>{program.school}</span>
        <span className="radial-card-band-right">{fraction(progress.done, progress.total)}</span>
      </header>
      <div className="radial-card-body">
        <div className="radial-card-title">
          <h3>{program.name}</h3>
          {avg !== null && <GradeChip score={avg} title={`${program.name} averages ${count(avg)} out of 100`} />}
        </div>
        <p className="radial-card-meta">
          {hall ? hallDisplayName(s, hall) : 'No hall'} · {milestoneLine(progress)}
        </p>
        {progress.inTransit && <p className="radial-card-note">Moving halls: nothing in it is taught or written until it arrives.</p>}
        {unstaffedHere > 0 && (
          <p className="radial-card-note warn">
            A course has no instructor, so the program is dark.{' '}
            <button
              type="button"
              className="school-restaff"
              disabled={plan.length === 0}
              title={plan.length === 0 ? 'Nobody on the payroll or the market can take these courses this week.' : `Staff ${plan.length} of ${unstaffedHere}`}
              onClick={() => act({ type: 'RESTAFF', school: null, courseIds: program.courseIds })}
            >
              Staff from the market · {unstaffedHere}
            </button>
          </p>
        )}
        <RowAction s={s} act={act} program={program} progress={progress} lookup={lookup} loads={loads} onSelect={onSelect} />
        <div className="radial-card-courses">
          {groups.map((group) => (
            <div key={group.label} className="radial-card-band-group">
              <span className="radial-card-tier">{group.label}</span>
              <div className="radial-card-cells">
                {group.ids.map((id) => {
                  const t = lookup.get(id);
                  if (!t || !revealed(id)) return <span key={id} className="course-cell placeholder" aria-hidden="true" />;
                  return <CourseCell key={id} s={s} t={t} selected={selectedId === id} onSelect={onSelect} dnd={dnd} />;
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------
// The stage.
// ---------------------------------------------------------------------
export default function RadialCurriculum({ s, act, target, onTargetConsumed, onOpenFaculty, fresh }: {
  s: GameState; act: (a: Action) => void;
  target?: string; onTargetConsumed?: () => void;
  onOpenFaculty?: (field: string) => void;
  fresh: Set<string>;
}) {
  const layout = radialLayout();
  const lookup = useMemo(() => new Map(s.tech.map((t) => [t.id, t])), [s.tech]);
  // Redrawn only when a course's status or progress, a hall or the faculty
  // changes, not on every week's tick (Plan 105B).
  const drawing = useMemo(() => radialDrawing(s), [s]);

  // The opening's second course (Plan 103) and the hall panel land on a
  // program with nothing chosen yet: the walk's program, or the first one
  // drawn, is in focus from the start.
  const firstProgram = () => {
    const walk = walkProgram(s);
    return walk && drawing.programs.has(walk) ? walk : [...drawing.programs.keys()][0] ?? null;
  };
  const [programId, setProgramId] = useState<string | null>(firstProgram);
  const [courseId, setCourseId] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number | null>(null);
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [hover, setHover] = useState<{ title: string; line: string } | null>(null);
  const committeeRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLElement>(null);
  // A course chosen is read at once: the right column back to its top.
  useEffect(() => { if (courseId) rightRef.current?.scrollTo({ top: 0, behavior: 'smooth' }); }, [courseId]);

  // A college that had nothing drawn when the tab opened: the first program
  // housed comes into focus.
  useEffect(() => {
    if (!programId) setProgramId(firstProgram());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawing]);

  const schoolIndex = useCallback((name: string) => layout.schools.findIndex((x) => x.name === name), [layout]);

  const selectCourse = useCallback((id: string) => {
    const pid = programOfCourse(id) ?? null;
    setProgramId(pid);
    setCourseId((cur) => (cur === id ? null : id));
  }, []);

  const selectProgram = useCallback((id: string) => {
    setProgramId(id);
    setCourseId(null);
  }, []);

  useEffect(() => {
    if (!target) return;
    const filtered = targetFilters(target);
    if (target.startsWith('program:')) {
      const id = target.slice('program:'.length);
      setFilters(NO_FILTERS);
      selectProgram(id);
      const p = programById(id);
      if (p) setZoom(schoolIndex(p.school));
    } else if (target.startsWith('course:')) {
      const id = target.slice('course:'.length);
      setFilters(NO_FILTERS);
      setProgramId(programOfCourse(id) ?? null);
      setCourseId(id);
      const p = programById(programOfCourse(id) ?? '');
      if (p) setZoom(schoolIndex(p.school));
    } else if (filtered) {
      setFilters(filtered);
    } else if (target === 'curriculum.committee') {
      setFilters(NO_FILTERS);
      window.setTimeout(() => committeeRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 0);
    } else {
      const i = schoolIndex(target);
      setZoom(i >= 0 ? i : null);
    }
    onTargetConsumed?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  // Instructor swaps in the program card (Plan 105D), as the rows did.
  const [drag, setDrag] = useState<DragState | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const dnd: DragHandlers = {
    drag,
    over,
    onDragStart: (id, facultyId) => { setDrag({ courseId: id, facultyId }); setOver(null); },
    onDragOver: (id) => setOver(id),
    onDragEnd: () => { setDrag(null); setOver(null); },
    onDrop: (id) => {
      if (drag && canSwapInstructors(s, drag.courseId, id)) act({ type: 'SWAP_COURSE_FACULTY', courseA: drag.courseId, courseB: id });
      setDrag(null); setOver(null);
    },
  };

  // Filters dim what they do not match and list what they do (Plan 105 §3.5).
  const filtering = filtersActive(filters);
  const matches = useMemo(() => (filtering
    ? visibleCourseIds(s).map((id) => lookup.get(id)).filter((t): t is Buildable => !!t && matchesFilters(s, t, filters, lookup))
    : []), [filtering, s, filters, lookup]);
  const dimmed = useMemo(() => {
    if (!filtering) return null;
    const hit = new Set(matches.map((t) => t.id));
    return new Set([...drawing.courses.keys()].filter((id) => !hit.has(id)));
  }, [filtering, matches, drawing]);

  const program = programId ? programById(programId) : undefined;
  const course = courseId ? lookup.get(courseId) ?? null : null;

  return (
    <div className="curriculum-radial">
      <aside className="radial-rail left" aria-label="Committee, view and filters">
        <div className="segmented switch radial-view-switch" role="group" aria-label="Curriculum view" style={{ ['--seg-count' as string]: 2, ['--seg-index' as string]: 0 }}>
          <button type="button" className="active" aria-pressed="true">Drawing</button>
          <button type="button" aria-pressed="false" onClick={() => setCurriculumView('list')}>List</button>
        </div>
        <div ref={committeeRef}>
          <CommitteeBox s={s} lookup={lookup} onOpenFaculty={onOpenFaculty} />
        </div>
        <section className="radial-card">
          <header className="radial-card-band"><span>View</span><HelpHint text="Each program is a branch in its school's sector: its entry course on the inner ring, its four core courses on the next, its four advanced courses beyond them, and its capstone at the rim. A course is drawn once it is taught, being written or ready to start; dashed lines lead to the ones you can start now. The arc at the rim fills as a school's courses are taught, and turns gold when every one is. Graduate programs sit beyond their school once housed. Point at a course to name it, click it to read it, and click a school's name, or a school here, to zoom to it. Drag a professor onto another course of the same department in the program card to swap them." /><span className="radial-card-band-right">{count([...drawing.programs.values()].reduce((n, p) => n + p.done, 0))} taught</span></header>
          <div className="radial-card-body radial-view-list">
            <button type="button" className={`radial-view-row${zoom === null ? ' on' : ''}`} onClick={() => setZoom(null)}>
              <span className="radial-view-dot whole" aria-hidden="true" />
              <span className="radial-view-name">Whole curriculum</span>
            </button>
            {drawing.schools.map((x) => {
              const unstaffedHere = x.started ? unstaffedIn(s, undefined, x.school.courseIds).length : 0;
              return (
                <div key={x.school.name} className="radial-view-item">
                  <button
                    type="button"
                    className={`radial-view-row${zoom === x.school.index ? ' on' : ''}${x.started ? '' : ' faint'}`}
                    onClick={() => setZoom(x.school.index)}
                    title={x.started ? `Zoom to ${x.school.name}` : `${x.school.name}: no program housed yet`}
                  >
                    <span className="radial-view-dot" style={{ background: schoolMark(x.school.name).hue }} aria-hidden="true" />
                    <span className="radial-view-name">{isSchoolFounded(s, x.school.name) ? `School of ${x.school.name}` : x.school.name}</span>
                    <span className="radial-view-count">{fraction(x.done, x.school.courseIds.length)}</span>
                  </button>
                  {unstaffedHere > 0 && (
                    <button
                      type="button"
                      className="school-restaff"
                      onClick={() => act({ type: 'RESTAFF', school: x.school.name, courseIds: x.school.courseIds })}
                      title={`Staff the unstaffed courses of ${x.school.name} from the payroll and the market`}
                    >
                      Staff from the market · {unstaffedHere}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>
        <section className="radial-card">
          <header className="radial-card-band"><span>Find</span></header>
          <div className="radial-card-body">
            <FilterBar filters={filters} onChange={setFilters} resultCount={filtering ? matches.length : null} />
            {filtering && (
              matches.length === 0
                ? <p className="empty-note">Nothing matches those filters.</p>
                : (
                  <div className="worklist radial-matches">
                    {matches.map((t) => (
                      <div key={t.id} className="worklist-row">
                        <CourseCell s={s} t={t} selected={courseId === t.id} onSelect={selectCourse} />
                      </div>
                    ))}
                  </div>
                )
            )}
          </div>
        </section>
        <section className="radial-card radial-key">
          <header className="radial-card-band"><span>Key</span></header>
          <ul className="radial-card-body">
            <li><svg viewBox="-8 -8 16 16" aria-hidden="true"><circle className="key-done" r="6" /></svg>Taught</li>
            <li><svg viewBox="-8 -8 16 16" aria-hidden="true"><circle className="key-open" r="6" /><path className="key-pie" d={piePath(0, 0, 5, 0.4)} /></svg>Being written</li>
            <li><svg viewBox="-8 -8 16 16" aria-hidden="true"><circle className="key-ready" r="6" /></svg>Ready to start</li>
            <li><svg viewBox="-8 -8 16 16" aria-hidden="true"><polygon className="key-done" points={starPoints(0, 0, 7)} /></svg>Capstone of a distinguished program</li>
            <li><svg viewBox="-8 -8 16 16" aria-hidden="true"><rect className="key-open" x="-5" y="-5" width="10" height="10" transform="rotate(45)" /></svg>Graduate program</li>
            <li className="radial-key-note">Only courses taught, being written or ready to start are drawn: the entry course at the centre, the core and advanced courses around it, the capstone at the rim.</li>
          </ul>
        </section>
      </aside>

      <main className="radial-stage">
        {/* What the pointer is on; nothing otherwise. */}
        {hover && (
          <div className="radial-caption" aria-live="polite">
            <b>{hover.title}</b><span>{hover.line}</span>
          </div>
        )}
        <div className="radial-square">
          <RadialSvg
            drawing={drawing}
            lookup={lookup}
            zoom={zoom}
            focusProgram={programId}
            selectedCourse={courseId}
            dimmed={dimmed}
            fresh={fresh}
            onPick={selectCourse}
            onPickProgram={selectProgram}
            onPickSchool={setZoom}
            onHover={setHover}
          />
        </div>
        {s.finance.cash < 0 && <p className="stall-note radial-stall">Cash is negative.</p>}
      </main>

      <aside className="radial-rail right" aria-label="Program and course" ref={rightRef}>
        {course && (
          <CourseDrawer
            s={s}
            act={act}
            t={course}
            lookup={lookup}
            onClose={() => setCourseId(null)}
            onGoToCourse={(id) => { selectCourse(id); const p = programById(programOfCourse(id) ?? ''); if (p && zoom !== null) setZoom(schoolIndex(p.school)); }}
            onOpenFaculty={onOpenFaculty}
          />
        )}
        {program
          ? <ProgramCard s={s} act={act} program={program} lookup={lookup} selectedId={courseId} onSelect={selectCourse} dnd={dnd} />
          : <p className="empty-note">{drawing.courses.size === 0 ? 'Nothing is taught yet. Found a program in a hall on the map, and its entry course appears at the centre.' : 'Click a course to read its program.'}</p>}
      </aside>
    </div>
  );
}
