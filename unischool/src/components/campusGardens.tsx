// More open ground to lay out (Plan 127): outdoor basketball courts, and
// four gardens among the amenities, the Pond, the Parterre, the
// Amphitheater and the Sculpture Garden. Each comes as groundMarkings.tsx's
// two halves: the paint on the ground (drawn in the flat pass, under every
// mass) and the props standing on it (depth-sorted like any mass).
// groundMarkings.tsx's GroundMarking and groundProps route to them.
//
// Everything is authored in the plot's own u (along col) and v (along
// row), 0..1, and projected as drawn, so a turned plot (w and h swapped)
// keeps its proportions; where a plan has a long axis it is laid along
// the plot's longer side.

import { boxFaces, lift, polyPoints, project, projectedCircle, type Pt } from './isoProjection';
import { METRES_PER_TILE, up } from './campusScale';
import { TreeAt, treeShadow, type Species } from './trees';
import type { GroundProp } from './groundMarkings';

interface Plot { col: number; row: number; w: number; h: number }

// A plan point by fraction along the plot's long side (a) and across it
// (c), as grid (col, row).
function framer(p: Plot) {
  const landscape = p.w >= p.h;
  const L = landscape ? p.w : p.h; const S = landscape ? p.h : p.w;
  const g = (a: number, c: number): [number, number] => (landscape ? [p.col + p.w * a, p.row + p.h * c] : [p.col + p.w * c, p.row + p.h * a]);
  const at = (a: number, c: number, z = 0): Pt => { const [x, y] = g(a, c); return lift(project(x, y), z); };
  return { landscape, L, S, g, at };
}
const P = (pts: Pt[]) => polyPoints(pts);
// A box standing on the grid, its three faces in the given tones.
function solid(col: number, row: number, w: number, h: number, base: number, height: number, top: string, left: string, right: string, key?: string) {
  const f = boxFaces(col, row, w, h, base, height);
  return (
    <g key={key}>
      <polygon points={P(f.left)} fill={left} />
      <polygon points={P(f.right)} fill={right} />
      <polygon points={P(f.top)} fill={top} />
    </g>
  );
}
// A fixed hash in [0, 1), for scattered things.
function hash(i: number, k: number): number {
  const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
  return x - Math.floor(x);
}
function treeProp(key: string, col: number, row: number, species: Species, scale: number): GroundProp {
  return {
    key, col: col - 0.5, row: row - 0.5, w: 1, h: 1,
    node: <TreeAt col={col} row={row} species={species} scale={scale} shadow={false} />,
    tree: { col, row, species, scale },
    shadows: [treeShadow(col, row, species, scale)],
  };
}
// A park bench seen as a small box, as the statue's ground has.
function bench(col: number, row: number, alongCol: boolean, key: string) {
  const w = alongCol ? 0.34 : 0.12; const h = alongCol ? 0.12 : 0.34;
  return solid(col - w / 2, row - h / 2, w, h, 0, up(0.5), '#b4aa91', '#978e77', '#847c67', key);
}

// ---------------------------------------------------------------------
// Basketball courts: three full courts side by side, 28 m by 15 m each,
// on one asphalt slab, every line at its real size.
// ---------------------------------------------------------------------
const BB_LEN = 28; const BB_WID = 15;
const BB_KEY_W = 4.9; const BB_KEY_D = 5.8; const BB_THREE = 6.75; const BB_RIM = 1.575; const BB_CIRCLE = 1.8;

function bballLayout(p: Plot) {
  const fr = framer(p);
  const alongM = fr.L * METRES_PER_TILE; const deepM = fr.S * METRES_PER_TILE;
  const courts = Math.max(1, Math.floor(alongM / (BB_WID + 3)));
  const cw = BB_WID / alongM; const cl = Math.min(BB_LEN / deepM, 0.92);
  const c0 = (1 - cl) / 2;
  const centres = Array.from({ length: courts }, (_, k) => (k + 0.5) / courts);
  // Metres to plan fractions, along (a) and across (c).
  const ma = (m: number) => m / alongM; const mc = (m: number) => (m / deepM) * (cl / (BB_LEN / deepM));
  return { ...fr, courts, cw, cl, c0, centres, ma, mc };
}

export function BasketballGround(p: Plot) {
  const L = bballLayout(p);
  const { at, cw, cl, c0, centres, ma, mc } = L;
  const quadAt = (a0: number, a1: number, c_0: number, c_1: number) => P([at(a0, c_0), at(a1, c_0), at(a1, c_1), at(a0, c_1)]);
  // An arc of radius r metres about (a, c), from angle t0 to t1 (radians,
  // 0 along +a), as a polyline in plan.
  const arc = (a: number, c: number, r: number, t0: number, t1: number, n = 18) => P(Array.from({ length: n + 1 }, (_, i) => {
    const t = t0 + ((t1 - t0) * i) / n;
    return at(a + ma(r * Math.cos(t)), c + mc(r * Math.sin(t)));
  }));
  return (
    <>
      <polygon className="ground-bball" points={quadAt(0, 1, 0, 1)} />
      {centres.map((uc, k) => {
        const a0 = uc - cw / 2; const a1 = uc + cw / 2; const c1 = c0 + cl;
        const kw = ma(BB_KEY_W) / 2; const kd = mc(BB_KEY_D);
        const rimIn = mc(BB_RIM);
        return (
          <g key={k}>
            <polygon className="ground-bball-play" points={quadAt(a0, a1, c0, c1)} />
            <polygon className="ground-bball-key" points={quadAt(uc - kw, uc + kw, c0, c0 + kd)} />
            <polygon className="ground-bball-key" points={quadAt(uc - kw, uc + kw, c1 - kd, c1)} />
            <polygon className="ground-line" fill="none" points={quadAt(a0, a1, c0, c1)} />
            <polyline className="ground-line" fill="none" points={P([at(a0, c0 + cl / 2), at(a1, c0 + cl / 2)])} />
            <polygon className="ground-line" fill="none" points={P(Array.from({ length: 20 }, (_, i) => {
              const t = (i / 20) * Math.PI * 2;
              return at(uc + ma(BB_CIRCLE * Math.cos(t)), c0 + cl / 2 + mc(BB_CIRCLE * Math.sin(t)));
            }))} />
            {/* The three-point arcs, about each rim, and the free-throw circles. */}
            <polyline className="ground-line" fill="none" points={arc(uc, c0 + rimIn, BB_THREE, 0.2, Math.PI - 0.2)} />
            <polyline className="ground-line" fill="none" points={arc(uc, c1 - rimIn, BB_THREE, Math.PI + 0.2, 2 * Math.PI - 0.2)} />
            <polyline className="ground-line-fine" fill="none" points={arc(uc, c0 + kd, BB_CIRCLE, 0, Math.PI)} />
            <polyline className="ground-line-fine" fill="none" points={arc(uc, c1 - kd, BB_CIRCLE, Math.PI, 2 * Math.PI)} />
          </g>
        );
      })}
    </>
  );
}

// The hoops (a post just behind each baseline, an arm, the backboard and
// its orange rim), the fence round the slab and a floodlight at each
// corner.
export function basketballProps(p: Plot): GroundProp[] {
  const L = bballLayout(p);
  const { at, centres, c0, cl, ma, mc, g } = L;
  const hoop = (uc: number, end: 0 | 1, key: string) => {
    const dir = end === 0 ? 1 : -1;
    const base = end === 0 ? c0 : c0 + cl;
    const post = base - dir * mc(0.9);
    const board = base + dir * mc(1.2);
    const rim = base + dir * mc(BB_RIM);
    const bw = ma(0.9);
    const [rc, rr] = g(uc, rim);
    const ring = projectedCircle(rc, rr, 0.23 / METRES_PER_TILE, 10).map((q) => lift(q, up(3.05)));
    return (
      <g key={key}>
        <line className="ground-post" x1={at(uc, post).x} y1={at(uc, post).y} x2={at(uc, post, up(3.6)).x} y2={at(uc, post, up(3.6)).y} />
        <line className="ground-post" x1={at(uc, post, up(3.5)).x} y1={at(uc, post, up(3.5)).y} x2={at(uc, board, up(3.4)).x} y2={at(uc, board, up(3.4)).y} />
        <polygon points={P([at(uc - bw, board, up(2.9)), at(uc + bw, board, up(2.9)), at(uc + bw, board, up(3.95)), at(uc - bw, board, up(3.95))])} fill="#f4f2ec" stroke="#6b6f74" strokeWidth={0.5} />
        <polygon points={P([at(uc - bw * 0.33, board, up(3.05)), at(uc + bw * 0.33, board, up(3.05)), at(uc + bw * 0.33, board, up(3.5)), at(uc - bw * 0.33, board, up(3.5))])} fill="none" stroke="#d0552b" strokeWidth={0.8} />
        <polygon points={P(ring)} fill="none" stroke="#e0662f" strokeWidth={1.1} />
      </g>
    );
  };
  const corners: Array<[number, number]> = [[0.02, 0.03], [0.98, 0.03], [0.02, 0.97], [0.98, 0.97]];
  return [
    {
      key: 'fence', ...p,
      node: (
        <>
          {([[0, 0, 1, 0], [0, 0, 0, 1], [0, 1, 1, 1], [1, 0, 1, 1]] as const).map(([a0, c_0, a1, c_1], i) => {
            const fa = at(a0, c_0); const fb = at(a1, c_1);
            const H = up(3);
            return (
              <g key={i}>
                <polygon className="ground-fence-mesh" points={P([fa, fb, lift(fb, H), lift(fa, H)])} />
                <line className="ground-fence-rail" x1={lift(fa, H).x} y1={lift(fa, H).y} x2={lift(fb, H).x} y2={lift(fb, H).y} />
              </g>
            );
          })}
        </>
      ),
    },
    ...centres.flatMap((uc, k) => [0, 1].map((end) => {
      const [hc, hr] = g(uc, end === 0 ? c0 : c0 + cl);
      return { key: `hoop${k}${end}`, col: hc - 0.3, row: hr - 0.3, w: 0.6, h: 0.6, node: hoop(uc, end as 0 | 1, `h${k}${end}`) };
    })),
    ...corners.map(([a, c], i) => {
      const [x, y] = g(a, c);
      const foot = at(a, c); const head = at(a, c, up(9));
      return {
        key: `light${i}`, col: x - 0.2, row: y - 0.2, w: 0.4, h: 0.4,
        node: (
          <g>
            <line className="ground-mast" x1={foot.x} y1={foot.y} x2={head.x} y2={head.y} />
            <rect className="ground-mast-head" x={head.x - 2.4} y={head.y - 1.6} width={4.8} height={2} />
          </g>
        ),
      };
    }),
  ];
}

// ---------------------------------------------------------------------
// The Pond: a big pond in a lawn, its outline a lobed curve, reeds round
// its edge, lily pads and ducks on it, a stream running out of it to the
// plot's far end under a wooden footbridge, a jetty with a rowboat, and
// willows on the bank.
// ---------------------------------------------------------------------
const POND_C = { a: 0.42, c: 0.5, ra: 0.36, rc: 0.4 };
function pondR(t: number, grow = 0): number {
  return 1 + 0.1 * Math.sin(2 * t + 0.7) + 0.07 * Math.sin(3 * t + 2.1) + 0.04 * Math.sin(5 * t + 0.3) + grow;
}
function pondAt(fr: ReturnType<typeof framer>, t: number, k: number, grow = 0, z = 0): Pt {
  const r = pondR(t, grow) * k;
  return fr.at(POND_C.a + POND_C.ra * r * Math.cos(t), POND_C.c + POND_C.rc * r * Math.sin(t), z);
}
const POND_N = 48;
// The stream: from the pond's right bank to the plot's end, as a band.
const STREAM = { a0: 0.74, a1: 1, c: 0.56, half: 0.05 };
const BRIDGE_A = 0.86;
const JETTY = { a: 0.3, c0: 0.83, c1: 0.62, half: 0.025 };

export function PondGround(p: Plot) {
  const fr = framer(p);
  const ring = (k: number, grow = 0) => P(Array.from({ length: POND_N }, (_, i) => pondAt(fr, (i / POND_N) * Math.PI * 2, k, grow)));
  const wobble = (a: number) => STREAM.c + 0.03 * Math.sin(a * 18);
  const stream = (half: number) => {
    const n = 10;
    const top = Array.from({ length: n + 1 }, (_, i) => { const a = STREAM.a0 + ((STREAM.a1 - STREAM.a0) * i) / n; return fr.at(a, wobble(a) - half); });
    const bottom = Array.from({ length: n + 1 }, (_, i) => { const a = STREAM.a1 - ((STREAM.a1 - STREAM.a0) * i) / n; return fr.at(a, wobble(a) + half); });
    return P([...top, ...bottom]);
  };
  const lilies: Array<[number, number, number, boolean]> = [
    [0.3, 0.42, 0.022, true], [0.36, 0.33, 0.016, false], [0.52, 0.66, 0.02, true], [0.58, 0.6, 0.014, false],
    [0.24, 0.55, 0.015, false], [0.47, 0.3, 0.018, true], [0.62, 0.38, 0.013, false],
  ];
  return (
    <>
      <polygon className="ground-garden-grass" points={P([fr.at(0, 0), fr.at(1, 0), fr.at(1, 1), fr.at(0, 1)])} />
      {/* A gravel walk round the pond, then the bank and the water. */}
      <polygon className="ground-pond-walk" points={ring(1, 0.17)} />
      <polygon className="ground-garden-grass" points={ring(1, 0.11)} />
      <polygon className="ground-pond-edge" points={stream(STREAM.half + 0.02)} />
      <polygon className="ground-pond-edge" points={ring(1, 0.035)} />
      <polygon className="ground-pond" points={stream(STREAM.half)} />
      <polygon className="ground-pond" points={ring(1)} />
      <polygon className="ground-pond-deep" points={ring(0.55)} />
      {lilies.map(([a, c, r, flower], i) => {
        const [x, y] = fr.g(a, c);
        const pad = projectedCircle(x, y, fr.S * r, 14);
        return (
          <g key={i}>
            <polygon className="ground-lily" points={P(pad.slice(2).concat([project(x, y)]))} />
            {flower && <polygon className="ground-lily-flower" points={P(projectedCircle(x, y, fr.S * r * 0.36, 8))} />}
          </g>
        );
      })}
    </>
  );
}

export function pondProps(p: Plot): GroundProp[] {
  const fr = framer(p);
  const { g, at } = fr;
  const out: GroundProp[] = [];
  // Reeds in clumps round the edge, standing a metre and a half: thin
  // strokes, green with brown heads, kept off the jetty and the stream.
  const reedT = [0.35, 0.6, 1.2, 1.55, 2.0, 2.55, 3.05, 3.55, 4.05, 4.35, 5.25, 5.7];
  reedT.forEach((t, i) => {
    const base = pondAt(fr, t, 1, -0.01);
    const [x, y] = (() => { const r = pondR(t) * 1; return g(POND_C.a + POND_C.ra * r * Math.cos(t), POND_C.c + POND_C.rc * r * Math.sin(t)); })();
    const stems = Array.from({ length: 7 }, (_, k) => {
      const dx = (hash(i, k) - 0.5) * 7; const h = up(1.1 + hash(i, k + 9) * 0.7);
      const lean = (hash(i, k + 3) - 0.5) * 2.2;
      const p0 = { x: base.x + dx, y: base.y + (hash(i, k + 5) - 0.5) * 2 };
      return { p0, p1: { x: p0.x + lean, y: lift(p0, h).y } };
    });
    out.push({
      key: `reeds${i}`, col: x - 0.3, row: y - 0.3, w: 0.6, h: 0.6,
      node: (
        <g>
          {stems.map(({ p0, p1 }, k) => <line key={k} x1={p0.x} y1={p0.y} x2={p1.x} y2={p1.y} stroke={k % 3 === 0 ? '#7f9a3e' : '#5d7d33'} strokeWidth={0.9} strokeLinecap="round" className="ground-reed" />)}
          {stems.filter((_, k) => k % 2 === 0).map(({ p1 }, k) => <rect key={`h${k}`} x={p1.x - 0.6} y={p1.y - 0.2} width={1.2} height={2.6} fill="#7a5630" className="ground-reed-head" />)}
        </g>
      ),
    });
  });
  // The footbridge over the stream: a low wooden arch with a rail each side.
  {
    const n = 8; const half = 0.035; const rise = up(1.1);
    const c0 = STREAM.c - STREAM.half - 0.05; const c1 = STREAM.c + STREAM.half + 0.05;
    const edge = (da: number, z0: number) => Array.from({ length: n + 1 }, (_, i) => {
      const t = i / n; return at(BRIDGE_A + da, c0 + (c1 - c0) * t, z0 + rise * Math.sin(Math.PI * t));
    });
    const near = edge(half, 0); const far = edge(-half, 0);
    const railH = up(1);
    const [bx, by] = g(BRIDGE_A - half, c0);
    const [ex, ey] = g(BRIDGE_A + half, c1);
    out.push({
      key: 'bridge', col: Math.min(bx, ex), row: Math.min(by, ey), w: Math.abs(ex - bx) + 0.05, h: Math.abs(ey - by) + 0.05,
      node: (
        <g>
          <polygon points={P([...near, ...far.slice().reverse()])} fill="#9a6a3c" stroke="#6b4423" strokeWidth={0.6} />
          {[half, -half].map((da) => (
            <g key={da}>
              <polyline points={P(edge(da, railH))} fill="none" stroke="#6b4423" strokeWidth={1.2} />
              {[0, 2, 4, 6, 8].map((i) => {
                const lo = edge(da, 0)[i]!; const hi = edge(da, railH)[i]!;
                return <line key={i} x1={lo.x} y1={lo.y} x2={hi.x} y2={hi.y} stroke="#6b4423" strokeWidth={0.9} />;
              })}
            </g>
          ))}
        </g>
      ),
    });
  }
  // The jetty: planks on posts from the near bank into the water, and a
  // rowboat tied alongside.
  {
    const z = up(0.5);
    const deck = [at(JETTY.a - JETTY.half, JETTY.c0, z), at(JETTY.a + JETTY.half, JETTY.c0, z), at(JETTY.a + JETTY.half, JETTY.c1, z), at(JETTY.a - JETTY.half, JETTY.c1, z)];
    const posts = [JETTY.c1, (JETTY.c0 + JETTY.c1) / 2].flatMap((c) => [JETTY.a - JETTY.half, JETTY.a + JETTY.half].map((a) => [a, c] as const));
    const boatA = JETTY.a + JETTY.half + 0.03; const bc0 = JETTY.c1 + 0.02; const bc1 = JETTY.c1 + 0.11;
    const boat = [at(boatA, bc0 - 0.01), at(boatA + 0.018, bc0 + 0.02), at(boatA + 0.02, bc1 - 0.02), at(boatA, bc1 + 0.01), at(boatA - 0.02, bc1 - 0.02), at(boatA - 0.018, bc0 + 0.02)];
    const [jx, jy] = g(JETTY.a - JETTY.half, JETTY.c1);
    const [kx, ky] = g(JETTY.a + JETTY.half + 0.06, JETTY.c0);
    out.push({
      key: 'jetty', col: Math.min(jx, kx), row: Math.min(jy, ky), w: Math.abs(kx - jx), h: Math.abs(ky - jy),
      node: (
        <g>
          <polygon points={P(boat.map((q) => lift(q, up(0.25))))} fill="#b5483a" stroke="#6e2a22" strokeWidth={0.6} />
          <polygon points={P(boat.map((q) => lift(q, up(0.3))).map((q, _i, arr) => ({ x: q.x + (arr.reduce((s, r) => s + r.x, 0) / arr.length - q.x) * 0.3, y: q.y + (arr.reduce((s, r) => s + r.y, 0) / arr.length - q.y) * 0.3 })))} fill="#e8dcc0" />
          {posts.map(([a, c], i) => { const lo = at(a, c); const hi = at(a, c, z); return <line key={i} x1={lo.x} y1={lo.y} x2={hi.x} y2={hi.y} stroke="#5a3a1e" strokeWidth={1.3} />; })}
          <polygon points={P(deck)} fill="#a8794a" stroke="#6b4423" strokeWidth={0.5} />
          {[0.25, 0.5, 0.75].map((t) => {
            const c = JETTY.c0 + (JETTY.c1 - JETTY.c0) * t;
            const l = at(JETTY.a - JETTY.half, c, z); const r = at(JETTY.a + JETTY.half, c, z);
            return <line key={t} x1={l.x} y1={l.y} x2={r.x} y2={r.y} stroke="#7d5530" strokeWidth={0.5} />;
          })}
        </g>
      ),
    });
  }
  // The ducks: a mother and four ducklings in a line, and a drake.
  const ducks: Array<[number, number, number]> = [[0.5, 0.48, 1], [0.54, 0.5, 0.55], [0.57, 0.52, 0.55], [0.6, 0.53, 0.55], [0.63, 0.55, 0.55], [0.34, 0.6, 1.05]];
  ducks.forEach(([a, c, s], i) => {
    const q = at(a, c);
    const body = 2.6 * s; const drake = i === ducks.length - 1;
    out.push({
      key: `duck${i}`, col: g(a, c)[0] - 0.1, row: g(a, c)[1] - 0.1, w: 0.2, h: 0.2,
      node: (
        <g className="ground-duck">
          <ellipse cx={q.x} cy={q.y + 0.4} rx={body * 1.5} ry={body * 0.5} fill="rgba(40, 70, 90, 0.25)" />
          <ellipse cx={q.x} cy={q.y - body * 0.35} rx={body} ry={body * 0.55} fill={s < 1 ? '#d9b65a' : drake ? '#d8d4c8' : '#8a6a44'} />
          <circle cx={q.x - body * 0.85} cy={q.y - body * 0.95} r={body * 0.42} fill={s < 1 ? '#d9b65a' : drake ? '#2f6b45' : '#7a5a38'} />
          <polygon points={P([{ x: q.x - body * 1.2, y: q.y - body * 1.0 }, { x: q.x - body * 1.55, y: q.y - body * 0.85 }, { x: q.x - body * 1.2, y: q.y - body * 0.8 }])} fill="#e09a2f" />
        </g>
      ),
    });
  });
  // Willows on the bank, a birch or two, and benches facing the water.
  const trees: Array<[number, number, Species, number]> = [[0.08, 0.15, 'willow', 1.1], [0.1, 0.84, 'willow', 1], [0.74, 0.12, 'willow', 1.05], [0.92, 0.86, 'birch', 0.85], [0.95, 0.2, 'birch', 0.8], [0.62, 0.92, 'canopy', 0.8]];
  trees.forEach(([a, c, sp, sc], i) => { const [x, y] = g(a, c); out.push(treeProp(`tree${i}`, x, y, sp, sc)); });
  ([[0.22, 0.06], [0.55, 0.05], [0.45, 0.95]] as const).forEach(([a, c], i) => {
    const [x, y] = g(a, c);
    out.push({ key: `bench${i}`, col: x - 0.2, row: y - 0.2, w: 0.4, h: 0.4, node: bench(x, y, fr.landscape, `b${i}`) });
  });
  return out;
}

// ---------------------------------------------------------------------
// The Parterre: a formal garden on gravel, after a French parterre de
// broderie. A box hedge round the whole; four beds, each a square of
// hedge with a cross and a ring of hedge in it and flowers between; a
// sundial at the middle; clipped yew cones at the corners.
// ---------------------------------------------------------------------
const HEDGE_H = up(0.7);
const HEDGE_T = 0.035;  // a hedge's thickness, as a share of the plot

export function ParterreGround(p: Plot) {
  const fr = framer(p);
  const q = (a0: number, a1: number, c0: number, c1: number) => P([fr.at(a0, c0), fr.at(a1, c0), fr.at(a1, c1), fr.at(a0, c1)]);
  const beds: Array<[number, number]> = [[0.27, 0.27], [0.73, 0.27], [0.27, 0.73], [0.73, 0.73]];
  const bed = 0.19;
  return (
    <>
      <polygon className="ground-gravel" points={q(0, 1, 0, 1)} />
      {/* The flowers in each bed's four quarters, under its hedges. */}
      {beds.map(([a, c], i) => (
        <g key={i}>
          <polygon className="ground-bed" points={q(a - bed, a + bed, c - bed, c + bed)} />
          {Array.from({ length: 36 }, (_, k) => {
            const da = (hash(i, k) - 0.5) * bed * 1.85; const dc = (hash(i, k + 40) - 0.5) * bed * 1.85;
            if (Math.abs(da) < 0.03 || Math.abs(dc) < 0.03) return null;
            const [x, y] = fr.g(a + da, c + dc);
            return <polygon key={k} className={`ground-bloom-${(i + k) % 4}`} points={P(projectedCircle(x, y, 0.06, 6))} />;
          })}
        </g>
      ))}
      <polygon className="ground-paving" points={P(Array.from({ length: 24 }, (_, i) => {
        const t = (i / 24) * Math.PI * 2; const [x, y] = fr.g(0.5, 0.5);
        return project(x + Math.cos(t) * fr.S * 0.1, y + Math.sin(t) * fr.S * 0.1);
      }))} />
    </>
  );
}

export function parterreProps(p: Plot): GroundProp[] {
  const fr = framer(p);
  const { g } = fr;
  const T = HEDGE_T;
  // One hedge from (a0, c0) to (a1, c1), as a low box.
  const hedge = (a0: number, c0: number, a1: number, c1: number, key: string) => {
    const [x0, y0] = g(Math.min(a0, a1), Math.min(c0, c1));
    const [x1, y1] = g(Math.max(a0, a1), Math.max(c0, c1));
    return solid(Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0), Math.abs(y1 - y0), 0, HEDGE_H, '#55863f', '#3f6b34', '#355d2c', key);
  };
  const out: GroundProp[] = [];
  const beds: Array<[number, number]> = [[0.27, 0.27], [0.73, 0.27], [0.27, 0.73], [0.73, 0.73]];
  const bed = 0.19;
  // The border, with a gap at the middle of each side for the walks.
  const gap = 0.07;
  const border = [
    hedge(0.02, 0.02, 0.5 - gap, 0.02 + T, 'n0'), hedge(0.5 + gap, 0.02, 0.98, 0.02 + T, 'n1'),
    hedge(0.02, 0.98 - T, 0.5 - gap, 0.98, 's0'), hedge(0.5 + gap, 0.98 - T, 0.98, 0.98, 's1'),
    hedge(0.02, 0.02 + T, 0.02 + T, 0.5 - gap, 'w0'), hedge(0.02, 0.5 + gap, 0.02 + T, 0.98 - T, 'w1'),
    hedge(0.98 - T, 0.02 + T, 0.98, 0.5 - gap, 'e0'), hedge(0.98 - T, 0.5 + gap, 0.98, 0.98 - T, 'e1'),
  ];
  out.push({ key: 'border', ...p, node: <>{border}</> });
  beds.forEach(([a, c], i) => {
    const t = T * 0.8;
    const parts = [
      hedge(a - bed, c - bed, a + bed, c - bed + t, 'a'), hedge(a - bed, c + bed - t, a + bed, c + bed, 'b'),
      hedge(a - bed, c - bed + t, a - bed + t, c + bed - t, 'c'), hedge(a + bed - t, c - bed + t, a + bed, c + bed - t, 'd'),
      hedge(a - bed + t, c - t / 2, a - 0.035, c + t / 2, 'e'), hedge(a + 0.035, c - t / 2, a + bed - t, c + t / 2, 'f'),
      hedge(a - t / 2, c - bed + t, a + t / 2, c - 0.035, 'g'), hedge(a - t / 2, c + 0.035, a + t / 2, c + bed - t, 'h'),
    ];
    const [x0, y0] = g(a - bed, c - bed); const [x1, y1] = g(a + bed, c + bed);
    // A clipped ball at the bed's middle.
    const [mx, my] = g(a, c);
    const ball = (r: number, z: number) => P(projectedCircle(mx, my, r, 12).map((q) => lift(q, z)));
    out.push({
      key: `bed${i}`, col: Math.min(x0, x1), row: Math.min(y0, y1), w: Math.abs(x1 - x0), h: Math.abs(y1 - y0),
      node: (
        <g>
          {parts}
          <polygon points={ball(fr.S * 0.03, 0)} fill="#3f6b34" />
          <polygon points={ball(fr.S * 0.028, up(0.6))} fill="#4c7a3a" />
          <polygon points={ball(fr.S * 0.017, up(1))} fill="#5f9148" />
        </g>
      ),
    });
  });
  // Yew cones at the four corners.
  ([[0.07, 0.07], [0.93, 0.07], [0.07, 0.93], [0.93, 0.93]] as const).forEach(([a, c], i) => {
    const [x, y] = g(a, c);
    const foot = project(x, y); const r = (fr.S * 0.045 * 64) / 2;
    const tip = lift(foot, up(3.2));
    out.push({
      key: `cone${i}`, col: x - 0.25, row: y - 0.25, w: 0.5, h: 0.5,
      node: (
        <g>
          <polygon points={P([{ x: foot.x - r, y: foot.y }, tip, { x: foot.x + r, y: foot.y }, { x: foot.x, y: foot.y + r * 0.4 }])} fill="#2f5a2c" />
          <polygon points={P([{ x: foot.x - r, y: foot.y }, tip, { x: foot.x, y: foot.y + r * 0.4 }])} fill="#3d6e37" />
        </g>
      ),
    });
  });
  // The sundial: a stone column and its brass plate.
  {
    const [x, y] = g(0.5, 0.5);
    const s = 0.12;
    out.push({
      key: 'sundial', col: x - s, row: y - s, w: s * 2, h: s * 2,
      node: (
        <g>
          {solid(x - s, y - s, s * 2, s * 2, 0, up(0.3), '#ddd4bd', '#bdb39a', '#a39a82', 'base')}
          {solid(x - s * 0.45, y - s * 0.45, s * 0.9, s * 0.9, up(0.3), up(0.9), '#ddd4bd', '#bdb39a', '#a39a82', 'col')}
          <polygon points={P(projectedCircle(x, y, s * 0.6, 12).map((q) => lift(q, up(1.25))))} fill="#b08a3a" />
          <line x1={lift(project(x, y), up(1.25)).x} y1={lift(project(x, y), up(1.25)).y} x2={lift(project(x + s * 0.4, y - s * 0.4), up(1.25)).x} y2={lift(project(x, y), up(1.6)).y} stroke="#7a5c22" strokeWidth={1} />
        </g>
      ),
    });
  }
  return out;
}

// ---------------------------------------------------------------------
// The Amphitheater: grass terraces in a half bowl stepping down to a
// stone stage, stone edging on each step, two aisles of steps, and at the
// back of the stage a low colonnade under a lintel.
// ---------------------------------------------------------------------
const AMPHI_STAGE = { a: 0.5, c: 0.86 };
const AMPHI_TIERS = 6;

function amphiFrame(p: Plot) {
  const fr = framer(p);
  // The bowl opens across the long side: radii in metres scaled to the
  // shorter of what fits.
  const R = Math.min(fr.L * 0.48, fr.S * 0.8);
  const ma = (tiles: number) => tiles / fr.L; const mc = (tiles: number) => tiles / fr.S;
  const ptAt = (r: number, t: number, z = 0) => fr.at(AMPHI_STAGE.a + ma(r * Math.cos(t)), AMPHI_STAGE.c - mc(r * Math.sin(t)), z);
  return { ...fr, R, ma, mc, ptAt };
}

export function AmphitheaterGround(p: Plot) {
  const A = amphiFrame(p);
  const { R, ptAt, at } = A;
  const r0 = R * 0.26;
  const tierR = (k: number) => r0 + ((R - r0) * k) / AMPHI_TIERS;
  const n = 24;
  const ring = (ra: number, rb: number) => P([
    ...Array.from({ length: n + 1 }, (_, i) => ptAt(ra, (Math.PI * i) / n)),
    ...Array.from({ length: n + 1 }, (_, i) => ptAt(rb, Math.PI - (Math.PI * i) / n)),
  ]);
  return (
    <>
      <polygon className="ground-lawn" points={P([at(0, 0), at(1, 0), at(1, 1), at(0, 1)])} />
      <polygon className="ground-gravel" points={P([at(0.02, AMPHI_STAGE.c - 0.02), at(0.98, AMPHI_STAGE.c - 0.02), at(0.98, 0.99), at(0.02, 0.99)])} />
      {Array.from({ length: AMPHI_TIERS }, (_, k) => (
        <g key={k}>
          <polygon className="ground-turf" points={ring(tierR(k), tierR(k + 1))} />
          {/* The stone riser along the inner edge of each terrace. */}
          <polygon className="ground-amphi-step" points={ring(tierR(k), tierR(k) + (R - r0) / AMPHI_TIERS * 0.3)} />
        </g>
      ))}
      {/* The orchestra: a paved half circle in front of the stage. */}
      <polygon className="ground-paving" points={P([...Array.from({ length: n + 1 }, (_, i) => ptAt(r0, (Math.PI * i) / n)), ptAt(0, 0)])} />
      {/* Two aisles of steps up through the terraces. */}
      {[Math.PI * 0.33, Math.PI * 0.67].map((t) => {
        const dt = 0.05;
        return <polygon key={t} className="ground-amphi-step" points={P([ptAt(r0, t - dt * 1.6), ptAt(R, t - dt), ptAt(R, t + dt), ptAt(r0, t + dt * 1.6)])} />;
      })}
    </>
  );
}

export function amphitheaterProps(p: Plot): GroundProp[] {
  const A = amphiFrame(p);
  const { g, R, ma, mc } = A;
  const out: GroundProp[] = [];
  // The stage: a stone platform, and the colonnade behind it.
  const sw = ma(R * 0.6); const sd = mc(R * 0.18);
  const [s0x, s0y] = g(AMPHI_STAGE.a - sw, AMPHI_STAGE.c);
  const [s1x, s1y] = g(AMPHI_STAGE.a + sw, AMPHI_STAGE.c + sd);
  const sc = Math.min(s0x, s1x); const sr = Math.min(s0y, s1y);
  const sW = Math.abs(s1x - s0x); const sH = Math.abs(s1y - s0y);
  const cols = 6;
  const colZ = up(0.9); const colH = up(4.2);
  const backC = AMPHI_STAGE.c + sd * 0.82;
  out.push({
    key: 'stage', col: sc, row: sr, w: sW, h: sH,
    node: (
      <g>
        {solid(sc, sr, sW, sH, 0, colZ, '#ddd4bd', '#bdb39a', '#a39a82', 'deck')}
        {Array.from({ length: cols }, (_, i) => {
          const a = AMPHI_STAGE.a - sw * 0.9 + (sw * 1.8 * i) / (cols - 1);
          const [x, y] = g(a, backC);
          return solid(x - 0.07, y - 0.07, 0.14, 0.14, colZ, colH, '#e6dfcb', '#cfc6ae', '#b6ad95', `c${i}`);
        })}
        {(() => {
          const [x0, y0] = g(AMPHI_STAGE.a - sw * 0.98, backC - mc(0.12));
          const [x1, y1] = g(AMPHI_STAGE.a + sw * 0.98, backC + mc(0.12));
          return solid(Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0), Math.abs(y1 - y0), colZ + colH, up(0.8), '#e6dfcb', '#cfc6ae', '#b6ad95', 'lintel');
        })()}
      </g>
    ),
  });
  // Trees round the top of the bowl, and a lamp at each aisle's head.
  const trees: Array<[number, number, Species, number]> = [[0.06, 0.1, 'canopy', 0.95], [0.94, 0.1, 'canopy', 0.95], [0.04, 0.55, 'conifer', 0.85], [0.96, 0.55, 'conifer', 0.85], [0.5, 0.04, 'ornamental', 0.8]];
  trees.forEach(([a, c, sp, s], i) => { const [x, y] = g(a, c); out.push(treeProp(`tree${i}`, x, y, sp, s)); });
  return out;
}

// ---------------------------------------------------------------------
// The Sculpture Garden: a mown lawn crossed by a looping gravel walk, and
// on it five pieces on plinths, a red steel arch, a bronze of stacked
// forms, a stone sphere, a steel needle and a bronze figure; a yew hedge
// along its back and trees at its corners.
// ---------------------------------------------------------------------
export function SculptureGround(p: Plot) {
  const fr = framer(p);
  const q = (a0: number, a1: number, c0: number, c1: number) => P([fr.at(a0, c0), fr.at(a1, c0), fr.at(a1, c1), fr.at(a0, c1)]);
  const loop = (k: number) => P(Array.from({ length: 36 }, (_, i) => {
    const t = (i / 36) * Math.PI * 2;
    return fr.at(0.5 + 0.34 * k * Math.cos(t), 0.52 + 0.3 * k * Math.sin(t));
  }));
  return (
    <>
      <polygon className="ground-lawn" points={q(0, 1, 0, 1)} />
      {Array.from({ length: 6 }, (_, i) => (i % 2 === 0 ? <polygon key={i} className="ground-mow" points={q(i / 6, (i + 1) / 6, 0, 1)} /> : null))}
      <polygon className="ground-gravel" points={loop(1.12)} />
      <polygon className="ground-lawn" points={loop(0.9)} />
      <polygon className="ground-gravel" points={q(0.47, 0.53, 0.82, 1)} />
    </>
  );
}

export function sculptureProps(p: Plot): GroundProp[] {
  const fr = framer(p);
  const { g, at } = fr;
  const out: GroundProp[] = [];
  const plinth = (x: number, y: number, s: number, z: number, key: string) => solid(x - s, y - s, s * 2, s * 2, 0, z, '#ddd4bd', '#bdb39a', '#a39a82', key);
  const piece = (key: string, a: number, c: number, s: number, node: (x: number, y: number) => React.JSX.Element) => {
    const [x, y] = g(a, c);
    out.push({ key, col: x - s, row: y - s, w: s * 2, h: s * 2, node: node(x, y) });
  };
  // The red arch: a steel band bent over in a half loop across the plinth.
  piece('arch', 0.5, 0.52, 0.45, (x, y) => {
    const n = 14; const R = 0.5; const Z = up(0.4); const H = up(6.5); const T = 0.07;
    const along = fr.landscape;
    const pt = (t: number, off: number, z0: number) => {
      const dx = along ? R * Math.cos(t) : off; const dy = along ? off : R * Math.cos(t);
      return lift(project(x + dx, y + dy), z0 + H * Math.sin(t));
    };
    const band = (off: number) => Array.from({ length: n + 1 }, (_, i) => pt((Math.PI * i) / n, off, Z));
    const front = band(T); const back = band(-T);
    return (
      <g>
        {plinth(x, y, 0.56, Z, 'p')}
        <polygon points={P([...back, ...front.slice().reverse()])} fill="#c23a2b" stroke="#8c2a1f" strokeWidth={0.6} />
      </g>
    );
  });
  // Stacked bronze forms.
  piece('stack', 0.17, 0.3, 0.3, (x, y) => (
    <g>
      {plinth(x, y, 0.24, up(1), 'p')}
      {solid(x - 0.19, y - 0.14, 0.38, 0.28, up(1), up(1.6), '#7b8c68', '#5e6b4e', '#454f3a', 'a')}
      {solid(x - 0.11, y - 0.17, 0.24, 0.2, up(2.6), up(1.4), '#7b8c68', '#5e6b4e', '#454f3a', 'b')}
      {solid(x - 0.14, y - 0.08, 0.16, 0.16, up(4), up(1.8), '#7b8c68', '#5e6b4e', '#454f3a', 'c')}
    </g>
  ));
  // A stone sphere on a low drum.
  piece('sphere', 0.83, 0.3, 0.3, (x, y) => {
    const c = lift(project(x, y), up(2.6)); const r = 8.5;
    return (
      <g>
        {plinth(x, y, 0.25, up(0.6), 'p')}
        <circle cx={c.x} cy={c.y} r={r} fill="#b9b3a6" />
        <circle cx={c.x - r * 0.3} cy={c.y - r * 0.35} r={r * 0.45} fill="#d4cfc4" />
      </g>
    );
  });
  // A polished steel needle.
  piece('needle', 0.2, 0.78, 0.15, (x, y) => {
    const foot = lift(project(x, y), up(0.5)); const tip = lift(project(x, y), up(12));
    return (
      <g>
        {plinth(x, y, 0.17, up(0.5), 'p')}
        <polygon points={P([{ x: foot.x - 3, y: foot.y }, { x: foot.x + 3, y: foot.y }, tip])} fill="#c9d0d6" />
        <polygon points={P([{ x: foot.x, y: foot.y }, { x: foot.x + 3, y: foot.y }, tip])} fill="#9aa3ab" />
      </g>
    );
  });
  // A seated bronze figure: a body, a head, the knees.
  piece('figure', 0.8, 0.78, 0.3, (x, y) => {
    const base = up(1.1);
    const head = lift(project(x, y), base + up(3.4));
    return (
      <g>
        {plinth(x, y, 0.25, base, 'p')}
        {solid(x - 0.12, y - 0.09, 0.24, 0.18, base, up(2.4), '#6e7f5c', '#5e6b4e', '#454f3a', 'body')}
        {solid(x - 0.06, y - 0.18, 0.18, 0.12, base, up(1.3), '#6e7f5c', '#5e6b4e', '#454f3a', 'knees')}
        <circle cx={head.x} cy={head.y} r={4.6} fill="#5e6b4e" />
      </g>
    );
  });
  // The yew hedge along the back.
  {
    const [x0, y0] = g(0.03, 0.02); const [x1, y1] = g(0.97, 0.07);
    out.push({ key: 'hedge', col: Math.min(x0, x1), row: Math.min(y0, y1), w: Math.abs(x1 - x0), h: Math.abs(y1 - y0), node: solid(Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0), Math.abs(y1 - y0), 0, up(1.8), '#4c7a3a', '#2f5a2c', '#284f26', 'h') });
  }
  ([[0.05, 0.92, 'canopy', 0.9], [0.95, 0.92, 'canopy', 0.9], [0.06, 0.55, 'birch', 0.75], [0.94, 0.55, 'birch', 0.75]] as const).forEach(([a, c, sp, s], i) => {
    const [x, y] = g(a, c); out.push(treeProp(`tree${i}`, x, y, sp, s));
  });
  void at;
  return out;
}
