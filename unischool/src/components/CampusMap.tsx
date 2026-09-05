import { useEffect, useMemo, useRef, useState } from 'react';
import type { Action } from '../state/actions';
import type { Buildable, GameState, PathEdge, Placement } from '../state/types';
import { CAMPUS_GRID_HEIGHT, CAMPUS_GRID_WIDTH } from '../state/types';
import {
  canPlace, canRotate, canSiteRetroactively, edgeKey, footprintIsClear, footprintOf,
  isPlaceableKind, orientedFootprint, parseEdgeKey, placementTiles,
} from '../state/campusMap';
import { canStartDevelopment } from '../systems/techtree/techSystem';
import HelpHint from './HelpHint';
import BuildingInfoPanel from './BuildingInfoPanel';
import { useCssHeightVar } from './useCssHeightVar';

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

// --- layout (SVG user units; 1 unit = 1 CSS px at zoom 1 — see the pan/
// zoom transform below) ---
// Tiles are deliberately small now that the grid is 126x54 rather than 8x6:
// a plot, not a placard. The label sizing below is what makes that
// readable — a small facility gets a terse two-or-three-line name, a 9x9
// hall gets room for its full one.
const TILE_SIZE = 64;      // edge length of one square tile
// No gutter: the ground is one continuous lawn, not a field of separate
// paving stones — see GROUND_CORNER below and .campus-tile's thin, low-
// contrast grid line in styles.css, which is what marks the grid now that
// a gap and a rounded corner per tile no longer do.
const TILE_GAP = 0;
const MAP_PADDING = 16;      // breathing room around the whole grid
const GROUND_CORNER = 0;     // ground tiles are square — a seam in a lawn, not a tile's own edge
const BUILDING_CORNER = 8;   // placed buildings (and the footprint ghost) keep a soft corner: they're objects ON the ground, not the ground itself

// Placed buildings draw slightly INSET within the tiles their footprint
// covers — a pure RENDER offset, not a footprint change: occupancy,
// canPlace, bounds and the stored Placement (campusMap.ts) still all work
// in whole tiles, a 9x9 hall still occupies 81 of them. Two buildings on
// adjacent footprints share a tile boundary with nothing between them (see
// TILE_GAP above), so without this their drawn edges would touch exactly
// like their footprints do; insetting each one by BUILDING_INSET opens a
// (2 * BUILDING_INSET)-wide gutter centred on that shared boundary. That
// gutter has to clear the drawn path's own stroke width (5px — see
// .campus-path-edge in styles.css) with room either side of it, so a path
// edge along the boundary reads as running THROUGH the gutter rather than
// getting swallowed under a shared wall. Kept a few px, not a fraction of
// TILE_SIZE: at the smallest footprint (3x3 tiles, e.g. a lab) it's still
// a thin seam, not a visible bite out of the building.
const BUILDING_INSET = 4;

// Label metrics: shrink-to-fit sizing (see labelFor below). SVG <text> has
// no CSS text-overflow, so "does the full name fit" has to be computed
// rather than measured live in the DOM — LABEL_CHAR_WIDTH_RATIO and
// LABEL_LINE_HEIGHT_RATIO approximate an average glyph's advance and a
// line's pitch as a fraction of font size (close enough to pick a size,
// not to typeset). They're kept as font-size-relative RATIOS, not fixed
// pixel deltas, and LABEL_MIN_FONT_SIZE/LABEL_MAX_FONT_SIZE are absolute
// floors/ceilings independent of TILE_SIZE — so none of this needs to
// change when SCHOOL_BUILDING_FOOTPRINT grows from 2x2 to 9x9: a bigger
// footprint just gives the search more room to reach the ceiling, it never
// needs a different formula or a redrawn floor.
const LABEL_MAX_FONT_SIZE = 15;          // the largest a label ever renders, footprint permitting
const LABEL_MIN_FONT_SIZE = 9;           // the floor: never shrink past this, even if the wrap still overflows — the full name always renders, just cramped
const LABEL_FONT_STEP = 1;               // granularity of the shrink-to-fit search between the two sizes above
const LABEL_CHAR_WIDTH_RATIO = 8 / 15;   // avg glyph advance as a fraction of font size
const LABEL_LINE_HEIGHT_RATIO = 17 / 15; // line pitch as a fraction of font size
const LABEL_INSET = 6;          // padding between the label block and the footprint's edge
const LABEL_MAX_LINES = 3;      // a readability ceiling on lines, independent of how much vertical room the footprint has
const LABEL_MIN_CHARS = 4;      // narrower than this at every font size down to the floor, and the label is dropped rather than shredded

// The under-construction progress bar drawn along the bottom of a
// developing placement's own footprint (see PlacedBuilding below) — the
// map's visual cue that this is a building site, not a finished building,
// without needing to hover for the tooltip. Sized off TILE_SIZE the same
// spirit LABEL_* is: proportions that hold whether the footprint is a 3x3
// lab or a 12x9 stadium.
const PROGRESS_BAR_HEIGHT = 5;
const PROGRESS_BAR_INSET = LABEL_INSET;

// --- pan & zoom ---
// Deliberately kept OUT of React state (see the view*Ref below): the whole
// grid can be several thousand <rect>s, and re-rendering all of them on
// every pixel of mouse movement while dragging would be the difference
// between a smooth drag and a janky one. The `<g ref={worldRef}>` below
// never carries a `transform` prop in its JSX — React never touches that
// attribute, so
// setting it imperatively here is invisible to (and never fought by) the
// normal render cycle, exactly like an uncontrolled input.
const MIN_ZOOM = 0.35;
const MAX_ZOOM = 2.5;
// The zoom the map first loads at (see defaultView below) — noticeably
// further out than native size (zoom 1, one TILE_SIZE px per tile) so a
// campus that's been built out for a while reads as a campus, not a close-
// up of whatever corner happened to center. Nowhere near MIN_ZOOM's own
// "whole 126x54 grid" extreme (this map is bigger than any built-out game
// ever gets), just a wider starting view than the placement-precision zoom
// a player zooms into by hand when siting something.
const DEFAULT_ZOOM = 0.5;
const ZOOM_SPEED = 0.0016;       // wheel deltaY -> zoom factor
const PAN_CLICK_THRESHOLD = 4;   // px of movement before a mousedown counts as a drag, not a click

const MAP_WIDTH = MAP_PADDING * 2 + CAMPUS_GRID_WIDTH * TILE_SIZE + (CAMPUS_GRID_WIDTH - 1) * TILE_GAP;
const MAP_HEIGHT = MAP_PADDING * 2 + CAMPUS_GRID_HEIGHT * TILE_SIZE + (CAMPUS_GRID_HEIGHT - 1) * TILE_GAP;

function tileX(col: number): number {
  return MAP_PADDING + col * (TILE_SIZE + TILE_GAP);
}

function tileY(row: number): number {
  return MAP_PADDING + row * (TILE_SIZE + TILE_GAP);
}

// A footprint w tiles across spans its own tiles plus the gutters between
// them, so a 2-wide building reads as one solid block rather than two.
function spanSize(tiles: number): number {
  return tiles * TILE_SIZE + (tiles - 1) * TILE_GAP;
}

// The SVG segment one PathEdge occupies. A 'h' edge is the line from corner
// (row, col) to (row, col+1) — the top of tile (row, col) — and a 'v' edge
// is (row, col) to (row+1, col) — its left. tileX/tileY already give the
// corner coordinates for any row/col in range (including the grid's own
// bottom/right boundary, since a footprint's own bottom-right corner uses
// exactly the same call), so this needs no case beyond orientation.
function edgeLine(e: PathEdge): { x1: number; y1: number; x2: number; y2: number } {
  const x = tileX(e.col);
  const y = tileY(e.row);
  return e.orientation === 'h'
    ? { x1: x, y1: y, x2: x + TILE_SIZE, y2: y }
    : { x1: x, y1: y, x2: x, y2: y + TILE_SIZE };
}

// ---------------------------------------------------------------------
// COLOUR VARIETY. The map used to draw one fill per kind, which made a
// built-out campus a field of three colours. Placements now also carry a
// `tint-N` class, and styles.css owns every actual colour (this file owns
// geometry only, per the panel's own convention).
//
// N is chosen by what the thing IS, not at random:
//   - facility -> its facilityType's index, so all dining halls match each
//     other and none of them match the library. This is the meaningful axis.
//   - dorm -> a hash of the id, so the fifteen dorms differ from their
//     neighbours while staying in one family. Stable across sessions
//     because ids are.
//   - building has no tint class at all: the academic halls are the
//     campus's landmarks and read as ONE family, not id-hashed shades of
//     one — see `.campus-building.kind-building rect` in styles.css.
// Every tint is a shade inside the same brass/ink/parchment language; the
// classes are per-kind in CSS, so `tint-0` means a different (but related)
// colour for a dorm than for a facility.
// ---------------------------------------------------------------------
const FACILITY_TINT_ORDER = [
  'library', 'studentCenter', 'diningHall', 'recCenter',
  'healthCenter', 'quad', 'lab',
  // Appended, not interleaved: existing tint indices must never move (an
  // old save's placed buildings would otherwise silently repaint).
  'gym', 'tennisCourts', 'pool', 'performingArtsCenter', 'artGallery',
  // Varsity athletics venues, same append-only discipline. footballStadium
  // gets the boldest of the five in styles.css — the pinnacle venue reads
  // as a landmark in colour, not just in footprint, while staying an
  // ordinary tinted facility rather than borrowing kind-building's fixed
  // gold (see the single-Buildable-model note on why it isn't `building`
  // kind at all).
  'athleticsField', 'athleticsArena', 'athleticsDiamond', 'athleticsNatatorium', 'footballStadium',
] as const;
const HASHED_TINT_COUNT = 4; // shades available to dorms

function hashTint(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 1000003;
  return h % HASHED_TINT_COUNT;
}

// Building has no tint class of its own (see comment above), so this is
// only ever called for facility/dorm kinds.
function tintIndex(t: Buildable): number {
  if (t.kind === 'facility' && t.facilityType) {
    const i = FACILITY_TINT_ORDER.indexOf(t.facilityType);
    return i >= 0 ? i : 0;
  }
  return hashTint(t.id);
}

// The class list for a placed/tray Buildable: `kind-<kind>` always, plus a
// `tint-N` shade for dorm/facility. Building gets no tint class — it's a
// single fixed landmark colour in CSS, not a variety axis.
function kindClasses(t: Buildable): string {
  return t.kind === 'building' ? `kind-${t.kind}` : `kind-${t.kind} tint-${tintIndex(t)}`;
}

// Greedy word wrap into lines of at most `maxChars` — no dropping, no
// truncation. A single word longer than maxChars still gets its own line
// rather than being cut short: shrink-to-fit (see labelFor below) is what
// keeps that rare in practice, by trying smaller font sizes — and so
// larger maxChars — before ever falling back to the floor. This function's
// job is just "never lose a word", which is what makes ellipsis
// unnecessary; "always fit the box" is labelFor's job, not this one's.
function wrapLabelFull(name: string, maxChars: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of name.split(' ')) {
    const candidate = line ? `${line} ${word}` : word;
    if (!line || candidate.length <= maxChars) {
      line = candidate;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

// Shrink-to-fit: search font sizes from LABEL_MAX_FONT_SIZE down to
// LABEL_MIN_FONT_SIZE (step LABEL_FONT_STEP) and use the first — i.e.
// largest — one whose full wrapped name fits the footprint's inner box,
// both in line width (LABEL_CHAR_WIDTH_RATIO * fontSize per character) and
// in line count (LABEL_LINE_HEIGHT_RATIO * fontSize per line, capped at
// LABEL_MAX_LINES so a huge future footprint still reads as a label, not a
// wall of small text). This is what keeps "a 2x2 hall gets more lines /
// larger text than a 1x1 lab" as the starting point: a bigger footprint's
// larger innerWidth/innerHeight let the search land on a bigger font
// before it ever needs to shrink.
//
// If nothing in the range fits, LABEL_MIN_FONT_SIZE is used anyway and the
// wrap is allowed to overflow the footprint vertically — the full name is
// non-negotiable (no ellipsis), a cramped fit at the floor is the accepted
// trade-off (see the PR notes for which names hit this on today's smallest
// footprints).
//
// Pure function of (name, boxWidth, boxHeight) only — never reads the live
// DOM — so the same building always sizes the same way, render after
// render. boxWidth/boxHeight are the drawn rect's own pixel dimensions
// (already net of BUILDING_INSET — see the caller), not tile counts: the
// label has to fit the INSET rect it's centred in, not the full footprint
// span behind it.
function labelFor(name: string, boxWidth: number, boxHeight: number): { lines: string[]; fontSize: number; lineHeight: number } {
  const innerWidth = boxWidth - LABEL_INSET * 2;
  const innerHeight = boxHeight - LABEL_INSET;
  let attempt = { lines: [] as string[], fontSize: LABEL_MIN_FONT_SIZE, lineHeight: LABEL_MIN_FONT_SIZE * LABEL_LINE_HEIGHT_RATIO };
  for (let fontSize = LABEL_MAX_FONT_SIZE; fontSize >= LABEL_MIN_FONT_SIZE; fontSize -= LABEL_FONT_STEP) {
    const lineHeight = fontSize * LABEL_LINE_HEIGHT_RATIO;
    const maxChars = Math.floor(innerWidth / (fontSize * LABEL_CHAR_WIDTH_RATIO));
    const maxLines = Math.min(LABEL_MAX_LINES, Math.floor(innerHeight / lineHeight));
    if (maxChars < LABEL_MIN_CHARS || maxLines < 1) {
      attempt = { lines: [], fontSize, lineHeight };
      continue;
    }
    const lines = wrapLabelFull(name, maxChars);
    attempt = { lines, fontSize, lineHeight };
    if (lines.length <= maxLines) return attempt;
  }
  // Nothing fit down to the floor — `attempt` is the LABEL_MIN_FONT_SIZE
  // pass: the full name, possibly taller than the footprint (see comment
  // above), or [] if even the floor can't hold LABEL_MIN_CHARS.
  return attempt;
}

// One cell of the grid ground. Empty cells are the placement targets;
// covered cells are drawn over by their building and are inert.
function GroundTile({ row, col, empty, targetable, onEnter, onClick, onDrop }: {
  row: number;
  col: number;
  empty: boolean;
  targetable: boolean;   // something is picked up, so this empty cell is a live click target
  onEnter: () => void;
  onClick: () => void;
  onDrop: (buildableId: string) => void;
}) {
  const live = targetable && empty;
  return (
    <rect
      className={`campus-tile ${empty ? 'empty' : 'covered'} ${live ? 'targetable' : ''}`}
      x={tileX(col)}
      y={tileY(row)}
      width={TILE_SIZE}
      height={TILE_SIZE}
      rx={GROUND_CORNER}
      onMouseEnter={live ? onEnter : undefined}
      // Live for placement, or not: an empty tile still needs a click
      // handler while nothing is being placed, purely so clicking open
      // ground can close an open building-info panel (see onGroundClick in
      // CampusMap below, which is what actually decides what a click does).
      onClick={empty ? onClick : undefined}
      // Drag-and-drop is the same placement reached a second way, and it
      // ends in the same place() the click does — one placement path, not
      // two. It hangs off `empty` rather than `live` and carries the
      // building's id in the drag itself, so it never depends on React
      // having re-rendered between dragstart and the first dragover:
      // preventDefault here is what makes the cell a drop target at all,
      // and missing it on the first event would swallow the drop.
      onDragOver={empty ? (e) => { e.preventDefault(); onEnter(); } : undefined}
      onDrop={empty ? (e) => { e.preventDefault(); onDrop(e.dataTransfer.getData('text/plain')); } : undefined}
      role={live ? 'button' : undefined}
      aria-label={live ? `Empty tile, row ${row + 1}, column ${col + 1}` : undefined}
    >
      {/* Only empty ground says so — a covered cell is described by the
          building drawn over it, not by the ground under it. */}
      {empty && <title>{`Empty · row ${row + 1}, column ${col + 1}`}</title>}
    </rect>
  );
}

// A placed Buildable: one rect spanning its whole footprint, with its label
// centred in it. `onInspect` is always wired (never conditionally omitted)
// — CampusMap's inspectBuilding decides whether a click actually opens the
// info panel (it no-ops while a building is picked up for siting or a path
// tool is active; see the disambiguation note there), so this component
// itself carries no mode awareness. `inspected` only drives the highlight.
//
// `weeksLeft` is set exactly when `t.status === 'developing'` (read off
// s.developing by the caller — see the `placed.map` below) — the under-
// construction visual cue the PR is about: a distinct `.under-construction`
// class (styles.css) and a progress bar along the footprint's own bottom
// edge, the same "how far along" reading BuildPopup's ProgressBar gives a
// developing row there, just drawn in SVG for the map's own footprint
// instead of a fixed-width bar. A 'done' Buildable renders exactly as it
// always did.
function PlacedBuilding({
  t, p, onInspect, inspected, weeksLeft,
}: {
  t: Buildable; p: Placement; onInspect: () => void; inspected: boolean; weeksLeft?: number;
}) {
  // The footprint's own span, in whole tiles — unchanged by the inset
  // below (it still exactly matches placementTiles/canPlace's occupancy).
  // x/y/width/height are what actually gets DRAWN: the footprint inset by
  // BUILDING_INSET on every side, so this building's own edges never touch
  // a neighbour's even when their footprints are tile-adjacent (see
  // BUILDING_INSET above).
  const x = tileX(p.col) + BUILDING_INSET;
  const y = tileY(p.row) + BUILDING_INSET;
  const width = spanSize(p.w) - BUILDING_INSET * 2;
  const height = spanSize(p.h) - BUILDING_INSET * 2;
  const { lines, fontSize, lineHeight } = labelFor(t.name, width, height);
  // Centre the wrapped block vertically inside the drawn (inset) rect.
  const firstLineY = y + height / 2 - ((lines.length - 1) * lineHeight) / 2;

  const developing = t.status === 'developing' && weeksLeft !== undefined;
  const elapsedFraction = developing && t.duration > 0 ? (t.duration - weeksLeft) / t.duration : 1;
  const barWidth = width - PROGRESS_BAR_INSET * 2;
  const barY = y + height - PROGRESS_BAR_INSET - PROGRESS_BAR_HEIGHT;

  return (
    <g
      className={`campus-building ${kindClasses(t)} ${inspected ? 'inspected' : ''} ${developing ? 'under-construction' : ''}`}
      aria-label={t.name}
      role="button"
      onClick={onInspect}
    >
      <rect x={x} y={y} width={width} height={height} rx={BUILDING_CORNER} />
      {lines.map((line, i) => (
        <text
          key={i}
          x={x + width / 2}
          y={firstLineY + i * lineHeight}
          textAnchor="middle"
          fontSize={fontSize}
        >
          {line}
        </text>
      ))}
      {developing && (
        <>
          <rect className="campus-building-progress-track" x={x + PROGRESS_BAR_INSET} y={barY} width={barWidth} height={PROGRESS_BAR_HEIGHT} rx={PROGRESS_BAR_HEIGHT / 2} />
          <rect className="campus-building-progress-fill" x={x + PROGRESS_BAR_INSET} y={barY} width={Math.max(0, barWidth * elapsedFraction)} height={PROGRESS_BAR_HEIGHT} rx={PROGRESS_BAR_HEIGHT / 2} />
        </>
      )}
      <title>{developing ? `${t.name} · under construction · ${weeksLeft}w left` : `${t.name} · ${p.w}×${p.h}`}</title>
    </g>
  );
}

export default function CampusMap({
  s, act, selectedId, onSelect, pathTool,
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
  // This strip's own rendered height feeds --tray-height (see
  // styles.css's .campus-map-canvas), sized to sit just above the bottom
  // toolbar (App.tsx/Toolbar.tsx) rather than reserving a card's worth of
  // height for a list it no longer holds.
  const trayRef = useRef<HTMLDivElement>(null);
  useCssHeightVar(trayRef, '--tray-height');

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
  // Which path tool a click-drag across edges is currently painting with,
  // so dragging across several edges in one gesture draws/erases all of
  // them rather than just the one the mouse went down on (mirrors dragRef's
  // own "held across a gesture" shape, one level down). Set on an edge's
  // own mousedown, read on every edge mouseenter while still set, cleared
  // on the same global mouseup dragRef already listens for.
  const pathDragRef = useRef<'draw' | 'erase' | null>(null);

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
    return { x: (rect.width - MAP_WIDTH * zoom) / 2, y: (rect.height - MAP_HEIGHT * zoom) / 2, zoom };
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
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);


  function onMapMouseDown(e: React.MouseEvent<SVGSVGElement>) {
    if (e.button !== 0) return;
    justPannedRef.current = false;
    dragRef.current = { startX: e.clientX, startY: e.clientY, startView: { x: viewRef.current.x, y: viewRef.current.y }, moved: false };
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
  // targets, and path edges have their own separate hit targets — see
  // allEdges below — so this simply declines to do anything rather than
  // fighting either), which is the whole of the info-vs-placement
  // disambiguation this PR adds: one flag check, not a new mode of its own.
  const inspectBuilding = (id: string) => {
    if (consumePanClick()) return;
    if (selected || pathTool) return;
    setInspectedId((cur) => (cur === id ? null : id));
  };

  const rows = Array.from({ length: CAMPUS_GRID_HEIGHT }, (_, row) => row);
  const cols = Array.from({ length: CAMPUS_GRID_WIDTH }, (_, col) => col);

  // Every edge the grid has, at either orientation — the path tool's hit
  // targets (rendered only while a tool is active, see below). Computed
  // once: the grid's own size never changes at runtime, so there is nothing
  // for a dependency array to react to.
  const allEdges = useMemo(() => {
    const edges: PathEdge[] = [];
    for (let row = 0; row <= CAMPUS_GRID_HEIGHT; row++) {
      for (let col = 0; col < CAMPUS_GRID_WIDTH; col++) edges.push({ orientation: 'h', row, col });
    }
    for (let row = 0; row < CAMPUS_GRID_HEIGHT; row++) {
      for (let col = 0; col <= CAMPUS_GRID_WIDTH; col++) edges.push({ orientation: 'v', row, col });
    }
    return edges;
  }, []);

  // One end of a path click-drag: acts on the edge immediately (so a plain
  // click without any movement still draws/erases one segment) and arms
  // pathDragRef so every edge the pointer subsequently enters, while the
  // button stays down, gets the same treatment.
  const paintEdge = (edge: PathEdge, tool: 'draw' | 'erase') => {
    act(tool === 'draw' ? { type: 'ADD_PATH_EDGE', edge } : { type: 'REMOVE_PATH_EDGE', edge });
  };

  // Placements resolved against `tech` once per render, rather than per
  // tile: 60 placeables against 6,804 cells is not worth re-scanning.
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
          className={`campus-map-svg ${selected ? 'placing' : ''} ${pathTool ? `path-${pathTool}` : ''}`}
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
          onMouseDown={onMapMouseDown}
          onWheel={onWheel}
        >
          <g ref={worldRef}>
            {/* Ground, then drawn pathways (so a building placed over an
                edge draws on top of the path, never the other way around),
                then buildings, then path hit-targets (path mode only — see
                the disambiguation note on pathTool above, which is what
                keeps these from ever being live at the same time as
                placement's own tile clicks), then the drop/rotate ghost. */}
            {rows.map((row) => cols.map((col) => (
              <GroundTile
                key={`${row}-${col}`}
                row={row}
                col={col}
                empty={!covered.has(`${row},${col}`)}
                targetable={selected !== null}
                // A pan crosses many tiles' mouseenter as it drags — don't
                // let the footprint ghost jitter across all of them while
                // the player is just moving the world around.
                onEnter={() => { if (!dragRef.current?.moved) setHover({ row, col }); }}
                onClick={() => onGroundClick(row, col)}
                onDrop={(id) => placeById(id, row, col)}
              />
            )))}

            {Object.keys(s.pathways).map((key) => {
              const edge = parseEdgeKey(key);
              if (!edge) return null;
              const { x1, y1, x2, y2 } = edgeLine(edge);
              return <line key={key} className="campus-path-edge" x1={x1} y1={y1} x2={x2} y2={y2} />;
            })}

            {placed.map(({ t, p }) => (
              <PlacedBuilding key={t.id} t={t} p={p} onInspect={() => inspectBuilding(t.id)} inspected={t.id === inspectedId} weeksLeft={s.developing[t.id]} />
            ))}

            {pathTool && allEdges.map((edge) => {
              const { x1, y1, x2, y2 } = edgeLine(edge);
              return (
                <line
                  key={edgeKey(edge)}
                  className={`campus-path-hit ${pathTool}`}
                  x1={x1} y1={y1} x2={x2} y2={y2}
                  // Stopped here so pressing down on an edge never also
                  // arms the map's own pan-drag tracking (onMapMouseDown,
                  // above) — the two gestures would otherwise start on the
                  // exact same mousedown.
                  onMouseDown={(e) => { e.stopPropagation(); pathDragRef.current = pathTool; paintEdge(edge, pathTool); }}
                  onMouseEnter={() => { if (pathDragRef.current) paintEdge(edge, pathDragRef.current); }}
                />
              );
            })}

            {preview && (
              <>
                <rect
                  className={`campus-preview ${preview.ok ? 'ok' : 'blocked'}`}
                  x={tileX(preview.col)}
                  y={tileY(preview.row)}
                  width={spanSize(preview.w)}
                  height={spanSize(preview.h)}
                  rx={BUILDING_CORNER}
                />
                {/* The rotate control: a small dial at the ghost's corner,
                    only offered when rotating would actually change
                    anything (see canRotate — a square footprint rotated is
                    the same footprint) AND the pickup isn't a 'done' item
                    awaiting siting, which always sites unrotated (see
                    canRotateSelected above). It sits inside the same panned/
                    zoomed <g> as the ghost it belongs to, so it tracks the
                    ghost under pan/zoom for free rather than needing its
                    own screen-space positioning logic. */}
                {canRotateSelected && (
                  <g
                    className="campus-rotate-btn"
                    transform={`translate(${tileX(preview.col) + spanSize(preview.w) - 14}, ${tileY(preview.row) - 14})`}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={() => setRotated((r) => !r)}
                    role="button"
                    aria-label="Rotate building 90 degrees"
                  >
                    <circle r={13} />
                    <text textAnchor="middle" dominantBaseline="central">⟳</text>
                    <title>Rotate (R)</title>
                  </g>
                )}
              </>
            )}
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
            the build menu. */}
        <div className="campus-map-zoom-controls">
          <button type="button" onClick={() => zoomBy(1.25)} aria-label="Zoom in">+</button>
          <button type="button" onClick={() => zoomBy(0.8)} aria-label="Zoom out">−</button>
        </div>
      </div>

      {/* A slim, single-line strip docked along the bottom edge, just above
          the toolbar: a title, a help hint, and a live one-line hint for
          whatever mode the map is currently in. What USED to live here —
          the "awaiting siting" tray of finished-but-unplaced buildings, and
          later a tiles-built counter — is gone: picking something up for
          siting happens from BuildPopup.tsx's "site →" row (placement
          starts a build, so the affordance belongs where every other build
          decision is made), and the counter told the player nothing they
          act on. What's left is orientation only, kept to one row so it no
          longer reads as a card competing with the toolbar for the bottom
          of the screen. */}
      <div className="campus-map-tray" ref={trayRef}>
        <span className="panel-head-title">
          <h2>Campus Map</h2>
          <HelpHint text="Where the university physically grows. Pick a building, dorm, or facility to build from the Build popup (the toolbar's build icon) — placing it here is how it starts: cost is charged immediately, and it counts down under construction right where you put it, reserving those tiles until it's done. Press R, or click the ⟳ on the footprint ghost, to turn a non-square building 90 degrees before setting it down. Buildings vary in size: a school hall covers many tiles, a lab a few. There must be room for the whole footprint on empty ground — nothing can be built without it. Courses are never sited: a course is not a place, and develops from the Curriculum view with no map involvement. The Draw path / Erase path buttons (also in the build popup) let you sketch walkways along the gridlines between tiles — free, purely decorative, and unrelated to building." />
        </span>
        <span className="campus-map-hint">
          {pathTool
            ? pathTool === 'draw'
              ? 'Click or drag along tile edges to draw a pathway. Purely decorative — it grants nothing.'
              : 'Click or drag along drawn edges to erase that pathway.'
            : selected && selectedFootprint
              ? `Click or drop on ${selectedFootprint.w}×${selectedFootprint.h} of empty tiles to ${selected.status === 'done' ? 'site' : 'start building'} ${selected.name} there.`
                + (canRotateSelected ? ' Press R (or the ⟳ on the ghost) to rotate.' : '')
              : 'Pick something to build from the Build popup, then click (or drag) an empty tile here to start it.'}
        </span>
      </div>
    </section>
  );
}
