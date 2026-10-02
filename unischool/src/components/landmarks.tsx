import { useContext } from 'react';
import type { Buildable, GameState, Vernacular } from '../state/types';
import { boxFaces, facePoint, heightScale, lift, polyPoints, project, projectedCircle, type BoxFaces, type Pt } from './isoProjection';
import { faceTone } from './light';
import { shade } from './tint';
import { METRES_PER_TILE, across, up } from './campusScale';
import { GATE_ARCH_HALF, GATE_ARCH_TOP, GATE_BODY_SHARE, GATE_INSET, GATE_SIDE_ARCH_HALF, GATE_SIDE_ARCH_TOP, wallHeightOf } from './buildingSpec';
import { SCAFFOLD_PATTERN_ID } from './buildingMotifs';
import { DevelopingContext, CollegeNameContext } from './mapOccasions';

// The grand landmarks (Plan 25): a campanile, a great dome and a triumphal
// gate, each drawn bespoke and built in visible stages. While one goes up
// its countdown (DevelopingContext) picks the stage: footings, then the
// lower half, then all but the crown, each in scaffolding, and then the
// finished thing. Drawn in limestone whatever the vernacular: a landmark is
// a statement, not a neighbor. Only the Great Dome's crown takes the
// vernacular (Plan 87G); its podium and drum's height do not.

const STONE = '#ddd3bd';
const STONE_DARK = '#b8ad95';
// The drum's walls behind its columns, a tone off the plinth (Plan 74C).
const CELLA = '#c4b89e';
const OPENING = '#3a3834';
const COPPER = '#8fa6a2';
const GILT = '#c9a44a';
const BRONZE = '#8a6a3a';
const LINE = 'rgba(60, 54, 44, 0.4)';

type Stage = 0 | 1 | 2 | 3;
// How much of the whole stands at each stage.
const STAGE_SHARE: Record<Stage, number> = { 0: 0.08, 1: 0.5, 2: 0.85, 3: 1 };

// Where the towers' stages change, as shares of their full height (Plan
// 87G): the Campanile's shaft and belfry, the Bell Tower's stone stage.
const CAMPANILE_SHAFT = 0.6;
const CAMPANILE_BELFRY_TOP = 0.735;
const BELLTOWER_STAGE = 0.56;

function stageOf(fraction: number): Stage {
  return fraction >= 1 ? 3 : fraction >= 2 / 3 ? 2 : fraction >= 1 / 3 ? 1 : 0;
}

function walls(f: BoxFaces, tone: string) {
  return (
    <>
      <polygon points={polyPoints(f.left)} fill={faceTone(f.dir.CD, tone, shade(tone, 0.84))} />
      <polygon points={polyPoints(f.right)} fill={faceTone(f.dir.BC, tone, shade(tone, 0.84))} />
    </>
  );
}

// Scaffold hatch over the visible faces of what is going up.
function Scaffold({ f }: { f: BoxFaces }) {
  return (
    <>
      <polygon points={polyPoints(f.left)} fill={`url(#${SCAFFOLD_PATTERN_ID})`} />
      <polygon points={polyPoints(f.right)} fill={`url(#${SCAFFOLD_PATTERN_ID})`} />
    </>
  );
}

// A box's two visible walls as [origin, along, span in tiles, grid direction].
type Face = readonly [Pt, Pt, number, BoxFaces['dir']['CD']];
function facesOf(f: BoxFaces): [Face, Face] {
  return [[f.D, f.C, f.spanLeft, f.dir.CD], [f.C, f.B, f.spanRight, f.dir.BC]];
}

// A rectangle on a face, in the face's u (along) and v (up) fractions.
function faceQuad(a: Pt, b: Pt, hgt: number, u0: number, u1: number, v0: number, v1: number): Pt[] {
  return [facePoint(a, b, hgt, u0, v0), facePoint(a, b, hgt, u1, v0), facePoint(a, b, hgt, u1, v1), facePoint(a, b, hgt, u0, v1)];
}

// A face's v per unit of u, so a circle drawn on it is round in the world.
function faceAspect(span: number, hgt: number): number {
  return up(METRES_PER_TILE * span) / Math.max(0.0001, hgt);
}

// A round-headed opening centred at uc, halfU wide each side, from v0 up to
// the crown at `top`.
function archOnFace(a: Pt, b: Pt, hgt: number, span: number, uc: number, halfU: number, v0: number, top: number): Pt[] {
  const vr = halfU * faceAspect(span, hgt);
  const spring = Math.max(v0, top - vr);
  const pts: Pt[] = [facePoint(a, b, hgt, uc - halfU, v0)];
  for (let i = 0; i <= 12; i++) {
    const ang = Math.PI - (i / 12) * Math.PI;
    pts.push(facePoint(a, b, hgt, uc + Math.cos(ang) * halfU, spring + Math.sin(ang) * vr));
  }
  pts.push(facePoint(a, b, hgt, uc + halfU, v0));
  return pts;
}

// A disc on a face: `radius` in u, round in the world.
function discOnFace(a: Pt, b: Pt, hgt: number, span: number, uc: number, vc: number, radius: number): Pt[] {
  const vr = radius * faceAspect(span, hgt);
  return Array.from({ length: 24 }, (_, i) => {
    const ang = (i / 24) * Math.PI * 2;
    return facePoint(a, b, hgt, uc + Math.cos(ang) * radius, vc + Math.sin(ang) * vr);
  });
}

// A thin band proud of a box, from z - depth to z: a string course or a
// cornice. A course on a wall that rises on above it shows no top.
function Band({ col, row, w, h, z, depth, proud, tone = STONE, cap = true }: {
  col: number; row: number; w: number; h: number; z: number; depth: number; proud: number; tone?: string; cap?: boolean;
}) {
  const f = boxFaces(col - proud, row - proud, w + proud * 2, h + proud * 2, z - depth, depth);
  return (
    <>
      {walls(f, tone)}
      {cap && <polygon points={polyPoints(f.top)} fill={shade(tone, 0.94)} />}
    </>
  );
}

// The near half of a ring of points, left to right.
function nearHalf(pts: Pt[]): Pt[] {
  const l = pts.reduce((a, q) => (q.x < a.x ? q : a));
  const r = pts.reduce((a, q) => (q.x > a.x ? q : a));
  return pts.filter((q) => q.y >= (l.y + r.y) / 2 - 0.01).sort((a, b) => a.x - b.x);
}

// A cylinder standing from z0 to z1 on a projected circle. `cap` draws its
// top, which a dome sitting on it covers; `columns` rings it with a
// peristyle standing proud of a darker wall.
function Drum({ cc, cr, r, z0, z1, fill, cap = true, columns = 0, cella = CELLA, inner }: {
  cc: number; cr: number; r: number; z0: number; z1: number; fill: string; cap?: boolean; columns?: number;
  // An open drum's dark inside and what hangs in it, between its wall and
  // its columns (the Bell Tower's cupola, Plan 87G).
  cella?: string; inner?: React.ReactNode;
}) {
  const ring = (z: number, rad = r) => projectedCircle(cc, cr, rad, 48).map((q) => lift(q, z));
  const band = (za: number, zb: number, rad: number, tone: string, key?: string) => (
    <polygon key={key} points={polyPoints([...nearHalf(ring(za, rad)), ...nearHalf(ring(zb, rad)).reverse()])} fill={tone} stroke="rgba(60, 54, 44, 0.35)" strokeWidth={0.6} />
  );
  if (columns === 0) {
    return (
      <>
        {band(z0, z1, r, fill)}
        {cap && <polygon points={polyPoints(ring(z1))} fill={shade(fill, 0.86)} />}
      </>
    );
  }
  const base = Math.min(up(1.2), (z1 - z0) * 0.08);
  const entablature = Math.min(up(2.4), (z1 - z0) * 0.16);
  const centreY = project(cc, cr).y;
  const half = Math.PI / columns * 0.32;
  // The near columns only, back to front so the nearer stand over.
  const shafts = Array.from({ length: columns }, (_, j) => (j + 0.5) / columns * Math.PI * 2)
    .map((a) => ({ a, y: project(cc + Math.cos(a) * r, cr + Math.sin(a) * r).y }))
    .filter((q) => q.y > centreY)
    .sort((m, n) => m.y - n.y);
  return (
    <>
      {band(z0, z1, r * 0.86, cella)}
      {inner}
      {band(z0, z0 + base, r, shade(fill, 0.92))}
      {shafts.map(({ a }, i) => {
        const g0 = project(cc + Math.cos(a - half) * r, cr + Math.sin(a - half) * r);
        const g1 = project(cc + Math.cos(a + half) * r, cr + Math.sin(a + half) * r);
        const zA = z0 + base;
        const zB = z1 - entablature;
        return <polygon key={i} points={polyPoints([lift(g0, zA), lift(g1, zA), lift(g1, zB), lift(g0, zB)])} fill={fill} stroke="rgba(60, 54, 44, 0.3)" strokeWidth={0.5} />;
      })}
      {band(z1 - entablature, z1, r * 1.03, fill)}
      {cap && <polygon points={polyPoints(ring(z1, r * 1.03))} fill={shade(fill, 0.86)} />}
    </>
  );
}

// A dome over a ring at height z, rising `rise` (authored at the default
// pitch): the image of a hemisphere, so its outline is the far arc over the
// crown and the near half of its base ring, and its ribs are meridians,
// drawn where they face the camera (Plan 74C).
function Dome({ cc, cr, r, z, rise, fill, ribs = 0, ribTone, ribWidth = 1.3, rings = 0, ringTone }: {
  cc: number; cr: number; r: number; z: number; rise: number; fill: string; ribs?: number;
  // The ribs' color and weight, and courses round the dome (its parallels):
  // the Mission dome's tile, the Modern one's glazing bars (Plan 87G).
  ribTone?: string; ribWidth?: number; rings?: number; ringTone?: string;
}) {
  const o = project(cc, cr);
  const C = lift(o, z);
  const ax = project(cc + r, cr);
  const bx = project(cc, cr + r);
  const a = { x: ax.x - o.x, y: ax.y - o.y };
  const b = { x: bx.x - o.x, y: bx.y - o.y };
  const w = { x: 0, y: -rise * heightScale() };
  const at = (u: readonly [number, number, number]): Pt => ({
    x: C.x + a.x * u[0] + b.x * u[1] + w.x * u[2],
    y: C.y + a.y * u[0] + b.y * u[1] + w.y * u[2],
  });
  // The direction the camera looks along, in the hemisphere's own terms,
  // turned toward the near side of the ring.
  let k = [b.x * w.y - b.y * w.x, w.x * a.y - w.y * a.x, a.x * b.y - a.y * b.x];
  const near = Math.atan2(b.y, a.y);
  if (Math.cos(near) * k[0]! + Math.sin(near) * k[1]! < 0) k = k.map((v) => -v);
  const [k0, k1, k2] = k as [number, number, number];
  const n = Math.hypot(k0, k1) || 1;
  const e1 = [k1 / n, -k0 / n, 0] as const;
  let e2 = [k1 * e1[2] - k2 * e1[1], k2 * e1[0] - k0 * e1[2], k0 * e1[1] - k1 * e1[0]];
  const m = Math.hypot(...e2) || 1;
  e2 = e2.map((v) => v / m);
  if (e2[2]! < 0) e2 = e2.map((v) => -v);
  const outline: Pt[] = [];
  for (let i = 0; i <= 32; i++) {
    const t = (i / 32) * Math.PI;
    outline.push(at([Math.cos(t) * e1[0] + Math.sin(t) * e2[0]!, Math.cos(t) * e1[1] + Math.sin(t) * e2[1]!, Math.sin(t) * e2[2]!]));
  }
  const th1 = Math.atan2(e1[1], e1[0]);
  for (let i = 32; i >= 0; i--) {
    const th = th1 + (i / 32) * Math.PI;
    outline.push(at([Math.cos(th), Math.sin(th), 0]));
  }
  const faces = (u: readonly [number, number, number]) => u[0] * k0 + u[1] * k1 + u[2] * k2 >= 0;
  const ribPaths: string[] = [];
  for (let j = 0; j < ribs; j++) {
    const th = (j / ribs) * Math.PI * 2;
    let run: Pt[] = [];
    const flush = () => {
      if (run.length > 1) ribPaths.push(`M${run.map((q) => `${q.x.toFixed(1)},${q.y.toFixed(1)}`).join('L')}`);
      run = [];
    };
    for (let i = 0; i <= 14; i++) {
      const ph = (i / 14) * Math.PI * 0.43;
      const u = [Math.cos(ph) * Math.cos(th), Math.cos(ph) * Math.sin(th), Math.sin(ph)] as const;
      if (faces(u)) run.push(at(u)); else flush();
    }
    flush();
  }
  const ringPaths: string[] = [];
  for (let j = 1; j <= rings; j++) {
    const ph = (j / (rings + 1)) * Math.PI * 0.42;
    let run: Pt[] = [];
    const flush = () => {
      if (run.length > 1) ringPaths.push(`M${run.map((q) => `${q.x.toFixed(1)},${q.y.toFixed(1)}`).join('L')}`);
      run = [];
    };
    for (let i = 0; i <= 48; i++) {
      const th = (i / 48) * Math.PI * 2;
      const u = [Math.cos(ph) * Math.cos(th), Math.cos(ph) * Math.sin(th), Math.sin(ph)] as const;
      if (faces(u)) run.push(at(u)); else flush();
    }
    flush();
  }
  return (
    <>
      <polygon points={polyPoints(outline)} fill={fill} stroke="rgba(40, 44, 48, 0.45)" strokeWidth={0.8} />
      {ringPaths.length > 0 && <path d={ringPaths.join('')} fill="none" stroke={ringTone ?? shade(fill, 1.18)} strokeWidth={1.2} strokeLinecap="round" />}
      {ribPaths.length > 0 && <path d={ribPaths.join('')} fill="none" stroke={ribTone ?? shade(fill, 1.18)} strokeWidth={ribWidth} strokeLinecap="round" />}
    </>
  );
}

// A wall with round-headed openings cut through it, for a face of `hgt`
// from a to b: the solid that stays, as one even-odd path (Plan 87G).
function pierced(a: Pt, b: Pt, hgt: number, holes: Pt[][]): string {
  const d = (pts: Pt[]) => `M${pts.map((q) => `${q.x.toFixed(1)},${q.y.toFixed(1)}`).join('L')}Z`;
  return d([a, b, facePoint(a, b, hgt, 1, 1), facePoint(a, b, hgt, 0, 1)]) + holes.map(d).join('');
}

// A bronze bell hung from its headstock at `top` (a screen point), `metres`
// tall: waist, flare and lip, a shadowed mouth (Plan 87G).
function Bell({ top, metres }: { top: Pt; metres: number }) {
  const s = up(metres);
  const k = heightScale();
  const at = (x: number, y: number): Pt => ({ x: top.x + x * s, y: top.y + y * s * k });
  const half = [[0.06, -0.12], [0.2, 0], [0.26, 0.2], [0.3, 0.55], [0.4, 0.86], [0.47, 0.96]] as const;
  const outline = [...half.map(([x, y]) => at(-x, y)).reverse(), ...half.map(([x, y]) => at(x, y))];
  const mouth = [at(-0.47, 0.96), at(0, 0.9), at(0.47, 0.96), at(0, 1.04)];
  return (
    <g className="landmark-bell">
      <polygon points={polyPoints(outline)} fill={BRONZE} stroke="rgba(40, 30, 16, 0.55)" strokeWidth={0.6} />
      <polygon points={polyPoints([at(-0.36, 0.7), at(0.36, 0.7), at(0.38, 0.76), at(-0.38, 0.76)])} fill={shade(BRONZE, 1.25)} />
      <polygon points={polyPoints(mouth)} fill={shade(BRONZE, 0.45)} />
    </g>
  );
}

// A clock dial on a face, centred at (uc, vc), `radius` in u, its hands at
// ten past ten.
function clockFace(a: Pt, b: Pt, hgt: number, span: number, uc: number, vc: number, radius: number, key: string) {
  const asp = faceAspect(span, hgt);
  const face = discOnFace(a, b, hgt, span, uc, vc, radius);
  const hub = facePoint(a, b, hgt, uc, vc);
  const hand = (ang: number, len: number) => facePoint(a, b, hgt, uc + Math.cos(ang) * radius * len, vc + Math.sin(ang) * radius * len * asp);
  const hr = hand(Math.PI * 0.82, 0.5);
  const mn = hand(Math.PI * 0.18, 0.78);
  const ticks = Array.from({ length: 12 }, (_, i) => {
    const ang = (i / 12) * Math.PI * 2;
    const p0 = hand(ang, 0.8); const p1 = hand(ang, 0.94);
    return `M${p0.x.toFixed(1)},${p0.y.toFixed(1)}L${p1.x.toFixed(1)},${p1.y.toFixed(1)}`;
  }).join('');
  return (
    <g key={key} className="landmark-clock">
      <polygon points={polyPoints(discOnFace(a, b, hgt, span, uc, vc, radius * 1.18))} fill={shade(STONE, 0.86)} stroke={LINE} strokeWidth={0.5} />
      <polygon points={polyPoints(face)} fill="#f3eee0" stroke={GILT} strokeWidth={1.2} />
      <path d={ticks} stroke="#2e2a24" strokeWidth={0.7} />
      <path d={`M${hub.x.toFixed(1)},${hub.y.toFixed(1)}L${hr.x.toFixed(1)},${hr.y.toFixed(1)}M${hub.x.toFixed(1)},${hub.y.toFixed(1)}L${mn.x.toFixed(1)},${mn.y.toFixed(1)}`} stroke="#2e2a24" strokeWidth={1.1} strokeLinecap="round" />
    </g>
  );
}

// A square pyramid on a box's top, its two near faces toned by the way they
// point: the far two lie behind them from any camera above the eaves.
function pyramidOn(f: BoxFaces, apex: Pt, tone: string) {
  return (
    <>
      <polygon points={polyPoints([f.Dt, f.Ct, apex])} fill={faceTone(f.dir.CD, tone, shade(tone, 0.78))} />
      <polygon points={polyPoints([f.Ct, f.Bt, apex])} fill={faceTone(f.dir.BC, tone, shade(tone, 0.78))} />
    </>
  );
}

// A gilt finial: a rod from `base` with a ball, and a cross-vane at its tip.
function Finial({ base, rise }: { base: Pt; rise: number }) {
  const k = heightScale();
  const tip = { x: base.x, y: base.y - rise * k };
  const ball = { x: base.x, y: base.y - rise * 0.42 * k };
  const bar = rise * 0.16;
  return (
    <>
      <line x1={base.x} y1={base.y} x2={tip.x} y2={tip.y} stroke={GILT} strokeWidth={1.4} />
      <line x1={tip.x - bar} y1={tip.y + rise * 0.18 * k} x2={tip.x + bar} y2={tip.y + rise * 0.18 * k} stroke={GILT} strokeWidth={1.1} />
      <circle cx={ball.x} cy={ball.y} r={1.9} fill={GILT} />
    </>
  );
}

// The Campanile (Plan 87G): the grand landmark, after Sather Tower and San
// Marco's. A slender shaft three times the Bell Tower's height, its corners
// stiffened by pilaster strips and its middle slit by a stack of windows;
// clock faces under the belfry; an open belfry, three arches a side that
// you see through to the bell and out the far side; an attic stage; and a
// verdigris needle spire with a gilt finial. Built in stages: the shaft
// rises in scaffold, then the belfry and attic, then the spire.
const SPIRE = '#7d968c';
function Campanile({ t, p, share, building }: { t: Buildable; p: Plot; share: number; building: boolean }) {
  const H = wallHeightOf(t);
  const plan = Math.min(across(11.5), Math.min(p.w, p.h) * 0.3);
  const c0 = p.col + (p.w - plan) / 2;
  const r0 = p.row + (p.h - plan) / 2;
  const standing = H * share;
  const PL = up(1.1);
  const plinth = boxFaces(c0 - plan * 0.5, r0 - plan * 0.5, plan * 2, plan * 2, 0, PL);
  const step = boxFaces(c0 - plan * 0.62, r0 - plan * 0.62, plan * 2.24, plan * 2.24, 0, PL * 0.5);
  const shaftTop = H * CAMPANILE_SHAFT;
  const shaftH = Math.min(shaftTop, standing);
  const shaft = boxFaces(c0, r0, plan, plan, PL, shaftH - PL);
  const shH = shaftH - PL;
  const belfryTop = H * CAMPANILE_BELFRY_TOP;
  const atticTop = H * 0.79;
  const apexZ = H * 0.955;
  const COURSE = up(0.8);
  // v on the shaft's faces of a height above ground.
  const sv = (z: number) => (z - PL) / Math.max(0.0001, shH);
  const clockZ = H * 0.53;
  const clock = shaftH >= shaftTop && !building;
  // The slit windows up the middle of each face, a pair to each stage.
  const slits = Array.from({ length: 9 }, (_, i) => H * 0.05 + i * H * 0.047).filter((z) => z + up(3.2) <= shaftH && z + up(3.2) <= H * 0.455);
  const belfryH = Math.min(belfryTop, standing) - shaftTop;
  const belfry = belfryH > up(1) ? boxFaces(c0, r0, plan, plan, shaftTop, belfryH) : null;
  const atticH = Math.min(atticTop, standing) - belfryTop;
  const attic = atticH > up(0.5) ? boxFaces(c0 + plan * 0.03, r0 + plan * 0.03, plan * 0.94, plan * 0.94, belfryTop, atticH) : null;
  const centre = project(c0 + plan / 2, r0 + plan / 2);
  return (
    <g className="landmark landmark-campanile">
      {walls(step, STONE_DARK)}
      <polygon points={polyPoints(step.top)} fill={shade(STONE_DARK, 1.05)} />
      {walls(plinth, STONE_DARK)}
      <polygon points={polyPoints(plinth.top)} fill={shade(STONE, 0.94)} />
      {walls(shaft, STONE)}
      {facesOf(shaft).map(([a, b, span, dir], i) => {
        const tone = faceTone(dir, STONE, shade(STONE, 0.84));
        return (
          <g key={i}>
            {/* Pilaster strips at the corners, a shade proud. */}
            {[[0, 0.13], [0.87, 1]].map(([u0, u1]) => (
              <polygon key={u0} points={polyPoints(faceQuad(a, b, shH, u0!, u1!, 0, 1))} fill={shade(tone, 1.06)} stroke={LINE} strokeWidth={0.4} />
            ))}
            {slits.map((z) => (
              <polygon key={z} fill={OPENING} points={polyPoints(archOnFace(a, b, shH, span, 0.5, 0.05, sv(z), sv(z + up(3.2))))} />
            ))}
            {clock && clockFace(a, b, shH, span, 0.5, sv(clockZ), 0.27, `c${i}`)}
          </g>
        );
      })}
      {[H * 0.2, H * 0.46].filter((z) => z <= shaftH).map((z) => (
        <Band key={z} col={c0} row={r0} w={plan} h={plan} z={z} depth={COURSE} proud={0.03} tone={shade(STONE, 0.92)} cap={false} />
      ))}
      {building && <Scaffold f={shaft} />}
      {shaftH < shaftTop && <polygon points={polyPoints(shaft.top)} fill={shade(STONE, 0.9)} />}
      {belfry && (() => {
        // The belfry: its floor, the far walls' insides seen through the
        // near arches (their own arches open on the sky beyond), the bell,
        // and the near walls pierced.
        const arches = (a: Pt, b: Pt, span: number) => [1 / 6, 0.5, 5 / 6].map((uc) => archOnFace(a, b, belfryH, span, uc, 0.12, 0.1, Math.min(0.88, (H * 0.115) / belfryH)));
        const far: Array<[Pt, Pt, number]> = [[belfry.A, belfry.B, belfry.spanLeft], [belfry.D, belfry.A, belfry.spanRight]];
        // A bell behind each near face's middle arch: the front corner's
        // pier stands over the tower's centre line.
        const bells = facesOf(belfry).map(([a, b]) => {
          const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
          const base = { x: centre.x + (mid.x - centre.x) * 0.8, y: lift(centre, shaftTop).y + (mid.y - lift(centre, shaftTop).y) * 0.8 };
          return lift(base, belfryH * 0.8);
        });
        return (
          <>
            <Band col={c0} row={r0} w={plan} h={plan} z={shaftTop} depth={up(1.4)} proud={0.09} tone={shade(STONE, 0.95)} />
            <polygon points={polyPoints(boxFaces(c0, r0, plan, plan, shaftTop, 0).top)} fill={shade(STONE, 0.6)} />
            {far.map(([a, b, span], i) => (
              <path key={`f${i}`} fillRule="evenodd" fill={shade(STONE, 0.46)} d={pierced(a, b, belfryH, arches(a, b, span))} />
            ))}
            {belfryH >= H * 0.1 && !building && bells.map((hang, i) => (
              <g key={`b${i}`}>
                <line x1={hang.x - up(1.8)} y1={hang.y} x2={hang.x + up(1.8)} y2={hang.y} stroke="#3b3128" strokeWidth={1.4} />
                <Bell top={{ x: hang.x, y: hang.y + up(0.4) * heightScale() }} metres={4.4} />
              </g>
            ))}
            {facesOf(belfry).map(([a, b, span, dir], i) => (
              <g key={`n${i}`}>
                <path fillRule="evenodd" fill={faceTone(dir, STONE, shade(STONE, 0.84))} d={pierced(a, b, belfryH, arches(a, b, span))} />
                {/* Each arch's archivolt and the imposts it springs from. */}
                {arches(a, b, span).map((q, j) => (
                  <polyline key={j} points={polyPoints(q.slice(1, -1))} fill="none" stroke={shade(STONE, 0.7)} strokeWidth={0.9} />
                ))}
              </g>
            ))}
            {building && <Scaffold f={belfry} />}
          </>
        );
      })()}
      {attic && (
        <>
          <Band col={c0} row={r0} w={plan} h={plan} z={belfryTop + up(0.4)} depth={up(1.5)} proud={0.1} />
          {walls(attic, STONE)}
          {facesOf(attic).map(([a, b, span], i) => (
            <polygon key={i} points={polyPoints(discOnFace(a, b, atticH, span, 0.5, 0.52, 0.1))} fill={shade(STONE, 0.72)} stroke={LINE} strokeWidth={0.6} />
          ))}
          <polygon points={polyPoints(attic.top)} fill={shade(STONE, 0.9)} />
          {building && <Scaffold f={attic} />}
        </>
      )}
      {share >= 1 && attic && (
        <>
          <Band col={c0 + plan * 0.03} row={r0 + plan * 0.03} w={plan * 0.94} h={plan * 0.94} z={atticTop + up(0.3)} depth={up(0.9)} proud={0.06} />
          {pyramidOn(boxFaces(c0 + plan * 0.04, r0 + plan * 0.04, plan * 0.92, plan * 0.92, atticTop, up(0.3)), lift(centre, apexZ), SPIRE)}
          <Finial base={lift(centre, apexZ - up(0.4))} rise={H - apexZ + up(0.4)} />
        </>
      )}
    </g>
  );
}

// The Bell Tower (Plan 87G): an amenity, squat where the Campanile is tall,
// after a Georgian clock tower: a quoined stone stage with a clock to each
// face, a balustraded cornice, and an open round cupola, its bell hung
// between the columns, under a copper dome and a gilt finial.
function BellTower({ t, p, share, building }: { t: Buildable; p: Plot; share: number; building: boolean }) {
  const H = wallHeightOf(t);
  const plan = Math.min(p.w, p.h) * 0.46;
  const c0 = p.col + (p.w - plan) / 2;
  const r0 = p.row + (p.h - plan) / 2;
  const cc = c0 + plan / 2;
  const cr = r0 + plan / 2;
  const standing = H * share;
  const PL = up(0.9);
  const plinth = boxFaces(c0 - plan * 0.22, r0 - plan * 0.22, plan * 1.44, plan * 1.44, 0, PL);
  const stageTop = H * BELLTOWER_STAGE;
  const sH = Math.min(stageTop, standing) - PL;
  const stage = boxFaces(c0, r0, plan, plan, PL, sH);
  const sv = (z: number) => (z - PL) / Math.max(0.0001, sH);
  const done = share >= 1;
  const r = plan * 0.32;
  const drumBase = stageTop + up(0.9);
  const drumTop = H * 0.76;
  const domeRise = H * 0.13;
  return (
    <g className="landmark landmark-belltower">
      {walls(plinth, STONE_DARK)}
      <polygon points={polyPoints(plinth.top)} fill={shade(STONE, 0.94)} />
      {walls(stage, STONE)}
      {facesOf(stage).map(([a, b, span, dir], i) => {
        const tone = faceTone(dir, STONE, shade(STONE, 0.84));
        // Quoins: long and short stones up each corner, alternately.
        const quoins = Array.from({ length: 7 }, (_, k) => k).filter((k) => (k + 1) * (stageTop - PL) / 7 + PL <= Math.min(stageTop, standing));
        return (
          <g key={i}>
            {quoins.map((k) => {
              const v0 = sv(PL + k * (stageTop - PL) / 7); const v1 = sv(PL + (k + 0.86) * (stageTop - PL) / 7);
              const wq = k % 2 === 0 ? 0.16 : 0.1;
              return (
                <g key={k}>
                  <polygon points={polyPoints(faceQuad(a, b, sH, 0, wq, v0, v1))} fill={shade(tone, 1.08)} stroke={LINE} strokeWidth={0.4} />
                  <polygon points={polyPoints(faceQuad(a, b, sH, 1 - wq, 1, v0, v1))} fill={shade(tone, 1.08)} stroke={LINE} strokeWidth={0.4} />
                </g>
              );
            })}
            {/* A round-headed door-height window low down, the clock high. */}
            {standing >= H * 0.4 && <polygon fill={OPENING} points={polyPoints(archOnFace(a, b, sH, span, 0.5, 0.1, sv(PL + up(1.0)), sv(PL + up(5.8))))} />}
            {standing >= stageTop && !building && clockFace(a, b, sH, span, 0.5, sv(H * 0.42), 0.2, `c${i}`)}
          </g>
        );
      })}
      <polygon points={polyPoints(stage.top)} fill={shade(STONE, 0.9)} />
      {building && <Scaffold f={stage} />}
      {share >= 0.85 && (() => {
        // The cupola: an open ring of columns round a dark interior, the bell
        // hung in it, a domed cap (the dome last, when the works finish).
        const hang = lift(project(cc, cr), drumTop - up(1.6));
        return (
          <>
            <Band col={c0} row={r0} w={plan} h={plan} z={stageTop + up(0.3)} depth={up(1.2)} proud={0.07} />
            <Balusters col={c0 - 0.07} row={r0 - 0.07} w={plan + 0.14} h={plan + 0.14} z={stageTop + up(0.3)} rise={up(1.1)} />
            <Drum cc={cc} cr={cr} r={r * 1.1} z0={stageTop + up(0.3)} z1={drumBase} fill={STONE} cap />
            <Drum cc={cc} cr={cr} r={r} z0={drumBase} z1={drumTop} fill={STONE} cap={!done} columns={8} cella={shade(OPENING, 1.2)}
              inner={done && <Bell top={hang} metres={3.2} />} />
            {building && <polygon points={polyPoints([...nearHalf(projectedCircle(cc, cr, r * 1.05, 36).map((q) => lift(q, drumBase))), ...nearHalf(projectedCircle(cc, cr, r * 1.05, 36).map((q) => lift(q, drumTop))).reverse()])} fill={`url(#${SCAFFOLD_PATTERN_ID})`} />}
            {done && <Dome cc={cc} cr={cr} r={r * 1.04} z={drumTop} rise={domeRise} fill={COPPER} ribs={8} />}
            {done && <Finial base={lift(project(cc, cr), drumTop + domeRise - up(0.3))} rise={H - drumTop - domeRise + up(0.3)} />}
          </>
        );
      })()}
    </g>
  );
}

// A low balustrade round a box's top edge: a rail on a row of balusters,
// on the two near sides (Plan 87G).
function Balusters({ col, row, w, h, z, rise }: { col: number; row: number; w: number; h: number; z: number; rise: number }) {
  const f = boxFaces(col, row, w, h, z, rise);
  return (
    <>
      {facesOf(f).map(([a, b, span, dir], i) => {
        const tone = faceTone(dir, STONE, shade(STONE, 0.84));
        const n = Math.max(4, Math.round(span * 7));
        return (
          <g key={i}>
            {Array.from({ length: n }, (_, k) => (
              <polygon key={k} points={polyPoints(faceQuad(a, b, rise, (k + 0.3) / n, (k + 0.7) / n, 0, 0.8))} fill={tone} />
            ))}
            <polygon points={polyPoints(faceQuad(a, b, rise, 0, 1, 0.78, 1))} fill={shade(tone, 1.04)} stroke={LINE} strokeWidth={0.4} />
          </g>
        );
      })}
    </>
  );
}

// How the Great Dome is crowned in each set (Plan 87G). The podium and
// the drum's height stay the statement every campus shares; the drum's
// wall, the dome's covering and its lantern take the vernacular: a tiled
// Spanish dome in Mission (San Diego's California Building), an octagonal
// ribbed crown with a spirelet in Gothic (a chapter house's), a shallow
// ribbed-glass dome in Modern, a gilt-fluted crown in Art Deco, and the
// Classical copper dome on a peristyle everywhere else.
type DomeStyle = 'classical' | 'mission' | 'gothic' | 'modern' | 'artDeco';
const DOME_STYLE: Partial<Record<Vernacular, DomeStyle>> = {
  mission: 'mission', gothic: 'gothic', modern: 'modern', artDeco: 'artDeco',
};
const RENDER = '#efe6d4';
const TILE = '#b4583a';
const TILE_GOLD = '#e2b648';
const TILE_BLUE = '#3d6496';
const LEAD = '#6e7881';
const GLASS = '#a7c2cf';
const STEEL = '#59656d';

// A round-headed (or, `pointed`, a lancet) opening on a drum's curved wall:
// centred at angle `ang`, `half` radians wide each side, from z0 up to its
// crown at z1. Only the near half of a drum carries them (Plan 87G).
function drumOpening(cc: number, cr: number, r: number, ang: number, half: number, z0: number, z1: number, pointed = false): Pt[] {
  const at = (a: number, z: number) => lift(project(cc + Math.cos(a) * r, cr + Math.sin(a) * r), z);
  const headZ = up(r * half * METRES_PER_TILE) * (pointed ? 1.7 : 1);
  const spring = Math.max(z0, z1 - headZ);
  const pts: Pt[] = [at(ang - half, z0)];
  for (let i = 0; i <= 10; i++) {
    const s = i / 10;
    const x = -1 + 2 * s;
    const lift01 = pointed ? 1 - Math.abs(x) ** 1.2 : Math.sqrt(Math.max(0, 1 - x * x));
    pts.push(at(ang + x * half, spring + (z1 - spring) * lift01));
  }
  pts.push(at(ang + half, z0));
  return pts;
}

// The angles round a drum that face the camera, `n` evenly set.
function nearAngles(cc: number, cr: number, r: number, n: number, offset = 0.5): number[] {
  const cy = project(cc, cr).y;
  return Array.from({ length: n }, (_, j) => ((j + offset) / n) * Math.PI * 2)
    .filter((a) => project(cc + Math.cos(a) * r * 0.92, cr + Math.sin(a) * r * 0.92).y > cy + 0.5);
}

// An upright n-sided prism (an octagonal drum or lantern), its near faces
// back to front, each toned by the way it points (Plan 87G).
function Prism({ cc, cr, r, z0, z1, n, fill, cap = true, face }: {
  cc: number; cr: number; r: number; z0: number; z1: number; n: number; fill: string; cap?: boolean;
  // What each near face carries, given its corners and its height.
  face?: (a: Pt, b: Pt, hgt: number, i: number) => React.ReactNode;
}) {
  const corner = (j: number) => project(cc + Math.cos((j / n) * Math.PI * 2) * r, cr + Math.sin((j / n) * Math.PI * 2) * r);
  const cy = project(cc, cr).y;
  const sides = Array.from({ length: n }, (_, j) => ({ j, a: corner(j), b: corner(j + 1), mid: (j + 0.5) / n * Math.PI * 2 }))
    .filter(({ a, b }) => (a.y + b.y) / 2 > cy + 0.01)
    .sort((m, k) => (m.a.y + m.b.y) - (k.a.y + k.b.y));
  const ring = Array.from({ length: n }, (_, j) => lift(corner(j), z1));
  return (
    <>
      {sides.map(({ j, a, b, mid }) => {
        const A = lift(a, z0); const B = lift(b, z0);
        // Lit by the way the face points: -col brightest, +col darkest.
        const k = 0.86 + 0.14 * -Math.cos(mid) * 0.8 + 0.06 * -Math.sin(mid);
        return (
          <g key={j}>
            <polygon points={polyPoints([A, B, lift(B, z1 - z0), lift(A, z1 - z0)])} fill={shade(fill, k)} stroke={LINE} strokeWidth={0.5} />
            {face?.(A, B, z1 - z0, j)}
          </g>
        );
      })}
      {cap && <polygon points={polyPoints(ring)} fill={shade(fill, 0.88)} />}
    </>
  );
}

function GreatDome({ t, p, share, building, vernacular }: { t: Buildable; p: Plot; share: number; building: boolean; vernacular?: Vernacular }) {
  const style: DomeStyle = (vernacular && DOME_STYLE[vernacular]) || 'classical';
  const H = wallHeightOf(t);
  const cc = p.col + p.w / 2;
  const cr = p.row + p.h / 2;
  const r = Math.min(p.w, p.h) * 0.36;
  const podiumH = H * 0.1;
  const podium = boxFaces(p.col + 0.3, p.row + 0.3, p.w - 0.6, p.h - 0.6, 0, Math.min(podiumH, H * share));
  const drumTop = podiumH + H * 0.38;
  const drumH = Math.min(drumTop, H * share);
  const drumUp = drumH >= drumTop;
  const domed = share >= 0.85;
  const done = share >= 1;
  const scaffold = building && share > 0.1 && (
    <polygon points={polyPoints([...nearHalf(projectedCircle(cc, cr, r * 1.03, 36).map((q) => lift(q, podiumH))), ...nearHalf(projectedCircle(cc, cr, r * 1.03, 36).map((q) => lift(q, drumH))).reverse()])} fill={`url(#${SCAFFOLD_PATTERN_ID})`} />
  );
  const base = (
    <>
      {walls(podium, STONE_DARK)}
      <polygon points={polyPoints(podium.top)} fill={STONE} />
      {done && <Band col={p.col + 0.3} row={p.row + 0.3} w={p.w - 0.6} h={p.h - 0.6} z={podiumH} depth={up(0.8)} proud={0.06} tone={STONE_DARK} cap={false} />}
    </>
  );
  if (style === 'classical') {
    const rise = H * 0.4;
    // The lantern: a small colonnaded drum and a gilded cupola on the crown.
    const crown = drumTop + rise;
    const lanternR = r * 0.14;
    const lanternH = up(4);
    const finialBase = lift(project(cc, cr), crown + lanternH + up(3.2));
    return (
      <g className="landmark landmark-dome">
        {base}
        {share > 0.1 && <Drum cc={cc} cr={cr} r={r} z0={podiumH} z1={drumH} fill={STONE} cap={!domed} columns={drumUp ? 20 : 0} />}
        {scaffold}
        {domed && <Dome cc={cc} cr={cr} r={r * 0.98} z={drumTop} rise={rise} fill={done ? COPPER : STONE_DARK} ribs={16} />}
        {done && (
          <>
            <Drum cc={cc} cr={cr} r={lanternR} z0={crown - up(0.6)} z1={crown + lanternH} fill={STONE} cap={false} />
            <Dome cc={cc} cr={cr} r={lanternR * 1.1} z={crown + lanternH} rise={up(3.2)} fill={GILT} />
            <line x1={finialBase.x} y1={finialBase.y} x2={finialBase.x} y2={finialBase.y - up(3) * heightScale()} stroke={GILT} strokeWidth={1.4} />
            <circle cx={finialBase.x} cy={finialBase.y - up(1.6) * heightScale()} r={1.5} fill={GILT} />
          </>
        )}
      </g>
    );
  }
  if (style === 'mission') {
    // White rendered drum pierced by round-headed windows under a tile
    // cornice; a dome in glazed tile, terracotta laid in gold ribs and blue
    // courses; a rendered lantern with arched openings, a tiled cap and an
    // iron cross.
    const rise = H * 0.36;
    const crown = drumTop + rise;
    const lr = r * 0.17;
    const lanternH = up(5);
    const capRise = up(3);
    const tip = lift(project(cc, cr), crown + lanternH + capRise);
    return (
      <g className="landmark landmark-dome landmark-dome-mission">
        {base}
        {share > 0.1 && <Drum cc={cc} cr={cr} r={r} z0={podiumH} z1={drumH} fill={RENDER} cap={!domed} />}
        {share > 0.1 && drumUp && nearAngles(cc, cr, r, 12).map((a) => (
          <polygon key={a} points={polyPoints(drumOpening(cc, cr, r, a, 0.09, podiumH + (drumTop - podiumH) * 0.3, drumTop - (drumTop - podiumH) * 0.16))} fill={OPENING} />
        ))}
        {share > 0.1 && drumUp && <Drum cc={cc} cr={cr} r={r * 1.03} z0={drumTop - up(1.3)} z1={drumTop} fill={TILE} cap={false} />}
        {scaffold}
        {domed && <Dome cc={cc} cr={cr} r={r * 0.97} z={drumTop} rise={rise} fill={done ? TILE : STONE_DARK} ribs={done ? 12 : 0} ribTone={TILE_GOLD} rings={done ? 3 : 0} ringTone={TILE_BLUE} />}
        {done && (
          <>
            <Drum cc={cc} cr={cr} r={lr} z0={crown - up(0.8)} z1={crown + lanternH} fill={RENDER} cap={false} />
            {nearAngles(cc, cr, lr, 6).map((a) => (
              <polygon key={a} points={polyPoints(drumOpening(cc, cr, lr, a, 0.32, crown + up(0.6), crown + lanternH - up(0.9)))} fill={OPENING} />
            ))}
            <Dome cc={cc} cr={cr} r={lr * 1.15} z={crown + lanternH} rise={capRise} fill={TILE} ribs={6} ribTone={TILE_GOLD} />
            <line x1={tip.x} y1={tip.y} x2={tip.x} y2={tip.y - up(3.6) * heightScale()} stroke="#2e2a26" strokeWidth={1.4} />
            <line x1={tip.x - up(0.9)} y1={tip.y - up(2.5) * heightScale()} x2={tip.x + up(0.9)} y2={tip.y - up(2.5) * heightScale()} stroke="#2e2a26" strokeWidth={1.2} />
          </>
        )}
      </g>
    );
  }
  if (style === 'gothic') {
    // An octagon like a chapter house's: lancets in each face, a pinnacled
    // buttress at each angle, a tall ribbed lead crown, and an open
    // octagonal lantern under a needle spirelet.
    const n = 8;
    const rise = H * 0.46;
    const crown = drumTop + rise;
    const lr = r * 0.2;
    const lanternH = up(7);
    const spireTop = crown + lanternH + up(12);
    const lancets = (a: Pt, b: Pt, hgt: number) => (
      <polygon points={polyPoints(gothicLancet(a, b, hgt))} fill={OPENING} />
    );
    const corners = Array.from({ length: n }, (_, j) => (j / n) * Math.PI * 2);
    const cy = project(cc, cr).y;
    const nearCorners = corners
      .map((a) => ({ a, q: project(cc + Math.cos(a) * r * 1.02, cr + Math.sin(a) * r * 1.02) }))
      .filter(({ q }) => q.y > cy)
      .sort((m, k) => m.q.y - k.q.y);
    const tip = lift(project(cc, cr), spireTop);
    return (
      <g className="landmark landmark-dome landmark-dome-gothic">
        {base}
        {share > 0.1 && <Prism cc={cc} cr={cr} r={r * 1.04} z0={podiumH} z1={drumH} n={n} fill={STONE} cap={!domed} face={drumUp ? lancets : undefined} />}
        {scaffold}
        {domed && <Dome cc={cc} cr={cr} r={r * 0.98} z={drumTop} rise={rise} fill={done ? LEAD : STONE_DARK} ribs={n} ribTone={shade(STONE, 1.02)} ribWidth={2.2} />}
        {/* The near buttresses stand in front of the crown's foot. */}
        {share > 0.1 && drumUp && nearCorners.map(({ a }) => {
          // A buttress at the angle, its pinnacle above the parapet.
          const bc = cc + Math.cos(a) * r * 1.08; const br = cr + Math.sin(a) * r * 1.08;
          const s = across(2.2);
          const f = boxFaces(bc - s / 2, br - s / 2, s, s, podiumH, drumTop - podiumH + up(1));
          const apex = lift(project(bc, br), drumTop + up(6));
          return (
            <g key={a}>
              {walls(f, STONE)}
              <polygon points={polyPoints(f.top)} fill={shade(STONE, 0.9)} />
              {pyramidOn(f, apex, shade(STONE, 0.95))}
            </g>
          );
        })}
        {done && (
          <>
            <Prism cc={cc} cr={cr} r={lr} z0={crown - up(1.2)} z1={crown + lanternH} n={n} fill={STONE} cap={false}
              face={(a, b, hgt) => <polygon points={polyPoints(gothicLancet(a, b, hgt))} fill={OPENING} />} />
            <polygon points={polyPoints([...nearHalf(projectedCircle(cc, cr, lr * 1.05, n).map((q) => lift(q, crown + lanternH))), tip])} fill={LEAD} stroke={LINE} strokeWidth={0.6} />
            <line x1={tip.x} y1={tip.y} x2={tip.x} y2={tip.y - up(2.6) * heightScale()} stroke={GILT} strokeWidth={1.3} />
            <line x1={tip.x - up(0.7)} y1={tip.y - up(1.8) * heightScale()} x2={tip.x + up(0.7)} y2={tip.y - up(1.8) * heightScale()} stroke={GILT} strokeWidth={1.1} />
          </>
        )}
      </g>
    );
  }
  if (style === 'modern') {
    // A glazed drum, mullioned, on a pale concrete ring; a shallow dome of
    // ribbed glass; an open steel oculus ring and a slim mast at its crown.
    const rise = H * 0.22;
    const ringZ = podiumH + (drumTop - podiumH) * 0.22;
    const crown = drumTop + rise;
    const mast = lift(project(cc, cr), crown);
    return (
      <g className="landmark landmark-dome landmark-dome-modern">
        {base}
        {share > 0.1 && <Drum cc={cc} cr={cr} r={r} z0={podiumH} z1={Math.min(drumH, ringZ)} fill={RENDER} cap={drumH <= ringZ} />}
        {share > 0.1 && drumH > ringZ && (
          <>
            <Drum cc={cc} cr={cr} r={r * 0.99} z0={ringZ} z1={drumH} fill={GLASS} cap={!domed} />
            {nearAngles(cc, cr, r, 36, 0).map((a) => {
              const q = project(cc + Math.cos(a) * r, cr + Math.sin(a) * r);
              return <line key={a} x1={q.x} y1={lift(q, ringZ).y} x2={q.x} y2={lift(q, drumH).y} stroke={STEEL} strokeWidth={0.8} />;
            })}
            <Drum cc={cc} cr={cr} r={r * 1.01} z0={drumH - up(1)} z1={drumH} fill={RENDER} cap={!domed} />
          </>
        )}
        {scaffold}
        {domed && <Dome cc={cc} cr={cr} r={r} z={drumTop} rise={rise} fill={done ? GLASS : STONE_DARK} ribs={done ? 24 : 0} ribTone={STEEL} ribWidth={0.9} rings={done ? 4 : 0} ringTone={STEEL} />}
        {done && (
          <>
            <polygon points={polyPoints(projectedCircle(cc, cr, r * 0.16, 24).map((q) => lift(q, crown - up(0.6))))} fill="none" stroke={STEEL} strokeWidth={2} />
            <line x1={mast.x} y1={mast.y} x2={mast.x} y2={mast.y - up(9) * heightScale()} stroke={STEEL} strokeWidth={1.2} />
          </>
        )}
      </g>
    );
  }
  // Art Deco: the drum in stepped stone rings, fluted, and a tall crown of
  // gilt ribs on bronze rising to a needle.
  const rise = H * 0.42;
  const crown = drumTop + rise;
  const tip = lift(project(cc, cr), crown + up(10));
  return (
    <g className="landmark landmark-dome landmark-dome-deco">
      {base}
      {share > 0.1 && <Drum cc={cc} cr={cr} r={r * 1.04} z0={podiumH} z1={Math.min(drumH, podiumH + (drumTop - podiumH) * 0.3)} fill={STONE} cap={!drumUp} />}
      {share > 0.1 && drumH > podiumH + (drumTop - podiumH) * 0.3 && (
        <>
          <Drum cc={cc} cr={cr} r={r} z0={podiumH + (drumTop - podiumH) * 0.3} z1={drumH} fill={STONE} cap={!domed} />
          {drumUp && nearAngles(cc, cr, r, 16).map((a) => (
            <polygon key={a} points={polyPoints(drumOpening(cc, cr, r, a, 0.05, podiumH + (drumTop - podiumH) * 0.4, drumTop - up(1)))} fill={OPENING} />
          ))}
        </>
      )}
      {scaffold}
      {domed && <Dome cc={cc} cr={cr} r={r * 0.96} z={drumTop} rise={rise} fill={done ? '#7a6a4f' : STONE_DARK} ribs={done ? 16 : 0} ribTone={GILT} ribWidth={1.6} />}
      {done && (
        <>
          <polygon points={polyPoints([...nearHalf(projectedCircle(cc, cr, r * 0.1, 16).map((q) => lift(q, crown - up(1)))), tip])} fill={GILT} stroke={LINE} strokeWidth={0.5} />
        </>
      )}
    </g>
  );
}

// A lancet in an octagon's face: a tall pointed opening in its middle.
function gothicLancet(a: Pt, b: Pt, hgt: number): Pt[] {
  const pts: Pt[] = [facePoint(a, b, hgt, 0.32, 0.16)];
  for (let i = 0; i <= 8; i++) {
    const s = i / 8;
    const u = 0.32 + 0.36 * s;
    const x = -1 + 2 * s;
    pts.push(facePoint(a, b, hgt, u, 0.62 + 0.26 * (1 - Math.abs(x) ** 1.4)));
  }
  pts.push(facePoint(a, b, hgt, 0.68, 0.16));
  return pts;
}

function TriumphalGate({ t, p, share, building, name }: { t: Buildable; p: Plot; share: number; building: boolean; name: string }) {
  const H = wallHeightOf(t);
  const fullBody = H * GATE_BODY_SHARE;
  const bodyH = Math.min(fullBody, H * share);
  const I = GATE_INSET;
  const body = boxFaces(p.col + I, p.row + I, p.w - I * 2, p.h - I * 2, 0, bodyH);
  const attic = share >= 1 ? boxFaces(p.col + 0.6, p.row + 0.4, p.w - 1.2, p.h - 0.8, fullBody, H * (1 - GATE_BODY_SHARE)) : null;
  const done = share >= 0.85;
  // The long face the camera sees carries the great arch and the reliefs;
  // the end the lesser arch. Each passage goes right through (Plan 75B):
  // its far mouth is the same arch on the parallel hidden face, D-C's on
  // A-B and C-B's on D-A.
  const [left, right] = facesOf(body);
  const longIsLeft = body.spanLeft >= body.spanRight;
  const [long, short] = longIsLeft ? [left, right] : [right, left];
  const far = (face: Face): [Pt, Pt] => (face === left ? [body.A, body.B] : [body.D, body.A]);
  // v of a height on the body's faces.
  const v = (z: number) => z / Math.max(0.0001, bodyH);
  const archTop = v(H * GATE_ARCH_TOP);
  const sideTop = v(H * GATE_SIDE_ARCH_TOP);
  const greatArch = (a: Pt, b: Pt, span: number) => archOnFace(a, b, bodyH, span, 0.5, GATE_ARCH_HALF, 0, archTop);
  const lesserArch = (a: Pt, b: Pt, span: number) => archOnFace(a, b, bodyH, span, 0.5, GATE_SIDE_ARCH_HALF, 0, sideTop);
  const d = (pts: Pt[]) => `M${pts.map((q) => `${q.x.toFixed(1)},${q.y.toFixed(1)}`).join('L')}Z`;
  const arches = new Map<Face, Pt[]>([
    [long, greatArch(long[0], long[1], long[2])],
    [short, lesserArch(short[0], short[1], short[2])],
  ]);
  // A passage's inside, drawn before the pierced walls: the arch's outline
  // swept from its near mouth to its far one, each strip of the sweep drawn
  // only where it faces the camera (the side wall and vault within, never
  // the vault's back). Its floor is left open, so the ground, the paving and
  // anything beyond show through the arch.
  const passage = (face: Face, arch: (a: Pt, b: Pt, span: number) => Pt[]) => {
    const [fa, fb] = far(face);
    const near = arches.get(face)!;
    const back = arch(fa, fb, face[2]);
    const n = near.length;
    const area = (q: Pt[]) => q.reduce((acc, a, i) => { const b = q[(i + 1) % q.length]!; return acc + a.x * b.y - b.x * a.y; }, 0);
    // The floor faces up, so it is always seen: its winding is the one a
    // seen strip has.
    const seen = Math.sign(area([near[n - 1]!, near[0]!, back[0]!, back[n - 1]!]));
    const strips: React.JSX.Element[] = [];
    for (let i = 0; i < n - 1; i++) {
      const q = [near[i]!, near[i + 1]!, back[i + 1]!, back[i]!];
      if (Math.sign(area(q)) !== seen) continue;
      // The walls lighter than the vault over them.
      const upright = i === 0 || i === n - 2;
      strips.push(<polygon key={i} points={polyPoints(q)} fill={shade(STONE, upright ? 0.74 : 0.6)} stroke={shade(STONE, upright ? 0.74 : 0.6)} strokeWidth={0.4} />);
    }
    return <g className="landmark-passage">{strips}</g>;
  };
  // A wall with its arch cut out.
  const pierced = (face: Face) => {
    const [a, b, , dir] = face;
    const wall = [a, b, facePoint(a, b, bodyH, 1, 1), facePoint(a, b, bodyH, 0, 1)];
    return <path fillRule="evenodd" fill={faceTone(dir, STONE, shade(STONE, 0.84))} d={d(wall) + d(arches.get(face)!)} />;
  };
  const pilasters = [0.08, 0.3, 0.7, 0.92];
  const PIL = 0.028;
  const faceDetail = ([a, b, span, dir]: Face, main: boolean) => {
    const tone = faceTone(dir, STONE, shade(STONE, 0.84));
    const us = main ? pilasters : [0.14, 0.86];
    const pil = main ? PIL : PIL * (long[2] / Math.max(0.1, span));
    return (
      <g key={main ? 'long' : 'short'}>
        {/* Pilasters, a shade proud: a lit edge, a shadowed edge and a capital. */}
        {us.map((u) => (
          <g key={u}>
            <polygon points={polyPoints(faceQuad(a, b, bodyH, u - pil, u + pil, v(up(0.8)), v(fullBody - up(2.6))))} fill={shade(tone, 1.05)} stroke="rgba(60, 54, 44, 0.3)" strokeWidth={0.5} />
            <polygon points={polyPoints(faceQuad(a, b, bodyH, u - pil * 1.5, u + pil * 1.5, v(fullBody - up(3.4)), v(fullBody - up(2.6))))} fill={shade(tone, 1.05)} stroke="rgba(60, 54, 44, 0.3)" strokeWidth={0.5} />
          </g>
        ))}
        {main && (
          <>
            {/* The archivolt round the opening, and its keystone. */}
            <path fillRule="evenodd" fill={shade(tone, 1.06)} d={d(archOnFace(a, b, bodyH, span, 0.5, GATE_ARCH_HALF + 0.02, 0, archTop + v(up(1.2)))) + d(arches.get(long)!)} />
            <polygon points={polyPoints(faceQuad(a, b, bodyH, 0.485, 0.515, archTop - v(up(0.4)), archTop + v(up(1.6))))} fill={shade(tone, 1.08)} stroke={LINE} strokeWidth={0.5} />
            {/* Relief panels between the pilasters, each a sunk field with a
                laurel wreath. */}
            {[0.19, 0.81].map((uc) => {
              const v0 = v(H * 0.36);
              const v1 = v(H * 0.62);
              const wreath = discOnFace(a, b, bodyH, span, uc, (v0 + v1) / 2, 0.035);
              return (
                <g key={uc}>
                  <polygon points={polyPoints(faceQuad(a, b, bodyH, uc - 0.075, uc + 0.075, v0, v1))} fill={shade(tone, 0.88)} stroke={LINE} strokeWidth={0.6} />
                  <polygon points={polyPoints(wreath)} fill="none" stroke={shade(tone, 0.62)} strokeWidth={1.4} strokeDasharray="1.6 1" />
                  <polygon points={polyPoints(faceQuad(a, b, bodyH, uc - 0.075, uc + 0.075, v(H * 0.12), v(H * 0.3)))} fill={shade(tone, 0.92)} stroke={LINE} strokeWidth={0.5} />
                </g>
              );
            })}
          </>
        )}
      </g>
    );
  };
  return (
    <g className="landmark landmark-gate">
      {done ? (
        <>
          {passage(long, greatArch)}
          {passage(short, lesserArch)}
          {pierced(left)}
          {pierced(right)}
        </>
      ) : walls(body, STONE)}
      <polygon points={polyPoints(body.top)} fill={shade(STONE, 0.92)} />
      {done && faceDetail(long, true)}
      {done && faceDetail(short, false)}
      {building && <Scaffold f={body} />}
      {share >= 1 && <Band col={p.col + I} row={p.row + I} w={p.w - I * 2} h={p.h - I * 2} z={fullBody} depth={up(1.3)} proud={0.1} />}
      {attic && (
        <>
          {walls(attic, STONE)}
          <polygon points={polyPoints(attic.top)} fill={shade(STONE, 0.92)} />
          <Band col={p.col + 0.6} row={p.row + 0.4} w={p.w - 1.2} h={p.h - 0.8} z={H} depth={up(0.8)} proud={0.06} />
          <Inscription attic={attic} name={name} />
        </>
      )}
    </g>
  );
}

// The college's name cut across the attic's long face, set along the wall.
function Inscription({ attic, name }: { attic: BoxFaces; name: string }) {
  const [a, b] = attic.spanLeft >= attic.spanRight ? [attic.D, attic.C] : [attic.C, attic.B];
  const mid = facePoint(a, b, wallHeightOfAttic(attic), 0.5, 0.45);
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  const ux = (b.x - a.x) / len;
  const uy = (b.y - a.y) / len;
  return (
    <text
      className="landmark-inscription"
      transform={`matrix(${ux.toFixed(4)},${uy.toFixed(4)},0,1,${mid.x.toFixed(1)},${mid.y.toFixed(1)})`}
      fontSize={Math.min(9, (len / Math.max(8, name.length)) * 1.4)}
    >
      {name.toUpperCase()}
    </text>
  );
}

function wallHeightOfAttic(f: BoxFaces): number {
  return (f.D.y - f.Dt.y) / Math.max(0.0001, heightScale());
}

interface Plot { col: number; row: number; w: number; h: number }

// The boxes a finished landmark stands in, for its weathering (ageMarks.tsx,
// Plan 75A): the campanile's shaft (its belfry is open), the bell tower's
// stone stage, the dome's podium (its drum and dome are round, and weather
// as stone does not show), the gate's body.
export function landmarkVolumes(t: Buildable, p: Plot): { col: number; row: number; w: number; h: number; base: number; height: number }[] {
  const H = wallHeightOf(t);
  if (t.id === 'LANDMARK-CAMPANILE') {
    const plan = Math.min(across(11.5), Math.min(p.w, p.h) * 0.3);
    return [{ col: p.col + (p.w - plan) / 2, row: p.row + (p.h - plan) / 2, w: plan, h: plan, base: 0, height: H * CAMPANILE_SHAFT }];
  }
  if (t.id === 'AMENITY-BELLTOWER') {
    const plan = Math.min(p.w, p.h) * 0.46;
    return [{ col: p.col + (p.w - plan) / 2, row: p.row + (p.h - plan) / 2, w: plan, h: plan, base: 0, height: H * BELLTOWER_STAGE }];
  }
  if (t.id === 'LANDMARK-DOME') return [{ col: p.col + 0.3, row: p.row + 0.3, w: p.w - 0.6, h: p.h - 0.6, base: 0, height: H * 0.1 }];
  return [{ col: p.col + GATE_INSET, row: p.row + GATE_INSET, w: p.w - GATE_INSET * 2, h: p.h - GATE_INSET * 2, base: 0, height: H * GATE_BODY_SHARE }];
}

// `vernacular` styles the Great Dome's crown (Plan 87G); the rest of the
// landmarks are the same in every set.
export type LandmarkProps = { t: Buildable; p: Plot; developing: boolean; vernacular?: Vernacular };
export default function Landmark(props: LandmarkProps) {
  return landmarkArt(props, useContext(DevelopingContext), useContext(CollegeNameContext));
}
// The landmark given the weeks left on the works and the college's name:
// what the canvas map draws (canvasArt.ts).
export function landmarkArt({ t, p, developing, vernacular }: LandmarkProps, developingWeeks: GameState['developing'], name: string): React.JSX.Element {
  const weeksLeft = developingWeeks[t.id];
  const fraction = developing && weeksLeft !== undefined && t.duration > 0 ? (t.duration - weeksLeft) / t.duration : 1;
  const stage = developing ? Math.min(2, stageOf(fraction)) as Stage : 3;
  const share = STAGE_SHARE[stage];
  const building = developing;
  if (t.id === 'LANDMARK-CAMPANILE') return <Campanile t={t} p={p} share={share} building={building} />;
  if (t.id === 'AMENITY-BELLTOWER') return <BellTower t={t} p={p} share={share} building={building} />;
  if (t.id === 'LANDMARK-DOME') return <GreatDome t={t} p={p} share={share} building={building} vernacular={vernacular} />;
  return <TriumphalGate t={t} p={p} share={share} building={building} name={name} />;
}
