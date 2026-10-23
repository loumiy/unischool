import type { Buildable, Facing, Vernacular } from '../state/types';
import { up } from './campusScale';
import { depthOrder } from './depthSort';
import { boxFaces, lift, polyPoints, projectedCircle, type Pt } from './isoProjection';
import { sideSeen, wallOfSide } from './facing';
import { weatherVolumes } from './weatherVolumes';

// Weathering by years standing: rain streaks down the walls after
// STREAK_YEARS, and slates gone from the eaves after SLATE_YEARS. Phase E ties
// both to a building's condition and adds the derelict and the historic;
// here they are age alone. Drawn over the motif, per building, and placed by
// a hash of its id so each weathers its own way and the same way every time.

export const STREAK_YEARS = 15;
export const SLATE_YEARS = 30;

// 0 nothing, 1 streaks, 2 lost slates, 3 boarded windows, 4 derelict: a
// timber hoarding round it, a tarpaulin on its roof, a darkened wall and
// weeds at its foot (Plan 74B made it loud enough to warn).
export type AgeBand = 0 | 1 | 2 | 3 | 4;

export function ageBand(t: Pick<Buildable, 'builtYear'>, year: number): AgeBand {
  if (t.builtYear === undefined) return 0;
  const age = year - t.builtYear;
  return age >= SLATE_YEARS ? 2 : age >= STREAK_YEARS ? 1 : 0;
}

// Condition (systems/estate) wears a building faster than age does (Plan 26).
export function conditionBand(condition: number): AgeBand {
  return condition < 0.1 ? 4 : condition < 0.25 ? 3 : condition < 0.5 ? 2 : condition < 0.75 ? 1 : 0;
}

export function weatherBand(t: Pick<Buildable, 'builtYear'>, year: number, condition: number): AgeBand {
  return Math.max(ageBand(t, year), conditionBand(condition)) as AgeBand;
}

function hash(id: string, salt: number): number {
  let h = salt * 0x9e3779b1;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 0x85ebca6b);
  h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
}

const lerp = (a: Pt, b: Pt, u: number): Pt => ({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u });
const pts = (qs: Pt[]): string => qs.map((q) => `${q.x.toFixed(1)},${q.y.toFixed(1)}`).join(' ');

// A derelict's hoarding: site boards 2.4 m high.
const HOARDING = up(2.4);

// Ivy on a historic building (Plan 26), and on one an event left it on
// (Plan 101E): runners climbing the visible walls from the ground, thickest
// and tallest at the corners, each a thin stem that wanders as it rises and
// now and then puts out a side shoot, with small lobed leaves alternating
// along it. Laid out in the wall's own plane, so it climbs the wall at any
// camera; drawn as one path per shade, however many leaves.
const IVY_STEP_PX = 4.6;       // between leaf nodes up a stem, on screen
const IVY_LEAF_PX = 2.2;       // a leaf's half-width, on screen

// One ivy leaf: a pointed tip, two side lobes, a notch at the stalk, in six
// points (a map can hold many ivied buildings); s is
// its half-width, a its turn.
function leafPath(c: Pt, s: number, a: number): string {
  const shape: [number, number][] = [[0, -1.15], [1, -0.25], [0.5, 0.75], [0, 0.4], [-0.5, 0.75], [-1, -0.25]];
  const cos = Math.cos(a); const sin = Math.sin(a);
  return shape.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${(c.x + (x * cos - y * sin) * s).toFixed(1)},${(c.y + (x * sin + y * cos) * s).toFixed(1)}`).join('') + 'Z';
}

function Ivy({ t, f, salt = 0 }: { t: Buildable; f: ReturnType<typeof boxFaces>; salt?: number }) {
  const walls: [Pt, Pt, Pt, Pt][] = [[f.C, f.D, f.Ct, f.Dt], [f.B, f.C, f.Bt, f.Ct]];
  const stems: string[] = [];
  const leaves: [string[], string[], string[]] = [[], [], []]; // dark, mid, light
  const len = (a: Pt, b: Pt) => Math.hypot(b.x - a.x, b.y - a.y);
  walls.forEach(([g0, g1, e0, e1], k) => {
    const wide = len(g0, g1);
    const tall = len(g0, e0);
    if (wide < 4 || tall < 4) return;
    const at = (u: number, v: number) => lerp(lerp(g0, g1, u), lerp(e0, e1, u), v);
    const r = (i: number) => hash(t.id, salt * 1000 + 300 + k * 97 + i);
    let seq = 0;
    const leafAt = (q: Pt, side: number, up: number) => {
      const shade = Math.floor(r(seq++) * 3);
      const s = IVY_LEAF_PX * (0.75 + r(seq++) * 0.5);
      const off = { x: q.x + side * s * 0.9, y: q.y + s * 0.3 };
      leaves[shade]!.push(leafPath(off, s, side * (0.5 + r(seq++) * 0.5) + up));
    };
    // A runner: from (u, v0) up toward vMax, drifting du a step.
    const climb = (u0: number, v0: number, vMax: number, du: number, depth: number) => {
      const steps = Math.max(2, Math.round(((vMax - v0) * tall) / IVY_STEP_PX));
      let u = u0;
      let q = at(u, v0);
      let d = `M${q.x.toFixed(1)},${q.y.toFixed(1)}`;
      for (let i = 1; i <= steps; i++) {
        u = Math.min(0.99, Math.max(0.01, u + du + (r(seq++) - 0.5) * (2.2 / wide)));
        q = at(u, v0 + ((vMax - v0) * i) / steps);
        d += `L${q.x.toFixed(1)},${q.y.toFixed(1)}`;
        leafAt(q, i % 2 === 0 ? 1 : -1, 0);
        if (r(seq++) < 0.2) leafAt(q, i % 2 === 0 ? -1 : 1, 0.3);
        // A side shoot, now and then, a few nodes up and away.
        if (depth === 0 && i > 1 && i < steps - 1 && r(seq++) < 0.18) {
          const v = v0 + ((vMax - v0) * i) / steps;
          climb(u, v, Math.min(vMax, v + (4 * IVY_STEP_PX) / tall), (r(seq++) < 0.5 ? -1 : 1) * (1.6 / wide), 1);
        }
      }
      // The top of a runner ends in a tuft.
      leafAt(q, 1, -0.4);
      leafAt(q, -1, 0.4);
      stems.push(d);
    };
    // Runners by the wall's length, most at the corners.
    const runners = Math.max(3, Math.round(wide / 17));
    for (let i = 0; i < runners; i++) {
      const x = r(seq++);
      // Clear of the door at the wall's middle (buildingMotifs.tsx's doors).
      const mid = 0.15 + r(seq++) * 0.5;
      const u = x < 0.6 ? (x < 0.3 ? x * 0.4 : 1 - (x - 0.3) * 0.4) : mid < 0.4 ? mid : mid + 0.2;
      const corner = 1 - Math.min(u, 1 - u) * 2; // 1 at a corner, 0 mid-wall
      const vMax = 0.25 + (0.35 + corner * 0.35) * (0.6 + r(seq++) * 0.4);
      climb(u, 0, Math.min(0.92, vMax), 0, 0);
    }
  });
  const kinds = ['dark', 'mid', 'light'] as const;
  return (
    <g className="campus-ivy">
      <path className="campus-ivy-stem" d={stems.join('')} />
      {leaves.map((ls, i) => (ls.length > 0 ? <path key={i} className={`campus-ivy-leaf ${kinds[i]}`} d={ls.join('')} /> : null))}
    </g>
  );
}

export default function AgeMarks({ t, p, band, vernacular, historic = false }: {
  t: Buildable; p: { col: number; row: number; w: number; h: number; facing?: Facing }; band: AgeBand; vernacular: Vernacular;
  historic?: boolean;
}) {
  if (band === 0 && !historic) return null;
  // The walls the building actually has (weatherVolumes.ts, Plan 75A), back
  // to front; each volume's marks are masked by the volumes nearer it, since
  // all of them paint over the finished motif.
  const volumes = depthOrder(weatherVolumes(t, p, vernacular));
  const maskId = (i: number) => `age-${t.id.replace(/[^A-Za-z0-9_-]/g, '_')}-${i}`;
  const faces = volumes.map((v) => boxFaces(v.col, v.row, v.w, v.h, v.base, v.height));
  const masks = volumes.map((_, i) => {
    const nearer = faces.slice(i + 1);
    if (nearer.length === 0) return null;
    return (
      <mask key={i} id={maskId(i)}>
        <rect x={-1e5} y={-1e5} width={2e5} height={2e5} fill="white" />
        {nearer.map((f, j) => (
          <g key={j} fill="black">
            <polygon points={pts(f.left)} />
            <polygon points={pts(f.right)} />
            <polygon points={pts(f.top)} />
          </g>
        ))}
      </mask>
    );
  });
  const masked = (i: number, node: React.JSX.Element) => (
    masks[i] ? <g key={i} mask={`url(#${maskId(i)})`}>{node}</g> : <g key={i}>{node}</g>
  );
  if (band === 0) {
    return (
      <g className="campus-age" aria-hidden="true">
        {masks.length > 1 && <defs>{masks}</defs>}
        {volumes.map((_, i) => masked(i, <Ivy t={t} f={faces[i]!} salt={i} />))}
      </g>
    );
  }

  // The tarpaulin goes on the largest volume that takes one.
  const tarpAt = volumes.reduce((best, v, i) => (v.tarp && (best < 0 || v.w * v.h > volumes[best]!.w * volumes[best]!.h) ? i : best), -1);
  const volumeMarks = volumes.map((vol, i) => {
    const f = faces[i]!;
    const salt = i * 1000;
    const hs = (k: number) => hash(t.id, salt + k);
    // The two visible walls, each as its ground edge and its eave edge.
    const walls: [Pt, Pt, Pt, Pt][] = [[f.C, f.D, f.Ct, f.Dt], [f.B, f.C, f.Bt, f.Ct]];
    const spans = [f.spanLeft, f.spanRight];
    // Fewer marks on a small wall (a village house) than on a hall's.
    const scaled = (n: number, span: number) => Math.max(1, Math.min(n, Math.round(n * span / 5)));
    const streaks: string[] = [];
    const slates: string[] = [];
    walls.forEach(([g0, g1, e0, e1], k) => {
      const count = scaled(3 + Math.floor(hs(k) * 3), spans[k]!);
      for (let j = 0; j < count; j++) {
        const u = 0.08 + 0.84 * hs(10 + k * 10 + j);
        const top = lerp(e0, e1, u);
        const foot = lerp(g0, g1, u);
        const reach = 0.3 + 0.35 * hs(40 + k * 10 + j);
        const end = lerp(top, foot, reach);
        streaks.push(`M${top.x.toFixed(1)},${(top.y + 2).toFixed(1)}L${end.x.toFixed(1)},${end.y.toFixed(1)}`);
      }
      if (band >= 2) {
        const gaps = scaled(2 + Math.floor(hs(90 + k) * 3), spans[k]!);
        for (let j = 0; j < gaps; j++) {
          const u = 0.1 + 0.8 * hs(100 + k * 10 + j);
          const a = lerp(e0, e1, u);
          const b = lerp(e0, e1, Math.min(1, u + 0.05));
          slates.push(`M${a.x.toFixed(1)},${(a.y - 1).toFixed(1)}L${b.x.toFixed(1)},${(b.y - 1).toFixed(1)}`);
        }
      }
    });
    // Boarded windows: planks across a few openings on each visible wall,
    // large enough to read at the opening zoom (Plan 74B).
    const boards: string[] = [];
    const planks: string[] = [];
    if (band >= 3 && vol.boards) {
      walls.forEach(([g0, g1, e0, e1], k) => {
        const n = scaled(4, spans[k]!);
        for (let j = 0; j < n; j++) {
          const u = 0.12 + 0.76 * hs(200 + k * 10 + j);
          const v = 0.22 + 0.45 * hs(240 + k * 10 + j);
          const a = lerp(lerp(g0, g1, u - 0.05), lerp(e0, e1, u - 0.05), v);
          const b = lerp(lerp(g0, g1, u + 0.05), lerp(e0, e1, u + 0.05), v);
          const c = lerp(lerp(g0, g1, u + 0.05), lerp(e0, e1, u + 0.05), v + 0.18);
          const d = lerp(lerp(g0, g1, u - 0.05), lerp(e0, e1, u - 0.05), v + 0.18);
          boards.push(`M${[a, b, c, d].map((q) => `${q.x.toFixed(1)},${q.y.toFixed(1)}`).join('L')}Z`);
          planks.push(`M${a.x.toFixed(1)},${a.y.toFixed(1)}L${c.x.toFixed(1)},${c.y.toFixed(1)}`);
        }
      });
    }
    // The tarpaulin: a sheet over part of the longer near eave, lying up the
    // roof's slope and hanging a little down the wall.
    let tarp: Pt[] | null = null;
    let flap: Pt[] | null = null;
    if (band === 4 && i === tarpAt) {
      const side = vol.w >= vol.h ? 1 : 0;
      const [tg0, tg1, te0, te1] = walls[side]!;
      const t0 = 0.15 + 0.3 * hs(500);
      const t1 = t0 + 0.3;
      const depth = 0.22;
      const inward = side === 1 ? f.Dt : f.Bt;
      const rise = vol.ridge * depth * 2;
      const back = { x: (inward.x - f.Ct.x) * depth, y: (inward.y - f.Ct.y) * depth - rise };
      const eaveA = lerp(te0, te1, t0);
      const eaveB = lerp(te0, te1, t1);
      const up2 = (q: Pt): Pt => ({ x: q.x + back.x, y: q.y + back.y });
      tarp = [eaveA, eaveB, up2(lerp(eaveA, eaveB, 0.94)), up2(eaveA)];
      flap = [lerp(eaveA, lerp(tg0, tg1, t0), 0.14), lerp(eaveB, lerp(tg0, tg1, t1 - 0.04), 0.1), eaveB, eaveA];
    }
    return masked(i, (
      <>
        {band === 4 && (
          <>
            <polygon className="campus-age-grime" points={pts(f.left)} />
            <polygon className="campus-age-grime" points={pts(f.right)} />
          </>
        )}
        <path className="campus-age-streak" d={streaks.join('')} />
        {slates.length > 0 && <path className="campus-age-slates" d={slates.join('')} />}
        {boards.length > 0 && <path className="campus-age-boards" d={boards.join('')} />}
        {planks.length > 0 && <path className="campus-age-plank" d={planks.join('')} />}
        {historic && <Ivy t={t} f={f} salt={i} />}
        {tarp && flap && (
          <>
            <polygon className="campus-age-tarp" points={pts(tarp)} />
            <polygon className="campus-age-tarp flap" points={pts(flap)} />
          </>
        )}
      </>
    ));
  });

  // Derelict: a timber hoarding round the whole plot and weeds at its foot,
  // whatever stands on it.
  const ground = boxFaces(p.col - 0.3, p.row - 0.3, p.w + 0.6, p.h + 0.6, 0, 0);
  const hoard = boxFaces(p.col - 0.3, p.row - 0.3, p.w + 0.6, p.h + 0.6, 0, HOARDING);
  // The hoarding's two near runs, with a post every half tile or so.
  const runs: [Pt, Pt, Pt, Pt][] = [[ground.D, ground.C, hoard.Dt, hoard.Ct], [ground.C, ground.B, hoard.Ct, hoard.Bt]];
  const posts = runs.map(([g0, g1, e0, e1]) => {
    const n = Math.max(2, Math.round(Math.hypot(g1.x - g0.x, g1.y - g0.y) / 14));
    return Array.from({ length: n - 1 }, (_, j) => {
      const u = (j + 1) / n;
      const a = lerp(g0, g1, u);
      const b = lerp(e0, e1, u);
      return `M${a.x.toFixed(1)},${a.y.toFixed(1)}L${b.x.toFixed(1)},${b.y.toFixed(1)}`;
    }).join('');
  }).join('');
  return (
    <g className="campus-age" aria-hidden="true">
      {masks.length > 1 && <defs>{masks}</defs>}
      {volumeMarks}
      {band === 4 && (
        <>
          <polygon className="campus-age-hoarding" points={pts(runs[0]!.slice(0, 2).concat([runs[0]![3], runs[0]![2]]))} />
          <polygon className="campus-age-hoarding" points={pts(runs[1]!.slice(0, 2).concat([runs[1]![3], runs[1]![2]]))} />
          <path className="campus-age-post" d={posts} />
          <path className="campus-age-weeds" d={runs.map(([g0, g1]) => [0.1, 0.3, 0.55, 0.8].map((u) => {
            const q = lerp(g0, g1, u);
            return `M${(q.x - 3).toFixed(1)},${(q.y + 1).toFixed(1)}q3,-7 6,0`;
          }).join('')).join('')} />
        </>
      )}
    </g>
  );
}

// A sinkhole by the door (Plan 101E, the-sinkhole's "Fence it"): a pit in
// a rim of turned earth, its far wall showing, and a ring of posts and a
// rail round it, on the ground out from the front wall to one side of the
// steps. Drawn with the building, so only while the camera sees that
// front: then the hole lies in front of it, never over it.
const SINKHOLE_POST = up(1.1);
export function Sinkhole({ p }: { p: { col: number; row: number; w: number; h: number; facing?: Facing } }) {
  if (!sideSeen(p.facing, 'front')) return null;
  const dir = wallOfSide(p.facing, 'front');
  const out = 1.25;
  const along = (span: number) => span * 0.3;
  const c = dir === 'posRow' ? { col: p.col + along(p.w), row: p.row + p.h + out }
    : dir === 'negRow' ? { col: p.col + p.w - along(p.w), row: p.row - out }
      : dir === 'posCol' ? { col: p.col + p.w + out, row: p.row + p.h - along(p.h) }
        : { col: p.col - out, row: p.row + along(p.h) };
  const rim = projectedCircle(c.col, c.row, 0.62, 20);
  const pit = projectedCircle(c.col, c.row, 0.46, 20);
  // The far wall of the pit: the pit's own outline, dropped a little.
  const floor = pit.map((q) => ({ x: q.x, y: q.y + 2.2 }));
  const ring = projectedCircle(c.col, c.row, 0.92, 10);
  const tops = ring.map((q) => lift(q, SINKHOLE_POST));
  const rail = [...tops, tops[0]!];
  return (
    <g className="campus-sinkhole" aria-hidden="true">
      <polygon points={polyPoints(rim)} fill="#7a6248" />
      <polygon points={polyPoints(pit)} fill="#4a3826" />
      <polygon points={polyPoints(floor)} fill="#20170f" />
      {ring.map((q, i) => <line key={i} x1={q.x.toFixed(1)} y1={q.y.toFixed(1)} x2={tops[i]!.x.toFixed(1)} y2={tops[i]!.y.toFixed(1)} stroke="#d9c79a" strokeWidth={0.9} />)}
      <polyline points={polyPoints(rail)} fill="none" stroke="#e2cf8f" strokeWidth={0.7} />
    </g>
  );
}
