import { memo } from 'react';
import { lift, polyPoints, project, projectedCircle, type Camera, type Pt } from './isoProjection';
import { shadowOffset, sunScreenDir } from './light';

// Trees on the campus map. Geometry here, colour in styles.css.
//
// Everything about a tree derives from its tile's one stored seed, so a
// tree looks the same every render. Trees are drawn in the same depth-sorted
// pass as buildings (CampusMap.tsx) so they occlude and are occluded correctly.

// Species mix: broad canopy, narrow conifer, small ornamental.
export type Species = 'canopy' | 'conifer' | 'ornamental';
const SPECIES: Species[] = ['canopy', 'canopy', 'canopy', 'conifer', 'conifer', 'ornamental'];

// Integer hash so each roll off one seed is independent; `seed % n` would
// correlate species with position and show as banding.
function roll(seed: number, salt: number): number {
  let h = (seed ^ (salt * 0x9e3779b1)) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 0x100000000;
}

export interface TreeShape {
  species: Species;
  // Trunk position within its tile, 0..1, kept to the middle 60%.
  u: number;
  v: number;
  scale: number;
}

export function treeShape(seed: number): TreeShape {
  return {
    species: SPECIES[Math.floor(roll(seed, 1) * SPECIES.length)],
    u: 0.2 + roll(seed, 2) * 0.6,
    v: 0.2 + roll(seed, 3) * 0.6,
    scale: 0.78 + roll(seed, 4) * 0.5,
  };
}

// Crowns are drawn in screen space as circles (a projected circle is a 2:1
// ellipse and reads as a plate). Shadows stay projected: they lie on the ground.

interface Blob { dx: number; dy: number; r: number; }

// Offsets in units of the crown's radius.
const CANOPY_BLOBS: Blob[] = [
  { dx: -0.42, dy: 0.16, r: 0.72 },
  { dx: 0.44, dy: 0.20, r: 0.68 },
  { dx: 0.02, dy: -0.24, r: 0.86 },
];

// One tree at fractional grid corner coordinates. Takes species and scale
// rather than a seed because the quad's authored planting (groundMarkings.tsx)
// shares it with the woodland.
//
// Trunk height and crown radius in screen units at the default pitch; a
// canopy tree (~60 to the crown top) is about half a lecture hall's height.
function treeMetrics(species: Species, scale: number) {
  return {
    trunkH: (species === 'conifer' ? 12 : species === 'ornamental' ? 11 : 22) * scale,
    crownR: (species === 'conifer' ? 13 : species === 'ornamental' ? 10 : 19) * scale,
    trunkW: (species === 'ornamental' ? 1.7 : species === 'conifer' ? 2.0 : 3.0) * scale,
  };
}

// Ground ellipse offset away from the sun by the crown's mid-height (light.ts),
// so trees and buildings cast shadows the same way.
export function treeShadow(col: number, row: number, species: Species, scale: number): Pt[] {
  const { trunkH, crownR } = treeMetrics(species, scale);
  const shadowR = (crownR / 64) * (species === 'conifer' ? 0.7 : 1);
  const { dcol, drow } = shadowOffset(trunkH + crownR * 0.7);
  return projectedCircle(col + dcol, row + drow, shadowR, 12);
}

// A woodland tree's shadow, for CampusMap's shadow pass.
export function woodlandShadow(row: number, col: number, seed: number): Pt[] {
  const { species, u, v, scale } = treeShape(seed);
  return treeShadow(col + u, row + v, species, scale);
}

export function TreeAt({ col, row, species, scale, shadow = true }: {
  col: number; row: number; species: Species; scale: number;
  // Woodland trees pass false: CampusMap draws their shadows in one pass
  // under every mass so none lands on a building behind the tree.
  shadow?: boolean;
}) {
  const foot = project(col, row);
  const { trunkH, crownR, trunkW } = treeMetrics(species, scale);
  const trunkTop = lift(foot, trunkH);
  // The lit side follows the sun and is always toward the top.
  const sun = sunScreenDir();

  return (
    <g className={`campus-tree ${species}`} aria-hidden="true">
      {shadow && <polygon className="campus-tree-shadow" points={polyPoints(treeShadow(col, row, species, scale))} />}
      <polygon
        className="campus-tree-trunk"
        points={polyPoints([
          { x: foot.x - trunkW, y: foot.y },
          { x: foot.x + trunkW, y: foot.y },
          { x: trunkTop.x + trunkW * 0.6, y: trunkTop.y },
          { x: trunkTop.x - trunkW * 0.6, y: trunkTop.y },
        ])}
      />
      {species === 'conifer' ? (
        // Three tapering tiers so the profile steps.
        [0, 1, 2].map((tier) => {
          const halfW = crownR * (1 - (tier / 2) * 0.45);
          const base = trunkTop.y - crownR * 0.75 * tier;
          return (
            <polygon
              key={tier}
              className={tier === 2 ? 'campus-tree-crown-top' : 'campus-tree-crown'}
              points={polyPoints([
                { x: foot.x - halfW, y: base },
                { x: foot.x + halfW, y: base },
                { x: foot.x, y: base - crownR * 1.5 },
              ])}
            />
          );
        })
      ) : species === 'ornamental' ? (
        <>
          <circle className="campus-tree-crown" cx={trunkTop.x} cy={trunkTop.y - crownR * 0.55} r={crownR} />
          <circle
            className="campus-tree-crown-top"
            cx={trunkTop.x + sun.x * crownR * 0.42} cy={trunkTop.y - crownR * 0.95}
            r={crownR * 0.52}
          />
        </>
      ) : (
        <>
          {CANOPY_BLOBS.map((b, i) => (
            <circle
              key={i}
              className="campus-tree-crown"
              cx={trunkTop.x + b.dx * crownR}
              cy={trunkTop.y - crownR * 0.62 + b.dy * crownR}
              r={b.r * crownR}
            />
          ))}
          {/* The lit cap, toward the sun (light.ts). */}
          <circle
            className="campus-tree-crown-top"
            cx={trunkTop.x + sun.x * crownR * 0.36}
            cy={trunkTop.y - crownR * 1.10}
            r={crownR * 0.60}
          />
        </>
      )}
    </g>
  );
}

// A woodland tree on tile (row, col), rolled off the tile's seed. Memoised:
// a campus carries hundreds of trees. `camera` is a prop only so the memo
// redraws when the view turns.
function Tree({ row, col, seed }: { row: number; col: number; seed: number; camera: Camera }) {
  const { species, u, v, scale } = treeShape(seed);
  return <TreeAt col={col + u} row={row + v} species={species} scale={scale} shadow={false} />;
}
export default memo(Tree);
