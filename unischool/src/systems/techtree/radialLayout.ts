import type { Buildable, GameState } from '../../state/types';
import {
  discoverySchools, schoolCurriculumIds, type DiscoverySchool,
} from '../../data/techData';
import { isHoused, isInTransit } from './programOffers';
import { unstaffedPrograms } from './darkness';
import { canStartDevelopment } from './techSystem';

// ---------------------------------------------------------------------
// THE RADIAL CURRICULUM (Plan 105): where every course sits in the
// Curriculum tab's drawing, and which of them are drawn.
//
// The layout is a pure function of the catalog, computed once: seven school
// sectors in the catalog's order, six program wedges in each, and the tiers
// as rings — the entry course on the inner ring, the core quartet, the
// advanced quartet, the capstone at the rim — with each school's graduate
// programs beyond it. A course always appears where it will stay.
//
// What is drawn is a function of the state, and only what the college has
// opened is drawn (Plan 105 §3.3): a course taught, being written, or
// available to start. A `locked` course, a program with no hall, a graduate
// program not housed are not drawn at all. Lines carry progress, not
// structure (Plan 2's "Why the constellation failed"): a line runs only to a
// drawn course, and the core quartet meets at one junction before fanning
// to the advanced quartet. Cross-program prerequisites (CROSS_MAJOR_BRIDGES)
// are not drawn: the owner found them clutter; the course's own detail lists
// them.
//
// Units: a square 2 × HALF across, centred on the seal at (0, 0). Angles
// are degrees clockwise from twelve o'clock.
// ---------------------------------------------------------------------

export const RADIAL = {
  half: 560,
  seal: 86,
  entry: 145,
  core: 262,
  advanced: 376,
  capstone: 462,
  arc: 488,
  graduate: 516,
  label: 545,
  stagger: 14,   // core and advanced quartets alternate in and out by this
  gapDeg: 3,     // between school sectors
  spread: 0.22,  // a quartet's neighbours sit this many wedge-widths apart
} as const;

// Node radii, in the same units.
export const NODE_RADIUS = { entry: 8, core: 6, advanced: 6, capstone: 9, graduate: 10 } as const;

export type RadialTier = 'entry' | 'core' | 'advanced' | 'capstone';

export interface RadialPoint { x: number; y: number }

export interface RadialCourse extends RadialPoint {
  id: string;
  programId: string;
  school: string;
  tier: RadialTier;
  index: number;     // 0–9 in the program's tier order
  angle: number;
  radius: number;    // distance from the centre
}

export interface RadialProgram {
  id: string;
  school: string;
  angle: number;         // the wedge's centre line
  kind: 'major' | 'graduate';
  courseIds: string[];
  junction?: RadialPoint; // where the core quartet meets (majors only)
  node?: RadialPoint;     // a graduate program's one node
}

export interface RadialSchool {
  name: string;
  index: number;
  start: number;
  end: number;
  mid: number;
  courseIds: string[];   // the undergraduate curriculum (60)
}

export interface RadialLayout {
  schools: RadialSchool[];
  programs: Map<string, RadialProgram>;
  courses: Map<string, RadialCourse>;
  wedge: number;         // a program wedge's width in degrees
}

export function polar(r: number, deg: number): RadialPoint {
  const t = (deg * Math.PI) / 180;
  return { x: r * Math.sin(t), y: -r * Math.cos(t) };
}

let cached: RadialLayout | null = null;

export function radialLayout(): RadialLayout {
  if (cached) return cached;
  const catalog: DiscoverySchool[] = discoverySchools();
  const programsPerSchool = Math.max(...catalog.map((school) => school.majors.length));
  const wedge = (360 - catalog.length * RADIAL.gapDeg) / (catalog.length * programsPerSchool);
  const sectorWidth = programsPerSchool * wedge;
  const schools: RadialSchool[] = [];
  const programs = new Map<string, RadialProgram>();
  const courses = new Map<string, RadialCourse>();

  catalog.forEach((school, index) => {
    // School 0 is centred on twelve o'clock.
    const start = index * (sectorWidth + RADIAL.gapDeg) - sectorWidth / 2;
    const end = start + sectorWidth;
    const mid = start + sectorWidth / 2;
    schools.push({ name: school.name, index, start, end, mid, courseIds: schoolCurriculumIds(school.name) });

    school.majors.forEach((major, j) => {
      const angle = start + (j + 0.5) * wedge;
      const ids = [major.tier1Id, ...major.tier2Ids, ...major.tier3Ids, major.capstoneId];
      programs.set(major.prefix, {
        id: major.prefix, school: school.name, angle, kind: 'major', courseIds: ids,
        junction: polar((RADIAL.core + RADIAL.advanced) / 2, angle),
      });
      ids.forEach((id, i) => {
        let r: number;
        let a = angle;
        let tier: RadialTier;
        if (i === 0) { r = RADIAL.entry; tier = 'entry'; }
        else if (i === ids.length - 1) { r = RADIAL.capstone; tier = 'capstone'; }
        else {
          const advanced = i >= 5;
          const k = advanced ? i - 5 : i - 1;
          r = (advanced ? RADIAL.advanced : RADIAL.core) + (k % 2 === 0 ? -RADIAL.stagger : RADIAL.stagger);
          a = angle + (k - 1.5) * wedge * RADIAL.spread;
          tier = advanced ? 'advanced' : 'core';
        }
        const p = polar(r, a);
        courses.set(id, { id, programId: major.prefix, school: school.name, tier, index: i, angle: a, radius: r, ...p });
      });
    });

    // Graduate programs beyond the school's arc, spread across its sector.
    school.graduate.forEach((grad, k, all) => {
      const angle = mid + (k - (all.length - 1) / 2) * wedge * 1.6;
      programs.set(grad.id, { id: grad.id, school: school.name, angle, kind: 'graduate', courseIds: grad.courseIds, node: polar(RADIAL.graduate, angle) });
    });
  });

  cached = { schools, programs, courses, wedge };
  return cached;
}

// ---------------------------------------------------------------------
// What is drawn, for a state.
// ---------------------------------------------------------------------

// A drawn course: taught, being written (with how far), ready to start, or
// available but held (no teacher free, short of cash, the committee full).
export type DrawnState = 'done' | 'developing' | 'ready' | 'held';

export interface DrawnCourse {
  course: RadialCourse;
  state: DrawnState;
  progress: number;      // 0–1 while developing, 1 when done
}

export type LineKind = 'taught' | 'writing' | 'open';

export interface DrawnProgram {
  program: RadialProgram;
  dark: boolean;         // a course has no instructor (darkness.ts)
  transit: boolean;      // moving halls
  distinguished: boolean;
  done: number;
  total: number;
}

export interface DrawnSchool {
  school: RadialSchool;
  done: number;          // undergraduate courses taught, of `school.courseIds`
  started: boolean;      // a program of it is housed
  distinguished: boolean; // every course of the school taught
}

export interface RadialDrawing {
  courses: Map<string, DrawnCourse>;
  programs: Map<string, DrawnProgram>;
  schools: DrawnSchool[];
  lines: Record<LineKind, string>; // SVG path data per kind
  branches: Map<string, string>;   // each major's own lines, for the program in focus
  extent: number;                  // the outermost drawn radius
  arcRadius: number;               // where the schools' arcs run: just outside the courses drawn
}

function f(n: number): string { return String(Math.round(n * 10) / 10); }
function line(a: RadialPoint, b: RadialPoint): string { return `M${f(a.x)} ${f(a.y)}L${f(b.x)} ${f(b.y)}`; }
function curve(a: RadialPoint, c: RadialPoint, b: RadialPoint): string {
  return `M${f(a.x)} ${f(a.y)}Q${f(c.x)} ${f(c.y)} ${f(b.x)} ${f(b.y)}`;
}

export function drawnState(s: GameState, t: Buildable): DrawnState | null {
  if (t.status === 'done') return 'done';
  if (t.status === 'developing') return 'developing';
  if (t.status !== 'available') return null;
  // `held` is the tab's `blocked` (curriculumFilter.ts's cellState): available,
  // but nothing could start it this week.
  return canStartDevelopment(s, t) ? 'ready' : 'held';
}

function lineKind(state: DrawnState): LineKind {
  return state === 'done' ? 'taught' : state === 'developing' ? 'writing' : 'open';
}

export function radialDrawing(s: GameState): RadialDrawing {
  const layout = radialLayout();
  const lookup = new Map(s.tech.map((t) => [t.id, t]));
  const dark = unstaffedPrograms(s);
  const courses = new Map<string, DrawnCourse>();
  const programs = new Map<string, DrawnProgram>();
  const lines: Record<LineKind, string[]> = { taught: [], writing: [], open: [] };
  const branches = new Map<string, string>();
  let extent: number = RADIAL.seal;

  for (const program of layout.programs.values()) {
    if (!isHoused(s, program.id)) continue;
    let done = 0;
    for (const id of program.courseIds) {
      const t = lookup.get(id);
      if (!t) continue;
      if (t.status === 'done') done += 1;
      const state = drawnState(s, t);
      const course = layout.courses.get(id);
      if (state && course) {
        const progress = state === 'done' ? 1 : state === 'developing' && t.duration > 0 ? 1 - (s.developing[id] ?? t.duration) / t.duration : 0;
        courses.set(id, { course, state, progress: Math.max(0, Math.min(1, progress)) });
        extent = Math.max(extent, course.radius);
      }
    }
    programs.set(program.id, {
      program,
      dark: dark.has(program.id),
      transit: isInTransit(s, program.id),
      distinguished: program.courseIds.length > 0 && done === program.courseIds.length,
      done,
      total: program.courseIds.length,
    });
    if (program.kind === 'graduate') extent = Math.max(extent, RADIAL.graduate);
    if (program.kind !== 'major') continue;

    // The lines of a major's branch, each to a drawn course and in its kind.
    const ids = program.courseIds;
    const mine: string[] = [];
    const put = (kind: LineKind, seg: string) => { lines[kind].push(seg); mine.push(seg); };
    const at = (i: number) => courses.get(ids[i]);
    const entry = at(0);
    if (!entry) continue;
    put(lineKind(entry.state), line(polar(RADIAL.seal, program.angle), entry.course));
    const mid12 = polar((RADIAL.entry + RADIAL.core) / 2, program.angle);
    const mid34 = polar((RADIAL.advanced + RADIAL.capstone) / 2, program.angle);
    for (let i = 1; i <= 4; i++) {
      const c = at(i);
      if (c) put(lineKind(c.state), curve(entry.course, mid12, c.course));
    }
    const advanced = [5, 6, 7, 8].map(at);
    if (advanced.some(Boolean) && program.junction) {
      for (let i = 1; i <= 4; i++) {
        const c = at(i);
        if (c) put('taught', line(c.course, program.junction));
      }
      advanced.forEach((c) => { if (c) put(lineKind(c.state), line(program.junction!, c.course)); });
    }
    const cap = at(ids.length - 1);
    if (cap) {
      for (const c of advanced) if (c) put(lineKind(cap.state), curve(c.course, mid34, cap.course));
    }
    branches.set(program.id, mine.join(''));
  }

  // The schools' arcs run just outside the outermost course drawn, up to the
  // rim, so a young college's drawing is not held small by an empty rim.
  const courseExtent = Math.max(RADIAL.seal, ...[...courses.values()].map((c) => c.course.radius));
  const arcRadius = Math.min(RADIAL.arc, courseExtent + 26);
  const doneIds = new Set(s.tech.filter((t) => t.kind === 'course' && t.status === 'done').map((t) => t.id));
  const schools: DrawnSchool[] = layout.schools.map((school) => {
    const done = school.courseIds.filter((id) => doneIds.has(id)).length;
    const started = [...programs.values()].some((p) => p.program.school === school.name && p.program.kind === 'major');
    if (done > 0) extent = Math.max(extent, arcRadius);
    return { school, done, started, distinguished: school.courseIds.length > 0 && done === school.courseIds.length };
  });

  return {
    courses, programs, schools, extent, arcRadius, branches,
    lines: { taught: lines.taught.join(''), writing: lines.writing.join(''), open: lines.open.join('') },
  };
}

// How far to scale the whole drawing so what is drawn fills the stage: the
// outermost drawn ring (plus the school names) to the edge, never below 1
// and never past a cap that keeps the entry ring legible.
export const MAX_FIT = 2.6;
export function fitScale(extent: number): number {
  const labelRadius = Math.min(RADIAL.label, Math.max(extent + 34, 150));
  return Math.max(1, Math.min(MAX_FIT, (RADIAL.half - 30) / (labelRadius + 24)));
}

// Where a school's name sits: just outside what is drawn, up to its ring.
export function labelRadius(extent: number): number {
  return Math.min(RADIAL.label, Math.max(extent + 34, 150));
}
