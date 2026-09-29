import type { GameState } from '../../state/types';
import { finishAllDevelopment } from '../techtree/techSystem';
import { finishEstateWorks } from '../estate/estate';

// SANDBOX (from the title screen): a run with no money to find and no weeks
// to wait. The reducer settles it after every action it accepts, so a
// building placed or a course started is finished before the player sees
// the next frame, and the funds never fall. Everything else runs as in a
// normal run; a sandbox run is kept out of the hall of fame (state/hall.ts).

// The funds a sandbox run is topped back up to. Far past any price in the
// game, so every "can afford" gate passes; the header shows it as ∞.
export const SANDBOX_CASH = 1_000_000_000_000;

export function isSandbox(s: GameState): boolean {
  return s.sandbox === true;
}

export function settleSandbox(s: GameState): void {
  if (!isSandbox(s) || !s.started) return;
  finishAllDevelopment(s);
  finishEstateWorks(s);
  if (s.finance.cash < SANDBOX_CASH) s.finance.cash = SANDBOX_CASH;
  s.finance.weeksInTheRed = 0;
}
