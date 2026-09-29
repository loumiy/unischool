import { memo, useRef } from 'react';
import type { Vernacular } from '../state/types';
import { CAMPUS_GRID_HEIGHT as GH, CAMPUS_GRID_WIDTH as GW } from '../state/types';
import { ROAD_FIRST_ROW } from '../state/campusMap';
import { boxFaces, polyPoints, type Camera, type FaceDir } from './isoProjection';
import { materialsFor } from './buildingSpec';
import { WALL_LIGHT } from './light';
import { shade } from './tint';
import { SNOW_COLOR, mixColor } from './seasons';
import { TreeAt } from './trees';
import { RING, hazeOf, ringView, type House, type RingSprite, type RingView } from './ringLand';

// The land around the campus (Plan 81B; the geometry is ringLand.ts).
// Two layers: RingBack under the whole campus (the ground, the road, the
// woods and roofs behind and beside the parcel, and the haze), and
// RingFront, the few sprites that stand in front of the parcel's near
// edges, drawn over the campus by CampusScene. Neither takes a pointer.
//
// While the camera turns, the ring is drawn as its flat plate, the road and
// the haze, and the rest is hidden until the turn settles, as the campus's
// own trees are left out (Plan 80H).

// The roofs and walls of the town, in the college's own vernacular: its
// brick, its buff and its stone, under its two pitched-roof colors.
function townPalette(v: Vernacular) {
  const m = materialsFor(v);
  return { walls: [m.brickRed.wall, m.brickBuff.wall, m.limestone.wall], roofs: [m.brickRed.roof, m.brickBuff.roof] };
}
const BARN_WALL = '#7d5a44';
// A slope's tone by the way it faces, as the campus's roofs are lit.
const ROOF_LIGHT: Record<FaceDir, number> = { negCol: 1.12, negRow: 1.03, posRow: 0.9, posCol: 0.8 };
// Snow lies deepest on the lit slopes (buildingMotifs.tsx's snowOnRoofs).
const ROOF_SNOW: Record<FaceDir, number> = { negCol: 0.85, negRow: 0.8, posRow: 0.72, posCol: 0.66 };

function HouseSprite({ h, walls, roofs, vernacular, snow }: {
  h: House; walls: { d: string; dir: FaceDir }[]; roofs: { d: string; dir: FaceDir }[];
  vernacular: Vernacular; snow: number;
}) {
  const pal = townPalette(vernacular);
  const wall = h.wall < 0 ? BARN_WALL : pal.walls[h.wall % pal.walls.length]!;
  const roof = pal.roofs[h.roof % pal.roofs.length]!;
  return (
    <>
      {walls.map((w) => <path key={w.dir} d={w.d} fill={shade(wall, WALL_LIGHT[w.dir])} />)}
      {roofs.map((r) => (
        <path key={r.dir} d={r.d} fill={mixColor(shade(roof, ROOF_LIGHT[r.dir]), SNOW_COLOR, snow * ROOF_SNOW[r.dir])} />
      ))}
    </>
  );
}

function Sprite({ sprite, vernacular, snow }: { sprite: RingSprite; vernacular: Vernacular; snow: number }) {
  switch (sprite.kind) {
    case 'tree': {
      const t = sprite.tree;
      return <TreeAt col={t.col} row={t.row} species={t.species} scale={t.scale} />;
    }
    case 'clumps':
      return (
        <>
          {sprite.body && <path className="ring-clump" d={sprite.body} />}
          {sprite.top && <path className="ring-clump-top" d={sprite.top} />}
          {sprite.pineBody && <path className="ring-pine-clump" d={sprite.pineBody} />}
          {sprite.pineTop && <path className="ring-pine-clump-top" d={sprite.pineTop} />}
        </>
      );
    case 'house':
      return <HouseSprite h={sprite.house} walls={sprite.walls} roofs={sprite.roofs} vernacular={vernacular} snow={snow} />;
  }
}

// A wood's canopy seen from above, as a texture: crowns lit on the sun's
// side over the wood's own floor, so a wood reads as trees without a shape
// for each. In the world's units, like the crowns of the campus's trees; the
// crowns take the season's colors (and go bare), as those do.
const CANOPY = [
  [14, 12, 17], [52, 6, 15], [88, 16, 19], [128, 8, 16], [164, 18, 15],
  [30, 40, 18], [72, 44, 16], [110, 38, 19], [150, 48, 17], [6, 64, 15],
  [46, 74, 19], [92, 70, 15], [132, 80, 18], [172, 72, 14], [20, 96, 16], [112, 102, 15], [64, 104, 13],
] as const;
const PINES = [
  [12, 22, 11], [40, 14, 12], [70, 26, 10], [100, 12, 12], [132, 24, 11], [160, 14, 12],
  [26, 56, 12], [58, 50, 11], [88, 60, 12], [118, 48, 10], [148, 58, 12], [174, 52, 10],
  [8, 90, 11], [40, 94, 12], [74, 88, 10], [104, 98, 12], [136, 90, 11], [166, 100, 12],
] as const;
// Kept through a turn, so the frame that settles it does not build them
// again.
const CanopyPatterns = memo(function CanopyPatterns() {
  return (
    <>
      <pattern id="ring-canopy" patternUnits="userSpaceOnUse" width={180} height={108}>
        <rect className="ring-canopy-floor" width={180} height={108} />
        {CANOPY.map(([x, y, r], i) => <circle key={i} className="ring-clump" cx={x} cy={y} r={r} />)}
        {CANOPY.map(([x, y, r], i) => <circle key={`t${i}`} className="ring-clump-top" cx={x - r * 0.3} cy={y - r * 0.35} r={r * 0.5} />)}
      </pattern>
      <pattern id="ring-pines" patternUnits="userSpaceOnUse" width={180} height={108}>
        <rect className="ring-pine-floor" width={180} height={108} />
        {PINES.map(([x, y, r], i) => <path key={i} className="ring-pine-clump" d={`M${x - r},${y + r}L${x + r},${y + r}L${x},${y - r * 1.6}Z`} />)}
        {PINES.map(([x, y, r], i) => <path key={`t${i}`} className="ring-pine-clump-top" d={`M${x - r * 0.45},${y - r * 0.3}L${x + r * 0.45},${y - r * 0.3}L${x},${y - r * 1.6}Z`} />)}
      </pattern>
    </>
  );
});

// The ring's plate and its road, flat: all a turn draws.
function flatPlate(): { base: string; road: string } {
  const base = polyPoints(boxFaces(-RING, -RING, GW + 2 * RING, GH + 2 * RING, 0, 0).top);
  const road = [
    boxFaces(-RING, ROAD_FIRST_ROW, RING, GH - ROAD_FIRST_ROW, 0, 0).top,
    boxFaces(GW, ROAD_FIRST_ROW, RING, GH - ROAD_FIRST_ROW, 0, 0).top,
  ].map((q) => `M${polyPoints(q).replace(/ /g, 'L')}Z`).join('');
  return { base, road };
}

// The ring at the view the camera last rested on. Through a turn it stays
// that view's, mounted but hidden (by `visibility`, which keeps the
// browser's layout of it, where `display` threw it away and built it again),
// so the memoised layers below skip every frame of it, and the frame that
// settles it updates their shapes rather than building them again.
function useRestView(name: string, turning: boolean): RingView {
  const rest = useRef<RingView | null>(null);
  if (!turning || !rest.current) rest.current = ringView(name);
  return rest.current;
}

// The ground: its fields, lanes, road and hedges.
const RingGround = memo(function RingGround({ view }: { view: RingView }) {
  return (
    <>
      {view.covers.map((c) => (
        <path key={c.key} className={`ring-field ring-${c.cover}${c.shade ? ` ring-shade${c.shade}` : ''}`} d={c.d} />
      ))}
      <path className="ring-lane" d={view.lanes} />
      <path className="campus-road" d={view.road} />
      <path className="campus-road-kerb" d={view.kerbs} />
      <path className="campus-road-centre" d={view.centre} />
      <path className="ring-hedge" d={view.hedges} />
    </>
  );
});

const RingSprites = memo(function RingSprites({ sprites, vernacular, snow }: {
  sprites: readonly RingSprite[]; vernacular: Vernacular; snow: number;
}) {
  return <>{sprites.map((s) => <Sprite key={s.key} sprite={s} vernacular={vernacular} snow={snow} />)}</>;
});

export const RingBack = memo(function RingBack({ name, vernacular, camera, turning, snow }: {
  name: string; vernacular: Vernacular;
  // A prop so the memo redraws on a camera change (the ring is projected).
  camera: Camera;
  turning: boolean;
  // How deep the snow lies, for the roofs (the ground takes the map's CSS
  // variables, as the campus's lawns do).
  snow: number;
}) {
  const haze = hazeOf(camera);
  const view = useRestView(name, turning);
  const flat = turning ? flatPlate() : null;
  return (
    <g className="ring" aria-hidden="true">
      <defs>
        <radialGradient id="ring-haze" gradientUnits="userSpaceOnUse" cx={haze.cx} cy={haze.cy} r={haze.r} gradientTransform={haze.matrix}>
          {haze.stops.map(([at, a]) => <stop key={at} offset={at} className="ring-haze-stop" stopOpacity={a} />)}
        </radialGradient>
        <linearGradient id="ring-depth" gradientUnits="userSpaceOnUse" x1={0} x2={0} y1={haze.y1} y2={haze.y2}>
          <stop offset={0} className="ring-haze-stop" stopOpacity={0} />
          <stop offset={1} className="ring-haze-stop" stopOpacity={haze.depth} />
        </linearGradient>
        <CanopyPatterns />
      </defs>
      <polygon className="ring-base" points={flat ? flat.base : view.base} />
      {flat && <path className="campus-road" d={flat.road} />}
      <g visibility={turning ? 'hidden' : undefined}>
        <RingGround view={view} />
        <RingSprites sprites={view.back} vernacular={vernacular} snow={snow} />
      </g>
      <polygon points={haze.plate} fill="url(#ring-haze)" />
      {haze.depth > 0 && <polygon points={haze.plate} fill="url(#ring-depth)" />}
    </g>
  );
});

// The sprites standing in front of the parcel, drawn after the campus.
export const RingFront = memo(function RingFront({ name, vernacular, camera, turning, snow }: {
  name: string; vernacular: Vernacular; camera: Camera; turning: boolean; snow: number;
}) {
  void camera;
  const view = useRestView(name, turning);
  return (
    <g className="ring" aria-hidden="true" visibility={turning ? 'hidden' : undefined}>
      <RingSprites sprites={view.front} vernacular={vernacular} snow={snow} />
    </g>
  );
});
