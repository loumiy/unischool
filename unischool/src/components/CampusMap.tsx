import { useEffect, useRef, useState } from 'react';
import type { Action } from '../state/actions';
import type { Buildable, GameState, Placement, TileCoord } from '../state/types';
import { CAMPUS_GRID_HEIGHT, CAMPUS_GRID_WIDTH } from '../state/types';
import {
  canPlace, canRotate, canSiteRetroactively, footprintIsClear, footprintOf,
  isPlaceableKind, orientedFootprint, parsePathTileKey, placementTiles,
} from '../state/campusMap';
import { canStartDevelopment } from '../systems/techtree/techSystem';
import HelpHint from './HelpHint';
import BuildingInfoPanel from './BuildingInfoPanel';
import BuildingMotif, { heightOf, tintFor } from './buildingMotifs';
import { TILE_H, WORLD, boxFaces, lift, polyPoints, project, tileAt } from './isoProjection';

// The campus map: the game's base layer, always on screen under everything
// else (see App.tsx), and a placement + rendering layer over the SAME
// Buildables the build popup lists. It reads `s.placements` + `s.tech` and
// dispatches PLACE_BUILDABLE; it computes nothing, owns no game state, and
// changes no outcome beyond what PLACE_BUILDABLE itself already does (the
// same cost/gate/countdown a course's START_DEVELOPMENT uses — see
// techSystem.ts's canStartDevelopment). Siting IS how a placeable Buildable
// starts now: there is no cosmetic-after-the-fact placement step left, and
// a building that covers four tiles costs and grants exactly what its data
// says, worth no more or less for the ground it stands on.
//
// `selectedId`/`onSelect` and `pathTool` — which Buildable is currently
// picked up for siting, and which path-drawing tool (if any) is active —
// are LIFTED to App.tsx rather than owned here, because the build popup
// (BuildPopup.tsx, toggled from the bottom toolbar) is the other place that
// can arm either one: App.tsx is the nearest shared ancestor. Every other
// transient UI concern below (rotation, the inspected building, hover)
// stays local — nothing else here needs to be reachable from outside this
// component.
//
// Being the central surface is a LAYOUT fact, not a mechanical one: nothing
// here gained authority over the sim by moving to the middle of the screen.
//
// The grid is drawn at its own true size (below) rather than shrunk to fit
// whatever space is left around the chrome — on most screens that makes it
// bigger than the visible canvas, panned and zoomed like a real place
// rather than a diagram sized to the window. Panning/zooming is PURELY
// visual: it moves a `<g>` transform, never touches tileX/tileY, so every
// placement coordinate below is completely unaware it can happen.
//
// Plain SVG on purpose: tiles are <rect>s, placed buildings are a <rect>
// spanning their footprint plus a wrapped <text> label. No canvas, no game
// library, no new deps. (The isometric rebuild is a separate, later arc;
// this is the flat map made finer-grained, not a step toward it.)

// --- layout ---
// The map is drawn in 2:1 dimetric projection (see isoProjection.ts, which
// owns every bit of the geometry). This file keeps only what is about the
// MAP rather than about the projection: how big the world is, how far it
// zooms, and what is drawn on it.
//
// The flat map's per-tile <rect> ground is gone. An angled grid is drawn as
// one plate polygon plus two families of parallel lines — about 250 line
// segments in a single <path> — instead of CAMPUS_GRID_WIDTH *
// CAMPUS_GRID_HEIGHT (126 * 126 = 15,876) rects. That is not a compromise
// forced by the projection; it is strictly cheaper than what it replaces,
// and it is possible because a mouse position now resolves to a tile by
// arithmetic (isoProjection's unproject) rather than by asking the DOM
// which rect was hit.
const MAP_PADDING = 64;

// Placed buildings draw slightly INSET within their footprint — a pure
// RENDER offset, not a footprint change: occupancy, canPlace, bounds and the
// stored Placement all still work in whole tiles. Without it two buildings
// on tile-adjacent footprints would share an edge with nothing between them
// and fuse into one mass. In tile units rather than pixels now, since the
// projection turns a fixed pixel inset into a different real distance on
// each axis.
const BUILDING_INSET = 0.06;

// Labels. On an angled map a name can no longer be typeset INTO the shape
// it belongs to — a building's roof is a rhombus, not a text box — so the
// label became its own thing: one line, centred over the mass, on a small
// plate that keeps it readable whatever roof tint or wall happens to be
// behind it. Drawn in a pass after every building (see the render below) so
// a label is never half-hidden by whatever stands in front of its own
// building.
//
// Size scales with the footprint rather than being fixed: a fixed size is
// what made the prototype's labels unreadable, because the camera scales
// the world and a 11px label at DEFAULT_ZOOM is about six real pixels. A
// 9x9 hall now carries a label more than twice the size of a 3x3 lab's, and
// both stay in proportion to the thing they name at every zoom.
// The floor is generous on purpose. A label's size is in WORLD units, so
// the camera scales it: at DEFAULT_ZOOM (0.4) a world size of 11 lands as
// about four real pixels, which is why the prototype's labels were
// unreadable. The floor is set so the smallest footprint on campus still
// carries a legible name at the zoom the game opens at.
const LABEL_MIN_FONT_SIZE = 19;
const LABEL_MAX_FONT_SIZE = 34;
const LABEL_SIZE_PER_TILE = 1.8;   // font size grows this much per tile of (w + h)
const LABEL_CHAR_WIDTH_RATIO = 8 / 15;
const LABEL_PLATE_PAD_X = 5;
const LABEL_PLATE_PAD_Y = 3;
const LABEL_CLEARANCE = 10;        // gap between a building's apex and its label plate

// The under-construction progress bar. On the angled map it lies flat on
// the ground along the FRONT edge of the site's own footprint, where nothing
// can stand on top of it, rather than across the building's face.
const PROGRESS_BAR_DEPTH = 0.22;   // in tiles

// --- pan & zoom ---
// Deliberately kept OUT of React state (see the view*Ref below): the whole
// grid can be several thousand <rect>s, and re-rendering all of them on
// every pixel of mouse movement while dragging would be the difference
// between a smooth drag and a janky one. The `<g ref={worldRef}>` below
// never carries a `transform` prop in its JSX — React never touches that
// attribute, so
// setting it imperatively here is invisible to (and never fought by) the
// normal render cycle, exactly like an uncontrolled input.
// MIN_ZOOM is deliberately low: a fully built-out campus spreads across a lot
// of the 126x126 grid, and a player wants to be able to pull back far enough to
// take the whole thing in at once, not just a cluster of it.
const MIN_ZOOM = 0.22;
const MAX_ZOOM = 2.5;
// The zoom the map first loads at (see defaultView below) — noticeably
// further out than native size (zoom 1, one TILE_SIZE px per tile) so a
// campus that's been built out for a while reads as a campus, not a close-
// up of whatever corner happened to center. Nowhere near MIN_ZOOM's own
// "whole 126x126 grid" extreme (this map is bigger than any built-out game
// ever gets), just a wider starting view than the placement-precision zoom
// a player zooms into by hand when siting something.
const DEFAULT_ZOOM = 0.4;
const ZOOM_SPEED = 0.0016;       // wheel deltaY -> zoom factor
const PAN_CLICK_THRESHOLD = 4;   // px of movement before a mousedown counts as a drag, not a click

// The world's drawn extent. Unlike the flat map's, this is NOT anchored at
// the origin: the grid projects to a diamond whose left corner sits at
// negative x, so defaultView below has to centre on the real bounds rather
// than assume the world starts at 0,0. Headroom is added at the top for the
// tallest building's roof, which draws above its own footprint.
const WORLD_TOP_HEADROOM = 140;

// The ground: one plate polygon and one <path> holding both families of
// grid lines. Built once at module scope — the grid never changes shape, so
// there is no reason to rebuild ~250 line segments on every render.
const GROUND_PLATE = boxFaces(0, 0, CAMPUS_GRID_WIDTH, CAMPUS_GRID_HEIGHT, 0, 0).top;
const GRID_LINES = (() => {
  const seg: string[] = [];
  for (let r = 0; r <= CAMPUS_GRID_HEIGHT; r++) {
    const a = project(0, r); const b = project(CAMPUS_GRID_WIDTH, r);
    seg.push(`M${a.x.toFixed(1)},${a.y.toFixed(1)}L${b.x.toFixed(1)},${b.y.toFixed(1)}`);
  }
  for (let c = 0; c <= CAMPUS_GRID_WIDTH; c++) {
    const a = project(c, 0); const b = project(c, CAMPUS_GRID_HEIGHT);
    seg.push(`M${a.x.toFixed(1)},${a.y.toFixed(1)}L${b.x.toFixed(1)},${b.y.toFixed(1)}`);
  }
  return seg.join('');
})();
const MAP_HEIGHT = WORLD.maxY - WORLD.minY + MAP_PADDING * 2 + WORLD_TOP_HEADROOM;

// The CSS hook for a placed building. Colour is no longer decided here —
// tintFor (buildingMotifs.tsx) owns it, because the angled map derives five
// shades from each tint and a stylesheet cannot do that arithmetic. What is
// left is the kind class, which drives behaviour rules (the inspect dimming)
// rather than any fill.
function kindClasses(t: Buildable): string {
  return `kind-${t.kind}`;
}

// A placed building's drawn footprint: its own tiles, inset so two
// tile-adjacent buildings read as two masses with a seam rather than one
// fused block. Occupancy is untouched — this is render geometry only.
function drawnFootprint(p: Placement) {
  return {
    col: p.col + BUILDING_INSET,
    row: p.row + BUILDING_INSET,
    w: p.w - BUILDING_INSET * 2,
    h: p.h - BUILDING_INSET * 2,
  };
}

// Where a building's label sits, and how big: centred on the footprint's
// projected centre, raised clear of the mass's apex.
function labelLayout(t: Buildable, p: Placement) {
  const size = Math.max(
    LABEL_MIN_FONT_SIZE,
    Math.min(LABEL_MAX_FONT_SIZE, (p.w + p.h) * LABEL_SIZE_PER_TILE),
  );
  const anchor = lift(
    project(p.col + p.w / 2, p.row + p.h / 2),
    heightOf(t) + LABEL_CLEARANCE + size,
  );
  const textWidth = t.name.length * size * LABEL_CHAR_WIDTH_RATIO;
  return { size, anchor, textWidth };
}

// One placed building: its mass (buildingMotifs.tsx draws the roof, the
// walls and whatever the motif adds) plus, while it is going up, a progress
// bar lying on the ground along the front of its own site.
//
// Clicking is handled by this group's own onClick rather than by the ground
// underneath it. That matters on an angled map: a tall building is DRAWN
// above the tiles it occupies, so a click on its roof lands, in ground
// terms, on a tile somewhere behind it. Letting the SVG hit-test the shape
// actually drawn is both correct and free — there are only ever a few dozen
// buildings, so nothing here needs the arithmetic picking the ground uses.
function PlacedBuilding({
  t, p, onInspect, inspected, weeksLeft,
}: {
  t: Buildable; p: Placement; onInspect: () => void; inspected: boolean; weeksLeft?: number;
}) {
  const d = drawnFootprint(p);
  const developing = t.status === 'developing' && weeksLeft !== undefined;
  const elapsedFraction = developing && t.duration > 0 ? (t.duration - weeksLeft!) / t.duration : 1;

  return (
    <g
      className={`campus-building ${kindClasses(t)} ${inspected ? 'inspected' : ''} ${developing ? 'under-construction' : ''}`}
      aria-label={t.name}
      role="button"
      onClick={onInspect}
    >
      <BuildingMotif t={t} p={d} tint={tintFor(t)} developing={developing} />
      {inspected && (
        // The footprint picked out on the ground, which is the one outline
        // that cannot be hidden by the building standing on it.
        <polygon className="campus-building-halo" points={polyPoints(boxFaces(p.col, p.row, p.w, p.h, 0, 0).top)} />
      )}
      {developing && (
        <>
          <polygon
            className="campus-building-progress-track"
            points={polyPoints(boxFaces(p.col, p.row + p.h - PROGRESS_BAR_DEPTH, p.w, PROGRESS_BAR_DEPTH, 0, 0).top)}
          />
          <polygon
            className="campus-building-progress-fill"
            points={polyPoints(boxFaces(p.col, p.row + p.h - PROGRESS_BAR_DEPTH, Math.max(0, p.w * elapsedFraction), PROGRESS_BAR_DEPTH, 0, 0).top)}
          />
        </>
      )}
      <title>{developing ? `${t.name} · under construction · ${weeksLeft}w left` : `${t.name} · ${p.w}×${p.h}`}</title>
    </g>
  );
}

// The label layer. Rendered after every building so a name is never
// occluded by whatever stands in front of the thing it names, and on a
// plate so it stays readable over any roof tint, wall or pitch.
function BuildingLabel({ t, p }: { t: Buildable; p: Placement }) {
  const { size, anchor, textWidth } = labelLayout(t, p);
  return (
    <g className="campus-label" aria-hidden="true">
      <rect
        className="campus-label-plate"
        x={anchor.x - textWidth / 2 - LABEL_PLATE_PAD_X}
        y={anchor.y - size * 0.72 - LABEL_PLATE_PAD_Y}
        width={textWidth + LABEL_PLATE_PAD_X * 2}
        height={size * 0.95 + LABEL_PLATE_PAD_Y * 2}
        rx={3}
      />
      <text className="campus-label-text" x={anchor.x} y={anchor.y} fontSize={size}>{t.name}</text>
    </g>
  );
}

export default function CampusMap({
  s, act, selectedId, onSelect, pathTool, onSetPathTool,
}: {
  s: GameState;
  act: (a: Action) => void;
  // Which Buildable is currently picked up for siting, if any — lifted to
  // App.tsx (see the module comment above) so BuildPopup.tsx's "site →" row
  // can arm the same selection this component reads and clears.
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  // The active path-drawing tool, or null when the map is in its ordinary
  // placement mode. Lifted to App.tsx too (C2) — the draw/erase buttons
  // that drive it now live in the build popup (BuildPopup.tsx), not on the
  // map itself, so this component only ever READS it here; App.tsx is what
  // enforces "picking up a building and drawing/erasing a path are two
  // different jobs for the same click, so exactly one is ever live".
  pathTool: 'draw' | 'erase' | null;
  // The same toggle the build popup's tool tiles drive (App.tsx's
  // setPathTool: calling it again with the CURRENTLY active mode turns it
  // off). Right-clicking the map while a path tool is active reuses that
  // exact toggle (see onMapContextMenu below) rather than inventing a
  // separate cancel path.
  onSetPathTool: (mode: 'draw' | 'erase') => void;
}) {
  // Whether the currently-selected building has been turned 90 degrees
  // before siting (see campusMap.ts's orientedFootprint). Transient UI
  // state, not persisted itself — what's persisted is the resulting
  // {row,col,w,h} once actually placed (see types.ts's Placement).
  const [rotated, setRotated] = useState(false);
  // The id of the placed building currently showing its read-only info
  // panel, or null when none is open. Local, transient UI state — same
  // reasoning as `selectedId`/`rotated` above: nothing about which building
  // is being LOOKED AT belongs in GameState (see BuildingInfoPanel.tsx).
  // Mutually exclusive with `selectedId`/`pathTool`, same as those two are
  // with each other: selectBuilding/setPathTool below both clear it, and
  // inspectBuilding refuses to open it while either is active (see the
  // disambiguation note there).
  const [inspectedId, setInspectedId] = useState<string | null>(null);
  // The tile the pointer (or an in-flight drag) is over, so the footprint
  // about to land can be previewed. Multi-tile buildings need this: where a
  // 2x2 hall goes is no longer obvious from the tile you clicked.
  const [hover, setHover] = useState<{ row: number; col: number } | null>(null);

  // `selectedId` can now change from OUTSIDE this component (BuildPopup.tsx
  // arming a new pickup), not just through selectBuilding below — so
  // rotation is reset here, keyed on the prop itself, rather than only at
  // selectBuilding's own call sites. A fresh pickup always starts
  // unrotated, wherever it was armed from.
  useEffect(() => {
    setRotated(false);
  }, [selectedId]);
  // `pathTool` is now a prop (App.tsx owns it — see this component's own
  // module comment): entering or leaving path-drawing mode always closes
  // whatever building-info panel was open, the same "switching modes clears
  // the inspector" rule selectBuilding enforces below for the placement
  // side of this.
  useEffect(() => {
    setInspectedId(null);
  }, [pathTool]);
  // The one place selection changes: always resets rotation (a fresh pickup
  // starts unrotated) and closes the info panel, so a building picked up
  // for siting and an open inspector can never both be live. Dropping out
  // of path-drawing mode is now App.tsx's job (see setPlacingId there),
  // since pathTool is no longer local state here.
  function selectBuilding(id: string | null) {
    onSelect(id);
    setRotated(false);
    setInspectedId(null);
  }

  // --- pan & zoom (see the MIN_ZOOM/MAX_ZOOM block above for why this is
  // ref-driven rather than React state) ---
  const svgRef = useRef<SVGSVGElement>(null);
  const worldRef = useRef<SVGGElement>(null);
  const viewRef = useRef({ x: 0, y: 0, zoom: 1 });
  // A mousedown that never moves is a click (handled by the tiles' own
  // onClick); one that moves past the threshold is a drag-to-pan. Tracked
  // here, at the map level, rather than per-tile, since a pan can cross
  // dozens of tiles before the pointer comes up.
  const dragRef = useRef<{ startX: number; startY: number; startView: { x: number; y: number }; moved: boolean } | null>(null);
  // Set the instant a drag is recognised as a pan, so the click the browser
  // fires right after mouseup doesn't ALSO place a building — consumed by
  // the very next place() call, or by the next mousedown if that click
  // never happens (a pan that ends over a covered/non-targetable tile).
  const justPannedRef = useRef(false);
  // Which path tool a click-drag across tiles is currently painting with,
  // so dragging across several tiles in one gesture draws/erases all of
  // them rather than just the one the mouse went down on (mirrors dragRef's
  // own "held across a gesture" shape, one level down). Set on a tile's own
  // mousedown, read on every tile's mouseenter while still set, cleared on
  // the same global mouseup dragRef already listens for.
  const pathDragRef = useRef<'draw' | 'erase' | null>(null);
  // The last world point a path stroke painted at. The flat map painted from
  // each tile's own mouseenter, which physically cannot skip a tile; this one
  // samples mousemove instead, which can — a quick drag jumps several tiles
  // between events and would leave a dotted line. Interpolating from here to
  // the current point closes those gaps (see paintStroke).
  const pathLastRef = useRef<{ x: number; y: number } | null>(null);

  function applyView(next: { x: number; y: number; zoom: number }) {
    const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next.zoom));
    viewRef.current = { x: next.x, y: next.y, zoom };
    worldRef.current?.setAttribute('transform', `translate(${next.x} ${next.y}) scale(${zoom})`);
  }

  // The starting/recentered view: centered on DEFAULT_ZOOM, but never so far
  // out that the grid stops running off EVERY edge of the canvas — MIN_COVERAGE
  // is how much taller than the canvas the grid must render at minimum (at
  // exactly 1 it would just barely touch both edges with nothing to spare).
  // On ordinary screens DEFAULT_ZOOM alone already clears this easily (the
  // grid is enormous relative to any canvas), so this only ever bites on an
  // unusually tall, narrow canvas that could otherwise show the whole grid
  // with grass to spare above and below — the opposite of "you're standing
  // in a place bigger than the screen".
  function defaultView(rect: { width: number; height: number }) {
    const MIN_COVERAGE = 1.15;
    const zoom = Math.max(DEFAULT_ZOOM, (rect.height * MIN_COVERAGE) / MAP_HEIGHT);
    // Centre on the world's real midpoint. The angled grid is a diamond
    // whose left corner is at negative x, so unlike the flat map this
    // cannot assume the world begins at the origin.
    const midX = (WORLD.minX + WORLD.maxX) / 2;
    const midY = (WORLD.minY + WORLD.maxY) / 2;
    return { x: rect.width / 2 - midX * zoom, y: rect.height / 2 - midY * zoom, zoom };
  }

  // Center the grid in whatever space the canvas has on first paint.
  // Resizing the window afterward deliberately leaves the player's own
  // pan/zoom alone, same as any map app.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    applyView(defaultView(svg.getBoundingClientRect()));
    // Runs once, at mount, deliberately — see the comment above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Global listeners (not just on the svg) so a drag that outruns the
  // pointer past the map's edge — dragging fast toward the build rail,
  // say — still tracks correctly instead of stalling at the boundary.
  useEffect(() => {
    function onMove(e: MouseEvent) {
      const d = dragRef.current;
      if (!d) return;
      const dx = e.clientX - d.startX;
      const dy = e.clientY - d.startY;
      if (!d.moved && Math.hypot(dx, dy) > PAN_CLICK_THRESHOLD) {
        d.moved = true;
        svgRef.current?.classList.add('panning');
      }
      if (d.moved) applyView({ x: d.startView.x + dx, y: d.startView.y + dy, zoom: viewRef.current.zoom });
    }
    function onUp() {
      const d = dragRef.current;
      dragRef.current = null;
      if (d?.moved) {
        justPannedRef.current = true;
        svgRef.current?.classList.remove('panning');
      }
      // Ends a path click-drag exactly like a pan drag: wherever the mouse
      // comes up, painting stops.
      pathDragRef.current = null;
      pathLastRef.current = null;
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);


  // The ground tile under a pointer event, or null off-grid. The whole of
  // the angled map's hit-testing: screen -> world (undo the view transform)
  // -> tile (undo the projection). No per-tile DOM, no hit-target layer.
  //
  // This resolves to the GROUND, deliberately. A tall building is drawn
  // above the tiles it stands on, so the tile under the cursor while the
  // cursor is over a roof is the one behind that building — which is the
  // correct answer for "where would this go", and is why placement uses
  // this while inspecting a building uses the building's own click target.
  function worldFromEvent(e: { clientX: number; clientY: number }): { x: number; y: number } | null {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    const v = viewRef.current;
    return { x: (e.clientX - rect.left - v.x) / v.zoom, y: (e.clientY - rect.top - v.y) / v.zoom };
  }
  function tileFromEvent(e: { clientX: number; clientY: number }): TileCoord | null {
    const w = worldFromEvent(e);
    return w ? tileAt(w.x, w.y) : null;
  }

  // Hover drives the footprint ghost, and while a path tool is held down it
  // also paints. One handler on the map, where the flat version needed a
  // mouseenter on every tile.
  function onMapMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    if (dragRef.current?.moved) return;   // panning: don't jitter the ghost across the tiles a drag crosses
    if (pathDragRef.current) { paintStroke(e, pathDragRef.current); return; }
    const tile = tileFromEvent(e);
    if (!selected) return;
    setHover((cur) => (cur && tile && cur.row === tile.row && cur.col === tile.col ? cur : tile));
  }

  // Paint every tile between the last sampled point and this one, so a fast
  // drag draws a continuous walkway rather than a dotted one. Steps at half a
  // tile, which cannot step over a whole tile however the stroke is angled.
  function paintStroke(e: { clientX: number; clientY: number }, tool: 'draw' | 'erase') {
    const here = worldFromEvent(e);
    if (!here) return;
    const from = pathLastRef.current ?? here;
    pathLastRef.current = here;
    const dist = Math.hypot(here.x - from.x, here.y - from.y);
    const steps = Math.max(1, Math.ceil(dist / (TILE_H / 2)));
    let last = '';
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const tile = tileAt(from.x + (here.x - from.x) * t, from.y + (here.y - from.y) * t);
      if (!tile) continue;
      const key = `${tile.row},${tile.col}`;
      if (key === last) continue;
      last = key;
      paintTile(tile, tool);
    }
  }

  function onMapClick(e: React.MouseEvent<SVGSVGElement>) {
    const tile = tileFromEvent(e);
    if (!tile) return;
    onGroundClick(tile.row, tile.col);
  }

  function onMapMouseDown(e: React.MouseEvent<SVGSVGElement>) {
    // A path tool owns the gesture: start painting immediately and keep
    // painting across whatever tiles the pointer crosses, without ever
    // arming the pan-drag that the same mousedown would otherwise start.
    if (pathTool && e.button === 0) {
      const tile = tileFromEvent(e);
      if (tile) {
        pathDragRef.current = pathTool;
        pathLastRef.current = null;   // a new stroke never interpolates from where the last one ended
        paintStroke(e, pathTool);
        return;
      }
    }
    if (e.button !== 0) return;
    justPannedRef.current = false;
    dragRef.current = { startX: e.clientX, startY: e.clientY, startView: { x: viewRef.current.x, y: viewRef.current.y }, moved: false };
  }

  // Right-click backs out of an active path tool — the map's own equivalent
  // of the build popup's "click the same tool tile again" toggle. Only ever
  // preventDefault (suppressing the browser's own context menu) while there
  // is actually a tool to cancel; an ordinary right-click elsewhere on the
  // map is left alone.
  function onMapContextMenu(e: React.MouseEvent<SVGSVGElement>) {
    if (!pathTool) return;
    e.preventDefault();
    onSetPathTool(pathTool);
  }

  // Zoom toward the cursor, not the map's centre — the standard "point
  // stays under the pointer" formula: read where the cursor lands in WORLD
  // space before the zoom, then solve the new translate that puts that same
  // world point back under the cursor after it.
  function onWheel(e: React.WheelEvent<SVGSVGElement>) {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const cur = viewRef.current;
    const nextZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, cur.zoom * Math.exp(-e.deltaY * ZOOM_SPEED)));
    if (nextZoom === cur.zoom) return;
    const worldX = (px - cur.x) / cur.zoom;
    const worldY = (py - cur.y) / cur.zoom;
    applyView({ x: px - worldX * nextZoom, y: py - worldY * nextZoom, zoom: nextZoom });
  }

  // The zoom buttons pivot on the canvas's own centre (there's no cursor
  // position to anchor to for a button click) — same zoom-toward-a-point
  // math as the wheel handler above, just with a fixed point.
  function zoomBy(factor: number) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const cur = viewRef.current;
    const nextZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, cur.zoom * factor));
    const worldX = (cx - cur.x) / cur.zoom;
    const worldY = (cy - cur.y) / cur.zoom;
    applyView({ x: cx - worldX * nextZoom, y: cy - worldY * nextZoom, zoom: nextZoom });
  }

  // Every placeable Buildable that has cleared its gate and hasn't been
  // sited yet — exactly what BuildPopup.tsx renders a "site →" row for.
  // Picking one up here is the SAME selection that row arms (see the
  // module comment above): this is where a picked-up id resolves to a
  // real Buildable to read its footprint/gate off. Includes 'done' items
  // still awaiting a spot (see campusMap.ts's needsSiting) alongside the
  // ordinary 'available' ones — canPlace admits both, and placeById below
  // branches the actual gate/cost on which one this is.
  const pickable = s.tech.filter((t) => isPlaceableKind(t) && !(t.id in s.placements) && (t.status === 'available' || t.status === 'done'));
  // A pickable entry can vanish between renders (its gate closed, or a
  // fresh game), so never trust the stored id without re-checking it.
  const selected = pickable.find((t) => t.id === selectedId) ?? null;

  // The footprint actually being sited right now, base or rotated. The one
  // place that reads `rotated` against a real Buildable — everything below
  // (preview, canPlace, the action) goes through this rather than
  // re-deriving it, so there is exactly one rule for "what shape is this".
  const selectedFootprint = selected ? orientedFootprint(selected, rotated) : null;

  // Rotation only means anything for a building actually being CONSTRUCTED
  // here — a 'done' item awaiting siting (needsSiting) always sites at its
  // base footprint (see reducer.ts's PLACE_BUILDABLE case, which ignores
  // action.rotated for those), so neither the hotkey nor the on-screen
  // control below offers it for one.
  const canRotateSelected = !!selected && selected.status !== 'done' && canRotate(footprintOf(selected));

  // The 'R' hotkey rotates the currently-picked-up building; the on-screen
  // rotate control (near the footprint ghost, below) does the same thing.
  // Re-subscribed whenever the selection changes rather than closing over a
  // ref, since it only needs `selected`'s current footprint to decide
  // whether rotating is even meaningful (see canRotate) — a plain effect
  // dependency is simpler than threading that through a ref for a listener
  // that is this cheap to rebind. Doesn't conflict with StatusHeader's
  // 1/2/3 speed hotkeys, TabOverlay's Escape, or InterruptModal's Enter —
  // none of those bind 'r'.
  useEffect(() => {
    if (!canRotateSelected) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key.toLowerCase() !== 'r') return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      setRotated((r) => !r);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [canRotateSelected]);

  // The one placement path, whether the building was clicked into place or
  // dropped there. canPlace is re-checked in the reducer too — this copy is
  // so an illegal drop leaves the selection alone instead of quietly
  // clearing it. Always sites at the CURRENT rotation, whatever building id
  // is being placed — only one building is ever picked up at a time, and
  // selectBuilding resets `rotated` the moment the selection changes, so a
  // stale rotation from a previously-selected building can never leak in.
  //
  // A 'done' pickup (needsSiting) is a retroactive siting, not a fresh
  // build: no rotation, and the gate is canSiteRetroactively (the flat
  // RETROACTIVE_SITING_COST) rather than canStartDevelopment — mirrors the
  // reducer's own branch on node.status exactly, for the same "don't clear
  // the selection on an illegal attempt" reason noted above.
  const placeById = (id: string, row: number, col: number) => {
    const t = pickable.find((x) => x.id === id);
    if (!t) return;
    const fp = t.status === 'done' ? footprintOf(t) : orientedFootprint(t, rotated);
    if (!canPlace(s, t, row, col, fp)) return;
    if (t.status === 'done' ? !canSiteRetroactively(s, t) : !canStartDevelopment(s, t)) return;
    act({ type: 'PLACE_BUILDABLE', buildableId: id, row, col, rotated });
    selectBuilding(null);
    setHover(null);
  };
  // True (and clears the flag) exactly when the click this fires from is
  // the tail end of a drag-to-pan rather than a real click — the browser
  // fires a click on mouseup regardless of how far the pointer moved, as
  // long as it comes up over the same element it went down on. Shared by
  // every click handler below a pan can land on (placing, inspecting,
  // closing the inspector on empty ground): a pan is a pan, never any of
  // those. An ordinary click never sets the flag (see onMapMouseDown/onUp
  // above), so this is a no-op the rest of the time.
  const consumePanClick = () => {
    if (justPannedRef.current) { justPannedRef.current = false; return true; }
    return false;
  };
  // Empty ground: places the picked-up building if one is selected, same
  // as before; otherwise its only job is closing an open info panel, since
  // there's nothing else an empty-tile click could mean while nothing is
  // being sited (see selectBuilding/setPathTool above for why inspectedId
  // is already null whenever selected/pathTool is set, and inspectBuilding
  // below for the matching building-click half of this).
  const onGroundClick = (row: number, col: number) => {
    if (consumePanClick()) return;
    if (selected) { placeById(selected.id, row, col); return; }
    if (inspectedId) setInspectedId(null);
  };
  // A placed building: opens its info panel, or closes it if it's the one
  // already open — but only when the map is in its ordinary "just looking"
  // mode. While a building is picked up for siting (`selected`) or a path
  // tool is drawing/erasing (`pathTool`), the SAME click on a building is
  // that mode's own business (occupied tiles are never legal placement
  // targets, and path tiles have their own separate hit targets — see the
  // pathTool-gated tile layer below — so this simply declines to do
  // anything rather than fighting either), which is the whole of the
  // info-vs-placement disambiguation this PR adds: one flag check, not a
  // new mode of its own.
  const inspectBuilding = (id: string) => {
    if (consumePanClick()) return;
    if (selected || pathTool) return;
    setInspectedId((cur) => (cur === id ? null : id));
  };


  // One end of a path click-drag: acts on the tile immediately (so a plain
  // click without any movement still draws/erases one square) and arms
  // pathDragRef so every tile the pointer subsequently enters, while the
  // button stays down, gets the same treatment.
  const paintTile = (tile: TileCoord, tool: 'draw' | 'erase') => {
    act(tool === 'draw' ? { type: 'ADD_PATH_TILE', tile } : { type: 'REMOVE_PATH_TILE', tile });
  };

  // Placements resolved against `tech` once per render, rather than per
  // tile: 60 placeables against 15,876 cells is not worth re-scanning.
  const placed = Object.entries(s.placements)
    .map(([id, p]) => ({ p, t: s.tech.find((x) => x.id === id) }))
    .filter((entry): entry is { p: Placement; t: Buildable } => entry.t !== undefined);
  const covered = new Set<string>();
  for (const { p } of placed) {
    for (const tile of placementTiles(p)) covered.add(`${tile.row},${tile.col}`);
  }

  // The inspected building, if any, re-resolved against `placed` on every
  // render rather than trusted from state — same reasoning as `selected`
  // above: a placement can vanish (see eventData.ts's demolition event),
  // so a stale id must not go on pointing at a building no longer there.
  const inspected = placed.find(({ t }) => t.id === inspectedId) ?? null;

  // The footprint ghost under the cursor, and whether it would actually fit
  // — at the CURRENT rotation, so a rotated shape that no longer clears the
  // grid or an occupied tile is refused exactly like an unrotated overflow —
  // AND whether the school can actually afford it right now: canStartDevelopment
  // for an ordinary build, or canSiteRetroactively for a 'done' item awaiting
  // siting (see placeById's own matching branch). A ghost that reads
  // "blocked" here is a ghost a click on would genuinely do nothing.
  const preview = selected && hover && selectedFootprint
    ? {
        ...hover,
        ...selectedFootprint,
        ok: footprintIsClear(s.placements, hover.row, hover.col, selectedFootprint)
          && (selected.status === 'done' ? canSiteRetroactively(s, selected) : canStartDevelopment(s, selected)),
      }
    : null;

  return (
    <section className="campus-map">
      <div className="campus-map-canvas">
        <svg
          ref={svgRef}
          className={`campus-map-svg ${selected ? 'placing' : ''} ${pathTool ? `path-${pathTool}` : ''} ${inspectedId ? 'inspecting' : ''}`}
          // No viewBox: 1 SVG user unit is then exactly 1 CSS px, so the
          // pan/zoom transform on the <g> below (in the same units) needs
          // no extra conversion, and the map's true pixel size (TILE_SIZE
          // etc. above) is what actually renders rather than being
          // rescaled to fit the container.
          width="100%"
          height="100%"
          role="group"
          aria-label="Campus map"
          onMouseLeave={() => setHover(null)}
          onMouseMove={onMapMouseMove}
          onMouseDown={onMapMouseDown}
          onClick={onMapClick}
          onContextMenu={onMapContextMenu}
          onWheel={onWheel}
          // Drag-and-drop from the build popup lands here rather than on a
          // per-tile target: the drop point resolves to a tile the same way
          // every other pointer event does.
          onDragOver={(e) => {
            if (!selected) return;
            e.preventDefault();
            const tile = tileFromEvent(e);
            if (tile) setHover(tile);
          }}
          onDrop={(e) => {
            e.preventDefault();
            const tile = tileFromEvent(e);
            if (tile) placeById(e.dataTransfer.getData('text/plain'), tile.row, tile.col);
          }}
        >
          <g ref={worldRef}>
            {/* Ground, then drawn pathways, then buildings back-to-front,
                then the footprint ghost, then labels on top of everything.
                The flat map's two per-tile layers — 15,876 ground rects and,
                in path mode, 15,876 more hit targets — are both gone: the
                ground is one plate plus one <path> of grid lines, and every
                tile question is answered by tileFromEvent's arithmetic. */}
            <polygon className="campus-ground" points={polyPoints(GROUND_PLATE)} />
            <path className="campus-grid" d={GRID_LINES} />

            {Object.keys(s.pathways).map((key) => {
              const tile = parsePathTileKey(key);
              if (!tile) return null;
              // A path tile paves its whole grid square, so on the angled
              // map it is that square's own rhombus rather than a rect.
              return (
                <polygon
                  key={key}
                  className="campus-path-tile"
                  points={polyPoints(boxFaces(tile.col, tile.row, 1, 1, 0, 0).top)}
                />
              );
            })}

            {/* Back to front. On an angled map this ordering IS the
                occlusion: a building nearer the camera must paint over one
                behind it. Sorting on the footprint's FAR corner (row + h,
                col + w) rather than its origin is what keeps a large
                building from being drawn behind a small one it actually
                stands in front of. */}
            {[...placed]
              .sort((m, n) => (m.p.row + m.p.h + m.p.col + m.p.w) - (n.p.row + n.p.h + n.p.col + n.p.w))
              .map(({ t, p }) => (
                <PlacedBuilding
                  key={t.id}
                  t={t}
                  p={p}
                  onInspect={() => inspectBuilding(t.id)}
                  inspected={t.id === inspectedId}
                  weeksLeft={s.developing[t.id]}
                />
              ))}

            {preview && (
              <>
                <polygon
                  className={`campus-preview ${preview.ok ? 'ok' : 'blocked'}`}
                  points={polyPoints(boxFaces(preview.col, preview.row, preview.w, preview.h, 0, 0).top)}
                />
                {/* The rotate control, pinned to the ghost's right corner.
                    It lives inside the panned/zoomed world <g>, so it tracks
                    the ghost for free rather than needing screen-space
                    positioning of its own. */}
                {canRotateSelected && (() => {
                  const at = project(preview.col + preview.w, preview.row);
                  return (
                    <g
                      className="campus-rotate-btn"
                      transform={`translate(${at.x.toFixed(1)}, ${at.y.toFixed(1)})`}
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => { e.stopPropagation(); setRotated((r) => !r); }}
                      role="button"
                      aria-label="Rotate building 90 degrees"
                    >
                      <circle r={13} />
                      <text textAnchor="middle" dominantBaseline="central">⟳</text>
                      <title>Rotate (R)</title>
                    </g>
                  );
                })()}
              </>
            )}

            {placed.map(({ t, p }) => <BuildingLabel key={`label-${t.id}`} t={t} p={p} />)}
          </g>
        </svg>

        {/* The inspected building's read-only info panel. A FIXED corner
            card, not a popover anchored to the building's own screen
            position: the building's on-screen coordinates move continuously
            under pan/zoom, which is applied imperatively straight to the
            SVG transform (see applyView/viewRef above) specifically to
            avoid a React re-render on every pixel of a drag — tracking the
            popover to the building would mean re-rendering it on every one
            of those same pixels, undoing that. The map's top-left corner is
            otherwise empty (zoom sits top-right, the tray sits along the
            bottom, and C2 folded the build rail and the draw/erase path
            controls into the bottom toolbar/build popup — see Toolbar.tsx),
            so it's a natural home for a card that doesn't move. */}
        {inspected && <BuildingInfoPanel t={inspected.t} s={s} onClose={() => setInspectedId(null)} />}

        {/* Zoom floats over the map's own top-right corner — reachable
            without a wheel/trackpad (a hard requirement on a map that no
            longer fits the screen at native size). It stays here rather
            than moving into the bottom toolbar (C2) because it's a
            viewport control, not a campus-editing tool like draw/erase
            path (which DID move — see BuildPopup.tsx's CampusToolsSection):
            zoom belongs anchored to the thing it controls, not bundled with
            the build menu.

            The map used to carry a whole strip along its bottom edge (title
            + a '?' + a live one-line status hint) for this same
            orientation — collapsed here instead into one '?' beside the
            zoom buttons it already shares a corner with, in the same
            language as MainMenu's hamburger a little further up that same
            corner (see App.tsx). Losing the live status hint (what mode the
            map is currently in) is deliberate: the popup this explains
            covers the mechanic once, on demand, rather than a sentence that
            had to keep re-describing whatever was already visible on
            screen (an armed ghost, a path tool's own cursor). */}
        <div className="campus-map-zoom-controls">
          <HelpHint
            align="end"
            text="Where the university physically grows. Pick a building, dorm, or facility to build from the Build popup (the toolbar's build icon) — placing it here is how it starts: cost is charged immediately, and it counts down under construction right where you put it, reserving those tiles until it's done. Press R, or click the ⟳ on the footprint ghost, to turn a non-square building 90 degrees before setting it down. Buildings vary in size: a school hall covers many tiles, a lab a few. There must be room for the whole footprint on empty ground — nothing can be built without it. Courses are never sited: a course is not a place, and develops from the Curriculum view with no map involvement. The Draw path / Erase path buttons (also in the build popup) let you fill in tiles as walkways — free, purely decorative, and unrelated to building. Drag the map to pan, or scroll/pinch to zoom."
          />
          <button type="button" onClick={() => zoomBy(1.25)} aria-label="Zoom in">+</button>
          <button type="button" onClick={() => zoomBy(0.8)} aria-label="Zoom out">−</button>
        </div>
      </div>
    </section>
  );
}
