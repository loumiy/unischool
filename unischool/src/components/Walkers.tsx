import { useEffect, useRef } from 'react';
import { CAMPUS_GRID_HEIGHT, CAMPUS_GRID_WIDTH } from '../state/types';
import type { CampusLayout } from './campusLayout';
import { drawnHeightOf } from './buildingMotifs';
import { motifOf } from './buildingSpec';
import { boxFaces, cameraAxes, groundSquash, heightScale, project, type Camera, type Pt } from './isoProjection';
import { RouteTable, doors, pointStop, roadsides, walkGrid, type Entrance, type Stop, type Waypoint } from './walkRoutes';

// Students walking real routes between the buildings they use (ported from
// v2's ambient layer). Drawing only: derived from the campus, never
// simulated, animated on the browser's frame clock with the map's own
// random numbers, and drawn imperatively (one <g> a walker, moved by
// attribute) so a crowd costs React nothing.
//
// Positions are kept in grid space and projected every frame, so a walker
// stays on its path when the camera turns. A building nearer the camera
// cuts a walker behind it by its outline (a clip), so a figure slides behind
// a wall rather than popping out of sight.
//
// A walk runs door to door (walkRoutes.ts): out of the wall at one end and
// into it at the other, fading as it passes through. A door in view opens
// while someone is on its step (Plan 48).

// How many walk: a crowd that grows slower than the student body, about 20
// at 500 students and about 400 at 40,000, capped for the frame budget.
export const MAX_WALKERS = 400;
export function walkerCount(students: number): number {
  if (students <= 0) return 0;
  return Math.min(MAX_WALKERS, Math.max(3, Math.round(0.285 * students ** 0.684)));
}

// Tiles a second at Play; faster speeds walk faster, to a limit. Each
// walker keeps its own pace, a little either side.
const WALK_SPEED = 1.35;
const PACE_SPREAD = 0.15;
const MAX_GAIT = 8;
const LINGER_MS = [600, 2600] as const;
const SHIRTS = ['#c94b4b', '#3d6a9c', '#e0b64a', '#5b8a5b', '#8c5a9c', '#e88a4a', '#f2ede2'];
const TROUSERS = ['#34363f', '#4a4f5c', '#5b4a3a', '#2f3b4f', '#6b6a64'];
const SVG_NS = 'http://www.w3.org/2000/svg';

// The gait: two steps to a stride, about three steps a tile, the feet
// swinging along the way the walker is heading and the body rising a little
// on each step.
const STRIDE_PER_TILE = Math.PI * 1.5;
const STEP_SWING = 1.9;
const STEP_BOB = 0.7;
// A walker fades through a door over its last (or first) part of a tile, and
// the door stands open while it is this close.
const DOOR_FADE = 0.35;
const DOOR_OPEN_NEAR = 0.9;
// Screen pixels past the map's edge a walker is still drawn within.
const OFFSCREEN_MARGIN = 24;

// The map's own randomness (mulberry32), never the sim's stream.
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Walker {
  el: SVGGElement;     // the outermost group: what is appended and removed
  mover: SVGGElement;  // carries the walk's transform
  legs: SVGPathElement;  // both, as one path
  // Nested groups, outermost first, each able to carry one building's
  // outline: a figure behind two buildings is cut by both (Plan 42).
  clips: SVGGElement[];
  clipIds: (string | null)[];
  route: Waypoint[];
  lengths: number[];   // cumulative, in tiles
  u: number;           // distance along the route
  at: Stop;            // where it is, or where it is headed
  exit: Entrance | null;
  entry: Entrance | null;
  exitId: string | null;
  entryId: string | null;
  inside: boolean;     // resting behind a door, out of sight
  pace: number;        // this walker's share of WALK_SPEED
  phase: number;       // the gait, in radians
  opacity: number;
  waitUntil: number;
}

export interface Silhouette {
  col: number; row: number; w: number; h: number;
  minX: number; maxX: number; minY: number; maxY: number;
  hull: Pt[];
}

// The convex hull of a projected box is its outline on screen.
function hullOf(pts: Pt[]): Pt[] {
  const ps = [...pts].sort((a, b) => a.x - b.x || a.y - b.y);
  const cross = (o: Pt, a: Pt, b: Pt) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const half = (input: Pt[]) => {
    const out: Pt[] = [];
    for (const q of input) {
      while (out.length >= 2 && cross(out[out.length - 2], out[out.length - 1], q) <= 0) out.pop();
      out.push(q);
    }
    out.pop();
    return out;
  };
  return [...half(ps), ...half([...ps].reverse())];
}

function silhouettes(layout: CampusLayout): Silhouette[] {
  const out: Silhouette[] = [];
  for (const { t, p, developing } of layout.placed) {
    if (motifOf(t) === 'grounds') continue;
    out.push(silhouetteOf(p.col, p.row, p.w, p.h, drawnHeightOf(t, developing, layout.vernacular)));
  }
  return out;
}

// A box's outline on screen at the current camera.
export function silhouetteOf(col: number, row: number, w: number, h: number, height: number): Silhouette {
  const pts = [...boxFaces(col, row, w, h, 0, height).top, ...boxFaces(col, row, w, h, 0, 0).top];
  return {
    col, row, w, h,
    minX: Math.min(...pts.map((q) => q.x)), maxX: Math.max(...pts.map((q) => q.x)),
    minY: Math.min(...pts.map((q) => q.y)), maxY: Math.max(...pts.map((q) => q.y)),
    hull: hullOf(pts),
  };
}

// Is the building nearer the camera than a walker at this point? The
// relation depthSort.ts paints by, for a point rather than a box.
export function nearerThanWalker(s: Silhouette, wc: number, wr: number, sinA: number, cosA: number): boolean {
  if (s.col >= wc) return sinA > 0;
  if (wc >= s.col + s.w) return sinA < 0;
  if (s.row >= wr) return cosA > 0;
  if (wr >= s.row + s.h) return cosA < 0;
  return false;
}

const CLIP_FIELD = 1e5;
const clipName = (i: number) => `walker-behind-${i}`;

// A standing figure's extent about its foot, in screen units at the
// opening view (shapeWalker): wide enough for its shadow, tall enough for
// its head.
const FIGURE_HALF_W = 5;
const FIGURE_H = 16;
export const MAX_CLIPS = 3;

function insideHull(h: Pt[], x: number, y: number): boolean {
  let pos = 0;
  let neg = 0;
  for (let i = 0; i < h.length; i++) {
    const a = h[i];
    const b = h[(i + 1) % h.length];
    const c = (b.x - a.x) * (y - a.y) - (b.y - a.y) * (x - a.x);
    if (c > 0) pos++;
    else if (c < 0) neg++;
    if (pos > 0 && neg > 0) return false;
  }
  return true;
}

// The buildings that hide some of a figure standing at `pos` (grid) whose
// foot is at `p` (screen): nearer the camera, and with an outline over the
// figure. Plan 42: this was the first nearer building whose box came within
// twenty units, which could name one that covered nothing and leave the one
// that did unapplied, so the walker was drawn over it.
export function coveringBuildings(shapes: readonly Silhouette[], p: Pt, pos: { col: number; row: number }, sinA: number, cosA: number, figureH = FIGURE_H): number[] {
  const out: number[] = [];
  const top = p.y - figureH;
  for (let i = 0; i < shapes.length && out.length < MAX_CLIPS; i++) {
    const s = shapes[i];
    if (p.x + FIGURE_HALF_W < s.minX || p.x - FIGURE_HALF_W > s.maxX) continue;
    if (p.y < s.minY || top > s.maxY) continue;
    if (!nearerThanWalker(s, pos.col, pos.row, sinA, cosA)) continue;
    // Some of the figure inside the outline: its foot, waist, head or
    // shoulders, or a corner of the outline inside the figure's box.
    const probes: [number, number][] = [
      [p.x, p.y], [p.x, p.y - figureH * 0.5], [p.x, top],
      [p.x - FIGURE_HALF_W, p.y - figureH * 0.6], [p.x + FIGURE_HALF_W, p.y - figureH * 0.6],
    ];
    const covers = probes.some(([x, y]) => insideHull(s.hull, x, y))
      || s.hull.some((q) => q.x >= p.x - FIGURE_HALF_W && q.x <= p.x + FIGURE_HALF_W && q.y >= top && q.y <= p.y);
    if (covers) out.push(i);
  }
  return out;
}

// One clipPath per building: the whole field with its outline punched out.
function writeClips(layer: SVGGElement, shapes: Silhouette[]): void {
  let defs = layer.querySelector('defs');
  if (!defs) {
    defs = document.createElementNS(SVG_NS, 'defs');
    layer.prepend(defs);
  }
  defs.textContent = '';
  const field = `M${-CLIP_FIELD},${-CLIP_FIELD} H${CLIP_FIELD} V${CLIP_FIELD} H${-CLIP_FIELD} Z`;
  shapes.forEach((s, i) => {
    const cp = document.createElementNS(SVG_NS, 'clipPath');
    cp.setAttribute('id', clipName(i));
    cp.setAttribute('clipPathUnits', 'userSpaceOnUse');
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('clip-rule', 'evenodd');
    path.setAttribute('d', `${field} ${s.hull.map((q, j) => `${j === 0 ? 'M' : 'L'}${q.x.toFixed(1)},${q.y.toFixed(1)}`).join(' ')} Z`);
    cp.append(path);
    defs.append(cp);
  });
}

// A figure stands up, so it answers the tilt like the trees do: squatter and
// broader as the camera looks down, never less than a fifth of its height.
// How tall a figure stands at this tilt, as a share of its opening height.
function figureScale(): number {
  return 0.22 + 0.78 * Math.max(0, Math.min(1, heightScale()));
}

// The figure's hips, as a share of its opening height: the legs below,
// the shirt above.
const HIP = 3.8;
const n2 = (v: number) => v.toFixed(2);

function shapeWalker(g: SVGGElement): void {
  const s = figureScale();
  // The shadow is a circle on the ground, as squashed as the ground is: a
  // 2:1 ellipse at the opening camera, round looking straight down.
  g.querySelector('.walker-shadow')?.setAttribute('ry', (4.2 * groundSquash()).toFixed(2));
  const half = 3.1 * (1 + (1 - s) * 0.55);
  g.querySelector('.walker-body')?.setAttribute('d', `M${n2(-half)},${n2(-HIP * s)} L${n2(-half)},${n2(-8.5 * s)} Q0,${n2(-11 * s)} ${n2(half)},${n2(-8.5 * s)} L${n2(half)},${n2(-HIP * s)} Z`);
  const head = g.querySelector('.walker-head');
  head?.setAttribute('cy', n2(-12.6 * s));
  head?.setAttribute('r', n2(3 * (1 + (1 - s) * 0.18)));
}

// The legs at this point of the gait: each from its hip to a foot swung
// along the heading (hx, hy, on screen), the two in opposition. One path
// for both, so a crowd's step is one attribute a walker.
function stepLegs(legs: SVGPathElement, swing: number, hx: number, hy: number, s: number): void {
  const hip = -HIP * s - 0.4;
  const apart = 1.25;
  const reach = swing * STEP_SWING;
  const fx = hx * reach;
  const fy = hy * reach * 0.5;
  legs.setAttribute('d', `M${n2(-apart)},${n2(hip)}L${n2(-apart + fx)},${n2(fy)}M${n2(apart)},${n2(hip)}L${n2(apart - fx)},${n2(-fy)}`);
}

function makeWalker(shirt: string, trousers: string): { el: SVGGElement; mover: SVGGElement; legs: SVGPathElement; clips: SVGGElement[] } {
  const g = document.createElementNS(SVG_NS, 'g');
  g.setAttribute('class', 'walker');
  const shadow = document.createElementNS(SVG_NS, 'ellipse');
  shadow.setAttribute('class', 'walker-shadow');
  shadow.setAttribute('rx', '4.2');
  const legs = document.createElementNS(SVG_NS, 'path');
  legs.setAttribute('class', 'walker-leg');
  legs.setAttribute('stroke', trousers);
  const body = document.createElementNS(SVG_NS, 'path');
  body.setAttribute('class', 'walker-body');
  body.setAttribute('fill', shirt);
  const head = document.createElementNS(SVG_NS, 'circle');
  head.setAttribute('class', 'walker-head');
  g.append(shadow, legs, body, head);
  shapeWalker(g);
  stepLegs(legs, 0, 1, 0, figureScale());
  // The clips are outside the figure: a clip in user space must not move
  // with it.
  const clips = Array.from({ length: MAX_CLIPS }, () => document.createElementNS(SVG_NS, 'g'));
  for (let i = 0; i < MAX_CLIPS - 1; i++) clips[i].append(clips[i + 1]);
  clips[MAX_CLIPS - 1].append(g);
  return { el: clips[0], mover: g, legs, clips };
}

function measure(route: Waypoint[]): number[] {
  const out = [0];
  for (let i = 1; i < route.length; i++) out.push(out[i - 1] + Math.hypot(route[i].col - route[i - 1].col, route[i].row - route[i - 1].row));
  return out;
}

// How far a walker has faded into a wall: 1 in the open, 0 behind a door.
export function doorOpacity(u: number, total: number, fromDoor: boolean, toDoor: boolean): number {
  let o = 1;
  if (fromDoor) o = Math.min(o, u / DOOR_FADE);
  if (toDoor) o = Math.min(o, (total - u) / DOOR_FADE);
  return Math.max(0, Math.min(1, o));
}

// The doors a walker holds open: the one it just came out of, while it is
// still on the step, and the one it is about to go in by.
export function doorsHeld(u: number, total: number, exit: string | null, entry: string | null): string[] {
  const out: string[] = [];
  if (total <= 0) return out;
  if (exit && u < DOOR_OPEN_NEAR) out.push(exit);
  if (entry && u < total && total - u < DOOR_OPEN_NEAR) out.push(entry);
  return out;
}

const doorKey = (id: string | null, e: Entrance | null) => (id && e?.side ? `${id}|${e.side}` : null);

function along(route: Waypoint[], lengths: number[], u: number): Waypoint {
  const total = lengths[lengths.length - 1] ?? 0;
  if (total === 0 || u <= 0) return route[0];
  if (u >= total) return route[route.length - 1];
  let i = 1;
  while (lengths[i] < u) i++;
  const a = route[i - 1];
  const b = route[i];
  const t = (u - lengths[i - 1]) / (lengths[i] - lengths[i - 1]);
  return { col: a.col + (b.col - a.col) * t, row: a.row + (b.row - a.row) * t };
}

export default function Walkers({ layout, students, gait, camera }: {
  layout: CampusLayout;
  students: number;
  // The clock's pace as a multiple of Play; 0 while paused.
  gait: number;
  camera: Camera;
}) {
  const layerRef = useRef<SVGGElement>(null);
  const walkersRef = useRef<Walker[]>([]);
  const randomRef = useRef(rng(0x5eed));
  // In tens past the first few dozen: a week that loses a student must not
  // rebuild the crowd and its routes.
  const count = walkerCount(students);
  const want = count < 30 ? count : Math.round(count / 10) * 10;
  // Read inside the frame loop, so a change of speed changes the pace of the
  // walk in progress rather than rebuilding the crowd.
  const gaitRef = useRef(gait);
  gaitRef.current = Math.min(MAX_GAIT, gait);
  // What the camera decides, kept apart from the routes (Plan 37): the
  // buildings' outlines the walkers are clipped by, and which way is nearer.
  // A turn changes these every frame; it must not send every walker back to
  // re-plan its way.
  const shapesRef = useRef<ReturnType<typeof silhouettes>>([]);
  const axRef = useRef(cameraAxes());
  const figureRef = useRef(figureScale());
  // Set when the camera moves: the doors the scene drew are new ones.
  const doorsStaleRef = useRef(false);

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    const random = randomRef.current;
    const input = { placements: layout.placements, tech: layout.placed.map((e) => e.t), pathways: layout.pathways };
    const grid = walkGrid(input);
    // A sports ground or a village green has no wall to go in by: a walker
    // stops at its edge, in the open.
    const open = new Set(layout.placed.filter((e) => motifOf(e.t) === 'grounds' || motifOf(e.t) === 'village').map((e) => e.t.id));
    const stops = doors(input, grid).map((st) => (st.id && open.has(st.id)
      ? { ...st, entrances: st.entrances.map((e) => ({ ...e, face: { col: e.col + 0.5, row: e.row + 0.5 }, side: null })) }
      : st));
    const byKey = new Map(stops.map((st) => [st.key, st]));
    const edges = roadsides();
    const table = new RouteTable(grid);
    const walkable = (c: number, r: number) => c >= 0 && r >= 0 && c < CAMPUS_GRID_WIDTH && r < CAMPUS_GRID_HEIGHT && grid[r * CAMPUS_GRID_WIDTH + c] > 0;
    const roadside = () => edges[Math.floor(random() * edges.length)];

    // Somewhere to go: a building, by weight, or the road one time in five.
    const pickStop = (notAt: Stop | null): Stop | null => {
      const pool = stops.filter((d) => !notAt || d.key !== notAt.key);
      if (pool.length === 0 || random() < 0.2) return roadside() ?? null;
      let pick = random() * pool.reduce((t, d) => t + d.weight, 0);
      for (const d of pool) {
        pick -= d.weight;
        if (pick <= 0) return d;
      }
      return pool[pool.length - 1];
    };
    // Off to somewhere new. A route whose tree is not grown yet waits a
    // frame or two at the door.
    const setOff = (w: Walker, now: number): void => {
      const from = w.at;
      const to = pickStop(from);
      if (!to) return;
      const walk = table.walk(from, to);
      if (walk === undefined) { w.waitUntil = now + 100; return; }
      if (walk === null || walk.route.length < 2) {
        // Somewhere unreachable from here: start again from the road.
        w.at = roadside();
        w.route = [w.at.entrances[0].face];
        w.lengths = [0];
        w.u = 0;
        w.inside = false;
        w.waitUntil = now + 100;
        return;
      }
      w.route = walk.route;
      w.lengths = measure(walk.route);
      w.u = 0;
      w.exit = walk.exit;
      w.entry = walk.entry;
      w.exitId = from.id;
      w.entryId = to.id;
      w.at = to;
    };

    const walkers = walkersRef.current;
    while (walkers.length > want) walkers.pop()!.el.remove();
    while (walkers.length < want) {
      const made = makeWalker(SHIRTS[Math.floor(random() * SHIRTS.length)], TROUSERS[Math.floor(random() * TROUSERS.length)]);
      layer.append(made.el);
      const start = pickStop(null) ?? edges[0];
      const door = start.entrances[0];
      walkers.push({
        ...made, clipIds: made.clips.map(() => null), route: [door.face], lengths: [0], u: 0,
        at: start, exit: null, entry: null, exitId: null, entryId: null, inside: door.side !== null,
        pace: 1 - PACE_SPREAD + random() * PACE_SPREAD * 2, phase: random() * Math.PI * 2, opacity: -1,
        waitUntil: performance.now() + random() * 1500,
      });
    }
    // A new campus: every walker keeps its place and finds its way again.
    // One on its way sets off afresh from where it stands; one at rest
    // leaves from where it rests, or from where its building stood.
    for (const w of walkers) {
      const total = w.lengths[w.lengths.length - 1];
      const pos = along(w.route, w.lengths, w.u);
      const c = Math.floor(pos.col);
      const r = Math.floor(pos.row);
      if (w.u < total) {
        w.inside = false;
        if (walkable(c, r)) {
          const here = pointStop(c, r);
          w.at = { ...here, entrances: [{ ...here.entrances[0], face: pos }] };
        }
      } else {
        const same = w.at.id ? byKey.get(w.at.key) : undefined;
        if (same) w.at = same;
        else if (w.at.id) {
          const e = w.at.entrances[0];
          w.at = walkable(e.col, e.row) ? pointStop(e.col, e.row) : roadside();
          w.inside = false;
        }
      }
      w.route = [pos];
      w.lengths = [0];
      w.u = 0;
      w.exit = w.entry = null;
      w.exitId = w.entryId = null;
    }

    // The doors held open this frame, by building and wall, set on the
    // scene's own door groups (buildingMotifs' Door) as a class.
    const world = layer.parentNode as Element | null;
    let held = new Set<string>();
    // Found once and kept until the scene redraws its doors (a turn), so a
    // door's opening never searches the whole scene.
    const found = new Map<string, Element[]>();
    const doorEls = (key: string): Element[] => {
      const known = found.get(key);
      if (known && known.every((el) => el.isConnected)) return known;
      const [id, side] = key.split('|');
      const building = world?.querySelector(`.campus-building[data-building="${CSS.escape(id)}"]`);
      const els = building ? [...building.querySelectorAll(`.iso-door-way[data-door="${side}"]`)] : [];
      found.set(key, els);
      return els;
    };
    const setDoors = (next: Set<string>, all: boolean) => {
      if (all) {
        found.clear();
        world?.querySelectorAll('.iso-door-way.door-open').forEach((el) => el.classList.remove('door-open'));
      }
      else for (const k of held) if (!next.has(k)) doorEls(k).forEach((el) => el.classList.remove('door-open'));
      for (const k of next) if (all || !held.has(k)) doorEls(k).forEach((el) => el.classList.add('door-open'));
      held = next;
    };

    // What is on screen, in the world's units, read off the pan and zoom
    // CampusMap writes on the world group: a walker outside it (with a
    // margin wider than a figure) is not drawn this frame, and is where it
    // was last drawn, out of sight.
    const svg = layer.ownerSVGElement;
    const view = { x0: -Infinity, y0: -Infinity, x1: Infinity, y1: Infinity };
    const readView = () => {
      const m = /translate\((-?[\d.e-]+)[ ,](-?[\d.e-]+)\) scale\(([\d.e-]+)\)/.exec((world as Element | null)?.getAttribute('transform') ?? '');
      if (!m || !svg) return;
      const tx = Number(m[1]);
      const ty = Number(m[2]);
      const k = Number(m[3]) || 1;
      const margin = OFFSCREEN_MARGIN / k + FIGURE_H * 2;
      view.x0 = -tx / k - margin;
      view.y0 = -ty / k - margin;
      view.x1 = (svg.clientWidth - tx) / k + margin;
      view.y1 = (svg.clientHeight - ty) / k + margin;
    };

    let frame = 0;
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      table.grow(1);
      readView();
      const s = figureRef.current;
      const nextHeld = new Set<string>();
      for (const w of walkers) {
        const total = w.lengths[w.lengths.length - 1];
        let moving = false;
        if (gaitRef.current > 0) {
          if (w.u >= total) {
            if (now >= w.waitUntil) setOff(w, now);
          } else {
            const du = WALK_SPEED * w.pace * gaitRef.current * dt;
            w.u = Math.min(total, w.u + du);
            w.phase = (w.phase + du * STRIDE_PER_TILE) % (Math.PI * 2);
            moving = true;
            if (w.u >= total) {
              w.waitUntil = now + LINGER_MS[0] + random() * (LINGER_MS[1] - LINGER_MS[0]);
              w.inside = !!w.entry?.side;
            }
          }
        }
        const len = w.lengths[w.lengths.length - 1];
        const pos = along(w.route, w.lengths, w.u);
        const p = project(pos.col, pos.row);
        // Faded into a wall at either end; hidden while it rests inside.
        const o = len > 0
          ? doorOpacity(w.u, len, !!w.exit?.side, !!w.entry?.side)
          : (w.inside ? 0 : 1);
        const oq = Math.round(o * 20) / 20;
        if (oq !== w.opacity) {
          w.opacity = oq;
          w.mover.setAttribute('opacity', String(oq));
        }
        for (const k of doorsHeld(w.u, len, doorKey(w.exitId, w.exit), doorKey(w.entryId, w.entry))) nextHeld.add(k);
        if (oq === 0) continue;
        if (p.x < view.x0 || p.x > view.x1 || p.y < view.y0 || p.y > view.y1) continue;
        // The step: the feet swing along the way it is going, and it rises
        // a little on each.
        const swing = moving ? Math.sin(w.phase) : 0;
        const bob = moving ? Math.abs(Math.cos(w.phase)) * STEP_BOB * s : 0;
        let hx = 1;
        let hy = 0;
        if (moving) {
          const a = along(w.route, w.lengths, Math.min(len, w.u + 0.1));
          const ahead = project(a.col, a.row);
          const dx = ahead.x - p.x;
          const dy = ahead.y - p.y;
          const m = Math.hypot(dx, dy);
          if (m > 1e-6) { hx = dx / m; hy = dy / m; }
        }
        stepLegs(w.legs, swing * s, hx, hy, s);
        w.mover.setAttribute('transform', `translate(${p.x.toFixed(1)},${(p.y - bob).toFixed(1)})`);
        // Every building between this walker and the camera cuts it.
        const ax = axRef.current;
        const cover = coveringBuildings(shapesRef.current, p, pos, ax.sinA, ax.cosA, FIGURE_H * s);
        for (let k = 0; k < MAX_CLIPS; k++) {
          const id = k < cover.length ? `url(#${clipName(cover[k])})` : null;
          if (w.clipIds[k] === id) continue;
          if (id) w.clips[k].setAttribute('clip-path', id);
          else w.clips[k].removeAttribute('clip-path');
          w.clipIds[k] = id;
        }
      }
      // After a turn the scene's doors are redrawn for the new walls in
      // view: open them afresh.
      const redraw = doorsStaleRef.current;
      doorsStaleRef.current = false;
      if (redraw || nextHeld.size !== held.size || [...nextHeld].some((k) => !held.has(k))) setDoors(nextHeld, redraw);
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(frame);
      setDoors(new Set(), true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout, want]);

  // The camera's part: each walker's figure answers the tilt, and the
  // outlines that clip them are rebuilt for the view, through a turn too
  // (Plan 42: Plan 37 dropped them mid-turn, and a turn's walkers were drawn
  // over the buildings in front of them).
  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    for (const w of walkersRef.current) shapeWalker(w.mover);
    doorsStaleRef.current = true;
    axRef.current = cameraAxes();
    figureRef.current = figureScale();
    shapesRef.current = silhouettes(layout);
    writeClips(layer, shapesRef.current);
  }, [layout, camera, want]);

  return <g ref={layerRef} className="campus-walkers" aria-hidden="true" />;
}
