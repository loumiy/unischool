// ---------------------------------------------------------------------
// The harness's late money (Plan 95X, the second review's B4-10). Every
// player, unless it says otherwise (Player.buys), buys what fills its
// specialization's share sooner (src/systems/prestige/speedUps.ts) at the
// top of each week (game.ts's playWeek), before its own moves:
//
//   while the share is short of full, each purchase its specialization
//   opens, in order, once the price leaves SPEED_UP_RESERVE_WEEKS of the
//   week's expenses in cash
//
// A full share takes nothing more: none of them raises its ceiling. Without
// this rule no harness player would buy one, and the measure (Plan 95W's
// "natural Y40 cash") could not show what they do.
//
// Not part of the game: nothing in src/ imports this.
// ---------------------------------------------------------------------

import { specializationTerm } from '../../src/data/specializationData';
import { specializationOf } from '../../src/systems/prestige/specialization';
import { speedUpPrice, speedUpRefusal, speedUpsFor } from '../../src/systems/prestige/speedUps';
import type { Game } from './game';
import { reserveOf } from './guided';

// The cash kept after a purchase, in weeks of the week's expenses: a
// quarter's.
export const SPEED_UP_RESERVE_WEEKS = 13;

// Buys what the money allows while the share is short of full. Returns how
// many it bought.
export function buySpeedUps(g: Game): number {
  const chosen = specializationOf(g.s);
  if (!chosen) return 0;
  let bought = 0;
  for (const kind of speedUpsFor(g.s)) {
    if (specializationTerm(g.s, chosen).score >= 1) break;
    if (speedUpRefusal(g.s, kind) !== null) continue;
    if (g.s.finance.cash - speedUpPrice(g.s, kind) < reserveOf(g.s, SPEED_UP_RESERVE_WEEKS)) continue;
    g.act({ type: 'BUY_SPEED_UP', buy: kind });
    bought += 1;
  }
  return bought;
}
