import * as React from 'react';
import { PointList, setRawPoints } from './isoProjection';

// The canvas painter (Plan 83B's prototype, the map's renderer since 83C).
// It walks the element tree the map's art returns (the same components the
// SVG map renders) and draws it on a 2D canvas, instead of handing it to
// React DOM to build ~17,000 SVG nodes.
//
// - Plain components are called directly. A component that reads a hook
//   (a context, a memo) is registered with its art (`registerArt`): a plain
//   function of its props and the painter's scope, which carries the map's
//   occasions (colors, snow, banner, college name, developing weeks, venue,
//   crowd) as values set by the providers in the tree (`registerProvider`),
//   and keeps memoised values from paint to paint (`scope.keep`). Nothing
//   here reaches into React: elements are read through their public shape
//   (`type`, `props`, `key`).
// - A registered memo keeps its output while its props are unchanged, as
//   React skips it; what it returns is walked again, so the components
//   under it still read the occasions of this paint.
// - Color and stroke come, as in the SVG, from presentation attributes, the
//   stylesheet's class rules (resolved once per chain of classes and season
//   by `StyleResolver`, from probe elements in the map) and inline style, in
//   that order of precedence, inherited down the tree as SVG inherits them.
// - What it draws and can be pointed at is recorded (`HitList`), so the map
//   can pick the building under the pointer as the SVG's hit test did: the
//   topmost shape that takes pointer events, and the building it is in.
// - What it cannot draw it counts by name (`PaintStats.unsupported`).
//
// Browser-only in use (it reads computed style and draws on a canvas); the
// scene test drives it in Node with stand-ins for both.

export interface PaintStats {
  elements: number;
  drawn: number;
  unsupported: Map<string, number>;
}

// --- art: the components the painter calls through a registry -------------

// What a registered art function gets besides its props.
export interface ArtScope {
  // The values the providers above it in the tree set (see
  // registerProvider), by name.
  readonly values: Readonly<Record<string, unknown>>;
  // A value kept for this component, from paint to paint, while `deps` are
  // unchanged (a memo, by another name).
  keep<T>(key: string, deps: readonly unknown[], make: () => T): T;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Art = (props: any, scope: ArtScope) => React.ReactNode;
interface ArtEntry {
  art: Art;
  // Kept while its props are unchanged: true for a shallow comparison, or
  // the component's own comparison.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  memo: boolean | ((a: any, b: any) => boolean);
}
const ARTS = new Map<unknown, ArtEntry>();
const PROVIDERS = new Map<unknown, string>();

// `type` is the component the art's elements name (a function, or what
// React's memo returns); `art` draws it. A memo art must not read
// `scope.values`: its output is kept on its props alone.
export function registerArt(type: unknown, art: Art, memo: ArtEntry['memo'] = false): void {
  ARTS.set(type, { art, memo });
}
// An element of `context` (a provider) sets `name` in the scope's values
// for everything under it.
export function registerProvider(context: unknown, name: string): void {
  PROVIDERS.set(context, name);
  const provider = (context as { Provider?: unknown }).Provider;
  if (provider) PROVIDERS.set(provider, name);
}

// A component's place in the tree, kept from paint to paint as React keeps
// a fiber: by its parent's place, its type, and its key or its order among
// its siblings of that type.
interface Instance {
  kept: Map<string, { deps: readonly unknown[]; value: unknown }>;
  children: Map<string, Instance>;
  gen: number;
  seen: number;
  ordinals: Map<number, number>;
  memoProps?: Record<string, unknown>;
  memoOut?: React.ReactNode;
}
const newInstance = (): Instance => ({ kept: new Map(), children: new Map(), gen: -1, seen: -1, ordinals: new Map() });
const typeIds = new WeakMap<object, number>();
let nextTypeId = 1;
const typeId = (t: object) => {
  let id = typeIds.get(t);
  if (id === undefined) { id = nextTypeId++; typeIds.set(t, id); }
  return id;
};
const depsEqual = (a: readonly unknown[], b: readonly unknown[]) => {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (!Object.is(a[i], b[i])) return false;
  return true;
};
const shallowEqual = (a: Record<string, unknown>, b: Record<string, unknown>) => {
  if (a === b) return true;
  const ka = Object.keys(a);
  if (ka.length !== Object.keys(b).length) return false;
  for (const k of ka) if (!Object.is(a[k], b[k])) return false;
  return true;
};

// --- a 2D affine transform ------------------------------------------------

// [a, b, c, d, e, f], as the canvas and SVG write them.
export type Affine = readonly [number, number, number, number, number, number];
const IDENTITY: Affine = [1, 0, 0, 1, 0, 0];
function mul(m: Affine, n: Affine): Affine {
  return [
    m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5],
  ];
}
function invert(m: Affine): Affine {
  const det = m[0] * m[3] - m[1] * m[2] || 1e-12;
  return [
    m[3] / det, -m[1] / det, -m[2] / det, m[0] / det,
    (m[2] * m[5] - m[3] * m[4]) / det, (m[1] * m[4] - m[0] * m[5]) / det,
  ];
}
const asInit = (m: Affine) => ({ a: m[0], b: m[1], c: m[2], d: m[3], e: m[4], f: m[5] });

// An SVG transform list.
const transformCache = new Map<string, Affine>();
function transformOf(t: string): Affine {
  const hit = transformCache.get(t);
  if (hit) return hit;
  let m: Affine = IDENTITY;
  const re = /(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^)]*)\)/g;
  let x: RegExpExecArray | null;
  while ((x = re.exec(t))) {
    const a = x[2]!.trim().split(/[\s,]+/).map(Number);
    switch (x[1]) {
      case 'matrix': m = mul(m, [a[0]!, a[1]!, a[2]!, a[3]!, a[4]!, a[5]!]); break;
      case 'translate': m = mul(m, [1, 0, 0, 1, a[0] ?? 0, a[1] ?? 0]); break;
      case 'scale': m = mul(m, [a[0] ?? 1, 0, 0, a[1] ?? a[0] ?? 1, 0, 0]); break;
      case 'rotate': {
        const r = ((a[0] ?? 0) * Math.PI) / 180;
        const rot: Affine = [Math.cos(r), Math.sin(r), -Math.sin(r), Math.cos(r), 0, 0];
        m = a.length >= 3 ? mul(mul(mul(m, [1, 0, 0, 1, a[1]!, a[2]!]), rot), [1, 0, 0, 1, -a[1]!, -a[2]!]) : mul(m, rot);
        break;
      }
      case 'skewX': m = mul(m, [1, 0, Math.tan(((a[0] ?? 0) * Math.PI) / 180), 1, 0, 0]); break;
      case 'skewY': m = mul(m, [1, Math.tan(((a[0] ?? 0) * Math.PI) / 180), 0, 1, 0, 0]); break;
    }
  }
  if (transformCache.size > 5000) transformCache.clear();
  transformCache.set(t, m);
  return m;
}

// --- style ------------------------------------------------------------------

interface Paint {
  fill: string;
  stroke: string;
  strokeWidth: number;
  fillOpacity: number;
  strokeOpacity: number;
  dash: number[] | null;
  cap: CanvasLineCap;
  join: CanvasLineJoin;
  evenodd: boolean;
  nonScaling: boolean;
  hidden: boolean;
  // Takes pointer events (CSS pointer-events other than none).
  events: boolean;
}
const INITIAL: Paint = {
  fill: '#000', stroke: 'none', strokeWidth: 1, fillOpacity: 1, strokeOpacity: 1,
  dash: null, cap: 'butt', join: 'miter', evenodd: false, nonScaling: false, hidden: false, events: true,
};

// What a class rule sets on an element: only the properties it changes from
// what the element would have without its own class (so an attribute still
// wins where no rule speaks), plus the element's own opacity and display.
export interface ClassStyle {
  fill?: string; stroke?: string; strokeWidth?: number; fillOpacity?: number; strokeOpacity?: number;
  dash?: number[] | null; cap?: CanvasLineCap; join?: CanvasLineJoin; evenodd?: boolean; nonScaling?: boolean;
  hidden?: boolean; events?: boolean; opacity: number; display: boolean; stopColor?: string;
  // For text: the font and anchoring the rule gives it.
  font?: { family: string; weight: string; spacing: number; anchor: string; baseline: string };
}

// Where class rules and colors come from: the stylesheet, in the browser.
export interface ClassRules {
  // Bumped whenever the rules change (the season, the map's own classes).
  readonly generation: number;
  resolve(chain: readonly { tag: string; cls: string }[], stop?: boolean): ClassStyle;
  color(value: string): string;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

// Class rules resolved from the stylesheet by probing: a chain of elements
// with the same tags and classes as the art's, inside the map, read with
// getComputedStyle, with and without the element's own class.
export class StyleResolver implements ClassRules {
  generation = 0;
  private cache = new Map<string, ClassStyle>();
  // The rules read under each of the map's classes (a tool put away finds
  // its rules as it left them).
  private byRoot = new Map<string, Map<string, ClassStyle>>();
  private colors = new Map<string, string>();
  private root: SVGSVGElement;
  // The map's classes, worn by the probe only while it is read, so nothing
  // else ever finds a second `.campus-map-svg` in the page.
  private rootClass = 'campus-map-svg';
  constructor(host: Element) {
    this.root = document.createElementNS(SVG_NS, 'svg');
    this.root.setAttribute('class', 'campus-map-probe');
    this.root.setAttribute('aria-hidden', 'true');
    this.root.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;visibility:hidden;pointer-events:none';
    host.appendChild(this.root);
  }
  // The season or the theme changed: every rule reads its tokens again.
  reset(): void {
    this.cache.clear();
    this.byRoot.clear();
    this.byRoot.set(this.rootClass, this.cache);
    this.colors.clear();
    this.generation += 1;
  }
  // The map's own classes (placing, inspecting, a path tool), which some
  // rules read; a change reads every rule again.
  setRootClass(cls: string): void {
    const full = `campus-map-svg ${cls}`.trim().replace(/\s+/g, ' ');
    if (this.rootClass === full) return;
    this.byRoot.set(this.rootClass, this.cache);
    this.rootClass = full;
    this.cache = this.byRoot.get(full) ?? new Map();
    this.generation += 1;
  }
  dispose(): void {
    this.root.remove();
  }
  // A color the canvas may not parse (a var() or color-mix()) as rgb().
  color(value: string): string {
    if (/^#|^rgb|^[a-z]+$/i.test(value) && !/^(currentcolor|inherit)$/i.test(value)) return value;
    const hit = this.colors.get(value);
    if (hit) return hit;
    const el = document.createElementNS(SVG_NS, 'path');
    el.style.fill = value;
    this.root.appendChild(el);
    this.root.setAttribute('class', this.rootClass);
    const out = getComputedStyle(el).fill;
    this.root.setAttribute('class', 'campus-map-probe');
    el.remove();
    this.colors.set(value, out);
    return out;
  }
  resolve(chain: readonly { tag: string; cls: string }[], stop = false): ClassStyle {
    const key = `${stop ? 'stop:' : ''}${chain.map((c) => `${c.tag}.${c.cls}`).join('>')}`;
    const hit = this.cache.get(key);
    if (hit) return hit;
    let parent: Element = this.root;
    for (let i = 0; i < chain.length - 1; i++) {
      const el = document.createElementNS(SVG_NS, chain[i]!.tag === 'svg' ? 'g' : chain[i]!.tag);
      if (chain[i]!.cls) el.setAttribute('class', chain[i]!.cls);
      parent.appendChild(el);
      parent = el;
    }
    const own = chain[chain.length - 1]!;
    const withClass = document.createElementNS(SVG_NS, own.tag);
    withClass.setAttribute('class', own.cls);
    const bare = document.createElementNS(SVG_NS, own.tag);
    parent.appendChild(withClass);
    parent.appendChild(bare);
    this.root.setAttribute('class', this.rootClass);
    const a = getComputedStyle(withClass);
    const b = getComputedStyle(bare);
    const out: ClassStyle = { opacity: Number(a.opacity || '1'), display: a.display !== 'none' };
    const differs = (p: string) => a.getPropertyValue(p) !== b.getPropertyValue(p);
    if (differs('fill')) out.fill = a.fill;
    if (differs('stroke')) out.stroke = a.stroke;
    if (differs('stroke-width')) out.strokeWidth = parseFloat(a.strokeWidth);
    if (differs('fill-opacity')) out.fillOpacity = Number(a.fillOpacity);
    if (differs('stroke-opacity')) out.strokeOpacity = Number(a.strokeOpacity);
    if (differs('stroke-dasharray')) out.dash = parseDash(a.strokeDasharray);
    if (differs('stroke-linecap')) out.cap = a.strokeLinecap as CanvasLineCap;
    if (differs('stroke-linejoin')) out.join = a.strokeLinejoin as CanvasLineJoin;
    if (differs('fill-rule')) out.evenodd = a.fillRule === 'evenodd';
    if (differs('vector-effect')) out.nonScaling = a.getPropertyValue('vector-effect') === 'non-scaling-stroke';
    if (differs('visibility')) out.hidden = a.visibility === 'hidden';
    if (differs('pointer-events')) out.events = a.pointerEvents !== 'none';
    if (stop) out.stopColor = a.getPropertyValue('stop-color');
    if (own.tag === 'text') {
      out.font = {
        family: a.fontFamily, weight: a.fontWeight, spacing: (parseFloat(a.letterSpacing) || 0) / (parseFloat(a.fontSize) || 16),
        anchor: a.getPropertyValue('text-anchor'), baseline: a.getPropertyValue('dominant-baseline'),
      };
    }
    this.root.setAttribute('class', 'campus-map-probe');
    let top: Element = withClass;
    while (top.parentNode !== this.root) top = top.parentNode as Element;
    top.remove();
    this.cache.set(key, out);
    return out;
  }
}

function parseDash(v: string | number | undefined | null): number[] | null {
  if (v === undefined || v === null || v === 'none' || v === '') return null;
  const parts = String(v).split(/[\s,]+/).map(parseFloat).filter((n) => Number.isFinite(n));
  return parts.length ? parts : null;
}

// --- geometry ---------------------------------------------------------------

function num(v: unknown, d = 0): number {
  if (v === undefined || v === null || v === '') return d;
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : d;
}

// A shape: a list of points (a polygon, a polyline or a line, traced
// straight onto the context) or a Path2D.
type Shape =
  | { kind: 'pts'; xy: number[]; close: boolean }
  | { kind: 'path'; path: Path2D; d?: string; box?: Box; subs?: { d: string; box: Box }[] | null };
type Box = [number, number, number, number];   // x0, y0, x1, y1

function pointsOf(points: unknown): number[] | null {
  if (points instanceof PointList) {
    const pts = points.pts;
    if (pts.length === 0) return null;
    const out: number[] = [];
    for (const q of pts) out.push(q.x, q.y);
    return out;
  }
  const nums = String(points).trim().split(/[\s,]+/).map(Number);
  return nums.length >= 2 ? nums : null;
}

function shapeOf(tag: string, props: Record<string, unknown>): Shape | null {
  switch (tag) {
    case 'polygon': case 'polyline': {
      const xy = pointsOf(props.points);
      return xy ? { kind: 'pts', xy, close: tag === 'polygon' } : null;
    }
    case 'path': {
      if (!props.d) return null;
      const d = String(props.d);
      return { kind: 'path', path: new Path2D(d), d };
    }
    case 'rect': {
      const path = new Path2D();
      const x = num(props.x); const y = num(props.y); const w = num(props.width); const h = num(props.height);
      const rx = num(props.rx);
      if (rx > 0) path.roundRect(x, y, w, h, rx);
      else path.rect(x, y, w, h);
      return { kind: 'path', path, box: [x, y, x + w, y + h] };
    }
    case 'circle': {
      const path = new Path2D();
      const cx = num(props.cx); const cy = num(props.cy); const r = num(props.r);
      path.arc(cx, cy, r, 0, Math.PI * 2);
      return { kind: 'path', path, box: [cx - r, cy - r, cx + r, cy + r] };
    }
    case 'ellipse': {
      const path = new Path2D();
      const cx = num(props.cx); const cy = num(props.cy); const rx = num(props.rx); const ry = num(props.ry);
      path.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      return { kind: 'path', path, box: [cx - rx, cy - ry, cx + rx, cy + ry] };
    }
    case 'line':
      return { kind: 'pts', xy: [num(props.x1), num(props.y1), num(props.x2), num(props.y2)], close: false };
  }
  return null;
}

function tracePts(ctx: CanvasRenderingContext2D | Path2D, xy: ArrayLike<number>, close: boolean): void {
  ctx.moveTo(xy[0]!, xy[1]!);
  for (let i = 2; i + 1 < xy.length; i += 2) ctx.lineTo(xy[i]!, xy[i + 1]!);
  if (close) ctx.closePath();
}
function asPath(s: Shape): Path2D {
  if (s.kind === 'path') return s.path;
  const p = new Path2D();
  tracePts(p, s.xy, s.close);
  return p;
}

// A shape's box in its own coordinates. A path's is read off its data:
// every point and control point it names, so it holds the curve.
function boxOf(s: Shape): Box {
  if (s.kind === 'pts') {
    let x0 = Infinity; let y0 = Infinity; let x1 = -Infinity; let y1 = -Infinity;
    for (let i = 0; i + 1 < s.xy.length; i += 2) {
      const x = s.xy[i]!; const y = s.xy[i + 1]!;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
    return [x0, y0, x1, y1];
  }
  if (!s.box) s.box = s.d ? boxOfPath(s.d) : [-Infinity, -Infinity, Infinity, Infinity];
  return s.box;
}
// A path's box, from the boxes of its subpaths when it is long (a record
// again after a change meets the same strings: the path network's outline
// changes a subpath or two when a tile is drawn).
function boxOfPath(d: string): Box {
  if (d.length < LONG_PATH) return pathBox(d);
  const subs = splitPath(d);
  if (!subs) return cachedBox(d);
  const b: Box = [Infinity, Infinity, -Infinity, -Infinity];
  for (const q of subs) {
    if (q.box[0] < b[0]) b[0] = q.box[0];
    if (q.box[1] < b[1]) b[1] = q.box[1];
    if (q.box[2] > b[2]) b[2] = q.box[2];
    if (q.box[3] > b[3]) b[3] = q.box[3];
  }
  return b[0] === Infinity ? [0, 0, 0, 0] : b;
}
const LONG_PATH = 4000;
const boxes = new Map<string, Box>();
function cachedBox(d: string): Box {
  let b = boxes.get(d);
  if (!b) {
    if (boxes.size > 20_000) boxes.clear();
    b = pathBox(d);
    boxes.set(d, b);
  }
  return b;
}
// A long path cut at its absolute movetos, when it has no relative one (a
// relative moveto would need the pen's place, so such a path is cut by
// subpathsOf's parse instead).
function splitPath(d: string): { d: string; box: Box }[] | null {
  if (d.includes('m')) return null;
  return d.split(/(?=M)/).filter((q) => q.trim()).map((q) => ({ d: q, box: cachedBox(q) }));
}
export function pathBox(d: string): Box {
  let x0 = Infinity; let y0 = Infinity; let x1 = -Infinity; let y1 = -Infinity;
  const add = (x: number, y: number) => {
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  };
  const re = /([MmLlHhVvCcSsQqTtAaZz])|(-?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?)/g;
  let cmd = 'M'; let args: number[] = [];
  let cx = 0; let cy = 0; let sx = 0; let sy = 0;
  const run = () => {
    const rel = cmd === cmd.toLowerCase();
    const C = cmd.toUpperCase();
    if (C === 'Z') return;
    const n = C === 'H' || C === 'V' ? 1 : C === 'A' ? 7 : C === 'C' ? 6 : C === 'S' || C === 'Q' ? 4 : 2;
    let at = 0;
    while (args.length - at >= n) {
      const a = args.slice(at, at + n);
      at += n;
      const bx = rel ? cx : 0; const by = rel ? cy : 0;
      if (C === 'H') { cx = bx + a[0]!; add(cx, cy); continue; }
      if (C === 'V') { cy = by + a[0]!; add(cx, cy); continue; }
      if (C === 'A') {
        const ex = bx + a[5]!; const ey = by + a[6]!; const r = Math.max(Math.abs(a[0]!), Math.abs(a[1]!));
        add(cx - r, cy - r); add(cx + r, cy + r); add(ex - r, ey - r); add(ex + r, ey + r);
        cx = ex; cy = ey;
        continue;
      }
      for (let i = 0; i < n; i += 2) add(bx + a[i]!, by + a[i + 1]!);
      cx = bx + a[n - 2]!; cy = by + a[n - 1]!;
      if (C === 'M') { sx = cx; sy = cy; }
    }
    args = [];
  };
  let x: RegExpExecArray | null;
  while ((x = re.exec(d))) {
    if (x[1]) {
      run();
      // After a moveto's first pair, further pairs are linetos.
      cmd = x[1];
      if (cmd === 'Z' || cmd === 'z') { cx = sx; cy = sy; }
    } else {
      args.push(Number(x[2]));
      if ((cmd === 'M' || cmd === 'm') && args.length === 2) {
        run();
        cmd = cmd === 'M' ? 'L' : 'l';
      }
    }
  }
  run();
  return x0 === Infinity ? [0, 0, 0, 0] : [x0, y0, x1, y1];
}
// A long path's subpaths, each with its own box, each starting with an
// absolute moveto (so it stands alone): drawing part of a big layer need
// only draw the subpaths that reach it (ViewLayer's strips, mapCanvas.ts).
// Null for a path too short to be worth it.
function subpathsOf(s: Extract<Shape, { kind: 'path' }>): { d: string; box: Box }[] | null {
  if (s.subs !== undefined) return s.subs;
  const d = s.d;
  if (!d || d.length < LONG_PATH) return (s.subs = null);
  const split = splitPath(d);
  if (split) return (s.subs = split.length > 1 ? split : null);
  const out: { d: string; box: Box }[] = [];
  const re = /([MmLlHhVvCcSsQqTtAaZz])|(-?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?)/g;
  const tokens: (string | number)[] = [];
  let x: RegExpExecArray | null;
  while ((x = re.exec(d))) tokens.push(x[1] ?? Number(x[2]));
  let cx = 0; let cy = 0; let sx = 0; let sy = 0;
  let cur: string[] = []; let bx: Box = [Infinity, Infinity, -Infinity, -Infinity];
  const add = (px: number, py: number) => {
    if (px < bx[0]) bx[0] = px;
    if (px > bx[2]) bx[2] = px;
    if (py < bx[1]) bx[1] = py;
    if (py > bx[3]) bx[3] = py;
  };
  const flush = () => {
    if (cur.length) out.push({ d: cur.join(' '), box: bx });
    cur = []; bx = [Infinity, Infinity, -Infinity, -Infinity];
  };
  let i = 0;
  let cmd = 'M';
  while (i < tokens.length) {
    const t = tokens[i];
    if (typeof t === 'string') { cmd = t; i++; if (cmd === 'Z' || cmd === 'z') { cur.push('Z'); cx = sx; cy = sy; } continue; }
    const C = cmd.toUpperCase(); const rel = cmd !== C;
    const n = C === 'H' || C === 'V' ? 1 : C === 'A' ? 7 : C === 'C' ? 6 : C === 'S' || C === 'Q' ? 4 : 2;
    const a = tokens.slice(i, i + n) as number[];
    if (a.length < n) break;
    i += n;
    const bxo = rel ? cx : 0; const byo = rel ? cy : 0;
    if (C === 'M') {
      flush();
      cx = bxo + a[0]!; cy = byo + a[1]!; sx = cx; sy = cy;
      cur.push(`M${cx} ${cy}`);
      add(cx, cy);
      cmd = rel ? 'l' : 'L';
      continue;
    }
    cur.push(`${cmd}${a.join(' ')}`);
    if (C === 'H') { cx = bxo + a[0]!; add(cx, cy); continue; }
    if (C === 'V') { cy = byo + a[0]!; add(cx, cy); continue; }
    if (C === 'A') {
      const ex = bxo + a[5]!; const ey = byo + a[6]!; const r = Math.max(Math.abs(a[0]!), Math.abs(a[1]!));
      add(cx - r, cy - r); add(cx + r, cy + r); add(ex - r, ey - r); add(ex + r, ey + r);
      cx = ex; cy = ey;
      continue;
    }
    for (let j = 0; j < n; j += 2) add(bxo + a[j]!, byo + a[j + 1]!);
    cx = bxo + a[n - 2]!; cy = byo + a[n - 1]!;
  }
  flush();
  return (s.subs = out.length > 1 ? out : null);
}

function boxThrough(b: Box, m: Affine, pad: number): Box {
  let x0 = Infinity; let y0 = Infinity; let x1 = -Infinity; let y1 = -Infinity;
  for (const x of [b[0], b[2]]) {
    for (const y of [b[1], b[3]]) {
      const X = m[0] * x + m[2] * y + m[4]; const Y = m[1] * x + m[3] * y + m[5];
      if (X < x0) x0 = X;
      if (X > x1) x1 = X;
      if (Y < y0) y0 = Y;
      if (Y > y1) y1 = Y;
    }
  }
  return [x0 - pad, y0 - pad, x1 + pad, y1 + pad];
}

// --- what is drawn: the ops a recording leaves --------------------------------

// A fill or a stroke: a color, a pattern (made for each canvas it is used
// on) or a gradient, or none.
export type Style = string | { pattern: Def } | { gradient: Def } | null;

// What a recording leaves: shapes in world units, each with its paint and
// the transform from its own units to the world's, in paint order; a group
// drawn at an opacity (a layer) and a masked group (a clip) hold their own.
export type Op =
  | {
    k: 'shape'; shape: Shape; m: Affine; fill: Style; stroke: Style; width: number; nonScaling: boolean;
    dash: number[] | null; cap: CanvasLineCap; join: CanvasLineJoin; fa: number; sa: number; evenodd: boolean;
    events: boolean; owner: string | null;
  }
  | { k: 'text'; m: Affine; text: string; x: number; y: number; size: number; font: string; spacing: number; align: CanvasTextAlign; baseline: CanvasTextBaseline; fill: string; a: number }
  | { k: 'layer'; alpha: number; ops: Op[] }
  | { k: 'clip'; cuts: { shape: Shape; m: Affine }[]; ops: Op[] };

// The world box of what `ops` draw at this zoom (a stroke that does not
// scale is wider in world units the further out the view is).
export function opsBox(ops: readonly Op[], zoom: number, into: Box = [Infinity, Infinity, -Infinity, -Infinity]): Box {
  for (const op of ops) {
    if (op.k === 'shape') {
      const w = op.stroke === null ? 0 : op.nonScaling ? op.width / zoom : op.width * (Math.hypot(op.m[0], op.m[1]) || 1);
      const b = boxThrough(boxOf(op.shape), op.m, w / 2 + 1 / zoom);
      if (b[0] < into[0]) into[0] = b[0];
      if (b[1] < into[1]) into[1] = b[1];
      if (b[2] > into[2]) into[2] = b[2];
      if (b[3] > into[3]) into[3] = b[3];
    } else if (op.k === 'text') {
      const half = op.size * (op.text.length * 0.45 + 1);
      const b = boxThrough([op.x - half, op.y - op.size, op.x + half, op.y + op.size], op.m, 1);
      if (b[0] < into[0]) into[0] = b[0];
      if (b[1] < into[1]) into[1] = b[1];
      if (b[2] > into[2]) into[2] = b[2];
      if (b[3] > into[3]) into[3] = b[3];
    } else {
      opsBox(op.ops, zoom, into);
    }
  }
  return into;
}

// --- what can be pointed at -------------------------------------------------

interface Hit {
  shape: Shape;
  // Its coordinates to the world's.
  m: Affine;
  fill: boolean;
  evenodd: boolean;
  // The stroke's width: in world units, or in screen pixels if it does not
  // scale; 0 for none.
  stroke: number;
  nonScaling: boolean;
  // The building it is part of (its `data-building`), or null.
  owner: string | null;
  box?: Box;
}

// Every shape drawn that takes pointer events, in paint order, and the
// question the map asks of them: what is under this point? The index is
// built on the first question after the list changes, so a turn pays
// nothing for it.
export class HitList {
  static readonly CELL = 48;
  private hits: Hit[] = [];
  private grid: Map<number, number[]> | null = null;
  private big: number[] = [];
  private probe: CanvasRenderingContext2D | null = null;
  private owned = false;
  private zoom = 1;
  clear(): void {
    this.hits = [];
    this.grid = null;
    this.owned = false;
  }
  // The shapes of a recording, in order. What is drawn before the first
  // building (the land, the ground, the paths) can never be over one, so it
  // is not kept: under the pointer it would only ever say "no building".
  addOps(ops: readonly Op[]): void {
    for (const op of ops) {
      if (op.k === 'layer' || op.k === 'clip') { this.addOps(op.ops); continue; }
      if (op.k !== 'shape' || !op.events) continue;
      if (op.owner === null && !this.owned) continue;
      this.owned ||= op.owner !== null;
      this.hits.push({
        shape: op.shape, m: op.m, fill: op.fill !== null, evenodd: op.evenodd,
        stroke: op.stroke === null ? 0 : op.width * (op.nonScaling ? 1 : Math.hypot(op.m[0], op.m[1]) || 1),
        nonScaling: op.nonScaling, owner: op.owner,
      });
    }
    this.grid = null;
  }
  get size(): number {
    return this.hits.length;
  }
  // The buildings that can be pointed at, in paint order.
  owners(): string[] {
    return [...new Set(this.hits.map((h) => h.owner).filter((o): o is string => o !== null))];
  }
  private widthOf(h: Hit): number {
    return h.nonScaling ? h.stroke / this.zoom : h.stroke;
  }
  private build(): Map<number, number[]> {
    const grid = new Map<number, number[]>();
    this.big = [];
    const C = HitList.CELL;
    this.hits.forEach((h, i) => {
      const b = h.box = boxThrough(boxOf(h.shape), h.m, this.widthOf(h) / 2 + 0.5);
      const c0 = Math.floor(b[0] / C); const c1 = Math.floor(b[2] / C);
      const r0 = Math.floor(b[1] / C); const r1 = Math.floor(b[3] / C);
      if (!Number.isFinite(c0 + c1 + r0 + r1) || (c1 - c0 + 1) * (r1 - r0 + 1) > 400) { this.big.push(i); return; }
      for (let r = r0; r <= r1; r++) {
        for (let c = c0; c <= c1; c++) {
          const k = r * 100003 + c;
          const list = grid.get(k);
          if (list) list.push(i); else grid.set(k, [i]);
        }
      }
    });
    this.grid = grid;
    return grid;
  }
  // The topmost shape under the world point (x, y) at this zoom: the
  // building it belongs to, or null for none.
  at(x: number, y: number, zoom: number): string | null {
    if (zoom !== this.zoom) { this.zoom = zoom; this.grid = null; }
    const grid = this.grid ?? this.build();
    const C = HitList.CELL;
    const cell = grid.get(Math.floor(y / C) * 100003 + Math.floor(x / C)) ?? [];
    const ctx = this.probe ?? (this.probe = document.createElement('canvas').getContext('2d'));
    if (!ctx) return null;
    // The lowest candidate that belongs to a building: under it, whatever
    // is hit, it is no building.
    let lowestOwned = Infinity;
    for (const k of cell) if (k < lowestOwned && this.hits[k]!.owner !== null) lowestOwned = k;
    for (const k of this.big) if (k < lowestOwned && this.hits[k]!.owner !== null) lowestOwned = k;
    // Both lists are in paint order; walk them together from the top.
    let i = cell.length - 1; let j = this.big.length - 1;
    while (i >= 0 || j >= 0) {
      const k = j < 0 || (i >= 0 && cell[i]! > this.big[j]!) ? cell[i--]! : this.big[j--]!;
      if (k < lowestOwned) return null;
      const h = this.hits[k]!;
      const b = h.box!;
      if (x < b[0] || x > b[2] || y < b[1] || y > b[3]) continue;
      ctx.setTransform(asInit(h.m));
      const path = asPath(h.shape);
      if (h.fill && ctx.isPointInPath(path, x, y, h.evenodd ? 'evenodd' : 'nonzero')) return h.owner;
      const w = this.widthOf(h);
      if (w > 0) {
        ctx.lineWidth = w / (Math.hypot(h.m[0], h.m[1]) || 1);
        if (ctx.isPointInStroke(path, x, y)) return h.owner;
      }
    }
    return null;
  }
}

// --- the walk: recording ------------------------------------------------------

type El = React.ReactElement<Record<string, unknown>> & { type: unknown; key: string | null };
const SKIP_TAGS = new Set(['title', 'desc', 'metadata']);
const DRAW_TAGS = new Set(['polygon', 'polyline', 'path', 'rect', 'circle', 'ellipse', 'line']);

// The classed ancestors of an element, as links kept from recording to
// recording, each holding its rule once resolved.
interface Link { tag: string; cls: string; up: Link | null; kids: Map<string, Link>; style?: ClassStyle; gen: number }
const rootLink = (tag = ''): Link => ({ tag, cls: '', up: null, kids: new Map(), gen: -1 });
function chainArray(c: Link | null): { tag: string; cls: string }[] {
  const out: { tag: string; cls: string }[] = [];
  for (let x = c; x && x.cls; x = x.up) out.unshift({ tag: x.tag, cls: x.cls });
  return out;
}

export interface Def {
  kind: 'linear' | 'radial' | 'pattern' | 'mask';
  id: string;
  props: Record<string, unknown>;
  stops: { offset: number; color: string; opacity: number }[];
  children: React.ReactNode;
  // A pattern's tile, recorded once.
  tile?: Op[];
}

export interface RecordOptions {
  rules: ClassRules;
  // Elements carrying this ref (the map's label layer) are left to the SVG.
  skipRef?: unknown;
  // Elements with this class are not recorded (the completion ring, which
  // the map draws itself, in its time).
  skipClass?: string;
  // More classes for an element, by its classes, its props and the building
  // it is in: how a door a walker holds is drawn open.
  extraClass?: (cls: string, props: Record<string, unknown>, owner: string | null) => string;
  // The defs (gradients, patterns, masks) seen, shared with other recorders.
  defs?: Map<string, Def>;
}

// Records element trees as ops. Kept from recording to recording: the
// component instances of each named recording (so a memo holds), the class
// rules' links, and the defs (gradients, patterns) any recording declared.
export class Recorder {
  stats: PaintStats = { elements: 0, drawn: 0, unsupported: new Map() };
  readonly defs: Map<string, Def>;
  private opts: RecordOptions;
  private out: Op[] = [];
  private m: Affine = IDENTITY;
  private values: Readonly<Record<string, unknown>> = {};
  private owner: string | null = null;
  private links: Link = rootLink();
  private roots = new Map<string, Instance>();
  private inst: Instance = newInstance();
  private gen = 0;
  constructor(opts: RecordOptions) {
    this.opts = opts;
    this.defs = opts.defs ?? new Map();
  }
  resetStats(): void {
    this.stats = { elements: 0, drawn: 0, unsupported: new Map() };
  }
  // Forget a recording's instances (a building gone).
  forget(key: string): void {
    this.roots.delete(key);
  }

  private miss(name: string): void {
    this.stats.unsupported.set(name, (this.stats.unsupported.get(name) ?? 0) + 1);
  }

  // The ops of `node`, recorded under `key` (whose component instances are
  // kept for the next recording under it), with these occasion values.
  record(key: string, node: React.ReactNode, values: Readonly<Record<string, unknown>> = {}): Op[] {
    this.gen += 1;
    let root = this.roots.get(key);
    if (!root) { root = newInstance(); this.roots.set(key, root); }
    this.inst = root;
    this.m = IDENTITY;
    this.values = values;
    this.owner = null;
    const out: Op[] = [];
    this.out = out;
    setRawPoints(true);
    try {
      this.walk(node, INITIAL, 1, this.links);
    } finally {
      setRawPoints(false);
    }
    return out;
  }

  // The component instance an element names, under the one being walked.
  private instance(type: object, key: string | null | undefined): Instance {
    const parent = this.inst;
    if (parent.gen !== this.gen) { parent.ordinals.clear(); parent.gen = this.gen; }
    const id = typeId(type);
    let k: string;
    if (key !== null && key !== undefined) k = `${id}|${key}`;
    else {
      const n = parent.ordinals.get(id) ?? 0;
      parent.ordinals.set(id, n + 1);
      k = `${id}#${n}`;
    }
    let inst = parent.children.get(k);
    if (!inst) { inst = newInstance(); parent.children.set(k, inst); }
    inst.seen = this.gen;
    return inst;
  }
  private scopeFor(inst: Instance): ArtScope {
    return {
      values: this.values,
      keep: <T,>(key: string, deps: readonly unknown[], make: () => T): T => {
        const kept = inst.kept.get(key);
        if (kept && depsEqual(kept.deps, deps)) return kept.value as T;
        const value = make();
        inst.kept.set(key, { deps, value });
        return value;
      },
    };
  }
  private walkOut(inst: Instance, out: React.ReactNode, paint: Paint, alpha: number, chain: Link): void {
    const prev = this.inst;
    this.inst = inst;
    inst.gen = this.gen - 1;   // its children count their order afresh
    this.walk(out, paint, alpha, chain);
    this.inst = prev;
    // Instances not drawn this time are gone, as unmounted components are.
    for (const [k, c] of inst.children) if (c.seen !== this.gen) inst.children.delete(k);
  }

  private walk(node: React.ReactNode, paint: Paint, alpha: number, chain: Link): void {
    if (node === null || node === undefined || typeof node === 'boolean') return;
    if (typeof node === 'string' || typeof node === 'number') return;
    if (Array.isArray(node)) {
      for (const n of node) this.walk(n as React.ReactNode, paint, alpha, chain);
      return;
    }
    if (!React.isValidElement(node)) {
      if (typeof node === 'object' && Symbol.iterator in (node as object)) {
        for (const n of node as Iterable<React.ReactNode>) this.walk(n, paint, alpha, chain);
      }
      return;
    }
    const el = node as El;
    const type = el.type;
    const props = el.props;
    if (this.opts.skipRef !== undefined && props.ref === this.opts.skipRef) return;
    if (typeof type === 'string') {
      this.element(type, props, paint, alpha, chain);
      return;
    }
    if (type === React.Fragment) {
      this.walk(props.children as React.ReactNode, paint, alpha, chain);
      return;
    }
    const entry = ARTS.get(type);
    if (entry) {
      const inst = this.instance(type as object, el.key);
      let out: React.ReactNode;
      if (entry.memo) {
        const same = inst.memoProps !== undefined
          && (entry.memo === true ? shallowEqual(inst.memoProps, props) : entry.memo(inst.memoProps, props));
        if (!same) {
          inst.memoOut = entry.art(props, this.scopeFor(inst));
          inst.memoProps = props;
        }
        out = inst.memoOut;
      } else {
        out = entry.art(props, this.scopeFor(inst));
      }
      this.walkOut(inst, out, paint, alpha, chain);
      return;
    }
    const provides = PROVIDERS.get(type);
    if (provides !== undefined) {
      const prev = this.values;
      this.values = { ...prev, [provides]: props.value };
      this.walk(props.children as React.ReactNode, paint, alpha, chain);
      this.values = prev;
      return;
    }
    if (typeof type === 'function') {
      // A plain component: a function of its props. (One that reads a hook
      // must be registered; React throws if it is called here.)
      const inst = this.instance(type, el.key);
      this.walkOut(inst, (type as (p: unknown) => React.ReactNode)(props), paint, alpha, chain);
      return;
    }
    this.miss('unregistered component');
  }

  private link(chain: Link, tag: string, cls: string): Link {
    const k = `${tag}.${cls}`;
    let l = chain.kids.get(k);
    if (!l) { l = { tag, cls, up: chain, kids: new Map(), gen: -1 }; chain.kids.set(k, l); }
    if (l.gen !== this.opts.rules.generation) {
      l.style = this.opts.rules.resolve(chainArray(l));
      l.gen = this.opts.rules.generation;
    }
    return l;
  }

  private element(tag: string, props: Record<string, unknown>, inherited: Paint, alpha: number, chain: Link): void {
    this.stats.elements += 1;
    if (SKIP_TAGS.has(tag)) return;
    if (tag === 'defs') {
      this.collectDefs(props.children as React.ReactNode);
      return;
    }
    if (tag === 'linearGradient' || tag === 'radialGradient' || tag === 'pattern' || tag === 'mask') {
      this.collectDefs(React.createElement(tag, props));
      return;
    }
    let cls = typeof props.className === 'string' ? props.className : '';
    if (cls && this.opts.skipClass && cls.split(' ').includes(this.opts.skipClass)) return;
    if (cls && this.opts.extraClass) cls = this.opts.extraClass(cls, props, this.owner);
    const own = cls ? this.link(chain, tag, cls) : chain;
    const cs = cls ? own.style! : null;
    if (props.display === 'none' || (cs && !cs.display)) return;
    // The paint in force: inherited, then attributes, then class rules,
    // then inline style.
    const p: Paint = { ...inherited };
    if (props.fill !== undefined) p.fill = String(props.fill);
    if (props.stroke !== undefined) p.stroke = String(props.stroke);
    if (props.strokeWidth !== undefined) p.strokeWidth = num(props.strokeWidth, 1);
    if (props.fillOpacity !== undefined) p.fillOpacity = num(props.fillOpacity, 1);
    if (props.strokeOpacity !== undefined) p.strokeOpacity = num(props.strokeOpacity, 1);
    if (props.strokeDasharray !== undefined) p.dash = parseDash(props.strokeDasharray as string);
    if (props.strokeLinecap !== undefined) p.cap = props.strokeLinecap as CanvasLineCap;
    if (props.strokeLinejoin !== undefined) p.join = props.strokeLinejoin as CanvasLineJoin;
    if (props.fillRule !== undefined) p.evenodd = props.fillRule === 'evenodd';
    if (props.vectorEffect !== undefined) p.nonScaling = props.vectorEffect === 'non-scaling-stroke';
    if (props.visibility !== undefined) p.hidden = props.visibility === 'hidden';
    if (props.pointerEvents !== undefined) p.events = props.pointerEvents !== 'none';
    let opacity = num(props.opacity, 1);
    if (cs) {
      if (cs.fill !== undefined) p.fill = cs.fill;
      if (cs.stroke !== undefined) p.stroke = cs.stroke;
      if (cs.strokeWidth !== undefined) p.strokeWidth = cs.strokeWidth;
      if (cs.fillOpacity !== undefined) p.fillOpacity = cs.fillOpacity;
      if (cs.strokeOpacity !== undefined) p.strokeOpacity = cs.strokeOpacity;
      if (cs.dash !== undefined) p.dash = cs.dash;
      if (cs.cap !== undefined) p.cap = cs.cap;
      if (cs.join !== undefined) p.join = cs.join;
      if (cs.evenodd !== undefined) p.evenodd = cs.evenodd;
      if (cs.nonScaling !== undefined) p.nonScaling = cs.nonScaling;
      if (cs.hidden !== undefined) p.hidden = cs.hidden;
      if (cs.events !== undefined) p.events = cs.events;
      if (cs.opacity !== 1) opacity = cs.opacity;
    }
    const style = props.style as Record<string, unknown> | undefined;
    if (style) {
      if (style.fill !== undefined) p.fill = String(style.fill);
      if (style.stroke !== undefined) p.stroke = String(style.stroke);
      if (style.opacity !== undefined) opacity = num(style.opacity, 1);
      if (style.visibility !== undefined) p.hidden = style.visibility === 'hidden';
      if (style.pointerEvents !== undefined) p.events = style.pointerEvents !== 'none';
      if (style.display === 'none') return;
    }
    if (props.clipPath !== undefined) this.miss('clip-path');
    if (props.filter !== undefined) this.miss('filter');
    if (alpha * opacity <= 0) return;

    const transform = typeof props.transform === 'string' ? props.transform : null;
    const mask = typeof props.mask === 'string' ? props.mask : null;
    const prevM = this.m;
    const prevOut = this.out;
    if (transform) this.m = mul(this.m, transformOf(transform));
    if (mask) {
      const cuts = this.maskCuts(mask);
      if (cuts) {
        const clip: Op = { k: 'clip', cuts, ops: [] };
        this.out.push(clip);
        this.out = clip.ops;
      }
    }
    if (tag === 'g' || tag === 'svg') {
      const building = props['data-building'];
      const prevOwner = this.owner;
      if (typeof building === 'string') this.owner = building;
      if (opacity < 1) {
        // A group's opacity applies to the group as a whole: drawn on a
        // layer, then laid down at that opacity.
        const layer: Op = { k: 'layer', alpha: alpha * opacity, ops: [] };
        this.out.push(layer);
        const outer = this.out;
        this.out = layer.ops;
        this.walk(props.children as React.ReactNode, p, 1, own);
        this.out = outer;
      } else {
        this.walk(props.children as React.ReactNode, p, alpha, own);
      }
      this.owner = prevOwner;
    } else if (tag === 'text') {
      this.text(props, p, alpha * opacity, cs);
    } else if (!DRAW_TAGS.has(tag)) {
      this.miss(tag);
    } else if (!p.hidden) {
      const shape = shapeOf(tag, props);
      if (shape) {
        this.shape(shape, p, alpha * opacity, tag !== 'line');
        this.stats.drawn += 1;
      }
    }
    this.out = prevOut;
    this.m = prevM;
  }

  // A mask of the art's one kind (ageMarks.tsx): white everywhere, black
  // over the nearer volumes. Each black shape is cut out of the clip.
  private maskCuts(ref: string): { shape: Shape; m: Affine }[] | null {
    const id = /^url\(["']?#([^"')]+)["']?\)/.exec(ref)?.[1];
    const def = id ? this.defs.get(id) : undefined;
    if (!def || def.kind !== 'mask') { this.miss('mask'); return null; }
    const cuts: { shape: Shape; m: Affine }[] = [];
    const visit = (n: React.ReactNode, fill: string): void => {
      if (Array.isArray(n)) { for (const x of n) visit(x as React.ReactNode, fill); return; }
      if (!React.isValidElement(n)) return;
      const el = n as El;
      if (el.type === 'g') { visit(el.props.children as React.ReactNode, el.props.fill !== undefined ? String(el.props.fill) : fill); return; }
      if (typeof el.type !== 'string') { this.miss('mask content'); return; }
      const shape = shapeOf(el.type, el.props);
      const f = (el.props.fill !== undefined ? String(el.props.fill) : fill).toLowerCase();
      if (!shape || f === 'white' || f === '#fff' || f === '#ffffff') return;
      if (f !== 'black' && f !== '#000' && f !== '#000000') { this.miss('mask (grey)'); return; }
      cuts.push({ shape, m: this.m });
    };
    visit(def.children, '#000');
    return cuts;
  }

  private shape(shape: Shape, p: Paint, a: number, fillable: boolean): void {
    const fill = fillable && p.fill !== 'none' ? this.styleOf(p.fill) : null;
    let stroke = p.stroke !== 'none' && p.strokeWidth > 0 ? this.styleOf(p.stroke) : null;
    if (stroke !== null && typeof stroke === 'object' && 'gradient' in stroke) stroke = null;
    if (fill === null && stroke === null) return;
    this.out.push({
      k: 'shape', shape, m: this.m, fill, stroke, width: p.strokeWidth, nonScaling: p.nonScaling, dash: p.dash,
      cap: p.cap, join: p.join, fa: a * p.fillOpacity, sa: a * p.strokeOpacity, evenodd: p.evenodd,
      events: p.events, owner: this.owner,
    });
  }

  private styleOf(v: string): Style {
    if (!v || v === 'none' || v === 'transparent') return null;
    if (v.charCodeAt(0) === 117 /* u */) {
      const url = /^url\(["']?#([^"')]+)["']?\)/.exec(v);
      if (url) {
        const def = this.defs.get(url[1]!);
        if (!def || def.kind === 'mask') { this.miss(`url(#${url[1]})`); return null; }
        if (def.kind === 'pattern') {
          if (!def.tile) {
            const out = this.out; const m = this.m;
            this.out = []; this.m = IDENTITY;
            this.walk(def.children, INITIAL, 1, rootLink('pattern'));
            def.tile = this.out;
            this.out = out; this.m = m;
          }
          return { pattern: def };
        }
        return { gradient: def };
      }
    }
    return this.opts.rules.color(v);
  }

  private collectDefs(children: React.ReactNode): void {
    const visit = (n: React.ReactNode): void => {
      if (Array.isArray(n)) { n.forEach((x) => visit(x as React.ReactNode)); return; }
      if (!React.isValidElement(n)) return;
      const el = n as El;
      if (el.type === React.Fragment) { visit(el.props.children as React.ReactNode); return; }
      const entry = ARTS.get(el.type);
      if (entry) { visit(entry.art(el.props, this.scopeFor(newInstance()))); return; }
      if (typeof el.type === 'function') { visit((el.type as (p: unknown) => React.ReactNode)(el.props)); return; }
      if (typeof el.type !== 'string') return;
      const tag = el.type;
      const id = el.props.id as string | undefined;
      if ((tag === 'linearGradient' || tag === 'radialGradient') && id) {
        const stops: Def['stops'] = [];
        const kids = React.Children.toArray(el.props.children as React.ReactNode);
        for (const k of kids) {
          if (!React.isValidElement(k)) continue;
          const sp = (k as El).props;
          const cls = typeof sp.className === 'string' ? sp.className : '';
          const color = sp.stopColor !== undefined ? String(sp.stopColor)
            : cls ? this.opts.rules.resolve([{ tag, cls: '' }, { tag: 'stop', cls }], true).stopColor ?? '#000' : '#000';
          stops.push({ offset: num(sp.offset), color: this.opts.rules.color(color), opacity: num(sp.stopOpacity, 1) });
        }
        this.defs.set(id, { kind: tag === 'linearGradient' ? 'linear' : 'radial', id, props: el.props, stops, children: null });
      } else if (tag === 'pattern' && id) {
        const old = this.defs.get(id);
        // Kept, with its tile, while it is the same pattern.
        if (!old || old.props !== el.props) this.defs.set(id, { kind: 'pattern', id, props: el.props, stops: [], children: el.props.children as React.ReactNode });
      } else if (tag === 'mask' && id) {
        this.defs.set(id, { kind: 'mask', id, props: el.props, stops: [], children: el.props.children as React.ReactNode });
      } else {
        visit(el.props.children as React.ReactNode);
      }
    };
    visit(children);
  }

  // Text, simply: the art's few words (a chapter's letters, an
  // inscription) in its font size, anchored as its rule or props ask.
  private text(props: Record<string, unknown>, p: Paint, a: number, cs: ClassStyle | null): void {
    const content = React.Children.toArray(props.children as React.ReactNode).filter((c) => typeof c === 'string' || typeof c === 'number').join('');
    if (!content || p.hidden) return;
    const style = this.styleOf(p.fill);
    if (typeof style !== 'string') return;
    const f = cs?.font;
    const size = num(props.fontSize, 16);
    const anchor = (props.textAnchor as string | undefined) ?? f?.anchor ?? 'start';
    const baseline = (props.dominantBaseline as string | undefined) ?? f?.baseline ?? 'auto';
    this.out.push({
      k: 'text', m: this.m, text: content, x: num(props.x), y: num(props.y), size,
      font: `${f?.weight ?? '400'} ${size}px ${f?.family ?? 'sans-serif'}`, spacing: f ? f.spacing * size : 0,
      align: anchor === 'middle' ? 'center' : anchor === 'end' ? 'right' : 'left',
      baseline: baseline === 'central' || baseline === 'middle' ? 'middle' : 'alphabetic',
      fill: style, a: a * p.fillOpacity,
    });
    this.stats.drawn += 1;
  }
}

// --- replay: drawing the ops ----------------------------------------------------

// Offscreen layers for a group drawn at an opacity (a building dimmed, a
// sprite faded), shared by every replay; each is kept clear, and only the
// part a group drew on is laid down and cleared.
const layerPool: CanvasRenderingContext2D[] = [];
const patternCache = new WeakMap<CanvasRenderingContext2D, Map<Def, CanvasPattern | null>>();

export interface ReplayView {
  // World to the target's device pixels.
  base: Affine;
  // The view's zoom and the device's pixel ratio, for strokes that do not
  // scale.
  zoom: number;
  dpr: number;
  // The part of the target being drawn, in its pixels (the rest is clipped
  // away): shapes that do not reach it are skipped, and of a long path
  // only the subpaths that do are drawn.
  region?: Box;
}

// The transform last set on a context by a replay, so a run of shapes in
// one space sets it once.
const lastSet = new WeakMap<CanvasRenderingContext2D, { base: Affine; m: Affine; t: Affine }>();
function transformFor(ctx: CanvasRenderingContext2D, base: Affine, m: Affine): Affine {
  const last = lastSet.get(ctx);
  if (last && last.base === base && last.m === m) return last.t;
  const t = mul(base, m);
  ctx.setTransform(t[0], t[1], t[2], t[3], t[4], t[5]);
  lastSet.set(ctx, { base, m, t });
  return t;
}

// Draws recorded ops onto `ctx`. (Whoever sets the context's transform
// between replays must not rely on it being set again: see transformFor,
// which a replay's start forgets.)
export function replay(ctx: CanvasRenderingContext2D, ops: readonly Op[], view: ReplayView, depth = 0): void {
  if (depth === 0) lastSet.delete(ctx);
  for (const op of ops) {
    if (op.k === 'shape') drawShape(ctx, op, view);
    else if (op.k === 'text') drawText(ctx, op, view);
    else if (op.k === 'clip') {
      ctx.save();
      for (const c of op.cuts) {
        const t = mul(view.base, c.m);
        ctx.setTransform(t[0], t[1], t[2], t[3], t[4], t[5]);
        const cut = new Path2D();
        cut.rect(-1e5, -1e5, 2e5, 2e5);
        cut.addPath(asPath(c.shape));
        ctx.clip(cut, 'evenodd');
      }
      lastSet.delete(ctx);
      replay(ctx, op.ops, view, depth);
      ctx.restore();
      lastSet.delete(ctx);
    } else {
      drawLayer(ctx, op, view, depth);
    }
  }
}

function drawLayer(ctx: CanvasRenderingContext2D, op: { alpha: number; ops: Op[] }, view: ReplayView, depth: number): void {
  const box = boxThrough(opsBox(op.ops, view.zoom), view.base, 2);
  const W = ctx.canvas.width; const H = ctx.canvas.height;
  // Only the part of it in the region being drawn, when there is one.
  const r = view.region ?? [0, 0, W, H];
  const x = Math.max(0, Math.floor(r[0]), Math.floor(box[0])); const y = Math.max(0, Math.floor(r[1]), Math.floor(box[1]));
  const w = Math.min(W, Math.ceil(r[2]), Math.ceil(box[2])) - x; const h = Math.min(H, Math.ceil(r[3]), Math.ceil(box[3])) - y;
  if (w <= 0 || h <= 0) return;
  let layer = layerPool[depth];
  if (!layer) {
    layer = document.createElement('canvas').getContext('2d')!;
    layerPool[depth] = layer;
  }
  // Drawn at the part's own origin, so a layer need only be as big as it.
  if (layer.canvas.width < w || layer.canvas.height < h) {
    layer.canvas.width = Math.max(layer.canvas.width, w);
    layer.canvas.height = Math.max(layer.canvas.height, h);
  }
  replay(layer, op.ops, { ...view, base: mul([1, 0, 0, 1, -x, -y], view.base), region: view.region ? [0, 0, w, h] : undefined }, depth + 1);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = op.alpha;
  ctx.drawImage(layer.canvas, 0, 0, w, h, x, y, w, h);
  ctx.restore();
  lastSet.delete(ctx);
  layer.setTransform(1, 0, 0, 1, 0, 0);
  layer.clearRect(0, 0, w, h);
}

function styleFor(ctx: CanvasRenderingContext2D, s: Style, view: ReplayView): string | CanvasPattern | null {
  if (s === null || typeof s === 'string') return s;
  if ('pattern' in s) {
    let cache = patternCache.get(ctx);
    if (!cache) { cache = new Map(); patternCache.set(ctx, cache); }
    if (cache.has(s.pattern)) return cache.get(s.pattern)!;
    const def = s.pattern;
    const w = num(def.props.width, 1); const h = num(def.props.height, 1);
    const k = 4;
    const tile = document.createElement('canvas');
    tile.width = Math.ceil(w * k); tile.height = Math.ceil(h * k);
    const c = tile.getContext('2d');
    let pat: CanvasPattern | null = null;
    if (c) {
      replay(c, def.tile ?? [], { base: [k, 0, 0, k, 0, 0], zoom: k, dpr: 1 });
      pat = ctx.createPattern(tile, 'repeat');
      pat?.setTransform({ a: 1 / k, b: 0, c: 0, d: 1 / k, e: 0, f: 0 });
    }
    cache.set(def, pat);
    void view;
    return pat;
  }
  return null;
}

function drawShape(ctx: CanvasRenderingContext2D, op: Extract<Op, { k: 'shape' }>, view: ReplayView): void {
  let shape = op.shape;
  if (view.region) {
    const tm = mul(view.base, op.m);
    const k = Math.hypot(tm[0], tm[1]) || 1;
    const pad = (op.stroke === null ? 0 : op.nonScaling ? op.width * view.dpr : op.width * k) / 2 + 2;
    const r = view.region;
    const b = boxThrough(boxOf(shape), tm, pad);
    if (b[2] < r[0] || b[0] > r[2] || b[3] < r[1] || b[1] > r[3]) return;
    if (shape.kind === 'path') {
      const subs = subpathsOf(shape);
      if (subs) {
        const inv = invert(tm);
        const lr = boxThrough([r[0] - pad, r[1] - pad, r[2] + pad, r[3] + pad], inv, 0);
        const reach = subs.filter((q) => !(q.box[2] < lr[0] || q.box[0] > lr[2] || q.box[3] < lr[1] || q.box[1] > lr[3]));
        if (reach.length === 0) return;
        if (reach.length < subs.length) shape = { kind: 'path', path: new Path2D(reach.map((q) => q.d).join(' ')) };
      }
    }
  }
  const t = transformFor(ctx, view.base, op.m);
  if (shape.kind === 'pts') { ctx.beginPath(); tracePts(ctx, shape.xy, shape.close); }
  const rule: CanvasFillRule = op.evenodd ? 'evenodd' : 'nonzero';
  if (op.fill !== null) {
    ctx.globalAlpha = op.fa;
    if (typeof op.fill === 'object' && 'gradient' in op.fill) { new GradientFill(op.fill.gradient).fill(ctx, asPath(shape), op.evenodd); lastSet.delete(ctx); }
    else {
      const f = styleFor(ctx, op.fill, view);
      if (f !== null) {
        ctx.fillStyle = f;
        if (shape.kind === 'pts') ctx.fill(rule); else ctx.fill(shape.path, rule);
      }
    }
  }
  if (op.stroke !== null) {
    const s = styleFor(ctx, op.stroke, view);
    if (s === null) return;
    const scale = Math.hypot(t[0], t[1]) || 1;
    const width = op.nonScaling ? (op.width * view.dpr) / scale : op.width;
    ctx.globalAlpha = op.sa;
    ctx.strokeStyle = s;
    ctx.lineWidth = width;
    ctx.lineCap = op.cap;
    ctx.lineJoin = op.join;
    if (op.dash) ctx.setLineDash(op.nonScaling ? op.dash.map((d) => (d * width) / op.width) : op.dash);
    if (shape.kind === 'pts') ctx.stroke(); else ctx.stroke(shape.path);
    if (op.dash) ctx.setLineDash([]);
  }
}

function drawText(ctx: CanvasRenderingContext2D, op: Extract<Op, { k: 'text' }>, view: ReplayView): void {
  transformFor(ctx, view.base, op.m);
  ctx.globalAlpha = op.a;
  ctx.fillStyle = op.fill;
  ctx.font = op.font;
  ctx.letterSpacing = `${op.spacing}px`;
  ctx.textAlign = op.align;
  ctx.textBaseline = op.baseline;
  ctx.fillText(op.text, op.x, op.y);
  ctx.letterSpacing = '0px';
}

export { mul, IDENTITY, boxThrough };
export type { Box };

// A gradient fill: laid out in user space (or in a gradientTransform's), as
// the ring's haze is.
class GradientFill {
  private def: Def;
  constructor(def: Def) {
    this.def = def;
  }
  fill(ctx: CanvasRenderingContext2D, path: Path2D, evenodd: boolean): void {
    const pr = this.def.props;
    const gt = typeof pr.gradientTransform === 'string' ? transformOf(pr.gradientTransform) : null;
    let g: CanvasGradient;
    if (this.def.kind === 'radial') {
      const cx = num(pr.cx, 0.5); const cy = num(pr.cy, 0.5); const r = num(pr.r, 0.5);
      g = ctx.createRadialGradient(num(pr.fx, cx), num(pr.fy, cy), 0, cx, cy, r);
    } else {
      g = ctx.createLinearGradient(num(pr.x1), num(pr.y1), num(pr.x2), num(pr.y2, 0));
    }
    for (const s of this.def.stops) g.addColorStop(Math.max(0, Math.min(1, s.offset)), withAlpha(s.color, s.opacity));
    ctx.fillStyle = g;
    if (gt) {
      // The gradient lives in the transform's space: fill the path, carried
      // into that space, under the transform.
      const moved = new Path2D();
      moved.addPath(path, asInit(invert(gt)));
      ctx.save();
      ctx.transform(gt[0], gt[1], gt[2], gt[3], gt[4], gt[5]);
      ctx.fill(moved, evenodd ? 'evenodd' : 'nonzero');
      ctx.restore();
    } else {
      ctx.fill(path, evenodd ? 'evenodd' : 'nonzero');
    }
  }
}

function withAlpha(color: string, a: number): string {
  if (a >= 1) return color;
  const m = /rgba?\(([^)]+)\)/.exec(color);
  if (m) {
    const [r, g, b, a0] = m[1]!.split(/[\s,/]+/).map(Number);
    return `rgba(${r}, ${g}, ${b}, ${(Number.isFinite(a0) ? a0! : 1) * a})`;
  }
  if (/^#[0-9a-f]{6}$/i.test(color)) {
    const n = parseInt(color.slice(1), 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
  }
  return color;
}
