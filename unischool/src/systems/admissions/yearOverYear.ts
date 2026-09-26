import type { FunnelFactors, FunnelRecord } from '../../state/types';
import type { AdmissionsProjection } from './admissionsSystem';

// Year over year on the admissions reveal. The funnel is a product of six
// factors (types.ts's FunnelFactors) and last summer's are recorded
// (students.lastFunnel), so the pool's change decomposes exactly: each
// factor's ratio, this year over last, is its share, and the ratios multiply
// to the pool's own ratio (before rounding). Word of mouth is named on
// purpose so players learn that satisfaction grows the pool.

export interface PoolMove {
  key: keyof FunnelFactors;
  label: string;
  change: number; // this year's factor over last year's, less one: +0.08 is "+8%"
}

export interface PoolChange {
  lastApplicants: number;
  change: number;    // the pool's own move, this year over last, less one
  parts: PoolMove[]; // the factors that moved, biggest first; the ones that did not are left out
}

// Player-facing names, in the order the funnel multiplies them.
const LABELS: Array<[keyof FunnelFactors, string]> = [
  ['prestigePool', 'prestige'],
  ['priceFactor', 'price'],
  ['wordOfMouth', 'word of mouth'],
  ['capacityFactor', 'beds'],
  ['cohortDemand', 'new pulls'],
  ['stickerShock', 'sticker shock'],
  ['beauty', 'the campus'],
  ['tags', 'what the guidebooks say'],
  ['crowding', 'overcrowding'],
];

// Moves smaller than this are rounding and are left off the line.
const MOVE_FLOOR = 0.005;

export function poolChange(now: AdmissionsProjection, last: FunnelRecord | null): PoolChange | null {
  if (!last || last.applicants <= 0) return null;
  const parts: PoolMove[] = [];
  for (const [key, label] of LABELS) {
    // A record from before beauty or the tags counted reads them as neutral.
    const before = last.factors[key] ?? 1;
    if (!(before > 0)) continue;
    const change = (now.factors[key] ?? 1) / before - 1;
    if (Math.abs(change) < MOVE_FLOOR) continue;
    parts.push({ key, label, change });
  }
  parts.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
  return {
    lastApplicants: last.applicants,
    change: now.applicants / last.applicants - 1,
    parts,
  };
}
