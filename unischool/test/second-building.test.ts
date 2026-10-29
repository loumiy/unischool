// ---------------------------------------------------------------------
// The second specialization building (Plan 120C). What is worth pinning:
//
//   - every school distinguished opens no office now: five milestones do;
//   - the week after, the board asks which building, once, and never
//     offers the specialization's own;
//   - the answer opens that building to the college, and its works run
//     (the park's boost), while the specialization stays as it was;
//   - the answer saves, and a save naming the specialization drops it.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { teachingCollege } from './fixtures/teaching';
import { reducer } from '../src/engine/reducer';
import { tickEvents } from '../src/systems/events/eventSystem';
import { offeredChoices, findDecisionEvent, SECOND_BUILDING_EVENT } from '../src/data/eventData';
import { MILESTONES, OFFICE_MILESTONES, SECOND_BUILDING_MILESTONE } from '../src/data/ladderData';
import { MAX_OFFICES } from '../src/data/officeData';
import { RESEARCH_PARK_ID } from '../src/data/researchData';
import { parkWorks } from '../src/data/researchParkData';
import { projectOpen } from '../src/systems/estate/projects';
import { specializationOf } from '../src/systems/prestige/specialization';
import { exportSave, readSave } from '../src/state/persistence';
import { bindScriptStream } from '../src/engine/random';
import type { GameState } from '../src/state/types';

bindScriptStream(1203);

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('second building tests');

function college(): GameState {
  const s = teachingCollege('Second');
  s.events.opening.skipped = true;
  s.pendingInterrupt = null;
  s.specialization = 'academics';
  s.specializationYear = 20;
  s.clock.year = 40;
  return s;
}
const park = (s: GameState) => s.tech.find((t) => t.id === RESEARCH_PARK_ID)!;

// ---- The ladder ----
{
  const last = MILESTONES.find((m) => m.id === SECOND_BUILDING_MILESTONE)!;
  assert(last !== undefined && !last.office, 'every school distinguished opens no office');
  assert(OFFICE_MILESTONES.length === 5 && MAX_OFFICES === 5, 'five milestones open five offices');
  assert(last.opens.some((l) => /second specialization building/.test(l)), `and the ladder says what it opens (${last.opens.join('; ')})`);
}

// ---- The question ----
{
  let s = college();
  tickEvents(s);
  assert(s.pendingInterrupt?.type !== 'decision-event', 'before the milestone, no question');
  s.ladder.reached[SECOND_BUILDING_MILESTONE] = 40;
  assert(!projectOpen(s, park(s)), 'the Research Park is closed to a college specialized in academics');
  tickEvents(s);
  const p = s.pendingInterrupt;
  assert(p?.type === 'decision-event' && (p.payload as { eventId: string }).eventId === SECOND_BUILDING_EVENT, `then the board asks (${p?.type})`);
  const offered = offeredChoices(s, findDecisionEvent(SECOND_BUILDING_EVENT)!, {}).map((c) => c.id);
  assert(offered.join() === 'research,athletics,studentLife', `the other three are offered (${offered.join(', ')})`);
  s = reducer(s, { type: 'RESOLVE_DECISION_EVENT', eventId: SECOND_BUILDING_EVENT, choiceId: 'research', ctx: {} });
  assert(s.secondBuilding === 'research' && s.pendingInterrupt === null, 'the answer is kept');
  assert(projectOpen(s, park(s)), 'and opens the Research Park');
  assert(specializationOf(s) === 'academics', 'the specialization stays academics');
  park(s).status = 'done';
  assert(parkWorks(s), 'standing, the park does its work');
  tickEvents(s);
  assert(s.pendingInterrupt === null || s.pendingInterrupt.type !== 'decision-event' || (s.pendingInterrupt.payload as { eventId: string }).eventId !== SECOND_BUILDING_EVENT, 'and the board asks once');

  const back = readSave(exportSave(s).text);
  assert(!('refused' in back) && back.state.secondBuilding === 'research', 'the answer saves');
  s.secondBuilding = 'academics';
  const odd = readSave(exportSave(s).text);
  assert(!('refused' in odd) && odd.state.secondBuilding === undefined, 'a second building that is the specialization is dropped');
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
