// ---------------------------------------------------------------------
// The harness's game (Plan 57): one headless college and the loop a player
// drives it through. Everything the rebuilt harness plays — the fuzz layer
// (test/fuzz.test.ts), the guided player and the archetypes (Plans 58–59) —
// plays through here, so a rule about how a week goes lives in one place.
//
// A week: every interrupt is answered (the player's answer, else the
// game's own default), then the player acts, then the clock ticks. An
// interrupt still standing after MAX_ANSWERS answers is a stuck interrupt,
// and that is an error, not a stall.
//
// Two dispatch modes. `inPlace` (the default) sends every action through
// reduceInPlace, which skips the reducer's clone: a quarter of a long run.
// A fuzz run sends them through the reducer the game uses, clone and all,
// so it also proves a refused action changes nothing.
//
// Not part of the game: nothing in src/ imports this.
// ---------------------------------------------------------------------

import type { Action } from '../../src/state/actions';
import { createPreStartState } from '../../src/state/actions';
import type { GameState } from '../../src/state/types';
import { reduceInPlace, reducer } from '../../src/engine/reducer';
import { defaultAnswer } from '../../src/engine/defaultAnswers';
import { bindScriptStream } from '../../src/engine/random';
import { FOUNDING_VERNACULAR } from '../../src/data/foundingData';
import { FOUNDING_COLORS, schoolColorsOf } from '../../src/data/schoolColors';
import { makeRivalRng } from '../../src/data/rivalData';

// The game saves to localStorage; a headless run keeps it in memory.
export const fakeStorage = new Map<string, string>();
(globalThis as unknown as { localStorage: unknown }).localStorage = {
  getItem: (k: string) => fakeStorage.get(k) ?? null,
  setItem: (k: string, v: string) => { fakeStorage.set(k, String(v)); },
  removeItem: (k: string) => { fakeStorage.delete(k); },
};

export const DEFAULT_SEED = 12345;
export const DEFAULT_NAME = 'Test University';
const MAX_ANSWERS = 64;

export interface Game {
  s: GameState;
  act(a: Action): void;
  // The player's own dice, never the game's stream: a player that draws
  // must not move what the college draws.
  roll: () => number;
  // Actions sent, answers included, for a report.
  actions: number;
}

export interface Player {
  name: string;
  // Called once a week with no interrupt standing.
  act(g: Game): void;
  // An interrupt's answer; null or absent takes the game's default.
  answer?(g: Game): Action | null;
}

export interface FoundOptions {
  seed?: number;
  name?: string;
  // true sends actions through the cloning reducer (see the header).
  clone?: boolean;
  // Play on from this state (copied) instead of founding: a checkpoint
  // another player reached.
  from?: GameState;
}

export function foundGame(opts: FoundOptions = {}): Game {
  const seed = opts.seed ?? DEFAULT_SEED;
  bindScriptStream(seed);
  fakeStorage.clear();
  const send = opts.clone ? reducer : reduceInPlace;
  const g: Game = {
    s: opts.from ? structuredClone(opts.from) : send(createPreStartState(), {
      type: 'START_GAME', name: opts.name ?? DEFAULT_NAME, vernacular: FOUNDING_VERNACULAR,
      colors: schoolColorsOf(FOUNDING_COLORS), seed,
    }),
    act(a) { g.actions += 1; g.s = send(g.s, a); },
    roll: makeRivalRng((seed ^ 0x9e3779b9) >>> 0),
    actions: 0,
  };
  return g;
}

export class StuckInterrupt extends Error {}

// Answers everything standing, the player first and the game's default
// after. Returns how many answers it took.
export function answerAll(g: Game, player?: Player): number {
  let answers = 0;
  while (g.s.pendingInterrupt) {
    if (answers >= MAX_ANSWERS) {
      throw new StuckInterrupt(`a ${g.s.pendingInterrupt.type} interrupt is still standing after ${MAX_ANSWERS} answers in year ${g.s.clock.year}, week ${g.s.clock.week}`);
    }
    const answer = player?.answer?.(g) ?? defaultAnswer(g.s);
    if (!answer) throw new StuckInterrupt(`nothing answers a ${g.s.pendingInterrupt.type} interrupt`);
    g.act(answer);
    answers += 1;
  }
  return answers;
}

// One week: answer, act, tick. The clock may not move if the tick raised an
// interrupt (the week is held until it is answered), so a caller counting
// weeks reads the clock.
export function playWeek(g: Game, player: Player): void {
  answerAll(g, player);
  player.act(g);
  answerAll(g, player);
  g.act({ type: 'TICK' });
}

// Plays until the clock reaches the start of `years + 1`, calling `each`
// after every week.
export function playYears(g: Game, player: Player, years: number, each?: (g: Game) => void): void {
  const endYear = g.s.clock.year + years;
  // A bound on ticks, so a clock that never moves cannot hang a suite.
  const limit = years * 52 * 4 + 100;
  for (let i = 0; i < limit && g.s.clock.year < endYear; i += 1) {
    playWeek(g, player);
    each?.(g);
  }
  if (g.s.clock.year < endYear) throw new Error(`the clock stalled in year ${g.s.clock.year}, week ${g.s.clock.week}`);
}

// Plays until `stop` holds at the top of a week (before anything is
// answered, so a modal it waits for is still standing), or the clock
// reaches the start of `years + 1`. True if it stopped on `stop`.
export function playUntil(g: Game, player: Player, years: number, stop: (s: GameState) => boolean): boolean {
  const endYear = g.s.clock.year + years;
  const limit = years * 52 * 4 + 100;
  for (let i = 0; i < limit && g.s.clock.year < endYear; i += 1) {
    if (stop(g.s)) return true;
    playWeek(g, player);
  }
  return stop(g.s);
}
