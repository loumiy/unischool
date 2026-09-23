import type { FunnelFactors, FunnelRecord } from '../../state/types';
import type { AdmissionsProjection } from './admissionsSystem';

// ---------------------------------------------------------------------
// YEAR OVER YEAR ON THE REVEAL (Plan 16's PR C). The funnel is a product
// of six factors (types.ts's FunnelFactors), and last summer's six are
// recorded at the boundary (students.lastFunnel). So the pool's move from
// one summer to the next decomposes EXACTLY: each factor's ratio, this
// year over last, is that factor's share of the change, and the six
// ratios multiply to the pool's own ratio (before the rounding of a whole
// number of applicants). Nothing here is a second model — it is a
// division of the same six numbers the funnel already produced.
//
// WORD OF MOUTH IS NAMED. docs/design/admissions.md used to say it was
// deliberately not shown, so a player would learn the rule by noticing
// the pool grow the year after the students got happier. The September
// review found the rule was never learned; a player who reads "word of
// mouth +21%" the year after building a dining hall has learned it.
// ---------------------------------------------------------------------

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

// What a player reads each factor as. The order is the order the funnel
// multiplies them in, which is also roughly the order of what a player
// can do about them — nothing moves prestige quickly, price is the slider
// in their hand, and the rest are the campus.
const LABELS: Array<[keyof FunnelFactors, string]> = [
  ['prestigePool', 'prestige'],
  ['priceFactor', 'price'],
  ['wordOfMouth', 'word of mouth'],
  ['capacityFactor', 'beds'],
  ['cohortDemand', 'new pulls'],
  ['stickerShock', 'sticker shock'],
];

// Below this a factor's move is rounding, not news, and is left off the
// line — a line that reads "beds +0%" every year is a line nobody reads.
const MOVE_FLOOR = 0.005;

export function poolChange(now: AdmissionsProjection, last: FunnelRecord | null): PoolChange | null {
  if (!last || last.applicants <= 0) return null;
  const parts: PoolMove[] = [];
  for (const [key, label] of LABELS) {
    const before = last.factors[key];
    if (!(before > 0)) continue;
    const change = now.factors[key] / before - 1;
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
