// ---------------------------------------------------------------------
// The first year's script (Plan 16's PR F): letters from the board's chair
// (data/eventData.ts's OPENING_LETTERS), fired through the interrupt system
// (eventSystem.ts's fireOpeningLetter), skippable from the first, and the
// next-step line the toolbar carries (systems/guidance/nextStep.ts). The
// letters that wait on the college rather than the calendar (Plan 55) are
// pinned in test/sorting.test.ts.
//
// What is pinned: the calendar letters arrive in order, at or after their
// weeks, in year one and never again; each fires once; "I know the way"
// stands the rest down; the shared defaults read them; the next-step line
// is the letter's ask until it is done — the first, since Plan 80D, a
// program founded and a place for every student — and afterward a reading
// of the campus that goes quiet when nothing is on offer.
//
// AND THE WALKTHROUGH (state/opening.ts, Plan 80D): a college opens with
// nothing to teach. A guided founding opens with the clock held and
// Founders Hall unsited; the hall sites for nothing and its standing moves
// the walk on; appointing Dr. Grace Bennett from the founding market moves
// it on again; founding English, its entry course to the committee, frees
// the clock and ends the walk (Plan 106 PR C). The first letter is counted
// read, so its ask — seat the students — is the next-step line; so is the
// "Somewhere to sleep" letter, whose chapter asks the same. The chapters
// then ring English's next course once its first is taught, and from week
// 10 a residence hall and a dining hall in the build menu. A save on a
// retired step (Plan 103's course and needs steps) plays on. Skipping at
// any step never sites the hall: an unsited Founders Hall holds the clock
// and the line says to site it. A headless founding is untouched by all of
// it, and the hold survives a save.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { createInitialState, createPreStartState } from '../src/state/actions';
import { reducer } from '../src/engine/reducer';
import { defaultAnswer } from '../src/engine/defaultAnswers';
import { OPENING_LETTERS } from '../src/data/eventData';
import { FOUNDERS_HALL_ID, programById } from '../src/data/techData';
import { FOUNDING_PROGRAMS, WALKTHROUGH_PROFESSOR, WALKTHROUGH_PROGRAM } from '../src/data/foundingData';
import { OPENING_STEPS } from '../src/data/openingData';
import { STARTING_DORM_CAPACITY, STARTING_DORM_ID } from '../src/data/campusData';
import { teachPillars } from './fixtures/teaching';
import { nextStep } from '../src/systems/guidance/nextStep';
import { openingHoldsClock } from '../src/state/opening';
import { tabAvailable } from '../src/components/TabNav';
import { NEEDS_LETTER_ID } from '../src/data/openingData';
import { currentChapter, LOOK_MARKS, ringedBuilding, ringedProgram } from '../src/state/chapters';
import { awaitsSite, centredPlacement, firstFreeSpot, footprintOf } from '../src/state/campusMap';
import { FOUNDING_VERNACULAR } from '../src/data/foundingData';
import { FOUNDING_COLORS, schoolColorsOf } from '../src/data/schoolColors';
import { loadGame, saveGame } from '../src/state/persistence';
import type { GameState } from '../src/state/types';
import type { Action } from '../src/state/actions';
import { createElement, isValidElement, type ReactElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import OpeningCoach from '../src/components/OpeningCoach';
import ConfirmButton from '../src/components/ConfirmButton';
import { SKIP_WORDS, WALKTHROUGH_LENGTH } from '../src/data/openingData';

// In-memory localStorage, for the save round trip below.
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

// Plays a year, recording every letter that fires and the week it fired on,
// answering everything with the shared defaults.
function playYear(start: GameState, onLetter?: (s: GameState) => void): { s: GameState; letters: Array<{ id: string; week: number; year: number }> } {
  let s = start;
  const letters: Array<{ id: string; week: number; year: number }> = [];
  for (let i = 0; i < 400 && s.clock.year === start.clock.year; i += 1) {
    if (s.pendingInterrupt) {
      if (s.pendingInterrupt.type === 'letter') {
        letters.push({ id: (s.pendingInterrupt.payload as { id: string }).id, week: s.clock.week, year: s.clock.year });
        onLetter?.(s);
      }
      const answer = defaultAnswer(s);
      if (!answer) throw new Error(`no default answer for ${s.pendingInterrupt.type}`);
      s = reducer(s, answer);
      continue;
    }
    s = reducer(s, { type: 'TICK' });
  }
  return { s, letters };
}

console.log('opening script tests');

// The letters due on a week of year one; the rest wait on the college.
const CALENDAR = OPENING_LETTERS.filter((l) => !l.arrives);

// --- the calendar letters, in order, at or after their weeks, in year one --
{
  const { s, letters } = playYear(createInitialState('Opening'));
  assert(letters.length === CALENDAR.length, `every calendar letter is delivered in year one, and nothing else by a college that builds nothing (${letters.length} of ${CALENDAR.length})`);
  assert(letters.map((l) => l.id).join(',') === CALENDAR.map((l) => l.id).join(','), 'in the order they were written');
  for (const [i, letter] of CALENDAR.entries()) {
    const fired = letters[i];
    assert(fired !== undefined && fired.week >= letter.week && fired.week <= letter.week + 4, `"${letter.title}" arrives at or just after week ${letter.week} (week ${fired?.week})`);
  }
  assert(letters[0].week === 1, 'the doors open in week one — the first thing a new player sees');
  assert(s.clock.year === 2, 'and the year still turns over');
  assert(s.events.opening.read.length === CALENDAR.length && !s.events.opening.skipped, 'every calendar letter is recorded read, and the script was not declined');

  const second = playYear(s);
  assert(second.letters.length === 0, 'year two gets no letters');
}

// --- "I know the way" stands the rest down ---------------------------------
{
  let s = createInitialState('Skip');
  s = reducer(s, { type: 'TICK' });
  assert(s.pendingInterrupt?.type === 'letter', 'the first TICK raises the first letter');
  assert(s.clock.week === 1, 'and holds the clock at week one');
  s = reducer(s, { type: 'RESOLVE_LETTER', skipAll: true });
  assert(s.pendingInterrupt === null && s.clock.week === 2, 'putting it down moves the clock on');
  assert(s.events.opening.skipped, 'and records the decline');
  const { letters } = playYear(s);
  assert(letters.length === 0, 'no further letter is sent this run');
}

// --- a letter fires once, whatever clears it ------------------------------
{
  let s = createInitialState('Once');
  s = reducer(s, { type: 'TICK' });
  s = reducer(s, { type: 'RESOLVE_INTERRUPT' }); // the generic fallback, not the letter's own action
  const { letters } = playYear(s);
  assert(!letters.some((l) => l.id === OPENING_LETTERS[0].id), 'a letter cleared generically does not come back');
  assert(letters.length === CALENDAR.length - 1, 'the rest still arrive');
}

// --- the next-step line: the letter's ask until it is done ----------------
{
  let s = createInitialState('Next');
  assert(nextStep(s)?.intent?.kind === 'found', `before any letter, the line seats the students: a program first (${nextStep(s)?.text})`);
  s = reducer(s, { type: 'TICK' });
  s = reducer(s, { type: 'RESOLVE_LETTER', skipAll: false });
  assert(nextStep(s)?.text === OPENING_LETTERS[0].ask(s).text, `after the first letter the line is its ask (${nextStep(s)?.text})`);
  assert(nextStep(s)?.go === 'hall' && nextStep(s)?.hallId === FOUNDERS_HALL_ID && nextStep(s)?.intent?.kind === 'found', "and it opens Founders Hall's panel, where a program is founded");
  // Found English, its professor on the payroll since the founding (Plan
  // 107A): the college is still crowded, so the ask moves on to its courses.
  s = reducer(s, { type: 'FOUND_PROGRAM', programId: WALKTHROUGH_PROGRAM, hallId: FOUNDERS_HALL_ID, slot: 0, facultyId: WALKTHROUGH_PROFESSOR });
  assert(s.halls[FOUNDERS_HALL_ID][0].programId === WALKTHROUGH_PROGRAM, 'English is founded');
  assert(!OPENING_LETTERS[0].done(s), 'but eighty places coming is not a place for every student');
  const seat = nextStep(s);
  assert(seat !== null && seat.text.startsWith('Places for 80 of 350 students, counting courses under way: ') && (seat.intent?.kind === 'develop' || seat.intent?.kind === 'found'), `the line names the next course or program (${seat?.text})`);
  // Four more courses coming: every student has a place.
  const t = teachPillars(createInitialState('Next'));
  t.events.opening.read = [OPENING_LETTERS[0].id];
  assert(OPENING_LETTERS[0].done(t), 'a program housed and places for every student do the first ask');
  // Between letters year one reads the campus's shortfall, and only that
  // (Plan 78B): quiet when no need is under the line.
  t.students.satisfactionBreakdown = { academic: 70, social: 70, basicNeeds: 70, health: 70, housing: 30 };
  assert(nextStep(t)?.intent?.kind === 'build-for', `and until the next letter the line is a shortfall (${nextStep(t)?.text})`);
  t.students.satisfactionBreakdown.housing = 70;
  assert(nextStep(t) === null, 'with no need short, the line goes quiet until the next letter');

  // The second letter's ask, and the reading it hands to the build menu.
  t.events.opening.read.push(OPENING_LETTERS[1].id);
  assert(nextStep(t)?.text === OPENING_LETTERS[1].ask(t).text && nextStep(t)?.go === 'build', `the second letter's ask points at the build menu (${nextStep(t)?.text})`);
}

// --- after the first year: a reading of the campus ------------------------
{
  const s = teachPillars(createInitialState('Reading'));
  s.clock.year = 2;
  // The founding halls standing, so no need is crowded (Plan 95P: crowding
  // speaks before the shortfall).
  s.tech.find((t) => t.id === STARTING_DORM_ID)!.status = 'done';
  s.students.capacity = STARTING_DORM_CAPACITY;
  s.tech.find((t) => t.id === 'DINING-01')!.status = 'done';
  s.students.satisfactionBreakdown = { academic: 70, social: 70, basicNeeds: 70, health: 70, housing: 70 };
  const offers = s.programOffers;
  s.programOffers = [];
  assert(nextStep(s) === null, 'a quiet campus with nothing on offer has no next step — the line is a reading, not a queue');

  s.students.satisfactionBreakdown.basicNeeds = 32;
  assert(nextStep(s)?.text.startsWith('Dining is at 32') === true && nextStep(s)?.go === 'build', `a shortfall under 50 is named with its figure (${nextStep(s)?.text})`);

  // A standing hall with a free slot outranks a shortfall: founding is the
  // most valuable click there is.
  s.programOffers = offers;
  const founders = nextStep(s);
  assert(founders?.go === 'hall' && founders.text.includes('Founders Hall'), `Founders Hall's free program slots are the line while programs are on offer (${founders?.text})`);

  // Students short of places outrank both (Plan 80D).
  s.students.classes = { freshman: 300, sophomore: 300, junior: 0, senior: 0 };
  const seat = nextStep(s);
  assert(seat !== null && seat.text.startsWith('Places for 480 of 600 students: '), `students with no place are the line (${seat?.text})`);
}

// --- the walkthrough: a guided founding --------------------------------
const foundWalk = (name: string, guided = true) => reducer(createPreStartState(), {
  type: 'START_GAME', name, vernacular: FOUNDING_VERNACULAR, colors: schoolColorsOf(FOUNDING_COLORS), guided,
});
const siteHall = (s: GameState) => {
  const hall = s.tech.find((t) => t.id === FOUNDERS_HALL_ID)!;
  const spot = centredPlacement(footprintOf(hall));
  return reducer(s, { type: 'PLACE_BUILDABLE', buildableId: FOUNDERS_HALL_ID, row: spot.row, col: spot.col, facing: 0 });
};
// Plays weeks, answering stops with the shared defaults, until `until`
// holds.
const untilWeek = (start: GameState, until: (s: GameState) => boolean) => {
  let s = start;
  for (let i = 0; i < 60 && !until(s); i += 1) {
    s = s.pendingInterrupt ? reducer(s, defaultAnswer(s)!) : reducer(s, { type: 'TICK' });
  }
  return s;
};
const done = (s: GameState, id: string) => s.guidance?.done[id] !== undefined;
// Sites a building on the first free ground (campusMap.ts's firstFreeSpot).
const siteAnywhere = (s: GameState, id: string) => {
  const t = s.tech.find((x) => x.id === id)!;
  const spot = firstFreeSpot(s, t, footprintOf(t))!;
  return reducer(s, { type: 'PLACE_BUILDABLE', buildableId: id, row: spot.row, col: spot.col, facing: 0 });
};
// A guided walk done to its program founded: English, with Bennett.
const walkToCourse = (name: string) => reducer(
  siteHall(reducer(foundWalk(name), { type: 'ADVANCE_OPENING' })),
  { type: 'FOUND_PROGRAM', programId: WALKTHROUGH_PROGRAM, hallId: FOUNDERS_HALL_ID, slot: 0, facultyId: WALKTHROUGH_PROFESSOR },
);
{
  // Headless: the hall pre-placed, the walk behind it; nothing to teach.
  const headless = foundWalk('Walk', false);
  assert(headless.events.opening.stage === 'play' && !openingHoldsClock(headless), 'a headless founding opens at play');
  assert(FOUNDERS_HALL_ID in headless.placements, 'with Founders Hall pre-placed');
  assert(headless.events.opening.read.length === 0, 'and no letter read');
  assert(createInitialState('Plain').events.opening.stage === 'play', 'createInitialState defaults to a headless founding');
  assert(headless.tech.every((t) => t.kind !== 'course' || t.status !== 'done'), 'the college opens with no course (Plan 80D)');
  assert(headless.faculty.map((f) => f.name).join(', ') === 'Dr. Grace Bennett, Dr. Priya Iyer, Dr. John Okafor', `and its founding faculty on the payroll (Plan 107A: ${headless.faculty.map((f) => f.name).join(', ')})`);
  assert(!headless.candidates.some((c) => headless.faculty.some((f) => f.id === c.id)), 'none of them still on the market');
  assert(headless.halls[FOUNDERS_HALL_ID].every((slot) => slot.programId === null), 'and Founders Hall empty');
  assert(headless.programOffers.join(',') === FOUNDING_PROGRAMS.join(','), `the founding pillars are on offer (${headless.programOffers.join(', ')})`);

  // Guided: held, and the hall waits to be sited.
  let s = foundWalk('Walk');
  assert(s.events.opening.stage === 'welcome' && openingHoldsClock(s), 'a guided founding opens on the welcome with the clock held');
  assert(!(FOUNDERS_HALL_ID in s.placements), 'Founders Hall is not placed');
  assert(s.events.opening.read.includes(OPENING_LETTERS[0].id) && !s.events.opening.skipped, 'the first letter is counted read — the welcome is its content');
  // The welcome welcomes (Plan 104L): the college, and the building it
  // begins with; no list of tasks, no order to remember.
  const welcome = OPENING_STEPS.welcome.body(s);
  assert(welcome === 'Welcome to Walk. 350 students have enrolled, and the college is yours to build. You start with one building, Founders Hall. The first classes will meet there.', `the welcome's words (${welcome})`);
  assert(nextStep(s) === null, 'the next-step line is silent while the walk holds the clock');
  const week = s.clock.week;
  s = reducer(s, { type: 'TICK' });
  assert(s.clock.week === week && s.pendingInterrupt === null, 'TICK is a no-op while the walk holds the clock — no letter, no week');

  // The founding save carries the hold.
  assert(saveGame(s), 'a mid-walk save is written');
  const resumed = loadGame();
  assert(resumed?.events.opening.stage === 'welcome', 'and resumes on the same step');

  // Next -> site the hall. Only the hall standing moves this step on.
  s = reducer(s, { type: 'ADVANCE_OPENING' });
  assert(s.events.opening.stage === 'site-hall', 'Next on the welcome asks for the hall');
  s = reducer(s, { type: 'ADVANCE_OPENING' });
  assert(s.events.opening.stage === 'site-hall', 'Next does nothing on a step that ends on something done');
  const hall = s.tech.find((t) => t.id === FOUNDERS_HALL_ID)!;
  assert(awaitsSite(s, hall), 'Founders Hall is built and awaits a site');
  const cash = s.finance.cash;
  s = siteHall(s);
  assert(FOUNDERS_HALL_ID in s.placements, 'the hall is sited');
  assert(s.finance.cash === cash, 'and nothing was charged for it');
  assert(s.events.opening.stage === 'found' && openingHoldsClock(s), 'the hall standing moves the walk on, to the first program, the clock still held');
  s = reducer(s, { type: 'ADVANCE_OPENING' });
  assert(s.events.opening.stage === 'found', 'Next does nothing here either');
  // Any of the three (Plan 107A): no program named, no professor named.
  const choose = OPENING_STEPS.found.body(s);
  assert(choose === 'Programs are the subjects your college teaches. Three are on offer in Founders Hall, and each already has a professor. Click the ringed slot, pick one, and click Found.', `the card offers the choice (${choose})`);

  // Found English: its entry course goes to the committee, and the walk is
  // over (Plan 106 PR C): the chapters take it from here.
  const entry = programById(WALKTHROUGH_PROGRAM)!.entryCourseId;
  s = reducer(s, { type: 'FOUND_PROGRAM', programId: WALKTHROUGH_PROGRAM, hallId: FOUNDERS_HALL_ID, slot: 0, facultyId: WALKTHROUGH_PROFESSOR });
  assert(s.halls[FOUNDERS_HALL_ID][0].programId === WALKTHROUGH_PROGRAM, 'English is founded into Founders Hall');
  assert(s.tech.find((t) => t.id === entry)?.status === 'developing' && s.courseFaculty[entry] === WALKTHROUGH_PROFESSOR, 'its entry course is with the committee, Bennett to teach it');
  assert(s.events.opening.stage === 'play' && !openingHoldsClock(s), 'the walk ends on the program founded, and the clock runs');
  assert(s.events.opening.read.includes(NEEDS_LETTER_ID), 'the needs letter is counted read: its chapter asks the same');
  assert(done(s, 'founding') && currentChapter(s)?.id === 'next-course', 'Founding is done, and The next course is the chapter');
  const line = nextStep(s);
  assert(line !== null && line.text.startsWith('Places for 80 of 350 students') && line.text === OPENING_LETTERS[0].ask(s).text, `the line is the first letter's ask: seat the students (${line?.text})`);

  // The entry course taught, the Curriculum rings English's next course.
  assert(ringedProgram(s) === null, 'nothing is ringed while the first course is written');
  s = untilWeek(s, (x) => x.tech.find((t) => t.id === entry)?.status === 'done');
  assert(ringedProgram(s) === WALKTHROUGH_PROGRAM, `once it is taught, English's next course is ringed (week ${s.clock.week})`);
  const second = programById(WALKTHROUGH_PROGRAM)!.courseIds.find((id) => s.tech.find((t) => t.id === id)?.status === 'available')!;
  s = reducer(s, { type: 'START_DEVELOPMENT', nodeId: second, facultyId: WALKTHROUGH_PROFESSOR });
  assert(done(s, 'next-course') && ringedProgram(s) === null, 'a second course under way ends the chapter and the ring');

  // Looking around: the camera's four moves before the chapter after it.
  assert(currentChapter(s)?.id === 'looking-around', `Looking around is the chapter (${currentChapter(s)?.id})`);
  for (const mark of [LOOK_MARKS.pan, LOOK_MARKS.turn, LOOK_MARKS.tilt, LOOK_MARKS.zoom]) s = reducer(s, { type: 'MARK_GUIDANCE', mark });
  assert(done(s, 'looking-around'), 'pan, turn, tilt and zoom finish it');

  // Somewhere to sleep from week 10: the build menu rings a residence
  // hall, then a dining hall. The Students tab stays shut (Plan 104M).
  s = untilWeek(s, (x) => x.clock.week >= 10);
  assert(currentChapter(s)?.id === 'somewhere-to-sleep', `in week 10, Somewhere to sleep (${currentChapter(s)?.id}, week ${s.clock.week})`);
  assert(!tabAvailable(s, 'students'), 'and the Students tab is still closed');
  const dorm = ringedBuilding(s)!;
  assert(dorm?.kind === 'dorm', `the build menu rings a residence hall (${dorm?.id})`);
  s = siteAnywhere(s, dorm.id);
  const dining = ringedBuilding(s)!;
  assert(dining?.facilityType === 'diningHall', `then a dining hall (${dining?.id})`);
  s = siteAnywhere(s, dining.id);
  assert(done(s, 'somewhere-to-sleep') && ringedBuilding(s) === null, 'both sited, the chapter is done');

  // The letters carry on from the second, on their weeks.
  const { letters, s: after } = playYear(s);
  assert(!letters.some((l) => l.id === OPENING_LETTERS[0].id), 'the first letter is never sent — the welcome was it');
  const calendar = letters.filter((l) => CALENDAR.some((c) => c.id === l.id));
  assert(!letters.some((l) => l.id === NEEDS_LETTER_ID), 'nor the needs letter — its chapter was it');
  assert(!letters.some((l) => OPENING_LETTERS.find((x) => x.id === l.id)?.chapter !== undefined) && after.events.opening.read.includes('summer-is-coming'), 'nor one a chapter teaches: "The first summer" was "Summer is coming"');
  assert(calendar.map((l) => l.id).join(',') === CALENDAR.slice(1).filter((l) => l.id !== NEEDS_LETTER_ID && l.chapter === undefined).map((l) => l.id).join(','), `the rest of the calendar arrives in order (${letters.map((l) => l.id).join(',')})`);
  assert(after.clock.year === 2, 'and the year turns over');
}

// --- the walkthrough: skipping, at each step --------------------------------
{
  // From the welcome: letters declined, the hall unsited, the clock held.
  let s = reducer(foundWalk('Skip'), { type: 'SKIP_OPENING' });
  assert(s.events.opening.stage === 'play' && s.events.opening.skipped, 'declining ends the walk and stands the letters down');
  assert(!(FOUNDERS_HALL_ID in s.placements), 'Founders Hall stays unplaced');
  assert(openingHoldsClock(s), 'so the clock is held');
  const week = s.clock.week;
  s = reducer(s, { type: 'TICK' });
  assert(s.clock.week === week, 'no week passes');
  const site = nextStep(s);
  assert(site?.intent?.kind === 'site' && site.go === 'build' && site.text.startsWith('Place Founders Hall'), `the next-step line says to site it (${site?.text})`);
  s = siteHall(s);
  assert(!openingHoldsClock(s) && nextStep(s)?.text.startsWith('Place Founders Hall') !== true, 'sited, the clock runs');
  const { letters } = playYear(s);
  assert(letters.length === 0, 'no letter is sent this run');

  // From the hall's step: the letters kept, the hall still unsited.
  let h = reducer(foundWalk('Skip hall'), { type: 'ADVANCE_OPENING' });
  h = reducer(h, { type: 'SKIP_OPENING', keepLetters: true });
  assert(h.events.opening.stage === 'play' && !h.events.opening.skipped, 'skipping the rest keeps the letters');
  assert(!(FOUNDERS_HALL_ID in h.placements) && openingHoldsClock(h), 'but the hall stays unplaced and the clock held');
  assert(nextStep(h)?.text.startsWith('Place Founders Hall') === true, 'and the line says to site it');
  h = siteHall(h);
  assert(!openingHoldsClock(h) && nextStep(h)?.text === OPENING_LETTERS[0].ask(h).text, `sited, the line is the first letter's ask (${nextStep(h)?.text})`);

  // From the program's step: the hall stands, so the clock runs.
  let f = siteHall(reducer(foundWalk('Skip found'), { type: 'ADVANCE_OPENING' }));
  assert(f.events.opening.stage === 'found', 'on the program\'s step');
  f = reducer(f, { type: 'SKIP_OPENING', keepLetters: true });
  assert(f.events.opening.stage === 'play' && !openingHoldsClock(f), 'skipped, the clock runs');
  assert(Object.values(f.halls).flat().every((slot) => slot.programId === null), 'with nothing founded');
  assert(nextStep(f)?.intent?.kind === 'found' && nextStep(f)?.hallId === FOUNDERS_HALL_ID, `and the line asks for a program in Founders Hall (${nextStep(f)?.text})`);
}

// --- the retired steps (Plan 106 PR C) ---------------------------------------
{
  // A save on a step the walk no longer has moves on to play when next
  // settled, and the clock runs.
  for (const stage of ['await-course', 'second-course', 'needs', 'site-housing', 'site-dining']) {
    let old = walkToCourse(`Old ${stage}`);
    (old.events.opening as { stage: string }).stage = stage;
    const week = old.clock.week;
    old = reducer(old, { type: 'TICK' });
    assert(old.events.opening.stage === 'play' && old.clock.week === week + 1, `a save on '${stage}' plays on (${old.events.opening.stage}, week ${old.clock.week})`);
  }

  // Skipped from the program's step, the letters kept: nothing marked the
  // needs letter read, so it comes at week 9 as it always did.
  let k = siteHall(reducer(foundWalk('Skip letters'), { type: 'ADVANCE_OPENING' }));
  k = reducer(k, { type: 'SKIP_OPENING', keepLetters: true });
  const sent = playYear(k).letters.map((l) => l.id);
  assert(sent.includes(NEEDS_LETTER_ID), `skipped before the program, the needs letter comes (${sent.join(',')})`);

  // A save at 'play' (an old save, or a headless run) stays there.
  let headless = foundWalk('No step', false);
  headless = reducer(headless, { type: 'FOUND_PROGRAM', programId: WALKTHROUGH_PROGRAM, hallId: FOUNDERS_HALL_ID, slot: 0, facultyId: WALKTHROUGH_PROFESSOR });
  for (let i = 0; i < 10; i += 1) headless = headless.pendingInterrupt ? reducer(headless, defaultAnswer(headless)!) : reducer(headless, { type: 'TICK' });
  assert(headless.events.opening.stage === 'play', 'a run at play stays at play');
}

// --- each card introduces its own step, in the order played (Plan 104L) ----
{
  const words = (stage: GameState['events']['opening']['stage'], s: GameState) => OPENING_STEPS[stage as 'welcome'].body(s).toLowerCase();
  const w = foundWalk('Order');
  const site = reducer(w, { type: 'ADVANCE_OPENING' });
  const found = siteHall(site);
  // A card names no step it doesn't lead to: the welcome and the hall's
  // step no professor, program or course; choosing the program no course,
  // no professor by name and no program to prefer (Plan 107A).
  for (const [stage, s, banned] of [
    ['welcome', w, ['professor', 'program', 'course', 'in that order']],
    ['site-hall', site, ['professor', 'program', 'course', 'clear']],
    ['found', found, ['course', 'bennett', 'iyer', 'okafor', 'english', 'mathematics', 'economics']],
  ] as const) {
    const said = banned.filter((term) => words(stage, s).includes(term));
    assert(said.length === 0, `${stage}: names no later step (${said.join(', ')})`);
  }
  assert(OPENING_STEPS.found.title === 'Choose the first program', `the step is choosing a program (${OPENING_STEPS.found.title})`);
  assert(words('site-hall', site).includes('anywhere on the map'), 'the hall goes anywhere on the map');
}

// --- the walkthrough never opens a gated tab (Plan 104M) -------------------
{
  let w = foundWalk('Doors');
  const seen: string[] = [];
  const check = () => {
    const stage = w.events.opening.stage;
    if (stage === 'play') return;
    seen.push(stage);
  };
  check();
  w = reducer(w, { type: 'ADVANCE_OPENING' }); check();
  w = siteHall(w); check();
  w = reducer(w, { type: 'FOUND_PROGRAM', programId: WALKTHROUGH_PROGRAM, hallId: FOUNDERS_HALL_ID, slot: 0, facultyId: WALKTHROUGH_PROFESSOR }); check();
  assert(seen.join(',') === 'welcome,site-hall,found', `every card checked (${seen.join(',')})`);
  assert(Object.values(OPENING_STEPS).every((step) => step.door === undefined || step.door === 'build' || step.door === 'hall'), 'no card has a door to a tab');
}


// --- the skip asks first (Plan 104C) ----------------------------------------
// The coach is rendered inside a probe that keeps the tree it returns, so
// its buttons' handlers can be pressed without a DOM.
{
  type Props = Record<string, unknown> & { children?: ReactNode };
  const all = (node: ReactNode, out: ReactElement<Props>[] = []): ReactElement<Props>[] => {
    if (Array.isArray(node)) { for (const n of node) all(n, out); return out; }
    if (!isValidElement<Props>(node)) return out;
    out.push(node);
    all(node.props.children, out);
    return out;
  };
  const coach = (s: GameState) => {
    const acted: Action[] = [];
    let tree: ReactNode = null;
    const props = {
      s, act: (a: Action) => acted.push(a), buildOpen: false, hallOpen: false, placing: false,
      onOpenBuild: () => {}, onOpenHall: () => {},
    };
    const Probe = () => { tree = OpeningCoach(props); return null; };
    renderToStaticMarkup(createElement(Probe));
    return { acted, elements: all(tree), html: renderToStaticMarkup(createElement(OpeningCoach, props)) };
  };

  const welcome = foundWalk('Ask');
  const siteStep = reducer(welcome, { type: 'ADVANCE_OPENING' });
  const foundStep = siteHall(siteStep);
  const steps = [welcome, siteStep, foundStep];
  assert(steps.map((x) => x.events.opening.stage).join(',') === 'welcome,site-hall,found',
    `every card is reached (${steps.map((x) => x.events.opening.stage).join(',')})`);

  for (const s of steps) {
    const stage = s.events.opening.stage;
    const c = coach(s);
    // One click on anything the card draws: nothing skips.
    for (const e of c.elements) if (e.type === 'button' && typeof e.props.onClick === 'function') (e.props.onClick as () => void)();
    assert(!c.acted.some((a) => a.type === 'SKIP_OPENING'), `${stage}: no button skips on one click`);
    const skips = c.elements.filter((e) => e.type === ConfirmButton);
    assert(skips.length === 1, `${stage}: the skip is a confirmation (${skips.length})`);
    const skip = skips[0]?.props ?? {};
    assert(skip.needsConfirm !== false && skip.cancelLabel === SKIP_WORDS.keep && skip.warning === SKIP_WORDS.question && skip.armedLabel === SKIP_WORDS.confirm,
      `${stage}: armed, it asks "${SKIP_WORDS.question}" with ${SKIP_WORDS.confirm} and ${SKIP_WORDS.keep}`);
    c.acted.length = 0;
    (skip.onConfirm as () => void)?.();
    const keep = stage !== 'welcome';
    assert(c.acted.length === 1 && c.acted[0].type === 'SKIP_OPENING' && (c.acted[0].keepLetters === true) === keep,
      `${stage}: its confirmation skips, ${keep ? 'keeping' : 'declining'} the letters (${JSON.stringify(c.acted)})`);
    assert(skip.label === (keep ? SKIP_WORDS.rest : SKIP_WORDS.welcome), `${stage}: labelled "${String(skip.label)}"`);
  }

  // The welcome: the skip is a link under the actions, and the card says
  // how long the walk is.
  const w = coach(welcome).html;
  assert(w.includes(WALKTHROUGH_LENGTH), 'the welcome says how long the walkthrough takes');
  const actionsRow = w.slice(w.indexOf('letter-actions'), w.indexOf('</div>', w.indexOf('letter-actions')));
  assert(w.indexOf('letter-skip-row') > w.indexOf('letter-actions') && !actionsRow.includes('skip'),
    'and its skip sits below the actions, not beside Next');
  assert(w.includes('letter-skip-link'), 'as a plain text link');

  // ConfirmButton itself: a first click arms; it does not act.
  let confirmed = 0;
  let button: ReactElement<Props> | undefined;
  const Probe = () => {
    const tree = ConfirmButton({ label: 'Skip', armedLabel: 'Skip', onConfirm: () => { confirmed += 1; }, cancelLabel: 'Keep' });
    button = all(tree).find((e) => e.type === 'button');
    return null;
  };
  renderToStaticMarkup(createElement(Probe));
  (button?.props.onClick as () => void)?.();
  assert(confirmed === 0, 'a first click on a confirmation does not act');
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
