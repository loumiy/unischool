// ---------------------------------------------------------------------
// The guided player (Plan 58): can the intended line of play be followed
// by a player who does only what the game tells it (sim/harness/guided.ts)?
// Fifty years on two seeds and a founding name, checked for what must
// hold, never for how well: the rules every state keeps
// (sim/harness/invariants.ts), no interrupt left standing, and every
// letter delivered with its ask done — a letter whose ask the guided
// player cannot carry out is a line of play the game does not support; the
// Research Park's only to the run held to research (Plan 85F) —
// and a chronicle whose eras never repeat a kind in a row (Plan 80C; the
// archetypes' are checked in test/archetypes.test.ts); and an opening the
// money carries (Plan 80F): the Year 2 class seated without a loan, and
// cash never below zero in Years 1–2.
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
import { chronicleOf } from '../src/systems/chronicle/chronicle';
import { totalEnrolled } from '../src/state/types';
import type { Pillar } from '../src/state/types';
import { specializationOf } from '../src/systems/prestige/specialization';
import { instructionCapacity } from '../src/systems/techtree/instructionCapacity';

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

// The third run is also held to research (Plan 85F), so the Research Park's
// letter, which only a college specialized in research is sent, is read.
const RUNS: Array<{ seed: number; name?: string; specialization?: Pillar }> = [{ seed: 12345 }, { seed: 4242 }, { seed: 12345, name: 'Harrow College', specialization: 'research' }];
const YEARS = 50;

for (const run of RUNS) {
  const label = run.name ? `"${run.name}"` : `seed ${run.seed}`;
  const player = createGuidedPlayer();
  if (run.specialization) player.specialization = run.specialization;
  const g = foundGame(run);
  let firstBreak: string | null = null;
  let weeks = 0;
  // The opening's money (Plan 80F): the lowest cash and any loan in Years
  // 1–2, and any week of Year 2 with students past the seats.
  let earlyLow = Infinity;
  let earlyLoans = 0;
  let unseated = 0;
  try {
    playYears(g, player, YEARS, (g) => {
      weeks += 1;
      if (g.s.clock.year <= 2) {
        earlyLow = Math.min(earlyLow, g.s.finance.cash);
        earlyLoans += (g.s.finance.loans ?? []).length;
        if (g.s.clock.year === 2 && totalEnrolled(g.s.students) > instructionCapacity(g.s)) unseated += 1;
      }
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
    // The Research Park's letter comes only to a college specialized in
    // research (Plan 85F): the park opens to no other.
    if (letter.id === 'the-research-park' && specializationOf(g.s) !== 'research') {
      assert(r.delivered[letter.id] === undefined, `${label}: "${letter.title}" is not sent to a college specialized in ${specializationOf(g.s) ?? 'nothing'}`);
      continue;
    }
    assert(r.delivered[letter.id] !== undefined, `${label}: "${letter.title}" is delivered`);
    assert(r.done[letter.id] !== undefined, `${label}: and its ask is done ("${letter.ask(g.s).text}")`);
  }
  // The college opens with nothing to teach (Plan 80D): the player appoints
  // and founds from nothing, and seats every student in year one.
  const seated = r.done['doors-open'];
  assert(seated !== undefined && seated[0] === 1, `${label}: founds from nothing and seats every student in year one (${JSON.stringify(seated)})`);
  assert(earlyLow >= 0 && earlyLoans === 0 && unseated === 0, `${label}: seats its Year 2 class without borrowing, and never runs out of cash in Years 1–2 (lowest $${Math.round(earlyLow).toLocaleString()}, ${unseated} weeks past the seats)`);
  const eras = chronicleOf(g.s).eras;
  assert(eras.every((e, i) => i === 0 || e.kind !== eras[i - 1].kind), `${label}: no two eras of a kind in a row (${eras.map((e) => e.kind).join(', ')})`);
  assert(new Set(eras.map((e) => e.name)).size === eras.length, `${label}: every era its own name (${eras.map((e) => e.name).join(' · ')})`);
  console.log(`  · ${label}: letters done by year ${Math.max(...Object.values(r.done).map(([y]) => y))}, ${Object.keys(r.schools).length} schools, the last school home in Founders Hall ${r.foundersHome ?? 'never'}, rank ${r.years[r.years.length - 1].rank} at the end`);
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
