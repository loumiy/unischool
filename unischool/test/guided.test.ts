// ---------------------------------------------------------------------
// The guided player (Plan 58): can the intended line of play be followed
// by a player who does only what the game tells it (sim/harness/guided.ts)?
// Fifty years on two seeds and a founding name, checked for what must
// hold, never for how well: the rules every state keeps
// (sim/harness/invariants.ts), no interrupt left standing, and every
// letter delivered with its ask done — a letter whose ask the guided
// player cannot carry out is a line of play the game does not support.
//
// How fast and how well it goes is measured by `npm run guided`, and the
// owner sets any number from that report.
//
// Not part of the game: nothing imports it. Slow — three fifty-year runs.
// ---------------------------------------------------------------------

import { foundGame, playYears } from '../sim/harness/game';
import { createGuidedPlayer } from '../sim/harness/guided';
import { brokenRules } from '../sim/harness/invariants';
import { OPENING_LETTERS } from '../src/data/eventData';

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('guided player tests');

const RUNS = [{ seed: 12345 }, { seed: 4242 }, { seed: 12345, name: 'Harrow College' }];
const YEARS = 50;

for (const run of RUNS) {
  const label = run.name ? `"${run.name}"` : `seed ${run.seed}`;
  const player = createGuidedPlayer();
  const g = foundGame(run);
  let firstBreak: string | null = null;
  let weeks = 0;
  try {
    playYears(g, player, YEARS, (g) => {
      weeks += 1;
      if (firstBreak === null && weeks % 13 === 0) {
        const broken = brokenRules(g.s);
        if (broken.length > 0) firstBreak = `year ${g.s.clock.year}, week ${g.s.clock.week}: ${broken.slice(0, 3).join('; ')}`;
      }
    });
    assert(true, `${label}: ${YEARS} years played`);
  } catch (e) {
    assert(false, `${label}: the run threw in year ${g.s.clock.year}, week ${g.s.clock.week}: ${(e as Error).message}`);
  }
  assert(firstBreak === null, `${label}: every quarter keeps the rules${firstBreak ? ` — first broken at ${firstBreak}` : ''}`);
  const r = player.record;
  for (const letter of OPENING_LETTERS) {
    assert(r.delivered[letter.id] !== undefined, `${label}: "${letter.title}" is delivered`);
    assert(r.done[letter.id] !== undefined, `${label}: and its ask is done ("${letter.ask(g.s).text}")`);
  }
  console.log(`  · ${label}: letters done by year ${Math.max(...Object.values(r.done).map(([y]) => y))}, ${Object.keys(r.schools).length} schools, Founders Hall empty ${r.foundersEmpty ?? 'never'}, rank ${r.years[r.years.length - 1].rank} at the end`);
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
