// ---------------------------------------------------------------------
// The search (Plan 14's PR H — see systems/faculty/facultySearch.ts). A
// posted search spends money to raise the weekly chance the market lists
// a candidate in a named field, for a fixed window. What is worth pinning:
// the gate and the charge; that a search really does produce a listing
// in a thin field in a measurable fraction of the wait; that it closes;
// and that a save keeps it honest.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { createInitialState } from '../src/state/actions';
import { reducer } from '../src/engine/reducer';
import {
  canPostSearch, searchCost, searchWeeksLeft, SEARCH_LISTING_CHANCE, SEARCH_WEEKS,
} from '../src/systems/faculty/facultySearch';
import { loadGame, saveGame, SAVE_KEY, SAVE_VERSION } from '../src/state/persistence';
import type { GameState } from '../src/state/types';

let seed = 2718;
function seedRandom(n: number): void {
  seed = n;
  Math.random = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
}
seedRandom(2718);
const store = new Map<string, string>();
(globalThis as unknown as { localStorage: unknown }).localStorage = {
  getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
  setItem: (k: string, v: string) => { store.set(k, String(v)); },
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

// Counts TICKS, not loop passes: an interrupt on the way (the first year's
// letters, a milestone) is put down without a week going by, so `weeks` is
// always the number of weeks that actually elapsed.
function advance(s: GameState, weeks: number): GameState {
  let ticked = 0;
  while (ticked < weeks) {
    if (s.pendingInterrupt) { s = reducer(s, { type: 'RESOLVE_REPORT' }); continue; }
    s = reducer(s, { type: 'TICK' });
    ticked += 1;
  }
  return s;
}

const FIELD = 'Clinical Health';

console.log('faculty search tests');

// ---- the gate and the charge ----
{
  let s = createInitialState('Searchers');
  const cost = searchCost(s);
  assert(cost > 0, `a search costs something (${cost.toLocaleString()})`);
  assert(canPostSearch(s, FIELD), 'a founding school can post one');
  assert(!canPostSearch(s, 'Underwater Basket Weaving'), 'not in a field that does not exist');
  const cash = s.finance.cash;
  s = reducer(s, { type: 'POST_SEARCH', field: FIELD });
  assert(cash - s.finance.cash === cost, 'the search is charged once, up front');
  assert(searchWeeksLeft(s, FIELD) === SEARCH_WEEKS, `and runs for ${SEARCH_WEEKS} weeks`);
  assert(!canPostSearch(s, FIELD), 'a second search in the same field cannot be posted while one runs');
  const again = reducer(s, { type: 'POST_SEARCH', field: FIELD });
  assert(again.finance.cash === s.finance.cash, 'and a refused posting charges nothing');
  assert(s.log[0]?.message.includes(FIELD), 'the log says a search is posted');

  const poor = createInitialState('Broke');
  poor.finance.cash = searchCost(poor) - 1;
  assert(!canPostSearch(poor, FIELD), 'a dollar short refuses');
}

// ---- it produces a listing in a thin field, and closes ----
{
  // Weeks until the first Clinical Health listing, with and without a
  // search, across a spread of seeds. A search should get there in a
  // measurable fraction of the natural wait.
  const trials = 12;
  const horizon = SEARCH_WEEKS;
  function weeksToListing(withSearch: boolean, rngSeed: number): number {
    seedRandom(rngSeed);
    let s = createInitialState('Thin');
    s.candidates = s.candidates.filter((c) => c.field !== FIELD);
    if (withSearch) s = reducer(s, { type: 'POST_SEARCH', field: FIELD });
    for (let w = 1; w <= horizon; w += 1) {
      s = advance(s, 1);
      if (s.candidates.some((c) => c.field === FIELD)) return w;
    }
    return horizon + 1;
  }
  let withSum = 0;
  let withoutSum = 0;
  for (let t = 0; t < trials; t += 1) {
    withSum += weeksToListing(true, 1000 + t);
    withoutSum += weeksToListing(false, 1000 + t);
  }
  const withMean = withSum / trials;
  const withoutMean = withoutSum / trials;
  assert(withMean < withoutMean * 0.6, `a search reaches a ${FIELD} listing in a fraction of the wait (${withMean.toFixed(1)} weeks vs ${withoutMean.toFixed(1)} without)`);
  assert(withMean <= 1 / SEARCH_LISTING_CHANCE * 2, `and within a few multiples of its own expected wait (${withMean.toFixed(1)} weeks)`);

  seedRandom(5);
  let s = createInitialState('Closer');
  s = reducer(s, { type: 'POST_SEARCH', field: FIELD });
  s = advance(s, SEARCH_WEEKS - 1);
  assert(searchWeeksLeft(s, FIELD) === 1, 'one week left the week before it closes');
  s = advance(s, 1);
  assert(searchWeeksLeft(s, FIELD) === 0, 'the search closes on time');
  assert(s.log.some((l) => l.message.includes('search has closed')), 'and the log says so');
  assert(canPostSearch(s, FIELD), 'another can be posted once it has closed');
}

// ---- a save keeps it honest ----
{
  const s = createInitialState('Saver');
  const state = JSON.parse(JSON.stringify(s)) as Record<string, unknown>;
  state.searches = { [FIELD]: 9, 'No Such Field': 4, 'Physics': 0, 'History': -3, 'Mathematics': 2.5 };
  store.set(SAVE_KEY, JSON.stringify({ version: SAVE_VERSION, savedAt: Date.now(), state }));
  const loaded = loadGame();
  assert(loaded !== null, 'a save with a bad searches record still loads');
  if (loaded) {
    assert(JSON.stringify(loaded.searches) === JSON.stringify({ [FIELD]: 9 }), `only a positive whole number of weeks in a real field survives (got ${JSON.stringify(loaded.searches)})`);
  }
  assert(saveGame(s), 'a current state saves');
  assert(JSON.stringify(loadGame()?.searches) === '{}', 'and an empty record round-trips');
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
