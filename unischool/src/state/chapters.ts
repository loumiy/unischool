import type { Buildable, GameState, GuidanceState } from './types';
import { totalEnrolled, WEEKS_PER_YEAR } from './types';
import { CHAPTER_COPY, type ChapterId } from '../data/chapterData';
import { housedPrograms, isDiningHall, isDorm, sitedAny, walkProgram } from '../data/openingData';
import { instructionCapacity } from '../systems/techtree/instructionCapacity';
import { weeklyNet } from '../systems/finance/financeSystem';
import { computePrestigeTarget } from '../systems/prestige/prestigeSystem';
import { darkPrograms } from '../systems/techtree/darkness';
import { FOUNDERS_HALL_ID, isAcademicHall } from '../data/techData';
import { GRADE_B } from '../data/courseQuality';
import { milestoneReached } from '../systems/ladder/ladderSystem';
import { maintenanceFunding } from '../systems/estate/estate';
import { schoolsFounded } from '../systems/guidance/establish';
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
  // What else must hold before it opens, beyond the chapter before it done
  // and its week come: the thing it teaches has to exist.
  opensWhen?: (s: GameState) => boolean;
  objectives: readonly Objective[];
  // A figure the drawer reads live under the objectives (ObjectivesPanel).
  live?: 'standing';
  // A side chapter (Plan 106 PR F) waits for nothing but its week and
  // opensWhen, and nothing waits for it: a system some colleges never take
  // up (athletics) must not hold back the chapters after it.
  side?: true;
  // A side chapter that steps aside: the drawer shows it only while no
  // chapter of the chain is open, so a habit it teaches never covers the
  // college's own next lesson.
  yields?: true;
}

const week = (year: number, w: number) => (year - 1) * WEEKS_PER_YEAR + w;
export const absoluteWeek = (s: GameState) => week(s.clock.year, s.clock.week);

// A mark the player made outside the college's state (MARK_GUIDANCE).
export const marked = (s: GameState, mark: string) => s.guidance?.marked.includes(mark) ?? false;
export const DOUBLE_SPEED_MARK = 'speed-2x';
// The camera's moves, marked by the map when the player makes them
// (CampusMap.tsx), by key, mouse or touch alike.
export const LOOK_MARKS = { pan: 'look:pan', turn: 'look:turn', tilt: 'look:tilt', zoom: 'look:zoom', home: 'look:home' } as const;
export type LookMove = keyof typeof LOOK_MARKS;

export const CHAPTERS: readonly Chapter[] = [
  {
    // The walkthrough's two steps (state/opening.ts), with the clock held
    // and the screen quiet: the coach card teaches them, so the drawer never
    // shows this chapter. It is the record that they were done.
    id: 'founding',
    earliest: week(1, 1),
    objectives: [
      { id: 'site-founders-hall', progress: (s) => !foundersHallUnsited(s) },
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
    // The camera (F7: "I could not see the paths behind buildings"): pan,
    // turn, tilt, zoom and Home, once the first course has company. A side
    // chapter that yields: it fills the weeks before Somewhere to sleep,
    // steps aside for any chapter of the chain, and holds nothing back, so a
    // player who never tilts the view still meets every system. A move made
    // before it opens counts, and a save already under way meets it in its
    // next quiet stretch.
    id: 'looking-around',
    earliest: week(1, 1),
    side: true,
    yields: true,
    opensWhen: (s) => s.guidance?.done['next-course'] !== undefined,
    objectives: (Object.keys(LOOK_MARKS) as LookMove[]).map((move) => ({
      id: `look-${move}`,
      progress: (s: GameState) => marked(s, LOOK_MARKS[move]),
    })),
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
  {
    // Year 2 opens with the first grade given and the Students tab open
    // (Plan 104M): prestige and satisfaction, and what moves them. The
    // figures are optional goals; looking is the lesson (F6: "why is my
    // prestige continuing to plummet?").
    id: 'standing',
    earliest: week(2, 1),
    live: 'standing',
    objectives: [
      { id: 'open-students', progress: (s) => marked(s, tabMark('students')) },
      { id: 'open-history', progress: (s) => marked(s, tabMark('history')) },
      { id: 'satisfaction-60', progress: (s) => ({ n: Math.min(Math.floor(s.students.satisfaction), 60), of: 60 }), optional: true },
      { id: 'prestige-rising', progress: (s) => computePrestigeTarget(s) > s.self.reputation, optional: true },
    ],
  },
  {
    // The faculty market, grades, ranks and searches (F2, S1, F1).
    id: 'a-faculty',
    earliest: week(2, 14),
    // The tab first, and a search only as one way to find somebody
    // (Plan 107B).
    objectives: [
      { id: 'open-faculty', progress: (s) => marked(s, tabMark('faculty')) },
      { id: 'every-program-staffed', progress: (s) => darkPrograms(s).size === 0 },
      { id: 'post-a-search', progress: (s) => Object.keys(s.searches).length > 0, optional: true },
      { id: 'appoint-a-b', progress: (s) => s.faculty.some((f) => f.teaching >= GRADE_B), optional: true },
    ],
  },
  {
    // Academic halls and schools, once Elm Hall can be built (eight
    // courses taught, techData.ts's FIRST_HALL_COURSE_GATE).
    id: 'hall-of-its-own',
    earliest: week(2, 27),
    opensWhen: (s) => s.tech.some((t) => isAcademicHall(t) && t.id !== FOUNDERS_HALL_ID && t.status !== 'locked'),
    objectives: [
      { id: 'site-academic-hall', progress: (s) => s.tech.some((t) => isAcademicHall(t) && t.id !== FOUNDERS_HALL_ID && t.id in s.placements) },
      { id: 'move-a-program', progress: (s) => Object.entries(s.halls).some(([id, slots]) => id !== FOUNDERS_HALL_ID && slots.some((slot) => slot.programId !== null)) },
      { id: 'claim-a-hall', progress: (s) => Object.keys(s.hallClaims ?? {}).some((id) => id !== FOUNDERS_HALL_ID), optional: true },
    ],
  },
  {
    // Clubs, the inbox's matters and the students' demands, which wait for
    // this chapter in a guided run (systems/guidance/gates.ts).
    id: 'campus-life',
    earliest: week(3, 1),
    objectives: [
      { id: 'site-student-center', progress: (s) => sitedAny(s, (t) => t.facilityType === 'studentCenter') },
      { id: 'approve-a-club', progress: (s) => s.orgs.clubs.length > 0, optional: true },
      { id: 'answer-a-matter', progress: (s) => Object.keys(s.events.decisionHistory).length > 0, optional: true },
    ],
  },
  {
    // The board's promises, offered from the third summer, which waits for
    // this chapter in a guided run (gates.ts).
    id: 'promises',
    earliest: week(3, 46),
    objectives: [
      { id: 'third-summer', progress: (s) => s.history.length >= 3 },
      { id: 'make-a-promise', progress: (s) => (s.promises?.active.length ?? 0) + (s.promises?.settled.length ?? 0) > 0, optional: true },
    ],
  },
  {
    // Athletics, once a sport club has formed (ladderData.ts's 'sport'
    // milestone), and not before year 4. A side chapter: a college that
    // never fields a team still reaches the chapters after it. The
    // Athletics tab waits for it in a guided run (gates.ts).
    id: 'the-teams',
    earliest: week(4, 1),
    side: true,
    opensWhen: (s) => milestoneReached(s, 'sport'),
    objectives: [
      { id: 'appoint-athletic-director', progress: (s) => s.orgs.athleticDirector !== null },
      { id: 'field-a-varsity-team', progress: (s) => s.orgs.teams.length > 0, optional: true },
    ],
  },
  {
    // The seats and the offices (Plan 89): the routine off the President's
    // desk, and the faster clock the seats open.
    id: 'running-the-college',
    earliest: week(4, 27),
    objectives: [
      { id: 'appoint-a-provost', progress: (s) => (s.seats ?? []).some((seat) => seat.seatId === 'provost') },
      { id: 'open-an-office', progress: (s) => (s.halls[FOUNDERS_HALL_ID] ?? []).some((slot) => slot.office !== undefined), optional: true },
    ],
  },
  {
    // The endowment, the estate and the road to the first school: the last
    // chapter of the first five years.
    id: 'the-long-game',
    earliest: week(5, 1),
    objectives: [
      { id: 'set-a-sweep', progress: (s) => s.finance.sweepWeeks !== undefined },
      { id: 'full-upkeep', progress: (s) => maintenanceFunding(s) >= 1, optional: true },
      { id: 'found-a-school', progress: (s) => schoolsFounded(s) > 0, optional: true },
    ],
  },
  // Past the first five years (Plan 106 PR H): side chapters, each opening
  // when its system first comes within reach, whenever that is, and none
  // waiting for another.
  {
    // Research, once a school is founded and its first laboratory can be
    // built (in a natural run, years 9 to 10).
    id: 'research',
    earliest: week(5, 1),
    side: true,
    opensWhen: (s) => schoolsFounded(s) > 0,
    objectives: [
      { id: 'site-a-lab', progress: (s) => sitedAny(s, (t) => t.facilityType === 'lab') },
      { id: 'commission-research', progress: (s) => Object.keys(s.research.initiatives).length > 0 || s.research.completedInitiatives.length > 0 },
      { id: 'answer-the-charter', progress: (s) => s.self.universityCharterOffered, optional: true },
    ],
  },
  {
    // The alumni and their campaigns: a few classes out, and a VP of
    // Advancement to ask them.
    id: 'alumni',
    earliest: week(6, 1),
    side: true,
    opensWhen: (s) => (s.alumni?.length ?? 0) > 0,
    objectives: [
      { id: 'appoint-advancement', progress: (s) => (s.seats ?? []).some((seat) => seat.seatId === 'advancement') },
      { id: 'run-a-campaign', progress: (s) => s.advancement?.running != null || (s.advancement?.closed.length ?? 0) > 0, optional: true },
    ],
  },
  {
    // Capital projects, which open from year 10 (projectData.ts).
    id: 'capital-projects',
    earliest: week(10, 1),
    side: true,
    objectives: [
      { id: 'begin-a-project', progress: (s) => s.tech.some((t) => t.facilityType === 'project' && (t.status === 'developing' || t.status === 'done' || t.id in s.placements)) },
    ],
  },
  {
    // The specialization: a long goal from year 15, met when the board
    // first offers the choice (the guide's top 30, or from year 20 the top
    // 10 of a pillar: prestigeSystem.ts).
    id: 'specialization',
    earliest: week(15, 1),
    side: true,
    objectives: [
      { id: 'offered-specialization', progress: (s) => s.specializationOffered !== undefined || s.specialization !== 'none' },
      { id: 'choose-specialization', progress: (s) => s.specialization !== 'none', optional: true },
    ],
  },
];

// The tabs an objective asks to be opened, marked by the shell when they
// are (App.tsx), since an open tab is the shell's, not the college's.
export const tabMark = (tab: string) => `tab:${tab}`;
export const MARKED_TABS: ReadonlySet<string> = new Set(['treasury', 'students', 'history', 'faculty']);

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
  const open = CHAPTERS.filter((c) => g.opened[c.id] !== undefined && g.done[c.id] === undefined);
  return open.find((c) => !c.yields) ?? open[0] ?? null;
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
  // One chapter: opened when it may be, its objectives latched, done when
  // they are. Whether it is done now.
  const settle = (c: Chapter): boolean => {
    if (g.done[c.id] !== undefined) return true;
    if (g.opened[c.id] === undefined) {
      if (c.earliest > now || (c.opensWhen && !c.opensWhen(s))) return false;
      g.opened[c.id] = now;
    }
    for (const o of c.objectives) {
      if (!g.met.includes(o.id) && isMet(o.progress(s))) g.met.push(o.id);
    }
    if (!c.objectives.every((o) => o.optional || g.met.includes(o.id))) return false;
    g.done[c.id] = now;
    return true;
  };
  // The chain, each waiting for the one before; then the side chapters.
  for (const c of CHAPTERS) {
    if (!c.side && !settle(c)) break;
  }
  for (const c of CHAPTERS) {
    if (c.side) settle(c);
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
  return CHAPTERS.find((c) => !c.side && g.opened[c.id] === undefined) ?? null;
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

// The Guide (Plan 106 PR G): every chapter with a briefing that the run
// has opened, in the order they came; read again from the drawer.
export function guideChapters(s: GameState): Chapter[] {
  return CHAPTERS.filter((c) => s.guidance?.opened[c.id] !== undefined && CHAPTER_COPY[c.id].briefing !== undefined);
}
