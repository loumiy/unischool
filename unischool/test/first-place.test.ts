// ---------------------------------------------------------------------
// A first place that can be taken (Plan 72I, rivalsSystem.ts): in the last
// fifteen years, a leader whose standing has slipped more than three
// points below its best is chased to where it stood and passed; one that
// holds its standing, or slips earlier in the run, keeps the old rules
// (the elite band closes to eight below, never leapfrogs).
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { createInitialState } from '../src/state/actions';
import { bindScriptStream, withRandom } from '../src/engine/random';
import { ELITE_RIVAL_IDS } from '../src/data/rivalData';
import { CONTEST_SLIP, bestStanding, playerRank, standingContested, tickRivals } from '../src/systems/rivals/rivalsSystem';
import { WEEKS_PER_YEAR, type GameState, type YearSnapshot } from '../src/state/types';

bindScriptStream(7276);

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('first place tests');

// A leader at `now` whose best was `best`, in `year`, the elite band a few
// points below it and everyone else well under.
function leader(year: number, best: number, now: number): GameState {
  const s = createInitialState('Crown');
  s.clock.year = year;
  s.clock.week = WEEKS_PER_YEAR;
  s.self.reputation = now;
  s.history = [{ year: year - 1, prestige: best } as YearSnapshot];
  for (const r of s.rivals) r.reputation = ELITE_RIVAL_IDS.has(r.id) ? now - 9 : 60;
  return s;
}

// Years of the rivals' drift, the leader standing still.
function years(s: GameState, n: number): void {
  for (let i = 0; i < n; i += 1) withRandom(s, () => tickRivals(s));
}

{
  const s = leader(40, 145, 139);
  assert(bestStanding(s) === 145 && standingContested(s), 'late, six points below its best: contested');
  years(s, 8);
  assert(playerRank(s) > 1, `and passed within eight years (rank ${playerRank(s)})`);
}
{
  const s = leader(40, 141, 139);
  assert(!standingContested(s), `late, within ${CONTEST_SLIP} of its best: not contested`);
  years(s, 8);
  assert(playerRank(s) === 1, `and it keeps first place (rank ${playerRank(s)})`);
}
{
  const s = leader(30, 145, 139);
  assert(!standingContested(s), 'the same slip before the last fifteen years: not contested');
  years(s, 5);
  assert(playerRank(s) === 1, `and it keeps first place (rank ${playerRank(s)})`);
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
