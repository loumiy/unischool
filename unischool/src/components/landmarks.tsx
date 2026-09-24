import { useContext } from 'react';
import type { Buildable } from '../state/types';
import { boxFaces, facePoint, heightScale, lift, polyPoints, project, projectedCircle, type BoxFaces, type Pt } from './isoProjection';
import { faceTone } from './light';
import { shade } from './tint';
import { up } from './campusScale';
import { wallHeightOf } from './buildingSpec';
import { SCAFFOLD_PATTERN_ID } from './buildingMotifs';
import { DevelopingContext, CollegeNameContext } from './mapOccasions';

// The grand landmarks (Plan 25): a campanile, a great dome and a triumphal
// gate, each drawn bespoke and built in visible stages. While one goes up
// its countdown (DevelopingContext) picks the stage: footings, then the
// lower half, then all but the crown, each in scaffolding, and then the
// finished thing. Drawn in limestone whatever the vernacular: a landmark is
// a statement, not a neighbour.

const STONE = '#ddd3bd';
const STONE_DARK = '#b8ad95';
const ROOF = '#6c7a80';
const OPENING = '#3a3834';

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

// The near half of a ring of points, left to right.
function nearHalf(pts: Pt[]): Pt[] {
  const l = pts.reduce((a, q) => (q.x < a.x ? q : a));
  const r = pts.reduce((a, q) => (q.x > a.x ? q : a));
  return pts.filter((q) => q.y >= (l.y + r.y) / 2 - 0.01).sort((a, b) => a.x - b.x);
}

// A cylinder standing from z0 to z1 on a projected circle.
function Drum({ cc, cr, r, z0, z1, fill }: { cc: number; cr: number; r: number; z0: number; z1: number; fill: string }) {
  const ring = (z: number) => projectedCircle(cc, cr, r, 36).map((q) => lift(q, z));
  const bottom = ring(z0);
  const top = ring(z1);
  return (
    <>
      <polygon points={polyPoints([...nearHalf(bottom), ...nearHalf(top).reverse()])} fill={fill} stroke="rgba(60, 54, 44, 0.35)" strokeWidth={0.8} />
      <polygon points={polyPoints(top)} fill={shade(fill, 0.86)} />
    </>
  );
}

// A half-ellipse dome over a ring at height z, rising `rise` (authored at the
// default pitch).
function Dome({ cc, cr, r, z, rise, fill, lantern = false }: {
  cc: number; cr: number; r: number; z: number; rise: number; fill: string;
  // A small lantern and finial at the crown.
  lantern?: boolean;
}) {
  const ring = projectedCircle(cc, cr, r, 36).map((q) => lift(q, z));
  const l = ring.reduce((a, q) => (q.x < a.x ? q : a));
  const rr = ring.reduce((a, q) => (q.x > a.x ? q : a));
  const centre = lift(project(cc, cr), z);
  const rx = (rr.x - l.x) / 2;
  const ry = rise * heightScale() + rx * 0.25;
  const pts: string[] = [];
  for (let i = 0; i <= 24; i++) {
    const a = Math.PI + (i / 24) * Math.PI;
    pts.push(`${(centre.x + Math.cos(a) * rx).toFixed(2)},${(centre.y + Math.sin(a) * ry).toFixed(2)}`);
  }
  const apex = { x: centre.x, y: centre.y - ry };
  const lx = rx * 0.12;
  const lh = up(3.5) * heightScale() + lx * 0.6;
  return (
    <>
      <polygon points={pts.join(' ')} fill={fill} stroke="rgba(40, 44, 48, 0.4)" strokeWidth={0.8} />
      {lantern && (
        <>
          <rect x={apex.x - lx} y={apex.y - lh} width={lx * 2} height={lh + lx * 0.3} fill={STONE} stroke="rgba(60, 54, 44, 0.4)" strokeWidth={0.6} />
          <ellipse cx={apex.x} cy={apex.y - lh} rx={lx} ry={lx * 0.45} fill={shade(STONE, 0.86)} />
          <line x1={apex.x} y1={apex.y - lh} x2={apex.x} y2={apex.y - lh - up(3) * heightScale() - 4} stroke="#b89a4a" strokeWidth={1.4} />
        </>
      )}
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
  const shaft = boxFaces(c0, r0, plan, plan, 0, Math.min(shaftTop, H * share));
  const belfry = share > 0.6 ? boxFaces(c0 - 0.1, r0 - 0.1, plan + 0.2, plan + 0.2, shaftTop, Math.min(H * 0.14, H * share - shaftTop)) : null;
  const spireBase = shaftTop + H * 0.14;
  const apex = lift(project(c0 + plan / 2, r0 + plan / 2), H);
  return (
    <g className="landmark landmark-campanile">
      <polygon points={polyPoints(plinth.top)} fill={STONE_DARK} />
      {walls(shaft, STONE)}
      <polygon points={polyPoints(shaft.top)} fill={shade(STONE, 0.9)} />
      {building && <Scaffold f={shaft} />}
      {belfry && (
        <>
          {walls(belfry, STONE)}
          {/* The bell openings: a tall arch on each visible face. */}
          {[0, 1].map((i) => {
            const [a, b] = i === 0 ? [belfry.D, belfry.C] : [belfry.C, belfry.B];
            const hgt = H * 0.14;
            return (
              <polygon key={i} fill={OPENING} points={polyPoints([
                facePoint(a, b, hgt, 0.3, 0.15), facePoint(a, b, hgt, 0.7, 0.15),
                facePoint(a, b, hgt, 0.7, 0.72), facePoint(a, b, hgt, 0.5, 0.86), facePoint(a, b, hgt, 0.3, 0.72),
              ])} />
            );
          })}
          <polygon points={polyPoints(belfry.top)} fill={shade(STONE, 0.9)} />
        </>
      )}
      {share >= 1 && (
        // The spire: a pyramid from the belfry's top to the apex.
        (() => {
          const base = boxFaces(c0 - 0.1, r0 - 0.1, plan + 0.2, plan + 0.2, spireBase, 0);
          return (
            <>
              <polygon points={polyPoints([base.D, base.C, apex])} fill={faceTone(base.dir.CD, ROOF, shade(ROOF, 0.8))} />
              <polygon points={polyPoints([base.C, base.B, apex])} fill={faceTone(base.dir.BC, ROOF, shade(ROOF, 0.8))} />
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
  return (
    <g className="landmark landmark-dome">
      {walls(podium, STONE_DARK)}
      <polygon points={polyPoints(podium.top)} fill={STONE} />
      {share > 0.1 && <Drum cc={cc} cr={cr} r={r} z0={podiumH} z1={Math.min(drumTop, H * share)} fill={STONE} />}
      {building && share > 0.1 && (
        <polygon points={polyPoints([...nearHalf(projectedCircle(cc, cr, r, 36).map((q) => lift(q, podiumH))), ...nearHalf(projectedCircle(cc, cr, r, 36).map((q) => lift(q, Math.min(drumTop, H * share)))).reverse()])} fill={`url(#${SCAFFOLD_PATTERN_ID})`} />
      )}
      {share >= 0.85 && <Dome cc={cc} cr={cr} r={r * 1.02} z={drumTop} rise={H * 0.4} fill={share >= 1 ? '#8fa6a2' : STONE_DARK} lantern={share >= 1} />}
    </g>
  );
}

function TriumphalGate({ t, p, share, building, name }: { t: Buildable; p: Plot; share: number; building: boolean; name: string }) {
  const H = wallHeightOf(t);
  const bodyH = Math.min(H * 0.8, H * share);
  const body = boxFaces(p.col + 0.2, p.row + 0.2, p.w - 0.4, p.h - 0.4, 0, bodyH);
  const attic = share >= 1 ? boxFaces(p.col + 0.6, p.row + 0.4, p.w - 1.2, p.h - 0.8, H * 0.8, H * 0.2) : null;
  // The long face the camera sees carries the arch and the name.
  const long = body.spanLeft >= body.spanRight ? ([body.D, body.C] as const) : ([body.C, body.B] as const);
  const arch = (a: Pt, b: Pt) => {
    const pts: Pt[] = [facePoint(a, b, bodyH, 0.36, 0)];
    for (let i = 0; i <= 12; i++) {
      const ang = Math.PI - (i / 12) * Math.PI;
      pts.push(facePoint(a, b, bodyH, 0.5 + Math.cos(ang) * 0.14, Math.min(0.9, (H * 0.5) / bodyH) + Math.sin(ang) * Math.min(0.12, (H * 0.1) / bodyH)));
    }
    pts.push(facePoint(a, b, bodyH, 0.64, 0));
    return pts;
  };
  return (
    <g className="landmark landmark-gate">
      {walls(body, STONE)}
      <polygon points={polyPoints(body.top)} fill={shade(STONE, 0.92)} />
      {share >= 0.85 && <polygon points={polyPoints(arch(long[0], long[1]))} fill={OPENING} />}
      {building && <Scaffold f={body} />}
      {attic && (
        <>
          {walls(attic, STONE)}
          <polygon points={polyPoints(attic.top)} fill={shade(STONE, 0.92)} />
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

export default function Landmark({ t, p, developing }: { t: Buildable; p: Plot; developing: boolean }) {
  const weeksLeft = useContext(DevelopingContext)[t.id];
  const name = useContext(CollegeNameContext);
  const fraction = developing && weeksLeft !== undefined && t.duration > 0 ? (t.duration - weeksLeft) / t.duration : 1;
  const stage = developing ? Math.min(2, stageOf(fraction)) as Stage : 3;
  const share = STAGE_SHARE[stage];
  const building = developing;
  if (t.id === 'LANDMARK-CAMPANILE') return <Campanile t={t} p={p} share={share} building={building} />;
  if (t.id === 'LANDMARK-DOME') return <GreatDome t={t} p={p} share={share} building={building} />;
  return <TriumphalGate t={t} p={p} share={share} building={building} name={name} />;
}
