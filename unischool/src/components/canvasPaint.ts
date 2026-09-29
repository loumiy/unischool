import * as React from 'react';
import { PointList, setRawPoints } from './isoProjection';

// The canvas painter (Plan 83B, the prototype behind `?map=canvas`). It
// walks the element tree the map's art returns (the same components the SVG
// map renders: CampusScene, the ring) and draws it on a 2D canvas with
// Path2D, instead of handing it to React DOM to build ~17,000 SVG nodes.
//
// - Components are called directly. The few hooks the art uses (context,
//   memo, refs) are answered by a small stand-in dispatcher, set on React's
//   shared internals only while the painter runs, so the art's code and
//   output are unchanged; a provider in the tree (a context element) sets
//   the value its descendants read. `memo` and `forwardRef` are unwrapped.
// - Color and stroke come, as in the SVG, from presentation attributes, the
//   stylesheet's class rules (resolved once per chain of classes and season
//   by `StyleResolver`, from probe elements in the map) and inline style, in
//   that order of precedence, inherited down the tree as SVG inherits them.
// - What it cannot draw it counts by name (`PaintStats.unsupported`).
//
// Browser-only (it reads computed style); nothing imports it but the map.

export interface PaintStats {
  elements: number;
  drawn: number;
  unsupported: Map<string, number>;
}

// --- the stand-in dispatcher -----------------------------------------------

type Internals = { H: unknown };
const INTERNALS = (React as unknown as { __CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE: Internals })
  .__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;

const CONTEXT = Symbol.for('react.context');
const CONSUMER = Symbol.for('react.consumer');
const MEMO = Symbol.for('react.memo');
const FORWARD_REF = Symbol.for('react.forward_ref');
const FRAGMENT = Symbol.for('react.fragment');

type Ctx = { _currentValue: unknown; $$typeof: symbol };
// The context values in force at the point of the walk.
let contextValues = new Map<Ctx, unknown>();
// The contexts the component being called has read, and what they held,
// so a memo's kept output is dropped when one of them changes.
let reads: [Ctx, unknown][] | null = null;
const readContext = (c: Ctx) => {
  const v = contextValues.has(c) ? contextValues.get(c) : c._currentValue;
  reads?.push([c, v]);
  return v;
};

// A component instance, kept from paint to paint by its place in the tree
// (its parent's instance, its type, and its key or its order among its
// siblings of that type), as React keeps a fiber: its hooks' values, and a
// memo's last props and output. Its memoised values survive a pan, so a
// paint that changes nothing but the view recomputes nothing.
export interface Instance {
  hooks: unknown[];
  children: Map<string, Instance>;
  gen: number;
  seen: number;
  ordinals: Map<number, number>;
  memoProps?: Record<string, unknown>;
  memoOut?: React.ReactNode;
  memoReads?: [Ctx, unknown][];
}
const newInstance = (): Instance => ({ hooks: [], children: new Map(), gen: -1, seen: -1, ordinals: new Map() });
let hookOwner: Instance | null = null;
let hookIndex = 0;
const depsEqual = (a: readonly unknown[] | undefined, b: readonly unknown[] | undefined) => {
  if (!a || !b || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (!Object.is(a[i], b[i])) return false;
  return true;
};
function slot<T>(make: () => T): T {
  const i = hookIndex++;
  if (!hookOwner) return make();
  if (i < hookOwner.hooks.length) return hookOwner.hooks[i] as T;
  const v = make();
  hookOwner.hooks[i] = v;
  return v;
}
function useMemoShim<T>(f: () => T, deps?: readonly unknown[]): T {
  const i = hookIndex++;
  const h = hookOwner?.hooks;
  const kept = h?.[i] as { deps?: readonly unknown[]; value: T } | undefined;
  if (kept && deps && depsEqual(kept.deps, deps)) return kept.value;
  const value = f();
  if (h) h[i] = { deps, value };
  return value;
}
const noop = () => {};
const DISPATCHER = {
  readContext,
  useContext: readContext,
  use: (u: unknown) => (u && (u as Ctx).$$typeof === CONTEXT ? readContext(u as Ctx) : u),
  useMemo: useMemoShim,
  useCallback: <T,>(f: T, deps?: readonly unknown[]) => useMemoShim(() => f, deps),
  useRef: <T,>(v: T) => slot(() => ({ current: v })),
  useState: <T,>(v: T | (() => T)) => [slot(() => (typeof v === 'function' ? (v as () => T)() : v)), noop],
  useReducer: <S,>(_r: unknown, s: S, init?: (a: S) => S) => [slot(() => (init ? init(s) : s)), noop],
  useEffect: noop,
  useLayoutEffect: noop,
  useInsertionEffect: noop,
  useImperativeHandle: noop,
  useDebugValue: noop,
  useId: () => ':canvas:',
  useDeferredValue: <T,>(v: T) => v,
  useTransition: () => [false, (f: () => void) => f()],
  useSyncExternalStore: <T,>(_s: unknown, get: () => T) => get(),
  useOptimistic: <T,>(v: T) => [v, noop],
  useActionState: <S,>(_a: unknown, s: S) => [slot(() => s), noop, false],
};
const typeIds = new WeakMap<object, number>();
let nextTypeId = 1;
const typeId = (t: object) => {
  let id = typeIds.get(t);
  if (id === undefined) { id = nextTypeId++; typeIds.set(t, id); }
  return id;
};
const shallowEqual = (a: Record<string, unknown>, b: Record<string, unknown>) => {
  if (a === b) return true;
  const ka = Object.keys(a);
  if (ka.length !== Object.keys(b).length) return false;
  for (const k of ka) if (!Object.is(a[k], b[k])) return false;
  return true;
};

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
}
const INITIAL: Paint = {
  fill: '#000', stroke: 'none', strokeWidth: 1, fillOpacity: 1, strokeOpacity: 1,
  dash: null, cap: 'butt', join: 'miter', evenodd: false, nonScaling: false, hidden: false,
};

// What a class rule sets on an element: only the properties it changes from
// what the element would have without its own class (so an attribute still
// wins where no rule speaks), plus the element's own opacity and display.
interface ClassStyle {
  fill?: string; stroke?: string; strokeWidth?: number; fillOpacity?: number; strokeOpacity?: number;
  dash?: number[] | null; cap?: CanvasLineCap; join?: CanvasLineJoin; evenodd?: boolean; nonScaling?: boolean;
  hidden?: boolean; opacity: number; display: boolean; stopColor?: string;
  // For text: the font and anchoring the rule gives it.
  font?: { family: string; weight: string; spacing: number; anchor: string; baseline: string };
}

const SVG_NS = 'http://www.w3.org/2000/svg';
const PROPS = ['fill', 'stroke', 'stroke-width', 'fill-opacity', 'stroke-opacity', 'stroke-dasharray', 'stroke-linecap', 'stroke-linejoin', 'fill-rule', 'vector-effect', 'visibility'] as const;

// Class rules resolved from the stylesheet by probing: a chain of elements
// with the same tags and classes as the art's, inside the map, read with
// getComputedStyle, with and without the element's own class.
export class StyleResolver {
  private cache = new Map<string, ClassStyle>();
  private colors = new Map<string, string>();
  private root: SVGSVGElement;
  constructor(host: Element) {
    this.root = document.createElementNS(SVG_NS, 'svg');
    this.root.setAttribute('class', 'campus-map-svg');
    this.root.setAttribute('aria-hidden', 'true');
    this.root.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;visibility:hidden;pointer-events:none';
    host.appendChild(this.root);
  }
  // The season or the theme changed: every rule reads its tokens again.
  reset(): void {
    this.cache.clear();
    this.colors.clear();
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
    const out = getComputedStyle(el).fill;
    el.remove();
    this.colors.set(value, out);
    return out;
  }
  // The map's own classes (placing, inspecting, a path tool), which some
  // rules read; a change reads every rule again.
  setRootClass(cls: string): void {
    const full = `campus-map-svg ${cls}`.trim();
    if (this.root.getAttribute('class') === full) return;
    this.root.setAttribute('class', full);
    this.cache.clear();
  }
  // The rule for a chain already keyed; the chain is built only on a miss.
  resolveKey(key: string, chain: () => { tag: string; cls: string }[]): ClassStyle {
    return this.cache.get(key) ?? this.resolve(chain(), false, key);
  }
  resolve(chain: readonly { tag: string; cls: string }[], stop = false, key = chainKey(chain)): ClassStyle {
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
    if (stop) out.stopColor = a.getPropertyValue('stop-color');
    if (own.tag === 'text') {
      out.font = {
        family: a.fontFamily, weight: a.fontWeight, spacing: (parseFloat(a.letterSpacing) || 0) / (parseFloat(a.fontSize) || 16),
        anchor: a.getPropertyValue('text-anchor'), baseline: a.getPropertyValue('dominant-baseline'),
      };
    }
    void PROPS;
    let top: Element = withClass;
    while (top.parentNode !== this.root) top = top.parentNode as Element;
    top.remove();
    this.cache.set(key, out);
    return out;
  }
}

function chainKey(chain: readonly { tag: string; cls: string }[]): string {
  return chain.map((c) => `${c.tag}.${c.cls}`).join('>');
}

function parseDash(v: string | number | undefined | null): number[] | null {
  if (v === undefined || v === null || v === 'none' || v === '') return null;
  const parts = String(v).split(/[\s,]+/).map(parseFloat).filter((n) => Number.isFinite(n));
  return parts.length ? parts : null;
}

// --- geometry ---------------------------------------------------------------

function pointsPath(points: unknown, close: boolean): Path2D | null {
  const p = new Path2D();
  if (points instanceof PointList) {
    const pts = points.pts;
    if (pts.length === 0) return null;
    p.moveTo(pts[0]!.x, pts[0]!.y);
    for (let i = 1; i < pts.length; i++) p.lineTo(pts[i]!.x, pts[i]!.y);
  } else {
    const nums = String(points).trim().split(/[\s,]+/).map(Number);
    if (nums.length < 2) return null;
    p.moveTo(nums[0]!, nums[1]!);
    for (let i = 2; i + 1 < nums.length; i += 2) p.lineTo(nums[i]!, nums[i + 1]!);
  }
  if (close) p.closePath();
  return p;
}

function num(v: unknown, d = 0): number {
  if (v === undefined || v === null || v === '') return d;
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : d;
}

// An SVG transform list as a DOMMatrix.
function transformOf(t: string): DOMMatrix {
  const m = new DOMMatrix();
  const re = /(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^)]*)\)/g;
  let x: RegExpExecArray | null;
  while ((x = re.exec(t))) {
    const a = x[2]!.trim().split(/[\s,]+/).map(Number);
    switch (x[1]) {
      case 'matrix': m.multiplySelf(new DOMMatrix([a[0]!, a[1]!, a[2]!, a[3]!, a[4]!, a[5]!])); break;
      case 'translate': m.translateSelf(a[0] ?? 0, a[1] ?? 0); break;
      case 'scale': m.scaleSelf(a[0] ?? 1, a[1] ?? a[0] ?? 1); break;
      case 'rotate':
        if (a.length >= 3) m.translateSelf(a[1]!, a[2]!).rotateSelf(a[0]!).translateSelf(-a[1]!, -a[2]!);
        else m.rotateSelf(a[0] ?? 0);
        break;
      case 'skewX': m.skewXSelf(a[0] ?? 0); break;
      case 'skewY': m.skewYSelf(a[0] ?? 0); break;
    }
  }
  return m;
}

// --- the walk -----------------------------------------------------------------

type El = React.ReactElement<Record<string, unknown>> & { type: unknown };
const SKIP_TAGS = new Set(['title', 'desc', 'metadata']);
const DRAW_TAGS = new Set(['polygon', 'polyline', 'path', 'rect', 'circle', 'ellipse', 'line']);

// The classed ancestors of an element, nearest last, as a linked list whose
// key (the class rule table's key) is built once per element.
type Chain = { tag: string; cls: string; key: string; up: Chain } | null;
function chainArray(c: Chain): { tag: string; cls: string }[] {
  const out: { tag: string; cls: string }[] = [];
  for (let x = c; x; x = x.up) out.unshift({ tag: x.tag, cls: x.cls });
  return out;
}

interface Def {
  kind: 'linear' | 'radial' | 'pattern' | 'mask';
  props: Record<string, unknown>;
  stops: { offset: number; color: string; opacity: number }[];
  children: React.ReactNode;
}

export interface PaintOptions {
  resolver: StyleResolver;
  // Elements carrying this ref (the map's label layer) are left to the SVG.
  skipRef?: unknown;
  // Device pixels to a CSS pixel, for strokes that do not scale.
  dpr: number;
}

function shapePath(tag: string, props: Record<string, unknown>): Path2D | null {
  switch (tag) {
    case 'polygon': return pointsPath(props.points, true);
    case 'polyline': return pointsPath(props.points, false);
    case 'path': return props.d ? new Path2D(String(props.d)) : null;
    case 'rect': {
      const path = new Path2D();
      const rx = num(props.rx);
      if (rx > 0) path.roundRect(num(props.x), num(props.y), num(props.width), num(props.height), rx);
      else path.rect(num(props.x), num(props.y), num(props.width), num(props.height));
      return path;
    }
    case 'circle': { const path = new Path2D(); path.arc(num(props.cx), num(props.cy), num(props.r), 0, Math.PI * 2); return path; }
    case 'ellipse': { const path = new Path2D(); path.ellipse(num(props.cx), num(props.cy), num(props.rx), num(props.ry), 0, 0, Math.PI * 2); return path; }
    case 'line': { const path = new Path2D(); path.moveTo(num(props.x1), num(props.y1)); path.lineTo(num(props.x2), num(props.y2)); return path; }
  }
  return null;
}

export class Painter {
  stats: PaintStats = { elements: 0, drawn: 0, unsupported: new Map() };
  private defs = new Map<string, Def>();
  private patterns = new Map<string, CanvasPattern | null>();
  private ctx: CanvasRenderingContext2D;
  private opts: PaintOptions;
  // Offscreen layers for a group drawn at an opacity (a building dimmed
  // while another is inspected), reused from paint to paint.
  private layers: CanvasRenderingContext2D[] = [];
  private depth = 0;
  constructor(ctx: CanvasRenderingContext2D, opts: PaintOptions) {
    this.ctx = ctx;
    this.opts = opts;
  }

  private miss(name: string): void {
    this.stats.unsupported.set(name, (this.stats.unsupported.get(name) ?? 0) + 1);
  }

  // The component instances, from the root, and the one whose output is
  // being walked.
  private root: Instance = newInstance();
  private owner: Instance = this.root;
  private gen = 0;
  private lastReads: [Ctx, unknown][] = [];

  private instance(type: object, key: string | null | undefined): Instance {
    const owner = this.owner;
    if (owner.gen !== this.gen) { owner.ordinals.clear(); owner.gen = this.gen; }
    const id = typeId(type);
    let k: string;
    if (key !== null && key !== undefined) k = `${id}|${key}`;
    else {
      const n = owner.ordinals.get(id) ?? 0;
      owner.ordinals.set(id, n + 1);
      k = `${id}#${n}`;
    }
    let inst = owner.children.get(k);
    if (!inst) { inst = newInstance(); owner.children.set(k, inst); }
    inst.seen = this.gen;
    return inst;
  }
  private call(inst: Instance, f: (p: unknown) => React.ReactNode, props: unknown): React.ReactNode {
    const prevOwner = hookOwner; const prevIndex = hookIndex; const prevReads = reads;
    hookOwner = inst; hookIndex = 0; reads = [];
    try {
      return f(props);
    } finally {
      this.lastReads = reads;
      hookOwner = prevOwner; hookIndex = prevIndex; reads = prevReads;
      // A parent's reads include its children's, which it passes down.
      if (prevReads) prevReads.push(...this.lastReads);
    }
  }
  private walkOut(inst: Instance, out: React.ReactNode, paint: Paint, alpha: number, chain: Chain): void {
    const prev = this.owner;
    this.owner = inst;
    // Instances under this one start their count again.
    inst.gen = this.gen - 1;
    this.walk(out, paint, alpha, chain);
    this.owner = prev;
    // Instances not drawn this time are gone, as unmounted components are.
    for (const [k, c] of inst.children) if (c.seen !== this.gen) inst.children.delete(k);
  }

  // Draws `node` into the canvas at its current transform.
  paint(node: React.ReactNode): PaintStats {
    this.stats = { elements: 0, drawn: 0, unsupported: new Map() };
    this.gen += 1;
    this.owner = this.root;
    const prev = INTERNALS.H;
    INTERNALS.H = DISPATCHER;
    setRawPoints(true);
    contextValues = new Map();
    try {
      this.walk(node, INITIAL, 1, null);
    } finally {
      INTERNALS.H = prev;
      setRawPoints(false);
    }
    return this.stats;
  }

  walk(node: React.ReactNode, paint: Paint, alpha: number, chain: Chain): void {
    if (node === null || node === undefined || typeof node === 'boolean') return;
    if (typeof node === 'string' || typeof node === 'number') return;
    if (Array.isArray(node)) {
      for (const n of node) this.walk(n as React.ReactNode, paint, alpha, chain);
      return;
    }
    if (typeof node === 'object' && Symbol.iterator in (node as object) && !React.isValidElement(node)) {
      for (const n of node as Iterable<React.ReactNode>) this.walk(n, paint, alpha, chain);
      return;
    }
    if (!React.isValidElement(node)) return;
    const el = node as El;
    const type = el.type as unknown;
    const props = el.props;
    if (this.opts.skipRef !== undefined && props.ref === this.opts.skipRef) return;

    if (typeof type === 'function') {
      // A class component would need `new`; the art has none.
      const inst = this.instance(type, el.key);
      this.walkOut(inst, this.call(inst, type as (p: unknown) => React.ReactNode, props), paint, alpha, chain);
      return;
    }
    if (typeof type === 'symbol') {
      if (type === FRAGMENT) this.walk(props.children as React.ReactNode, paint, alpha, chain);
      else this.miss(String(type.description));
      return;
    }
    if (typeof type === 'object' && type !== null) {
      const t = type as { $$typeof: symbol; type?: unknown; render?: (p: unknown, r: unknown) => React.ReactNode; _context?: Ctx };
      if (t.$$typeof === MEMO) {
        // Kept while its props (and the contexts it read) are unchanged, as
        // React skips it.
        const inst = this.instance(type, el.key);
        const compare = (type as { compare?: (a: unknown, b: unknown) => boolean }).compare;
        const same = inst.memoProps !== undefined
          && (compare ? compare(inst.memoProps, props) : shallowEqual(inst.memoProps, props))
          && inst.memoReads!.every(([c, v]) => Object.is(contextValues.has(c) ? contextValues.get(c) : c._currentValue, v));
        if (!same) {
          const inner = t.type as unknown;
          const out = typeof inner === 'function'
            ? this.call(inst, inner as (p: unknown) => React.ReactNode, props)
            : React.createElement(inner as React.FunctionComponent, props);
          inst.memoProps = props;
          inst.memoOut = out;
          inst.memoReads = this.lastReads;
        }
        this.walkOut(inst, inst.memoOut, paint, alpha, chain);
        return;
      }
      if (t.$$typeof === FORWARD_REF && t.render) {
        this.walk(t.render(props, props.ref ?? null), paint, alpha, chain);
        return;
      }
      if (t.$$typeof === CONTEXT) {
        const ctxObj = type as Ctx;
        const had = contextValues.has(ctxObj);
        const before = contextValues.get(ctxObj);
        contextValues.set(ctxObj, props.value);
        this.walk(props.children as React.ReactNode, paint, alpha, chain);
        if (had) contextValues.set(ctxObj, before); else contextValues.delete(ctxObj);
        return;
      }
      if (t.$$typeof === CONSUMER && t._context) {
        this.walk((props.children as (v: unknown) => React.ReactNode)(readContext(t._context)), paint, alpha, chain);
        return;
      }
      this.miss('component');
      return;
    }
    if (typeof type !== 'string') return;
    this.element(type, props, paint, alpha, chain);
  }

  private element(tag: string, props: Record<string, unknown>, inherited: Paint, alpha: number, chain: Chain): void {
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
    const cls = typeof props.className === 'string' ? props.className : '';
    const own: Chain = cls ? { tag, cls, key: `${chain ? `${chain.key}>` : ''}${tag}.${cls}`, up: chain } : chain;
    const cs = own && cls ? this.opts.resolver.resolveKey(own.key, () => chainArray(own)) : null;
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
      if (cs.opacity !== 1) opacity = cs.opacity;
    }
    const style = props.style as Record<string, unknown> | undefined;
    if (style) {
      if (style.fill !== undefined) p.fill = String(style.fill);
      if (style.stroke !== undefined) p.stroke = String(style.stroke);
      if (style.opacity !== undefined) opacity = num(style.opacity, 1);
      if (style.visibility !== undefined) p.hidden = style.visibility === 'hidden';
      if (style.display === 'none') return;
    }
    if (props.clipPath !== undefined) this.miss('clip-path');
    if (props.filter !== undefined) this.miss('filter');
    if (alpha * opacity <= 0) return;

    const transform = typeof props.transform === 'string' ? props.transform : null;
    const mask = typeof props.mask === 'string' ? props.mask : null;
    const saved = transform !== null || mask !== null;
    if (saved) this.ctx.save();
    if (transform) this.ctx.transform(...matrixArgs(transformOf(transform)));
    if (mask) this.applyMask(mask);
    if (tag === 'g' || tag === 'svg') {
      if (opacity < 1) {
        // A group's opacity applies to the group as a whole: drawn on a
        // layer, then laid down at that opacity.
        const layer = this.pushLayer();
        this.walk(props.children as React.ReactNode, p, 1, own);
        this.popLayer(layer, alpha * opacity);
      } else {
        this.walk(props.children as React.ReactNode, p, alpha, own);
      }
    } else if (tag === 'text') {
      this.text(props, p, alpha * opacity, cs);
    } else if (!DRAW_TAGS.has(tag)) {
      this.miss(tag);
    } else if (!p.hidden) {
      const path = shapePath(tag, props);
      if (path) {
        this.fillStroke(path, p, alpha * opacity, tag !== 'line');
        this.stats.drawn += 1;
      }
    }
    if (saved) this.ctx.restore();
  }

  private pushLayer(): CanvasRenderingContext2D {
    const base = this.ctx;
    let layer = this.layers[this.depth];
    if (!layer) {
      layer = document.createElement('canvas').getContext('2d')!;
      this.layers[this.depth] = layer;
    }
    this.depth += 1;
    const { width, height } = base.canvas;
    if (layer.canvas.width !== width || layer.canvas.height !== height) {
      layer.canvas.width = width;
      layer.canvas.height = height;
    } else {
      layer.setTransform(1, 0, 0, 1, 0, 0);
      layer.clearRect(0, 0, width, height);
    }
    layer.setTransform(base.getTransform());
    this.ctx = layer;
    this.layerParents.push(base);
    return layer;
  }
  private layerParents: CanvasRenderingContext2D[] = [];
  private popLayer(layer: CanvasRenderingContext2D, a: number): void {
    const base = this.layerParents.pop()!;
    this.depth -= 1;
    this.ctx = base;
    base.save();
    base.setTransform(1, 0, 0, 1, 0, 0);
    base.globalAlpha = a;
    base.drawImage(layer.canvas, 0, 0);
    base.restore();
  }

  // A mask of the art's one kind (ageMarks.tsx): white everywhere, black
  // over the nearer volumes. Each black shape is cut out of the clip.
  private applyMask(ref: string): void {
    const id = /^url\(["']?#([^"')]+)["']?\)/.exec(ref)?.[1];
    const def = id ? this.defs.get(id) : undefined;
    if (!def || def.kind !== 'mask') { this.miss('mask'); return; }
    const shapes: { path: Path2D; fill: string }[] = [];
    const visit = (n: React.ReactNode, fill: string): void => {
      if (Array.isArray(n)) { for (const x of n) visit(x as React.ReactNode, fill); return; }
      if (!React.isValidElement(n)) return;
      const el = n as El;
      if (el.type === 'g') { visit(el.props.children as React.ReactNode, el.props.fill !== undefined ? String(el.props.fill) : fill); return; }
      if (typeof el.type !== 'string') { this.miss('mask content'); return; }
      const path = shapePath(el.type, el.props);
      if (path) shapes.push({ path, fill: el.props.fill !== undefined ? String(el.props.fill) : fill });
    };
    visit(def.children, '#000');
    for (const s of shapes) {
      const f = s.fill.toLowerCase();
      if (f === 'white' || f === '#fff' || f === '#ffffff') continue;
      if (f !== 'black' && f !== '#000' && f !== '#000000') { this.miss('mask (grey)'); continue; }
      const cut = new Path2D();
      cut.rect(-1e5, -1e5, 2e5, 2e5);
      cut.addPath(s.path);
      this.ctx.clip(cut, 'evenodd');
    }
  }

  private fillStroke(path: Path2D, p: Paint, a: number, fillable: boolean): void {
    const ctx = this.ctx;
    if (fillable && p.fill !== 'none') {
      const style = this.paintStyle(p.fill);
      if (style !== null) {
        ctx.globalAlpha = a * p.fillOpacity;
        if (style instanceof GradientFill) style.fill(ctx, path, p.evenodd);
        else { ctx.fillStyle = style; ctx.fill(path, p.evenodd ? 'evenodd' : 'nonzero'); }
      }
    }
    if (p.stroke !== 'none' && p.strokeWidth > 0) {
      const style = this.paintStyle(p.stroke);
      if (style !== null && !(style instanceof GradientFill)) {
        ctx.globalAlpha = a * p.strokeOpacity;
        ctx.strokeStyle = style;
        let w = p.strokeWidth;
        if (p.nonScaling) {
          const m = ctx.getTransform();
          w = (p.strokeWidth * this.opts.dpr) / (Math.hypot(m.a, m.b) || 1);
        }
        ctx.lineWidth = w;
        ctx.lineCap = p.cap;
        ctx.lineJoin = p.join;
        if (p.dash) ctx.setLineDash(p.nonScaling ? p.dash.map((d) => (d * w) / p.strokeWidth) : p.dash);
        ctx.stroke(path);
        if (p.dash) ctx.setLineDash([]);
      }
    }
  }

  // A fill or stroke value as the canvas takes it: a color, a pattern, a
  // gradient, or null for none.
  private paintStyle(v: string): string | CanvasPattern | GradientFill | null {
    if (!v || v === 'none' || v === 'transparent') return null;
    if (v.charCodeAt(0) === 117 /* u */) {
      const url = /^url\(["']?#([^"')]+)["']?\)/.exec(v);
      if (url) {
        const def = this.defs.get(url[1]!);
        if (!def || def.kind === 'mask') { this.miss(`url(#${url[1]})`); return null; }
        if (def.kind === 'pattern') return this.pattern(url[1]!, def);
        return new GradientFill(def);
      }
    }
    return this.opts.resolver.color(v);
  }

  private pattern(id: string, def: Def): CanvasPattern | null {
    if (this.patterns.has(id)) return this.patterns.get(id)!;
    const w = num(def.props.width, 1);
    const h = num(def.props.height, 1);
    const k = 4;
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(w * k);
    canvas.height = Math.ceil(h * k);
    const c = canvas.getContext('2d')!;
    c.scale(k, k);
    const inner = new Painter(c, this.opts);
    const prev = INTERNALS.H;
    INTERNALS.H = DISPATCHER;
    try { inner.walk(def.children, INITIAL, 1, { tag: 'pattern', cls: '', key: 'pattern.', up: null }); } finally { INTERNALS.H = prev; }
    const pat = this.ctx.createPattern(canvas, 'repeat');
    pat?.setTransform(new DOMMatrix().scaleSelf(1 / k, 1 / k));
    this.patterns.set(id, pat);
    return pat;
  }

  private collectDefs(children: React.ReactNode): void {
    const visit = (n: React.ReactNode): void => {
      if (Array.isArray(n)) { n.forEach((x) => visit(x as React.ReactNode)); return; }
      if (!React.isValidElement(n)) return;
      const el = n as El;
      if (typeof el.type === 'function') { visit((el.type as (p: unknown) => React.ReactNode)(el.props)); return; }
      if (typeof el.type === 'object' && el.type && (el.type as { $$typeof: symbol }).$$typeof === MEMO) {
        visit(React.createElement((el.type as { type: React.FunctionComponent }).type, el.props));
        return;
      }
      if ((el.type as unknown) === FRAGMENT) { visit(el.props.children as React.ReactNode); return; }
      const tag = el.type as string;
      const id = el.props.id as string | undefined;
      if ((tag === 'linearGradient' || tag === 'radialGradient') && id) {
        const stops: Def['stops'] = [];
        const kids = React.Children.toArray(el.props.children as React.ReactNode);
        for (const k of kids) {
          if (!React.isValidElement(k)) continue;
          const sp = (k as El).props;
          const cls = typeof sp.className === 'string' ? sp.className : '';
          const color = sp.stopColor !== undefined ? String(sp.stopColor)
            : cls ? this.opts.resolver.resolve([{ tag, cls: '' }, { tag: 'stop', cls }], true).stopColor ?? '#000' : '#000';
          stops.push({ offset: num(sp.offset), color: this.opts.resolver.color(color), opacity: num(sp.stopOpacity, 1) });
        }
        this.defs.set(id, { kind: tag === 'linearGradient' ? 'linear' : 'radial', props: el.props, stops, children: null });
      } else if (tag === 'pattern' && id) {
        this.defs.set(id, { kind: 'pattern', props: el.props, stops: [], children: el.props.children as React.ReactNode });
        this.patterns.delete(id);
      } else if (tag === 'mask' && id) {
        this.defs.set(id, { kind: 'mask', props: el.props, stops: [], children: el.props.children as React.ReactNode });
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
    const ctx = this.ctx;
    const style = this.paintStyle(p.fill);
    if (typeof style !== 'string') return;
    const f = cs?.font;
    const size = num(props.fontSize, 16);
    ctx.globalAlpha = a * p.fillOpacity;
    ctx.fillStyle = style;
    ctx.font = `${f?.weight ?? '400'} ${size}px ${f?.family ?? 'sans-serif'}`;
    ctx.letterSpacing = f ? `${f.spacing * size}px` : '0px';
    const anchor = (props.textAnchor as string | undefined) ?? f?.anchor ?? 'start';
    const baseline = (props.dominantBaseline as string | undefined) ?? f?.baseline ?? 'auto';
    ctx.textAlign = anchor === 'middle' ? 'center' : anchor === 'end' ? 'right' : 'left';
    ctx.textBaseline = baseline === 'central' || baseline === 'middle' ? 'middle' : 'alphabetic';
    ctx.fillText(content, num(props.x), num(props.y));
    ctx.letterSpacing = '0px';
    this.stats.drawn += 1;
  }
}

function matrixArgs(m: DOMMatrix): [number, number, number, number, number, number] {
  return [m.a, m.b, m.c, m.d, m.e, m.f];
}

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
      const inv = gt.inverse();
      const moved = new Path2D();
      moved.addPath(path, inv);
      ctx.save();
      ctx.transform(...matrixArgs(gt));
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
