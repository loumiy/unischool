// The pause counter (Plan 116A, sim/harness/pauses.ts): the goal report's
// pauses, counted as the play statistics count a stop. A two-week arrival
// is one pause; a matter left unopened is one final-week pause; an arrival
// under a stop is none. A three-week arrival is none either (Plan 116B), so
// the two players who bound it part there: one meets it in its final week.
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
const threeWeeks = EVENT_CATALOGUE.find((x) => x.kind === 'inline' && x.timeoutWeeks === 3 && !/\{\w+\}/.test(x.text))!;
assert(threeWeeks !== undefined, 'and a three-week one');

function fresh(): GameState {
  const s = createInitialState('Pauses');
  s.pendingInterrupt = null;
  s.events.opening.stage = 'play';
  s.clock.year = 30;
  s.clock.week = 10;
  return s;
}
function arrive(s: GameState, instanceId = 'a', event = twoWeeks): void {
  const c = s.catalogue ??= { pending: [], lastFired: {}, lastInlineWeek: 0, lastSeismicWeek: 0 };
  // Raised in last week's tick, as the shell first sees a matter: the clock
  // has turned since (Plan 116B counts its weeks from there).
  c.pending.push({ instanceId, eventId: event.id, firedWeek: absoluteWeek(s) - 1, vars: {}, scale: 1 });
}
function look(before: PauseTrack | null, s: GameState, held = false): PauseStep {
  return pauseStep(before, { ...pauseView(s), held });
}

// A two-week arrival is one pause, for both players. With the setting off
// it is no ease: it arrives in its final week, which pauses the clock first
// (Plan 116B). The week after, it is not an arrival again, and its final
// week passes quietly: both opened it.
{
  const s = fresh();
  const quiet = look(null, s);
  assert(quiet.pauses['on-pause'] === null && quiet.pauses['every-slip'] === null && !quiet.eased, 'nothing waiting: no pause');
  arrive(s);
  const came = look(quiet.track, s);
  assert(came.pauses['on-pause'] === 'arrival', 'a two-week arrival pauses the clock for the player who opens on a pause');
  assert(came.pauses['every-slip'] === 'arrival', 'and for the one who opens every slip');
  assert(!came.eased, 'with the setting off its final week pauses the clock, so no ease');
  s.clock.week += 1;
  const last = look(came.track, s);
  assert(last.pauses['on-pause'] === null && last.pauses['every-slip'] === null, 'opened, its final week does not pause the clock');
  assert(!last.eased, 'nor ease it again');
  const tally = newTally();
  for (const step of [quiet, came, last]) tallyStep(tally, s.clock.year, step);
  assert(tally.pauses['on-pause']['30']?.arrival === 1 && tally.eases['30'] === undefined, 'the tally holds one arrival and no ease in the year');
}

// An arrival under a stop is no pause. The player who opens only for a
// pause leaves it unopened, so its final week pauses once; the one who
// opens every slip read it as it came.
{
  const s = fresh();
  const quiet = look(null, s);
  arrive(s, 'a', threeWeeks);
  const held = look(quiet.track, s, true);
  assert(held.pauses['on-pause'] === null && held.pauses['every-slip'] === null, 'an arrival under a stop is no pause');
  assert(!held.eased, 'nor an ease (Plan 116B: never under a hold)');
  const lifted = look(held.track, s);
  assert(lifted.pauses['on-pause'] === null, 'nor an arrival once the stop is answered');
  s.clock.week += 1;
  const final = look(lifted.track, s);
  assert(final.pauses['on-pause'] === 'final-week', 'unopened, it pauses the clock in its final week');
  assert(final.pauses['every-slip'] === null, 'read off its slip, it does not');
  const again = look(final.track, s);
  assert(again.pauses['on-pause'] === null, 'the final week pauses it once');
}

// A matter with weeks to spare (Plan 116B): no pause and no ease on
// arrival. The player who opens only for a pause meets it in its final
// week; the one who opens every slip never.
{
  const s = fresh();
  const quiet = look(null, s);
  arrive(s, 'a', threeWeeks);
  let step = look(quiet.track, s);
  assert(step.pauses['on-pause'] === null && step.pauses['every-slip'] === null && !step.eased, 'a three-week arrival neither pauses nor eases the clock');
  const seen: Record<string, string[]> = { 'on-pause': [], 'every-slip': [] };
  for (let w = 1; w < threeWeeks.timeoutWeeks; w++) {
    s.clock.week += 1;
    step = look(step.track, s);
    for (const who of ['on-pause', 'every-slip'] as const) if (step.pauses[who]) seen[who].push(step.pauses[who]!);
  }
  assert(seen['on-pause'].join() === 'final-week', `unopened, it pauses once in its final week (${seen['on-pause'].join()})`);
  assert(seen['every-slip'].length === 0, 'read off its slip, it never pauses the clock');
}

// The summer waiting is one pause a summer, over whatever else; a run's
// first look is no arrival.
{
  const s = fresh();
  arrive(s, 'a', threeWeeks);
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
