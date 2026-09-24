import type { Buildable, GameState } from '../../state/types';
import { WEEKS_PER_YEAR } from '../../state/types';
import { isPlaceableKind } from '../../state/campusMap';

// The estate (Plan 26, ported from v2's estate.ts): what the buildings cost
// to keep, and what skimping does to them. Every finished building has an
// upkeep (effects.upkeepPerWeek). The player funds a share of it
// (finance.maintenanceFunding, all of it by default); what goes unpaid
// becomes the building's backlog, which compounds, and the backlog is what
// its condition reads. A renovation pays it off under scaffolding.
//
// At full funding nothing here moves: no backlog, every building in perfect
// condition. The harness never changes the funding.

export const MAINTENANCE_FUNDING_STEP = 0.05;
// A year's compounding on an unpaid backlog.
export const BACKLOG_GROWTH_RATE = 0.06;
// The backlog at which a building is a ruin, as a share of its cost.
export const BACKLOG_RUIN_SHARE = 0.5;
// A renovation's fee on top of the backlog, as a share of the cost.
export const RENOVATION_FEE_SHARE = 0.05;
export const RENOVATION_WEEKS = 8;
// The least a building is valued at for its ruin line: the founding hall
// and a few others cost nothing to raise.
const MIN_RUIN_BASIS = 400_000;

export function maintenanceFunding(s: GameState): number {
  return s.finance.maintenanceFunding ?? 1;
}

export function clampFunding(level: number): number {
  const stepped = Math.round(level / MAINTENANCE_FUNDING_STEP) * MAINTENANCE_FUNDING_STEP;
  return Number(Math.max(0, Math.min(1, stepped)).toFixed(2));
}

// The share of this Buildable's upkeep actually paid: maintenance funding for
// a building, all of it for a course.
export function upkeepShare(s: GameState, t: Buildable): number {
  return isPlaceableKind(t) ? maintenanceFunding(s) : 1;
}

// Condition: how much of the building the backlog has not eaten, 0 to 1.
export function conditionOf(t: Buildable): number {
  const backlog = t.backlog ?? 0;
  if (backlog <= 0) return 1;
  const ruin = Math.max(MIN_RUIN_BASIS, t.cost) * BACKLOG_RUIN_SHARE;
  return Number(Math.max(0, Math.min(1, 1 - backlog / ruin)).toFixed(4));
}

export function renovationCost(t: Buildable): number {
  return Math.round((t.backlog ?? 0) + t.cost * RENOVATION_FEE_SHARE);
}

// A building that can be renovated now: finished, not already under
// scaffolding, and with something to put right.
export function canRenovate(t: Buildable): boolean {
  return isPlaceableKind(t) && t.status === 'done' && (t.renovationWeeks ?? 0) === 0 && (t.backlog ?? 0) > 0;
}

// The estate's week: unpaid upkeep becomes backlog, backlogs compound, and
// renovations run down and, when done, clear their backlog. Nothing here
// draws from the random stream.
export function tickEstate(s: GameState): void {
  const unpaid = 1 - maintenanceFunding(s);
  for (const t of s.tech) {
    if (!isPlaceableKind(t) || t.status !== 'done') continue;
    if (t.renovationWeeks !== undefined && t.renovationWeeks > 0) {
      t.renovationWeeks -= 1;
      if (t.renovationWeeks === 0) {
        delete t.renovationWeeks;
        delete t.backlog;
      }
      continue;
    }
    const upkeep = t.effects?.upkeepPerWeek ?? 0;
    const grown = (t.backlog ?? 0) * (1 + BACKLOG_GROWTH_RATE / WEEKS_PER_YEAR) + upkeep * unpaid;
    if (grown > 0) t.backlog = Math.round(grown);
  }
}
