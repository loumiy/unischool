import { useReducer, useEffect, useRef, useState, useCallback } from 'react';
import type { GameState } from '../state/types';
import { reducer } from './reducer';
import { createPreStartState } from '../state/actions';
import type { Action } from '../state/actions';
import { clearSave, loadGame, saveGame } from '../state/persistence';
import { startRunLog, type RunLog } from './actionLog';
import { advanceWeekProgress, MAX_SAMPLE_MS } from './weekClock';
import { openingHoldsClock } from '../state/opening';

// Milliseconds per week-tick; 0 = paused. `real` makes a 50-year run take a
// few hours of play so a development choice feels like a commitment;
// `double` and `quad` are the same clock faster. There is deliberately no
// skip-to-next-event: waiting to afford something is part of the genre.
// `fast` is sandbox-only (hidden outside the playtest flag, see
// StatusHeader.tsx and playtest.ts). Speed only changes how often TICK fires;
// the sim is identical at every setting.
export const SPEEDS = { paused: 0, real: 5000, double: 2500, quad: 1250, fast: 150 } as const;
export type Speed = keyof typeof SPEEDS;
export const SANDBOX_SPEEDS: readonly Speed[] = ['fast'];

// Resumes a valid save, otherwise the pre-start placeholder that shows the
// startup screen. persistence.ts collapses every bad-save case to null, so a
// bad save can never stop the game booting. Read-only, so safe under
// StrictMode's double-invocation of the lazy initializer.
function initialGameState(): GameState {
  return loadGame() ?? createPreStartState();
}

// Sampling granularity of the week accumulator (1% of the fastest week).
// One steady sampler for all speeds, so pauses and speed changes never
// discard the part-week in flight (see weekClock.ts).
const SAMPLE_MS = 50;

export function useGame() {
  const [state, rawDispatch] = useReducer(reducer, undefined, initialGameState);
  const [speed, setSpeed] = useState<Speed>('paused');
  const stateRef = useRef(state);
  stateRef.current = state;

  // Every action dispatched this session, from the state the session opened
  // on (see actionLog.ts). The debug panel exports it.
  const runLog = useRef<RunLog | null>(null);
  if (runLog.current === null) runLog.current = startRunLog(state);
  const dispatch = useCallback((a: Action) => {
    runLog.current!.actions.push(a);
    rawDispatch(a);
  }, []);

// The clock is held by a pending interrupt and by the opening walkthrough
// (state/opening.ts): the player has something to answer first.
  const interrupted = state.pendingInterrupt !== null;
  const held = interrupted || openingHoldsClock(state);

  // Progress through the week, 0..1. A ref, not state: only DayTicker.tsx
  // reads it, polling through the getter below, so the app does not
  // re-render twenty times a second for a cosmetic square.
  const weekProgressRef = useRef(0);

  // The sampler's current rate, read through a ref so the sampler is never
  // rebuilt. 0 when paused, not started or held.
  const msPerWeekRef = useRef(0);
  msPerWeekRef.current = state.started && !held ? SPEEDS[speed] : 0;

  // One sampler, mounted once: rebuilding it would discard the part-week in
  // flight.
  useEffect(() => {
    let last = performance.now();
    const id = setInterval(() => {
      const now = performance.now();
      // Sampled and capped even while paused, so an un-pause cannot hand the
      // accumulator the whole pause.
      const delta = Math.min(now - last, MAX_SAMPLE_MS);
      last = now;
      const { progress, ticks } = advanceWeekProgress(weekProgressRef.current, delta, msPerWeekRef.current);
      weekProgressRef.current = progress;
      for (let i = 0; i < ticks; i++) dispatch({ type: 'TICK' });
    }, SAMPLE_MS);
    return () => clearInterval(id);
  }, []);

  // Resolving an interrupt advances the clock itself (reducer.ts's
  // advanceClock), so reset the accumulator or the new week opens part-done.
  useEffect(() => {
    if (!held) weekProgressRef.current = 0;
  }, [held]);

  // An interrupt halts ticking but leaves the selected speed alone; drop
  // `fast` back to `real` so play does not resume at sandbox speed.
  useEffect(() => {
    if (interrupted && speed === 'fast') setSpeed('real');
  }, [interrupted]);

  // Save at founding, since the autosave is a year away. Only on the
  // false -> true transition, so loading a started save does not rewrite it.
  const wasStarted = useRef(state.started);
  useEffect(() => {
    if (state.started && !wasStarted.current) saveGame(stateRef.current);
    wasStarted.current = state.started;
  }, [state.started]);

  // Saving happens here, never in the reducer, so the reducer stays pure and
  // replayable. Writes the committed state; a refused write is logged.
  const pendingSave = useRef<'manual' | 'autosave' | null>(null);
  useEffect(() => {
    const kind = pendingSave.current;
    if (!kind) return;
    pendingSave.current = null;
    if (!saveGame(state)) dispatch({ type: 'SAVE_FAILED', manual: kind === 'manual' });
  }, [state]);

  const act = useCallback((a: Action) => {
    if (a.type === 'SAVE_GAME') pendingSave.current = 'manual';
    if (a.type === 'RESOLVE_ADMISSIONS') pendingSave.current = 'autosave';
    // Abandoning the run deletes the save too.
    if (a.type === 'RESET') clearSave();
    dispatch(a);
  }, []);

  // The session's run as JSON, for a bug report (see actionLog.ts).
  const exportRun = useCallback(() => JSON.stringify(runLog.current), []);

  // A stable getter, so reading progress costs callers no re-renders.
  const weekProgress = useCallback(() => weekProgressRef.current, []);

  return { state, act, speed, setSpeed, weekProgress, exportRun };
}
