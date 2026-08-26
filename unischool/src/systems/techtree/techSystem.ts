import type { GameState, Buildable, BuildableEffects } from '../../state/types';

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
}
