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

export function kioskProps(p: Plot): GroundProp[] {
  const bw = Math.min(0.9, p.w * 0.45); const bh = Math.min(0.66, p.h * 0.33);
  const bc = p.col + p.w / 2 - bw / 2; const br = p.row + p.h * 0.3 - bh / 2;
  const H = up(3.2);
  const f = boxFaces(bc, br, bw, bh, 0, H);
  const roof = boxFaces(bc - 0.05, br - 0.05, bw + 0.1, bh + 0.1, H, up(0.35));
  // The awning: from the counter's head out over the paving, in stripes.
  const out = 0.3; const n = 6;
  const stripes = Array.from({ length: n }, (_, i) => {
    const c0 = bc + (bw * i) / n; const c1 = bc + (bw * (i + 1)) / n;
    const pts = [
      lift(project(c0, br + bh), up(2.7)), lift(project(c1, br + bh), up(2.7)),
      lift(project(c1, br + bh + out), up(2.1)), lift(project(c0, br + bh + out), up(2.1)),
    ];
    return <polygon key={i} points={P(pts)} fill={i % 2 === 0 ? AWNING_RED : AWNING_WHITE} stroke={shade(AWNING_RED, 0.75)} strokeWidth={0.3} />;
  });
  const valance = Array.from({ length: n }, (_, i) => {
    const c0 = bc + (bw * i) / n; const c1 = bc + (bw * (i + 1)) / n;
    const pts = [
      lift(project(c0, br + bh + out), up(2.1)), lift(project(c1, br + bh + out), up(2.1)),
      lift(project(c1, br + bh + out), up(1.75)), lift(project(c0, br + bh + out), up(1.75)),
    ];
    return <polygon key={`v${i}`} points={P(pts)} fill={i % 2 === 0 ? AWNING_RED : AWNING_WHITE} />;
  });
  // Is the counter's side toward the camera? Then the awning stands in
  // front of the booth; otherwise behind it.
  const counterSeen = wallOf(f, 'posRow').visible;
  const awning = <g key="awning">{stripes}{valance}</g>;
  // The cup: a billboard on a pole over the roof's middle.
  const mid = lift(project(bc + bw / 2, br + bh / 2), H + up(0.35));
  const cupTop = lift(mid, up(3.6));
  const cw = 8; const ch = 9;
  const cup = (
    <g key="cup">
      <line x1={mid.x} y1={mid.y} x2={mid.x} y2={cupTop.y + ch} stroke="#4b4f54" strokeWidth={0.9} />
      <path d={`M ${cupTop.x + cw / 2 - 0.4} ${cupTop.y + 2} a 2.6 2.6 0 1 1 0 4.4`} fill="none" stroke="#f7f3ea" strokeWidth={1.1} />
      <polygon points={`${cupTop.x - cw / 2},${cupTop.y} ${cupTop.x + cw / 2},${cupTop.y} ${cupTop.x + cw / 2 - 0.9},${cupTop.y + ch} ${cupTop.x - cw / 2 + 0.9},${cupTop.y + ch}`} fill="#f7f3ea" stroke="#6b4a3a" strokeWidth={0.5} />
      <rect x={cupTop.x - cw / 2 + 0.4} y={cupTop.y + 3} width={cw - 0.8} height={2.4} fill="#7a4b2c" />
      <path d={`M ${cupTop.x - 1} ${cupTop.y - 1} q 1 -1.4 0 -2.8 M ${cupTop.x + 1} ${cupTop.y - 1} q 1 -1.4 0 -2.8`} fill="none" stroke="#ffffff" strokeWidth={0.6} opacity={0.8} />
    </g>
  );
  const booth = (
    <g key="booth">
      {solid(f, KIOSK_WALL)}
      {/* The counter's hatch, lit inside, and a menu board on the side. */}
      {onWall(f, 'posRow', H, 0.12, 0.88, 0.32, 0.78, '#3a3027', 'hatch')}
      {onWall(f, 'posRow', H, 0.12, 0.88, 0.3, 0.34, '#8a6a4a', 'sill')}
      {onWall(f, 'posCol', H, 0.25, 0.75, 0.4, 0.75, DARK, 'menuE')}
      {onWall(f, 'negCol', H, 0.25, 0.75, 0.4, 0.75, DARK, 'menuW')}
      {solid(roof, KIOSK_ROOF)}
    </g>
  );
  return [
    {
      key: 'booth', col: bc, row: br, w: bw, h: bh + out,
      node: <g>{counterSeen ? <>{booth}{awning}</> : <>{awning}{booth}</>}{cup}</g>,
      shadows: [[project(bc + 0.15, br + 0.15), project(bc + bw + 0.4, br + 0.15), project(bc + bw + 0.4, br + bh + 0.4), project(bc + 0.15, br + bh + 0.4)]],
    },
    cafeTable(p.col + p.w * 0.28, p.row + p.h * 0.78, '#c8423a', 't1'),
    cafeTable(p.col + p.w * 0.72, p.row + p.h * 0.78, '#2f6f4f', 't2'),
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
