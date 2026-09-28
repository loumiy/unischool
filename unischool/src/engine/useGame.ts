import { speedLock } from '../systems/delegation/seats';
import { useReducer, useEffect, useRef, useState, useCallback } from 'react';
import type { GameState } from '../state/types';
import { WEEKS_PER_YEAR } from '../state/types';
import { reducer } from './reducer';
import { createPreStartState } from '../state/actions';
import type { Action } from '../state/actions';
import { claimSave, claimTaken, clearSave, loadGame, requestResume, saveIsNewer, takeResume, trySave } from '../state/persistence';
import { startRunLog, type RunLog } from './actionLog';
import { advanceWeekProgress, MAX_SAMPLE_MS } from './weekClock';
import { openingHoldsClock } from '../state/opening';
import { registerCrashSource } from './crashContext';
import { getSettings } from '../settings';

// Milliseconds per week-tick; 0 = paused. `real` makes a 50-year run take a
// few hours of play so a development choice feels like a commitment;
// `double` and `quad` are the same clock faster. There is deliberately no
// skip-to-next-event: waiting to afford something is part of the genre.
// `fast` is sandbox-only (hidden outside the playtest flag, see
// StatusHeader.tsx and playtest.ts). Speed only changes how often TICK fires;
// the sim is identical at every setting.
// 4× and 8× are earned by the administration's seats (systems/delegation/
// seats.ts's speedLock); `fast` is the playtest sandbox's.
export const SPEEDS = { paused: 0, real: 5000, double: 2500, quad: 1250, octo: 625, fast: 150 } as const;
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
  const [speed, setSpeedRaw] = useState<Speed>('paused');
  const stateRef = useRef(state);
  stateRef.current = state;

  // Two tabs on one save (Plan 79B, persistence.ts). `claimed`: this tab
  // has taken up the college and still holds it, so it saves. `elsewhere`:
  // it held it and lost it to another tab (or met a newer save), so it
  // stops: paused, saving nothing, and App.tsx shows the banner.
  const claimed = useRef(false);
  const [elsewhere, setElsewhere] = useState(false);
  const elsewhereRef = useRef(false);
  elsewhereRef.current = elsewhere;
  const lose = useCallback(() => {
    claimed.current = false;
    setElsewhere(true);
    setSpeedRaw('paused');
  }, []);
  const claim = useCallback((): boolean => {
    if (!claimSave()) { lose(); return false; }
    claimed.current = true;
    setElsewhere(false);
    return true;
  }, [lose]);
  // A tab that has lost the claim does not run.
  const setSpeed = useCallback((next: Speed) => {
    if (next === 'paused' || !elsewhereRef.current) setSpeedRaw(next);
  }, []);
  useEffect(() => {
    const onStorage = (e: StorageEvent) => { if (claimed.current && claimTaken(e.key, e.newValue)) lose(); };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [lose]);
  // "Open it here" came back through a reload (openHere, below): straight
  // into the game, claimed, with no title screen between.
  const [resumed] = useState(() => takeResume() && state.started);
  useEffect(() => {
    if (resumed) claim();
  }, []);

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
  msPerWeekRef.current = state.started && !held && !elsewhere ? SPEEDS[speed] : 0;

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

  // An event waiting on the player eases the clock back to normal speed
  // (Plan 35: at four times an event's weeks ran out in seconds, unseen).
  // Only on a new arrival, so the player can speed up again with it open.
  // With Settings' "Pause when a matter arrives" on, App.tsx pauses instead
  // (Plan 78E, systems/inbox/unseen.ts), except under a hold, where the ease
  // still acts for the clock that resumes after it.
  const waiting = state.catalogue?.pending.length ?? 0;
  const lastWaiting = useRef(waiting);
  useEffect(() => {
    const pausing = getSettings().pauseOnArrival && !held;
    if (waiting > lastWaiting.current && !pausing && speed !== 'paused' && speed !== 'real') setSpeed('real');
    lastWaiting.current = waiting;
  }, [waiting]);

  // A speed the seats have not earned (a new game, another save) falls back
  // to double (systems/delegation/seats.ts's speedLock).
  const speedLocked = speedLock(state, speed) !== null;
  useEffect(() => {
    if (speedLocked) setSpeed('double');
  }, [speedLocked]);

  // Every save goes through the claim: a tab that does not hold it writes
  // nothing, and one that meets a newer save stops (the guard). Returns
  // false only when the browser refused the write.
  const save = useCallback((s: GameState): boolean => {
    if (!claimed.current) return true;
    const outcome = trySave(s);
    if (outcome === 'newer') lose();
    return outcome !== 'failed';
  }, [lose]);

  // Save at founding, since the autosave is a year away, which is also when
  // a tab takes up a new college. Only on the false -> true transition, so
  // loading a started save does not rewrite it.
  const wasStarted = useRef(state.started);
  useEffect(() => {
    if (state.started && !wasStarted.current && claim()) save(stateRef.current);
    wasStarted.current = state.started;
  }, [state.started]);

  // Also at the turn of each term, and whenever the page is hidden or
  // closed (Plan 35: a closed tab lost up to a year).
  const termTurned = state.started && state.clock.week === WEEKS_PER_YEAR / 2 + 1;
  useEffect(() => {
    if (termTurned) save(stateRef.current);
  }, [termTurned]);
  useEffect(() => {
    const flush = () => { if (stateRef.current.started) save(stateRef.current); };
    const onHidden = () => { if (document.visibilityState === 'hidden') flush(); };
    document.addEventListener('visibilitychange', onHidden);
    window.addEventListener('pagehide', flush);
    return () => {
      document.removeEventListener('visibilitychange', onHidden);
      window.removeEventListener('pagehide', flush);
    };
  }, []);

  // Saving happens here, never in the reducer, so the reducer stays pure and
  // replayable. Writes the committed state; a refused write is logged.
  const pendingSave = useRef<'manual' | 'autosave' | null>(null);
  useEffect(() => {
    const kind = pendingSave.current;
    if (!kind) return;
    pendingSave.current = null;
    if (!save(state)) dispatch({ type: 'SAVE_FAILED', manual: kind === 'manual' });
  }, [state]);

  // Continue on the title screen takes up the college here. When another tab
  // has saved since this one loaded, that newer game is the one to continue,
  // so the page reloads into it (openHere); false then, and the title stays.
  const continueHere = useCallback((): boolean => {
    if (saveIsNewer()) { openHere(); return false; }
    return claim();
  }, [claim]);

  const act = useCallback((a: Action) => {
    // A manual save in a tab that has lost the claim, or would meet the
    // guard, is not taken: its "Game saved." would be untrue. The banner
    // says why.
    if (a.type === 'SAVE_GAME' && (!claimed.current || saveIsNewer())) {
      if (claimed.current) lose();
      return;
    }
    if (a.type === 'SAVE_GAME') pendingSave.current = 'manual';
    if (a.type === 'RESOLVE_ADMISSIONS') pendingSave.current = 'autosave';
    // Abandoning the run deletes the save too.
    if (a.type === 'RESET') clearSave();
    dispatch(a);
  }, []);

  // The session's run as JSON, for a bug report (see actionLog.ts).
  const exportRun = useCallback(() => JSON.stringify(runLog.current), []);
  // The crash screen's copy of both (crashContext.ts), should the game fall
  // over.
  registerCrashSource({ state: () => stateRef.current, runLog: exportRun });

  // A stable getter, so reading progress costs callers no re-renders.
  const weekProgress = useCallback(() => weekProgressRef.current, []);

  return { state, act, speed, setSpeed, weekProgress, exportRun, elsewhere, resumed, continueHere, openHere };
}

// The banner's "Open it here" (and a stale Continue): reload, reading the
// saved game, and come back into it claimed.
function openHere(): void {
  requestResume();
  window.location.reload();
}
