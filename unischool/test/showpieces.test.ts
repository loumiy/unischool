// The campus radio station and the sciences' showpieces (Plan 127): the
// radio opens at the first commencement, ahead of the pub, and Media
// Studies' advanced courses need it; the greenhouse and the observatory
// open when Environmental Science and Aerospace Engineering are
// distinguished, and the news of the program names its showpiece.

import { createInitialState } from '../src/state/actions';
import { bindScriptStream } from '../src/engine/random';
import type { GameState } from '../src/state/types';
import { CAMPUS_RADIO_ID, PUB_ID } from '../src/data/facilitiesData';
import { MILESTONES, milestoneForBuildable } from '../src/data/ladderData';
import { describeMilestone } from '../src/data/eventData';
import { unlockAvailable } from '../src/systems/techtree/techSystem';

bindScriptStream(1270);
const store = new Map<string, string>();
(globalThis as unknown as { localStorage: unknown }).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => { store.set(k, v); },
  removeItem: (k: string) => { store.delete(k); },
};

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('showpieces tests');

const fresh = (): GameState => createInitialState('Showpieces');
const tech = (s: GameState, id: string) => s.tech.find((t) => t.id === id)!;

// ---- The radio at the first commencement, the pub at a town's worth ----
{
  assert(milestoneForBuildable(CAMPUS_RADIO_ID) === 'commencement', 'the radio opens at the first commencement');
  assert(milestoneForBuildable(PUB_ID) === 'town', "the pub opens at A town's worth");
  const order = MILESTONES.map((m) => m.id);
  assert(order.indexOf('commencement') < order.indexOf('town'), 'so the radio comes first');
  const commencement = MILESTONES.find((m) => m.id === 'commencement')!;
  const town = MILESTONES.find((m) => m.id === 'town')!;
  assert(commencement.opens.some((o) => o.startsWith('Campus Radio')) && !commencement.opens.some((o) => o.startsWith('The Pub')), 'the commencement letter lists the radio, not the pub');
  assert(town.opens.some((o) => o.startsWith('The Pub')), "A town's worth lists the pub");
  const s = fresh();
  s.ladder.reached.commencement = 1;
  unlockAvailable(s);
  assert(tech(s, CAMPUS_RADIO_ID).status === 'available' && tech(s, PUB_ID).status === 'locked', 'after the first summer the radio is open and the pub waits');
}

// ---- Media Studies' advanced courses need the radio ----
{
  const s = fresh();
  for (const id of ['MDIA210', 'MDIA220', 'MDIA230', 'MDIA240']) {
    assert(tech(s, id).prereqs.includes(CAMPUS_RADIO_ID), `${id} needs the campus radio`);
  }
  assert(!tech(s, 'MDIA110').prereqs.includes(CAMPUS_RADIO_ID) && !tech(s, 'MDIA310').prereqs.includes(CAMPUS_RADIO_ID), 'the tier-2 courses do not, and the capstone inherits it through the quartet');
  assert(!tech(s, 'FILM210').prereqs.includes(CAMPUS_RADIO_ID), 'Film keeps its own studio');
  assert(tech(s, CAMPUS_RADIO_ID).prereqs.length === 0, 'and the radio needs no course, so the gate cannot be circular');
}

// ---- The greenhouse and the observatory wait on a distinguished program ----
{
  const s = fresh();
  for (const m of MILESTONES) s.ladder.reached[m.id] = 1;
  unlockAvailable(s);
  assert(tech(s, 'AMENITY-GREENHOUSE').status === 'locked', 'every milestone reached, the greenhouse still waits');
  assert(tech(s, 'AMENITY-OBSERVATORY').status === 'locked', 'and so does the observatory');
  s.milestones['program-established:ENVS'] = true;
  unlockAvailable(s);
  assert(tech(s, 'AMENITY-GREENHOUSE').status === 'locked', 'an established program is not enough');
  s.milestones['program-distinguished:ENVS'] = true;
  unlockAvailable(s);
  assert(tech(s, 'AMENITY-GREENHOUSE').status === 'available', 'Environmental Science distinguished opens the greenhouse');
  assert(tech(s, 'AMENITY-OBSERVATORY').status === 'locked', 'but not the observatory');
  s.milestones['program-distinguished:AERO'] = true;
  unlockAvailable(s);
  assert(tech(s, 'AMENITY-OBSERVATORY').status === 'available', 'Aerospace Engineering distinguished opens the observatory');
  const envs = describeMilestone(s, 'program-distinguished:ENVS');
  assert(envs?.unlocks.includes('The Greenhouse') === true, `the news of Environmental Science names the greenhouse (${envs?.unlocks.join(', ')})`);
  const aero = describeMilestone(s, 'program-distinguished:AERO');
  assert(aero?.unlocks.includes('The Observatory') === true, 'and Aerospace Engineering the observatory');
  assert(describeMilestone(s, 'program-distinguished:ECON')?.unlocks.length === 0, 'a program with no showpiece names nothing');
}

// ---- A sandbox has them all ----
{
  const s = fresh();
  s.sandbox = true;
  unlockAvailable(s);
  assert(['AMENITY-GREENHOUSE', 'AMENITY-OBSERVATORY', CAMPUS_RADIO_ID].every((id) => tech(s, id).status === 'available'), 'a sandbox opens the radio and both showpieces at once');
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
