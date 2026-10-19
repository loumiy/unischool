import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Action } from '../state/actions';
import type { Buildable, GameState } from '../state/types';
import { programById, programOfCourse, type ProgramInfo } from '../data/techData';
import { schoolMark } from '../data/schoolPalette';
import { walkProgram } from '../data/openingData';
import { radialDrawing, radialLayout } from '../systems/techtree/radialLayout';
import RadialSvg, { piePath, starPoints } from '../components/RadialSvg';
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
