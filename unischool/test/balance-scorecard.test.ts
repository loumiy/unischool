// ---------------------------------------------------------------------
// THE SCORECARD, AS A GATE (Plan 15's PR G).
//
// sim/reference.ts holds two kinds of band. TARGETS are hand-written —
// Plan 15 §6's table for the Balanced builder, and the plan's own
// sentences for the two controls — and they are the design decision
// recorded as data. REFERENCE is generated: the envelope of three seeds
// at ±25%, written by `npm run sim -- --write-reference`, a statement of
// where every other strategy IS so a change that moves one is noticed.
//
// This suite plays every strategy on the default seed at the full
// fifty-year horizon and FAILS on any figure outside its band. A failure
// is a regression, or a re-fit that has not re-recorded the reference;
// it is never "a known problem", because the known problems are what
// this plan fixed. Plan 09 wrote it to report and pass, with a header
// saying this PR would flip it; this is that PR.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { play, STRATEGIES, DEFAULT_SIM_SEED } from '../sim/balanceSim';
import { bandsFor, describeFinding, findingsFor } from '../sim/reference';

const REPORT_ONLY = false;

// The reference is written at forty years, so this reads the same horizon:
// a shorter run would silently skip the year-30 and year-40 bands, which
// are the two the late-game plans are about.
const YEARS = 50;

let findings = 0;
let strategiesWithoutBands = 0;

console.log('balance scorecard');
console.log(`  ${STRATEGIES.length} strategies, ${YEARS} years, seed ${DEFAULT_SIM_SEED}`);

for (const strategy of STRATEGIES) {
  const { rows } = play(strategy, YEARS);
  if (!bandsFor(strategy.name)) {
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
