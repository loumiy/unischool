// The bonus vernaculars' unlocks (state/unlocks.ts): each is earned by
// something a run does, banked in its own storage key at a save, and
// never taken away by a later run. And the titles (Plan 127): a first
// browser has College only; Institute and University, once earned in a
// run, are open to every run after it; a browser with Second Empire starts
// with Institute; a sandbox earns none.

import { createInitialState } from '../src/state/actions';
import { bindScriptStream } from '../src/engine/random';
import { UNLOCKS, UNLOCKS_KEY, TUDOR_BEDS, TITLE_UNLOCKS_KEY, isNewTitle, isUnlocked, markTitleSeen, openTitles, readTitleUnlocks, readTitlesSeen, readUnlocks, recordTitles, recordUnlocks } from '../src/state/unlocks';
import { graduatePrograms } from '../src/data/techData';
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

  s.self.charters.institute = true;
  assert(JSON.stringify(recordUnlocks(s)) === '["secondEmpire"]', 'the Institute charter earns Second Empire, whichever name the college keeps');

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

// ---- The titles (Plan 127) ----
{
  store.clear();
  const s = createInitialState('Larchmont');
  assert(JSON.stringify(openTitles()) === '["College"]', 'a first browser has College only');
  assert(recordTitles(s).length === 0, 'a new college earns no title');
  s.self.charters.institute = true;
  assert(JSON.stringify(recordTitles(s)) === '["Institute"]', 'the Institute charter earns Institute');
  const hall = Object.keys(s.halls)[0];
  s.halls[hall][0] = { programId: graduatePrograms()[0].id };
  saveGame(s);
  assert(JSON.stringify(readTitleUnlocks()) === '["Institute","University"]', 'a graduate program founded earns University, banked by a save');
  const next = createInitialState('Northcote');
  saveGame(next);
  assert(JSON.stringify(openTitles()) === '["College","Institute","University"]', 'and the next run may open under either');

  assert(isNewTitle('Institute', readTitleUnlocks(), readTitlesSeen()), 'a title not yet used is new');
  markTitleSeen('Institute');
  assert(!isNewTitle('Institute', readTitleUnlocks(), readTitlesSeen()) && isNewTitle('University', readTitleUnlocks(), readTitlesSeen()), 'until a college is founded under it');
  assert(!isNewTitle('College', readTitleUnlocks(), readTitlesSeen()), 'College is never new');

  // The Second Empire seed (D5): a browser that won the old charter.
  store.clear();
  store.set(UNLOCKS_KEY, '["secondEmpire"]');
  assert(JSON.stringify(readTitleUnlocks()) === '["Institute"]', 'a browser with Second Empire starts with Institute');
  recordTitles(createInitialState('Eastbury'));
  store.set(UNLOCKS_KEY, '[]');
  assert(JSON.stringify(readTitleUnlocks()) === '["Institute"]', 'and keeps it once banked');

  // A sandbox earns nothing (D6).
  store.clear();
  const sand = createInitialState('Sandford');
  sand.sandbox = true;
  sand.self.charters.institute = true;
  sand.halls[Object.keys(sand.halls)[0]][0] = { programId: graduatePrograms()[0].id };
  saveGame(sand);
  assert(recordTitles(sand).length === 0 && readTitleUnlocks().length === 0, 'a sandbox earns no title');

  store.set(TITLE_UNLOCKS_KEY, 'not json');
  assert(readTitleUnlocks().length === 0, 'an unreadable key opens nothing');
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
