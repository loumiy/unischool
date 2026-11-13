// The campus radio station, the greenhouse and the observatory (Plan 127)
// each draw themselves, as the town's venues do (townVenues.tsx;
// buildingMotifs.tsx routes to them before the common frame, and a building
// still going up keeps the common site). They are the same in every
// architectural set:
//   - the radio station: a one-story brick studio with an ON AIR light over
//     its door and a dish on the roof, beside a tall lattice mast with red
//     lights, held by guy wires;
//   - the greenhouse: a Victorian glasshouse, white frames over glass, on a
//     low brick plinth, a long gabled house crossed by a taller transept,
//     with palms and ferns seen through the glass;
//   - the observatory: a white drum under a dome with its shutter open and
//     the telescope looking out, and a small entrance block at its front.
//
// Everything is set out in the building's own frame (facing.ts's localBox
// and localToGrid: u across the front from its left, d from the front
// back), so the plan keeps whichever way it is turned. The front door is
// at the middle of the front, where walkRoutes.ts walks to.

import { boxFaces, cameraAxes, facePoint, groundSquash, lift, polyPoints, project, type BoxFaces, type FaceDir, type Pt } from './isoProjection';
import { up } from './campusScale';
import { faceTone } from './light';
import { shade } from './tint';
import { occludes } from './depthSort';
import { frontDepth, frontWidth, localBox, localToGrid, sidesOf, type Plot } from './facing';

interface Box { col: number; row: number; w: number; h: number }
interface Wall { o: Pt; a: Pt; span: number; dir: FaceDir }

const P = (pts: Pt[]) => polyPoints(pts);
function quad(o: Pt, a: Pt, H: number, u0: number, u1: number, z0: number, z1: number): Pt[] {
  return [facePoint(o, a, H, u0, z0 / H), facePoint(o, a, H, u1, z0 / H), facePoint(o, a, H, u1, z1 / H), facePoint(o, a, H, u0, z1 / H)];
}
function seen(f: BoxFaces, dir: FaceDir): Wall | null {
  if (dir === f.dir.CD) return { o: f.D, a: f.C, span: f.spanLeft, dir };
  if (dir === f.dir.BC) return { o: f.C, a: f.B, span: f.spanRight, dir };
  return null;
}
function visibleWallsOf(f: BoxFaces): Wall[] {
  return [seen(f, f.dir.CD)!, seen(f, f.dir.BC)!];
}
function band(w: Wall, H: number, z0: number, z1: number, fill: string, key?: string, u0 = 0, u1 = 1) {
  return <polygon key={key} points={P(quad(w.o, w.a, H, u0, u1, z0, z1))} fill={fill} />;
}
function mass(f: BoxFaces, wall: string, top: string) {
  return (
    <>
      <polygon points={P(f.left)} fill={faceTone(f.dir.CD, wall, shade(wall, 0.84))} />
      <polygon points={P(f.right)} fill={faceTone(f.dir.BC, wall, shade(wall, 0.84))} />
      <polygon points={P(f.top)} fill={top} />
    </>
  );
}
function inOrder(parts: Array<{ box: Box; node: React.ReactNode }>) {
  return [...parts].sort((x, y) => occludes(x.box, y.box)).map((x, i) => <g key={i}>{x.node}</g>);
}
// A point in the building's own frame, `z` up, on the screen.
function at(p: Plot, u: number, d: number, z = 0): Pt {
  const g = localToGrid(p, u, d);
  return lift(project(g.col, g.row), z);
}
const mean = (pts: Pt[]) => pts.reduce((acc, q) => acc + q.y, 0) / pts.length;

const WHITE = '#f4f2ec';
const FRAME = '#fbfaf6';
const DARK = '#2a2421';

// ---------------------------------------------------------------------------
// The campus radio station.
// ---------------------------------------------------------------------------
const STUDIO_H = up(4.2);
const MAST_H = up(30);
const RADIO_BRICK = '#a4543a';
const ON_AIR = '#e8402f';
const MAST_RED = '#d8342a';

export function CampusRadio({ p }: { p: Plot }) {
  const W = frontWidth(p); const D = frontDepth(p);
  const front = sidesOf(p.facing).front;
  const studioBox = localBox(p, 0.15, 0.25, W * 0.7, D - 0.2);
  const studio = boxFaces(studioBox.col, studioBox.row, studioBox.w, studioBox.h, 0, STUDIO_H);
  const studioNode = (
    <>
      {mass(studio, RADIO_BRICK, '#8d9094')}
      {visibleWallsOf(studio).map((w, i) => {
        const isFront = w.dir === front;
        const n = Math.max(2, Math.round(w.span * 1.6));
        return (
          <g key={i}>
            {/* A parapet coping, and a ribbon of windows. */}
            {band(w, STUDIO_H, STUDIO_H - up(0.5), STUDIO_H, '#e6ddc8', 'cope')}
            {Array.from({ length: n }, (_, k) => {
              const u = (k + 0.5) / n;
              if (isFront && Math.abs(u - 0.5) < 0.18) return null;
              return band(w, STUDIO_H, up(1.1), up(3), '#9fc3d6', `win${k}`, u - 0.11, u + 0.11);
            })}
            {isFront && (
              <>
                <polygon points={P(quad(w.o, w.a, STUDIO_H, 0.42, 0.58, 0, up(2.6)))} fill="#3d4650" />
                <polygon points={P(quad(w.o, w.a, STUDIO_H, 0.5 - 0.004, 0.5 + 0.004, 0, up(2.6)))} fill="#9fc3d6" />
                {/* The ON AIR light over the door. */}
                <polygon points={P(quad(w.o, w.a, STUDIO_H, 0.36, 0.64, up(2.85), up(3.65)))} fill={DARK} />
                <polygon points={P(quad(w.o, w.a, STUDIO_H, 0.38, 0.62, up(2.95), up(3.55)))} fill={ON_AIR} />
                <polygon points={P(quad(w.o, w.a, STUDIO_H, 0.41, 0.59, up(3.15), up(3.35)))} fill="#ffd9c8" />
              </>
            )}
          </g>
        );
      })}
      {/* A dish on the roof, tipped to the sky. */}
      {(() => {
        const c = at(p, W * 0.25, D * 0.62, STUDIO_H + up(1.2));
        const foot = at(p, W * 0.25, D * 0.62, STUDIO_H);
        return (
          <>
            <line x1={foot.x} y1={foot.y} x2={c.x} y2={c.y} stroke="#6f7479" strokeWidth={1} />
            <ellipse cx={c.x} cy={c.y - 1.5} rx={4.2} ry={2.6} fill="#e9e8e3" stroke="#9a9d9f" strokeWidth={0.6} transform={`rotate(-25 ${c.x} ${c.y - 1.5})`} />
          </>
        );
      })()}
    </>
  );
  // The mast: a square lattice on a concrete pad at the right-hand back
  // corner, tapering as it climbs, braced, with red lights at its middle and
  // its top, and three guy wires down to anchors.
  const mu = W * 0.84; const md = D * 0.6;
  const mastBox = localBox(p, mu - 0.3, md - 0.3, mu + 0.3, md + 0.3);
  const legs = [[-0.2, -0.2], [0.2, -0.2], [0.2, 0.2], [-0.2, 0.2]] as const;
  const leg = (k: number, t: number) => {
    const [du, dd] = legs[k]!;
    const s = 1 - 0.85 * t;
    return at(p, mu + du * s, md + dd * s, MAST_H * t);
  };
  const steps = 12;
  const lines: React.JSX.Element[] = [];
  for (let k = 0; k < 4; k++) {
    const a0 = leg(k, 0); const a1 = leg(k, 1);
    lines.push(<line key={`l${k}`} x1={a0.x} y1={a0.y} x2={a1.x} y2={a1.y} stroke="#c9ccd0" strokeWidth={0.9} />);
    for (let i = 0; i < steps; i++) {
      const t0 = i / steps; const t1 = (i + 1) / steps;
      const q0 = leg(k, t0); const q1 = leg((k + 1) % 4, t1);
      lines.push(<line key={`b${k}-${i}`} x1={q0.x} y1={q0.y} x2={q1.x} y2={q1.y} stroke="#b9bcc0" strokeWidth={0.45} />);
    }
  }
  const top = at(p, mu, md, MAST_H + up(1.5));
  const mid = at(p, mu, md, MAST_H * 0.55);
  const anchors = [at(p, mu - 0.5, D - 0.15), at(p, W - 0.1, md - 0.6), at(p, mu - 0.2, 0.25)];
  const mastNode = (
    <>
      <polygon points={P(boxFaces(mastBox.col, mastBox.row, mastBox.w, mastBox.h, 0, up(0.3)).top)} fill="#b8b4aa" />
      {anchors.map((q, i) => {
        const hi = at(p, mu, md, MAST_H * 0.72);
        return <line key={`g${i}`} x1={q.x} y1={q.y} x2={hi.x} y2={hi.y} stroke="rgba(60, 60, 64, 0.55)" strokeWidth={0.4} />;
      })}
      {lines}
      <line x1={leg(0, 1).x} y1={leg(0, 1).y} x2={top.x} y2={top.y} stroke="#c9ccd0" strokeWidth={0.8} />
      {[top, mid].map((q, i) => <circle key={`r${i}`} cx={q.x} cy={q.y} r={1.6} fill={MAST_RED} stroke="#7a1a14" strokeWidth={0.4} />)}
    </>
  );
  return <g className="campus-radio">{inOrder([{ box: studioBox, node: studioNode }, { box: mastBox, node: mastNode }])}</g>;
}

// ---------------------------------------------------------------------------
// The greenhouse.
// ---------------------------------------------------------------------------
const PLINTH = up(1);
const EAVE = up(4.4);
const RIDGE = up(7.2);
const TRANSEPT_EAVE = up(5.6);
const TRANSEPT_RIDGE = up(9.6);
const GLASS = 'rgba(190, 226, 224, 0.32)';
const GLASS_ROOF = 'rgba(206, 234, 234, 0.42)';
const PALM = '#4f9a3c';
const FERN = '#3e7a34';

// A glass house, its ridge along u: its plinth, the plants inside, then its
// glass, far faces first, with white glazing bars.
function glassHouse(p: Plot, u0: number, d0: number, u1: number, d1: number, eave: number, ridge: number, ridgeAlongU: boolean, plants: React.ReactNode) {
  const box = localBox(p, u0, d0, u1, d1);
  const plinth = boxFaces(box.col, box.row, box.w, box.h, 0, PLINTH);
  const um = (u0 + u1) / 2; const dm = (d0 + d1) / 2;
  // The house's eight corners at the eaves, and the ridge's two ends.
  const c = (u: number, d: number, z: number) => at(p, u, d, z);
  const corners = { a: [u0, d0], b: [u1, d0], c: [u1, d1], e: [u0, d1] } as const;
  const r0 = ridgeAlongU ? c(u0, dm, ridge) : c(um, d0, ridge);
  const r1 = ridgeAlongU ? c(u1, dm, ridge) : c(um, d1, ridge);
  // Walls (PLINTH to eave) and roof faces, each with its glazing bars.
  type Face = { pts: Pt[]; bars: Array<[Pt, Pt]>; fill: string };
  const faces: Face[] = [];
  const wall = (p0: readonly [number, number], p1: readonly [number, number]) => {
    const pts = [c(p0[0], p0[1], PLINTH), c(p1[0], p1[1], PLINTH), c(p1[0], p1[1], eave), c(p0[0], p0[1], eave)];
    const len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
    const n = Math.max(2, Math.round(len * 2.5));
    const bars: Array<[Pt, Pt]> = [];
    for (let k = 0; k <= n; k++) {
      const t = k / n;
      const u = p0[0] + (p1[0] - p0[0]) * t; const d = p0[1] + (p1[1] - p0[1]) * t;
      bars.push([c(u, d, PLINTH), c(u, d, eave)]);
    }
    bars.push([pts[0]!, pts[1]!], [pts[3]!, pts[2]!]);
    // A transom across the glass.
    bars.push([c(p0[0], p0[1], (PLINTH + eave) * 0.62), c(p1[0], p1[1], (PLINTH + eave) * 0.62)]);
    faces.push({ pts, bars, fill: GLASS });
  };
  wall(corners.a, corners.b); wall(corners.b, corners.c); wall(corners.c, corners.e); wall(corners.e, corners.a);
  // The two slopes and the two gable ends.
  const E = (k: readonly [number, number]) => c(k[0], k[1], eave);
  const slope = (k0: readonly [number, number], k1: readonly [number, number], ra: Pt, rb: Pt) => {
    const pts = [E(k0), E(k1), rb, ra];
    const n = 6; const bars: Array<[Pt, Pt]> = [];
    for (let k = 0; k <= n; k++) {
      const t = k / n;
      const e = { x: pts[0]!.x + (pts[1]!.x - pts[0]!.x) * t, y: pts[0]!.y + (pts[1]!.y - pts[0]!.y) * t };
      const r = { x: ra.x + (rb.x - ra.x) * t, y: ra.y + (rb.y - ra.y) * t };
      bars.push([e, r]);
    }
    bars.push([pts[0]!, pts[1]!], [ra, rb]);
    faces.push({ pts, bars, fill: GLASS_ROOF });
  };
  const gable = (k0: readonly [number, number], k1: readonly [number, number], r: Pt) => {
    const pts = [E(k0), E(k1), r];
    faces.push({ pts, bars: [[E(k0), r], [E(k1), r], [{ x: (E(k0).x + E(k1).x) / 2, y: (E(k0).y + E(k1).y) / 2 }, r]], fill: GLASS_ROOF });
  };
  if (ridgeAlongU) {
    slope(corners.a, corners.b, r0, r1); slope(corners.e, corners.c, r0, r1);
    gable(corners.a, corners.e, r0); gable(corners.b, corners.c, r1);
  } else {
    slope(corners.a, corners.e, r0, r1); slope(corners.b, corners.c, r0, r1);
    gable(corners.a, corners.b, r0); gable(corners.e, corners.c, r1);
  }
  // The beds: shrubs set out over the floor, far ones first.
  const shrubs: Array<{ q: Pt; k: number }> = [];
  for (let u = u0 + 0.3; u < u1 - 0.1; u += 0.45) {
    for (let d = d0 + 0.3; d < d1 - 0.1; d += 0.45) shrubs.push({ q: c(u, d, PLINTH), k: Math.round((u * 7 + d * 13) * 10) % 3 });
  }
  shrubs.sort((x, y) => x.q.y - y.q.y);
  const beds = shrubs.map(({ q, k }, i) => (
    <ellipse key={`sh${i}`} cx={q.x} cy={q.y - 2} rx={6} ry={3.4} fill={['#3e7a34', '#4f8f3c', '#5f9e46'][k]} />
  ));
  // Far faces first: a face lower on the screen is nearer the camera.
  faces.sort((x, y) => mean(x.pts) - mean(y.pts));
  const node = (
    <>
      {mass(plinth, '#9a5a44', '#6a5d40')}
      {beds}
      {plants}
      {faces.map((f, i) => (
        <g key={i}>
          <polygon points={P(f.pts)} fill={f.fill} />
          {f.bars.map(([x, y], k) => <line key={k} x1={x.x} y1={x.y} x2={y.x} y2={y.y} stroke={FRAME} strokeWidth={0.7} />)}
        </g>
      ))}
      {/* A finial at each end of the ridge. */}
      {[r0, r1].map((q, i) => <circle key={`fin${i}`} cx={q.x} cy={q.y - 1.2} r={1.1} fill={FRAME} stroke="#c9c6bc" strokeWidth={0.4} />)}
    </>
  );
  return { box, node };
}

// Palms and ferns inside the glass: a trunk and a crown of fronds, set on
// the floor in the building's own frame.
function plantsIn(p: Plot, spots: Array<[number, number, number]>) {
  const sorted = [...spots].sort((x, y) => at(p, x[0], x[1]).y - at(p, y[0], y[1]).y);
  return (
    <>
      {sorted.map(([u, d, h], i) => {
        const foot = at(p, u, d, PLINTH);
        const crown = at(p, u, d, PLINTH + h);
        return (
          <g key={i}>
            <ellipse cx={foot.x} cy={foot.y - 2} rx={8} ry={4} fill={FERN} />
            <line x1={foot.x} y1={foot.y} x2={crown.x} y2={crown.y} stroke="#7a5a3a" strokeWidth={1.6} />
            {[-1, -0.5, 0, 0.5, 1].map((k) => (
              <ellipse key={k} cx={crown.x + k * 6} cy={crown.y + Math.abs(k) * 2.6} rx={6.5} ry={2.2} fill={k === 0 ? PALM : shade(PALM, k < 0 ? 1.15 : 0.9)} transform={`rotate(${k * 30} ${crown.x + k * 6} ${crown.y + Math.abs(k) * 2.6})`} />
            ))}
            <circle cx={foot.x + 5} cy={foot.y - 2.5} r={1.4} fill="#e46a8a" />
            <circle cx={foot.x - 4} cy={foot.y - 1.5} r={1.2} fill="#f2c94c" />
          </g>
        );
      })}
    </>
  );
}

export function Greenhouse({ p }: { p: Plot }) {
  const W = frontWidth(p); const D = frontDepth(p);
  const front = sidesOf(p.facing).front;
  // The long house down the width, and the transept across its middle,
  // reaching from the front to the back, taller, with the door in its end.
  const longU0 = 0.2; const longU1 = W - 0.2; const longD0 = D * 0.24; const longD1 = D * 0.8;
  const tu0 = W / 2 - 0.75; const tu1 = W / 2 + 0.75;
  const left = glassHouse(p, longU0, longD0, tu0, longD1, EAVE, RIDGE, true,
    plantsIn(p, [[W * 0.14, D * 0.45, up(4.6)], [W * 0.26, D * 0.62, up(3.6)]]));
  const right = glassHouse(p, tu1, longD0, longU1, longD1, EAVE, RIDGE, true,
    plantsIn(p, [[W * 0.74, D * 0.42, up(3.8)], [W * 0.86, D * 0.62, up(4.8)]]));
  const transept = glassHouse(p, tu0, 0.1, tu1, D - 0.1, TRANSEPT_EAVE, TRANSEPT_RIDGE, false,
    plantsIn(p, [[W / 2, D * 0.55, up(7.2)]]));
  // The door at the transept's front end: a white double door with a fanlight.
  const fb = localBox(p, tu0, 0.1, tu1, D - 0.1);
  const ff = boxFaces(fb.col, fb.row, fb.w, fb.h, 0, TRANSEPT_EAVE);
  const fw = seen(ff, front);
  const door = fw && (
    <g>
      {band(fw, TRANSEPT_EAVE, 0, up(2.8), FRAME, 'df', 0.36, 0.64)}
      {band(fw, TRANSEPT_EAVE, up(0.1), up(2.6), '#7fa9a6', 'dg', 0.39, 0.61)}
      {band(fw, TRANSEPT_EAVE, up(0.1), up(2.6), FRAME, 'dm', 0.497, 0.503)}
    </g>
  );
  // The two wings either side of the transept, painted by depth.
  return (
    <g className="campus-greenhouse">
      {inOrder([left, right, { box: transept.box, node: <>{transept.node}{door}</> }])}
    </g>
  );
}

// ---------------------------------------------------------------------------
// The observatory.
// ---------------------------------------------------------------------------
const DRUM_H = up(5.2);
const OBS_WALL = '#efece4';
const DOME = '#e3e6ea';
const SLIT = '#2b333d';

export function Observatory({ p }: { p: Plot }) {
  const W = frontWidth(p); const D = frontDepth(p);
  const front = sidesOf(p.facing).front;
  const cu = W / 2; const cd = D * 0.58;
  const R = Math.min(W, D) * 0.36;
  const g = localToGrid(p, cu, cd);
  // A circle on the grid round the drum's axis, `z` up.
  const ring = (radius: number, z: number, n = 40): Pt[] => Array.from({ length: n }, (_, k) => {
    const t = (k / n) * Math.PI * 2;
    return lift(project(g.col + Math.cos(t) * radius, g.row + Math.sin(t) * radius), z);
  });
  // The drum's side: the near half of its foot, then the near half of its
  // top back again; the near half is the lower half on the screen.
  const base = ring(R, 0); const top = ring(R, DRUM_H);
  const lowest = (pts: Pt[]) => pts.reduce((best, q, i) => (q.y > pts[best]!.y ? i : best), 0);
  const leftmost = base.reduce((best, q, i) => (q.x < base[best]!.x ? i : best), 0);
  const rightmost = base.reduce((best, q, i) => (q.x > base[best]!.x ? i : best), 0);
  const arc = (pts: Pt[], from: number, to: number) => {
    const out: Pt[] = [];
    const n = pts.length;
    // Walk the way that passes the lowest point.
    const lo = lowest(pts);
    const forward = ((lo - from + n) % n) <= ((to - from + n) % n);
    for (let i = from; ; i = (i + (forward ? 1 : n - 1)) % n) { out.push(pts[i]!); if (i === to) break; }
    return out;
  };
  const sideNear = [...arc(base, leftmost, rightmost), ...arc(top, leftmost, rightmost).reverse()];
  const lo = lowest(base);
  const leftHalf = [...arc(base, leftmost, lo), ...arc(top, leftmost, lo).reverse()];
  // The dome: stacked rings, each smaller and lighter, from the drum's top
  // to its crown.
  const rings = 9;
  const domeRings = Array.from({ length: rings }, (_, i) => {
    const phi = (i / rings) * (Math.PI / 2);
    return { pts: ring(R * 1.04 * Math.cos(phi), DRUM_H + up(0.3) + R * 1.04 * Math.sin(phi) * up(7.5), 36), tone: 0.86 + 0.16 * (i / rings) };
  });
  // The shutter: a band from the drum to near the crown, pointing over the
  // entrance (the building's front), and the telescope looking out of it.
  // It is fixed in the building's frame, so it goes round the dome as the
  // camera turns: drawn only where the dome's surface faces the camera
  // (full on the near side, narrowing toward the limb, hidden behind).
  const fg = localToGrid(p, cu, 0);
  const tf = Math.atan2(fg.row - g.row, fg.col - g.col);
  const { cosA, sinA } = cameraAxes();
  const sinE = groundSquash(); const cosE = Math.sqrt(Math.max(0, 1 - sinE * sinE));
  const facesCamera = (t: number, phi: number) => cosE * Math.cos(phi) * (Math.cos(t) * sinA + Math.sin(t) * cosA) + sinE * Math.sin(phi) > 0.02;
  const slitPt = (phi: number, side: number) => {
    const r = R * 1.05 * Math.cos(phi);
    const t = tf + side * (0.16 / Math.max(0.3, Math.cos(phi)));
    return lift(project(g.col + Math.cos(t) * r, g.row + Math.sin(t) * r), DRUM_H + up(0.3) + R * 1.05 * Math.sin(phi) * up(7.5));
  };
  const slitPhis = Array.from({ length: 12 }, (_, i) => (i / 11) * (Math.PI / 2) * 0.92);
  // The longest run of samples whose both edges face the camera.
  const seenRun = (() => {
    let best: number[] = []; let cur: number[] = [];
    slitPhis.forEach((ph, i) => {
      const dt = 0.16 / Math.max(0.3, Math.cos(ph));
      if (facesCamera(tf - dt, ph) && facesCamera(tf + dt, ph)) { cur.push(i); if (cur.length > best.length) best = [...cur]; } else cur = [];
    });
    return best.map((i) => slitPhis[i]!);
  })();
  const slit = seenRun.length >= 2
    ? [...seenRun.map((ph) => slitPt(ph, -1)), ...[...seenRun].reverse().map((ph) => slitPt(ph, 1))]
    : null;
  const scopePhi = Math.PI * 0.3;
  const scopeSeen = facesCamera(tf, scopePhi) && facesCamera(tf, 0.12);
  const scopeFoot = lift(project(g.col, g.row), DRUM_H + R * up(7.5) * 0.35);
  const scopeTip = slitPt(scopePhi, 0);
  const scopeOut = { x: scopeTip.x + (scopeTip.x - scopeFoot.x) * 0.45, y: scopeTip.y + (scopeTip.y - scopeFoot.y) * 0.45 };
  const drumNode = (
    <>
      <polygon points={P(sideNear)} fill={shade(OBS_WALL, 0.84)} />
      <polygon points={P(leftHalf)} fill={OBS_WALL} />
      {/* A cornice band at the drum's top. */}
      <polygon points={P(top)} fill={shade(OBS_WALL, 0.92)} />
      {domeRings.map((rg, i) => <polygon key={i} points={P(rg.pts)} fill={shade(DOME, rg.tone)} />)}
      {slit && <polygon points={P(slit)} fill={SLIT} />}
      {slit && scopeSeen && (
        <>
          <line x1={scopeTip.x} y1={scopeTip.y} x2={scopeOut.x} y2={scopeOut.y} stroke="#c7ccd2" strokeWidth={2.4} strokeLinecap="round" />
          <line x1={scopeTip.x} y1={scopeTip.y} x2={scopeOut.x} y2={scopeOut.y} stroke="#6c7480" strokeWidth={1} strokeLinecap="round" />
        </>
      )}
    </>
  );
  // The entrance block at the front, white, flat-roofed, with the door.
  const entryBox = localBox(p, cu - 0.55, 0.15, cu + 0.55, cd - R * 0.6);
  const entry = boxFaces(entryBox.col, entryBox.row, entryBox.w, entryBox.h, 0, up(3.4));
  const ew = seen(entry, front);
  const entryNode = (
    <>
      {mass(entry, WHITE, shade(WHITE, 0.9))}
      {visibleWallsOf(entry).map((w, i) => band(w, up(3.4), up(2.9), up(3.4), shade(WHITE, 0.78), `ec${i}`))}
      {ew && band(ew, up(3.4), 0, up(2.5), '#3d4650', 'door', 0.34, 0.66)}
    </>
  );
  // The entrance runs into the drum's foot, so the two are painted by
  // which middle is nearer the camera, not by their boxes.
  const entryFirst = at(p, cu, 0.15 + (cd - R * 0.6 - 0.15) / 2).y < at(p, cu, cd).y;
  return (
    <g className="campus-observatory">
      {entryFirst ? <>{entryNode}{drumNode}</> : <>{drumNode}{entryNode}</>}
    </g>
  );
}
