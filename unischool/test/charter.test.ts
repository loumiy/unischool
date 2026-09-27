// ---------------------------------------------------------------------
// The charter (Plan 72E, Plan 78G): the first lab at work brings a
// university charter as a matter to decide in the inbox, "Become X
// University" (the default after four weeks) or "Keep the name X College",
// with no modal and drawing nothing from the run's stream; the pennant
// renames the college, the name and College or, once chartered,
// University; a save held at the old modal loads chartered, a week on; and
// the founding screen's caption shows only for a typed "University".
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { reducer } from '../src/engine/reducer';
import { bindScriptStream, drawsSoFar } from '../src/engine/random';
import { tickEvents } from '../src/systems/events/eventSystem';
import { timeOutCatalogue } from '../src/systems/events/catalogueEngine';
import { CHARTER_INSTANCE } from '../src/systems/events/charter';
import { CHARTER_EVENT } from '../src/data/eventCatalogue';
import { eventById } from '../src/systems/events/catalogue';
import { answered, inboxItems } from '../src/systems/inbox/inbox';
import { readSave, SAVE_VERSION } from '../src/state/persistence';
import { createInitialState } from '../src/state/actions';
import { recordUnlocks } from '../src/state/unlocks';
import { institutionName, typedUniversity, WEEKS_PER_YEAR, type GameState } from '../src/state/types';

bindScriptStream(7273);
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

console.log('charter tests');

const raw = readFileSync(join(process.cwd(), 'test/fixtures/save-v78-charter.json'), 'utf8');
const held = JSON.parse(raw) as { version: number; state: GameState };

// The same college the week before the old modal: a lab at work, the
// charter not yet granted.
function beforeCharter(): GameState {
  const s = structuredClone(held.state);
  s.pendingInterrupt = null;
  s.self.universityCharterOffered = false;
  s.self.suffix = 'College';
  return s;
}
const waiting = (s: GameState) => s.catalogue?.pending.find((p) => p.instanceId === CHARTER_INSTANCE);
const weeksOn = (s: GameState, n: number) => {
  for (let i = 0; i < n; i++) {
    s.clock.week += 1;
    if (s.clock.week > WEEKS_PER_YEAR) { s.clock.week = 1; s.clock.year += 1; }
  }
};

// ---- The matter ----
{
  const s = beforeCharter();
  const name = institutionName(s.self);
  const log = s.log.length;
  const draws = drawsSoFar();
  tickEvents(s);
  assert(drawsSoFar() === draws, 'raising the charter draws nothing from the run\'s stream');
  assert(s.pendingInterrupt === null, 'with no modal');
  assert(s.self.universityCharterOffered && waiting(s) !== undefined, 'the first lab brings the charter, waiting in the inbox');
  assert(institutionName(s.self) === name && s.log.length === log, `and nothing is renamed or logged yet (${institutionName(s.self)})`);
  const item = inboxItems(s).find((i) => i.ref === CHARTER_INSTANCE);
  assert(item?.tier === 'decide' && item.subject === 'The charter' && item.from === 'The board' && item.weeksLeft === 4, `a matter to decide, "The charter", from the board, four weeks to answer (${item?.from}: ${item?.subject}, ${item?.weeksLeft})`);
  const e = eventById(waiting(s)!.eventId)!;
  const labels = e.choices.map((c) => c.label.replace('{name}', s.self.name));
  assert(labels[0] === `Become ${s.self.name} University` && labels[1] === `Keep the name ${s.self.name} College` && e.default === 'university', `two answers, the first the default (${labels.join(' / ')})`);
  assert(!/\byou\b|\byour\b/i.test(`${e.text} ${labels.join(' ')}`), 'written to the President, not to "you"');
  tickEvents(s);
  assert(s.catalogue!.pending.filter((p) => p.eventId === CHARTER_EVENT.id).length === 1, 'raised once');
}

// ---- The default: University after four weeks, as before ----
{
  const s = beforeCharter();
  tickEvents(s);
  const college = institutionName(s.self);
  weeksOn(s, 3);
  timeOutCatalogue(s);
  assert(s.self.suffix === 'College' && waiting(s) !== undefined, 'three weeks on it still waits');
  weeksOn(s, 1);
  timeOutCatalogue(s);
  assert(s.self.suffix === 'University' && waiting(s) === undefined, `four weeks on it takes its default: ${institutionName(s.self)}`);
  const line = s.log.find((l) => /university charter/.test(l.message));
  assert(line !== undefined && line.message.includes(`${college} is now ${institutionName(s.self)}`), `the log line stays: "${line?.message}"`);
  assert(answered(s)[0]?.message === `The charter — Nobody answered in time: Become ${s.self.name} University.`, `the Answered list keeps it: "${answered(s)[0]?.message}"`);
  assert(inboxItems(s).some((i) => i.tier === 'bulletin' && /university charter/.test(i.subject)), 'and the week\'s bulletins carry the rename');
  const again = s.log.length;
  tickEvents(s);
  assert(!s.log.slice(0, s.log.length - again).some((l) => /university charter/.test(l.message)) && waiting(s) === undefined, 'once');
}

// ---- The answers, through the reducer ----
{
  const start = beforeCharter();
  tickEvents(start);
  const up = reducer(start, { type: 'RESOLVE_CATALOGUE_EVENT', instanceId: CHARTER_INSTANCE, choiceId: 'university' });
  assert(up.self.suffix === 'University' && waiting(up) === undefined, `"Become X University" renames at once (${institutionName(up.self)})`);

  const name = institutionName(start.self);
  const kept = reducer(start, { type: 'RESOLVE_CATALOGUE_EVENT', instanceId: CHARTER_INSTANCE, choiceId: 'college' });
  assert(institutionName(kept.self) === name && kept.self.name === start.self.name && kept.self.suffix === 'College', `keeping the name leaves it, and the pennant, alone (${institutionName(kept.self)})`);
  assert(waiting(kept) === undefined && kept.self.universityCharterOffered, 'the matter is settled and the charter granted');
  assert(kept.log.some((l) => l.message === `With research under way, the board has granted a university charter, and ${name} keeps its name.`), 'the log says so');
  assert(answered(kept)[0]?.message === `The charter — Answered: Keep the name ${start.self.name} College.`, `the Answered list keeps the choice: "${answered(kept)[0]?.message}"`);
  const later = structuredClone(kept);
  tickEvents(later);
  assert(waiting(later) === undefined && later.self.suffix === 'College', 'and it is not offered again');
  const renamed = reducer(kept, { type: 'RENAME_COLLEGE', name: kept.self.name, suffix: 'University' });
  assert(renamed.self.suffix === 'University', 'the pennant can still take University later');
  assert(recordUnlocks(structuredClone(kept)).includes('secondEmpire'), 'a college that kept its name still earns the charter\'s architecture');

  // A rename while it waits: the answers follow the new name.
  const moved = reducer(start, { type: 'RENAME_COLLEGE', name: 'Ashgrove', suffix: 'College' });
  assert(waiting(moved)?.vars.name === 'Ashgrove', 'a rename while it waits renames its answers');
}

// ---- The pennant ----
{
  const s = createInitialState('Hollis');
  const renamed = reducer(s, { type: 'RENAME_COLLEGE', name: '  Ashgrove University ', suffix: 'University' });
  assert(renamed.self.name === 'Ashgrove' && renamed.self.suffix === 'College', `before the charter, a rename keeps College and drops a typed suffix (${institutionName(renamed.self)})`);
  assert(/is renamed Ashgrove College/.test(renamed.log[0]?.message ?? ''), 'and says so in the log');
  assert(reducer(s, { type: 'RENAME_COLLEGE', name: '   ', suffix: 'College' }) === s, 'an empty name is refused');
  assert(reducer(s, { type: 'RENAME_COLLEGE', name: 'Hollis', suffix: 'College' }) === s, 'as is no change at all');
  const chartered = structuredClone(s);
  chartered.self.universityCharterOffered = true;
  chartered.self.suffix = 'University';
  const back = reducer(chartered, { type: 'RENAME_COLLEGE', name: 'Hollis', suffix: 'College' });
  assert(back.self.suffix === 'College', 'once chartered, it can go back to College');
  const up = reducer(back, { type: 'RENAME_COLLEGE', name: 'Hollis', suffix: 'University' });
  assert(up.self.suffix === 'University', 'and to University again');
  const long = reducer(s, { type: 'RENAME_COLLEGE', name: 'X'.repeat(90), suffix: 'College' });
  assert(long.self.name.length === 60, 'a name is cut at the founding screen\'s length');
}

// ---- Saves ----
{
  assert(held.version === 78 && held.state.pendingInterrupt?.type === 'charter', 'the fixture is a version-78 save held at the old modal');
  const read = readSave(raw);
  if ('refused' in read) {
    assert(false, `it loads (refused: ${read.refused})`);
  } else {
    const s = read.state;
    assert(s.pendingInterrupt === null && s.self.suffix === 'University' && s.self.universityCharterOffered, 'it loads chartered, with no modal');
    const week = (y: number, w: number) => y * 52 + w;
    assert(week(s.clock.year, s.clock.week) === week(held.state.clock.year, held.state.clock.week) + 1, 'a week on, as answering it was');
    assert(/university charter/.test(s.log[0]?.message ?? ''), 'with the charter in the log');
    tickEvents(s);
    assert(waiting(s) === undefined && s.self.suffix === 'University', 'and a college chartered before the matter is never asked');
  }

  // A save from before this change, written the week before the charter:
  // it loads, and the charter comes as the matter.
  const before = readSave(JSON.stringify({ version: SAVE_VERSION, savedAt: 0, state: beforeCharter() }));
  if ('refused' in before) {
    assert(false, `a save before the charter loads (refused: ${before.refused})`);
  } else {
    tickEvents(before.state);
    assert(waiting(before.state) !== undefined && before.state.self.suffix === 'College', 'a save from before the charter loads and is asked');
    // And one saved with the matter waiting keeps it.
    const again = readSave(JSON.stringify({ version: SAVE_VERSION, savedAt: 0, state: before.state }));
    assert(!('refused' in again) && waiting(again.state) !== undefined, 'a save with the charter waiting keeps it');
  }
}

// ---- The founding screen's caption ----
{
  assert(typedUniversity('Harwick University') && typedUniversity('  harwick university '), 'a typed "University" gets the caption');
  assert(!typedUniversity('Harwick') && !typedUniversity('Harwick College') && !typedUniversity('University') && !typedUniversity('Universityville'), 'nothing else does');
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
