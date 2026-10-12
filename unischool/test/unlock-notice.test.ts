// ---------------------------------------------------------------------
// Plan 98C: a bonus architecture earned during a run is said. The game
// loop banks it and dispatches UNLOCK_EARNED, which files a letter the week
// it is earned and keeps it for the Final Report; the founding screen marks
// a set New until a college is founded in it.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { createInitialState } from '../src/state/actions';
import { bindScriptStream } from '../src/engine/random';
import { reducer } from '../src/engine/reducer';
import { inboxItems } from '../src/systems/inbox/inbox';
import { TUDOR_BEDS, bankUnlocks, isNewUnlock, markSeen, readSeen, readUnlocks } from '../src/state/unlocks';

bindScriptStream(9812);
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
  if (!cond) { failures += 1; console.log(`  ✗ ${msg}`); }
}

console.log('unlock notice tests');

// The letter: filed once, the week it is earned, and kept for the report.
{
  let s = createInitialState('Fernhill');
  s = reducer(s, { type: 'UNLOCK_EARNED', ids: ['tudor'] });
  const letters = (s.events.news ?? []).filter((n) => n.type === 'unlock');
  assert(letters.length === 1 && letters[0].unread, 'one unread letter for the set');
  assert(JSON.stringify(s.events.unlocksEarned) === '["tudor"]', 'the run keeps it for the Final Report');
  const item = inboxItems(s).find((i) => i.kind === 'news' && i.ref === 'unlock:tudor');
  assert(item?.subject === 'Tudor architecture, unlocked', `the inbox names it (${item?.subject})`);
  assert(item?.preview === 'Your next college can be built in Tudor.', `and says where it goes (${item?.preview})`);
  s = reducer(s, { type: 'UNLOCK_EARNED', ids: ['tudor'] });
  assert((s.events.news ?? []).filter((n) => n.type === 'unlock').length === 1, 'a repeat files nothing');
}

// A sandbox earns nothing and is told nothing.
{
  let s = createInitialState('Sandbox');
  s.sandbox = true;
  s = reducer(s, { type: 'UNLOCK_EARNED', ids: ['tudor'] });
  assert(!(s.events.news ?? []).some((n) => n.type === 'unlock'), 'a sandbox files no letter');
  s.students.capacity = TUDOR_BEDS;
  assert(bankUnlocks(s).length === 0 && readUnlocks().length === 0, 'and banks nothing');
}

// Banking: newly earned sets only, once.
{
  store.clear();
  const s = createInitialState('Fernhill');
  assert(bankUnlocks(s).length === 0, 'a new college has earned nothing');
  s.students.capacity = TUDOR_BEDS;
  assert(JSON.stringify(bankUnlocks(s)) === '["tudor"]', 'Tudor is banked the week it is earned');
  assert(bankUnlocks(s).length === 0, 'and only once');
}

// New on the founding screen, until a college is founded in it.
{
  store.clear();
  assert(!isNewUnlock('tudor', ['tudor'], null), 'with no seen list, an old unlock is not marked New');
  const s = createInitialState('Fernhill');
  s.students.capacity = TUDOR_BEDS;
  bankUnlocks(s);
  const seen = readSeen();
  assert(seen !== null && !seen.includes('tudor'), 'a fresh unlock starts the seen list without it');
  assert(isNewUnlock('tudor', readUnlocks(), seen), 'so it is marked New');
  assert(!isNewUnlock('gothic', readUnlocks(), seen), 'a founding set is never New');
  markSeen('tudor');
  assert(!isNewUnlock('tudor', readUnlocks(), readSeen()), 'founding a college in it clears New');
}

console.log(failures === 0 ? `  ✓ all ${checks} checks passed` : `  ${failures} of ${checks} checks failed`);
if (failures > 0) process.exit(1);
