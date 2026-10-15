import { memo } from 'react';
import { heightScale, polyPoints, project, projectedCircle, type Camera, type Pt } from './isoProjection';
import { shadowOffset, sunScreenDir } from './light';
import { roll, speciesOf, type Species } from '../data/treeData';

// Trees on the campus map. Geometry here, color in styles.css.
//
// Everything about a tree derives from its tile's one stored seed, so a
// tree looks the same every render. Trees are drawn in the same depth-sorted
// pass as buildings (CampusMap.tsx) so they occlude and are occluded correctly.

// The species and the hash live in data/treeData.ts (Plan 37), where the
// reducer can honor a planting choice.
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
// The planted species (data/treeData.ts's PLANTED_SPECIES), sized beside
// those: a birch tall and slender, a willow low and broad, a cherry a small
// spreading crown on a short trunk, a palm a bare stem under its fronds.
const METRICS: Record<Species, { trunkH: number; crownR: number; trunkW: number }> = {
  canopy: { trunkH: 22, crownR: 19, trunkW: 3.0 },
  conifer: { trunkH: 12, crownR: 13, trunkW: 2.0 },
  ornamental: { trunkH: 11, crownR: 10, trunkW: 1.7 },
  birch: { trunkH: 24, crownR: 11, trunkW: 1.5 },
  willow: { trunkH: 14, crownR: 21, trunkW: 3.2 },
  cherry: { trunkH: 10, crownR: 15, trunkW: 2.0 },
  palm: { trunkH: 34, crownR: 15, trunkW: 1.7 },
};
function treeMetrics(species: Species, scale: number) {
  const m = METRICS[species];
  return { trunkH: m.trunkH * scale, crownR: m.crownR * scale, trunkW: m.trunkW * scale };
}

// The species whose crown keeps its height as the camera tilts down rather
// than spreading over the ground (see treeStanding): the evergreens.
function spreads(species: Species): boolean {
  return species !== 'conifer' && species !== 'palm';
}

// Ground ellipse offset away from the sun by the crown's mid-height (light.ts),
// so trees and buildings cast shadows the same way.
export function treeShadow(col: number, row: number, species: Species, scale: number): Pt[] {
  const { trunkH, crownR } = treeMetrics(species, scale);
  const shadowR = (crownR / 64) * (species === 'conifer' || species === 'birch' ? 0.7 : species === 'palm' ? 0.85 : 1);
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

export function TreeAt({ col, row, species, scale, shadow = false }: {
  col: number; row: number; species: Species; scale: number;
  // Off on the map: CampusMap draws every tree's shadow in one pass under
  // every mass (woodlandShadow, a GroundProp's `shadows`, the village's),
  // so none lands on a building behind the tree. For a tree drawn alone.
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
  const capDx = species === 'conifer' || species === 'palm' ? 0 : sun.x * crownR * (species === 'ornamental' ? 0.42 : 0.36);
  const top = -trunkH * heightScale();

  return (
    <>
      {shadow && <polygon className="campus-tree-shadow" points={polyPoints(treeShadow(col, row, species, scale))} />}
      <g className={`campus-tree ${species}`} aria-hidden="true" transform={`translate(${foot.x.toFixed(2)} ${foot.y.toFixed(2)})`}>
        <TreeBody species={species} scale={scale} standing={standing} hs={heightScale()} />
        {species === 'ornamental' ? (
          <circle className="campus-tree-crown-top" cx={capDx} cy={top - crownR * 0.95 * standing} r={crownR * 0.52} />
        ) : species === 'canopy' ? (
          <circle className="campus-tree-crown-top" cx={capDx} cy={top - crownR * 1.10 * standing} r={crownR * 0.60} />
        ) : species === 'birch' ? (
          <ellipse className="campus-tree-crown-top" cx={capDx * 0.6} cy={top - crownR * 1.55 * standing} rx={crownR * 0.42} ry={crownR * 0.62} />
        ) : species === 'willow' ? (
          <ellipse className="campus-tree-crown-top" cx={capDx} cy={top - crownR * 0.62 * standing} rx={crownR * 0.5} ry={crownR * 0.34} />
        ) : species === 'cherry' ? (
          <ellipse className="campus-tree-crown-top" cx={capDx} cy={top - crownR * 0.72 * standing} rx={crownR * 0.62} ry={crownR * 0.36} />
        ) : null}
      </g>
    </>
  );
}

// The crown's drawn size at a tilt: see treeStanding.
function crownOf(species: Species, scale: number, standing: number) {
  const { trunkH, crownR: sideR, trunkW } = treeMetrics(species, scale);
  const crownR = sideR * (1 + (1 - standing) * (spreads(species) ? CROWN_SPREAD : 0));
  return { trunkH, crownR, trunkW };
}

// A tree's outline on screen at the current camera, as points about which
// Walkers.tsx takes a hull (Plan 62: a walker behind a tree was drawn over
// it). The same geometry TreeBody draws: the trunk's foot, the crown's
// circles sampled round, or a conifer's tiers to its tip.
export function treeOutline(col: number, row: number, species: Species, scale: number): Pt[] {
  const foot = project(col, row);
  const standing = treeStanding();
  const hs = heightScale();
  const { trunkH, crownR, trunkW } = crownOf(species, scale, standing);
  const rise = CONIFER_FLOOR + (1 - CONIFER_FLOOR) * standing;
  const top = -trunkH * hs;
  const pts: Pt[] = [{ x: -trunkW, y: 0 }, { x: trunkW, y: 0 }];
  const ring = (cx: number, cy: number, r: number) => {
    for (let i = 0; i < 10; i++) pts.push({ x: cx + Math.cos((i / 10) * Math.PI * 2) * r, y: cy + Math.sin((i / 10) * Math.PI * 2) * r });
  };
  if (species === 'conifer') {
    pts.push({ x: -crownR, y: top }, { x: crownR, y: top }, { x: 0, y: top - crownR * 0.75 * 2 * rise - crownR * 1.5 * rise });
  } else if (species === 'ornamental') {
    ring(0, top - crownR * 0.55 * standing, crownR);
  } else if (species === 'birch') {
    ring(0, top - crownR * 1.0 * standing, crownR * 0.75);
    ring(0, top - crownR * 1.7 * standing, crownR * 0.6);
  } else if (species === 'willow') {
    const c = willowCurtain(crownR, top, standing, hs);
    ring(0, c.domeY, crownR * 0.8);
    pts.push({ x: -crownR, y: c.hem }, { x: crownR, y: c.hem });
  } else if (species === 'cherry') {
    ring(-crownR * 0.35, top - crownR * 0.45 * standing, crownR * 0.7);
    ring(crownR * 0.35, top - crownR * 0.45 * standing, crownR * 0.7);
  } else if (species === 'palm') {
    for (const f of palmFronds(crownR, top, standing)) pts.push(f.tip);
    pts.push({ x: 0, y: top - crownR * 0.3 });
  } else {
    for (const b of CANOPY_BLOBS) ring(b.dx * crownR, top - crownR * 0.62 * standing + b.dy * crownR, b.r * crownR);
  }
  return pts.map((q) => ({ x: foot.x + q.x, y: foot.y + q.y }));
}

// Everything of a tree but its lit cap, drawn about its foot at the origin.
// It depends on the tilt and not the turn, so a turn redraws none of it.
// `hs` is the camera's height factor unclamped, which `standing` is not.
// Exported, with Tree's own function, for the canvas map (canvasArt.ts).
export const TreeBody = memo(TreeBodyArt);
export function TreeBodyArt({ species, scale, standing, hs }: { species: Species; scale: number; standing: number; hs: number }) {
  const { trunkH, crownR, trunkW } = crownOf(species, scale, standing);
  const rise = CONIFER_FLOOR + (1 - CONIFER_FLOOR) * standing;
  const top = -trunkH * hs;
  const trunk = (
    <polygon
      className="campus-tree-trunk"
      points={polyPoints(species === 'palm'
        // A palm's stem leans a little and tapers to its crown.
        ? [{ x: -trunkW, y: 0 }, { x: trunkW, y: 0 }, { x: trunkW * 0.5 + crownR * 0.12, y: top }, { x: -trunkW * 0.5 + crownR * 0.12, y: top }]
        : [{ x: -trunkW, y: 0 }, { x: trunkW, y: 0 }, { x: trunkW * 0.6, y: top }, { x: -trunkW * 0.6, y: top }])}
    />
  );
  return (
    <>
      {trunk}
      {species === 'birch' && (
        // The birch's dark marks across its pale bark.
        [0.3, 0.55, 0.78].map((k) => (
          <line key={k} className="campus-tree-bark-mark" x1={-trunkW * 0.7} y1={top * k} x2={trunkW * 0.3} y2={top * k - 0.6} />
        ))
      )}
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
      ) : species === 'birch' ? (
        // A narrow, open crown in two lobes up the stem.
        <>
          <ellipse className="campus-tree-crown" cx={0} cy={top - crownR * 1.0 * standing} rx={crownR * 0.72} ry={crownR * (0.6 + 0.4 * standing)} />
          <ellipse className="campus-tree-crown" cx={crownR * 0.08} cy={top - crownR * 1.7 * standing} rx={crownR * 0.56} ry={crownR * (0.45 + 0.35 * standing)} />
        </>
      ) : species === 'willow' ? (
        <WillowCrown crownR={crownR} top={top} standing={standing} hs={hs} />
      ) : species === 'cherry' ? (
        // A wide, flat-topped crown of two lobes.
        <>
          <ellipse className="campus-tree-crown" cx={-crownR * 0.35} cy={top - crownR * 0.45 * standing} rx={crownR * 0.72} ry={crownR * 0.55} />
          <ellipse className="campus-tree-crown" cx={crownR * 0.35} cy={top - crownR * 0.45 * standing} rx={crownR * 0.72} ry={crownR * 0.55} />
        </>
      ) : species === 'palm' ? (
        palmFronds(crownR, top, standing).map((f, i) => (
          <polygon key={i} className={f.lit ? 'campus-tree-crown-top' : 'campus-tree-crown'} points={polyPoints(f.blade)} />
        ))
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
}

// A willow's crown: a dome, and the curtain of hanging shoots from its
// sides nearly to the ground, its hem cut in scallops. The hem is a height
// above the ground, so it follows the tilt as the trunk does.
function willowCurtain(crownR: number, top: number, standing: number, hs: number) {
  return { domeY: top - crownR * 0.5 * standing, hem: -crownR * 0.25 * hs };
}
function WillowCrown({ crownR, top, standing, hs }: { crownR: number; top: number; standing: number; hs: number }) {
  const { domeY, hem } = willowCurtain(crownR, top, standing, hs);
  const SCALLOPS = 6;
  const curtain: Pt[] = [{ x: -crownR * 0.78, y: domeY }, { x: crownR * 0.78, y: domeY }, { x: crownR, y: hem }];
  for (let i = 1; i < SCALLOPS; i++) {
    const x = crownR - (2 * crownR * i) / SCALLOPS;
    curtain.push({ x: x + crownR / SCALLOPS, y: hem - crownR * 0.12 }, { x, y: hem });
  }
  curtain.push({ x: -crownR, y: hem });
  return (
    <>
      <polygon className="campus-tree-crown" points={polyPoints(curtain)} />
      <ellipse className="campus-tree-crown" cx={0} cy={domeY} rx={crownR * 0.8} ry={crownR * 0.55} />
      {/* The shoots: a few strokes down the curtain. */}
      {[-0.55, -0.2, 0.2, 0.55].map((k) => (
        <line key={k} className="campus-tree-shoot" x1={crownR * k} y1={domeY + crownR * 0.2} x2={crownR * k * 1.15} y2={hem - crownR * 0.06} />
      ))}
    </>
  );
}

// A palm's fronds: blades out from the crown, arching down at their tips,
// the far ones lit. Shorter as the camera looks down, as a conifer is.
function palmFronds(crownR: number, top: number, standing: number) {
  const head = { x: crownR * 0.12, y: top };
  const FRONDS = 7;
  return Array.from({ length: FRONDS }, (_, i) => {
    const a = (i / FRONDS) * Math.PI * 2 + 0.3;
    const dx = Math.cos(a) * crownR;
    const lift = Math.sin(a) * crownR * 0.35;
    const droop = crownR * 0.55 * standing;
    const tip = { x: head.x + dx, y: head.y + droop - lift };
    const mid = { x: head.x + dx * 0.5, y: head.y - crownR * 0.25 * standing - lift * 0.5 };
    const w = crownR * 0.16;
    const blade = [head, { x: mid.x, y: mid.y - w }, tip, { x: mid.x, y: mid.y + w }];
    return { blade, tip, lit: Math.sin(a) > 0.2 };
  });
}

// A woodland tree on tile (row, col), rolled off the tile's seed. Memoised:
// a campus carries hundreds of trees. `camera` is a prop only so the memo
// redraws when the view turns.
function Tree({ row, col, seed }: { row: number; col: number; seed: number; camera: Camera }) {
  const { species, u, v, scale } = treeShape(seed);
  return <TreeAt col={col + u} row={row + v} species={species} scale={scale} shadow={false} />;
}
export { Tree as TreeArt };
export default memo(Tree);
