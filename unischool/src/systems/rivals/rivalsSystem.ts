import type { GameState } from '../../state/types';
import { WEEKS_PER_YEAR } from '../../state/types';

// Rivals evolve so the ranking stays a live target across decades.
// Each rival has hidden "momentum" that occasionally shifts, so no rival
// stays static and the leaderboard reshuffles over a long playthrough.
export function tickRivals(s: GameState): void {
  // Player's own reputation responds to satisfaction & faculty research.
  const facultyStrength = s.faculty.reduce((sum, f) => sum + f.research + f.teaching, 0) / 40;
  const repTarget = 30 + s.students.satisfaction * 0.3 + facultyStrength;
  s.self.reputation += (repTarget - s.self.reputation) * 0.02;

  if (s.clock.week === WEEKS_PER_YEAR) {
    for (const r of s.rivals) {
      // Occasionally reroll momentum so trends aren't permanent.
      if (Math.random() < 0.25) {
        r.momentum = (Math.random() - 0.45) * 3; // slight upward bias
      }
      r.reputation = Math.max(0, r.reputation + r.momentum);
    }
  }
}

// Convenience: full ranked list including the player.
export function rankedList(s: GameState) {
  const all = [
    { name: s.self.name, reputation: s.self.reputation, isPlayer: true },
    ...s.rivals.map((r) => ({ name: r.name, reputation: r.reputation, isPlayer: false })),
  ];
  return all.sort((a, b) => b.reputation - a.reputation);
}
