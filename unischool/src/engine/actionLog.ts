import type { Action } from '../state/actions';
import type { GameState } from '../state/types';
import { reducer } from './reducer';

// A run as data: the state it started from and every action dispatched on
// it, in order, the weekly TICKs included. The reducer is a pure function
// of (state, action) and the random stream lives in the state, so folding
// the actions over the start reproduces the run exactly. A bug report can
// be this file.
export interface RunLog {
  start: GameState;
  actions: Action[];
}

export function startRunLog(start: GameState): RunLog {
  return { start: structuredClone(start), actions: [] };
}

export function replay(run: RunLog): GameState {
  return run.actions.reduce(reducer, run.start);
}
