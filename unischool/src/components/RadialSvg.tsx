import { useMemo, type KeyboardEvent } from 'react';
import type { Buildable } from '../state/types';
import { programById } from '../data/techData';
import { schoolMark } from '../data/schoolPalette';
import {
  fitScale, labelRadius, NODE_RADIUS, polar, radialLayout, RADIAL,
  type DrawnCourse, type RadialDrawing, type RadialTier,
} from '../systems/techtree/radialLayout';
import { count } from '../format';

// ---------------------------------------------------------------------
// The radial curriculum drawn (Plan 105): the Curriculum tab's drawing
// (tabs/RadialCurriculum.tsx) and the History tab's and Final Report's
// replay of it (CurriculumReplay.tsx). What is drawn and where is
// radialLayout.ts's; this only draws it.
// ---------------------------------------------------------------------

// Zoomed to one school: its sector turned to the top and scaled to fill.
const ZOOM_SCALE = 1.65;
const ZOOM_SHIFT = (RADIAL.label * ZOOM_SCALE) / 2;

const TIER_WORDS: Record<RadialTier, string> = { entry: 'Entry', core: 'Core', advanced: 'Advanced', capstone: 'Capstone' };
const STATE_WORDS: Record<DrawnCourse['state'], string> = {
  done: 'taught', developing: 'being written', ready: 'ready to start', held: 'ready, but held',
};

export function f1(n: number): number { return Math.round(n * 10) / 10; }

// A five-pointed star of outer radius r, for a distinguished capstone.
export function starPoints(cx: number, cy: number, r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 === 0 ? r : r * 0.45;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    pts.push(`${f1(cx + rr * Math.cos(a))},${f1(cy + rr * Math.sin(a))}`);
  }
  return pts.join(' ');
}

// The clock-face fill of a course being written: a pie wedge of `p`.
export function piePath(cx: number, cy: number, r: number, p: number): string {
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

// The drawing itself. Read-only apart from the callbacks, so the History
// tab's replay (Plan 105F) draws a past year with it.
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

export default function RadialSvg({
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

        {/* School names just outside what is drawn; a started school only.
            Upright as seen: zoomed to a school, the world is turned by its
            angle, so a name's flip is judged against the turned view. */}
        {drawing.schools.filter((x) => x.started).map((x) => {
          const at = polar(labelsAt, x.school.mid);
          const turn = ((((x.school.mid - (school?.mid ?? 0)) % 360) + 360) % 360);
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
