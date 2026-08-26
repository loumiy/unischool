import type { GameState, GameEffects } from '../../state/types';

// Research points produced per week, from faculty research scores.
function weeklyResearchPoints(s: GameState): number {
  const raw = s.faculty.reduce((sum, f) => sum + f.research * (f.morale / 100), 0);
  return raw / 20; // scale factor; tune for pacing
}

function applyEffects(s: GameState, e?: Partial<GameEffects>): void {
  if (!e) return;
  if (e.capacityBonus) s.students.capacity += e.capacityBonus;
  if (e.reputationBonus) s.self.reputation += e.reputationBonus;
  if (e.tuitionBonus) s.finance.tuitionPerStudent += e.tuitionBonus;
  // researchRateBonus is read live in weeklyResearchPoints extensions later.
}

export function tickTech(s: GameState): void {
  if (!s.activeResearch) return;
  const node = s.tech.find((t) => t.id === s.activeResearch);
  if (!node || node.status !== 'researching') return;

  node.progress += weeklyResearchPoints(s);

  if (node.progress >= node.cost) {
    node.progress = node.cost;
    node.status = 'done';
    applyEffects(s, node.unlocks);
    s.activeResearch = null;
    s.log.unshift({
      year: s.clock.year,
      week: s.clock.week,
      message: `Research complete: ${node.name}.`,
      kind: 'good',
    });
    // Unlock any nodes whose prereqs are now all done.
    for (const t of s.tech) {
      if (t.status === 'locked' && t.prereqs.every((p) => s.tech.find((x) => x.id === p)?.status === 'done')) {
        t.status = 'available';
      }
    }
  }
}
