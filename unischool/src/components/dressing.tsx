import type { CampusLayout } from './campusLayout';
import type { Dressing } from '../state/types';
import { isLand, parsePathTileKey } from '../state/campusMap';
import { isAcademicHall } from '../data/techData';
import { lift, project, type Pt } from './isoProjection';
import { up } from './campusScale';

// The small things along the walks: lamps and benches the player places
// beside the paths, and bike racks that appear beside the halls and dorms
// once the college is big enough to cycle. Each is a prop in the depth-sorted
// scene (CampusMap.tsx), drawn once per layout.

// Racks appear at this enrolment (campusLayout.ts carries the flag).
export const BIKE_RACK_ENROLMENT = 2_000;

export interface DressingProp {
  key: string;
  col: number; row: number; w: number; h: number;
  node: React.JSX.Element;
}

const LAMP_HEIGHT = up(4.5);
const BENCH_SEAT = up(0.45);
const BENCH_BACK = up(0.9);

function Lamp({ at }: { at: Pt }) {
  const top = lift(at, LAMP_HEIGHT);
  return (
    <g className="campus-lamp">
      <ellipse className="campus-lamp-foot" cx={at.x} cy={at.y} rx={2.4} ry={1.2} />
      <line className="campus-lamp-post" x1={at.x} y1={at.y} x2={top.x} y2={top.y} />
      <circle className="campus-lamp-head" cx={top.x} cy={top.y} r={2.6} />
    </g>
  );
}

// A bench runs along the tile's row or column, whichever way the path it
// faces runs.
function Bench({ col, row, along }: { col: number; row: number; along: 'col' | 'row' }) {
  const half = 0.28;
  const [a, b] = along === 'col'
    ? [project(col + 0.5 - half, row + 0.5), project(col + 0.5 + half, row + 0.5)]
    : [project(col + 0.5, row + 0.5 - half), project(col + 0.5, row + 0.5 + half)];
  const seat = [lift(a, BENCH_SEAT), lift(b, BENCH_SEAT)];
  const back = [lift(a, BENCH_BACK), lift(b, BENCH_BACK)];
  return (
    <g className="campus-bench">
      <line className="campus-bench-leg" x1={a.x} y1={a.y} x2={seat[0].x} y2={seat[0].y} />
      <line className="campus-bench-leg" x1={b.x} y1={b.y} x2={seat[1].x} y2={seat[1].y} />
      <line className="campus-bench-seat" x1={seat[0].x} y1={seat[0].y} x2={seat[1].x} y2={seat[1].y} />
      <line className="campus-bench-back" x1={back[0].x} y1={back[0].y} x2={back[1].x} y2={back[1].y} />
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

// Which way the paving beside a tile runs: a bench faces a path along it.
function benchAlong(pathways: CampusLayout['pathways'], row: number, col: number): 'col' | 'row' {
  const across = `${row},${col - 1}` in pathways || `${row},${col + 1}` in pathways;
  return across ? 'row' : 'col';
}

export function dressingProps(layout: CampusLayout): DressingProp[] {
  const out: DressingProp[] = [];
  for (const [key, kind] of Object.entries(layout.dressing ?? ({} as Dressing))) {
    const t = parsePathTileKey(key);
    if (!t) continue;
    const node = kind === 'lamp'
      ? <Lamp at={project(t.col + 0.5, t.row + 0.5)} />
      : <Bench col={t.col} row={t.row} along={benchAlong(layout.pathways, t.row, t.col)} />;
    out.push({ key: `d-${key}`, col: t.col, row: t.row, w: 1, h: 1, node });
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
