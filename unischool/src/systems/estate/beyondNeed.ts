import type { Buildable, GameState, SatisfactionAttributes } from '../../state/types';
import { servingPopulation, standsOnCampus, totalEnrolled } from '../../state/types';
import { BEYOND_NEED_FROM, BEYOND_NEED_UPKEEP, isRetailFood } from '../../data/facilitiesData';
import { NEED_SPACE } from '../../data/needWords';
import { expectedRatio, servedPopulationFor } from '../satisfaction/satisfactionSystem';
import { isPriceUpkept, upkeepShare } from './estate';
import { count, decimal, pct } from '../../format';

// Space beyond need (Plan 80F), the owner's call: charge mainly for
// overbuilding. In each need a facility serves, capacity up to
// BEYOND_NEED_FROM of what the students need is kept at the building's own
// upkeep (facilitiesData.ts's priceUpkeep); the share past it costs
// BEYOND_NEED_UPKEEP times as much. Every building in the need pays the
// extra on that share of its upkeep, so no one building is singled out.
// The capacity is the need's own reading (satisfactionSystem.ts's
// servedPopulationFor: the grocery and the towers' shops to their share of
// meals), the need the dial's (expectedRatio). Housing is not here: beds
// have their own line, and an empty one costs half.
//
// The Medical Center, a capital project, keeps its fixed upkeep: it pays
// nothing extra, and its places are left out of the reckoning, so building
// it never pushes the smaller health buildings past the line.

export const NEED_CATEGORIES: ReadonlyArray<keyof SatisfactionAttributes> = ['basicNeeds', 'health', 'social', 'academic'];

export interface NeedCapacity {
  attribute: keyof SatisfactionAttributes;
  capacity: number;      // places serving the need
  need: number;          // places the students need
  enrolled: number;
  beyondShare: number;   // 0..1, the share of the charged places past BEYOND_NEED_FROM of the need
}

export function needCapacity(s: GameState, attribute: keyof SatisfactionAttributes): NeedCapacity {
  const enrolled = totalEnrolled(s.students);
  const capacity = servedPopulationFor(s, attribute);
  const need = enrolled * expectedRatio(s, attribute);
  // A capital project's places (the Medical Center's) are kept whole at its
  // fixed upkeep: they neither pay the extra nor push the rest past the line.
  const project = s.tech
    .filter((t) => t.project !== undefined && t.effects?.satisfactionAttribute === attribute)
    .reduce((sum, t) => sum + servingPopulation(t), 0);
  const charged = Math.max(0, capacity - project);
  const beyondShare = enrolled > 0 && charged > 0 ? Math.max(0, charged - BEYOND_NEED_FROM * need) / charged : 0;
  return { attribute, capacity, need, enrolled, beyondShare };
}

// Whether a building's upkeep carries the extra: one kept at a share of its
// price (or the towers' shops, kept at the grocery's), standing, and
// serving one of the needs.
function paysBeyondNeed(t: Buildable): boolean {
  const need = t.effects?.satisfactionAttribute;
  return need !== undefined && NEED_CATEGORIES.includes(need) && standsOnCampus(t)
    && servingPopulation(t) > 0 && (isPriceUpkept(t) || isRetailFood(t));
}

export interface BeyondNeedUpkeep {
  total: number;   // a week, at the maintenance funding
  byNeed: Array<NeedCapacity & { upkeep: number }>; // the needs past the line, costliest first
}

// The extra a week for space past the line, need by need.
export function beyondNeedUpkeep(s: GameState): BeyondNeedUpkeep {
  const byNeed: Array<NeedCapacity & { upkeep: number }> = [];
  for (const attribute of NEED_CATEGORIES) {
    const reading = needCapacity(s, attribute);
    if (reading.beyondShare <= 0) continue;
    const upkeep = s.tech
      .filter((t) => t.effects?.satisfactionAttribute === attribute && paysBeyondNeed(t))
      .reduce((sum, t) => sum + (t.effects?.upkeepPerWeek ?? 0) * upkeepShare(s, t), 0) * (BEYOND_NEED_UPKEEP - 1) * reading.beyondShare;
    if (upkeep > 0) byNeed.push({ ...reading, upkeep });
  }
  byNeed.sort((a, b) => b.upkeep - a.upkeep);
  return { total: byNeed.reduce((sum, n) => sum + n.upkeep, 0), byNeed };
}

// "Dining: 5,400 places for 3,900 students"; for the needs a student uses a
// share of a place for, the places they need too. Past the line it says
// what it costs. The building panel's line.
export function needUseSentence(s: GameState, attribute: keyof SatisfactionAttributes): string {
  const r = needCapacity(s, attribute);
  const label = NEED_SPACE[attribute];
  const perStudent = expectedRatio(s, attribute) === 1;
  const use = perStudent
    ? `${label}: ${count(r.capacity)} places for ${count(r.enrolled)} students`
    : `${label}: ${count(r.capacity)} places; ${count(r.enrolled)} students need ${count(r.need)}`;
  return r.beyondShare > 0
    ? `${use}. Past ${pct(BEYOND_NEED_FROM)} of the need, a place costs ${decimal(BEYOND_NEED_UPKEEP)} times as much to keep.`
    : `${use}.`;
}

// The Treasury's note: each need past the line and how far.
export function beyondNeedNote(s: GameState): string {
  const { byNeed } = beyondNeedUpkeep(s);
  const over = byNeed.map((n) => `${NEED_SPACE[n.attribute].toLowerCase()} ${decimal(n.capacity / Math.max(n.need, 1), 1)} times the need`).join(', ');
  return `${over}: past ${pct(BEYOND_NEED_FROM)} of what the students need, a place costs ${decimal(BEYOND_NEED_UPKEEP)} times as much to keep`;
}
