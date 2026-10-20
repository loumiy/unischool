import type { GameState, GuidanceState } from './types';
import { totalEnrolled, WEEKS_PER_YEAR } from './types';
import { CHAPTER_COPY, type ChapterId } from '../data/chapterData';
import { housedPrograms, isDiningHall, isDorm, sitedAny } from '../data/openingData';
import { instructionCapacity } from '../systems/techtree/instructionCapacity';
import { foundersHallUnsited, laterCourseStarted } from './opening';

// THE OBJECTIVES (Plan 106). The first five years are taught as chapters,
// one season's lesson each, in the manner of Transport Fever's missions:
// each chapter sets a few objectives, and each objective is a goal, not an
// instruction. An objective is met the moment its reading holds, in any
// order and by any route, and it stays met however the college changes
// after. A chapter is done when every objective it requires is met, and the
// next opens once that is so and its earliest week has come. No date ever
// forces a chapter open (Plan 106 §7.3): a slow player meets each system
// when they finish the chapter before it. Finishing earns nothing but what
// the next chapter opens (§7.2).
//
// The words are data/chapterData.ts's. The NEXT bar's drawer shows them
// (Plan 106 PR B); the walkthrough's steps become chapters 1-3 in PR C.
// Until then the chapters keep their own record and change nothing else.
//
// Settled after every action that changed the state and every tick (the
// reducer's settled()). This lives in state/ because it reads the map
// (sitedAny, foundersHallUnsited), which systems/ may not.

// An objective's reading: met or not, or a count toward a figure. A count
// is met when it reaches the figure.
export type ObjectiveProgress = boolean | { n: number; of: number };

export interface Objective {
  id: string;
  progress: (s: GameState) => ObjectiveProgress;
  // Shown and counted, but the chapter can be done without it: a habit
  // worth teaching that the college's state cannot always tell.
  optional?: boolean;
}

export interface Chapter {
  id: ChapterId;
  // The first week (absolute) the chapter may open.
  earliest: number;
  objectives: readonly Objective[];
}

const week = (year: number, w: number) => (year - 1) * WEEKS_PER_YEAR + w;
export const absoluteWeek = (s: GameState) => week(s.clock.year, s.clock.week);

// A mark the player made outside the college's state (MARK_GUIDANCE).
export const marked = (s: GameState, mark: string) => s.guidance?.marked.includes(mark) ?? false;
export const DOUBLE_SPEED_MARK = 'speed-2x';

export const CHAPTERS: readonly Chapter[] = [
  {
    id: 'founding',
    earliest: week(1, 1),
    objectives: [
      { id: 'site-founders-hall', progress: (s) => !foundersHallUnsited(s) },
      { id: 'appoint-first-professor', progress: (s) => s.faculty.length > 0 },
      { id: 'found-first-program', progress: (s) => housedPrograms(s).length > 0 },
    ],
  },
  {
    id: 'seats',
    earliest: week(1, 1),
    objectives: [
      { id: 'develop-second-course', progress: laterCourseStarted },
      {
        id: 'seat-every-student',
        progress: (s) => {
          const of = totalEnrolled(s.students);
          return { n: Math.min(instructionCapacity(s), of), of };
        },
      },
      { id: 'run-at-double', progress: (s) => marked(s, DOUBLE_SPEED_MARK), optional: true },
    ],
  },
  {
    // The Spring of year one (Plan 106 §4): by then the seats are in hand
    // and the money can be seen. Needs stay hidden until commencement
    // (Plan 104M, §7.1); the chapter asks for the buildings, not a figure.
    id: 'somewhere-to-sleep',
    earliest: week(1, 27),
    objectives: [
      { id: 'site-residence-hall', progress: (s) => sitedAny(s, isDorm) },
      { id: 'site-dining-hall', progress: (s) => sitedAny(s, isDiningHall) },
    ],
  },
];

export function chapterById(id: string): Chapter | undefined {
  return CHAPTERS.find((c) => c.id === id);
}

export function isMet(p: ObjectiveProgress): boolean {
  return typeof p === 'boolean' ? p : p.n >= p.of;
}

// The chapter open and not yet done, or null: between chapters (the next
// waits for its week) and after the last.
export function currentChapter(s: GameState): Chapter | null {
  const g = s.guidance;
  if (!g) return null;
  return CHAPTERS.find((c) => g.opened[c.id] !== undefined && g.done[c.id] === undefined) ?? null;
}

export function objectiveMet(s: GameState, id: string): boolean {
  return s.guidance?.met.includes(id) ?? false;
}

// What the drawer lists for a chapter: each objective's words, its reading
// now, and whether it is met for good.
export function objectiveRows(s: GameState, c: Chapter): { id: string; text: string; progress: ObjectiveProgress; met: boolean; optional: boolean }[] {
  const words = CHAPTER_COPY[c.id].objectives;
  return c.objectives.map((o) => ({
    id: o.id,
    text: words[o.id],
    progress: o.progress(s),
    met: objectiveMet(s, o.id),
    optional: o.optional === true,
  }));
}

// A save from before the objectives, or any run already under way when it
// first meets them: what its weeks have passed it has learned. Every
// chapter whose earliest week has come is done; the rest open in turn.
function caughtUp(s: GameState): GuidanceState {
  const now = absoluteWeek(s);
  const g: GuidanceState = { opened: {}, done: {}, met: [], marked: [] };
  for (const c of CHAPTERS) {
    if (c.earliest > now) break;
    g.opened[c.id] = now;
    g.done[c.id] = now;
  }
  return g;
}

// Latches what is met, closes the chapter whose objectives are all met, and
// opens the next whose week has come, as far as that goes this week. Writes
// only when something changed, so a quiet settle leaves the state as it was.
export function settleChapters(s: GameState): void {
  if (!s.started || s.sandbox) return;
  s.guidance ??= caughtUp(s);
  const g = s.guidance;
  const now = absoluteWeek(s);
  for (const c of CHAPTERS) {
    if (g.done[c.id] !== undefined) continue;
    if (g.opened[c.id] === undefined) {
      if (c.earliest > now) return;
      g.opened[c.id] = now;
    }
    for (const o of c.objectives) {
      if (!g.met.includes(o.id) && isMet(o.progress(s))) g.met.push(o.id);
    }
    if (!c.objectives.every((o) => o.optional || g.met.includes(o.id))) return;
    g.done[c.id] = now;
  }
}

// The player did something the objectives count (MARK_GUIDANCE).
export function markGuidance(s: GameState, mark: string): boolean {
  if (!s.guidance || s.guidance.marked.includes(mark)) return false;
  s.guidance.marked.push(mark);
  settleChapters(s);
  return true;
}
