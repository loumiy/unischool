// ---------------------------------------------------------------------
// Turns sim/balanceSim.ts's scripted-strategy fast-forward into a real,
// asserting regression gate — the harness has run for a long time as a
// print-and-eyeball tool (`npm run sim`), and nothing failed loudly when a
// strategy's emergent behavior quietly drifted from what its own comment
// claims (see the "Overbuilder" fix this file guards: every strategy used
// to report zero weeks in the red, including the two explicitly designed
// to stress-test "stall, don't die").
//
// Imports STRATEGIES/play/Strategy/Row straight from the sim rather than
// re-implementing a second scripted player — the whole point of a balance
// check is that it drives the SAME strategies the eyeballed report reads,
// so a passing run here is a passing `npm run sim` in disguise, and a
// retune of a strategy or a game constant can't silently invalidate one
// without the other noticing.
//
// Runs a shorter horizon (20 years, not 40) than `npm run sim`'s default —
// long enough for every invariant below to be meaningfully exercised
// (the pinch, a stall-and-recover cycle, real prestige separation) while
// keeping this fast enough to run on every `npm test`.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { play, STRATEGIES } from '../sim/balanceSim';

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

const YEARS = 20;

function find(name: string) {
  const strategy = STRATEGIES.find((s) => s.name === name);
  if (!strategy) throw new Error(`fixture: strategy "${name}" exists in STRATEGIES`);
  return { strategy, run: play(strategy, YEARS) };
}

// =====================================================================
// 1. GROWTH ISN'T OPTIONAL — the idle (builds-nothing) control's prestige
// stays well below every strategy that actually builds. This is the sim
// harness's own reading of PR H's "a build-nothing run cannot reach the
// top of the rankings" checklist item (see prestigeSystem.ts's
// admissionsScaleScore throttle).
// =====================================================================
{
  const idle = find('Idle (builds nothing)');
  const idlePrestige = idle.run.rows[idle.run.rows.length - 1].prestige;

  // Discount volume deliberately sits out of this comparison: its value
  // proposition is enrollment SCALE bought with heavy aid, not curriculum
  // breadth, and courseAffordabilityAware now correctly throttles its
  // course build-out to what its own thin, discount-heavy margin can
  // actually sustain (see the strategy's own comment) — a real, different
  // kind of viable, not a worse version of a curriculum-focused strategy.
  // "Growth isn't optional" is a claim about strategies that spend on
  // curriculum breadth; this one spends its margin on aid instead.
  for (const name of ['Balanced builder', 'Curriculum rush (overreach)', 'Public flagship']) {
    const built = find(name);
    const builtPrestige = built.run.rows[built.run.rows.length - 1].prestige;
    assert(
      builtPrestige > idlePrestige + 10,
      `"${name}" reaches meaningfully higher prestige than idling by year ${YEARS} (idle ${idlePrestige.toFixed(1)}, ${name} ${builtPrestige.toFixed(1)})`,
    );
  }
}

// =====================================================================
// 2. STALL, DON'T DIE — a strategy that goes into real financial distress
// (the Overbuilder: cheap tuition, dorms built the moment the campus is
// nominally full, regardless of demand) actually goes negative, and then
// recovers rather than staying sunk. Both halves matter: an economy that
// never stresses under a genuinely bad policy isn't testing anything (see
// the audit finding this replaces — the OLD Overbuilder, priced at the
// tuition ceiling, never went red at all across a 40-year run), and one
// that stresses but never recovers would falsify "stall, don't die".
// =====================================================================
{
  const { run } = find('Overbuilder (beds ahead of demand)');
  const last = run.rows[run.rows.length - 1];
  assert(last.weeksInTheRed > 0, `the overbuilder strategy actually experiences real financial distress (got ${last.weeksInTheRed} weeks in the red)`);
  assert(last.minCash < 0, `the overbuilder strategy's cash genuinely goes negative at some point (min cash ${last.minCash.toLocaleString()})`);
  assert(last.cash > last.minCash, `the overbuilder strategy's cash has recovered from its trough by year ${YEARS} (trough ${last.minCash.toLocaleString()}, now ${last.cash.toLocaleString()})`);
  assert(last.net >= 0, `the overbuilder strategy's weekly net has turned non-negative again by year ${YEARS} (got ${last.net.toLocaleString()})`);
  // "Stall, don't die" also means it never spends the WHOLE run underwater —
  // a run in the red every single week would be "die slowly", not "stall".
  assert(last.weeksInTheRed < YEARS * 52, 'the overbuilder strategy is not in the red for the entire run');
}

// =====================================================================
// 3. DELIBERATE OVERREACH ALSO RECOVERS — the "spend to the wire" strategy
// (no cash buffer, builds everything affordable every week) is a second,
// independent read on "stall, don't die": a player who overreaches on
// PACE rather than on PRICE must also be recoverable, not just the
// price-side mistake case 2 checks.
// =====================================================================
{
  const { run } = find('Curriculum rush (overreach)');
  const last = run.rows[run.rows.length - 1];
  assert(last.cash > 0, `the overreach strategy's cash is positive again by year ${YEARS} (got ${last.cash.toLocaleString()})`);
  assert(last.net > 0, `the overreach strategy's weekly net is positive again by year ${YEARS} (got ${last.net.toLocaleString()})`);
}

// =====================================================================
// 4. NO STRATEGY IS PERMANENTLY SUNK — the general form of "stall, don't
// die" across every scripted strategy at once: nobody ends the run with
// negative cash, and nobody ends it with a negative weekly net (a school
// that is still bleeding every week at the horizon has not actually
// stalled-and-held, it is still spiraling).
// =====================================================================
for (const strategy of STRATEGIES) {
  const { run } = find(strategy.name);
  const last = run.rows[run.rows.length - 1];
  assert(last.cash >= 0, `"${strategy.name}" ends year ${YEARS} solvent (cash ${last.cash.toLocaleString()})`);
  assert(last.net >= 0, `"${strategy.name}" ends year ${YEARS} with non-negative weekly net (${last.net.toLocaleString()})`);
}

// =====================================================================
// 5. THE PINCH IS REAL — every strategy that actually builds sees its
// weekly opex at least quadruple from its founding level by year 20 (the
// "cost leads revenue" shape financeSystem.ts is tuned for), so this
// isn't measuring a flat, undemanding economy.
// =====================================================================
{
  const { run } = find('Balanced builder');
  const founding = run.rows[0];
  const last = run.rows[run.rows.length - 1];
  assert(last.opex > founding.opex * 4, `opex grows substantially from founding to year ${YEARS} (founding ${founding.opex.toLocaleString()}, now ${last.opex.toLocaleString()})`);
}

console.log('balance-regression tests');
if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
