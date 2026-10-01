import { memo } from 'react';
import type { Vernacular } from '../state/types';
import type { Camera, FaceDir } from './isoProjection';
import { materialsFor } from './buildingSpec';
import { WALL_LIGHT } from './light';
import { shade } from './tint';
import { SNOW_COLOR, mixColor } from './seasons';
import { TreeAt } from './trees';
import { hazeOf, ringView, type House, type RingSprite, type RingView, type Shop } from './ringLand';

// The land around the campus (Plan 81B; the geometry is ringLand.ts).
// Two layers: RingBack under the whole campus (the ground, the road, the
// woods and roofs behind and beside the parcel, and the haze), and
// RingFront, the few sprites that stand in front of the parcel's near
// edges, drawn over the campus by CampusScene. Neither takes a pointer.
//
// While the camera turns, the whole ring is drawn at every angle the turn
// passes through, as the campus is (Plan 82).

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

// The downtown (Plan 85H): its walls, the town's own materials and three
// painted fronts; its awnings; and its glass and lights, dark by day and
// warm when the district is lit.
const SHOP_PAINT = ['#e3d6bb', '#a9b79c', '#8c9cad'];
const AWNINGS = ['#b0473b', '#2f6b5a', '#2d4b78', '#c39232', '#77405f'];
const SHOP_ROOF = '#57524c';
const SHOP_PARAPET = '#8e877d';
const GLASS = '#3f4b55';
const WINDOW = '#4d5862';
const LIT = '#ffd47e';
const GLOW = '#ffcf6b';
const WIRE = '#3a342f';
const BULB_OFF = '#d8d0c0';

function ShopSprite({ sprite, vernacular, snow }: { sprite: Extract<RingSprite, { kind: 'shop' }>; vernacular: Vernacular; snow: number }) {
  const x: Shop = sprite.shop;
  const pal = townPalette(vernacular);
  const walls = [...pal.walls, ...SHOP_PAINT];
  const wall = walls[x.wall % walls.length]!;
  const color = AWNINGS[x.awning % AWNINGS.length]!;
  // The awning and sign: over the walls when the shopfront faces the
  // camera, else behind them.
  const front = x.awning < 0 ? null : (
    <>
      {sprite.awning && <path d={sprite.awning} fill={color} />}
      {sprite.valance && <path d={sprite.valance} fill={shade(color, 0.72)} />}
      {sprite.sign && <path d={sprite.sign} fill={sprite.lit ? LIT : shade(color, 1.15)} />}
    </>
  );
  return (
    <>
      {sprite.glow && <path d={sprite.glow} fill={GLOW} fillOpacity={0.32} />}
      {!sprite.facing && front}
      {sprite.walls.map((w) => <path key={w.dir} d={w.d} fill={shade(wall, WALL_LIGHT[w.dir])} />)}
      <path d={sprite.parapet} fill={mixColor(SHOP_PARAPET, SNOW_COLOR, snow * 0.6)} />
      <path d={sprite.roof} fill={mixColor(SHOP_ROOF, SNOW_COLOR, snow * 0.85)} />
      {sprite.windows && <path d={sprite.windows} fill={WINDOW} />}
      {sprite.litWindows && <path d={sprite.litWindows} fill={LIT} />}
      {sprite.glass && <path d={sprite.glass} fill={sprite.lit ? LIT : GLASS} />}
      {sprite.facing && front}
    </>
  );
}

function LightsSprite({ sprite }: { sprite: Extract<RingSprite, { kind: 'lights' }> }) {
  return (
    <>
      {sprite.pool && <path d={sprite.pool} fill={GLOW} fillOpacity={0.3} />}
      <path d={sprite.poles} fill="none" stroke={WIRE} strokeWidth={1.4} />
      <path d={sprite.wire} fill="none" stroke={WIRE} strokeWidth={0.9} />
      {sprite.halo && <path d={sprite.halo} fill={GLOW} fillOpacity={0.3} />}
      <path d={sprite.bulbs} fill={sprite.lit ? LIT : BULB_OFF} />
    </>
  );
}

function Sprite({ sprite, vernacular, snow }: { sprite: RingSprite; vernacular: Vernacular; snow: number }) {
  switch (sprite.kind) {
    case 'tree': {
      const t = sprite.tree;
      return <TreeAt col={t.col} row={t.row} species={t.species} scale={t.scale} />;
    }
    case 'crowns':
      return (
        <>
          {sprite.body && <path className="ring-crown" d={sprite.body} />}
          {sprite.top && <path className="ring-crown-top" d={sprite.top} />}
          {sprite.pineBody && <path className="ring-pine-crown" d={sprite.pineBody} />}
          {sprite.pineTop && <path className="ring-pine-crown-top" d={sprite.pineTop} />}
        </>
      );
    case 'house':
      return <HouseSprite h={sprite.house} walls={sprite.walls} roofs={sprite.roofs} vernacular={vernacular} snow={snow} />;
    case 'shop':
      return <ShopSprite sprite={sprite} vernacular={vernacular} snow={snow} />;
    case 'lights':
      return <LightsSprite sprite={sprite} />;
  }
}

// The ground: its fields, lanes and road.
// The memoised pieces' own functions are exported for the canvas map
// (canvasArt.ts), which calls them directly.
export const RingGround = memo(RingGroundArt);
export function RingGroundArt({ view }: { view: RingView }) {
  return (
    <>
      {view.covers.map((c) => <path key={c.cover} className={`ring-field ring-${c.cover}`} d={c.d} />)}
      <path className="ring-lane" d={view.lanes} />
      <path className="campus-road" d={view.road} />
      <path className="campus-road-kerb" d={view.kerbs} />
      <path className="campus-road-centre" d={view.centre} />
      {/* The hills' light, over the fields and the grass alike. */}
      <path className="ring-lit" d={view.light[0]} />
      <path className="ring-lit" d={view.light[1]} />
      <path className="ring-shaded" d={view.shadow[0]} />
      <path className="ring-shaded" d={view.shadow[1]} />
    </>
  );
}

export const RingSprites = memo(RingSpritesArt);
export function RingSpritesArt({ sprites, vernacular, snow }: {
  sprites: readonly RingSprite[]; vernacular: Vernacular; snow: number;
}) {
  return <>{sprites.map((s) => <Sprite key={s.key} sprite={s} vernacular={vernacular} snow={snow} />)}</>;
}

export const RingBack = memo(RingBackArt);
export function RingBackArt({ name, vernacular, camera, turning, snow, district = 0, lit = false }: {
  name: string; vernacular: Vernacular;
  // The downtown's step and whether it is lit (Plan 85H; ringView).
  district?: number; lit?: boolean;
  // A prop so the memo redraws on a camera change (the ring is projected).
  camera: Camera;
  // A turn is under way: the ring is drawn at every angle it passes
  // through, but those views are not kept (ringView's cache is for views
  // the camera rests on).
  turning: boolean;
  // How deep the snow lies, for the roofs (the ground takes the map's CSS
  // variables, as the campus's lawns do).
  snow: number;
}) {
  const haze = hazeOf(camera);
  const view = ringView(name, !turning, district, lit);
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
      </defs>
      <polygon className="ring-base" points={view.base} />
      <RingGround view={view} />
      <RingSprites sprites={view.back} vernacular={vernacular} snow={snow} />
      <polygon points={haze.plate} fill="url(#ring-haze)" />
      {view.ridges.map((r, i) => r.d && (
        <path key={i} className="ring-far-hill" d={r.d}
          style={{ fill: `color-mix(in srgb, var(--far-hill) ${Math.round((1 - r.haze) * 100)}%, var(--haze))` }} />
      ))}
      {haze.depth > 0 && <polygon points={haze.plate} fill="url(#ring-depth)" />}
    </g>
  );
}

// The sprites standing in front of the parcel, drawn after the campus.
export const RingFront = memo(RingFrontArt);
export function RingFrontArt({ name, vernacular, camera, turning, snow, district = 0, lit = false }: {
  name: string; vernacular: Vernacular; camera: Camera; turning: boolean; snow: number; district?: number; lit?: boolean;
}) {
  void camera;
  const view = ringView(name, !turning, district, lit);
  return (
    <g className="ring" aria-hidden="true">
      <RingSprites sprites={view.front} vernacular={vernacular} snow={snow} />
    </g>
  );
}
