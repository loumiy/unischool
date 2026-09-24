import { memo } from 'react';
import { heightScale, polyPoints, project, projectedCircle, type Camera, type Pt } from './isoProjection';
import { shadowOffset, sunScreenDir } from './light';
import { roll, speciesOf, type Species } from '../data/treeData';

// Trees on the campus map. Geometry here, colour in styles.css.
//
// Everything about a tree derives from its tile's one stored seed, so a
// tree looks the same every render. Trees are drawn in the same depth-sorted
// pass as buildings (CampusMap.tsx) so they occlude and are occluded correctly.

// The species and the hash live in data/treeData.ts (Plan 37), where the
// reducer can honour a planting choice.
export type { Species } from '../data/treeData';

export interface TreeShape {
  species: Species;
  // Trunk position within its tile, 0..1, kept to the middle 60%.
  u: number;
  v: number;
  scale: number;
}

export function treeShape(seed: number): TreeShape {
  return {
    species: speciesOf(seed),
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

// How a tree answers the tilt (Plan 37, v2's shapes). `standing` is the
// camera's height factor, 1 at the opening view and 0 looking straight
// down, clamped so the low end of the ladder does not stretch a tree: as it
// falls, the crown settles onto the trunk, a broadleaf crown spreads (a
// canopy covers more ground than its height suggests) and a conifer keeps a
// quarter of its rise and none of the spread, so it stays a tight dark mark
// among the broad ones.
export const CROWN_SPREAD = 0.28;
export const CONIFER_FLOOR = 0.25;
export function treeStanding(): number {
  return Math.max(0, Math.min(1, heightScale()));
}

export function TreeAt({ col, row, species, scale, shadow = true }: {
  col: number; row: number; species: Species; scale: number;
  // Woodland trees pass false: CampusMap draws their shadows in one pass
  // under every mass so none lands on a building behind the tree.
  shadow?: boolean;
}) {
  const foot = project(col, row);
  const standing = treeStanding();
  const { trunkH, crownR } = crownOf(species, scale, standing);
  // The lit side follows the sun and is always toward the top. The cap is
  // the one part of a tree that a turn moves relative to its foot, so it is
  // drawn here and the rest comes from the memoised body, which a turn
  // leaves alone (Plan 38).
  const sun = sunScreenDir();
  const capDx = species === 'conifer' ? 0 : sun.x * crownR * (species === 'ornamental' ? 0.42 : 0.36);

  return (
    <>
      {shadow && <polygon className="campus-tree-shadow" points={polyPoints(treeShadow(col, row, species, scale))} />}
      <g className={`campus-tree ${species}`} aria-hidden="true" transform={`translate(${foot.x.toFixed(2)} ${foot.y.toFixed(2)})`}>
        <TreeBody species={species} scale={scale} standing={standing} hs={heightScale()} />
        {species === 'ornamental' ? (
          <circle className="campus-tree-crown-top" cx={capDx} cy={-trunkH * heightScale() - crownR * 0.95 * standing} r={crownR * 0.52} />
        ) : species === 'canopy' ? (
          <circle className="campus-tree-crown-top" cx={capDx} cy={-trunkH * heightScale() - crownR * 1.10 * standing} r={crownR * 0.60} />
        ) : null}
      </g>
    </>
  );
}

// The crown's drawn size at a tilt: see treeStanding.
function crownOf(species: Species, scale: number, standing: number) {
  const { trunkH, crownR: sideR, trunkW } = treeMetrics(species, scale);
  const crownR = sideR * (1 + (1 - standing) * (species === 'conifer' ? 0 : CROWN_SPREAD));
  return { trunkH, crownR, trunkW };
}

// Everything of a tree but its lit cap, drawn about its foot at the origin.
// It depends on the tilt and not the turn, so a turn redraws none of it.
// `hs` is the camera's height factor unclamped, which `standing` is not.
const TreeBody = memo(function TreeBody({ species, scale, standing, hs }: { species: Species; scale: number; standing: number; hs: number }) {
  const { trunkH, crownR, trunkW } = crownOf(species, scale, standing);
  const rise = CONIFER_FLOOR + (1 - CONIFER_FLOOR) * standing;
  const top = -trunkH * hs;
  return (
    <>
      <polygon
        className="campus-tree-trunk"
        points={polyPoints([
          { x: -trunkW, y: 0 },
          { x: trunkW, y: 0 },
          { x: trunkW * 0.6, y: top },
          { x: -trunkW * 0.6, y: top },
        ])}
      />
      {species === 'conifer' ? (
        // Three tapering tiers so the profile steps.
        [0, 1, 2].map((tier) => {
          const halfW = crownR * (1 - (tier / 2) * 0.45 * rise);
          const base = top - crownR * 0.75 * tier * rise;
          return (
            <polygon
              key={tier}
              className={tier === 2 ? 'campus-tree-crown-top' : 'campus-tree-crown'}
              points={polyPoints([
                { x: -halfW, y: base },
                { x: halfW, y: base },
                { x: 0, y: base - crownR * 1.5 * rise },
              ])}
            />
          );
        })
      ) : species === 'ornamental' ? (
        <circle className="campus-tree-crown" cx={0} cy={top - crownR * 0.55 * standing} r={crownR} />
      ) : (
        CANOPY_BLOBS.map((b, i) => (
          <circle
            key={i}
            className="campus-tree-crown"
            cx={b.dx * crownR}
            cy={top - crownR * 0.62 * standing + b.dy * crownR}
            r={b.r * crownR}
          />
        ))
      )}
    </>
  );
});

// A woodland tree on tile (row, col), rolled off the tile's seed. Memoised:
// a campus carries hundreds of trees. `camera` is a prop only so the memo
// redraws when the view turns.
function Tree({ row, col, seed }: { row: number; col: number; seed: number; camera: Camera }) {
  const { species, u, v, scale } = treeShape(seed);
  return <TreeAt col={col + u} row={row + v} species={species} scale={scale} shadow={false} />;
}
export default memo(Tree);
