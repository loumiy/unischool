import type { Buildable, GameState } from '../../state/types';
import { WEEKS_PER_YEAR, standsOnCampus } from '../../state/types';
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
  if (!isPlaceableKind(t)) return 1;
  return maintenanceFunding(s) * (t.historic ? HISTORIC_UPKEEP_FACTOR : 1);
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

// Added stories (Plan 26): a dorm or a dining hall can go up by up to two
// floors, a quarter more capacity each, built over twelve weeks while it
// stays open.
export const EXTENSION_MAX_STOREYS = 2;
export const EXTENSION_COST_SHARE = 0.4;
export const EXTENSION_WEEKS = 12;
const EXTENSION_GAIN = 0.25;

export function canExtend(t: Buildable): boolean {
  const kind = (t.kind === 'dorm' && (t.effects?.capacityBonus ?? 0) > 0) || t.facilityType === 'diningHall';
  return kind && t.status === 'done' && (t.floorsAdded ?? 0) < EXTENSION_MAX_STOREYS
    && (t.extensionWeeks ?? 0) === 0 && (t.renovationWeeks ?? 0) === 0;
}

export function extensionCost(t: Buildable): number {
  return Math.round(t.cost * EXTENSION_COST_SHARE);
}

// What one more story adds: beds for a dorm, seats for a dining hall, a
// quarter of what it was built with.
export function extensionGain(t: Buildable): number {
  if (t.kind === 'dorm') return Math.round((t.effects?.capacityBonus ?? 0) * EXTENSION_GAIN);
  const serves = t.effects?.servesPopulation ?? 0;
  return Math.round((serves / (1 + EXTENSION_GAIN * (t.floorsAdded ?? 0))) * EXTENSION_GAIN);
}

function finishExtension(s: GameState, t: Buildable): void {
  const gain = extensionGain(t);
  t.floorsAdded = (t.floorsAdded ?? 0) + 1;
  if (t.kind === 'dorm') {
    s.students.capacity += gain;
  } else if (t.effects) {
    const serves = (t.effects.servesPopulation ?? 0) + gain;
    const upkeep = t.effects.upkeepPerWeek ?? 0;
    const per = (t.effects.servesPopulation ?? 0) > 0 ? upkeep / (t.effects.servesPopulation ?? 1) : 0;
    t.effects = { ...t.effects, servesPopulation: serves, upkeepPerWeek: Math.round(serves * per) };
  }
}

// Historic status (Plan 26): a building standing 25 years can be declared
// historic. It lends prestige's campus-life input a little (up to five
// buildings), costs a quarter more to keep, and wears ivy.
export const HISTORIC_AGE_YEARS = 25;
export const HISTORIC_PRESTIGE = 0.03;
export const HISTORIC_PRESTIGE_MAX = 5;
export const HISTORIC_UPKEEP_FACTOR = 1.25;

export function canDeclareHistoric(s: GameState, t: Buildable): boolean {
  return isPlaceableKind(t) && t.status === 'done' && !t.historic
    && t.builtYear !== undefined && s.clock.year - t.builtYear >= HISTORIC_AGE_YEARS;
}

// Prestige's share from historic buildings (prestigeSystem.ts's campus life).
export function historicPrestige(s: GameState): number {
  const n = s.tech.filter((t) => t.historic && standsOnCampus(t)).length;
  return Math.min(HISTORIC_PRESTIGE_MAX, n) * HISTORIC_PRESTIGE;
}

// The estate's week: unpaid upkeep becomes backlog, backlogs compound, and
// renovations run down and, when done, clear their backlog. Nothing here
// draws from the random stream.
export function tickEstate(s: GameState): void {
  const unpaid = 1 - maintenanceFunding(s);
  for (const t of s.tech) {
    // In-place work keeps a building standing, and its estate running.
    if (!isPlaceableKind(t) || !standsOnCampus(t)) continue;
    if (t.extensionWeeks !== undefined && t.extensionWeeks > 0) {
      t.extensionWeeks -= 1;
      if (t.extensionWeeks === 0) {
        delete t.extensionWeeks;
        finishExtension(s, t);
      }
    }
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
