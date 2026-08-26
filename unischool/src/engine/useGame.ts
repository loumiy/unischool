import { useReducer, useEffect, useRef, useState, useCallback } from 'react';
import { reducer } from './reducer';
import { createInitialState } from '../state/actions';
import type { Action } from '../state/actions';

// Speed presets in milliseconds per week-tick. 0 = paused.
// `real` is the intended play speed: a 16-week year takes ~26s (16 * 1600ms).
// `fast` is a sandbox-only speed for playtesting, not meant for normal play.
export const SPEEDS = { paused: 0, real: 1600, fast: 150 } as const;
export type Speed = keyof typeof SPEEDS;
export const SANDBOX_SPEEDS: readonly Speed[] = ['fast'];

export function useGame() {
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState);
  const [speed, setSpeed] = useState<Speed>('paused');
  const stateRef = useRef(state);
  stateRef.current = state;

  const interrupted = state.pendingInterrupt !== null;

  useEffect(() => {
    const ms = SPEEDS[speed];
    if (ms === 0 || state.gameOver || interrupted) return; // also halted while an interrupt is pending
    const id = setInterval(() => dispatch({ type: 'TICK' }), ms);
    return () => clearInterval(id);
  }, [speed, state.gameOver, interrupted]);

  const act = useCallback((a: Action) => dispatch(a), []);

  return { state, act, speed, setSpeed };
}
