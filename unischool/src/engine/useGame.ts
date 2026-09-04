import { useReducer, useEffect, useRef, useState, useCallback } from 'react';
import type { GameState } from '../state/types';
import { reducer } from './reducer';
import { createPreStartState } from '../state/actions';
import type { Action } from '../state/actions';
import { loadGame, saveGame } from '../state/persistence';

// Speed presets in milliseconds per week-tick. 0 = paused.
// `real` is the baseline play speed: slow enough that a 50-year
// playthrough (2,600 weeks) takes several hours of active, unpaused play
// (~3.6h at 5000ms/week) rather than under an hour — a development choice
// should feel like a real commitment, not a blip you tick past. `double`
// is that same clock at 2x: a real gameplay speed for the long stretches
// between decisions (a 50-year run in ~1.8h), offered to every player
// alongside `real` rather than hidden. `fast` is a sandbox-only speed for
// playtesting, not meant for normal play (and is hidden from the controls
// entirely outside a university named "test" — see StatusHeader.tsx).
//
// Speed is purely how often the week-tick fires: nothing downstream reads
// it, and the reducer advances exactly one week per TICK at every setting,
// so a faster speed runs the identical sim, just sooner. That is what
// keeps 2x a presentation choice rather than a second timing path.
export const SPEEDS = { paused: 0, real: 5000, double: 2500, fast: 150 } as const;
export type Speed = keyof typeof SPEEDS;
export const SANDBOX_SPEEDS: readonly Speed[] = ['fast'];

// Resumes the saved run if there is a valid one, otherwise hands back the
// pre-start placeholder so App.tsx shows the startup screen (see
// state/persistence.ts). Everything that can go wrong with a save — absent,
// unreadable, unparseable, written by a different SAVE_VERSION, not
// shaped like a GameState — is already collapsed into `null` there, so
// the only outcomes here are "continue that run" or "found a new
// university". A bad save can never stop the game booting.
//
// Runs as useReducer's lazy initializer, so it happens once on mount and
// costs nothing on later renders. It is read-only, which is what makes it
// safe under StrictMode's double-invocation.
function initialGameState(): GameState {
  return loadGame() ?? createPreStartState();
}

export function useGame() {
  const [state, dispatch] = useReducer(reducer, undefined, initialGameState);
  const [speed, setSpeed] = useState<Speed>('paused');
  const stateRef = useRef(state);
  stateRef.current = state;

  const interrupted = state.pendingInterrupt !== null;

  useEffect(() => {
    const ms = SPEEDS[speed];
    if (ms === 0 || !state.started || state.gameOver || interrupted) return; // also halted while an interrupt is pending
    const id = setInterval(() => dispatch({ type: 'TICK' }), ms);
    return () => clearInterval(id);
  }, [speed, state.started, state.gameOver, interrupted]);

  // The clock already halts the instant an interrupt is pending (above),
  // but that only stops ticking — it leaves `fast` as the SELECTED speed,
  // so dismissing the modal would resume play at sandbox fast-forward
  // right as whatever demanded attention just got resolved. This drops the
  // selection itself back to `real` the moment an interrupt fires while
  // fast is selected, so play resumes at normal speed after dismissal
  // unless the player deliberately picks fast again. Reads `speed` from
  // this render's closure rather than a ref: the effect body is rebuilt
  // every render, so it always sees the speed current as of the render
  // where `interrupted` flipped, with no risk of acting on a stale value.
  useEffect(() => {
    if (interrupted && speed === 'fast') setSpeed('real');
  }, [interrupted]);

  // The founding save. The autosave proper lives in the reducer, at the
  // annual admissions boundary — but that is a whole in-game year away from
  // a brand-new university, and a player who refreshes in week 30 of year 1
  // should still have their school. Founding is the moment there is first a
  // run to lose, so it gets written too.
  //
  // It happens HERE rather than in the reducer's START_GAME because
  // createInitialState rolls dice: under StrictMode the reducer runs twice
  // and builds two different universities, so only the committed state —
  // which is what an effect sees — is safe to persist. Fires on the
  // false -> true transition only, so resuming a loaded save (already
  // `started` on mount) doesn't immediately rewrite it.
  const wasStarted = useRef(state.started);
  useEffect(() => {
    if (state.started && !wasStarted.current) saveGame(stateRef.current);
    wasStarted.current = state.started;
  }, [state.started]);

  const act = useCallback((a: Action) => dispatch(a), []);

  return { state, act, speed, setSpeed };
}
