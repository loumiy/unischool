import type { GameState, Buildable, BuildableEffects } from '../../state/types';

// Development slots are a purchasable relief valve, not the primary
// pacing throttle (see README's "Pacing model"). Flat cost and a soft cap
// for now — tune freely.
export const SLOT_COST = 40_000;
export const MAX_SLOTS = 8;

// Shared by the reducer's START_DEVELOPMENT case and this system's
// auto-develop fill, so "what it takes to start" has one definition.
export function canStartDevelopment(s: GameState, node: Buildable): boolean {
  const slotsUsed = Object.keys(s.developing).length;
  const facultyOk = !node.requiresFaculty || s.faculty.some((f) => f.field === node.requiresFaculty);
  return node.status === 'available' && slotsUsed < s.slots && facultyOk;
}

export function startDevelopment(s: GameState, node: Buildable): void {
  node.status = 'developing';
  s.developing[node.id] = node.duration;
  s.finance.cash -= node.cost; // cost is charged up front; see README's pacing model for the (separate) cash-gate task
}

// When autoDevelop is on, greedily fills any open slots with available
// Buildables, in list order, using the same rule a manual start uses — it's
// a sandbox playtesting convenience for bypassing manual "develop" clicks,
// nothing more, so each course still takes its full `duration` in weeks
// (it goes through the normal tickTech countdown like any other start).
// The one thing auto-develop adds on top of a manual click: it won't spend
// money the university doesn't have, so it can't be used to grind cash
// negative unattended.
function autoFillSlots(s: GameState): void {
  if (!s.autoDevelop) return;
  for (const node of s.tech) {
    if (Object.keys(s.developing).length >= s.slots) break;
    if (node.cost > 0 && s.finance.cash < node.cost) continue;
    if (canStartDevelopment(s, node)) startDevelopment(s, node);
  }
}

function applyEffects(s: GameState, e?: Partial<BuildableEffects>): void {
  if (!e) return;
  if (e.capacityBonus) s.students.capacity += e.capacityBonus;
  if (e.reputationBonus) s.self.reputation += e.reputationBonus;
  if (e.tuitionBonus) s.finance.tuitionPerStudent += e.tuitionBonus;
  if (e.slotBonus) s.slots += e.slotBonus;
  // researchRateBonus is read live in weeklyResearchPoints extensions later.
  if (e.unlockIds) {
    for (const id of e.unlockIds) {
      const target = s.tech.find((t) => t.id === id);
      if (target && target.status === 'locked') target.status = 'available';
    }
  }
}

function unlockAvailable(s: GameState): void {
  for (const t of s.tech) {
    if (t.status === 'locked' && t.prereqs.every((p) => s.tech.find((x) => x.id === p)?.status === 'done')) {
      t.status = 'available';
    }
  }
}

export function tickTech(s: GameState): void {
  const finished: Buildable[] = [];

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
    applyEffects(s, node.effects);
    s.log.unshift({
      year: s.clock.year,
      week: s.clock.week,
      message: `Developed: ${node.name}.`,
      kind: 'good',
    });
  }

  if (finished.length > 0) unlockAvailable(s);
  autoFillSlots(s);
}
