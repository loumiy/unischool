import { useState } from 'react';
import type { Action } from '../state/actions';
import type { Buildable, GameState } from '../state/types';
import { CAMPUS_GRID_HEIGHT, CAMPUS_GRID_WIDTH } from '../state/types';
import { awaitingPlacement, occupantAt } from '../state/campusMap';
import HelpHint from './HelpHint';

// The campus map: the game's base layer, always on screen under everything
// else (see App.tsx), and a placement + rendering layer over the SAME
// Buildables the build panel lists. It reads `s.placements` + `s.tech` and
// dispatches PLACE_BUILDABLE; it computes nothing, owns no game state, and
// changes no outcome. Siting a building is optional and grants nothing —
// its effects landed the week it finished.
//
// Being the central surface is a LAYOUT fact, not a mechanical one: nothing
// here gained authority over the sim by moving to the middle of the screen.
//
// Plain SVG on purpose: tiles are <rect>s, placed buildings are a <rect>
// plus a wrapped <text> label. No canvas, no game library, no new deps.

// --- layout (SVG user units; the svg itself scales to its container) ---
const TILE_SIZE = 58;      // edge length of one square tile
const TILE_GAP = 4;        // gutter between tiles
const MAP_PADDING = 6;     // breathing room around the whole grid
const TILE_CORNER = 4;     // tile corner radius
const LABEL_LINE_HEIGHT = 9;      // vertical step between wrapped label lines
const LABEL_CHARS_PER_LINE = 9;   // wrap width, in characters, of a tile label
const LABEL_MAX_LINES = 3;        // lines beyond this are dropped (last one gets an ellipsis)

const MAP_WIDTH = MAP_PADDING * 2 + CAMPUS_GRID_WIDTH * TILE_SIZE + (CAMPUS_GRID_WIDTH - 1) * TILE_GAP;
const MAP_HEIGHT = MAP_PADDING * 2 + CAMPUS_GRID_HEIGHT * TILE_SIZE + (CAMPUS_GRID_HEIGHT - 1) * TILE_GAP;

function tileX(col: number): number {
  return MAP_PADDING + col * (TILE_SIZE + TILE_GAP);
}

function tileY(row: number): number {
  return MAP_PADDING + row * (TILE_SIZE + TILE_GAP);
}

// Greedy word wrap into at most LABEL_MAX_LINES short lines, so a name
// like "School of Engineering" reads on the tile itself rather than only
// in the hover title.
function wrapLabel(name: string): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of name.split(' ')) {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length <= LABEL_CHARS_PER_LINE) {
      line = candidate;
    } else {
      if (line) lines.push(line);
      line = word.length > LABEL_CHARS_PER_LINE ? `${word.slice(0, LABEL_CHARS_PER_LINE - 1)}…` : word;
    }
  }
  if (line) lines.push(line);
  if (lines.length > LABEL_MAX_LINES) {
    lines.length = LABEL_MAX_LINES;
    lines[LABEL_MAX_LINES - 1] = `${lines[LABEL_MAX_LINES - 1].slice(0, LABEL_CHARS_PER_LINE - 1)}…`;
  }
  return lines;
}

function Tile({ row, col, occupant, selecting, onClick }: {
  row: number;
  col: number;
  occupant: Buildable | undefined;
  selecting: boolean;         // something in the tray is picked, so empty tiles are live targets
  onClick: () => void;
}) {
  const x = tileX(col);
  const y = tileY(row);
  const empty = occupant === undefined;
  const classes = [
    'campus-tile',
    empty ? 'empty' : `occupied kind-${occupant.kind}`,
    selecting && empty ? 'targetable' : '',
  ].filter(Boolean).join(' ');
  const lines = occupant ? wrapLabel(occupant.name) : [];
  // Center the wrapped block vertically inside the tile.
  const firstLineY = y + TILE_SIZE / 2 - ((lines.length - 1) * LABEL_LINE_HEIGHT) / 2;

  return (
    <g
      className={classes}
      onClick={selecting && empty ? onClick : undefined}
      role={selecting && empty ? 'button' : undefined}
      aria-label={occupant ? occupant.name : `Empty tile, row ${row + 1}, column ${col + 1}`}
    >
      <rect x={x} y={y} width={TILE_SIZE} height={TILE_SIZE} rx={TILE_CORNER} />
      {lines.map((line, i) => (
        <text key={i} x={x + TILE_SIZE / 2} y={firstLineY + i * LABEL_LINE_HEIGHT} textAnchor="middle">
          {line}
        </text>
      ))}
      <title>{occupant ? occupant.name : `Empty · row ${row + 1}, column ${col + 1}`}</title>
    </g>
  );
}

export default function CampusMap({ s, act }: { s: GameState; act: (a: Action) => void }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const tray = awaitingPlacement(s);
  // A tray entry can vanish between renders (placed, or a fresh game), so
  // never trust the stored id without re-checking it against the tray.
  const selected = tray.find((t) => t.id === selectedId) ?? null;
  const placedCount = Object.keys(s.placements).length;
  const totalTiles = CAMPUS_GRID_WIDTH * CAMPUS_GRID_HEIGHT;

  const place = (row: number, col: number) => {
    if (!selected) return;
    act({ type: 'PLACE_BUILDABLE', buildableId: selected.id, row, col });
    setSelectedId(null);
  };

  const rows = Array.from({ length: CAMPUS_GRID_HEIGHT }, (_, row) => row);
  const cols = Array.from({ length: CAMPUS_GRID_WIDTH }, (_, col) => col);

  return (
    <section className="campus-map">
      <div className="campus-map-head">
        <span className="panel-head-title">
          <h2>Campus Map</h2>
          <HelpHint text="Where finished buildings physically sit. Siting is optional and cosmetic for now — a building's effects apply the week it finishes, placed or not. Pick a building from the tray, then click an empty tile. Courses are never sited: a course is not a place." />
        </span>
        <span className="stat">{placedCount}/{totalTiles} tiles sited</span>
      </div>

      <div className="campus-map-canvas">
        <svg
          className={`campus-map-svg ${selected ? 'placing' : ''}`}
          viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
          width="100%"
          height="100%"
          role="group"
          aria-label="Campus map"
        >
          {rows.map((row) => cols.map((col) => {
            const occupantId = occupantAt(s.placements, row, col);
            return (
              <Tile
                key={`${row}-${col}`}
                row={row}
                col={col}
                occupant={occupantId ? s.tech.find((t) => t.id === occupantId) : undefined}
                selecting={selected !== null}
                onClick={() => place(row, col)}
              />
            );
          }))}
        </svg>
      </div>

      {/* The siting tray is docked to the map, not to the build panel: the
          panel is where a building is commissioned, this is where a finished
          one is put down. */}
      <div className="campus-map-tray">
        <span className="campus-map-tray-label">Awaiting siting</span>
        {tray.length > 0 && (
          <ul className="campus-map-tray-list">
            {tray.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  className={`campus-tray-btn kind-${t.kind} ${t.id === selectedId ? 'selected' : ''}`}
                  aria-pressed={t.id === selectedId}
                  onClick={() => setSelectedId(t.id === selectedId ? null : t.id)}
                >
                  {t.name}
                </button>
              </li>
            ))}
          </ul>
        )}
        <span className="campus-map-hint">
          {selected
            ? `Click an empty tile to site ${selected.name}.`
            : tray.length > 0
              ? 'Select a building, then click an empty tile.'
              : 'Nothing to site — finish a building, dorm, or facility and it appears here.'}
        </span>
      </div>
    </section>
  );
}
