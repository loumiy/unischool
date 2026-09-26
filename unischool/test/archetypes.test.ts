// ---------------------------------------------------------------------
// The archetypes (Plan 63, the rebuild's third layer): four ways to run a
// college (sim/harness/archetypes.ts), fifty years on two seeds, checked
// for what must hold and never for how well — the owner's rule since Plan
// 56: checks gate, balance numbers are reported (`npm run sim`).
//
// What must hold, for every archetype:
//   - the run finishes: no interrupt left standing, nothing thrown;
//   - every quarter keeps the rules (sim/harness/invariants.ts);
//   - stall, don't die: a college in the red is climbing out by the end —
//     cash back above zero, or the week's net positive.
// And across them:
//   - growth isn't optional: the college that builds everything finishes
//     above the one that builds nothing;
//   - recovery is possible: a college broken into crisis at year 15 and
//     played on by the guided player climbs out of it.
//
// And the natural player (Plan 65): the rules every quarter, and every
// school founded.
//
// Not part of the game: nothing imports it. Slow — nine fifty-year runs.
// ---------------------------------------------------------------------

import { foundGame, playYears } from '../sim/harness/game';
import { ARCHETYPES, createArchetype, type ArchetypeName, type ArchetypeRecord } from '../sim/harness/archetypes';
import { createGuidedPlayer } from '../sim/harness/guided';
import { createNaturalPlayer } from '../sim/harness/natural';
import { milestoneSchools } from '../src/data/techData';
import { schoolFoundedKey } from '../src/systems/techtree/schools';
import { brokenRules } from '../sim/harness/invariants';
import { intoCrisis } from '../tools/scenarios';
import { weeklyNet } from '../src/systems/finance/financeSystem';

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('archetype tests');

const SEEDS = [12345, 4242];
const YEARS = 50;
const finals = new Map<string, ArchetypeRecord>();

for (const seed of SEEDS) {
  for (const name of ARCHETYPES) {
    const label = `${name}, seed ${seed}`;
    const player = createArchetype(name);
    const g = foundGame({ seed });
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
    const cash = g.s.finance.cash;
    const net = weeklyNet(g.s);
    assert(cash >= 0 || net > 0, `${label}: stall, don't die — solvent or climbing out at the end (cash ${Math.round(cash).toLocaleString()}, net ${Math.round(net).toLocaleString()}/wk)`);
    finals.set(`${name}:${seed}`, player.record);
    const last = player.record.years[player.record.years.length - 1];
    console.log(`  · ${label}: rank ${last.rank}, prestige ${last.prestige.toFixed(0)}, ${last.enrolled.toLocaleString()} students, $${(last.cash / 1e6).toFixed(0)}M, ${player.record.weeksInRed} weeks in the red`);
  }
}

// ---- The natural line of play (Plan 65) ----
// The owner's natural player, one seed: it keeps the rules, and every
// school gets founded (a school split over two halls is merged when
// another has nowhere to go).
{
  const player = createNaturalPlayer();
  const g = foundGame({ seed: SEEDS[0] });
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
    assert(true, `Natural: ${YEARS} years played`);
  } catch (e) {
    assert(false, `Natural: the run threw in year ${g.s.clock.year}, week ${g.s.clock.week}: ${(e as Error).message}`);
  }
  assert(firstBreak === null, `Natural: every quarter keeps the rules${firstBreak ? ` — first broken at ${firstBreak}` : ''}`);
  const unfounded = milestoneSchools().filter((m) => !g.s.milestones[schoolFoundedKey(m.schoolName)]).map((m) => m.schoolName);
  assert(unfounded.length === 0, `Natural: every school founded by year ${YEARS}${unfounded.length ? ` — not ${unfounded.join(', ')}` : ''}`);
  const last = player.record.years.at(-1);
  if (last) console.log(`  · Natural, seed ${SEEDS[0]}: rank ${last.rank}, prestige ${last.prestige.toFixed(0)}, ${last.enrolled.toLocaleString()} students, $${(last.cash / 1e6).toFixed(0)}M, mark ${g.s.ending?.report.mark ?? '-'}`);
}

// ---- Growth isn't optional ----
for (const seed of SEEDS) {
  const end = (name: ArchetypeName) => finals.get(`${name}:${seed}`)?.years.at(-1);
  const built = end('Completionist');
  const idle = end('Idle');
  assert(!!built && !!idle && built.rank < idle.rank && built.prestige > idle.prestige,
    `seed ${seed}: the college that builds everything finishes above the one that builds nothing (#${built?.rank} against #${idle?.rank})`);
}

// ---- Recovery is possible ----
{
  const guided = createGuidedPlayer();
  const g = foundGame({ seed: SEEDS[0] });
  playYears(g, guided, 15);
  intoCrisis(g.s);
  const crisis = { cash: g.s.finance.cash, satisfaction: g.s.students.satisfaction, prestige: g.s.self.reputation };
  assert(crisis.cash < 0 && crisis.satisfaction <= 35, 'the crisis is a crisis: cash gone, satisfaction in the thirties');
  playYears(g, createGuidedPlayer(), 10);
  assert(g.s.finance.cash > crisis.cash && g.s.students.satisfaction > crisis.satisfaction,
    `played on, it climbs out: cash ${Math.round(crisis.cash / 1e6)}M to ${Math.round(g.s.finance.cash / 1e6)}M, satisfaction ${crisis.satisfaction.toFixed(0)} to ${g.s.students.satisfaction.toFixed(0)}`);
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
