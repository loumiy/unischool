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
// drawer's briefing, Show me and what else waits, and Off as it was.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { createInitialState, createPreStartState } from '../src/state/actions';
import { reducer } from '../src/engine/reducer';
import { CHAPTERS, currentChapter, DOUBLE_SPEED_MARK, LOOK_MARKS, MARKED_TABS, guideChapters, nextChapter, objectiveMet, objectiveRows, settleChapters, tabMark } from '../src/state/chapters';
import { tabAvailable } from '../src/components/TabNav';
import { ladderOpensTab } from '../src/systems/ladder/ladderSystem';
import { CHAPTER_COPY, TAB_GUIDE } from '../src/data/chapterData';
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
import { chapterGateOpen, MATTERS_CHAPTER, OBJECTIVES_OFF_MARK, PROMISES_CHAPTER } from '../src/systems/guidance/gates';
import { bindScriptStream } from '../src/engine/random';
import { defaultAnswer } from '../src/engine/defaultAnswers';
import { FOUNDERS_HALL_ID, isAcademicHall } from '../src/data/techData';

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

// A college teaching its pillars: Founders Hall standing, three programs
// housed and two courses each taught.
const teaching = () => teachPillars(createInitialState('Chapters'));

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
  assert(!opened(s, 'somewhere-to-sleep'), 'Somewhere to sleep waits for week 10');
  assert(currentChapter(s)?.id === 'looking-around', 'and Looking around fills the weeks before it');
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

// ---- The next chapter waits for its week, and opens already met ----
{
  const s = teaching();
  s.clock.week = 5;
  site(s, isDorm);
  site(s, isDiningHall);
  settleChapters(s);
  assert(!opened(s, 'somewhere-to-sleep'), 'a residence hall and a dining hall in week 5 do not open Somewhere to sleep');
  s.clock.week = 10;
  settleChapters(s);
  assert(opened(s, 'somewhere-to-sleep') && done(s, 'somewhere-to-sleep'), 'in week 10 it opens, and is done on the spot');
  assert(done(s, 'seats') && objectiveMet(s, 'seat-every-student'), 'and Seats for everyone after it, six courses seating 350 students');
}
{
  const s = teaching();
  s.clock.week = 12;
  settleChapters(s);
  assert(currentChapter(s)?.id === 'somewhere-to-sleep', 'in week 12 Somewhere to sleep is the chapter');
  site(s, isDorm);
  settleChapters(s);
  assert(objectiveMet(s, 'site-residence-hall') && !done(s, 'somewhere-to-sleep'), 'a residence hall alone meets one objective');
  site(s, isDiningHall);
  settleChapters(s);
  assert(done(s, 'somewhere-to-sleep'), 'a residence hall and a dining hall sited finish it');
  assert(s.guidance!.done['somewhere-to-sleep'] === 12, 'done the week it was finished');
}

// ---- The money and the first summer (PR D) ----
{
  let s = teaching();
  s.clock.week = 12;
  site(s, isDorm);
  site(s, isDiningHall);
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
// The briefings (Plan 106 §5): every chapter the drawer shows has one, kept
// short by rule; no sentence ends on a passive and a pronoun.
for (const c of CHAPTERS.filter((x) => x.id !== 'founding')) {
  const b = CHAPTER_COPY[c.id].briefing;
  assert(b !== undefined, `${c.id} has a briefing`);
  if (!b) continue;
  const sentences = b.what.split(/(?<=\.)\s+/).length;
  assert(sentences <= 3, `${c.id}: what it is in three sentences at most (${sentences})`);
  assert(b.how.length >= 1 && b.how.length <= 4, `${c.id}: one to four levers (${b.how.length})`);
  assert(b.why.length >= 2 && b.why.length <= 4, `${c.id}: two to four links (${b.why.length})`);
  const all = [b.what, ...b.how.map((h) => h.text), ...b.why.map((y) => y.text)].join(' ');
  assert(!/\b(by|to|for|with|from|in|on|of) (it|them)[.;]/.test(all), `${c.id}: no sentence ends on a pronoun`);
}

// ---- Looking around (F7): the camera, a chapter that steps aside ----
{
  let s = teaching();
  settleChapters(s);
  const around = CHAPTERS.find((c) => c.id === 'looking-around')!;
  assert(opened(s, 'looking-around') && !done(s, 'looking-around'), 'The next course done, Looking around opens');
  assert(objectiveRows(s, around).every((r) => !r.optional), 'every camera move is asked for');
  for (const move of ['pan', 'turn', 'tilt', 'zoom'] as const) s = reducer(s, { type: 'MARK_GUIDANCE', mark: LOOK_MARKS[move] });
  assert(objectiveMet(s, 'look-turn') && !done(s, 'looking-around'), 'four moves meet four objectives, Home still waiting');

  s.clock.week = 10;
  settleChapters(s);
  assert(opened(s, 'somewhere-to-sleep'), 'it holds nothing back: Somewhere to sleep opens in week 10');
  assert(currentChapter(s)?.id === 'somewhere-to-sleep', 'and is the chapter shown, Looking around stepping aside');
  s = reducer(s, { type: 'MARK_GUIDANCE', mark: LOOK_MARKS.home });
  assert(done(s, 'looking-around'), 'Home finishes it');

  const early = teaching();
  early.guidance = { opened: {}, done: {}, met: [], marked: Object.values(LOOK_MARKS), gated: true };
  settleChapters(early);
  assert(done(early, 'looking-around'), 'moves made before it opens count: it opens met');
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
  assert(strip.includes('Chapter 5') && strip.includes('Places for every student'), 'the strip names the chapter and its first objective not met');
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

  // The chapter's briefing: what, how with its Show me, why.
  let went: string | undefined;
  const panel = createElement(ObjectivesPanel, { s, waiting: { text: 'History is dark: staff it', go: 'faculty', urgent: true }, onGo: (go: string) => { went = go; }, onOpenLadder: () => {} });
  const html = renderToStaticMarkup(panel);
  assert(html.includes('What it is') && html.includes('Every student needs a place in the catalog') && html.includes('Show me') && html.includes('→ Satisfaction:'), 'a briefing shows its what, how and why');
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
  assert((held.promises?.offer ?? null) === null && (held.promises?.active.length ?? 0) === 0, 'and no promise');

  const off = structuredClone(base);
  off.guidance!.marked.push(OBJECTIVES_OFF_MARK);
  assert(chapterGateOpen(off, MATTERS_CHAPTER) && chapterGateOpen(off, PROMISES_CHAPTER), 'Off opens every gate');
  const open = structuredClone(base);
  open.guidance!.opened['campus-life'] = 105;
  assert(chapterGateOpen(open, MATTERS_CHAPTER) && !chapterGateOpen(open, PROMISES_CHAPTER), 'Campus life open opens the matters, not the promises');
  const freed = play(open, 104);
  assert(Object.keys(freed.events.decisionHistory).length > 0 || (freed.catalogue?.lastInlineWeek ?? 0) > 0, 'and with it open, matters come');
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
  // Standing's live readout: prestige and its target, the pulls, satisfaction.
  const s = teaching();
  s.clock.year = 2;
  settleChapters(s);
  s.guidance = { opened: { standing: 53 }, done: Object.fromEntries(['founding', 'next-course', 'somewhere-to-sleep', 'seats', 'paying-for-it', 'first-summer'].map((id) => [id, 1])), met: [], marked: [] };
  s.guidance.opened = { ...s.guidance.done, standing: 53 };
  const html = renderToStaticMarkup(createElement(ObjectivesPanel, { s, waiting: null, onGo: () => {}, onOpenLadder: () => {} }));
  assert(html.includes('Standing') && /Prestige [\d.]+, its target [\d.]+/.test(html), 'Standing reads prestige against its target');
  assert(/Its pillars: Academics [\d.]+ of [\d.]+ · Research/.test(html) && html.includes('Satisfaction '), 'with each pillar against its most, and the satisfaction');
}

// ---- PR F: years 4 and 5, a side chapter, and the Athletics tab ----
{
  const chain = ['founding', 'next-course', 'somewhere-to-sleep', 'seats', 'paying-for-it', 'first-summer', 'standing', 'a-faculty', 'hall-of-its-own', 'campus-life', 'promises'];
  const s = teaching();
  s.clock.year = 4;
  s.clock.week = 30;
  s.guidance = { opened: Object.fromEntries(chain.map((id) => [id, 1])), done: Object.fromEntries(chain.map((id) => [id, 1])), met: [], marked: [], gated: true };
  settleChapters(s);
  assert(!opened(s, 'the-teams'), 'with no sport club, The teams stays shut');
  assert(currentChapter(s)?.id === 'running-the-college', 'and the chain goes on without it: Running the college');
  assert(!tabAvailable(s, 'athletics'), 'a gated run has no Athletics tab before its chapter');

  s.orgs.clubs.push({ ...(s.orgs.clubs[0] ?? {}), sport: 'soccer' } as GameState['orgs']['clubs'][number]);
  s.ladder.reached.sport = 4;
  settleChapters(s);
  assert(opened(s, 'the-teams'), 'a sport club opens The teams beside the chain');
  assert(tabAvailable(s, 'athletics'), 'and with it the Athletics tab');
  assert(currentChapter(s)?.id === 'the-teams', 'the drawer shows the open chapter first in order');
  assert(nextChapter(s)?.id !== 'the-teams', 'and never names a side chapter as coming next');

  const ungated = structuredClone(s);
  delete ungated.guidance!.gated;
  ungated.guidance!.opened = {};
  assert(tabAvailable(ungated, 'athletics') === ladderOpensTab(ungated, 'athletics'), 'an ungated run opens Athletics by the ladder alone');

  s.seats = [{ seatId: 'provost', school: null, holder: 'x', internal: false, policy: 'p', salary: 1 } as NonNullable<GameState['seats']>[number]];
  s.clock.year = 5;
  s.clock.week = 1;
  settleChapters(s);
  assert(done(s, 'running-the-college') && currentChapter(s)?.id !== 'running-the-college', 'a Provost ends Running the college');
  assert(opened(s, 'the-long-game'), 'and year 5 opens The long game');
  s.finance.sweepWeeks = 26;
  settleChapters(s);
  assert(done(s, 'the-long-game'), 'a standing sweep ends it');
}

// ---- PR G: the Guide ----
{
  for (const [tab, id] of Object.entries(TAB_GUIDE)) {
    assert(CHAPTERS.some((c) => c.id === id) && CHAPTER_COPY[id!].briefing !== undefined, `the ${tab} tab's Guide names a chapter with a briefing (${id})`);
  }
  const s = teaching();
  s.clock.year = 2;
  const met = ['founding', 'next-course', 'somewhere-to-sleep', 'seats', 'paying-for-it', 'first-summer'];
  s.guidance = { opened: { ...Object.fromEntries(met.map((id) => [id, 1])), standing: 53 }, done: Object.fromEntries(met.map((id) => [id, 1])), met: [], marked: [] };
  const guide = guideChapters(s).map((c) => c.id);
  assert(guide.join(',') === 'next-course,somewhere-to-sleep,seats,paying-for-it,first-summer,standing', `the Guide lists every chapter met with a briefing, in order (${guide.join(',')})`);
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
