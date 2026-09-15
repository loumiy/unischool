import { useReducer, useEffect, useRef, useState, useCallback } from 'react';
import type { GameState } from '../state/types';
import { reducer } from './reducer';
import { createPreStartState } from '../state/actions';
import type { Action } from '../state/actions';
import { loadGame, saveGame } from '../state/persistence';
import { advanceWeekProgress, MAX_SAMPLE_MS } from './weekClock';

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

// How often the week accumulator samples the real clock. Nothing about the
// game is tied to this number — it is only the granularity a week boundary
// can land on, and 50ms is 1% of the fastest week a player is offered, so a
// tick is never visibly late. Deliberately NOT one interval per speed: the
// whole point of the accumulator (see weekClock.ts) is that one steady
// sampler outlives every pause, resume and speed change.
const SAMPLE_MS = 50;

export function useGame() {
  const [state, dispatch] = useReducer(reducer, undefined, initialGameState);
  const [speed, setSpeed] = useState<Speed>('paused');
  const stateRef = useRef(state);
  stateRef.current = state;

  const interrupted = state.pendingInterrupt !== null;

  // How far through the current week we are, 0..1 — a ref rather than
  // state on purpose: the day squares beside the clock (DayTicker.tsx) are
  // the only thing that reads it, and re-rendering the whole app twenty
  // times a second to move a cosmetic square would be a real cost for a
  // purely decorative one. DayTicker polls this at its own lazy cadence
  // instead, through the getter returned below.
  const weekProgressRef = useRef(0);

  // The ms-per-week the sampler should be running at, recomputed every
  // render and read through a ref so the sampler itself never has to be
  // rebuilt. 0 means the clock is not running — paused, not yet started,
  // or halted because an interrupt is pending (that last one is the same
  // gate the old interval used, kept exactly as it was).
  const msPerWeekRef = useRef(0);
  msPerWeekRef.current = state.started && !interrupted ? SPEEDS[speed] : 0;

  // ONE sampler, mounted once and never torn down, because tearing it down
  // is precisely the bug: every rebuild used to discard the part-week in
  // flight. It reads the rate from the ref above, so a speed change takes
  // effect on the very next sample without touching the accumulator, and a
  // pause simply stops the accumulator growing.
  useEffect(() => {
    let last = performance.now();
    const id = setInterval(() => {
      const now = performance.now();
      // Sampled (and capped) even while paused, so an un-pause can never
      // hand the accumulator the whole length of the pause.
      const delta = Math.min(now - last, MAX_SAMPLE_MS);
      last = now;
      const { progress, ticks } = advanceWeekProgress(weekProgressRef.current, delta, msPerWeekRef.current);
      weekProgressRef.current = progress;
      for (let i = 0; i < ticks; i++) dispatch({ type: 'TICK' });
    }, SAMPLE_MS);
    return () => clearInterval(id);
  }, []);

  // Resolving an interrupt turns the calendar page itself (every resolve
  // action calls advanceClock — see reducer.ts), so the week in flight when
  // the modal opened is over whether or not its accumulator had run out.
  // This is the one place the clock advances without the accumulator
  // crossing a boundary, so it is the one place the accumulator has to be
  // told; otherwise the new year would open on day 4 and be a short week.
  useEffect(() => {
    if (!interrupted) weekProgressRef.current = 0;
  }, [interrupted]);

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

  // A getter, not a value: reading through it is always current, and
  // handing it out costs its caller no re-renders (see weekProgressRef
  // above). Stable across renders so an effect can depend on it.
  const weekProgress = useCallback(() => weekProgressRef.current, []);

  return { state, act, speed, setSpeed, weekProgress };
}
