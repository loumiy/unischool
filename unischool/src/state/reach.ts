import type { Buildable, Footprint, GameState } from './types';
import { CAMPUS_GRID_HEIGHT, CAMPUS_GRID_WIDTH } from './types';
import { ROAD_FIRST_ROW, footprintIsClear } from './campusMap';

// Reachability (ported from v2's reach.ts): a building nobody can walk to is
// not a building. Every building must have a way on foot from the road, over
// open ground, paths, trees or a quad, and nothing may be placed that walls
// off a building already standing. It is a floor, not a pathfinder, and a
// building an older save left walled off stays standing: only a change that
// cuts off something reachable is refused.
//
// Walking is four-way: a gap between two corners is not a way through.
// The map is cosmetic, so this rules only on siting (canPlace), never on a
// system.

export type SiteState = Pick<GameState, 'placements' | 'tech'>;

const idx = (row: number, col: number) => row * CAMPUS_GRID_WIDTH + col;

// A quad is open ground with a name: people cross it, and it needs no door.
function isWalkable(t: Pick<Buildable, 'facilityType'> | undefined): boolean {
  return t?.facilityType === 'quad';
}

export function needsAccess(t: Pick<Buildable, 'facilityType'>): boolean {
  return !isWalkable(t);
}

interface Site { row: number; col: number; w: number; h: number }

const N = CAMPUS_GRID_WIDTH * CAMPUS_GRID_HEIGHT;

function block(open: Uint8Array, p: Site): void {
  for (let r = p.row; r < p.row + p.h; r++) {
    for (let c = p.col; c < p.col + p.w; c++) open[idx(r, c)] = 0;
  }
}

// The tiles a person can stand on: everything but the buildings.
export function openMask(s: SiteState): Uint8Array {
  const open = new Uint8Array(N).fill(1);
  for (const [id, p] of Object.entries(s.placements)) {
    if (!isWalkable(s.tech.find((t) => t.id === id))) block(open, p);
  }
  return open;
}

// Every open tile reachable on foot from the road, as a mask.
function flood(open: Uint8Array): Uint8Array {
  const seen = new Uint8Array(N);
  const queue = new Int32Array(N);
  let tail = 0;
  const visit = (j: number) => {
    if (open[j] && !seen[j]) {
      seen[j] = 1;
      queue[tail++] = j;
    }
  };
  for (let r = ROAD_FIRST_ROW; r < CAMPUS_GRID_HEIGHT; r++) {
    for (let c = 0; c < CAMPUS_GRID_WIDTH; c++) visit(idx(r, c));
  }
  for (let q = 0; q < tail; q++) {
    const i = queue[q];
    const col = i % CAMPUS_GRID_WIDTH;
    const row = (i - col) / CAMPUS_GRID_WIDTH;
    if (col + 1 < CAMPUS_GRID_WIDTH) visit(i + 1);
    if (col > 0) visit(i - 1);
    if (row + 1 < CAMPUS_GRID_HEIGHT) visit(i + CAMPUS_GRID_WIDTH);
    if (row > 0) visit(i - CAMPUS_GRID_WIDTH);
  }
  return seen;
}

export function reachFromRoad(s: SiteState): Uint8Array {
  return flood(openMask(s));
}

// Is some tile beside the footprint reachable?
export function reachable(reach: Uint8Array, p: Site): boolean {
  for (let c = p.col; c < p.col + p.w; c++) {
    if (p.row > 0 && reach[idx(p.row - 1, c)]) return true;
    if (p.row + p.h < CAMPUS_GRID_HEIGHT && reach[idx(p.row + p.h, c)]) return true;
  }
  for (let r = p.row; r < p.row + p.h; r++) {
    if (p.col > 0 && reach[idx(r, p.col - 1)]) return true;
    if (p.col + p.w < CAMPUS_GRID_WIDTH && reach[idx(r, p.col + p.w)]) return true;
  }
  return false;
}

// Is the one-tile ring round a site, corners included, on the grid and open?
// Then blocking the site cannot cut anything off, since every walk through
// it can go round by the ring, and the site is reachable exactly when the
// ring is. That settles most sites without a second flood.
function ringIsOpen(open: Uint8Array, p: Site): boolean {
  if (p.row < 1 || p.col < 1 || p.row + p.h >= CAMPUS_GRID_HEIGHT || p.col + p.w >= CAMPUS_GRID_WIDTH) return false;
  for (let c = p.col - 1; c <= p.col + p.w; c++) {
    if (!open[idx(p.row - 1, c)] || !open[idx(p.row + p.h, c)]) return false;
  }
  for (let r = p.row; r < p.row + p.h; r++) {
    if (!open[idx(r, p.col - 1)] || !open[idx(r, p.col + p.w)]) return false;
  }
  return true;
}

// A campus to try many sites against, measured once.
export interface ReachCache { open: Uint8Array; before: Uint8Array }

export function reachCache(s: SiteState): ReachCache {
  const open = openMask(s);
  return { open, before: flood(open) };
}

// Why the walk refuses a site, or null: no way to it from the road, or it
// would wall off a building that had one.
export function accessRefusal(
  s: SiteState, t: Buildable, row: number, col: number, fp: Footprint, cache: ReachCache = reachCache(s),
): string | null {
  const site = { row, col, ...fp };
  if (isWalkable(t)) return null;
  if (ringIsOpen(cache.open, site)) {
    return reachable(cache.before, site) ? null : 'no way to walk to it from the road';
  }
  const open = cache.open.slice();
  block(open, site);
  const after = flood(open);
  if (!reachable(after, site)) return 'no way to walk to it from the road';
  for (const [id, p] of Object.entries(s.placements)) {
    const other = s.tech.find((x) => x.id === id);
    if (!other || !needsAccess(other)) continue;
    if (reachable(cache.before, p) && !reachable(after, p)) return `it would wall off ${other.name}`;
  }
  return null;
}

// A site whose ring is open: cheap to accept, and it leaves a walk round the
// building. firstFreeSpot prefers these.
export function hasOpenRing(cache: ReachCache, row: number, col: number, fp: Footprint): boolean {
  return ringIsOpen(cache.open, { row, col, ...fp });
}

// Why a building may not go here, or null if it may: the ground first (cheap),
// then the walk.
export function siteRefusal(s: SiteState, t: Buildable, row: number, col: number, fp: Footprint): string | null {
  if (!footprintIsClear(s.placements, row, col, fp)) return 'not enough clear ground';
  return accessRefusal(s, t, row, col, fp);
}
