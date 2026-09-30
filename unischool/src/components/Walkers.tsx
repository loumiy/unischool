import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { CAMPUS_GRID_HEIGHT, CAMPUS_GRID_WIDTH } from '../state/types';
import type { CampusLayout } from './campusLayout';
import { motifOf } from './buildingSpec';
import { groundSquash, heightScale, projectorFor, type Camera, type Pt } from './isoProjection';
import { RouteTable, doors, pointStop, roadsides, walkGrid, type Entrance, type Stop, type Waypoint } from './walkRoutes';

// Students walking real routes between the buildings they use (ported from
// v2's ambient layer). Drawing only: derived from the campus, never
// simulated, animated on the browser's frame clock with the map's own
// random numbers, and drawn imperatively (one <g> a walker, moved by
// attribute) so a crowd costs React nothing.
//
// Positions are kept in grid space and projected every frame. On the
// canvas map (Plan 83D) the crowd is drawn by the map's canvas, each walker
// inside the scene's depth order, so a building nearer the camera covers a
// figure behind it by being drawn after it, at every frame of a turn too;
// this component moves the crowd and says which doors it holds open
// (`CrowdSink`). On the SVG map (`?map=svg`, until Plan 83E) the figures
// are drawn over the scene, uncut.
//
// The crowd is drawn at the camera the scene has committed, never the
// projection's current one: a turn sets the projection for its next frame
// before the scene has drawn it, and the walkers' loop, on its own frame
// clock, used to read that angle first and draw the crowd displaced a frame
// or more from the scene (the owner's complaint that led Plan 80H to hide
// it through a turn). Now the committed camera is taken with each commit
// (useLayoutEffect) and the crowd is placed for it there and then, so
// through a turn it walks on in view, where it belongs (Plan 82).
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
// the door stands open while it is this close (Plan 48; on the canvas the
// map draws the doors it holds open, Plan 83D).
const DOOR_FADE = 0.35;
const DOOR_OPEN_NEAR = 0.9;
// Screen pixels past the map's edge a walker is still drawn within.
const OFFSCREEN_MARGIN = 24;
// A standing figure's extent about its foot, in screen units at the
// opening view: wide enough for its shadow, tall enough for its head.
export const FIGURE_HALF_W = 5;
export const FIGURE_H = 16;
// How long the paths must stand still before the walkers replan for them.
const PATH_SETTLE_MS = 700;

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
  // On the SVG map: the figure's group, which carries the walk's transform,
  // and its legs (both, as one path). Null on the canvas map.
  mover: SVGGElement | null;
  legs: SVGPathElement | null;
  shirt: string;
  trousers: string;
  moving: boolean;
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

function makeWalker(shirt: string, trousers: string): { mover: SVGGElement; legs: SVGPathElement } {
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
  return { mover: g, legs };
}

// Where a walker stands and how it steps, at a projection: its foot on
// screen (risen by the step's bob), which way it is heading, and the swing.
function poseOf(w: Walker, proj: (col: number, row: number) => Pt, s: number): { x: number; y: number; hx: number; hy: number; swing: number } {
  const len = w.lengths[w.lengths.length - 1];
  const pos = along(w.route, w.lengths, w.u);
  const p = proj(pos.col, pos.row);
  const swing = w.moving ? Math.sin(w.phase) : 0;
  const bob = w.moving ? Math.abs(Math.cos(w.phase)) * STEP_BOB * s : 0;
  let hx = 1;
  let hy = 0;
  if (w.moving) {
    const a = along(w.route, w.lengths, Math.min(len, w.u + 0.1));
    const ahead = proj(a.col, a.row);
    const dx = ahead.x - p.x;
    const dy = ahead.y - p.y;
    const m = Math.hypot(dx, dy);
    if (m > 1e-6) { hx = dx / m; hy = dy / m; }
  }
  return { x: p.x, y: p.y - bob, hx, hy, swing };
}

// The crowd as the canvas map draws it (mapCanvas.ts): where each walker
// stands, how to draw it, and the doors held open, as `${building}|${side}`.
export interface Crowd {
  readonly size: number;
  // Where walker i stands on the grid, and whether it shows at all.
  at(i: number): { col: number; row: number; shown: boolean };
  // Draws walker i onto `ctx`, whose transform is the world's.
  paint(ctx: CanvasRenderingContext2D, i: number, colors: WalkerColors): void;
  readonly held: ReadonlySet<string>;
}
export interface WalkerColors { shadow: string; head: string; legWidth: number }
// Where the canvas map takes the crowd, and hears that it moved.
export interface CrowdSink {
  crowd(c: Crowd | null): void;
  moved(): void;
}

// A figure on a canvas: the same shapes shapeWalker and stepLegs give the
// SVG's, at the pose.
function paintFigure(ctx: CanvasRenderingContext2D, w: Walker, pose: ReturnType<typeof poseOf>, s: number, c: WalkerColors): void {
  ctx.globalAlpha = w.opacity;
  const { x, y } = pose;
  ctx.fillStyle = c.shadow;
  ctx.beginPath();
  ctx.ellipse(x, y, 4.2, 4.2 * groundSquash(), 0, 0, Math.PI * 2);
  ctx.fill();
  const hip = -HIP * s - 0.4;
  const apart = 1.25;
  const reach = pose.swing * s * STEP_SWING;
  const fx = pose.hx * reach;
  const fy = pose.hy * reach * 0.5;
  ctx.strokeStyle = w.trousers;
  ctx.lineWidth = c.legWidth;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - apart, y + hip); ctx.lineTo(x - apart + fx, y + fy);
  ctx.moveTo(x + apart, y + hip); ctx.lineTo(x + apart - fx, y - fy);
  ctx.stroke();
  const half = 3.1 * (1 + (1 - s) * 0.55);
  ctx.fillStyle = w.shirt;
  ctx.beginPath();
  ctx.moveTo(x - half, y - HIP * s);
  ctx.lineTo(x - half, y - 8.5 * s);
  ctx.quadraticCurveTo(x, y - 11 * s, x + half, y - 8.5 * s);
  ctx.lineTo(x + half, y - HIP * s);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = c.head;
  ctx.beginPath();
  ctx.arc(x, y - 12.6 * s, 3 * (1 + (1 - s) * 0.18), 0, Math.PI * 2);
  ctx.fill();
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

export default function Walkers({ layout, students, gait, camera, turning, sink }: {
  layout: CampusLayout;
  students: number;
  // The clock's pace as a multiple of Play; 0 while paused.
  gait: number;
  camera: Camera;
  // A quarter turn is being animated (CampusMap's turnBy).
  turning: boolean;
  // The canvas map, which draws the crowd; none on the SVG map.
  sink?: CrowdSink;
}) {
  const layerRef = useRef<SVGGElement>(null);
  const walkersRef = useRef<Walker[]>([]);
  // The layout the routes are planned on. A building or a tree moves them
  // at once; a path waits until the drawing stops (Plan 62: every tile of a
  // stroke replanned the whole crowd, and it stood still while it waited).
  const [routeLayout, setRouteLayout] = useState(layout);
  useEffect(() => {
    if (layout === routeLayout) return undefined;
    if (layout.massKey !== routeLayout.massKey) { setRouteLayout(layout); return undefined; }
    const timer = setTimeout(() => setRouteLayout(layout), PATH_SETTLE_MS);
    return () => clearTimeout(timer);
  }, [layout, routeLayout]);
  const randomRef = useRef(rng(0x5eed));
  // In tens past the first few dozen: a week that loses a student must not
  // rebuild the crowd and its routes.
  const count = walkerCount(students);
  const want = count < 30 ? count : Math.round(count / 10) * 10;
  // Read inside the frame loop, so a change of speed changes the pace of the
  // walk in progress rather than rebuilding the crowd.
  const gaitRef = useRef(gait);
  gaitRef.current = Math.min(MAX_GAIT, gait);
  // What the camera decides, kept apart from the routes (Plan 37): how tall
  // a figure stands at this tilt. A turn changes it every frame; it must
  // not send every walker back to re-plan its way.
  const figureRef = useRef(figureScale());
  // Set when the camera moves: the doors the scene drew are new ones.
  const doorsStaleRef = useRef(false);
  const sinkRef = useRef(sink);
  sinkRef.current = sink;
  // The camera the scene has committed, and its projection: what the crowd
  // is drawn at (see the top of this file).
  const camRef = useRef(camera);
  const projRef = useRef(projectorFor(camera));
  const turningRef = useRef(turning);
  // Places every walker for the committed camera at once, set by the frame
  // loop's effect.
  const placeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const layer = layerRef.current;
    const canvas = !!sinkRef.current;
    if (!layer && !canvas) return;
    const random = randomRef.current;
    const input = { placements: routeLayout.placements, tech: routeLayout.placed.map((e) => e.t), pathways: routeLayout.pathways };
    const grid = walkGrid(input);
    // A sports ground or a village green has no wall to go in by: a walker
    // stops at its edge, in the open.
    const open = new Set(routeLayout.placed.filter((e) => motifOf(e.t) === 'grounds' || motifOf(e.t) === 'village').map((e) => e.t.id));
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
    while (walkers.length > want) walkers.pop()!.mover?.remove();
    while (walkers.length < want) {
      const shirt = SHIRTS[Math.floor(random() * SHIRTS.length)];
      const trousers = TROUSERS[Math.floor(random() * TROUSERS.length)];
      const made = layer && !canvas ? makeWalker(shirt, trousers) : { mover: null, legs: null };
      if (made.mover) layer?.append(made.mover);
      const start = pickStop(null) ?? edges[0];
      const door = start.entrances[0];
      walkers.push({
        ...made, shirt, trousers, moving: false, route: [door.face], lengths: [0], u: 0,
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

    // The doors held open this frame, by building and wall: on the SVG map
    // set on the scene's own door groups (buildingMotifs' Door) as a class;
    // on the canvas map handed to the map, which draws them open.
    const world = (layer?.parentNode ?? null) as Element | null;
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
      if (canvas) { held = next; return; }
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
    const svg = layer?.ownerSVGElement ?? null;
    const view = { x0: -Infinity, y0: -Infinity, x1: Infinity, y1: Infinity };
    // The canvas's size is read only while the camera rests: through a
    // turn, reading it would lay out a scene the turn has just redrawn.
    const size = { w: 0, h: 0 };
    const readView = () => {
      const m = /translate\((-?[\d.e-]+)[ ,](-?[\d.e-]+)\) scale\(([\d.e-]+)\)/.exec((world as Element | null)?.getAttribute('transform') ?? '');
      if (!m || !svg) return;
      if (!turningRef.current || size.w === 0) { size.w = svg.clientWidth; size.h = svg.clientHeight; }
      const tx = Number(m[1]);
      const ty = Number(m[2]);
      const k = Number(m[3]) || 1;
      const margin = OFFSCREEN_MARGIN / k + FIGURE_H * 2;
      view.x0 = -tx / k - margin;
      view.y0 = -ty / k - margin;
      view.x1 = (size.w - tx) / k + margin;
      view.y1 = (size.h - ty) / k + margin;
    };

    let frame = 0;
    let last = performance.now();
    // One walker drawn on the SVG map at the committed camera: moved and
    // stepping. (The canvas map draws the crowd itself, from `crowd`.)
    const draw = (w: Walker, all: boolean) => {
      if (!w.mover || !w.legs || w.opacity === 0) return;
      const s = figureRef.current;
      const pose = poseOf(w, projRef.current, s);
      if (!all && (pose.x < view.x0 || pose.x > view.x1 || pose.y < view.y0 || pose.y > view.y1)) return;
      // The step: the feet swing along the way it is going, and it rises
      // a little on each.
      stepLegs(w.legs, pose.swing * s, pose.hx, pose.hy, s);
      w.mover.setAttribute('transform', `translate(${pose.x.toFixed(1)},${pose.y.toFixed(1)})`);
    };
    const crowd: Crowd = {
      get size() { return walkers.length; },
      at(i) {
        const w = walkers[i]!;
        const pos = along(w.route, w.lengths, w.u);
        return { col: pos.col, row: pos.row, shown: w.opacity > 0 };
      },
      paint(ctx, i, colors) {
        const w = walkers[i]!;
        const s = figureRef.current;
        paintFigure(ctx, w, poseOf(w, projRef.current, s), s, colors);
      },
      get held() { return held; },
    };
    if (canvas) sinkRef.current?.crowd(crowd);
    // The whole crowd placed for a camera just committed, off screen too.
    placeRef.current = () => {
      if (canvas) { sinkRef.current?.moved(); return; }
      for (const w of walkers) draw(w, true);
    };
    const step = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      table.grow(1);
      if (!canvas) readView();
      const nextHeld = new Set<string>();
      let changed = false;
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
        // Faded into a wall at either end; hidden while it rests inside.
        const o = len > 0
          ? doorOpacity(w.u, len, !!w.exit?.side, !!w.entry?.side)
          : (w.inside ? 0 : 1);
        const oq = Math.round(o * 20) / 20;
        if (oq !== w.opacity) {
          w.opacity = oq;
          w.mover?.setAttribute('opacity', String(oq));
          changed = true;
        }
        if (moving !== w.moving) changed = true;
        w.moving = moving;
        changed ||= moving;
        for (const k of doorsHeld(w.u, len, doorKey(w.exitId, w.exit), doorKey(w.entryId, w.entry))) nextHeld.add(k);
        // Through a turn the crowd is drawn with each commit of the scene
        // (placeRef, below), at the angle that commit draws; here it only
        // walks on.
        if (!turningRef.current && !canvas) draw(w, false);
      }
      // After a turn the scene's doors are redrawn for the new walls in
      // view: open them afresh.
      const redraw = doorsStaleRef.current;
      doorsStaleRef.current = false;
      if (redraw || nextHeld.size !== held.size || [...nextHeld].some((k) => !held.has(k))) {
        setDoors(nextHeld, redraw);
        changed = true;
      }
      if (canvas && changed) sinkRef.current?.moved();
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(frame);
      placeRef.current = null;
      setDoors(new Set(), true);
      if (canvas) sinkRef.current?.crowd(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeLayout, want]);

  // The committed camera, taken with the commit that draws the scene at it,
  // and the crowd placed for it before the frame is painted: through a
  // turn, walker and scene always share one angle (Plan 82).
  turningRef.current = turning;
  useLayoutEffect(() => {
    camRef.current = camera;
    projRef.current = projectorFor(camera);
    placeRef.current?.();
  }, [camera]);

  // The camera's part: each walker's figure answers the tilt.
  useEffect(() => {
    if (turning) return;
    figureRef.current = figureScale();
    for (const w of walkersRef.current) if (w.mover) shapeWalker(w.mover);
    doorsStaleRef.current = true;
    placeRef.current?.();
  }, [layout, camera, want, turning]);

  return sink ? null : <g ref={layerRef} className="campus-walkers" aria-hidden="true" />;
}
