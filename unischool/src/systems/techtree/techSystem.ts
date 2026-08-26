import type { GameState, GameEffects, TechNode } from '../../state/types';

// Weeks needed to develop a course, scaled by tier.
const WEEKS_PER_TIER = 3;
export function developmentWeeks(tier: number): number {
  return tier * WEEKS_PER_TIER;
}

// Slots the university starts with, before any are purchased. Shared with
// createInitialState() so the cost curve below and the starting state agree
// on where "zero purchases" is.
export const STARTING_SLOTS = 2;

// Cost to buy the next development slot, given how many the player already
// has. This is the main lever for long-term growth, so it's the one curve
// to tune: SLOT_BASE_COST is the first purchased slot's price, SLOT_COST_GROWTH
// is how much pricier each additional slot gets.
const SLOT_BASE_COST = 40_000;
const SLOT_COST_GROWTH = 1.6;
export function nextSlotCost(currentSlots: number): number {
  const purchased = currentSlots - STARTING_SLOTS;
  return Math.round(SLOT_BASE_COST * SLOT_COST_GROWTH ** purchased);
}

function applyEffects(s: GameState, e?: Partial<GameEffects>): void {
  if (!e) return;
  if (e.capacityBonus) s.students.capacity += e.capacityBonus;
  if (e.reputationBonus) s.self.reputation += e.reputationBonus;
  if (e.tuitionBonus) s.finance.tuitionPerStudent += e.tuitionBonus;
  // researchRateBonus is read live in weeklyResearchPoints extensions later.
}

function unlockAvailable(s: GameState): void {
  for (const t of s.tech) {
    if (t.status === 'locked' && t.prereqs.every((p) => s.tech.find((x) => x.id === p)?.status === 'done')) {
      t.status = 'available';
    }
  }
}

export function tickTech(s: GameState): void {
  const finished: TechNode[] = [];

  for (const id of Object.keys(s.developing)) {
    const weeksLeft = s.developing[id] - 1;
    if (weeksLeft <= 0) {
      delete s.developing[id];
      const node = s.tech.find((t) => t.id === id);
      if (node) finished.push(node);
    } else {
      s.developing[id] = weeksLeft;
    }
  }

  for (const node of finished) {
    node.status = 'done';
    applyEffects(s, node.unlocks);
    s.log.unshift({
      year: s.clock.year,
      week: s.clock.week,
      message: `Course developed: ${node.name}.`,
      kind: 'good',
    });
  }

  if (finished.length > 0) unlockAvailable(s);
}
