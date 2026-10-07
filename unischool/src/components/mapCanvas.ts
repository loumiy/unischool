import type * as React from 'react';
import { HitList, Recorder, StyleResolver, opsBox, replay, type Affine, type Box, type Op } from './canvasPaint';
import type { DepthBox } from './depthSort';
import { projectorFor, type Camera, type Pt } from './isoProjection';
import { walkerSlot } from './walkerDepth';
import { FIGURE_H, FIGURE_HALF_W, type Crowd, type CrowdSink, type WalkerColors } from './Walkers';

// The canvas map (Plan 83D): the scene kept as drawings, composited each
// frame with the walkers drawn inside the depth order.
//
// - Each thing in the sorted scene (a building, a tree, a prop) is recorded
//   once (canvasPaint.ts's Recorder) and kept as a drawing (an ImageBitmap,
//   made on an offscreen canvas), while what it draws is unchanged: its
//   signature, which the map computes from what the art reads. A week in
//   which one building changes records and draws that building alone. The
//   doors walkers hold open are part of what a building draws; a few of its
//   door variants are kept.
// - The land behind, and the ground under the sorted scene (the paths, the
//   open-ground plates, the shadows), are each one drawing of the view and a
//   margin past its edges, kept in tiles (ViewLayer): a pan past half the
//   margin wraps it round instead of moving its pixels, and a change is
//   drawn at once where the map says it is, the rest a few tiles a frame.
//   The land in front (a few dozen sprites) is drawn every frame.
// - Every frame lays the ground down, then each thing's drawing in paint
//   order, each walker just before the first thing nearer the camera whose
//   drawing reaches it (walkerDepth.ts), then the land in front: a building
//   covers a walker behind it by being drawn after it.
// - A frame whose view, camera and season are as the last one left them (at
//   Play: walkers moving, a door opening, a building changing) draws only
//   where something moved or changed, clipped to it.
// - A pan moves the drawings; a zoom scales them until it settles, then
//   they are drawn again at the new scale. A turn draws everything straight
//   onto the map every frame (the camera changes what everything looks
//   like); the drawings for the view it settles on are made over the next
//   frames.
// - A change of season or snow redraws everything, a few things a frame
//   within a budget, the old drawings standing in meanwhile.
// - A frame that throws stops it for good and tells the map (`onFail`),
//   which falls back to the SVG map for the session.
//
// Browser-only; the map drives it (CampusMap.tsx).

export interface CanvasEntry {
  key: string;
  kind: 'mass' | 'prop' | 'tree';
  // Where it stands on the grid, for the walkers' depth.
  box: DepthBox;
  node: React.ReactNode;
  // Everything its drawing depends on but the season and the doors held
  // open; a change records and draws it again.
  sig: string;
  // The building it is (a mass) or belongs to (a venue's prop).
  owner: string | null;
}
export interface CanvasScene {
  camera: Camera;
  // The occasions the art reads (canvasArt.ts), by name.
  values: Readonly<Record<string, unknown>>;
  // The season and the snow: a change redraws everything, in the budget.
  soft: string;
  // The land behind the campus, the ground under the sorted scene, and the
  // land in front of it.
  ring: { node: React.ReactNode; sig: string };
  ground: { node: React.ReactNode; sig: string };
  front: { node: React.ReactNode; sig: string };
  // The defs any recording may use (the scaffold's hatch), taken in before
  // the scene records, whatever it records first.
  defs?: React.ReactNode;
  // In paint order.
  entries: readonly CanvasEntry[];
  inspected: string | null;
  // Buildings just finished, with the ring on the ground round each.
  rings: readonly { id: string; pts: readonly Pt[] }[];
  // The map's own classes for the ground (placing, a path tool,
  // inspecting).
  groundClass: string;
  // A quarter turn is being animated.
  turning: boolean;
  // Where the ground changed since the scene before, if the map knows (a
  // path drawn): drawn there at once, and everywhere else a strip a frame.
  groundDirty: Box | null;
}
export interface MapView { x: number; y: number; zoom: number }

// A drawing: a part of a canvas, and where it lies in the world at its
// scale (its pixel (0, 0) is the world point (ox, oy) / scale).
interface Drawing {
  image: CanvasImageSource;
  // A thing's own drawing, closed when it is replaced.
  bitmap: ImageBitmap | null;
  w: number; h: number;
  ox: number; oy: number; scale: number;
  // Where its pixel (0, 0) sits in the image, when the image is wrapped
  // round (a view layer's, scrolled).
  wx?: number; wy?: number;
}
function mod(a: number, n: number): number {
  return ((a % n) + n) % n;
}
// The drawing's span [a, b) cut where its image wraps round: each piece
// with the shift from the drawing's pixels to the image's.
function wrapSpans(a: number, b: number, n: number, wrap = 0): [number, number, number][] {
  const cut = n - wrap;
  const out: [number, number, number][] = [];
  if (a < cut) out.push([a, Math.min(b, cut), wrap]);
  if (b > cut) out.push([Math.max(a, cut), b, wrap - n]);
  return out;
}

interface Rec {
  entry: CanvasEntry;
  sig: string;
  doors: string;
  soft: string;
  ops: Op[];
  box: Box;
  boxZoom: number;
  drawing: Drawing | null;
  // Its drawing no longer shows what it draws.
  redraw: boolean;
  // A building's recordings and drawings with other doors open, kept while
  // the rest of it is unchanged: a walker going in by a door and coming out
  // again costs nothing the second time.
  variants: Map<string, { ops: Op[]; box: Box; drawing: Drawing | null }>;
  // What the last frame put on the map for it (its drawing, or null when
  // drawn straight on), and where, in device pixels: a frame that changes
  // only some things draws only where they were and are.
  laid?: Drawing | null;
  laidBox?: Box;
  // Learned on a change of season (refreshSoft): the season's colors (and
  // `snow`) that changed while its recording came out the same, so it does
  // not read them. A later change to those alone passes it by, its drawing
  // standing; a change to the thing itself makes a new Rec, which learns
  // again.
  freeOf?: Set<string>;
}

// A scene's soft key is the season's colors, as JSON, and the snow:
// `season|snow` (CampusMap.tsx's canvasSceneOf). What changed between two
// soft keys, by name (each color's CSS variable, and `snow`).
const softParsed = new Map<string, Record<string, string>>();
function softValues(soft: string): Record<string, string> {
  let hit = softParsed.get(soft);
  if (!hit) {
    const cut = soft.lastIndexOf('|');
    let colors: Record<string, string> = {};
    try { colors = JSON.parse(soft.slice(0, cut)) as Record<string, string>; } catch { colors = { season: soft.slice(0, cut) }; }
    hit = { ...colors, snow: soft.slice(cut + 1) };
    if (softParsed.size > 64) softParsed.clear();
    softParsed.set(soft, hit);
  }
  return hit;
}
function softChanged(a: string, b: string): string[] {
  const x = softValues(a); const y = softValues(b);
  const keys = new Set([...Object.keys(x), ...Object.keys(y)]);
  return [...keys].filter((k) => x[k] !== y[k]);
}

// A recording as a string, to tell whether a change of season changed it.
// A Path2D carries its `d` beside it, so it is left out. Null when it
// cannot be written (then it counts as changed).
function opsKey(ops: readonly Op[]): string | null {
  try {
    return JSON.stringify(ops, (_k, v: unknown) => (typeof Path2D !== 'undefined' && v instanceof Path2D ? undefined : v));
  } catch {
    return null;
  }
}

// How far the ground's and the land in front's drawings reach past each
// edge of the map, as a share of its size (at least MARGIN_MIN pixels).
const MARGIN_SHARE = 0.35;
const MARGIN_MIN = 200;
// How long a zoom rests before the drawings are made again at its scale.
const SETTLE_MS = 140;
// Door variants kept for a building.
const MAX_VARIANTS = 6;
// How long a frame records doors walkers opened or closed; the rest wait
// for the next frame (a door opens a frame or two late, never a frame long).
const DOOR_MS = 5;
// Drawings an old one can stand in for (after a zoom, or a change of
// season) are made again about this many shapes a frame.
const BUILD_SHAPES = 2500;
// The cells a frame that draws only what changed is clipped to.
const CELL_PX = 32;
// How far into a frame drawings that must be made (a thing changed, or seen
// from a new camera) are still made; the rest are drawn straight onto the
// map until theirs are made, over the next frames. The frame that ends a
// turn has spent its time recording the scene, and makes none.
const BUILD_MS = 20;

// A drawing bigger than this on a side is drawn straight onto the map.
const MAX_DRAWING = 4096;
// The completion ring's animation (styles.css's campus-complete).
const RING_MS = 1500;

// The land behind or the ground under the scene: one drawing of the view
// and a margin past each edge, kept in tiles of TILE device pixels. A pan
// scrolls it by whole tiles once half a margin is used (what it has is
// moved; the tiles the move uncovers are blank). Each frame, a blank tile
// in view is drawn at once, and the rest (blank tiles in the margin, and
// tiles still showing the ops from before a change) within a budget of area:
// what is in view first. A change the map can place is drawn at once there.
const TILE = 128;
// How much of the layers a frame may draw beyond what the view needs, in
// CSS pixels squared.
const TILE_AREA = 150_000;
const FRESH = 0;
const STALE = 1;
const BLANK = 2;
class ViewLayer {
  sig = '';
  soft = '';
  cam = '';
  ops: Op[] = [];
  // Device pixels drawn, for the frame's figures.
  static painted = 0;
  // What has been drawn again since the map last laid it (its pixels).
  touched: Box[] = [];
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  // What it shows: its pixel (0, 0) is the world point (ox, oy) / scale.
  drawing: Drawing | null = null;
  // Each tile's state, by row then column.
  private tiles = new Uint8Array(0);
  private cols = 0;
  private rows = 0;
  // The ops changed: every tile drawn is stale, and `region` (world), when
  // the map says where, is drawn at once.
  changed(region: Box | null): void {
    const d = this.drawing;
    if (!d) return;
    for (let i = 0; i < this.tiles.length; i++) if (this.tiles[i] === FRESH) this.tiles[i] = STALE;
    if (region) this.paint([Math.floor(region[0] * d.scale) - d.ox - 2, Math.floor(region[1] * d.scale) - d.oy - 2, Math.ceil(region[2] * d.scale) - d.ox + 2, Math.ceil(region[3] * d.scale) - d.oy + 2]);
  }
  forget(): void {
    this.drawing = null;
    this.covers = false;
  }
  // Whether the drawing shows all the view has of it (no blank tile in it).
  covers = false;
  // Whether the last update drew blank tiles in view (a new drawing's).
  drewView = false;
  // Draws the ops over a rectangle of the drawing (its own pixels, as it
  // is laid: the canvas holds them wrapped round at (wx, wy)).
  private paint(r: Box, dpr = window.devicePixelRatio || 1): number {
    const d = this.drawing; const ctx = this.ctx;
    if (!d || !ctx) return 0;
    const x0 = Math.max(0, Math.floor(r[0])); const y0 = Math.max(0, Math.floor(r[1]));
    const x1 = Math.min(d.w, Math.ceil(r[2])); const y1 = Math.min(d.h, Math.ceil(r[3]));
    if (x1 <= x0 || y1 <= y0) return 0;
    for (const [a0, a1, sx] of wrapSpans(x0, x1, d.w, d.wx)) {
      for (const [b0, b1, sy] of wrapSpans(y0, y1, d.h, d.wy)) {
        const px0 = a0 + sx; const py0 = b0 + sy; const pw = a1 - a0; const ph = b1 - b0;
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(px0, py0, pw, ph);
        ctx.beginPath();
        ctx.rect(px0, py0, pw, ph);
        ctx.clip();
        replay(ctx, this.ops, { base: [d.scale, 0, 0, d.scale, -d.ox + sx, -d.oy + sy], zoom: d.scale / dpr, dpr, region: [px0, py0, px0 + pw, py0 + ph] });
        ctx.restore();
      }
    }
    ViewLayer.painted += (x1 - x0) * (y1 - y0);
    this.touched.push([x0, y0, x1, y1]);
    return (x1 - x0) * (y1 - y0);
  }
  // Draws the tiles `pick` chooses, a run along a row at a time, while the
  // budget lasts (or all of them, with no budget); they are fresh after.
  private paintTiles(pick: (i: number, col: number, row: number) => boolean, budget: { area: number } | null, dpr: number): void {
    for (let row = 0; row < this.rows; row++) {
      let run = -1;
      for (let col = 0; col <= this.cols; col++) {
        const i = row * this.cols + col;
        const want = col < this.cols && pick(i, col, row);
        if (want && run < 0) run = col;
        if (!want && run >= 0) {
          if (budget && budget.area <= 0) return;
          const area = this.paint([run * TILE, row * TILE, col * TILE, (row + 1) * TILE], dpr);
          if (budget) budget.area -= area;
          this.tiles.fill(FRESH, row * this.cols + run, i);
          run = -1;
        }
      }
    }
  }
  // Keeps it over the view: made anew when it has none (or at another
  // scale or size); scrolled when a pan has used half a margin; then its
  // tiles drawn as above. Returns whether any are left to draw.
  update(view: MapView, size: { width: number; height: number }, s: number, dpr: number, budget: { area: number }, late = false): boolean {
    const mx = Math.round(Math.max(MARGIN_MIN, size.width * MARGIN_SHARE));
    const my = Math.round(Math.max(MARGIN_MIN, size.height * MARGIN_SHARE));
    // Where it would sit, centred on the view: its corner, less the margin.
    const ox = Math.floor(((-mx - view.x) / view.zoom) * s);
    const oy = Math.floor(((-my - view.y) / view.zoom) * s);
    const w = Math.ceil(Math.ceil(((size.width + 2 * mx) / view.zoom) * s) / TILE) * TILE;
    const h = Math.ceil(Math.ceil(((size.height + 2 * my) / view.zoom) * s) / TILE) * TILE;
    let d = this.drawing;
    if (!d || d.scale !== s || d.w !== w || d.h !== h) {
      if (!this.canvas) { this.canvas = document.createElement('canvas'); this.ctx = this.canvas.getContext('2d'); }
      if (this.canvas.width !== w || this.canvas.height !== h) { this.canvas.width = w; this.canvas.height = h; }
      else { this.ctx!.setTransform(1, 0, 0, 1, 0, 0); this.ctx!.clearRect(0, 0, w, h); }
      d = this.drawing = { image: this.canvas, bitmap: null, w, h, ox, oy, scale: s, wx: 0, wy: 0 };
      this.cols = w / TILE;
      this.rows = h / TILE;
      this.tiles = new Uint8Array(this.cols * this.rows).fill(BLANK);
    }
    // Scrolled by whole tiles, once half a margin is used: nothing is
    // moved, the canvas's wrap is (the tiles that come round are blank).
    const dx = d.ox - ox; const dy = d.oy - oy;
    if (Math.abs(dx) > (mx * dpr) / 2 || Math.abs(dy) > (my * dpr) / 2) {
      const tx = Math.round(dx / TILE); const ty = Math.round(dy / TILE);
      d.ox -= tx * TILE; d.oy -= ty * TILE;
      d.wx = mod((d.wx ?? 0) - tx * TILE, d.w);
      d.wy = mod((d.wy ?? 0) - ty * TILE, d.h);
      const was = this.tiles;
      const next = new Uint8Array(was.length).fill(BLANK);
      for (let row = 0; row < this.rows; row++) {
        const from = row - ty;
        if (from < 0 || from >= this.rows) continue;
        for (let col = 0; col < this.cols; col++) {
          const c = col - tx;
          if (c >= 0 && c < this.cols) next[row * this.cols + col] = was[from * this.cols + c]!;
        }
      }
      this.tiles = next;
    }
    // The view, in tiles.
    const c0 = Math.floor(((-view.x / view.zoom) * s - d.ox) / TILE);
    const r0 = Math.floor(((-view.y / view.zoom) * s - d.oy) / TILE);
    const c1 = Math.floor((((size.width - view.x) / view.zoom) * s - d.ox) / TILE);
    const r1 = Math.floor((((size.height - view.y) / view.zoom) * s - d.oy) / TILE);
    const inView = (col: number, row: number) => col >= c0 && col <= c1 && row >= r0 && row <= r1;
    const t = this.tiles;
    // Blank tiles in view are drawn at once (a pan brought them in, or the
    // drawing is new, as after a turn): drawing the layer straight onto the
    // map costs about as much again at every frame until it is laid. A
    // frame already late (the one that ends a turn) draws none, and the
    // layer straight onto the map, that frame only.
    this.drewView = false;
    if (!late) {
      const was = ViewLayer.painted;
      this.paintTiles((i, col, row) => t[i] === BLANK && inView(col, row), null, dpr);
      this.drewView = ViewLayer.painted > was;
      this.paintTiles((i, col, row) => t[i] !== FRESH && inView(col, row), budget, dpr);
      this.paintTiles((i) => t[i] !== FRESH, budget, dpr);
    }
    this.covers = true;
    for (let row = Math.max(0, r0); row <= Math.min(this.rows - 1, r1) && this.covers; row++) {
      for (let col = Math.max(0, c0); col <= Math.min(this.cols - 1, c1); col++) {
        if (t[row * this.cols + col] === BLANK) { this.covers = false; break; }
      }
    }
    return t.some((x) => x !== FRESH);
  }
}

export class MapCanvas implements CrowdSink {
  readonly hits = new HitList();
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private groundRules: StyleResolver;
  private entryRules: StyleResolver;
  private groundRec: Recorder;
  private entryRec: Recorder;
  // Where a thing is drawn before it is taken as a bitmap.
  private scratch: OffscreenCanvas | null = null;

  private scene: CanvasScene | null = null;
  private sceneDirty = true;
  private view: MapView = { x: 0, y: 0, zoom: 1 };
  private viewAt = 0;
  private size: { width: number; height: number } | null = null;
  private scale = 0;
  private recs = new Map<string, Rec>();
  private order: Rec[] = [];
  private ground = new ViewLayer();
  private front: { sig: string; soft: string; ops: Op[]; drawing: Drawing | null; owner: HTMLCanvasElement | null } = { sig: '', soft: '', ops: [], drawing: null, owner: null };
  private land = new ViewLayer();
  private hitsDirty = true;
  private index = new Map<number, number[]>();
  private crowdSrc: Crowd | null = null;
  private heldSeen: ReadonlySet<string> | null = null;
  private doorsPending = false;
  // What the last frame drew, for a frame that draws only what changed:
  // its view and the rest it stood on, the things shown, the walkers.
  private composed: { x: number; y: number; zoom: number; W: number; H: number; inspected: string | null; soft: string; front: Op[]; land: Drawing | null; ground: Drawing | null } | null = null;
  private shown = new Set<Rec>();
  private figs: Box[] = [];
  private forceFull = true;
  // The transform the map's context has in a frame: none, or the world's
  // (set once for a run of walkers, not for each).
  private xf: 0 | 2 = 0;
  private doorsById = new Map<string, string>();
  private ringStart = new Map<string, number>();
  private softSeen = '';
  private raf = 0;
  // The last frame left something to draw.
  private pending = true;
  private settleTimer: ReturnType<typeof setTimeout> | null = null;
  private walkerColors: WalkerColors | null = null;
  // Where each walker shown in the last frame was drawn.
  private lastWalkers: readonly { i: number; slot: number; fig: Box }[] = [];
  private gold = '#c9a227';
  private defsSeen: React.ReactNode = undefined;
  // Everything in the scene it could not draw since it started, by name
  // (the review tools read it through the map's MapReview).
  readonly missed: Record<string, number> = {};
  // What the last frame did: its time, what it recorded, drew and laid.
  stats = { ms: 0, recorded: 0, drawn: 0, laid: 0, direct: 0, walkers: 0, unsupported: {} as Record<string, number>, parts: { record: 0, draw: 0, layers: 0, compose: 0, area: 0 }, partial: -1 };

  constructor(canvas: HTMLCanvasElement, host: Element) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.groundRules = new StyleResolver(host);
    this.entryRules = new StyleResolver(host);
    const defs = new Map();
    this.groundRec = new Recorder({ rules: this.groundRules, skipClass: 'campus-building-complete', defs });
    this.entryRec = new Recorder({
      rules: this.entryRules, skipClass: 'campus-building-complete', defs,
      // A door a walker holds is drawn open (styles.css's .door-open).
      extraClass: (cls, props, owner) => {
        if (owner === null || !cls.includes('iso-door-way')) return cls;
        const side = props['data-door'];
        return this.crowdSrc?.held.has(`${owner}|${String(side)}`) ? `${cls} door-open` : cls;
      },
    });
  }
  dispose(): void {
    if (this.raf) cancelAnimationFrame(this.raf);
    if (this.settleTimer) clearTimeout(this.settleTimer);
    this.groundRules.dispose();
    this.entryRules.dispose();
  }

  // --- what the map tells it ---------------------------------------------------

  setScene(scene: CanvasScene): void {
    this.scene = scene;
    this.sceneDirty = true;
    this.request();
  }
  setView(view: MapView, size: { width: number; height: number }): void {
    const zoomed = view.zoom !== this.view.zoom;
    this.view = { ...view };
    this.size = size;
    // Through a turn the view follows the camera, and each frame of it is
    // drawn with its commit (flush).
    if (this.scene?.turning && !zoomed) return;
    if (zoomed) {
      this.viewAt = performance.now();
      // A frame when the zoom has rested: the drawings made again at its
      // scale.
      if (this.settleTimer) clearTimeout(this.settleTimer);
      this.settleTimer = setTimeout(() => { this.settleTimer = null; this.request(); }, SETTLE_MS + 10);
    }
    this.request();
  }
  // CrowdSink: the walkers' crowd, and word that it moved.
  crowd(c: Crowd | null): void {
    this.crowdSrc = c;
    this.forceFull = true;
    this.request();
  }
  moved(): void {
    // Through a turn the crowd is drawn with each frame of it (flush), at
    // the angle that frame draws, and nowhere between.
    if (this.scene?.turning) return;
    this.request();
  }
  // The building under a world point, as the SVG's hit test found it.
  buildingAt(x: number, y: number): string | null {
    if (this.failed) return null;
    try {
      if (this.hitsDirty) this.rebuildHits();
      return this.hits.at(x, y, this.view.zoom);
    } catch (err) {
      this.failed = true;
      this.onFail?.(err);
      return null;
    }
  }

  request(): void {
    if (this.raf || this.failed) return;
    this.raf = requestAnimationFrame((t) => {
      this.raf = 0;
      this.frame(t);
    });
  }
  // Draws now, in this task (a turn's frame, with the commit that set it).
  flush(): void {
    if (this.raf) { cancelAnimationFrame(this.raf); this.raf = 0; }
    this.frame(performance.now());
  }

  // Nothing left to draw but the walkers: the view is shown in full, its
  // drawings made (for the review tools).
  settled(): boolean {
    return !this.failed && !this.sceneDirty && this.settleTimer === null && !this.pending && !this.scene?.turning;
  }

  // --- the frame -------------------------------------------------------------------

  // A frame that throws (something in the scene it cannot record or draw)
  // stops the canvas for good and tells the map, which falls back to the
  // SVG map for the session rather than stop the game.
  onFail: ((err: unknown) => void) | null = null;
  private failed = false;
  private frame(now: number): void {
    if (this.failed) return;
    try {
      this.paintFrame(now);
    } catch (err) {
      this.failed = true;
      if (this.raf) { cancelAnimationFrame(this.raf); this.raf = 0; }
      this.onFail?.(err);
    }
  }
  private paintFrame(now: number): void {
    const scene = this.scene;
    const size = this.size;
    if (!scene || !size) return;
    const t0 = performance.now();
    const st = { ms: 0, recorded: 0, drawn: 0, laid: 0, direct: 0, walkers: 0, unsupported: {} as Record<string, number>, parts: { record: 0, draw: 0, layers: 0, compose: 0, area: 0 }, partial: -1 };
    ViewLayer.painted = 0;
    this.entryRec.resetStats();
    this.groundRec.resetStats();
    const dpr = window.devicePixelRatio || 1;
    const W = Math.round(size.width * dpr);
    const H = Math.round(size.height * dpr);
    if (this.canvas.width !== W || this.canvas.height !== H) {
      this.canvas.width = W;
      this.canvas.height = H;
      this.canvas.style.width = `${size.width}px`;
      this.canvas.style.height = `${size.height}px`;
    }
    const v = this.view;
    const sNow = v.zoom * dpr;
    let more = false;
    // A frame of a turn: everything is drawn straight onto the map, since
    // drawings are kept only for a camera at rest.
    const moving = scene.turning;

    // The season: every rule is read again, and everything redrawn.
    if (scene.soft !== this.softSeen) {
      this.softSeen = scene.soft;
      this.groundRules.reset();
      this.entryRules.reset();
      this.walkerColors = null;
      this.gold = this.entryRules.color('var(--gold)');
    }
    this.groundRules.setRootClass(scene.groundClass);

    // The scale drawings are made at: the view's, once a zoom rests. Those
    // made at another stand in, scaled, until they are made again.
    if (this.scale === 0 || (sNow !== this.scale && t0 - this.viewAt >= SETTLE_MS)) {
      if (this.scale !== 0 && this.scale !== sNow) {
        this.ground.forget();
        this.land.forget();
      }
      this.scale = sNow;
    }
    const s = this.scale;
    const zoomNow = s / dpr;

    // The doors held open, by building.
    const held = this.crowdSrc?.held ?? null;
    let doorsChanged = false;
    if (held !== this.heldSeen) {
      this.heldSeen = held;
      const next = new Map<string, string>();
      for (const key of held ?? []) {
        const [id, side] = key.split('|');
        next.set(id!, `${next.get(id!) ?? ''}${side},`);
      }
      for (const [id, d] of next) if (this.doorsById.get(id) !== d) doorsChanged = true;
      for (const id of this.doorsById.keys()) if (!next.has(id)) doorsChanged = true;
      this.doorsById = next;
    }

    // 1. What each thing draws: recorded again when it changed (its
    // signature, or the doors it holds open); a change of season only
    // marks it, for the budget below.
    if (scene.defs !== undefined && scene.defs !== this.defsSeen) {
      this.defsSeen = scene.defs;
      this.entryRec.declare(scene.defs);   // the defs are shared with groundRec
    }
    if (this.sceneDirty || doorsChanged || this.doorsPending) {
      this.doorsPending = false;
      const seen = new Set<string>();
      const order: Rec[] = [];
      for (const e of scene.entries) {
        seen.add(e.key);
        const doors = e.kind === 'mass' && e.owner ? this.doorsById.get(e.owner) ?? '' : '';
        let r = this.recs.get(e.key);
        const kept = r?.variants.get(doors);
        if (r && r.sig === e.sig && r.soft === scene.soft && r.doors !== doors && !(kept?.drawing && kept.drawing.scale === this.scale) && performance.now() - t0 > DOOR_MS) {
          // Other doors, not kept, past the frame's time for them: the
          // next frame's.
          r.entry = e;
          this.doorsPending = true;
          more = true;
        } else if (r && r.sig === e.sig && r.soft === scene.soft && r.doors !== doors) {
          // Other doors: a variant kept, else a new one.
          r.entry = e;
          r.variants.set(r.doors, { ops: r.ops, box: r.box, drawing: r.drawing });
          const v = r.variants.get(doors);
          r.doors = doors;
          if (v && v.drawing && v.drawing.scale === this.scale) {
            r.ops = v.ops; r.box = v.box; r.drawing = v.drawing; r.redraw = false;
          } else {
            r.ops = this.entryRec.record(e.key, e.node, scene.values);
            r.box = opsBox(r.ops, zoomNow);
            r.drawing = null;
            r.redraw = true;
            st.recorded += 1;
          }
          if (r.variants.size > MAX_VARIANTS) {
            const [oldest] = r.variants.keys();
            if (oldest !== undefined && oldest !== doors) {
              const gone = r.variants.get(oldest);
              if (gone?.drawing && gone.drawing !== r.drawing) gone.drawing.bitmap?.close();
              r.variants.delete(oldest);
            }
          }
        } else if (!r || r.sig !== e.sig || r.doors !== doors) {
          if (!r || r.sig !== e.sig) this.hitsDirty = true;
          if (r) this.dropVariants(r);
          const ops = this.entryRec.record(e.key, e.node, scene.values);
          st.recorded += 1;
          r = { entry: e, sig: e.sig, doors, soft: scene.soft, ops, box: opsBox(ops, zoomNow), boxZoom: zoomNow, drawing: r?.drawing ?? null, redraw: true, variants: new Map() };
          this.recs.set(e.key, r);
        } else {
          r.entry = e;
        }
        order.push(r);
      }
      for (const key of this.recs.keys()) {
        if (!seen.has(key)) {
          const gone = this.recs.get(key);
          if (gone) this.dropVariants(gone);
          gone?.drawing?.bitmap?.close();
          this.recs.delete(key);
          this.entryRec.forget(key);
          this.hitsDirty = true;
        }
      }
      this.order = order;
      this.buildIndex();
    }
    if (this.sceneDirty) {
      if (this.ground.sig !== scene.ground.sig || this.ground.soft !== scene.soft) {
        this.ground.ops = this.groundRec.record('ground', scene.ground.node, scene.values);
        // Seen from a new camera, none of it stands; otherwise it is drawn
        // again where the map says, and everywhere else in time.
        const cam = `${scene.camera.azimuth},${scene.camera.pitch}`;
        if (this.ground.cam !== cam) this.ground.forget();
        else this.ground.changed(this.ground.soft === scene.soft ? scene.groundDirty : null);
        this.ground.cam = cam;
        this.ground.sig = scene.ground.sig;
        this.ground.soft = scene.soft;
        this.hitsDirty = true;
        st.recorded += 1;
      }
      if (this.land.sig !== scene.ring.sig || this.land.soft !== scene.soft) {
        this.land.ops = this.groundRec.record('ring', scene.ring.node, scene.values);
        // A new camera changes all of it at once; the season, a strip a frame.
        if (this.land.sig !== scene.ring.sig) this.land.forget(); else this.land.changed(null);
        this.land.sig = scene.ring.sig;
        this.land.soft = scene.soft;
        st.recorded += 1;
      }
      if (this.front.sig !== scene.front.sig || this.front.soft !== scene.soft) {
        this.front.ops = this.groundRec.record('front', scene.front.node, scene.values);
        this.front.sig = scene.front.sig;
        this.front.soft = scene.soft;
        this.front.drawing = null;
        this.hitsDirty = true;
        st.recorded += 1;
      }
      this.sceneDirty = false;
    }
    const t1 = performance.now();
    st.parts.record = t1 - t0;
    // The boxes answer the zoom (a stroke that does not scale is wider in
    // the world the further out the view is).
    if (this.order.length && this.order[0]!.boxZoom !== zoomNow) {
      for (const r of this.order) { r.box = opsBox(r.ops, zoomNow); r.boxZoom = zoomNow; }
      this.buildIndex();
    }

    // 2. The drawings the view needs, at rest. A thing whose drawing no
    // longer shows it (changed, or seen from a new camera) is drawn at once;
    // one whose old drawing can stand in (made at another scale, or before
    // the season changed) within a budget of shapes a frame.
    const view: Box = [-v.x / v.zoom, -v.y / v.zoom, (size.width - v.x) / v.zoom, (size.height - v.y) / v.zoom];
    if (!moving) {
      const now2: Rec[] = [];
      const later: Rec[] = [];
      for (const r of this.order) {
        if (!overlaps(r.box, view)) continue;
        if (!r.drawing || r.redraw) now2.push(r);
        else if (r.drawing.scale !== s || r.soft !== scene.soft) later.push(r);
      }
      for (const r of now2) {
        if (r.soft !== scene.soft && this.refreshSoft(r, scene, zoomNow)) st.recorded += 1;
        // Past the frame's time for drawings (after a turn, most of the
        // scene's): drawn straight onto the map this frame, and kept
        // over the next.
        if (performance.now() - t0 > BUILD_MS) { more = true; continue; }
        if (this.draw(r, s, dpr)) st.drawn += 1;
      }
      let budget = BUILD_SHAPES;
      for (const r of later) {
        if (budget <= 0) { more = true; break; }
        if (r.soft !== scene.soft) {
          const known = r.freeOf !== undefined && softChanged(r.soft, scene.soft).every((k) => r.freeOf!.has(k));
          if (!known) {
            if (this.refreshSoft(r, scene, zoomNow)) st.recorded += 1;
            budget -= r.ops.length;
          } else {
            r.soft = scene.soft;
          }
          // The season left it as it was, and its drawing is at this scale:
          // it stands.
          if (r.drawing && r.drawing.scale === s && !r.redraw) continue;
        }
        if (this.draw(r, s, dpr)) st.drawn += 1;
        budget -= r.ops.length;
      }
      const t2 = performance.now();
      st.parts.draw = t2 - t1;
      const area = { area: TILE_AREA * dpr * dpr };
      const late = performance.now() - t0 > BUILD_MS;
      if (this.land.update(v, size, s, dpr, area, late)) more = true;
      // After a turn, one layer's view a frame: the ground waits a frame
      // (drawn straight on meanwhile) when the land drew its view in this one.
      if (this.ground.update(v, size, s, dpr, area, late || this.land.drewView)) more = true;
      st.parts.layers = performance.now() - t2;
    }
    const t3 = performance.now();

    // 3. The frame: the ground, the scene with the walkers in it, the land
    // in front. When the view, the camera, the season and the layers all
    // stand as the last frame left them (Play: the walkers moved, a door
    // opened, a building changed), only where something moved or changed
    // is drawn again, clipped to it; everything else stays on the map.
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.xf = 0;
    ctx.globalAlpha = 1;
    const tx = v.x * dpr;
    const ty = v.y * dpr;
    const world: Affine = [sNow, 0, 0, sNow, tx, ty];
    const toDevice = (b: Box): Box => [b[0] * sNow + tx, b[1] * sNow + ty, b[2] * sNow + tx, b[3] * sNow + ty];
    const slots = this.walkerSlots(scene, view);
    const figs = this.lastWalkers.map((k) => toDevice(k.fig));
    const c = this.composed;
    const reduced = scene.rings.length > 0 && (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
      || document.documentElement.dataset.motion === 'reduce');
    const ringsLive = reduced || scene.rings.some((r) => { const at = this.ringStart.get(r.id); return at === undefined || now - at < RING_MS; });
    const partial = !this.forceFull && !moving && c !== null && sNow === this.scale && !ringsLive
      && c.x === v.x && c.y === v.y && c.zoom === v.zoom && c.W === W && c.H === H && c.inspected === scene.inspected && c.soft === scene.soft
      && c.front === this.front.ops && c.land === this.land.drawing && c.ground === this.ground.drawing && this.land.covers && this.ground.covers;
    // Where this frame draws, in cells of CELL_PX device pixels.
    const dirty = new Set<number>();
    const cols = Math.ceil(W / CELL_PX) + 1;
    const mark = (b: Box) => {
      const x0 = Math.max(0, Math.floor((b[0] - 2) / CELL_PX)); const x1 = Math.min(cols - 1, Math.floor((b[2] + 2) / CELL_PX));
      const y0 = Math.max(0, Math.floor((b[1] - 2) / CELL_PX)); const y1 = Math.min(Math.ceil(H / CELL_PX), Math.floor((b[3] + 2) / CELL_PX));
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) dirty.add(y * cols + x);
    };
    const touches = (b: Box) => {
      const x0 = Math.max(0, Math.floor(b[0] / CELL_PX)); const x1 = Math.min(cols - 1, Math.floor(b[2] / CELL_PX));
      const y0 = Math.max(0, Math.floor(b[1] / CELL_PX)); const y1 = Math.min(Math.ceil(H / CELL_PX), Math.floor(b[3] / CELL_PX));
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (dirty.has(y * cols + x)) return true;
      return false;
    };
    const shown = new Set<Rec>();
    for (const r of this.order) {
      if (!overlaps(r.box, view)) continue;
      shown.add(r);
      const laid = r.drawing && !r.redraw && !moving ? r.drawing : null;
      const box = toDevice(r.box);
      if (partial && (laid === null || r.laid !== laid || !r.laidBox || r.laidBox.some((x, i) => x !== box[i]))) {
        mark(box);
        if (r.laidBox) mark(r.laidBox);
      }
      r.laid = laid;
      r.laidBox = box;
    }
    if (partial) {
      for (const r of this.shown) if (!shown.has(r) && r.laidBox) mark(r.laidBox);
      for (const f of this.figs) mark(f);
      for (const f of figs) mark(f);
      for (const [layer, d] of [[this.land, this.land.drawing], [this.ground, this.ground.drawing]] as const) {
        for (const t of layer.touched) mark([t[0] + d!.ox + tx, t[1] + d!.oy + ty, t[2] + d!.ox + tx, t[3] + d!.oy + ty]);
      }
    }
    this.land.touched.length = 0;
    this.ground.touched.length = 0;
    this.shown = shown;
    this.figs = figs;
    this.forceFull = false;
    this.composed = { x: v.x, y: v.y, zoom: v.zoom, W, H, inspected: scene.inspected, soft: scene.soft, front: this.front.ops, land: this.land.drawing, ground: this.ground.drawing };
    st.partial = partial ? dirty.size * CELL_PX * CELL_PX : -1;
    if (partial) {
      ctx.save();
      ctx.beginPath();
      const rows = Math.ceil(H / CELL_PX) + 1;
      for (let y = 0; y < rows; y++) {
        let run = -1;
        for (let x = 0; x <= cols; x++) {
          const on = x < cols && dirty.has(y * cols + x);
          if (on && run < 0) run = x;
          if (!on && run >= 0) { ctx.rect(run * CELL_PX, y * CELL_PX, (x - run) * CELL_PX, CELL_PX); run = -1; }
        }
      }
      ctx.clip();
    }
    ctx.clearRect(0, 0, W, H);
    const direct = (ops: readonly Op[], alpha = 1) => {
      ctx.globalAlpha = 1;
      replay(ctx, alpha < 1 ? [{ k: 'layer', alpha, ops: ops as Op[] }] : ops, { base: world, zoom: v.zoom, dpr });
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.xf = 0;
      ctx.globalAlpha = 1;
      st.direct += 1;
    };
    if (!moving && this.land.drawing && this.land.covers) this.lay(this.land.drawing, sNow, tx, ty, 1);
    else direct(this.land.ops);
    if (!moving && this.ground.drawing && this.ground.covers) this.lay(this.ground.drawing, sNow, tx, ty, 1);
    else direct(this.ground.ops);
    // Rings on the open ground (its plates are in the ground's drawing).
    const ringsBy = new Map(scene.rings.map((r) => [r.id, r]));
    const drawRing = (id: string) => {
      const ring = ringsBy.get(id);
      if (ring) more = this.ring(ring, now, world, dpr) || more;
    };
    for (const r of scene.rings) if (!scene.entries.some((e) => e.kind === 'mass' && e.owner === r.id)) drawRing(r.id);
    st.walkers = [...slots.values()].reduce((n, l) => n + l.length, 0);
    const n = this.order.length;
    for (let i = 0; i <= n; i++) {
      const here = slots.get(i);
      if (here) this.walkers(here, world);
      if (i === n) break;
      const r = this.order[i]!;
      if (!shown.has(r) || (partial && !touches(r.laidBox!))) continue;
      const dim = scene.inspected !== null && r.entry.kind === 'mass' && r.entry.owner !== scene.inspected ? 0.45 : 1;
      // A drawing stands in only if it shows what the thing draws now (at
      // whatever scale); a thing changed and not yet drawn again, or seen
      // from a camera in motion, is drawn straight onto the map.
      if (r.drawing && !r.redraw && !moving) {
        this.lay(r.drawing, sNow, tx, ty, dim);
        st.laid += 1;
      } else {
        direct(r.ops, dim);
      }
      if (r.entry.kind === 'mass' && r.entry.owner) drawRing(r.entry.owner);
    }
    // The land in front: a few dozen small sprites, drawn every frame.
    direct(this.front.ops);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    if (partial) ctx.restore();

    if (sNow !== this.scale) more = true;
    for (const [key, n2] of this.entryRec.stats.unsupported) st.unsupported[key] = (st.unsupported[key] ?? 0) + n2;
    for (const [key, n2] of this.groundRec.stats.unsupported) st.unsupported[key] = (st.unsupported[key] ?? 0) + n2;
    for (const [key, n2] of Object.entries(st.unsupported)) this.missed[key] = (this.missed[key] ?? 0) + n2;
    st.ms = performance.now() - t0;
    st.parts.compose = performance.now() - t3;
    st.parts.area = ViewLayer.painted;
    this.stats = st;
    this.pending = more;
    if (more) this.request();
  }

  // Records `r` again for the scene's season and snow. False when the
  // recording came out the same, which it learns (freeOf: the colors that
  // changed) so a change to those alone passes it by; its drawing stands.
  private refreshSoft(r: Rec, scene: CanvasScene, zoomNow: number): boolean {
    const changed = softChanged(r.soft, scene.soft);
    const ops = this.entryRec.record(r.entry.key, r.entry.node, scene.values);
    r.soft = scene.soft;
    const before = opsKey(r.ops);
    if (before !== null && before === opsKey(ops)) {
      r.freeOf ??= new Set();
      for (const k of changed) r.freeOf.add(k);
      return false;
    }
    this.dropVariants(r);
    r.ops = ops;
    r.box = opsBox(ops, zoomNow);
    r.redraw = true;
    return true;
  }

  // A building's other-door drawings, gone with a change to the rest of it.
  private dropVariants(r: Rec): void {
    for (const v of r.variants.values()) if (v.drawing && v.drawing !== r.drawing) v.drawing.bitmap?.close();
    r.variants.clear();
  }

  // Makes (or remakes) a thing's drawing.
  private draw(r: Rec, s: number, dpr: number): boolean {
    const b = r.box;
    r.redraw = false;
    if (!Number.isFinite(b[0])) { r.drawing = null; return false; }
    const ox = Math.floor(b[0] * s) - 1;
    const oy = Math.floor(b[1] * s) - 1;
    const w = Math.ceil(b[2] * s) + 1 - ox;
    const h = Math.ceil(b[3] * s) + 1 - oy;
    if (w > MAX_DRAWING || h > MAX_DRAWING || w <= 0 || h <= 0) { r.drawing?.bitmap?.close(); r.drawing = null; return false; }
    const oc = this.scratch ?? (this.scratch = new OffscreenCanvas(w, h));
    if (oc.width !== w) oc.width = w;
    if (oc.height !== h) oc.height = h;
    const c = oc.getContext('2d') as unknown as CanvasRenderingContext2D | null;
    if (!c) return false;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, w, h);
    replay(c, r.ops, { base: [s, 0, 0, s, -ox, -oy], zoom: s / dpr, dpr });
    const bitmap = oc.transferToImageBitmap();
    const held = r.drawing && [...r.variants.values()].some((v) => v.drawing === r.drawing);
    if (!held) r.drawing?.bitmap?.close();
    r.drawing = { image: bitmap, bitmap, w, h, ox, oy, scale: s };
    return true;
  }

  // Lays a drawing on the map at the view: moved, and scaled if it was
  // made at another scale (mid-zoom, or not yet made again after one).
  private lay(d: Drawing, sNow: number, tx: number, ty: number, alpha: number): void {
    const ctx = this.ctx;
    const k = sNow / d.scale;
    if (this.xf !== 0) { ctx.setTransform(1, 0, 0, 1, 0, 0); this.xf = 0; }
    ctx.globalAlpha = alpha;
    if (!d.wx && !d.wy) {
      if (k === 1) ctx.drawImage(d.image, d.ox + Math.round(tx), d.oy + Math.round(ty));
      else ctx.drawImage(d.image, d.ox * k + tx, d.oy * k + ty, d.w * k, d.h * k);
    } else {
      // Wrapped round: laid in up to four pieces.
      for (const [a0, a1, sx] of wrapSpans(0, d.w, d.w, d.wx)) {
        for (const [b0, b1, sy] of wrapSpans(0, d.h, d.h, d.wy)) {
          if (k === 1) ctx.drawImage(d.image, a0 + sx, b0 + sy, a1 - a0, b1 - b0, d.ox + a0 + Math.round(tx), d.oy + b0 + Math.round(ty), a1 - a0, b1 - b0);
          else ctx.drawImage(d.image, a0 + sx, b0 + sy, a1 - a0, b1 - b0, (d.ox + a0) * k + tx, (d.oy + b0) * k + ty, (a1 - a0) * k, (b1 - b0) * k);
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  // The scene's things by where their drawings fall, in world cells.
  private static CELL = 64;
  private buildIndex(): void {
    const C = MapCanvas.CELL;
    this.index = new Map();
    this.order.forEach((r, i) => {
      const b = r.box;
      if (!Number.isFinite(b[0])) return;
      for (let cy = Math.floor(b[1] / C); cy <= Math.floor(b[3] / C); cy++) {
        for (let cx = Math.floor(b[0] / C); cx <= Math.floor(b[2] / C); cx++) {
          const key = cy * 100003 + cx;
          const list = this.index.get(key);
          if (list) list.push(i); else this.index.set(key, [i]);
        }
      }
    });
  }

  // Each shown walker's slot in the paint order: before the first thing
  // nearer the camera whose drawing reaches its figure.
  private walkerSlots(scene: CanvasScene, view: Box): Map<number, number[]> {
    const out = new Map<number, number[]>();
    const crowd = this.crowdSrc;
    if (!crowd || crowd.size === 0) return out;
    const proj = projectorFor(scene.camera);
    const ax = { cosA: Math.cos(scene.camera.azimuth), sinA: Math.sin(scene.camera.azimuth) };
    const boxes = this.order.map((r) => r.entry.box);
    const C = MapCanvas.CELL;
    const keyed: { i: number; y: number; slot: number; fig: Box }[] = [];
    for (let i = 0; i < crowd.size; i++) {
      const at = crowd.at(i);
      if (!at.shown) continue;
      const p = proj(at.col, at.row);
      const fig: Box = [p.x - FIGURE_HALF_W, p.y - FIGURE_H - 2, p.x + FIGURE_HALF_W, p.y + 3];
      if (!overlaps(fig, view)) continue;
      const found = new Set<number>();
      for (let cy = Math.floor(fig[1] / C); cy <= Math.floor(fig[3] / C); cy++) {
        for (let cx = Math.floor(fig[0] / C); cx <= Math.floor(fig[2] / C); cx++) {
          for (const j of this.index.get(cy * 100003 + cx) ?? []) if (overlaps(this.order[j]!.box, fig)) found.add(j);
        }
      }
      const candidates = [...found].sort((a, b) => a - b);
      keyed.push({ i, y: p.y, slot: walkerSlot(boxes, candidates, at.col, at.row, ax), fig });
    }
    keyed.sort((a, b) => a.slot - b.slot || a.y - b.y);
    this.lastWalkers = keyed;
    for (const k of keyed) {
      const list = out.get(k.slot);
      if (list) list.push(k.i); else out.set(k.slot, [k.i]);
    }
    return out;
  }

  private walkers(list: readonly number[], world: Affine): void {
    const crowd = this.crowdSrc;
    if (!crowd) return;
    if (!this.walkerColors) {
      const shadow = this.entryRules.resolve([{ tag: 'ellipse', cls: 'walker-shadow' }]).fill ?? 'rgba(0, 0, 0, 0.2)';
      const head = this.entryRules.resolve([{ tag: 'circle', cls: 'walker-head' }]).fill ?? '#e9c9a6';
      const leg = this.entryRules.resolve([{ tag: 'path', cls: 'walker-leg' }]).strokeWidth ?? 1.7;
      this.walkerColors = { shadow, head, legWidth: leg };
    }
    const ctx = this.ctx;
    if (this.xf !== 2) { ctx.setTransform(world[0], world[1], world[2], world[3], world[4], world[5]); this.xf = 2; }
    for (const i of list) crowd.paint(ctx, i, this.walkerColors);
    ctx.globalAlpha = 1;
  }

  // The completion ring, played once over RING_MS as styles.css's
  // campus-complete plays it: in, then out, eased. True while it plays.
  private ring(ring: { id: string; pts: readonly Pt[] }, now: number, world: Affine, dpr: number): boolean {
    let start = this.ringStart.get(ring.id);
    if (start === undefined) { start = now; this.ringStart.set(ring.id, start); }
    const reduced = typeof matchMedia === 'function' && (matchMedia('(prefers-reduced-motion: reduce)').matches
      || document.documentElement.dataset.motion === 'reduce');
    const t = reduced ? 1 : (now - start) / RING_MS;
    let opacity: number; let width: number;
    if (reduced) { opacity = 1; width = 3; } else if (t >= 1) return false;
    else if (t < 0.22) { const u = ease(t / 0.22); opacity = u; width = 1 + 3 * u; } else { const u = ease((t - 0.22) / 0.78); opacity = 1 - u; width = 4 - 2 * u; }
    const ctx = this.ctx;
    if (this.xf !== 2) { ctx.setTransform(world[0], world[1], world[2], world[3], world[4], world[5]); this.xf = 2; }
    ctx.globalAlpha = opacity;
    ctx.strokeStyle = this.gold;
    ctx.lineWidth = (width * dpr) / world[0];
    ctx.lineJoin = 'miter';
    ctx.beginPath();
    ring.pts.forEach((q, i) => (i === 0 ? ctx.moveTo(q.x, q.y) : ctx.lineTo(q.x, q.y)));
    ctx.closePath();
    ctx.stroke();
    ctx.globalAlpha = 1;
    return !reduced;
  }

  private rebuildHits(): void {
    this.hits.clear();
    this.hits.addOps(this.ground.ops);
    for (const r of this.order) this.hits.addOps(r.ops);
    this.hits.addOps(this.front.ops);
    this.hitsDirty = false;
  }
}

function overlaps(a: Box, b: Box): boolean {
  return a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1];
}
// CSS's ease-out, near enough.
function ease(u: number): number {
  return 1 - (1 - u) * (1 - u);
}
