// A student demand arrives as a note that does not stop the clock (Plan 29,
// V1-16): raised, it is active and unread; noted, it stays active until it
// is met or lapses.

import { createInitialState } from '../src/state/actions';
import { reducer } from '../src/engine/reducer';
import { bindScriptStream } from '../src/engine/random';
import type { GameState } from '../src/state/types';

bindScriptStream(2932);

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('demand note tests');

{
  let s: GameState = createInitialState('Demands');
  s.pendingInterrupt = null;
  s.students.classes = { freshman: 3000, sophomore: 2000, junior: 2000, senior: 2000 };
  s = reducer(s, { type: 'DEBUG_FORCE_DEMAND', subject: 'basicNeeds' });
  assert(s.events.activeDemand !== null, 'a demand is raised');
  assert(s.pendingInterrupt === null, 'without stopping the clock');
  assert(s.events.demandUnread === true, 'as a note to be read');
  s = reducer(s, { type: 'TICK' });
  assert(s.pendingInterrupt?.type !== 'demand', 'and the next week brings no demand modal either');
  s = reducer(s, { type: 'READ_DEMAND' });
  assert(s.events.demandUnread === undefined && s.events.activeDemand !== null, 'noted, it stays active until met or lapsed');
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
