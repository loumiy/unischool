// ---------------------------------------------------------------------
// Two tabs on one save (Plan 79B, G7-1). The claim and the guard under it,
// in persistence.ts, from one tab's side. Another tab is only ever its
// writes into the shared storage, so it is played here by writing into the
// store directly, as that tab's saveGame and claimSave would.
//
//   npm test -- two-tabs
// ---------------------------------------------------------------------

import { createInitialState } from '../src/state/actions';
import {
  adoptSave, CLAIM_KEY, claimHolder, claimSave, claimTaken, clearSave, loadGame, SAVE_KEY, SAVE_VERSION, saveGame,
  saveBeforeLosing, saveIsNewer, takeResume, thisTab, trySave,
} from '../src/state/persistence';

// In-memory storage so the persistence module works under Node, as
// save-load.test.ts does. One store for the page, one for the tab's session.
const store = new Map<string, string>();
const session = new Map<string, string>();
function memoryStorage(m: Map<string, string>) {
  return {
    getItem: (k: string) => (m.has(k) ? m.get(k)! : null),
    setItem: (k: string, v: string) => { m.set(k, String(v)); },
    removeItem: (k: string) => { m.delete(k); },
    clear: () => { m.clear(); },
  };
}
(globalThis as unknown as { localStorage: unknown }).localStorage = memoryStorage(store);
(globalThis as unknown as { sessionStorage: unknown }).sessionStorage = memoryStorage(session);

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

const storedSavedAt = (): number => (JSON.parse(store.get(SAVE_KEY)!) as { savedAt: number }).savedAt;
const storedName = (): string => (JSON.parse(store.get(SAVE_KEY)!) as { state: { self: { name: string } } }).state.self.name;
// The other tab's save, stamped `savedAt`.
function otherTabSaves(name: string, savedAt: number, pretty = false): void {
  const payload = { version: SAVE_VERSION, savedAt, state: createInitialState(name) };
  store.set(SAVE_KEY, pretty ? JSON.stringify(payload, null, 2) : JSON.stringify(payload));
}

// ---- The guard: an older game never goes over a newer one ----
function testGuard(): void {
  clearSave();
  const mine = createInitialState('Here');
  assert(trySave(mine) === 'saved', 'with no save stored, a tab writes');
  const first = storedSavedAt();
  assert(saveGame(mine), 'and writes again over its own save');

  // The other tab saves after this one.
  otherTabSaves('There', storedSavedAt() + 60_000);
  assert(saveIsNewer(), 'a save newer than the one this tab wrote is seen as newer');
  assert(trySave(mine) === 'newer', 'and this tab\'s older game is refused');
  assert(!saveGame(mine), 'saveGame reports the refusal');
  assert(storedName() === 'There', 'the newer game is still stored');

  // Loading it makes it this tab's: the next write goes through.
  assert(loadGame()?.self.name === 'There', 'the newer game loads');
  assert(!saveIsNewer(), 'and is no longer newer than what this tab has seen');
  assert(trySave(mine) === 'saved', 'so this tab\'s next save goes through');
  assert(storedSavedAt() >= first, 'stamped at the time of writing');

  // A stored save older than this tab's (the clock set back) is no bar.
  otherTabSaves('Older', 1);
  assert(trySave(mine) === 'saved', 'a stored save older than this tab\'s is written over');

  // A pretty-printed payload (a file loaded through the debug panel) is read
  // by a full parse.
  otherTabSaves('Pretty', Date.now() + 120_000, true);
  assert(trySave(mine) === 'newer', 'a newer save written in another layout is still refused');
}

// ---- A fresh tab, New game, an import and a set-aside save ----
function testBaselines(): void {
  // A tab that loaded nothing, when another tab has saved since: refused.
  clearSave();
  otherTabSaves('There', Date.now());
  assert(trySave(createInitialState('Here')) === 'newer', 'a tab that saw no save does not write over one that appeared');

  // New game erases the save first (useGame.ts's RESET), and founds over it.
  clearSave();
  assert(trySave(createInitialState('Founded')) === 'saved', 'after New game the founding save goes through');

  // An imported file replaces whatever is stored: the player chose it.
  otherTabSaves('There', Date.now() + 60_000);
  assert(adoptSave(createInitialState('Imported')), 'an import writes past the guard');
  assert(storedName() === 'Imported', 'and is the stored game');
  assert(claimHolder() === thisTab(), 'taking the claim, so the tabs on the old game stop');

  // A save this version cannot read is set aside, and the next save may
  // write over it (persistence.ts's loadGame), even when it is stamped later.
  store.set(SAVE_KEY, JSON.stringify({ version: 1, savedAt: Date.now() + 3_600_000, state: createInitialState('Ancient') }));
  assert(loadGame() === null, 'a save from before the chain does not load');
  assert(trySave(createInitialState('Next')) === 'saved', 'and does not bar the next save');
}

// ---- The claim moves between tabs ----
function testClaim(): void {
  clearSave();
  store.delete(CLAIM_KEY);
  const me = thisTab();
  assert(me === thisTab(), 'a tab keeps one id');
  assert(claimSave(), 'a tab with the newest save claims it');
  assert(claimHolder() === me, 'and holds the claim');

  // The other tab continues: its id goes under the key.
  store.set(CLAIM_KEY, 'other-tab');
  assert(claimTaken(CLAIM_KEY, 'other-tab'), 'hearing another tab\'s id, this tab has lost the claim');
  assert(claimHolder() === 'other-tab', 'the claim is the other tab\'s');
  assert(!claimTaken(CLAIM_KEY, me), 'its own id takes nothing');
  assert(!claimTaken(CLAIM_KEY, null), 'nor does a cleared key');
  assert(!claimTaken(SAVE_KEY, 'other-tab'), 'nor a write to another key');

  // Taking it back: with nothing newer stored, the claim returns here.
  assert(claimSave(), 'this tab can claim it back');
  assert(claimHolder() === me, 'and the claim is this tab\'s again');

  // With a newer save stored, the claim is refused until it is loaded.
  saveGame(createInitialState('Here'));
  otherTabSaves('There', storedSavedAt() + 60_000);
  store.set(CLAIM_KEY, 'other-tab');
  assert(!claimSave(), 'a tab holding an older game cannot claim over a newer save');
  assert(claimHolder() === 'other-tab', 'and the claim stays where it was');
  loadGame();
  assert(claimSave() && claimHolder() === me, 'once it has loaded the newer save, it can');
}

// ---- Losing the claim keeps this tab's weeks (Plan 95AA, H7-3) ----
// Side by side: this tab played on without saving, and the other tab
// continued from the save this tab last wrote.
function testSaveBeforeLosing(): void {
  clearSave();
  const mine = createInitialState('Here');
  mine.started = true;
  assert(trySave(mine) === 'saved', 'this tab saves its game');
  const at = storedSavedAt();
  const week = (s: { clock: { year: number; week: number } }) => (s.clock.year - 1) * 52 + s.clock.week;
  assert(!saveBeforeLosing(mine), 'a game no further on than its save is not written again');

  // It plays on six weeks, unsaved; the other tab takes the claim.
  const on = structuredClone(mine);
  on.clock.week += 6;
  store.set(CLAIM_KEY, 'other-tab');
  assert(saveBeforeLosing(on), 'losing the claim, a tab that has played on writes its game');
  const stored = JSON.parse(store.get(SAVE_KEY)!) as { savedAt: number; state: { clock: { year: number; week: number } } };
  assert(week(stored.state) === week(on), 'and the stored save is at its week');
  assert(stored.savedAt >= at, 'stamped at the time of writing');

  // The other tab saved first: the guard stands, nothing is written over it.
  otherTabSaves('There', storedSavedAt() + 60_000);
  on.clock.week += 1;
  assert(!saveBeforeLosing(on), 'a tab does not write over a save made since its own');
  assert(storedName() === 'There', 'and the newer game is still stored');

  // A tab that loaded the save and has not played on writes nothing.
  loadGame();
  assert(!saveBeforeLosing(createInitialState('There')) && storedName() === 'There', 'a tab at the week it loaded writes nothing');
}

// ---- "Open it here" comes back into the game once ----
function testResume(): void {
  session.set('unischool.resume', '1');
  assert(takeResume(), 'a reload asked for by "Open it here" resumes');
  assert(!session.has('unischool.resume'), 'and the request is used up');
  assert(takeResume(), 'read once per page load: a second read agrees');
}

console.log('two tabs on one save');
testGuard();
testBaselines();
testClaim();
testSaveBeforeLosing();
testResume();

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
