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
// record survives a save; and every objective has its words.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { createInitialState, createPreStartState } from '../src/state/actions';
import { reducer } from '../src/engine/reducer';
import { CHAPTERS, currentChapter, DOUBLE_SPEED_MARK, objectiveMet, objectiveRows, settleChapters } from '../src/state/chapters';
import { CHAPTER_COPY } from '../src/data/chapterData';
import { isDiningHall, isDorm } from '../src/data/openingData';
import { FOUNDING_VERNACULAR } from '../src/data/foundingData';
import { FOUNDING_COLORS, schoolColorsOf } from '../src/data/schoolColors';
import { loadGame, saveGame } from '../src/state/persistence';
import { teachPillars } from './fixtures/teaching';
import type { Buildable, GameState } from '../src/state/types';

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
  assert(objectiveMet(s, 'seat-every-student'), 'six courses seat 350 students');
  assert(done(s, 'seats'), 'Seats for everyone is done without the optional speed');
  assert(!objectiveMet(s, 'run-at-double'), 'which stays unmet');
  assert(!opened(s, 'somewhere-to-sleep') && currentChapter(s) === null, 'the Spring chapter waits for its week; none is current');

  s.faculty = [];
  settleChapters(s);
  assert(objectiveMet(s, 'appoint-first-professor'), 'an objective stays met after its reading falls');

  const rows = objectiveRows(s, CHAPTERS.find((c) => c.id === 'seats')!);
  const seatsRow = rows.find((r) => r.id === 'seat-every-student')!;
  assert(typeof seatsRow.progress === 'object' && seatsRow.progress.of === 350, 'a counted objective reads its figure');
  assert(rows.find((r) => r.id === 'run-at-double')!.optional, 'the speed objective is optional');
}

// ---- The next chapter waits for its week, and opens already met ----
{
  const s = teaching();
  s.clock.week = 10;
  site(s, isDorm);
  site(s, isDiningHall);
  settleChapters(s);
  assert(!opened(s, 'somewhere-to-sleep'), 'a residence hall and a dining hall in week 10 do not open the Spring chapter');
  s.clock.week = 27;
  settleChapters(s);
  assert(opened(s, 'somewhere-to-sleep') && done(s, 'somewhere-to-sleep'), 'in week 27 it opens, and is done on the spot');
}
{
  const s = teaching();
  s.clock.week = 27;
  settleChapters(s);
  assert(currentChapter(s)?.id === 'somewhere-to-sleep', 'in week 27 Somewhere to sleep is the chapter');
  site(s, isDorm);
  settleChapters(s);
  assert(objectiveMet(s, 'site-residence-hall') && !done(s, 'somewhere-to-sleep'), 'a residence hall alone meets one objective');
  site(s, isDiningHall);
  settleChapters(s);
  assert(done(s, 'somewhere-to-sleep'), 'a residence hall and a dining hall sited finish it');
  assert(s.guidance!.done['somewhere-to-sleep'] === 27, 'done the week it was finished');
}

// ---- A run from before the objectives is caught up by its date ----
{
  const s = teaching();
  delete s.guidance;
  s.clock.year = 3;
  settleChapters(s);
  assert(CHAPTERS.every((c) => done(s, c.id)), 'a year-3 save has done every chapter of year one');
}
{
  const s = createInitialState('Chapters');
  delete s.guidance;
  s.clock.week = 10;
  s.faculty = [];
  settleChapters(s);
  assert(done(s, 'founding') && done(s, 'seats'), 'a week-10 save has done the chapters its weeks passed');
  assert(!opened(s, 'somewhere-to-sleep'), 'and opens the Spring chapter when its week comes');
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
  assert(done(s, 'seats'), 'a tick settles the chapters');
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
assert(CHAPTERS.every((c, i) => i === 0 || c.earliest >= CHAPTERS[i - 1].earliest), 'chapters open in date order');

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
