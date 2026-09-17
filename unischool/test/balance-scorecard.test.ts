// ---------------------------------------------------------------------
// THE SCORECARD, AS A TEST — and deliberately not a failing one yet.
//
// sim/reference.ts records what each strategy's trajectory currently looks
// like, at ±25%, generated from the run rather than chosen. Those bands
// describe a game the September 2026 review found broken in two specific
// ways (the intended line of play ending year 20 overdrawn; 70,000 students
// on 9,000 beds), and Plan 10 is the rebalance that moves them. A hard
// assertion here would therefore be RED from the day it lands until Plan 10
// finishes, which is a gate nobody reads and everybody learns to skip.
//
// So this suite REPORTS. It plays every strategy on the default seed, prints
// every figure outside its band, and passes regardless.
//
// *** PLAN 10'S LAST PR IS WHAT TURNS THIS INTO A GATE. *** By then the
// bands will have been edited to describe the game that plan intends, and an
// out-of-band figure will mean a regression rather than a known problem.
// Flip `REPORT_ONLY` to false there, and delete this paragraph.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { play, STRATEGIES, DEFAULT_SIM_SEED } from '../sim/balanceSim';
import { REFERENCE, describeFinding, findingsFor } from '../sim/reference';

const REPORT_ONLY = true;

// The reference is written at forty years, so this reads the same horizon:
// a shorter run would silently skip the year-30 and year-40 bands, which
// are the two the late-game plans are about.
const YEARS = 40;

let findings = 0;
let strategiesWithoutBands = 0;

console.log('balance scorecard');
console.log(`  ${STRATEGIES.length} strategies, ${YEARS} years, seed ${DEFAULT_SIM_SEED}`);

for (const strategy of STRATEGIES) {
  const { rows } = play(strategy, YEARS);
  if (!REFERENCE[strategy.name]) {
    strategiesWithoutBands += 1;
    console.log(`  · ${strategy.name}: no bands recorded — run \`npm run sim -- --write-reference\``);
    continue;
  }
  const out = findingsFor(strategy.name, rows);
  findings += out.length;
  if (out.length === 0) {
    console.log(`  ✓ ${strategy.name}: every sampled figure inside its band`);
    continue;
  }
  console.log(`  · ${strategy.name}: ${out.length} out of band`);
  for (const finding of out) console.log(`      ${describeFinding(finding)}`);
}

// A strategy with no bands at all is worth saying twice, because it is the
// one state this file can reach that is a mistake rather than a finding: a
// strategy added without re-recording the reference is not being measured.
if (strategiesWithoutBands > 0) {
  console.log(`\n  ${strategiesWithoutBands} strategy(ies) are not measured at all.`);
}

if (findings === 0) {
  console.log('  ✓ nothing out of band');
} else {
  console.log(`\n  ${findings} figure(s) out of band. Reported, not failed — see the header.`);
}

process.exit(REPORT_ONLY ? 0 : (findings === 0 && strategiesWithoutBands === 0 ? 0 : 1));
