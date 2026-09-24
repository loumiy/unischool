import { memo } from 'react';
import type { CampusLayout } from './campusLayout';
import { boxFaces, lift, polyPoints, project, type Camera } from './isoProjection';
import { drawnHeightOf } from './buildingMotifs';
import { motifOf } from './buildingSpec';
import { parsePathTileKey } from '../state/campusMap';
import { treeShape, treeStanding } from './trees';

// The scene a quarter turn draws (Plan 37). The full scene costs a late
// campus a third of a second to redraw, and a turn is a quarter of one, so
// for its length the map draws the campus's massing instead: each building a
// plain box of its footprint and height, each tree one round crown, painted
// back to front by the ground each stands on. CampusMap swaps the full scene
// back as the view comes to rest. `inset` is the buildings' drawn inset, so
// a box stands where its building does.

interface Item { key: string; depth: number; node: React.ReactNode }

export default memo(function TurningScene({ layout, inset }: { layout: CampusLayout; inset: number; camera: Camera }) {
  const items: Item[] = [];
  for (const { t, p, developing } of layout.placed) {
    const col = p.col + inset;
    const row = p.row + inset;
    const w = p.w - inset * 2;
    const h = p.h - inset * 2;
    const flat = motifOf(t) === 'grounds';
    const height = flat ? 0 : drawnHeightOf(t, developing, layout.vernacular);
    const f = boxFaces(col, row, w, h, 0, height);
    const depth = Math.max(f.NW.y, f.NE.y, f.SE.y, f.SW.y);
    items.push({
      key: t.id,
      depth: flat ? -Infinity : depth,
      node: flat ? (
        <polygon key={t.id} className="turn-grounds" points={polyPoints(f.top)} />
      ) : (
        <g key={t.id}>
          <polygon className="turn-wall-left" points={polyPoints(f.left)} />
          <polygon className="turn-wall-right" points={polyPoints(f.right)} />
          <polygon className="turn-roof" points={polyPoints(f.top)} />
        </g>
      ),
    });
  }
  const standing = treeStanding();
  for (const [key, seed] of Object.entries(layout.trees)) {
    if (key in layout.pathways) continue;
    const tile = parsePathTileKey(key);
    if (!tile) continue;
    const { species, u, v, scale } = treeShape(seed);
    const foot = project(tile.col + u, tile.row + v);
    const r = (species === 'conifer' ? 11 : species === 'ornamental' ? 10 : 19) * scale;
    const c = lift(foot, (species === 'canopy' ? 22 : 12) * scale + r * 0.6 * standing);
    items.push({ key: `t-${key}`, depth: foot.y, node: <circle key={`t-${key}`} className={`turn-tree ${species}`} cx={c.x} cy={c.y} r={r} /> });
  }
  items.sort((a, b) => a.depth - b.depth);
  return <g className="turning-scene" aria-hidden="true">{items.map((i) => i.node)}</g>;
});
