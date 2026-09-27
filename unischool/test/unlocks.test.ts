// The bonus vernaculars' unlocks (state/unlocks.ts): each is earned by
// something a run does, banked in its own storage key at a save, and
// never taken away by a later run.

import { createInitialState } from '../src/state/actions';
import { bindScriptStream } from '../src/engine/random';
import { UNLOCKS, UNLOCKS_KEY, TUDOR_BEDS, isUnlocked, readUnlocks, recordUnlocks } from '../src/state/unlocks';
import { saveGame } from '../src/state/persistence';
import { BONUS_VERNACULAR_CHOICES, VERNACULAR_CHOICES } from '../src/components/buildingSpec';

bindScriptStream(4411);
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

console.log('unlocks tests');

// Every bonus set has exactly one unlock, and no founding set has one.
{
  const bonus = BONUS_VERNACULAR_CHOICES.map((c) => c.id).sort();
  assert(JSON.stringify(UNLOCKS.map((u) => u.id).sort()) === JSON.stringify(bonus), 'every bonus set has one unlock');
  assert(VERNACULAR_CHOICES.every((c) => isUnlocked(c.id, [])), 'the founding sets are always open');
  assert(BONUS_VERNACULAR_CHOICES.every((c) => !isUnlocked(c.id, [])), 'the bonus sets start locked');
  assert(UNLOCKS.every((u) => u.condition.trim().endsWith('.')), 'each says what it asks for');
}

// A new college has earned nothing.
{
  const s = createInitialState('Fernhill');
  assert(UNLOCKS.every((u) => !u.earned(s)), 'a new college has earned nothing');
  assert(recordUnlocks(s).length === 0 && readUnlocks().length === 0, 'and banks nothing');
}

// Each condition, one at a time, banked by a save.
{
  const s = createInitialState('Fernhill');
  s.students.capacity = TUDOR_BEDS;
  assert(saveGame(s), 'the run saves');
  assert(JSON.stringify(readUnlocks()) === '["tudor"]', 'a save banks Tudor once the beds are there');

  const gallery = s.tech.find((t) => t.facilityType === 'artGallery');
  assert(gallery !== undefined, 'the catalogue has an art gallery');
  if (gallery) gallery.status = 'done';
  assert(JSON.stringify(recordUnlocks(s)) === '["italianate"]', 'opening the gallery earns Italianate, and only it is new');

  s.self.suffix = 'University';
  assert(JSON.stringify(recordUnlocks(s)) === '["secondEmpire"]', 'the charter earns Second Empire');

  const stadium = s.tech.find((t) => t.facilityType === 'footballStadium');
  if (stadium) stadium.status = 'done';
  assert(recordUnlocks(s).length === 0, 'a stadium alone is not Art Deco');
  s.orgs.rivalries.football = { wins: 1, losses: 0, streak: 1 };
  assert(JSON.stringify(recordUnlocks(s)) === '["artDeco"]', 'a stadium and a rivalry win earn Art Deco');
  assert(readUnlocks().length === 4, 'all four banked');
}

// A later run never takes one away; a bad key reads as none.
{
  const s = createInitialState('Newfield');
  saveGame(s);
  assert(readUnlocks().length === 4, 'a new run keeps what earlier runs earned');
  store.set(UNLOCKS_KEY, '["tudor","castle"]');
  assert(JSON.stringify(readUnlocks()) === '["tudor"]', 'an unknown id is passed over');
  store.set(UNLOCKS_KEY, 'not json');
  assert(readUnlocks().length === 0, 'an unreadable key unlocks nothing');
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
