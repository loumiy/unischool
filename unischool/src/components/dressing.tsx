import { useContext } from 'react';
import type { CampusLayout } from './campusLayout';
import { BannerContext } from './mapOccasions';
import { FOUNDERS_HALL_ID } from '../data/techData';
import type { BenchFacing, Dressing, SchoolColors } from '../state/types';
import { isLand, parsePathTileKey } from '../state/campusMap';
import { FACING_STEP, benchFacingOf } from '../state/dressing';
import { isAcademicHall } from '../data/techData';
import { groundSquash, lift, polyPoints, project, type Pt } from './isoProjection';
import { depthOrder, type DepthBox } from './depthSort';
import { castShadow } from './light';
import { up } from './campusScale';
import { downwind, flagCloth } from './wind';

// The small things along the walks: lamps and benches the player places
// beside the paths, and bike racks that appear beside the halls and dorms
// once the college is big enough to cycle. Each is a prop in the depth-sorted
// scene (CampusMap.tsx), drawn once per layout.

// Racks appear at this enrollment (campusLayout.ts carries the flag).
export const BIKE_RACK_ENROLMENT = 2_000;

export interface DressingProp {
  key: string;
  col: number; row: number; w: number; h: number;
  node: React.JSX.Element;
}

const LAMP_HEIGHT = up(4.5);
const BENCH_SEAT = up(0.9);
const BENCH_BACK = up(1.9);
const BENCH_APRON = up(0.14);

// A lamp, with a banner in the college's colors in commencement week. The
// banner hangs from a bracket on the downwind side (wind.ts), so it stays on
// the same side of the post over the ground as the camera turns; its foot is
// a ground circle, as squashed as the ground is (groundSquash).
const BANNER_BRACKET_TILES = 0.018;   // 0.8 units at the opening camera
const BANNER_TILES = 0.126;           // 5.5 units
export function Lamp({ at }: { at: Pt }) {
  return lampArt({ at }, useContext(BannerContext));
}
// The lamp given commencement's banner, if any: what the canvas map draws.
export function lampArt({ at }: { at: Pt }, banner: SchoolColors | null): React.JSX.Element {
  const top = lift(at, LAMP_HEIGHT);
  const hang = lift(at, LAMP_HEIGHT * 0.82);
  const foot = lift(at, LAMP_HEIGHT * 0.42);
  const b = downwind(BANNER_BRACKET_TILES);
  const w = downwind(BANNER_TILES);
  // A band of the banner, `v0` to `v1` of the way down it.
  const band = (v0: number, v1: number) => {
    const y0 = hang.y + (foot.y - hang.y) * v0; const y1 = hang.y + (foot.y - hang.y) * v1;
    const x = hang.x + b.x; const dy = b.y;
    return polyPoints([
      { x, y: y0 + dy }, { x: x + w.x, y: y0 + dy + w.y }, { x: x + w.x, y: y1 + dy + w.y }, { x, y: y1 + dy },
    ]);
  };
  return (
    <g className="campus-lamp">
      <ellipse className="campus-lamp-foot" cx={at.x} cy={at.y} rx={2.4} ry={2.4 * groundSquash()} />
      <line className="campus-lamp-post" x1={at.x} y1={at.y} x2={top.x} y2={top.y} />
      <circle className="campus-lamp-head" cx={top.x} cy={top.y} r={2.6} />
      {banner && (
        <g className="campus-lamp-banner">
          <polygon points={band(0, 1)} fill={banner.primary} />
          <polygon points={band(0.62, 0.78)} fill={banner.secondary} />
        </g>
      )}
    </g>
  );
}

const FLAG_HEIGHT = up(14);

// The college's flag on a pole before Founders Hall, flying downwind
// (wind.ts) and foreshortened with the tilt.
const FLAG_TILES = 0.37;   // the cloth's length: 16 units at the opening camera
const FLAG_DROP = 10;
function Flag({ at, colors }: { at: Pt; colors: CampusLayout['colors'] }) {
  const top = lift(at, FLAG_HEIGHT);
  return (
    <g className="campus-flag">
      <ellipse className="campus-lamp-foot" cx={at.x} cy={at.y} rx={2.6} ry={2.6 * groundSquash()} />
      <line className="campus-flag-pole" x1={at.x} y1={at.y} x2={top.x} y2={top.y} />
      <path d={flagCloth(top, FLAG_TILES, 1, FLAG_DROP, 3)} fill={colors.primary} />
      <path d={flagCloth(top, FLAG_TILES, 1 + FLAG_DROP * 0.4, FLAG_DROP * 0.22, 3)} fill={colors.secondary} />
      <circle className="campus-flag-finial" cx={top.x} cy={top.y - 1} r={1.4} />
    </g>
  );
}

// A bench (Plan 80I): set against one edge of its tile and facing out
// across it, toward the path beside it, with its back to the lawn. A
// slatted seat and a slatted, raked back on cast-iron ends that carry the
// arms, at the walkers' scale (Walkers.tsx: a figure's hips are about the
// seat's height), so it keeps its shape at the opening zoom. Its parts are
// painted in depthOrder, so the back hides the seat when the bench faces
// away and the near end covers the seat's end, from any side.
const BENCH_HALF = 0.21;         // half its length, in tiles
const BENCH_DEPTH = 0.07;        // half the seat's depth
const BENCH_LEAN = 0.035;        // how far the back rakes behind the seat
const BENCH_EDGE = 0.06;         // the seat's front from the tile's edge
const BENCH_ARM = up(1.35);
const BENCH_END = 0.03;          // the iron end's plan, outside the seat
function benchFrame(col: number, row: number, facing: BenchFacing) {
  const o = FACING_STEP[facing];
  // u along the bench (on the other grid axis), v out across the edge.
  const a = o.dr === 0 ? { dr: 1, dc: 0 } : { dr: 0, dc: 1 };
  const reach = 0.5 - BENCH_EDGE - BENCH_DEPTH;
  const c0 = col + 0.5 + o.dc * reach; const r0 = row + 0.5 + o.dr * reach;
  const G = (u: number, v: number) => ({ col: c0 + a.dc * u + o.dc * v, row: r0 + a.dr * u + o.dr * v });
  const P = (u: number, v: number, z: number) => { const g = G(u, v); return lift(project(g.col, g.row), z); };
  // A (u, v) rectangle as the grid box the depth sort takes.
  const box = (u0: number, u1: number, v0: number, v1: number): DepthBox => {
    const p = G(u0, v0); const q = G(u1, v1);
    return { col: Math.min(p.col, q.col), row: Math.min(p.row, q.row), w: Math.abs(q.col - p.col), h: Math.abs(q.row - p.row) };
  };
  return { P, box };
}

export function Bench({ col, row, facing, ghost = false }: { col: number; row: number; facing: BenchFacing; ghost?: boolean }) {
  const { P, box } = benchFrame(col, row, facing);
  const L = BENCH_HALF; const vF = BENCH_DEPTH; const vB = -BENCH_DEPTH;
  const rise = BENCH_BACK - BENCH_SEAT;
  // The back's plane: raked by BENCH_LEAN over its height.
  const backV = (z: number) => vB - BENCH_LEAN * Math.max(0, (z - BENCH_SEAT) / rise);
  const quad = (pts: Pt[]) => polyPoints(pts);
  const seatSlats = [[vB, vB + 0.04], [vB + 0.05, vB + 0.09], [vB + 0.1, vF]] as const;
  const backSlats = [[0.26, 0.54], [0.66, 1]] as const;
  const end = (u: number) => {
    const armBack = backV(BENCH_ARM);
    const pts = [
      // The front leg, up to the arm.
      [P(u, vF - 0.012, 0), P(u, vF - 0.012, BENCH_ARM)],
      // The back leg, carried up as the back's upright.
      [P(u, vB, 0), P(u, vB, BENCH_SEAT), P(u, backV(BENCH_BACK), BENCH_BACK)],
      // The arm, and the rail under the seat.
      [P(u, vF + 0.004, BENCH_ARM), P(u, armBack, BENCH_ARM)],
      [P(u, vF - 0.012, BENCH_SEAT * 0.94), P(u, vB, BENCH_SEAT * 0.94)],
    ];
    return pts.map((line) => line.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join('')).join('');
  };
  const parts = depthOrder([
    { ...box(-L - BENCH_END, -L, backV(BENCH_BACK), vF), part: 'endA' as const },
    { ...box(L, L + BENCH_END, backV(BENCH_BACK), vF), part: 'endB' as const },
    { ...box(-L, L, backV(BENCH_BACK), vB), part: 'back' as const },
    { ...box(-L, L, vB, vF), part: 'seat' as const },
  ]);
  const shadow = box(-L, L, backV(BENCH_BACK), vF);
  return (
    <g className={`campus-bench${ghost ? ' ghost' : ''}`}>
      <polygon className="campus-bench-shadow" points={polyPoints(castShadow(shadow.col, shadow.row, shadow.w, shadow.h, BENCH_SEAT))} />
      {parts.map(({ part }) => {
        if (part === 'endA' || part === 'endB') {
          return <path key={part} className="campus-bench-iron" d={end(part === 'endA' ? -L - BENCH_END / 2 : L + BENCH_END / 2)} />;
        }
        if (part === 'back') {
          return (
            <g key={part}>
              {backSlats.map(([k0, k1], i) => {
                const z0 = BENCH_SEAT + rise * k0; const z1 = BENCH_SEAT + rise * k1;
                return <polygon key={i} className="campus-bench-back" points={quad([P(-L, backV(z0), z0), P(L, backV(z0), z0), P(L, backV(z1), z1), P(-L, backV(z1), z1)])} />;
              })}
            </g>
          );
        }
        return (
          <g key={part}>
            {/* The seat's front edge, then its three slats. */}
            <polygon className="campus-bench-apron" points={quad([P(-L, vF, BENCH_SEAT), P(L, vF, BENCH_SEAT), P(L, vF, BENCH_SEAT - BENCH_APRON), P(-L, vF, BENCH_SEAT - BENCH_APRON)])} />
            {seatSlats.map(([v0, v1], i) => (
              <polygon key={i} className="campus-bench-seat" points={quad([P(-L, v0, BENCH_SEAT), P(L, v0, BENCH_SEAT), P(L, v1, BENCH_SEAT), P(-L, v1, BENCH_SEAT)])} />
            ))}
          </g>
        );
      })}
    </g>
  );
}

// A row of hoops beside a door.
function Rack({ col, row }: { col: number; row: number }) {
  const hoops = [];
  for (let i = 0; i < 4; i++) {
    const foot = project(col + 0.2 + i * 0.2, row + 0.5);
    const top = lift(foot, up(0.8));
    hoops.push(<line key={i} className="campus-rack-hoop" x1={foot.x} y1={foot.y} x2={top.x} y2={top.y} />);
  }
  return <g className="campus-rack">{hoops}</g>;
}

export function dressingProps(layout: CampusLayout): DressingProp[] {
  const out: DressingProp[] = [];
  for (const [key, item] of Object.entries(layout.dressing ?? ({} as Dressing))) {
    const t = parsePathTileKey(key);
    if (!t) continue;
    const facing = benchFacingOf(item);
    const node = facing === null
      ? <Lamp at={project(t.col + 0.5, t.row + 0.5)} />
      : <Bench col={t.col} row={t.row} facing={facing} />;
    out.push({ key: `d-${key}`, col: t.col, row: t.row, w: 1, h: 1, node });
  }
  // The flag, just off Founders Hall's front corner, on whichever of two
  // spots is open land.
  const hall = layout.byId.get(FOUNDERS_HALL_ID);
  if (hall && !hall.developing) {
    const { p } = hall;
    const spots = [{ row: p.row + p.h, col: p.col }, { row: p.row - 1, col: p.col }];
    const free = spots.find(({ row, col }) => isLand(row, col)
      && !Object.values(layout.placements).some((q) => row >= q.row && row < q.row + q.h && col >= q.col && col < q.col + q.w));
    if (free) {
      out.push({ key: 'flag', ...free, w: 1, h: 1, node: <Flag at={project(free.col + 0.5, free.row + 0.5)} colors={layout.colors} /> });
    }
  }
  if (layout.bikeRacks) {
    const taken = new Set(Object.keys(layout.dressing ?? {}));
    for (const { t, p, developing } of layout.placed) {
      if (developing || !(t.kind === 'dorm' || isAcademicHall(t))) continue;
      // Beside the front door (the +row side), just off its middle.
      const col = p.col + Math.floor(p.w / 2) + 1;
      const row = p.row + p.h;
      const key = `${row},${col}`;
      if (!isLand(row, col) || taken.has(key) || Object.values(layout.placements).some((q) => row >= q.row && row < q.row + q.h && col >= q.col && col < q.col + q.w)) continue;
      out.push({ key: `r-${t.id}`, col, row, w: 1, h: 1, node: <Rack col={col} row={row} /> });
    }
  }
  return out;
}
