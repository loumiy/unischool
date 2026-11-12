import { DEV_BUILD } from '../engine/devBuild';
import type { GameState } from './types';

// Figures read off a finished state, worked out once per state.
//
// The screens ask the same questions of a week's state many times over:
// the prestige breakdown for the toolbar's arrow, each pillar's head and
// bar and the History panel; the satisfaction breakdown for each need's
// card and share. Each answer is a scan of the whole college, and a late
// campus spent most of a week's rendering repeating them.
//
// Only a settled state is answered from the cache: one the game's reducer
// has returned (markSettled, engine/useGame.ts), which nothing changes
// again, since React state is never changed in place and the next action
// starts from a clone. A state still being built (the clone mid-action) is
// always worked out afresh, so a system reading a figure partway through a
// week never gets last week's. The tests, the headless players and the
// tools never settle a state, so they may change the ones they hold.
//
// What the cache hands out is shared by every caller that week, so it must
// not be changed. Development builds and the tests freeze it, so a caller
// that sorts or edits it in place fails there rather than corrupting the
// figure for every other caller.

const settled = new WeakSet<GameState>();

export function markSettled(s: GameState): GameState {
  settled.add(s);
  return s;
}

export function isSettled(s: GameState): boolean {
  return settled.has(s);
}

function freeze<R>(value: R): R {
  if (!DEV_BUILD || typeof value !== 'object' || value === null || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const v of Object.values(value)) freeze(v);
  return value;
}

// `fn(s)`, once per settled state.
export function perState<R>(fn: (s: GameState) => R): (s: GameState) => R {
  const cache = new WeakMap<GameState, R>();
  return (s) => {
    if (!settled.has(s)) return fn(s);
    if (cache.has(s)) return cache.get(s)!;
    const out = freeze(fn(s));
    cache.set(s, out);
    return out;
  };
}

// `fn(s, key)`, once per settled state and key (a primitive, or an object
// of that state, such as one of its teams).
export function perStateKeyed<K, R>(fn: (s: GameState, key: K) => R): (s: GameState, key: K) => R {
  const cache = new WeakMap<GameState, Map<K, R>>();
  return (s, key) => {
    if (!settled.has(s)) return fn(s, key);
    let byKey = cache.get(s);
    if (!byKey) { byKey = new Map(); cache.set(s, byKey); }
    if (byKey.has(key)) return byKey.get(key)!;
    const out = freeze(fn(s, key));
    byKey.set(key, out);
    return out;
  };
}
