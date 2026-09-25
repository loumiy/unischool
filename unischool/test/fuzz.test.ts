// ---------------------------------------------------------------------
// The fuzz layer (Plan 57): does anything break? Random but legal play
// (sim/harness/fuzz.ts) on several seeds and founding names, through the
// reducer the game uses, checked every week against the rules any state
// must keep (sim/harness/invariants.ts), with a save round trip at each
// year's end and no interrupt ever left standing (sim/harness/game.ts).
//
// Checks only, never balance: the runs are short and the player is random,
// so nothing here says how well a college did.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { foundGame, fakeStorage, playYears, type Game } from '../sim/harness/game';
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

console.log('fuzz tests');

const RUNS = [
  { seed: 1, name: 'Ashgrove College' },
  { seed: 2, name: 'Test' },
  { seed: 3, name: 'Harrow College' },
  { seed: 4, name: 'Blackmoor University' },
];
const YEARS = 6;

for (const run of RUNS) {
  const label = `seed ${run.seed}, "${run.name}"`;
  const g = foundGame({ ...run, clone: true });
  let weeks = 0;
  let firstBreak: string | null = null;
  let lastYear = g.s.clock.year;
  let roundTrips = 0;
  try {
    playYears(g, fuzzPlayer, YEARS, (g: Game) => {
      weeks += 1;
      if (firstBreak === null) {
        const broken = brokenRules(g.s);
        if (broken.length > 0) firstBreak = `year ${g.s.clock.year}, week ${g.s.clock.week}: ${broken.slice(0, 3).join('; ')}`;
      }
      // A save at each year's turn comes back as it went in.
      if (g.s.clock.year !== lastYear) {
        lastYear = g.s.clock.year;
        fakeStorage.clear();
        const wrote = saveGame(g.s);
        const back = loadGame();
        const same = wrote && back !== null && JSON.stringify(back) === JSON.stringify(g.s);
        assert(same, `${label}: the year-${lastYear} save round-trips unchanged`);
        roundTrips += 1;
      }
    });
    assert(true, `${label}: ${YEARS} years played`);
  } catch (e) {
    assert(false, `${label}: the run threw in year ${g.s.clock.year}, week ${g.s.clock.week}: ${(e as Error).message}`);
  }
  assert(firstBreak === null, `${label}: every week keeps the rules${firstBreak ? ` — first broken at ${firstBreak}` : ''}`);
  console.log(`  · ${label}: ${weeks} weeks, ${g.actions} actions, ${roundTrips} saves, ${g.s.tech.filter((t) => t.kind === 'course' && t.status === 'done').length} courses, $${Math.round(g.s.finance.cash / 1e3)}k`);
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
