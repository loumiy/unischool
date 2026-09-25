import { useMemo } from 'react';
import type { Pathways } from '../state/types';
import { parsePathTileKey } from '../state/campusMap';
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
// whatever shape that is. The whole layer is three <path> elements however
// much is drawn.

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

interface Geometry { fill: string; joints: string; }

export function buildPathGeometry(pathways: Pathways): Geometry {
  const tiles: { row: number; col: number }[] = [];
  const present = new Set<string>();
  for (const key of Object.keys(pathways)) {
    const t = parsePathTileKey(key);
    if (!t) continue;
    tiles.push(t);
    present.add(`${t.row},${t.col}`);
  }
  const has = (row: number, col: number) => present.has(`${row},${col}`);

  const fill: string[] = [];
  const joints: string[] = [];

  for (const { row, col } of tiles) {
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
    corners.forEach(([cc, cr, ic, ir], k) => {
      // A corner is rounded where the paving turns away from it, unless it
      // lies on the straight edge of a diagonal run.
      const exposed = !n[k] && !n[(k + 1) % 4] && !d[k];
      const onRun = bridged((k + 1) % 4) || bridged((k + 3) % 4);
      if (!exposed || onRun) { pts.push(project(cc, cr)); return; }
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

  return { fill: fill.join(''), joints: joints.join('') };
}

export default function PathwayLayer({ pathways, camera }: { pathways: Pathways; camera: Camera }) {
  // Rebuilt when the pathways record changes identity (a tile drawn or
  // erased) or the camera moves.
  const { fill, joints } = useMemo(() => buildPathGeometry(pathways), [pathways, camera]);
  if (!fill) return null;
  return (
    <g className="campus-paths" aria-hidden="true">
      <path className="campus-path-kerb" d={fill} />
      <path className="campus-path-fill" d={fill} />
      <path className="campus-path-joint" d={joints} />
    </g>
  );
}
