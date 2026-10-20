import type { Buildable, GameState, GuidanceState } from './types';
import { totalEnrolled, WEEKS_PER_YEAR } from './types';
import { CHAPTER_COPY, type ChapterId } from '../data/chapterData';
import { housedPrograms, isDiningHall, isDorm, sitedAny, walkProgram } from '../data/openingData';
import { instructionCapacity } from '../systems/techtree/instructionCapacity';
import { weeklyNet } from '../systems/finance/financeSystem';
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
// The words are data/chapterData.ts's; the NEXT bar's drawer shows them
// (Plan 106 PR B). The walkthrough teaches the founding and ends there;
// the chapters after it took over its later steps (PR C).
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
    // The walkthrough's three steps (state/opening.ts), with the clock held
    // and the screen quiet: the coach card teaches them, so the drawer never
    // shows this chapter. It is the record that they were done.
    id: 'founding',
    earliest: week(1, 1),
    objectives: [
      { id: 'site-founders-hall', progress: (s) => !foundersHallUnsited(s) },
      { id: 'appoint-first-professor', progress: (s) => s.faculty.length > 0 },
      { id: 'found-first-program', progress: (s) => housedPrograms(s).length > 0 },
    ],
  },
  {
    // From the founding on: the courses, the committee and the clock (the
    // walkthrough's old fourth step, Plan 103B).
    id: 'next-course',
    earliest: week(1, 1),
    objectives: [
      { id: 'develop-second-course', progress: laterCourseStarted },
      { id: 'run-at-double', progress: (s) => marked(s, DOUBLE_SPEED_MARK), optional: true },
    ],
  },
  {
    // Week 10 at the earliest, so year one comes in two sittings (Plan 106
    // §4), and no later: each week without beds and meals costs the first
    // summer applicants and prestige (the owner's choice, 20 October, from
    // a measured 616 applicants with them in week 5 and 545 in week 27).
    // Needs stay hidden until commencement (Plan 104M, §7.1): the chapter
    // asks for the buildings, not a figure.
    id: 'somewhere-to-sleep',
    earliest: week(1, 10),
    objectives: [
      { id: 'site-residence-hall', progress: (s) => sitedAny(s, isDorm) },
      { id: 'site-dining-hall', progress: (s) => sitedAny(s, isDiningHall) },
    ],
  },
  {
    // A place for every student: the first letter's ask, and the NEXT
    // line's since Plan 80D. Often met before it opens; it opens met.
    id: 'seats',
    earliest: week(1, 1),
    objectives: [
      {
        id: 'seat-every-student',
        progress: (s) => {
          const of = totalEnrolled(s.students);
          return { n: Math.min(instructionCapacity(s), of), of };
        },
      },
    ],
  },
  {
    // The money, before the summer sets next year's (Plan 106 §4, chapter 5
    // of the plan's numbering before PR C added The next course). Week 30
    // at the earliest, leaving the summer its own chapter.
    id: 'paying-for-it',
    earliest: week(1, 30),
    objectives: [
      { id: 'open-treasury', progress: (s) => marked(s, tabMark('treasury')) },
      // Optional: a college running a deficit still meets its first summer's
      // chapter, the one that explains where the income comes from.
      { id: 'weekly-surplus', progress: (s) => weeklyNet(s) > 0, optional: true },
    ],
  },
  {
    // The first summer (week 52): the briefing says what the price and the
    // admit rate do before the beat asks, and no warning comes at the
    // choice (§7.5: a careless admit rate is still punished). Done when the
    // summer has closed.
    id: 'first-summer',
    earliest: week(1, 46),
    objectives: [
      { id: 'set-first-class', progress: (s) => s.history.length >= 1 },
    ],
  },
];

// The tabs an objective asks to be opened, marked by the shell when they
// are (App.tsx), since an open tab is the shell's, not the college's.
export const tabMark = (tab: string) => `tab:${tab}`;
export const MARKED_TABS: ReadonlySet<string> = new Set(['treasury']);

// What a chapter rings while its objective waits, as the walkthrough's
// steps did (Plan 103): the program whose next course the Curriculum
// rings, and the building the build menu rings and opens on.
export function ringedProgram(s: GameState): string | null {
  return currentChapter(s)?.id === 'next-course' && !objectiveMet(s, 'develop-second-course') ? walkProgram(s) : null;
}
export function ringedBuilding(s: GameState): Buildable | null {
  if (currentChapter(s)?.id !== 'somewhere-to-sleep') return null;
  const test = !sitedAny(s, isDorm) ? isDorm : !sitedAny(s, isDiningHall) ? isDiningHall : null;
  return test ? s.tech.find((t) => test(t) && t.status === 'available') ?? null : null;
}

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

// Chapter 1 is the first; the drawer and the ticker count from it.
export function chapterNumber(c: Chapter): number {
  return CHAPTERS.indexOf(c) + 1;
}

// The first chapter not yet opened: the one the drawer says is coming.
export function nextChapter(s: GameState): Chapter | null {
  const g = s.guidance;
  if (!g) return null;
  return CHAPTERS.find((c) => g.opened[c.id] === undefined) ?? null;
}

// The objective the ticker's one line names: the first not met, required
// before optional. Null when every one is met.
export function leadObjective(s: GameState, c: Chapter): ReturnType<typeof objectiveRows>[number] | null {
  const rows = objectiveRows(s, c).filter((r) => !r.met);
  return rows.find((r) => !r.optional) ?? rows[0] ?? null;
}

// A chapter's briefing read: marked when the drawer first shows it, so
// Guided opens it by itself only once.
export const readMark = (id: string) => `read:${id}`;
