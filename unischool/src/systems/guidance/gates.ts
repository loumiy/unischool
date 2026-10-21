import type { GameState } from '../../state/types';

// THE CHAPTERS' GATES (Plan 106 §4, PR E). A guided run holds a system back
// until the chapter that explains it has opened: the inbox's matters and
// the students' demands until "Campus life", the board's promises until
// "Promises", the Athletics tab until "The teams" (PR F, TabNav.tsx's
// tabAvailable). A pure reading of the record state/chapters.ts keeps, so the
// systems can ask without importing the chapters themselves.
//
// No gate holds a run that isn't guided: a headless founding (the sims),
// a save from before the chapters, a sandbox. Nor one whose player set the
// Objectives setting to Off, which the shell marks in the record (App.tsx):
// Off is the game as it was before the chapters.
export const OBJECTIVES_OFF_MARK = 'objectives-off';
// The chapter each system waits for (state/chapters.ts's ids).
export const MATTERS_CHAPTER = 'campus-life';
export const PROMISES_CHAPTER = 'promises';
export const ATHLETICS_CHAPTER = 'the-teams';

// A run the chapters guide.
export function guidedRun(s: GameState): boolean {
  const g = s.guidance;
  return !!g?.gated && !g.marked.includes(OBJECTIVES_OFF_MARK);
}

export function chapterGateOpen(s: GameState, chapterId: string): boolean {
  return !guidedRun(s) || s.guidance!.opened[chapterId] !== undefined;
}
