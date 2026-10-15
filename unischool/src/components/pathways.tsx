import { useMemo } from 'react';
import type { Pathways } from '../state/types';
import { parsePathTileKey } from '../state/campusMap';
import { PATH_SURFACES, surfaceOf, type PathSurface } from '../state/paving';
import { boxFaces, polyPoints, project, type Camera, type Pt } from './isoProjection';

// Drawn walkways. Each tile is a square of paving whose exposed outer
// corners are rounded, and two tiles that meet only at a corner (a diagonal
// run) are bridged by paving across the shared corner, so a diagonal or a
// turn reads as a curve through the tile centers rather than as steps. The
// tiles underneath are unchanged: this is drawing only, and everything that
// reads paths (quads, reachability) sees the same squares.
//
// The curb is the fill's own outline, stroked under the fill: where paving
// meets paving the fill covers it, so it shows only where the paving stops,
// whatever shape that is. Each surface (state/paving.ts) has its own fill
// and its own coursing over it: the flagged walk's joints run between
// tiles, cobbles are set in a grid of small setts, brick is laid in
// stretcher courses. Paths of different surfaces join as one walk, the
// rounding read off every paved tile whatever it is paved with. The layer
// is a few <path> elements however much is drawn.

// Neighbor offsets, in tile space: [dRow, dCol].
const ORTHO = [[-1, 0], [0, 1], [1, 0], [0, -1]] as const;     // N, E, S, W
const DIAGONAL = [[-1, 1], [1, 1], [1, -1], [-1, -1]] as const; // NE, SE, SW, NW

// The radius an exposed corner is rounded to, in tiles.
const CORNER_RADIUS = 0.4;
const ARC_STEPS = 4;

function sub(pts: Pt[]): string {
  return `M${polyPoints(pts).replace(/ /g, 'L')}Z`;
}
function seg(a: Pt, b: Pt): string {
  return `M${a.x.toFixed(2)},${a.y.toFixed(2)}L${b.x.toFixed(2)},${b.y.toFixed(2)}`;
}

interface Geometry {
  // Every tile's outline, for the curb.
  outline: string;
  fills: Record<PathSurface, string>;
  coursing: Record<PathSurface, string>;
  joints: string;
}

// Where a line across a tile may start and end so it stays inside the
// tile's rounded corners: for a line at `d` from the tile's edge, how far
// in from the corner's side the arc lets it begin.
// A little more than the arc itself, since the drawn arc is a polygon
// inside it.
const ARC_MARGIN = 0.03;
function arcInset(d: number): number {
  if (d >= CORNER_RADIUS) return 0;
  const k = CORNER_RADIUS - d;
  return CORNER_RADIUS - Math.sqrt(CORNER_RADIUS * CORNER_RADIUS - k * k) + ARC_MARGIN;
}

// The coursing of one tile, as segments in grid space. `rounded` is which
// corners are rounded, [NE, SE, SW, NW]. A line running along the columns
// at `v` down the tile is cut back at a rounded corner on either end; one
// along the rows likewise.
function coursingOf(surface: PathSurface, col: number, row: number, rounded: readonly boolean[]): string {
  if (surface === 'paving') return '';
  const [ne, se, sw, nw] = rounded;
  const out: string[] = [];
  // Along the columns (constant row), from u0 to u1 of the way across.
  const alongCol = (v: number, u0 = 0, u1 = 1) => {
    const westCut = Math.max(nw ? arcInset(v) : 0, sw ? arcInset(1 - v) : 0);
    const eastCut = Math.max(ne ? arcInset(v) : 0, se ? arcInset(1 - v) : 0);
    const a = Math.max(u0, westCut); const b = Math.min(u1, 1 - eastCut);
    if (b - a > 0.02) out.push(seg(project(col + a, row + v), project(col + b, row + v)));
  };
  // Along the rows (constant col).
  const alongRow = (u: number, v0 = 0, v1 = 1) => {
    const northCut = Math.max(nw ? arcInset(u) : 0, ne ? arcInset(1 - u) : 0);
    const southCut = Math.max(sw ? arcInset(u) : 0, se ? arcInset(1 - u) : 0);
    const a = Math.max(v0, northCut); const b = Math.min(v1, 1 - southCut);
    if (b - a > 0.02) out.push(seg(project(col + u, row + a), project(col + u, row + b)));
  };
  if (surface === 'brick') {
    // Four stretcher courses, the joints staggered by half a brick.
    const COURSES = 4;
    for (let k = 1; k < COURSES; k++) alongCol(k / COURSES);
    for (let k = 0; k < COURSES; k++) {
      const v0 = k / COURSES; const v1 = (k + 1) / COURSES;
      const offset = k % 2 === 0 ? 0.25 : 0.5;
      for (let u = offset; u < 1; u += 0.5) alongRow(u, v0, v1);
    }
  } else {
    // Setts: three rows of three, every other row shifted half a sett.
    const ROWS = 3;
    for (let k = 1; k < ROWS; k++) alongCol(k / ROWS);
    for (let k = 0; k < ROWS; k++) {
      const v0 = k / ROWS; const v1 = (k + 1) / ROWS;
      const offset = (k + row) % 2 === 0 ? 1 / 3 : 1 / 6;
      for (let u = offset; u < 1; u += 1 / 3) alongRow(u, v0, v1);
    }
  }
  return out.join('');
}

const noneBySurface = (): Record<PathSurface, string[]> => ({ paving: [], cobble: [], brick: [] });

export function buildPathGeometry(pathways: Pathways): Geometry {
  const tiles: { row: number; col: number; surface: PathSurface }[] = [];
  const present = new Set<string>();
  for (const [key, value] of Object.entries(pathways)) {
    const t = parsePathTileKey(key);
    if (!t) continue;
    tiles.push({ ...t, surface: surfaceOf(value) });
    present.add(`${t.row},${t.col}`);
  }
  const has = (row: number, col: number) => present.has(`${row},${col}`);

  const fills = noneBySurface();
  const coursing = noneBySurface();
  const joints: string[] = [];

  for (const { row, col, surface } of tiles) {
    const fill = fills[surface];
    const n = ORTHO.map(([dr, dc]) => has(row + dr, col + dc));
    const d = DIAGONAL.map(([dr, dc]) => has(row + dr, col + dc));
    // A bridge to the diagonal neighbor j: the two tiles meet only at a
    // corner.
    const bridged = (j: number) => d[j] && !n[j] && !n[(j + 1) % 4];
    // The corners clockwise from the north-east, in grid space [col, row],
    // each with the direction it rounds in. Corner k sits between ORTHO k and
    // k + 1, where DIAGONAL k points.
    const corners: [number, number, number, number][] = [
      [col + 1, row, -1, 1],      // NE: rounds toward -col, +row
      [col + 1, row + 1, -1, -1], // SE
      [col, row + 1, 1, -1],      // SW
      [col, row, 1, 1],           // NW
    ];
    const pts: Pt[] = [];
    const rounded = [false, false, false, false];
    corners.forEach(([cc, cr, ic, ir], k) => {
      // A corner is rounded where the paving turns away from it, unless it
      // lies on the straight edge of a diagonal run.
      const exposed = !n[k] && !n[(k + 1) % 4] && !d[k];
      const onRun = bridged((k + 1) % 4) || bridged((k + 3) % 4);
      if (!exposed || onRun) { pts.push(project(cc, cr)); return; }
      rounded[k] = true;
      // An arc round the corner's inset center, from the edge before it to
      // the edge after it (clockwise).
      const ox = cc + ic * CORNER_RADIUS;
      const oy = cr + ir * CORNER_RADIUS;
      // Start on the edge the walk arrives along, end on the one it leaves by.
      const start = k % 2 === 0 ? [cc + ic * CORNER_RADIUS, cr] : [cc, cr + ir * CORNER_RADIUS];
      const a0 = Math.atan2(start[1] - oy, start[0] - ox);
      for (let i = 0; i <= ARC_STEPS; i++) {
        const a = a0 + (i / ARC_STEPS) * (Math.PI / 2);
        pts.push(project(ox + Math.cos(a) * CORNER_RADIUS, oy + Math.sin(a) * CORNER_RADIUS));
      }
    });
    fill.push(sub(pts));
    const lines = coursingOf(surface, col, row, rounded);
    if (lines) coursing[surface].push(lines);

    // Where paving continues, a light joint line (N and E only, so each
    // shared edge is drawn once). Read by grid corner, never by the
    // screen-ordered `top`, whose first corner is whichever is at the back
    // in this view (Plan 37: the joints moved onto the curbs in three views
    // of four).
    const f = boxFaces(col, row, 1, 1, 0, 0);
    if (n[0]) joints.push(seg(f.NW, f.NE));
    if (n[1]) joints.push(seg(f.NE, f.SE));

    // A bridge across a corner two tiles share and nothing else: the two
    // notches either side of it filled, so the run has straight edges.
    // Drawn once, by the tile that sees the other to the south.
    DIAGONAL.forEach(([dr, dc], k) => {
      if (dr < 0 || !bridged(k)) return;
      const sc = col + (dc > 0 ? 1 : 0);
      const sr = row + 1;
      // The shared corner, and the corners of this tile and the next that
      // sit either side of it along the run.
      const [e0, e1] = dc > 0 ? [col + 1, col] : [col, col + 1];
      fill.push(sub([project(e0, row), project(sc, sr), project(e0 + dc, row + 1)]));
      fill.push(sub([project(e1, row + 1), project(sc, sr), project(e1 + dc, row + 2)]));
    });
  }

  const join = (by: Record<PathSurface, string[]>) => ({ paving: by.paving.join(''), cobble: by.cobble.join(''), brick: by.brick.join('') });
  const joined = join(fills);
  return { outline: PATH_SURFACES.map((k) => joined[k]).join(''), fills: joined, coursing: join(coursing), joints: joints.join('') };
}

export default function PathwayLayer({ pathways, camera }: { pathways: Pathways; camera: Camera }) {
  // Rebuilt when the pathways record changes identity (a tile drawn or
  // erased) or the camera moves.
  return pathwayArt(useMemo(() => buildPathGeometry(pathways), [pathways, camera]));
}

// The paths, given their geometry: what the canvas map draws (canvasArt.ts),
// keeping the geometry itself.
export function pathwayArt({ outline, fills, coursing, joints }: Geometry): React.JSX.Element | null {
  if (!outline) return null;
  return (
    <g className="campus-paths" aria-hidden="true">
      <path className="campus-path-kerb" d={outline} />
      {PATH_SURFACES.map((k) => fills[k] && <path key={k} className={`campus-path-fill ${k}`} d={fills[k]} />)}
      {PATH_SURFACES.map((k) => coursing[k] && <path key={`c-${k}`} className={`campus-path-coursing ${k}`} d={coursing[k]} />)}
      <path className="campus-path-joint" d={joints} />
    </g>
  );
}
