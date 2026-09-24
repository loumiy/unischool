import { useMemo } from 'react';
import type { Pathways } from '../state/types';
import { parsePathTileKey } from '../state/campusMap';
import { boxFaces, polyPoints, project, type Camera, type Pt } from './isoProjection';

// Drawn walkways, autotiled. Each tile looks at its eight neighbours: a
// kerb is drawn only where the paving stops, and a diagonal connector
// closes the pinhole where two tiles meet only at a corner (a
// screen-horizontal run is diagonal in grid terms). The whole layer is
// three <path> elements however much is drawn.

// Neighbour offsets, in tile space: [dRow, dCol].
const ORTHO = [[-1, 0], [0, 1], [1, 0], [0, -1]] as const;     // N, E, S, W
const DIAGONAL = [[-1, 1], [1, 1], [1, -1], [-1, -1]] as const; // NE, SE, SW, NW

// How far a diagonal connector reaches into each tile, in tiles: enough to
// close the pinhole, small enough that a diagonal run still reads as steps.
const CONNECTOR = 0.3;

function sub(pts: Pt[]): string {
  return `M${polyPoints(pts).replace(/ /g, 'L')}Z`;
}
function seg(a: Pt, b: Pt): string {
  return `M${a.x.toFixed(2)},${a.y.toFixed(2)}L${b.x.toFixed(2)},${b.y.toFixed(2)}`;
}

interface Geometry { fill: string; kerb: string; joints: string; }

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
  const kerb: string[] = [];
  const joints: string[] = [];

  for (const { row, col } of tiles) {
    const f = boxFaces(col, row, 1, 1, 0, 0);
    // top is [A, B, C, D] — A back, B right, C front, D left. The four edges
    // in the same order as ORTHO: N is A-B, E is B-C, S is C-D, W is D-A.
    const [A, B, C, D] = f.top;
    fill.push(sub(f.top));

    const edges: [Pt, Pt][] = [[A, B], [B, C], [C, D], [D, A]];
    const neighbour = ORTHO.map(([dr, dc]) => has(row + dr, col + dc));
    for (let i = 0; i < 4; i++) {
      // A kerb only where the paving stops: the whole of the autotile.
      if (!neighbour[i]) kerb.push(seg(edges[i][0], edges[i][1]));
      // Where paving continues, a light joint line (N and E only, so each
      // shared edge is drawn once).
      else if (i === 0 || i === 1) joints.push(seg(edges[i][0], edges[i][1]));
    }

    // Diagonal connectors, only when neither orthogonal tile between the
    // pair exists (otherwise they already share an edge).
    DIAGONAL.forEach(([dr, dc], k) => {
      if (!has(row + dr, col + dc)) return;
      // One patch per pair: only the tile that sees the other as SE or SW
      // draws it.
      if (dr < 0) return;
      const a = ORTHO[k];                  // one of the two tiles flanking this diagonal
      const b = ORTHO[(k + 1) % 4];        // the other
      if (has(row + a[0], col + a[1]) || has(row + b[0], col + b[1])) return;
      // A small diamond on the shared grid corner.
      const cc = col + (dc > 0 ? 1 : 0);
      const cr = row + (dr > 0 ? 1 : 0);
      fill.push(sub([
        project(cc - CONNECTOR, cr),
        project(cc, cr - CONNECTOR),
        project(cc + CONNECTOR, cr),
        project(cc, cr + CONNECTOR),
      ]));
    });
  }

  return { fill: fill.join(''), kerb: kerb.join(''), joints: joints.join('') };
}

export default function PathwayLayer({ pathways, camera }: { pathways: Pathways; camera: Camera }) {
  // Rebuilt when the pathways record changes identity (a tile drawn or
  // erased) or the camera moves.
  const { fill, kerb, joints } = useMemo(() => buildPathGeometry(pathways), [pathways, camera]);
  if (!fill) return null;
  return (
    <g className="campus-paths" aria-hidden="true">
      <path className="campus-path-fill" d={fill} />
      <path className="campus-path-joint" d={joints} />
      <path className="campus-path-kerb" d={kerb} />
    </g>
  );
}
