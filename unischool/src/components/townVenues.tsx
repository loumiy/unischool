// The town's pleasures (Plan 127): the pub, the bowling alley and the movie
// theater each draw themselves, as the chapel does (buildingMotifs.tsx
// routes to them before the common frame; a building still going up keeps
// the common site). The pub is a two-story house in the campus's own wall
// and roof, with a beer garden behind; the bowling alley and the movie
// theater are commercial buildings, the same in every set: a long shed
// under a giant pin, and an auditorium behind a tall lobby front with a
// marquee and a blade sign.
//
// Everything is set out in the building's own frame (facing.ts's
// localBox: u across the front from its left, d from the front back), so
// it keeps its plan whichever way the building is turned; what stands out
// from a wall (the marquee, a blade sign, the pub's hanging sign) is pushed
// along the wall's outward direction on the grid, so it turns with the
// camera. The front door is at the middle of the front, where walkRoutes.ts
// walks to.

import { boxFaces, facePoint, lift, polyPoints, project, projectedCircle, type BoxFaces, type FaceDir, type Pt } from './isoProjection';
import { STOREY, up } from './campusScale';
import { faceTone } from './light';
import { shade } from './tint';
import { occludes } from './depthSort';
import { frontDepth, frontWidth, localBox, sidesOf, type Plot } from './facing';
import type { Palette } from './buildingMotifs';
import type { StonePalette } from './buildingSpec';

interface Box { col: number; row: number; w: number; h: number }
interface Wall { o: Pt; a: Pt; span: number; dir: FaceDir }

const P = (pts: Pt[]) => polyPoints(pts);
function quad(o: Pt, a: Pt, H: number, u0: number, u1: number, z0: number, z1: number): Pt[] {
  return [facePoint(o, a, H, u0, z0 / H), facePoint(o, a, H, u1, z0 / H), facePoint(o, a, H, u1, z1 / H), facePoint(o, a, H, u0, z1 / H)];
}
// A wall of a box by grid direction, if the camera sees it.
function seen(f: BoxFaces, dir: FaceDir): Wall | null {
  if (dir === f.dir.CD) return { o: f.D, a: f.C, span: f.spanLeft, dir };
  if (dir === f.dir.BC) return { o: f.C, a: f.B, span: f.spanRight, dir };
  return null;
}
function visibleWallsOf(f: BoxFaces): Wall[] {
  return [seen(f, f.dir.CD)!, seen(f, f.dir.BC)!];
}
// A screen offset `tiles` out from a wall, along its outward normal.
function outward(dir: FaceDir, tiles: number): Pt {
  const o = project(0, 0);
  const d = dir === 'posRow' ? project(0, tiles) : dir === 'negRow' ? project(0, -tiles)
    : dir === 'posCol' ? project(tiles, 0) : project(-tiles, 0);
  return { x: d.x - o.x, y: d.y - o.y };
}
const add = (p: Pt, d: Pt, k = 1): Pt => ({ x: p.x + d.x * k, y: p.y + d.y * k });
// A plain box: its two seen walls in a tone lit by direction, and its top.
function mass(f: BoxFaces, wall: string, top: string) {
  return (
    <>
      <polygon points={P(f.left)} fill={faceTone(f.dir.CD, wall, shade(wall, 0.84))} />
      <polygon points={P(f.right)} fill={faceTone(f.dir.BC, wall, shade(wall, 0.84))} />
      <polygon points={P(f.top)} fill={top} />
    </>
  );
}
function band(w: Wall, H: number, z0: number, z1: number, fill: string, key?: string, u0 = 0, u1 = 1) {
  return <polygon key={key} points={P(quad(w.o, w.a, H, u0, u1, z0, z1))} fill={fill} />;
}
// Painted in order of depth: the farther box first.
function inOrder(parts: Array<{ box: Box; node: React.ReactNode }>) {
  return [...parts].sort((x, y) => occludes(x.box, y.box)).map((x, i) => <g key={i}>{x.node}</g>);
}

const BULB = '#ffe08a';
const MARQUEE_RED = '#b3262e';
const NAVY = '#1f2d55';
const NEON = '#ff8a3d';
const PUB_GREEN = '#1f4a36';
const GILT = '#d9b44a';
const DARK_GLASS = '#26323c';
const DECK = '#8d9094';

// ---------------------------------------------------------------------------
// The movie theater: a windowless auditorium in brick, and in front of it a
// taller lobby in cream render with a stepped parapet, gilt fins, a glass
// front under a lit marquee, poster cases, and a blade sign at its middle
// standing out from the wall and up past the roof.
// ---------------------------------------------------------------------------
const CINEMA_HALL = up(9.5);
const CINEMA_FRONT = up(12);
const CINEMA_CREAM = '#ece2c8';

export function Cinema({ p, wall }: { p: Plot; wall: string }) {
  const W = frontWidth(p); const D = frontDepth(p);
  const frontDir = sidesOf(p.facing).front;
  const hallBox = localBox(p, 0.35, 1.5, W - 0.35, D - 0.1);
  // The lobby meets the auditorium without overlapping it: overlapping
  // boxes have no order (depthSort.ts's occludes is 0), and the hall was
  // drawn over the lobby from behind.
  const lobbyBox = localBox(p, 0.1, 0.12, W - 0.1, 1.5);
  const crownBox = localBox(p, W * 0.32, 0.12, W * 0.68, 0.9);
  const hall = boxFaces(hallBox.col, hallBox.row, hallBox.w, hallBox.h, 0, CINEMA_HALL);
  const lobby = boxFaces(lobbyBox.col, lobbyBox.row, lobbyBox.w, lobbyBox.h, 0, CINEMA_FRONT);
  const crown = boxFaces(crownBox.col, crownBox.row, crownBox.w, crownBox.h, CINEMA_FRONT, up(2.4));
  const front = seen(lobby, frontDir);
  const hallNode = (
    <>
      {mass(hall, wall, DECK)}
      {visibleWallsOf(hall).map((w, i) => band(w, CINEMA_HALL, CINEMA_HALL - up(0.7), CINEMA_HALL, shade(wall, 0.72), `hc${i}`))}
      {/* Exit doors low on the auditorium's sides. */}
      {visibleWallsOf(hall).filter((w) => w.dir !== frontDir).map((w, i) => band(w, CINEMA_HALL, 0, up(2.4), '#5a4a3c', `hx${i}`, 0.7, 0.7 + 1 / Math.max(4, w.span * 4)))}
    </>
  );
  const lobbyNode = (
    <>
      {mass(lobby, CINEMA_CREAM, shade(CINEMA_CREAM, 0.9))}
      {visibleWallsOf(lobby).map((w, i) => {
        const fins = Math.max(2, Math.round(w.span * 1.4));
        return (
          <g key={`f${i}`}>
            {band(w, CINEMA_FRONT, CINEMA_FRONT - up(0.8), CINEMA_FRONT, GILT, 'top')}
            {band(w, CINEMA_FRONT, 0, up(0.5), shade(CINEMA_CREAM, 0.75), 'base')}
            {Array.from({ length: fins }, (_, k) => {
              const u = (k + 0.5) / fins;
              return band(w, CINEMA_FRONT, up(4.6), CINEMA_FRONT - up(1.3), shade(GILT, w.dir === frontDir ? 0.95 : 0.8), `fin${k}`, u - 0.012, u + 0.012);
            })}
          </g>
        );
      })}
      {front && <CinemaFront front={front} />}
      {mass(crown, CINEMA_CREAM, shade(CINEMA_CREAM, 0.9))}
      {visibleWallsOf(crown).map((w, i) => band(w, up(2.4), up(1.6), up(2.4), GILT, `cr${i}`))}
      {front && <BladeSign front={front} H={CINEMA_FRONT} />}
    </>
  );
  return <g className="town-cinema">{inOrder([{ box: hallBox, node: hallNode }, { box: lobbyBox, node: lobbyNode }])}</g>;
}

// The lobby's front: a glass entrance with doors, poster cases either side,
// and the marquee over the doors, a lit box standing out from the wall with
// a letter board on its face and bulbs round it.
function CinemaFront({ front }: { front: Wall }) {
  const { o, a, dir } = front;
  const H = CINEMA_FRONT;
  const out = outward(dir, 0.5);
  const z0 = up(3.4); const z1 = z0 + up(2);
  const u0 = 0.14; const u1 = 0.86;
  const back = quad(o, a, H, u0, u1, z0, z1);
  const face = back.map((q) => add(q, out));
  const top = [back[3]!, back[2]!, face[2]!, face[3]!];
  const bottom = [back[0]!, back[1]!, face[1]!, face[0]!];
  const fo = add(facePoint(o, a, H, u0, 0), out); const fa = add(facePoint(o, a, H, u1, 0), out);
  const lines = (r0: number, r1: number) => quad(fo, fa, H, 0.08, 0.92, z0 + (z1 - z0) * r0, z0 + (z1 - z0) * r1);
  const dash = (r: number, a0: number, a1: number, k: string) => (
    <polygon key={k} points={P(quad(fo, fa, H, a0, a1, z0 + (z1 - z0) * r, z0 + (z1 - z0) * (r + 0.13)))} fill="#2a2421" />
  );
  const bulbs = 14;
  return (
    <g className="town-cinema-front">
      {/* The glass front and its doors. */}
      {band(front, H, up(0.5), up(3.2), DARK_GLASS, 'glass', 0.24, 0.76)}
      {[0.32, 0.41, 0.5, 0.59, 0.68].map((u) => band(front, H, up(0.5), up(3.2), '#b9a46a', `m${u}`, u - 0.004, u + 0.004))}
      {/* Poster cases either side. */}
      {[0.05, 0.85].map((pu, i) => (
        <g key={pu}>
          {band(front, H, up(0.7), up(3.1), '#2a2a2e', 'c', pu, pu + 0.1)}
          {band(front, H, up(0.9), up(2.9), i === 0 ? '#e0a03a' : '#4a8fc4', 'p', pu + 0.012, pu + 0.088)}
          {band(front, H, up(1.9), up(2.5), i === 0 ? '#c2412f' : '#f0e6c8', 'q', pu + 0.012, pu + 0.088)}
        </g>
      ))}
      {/* The marquee: its soffit lit, then its top and its face. */}
      <polygon points={P(bottom)} fill={BULB} opacity={0.85} />
      <polygon points={P(top)} fill={shade(MARQUEE_RED, 1.15)} />
      <polygon points={P([back[0]!, face[0]!, face[3]!, back[3]!])} fill={shade(MARQUEE_RED, 0.7)} />
      <polygon points={P([back[1]!, face[1]!, face[2]!, back[2]!])} fill={shade(MARQUEE_RED, 0.7)} />
      <polygon points={P(face)} fill={MARQUEE_RED} />
      <polygon points={P(lines(0.18, 0.82))} fill="#f4ecd6" />
      {dash(0.58, 0.14, 0.46, 'a')}{dash(0.58, 0.52, 0.86, 'b')}
      {dash(0.28, 0.22, 0.6, 'c')}{dash(0.28, 0.66, 0.8, 'd')}
      {Array.from({ length: bulbs }, (_, i) => {
        const u = 0.03 + (0.94 * i) / (bulbs - 1);
        const lo = facePoint(fo, fa, H, u, (z0 + up(0.2)) / H); const hi = facePoint(fo, fa, H, u, (z1 - up(0.2)) / H);
        return (
          <g key={i}>
            <circle cx={lo.x} cy={lo.y} r={1} fill={BULB} />
            <circle cx={hi.x} cy={hi.y} r={1} fill={BULB} />
          </g>
        );
      })}
    </g>
  );
}

// The blade sign: a tall board standing straight out from the front at its
// middle, from over the marquee to well above the parapet, red in a gilt
// border with its letters a column of bulbs.
function BladeSign({ front, H }: { front: Wall; H: number }) {
  const { o, a, dir } = front;
  const depth = outward(dir, 0.75);
  const z0 = up(6); const z1 = H + up(6.5);
  const at = (k: number, z: number) => add(facePoint(o, a, H, 0.5, z / H), depth, k);
  const board = [at(0.05, z0), at(1, z0 + up(0.8)), at(1, z1 - up(0.8)), at(0.05, z1)];
  const inner = [at(0.2, z0 + up(0.7)), at(0.86, z0 + up(1.2)), at(0.86, z1 - up(1.2)), at(0.2, z1 - up(0.7))];
  const n = 7;
  return (
    <g className="town-blade">
      <polygon points={P(board)} fill={GILT} stroke={shade(GILT, 0.7)} strokeWidth={0.5} />
      <polygon points={P(inner)} fill={MARQUEE_RED} />
      {Array.from({ length: n }, (_, i) => {
        const z = z0 + up(1.8) + ((z1 - z0 - up(3.6)) * (i + 0.5)) / n;
        const c = at(0.53, z);
        return <rect key={i} x={c.x - 1.7} y={c.y - 1.3} width={3.4} height={2.6} fill={BULB} />;
      })}
      {/* A star on top. */}
      {(() => {
        const c = lift(at(0.55, z1), up(1.2));
        const r = 3.2;
        return <polygon points={P(Array.from({ length: 10 }, (_, i) => {
          const t = -Math.PI / 2 + (i * Math.PI) / 5; const rr = i % 2 === 0 ? r : r * 0.45;
          return { x: c.x + Math.cos(t) * rr, y: c.y + Math.sin(t) * rr };
        }))} fill={BULB} />;
      })()}
    </g>
  );
}

// ---------------------------------------------------------------------------
// The bowling alley: a long low shed in white render, a navy fascia with an
// orange stripe all round its top, a glass front under a canopy, and on the
// roof at the front a giant pin and its ball.
// ---------------------------------------------------------------------------
const BOWL_H = up(6.2);
const BOWL_WALL = '#efe9dc';

export function BowlingAlley({ p }: { p: Plot }) {
  const W = frontWidth(p); const D = frontDepth(p);
  const frontDir = sidesOf(p.facing).front;
  const shedBox = localBox(p, 0.12, 0.12, W - 0.12, D - 0.12);
  const shed = boxFaces(shedBox.col, shedBox.row, shedBox.w, shedBox.h, 0, BOWL_H);
  const front = seen(shed, frontDir);
  const pin = localBox(p, W / 2 - 0.01, 0.75, W / 2 + 0.01, 0.77);
  const pinAt = project(pin.col, pin.row);
  return (
    <g className="town-bowling">
      {mass(shed, BOWL_WALL, DECK)}
      {visibleWallsOf(shed).map((w, i) => (
        <g key={i}>
          {band(w, BOWL_H, BOWL_H - up(1.9), BOWL_H, NAVY, 'fascia')}
          {band(w, BOWL_H, BOWL_H - up(1.6), BOWL_H - up(1.25), NEON, 'stripe')}
          {band(w, BOWL_H, 0, up(0.45), shade(BOWL_WALL, 0.78), 'base')}
          {/* High strip windows along the sides. */}
          {w.dir !== frontDir && band(w, BOWL_H, up(2.6), up(3.4), DARK_GLASS, 'strip', 0.08, 0.92)}
        </g>
      ))}
      {front && <BowlingFront front={front} />}
      <GiantPin at={pinAt} base={BOWL_H} />
    </g>
  );
}

function BowlingFront({ front }: { front: Wall }) {
  const { o, a, dir } = front;
  const H = BOWL_H;
  const out = outward(dir, 0.35);
  const z = up(3.4);
  const c0 = facePoint(o, a, H, 0.3, z / H); const c1 = facePoint(o, a, H, 0.7, z / H);
  const canopy = [c0, c1, add(c1, out), add(c0, out)];
  const pins = 5;
  return (
    <g className="town-bowling-front">
      {band(front, H, up(0.45), up(3.3), DARK_GLASS, 'glass', 0.32, 0.68)}
      {[0.41, 0.5, 0.59].map((u) => band(front, H, up(0.45), up(3.3), '#c9cdd1', `m${u}`, u - 0.003, u + 0.003))}
      <polygon points={P(canopy)} fill={NEON} />
      <polygon points={P([add(c0, out), add(c1, out), lift(add(c1, out), up(0.5)), lift(add(c0, out), up(0.5))])} fill={shade(NEON, 0.8)} />
      {/* A row of pins on the fascia, and the name panel beside them. */}
      {Array.from({ length: pins }, (_, i) => (
        <polygon key={i} points={P(pinOnWall(o, a, H, 0.66 + i * 0.055, 0.016, H - up(1.15), up(1.05)))} fill="#f6f1e6" />
      ))}
      {band(front, H, H - up(1.15), H - up(0.25), '#f6f1e6', 'name', 0.1, 0.56)}
      {[0.14, 0.24, 0.34, 0.44].map((u) => band(front, H, H - up(0.95), H - up(0.45), NAVY, `l${u}`, u, u + 0.07))}
    </g>
  );
}

// A pin's outline on a wall: a foot, the belly, a neck and a head, `hw` the
// belly's half width as a share of the wall, from height z for `tall`.
function pinOnWall(o: Pt, a: Pt, H: number, uc: number, hw: number, z: number, tall: number): Pt[] {
  const prof: Array<[number, number]> = [[0, 0.45], [0.12, 0.8], [0.32, 1], [0.5, 0.7], [0.62, 0.42], [0.72, 0.45], [0.86, 0.62], [0.96, 0.45], [1, 0]];
  const right = prof.map(([t, r]) => facePoint(o, a, H, uc + hw * r, (z + tall * t) / H));
  const left = prof.slice().reverse().map(([t, r]) => facePoint(o, a, H, uc - hw * r, (z + tall * t) / H));
  return [...right, ...left];
}

// The giant pin. A pin is round, so it looks the same from every side:
// drawn upright on the screen at a point on the roof, white with two red
// stripes at the neck, shaded down the side away from the sun, and its
// black ball beside it.
function GiantPin({ at, base }: { at: Pt; base: number }) {
  const foot = lift(at, base);
  const tall = up(13);
  const R = up(2.4);
  const prof: Array<[number, number]> = [[0, 0.5], [0.08, 0.78], [0.3, 1], [0.5, 0.74], [0.62, 0.42], [0.7, 0.4], [0.82, 0.58], [0.93, 0.5], [1, 0.12]];
  const side = (s: number, k = 1) => prof.map(([t, r]) => ({ x: foot.x + s * R * r * k, y: foot.y - tall * t }));
  const outline = [...side(1), ...side(-1).reverse()];
  const stripe = (t0: number, t1: number) => [
    { x: foot.x - R * 0.44, y: foot.y - tall * t0 }, { x: foot.x + R * 0.44, y: foot.y - tall * t0 },
    { x: foot.x + R * 0.4, y: foot.y - tall * t1 }, { x: foot.x - R * 0.4, y: foot.y - tall * t1 },
  ];
  const shadeSide = [...side(1), ...side(1, 0.3).reverse()];
  const ball = { x: foot.x + R * 1.35, y: foot.y - R * 0.8 };
  return (
    <g className="town-pin">
      <ellipse cx={foot.x} cy={foot.y} rx={R * 1.1} ry={R * 0.45} fill="#5a5d62" />
      <polygon points={P(outline)} fill="#f6f2ea" stroke="#9c968a" strokeWidth={0.6} />
      <polygon points={P(shadeSide)} fill="#dcd6ca" />
      <polygon points={P(stripe(0.6, 0.64))} fill={MARQUEE_RED} />
      <polygon points={P(stripe(0.68, 0.72))} fill={MARQUEE_RED} />
      <circle cx={ball.x} cy={ball.y} r={R * 0.8} fill="#23262d" />
      <circle cx={ball.x - R * 0.25} cy={ball.y - R * 0.3} r={R * 0.2} fill="#4a4f5a" />
    </g>
  );
}

// ---------------------------------------------------------------------------
// The pub: a two-story house in the campus's own wall under its roof, a
// gable over the front; the pub front on the ground floor (a green fascia
// with its name in gilt, lamps by the door, the hanging sign on its
// bracket); and behind it a beer garden, a low fence round picnic tables
// under striped umbrellas.
// ---------------------------------------------------------------------------
const PUB_H = STOREY * 2;
const PUB_RIDGE = up(3.4);

export function Pub({ p, pal, stone }: { p: Plot; pal: Palette; stone: StonePalette }) {
  const W = frontWidth(p); const D = frontDepth(p);
  const sides = sidesOf(p.facing);
  const houseD = Math.max(1.4, D * 0.58);
  const houseBox = localBox(p, 0.15, 0.12, W - 0.15, houseD);
  const gardenBox = localBox(p, 0.15, houseD + 0.08, W - 0.15, D - 0.08);
  const f = boxFaces(houseBox.col, houseBox.row, houseBox.w, houseBox.h, 0, PUB_H);
  const front = seen(f, sides.front);
  // The ridge runs across the front, so the gables are the house's sides.
  const alongCol = sides.front === 'posRow' || sides.front === 'negRow';
  const { col, row, w, h } = houseBox;
  const rs = alongCol ? project(col, row + h / 2) : project(col + w / 2, row);
  const re = alongCol ? project(col + w, row + h / 2) : project(col + w / 2, row + h);
  const R0 = lift(rs, PUB_H + PUB_RIDGE); const R1 = lift(re, PUB_H + PUB_RIDGE);
  const top = (q: Pt) => lift(q, PUB_H);
  // The four roof faces: two slopes and two gables, each with the wall
  // direction it faces.
  const NW = project(col, row); const NE = project(col + w, row); const SE = project(col + w, row + h); const SW = project(col, row + h);
  const faces: Array<{ dir: FaceDir; pts: Pt[]; slope: boolean }> = alongCol
    ? [
        { dir: 'negRow', pts: [top(NW), top(NE), R1, R0], slope: true },
        { dir: 'posRow', pts: [top(SW), top(SE), R1, R0], slope: true },
        { dir: 'negCol', pts: [top(NW), top(SW), R0], slope: false },
        { dir: 'posCol', pts: [top(NE), top(SE), R1], slope: false },
      ]
    : [
        { dir: 'negCol', pts: [top(NW), top(SW), R1, R0], slope: true },
        { dir: 'posCol', pts: [top(NE), top(SE), R1, R0], slope: true },
        { dir: 'negRow', pts: [top(NW), top(NE), R0], slope: false },
        { dir: 'posRow', pts: [top(SW), top(SE), R1], slope: false },
      ];
  const facing = (d: FaceDir) => d === f.dir.CD || d === f.dir.BC;
  const slopeTone = (d: FaceDir) => shade(pal.roof, d === 'negCol' ? 1.12 : d === 'negRow' ? 1 : d === 'posRow' ? 0.84 : 0.7);
  const roof = (
    <>
      {faces.filter((x) => x.slope && !facing(x.dir)).map((x) => <polygon key={x.dir} points={P(x.pts)} fill={slopeTone(x.dir)} />)}
      {faces.filter((x) => !x.slope && facing(x.dir)).map((x) => <polygon key={x.dir} points={P(x.pts)} fill={pal.wall[x.dir]} />)}
      {faces.filter((x) => x.slope && facing(x.dir)).map((x) => <polygon key={x.dir} points={P(x.pts)} fill={slopeTone(x.dir)} />)}
      <line x1={R0.x} y1={R0.y} x2={R1.x} y2={R1.y} stroke={shade(pal.roof, 0.6)} strokeWidth={1} />
    </>
  );
  // Chimneys at the ridge's ends.
  const chimney = (t: number, key: string) => {
    const c = alongCol ? col + w * t : col + w / 2; const r = alongCol ? row + h / 2 : row + h * t;
    const s = 0.12;
    const cf = boxFaces(c - s, r - s, s * 2, s * 2, PUB_H + PUB_RIDGE * 0.6, PUB_RIDGE * 0.4 + up(1.6));
    return <g key={key}>{mass(cf, shade(pal.wall.posRow, 0.85), shade(pal.wall.posRow, 0.6))}</g>;
  };
  // Small-paned windows on the upper floor of each seen wall, and the
  // ground floor of the sides.
  const windows = visibleWallsOf(f).map((wl, i) => {
    const n = Math.max(2, Math.round(wl.span * 1.1));
    return (
      <g key={`w${i}`}>
        {Array.from({ length: n }, (_, k) => {
          const u = (k + 0.5) / n;
          return (
            <g key={k}>
              {band(wl, PUB_H, STOREY + up(0.8), STOREY + up(2.6), stone.glass, 'up', u - 0.06, u + 0.06)}
              {wl.dir !== sides.front && band(wl, PUB_H, up(0.9), up(2.6), stone.glass, 'gr', u - 0.06, u + 0.06)}
            </g>
          );
        })}
        {band(wl, PUB_H, STOREY - up(0.15), STOREY + up(0.1), shade(pal.wall[wl.dir], 0.8), 'course')}
      </g>
    );
  });
  const house = (
    <>
      <polygon points={P(f.left)} fill={pal.wallLeft} />
      <polygon points={P(f.right)} fill={pal.wallRight} />
      {windows}
      {front && <PubFront front={front} />}
      {roof}
      {chimney(0.12, 'c0')}{chimney(0.88, 'c1')}
    </>
  );
  return (
    <g className="town-pub">
      {inOrder([{ box: houseBox, node: house }, { box: gardenBox, node: <BeerGarden box={gardenBox} /> }])}
    </g>
  );
}

function PubFront({ front }: { front: Wall }) {
  const { o, a, dir } = front;
  const H = PUB_H;
  const z0 = up(2.9); const z1 = z0 + up(0.9);
  // The windows, either side of the door, in the fascia's green.
  const arm = outward(dir, 0.5);
  const armZ = STOREY + up(2.2);
  const u = 0.1;
  const hang = (k: number, z: number) => add(facePoint(o, a, H, u, z / H), arm, k);
  const board = [hang(0.25, armZ - up(0.5)), hang(0.95, armZ - up(0.5)), hang(0.95, armZ - up(2.6)), hang(0.25, armZ - up(2.6))];
  const field = [hang(0.33, armZ - up(0.7)), hang(0.87, armZ - up(0.7)), hang(0.87, armZ - up(2.4)), hang(0.33, armZ - up(2.4))];
  return (
    <g className="town-pub-front">
      {band(front, H, up(0.3), z0, PUB_GREEN, 'shop', 0.06, 0.94)}
      {band(front, H, up(0.9), z0 - up(0.4), '#e9c56a', 'lw', 0.12, 0.38)}
      {band(front, H, up(0.9), z0 - up(0.4), '#e9c56a', 'rw', 0.62, 0.88)}
      {[0.2, 0.3, 0.7, 0.8].map((m) => band(front, H, up(0.9), z0 - up(0.4), PUB_GREEN, `m${m}`, m - 0.006, m + 0.006))}
      {/* The door, dark green with a fanlight. */}
      {band(front, H, up(0.3), up(2.5), '#173a2a', 'door', 0.45, 0.55)}
      {band(front, H, up(2.15), up(2.45), '#e9c56a', 'fan', 0.46, 0.54)}
      {/* The fascia and its gilt name. */}
      {band(front, H, z0, z1, PUB_GREEN, 'fascia', 0.04, 0.96)}
      {band(front, H, z1 - up(0.12), z1, GILT, 'rule', 0.04, 0.96)}
      {band(front, H, z0 + up(0.25), z1 - up(0.3), GILT, 'name', 0.3, 0.7)}
      {[0.4, 0.6].map((lu) => {
        const c = facePoint(o, a, H, lu, (up(2.3)) / H);
        return <rect key={lu} x={c.x - 1.1} y={c.y - 1.6} width={2.2} height={3.2} fill={BULB} stroke="#2a2421" strokeWidth={0.5} />;
      })}
      {/* The hanging sign on its bracket. */}
      {(() => {
        const root = facePoint(o, a, H, u, armZ / H); const tip = add(root, arm);
        return (
          <>
            <line x1={root.x} y1={root.y} x2={tip.x} y2={tip.y} stroke="#2a2421" strokeWidth={1.4} />
            <line x1={hang(0.25, armZ).x} y1={hang(0.25, armZ).y} x2={board[0]!.x} y2={board[0]!.y} stroke="#2a2421" strokeWidth={0.7} />
            <line x1={hang(0.95, armZ).x} y1={hang(0.95, armZ).y} x2={board[1]!.x} y2={board[1]!.y} stroke="#2a2421" strokeWidth={0.7} />
            <polygon points={P(board)} fill={GILT} />
            <polygon points={P(field)} fill="#7a2a24" />
          </>
        );
      })()}
    </g>
  );
}

// The beer garden: gravel inside a low picket fence, and three picnic
// tables under umbrellas striped green and cream.
function BeerGarden({ box }: { box: Box }) {
  const { col, row, w, h } = box;
  const g = boxFaces(col, row, w, h, 0, 0);
  const fenceH = up(1);
  const corner = [project(col, row), project(col + w, row), project(col + w, row + h), project(col, row + h)];
  const runs: Array<[Pt, Pt]> = [[corner[0]!, corner[1]!], [corner[0]!, corner[3]!], [corner[3]!, corner[2]!], [corner[1]!, corner[2]!]];
  const alongCol = w >= h;
  const n = 3;
  const tables = Array.from({ length: n }, (_, i) => {
    const t = (i + 0.5) / n;
    const c = alongCol ? col + w * t : col + w / 2; const r = alongCol ? row + h / 2 : row + h * t;
    return { c, r };
  });
  return (
    <g className="town-beer-garden">
      <polygon points={P(g.top)} fill="#d6cbab" />
      {runs.map(([x, y], i) => <polygon key={`f${i}`} points={P([x, y, lift(y, fenceH), lift(x, fenceH)])} fill="rgba(240, 234, 218, 0.45)" stroke="rgba(120, 110, 90, 0.5)" strokeWidth={0.5} />)}
      {[...tables].sort((x, y) => project(x.c, x.r).y - project(y.c, y.r).y).map(({ c, r }, i) => {
        const s = Math.min(0.32, Math.min(w, h) * 0.3);
        const tf = boxFaces(c - s * 0.6, r - s * 0.35, s * 1.2, s * 0.7, up(0.7), up(0.12));
        const pole0 = project(c, r); const pole1 = lift(pole0, up(2.4));
        const canopy = projectedCircle(c, r, s * 1.15, 8).map((q) => lift(q, up(2.3)));
        const peak = lift(pole0, up(2.9));
        return (
          <g key={i}>
            <polygon points={P(tf.top)} fill="#a8794a" />
            <polygon points={P(tf.left)} fill="#7d5530" />
            <polygon points={P(tf.right)} fill="#6b4423" />
            <line x1={pole0.x} y1={pole0.y} x2={pole1.x} y2={pole1.y} stroke="#e9e4d6" strokeWidth={0.9} />
            {canopy.map((q, k) => {
              const q1 = canopy[(k + 1) % canopy.length]!;
              return <polygon key={k} points={P([q, q1, peak])} fill={k % 2 === 0 ? '#2f6b45' : '#efe6c8'} />;
            })}
          </g>
        );
      })}
    </g>
  );
}
