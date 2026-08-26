// --- SANDBOX-ONLY PLAYTESTING SCAFFOLDING ---
// This whole file exists purely to judge long-arc pacing quickly. Before
// release, delete this file, remove its entry from SYSTEMS in
// engine/reducer.ts, the TOGGLE_AUTO_DEVELOP action (actions.ts +
// reducer.ts), the `autoDevelop` field on GameState, and its toggle button
// in App.tsx.

import type { GameState } from '../../state/types';
import { developmentWeeks } from '../techtree/techSystem';

// Auto-develop never fills a slot if doing so would leave cash below this.
// (Starting development has no direct cash cost today — courses only add
// upkeep once *done* — so this is a solvency floor rather than a per-course
// price check: it stops the auto-pilot from acting while the university is
// already in trouble during an unattended fast-forward run.)
const CASH_BUFFER = 50_000;

export function tickAutoDevelop(s: GameState): void {
  if (!s.autoDevelop) return;
  if (s.finance.cash <= CASH_BUFFER) return;

  let freeSlots = s.slots - Object.keys(s.developing).length;
  if (freeSlots <= 0) return;

  // "Cheapest" = lowest tier: tier is the only cost dimension a course has
  // (it sets how many weeks of development it takes).
  const candidates = s.tech
    .filter((t) => t.status === 'available')
    .sort((a, b) => a.tier - b.tier);

  for (const node of candidates) {
    if (freeSlots <= 0 || s.finance.cash <= CASH_BUFFER) break;
    node.status = 'developing';
    s.developing[node.id] = developmentWeeks(node.tier);
    freeSlots -= 1;
  }
}
