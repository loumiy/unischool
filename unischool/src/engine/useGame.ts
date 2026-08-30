import { useReducer, useEffect, useRef, useState, useCallback } from 'react';
import { reducer } from './reducer';
import { createPreStartState } from '../state/actions';
import type { Action } from '../state/actions';

// Speed presets in milliseconds per week-tick. 0 = paused.
// `real` is the intended play speed: slow enough that a 50-year
// playthrough (2,600 weeks) takes several hours of active, unpaused play
// (~3.6h at 5000ms/week) rather than under an hour — a development choice
// should feel like a real commitment, not a blip you tick past. `fast` is a
// sandbox-only speed for playtesting, not meant for normal play (and is
// hidden from the controls entirely outside a university named "test" —
// see StatusHeader.tsx).
export const SPEEDS = { paused: 0, real: 5000, fast: 150 } as const;
export type Speed = keyof typeof SPEEDS;
export const SANDBOX_SPEEDS: readonly Speed[] = ['fast'];

export function useGame() {
  const [state, dispatch] = useReducer(reducer, undefined, createPreStartState);
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

  const act = useCallback((a: Action) => dispatch(a), []);

  return { state, act, speed, setSpeed };
}
