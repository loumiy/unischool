import type { GameState } from '../../state/types';
import { MILESTONES, milestoneForBuildable, milestoneForTab, CHARTER_ID } from '../../data/ladderData';
import type { TabId } from '../../components/TabNav';

// Records each milestone the week its condition first holds, and queues its
// letter. Runs first in the tick, so what a milestone opens is available to
// the tech tick the same week. Reached is permanent.
export function tickLadder(s: GameState): void {
  for (const m of MILESTONES) {
    if (s.ladder.reached[m.id] !== undefined || !m.reached(s)) continue;
    s.ladder.reached[m.id] = s.clock.year;
    if (m.id !== CHARTER_ID) s.ladder.unread.push(m.id);
  }
}

export function milestoneReached(s: GameState, id: string): boolean {
  return s.ladder.reached[id] !== undefined;
}

// Whether the ladder lets this buildable open. Its other gates still apply.
export function ladderAllows(s: GameState, buildableId: string): boolean {
  const gate = milestoneForBuildable(buildableId);
  return gate === undefined || milestoneReached(s, gate);
}

export function ladderOpensTab(s: GameState, tab: TabId): boolean {
  const gate = milestoneForTab(tab);
  return gate === undefined || milestoneReached(s, gate);
}

// At founding, a catalogue row seeded 'available' that a milestone names goes
// back to 'locked' until the milestone is reached; the tech tick opens it then.
export function holdBackUnreached(s: GameState): void {
  for (const t of s.tech) {
    if (t.status === 'available' && !ladderAllows(s, t.id)) t.status = 'locked';
  }
}

// The founding state: the charter, and nothing waiting to be read.
export function foundingLadder(year: number): GameState['ladder'] {
  return { reached: { [CHARTER_ID]: year }, unread: [] };
}
