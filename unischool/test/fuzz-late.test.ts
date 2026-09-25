// ---------------------------------------------------------------------
// The fuzz layer, late (Plan 57): random play from colleges a competent
// player built. A random college founded from nothing goes broke and
// stalls before it has a lab or a team (test/fuzz.test.ts), so the late
// game — research, varsity athletics, capital projects, a big estate —
// is fuzzed from checkpoints: the Balanced builder's college at years 12
// and 30, each played on at random for three years through the reducer the
// game uses, checked every week and saved at each year's turn.
//
// The checkpoints come from the old harness (sim/balanceSim.ts) until the
// archetypes replace it (Plan 59). Checks only, never balance.
//
// Not part of the game: nothing imports it. Slow — one thirty-year run.
// ---------------------------------------------------------------------

import type { GameState } from '../src/state/types';
import { play, STRATEGIES } from '../sim/balanceSim';
import { foundGame, fakeStorage, playYears } from '../sim/harness/game';
import { fuzzPlayer } from '../sim/harness/fuzz';
import { brokenRules } from '../sim/harness/invariants';
import { saveGame, loadGame } from '../src/state/persistence';

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('late fuzz tests');

const CHECKPOINT_YEARS = [12, 30];
const YEARS = 3;

const builder = STRATEGIES.find((s) => s.name === 'Balanced builder')!;
const checkpoints = new Map<number, GameState>();
play(builder, Math.max(...CHECKPOINT_YEARS), (s) => {
  if (CHECKPOINT_YEARS.includes(s.clock.year) && !checkpoints.has(s.clock.year) && !s.pendingInterrupt) {
    checkpoints.set(s.clock.year, structuredClone(s));
  }
});
assert(checkpoints.size === CHECKPOINT_YEARS.length, `the builder reached every checkpoint (${[...checkpoints.keys()].join(', ')})`);

for (const [year, from] of checkpoints) {
  for (const seed of [1, 2]) {
    const label = `year ${year}, seed ${seed}`;
    const g = foundGame({ from, seed, clone: true });
    let firstBreak: string | null = null;
    let lastYear = g.s.clock.year;
    try {
      playYears(g, fuzzPlayer, YEARS, (g) => {
        if (firstBreak === null) {
          const broken = brokenRules(g.s);
          if (broken.length > 0) firstBreak = `year ${g.s.clock.year}, week ${g.s.clock.week}: ${broken.slice(0, 3).join('; ')}`;
        }
        if (g.s.clock.year !== lastYear) {
          lastYear = g.s.clock.year;
          fakeStorage.clear();
          const back = saveGame(g.s) ? loadGame() : null;
          assert(back !== null && JSON.stringify(back) === JSON.stringify(g.s), `${label}: the year-${lastYear} save round-trips unchanged`);
        }
      });
    } catch (e) {
      assert(false, `${label}: the run threw in year ${g.s.clock.year}, week ${g.s.clock.week}: ${(e as Error).message}`);
    }
    assert(firstBreak === null, `${label}: every week keeps the rules${firstBreak ? ` — first broken at ${firstBreak}` : ''}`);
    console.log(`  · from ${label}: ${g.actions} actions, ${g.s.orgs.teams.length} teams, ${Object.keys(g.s.research.initiatives).length} initiatives running, $${Math.round(g.s.finance.cash / 1e6)}M`);
  }
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
