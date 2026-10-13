// ---------------------------------------------------------------------
// A memory of answers (Plan 101B): an answer that settles an event retires
// it, and one that doesn't brings it back with a telling that remembers.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { createInitialState } from '../src/state/actions';
import { bindScriptStream } from '../src/engine/random';
import { EVENT_CATALOGUE } from '../src/data/eventCatalogue';
import { eventById, eventText, fill } from '../src/systems/events/catalogue';
import { drawable, fire, resolveCatalogueEvent, settled } from '../src/systems/events/catalogueEngine';
import { exportSave, readSave } from '../src/state/persistence';
import type { GameState } from '../src/state/types';

bindScriptStream(1010);

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('event memory tests');

function college(): GameState {
  const s = createInitialState('Memory');
  s.clock.year = 30;
  s.catalogue = { pending: [], lastFired: {}, lastInlineWeek: 0, lastSeismicWeek: 0 };
  return s;
}

// Fire the event, answer it, and come back past its cooldown.
function answer(s: GameState, id: string, choiceId: string): void {
  const e = eventById(id)!;
  const p = fire(s, e);
  assert(resolveCatalogueEvent(s, p.instanceId, choiceId, 'timeout'), `${id}: ${choiceId} is answered`);
  s.clock.year += e.cooldownYears;
}

const MEMORY = ['the-boiler', 'the-master-key', 'the-writing-requirement', 'the-grade-medians', 'the-closing-bell', 'the-term-limits', 'the-flood', 'the-land-offer'];

// ---- The catalog's memory ----
{
  for (const id of MEMORY) {
    const e = eventById(id)!;
    assert((e.settles ?? []).length > 0, `${id} has an answer that settles it`);
    const others = e.choices.filter((c) => !(e.settles ?? []).includes(c.id));
    assert(others.every((c) => e.recalls?.[c.id] !== undefined), `${id}: every answer that doesn't settle it is recalled`);
  }
  for (const e of EVENT_CATALOGUE) {
    const ids = e.choices.map((c) => c.id);
    assert([...(e.settles ?? []), ...Object.keys(e.recalls ?? {})].every((c) => ids.includes(c)), `${e.id}: its memory names its own choices`);
    assert(!(e.settles ?? []).some((c) => e.recalls?.[c] !== undefined), `${e.id}: a settled answer is never recalled`);
  }
}

// ---- Settled, it never returns ----
for (const id of MEMORY) {
  const e = eventById(id)!;
  const s = college();
  answer(s, id, e.settles![0]);
  assert(settled(s, e) && !drawable(s, e), `${id}: ${e.settles![0]} settles it`);
}

// ---- Unsettled, it returns and remembers ----
for (const id of MEMORY) {
  const e = eventById(id)!;
  for (const choiceId of Object.keys(e.recalls ?? {})) {
    const s = college();
    answer(s, id, choiceId);
    assert(!settled(s, e), `${id}: ${choiceId} leaves it open`);
    const p = fire(s, e);
    const text = fill(eventText(e, p), p.vars);
    assert(p.recall === choiceId && text.includes('Year 30'), `${id}: back after ${choiceId}, it names the year (${text.slice(0, 80)}…)`);
    assert(!/\{\w+\}/.test(text), `${id}: its recall fills every name`);
  }
}

// ---- Any answer is remembered, the player's and the clock's alike ----
{
  const s = college();
  const e = eventById('the-closing-bell')!;
  const p = fire(s, e);
  resolveCatalogueEvent(s, p.instanceId, 'open', 'player');
  assert(s.catalogue!.lastAnswer?.['the-closing-bell']?.choiceId === 'open' && settled(s, e), 'the player\'s answer settles it as the clock\'s would');
  const plain = eventById('the-rankings-slip')!;
  const q = fire(s, plain);
  resolveCatalogueEvent(s, q.instanceId, plain.default, 'timeout');
  assert(s.catalogue!.lastAnswer?.['the-rankings-slip'] !== undefined && !settled(s, plain), 'an event with no memory is recorded and never settled');
  const r = fire(s, plain);
  assert(r.recall === undefined && eventText(plain, r) !== undefined, 'and returns in its own tellings');
}

// ---- Saved ----
{
  const s = college();
  answer(s, 'the-boiler', 'nurse');
  const p = fire(s, eventById('the-boiler')!);
  s.catalogue!.lastAnswer!['gone-event'] = { choiceId: 'x', year: 3 };
  s.catalogue!.lastAnswer!['university-charter'] = { choiceId: 'university', year: 20 };
  s.catalogue!.lastAnswer!['the-flood'] = { choiceId: 'repair', year: 'soon' as unknown as number };
  const read = readSave(exportSave(s).text);
  assert('state' in read, 'it saves and loads');
  if ('state' in read) {
    const c = read.state.catalogue!;
    assert(c.lastAnswer?.['the-boiler']?.choiceId === 'nurse', 'the last answer is kept');
    assert(c.lastAnswer?.['university-charter'] !== undefined, 'the charter\'s too, raised rather than drawn');
    assert(c.lastAnswer?.['gone-event'] === undefined && c.lastAnswer?.['the-flood'] === undefined, 'one naming a lost event, or malformed, is dropped');
    assert(c.pending.find((x) => x.instanceId === p.instanceId)?.recall === 'nurse', 'a waiting recall is kept');
  }
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
