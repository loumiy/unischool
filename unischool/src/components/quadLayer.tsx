import { memo } from 'react';
import type { Quad } from '../state/quads';
import { tileOf } from '../state/quads';
import { polyPoints, boxFaces, project, type Camera } from './isoProjection';

// The quads on the map (state/quads.ts): a tint on the ground each covers, an
// outline on the one under the pointer or open in its card, and names laid on
// the ground. A name is an answer, not a caption: it shows on the quad under
// the pointer or in its card, and N shows them all (ported from v2).

const NAME_FONT = 30;

// One subpath per run of tiles along a row, not one per tile: a large green
// is hundreds of tiles.
function patchPath(q: Quad): string {
  const byRow = new Map<number, number[]>();
  for (const i of q.tiles) {
    const { row, col } = tileOf(i);
    const cols = byRow.get(row);
    if (cols) cols.push(col);
    else byRow.set(row, [col]);
  }
  const parts: string[] = [];
  for (const [row, cols] of byRow) {
    cols.sort((a, b) => a - b);
    let start = cols[0];
    for (let k = 1; k <= cols.length; k++) {
      if (k < cols.length && cols[k] === cols[k - 1] + 1) continue;
      const end = cols[k - 1] + 1;
      parts.push(`M${polyPoints(boxFaces(start, row, end - start, 1, 0, 0).top).replace(/ /g, 'L')}Z`);
      if (k < cols.length) start = cols[k];
    }
  }
  return parts.join('');
}

// The tint: in the static layer, redrawn only when the quads or the camera
// change.
export const QuadPatches = memo(function QuadPatches({ quads, camera }: { quads: readonly Quad[]; camera: Camera }) {
  void camera; // the projection reads it; the memo redraws when it turns
  if (quads.length === 0) return null;
  return (
    <g className="campus-quads" aria-hidden="true">
      {quads.map((q) => <path key={q.key} className={`campus-quad${q.designated ? ' designated' : ''}`} d={patchPath(q)} />)}
    </g>
  );
});

// The outline and names: live, since they follow the pointer.
export function QuadOverlay({ quads, hovered, inspected, showAll, camera }: {
  quads: readonly Quad[]; hovered: string | null; inspected: string | null; showAll: boolean; camera: Camera;
}) {
  void camera;
  const lit = quads.filter((q) => q.key === hovered || q.key === inspected);
  const named = showAll ? quads : lit;
  return (
    <g className="campus-quad-overlay" aria-hidden="true">
      {lit.map((q) => (
        <path key={q.key} className={`campus-quad-outline${q.key === inspected ? ' inspected' : ''}`} d={patchPath(q)} />
      ))}
      {named.map((q) => {
        const at = project(q.centre.col, q.centre.row);
        return (
          <text key={q.key} className="campus-quad-name" x={at.x.toFixed(1)} y={at.y.toFixed(1)} fontSize={NAME_FONT}>
            {q.name}
          </text>
        );
      })}
    </g>
  );
}
