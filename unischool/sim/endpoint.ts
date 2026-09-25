// The endpoint probe: prints what each archetype the balance target names
// looks like at fifty years, on the reference seeds (everything
// sim/endpointClaims.ts judges), so a tuning pass can see where runs land.
// Diagnostic only, not part of `npm test`.
// Run with `npm run endpoint -- [strategy-substring]`.

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
