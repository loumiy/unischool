import type { Buildable, GameState, GuidanceState, Placement, TileCoord, VarsityTeam } from './types';
import { coursesDone, totalEnrolled, WEEKS_PER_YEAR } from './types';
import { CHAPTER_COPY, COURSE_MILESTONES, HALL_LOCKED_HELP, labRisingHelp, secondCourseWaitHelp, teachObjective, type ChapterId, type Lever } from '../data/chapterData';
import { housedPrograms, isDiningHall, isDorm, sitedAny, walkProgram } from '../data/openingData';
import { instructionCapacity } from '../systems/techtree/instructionCapacity';
import { weeklyNet } from '../systems/finance/financeSystem';
import { computePrestigeTarget } from '../systems/prestige/prestigeSystem';
import { darkPrograms } from '../systems/techtree/darkness';
import { academicHallId, FOUNDERS_HALL_ID, isAcademicHall, programById } from '../data/techData';
import { MEDICAL_CENTER_ID } from '../data/projectData';
import { RESEARCH_PARK_ID } from '../data/researchParkData';
import { GRADE_B } from '../data/courseQuality';
import { openChairs, venueForCategory } from '../data/studentLifeData';
import { schoolsFounded } from '../systems/guidance/establish';
import { foundersHallUnsited, laterCourseStarted } from './opening';
import { DEMAND_SATISFACTION_THRESHOLD } from '../data/demandData';
import { placesComing } from '../systems/guidance/seating';
import { pathTileKey, placementTiles } from './campusMap';

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
// (Plan 106 PR B; since Plan 112A each objective with its own help). The
// walkthrough teaches the founding and ends there; the chapters after it
// took over its later steps (PR C), and in a guided run the chair's letters
// too (Plan 112A, eventSystem.ts's fireOpeningLetter).
//
// "Promises" and "The long game" went in Plan 112A. A save that opened
// either keeps their ids in its record, which nothing reads: the chapters
// are read off CHAPTERS, never off the record's keys.
//
// Settled after every action that changed the state and every tick (the
// reducer's settled()). This lives in state/ because it reads the map
// (sitedAny, foundersHallUnsited), which systems/ may not.

// An objective's reading: met or not, or a count toward a figure. A count
// is met when it reaches the figure. `coming` is a second count the drawer
// shows beside it while the two differ: Seats for everyone's places with
// the courses under way (Plan 114E, the third review's C3-5), which the
// NEXT line counts (seating.ts's placesComing).
export type ObjectiveProgress = boolean | { n: number; of: number; coming?: number };

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
}

const week = (year: number, w: number) => (year - 1) * WEEKS_PER_YEAR + w;
// The first academic hall (Elm Hall), which chapter 10 rings.
const FIRST_HALL_ID = academicHallId(0);

// A count of courses taught (Plan 112A), one of the curriculum's
// milestones in chapterData.ts: what the first academic hall waits on,
// counted the same way (ladderData.ts's 'curriculum' milestone).
function teachCourses(chapter: keyof typeof COURSE_MILESTONES): Objective {
  const of = COURSE_MILESTONES[chapter];
  return { id: teachObjective(of), progress: (s) => ({ n: Math.min(coursesDone(s), of), of }) };
}
export const absoluteWeek = (s: GameState) => week(s.clock.year, s.clock.week);

// A mark the player made outside the college's state (MARK_GUIDANCE).
export const marked = (s: GameState, mark: string) => s.guidance?.marked.includes(mark) ?? false;
export const DOUBLE_SPEED_MARK = 'speed-2x';
// The camera's moves, marked by the map when the player makes them
// (CampusMap.tsx), by key, mouse or touch alike.
export const LOOK_MARKS = { pan: 'look:pan', turn: 'look:turn', tilt: 'look:tilt', zoom: 'look:zoom', home: 'look:home' } as const;
export type LookMove = keyof typeof LOOK_MARKS;

// Somewhere to sleep's path (Plan 115D).
export const PATH_OBJECTIVE = 'path-to-founders';

// The posts a varsity team has: head coach, assistant coach, trainer.
const TEAM_POSTS = 3;

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
    // turn, tilt and zoom, each required before Somewhere to sleep opens
    // (the owner, 22 October), and Home, optional. A move made before it
    // opens counts. A save already past it, with a later chapter open, has
    // it caught up (settleChapters).
    id: 'looking-around',
    earliest: week(1, 1),
    objectives: (Object.keys(LOOK_MARKS) as LookMove[]).map((move) => ({
      id: `look-${move}`,
      progress: (s: GameState) => marked(s, LOOK_MARKS[move]),
      ...(move === 'home' ? { optional: true as const } : {}),
    })),
  },
  {
    // Week 10 at the earliest, so year one comes in two sittings (Plan 106
    // §4), and no later: each week without beds and meals costs the first
    // summer applicants and prestige (the owner's choice, 20 October, from
    // a measured 616 applicants with them in week 5 and 545 in week 27).
    // Needs stay hidden until commencement (Plan 104M, §7.1): the chapter
    // asks for the buildings, not a figure. And a path from the residence
    // hall to Founders Hall (Plan 115D, the third review's C1-1): the young
    // campus's ground plan, laid by the player, and the path tool taught.
    id: 'somewhere-to-sleep',
    earliest: week(1, 10),
    objectives: [
      { id: 'site-residence-hall', progress: (s) => sitedAny(s, isDorm) },
      { id: 'site-dining-hall', progress: (s) => sitedAny(s, isDiningHall) },
      { id: PATH_OBJECTIVE, progress: (s) => pathJoinsResidence(s) },
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
          return { n: Math.min(instructionCapacity(s), of), of, coming: Math.min(placesComing(s), of) };
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
    // The first summer (week 52): the chapter says what the price and the
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
      { id: 'satisfaction-60', progress: (s) => ({ n: Math.min(Math.floor(s.students.satisfaction), DEMAND_SATISFACTION_THRESHOLD), of: DEMAND_SATISFACTION_THRESHOLD }), optional: true },
      { id: 'prestige-rising', progress: (s) => computePrestigeTarget(s) > s.self.reputation, optional: true },
    ],
  },
  {
    // The faculty market, grades, ranks and searches (F2, S1, F1).
    id: 'a-faculty',
    earliest: week(2, 14),
    // The tab first, and a search only as one way to find somebody
    // (Plan 107B). The first of the curriculum's milestones, eight courses,
    // is the count that opens the chapter after it (Plan 112A).
    objectives: [
      { id: 'open-faculty', progress: (s) => marked(s, tabMark('faculty')) },
      { id: 'every-program-staffed', progress: (s) => darkPrograms(s).size === 0 },
      teachCourses('a-faculty'),
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
      teachCourses('campus-life'),
      { id: 'approve-a-club', progress: (s) => s.orgs.clubs.length > 0, optional: true },
      { id: 'answer-a-matter', progress: (s) => Object.keys(s.events.decisionHistory).length > 0, optional: true },
    ],
  },
  {
    // Athletics, from the first varsity team (Plan 114E, the third review's
    // C3-2: it opened on the petition, ladderData.ts's varsityAsked, so a
    // petition turned down opened a chapter whose team could not come for
    // years). The ladder's rung still opens on the petition; in a guided run
    // the Athletics tab and the mascot stop wait for this chapter (gates.ts),
    // so after a refusal they wait for a team too. A save that opened it on
    // a refusal keeps it open. Walked in the order it happens: the Athletic
    // Director the board offers once a team exists, the posts of every team,
    // and the venues. A side chapter: a college that never fields a team
    // still reaches the chapters after it.
    id: 'the-teams',
    earliest: week(1, 1),
    side: true,
    opensWhen: (s) => s.orgs.teams.length > 0,
    objectives: [
      { id: 'appoint-athletic-director', progress: (s) => s.orgs.athleticDirector !== null },
      {
        id: 'staff-the-team',
        progress: (s) => {
          const teams = s.orgs.teams.length;
          const of = TEAM_POSTS * Math.max(1, teams);
          return { n: teams === 0 ? 0 : of - openChairs(s).length, of };
        },
      },
      { id: 'build-the-venue', progress: (s) => s.orgs.teams.length > 0 && s.orgs.teams.every((team) => venueUnderway(s, team)) },
    ],
  },
  {
    // The seats and the offices (Plan 89): the routine off the President's
    // desk, and the faster clock the seats open.
    id: 'running-the-college',
    earliest: week(4, 27),
    objectives: [
      { id: 'appoint-a-provost', progress: (s) => (s.seats ?? []).some((seat) => seat.seatId === 'provost') },
      teachCourses('running-the-college'),
      { id: 'open-an-office', progress: (s) => (s.halls[FOUNDERS_HALL_ID] ?? []).some((slot) => slot.office !== undefined), optional: true },
    ],
  },
  // Past the first five years (Plan 106 PR H): side chapters, each opening
  // when its system first comes within reach, whenever that is, and none
  // waiting for another.
  {
    // Research, once a school is founded and its first laboratory can be
    // built (in a natural run, years 9 to 10). The university charter that
    // follows the first lab at work is the board's to offer, not an
    // objective (Plan 112A).
    id: 'research',
    earliest: week(5, 1),
    side: true,
    opensWhen: (s) => schoolsFounded(s) > 0,
    objectives: [
      // Built, not placed: the Research tab the next objective opens comes
      // with the first lab that stands (the owner's note, 29 October).
      { id: 'site-a-lab', progress: labBuilt },
      { id: 'commission-research', progress: (s) => Object.keys(s.research.initiatives).length > 0 || s.research.completedInitiatives.length > 0 },
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
    // Capital projects, from year 10 (projectData.ts), once one can be
    // begun: each also waits on a school's courses or the specialization,
    // and the chapter asking for one before then reads as a dead end (I5,
    // S5).
    id: 'capital-projects',
    earliest: week(10, 1),
    side: true,
    opensWhen: (s) => s.tech.some((t) => (t.facilityType === 'project' || t.id === MEDICAL_CENTER_ID) && t.status !== 'locked'),
    objectives: [
      // The Medical Center counts: a capital project in all but its place in the
      // build menu (projectData.ts; Plan 118D, I5).
      { id: 'begin-a-project', progress: (s) => s.tech.some((t) => (t.facilityType === 'project' || t.id === MEDICAL_CENTER_ID) && (t.status === 'developing' || t.status === 'done' || t.id in s.placements)) },
    ],
  },
  {
    // The specialization: a long goal from year 15, met when the board
    // first offers the choice (the guide's top 30, or from year 20 the top
    // 10 of a pillar or satisfaction that led the field, Plan 116C:
    // prestigeSystem.ts).
    id: 'specialization',
    earliest: week(15, 1),
    side: true,
    objectives: [
      { id: 'offered-specialization', progress: (s) => s.specializationOffered !== undefined || s.specialization !== 'none' },
      { id: 'choose-specialization', progress: (s) => s.specialization !== 'none', optional: true },
    ],
  },
  {
    // The Research Park, once a college specialized in research may build
    // it: the chair's last letter, as a chapter (Plan 112A). Met once the
    // park is going up.
    id: 'research-park',
    // No sooner than the park itself (projectData.ts's fromYear).
    earliest: week(12, 1),
    side: true,
    opensWhen: (s) => s.tech.some((t) => t.id === RESEARCH_PARK_ID && t.status !== 'locked'),
    objectives: [
      { id: 'site-research-park', progress: (s) => s.tech.some((t) => t.id === RESEARCH_PARK_ID && (t.id in s.placements || t.status === 'developing' || t.status === 'done')) },
    ],
  },
];

// The tabs an objective asks to be opened, marked by the shell when they
// are (App.tsx), since an open tab is the shell's, not the college's.
export const tabMark = (tab: string) => `tab:${tab}`;
export const MARKED_TABS: ReadonlySet<string> = new Set(['treasury', 'students', 'history', 'faculty']);

// The paths joined to Founders Hall (Plan 115D), as tile keys: every path
// tile reached from one beside the hall, a step at a time along the paths,
// diagonals included (the draw tool lays a diagonal run as one band,
// pathways.tsx). The founding drive is among them (state/drive.ts), and a
// path that joins it counts. A path under a building joins nothing.
export function pathsFromFounders(s: GameState): Set<string> {
  const hall = s.placements[FOUNDERS_HALL_ID];
  const joined = new Set<string>();
  if (!hall) return joined;
  const covered = new Set(Object.values(s.placements).flatMap((p) => placementTiles(p).map(pathTileKey)));
  const paved = (key: string) => key in s.pathways && !covered.has(key) && !joined.has(key);
  const queue = besideTiles(hall).filter((t) => paved(pathTileKey(t)));
  for (const t of queue) joined.add(pathTileKey(t));
  for (let q = 0; q < queue.length; q++) {
    const { row, col } = queue[q];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const next = { row: row + dr, col: col + dc };
        const key = pathTileKey(next);
        if (!paved(key)) continue;
        joined.add(key);
        queue.push(next);
      }
    }
  }
  return joined;
}

// The tiles round a placement's footprint, corners included.
export function besideTiles(p: Placement): TileCoord[] {
  const tiles: TileCoord[] = [];
  for (let row = p.row - 1; row <= p.row + p.h; row++) {
    for (let col = p.col - 1; col <= p.col + p.w; col++) {
      if (row < p.row || row >= p.row + p.h || col < p.col || col >= p.col + p.w) tiles.push({ row, col });
    }
  }
  return tiles;
}

// A sited residence hall has a path beside it that joins Founders Hall.
export function pathJoinsResidence(s: GameState): boolean {
  const dorms = s.tech.filter((t) => isDorm(t) && t.id in s.placements);
  if (dorms.length === 0) return false;
  const joined = pathsFromFounders(s);
  return dorms.some((t) => besideTiles(s.placements[t.id]).some((tile) => joined.has(pathTileKey(tile))));
}

// What a chapter rings while its objective waits, as the walkthrough's
// steps did (Plan 103): the program whose next course the Curriculum
// rings; the building the build menu rings and opens on (a residence hall
// and a dining hall, then the first academic hall, Plan 112A; the Student
// Center, a first lab and the Research Park, Plan 114F); and the funds
// figure, the Treasury's button (Plan 112A).
export function ringedProgram(s: GameState): string | null {
  return currentChapter(s)?.id === 'next-course' && !objectiveMet(s, 'develop-second-course') ? walkProgram(s) : null;
}
export function ringedBuilding(s: GameState): Buildable | null {
  const chapter = currentChapter(s)?.id;
  if (chapter === 'hall-of-its-own') {
    if (objectiveMet(s, 'site-academic-hall')) return null;
    return unsited(s, (t) => t.id === FIRST_HALL_ID);
  }
  if (chapter === 'somewhere-to-sleep') {
    const test = !sitedAny(s, isDorm) ? isDorm : !sitedAny(s, isDiningHall) ? isDiningHall : null;
    return test ? s.tech.find((t) => test(t) && t.status === 'available') ?? null : null;
  }
  // Campus life's Student Center (Plan 114F, the third review's C3-9: its
  // Show me opened the menu on Grounds).
  if (chapter === 'campus-life' && !objectiveMet(s, 'site-student-center')) {
    const center = unsited(s, (t) => t.facilityType === 'studentCenter');
    if (center) return center;
  }
  // The side chapters, from their opening as the teams' venue (Plan 112B),
  // so a Show me from the Guide's list finds its building ringed under a
  // main chapter too: the first lab and the Research Park (Plan 114F).
  if (chapterOpen(s, 'research') && !sitedAny(s, isLab)) {
    const lab = unsited(s, (t) => t.facilityType === 'lab');
    if (lab) return lab;
  }
  if (chapterOpen(s, 'research-park') && !objectiveMet(s, 'site-research-park')) {
    const park = unsited(s, (t) => t.id === RESEARCH_PARK_ID);
    if (park) return park;
  }
  // The teams' venue (Plan 112B), from the chapter's opening rather than
  // its turn in the Athletics tab's walk, so its Show me finds it ringed.
  if (!chapterOpen(s, 'the-teams')) return null;
  const team = s.orgs.teams.find((x) => !venueUnderway(s, x));
  const venue = team ? venueForCategory(s, team.venueCategory) : undefined;
  return venue?.status === 'available' ? venue : null;
}

// The grounds tool the build menu rings (Plan 115D): Paths, while
// Somewhere to sleep asks for its path and rings no building before it.
// With nothing ringed the menu opens on Grounds (BuildPopup.tsx's
// initialBuildTab), where the tile is.
export function ringedTool(s: GameState): 'paths' | null {
  if (currentChapter(s)?.id !== 'somewhere-to-sleep' || objectiveMet(s, PATH_OBJECTIVE)) return null;
  return sitedAny(s, isDorm) && ringedBuilding(s) === null ? 'paths' : null;
}

// The first building a test picks that can be built and is not yet sited.
function unsited(s: GameState, test: (t: Buildable) => boolean): Buildable | null {
  return s.tech.find((t) => test(t) && t.status === 'available' && !(t.id in s.placements)) ?? null;
}

// Capital projects opens the build menu on its own tab while no project is
// begun (Plan 114F): it names no one building to ring.
export function projectsAsked(s: GameState): boolean {
  return chapterOpen(s, 'capital-projects') && !objectiveMet(s, 'begin-a-project');
}

// A chapter opened and not yet done, side chapters included (currentChapter
// names only one).
function chapterOpen(s: GameState, id: ChapterId): boolean {
  return s.guidance?.opened[id] !== undefined && s.guidance.done[id] === undefined;
}

// A team's venue stands, is going up, or is sited.
function venueUnderway(s: GameState, team: VarsityTeam): boolean {
  if (team.status === 'active') return true;
  const venue = venueForCategory(s, team.venueCategory);
  return !!venue && (venue.status === 'done' || venue.status === 'developing' || venue.id in s.placements);
}

// What the Athletics tab rings while The teams is open (Plan 112B, the
// owner: "this should all be walked through when the athletic director is
// hired"): from the Athletic Director's hire, a team's open posts, then its
// venue, one at a time in that order, until the chapter is done.
export type TeamsRing = { step: 'staff' | 'venue'; teamId: string };
export function teamsRing(s: GameState): TeamsRing | null {
  if (!chapterOpen(s, 'the-teams') || !s.orgs.athleticDirector) return null;
  const short = openChairs(s)[0];
  if (short) return { step: 'staff', teamId: short.team.id };
  const unhoused = s.orgs.teams.find((team) => !venueUnderway(s, team));
  return unhoused ? { step: 'venue', teamId: unhoused.id } : null;
}
export function treasuryRinged(s: GameState): boolean {
  return currentChapter(s)?.id === 'paying-for-it' && !objectiveMet(s, 'open-treasury');
}

// An objective's help, behind its (?) in the drawer: the chapter's words,
// except where they would point at something not there yet. The first
// academic hall still locked, its help says what opens it and its Show me
// goes to the Curriculum (Plan 112A).
const isLab = (t: Buildable) => t.facilityType === 'lab';

// The first lab built, not just placed: the Research tab opens with it.
function labBuilt(s: GameState): boolean {
  return s.tech.some((t) => isLab(t) && t.status === 'done' && t.id in s.placements);
}

export function objectiveHelp(s: GameState, chapter: ChapterId, objective: string): Lever | undefined {
  // A lab placed and going up: say so, and how long (the owner's note).
  if (objective === 'site-a-lab' && !labBuilt(s)) {
    const rising = s.tech.find((t) => isLab(t) && t.status === 'developing' && t.id in s.placements);
    if (rising) return labRisingHelp(s.developing[rising.id] ?? rising.duration);
  }
  if (objective === 'site-academic-hall' && s.tech.find((t) => t.id === FIRST_HALL_ID)?.status === 'locked') return HALL_LOCKED_HELP;
  // No program's first course taught yet, and one still being written: wait
  // for it before the second (Plan 118E, I7).
  if (objective === 'develop-second-course' && walkProgram(s) === null) {
    const writing = housedPrograms(s)
      .map((id) => s.tech.find((t) => t.id === programById(id)?.entryCourseId))
      .find((t) => t?.status === 'developing');
    if (writing) return secondCourseWaitHelp(writing.name.split(' · ')[0], s.developing[writing.id] ?? writing.duration);
  }
  return CHAPTER_COPY[chapter].help?.[objective];
}

export function chapterById(id: string): Chapter | undefined {
  return CHAPTERS.find((c) => c.id === id);
}

export function isMet(p: ObjectiveProgress): boolean {
  return typeof p === 'boolean' ? p : p.n >= p.of;
}

// The chapter the ticker and the drawer show: the open main chapter, else
// the first open side chapter, or null between chapters (the next waits for
// its week) and after the last. A side chapter never stands over the main
// one (Plan 114E, C3-2); the others open are openSideChapters'.
export function currentChapter(s: GameState): Chapter | null {
  const g = s.guidance;
  if (!g) return null;
  const open = CHAPTERS.filter((c) => g.opened[c.id] !== undefined && g.done[c.id] === undefined);
  return open.find((c) => !c.side) ?? open[0] ?? null;
}

// The side chapters open beside the current one, in order: the Guide's list
// names them first (ObjectivesPanel), so they are a click away.
export function openSideChapters(s: GameState): Chapter[] {
  const current = currentChapter(s);
  return CHAPTERS.filter((c) => c.side && c !== current && chapterOpen(s, c.id));
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
  // A chapter added to the chain after a save had passed its place (Looking
  // around, after 0.1.3): unopened while a later one is open, it is caught
  // up as done rather than holding back a run already beyond it.
  const chain = CHAPTERS.filter((c) => !c.side);
  chain.forEach((c, i) => {
    if (g.opened[c.id] === undefined && chain.slice(i + 1).some((later) => g.opened[later.id] !== undefined)) {
      g.opened[c.id] = now;
      g.done[c.id] = now;
    }
  });
  // The chain, each waiting for the one before; then the side chapters.
  for (const c of chain) {
    if (!settle(c)) break;
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

// A chapter's page read: marked when the drawer first shows it, so Guided
// opens it by itself only once.
export const readMark = (id: string) => `read:${id}`;

// Whether the drawer has a page for the chapter: every one but the
// founding, which the walkthrough's card teaches.
export function hasPage(id: ChapterId): boolean {
  return CHAPTER_COPY[id].about !== undefined;
}

// The Guide (Plan 106 PR G): every chapter with a page that the run has
// opened, in the order they came; read again from the drawer.
export function guideChapters(s: GameState): Chapter[] {
  return CHAPTERS.filter((c) => s.guidance?.opened[c.id] !== undefined && hasPage(c.id));
}
