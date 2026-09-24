// What waits on the map (Plan 34, systems/guidance/nextStep.ts's
// waitingOnMap): while a tab hides the map, the ticker's NEXT points back to
// the board's letter, an event in the panel, a milestone's note or a
// student demand, pulsing when it will not wait long.

import { createInitialState } from '../src/state/actions';
import { bindScriptStream } from '../src/engine/random';
import { waitingOnMap } from '../src/systems/guidance/nextStep';
import { EVENT_CATALOGUE } from '../src/data/eventCatalogue';
import { MILESTONES } from '../src/data/ladderData';
import { WEEKS_PER_YEAR } from '../src/state/types';

bindScriptStream(3401);

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('waiting-on-map tests');

{
  const s = createInitialState('Waiting');
  s.clock.year = 5;
  s.clock.week = 10;
  assert(waitingOnMap(s) === null, 'nothing waiting, nothing to point at');

  s.ladder.unread = [MILESTONES[0].id];
  const m = waitingOnMap(s);
  assert(m !== null && m.go === 'campus' && m.text.includes(MILESTONES[0].name) && !m.urgent, 'a milestone\'s note, calmly');

  const e = EVENT_CATALOGUE.find((x) => x.kind === 'inline' && x.timeoutWeeks >= 3)!;
  const week = (s.clock.year - 1) * WEEKS_PER_YEAR + s.clock.week;
  s.catalogue = { pending: [{ instanceId: 'a', eventId: e.id, firedWeek: week, vars: {}, scale: 1 }], lastFired: {}, lastInlineWeek: 0, lastSeismicWeek: 0 };
  const ev = waitingOnMap(s)!;
  assert(ev.text.startsWith('A matter waits:') && !ev.urgent, `an event outranks a milestone ("${ev.text}")`);
  assert(ev.text.length <= 90, 'cut to a clause');
  s.catalogue.pending[0].firedWeek = week - e.timeoutWeeks + 1;
  assert(waitingOnMap(s)!.urgent === true, 'and pulses in its last week');

  s.finance.distress = { ...(s.finance.distress ?? {}), letters: ['enter-2'] } as never;
  const board = waitingOnMap(s)!;
  assert(board.text === 'The board has written' && board.urgent === true, 'the board outranks everything');
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
