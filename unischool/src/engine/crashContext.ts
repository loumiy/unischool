import type { GameState } from '../state/types';

// What the crash screen can still offer after the game has fallen over
// (Plan 70C): the run as it stood a moment ago, and the session's run log.
// useGame.ts registers the getters; CrashScreen.tsx sits outside the game's
// tree, so it reads them here rather than through props. Either may be gone
// if the game never started.
export interface CrashSource {
  state: () => GameState;
  runLog: () => string;
}

let source: CrashSource | null = null;

export function registerCrashSource(next: CrashSource): void {
  source = next;
}

export function crashSource(): CrashSource | null {
  return source;
}
