import { useContext } from 'react';
import type { Buildable } from '../state/types';
import { boxFaces, facePoint, heightScale, lift, polyPoints, project, projectedCircle, type BoxFaces, type Pt } from './isoProjection';
import { faceTone } from './light';
import { shade } from './tint';
import { METRES_PER_TILE, up } from './campusScale';
import { wallHeightOf } from './buildingSpec';
import { SCAFFOLD_PATTERN_ID } from './buildingMotifs';
import { DevelopingContext, CollegeNameContext } from './mapOccasions';

// The grand landmarks (Plan 25): a campanile, a great dome and a triumphal
// gate, each drawn bespoke and built in visible stages. While one goes up
// its countdown (DevelopingContext) picks the stage: footings, then the
// lower half, then all but the crown, each in scaffolding, and then the
// finished thing. Drawn in limestone whatever the vernacular: a landmark is
// a statement, not a neighbor.

const STONE = '#ddd3bd';
const STONE_DARK = '#b8ad95';
// The drum's walls behind its columns, a tone off the plinth (Plan 74C).
const CELLA = '#c4b89e';
const ROOF = '#6c7a80';
const OPENING = '#3a3834';
const COPPER = '#8fa6a2';
const GILT = '#c9a44a';
const LINE = 'rgba(60, 54, 44, 0.4)';

type Stage = 0 | 1 | 2 | 3;
// How much of the whole stands at each stage.
const STAGE_SHARE: Record<Stage, number> = { 0: 0.08, 1: 0.5, 2: 0.85, 3: 1 };

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
function Drum({ cc, cr, r, z0, z1, fill, cap = true, columns = 0 }: {
  cc: number; cr: number; r: number; z0: number; z1: number; fill: string; cap?: boolean; columns?: number;
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
      {band(z0, z1, r * 0.86, CELLA)}
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
function Dome({ cc, cr, r, z, rise, fill, ribs = 0 }: {
  cc: number; cr: number; r: number; z: number; rise: number; fill: string; ribs?: number;
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
  return (
    <>
      <polygon points={polyPoints(outline)} fill={fill} stroke="rgba(40, 44, 48, 0.45)" strokeWidth={0.8} />
      {ribPaths.length > 0 && <path d={ribPaths.join('')} fill="none" stroke={shade(fill, 1.18)} strokeWidth={1.3} strokeLinecap="round" />}
    </>
  );
}

function Campanile({ t, p, share, building }: { t: Buildable; p: Plot; share: number; building: boolean }) {
  const H = wallHeightOf(t);
  const plan = Math.min(p.w, p.h) * 0.44;
  const c0 = p.col + (p.w - plan) / 2;
  const r0 = p.row + (p.h - plan) / 2;
  const plinth = boxFaces(p.col + 0.4, p.row + 0.4, p.w - 0.8, p.h - 0.8, 0, up(0.8));
  const shaftTop = H * 0.6;
  const standing = H * share;
  const shaftH = Math.min(shaftTop, standing);
  const shaft = boxFaces(c0, r0, plan, plan, 0, shaftH);
  const belfryH = H * 0.14;
  const belfry = share > 0.6 ? boxFaces(c0 - 0.1, r0 - 0.1, plan + 0.2, plan + 0.2, shaftTop, Math.min(belfryH, standing - shaftTop)) : null;
  const spireBase = shaftTop + belfryH;
  const apex = lift(project(c0 + plan / 2, r0 + plan / 2), H);
  const COURSE = up(0.7);
  // A string course at the head of each of the shaft's three stages.
  const courses = [shaftTop / 3, (shaftTop * 2) / 3, shaftTop].filter((z) => z <= shaftH + 0.01);
  // A slit window in each of the lower stages; the clock in the top one.
  const slits = [shaftTop / 6, shaftTop / 2].filter((z) => z + up(2) <= shaftH);
  const clock = shaftH >= shaftTop && !building;
  return (
    <g className="landmark landmark-campanile">
      <polygon points={polyPoints(plinth.top)} fill={STONE_DARK} />
      {walls(shaft, STONE)}
      {facesOf(shaft).map(([a, b], i) => (
        <g key={i}>
          {slits.map((z) => (
            <polygon key={z} fill={OPENING} points={polyPoints(archOnFace(a, b, shaftH, plan, 0.5, 0.06, (z - up(2)) / shaftH, (z + up(2.2)) / shaftH))} />
          ))}
        </g>
      ))}
      {courses.map((z) => <Band key={z} col={c0} row={r0} w={plan} h={plan} z={z} depth={COURSE} proud={0.05} tone={shade(STONE, 0.9)} cap={z >= shaftH - 0.01 && !belfry} />)}
      <polygon points={polyPoints(shaft.top)} fill={shade(STONE, 0.9)} />
      {clock && facesOf(shaft).map(([a, b], i) => {
        const vc = (shaftTop * 5) / 6 / shaftH;
        const face = discOnFace(a, b, shaftH, plan, 0.5, vc, 0.2);
        const hub = facePoint(a, b, shaftH, 0.5, vc);
        const twelve = facePoint(a, b, shaftH, 0.5, vc + 0.15 * faceAspect(plan, shaftH));
        const three = facePoint(a, b, shaftH, 0.61, vc);
        return (
          <g key={`clock-${i}`} className="landmark-clock">
            <polygon points={polyPoints(face)} fill="#f3eee0" stroke={GILT} strokeWidth={1.2} />
            <path d={`M${hub.x.toFixed(1)},${hub.y.toFixed(1)}L${twelve.x.toFixed(1)},${twelve.y.toFixed(1)}M${hub.x.toFixed(1)},${hub.y.toFixed(1)}L${three.x.toFixed(1)},${three.y.toFixed(1)}`} stroke="#2e2a24" strokeWidth={1.1} strokeLinecap="round" />
          </g>
        );
      })}
      {building && <Scaffold f={shaft} />}
      {belfry && (() => {
        const bh = Math.min(belfryH, standing - shaftTop);
        return (
          <>
            {walls(belfry, STONE)}
            {/* The bell openings: two round arches on each visible face. */}
            {facesOf(belfry).map(([a, b, span], i) => [0.3, 0.7].map((uc) => (
              <polygon key={`${i}-${uc}`} fill={OPENING} points={polyPoints(archOnFace(a, b, bh, span, uc, 0.12, 0.14, Math.min(0.84, (belfryH * 0.84) / bh)))} />
            )))}
            <polygon points={polyPoints(belfry.top)} fill={shade(STONE, 0.9)} />
            {bh >= belfryH && <Band col={c0 - 0.1} row={r0 - 0.1} w={plan + 0.2} h={plan + 0.2} z={spireBase} depth={COURSE * 1.4} proud={0.08} />}
          </>
        );
      })()}
      {share >= 1 && (
        // The spire: a pyramid from the belfry's cornice to the apex, and a
        // gilded finial.
        (() => {
          const base = boxFaces(c0 - 0.1, r0 - 0.1, plan + 0.2, plan + 0.2, spireBase, 0);
          const tip = lift(apex, up(2.6));
          return (
            <>
              <polygon points={polyPoints([base.D, base.C, apex])} fill={faceTone(base.dir.CD, ROOF, shade(ROOF, 0.8))} />
              <polygon points={polyPoints([base.C, base.B, apex])} fill={faceTone(base.dir.BC, ROOF, shade(ROOF, 0.8))} />
              <line x1={apex.x} y1={apex.y} x2={tip.x} y2={tip.y} stroke={GILT} strokeWidth={1.4} />
              <circle cx={apex.x} cy={apex.y - (apex.y - tip.y) * 0.45} r={1.6} fill={GILT} />
            </>
          );
        })()
      )}
    </g>
  );
}

function GreatDome({ t, p, share, building }: { t: Buildable; p: Plot; share: number; building: boolean }) {
  const H = wallHeightOf(t);
  const cc = p.col + p.w / 2;
  const cr = p.row + p.h / 2;
  const r = Math.min(p.w, p.h) * 0.36;
  const podiumH = H * 0.1;
  const podium = boxFaces(p.col + 0.3, p.row + 0.3, p.w - 0.6, p.h - 0.6, 0, Math.min(podiumH, H * share));
  const drumTop = podiumH + H * 0.38;
  const drumH = Math.min(drumTop, H * share);
  const domed = share >= 0.85;
  const rise = H * 0.4;
  // The lantern: a small colonnaded drum and a gilded cupola on the crown.
  const crown = drumTop + rise;
  const lanternR = r * 0.14;
  const lanternH = up(4);
  const finialBase = lift(project(cc, cr), crown + lanternH + up(3.2));
  return (
    <g className="landmark landmark-dome">
      {walls(podium, STONE_DARK)}
      <polygon points={polyPoints(podium.top)} fill={STONE} />
      {share >= 1 && <Band col={p.col + 0.3} row={p.row + 0.3} w={p.w - 0.6} h={p.h - 0.6} z={podiumH} depth={up(0.8)} proud={0.06} tone={STONE_DARK} cap={false} />}
      {share > 0.1 && <Drum cc={cc} cr={cr} r={r} z0={podiumH} z1={drumH} fill={STONE} cap={!domed} columns={drumH >= drumTop ? 20 : 0} />}
      {building && share > 0.1 && (
        <polygon points={polyPoints([...nearHalf(projectedCircle(cc, cr, r * 1.03, 36).map((q) => lift(q, podiumH))), ...nearHalf(projectedCircle(cc, cr, r * 1.03, 36).map((q) => lift(q, drumH))).reverse()])} fill={`url(#${SCAFFOLD_PATTERN_ID})`} />
      )}
      {domed && <Dome cc={cc} cr={cr} r={r * 0.98} z={drumTop} rise={rise} fill={share >= 1 ? COPPER : STONE_DARK} ribs={16} />}
      {share >= 1 && (
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

function TriumphalGate({ t, p, share, building, name }: { t: Buildable; p: Plot; share: number; building: boolean; name: string }) {
  const H = wallHeightOf(t);
  const fullBody = H * 0.8;
  const bodyH = Math.min(fullBody, H * share);
  const body = boxFaces(p.col + 0.2, p.row + 0.2, p.w - 0.4, p.h - 0.4, 0, bodyH);
  const attic = share >= 1 ? boxFaces(p.col + 0.6, p.row + 0.4, p.w - 1.2, p.h - 0.8, fullBody, H * 0.2) : null;
  const done = share >= 0.85;
  // The long face the camera sees carries the great arch and the reliefs;
  // the short face a lesser arch.
  const [left, right] = facesOf(body);
  const [long, short] = body.spanLeft >= body.spanRight ? [left, right] : [right, left];
  // v of a height on the body's faces.
  const v = (z: number) => z / Math.max(0.0001, bodyH);
  const archTop = v(H * 0.6);
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
        {main ? (
          <>
            {/* The archivolt, the arch and its keystone. */}
            <polygon points={polyPoints(archOnFace(a, b, bodyH, span, 0.5, 0.16, 0, archTop + v(up(1.2))))} fill={shade(tone, 1.06)} />
            <polygon points={polyPoints(archOnFace(a, b, bodyH, span, 0.5, 0.14, 0, archTop))} fill={OPENING} />
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
        ) : (
          <polygon points={polyPoints(archOnFace(a, b, bodyH, span, 0.5, 0.18, 0, v(H * 0.4)))} fill={OPENING} />
        )}
      </g>
    );
  };
  return (
    <g className="landmark landmark-gate">
      {walls(body, STONE)}
      <polygon points={polyPoints(body.top)} fill={shade(STONE, 0.92)} />
      {done && faceDetail(long, true)}
      {done && faceDetail(short, false)}
      {building && <Scaffold f={body} />}
      {share >= 1 && <Band col={p.col + 0.2} row={p.row + 0.2} w={p.w - 0.4} h={p.h - 0.4} z={fullBody} depth={up(1.3)} proud={0.1} />}
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
// Plan 75A): the campanile's shaft and belfry, the dome's podium (its drum
// and dome are round, and weather as stone does not show), the gate's body.
export function landmarkVolumes(t: Buildable, p: Plot): { col: number; row: number; w: number; h: number; base: number; height: number }[] {
  const H = wallHeightOf(t);
  if (t.id === 'LANDMARK-CAMPANILE' || t.id === 'AMENITY-BELLTOWER') {
    const plan = Math.min(p.w, p.h) * 0.44;
    return [{ col: p.col + (p.w - plan) / 2, row: p.row + (p.h - plan) / 2, w: plan, h: plan, base: 0, height: H * 0.74 }];
  }
  if (t.id === 'LANDMARK-DOME') return [{ col: p.col + 0.3, row: p.row + 0.3, w: p.w - 0.6, h: p.h - 0.6, base: 0, height: H * 0.1 }];
  return [{ col: p.col + 0.2, row: p.row + 0.2, w: p.w - 0.4, h: p.h - 0.4, base: 0, height: H * 0.8 }];
}

export default function Landmark({ t, p, developing }: { t: Buildable; p: Plot; developing: boolean }) {
  const weeksLeft = useContext(DevelopingContext)[t.id];
  const name = useContext(CollegeNameContext);
  const fraction = developing && weeksLeft !== undefined && t.duration > 0 ? (t.duration - weeksLeft) / t.duration : 1;
  const stage = developing ? Math.min(2, stageOf(fraction)) as Stage : 3;
  const share = STAGE_SHARE[stage];
  const building = developing;
  if (t.id === 'LANDMARK-CAMPANILE' || t.id === 'AMENITY-BELLTOWER') return <Campanile t={t} p={p} share={share} building={building} />;
  if (t.id === 'LANDMARK-DOME') return <GreatDome t={t} p={p} share={share} building={building} />;
  return <TriumphalGate t={t} p={p} share={share} building={building} name={name} />;
}
