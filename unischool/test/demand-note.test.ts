// A student demand arrives in the inbox without stopping the clock (Plan 29,
// V1-16; Plan 77): raised, it is active and unread; read, it stays active
// until it is met or lapses.

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

// A celebration filed as a letter takes its week, as its stop did (Plan
// 95T): a demand waiting for a quiet week waits past it, then arrives.
{
  let s: GameState = createInitialState('Demands');
  s.pendingInterrupt = null;
  s.students.classes = { freshman: 3000, sophomore: 2000, junior: 2000, senior: 2000 };
  s = reducer(s, { type: 'DEBUG_FORCE_DEMAND', subject: 'basicNeeds' });
  s.events.pendingDemand = s.events.activeDemand;
  s.events.activeDemand = null;
  s.events.demandUnread = undefined;
  s.events.lastDecisionWeek = 0;
  // Past the opening, whose letters would claim the quiet weeks.
  s.events.opening.skipped = true;
  s.events.pendingMilestones = ['school-founded:Business'];
  s = reducer(s, { type: 'TICK' });
  assert(s.pendingInterrupt === null && (s.events.news ?? []).length === 1, 'the celebration is filed and the clock runs on');
  assert(s.events.activeDemand === null && s.events.pendingDemand !== null, 'the demand waits out the celebration\'s week');
  s = reducer(s, { type: 'TICK' });
  assert(s.events.activeDemand !== null, 'and arrives the week after');
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
