import { useReducer, useEffect, useRef, useState, useCallback } from 'react';
import { reducer } from './reducer';
import { createInitialState } from '../state/actions';
import type { Action } from '../state/actions';

// Speed presets in milliseconds per week-tick. 0 = paused.
export const SPEEDS = { paused: 0, slow: 1200, normal: 500, fast: 150 } as const;
export type Speed = keyof typeof SPEEDS;

export function useGame() {
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState);
  const [speed, setSpeed] = useState<Speed>('paused');
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    const ms = SPEEDS[speed];
    if (ms === 0 || state.gameOver) return;
    const id = setInterval(() => dispatch({ type: 'TICK' }), ms);
    return () => clearInterval(id);
  }, [speed, state.gameOver]);

  const act = useCallback((a: Action) => dispatch(a), []);

  return { state, act, speed, setSpeed };
}
