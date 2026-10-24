import type { BenchFacing, Buildable, DressingItem, DressingKind, Pathways, Placements } from './types';
import { occupantAt } from './campusMap';
import { quadTile } from './quadGeometry';

// Lamps, benches, banner lamps and flower beds (Plan 80I, and the
// decoration that followed it): what a stored item is, and which way a
// bench faces. A bench is set against one edge of its tile and faces out
// across it, toward the path beside it; R turns it while it is being
// placed (CampusMap.tsx). Grid compass: north is -row, east +col.

// Clockwise seen from above: what R steps through.
export const BENCH_FACINGS: readonly BenchFacing[] = ['n', 'e', 's', 'w'];

// The step one facing takes across the grid.
export const FACING_STEP: Readonly<Record<BenchFacing, { dr: number; dc: number }>> = {
  n: { dr: -1, dc: 0 }, e: { dr: 0, dc: 1 }, s: { dr: 1, dc: 0 }, w: { dr: 0, dc: -1 },
};

export function benchItem(facing: BenchFacing): DressingItem {
  return `bench-${facing}`;
}

// The items that are only their kind: everything but a bench.
const PLAIN_ITEMS: readonly DressingItem[] = ['lamp', 'bannerLamp', 'flowerbed'];

export function dressingKindOf(item: DressingItem): DressingKind {
  return item.startsWith('bench-') ? 'bench' : item as DressingKind;
}

// A bench's facing, or null for anything else.
export function benchFacingOf(item: DressingItem): BenchFacing | null {
  return item.startsWith('bench-') ? item.slice(6) as BenchFacing : null;
}

// Whether a stored value is an item this version draws (a save's hygiene).
export function isDressingItem(v: unknown): v is DressingItem {
  if ((PLAIN_ITEMS as readonly unknown[]).includes(v)) return true;
  return typeof v === 'string' && v.startsWith('bench-') && (BENCH_FACINGS as readonly string[]).includes(v.slice(6));
}

// A quarter turn clockwise.
export function turnFacing(f: BenchFacing): BenchFacing {
  return BENCH_FACINGS[(BENCH_FACINGS.indexOf(f) + 1) % 4];
}

// A new bench faces the path beside it, its back to the lawn. With paths on
// more than one side it prefers the sides the opening view looks at (south,
// then east); on a path with none beside it, south.
const DEFAULT_ORDER: readonly BenchFacing[] = ['s', 'e', 'w', 'n'];
export function defaultBenchFacing(pathways: Pathways, row: number, col: number): BenchFacing {
  return DEFAULT_ORDER.find((f) => `${row + FACING_STEP[f].dr},${col + FACING_STEP[f].dc}` in pathways) ?? 's';
}

// How a bench was drawn before it stored a facing (save version 81 and
// earlier): along the row, facing east, when paving lay east or west of it;
// else along the column, facing south. The migration keeps it that way.
export function legacyBenchFacing(pathways: Pathways, row: number, col: number): BenchFacing {
  return `${row},${col - 1}` in pathways || `${row},${col + 1}` in pathways ? 'e' : 's';
}

// The building that keeps a bench, lamp or bed off a tile, or undefined when
// one may go there (the reducer's PLACE_DRESSING, and the map's words for a
// refusal). Nothing goes on a building. A quad is a building too, but since
// Plan 115H its lawn takes dressing. Its walks and centrepiece still refuse,
// and the Grand Quad has no lawn a player may dress (quadTile).
export function dressingBlocker(
  s: { placements: Placements; tech: ReadonlyArray<Pick<Buildable, 'id' | 'facilityType' | 'tier'>> },
  row: number, col: number,
): string | undefined {
  const id = occupantAt(s.placements, row, col);
  if (id === undefined) return undefined;
  const t = s.tech.find((x) => x.id === id);
  const p = s.placements[id]!;
  if (t?.facilityType === 'quad' && quadTile(p.col, p.row, p.w, p.h, t.tier ?? 1, col, row) === 'lawn') return undefined;
  return id;
}
