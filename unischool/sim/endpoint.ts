// ---------------------------------------------------------------------
// THE ENDPOINT PROBE (Plan 17's PR E): what the four archetypes the
// balance target names look like at fifty, on the seeds the reference is
// written from — the sealed legacy, the ambitions, the rank curve, the
// catalogue and the campus. Everything test/endpoint.test.ts asserts,
// printed rather than judged, so a tuning pass can see where each run
// lands before deciding what to move.
//
// Not part of the game, and not part of `npm test` — diagnostic, like
// sim/milestones.ts. Run with `npm run endpoint -- [strategy-substring]`.
// ---------------------------------------------------------------------

import { play, STRATEGIES, DEFAULT_SIM_SEED } from './balanceSim';
import { REFERENCE_EXTRA_SEEDS, REFERENCE_HORIZON } from './reference';
import { endpointReading, describeEndpoint, ENDPOINT_STRATEGIES } from './endpointReading';

const filter = process.argv[2]?.toLowerCase();
const seeds = [DEFAULT_SIM_SEED, ...REFERENCE_EXTRA_SEEDS];

for (const name of ENDPOINT_STRATEGIES) {
  if (filter && !name.toLowerCase().includes(filter)) continue;
  const strategy = STRATEGIES.find((s) => s.name === name);
  if (!strategy) { console.log(`no strategy named ${name}`); continue; }
  console.log(`\n=== ${name} ===`);
  for (const seed of seeds) {
    const run = play(strategy, REFERENCE_HORIZON, undefined, seed);
    console.log(`  seed ${seed}`);
    for (const line of describeEndpoint(endpointReading(run))) console.log(`    ${line}`);
  }
}
