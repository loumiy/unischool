// ---------------------------------------------------------------------
// Plan 96C's small fixes that have logic to test: the day ticker lights
// the day under way, so Sunday lights; a lamp's flash ends at its own time
// whatever else starts or finishes meanwhile (96C). No letter in the
// catalogue is from the President, to whom every letter goes (96E).
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { litDaysAt } from '../src/components/DayTicker';
import { liveFlashes } from '../src/components/CommitteeLamps';
import { CHARTER_EVENT, EVENT_CATALOGUE } from '../src/data/eventCatalogue';
import { DOMAIN_LABEL } from '../src/systems/inbox/inbox';
import { crowdingSentence } from '../src/components/InterruptModal';
import { HEALTH_CENTER_TIER1_POPULATION_GATE, HEALTH_PHASE_IN, healthPhaseIn } from '../src/data/facilitiesData';

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) { failures += 1; console.log(`  ✗ ${msg}`); }
}

console.log('plan 96 fixes tests');

// The day ticker.
assert(litDaysAt(0) === 1, 'Monday lights as the week opens');
assert(litDaysAt(0.5) === 4, 'mid-week lights Thursday');
assert(litDaysAt(6 / 7 + 0.001) === 7, 'Sunday lights for the last seventh');
assert(litDaysAt(0.9999) === 7, 'the last moment of the week has every day lit');
assert(litDaysAt(1) === 7, 'never more than seven');

// The lamps' flashes.
const flashes = [{ id: 'a', until: 1_200 }, { id: 'b', until: 1_700 }];
assert(liveFlashes(flashes, 1_000).length === 2, 'both lit before either ends');
assert(liveFlashes(flashes, 1_200).map((f) => f.id).join() === 'b', 'the first ends at its own time, though a second came later');
assert(liveFlashes(flashes, 1_700).length === 0, 'none outlives its end');

// The catalogue's senders.
const fromPresident = [...EVENT_CATALOGUE, CHARTER_EVENT].filter((e) => /^the president$/i.test(e.from ?? DOMAIN_LABEL[e.domain]));
assert(fromPresident.length === 0, `no letter is from the President (${fromPresident.map((e) => e.id).join(', ')})`);
assert(EVENT_CATALOGUE.find((e) => e.id === 'the-insurance-renewal')?.from === 'Buildings and grounds', 'the insurance renewal comes from buildings and grounds');

// The summer's crowding line.
assert(crowdingSentence('dining', 0.51, 9.94) === 'Dining feeds only 51% of this class: prestige target −9.9', `the crowding line reads plainly (${crowdingSentence('dining', 0.51, 9.94)})`);

// Health phases in past its gate (96I), so the class that crosses 1,500
// is not met by a need the college could not yet build for.
const gate = HEALTH_CENTER_TIER1_POPULATION_GATE;
assert(healthPhaseIn(gate - 1) === 0 && healthPhaseIn(gate) === 0, 'health is no need below its gate');
assert(Math.abs(healthPhaseIn(gate + HEALTH_PHASE_IN / 10) - 0.1) < 1e-9, 'a tenth of the way in, a tenth of a need');
assert(healthPhaseIn(gate + HEALTH_PHASE_IN) === 1 && healthPhaseIn(1e6) === 1, 'a whole need past the phase-in');

console.log(failures === 0 ? `  ✓ all ${checks} checks passed` : `  ${failures} of ${checks} checks failed`);
if (failures > 0) process.exit(1);
