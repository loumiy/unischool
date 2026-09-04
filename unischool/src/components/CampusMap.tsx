import { useRef, useState } from 'react';
import type { Action } from '../state/actions';
import type { Buildable, GameState, Placement } from '../state/types';
import { CAMPUS_GRID_HEIGHT, CAMPUS_GRID_WIDTH } from '../state/types';
import {
  awaitingPlacement, canPlace, footprintIsClear, footprintOf, placementTiles, tilesCovered,
} from '../state/campusMap';
import HelpHint from './HelpHint';
import { useCssHeightVar } from './useCssHeightVar';

// The campus map: the game's base layer, always on screen under everything
// else (see App.tsx), and a placement + rendering layer over the SAME
// Buildables the build panel lists. It reads `s.placements` + `s.tech` and
// dispatches PLACE_BUILDABLE; it computes nothing, owns no game state, and
// changes no outcome. Siting a building is optional and grants nothing —
// its effects landed the week it finished, and a building that covers four
// tiles is worth exactly as much as one that covers one.
//
// Being the central surface is a LAYOUT fact, not a mechanical one: nothing
// here gained authority over the sim by moving to the middle of the screen.
//
// Plain SVG on purpose: tiles are <rect>s, placed buildings are a <rect>
// spanning their footprint plus a wrapped <text> label. No canvas, no game
// library, no new deps. (The isometric rebuild is a separate, later arc;
// this is the flat map made finer-grained, not a step toward it.)

// --- layout (SVG user units; the svg itself scales to its container) ---
// Tiles are deliberately small now that the grid is 24x12 rather than 8x6:
// a plot, not a placard. The label sizing below is what makes that
// readable — a 1x1 tile gets a terse two-or-three-line name, a 2x2 hall
// gets room for its full one.
const TILE_SIZE = 28;      // edge length of one square tile
const TILE_GAP = 2;        // gutter between tiles
const MAP_PADDING = 8;     // breathing room around the whole grid
const TILE_CORNER = 3;     // tile corner radius

// Label metrics. LABEL_CHAR_WIDTH is an approximation of the serif's
// average advance at LABEL_FONT_SIZE — it only has to be close, because
// it is used to pick a wrap width, not to position anything.
const LABEL_FONT_SIZE = 7;
const LABEL_LINE_HEIGHT = 8;    // vertical step between wrapped label lines
const LABEL_CHAR_WIDTH = 3.6;
const LABEL_INSET = 3;          // padding between the label block and the footprint's edge
const LABEL_MAX_LINES = 3;      // lines beyond this are dropped (last one gets an ellipsis)
const LABEL_MIN_CHARS = 4;      // narrower than this and the label is dropped rather than shredded

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

// Greedy word wrap into at most `maxLines` lines of `maxChars`, so a name
// like "School of Engineering" reads on the building itself rather than
// only in the hover title. Returns [] when there isn't room for a usable
// line — small plots fall back to the hover title and the tray.
function wrapLabel(name: string, maxChars: number, maxLines: number): string[] {
  if (maxChars < LABEL_MIN_CHARS || maxLines < 1) return [];
  const lines: string[] = [];
  let line = '';
  for (const word of name.split(' ')) {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length <= maxChars) {
      line = candidate;
    } else {
      if (line) lines.push(line);
      line = word.length > maxChars ? `${word.slice(0, maxChars - 1)}…` : word;
    }
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    lines.length = maxLines;
    lines[maxLines - 1] = `${lines[maxLines - 1].slice(0, maxChars - 1)}…`;
  }
  return lines;
}

// How much text a footprint can hold, derived from its own pixel size — so
// a 2x2 hall gets a real label and a 1x1 lab gets a terse one, from one
// rule rather than a per-size special case.
function labelFor(name: string, w: number, h: number): string[] {
  const maxChars = Math.floor((spanSize(w) - LABEL_INSET * 2) / LABEL_CHAR_WIDTH);
  const maxLines = Math.min(LABEL_MAX_LINES, Math.floor((spanSize(h) - LABEL_INSET) / LABEL_LINE_HEIGHT));
  return wrapLabel(name, maxChars, maxLines);
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
      rx={TILE_CORNER}
      onMouseEnter={live ? onEnter : undefined}
      onClick={live ? onClick : undefined}
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
// centred in it.
function PlacedBuilding({ t, p }: { t: Buildable; p: Placement }) {
  const x = tileX(p.col);
  const y = tileY(p.row);
  const width = spanSize(p.w);
  const height = spanSize(p.h);
  const lines = labelFor(t.name, p.w, p.h);
  // Centre the wrapped block vertically inside the footprint.
  const firstLineY = y + height / 2 - ((lines.length - 1) * LABEL_LINE_HEIGHT) / 2;

  return (
    <g className={`campus-building ${kindClasses(t)}`} aria-label={t.name}>
      <rect x={x} y={y} width={width} height={height} rx={TILE_CORNER} />
      {lines.map((line, i) => (
        <text
          key={i}
          x={x + width / 2}
          y={firstLineY + i * LABEL_LINE_HEIGHT}
          textAnchor="middle"
          fontSize={LABEL_FONT_SIZE}
        >
          {line}
        </text>
      ))}
      <title>{`${t.name} · ${p.w}×${p.h}`}</title>
    </g>
  );
}

export default function CampusMap({ s, act }: { s: GameState; act: (a: Action) => void }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // The tile the pointer (or an in-flight drag) is over, so the footprint
  // about to land can be previewed. Multi-tile buildings need this: where a
  // 2x2 hall goes is no longer obvious from the tile you clicked.
  const [hover, setHover] = useState<{ row: number; col: number } | null>(null);
  // The tray's own rendered height feeds --tray-height (see styles.css's
  // .campus-map-canvas and App.tsx's matching --log-strip-height): most of
  // the time the "awaiting siting" list is short, so the map should get
  // that space back rather than always reserving room for a tray at its
  // scrollable ceiling.
  const trayRef = useRef<HTMLDivElement>(null);
  useCssHeightVar(trayRef, '--tray-height');

  const tray = awaitingPlacement(s);
  // A tray entry can vanish between renders (placed, or a fresh game), so
  // never trust the stored id without re-checking it against the tray.
  const selected = tray.find((t) => t.id === selectedId) ?? null;
  const coveredTiles = tilesCovered(s.placements);
  const totalTiles = CAMPUS_GRID_WIDTH * CAMPUS_GRID_HEIGHT;

  // The one placement path, whether the building was clicked into place or
  // dropped there. canPlace is re-checked in the reducer too — this copy is
  // so an illegal drop leaves the selection alone instead of quietly
  // clearing it.
  const placeById = (id: string, row: number, col: number) => {
    const t = tray.find((x) => x.id === id);
    if (!t || !canPlace(s, t, row, col)) return;
    act({ type: 'PLACE_BUILDABLE', buildableId: id, row, col });
    setSelectedId(null);
    setHover(null);
  };
  const place = (row: number, col: number) => {
    if (selected) placeById(selected.id, row, col);
  };

  const rows = Array.from({ length: CAMPUS_GRID_HEIGHT }, (_, row) => row);
  const cols = Array.from({ length: CAMPUS_GRID_WIDTH }, (_, col) => col);

  // Placements resolved against `tech` once per render, rather than per
  // tile: 69 placeables against 336 cells is not worth re-scanning.
  const placed = Object.entries(s.placements)
    .map(([id, p]) => ({ p, t: s.tech.find((x) => x.id === id) }))
    .filter((entry): entry is { p: Placement; t: Buildable } => entry.t !== undefined);
  const covered = new Set<string>();
  for (const { p } of placed) {
    for (const tile of placementTiles(p)) covered.add(`${tile.row},${tile.col}`);
  }

  // The footprint ghost under the cursor, and whether it would actually fit.
  const preview = selected && hover
    ? { ...hover, ...footprintOf(selected), ok: footprintIsClear(s.placements, hover.row, hover.col, footprintOf(selected)) }
    : null;

  return (
    <section className="campus-map">
      <div className="campus-map-canvas">
        <svg
          className={`campus-map-svg ${selected ? 'placing' : ''}`}
          viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
          width="100%"
          height="100%"
          role="group"
          aria-label="Campus map"
          onMouseLeave={() => setHover(null)}
        >
          {/* Ground first, buildings over it, the drop ghost on top. */}
          {rows.map((row) => cols.map((col) => (
            <GroundTile
              key={`${row}-${col}`}
              row={row}
              col={col}
              empty={!covered.has(`${row},${col}`)}
              targetable={selected !== null}
              onEnter={() => setHover({ row, col })}
              onClick={() => place(row, col)}
              onDrop={(id) => placeById(id, row, col)}
            />
          )))}

          {placed.map(({ t, p }) => <PlacedBuilding key={t.id} t={t} p={p} />)}

          {preview && (
            <rect
              className={`campus-preview ${preview.ok ? 'ok' : 'blocked'}`}
              x={tileX(preview.col)}
              y={tileY(preview.row)}
              width={spanSize(preview.w)}
              height={spanSize(preview.h)}
              rx={TILE_CORNER}
            />
          )}
        </svg>
      </div>

      {/* The siting tray floats over the map, docked along its bottom edge
          rather than the build panel: the panel is where a building is
          commissioned, this is where a finished one is put down. It also
          carries the map's own head (title, help, tiles-built count) —
          folded in here rather than a separate bar, since the map itself is
          now the full-viewport background and has no bordered card of its
          own left to hang a head on. */}
      <div className="campus-map-tray" ref={trayRef}>
        <div className="campus-map-tray-head">
          <span className="panel-head-title">
            <h2>Campus Map</h2>
            <HelpHint text="Where finished buildings physically sit. Siting is optional and cosmetic for now — a building's effects apply the week it finishes, placed or not, and a bigger footprint grants nothing extra. Pick a building from the tray and click an empty tile, or drag it straight onto the map. Buildings vary in size: a school hall covers four tiles, a lab one. Courses are never sited: a course is not a place." />
          </span>
          <span className="stat">{coveredTiles}/{totalTiles} tiles built on</span>
        </div>
        <div className="campus-map-tray-row">
          <span className="campus-map-tray-label">Awaiting siting</span>
          {tray.length > 0 && (
            <ul className="campus-map-tray-list">
              {tray.map((t) => {
                const fp = footprintOf(t);
                return (
                  <li key={t.id}>
                    <button
                      type="button"
                      className={`campus-tray-btn ${kindClasses(t)} ${t.id === selectedId ? 'selected' : ''}`}
                      aria-pressed={t.id === selectedId}
                      // Dragging is layered ON TOP of the click flow rather
                      // than replacing it. The drag carries the id (which is
                      // what the drop acts on) and ALSO selects the building,
                      // so the same footprint ghost that guides a click guides
                      // a drag, and an abandoned drag leaves the building
                      // selected — exactly as if it had been clicked.
                      draggable
                      onDragStart={(e) => {
                        setSelectedId(t.id);
                        e.dataTransfer.setData('text/plain', t.id);
                        e.dataTransfer.effectAllowed = 'move';
                      }}
                      onClick={() => setSelectedId(t.id === selectedId ? null : t.id)}
                    >
                      {t.name}
                      <span className="campus-tray-size">{fp.w}×{fp.h}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <span className="campus-map-hint">
          {selected
            ? `Click or drop on ${footprintOf(selected).w}×${footprintOf(selected).h} of empty tiles to site ${selected.name}.`
            : tray.length > 0
              ? 'Select a building and click an empty tile, or drag it onto the map.'
              : 'Nothing to site — finish a building, dorm, or facility and it appears here.'}
        </span>
      </div>
    </section>
  );
}
