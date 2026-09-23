// The game's one random stream. Its position lives in the state
// (GameState.rng), so a run is exactly repeatable from its seed and the
// actions played on it.
//
// The reducer binds the state it is reducing for the length of one action
// (withRandom), and every draw in the game reads and advances that state's
// stream. A draw with nothing bound throws: randomness outside the reducer
// is a bug, and this finds it at the first test that reaches it.

export interface RandomStream {
  rng: number;
}

let bound: RandomStream | null = null;
let override: (() => number) | null = null;
let draws = 0;

export function withRandom<T>(stream: RandomStream, fn: () => T): T {
  const outer = bound;
  bound = stream;
  try {
    return fn();
  } finally {
    bound = outer;
  }
}

// A uniform draw in [0, 1). mulberry32: one 32-bit integer of state.
export function random(): number {
  draws += 1;
  if (override) return override();
  if (!bound) throw new Error('random() called with no game state bound; draw inside the reducer or withRandom');
  bound.rng = (bound.rng + 0x6d2b79f5) | 0;
  let t = bound.rng;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

// An id for something the game creates (a person, a club, a demand):
// twelve base-36 characters drawn from the stream, so ids repeat with the run.
export function newId(): string {
  let id = '';
  for (let i = 0; i < 12; i += 1) id += Math.floor(random() * 36).toString(36);
  return id;
}

// The seed a new game starts from when none is given: fixed, so every
// headless run and test is repeatable. The startup screen passes a fresh one.
export const DEFAULT_SEED = 20_260_923;

// A seed for a new game started by a person. The one place the game reads
// the clock for randomness, and it happens outside the reducer.
export function freshSeed(): number {
  return (Date.now() ^ (performance.now() * 1000)) | 0;
}

// ---- For scripts: the test suites and the balance harness ----

// Binds a stream for the rest of the process, for game code a script calls
// directly rather than through the reducer. Inside an action, the reducer's
// own binding takes over for the length of that action.
export function bindScriptStream(seed: number): RandomStream {
  bound = { rng: seed | 0 };
  return bound;
}

// Replaces every draw, inside the reducer too, until cleared with null. A
// test pins an outcome with () => 0, or proves there is no draw with a
// source that throws.
export function overrideDraws(source: (() => number) | null): void {
  override = source;
}

// How many draws the process has made. A test reads the difference across
// a call to count what it drew.
export function drawsSoFar(): number {
  return draws;
}
