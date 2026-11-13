import { finishAllDevelopment, unlockAvailable } from '../techtree/techSystem';
import { finishEstateWorks } from '../estate/estate';
import { MILESTONES } from '../../data/ladderData';
import { WEEKS_PER_YEAR, type GameState } from '../../state/types';

// SANDBOX (from the title screen): a run with no money to find, no weeks
// to wait and everything open: every milestone reached, so every tab,
// section, office and building. The reducer settles it after every action
// it accepts, so a building placed or a course started is finished before
// the player sees the next frame, and the funds never fall. It has no objectives, letters
// or milestones to see: the chapters and NEXT's hints are hidden
// (LogTicker.tsx), the inbox holds no letters (inbox.ts) and the opening
// letters are never sent (eventSystem.ts), and a curriculum milestone is
// awarded without a log line or celebration (techSystem.ts's
// awardMilestone). Everything else runs as in a normal run;
// a sandbox run is kept out of the hall of fame (state/hall.ts).

// The funds a sandbox run is topped back up to. Far past any price in the
// game, so every "can afford" gate passes; the header shows it as ∞.
export const SANDBOX_CASH = 1_000_000_000_000;

export function isSandbox(s: GameState): boolean {
  return s.sandbox === true;
}

export function settleSandbox(s: GameState): void {
  if (!isSandbox(s) || !s.started) return;
  // Every milestone is reached from the start, so every tab, section,
  // office and building the ladder holds back is open. Silently: a sandbox
  // queues no milestone letters (ladderSystem.ts's tickLadder).
  const week = (s.clock.year - 1) * WEEKS_PER_YEAR + s.clock.week;
  for (const m of MILESTONES) {
    if (s.ladder.reached[m.id] !== undefined) continue;
    s.ladder.reached[m.id] = s.clock.year;
    s.ladder.reachedWeek[m.id] = week;
  }
  // Every building is open from the start (techSystem.ts's sandboxOpens).
  unlockAvailable(s);
  finishAllDevelopment(s);
  finishEstateWorks(s);
  if (s.finance.cash < SANDBOX_CASH) s.finance.cash = SANDBOX_CASH;
  s.finance.weeksInTheRed = 0;
}
