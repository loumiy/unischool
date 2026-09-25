import type { GameState, Placement } from '../../state/types';
import { isAcademicHall } from '../../data/techData';

// Pairing bumps (Plan 26, v2's small layout effects): sensible neighbors are
// worth a little. Residences near a dining hall lift housing; halls near a
// library lift academic life. Each is the share of the kind that has the
// neighbor, times PAIRING_POINTS, so it can never exceed that. Read by the
// satisfaction breakdown. The second of the two systems/ modules that read
// the map (test/invariants.test.ts, section 4).

export const PAIRING_POINTS = 2;
const DORM_TO_DINING_TILES = 6;
const HALL_TO_LIBRARY_TILES = 8;

// The gap between two footprints, in tiles along the grid (0 when touching).
function gap(a: Placement, b: Placement): number {
  const dc = Math.max(0, a.col - (b.col + b.w), b.col - (a.col + a.w));
  const dr = Math.max(0, a.row - (b.row + b.h), b.row - (a.row + a.h));
  return Math.max(dc, dr);
}

function share(s: GameState, done: (id: string) => boolean, isA: (id: string) => boolean, isB: (id: string) => boolean, within: number): number {
  const as = Object.entries(s.placements).filter(([id]) => isA(id) && done(id));
  const bs = Object.entries(s.placements).filter(([id]) => isB(id) && done(id));
  if (as.length === 0 || bs.length === 0) return 0;
  const near = as.filter(([, p]) => bs.some(([, q]) => gap(p, q) <= within)).length;
  return near / as.length;
}

export interface PairingBumps { housing: number; academic: number }

export function pairingBumps(s: GameState): PairingBumps {
  const byId = new Map(s.tech.map((t) => [t.id, t]));
  const dorm = (id: string) => byId.get(id)?.kind === 'dorm';
  const dining = (id: string) => byId.get(id)?.facilityType === 'diningHall';
  const hall = (id: string) => { const t = byId.get(id); return t !== undefined && isAcademicHall(t); };
  const library = (id: string) => byId.get(id)?.facilityType === 'library';
  const done = (id: string) => byId.get(id)?.status === 'done';
  return {
    housing: PAIRING_POINTS * share(s, done, dorm, dining, DORM_TO_DINING_TILES),
    academic: PAIRING_POINTS * share(s, done, hall, library, HALL_TO_LIBRARY_TILES),
  };
}
