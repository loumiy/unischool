// Two small places to eat beside the dining halls (Plan 127): the Coffee
// Kiosk and the Food Truck Plaza. Each is open ground in two halves, as
// groundMarkings.tsx's are: the paving (drawn in the flat pass, under every
// mass) and what stands on it (depth-sorted like any mass), routed there by
// GroundMarking and groundProps.
//
// Both are laid out in the plot's own u (along col) and v (along row),
// 0..1, the kiosk's counter on its +row side; the trucks along the plot's
// two long sides, their hatches toward the tables in the middle.

import type React from 'react';
import { boxFaces, cameraAxes, facePoint, lift, polyPoints, project, projectedCircle, wallOf, type BoxFaces, type FaceDir, type Pt } from './isoProjection';
import { up } from './campusScale';
import { sidesOf } from './facing';
import type { Facing } from '../state/types';
import { shade } from './tint';
import type { GroundProp } from './groundMarkings';

interface Plot { col: number; row: number; w: number; h: number }
const P = (pts: Pt[]) => polyPoints(pts);

const PAVING = '#d8cfbd';
const PAVING_EDGE = '#b9ad95';
const PAVING_JOINT = '#c9bfab';
const DARK = '#2f3438';
const BULB = '#ffd36b';
const WOOD = '#9b6b43';

// A box in three tones from one colour: lit top, the two walls in shade.
function solid(f: BoxFaces, color: string, key?: string): React.JSX.Element {
  return (
    <g key={key}>
      <polygon points={P(f.left)} fill={shade(color, 0.86)} />
      <polygon points={P(f.right)} fill={shade(color, 0.74)} />
      <polygon points={P(f.top)} fill={shade(color, 1.04)} />
    </g>
  );
}

// A quad on one wall of a box, between u0..u1 along it and v0..v1 up it,
// if the camera sees that wall.
function onWall(f: BoxFaces, dir: FaceDir, height: number, u0: number, u1: number, v0: number, v1: number, fill: string, key: string): React.JSX.Element | null {
  const wall = wallOf(f, dir);
  if (!wall.visible) return null;
  const at = (u: number, v: number) => facePoint(wall.origin, wall.along, height, u, v);
  return <polygon key={key} points={P([at(u0, v0), at(u1, v0), at(u1, v1), at(u0, v1)])} fill={fill} />;
}

// The paving: a square of stone flags with a darker kerb and its joints.
function paving(p: Plot, joints: number): React.JSX.Element {
  const f = boxFaces(p.col, p.row, p.w, p.h, 0, 0);
  const lines: React.JSX.Element[] = [];
  for (let i = 1; i < joints; i++) {
    const c = p.col + (p.w * i) / joints; const r = p.row + (p.h * i) / joints;
    const a = project(c, p.row); const b = project(c, p.row + p.h);
    const d = project(p.col, r); const e = project(p.col + p.w, r);
    lines.push(<line key={`c${i}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={PAVING_JOINT} strokeWidth={0.6} />);
    lines.push(<line key={`r${i}`} x1={d.x} y1={d.y} x2={e.x} y2={e.y} stroke={PAVING_JOINT} strokeWidth={0.6} />);
  }
  return (
    <>
      <polygon points={P(f.top)} fill={PAVING} stroke={PAVING_EDGE} strokeWidth={1.2} />
      {lines}
    </>
  );
}

// A round table with a parasol over it, at grid (c, r).
function cafeTable(c: number, r: number, canopy: string, key: string): GroundProp {
  const top = projectedCircle(c, r, 0.13, 12).map((q) => lift(q, up(0.75)));
  const shadeDisc = projectedCircle(c, r, 0.22, 14).map((q) => lift(q, up(2.3)));
  const foot = project(c, r);
  const head = lift(foot, up(2.5));
  const chair = (dc: number, dr: number, k: string) => solid(boxFaces(c + dc - 0.05, r + dr - 0.05, 0.1, 0.1, 0, up(0.45)), '#5b4a3a', k);
  return {
    key, col: c - 0.3, row: r - 0.3, w: 0.6, h: 0.6,
    node: (
      <g>
        {chair(-0.2, 0, 'a')}
        {chair(0, -0.2, 'b')}
        <line x1={foot.x} y1={foot.y} x2={head.x} y2={head.y} stroke="#6b6f74" strokeWidth={0.8} />
        <polygon points={P(top)} fill="#f2ede2" stroke="#9a9384" strokeWidth={0.4} />
        {chair(0.2, 0, 'c')}
        {chair(0, 0.2, 'd')}
        <polygon points={P(shadeDisc)} fill={canopy} stroke={shade(canopy, 0.7)} strokeWidth={0.5} />
        <polygon points={P(projectedCircle(c, r, 0.05, 8).map((q) => lift(q, up(2.55))))} fill={shade(canopy, 0.7)} />
      </g>
    ),
    shadows: [projectedCircle(c + 0.12, r + 0.12, 0.28, 12)],
  };
}

// ---------------------------------------------------------------------
// The Coffee Kiosk: a cream booth on a square of flags, its counter under
// a red-and-white awning on the +row side, a coffee cup on a pole over its
// roof, and two café tables with parasols in front.
// ---------------------------------------------------------------------
const KIOSK_WALL = '#efe3c8';
const KIOSK_ROOF = '#5e4335';
const AWNING_RED = '#c8423a';
const AWNING_WHITE = '#f3ece0';

export function KioskGround(p: Plot) {
  return <>{paving(p, Math.max(2, Math.round(p.w * 2)))}</>;
}

export function kioskProps(p: Plot, facing?: Facing): GroundProp[] {
  // The kiosk's own frame: u across its front (0 at its left, as one
  // facing the counter sees it, to 1 at its right), v from its back (0) to
  // its front (1), turned to the placement's facing so the counter, the
  // awning, the tables and the cup sign go round with it.
  const sides = sidesOf(facing);
  const F = sides.front;
  const g = (u: number, v: number): [number, number] => {
    switch (F) {
      case 'posRow': return [p.col + u * p.w, p.row + v * p.h];
      case 'negRow': return [p.col + (1 - u) * p.w, p.row + (1 - v) * p.h];
      case 'posCol': return [p.col + v * p.w, p.row + (1 - u) * p.h];
      default: return [p.col + (1 - v) * p.w, p.row + u * p.h];
    }
  };
  const at = (u: number, v: number, z: number) => { const [c, r] = g(u, v); return lift(project(c, r), z); };
  const boxOf = (u0: number, u1: number, v0: number, v1: number) => {
    const [ca, ra] = g(u0, v0); const [cb, rb] = g(u1, v1);
    return { col: Math.min(ca, cb), row: Math.min(ra, rb), w: Math.abs(cb - ca), h: Math.abs(rb - ra) };
  };
  // The booth, in fractions of the plot: centred across, its back third.
  const across = Math.min(p.w, p.h);
  const bu = Math.min(0.9, across * 0.45) / across; const bv = Math.min(0.66, across * 0.33) / across;
  const u0 = 0.5 - bu / 2; const u1 = 0.5 + bu / 2; const v0 = 0.3 - bv / 2; const v1 = 0.3 + bv / 2;
  const b = boxOf(u0, u1, v0, v1);
  const H = up(3.2);
  const f = boxFaces(b.col, b.row, b.w, b.h, 0, H);
  const roof = boxFaces(b.col - 0.05, b.row - 0.05, b.w + 0.1, b.h + 0.1, H, up(0.35));
  // The awning: from the counter's head out over the paving, in stripes.
  const out = 0.3 / across; const n = 6;
  const stripe = (i: number) => [u0 + (bu * i) / n, u0 + (bu * (i + 1)) / n];
  const stripes = Array.from({ length: n }, (_, i) => {
    const [a0, a1] = stripe(i);
    const pts = [at(a0, v1, up(2.7)), at(a1, v1, up(2.7)), at(a1, v1 + out, up(2.1)), at(a0, v1 + out, up(2.1))];
    return <polygon key={i} points={P(pts)} fill={i % 2 === 0 ? AWNING_RED : AWNING_WHITE} stroke={shade(AWNING_RED, 0.75)} strokeWidth={0.3} />;
  });
  const valance = Array.from({ length: n }, (_, i) => {
    const [a0, a1] = stripe(i);
    const pts = [at(a0, v1 + out, up(2.1)), at(a1, v1 + out, up(2.1)), at(a1, v1 + out, up(1.75)), at(a0, v1 + out, up(1.75))];
    return <polygon key={`v${i}`} points={P(pts)} fill={i % 2 === 0 ? AWNING_RED : AWNING_WHITE} />;
  });
  // Is the counter's side toward the camera? Then the awning stands in
  // front of the booth; otherwise behind it.
  const counterSeen = wallOf(f, F).visible;
  const awning = <g key="awning">{stripes}{valance}</g>;
  // The cup: a cut-out sign on a pole over the roof's middle, standing in
  // the plane of the counter, so it turns and foreshortens with the booth
  // as the camera goes round (from behind, its handle is on the other side,
  // as a real cut-out's would be).
  const um = 0.5; const vm = (v0 + v1) / 2;
  const base = H + up(0.35);
  const poleTop = base + up(2.4);
  const cupW = 0.34 / across; const cupH = up(2.2);
  const sign = (du: number, z: number) => at(um + du, vm, poleTop + z);
  const half = cupW / 2;
  const body = [sign(-half, cupH), sign(half, cupH), sign(half * 0.8, 0), sign(-half * 0.8, 0)];
  const band = [sign(-half * 0.95, cupH * 0.62), sign(half * 0.95, cupH * 0.62), sign(half * 0.9, cupH * 0.4), sign(-half * 0.9, cupH * 0.4)];
  const handle = Array.from({ length: 9 }, (_, i) => {
    const t = -Math.PI / 2 + (Math.PI * i) / 8;
    return sign(half * 0.93 + Math.cos(t) * cupW * 0.28, cupH * 0.55 + Math.sin(t) * cupH * 0.22);
  });
  const steam = [-0.2, 0.2].map((k) => [0, 1, 2, 3].map((i) => sign(half * k + Math.sin(i * 1.6) * cupW * 0.08, cupH + up(0.15) + i * up(0.22))));
  const foot = at(um, vm, base); const head = sign(0, 0);
  const cup = (
    <g key="cup">
      <line x1={foot.x} y1={foot.y} x2={head.x} y2={head.y} stroke="#4b4f54" strokeWidth={0.9} />
      <polyline points={P(handle)} fill="none" stroke="#f7f3ea" strokeWidth={1.1} />
      <polygon points={P(body)} fill="#f7f3ea" stroke="#6b4a3a" strokeWidth={0.5} />
      <polygon points={P(band)} fill="#7a4b2c" />
      {steam.map((pts, i) => <polyline key={i} points={P(pts)} fill="none" stroke="#ffffff" strokeWidth={0.6} opacity={0.8} />)}
    </g>
  );
  const booth = (
    <g key="booth">
      {solid(f, KIOSK_WALL)}
      {/* The counter's hatch, lit inside, and a menu board on each side. */}
      {onWall(f, F, H, 0.12, 0.88, 0.32, 0.78, '#3a3027', 'hatch')}
      {onWall(f, F, H, 0.12, 0.88, 0.3, 0.34, '#8a6a4a', 'sill')}
      {onWall(f, sides.left, H, 0.25, 0.75, 0.4, 0.75, DARK, 'menuL')}
      {onWall(f, sides.right, H, 0.25, 0.75, 0.4, 0.75, DARK, 'menuR')}
      {solid(roof, KIOSK_ROOF)}
    </g>
  );
  // The prop covers the booth and its awning, for the depth sort.
  const pb = boxOf(u0, u1, v0, v1 + out);
  const sh = b;
  const t1 = g(0.28, 0.78); const t2 = g(0.72, 0.78);
  return [
    {
      key: 'booth', ...pb,
      node: <g>{counterSeen ? <>{booth}{awning}</> : <>{awning}{booth}</>}{cup}</g>,
      shadows: [[project(sh.col + 0.15, sh.row + 0.15), project(sh.col + sh.w + 0.4, sh.row + 0.15), project(sh.col + sh.w + 0.4, sh.row + sh.h + 0.4), project(sh.col + 0.15, sh.row + sh.h + 0.4)]],
    },
    cafeTable(t1[0], t1[1], '#c8423a', 't1'),
    cafeTable(t2[0], t2[1], '#2f6f4f', 't2'),
  ];
}

// ---------------------------------------------------------------------
// The Food Truck Plaza: a paved square, four trucks in four colours parked
// two to a long side with their hatches toward the middle, picnic tables
// between them, and strings of lights on posts over it all.
// ---------------------------------------------------------------------
const TRUCKS = ['#d9534f', '#3a7fc4', '#f0b429', '#4e9a5b'];

function framer(p: Plot) {
  const landscape = p.w >= p.h;
  const L = landscape ? p.w : p.h; const S = landscape ? p.h : p.w;
  // A plan box from fractions along (a) and across (c) as {col,row,w,h}.
  const box = (a0: number, a1: number, c0: number, c1: number) => (landscape
    ? { col: p.col + p.w * a0, row: p.row + p.h * c0, w: p.w * (a1 - a0), h: p.h * (c1 - c0) }
    : { col: p.col + p.w * c0, row: p.row + p.h * a0, w: p.w * (c1 - c0), h: p.h * (a1 - a0) });
  const g = (a: number, c: number): [number, number] => (landscape ? [p.col + p.w * a, p.row + p.h * c] : [p.col + p.w * c, p.row + p.h * a]);
  // The wall of a box that faces +c (across), as a grid direction.
  const towardPlusC: FaceDir = landscape ? 'posRow' : 'posCol';
  const towardMinusC: FaceDir = landscape ? 'negRow' : 'negCol';
  return { landscape, L, S, box, g, towardPlusC, towardMinusC };
}

export function TrucksGround(p: Plot) {
  return <>{paving(p, Math.max(3, Math.round(Math.max(p.w, p.h))))}</>;
}

export function trucksProps(p: Plot): GroundProp[] {
  const fr = framer(p);
  const props: GroundProp[] = [];
  // The trucks: about 8 m by 2.7 m, a lower cab at the outer end.
  const len = Math.min(0.32, 0.95 / fr.L); const wid = Math.min(0.12, 0.32 / fr.S);
  const slots: Array<{ a: number; side: 0 | 1 }> = [{ a: 0.28, side: 0 }, { a: 0.72, side: 0 }, { a: 0.28, side: 1 }, { a: 0.72, side: 1 }];
  slots.forEach(({ a, side }, i) => {
    const color = TRUCKS[i % TRUCKS.length]!;
    const c0 = side === 0 ? 0.06 : 0.94 - wid;
    const cabAtLow = a < 0.5;
    const bodyA0 = cabAtLow ? a - len / 2 + len * 0.26 : a - len / 2;
    const bodyA1 = cabAtLow ? a + len / 2 : a + len / 2 - len * 0.26;
    const cabA0 = cabAtLow ? a - len / 2 : bodyA1;
    const cabA1 = cabAtLow ? bodyA0 : a + len / 2;
    const body = fr.box(bodyA0, bodyA1, c0, c0 + wid);
    const cab = fr.box(cabA0, cabA1, c0 + wid * 0.08, c0 + wid * 0.92);
    const H = up(3.1); const HC = up(2.3);
    const fb = boxFaces(body.col, body.row, body.w, body.h, up(0.4), H - up(0.4));
    const fc = boxFaces(cab.col, cab.row, cab.w, cab.h, up(0.4), HC - up(0.4));
    const chassis = fr.box(cabA0 + 0.005, Math.max(bodyA1, cabA1) - 0.005, c0 + wid * 0.15, c0 + wid * 0.85);
    const fch = boxFaces(chassis.col, chassis.row, chassis.w, chassis.h, 0, up(0.4));
    // The hatch faces the tables: +c for the near side's trucks, -c for the far.
    const hatchDir = side === 0 ? fr.towardPlusC : fr.towardMinusC;
    const hatchWall = wallOf(fb, hatchDir);
    // Along the hatch wall, u runs one way or the other; the hatch sits in
    // its middle either way.
    const hatch = onWall(fb, hatchDir, H - up(0.4), 0.18, 0.82, 0.38, 0.78, DARK, 'hatch');
    const awningOut = 0.05;
    const awning = hatchWall.visible ? (() => {
      const [x0, y0] = fr.g(bodyA0 + (bodyA1 - bodyA0) * 0.15, side === 0 ? c0 + wid : c0);
      const [x1, y1] = fr.g(bodyA0 + (bodyA1 - bodyA0) * 0.85, side === 0 ? c0 + wid : c0);
      const [x2, y2] = fr.g(bodyA0 + (bodyA1 - bodyA0) * 0.85, side === 0 ? c0 + wid + awningOut : c0 - awningOut);
      const [x3, y3] = fr.g(bodyA0 + (bodyA1 - bodyA0) * 0.15, side === 0 ? c0 + wid + awningOut : c0 - awningOut);
      return <polygon key="aw" points={P([lift(project(x0, y0), up(2.75)), lift(project(x1, y1), up(2.75)), lift(project(x2, y2), up(2.35)), lift(project(x3, y3), up(2.35))])} fill="#f3ece0" stroke={shade(color, 0.7)} strokeWidth={0.4} />;
    })() : null;
    // The cab's windscreen on its outer end, when seen.
    const outerDir: FaceDir = fr.landscape ? (cabAtLow ? 'negCol' : 'posCol') : (cabAtLow ? 'negRow' : 'posRow');
    const screen = onWall(fc, outerDir, HC - up(0.4), 0.15, 0.85, 0.45, 0.85, '#9fc3d6', 'ws');
    const bodyNode = (
      <g key="body">
        {solid(fb, color)}
        {hatch}
        {onWall(fb, hatchDir, H - up(0.4), 0.18, 0.82, 0.3, 0.36, shade(color, 0.6), 'shelf')}
        {awning}
      </g>
    );
    const cabNode = <g key="cab">{solid(fc, shade(color, 0.92))}{screen}</g>;
    // The cab before the body when it stands behind it, else after.
    const cabMid = project(cab.col + cab.w / 2, cab.row + cab.h / 2);
    const bodyMid = project(body.col + body.w / 2, body.row + body.h / 2);
    const extent = fr.box(Math.min(bodyA0, cabA0), Math.max(bodyA1, cabA1), c0, c0 + wid);
    props.push({
      key: `truck${i}`, ...extent,
      node: (
        <g>
          {solid(fch, '#2b2e33')}
          {cabMid.y < bodyMid.y ? <>{cabNode}{bodyNode}</> : <>{bodyNode}{cabNode}</>}
        </g>
      ),
      shadows: [[project(extent.col + 0.1, extent.row + 0.1), project(extent.col + extent.w + 0.25, extent.row + 0.1), project(extent.col + extent.w + 0.25, extent.row + extent.h + 0.25), project(extent.col + 0.1, extent.row + extent.h + 0.25)]],
    });
  });

  // Picnic tables, three by two in the middle, each with its two benches.
  const tw = Math.min(0.14, 0.62 / fr.L); const td = Math.min(0.1, 0.3 / fr.S);
  [0.3, 0.5, 0.7].forEach((a, ai) => [0.38, 0.62].forEach((c, ci) => {
    const t = fr.box(a - tw / 2, a + tw / 2, c - td / 2, c + td / 2);
    const b1 = fr.box(a - tw / 2, a + tw / 2, c - td / 2 - td * 0.55, c - td / 2 - td * 0.15);
    const b2 = fr.box(a - tw / 2, a + tw / 2, c + td / 2 + td * 0.15, c + td / 2 + td * 0.55);
    const ext = fr.box(a - tw / 2, a + tw / 2, c - td / 2 - td * 0.55, c + td / 2 + td * 0.55);
    props.push({
      key: `pt${ai}${ci}`, ...ext,
      node: (
        <g>
          {solid(boxFaces(b1.col, b1.row, b1.w, b1.h, 0, up(0.45)), shade(WOOD, 0.9), 'b1')}
          {solid(boxFaces(t.col, t.row, t.w, t.h, up(0.62), up(0.13)), WOOD, 't')}
          {solid(boxFaces(b2.col, b2.row, b2.w, b2.h, 0, up(0.45)), shade(WOOD, 0.9), 'b2')}
        </g>
      ),
    });
  }));

  // The lights: a post at each corner of the tables' square, and strings
  // between them, sagging, with warm bulbs. One prop at the corner of the
  // plot nearest the camera, so they are drawn over everything on it.
  const posts: Array<[number, number]> = [[0.18, 0.26], [0.82, 0.26], [0.82, 0.74], [0.18, 0.74]];
  const PH = up(4.2);
  const strands: Array<[number, number]> = [[0, 2], [1, 3], [0, 1], [2, 3]];
  const ax = cameraAxes();
  const corners: Array<[number, number]> = [[p.col, p.row], [p.col + p.w, p.row], [p.col + p.w, p.row + p.h], [p.col, p.row + p.h]];
  const near = corners.reduce((best, c) => (c[0] * ax.sinA + c[1] * ax.cosA > best[0] * ax.sinA + best[1] * ax.cosA ? c : best));
  const nc = Math.min(Math.max(near[0] - 0.2, p.col), p.col + p.w - 0.2);
  const nr = Math.min(Math.max(near[1] - 0.2, p.row), p.row + p.h - 0.2);
  const postAt = (k: number) => { const [x, y] = fr.g(...posts[k]!); return { foot: project(x, y), head: lift(project(x, y), PH) }; };
  const strandNodes = strands.map(([i, j], k) => {
    const a = postAt(i).head; const b = postAt(j).head;
    const pts: Pt[] = Array.from({ length: 13 }, (_, s) => {
      const t = s / 12;
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t + Math.sin(Math.PI * t) * 5 };
    });
    return (
      <g key={`s${k}`}>
        <polyline points={P(pts)} fill="none" stroke="#3b3a36" strokeWidth={0.4} />
        {pts.slice(1, -1).map((q, s) => <circle key={s} cx={q.x} cy={q.y + 0.6} r={0.75} fill={BULB} />)}
      </g>
    );
  });
  props.push({
    key: 'lights', col: nc, row: nr, w: 0.2, h: 0.2,
    node: (
      <g>
        {posts.map((_, k) => { const { foot, head } = postAt(k); return <line key={`p${k}`} x1={foot.x} y1={foot.y} x2={head.x} y2={head.y} stroke="#4b4f54" strokeWidth={0.9} />; })}
        {strandNodes}
      </g>
    ),
  });
  return props;
}
