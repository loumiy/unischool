// ---------------------------------------------------------------------
// Plan 98D: three save slots beside the autosave. A slot round-trips a run
// through the same path as an imported file, an old save version in a slot
// is migrated on load, a full browser refuses the write without touching
// the slot or the autosave, and a deleted slot reads empty.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createInitialState } from '../src/state/actions';
import { bindScriptStream } from '../src/engine/random';
import { SAVE_KEY, SAVE_VERSION } from '../src/state/persistence';
import { SLOTS_KEY, deleteSlot, listSlots, readSlot, saveToSlot, slotKey } from '../src/state/slots';

bindScriptStream(9813);
const store = new Map<string, string>();
// A quota, in characters, that a test can lower to fill the browser.
let quota = Infinity;
(globalThis as unknown as { localStorage: unknown }).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => {
    const used = [...store.entries()].reduce((n, [key, val]) => n + (key === k ? 0 : val.length), 0);
    if (used + v.length > quota) throw new Error('QuotaExceededError');
    store.set(k, v);
  },
  removeItem: (k: string) => { store.delete(k); },
};

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) { failures += 1; console.log(`  ✗ ${msg}`); }
}

console.log('save slots tests');

// Empty to start.
assert(listSlots().length === 3 && listSlots().every((s) => s === null), 'three empty slots');

// A round trip.
{
  const s = createInitialState('Fernhill');
  s.clock.year = 7;
  assert(saveToSlot(2, s, 1_000) === 'saved', 'a run saves to a slot');
  const listed = listSlots();
  assert(listed[0] === null && listed[2] === null, 'only that slot fills');
  assert(listed[1]?.collegeName === 'Fernhill College' && listed[1]?.year === 7 && listed[1]?.savedAt === 1_000,
    `the slot names its run (${JSON.stringify(listed[1])})`);
  const read = readSlot(2);
  assert('state' in read && read.state.clock.year === 7 && read.state.self.name === s.self.name, 'it loads back the same run');
  assert(store.get(SAVE_KEY) === undefined, 'saving to a slot leaves the autosave alone');
}

// An old save version in a slot is migrated, as an import is.
{
  const old = readFileSync(join(process.cwd(), 'test/fixtures/save-v98.json'), 'utf8');
  assert(JSON.parse(old).version < SAVE_VERSION, 'the fixture is an older version');
  store.set(slotKey(3), old);
  store.set(SLOTS_KEY, JSON.stringify([...JSON.parse(store.get(SLOTS_KEY) ?? '[]'), { id: 3, collegeName: 'Old', year: 40, week: 6, savedAt: 1 }]));
  const read = readSlot(3);
  assert('state' in read && read.state.clock.year === 40, 'an older save in a slot loads, migrated');
}

// A full browser: the write is refused, and nothing it held is lost.
{
  store.set(SAVE_KEY, 'the autosave');
  const before = store.get(slotKey(2));
  // Already full: any write that does not shrink what is stored fails.
  quota = [...store.values()].reduce((n, v) => n + v.length, 0) - 50;
  const s = createInitialState('Bigfield');
  assert(saveToSlot(1, s) === 'full', 'a full browser refuses a new slot');
  assert(listSlots()[0] === null && store.get(slotKey(1)) === undefined, 'and the empty slot stays empty');
  assert(saveToSlot(2, s) === 'full', 'and refuses an overwrite');
  assert(store.get(slotKey(2)) === before && listSlots()[1]?.collegeName === 'Fernhill College', 'which keeps the run it held');
  assert(store.get(SAVE_KEY) === 'the autosave', 'and never touches the autosave');
  quota = Infinity;
}

// Deleting.
{
  deleteSlot(2);
  assert(listSlots()[1] === null && 'refused' in readSlot(2), 'a deleted slot reads empty');
  assert(listSlots()[2] !== null, 'and the others stay');
}

// A slot listed without its save, or junk in the index, reads empty.
{
  store.delete(slotKey(3));
  assert(listSlots()[2] === null, 'a slot whose save is gone reads empty');
  store.set(SLOTS_KEY, '{"not":"a list"}');
  assert(listSlots().every((s) => s === null), 'a broken index reads as no slots');
}

console.log(failures === 0 ? `  ✓ all ${checks} checks passed` : `  ${failures} of ${checks} checks failed`);
if (failures > 0) process.exit(1);
