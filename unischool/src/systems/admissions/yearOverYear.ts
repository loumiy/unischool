import type { FunnelFactors, FunnelRecord } from '../../state/types';
import type { AdmissionsProjection } from './admissionsSystem';
import { count, pct } from '../../format';

// Year over year on the admissions reveal. The funnel is a product of its
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

// Player-facing names, in the order the funnel multiplies them. Price and
// sticker shock are one line (Plan 80C): both are what the price did, and
// who it turned away shows in the class mix. The price line is their
// product, keyed as the price.
const LABELS: Array<[keyof FunnelFactors, string]> = [
  ['prestigePool', 'prestige'],
  ['priceFactor', 'price'],
  ['wordOfMouth', 'word of mouth'],
  ['capacityFactor', 'beds'],
  ['cohortDemand', 'new pulls'],
  ['beauty', 'the campus'],
  ['tags', 'what the guidebooks say'],
  ['crowding', 'crowding'],
  ['lift', 'a one-year lift'],
];

// Crowding is a penalty, so its factor rising means the campus crowded
// less than the year before. The line says the direction in words ("crowding
// eased: +312%", the colon added where it is shown), since a bare "overcrowding +312%" reads as more of it
// (Plan 78F). Every other factor's name reads the right way round.
export function crowdingLabel(change: number): string {
  return change >= 0 ? 'crowding eased' : 'crowding grew';
}

// The year's lift (Plan 79C) is there one summer. A summer with one names
// it, whichever way it moved against last year's; a summer without one, read
// against a summer that had one, says it ended. Shown with a colon, as
// crowding's is.
export function liftLabel(liftFactorNow: number): string {
  return liftFactorNow > 1 ? 'a one-year lift' : "last year's lift ended";
}

// The labels that are phrases, shown with a colon before the figure.
export function takesColon(key: keyof FunnelFactors): boolean {
  return key === 'crowding' || key === 'lift';
}

// Moves smaller than this are rounding and are left off the line.
const MOVE_FLOOR = 0.005;

// A factor as the line reads it: the price carries sticker shock with it.
function factorOf(factors: FunnelFactors, key: keyof FunnelFactors): number | undefined {
  if (key === 'priceFactor') return factors.priceFactor * factors.stickerShock;
  return factors[key];
}

export function poolChange(now: AdmissionsProjection, last: FunnelRecord | null): PoolChange | null {
  if (!last || last.applicants <= 0) return null;
  const parts: PoolMove[] = [];
  for (const [key, label] of LABELS) {
    // A record from before beauty or the tags counted reads them as neutral.
    const before = factorOf(last.factors, key) ?? 1;
    if (!(before > 0)) continue;
    const change = (factorOf(now.factors, key) ?? 1) / before - 1;
    if (Math.abs(change) < MOVE_FLOOR) continue;
    const named = key === 'crowding' ? crowdingLabel(change) : key === 'lift' ? liftLabel(now.factors.lift ?? 1) : label;
    parts.push({ key, label: named, change });
  }
  parts.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
  return {
    lastApplicants: last.applicants,
    change: now.applicants / last.applicants - 1,
    parts,
  };
}

// Why the admit rate opens where it does (Plan 78F). The summer's payload
// carries last summer's chosen rate (admissionsSystem.ts's tickAdmissions),
// so an unchanged strategy is a click-through; the first summer carries the
// founding rate. Beds never limit the rate (housing is a need, not a cap),
// so they are named only as what admitting more does: when next year's
// students would already fill the beds there are.
export function admitRateOpening(firstSummer: boolean, openingRate: number, beds: number, studentsNextYear: number): string {
  const where = firstSummer
    ? `The admit rate opens at the founding rate, ${pct(openingRate)}`
    : `The admit rate opens where last summer set it, ${pct(openingRate)}`;
  const crowds = beds > 0 && studentsNextYear >= beds ? `; admitting more crowds ${count(beds)} beds` : '';
  return `${where}${crowds}.`;
}
