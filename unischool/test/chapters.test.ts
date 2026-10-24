// ---------------------------------------------------------------------
// The objectives (Plan 106 PR A, state/chapters.ts): the first five years
// taught as chapters, each a few objectives met however the player gets
// there.
//
// What is pinned: a guided founding opens the first chapter with nothing
// met; an objective is met the moment its reading holds and stays met after
// the reading falls; a chapter is done when its required objectives are
// met, an optional one aside; the next waits for its earliest week, and
// opens already met when the college got there first; a save from before
// the objectives is caught up by its date; a sandbox keeps no record; the
// reducer settles after every action and MARK_GUIDANCE marks once; the
// record survives a save; and every objective has its words. And PR B's
// strip and drawer: the chapter chip in place of the milestone's, the
// drawer's about and each objective's help and Show me (Plan 112A), what
// else waits, and Off as it was. And Plan 112's chapters: the curriculum's
// milestones, the rings, Promises and The long game gone, the Research
// Park's chapter.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { createInitialState, createPreStartState } from '../src/state/actions';
import { reducer } from '../src/engine/reducer';
import { placesComing } from '../src/systems/guidance/seating';
import { isUndergraduateCourse } from '../src/systems/techtree/techSystem';
import { isHoused } from '../src/systems/techtree/programOffers';
import { CHAPTERS, currentChapter, openSideChapters, PATH_OBJECTIVE, pathJoinsResidence, ringedTool, DOUBLE_SPEED_MARK, LOOK_MARKS, MARKED_TABS, guideChapters, hasPage, nextChapter, objectiveHelp, objectiveMet, objectiveRows, ringedBuilding, settleChapters, tabMark, treasuryRinged } from '../src/state/chapters';
import { tabAvailable } from '../src/components/TabNav';
import { ladderOpensTab } from '../src/systems/ladder/ladderSystem';
import { CHAPTER_COPY, COURSE_MILESTONES, HALL_LOCKED_HELP, TAB_GUIDE, teachObjective } from '../src/data/chapterData';
import TabOverlay from '../src/components/TabOverlay';
import { isDiningHall, isDorm } from '../src/data/openingData';
import { FOUNDING_VERNACULAR } from '../src/data/foundingData';
import { FOUNDING_COLORS, schoolColorsOf } from '../src/data/schoolColors';
import { loadGame, saveGame } from '../src/state/persistence';
import { teachPillars } from './fixtures/teaching';
import type { Buildable, GameState } from '../src/state/types';
import { createElement, isValidElement, type ReactElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import LogTicker, { objectivesShown } from '../src/components/LogTicker';
import ObjectivesPanel from '../src/components/ObjectivesPanel';
import { setSettings } from '../src/settings';
import { CHAPTER_IDS, eventFits, stateEvents } from '../src/analytics/events';
import { ATHLETICS_CHAPTER, chapterGateOpen, MATTERS_CHAPTER, OBJECTIVES_OFF_MARK } from '../src/systems/guidance/gates';
import { bindScriptStream } from '../src/engine/random';
import { SPORTS } from '../src/data/studentLifeData';
import { varsityAsked } from '../src/data/ladderData';
import { defaultAnswer } from '../src/engine/defaultAnswers';
import { academicHallId, FIRST_HALL_COURSE_GATE, FOUNDERS_HALL_ID, isAcademicHall, programOfCourse } from '../src/data/techData';
import { count } from '../src/format';
import { RESEARCH_PARK_ID } from '../src/data/researchParkData';
import { PILLARS } from '../src/systems/prestige/prestigeSystem';
import { pathToFoundersRoute } from '../sim/harness/moves';
import { pathTileKey } from '../src/state/campusMap';
import { driveRoute } from '../src/state/drive';

// A button's onClick in a rendered element tree, found by its words: the
// panel is a plain function of its props, so calling it gives the tree.
function findButton(el: ReactElement, words: string): (() => void) | undefined {
  const tree = (el.type as (p: unknown) => ReactNode)(el.props);
  let found: (() => void) | undefined;
  const walk = (n: ReactNode): void => {
    if (found || !n) return;
    if (Array.isArray(n)) { n.forEach(walk); return; }
    if (!isValidElement(n)) return;
    const p = n.props as { children?: ReactNode; onClick?: () => void };
    if (n.type === 'button' && p.children === words) found = p.onClick;
    walk(p.children);
  };
  walk(tree);
  return found;
}

const store = new Map<string, string>();
(globalThis as unknown as { localStorage: unknown }).localStorage = {
  getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
  setItem: (k: string, v: string) => { store.set(k, String(v)); },
  removeItem: (k: string) => { store.delete(k); },
};

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

const opened = (s: GameState, id: string) => s.guidance?.opened[id] !== undefined;
const done = (s: GameState, id: string) => s.guidance?.done[id] !== undefined;

// Sites the first building the test names, wherever: the readings ask only
// whether it has ground.
function site(s: GameState, test: (t: Buildable) => boolean): void {
  const t = s.tech.find((x) => test(x) && !(x.id in s.placements))!;
  s.placements[t.id] = { row: 0, col: 0, w: 1, h: 1 } as unknown as GameState['placements'][string];
}

// Somewhere to sleep's path (Plan 115D): the shortest run from beside the
// residence hall to the paths that join Founders Hall, as the harness's
// player lays it (sim/harness/moves.ts).
function pathed(s: GameState): void {
  for (const tile of pathToFoundersRoute(s)) s.pathways[pathTileKey(tile)] = true;
}

// A college teaching its pillars: Founders Hall standing, three programs
// housed and two courses each taught.
const teaching = () => teachPillars(createInitialState('Chapters'));
// At least n courses taught: the first n in the catalog, done.
function teachCourses(s: GameState, n: number): void {
  const courses = s.tech.filter((t) => t.kind === 'course');
  const more = n - courses.filter((t) => t.status === 'done').length;
  courses.filter((t) => t.status !== 'done').slice(0, Math.max(0, more)).forEach((t) => { t.status = 'done'; });
}
// Looking around's four required moves, made: the chapters after it open.
const looked = (s: GameState) => {
  s.guidance!.marked.push(LOOK_MARKS.pan, LOOK_MARKS.turn, LOOK_MARKS.tilt, LOOK_MARKS.zoom);
  return s;
};

// ---- A guided founding opens the first chapter, nothing met ----
{
  const s = reducer(createPreStartState(), {
    type: 'START_GAME', name: 'Chapters', vernacular: FOUNDING_VERNACULAR, colors: schoolColorsOf(FOUNDING_COLORS), guided: true,
  });
  assert(opened(s, 'founding') && currentChapter(s)?.id === 'founding', 'a guided founding opens Founding');
  assert(s.guidance!.met.length === 0, 'with no objective met: the hall is unsited, nobody appointed');
  assert(!opened(s, 'seats'), 'and nothing after it');
}

// ---- Met however the player gets there, and met for good ----
{
  const s = teaching();
  settleChapters(s);
  assert(done(s, 'founding'), 'a college teaching its pillars has done Founding');
  assert(objectiveMet(s, 'develop-second-course'), "a program's second course taught meets the course objective");
  assert(done(s, 'next-course'), 'The next course is done without the optional speed');
  assert(!objectiveMet(s, 'run-at-double'), 'which stays unmet');
  assert(currentChapter(s)?.id === 'looking-around', 'Looking around is the chapter');
  assert(!opened(s, 'somewhere-to-sleep'), 'and Somewhere to sleep waits for it');
  assert(!opened(s, 'seats'), 'nor is Seats for everyone open before it');

  for (const slots of Object.values(s.halls)) for (const slot of slots) slot.programId = null;
  settleChapters(s);
  assert(objectiveMet(s, 'found-first-program'), 'an objective stays met after its reading falls');

  const seatsRow = objectiveRows(s, CHAPTERS.find((c) => c.id === 'seats')!).find((r) => r.id === 'seat-every-student')!;
  assert(typeof seatsRow.progress === 'object' && seatsRow.progress.of === 350, 'a counted objective reads its figure');
  assert(objectiveRows(s, CHAPTERS.find((c) => c.id === 'next-course')!).find((r) => r.id === 'run-at-double')!.optional, 'the speed objective is optional');
  // Chapter 8 asks for the Faculty tab; a search is one way to fill a field (Plan 107B).
  const faculty = objectiveRows(s, CHAPTERS.find((c) => c.id === 'a-faculty')!);
  assert(faculty[0].id === 'open-faculty' && !faculty[0].optional, 'A faculty opens with the Faculty tab, required');
  assert(faculty.find((r) => r.id === 'post-a-search')!.optional, 'and posting a search is optional');
  assert(MARKED_TABS.has('faculty'), 'opening the Faculty tab is marked');
}

// ---- Seats for everyone counts what the NEXT line counts (Plan 114E, C3-5) ----
{
  const s = looked(teaching());
  s.students.classes.freshman += 400;
  const row = () => objectiveRows(s, CHAPTERS.find((c) => c.id === 'seats')!).find((r) => r.id === 'seat-every-student')!.progress as { n: number; of: number; coming?: number };
  assert(row().coming === row().n, `with no course under way the two counts agree (${row().n}, ${row().coming})`);
  const course = s.tech.find((t) => isUndergraduateCourse(t) && t.status === 'available' && isHoused(s, programOfCourse(t.id)!))!;
  course.status = 'developing';
  assert(row().coming === Math.min(placesComing(s), row().of) && row().coming! > row().n, `a course under way adds to the second count (${row().n}, ${row().coming})`);
  s.guidance = { opened: { seats: 1 }, done: {}, met: [], marked: [] };
  const html = renderToStaticMarkup(createElement(ObjectivesPanel, { s, waiting: null, onGo: () => {}, onOpenLadder: () => {} })).replace(/<[^>]+>/g, '');
  assert(html.includes(`${count(row().n)}/${count(row().of)} now · ${count(row().coming!)} once new courses start`), 'the drawer shows both');
}

// ---- The next chapter waits for its week, and opens already met ----
{
  const s = looked(teaching());
  s.clock.week = 5;
  site(s, isDorm);
  site(s, isDiningHall);
  pathed(s);
  settleChapters(s);
  assert(!opened(s, 'somewhere-to-sleep'), 'a residence hall, a dining hall and a path in week 5 do not open Somewhere to sleep');
  s.clock.week = 10;
  settleChapters(s);
  assert(opened(s, 'somewhere-to-sleep') && done(s, 'somewhere-to-sleep'), 'in week 10 it opens, and is done on the spot');
  assert(done(s, 'seats') && objectiveMet(s, 'seat-every-student'), 'and Seats for everyone after it, six courses seating 350 students');
}
{
  const s = looked(teaching());
  s.clock.week = 12;
  settleChapters(s);
  assert(currentChapter(s)?.id === 'somewhere-to-sleep', 'in week 12 Somewhere to sleep is the chapter');
  site(s, isDorm);
  settleChapters(s);
  assert(objectiveMet(s, 'site-residence-hall') && !done(s, 'somewhere-to-sleep'), 'a residence hall alone meets one objective');
  site(s, isDiningHall);
  settleChapters(s);
  assert(!done(s, 'somewhere-to-sleep') && !objectiveMet(s, PATH_OBJECTIVE), 'a residence hall and a dining hall sited, with no path, do not finish it');
  assert(ringedBuilding(s) === null && ringedTool(s) === 'paths', 'and the build menu rings Paths, no building');
  pathed(s);
  settleChapters(s);
  assert(done(s, 'somewhere-to-sleep'), 'a path from the residence hall to Founders Hall finishes it');
  assert(s.guidance!.done['somewhere-to-sleep'] === 12, 'done the week it was finished');
  assert(ringedTool(s) === null, 'and Paths is rung no more');
}

// ---- Somewhere to sleep's path (Plan 115D, the third review's C1-1) ----
{
  const s = looked(teaching());
  s.clock.week = 12;
  site(s, isDorm);
  site(s, isDiningHall);
  const drive = driveRoute(s);
  assert(drive.length > 0 && drive.every((tile) => pathTileKey(tile) in s.pathways), `the founding laid the drive (${drive.length} tiles)`);
  assert(!pathJoinsResidence(s), 'the drive alone does not meet it: it joins the hall to the road, not the residence hall');
  // A path from beside the residence hall to the drive's middle.
  const dorm = s.tech.find((t) => isDorm(t) && t.id in s.placements)!;
  s.placements[dorm.id] = { ...s.placements[dorm.id], row: drive[20].row, col: drive[20].col + 6 };
  for (let col = drive[20].col + 1; col <= drive[20].col + 5; col++) s.pathways[pathTileKey({ row: drive[20].row, col })] = true;
  assert(pathJoinsResidence(s), 'a path from the residence hall that joins the drive meets it');
  delete s.pathways[pathTileKey({ row: drive[20].row, col: drive[20].col + 3 })];
  assert(!pathJoinsResidence(s), 'a gap in it does not');
  s.pathways[pathTileKey({ row: drive[20].row + 1, col: drive[20].col + 3 })] = true;
  assert(pathJoinsResidence(s), 'a step to the side, corner to corner, still joins it');
  // A path under a building joins nothing.
  const other = { row: drive[20].row - 1, col: drive[20].col + 2, w: 3, h: 3 };
  s.placements['TEST-SHED'] = other as unknown as GameState['placements'][string];
  assert(!pathJoinsResidence(s), 'a path under a building joins nothing');
  delete s.placements['TEST-SHED'];
  settleChapters(s);
  assert(objectiveMet(s, PATH_OBJECTIVE) && done(s, 'somewhere-to-sleep'), 'met, the chapter is done');
  assert(CHAPTER_COPY['somewhere-to-sleep'].help?.[PATH_OBJECTIVE]?.door === 'build', 'its Show me opens the build menu');
}
{
  // A save already past the chapter, from before the path, keeps it done.
  const s = looked(teaching());
  s.clock.week = 40;
  site(s, isDorm);
  s.guidance!.opened = { founding: 1, 'next-course': 1, 'looking-around': 1, 'somewhere-to-sleep': 10, seats: 12, 'paying-for-it': 30 };
  s.guidance!.done = { founding: 1, 'next-course': 5, 'looking-around': 8, 'somewhere-to-sleep': 12, seats: 12 };
  settleChapters(s);
  assert(done(s, 'somewhere-to-sleep') && !objectiveMet(s, PATH_OBJECTIVE) && ringedTool(s) === null, 'a save past Somewhere to sleep without the path keeps it done, nothing rung');
}

// ---- The money and the first summer (PR D) ----
{
  let s = looked(teaching());
  s.clock.week = 12;
  site(s, isDorm);
  site(s, isDiningHall);
  pathed(s);
  settleChapters(s);
  assert(done(s, 'seats') && !opened(s, 'paying-for-it'), 'Paying for it waits for week 30');
  s.clock.week = 30;
  settleChapters(s);
  assert(currentChapter(s)?.id === 'paying-for-it', 'in week 30 it is the chapter');
  s = reducer(s, { type: 'MARK_GUIDANCE', mark: tabMark('treasury') });
  assert(done(s, 'paying-for-it'), 'the Treasury opened ends it, a surplus or not');
  assert(MARKED_TABS.has('treasury'), 'the shell marks the Treasury when it opens');
  assert(!opened(s, 'first-summer'), 'The first summer waits for week 46');
  s.clock.week = 46;
  settleChapters(s);
  assert(currentChapter(s)?.id === 'first-summer', 'in week 46 it is the chapter');
  s.history.push({ ...(s.history[0] ?? {}) } as GameState['history'][number]);
  settleChapters(s);
  assert(done(s, 'first-summer'), 'the summer closed ends it');
}

// ---- A run from before the objectives is caught up by its date ----
{
  const s = teaching();
  delete s.guidance;
  s.clock.year = 5;
  settleChapters(s);
  assert(CHAPTERS.filter((c) => c.earliest <= (5 - 1) * 52 + 1).every((c) => done(s, c.id)), 'a year-5 save has done every chapter its date has passed');
  assert(!opened(s, 'capital-projects'), 'and opens the later ones when their years come');
}
{
  const s = createInitialState('Chapters');
  delete s.guidance;
  s.clock.week = 5;
  s.faculty = [];
  settleChapters(s);
  assert(done(s, 'founding') && done(s, 'next-course'), 'a week-5 save has done the chapters its weeks passed');
  assert(!opened(s, 'somewhere-to-sleep') && !opened(s, 'seats'), 'and opens the rest in turn, from week 10');
}

// ---- A sandbox keeps no record ----
{
  const s = teaching();
  s.sandbox = true;
  const before = JSON.stringify(s.guidance);
  settleChapters(s);
  assert(JSON.stringify(s.guidance) === before, 'a sandbox run is not settled');
}

// ---- The reducer: settled after every action; a mark counts once ----
{
  let s = teaching();
  s = reducer(s, { type: 'TICK' });
  assert(done(s, 'next-course'), 'a tick settles the chapters');
  const marked = reducer(s, { type: 'MARK_GUIDANCE', mark: DOUBLE_SPEED_MARK });
  assert(marked !== s && marked.guidance!.marked.includes(DOUBLE_SPEED_MARK), 'MARK_GUIDANCE records the mark');
  assert(reducer(marked, { type: 'MARK_GUIDANCE', mark: DOUBLE_SPEED_MARK }) === marked, 'a second mark changes nothing');

  assert(saveGame(marked), 'a save with the objectives is written');
  const loaded = loadGame();
  assert(JSON.stringify(loaded?.guidance) === JSON.stringify(marked.guidance), 'and loads with them');
}

// ---- Words for every objective ----
for (const c of CHAPTERS) {
  assert(CHAPTER_COPY[c.id]?.title.length > 0, `${c.id} has a title`);
  for (const o of c.objectives) assert((CHAPTER_COPY[c.id].objectives[o.id] ?? '').length > 0, `${c.id}'s ${o.id} has words`);
}
assert(new Set(CHAPTERS.flatMap((c) => c.objectives.map((o) => o.id))).size === CHAPTERS.flatMap((c) => c.objectives).length, 'objective ids are unique');
// The pages (Plan 106 §5, Plan 112A): every chapter the drawer shows has
// its paragraph, kept short by rule, and every objective its help; no
// sentence ends on a passive and a pronoun.
for (const c of CHAPTERS) {
  const copy = CHAPTER_COPY[c.id];
  for (const o of c.objectives) assert((copy.help?.[o.id]?.text ?? '').length > 0, `${c.id}'s ${o.id} has help`);
  assert(Object.keys(copy.help ?? {}).every((id) => c.objectives.some((o) => o.id === id)), `${c.id}: no help for an objective it does not set`);
  if (c.id === 'founding') continue;
  assert(hasPage(c.id) && copy.about !== undefined, `${c.id} has a page`);
  const sentences = (copy.about ?? '').split(/(?<=\.)\s+/).length;
  assert(sentences <= 3, `${c.id}: about in three sentences at most (${sentences})`);
  const all = [copy.about, ...Object.values(copy.help ?? {}).map((h) => h.text)].join(' ');
  assert(!/\b(by|to|for|with|from|in|on|of) (it|them)[.;]/.test(all), `${c.id}: no sentence ends on a pronoun`);
}
assert(!hasPage('founding'), 'the founding has no page: the walkthrough teaches it');

// ---- Looking around (F7): the camera's moves, before Somewhere to sleep ----
{
  let s = teaching();
  settleChapters(s);
  const around = CHAPTERS.find((c) => c.id === 'looking-around')!;
  assert(opened(s, 'looking-around') && currentChapter(s)?.id === 'looking-around', 'The next course done, Looking around is the chapter');
  const rows = objectiveRows(s, around);
  assert(['look-pan', 'look-turn', 'look-tilt', 'look-zoom'].every((id) => !rows.find((r) => r.id === id)!.optional), 'pan, turn, tilt and zoom are required');
  assert(rows.find((r) => r.id === 'look-home')!.optional, 'and Home is optional');

  s.clock.week = 10;
  settleChapters(s);
  assert(!opened(s, 'somewhere-to-sleep'), 'it holds Somewhere to sleep back, week 10 or not');
  for (const move of ['pan', 'turn', 'tilt'] as const) s = reducer(s, { type: 'MARK_GUIDANCE', mark: LOOK_MARKS[move] });
  assert(objectiveMet(s, 'look-turn') && !done(s, 'looking-around'), 'three moves meet three objectives, zoom still waiting');
  s = reducer(s, { type: 'MARK_GUIDANCE', mark: LOOK_MARKS.zoom });
  assert(done(s, 'looking-around') && !objectiveMet(s, 'look-home'), 'the fourth finishes it, without Home');
  assert(currentChapter(s)?.id === 'somewhere-to-sleep', 'and Somewhere to sleep opens');

  const early = looked(teaching());
  settleChapters(early);
  assert(done(early, 'looking-around'), 'moves made before it opens count: it opens met');

  const before = teaching();
  before.clock.week = 12;
  before.guidance = { opened: { founding: 1, 'next-course': 1, 'somewhere-to-sleep': 10 }, done: { founding: 1, 'next-course': 5 }, met: [], marked: [] };
  settleChapters(before);
  assert(done(before, 'looking-around') && currentChapter(before)?.id === 'somewhere-to-sleep', 'a save already past its place has it caught up, not held back');
}

// ---- PR B: the ticker's chapter chip and the drawer ----
{
  const s = teaching();
  settleChapters(s);
  s.guidance!.done = { founding: 1, 'next-course': 5, 'somewhere-to-sleep': 12 };
  s.guidance!.opened = { founding: 1, 'next-course': 1, 'somewhere-to-sleep': 10, seats: 12 };
  s.guidance!.met = s.guidance!.met.filter((id) => id !== 'seat-every-student');
  s.students.classes.freshman += 1000;
  const props = {
    s, open: false, onSetOpen: () => {}, ladderOpen: false, onSetLadderOpen: () => {},
    objectivesOpen: false, onSetObjectivesOpen: () => {}, onGo: () => {}, inboxOpen: false,
  };
  setSettings({ objectives: 'guided' });
  const strip = renderToStaticMarkup(createElement(LogTicker, props));
  assert(strip.includes('Chapter 5') && strip.includes('A place in class for every student'), 'the strip names the chapter and its first objective not met');
  assert(/\d+\/1,350/.test(strip), `with its count (${strip.match(/[\d,]+\/[\d,]+/)?.[0]})`);
  assert(!strip.includes('>Milestone<'), 'and no milestone chip');
  const drawer = renderToStaticMarkup(createElement(LogTicker, { ...props, objectivesOpen: true }));
  assert(drawer.includes('objectives-popup') && drawer.includes('Seats for everyone'), 'open, the drawer shows the chapter');
  assert(drawer.includes('All milestones'), 'and the milestones');

  setSettings({ objectives: 'off' });
  const off = renderToStaticMarkup(createElement(LogTicker, props));
  assert(!off.includes('Chapter 4') && off.includes('>Milestone<'), 'Off keeps the strip as it was');
  setSettings({ objectives: 'guided' });

  const walking = structuredClone(s);
  walking.events.opening.stage = 'found';
  assert(!objectivesShown(walking, 'guided'), 'no chapters while the walkthrough is up');
  assert(!objectivesShown({ ...s, sandbox: true }, 'guided'), 'nor in a sandbox');

  // The chapter's page (Plan 112A): its paragraph, and each objective with
  // a (?) whose help holds the Show me; no headings, no why.
  let went: string | undefined;
  const panel = createElement(ObjectivesPanel, { s, waiting: { text: 'History is dark: staff it', go: 'faculty', urgent: true }, onGo: (go: string) => { went = go; }, onOpenLadder: () => {} });
  const html = renderToStaticMarkup(panel);
  assert(html.includes('Every student needs a place in class') && !html.includes('What it is') && !html.includes('Why it matters'), 'a page shows its paragraph, with no headings and no why');
  assert(html.includes('help-hint-btn') && html.includes('aria-label="How to: A place in class for every student"') && html.includes('aria-expanded="false"'), 'each objective has a (?), shut');
  assert(!html.includes('Develop more courses in the Curriculum'), 'its help waits behind it');
  assert(html.includes('Also waiting') && html.includes('History is dark'), 'the NEXT line waits in the drawer');
  const showMe = findButton(panel, 'Show me');
  showMe?.();
  assert(went === 'curriculum', 'Show me opens its view');

  const early = teaching();
  settleChapters(early);
  early.guidance!.done = { founding: 1 };
  early.guidance!.met = early.guidance!.met.filter((id) => id !== 'develop-second-course');
  const earlyHtml = renderToStaticMarkup(createElement(ObjectivesPanel, { s: early, waiting: null, onGo: () => {}, onOpenLadder: () => {} }));
  assert(earlyHtml.includes('The next course') && earlyHtml.includes('(optional)'), 'an optional objective says so');
}

// ---- PR E: years 2 and 3, and the gates ----
{
  // Only a guided founding is gated.
  const guided = reducer(createPreStartState(), {
    type: 'START_GAME', name: 'Gates', vernacular: FOUNDING_VERNACULAR, colors: schoolColorsOf(FOUNDING_COLORS), guided: true,
  });
  assert(guided.guidance?.gated === true, 'a guided founding is gated');
  assert(createInitialState('Headless').guidance?.gated === undefined, 'a headless one is not');
  assert(chapterGateOpen(createInitialState('Headless'), MATTERS_CHAPTER), 'and its gates stand open');

  // A gated year-3 college with Campus life not yet open: no matter, no
  // demand, for two years of quiet weeks; then, the chapter open, they come.
  bindScriptStream(10601);
  const play = (start: GameState, weeks: number) => {
    let x = start;
    for (let i = 0; i < weeks; i += 1) x = x.pendingInterrupt ? reducer(x, defaultAnswer(x)!) : reducer(x, { type: 'TICK' });
    return x;
  };
  const base = teaching();
  base.clock.year = 3;
  settleChapters(base);
  base.guidance = { opened: { founding: 1, 'next-course': 1 }, done: { founding: 1 }, met: [], marked: [], gated: true };
  base.events.opening.read = [];
  base.events.opening.skipped = true;
  const held = play(structuredClone(base), 104);
  assert(!chapterGateOpen(held, MATTERS_CHAPTER) && Object.keys(held.events.decisionHistory).length === 0 && (held.catalogue?.pending.length ?? 0) === 0 && held.events.activeDemand === null,
    `a gated college with Campus life shut gets no matter and no demand (${Object.keys(held.events.decisionHistory).join(',')})`);

  const off = structuredClone(base);
  off.guidance!.marked.push(OBJECTIVES_OFF_MARK);
  assert(chapterGateOpen(off, MATTERS_CHAPTER) && chapterGateOpen(off, ATHLETICS_CHAPTER), 'Off opens every gate');
  const open = structuredClone(base);
  open.guidance!.opened['campus-life'] = 105;
  assert(chapterGateOpen(open, MATTERS_CHAPTER) && !chapterGateOpen(open, ATHLETICS_CHAPTER), 'Campus life open opens the matters, not the Athletics tab');
  const freed = play(open, 104);
  assert(Object.keys(freed.events.decisionHistory).length > 0 || (freed.catalogue?.lastInlineWeek ?? 0) > 0, 'and with it open, matters come');

  // Athletics in its chapter (Plan 113C, the third review's I7-2): a sport
  // club past its tenure, the mascot still to name. With Campus life shut,
  // two years bring no varsity petition and no mascot stop. The petition
  // never stamps decisionHistory, so read the stops seen and varsityAsked.
  const seen = (start: GameState, weeks: number) => {
    let x = start;
    const stops: string[] = [];
    for (let i = 0; i < weeks; i += 1) {
      if (x.pendingInterrupt) {
        const p = x.pendingInterrupt;
        stops.push(p.type === 'decision-event' ? (p.payload as { eventId: string }).eventId : p.type);
        x = reducer(x, defaultAnswer(x)!);
      } else x = reducer(x, { type: 'TICK' });
    }
    return { x, stops };
  };
  const sporty = structuredClone(base);
  sporty.self.mascot = '';
  sporty.orgs.mascotBeatPending = true;
  sporty.orgs.clubs.push({ id: 'club-gates-sport', name: 'Gates Rowing Club', foundedYear: 0, foundingMembers: 20, foundingEnrolled: 300, upkeepPerWeek: 0, sport: SPORTS[0].id, varsityLastAskedYear: null });
  const shut = seen(structuredClone(sporty), 104);
  assert(!shut.stops.includes('varsity-petition') && !varsityAsked(shut.x), `with Campus life shut, no varsity petition (${shut.stops.join(',')})`);
  assert(!shut.stops.includes('first-sport-club') && shut.x.orgs.mascotBeatPending, 'and no mascot stop, still pending');
  const lifeOpen = structuredClone(sporty);
  lifeOpen.guidance!.opened['campus-life'] = 105;
  const asked = seen(lifeOpen, 104);
  const petition = asked.stops.indexOf('varsity-petition');
  const mascotStop = asked.stops.indexOf('first-sport-club');
  assert(petition >= 0 && varsityAsked(asked.x), `with it open, the petition comes (${asked.stops.join(',')})`);
  assert(mascotStop > petition, `then the mascot stop, once The teams opens (${petition}, ${mascotStop})`);
}
{
  // The hall chapter waits for the first academic hall to be buildable.
  const s = teaching();
  s.clock.year = 2;
  s.clock.week = 30;
  const doneBefore = ['founding', 'next-course', 'somewhere-to-sleep', 'seats', 'paying-for-it', 'first-summer', 'standing', 'a-faculty'];
  s.guidance = { opened: Object.fromEntries(doneBefore.map((id) => [id, 1])), done: Object.fromEntries(doneBefore.map((id) => [id, 1])), met: [], marked: [] };
  for (const t of s.tech) if (isAcademicHall(t) && t.id !== FOUNDERS_HALL_ID) t.status = 'locked';
  settleChapters(s);
  assert(!opened(s, 'hall-of-its-own'), 'with no academic hall to build, A hall of its own waits');
  const elm = s.tech.find((t) => isAcademicHall(t) && t.id !== FOUNDERS_HALL_ID)!;
  elm.status = 'available';
  settleChapters(s);
  assert(currentChapter(s)?.id === 'hall-of-its-own', 'once one is, it opens');
}
{
  // Standing's live readout: prestige and which way it is heading, the
  // glance's pillar meters, satisfaction (Plan 114B: no target, no "of").
  const s = teaching();
  s.clock.year = 2;
  settleChapters(s);
  s.guidance = { opened: { standing: 53 }, done: Object.fromEntries(['founding', 'next-course', 'somewhere-to-sleep', 'seats', 'paying-for-it', 'first-summer'].map((id) => [id, 1])), met: [], marked: [] };
  s.guidance.opened = { ...s.guidance.done, standing: 53 };
  const html = renderToStaticMarkup(createElement(ObjectivesPanel, { s, waiting: null, onGo: () => {}, onOpenLadder: () => {} }));
  assert(html.includes('Standing') && /Prestige [\d.]+, (rising|falling|steady)</.test(html), 'Standing reads prestige and which way it is heading');
  assert(PILLARS.every((p) => html.includes(`glance-pillar pillar-${p}`)) && html.includes('Satisfaction '), 'with the glance\'s meter per pillar, and the satisfaction');
  const live = html.slice(html.indexOf('objectives-live')).replace(/<[^>]+>/g, ' ');
  assert(!/target/i.test(live) && !/heading for/.test(live) && !/\d of \d/.test(live), `no drawer word says "target", or a pillar "of" its most (${live})`);
  const words = [CHAPTER_COPY.standing.about ?? '', ...Object.values(CHAPTER_COPY.standing.objectives), ...Object.values(CHAPTER_COPY.standing.help ?? {}).map((h) => h.text)];
  assert(words.every((w) => !/target/i.test(w)), 'and no Standing word does either');
}

// ---- PR F: years 4 and 5, a side chapter, and the Athletics tab ----
{
  const chain = ['founding', 'next-course', 'looking-around', 'somewhere-to-sleep', 'seats', 'paying-for-it', 'first-summer', 'standing', 'a-faculty', 'hall-of-its-own', 'campus-life'];
  const s = teaching();
  s.clock.year = 4;
  s.clock.week = 30;
  s.guidance = { opened: Object.fromEntries(chain.map((id) => [id, 1])), done: Object.fromEntries(chain.map((id) => [id, 1])), met: [], marked: [], gated: true };
  settleChapters(s);
  assert(!opened(s, 'the-teams'), 'with no sport club, The teams stays shut');
  assert(currentChapter(s)?.id === 'running-the-college', 'and the chain goes on without it: Running the college');
  assert(!tabAvailable(s, 'athletics'), 'a gated run has no Athletics tab before its chapter');

  // A sport club alone opens nothing (Plan 112B): the petition does.
  s.orgs.clubs.push({ ...s.orgs.clubs[0], id: 'club-soccer', sport: 'soccer', varsityLastAskedYear: null } as GameState['orgs']['clubs'][number]);
  settleChapters(s);
  assert(!opened(s, 'the-teams') && !tabAvailable(s, 'athletics'), 'a sport club alone opens neither The teams nor the Athletics tab');
  s.orgs.clubs.at(-1)!.varsityLastAskedYear = 4;
  s.ladder.reached.sport = 4;
  settleChapters(s);
  assert(!opened(s, 'the-teams') && !tabAvailable(s, 'athletics'), 'a petition alone, turned down, opens neither (Plan 114E)');
  s.orgs.teams.push({ id: 'team-soccer', sport: 'soccer', status: 'awaitingVenue', venueCategory: 'soccerField' } as unknown as GameState['orgs']['teams'][number]);
  settleChapters(s);
  assert(opened(s, 'the-teams'), 'a varsity team opens The teams beside the chain');
  assert(tabAvailable(s, 'athletics'), 'and with it the Athletics tab');
  // The ticker and the drawer show the main chapter over a side one, and
  // the Guide lists the side one first (Plan 114E, C3-2).
  assert(currentChapter(s)?.id === 'running-the-college', `the main chapter is current, not the side one (${currentChapter(s)?.id})`);
  assert(openSideChapters(s).map((c) => c.id).join(',') === 'the-teams', 'and The teams is open beside it');
  const drawer = renderToStaticMarkup(createElement(ObjectivesPanel, { s, waiting: null, onGo: () => {}, onOpenLadder: () => {}, onView: () => {} }));
  const guideAt = drawer.indexOf('objectives-guide');
  assert(guideAt > 0 && drawer.indexOf('The teams', guideAt) > guideAt && drawer.slice(guideAt).includes('open now'), 'the Guide names The teams, open now');
  assert(nextChapter(s)?.id !== 'the-teams', 'and never names a side chapter as coming next');

  const ungated = structuredClone(s);
  delete ungated.guidance!.gated;
  ungated.guidance!.opened = {};
  assert(tabAvailable(ungated, 'athletics') === ladderOpensTab(ungated, 'athletics'), 'an ungated run opens Athletics by the ladder alone');

  s.seats = [{ seatId: 'provost', school: null, holder: 'x', internal: false, policy: 'p', salary: 1 } as NonNullable<GameState['seats']>[number]];
  s.clock.year = 5;
  s.clock.week = 1;
  settleChapters(s);
  assert(!done(s, 'running-the-college'), `a Provost alone does not end Running the college: it wants ${COURSE_MILESTONES['running-the-college']} courses taught`);
  teachCourses(s, COURSE_MILESTONES['running-the-college']);
  settleChapters(s);
  assert(done(s, 'running-the-college') && currentChapter(s)?.id !== 'running-the-college', 'a Provost and the courses end it');
  assert(nextChapter(s) === null, 'and it is the last of the chain: no Long game after it (Plan 112A)');
}

// ---- PR G: the Guide ----
{
  for (const [tab, id] of Object.entries(TAB_GUIDE)) {
    assert(CHAPTERS.some((c) => c.id === id) && hasPage(id!), `the ${tab} tab's Guide names a chapter with a page (${id})`);
  }
  const s = teaching();
  s.clock.year = 2;
  const met = ['founding', 'next-course', 'somewhere-to-sleep', 'seats', 'paying-for-it', 'first-summer'];
  s.guidance = { opened: { ...Object.fromEntries(met.map((id) => [id, 1])), standing: 53 }, done: Object.fromEntries(met.map((id) => [id, 1])), met: [], marked: [] };
  const guide = guideChapters(s).map((c) => c.id);
  assert(guide.join(',') === 'next-course,somewhere-to-sleep,seats,paying-for-it,first-summer,standing', `the Guide lists every chapter met with a page, in order (${guide.join(',')})`);
  const page = (view: string | null) => renderToStaticMarkup(createElement(ObjectivesPanel, { s, waiting: null, onGo: () => {}, onOpenLadder: () => {}, view, onView: () => {} }));
  const back = page('paying-for-it');
  assert(back.includes('Back to the objectives') && back.includes('Paying for it') && !back.includes('Also waiting'), 'a page of the Guide reads that chapter, with the way back');
  assert(!page('standing').includes('Back to the objectives'), "the current chapter's page is the objectives themselves");
  assert(page(null).includes('Read again') && page(null).includes('The first summer'), 'the drawer lists the Guide to read again');
  const tab = renderToStaticMarkup(createElement(TabOverlay, { title: 'History', onClose: () => {}, onGuide: () => {}, children: null }));
  assert(tab.includes('tab-overlay-guide') && tab.includes('The Guide on History'), "a tab carries its Guide button");
  assert(!renderToStaticMarkup(createElement(TabOverlay, { title: 'Research', onClose: () => {}, children: null })).includes('tab-overlay-guide'), 'and a tab with no chapter has none');
}

// ---- PR H: past the first five years, as side chapters ----
{
  const s = teaching();
  s.clock.year = 6;
  s.clock.week = 1;
  settleChapters(s);
  delete s.guidance;
  settleChapters(s);
  for (const id of ['research', 'alumni', 'capital-projects', 'specialization']) {
    assert(CHAPTERS.find((c) => c.id === id)?.side === true, `${id} is a side chapter`);
  }
  // A fresh record at year 6, the first five years done.
  const firstFive = CHAPTERS.filter((c) => c.earliest <= (5 - 1) * 52 + 1 && c.id !== 'research').map((c) => c.id);
  s.guidance = { opened: Object.fromEntries(firstFive.map((id) => [id, 1])), done: Object.fromEntries(firstFive.map((id) => [id, 1])), met: [], marked: [] };
  s.alumni = [];
  settleChapters(s);
  assert(!opened(s, 'research'), 'Research waits for a founded school');
  assert(!opened(s, 'alumni'), 'The alumni waits for a class out in the world');
  s.milestones['school-founded:Social Sciences & Humanities'] = true as never;
  settleChapters(s);
  assert(currentChapter(s)?.id === 'research', 'a school founded opens Research');
  assert(!opened(s, 'capital-projects') && !opened(s, 'specialization'), 'capital projects and the specialization wait for their years');
  s.clock.year = 15;
  settleChapters(s);
  assert(opened(s, 'capital-projects') && opened(s, 'specialization'), 'by year 15 both are open, Research unfinished or not');
  s.specializationOffered = 15;
  settleChapters(s);
  assert(done(s, 'specialization'), 'the board offering the choice ends the specialization chapter');
  assert(TAB_GUIDE.research === 'research', "and the Research tab's Guide names it");
}

// ---- Plan 112: the curriculum's milestones ----
{
  const milestones = Object.entries(COURSE_MILESTONES);
  assert(milestones.map(([, n]) => n).every((n, i, all) => i === 0 || n > all[i - 1]), 'the counts rise chapter by chapter');
  assert(COURSE_MILESTONES['a-faculty'] === FIRST_HALL_COURSE_GATE, 'the first is the count that opens the first academic hall');
  for (const [id, n] of milestones) {
    const c = CHAPTERS.find((x) => x.id === id)!;
    const o = c.objectives.find((x) => x.id === teachObjective(n));
    assert(o !== undefined && !o.optional, `${id} requires ${n} courses taught`);
    assert(CHAPTER_COPY[c.id].objectives[teachObjective(n)] === `Teach ${n} courses`, `${id}: "Teach ${n} courses"`);
    assert(CHAPTER_COPY[c.id].help![teachObjective(n)].door === 'curriculum', `${id}: its Show me opens the Curriculum`);
  }
  const s = teaching();
  const faculty = CHAPTERS.find((c) => c.id === 'a-faculty')!;
  const row = objectiveRows(s, faculty).find((r) => r.id === teachObjective(FIRST_HALL_COURSE_GATE))!;
  assert(typeof row.progress === 'object' && row.progress.n === 6 && row.progress.of === FIRST_HALL_COURSE_GATE, `it reads n of N (${JSON.stringify(row.progress)})`);

  // A faculty waits for the courses, whatever else is met.
  const chain = ['founding', 'next-course', 'looking-around', 'somewhere-to-sleep', 'seats', 'paying-for-it', 'first-summer', 'standing'];
  s.clock.year = 2;
  s.clock.week = 20;
  s.guidance = { opened: Object.fromEntries(chain.map((id) => [id, 1])), done: Object.fromEntries(chain.map((id) => [id, 1])), met: [], marked: [tabMark('faculty')] };
  settleChapters(s);
  assert(currentChapter(s)?.id === 'a-faculty' && !done(s, 'a-faculty'), 'six courses taught hold A faculty open');
  teachCourses(s, FIRST_HALL_COURSE_GATE);
  settleChapters(s);
  assert(done(s, 'a-faculty'), 'the eighth ends it');
}

// ---- Plan 112: the rings and the help that reads the college ----
{
  // Paying for it rings the funds figure until the Treasury is opened.
  let s = looked(teaching());
  s.clock.week = 30;
  site(s, isDorm);
  site(s, isDiningHall);
  pathed(s);
  settleChapters(s);
  assert(currentChapter(s)?.id === 'paying-for-it' && treasuryRinged(s), 'Paying for it rings the Treasury button');
  s = reducer(s, { type: 'MARK_GUIDANCE', mark: tabMark('treasury') });
  assert(!treasuryRinged(s), 'until the Treasury is opened');
}
{
  // A hall of its own rings the first academic hall, and opens the build
  // menu on it, until it is placed.
  const s = teaching();
  s.clock.year = 2;
  s.clock.week = 30;
  const before = ['founding', 'next-course', 'looking-around', 'somewhere-to-sleep', 'seats', 'paying-for-it', 'first-summer', 'standing', 'a-faculty'];
  s.guidance = { opened: Object.fromEntries(before.map((id) => [id, 1])), done: Object.fromEntries(before.map((id) => [id, 1])), met: [], marked: [] };
  const elm = s.tech.find((t) => t.id === academicHallId(0))!;
  elm.status = 'available';
  settleChapters(s);
  assert(currentChapter(s)?.id === 'hall-of-its-own' && ringedBuilding(s)?.id === elm.id, `the build menu rings the first academic hall (${ringedBuilding(s)?.id})`);
  assert(objectiveHelp(s, 'hall-of-its-own', 'site-academic-hall')?.door === 'build', 'and its help opens the build menu');
  elm.status = 'locked';
  assert(objectiveHelp(s, 'hall-of-its-own', 'site-academic-hall') === HALL_LOCKED_HELP && HALL_LOCKED_HELP.door === 'curriculum', 'locked, its help says what opens it and shows the Curriculum');
  elm.status = 'available';
  site(s, (t) => t.id === elm.id);
  settleChapters(s);
  assert(ringedBuilding(s) === null, 'placed, the ring goes');
}

// ---- Plan 112: Promises and The long game gone; Research and the park ----
{
  assert(!CHAPTERS.some((c) => (c.id as string) === 'promises' || (c.id as string) === 'the-long-game'), 'Promises and The long game are no chapters');
  assert(!CHAPTERS.find((c) => c.id === 'research')!.objectives.some((o) => o.id === 'answer-the-charter'), 'Research asks nothing of the charter, which comes by itself');

  // An old save that opened both settles, and goes on to the chapter after.
  const s = teaching();
  s.clock.year = 5;
  s.clock.week = 10;
  const chain = ['founding', 'next-course', 'looking-around', 'somewhere-to-sleep', 'seats', 'paying-for-it', 'first-summer', 'standing', 'a-faculty', 'hall-of-its-own', 'campus-life', 'promises'];
  s.guidance = { opened: { ...Object.fromEntries(chain.map((id) => [id, 1])), 'the-long-game': 200 }, done: Object.fromEntries(chain.map((id) => [id, 1])), met: ['third-summer', 'set-a-sweep'], marked: [], gated: true };
  settleChapters(s);
  assert(currentChapter(s)?.id === 'running-the-college', `an old save with Promises and The long game open settles on Running the college (${currentChapter(s)?.id})`);
  assert(guideChapters(s).every((c) => hasPage(c.id)), 'and its Guide lists only chapters that exist');
  const html = renderToStaticMarkup(createElement(ObjectivesPanel, { s, waiting: null, onGo: () => {}, onOpenLadder: () => {}, view: 'promises', onView: () => {} }));
  assert(html.includes('Running the college'), 'a Guide page asked for a gone chapter reads the current one');
  assert(saveGame(s) && loadGame()?.guidance?.opened['the-long-game'] === 200, 'and it saves and loads as it was');

  // The Research Park's chapter opens with the park.
  const p = teaching();
  p.clock.year = 16;
  settleChapters(p);
  const park = p.tech.find((t) => t.id === RESEARCH_PARK_ID)!;
  park.status = 'locked';
  settleChapters(p);
  assert(!opened(p, 'research-park'), 'The Research Park waits for the park to open');
  park.status = 'available';
  settleChapters(p);
  assert(opened(p, 'research-park') && !done(p, 'research-park') && CHAPTERS.find((c) => c.id === 'research-park')!.side === true, 'opens beside the chain once it does');
  site(p, (t) => t.id === RESEARCH_PARK_ID);
  settleChapters(p);
  assert(done(p, 'research-park'), 'and the park placed ends it');
}

// ---- PR I: the chapters in the play statistics ----
{
  const s = teaching();
  settleChapters(s);
  const before = structuredClone(s);
  before.guidance = { opened: { founding: 1 }, done: {}, met: [], marked: [] };
  const after = structuredClone(before);
  after.guidance = { opened: { founding: 1, 'next-course': 3 }, done: { founding: 3 }, met: [], marked: ['read:next-course'] };
  const names = stateEvents(before, after).map((e) => `${e.name}:${String(e.fields.chapter)}`);
  assert(names.includes('chapter_opened:next-course') && names.includes('chapter_done:founding') && names.includes('briefing_read:next-course'),
    `opened, done and read are sent (${names.join(', ')})`);
  const doneEvent = stateEvents(before, after).find((e) => e.name === 'chapter_done')!;
  assert(doneEvent.fields.weeks_open === 2 && eventFits('chapter_done', doneEvent.fields), 'with the weeks the chapter was open, fitting its entry');
  const old = structuredClone(before);
  delete old.guidance;
  assert(stateEvents(old, after).every((e) => !e.name.startsWith('chapter_')), 'an old save caught up all at once sends nothing');
  assert(eventFits('guide_opened', { chapter: 'standing', from: 'tab' }) && !eventFits('guide_opened', { chapter: 'nothing', from: 'tab' }), 'guide_opened takes only a known chapter');
  assert(CHAPTERS.every((c) => CHAPTER_IDS.includes(c.id)), 'every chapter can be named');
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
