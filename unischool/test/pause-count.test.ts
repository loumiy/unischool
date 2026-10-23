// The pause counter (Plan 116A, sim/harness/pauses.ts): the goal report's
// pauses, counted as the play statistics count a stop. A two-week arrival
// is one pause; a matter left unopened is one final-week pause; an arrival
// under a stop is none, and the two players who bound it part only there.
// The summer waiting is one pause, and the setting's Off eases instead.

import { createInitialState } from '../src/state/actions';
import { bindScriptStream } from '../src/engine/random';
import { absoluteWeek } from '../src/data/eventData';
import { EVENT_CATALOGUE } from '../src/data/eventCatalogue';
import type { GameState } from '../src/state/types';
import { newTally, pauseStep, pauseView, tallyStep, type PauseStep, type PauseTrack } from '../sim/harness/pauses';

bindScriptStream(1160);

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('pause-count tests');

const twoWeeks = EVENT_CATALOGUE.find((x) => x.kind === 'inline' && x.timeoutWeeks === 2 && !/\{\w+\}/.test(x.text))!;
assert(twoWeeks !== undefined, 'the catalogue has a two-week matter to test with');

function fresh(): GameState {
  const s = createInitialState('Pauses');
  s.pendingInterrupt = null;
  s.events.opening.stage = 'play';
  s.clock.year = 30;
  s.clock.week = 10;
  return s;
}
function arrive(s: GameState, instanceId = 'a'): void {
  const c = s.catalogue ??= { pending: [], lastFired: {}, lastInlineWeek: 0, lastSeismicWeek: 0 };
  c.pending.push({ instanceId, eventId: twoWeeks.id, firedWeek: absoluteWeek(s), vars: {}, scale: 1 });
}
function look(before: PauseTrack | null, s: GameState, held = false): PauseStep {
  return pauseStep(before, { ...pauseView(s), held });
}

// A two-week arrival is one pause, for both players, and an ease with the
// setting off. The week after, it is not an arrival again, and its final
// week passes quietly: both opened it.
{
  const s = fresh();
  const quiet = look(null, s);
  assert(quiet.pauses['on-pause'] === null && quiet.pauses['every-slip'] === null && !quiet.eased, 'nothing waiting: no pause');
  arrive(s);
  const came = look(quiet.track, s);
  assert(came.pauses['on-pause'] === 'arrival', 'a two-week arrival pauses the clock for the player who opens on a pause');
  assert(came.pauses['every-slip'] === 'arrival', 'and for the one who opens every slip');
  assert(came.eased, 'with the setting off it eases the clock instead');
  s.clock.week += 1;
  const last = look(came.track, s);
  assert(last.pauses['on-pause'] === null && last.pauses['every-slip'] === null, 'opened, its final week does not pause the clock');
  assert(!last.eased, 'nor ease it again');
  const tally = newTally();
  for (const step of [quiet, came, last]) tallyStep(tally, s.clock.year, step);
  assert(tally.pauses['on-pause']['30']?.arrival === 1 && tally.eases['30'] === 1, 'the tally holds one arrival and one ease in the year');
}

// An arrival under a stop is no pause. The player who opens only for a
// pause leaves it unopened, so its final week pauses once; the one who
// opens every slip read it as it came.
{
  const s = fresh();
  const quiet = look(null, s);
  arrive(s);
  const held = look(quiet.track, s, true);
  assert(held.pauses['on-pause'] === null && held.pauses['every-slip'] === null, 'an arrival under a stop is no pause');
  assert(held.eased, 'the ease still acts under a stop');
  const lifted = look(held.track, s);
  assert(lifted.pauses['on-pause'] === null, 'nor an arrival once the stop is answered');
  s.clock.week += 1;
  const final = look(lifted.track, s);
  assert(final.pauses['on-pause'] === 'final-week', 'unopened, it pauses the clock in its final week');
  assert(final.pauses['every-slip'] === null, 'read off its slip, it does not');
  const again = look(final.track, s);
  assert(again.pauses['on-pause'] === null, 'the final week pauses it once');
}

// The summer waiting is one pause a summer, over whatever else; a run's
// first look is no arrival.
{
  const s = fresh();
  arrive(s);
  const first = look(null, s);
  assert(first.pauses['on-pause'] === null && !first.eased, 'what a run opens with has not arrived');
  s.clock.week = 52;
  const summer = pauseStep(first.track, { ...pauseView(s), held: true, summer: 'Pauses:30' });
  assert(summer.pauses['on-pause'] === 'summer' && summer.pauses['every-slip'] === 'summer', 'the summer waiting pauses the clock');
  const beat = pauseStep(summer.track, { ...pauseView(s), held: true, summer: 'Pauses:30' });
  assert(beat.pauses['on-pause'] === null, 'once a summer, whatever its beats');
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
