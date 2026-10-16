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
// the clock. The first letter is counted read, so its ask — seat the
// students — is the next-step line while that course is written. Once it
// is taught the clock is held again on the course step (Plan 103B), until
// a second course is started, skipped, or can't be; then on the needs
// (Plan 103C): Students' Housing and Dining, a residence hall sited, a
// dining hall sited. Those three steps are the "Somewhere to sleep" letter,
// which a walk that reaches them never sends. Skipping at
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
import { NEEDS_LETTER_ID, walkBuilding, walkProgram } from '../src/data/openingData';
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
  // Appoint the founding market's English professor and found English:
  // the college is still crowded, so the ask moves on to its courses.
  s = reducer(s, { type: 'HIRE_FACULTY', facultyId: WALKTHROUGH_PROFESSOR });
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
// Plays weeks, answering stops with the shared defaults, until the walk
// reaches `stage`.
const untilStage = (start: GameState, stage: GameState['events']['opening']['stage']) => {
  let s = start;
  for (let i = 0; i < 60 && s.events.opening.stage !== stage; i += 1) {
    s = s.pendingInterrupt ? reducer(s, defaultAnswer(s)!) : reducer(s, { type: 'TICK' });
  }
  return s;
};
// Sites a building on the first free ground (campusMap.ts's firstFreeSpot).
const siteAnywhere = (s: GameState, id: string) => {
  const t = s.tech.find((x) => x.id === id)!;
  const spot = firstFreeSpot(s, t, footprintOf(t))!;
  return reducer(s, { type: 'PLACE_BUILDABLE', buildableId: id, row: spot.row, col: spot.col, facing: 0 });
};
// A guided walk done to its program founded: English, with Bennett.
const walkToCourse = (name: string) => reducer(
  reducer(siteHall(reducer(foundWalk(name), { type: 'ADVANCE_OPENING' })), { type: 'HIRE_FACULTY', facultyId: WALKTHROUGH_PROFESSOR }),
  { type: 'FOUND_PROGRAM', programId: WALKTHROUGH_PROGRAM, hallId: FOUNDERS_HALL_ID, slot: 0, facultyId: WALKTHROUGH_PROFESSOR },
);
{
  // Headless: the hall pre-placed, the walk behind it; nothing to teach.
  const headless = foundWalk('Walk', false);
  assert(headless.events.opening.stage === 'play' && !openingHoldsClock(headless), 'a headless founding opens at play');
  assert(FOUNDERS_HALL_ID in headless.placements, 'with Founders Hall pre-placed');
  assert(headless.events.opening.read.length === 0, 'and no letter read');
  assert(createInitialState('Plain').events.opening.stage === 'play', 'createInitialState defaults to a headless founding');
  assert(headless.faculty.length === 0 && headless.tech.every((t) => t.kind !== 'course' || t.status !== 'done'), 'the college opens with no professor and no course (Plan 80D)');
  assert(headless.halls[FOUNDERS_HALL_ID].every((slot) => slot.programId === null), 'and Founders Hall empty');
  assert(headless.programOffers.join(',') === FOUNDING_PROGRAMS.join(','), `the founding pillars are on offer (${headless.programOffers.join(', ')})`);
  assert(headless.candidates.some((c) => c.id === WALKTHROUGH_PROFESSOR && c.field === programById(WALKTHROUGH_PROGRAM)!.field), 'and Dr. Grace Bennett, in English, is on the market');

  // Guided: held, and the hall waits to be sited.
  let s = foundWalk('Walk');
  assert(s.events.opening.stage === 'welcome' && openingHoldsClock(s), 'a guided founding opens on the welcome with the clock held');
  assert(!(FOUNDERS_HALL_ID in s.placements), 'Founders Hall is not placed');
  assert(s.events.opening.read.includes(OPENING_LETTERS[0].id) && !s.events.opening.skipped, 'the first letter is counted read — the welcome is its content');
  // The welcome welcomes (Plan 104L): the college, and the building it
  // begins with; no list of tasks, no order to remember.
  const welcome = OPENING_STEPS.welcome.body(s);
  assert(welcome === 'The Walk board wishes you well. Three hundred and fifty students have enrolled, and the college is yours to build. It begins with one building, Founders Hall, where the first classes will meet.', `the welcome's words (${welcome})`);
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
  assert(s.events.opening.stage === 'appoint', 'the hall standing moves the walk on, to the first professor');
  assert(openingHoldsClock(s), 'the clock is still held');

  // Appoint Dr. Grace Bennett from the founding market.
  s = reducer(s, { type: 'ADVANCE_OPENING' });
  assert(s.events.opening.stage === 'appoint', 'Next does nothing here either');
  s = reducer(s, { type: 'HIRE_FACULTY', facultyId: WALKTHROUGH_PROFESSOR });
  assert(s.faculty.some((f) => f.id === WALKTHROUGH_PROFESSOR), 'Bennett is on the payroll');
  assert(s.events.opening.stage === 'found' && openingHoldsClock(s), 'and the walk asks for the program, the clock still held');
  assert(OPENING_STEPS.found.body(s).includes('Found English into the program slot'), `the card names English (${OPENING_STEPS.found.body(s).slice(0, 80)})`);

  // Found English: its entry course goes to the committee.
  const entry = programById(WALKTHROUGH_PROGRAM)!.entryCourseId;
  s = reducer(s, { type: 'FOUND_PROGRAM', programId: WALKTHROUGH_PROGRAM, hallId: FOUNDERS_HALL_ID, slot: 0, facultyId: WALKTHROUGH_PROFESSOR });
  assert(s.halls[FOUNDERS_HALL_ID][0].programId === WALKTHROUGH_PROGRAM, 'English is founded into Founders Hall');
  assert(s.tech.find((t) => t.id === entry)?.status === 'developing' && s.courseFaculty[entry] === WALKTHROUGH_PROFESSOR, 'its entry course is with the committee, Bennett to teach it');
  assert(s.events.opening.stage === 'await-course' && !openingHoldsClock(s), 'and the clock runs while it is written, no card showing');
  const line = nextStep(s);
  assert(line !== null && line.text.startsWith('Places for 80 of 350 students') && line.text === OPENING_LETTERS[0].ask(s).text, `the line is the first letter's ask: seat the students (${line?.text})`);

  // Plan 103B: the entry course taught, the walk asks for the next one.
  s = untilStage(s, 'second-course');
  assert(s.tech.find((t) => t.id === entry)?.status === 'done', `${entry} is taught when the course step opens (week ${s.clock.week})`);
  assert(walkProgram(s) === WALKTHROUGH_PROGRAM && openingHoldsClock(s), 'the step points at English, and the clock is held');
  assert(nextStep(s) === null, 'the card speaks, not the line');
  const held = s.clock.week;
  s = reducer(s, { type: 'TICK' });
  assert(s.clock.week === held, 'TICK is a no-op on the course step');
  const card = OPENING_STEPS['second-course'].body(s);
  assert(card.includes('English') && card.includes('ten courses, and the next four are open now'), `the card names the program and its open courses (${card})`);
  s = reducer(s, { type: 'ADVANCE_OPENING' });
  assert(s.events.opening.stage === 'second-course', 'Next does nothing: the step ends on a course started');
  const second = programById(WALKTHROUGH_PROGRAM)!.courseIds.find((id) => s.tech.find((t) => t.id === id)?.status === 'available')!;
  s = reducer(s, { type: 'START_DEVELOPMENT', nodeId: second, facultyId: WALKTHROUGH_PROFESSOR });
  assert(s.tech.find((t) => t.id === second)?.status === 'developing', `${second} is under way`);

  // Plan 103C: the needs, then a residence hall and a dining hall.
  assert(s.events.opening.stage === 'needs' && openingHoldsClock(s), 'the walk moves on to the needs, the clock still held');
  assert(s.events.opening.read.includes(NEEDS_LETTER_ID), 'and counts the letter the needs steps stand in for read');
  const needs = OPENING_STEPS.needs.body(s);
  // Built rather than shown (Plan 104M): the Students tab waits for the
  // first summer, so the card says what students need and goes on.
  assert(needs.startsWith('Students need somewhere to sleep and somewhere to eat.') && needs.includes('from the build menu') && !/Students tab|satisfaction/i.test(needs), `the card says what students need, and opens no tab (${needs})`);
  assert(OPENING_STEPS.needs.door === undefined && OPENING_STEPS.needs.next === 'Next', 'it has no door, and ends on Next');
  assert(!tabAvailable(s, 'students'), 'and the Students tab is still closed');
  s = reducer(s, { type: 'ADVANCE_OPENING' });
  assert(s.events.opening.stage === 'site-housing' && openingHoldsClock(s), 'Next asks for a residence hall');
  const dorm = walkBuilding(s)!;
  assert(dorm?.kind === 'dorm' && OPENING_STEPS['site-housing'].body(s).startsWith(`${dorm.name} sleeps `), `the card names it (${OPENING_STEPS['site-housing'].body(s)})`);
  s = reducer(s, { type: 'ADVANCE_OPENING' });
  assert(s.events.opening.stage === 'site-housing', 'Next does nothing: the step ends on a building sited');
  s = siteAnywhere(s, dorm.id);
  assert(dorm.id in s.placements && s.events.opening.stage === 'site-dining', 'the residence hall sited, the walk asks for a dining hall');
  const dining = walkBuilding(s)!;
  assert(dining?.facilityType === 'diningHall' && OPENING_STEPS['site-dining'].body(s).startsWith(`${dining.name} feeds `), `the card names it (${OPENING_STEPS['site-dining'].body(s)})`);
  s = siteAnywhere(s, dining.id);
  assert(dining.id in s.placements && s.events.opening.stage === 'play' && !openingHoldsClock(s), 'the dining hall sited, the walk is over');

  // The letters carry on from the second, on their weeks.
  const { letters, s: after } = playYear(s);
  assert(!letters.some((l) => l.id === OPENING_LETTERS[0].id), 'the first letter is never sent — the welcome was it');
  const calendar = letters.filter((l) => CALENDAR.some((c) => c.id === l.id));
  assert(!letters.some((l) => l.id === NEEDS_LETTER_ID), 'nor the needs letter — the walk was it');
  assert(calendar.map((l) => l.id).join(',') === CALENDAR.slice(1).filter((l) => l.id !== NEEDS_LETTER_ID).map((l) => l.id).join(','), `the rest of the calendar arrives in order (${letters.map((l) => l.id).join(',')})`);
  assert(after.clock.year === 2, 'and the year turns over');
}

// --- the walkthrough: a professor appointed before the hall stands ---------
{
  let s = reducer(foundWalk('Early'), { type: 'ADVANCE_OPENING' });
  s = reducer(s, { type: 'HIRE_FACULTY', facultyId: WALKTHROUGH_PROFESSOR });
  assert(s.events.opening.stage === 'site-hall', 'appointing first leaves the hall to site');
  s = siteHall(s);
  assert(s.events.opening.stage === 'found', 'and once it stands the walk goes straight to the program');
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
  assert(site?.intent?.kind === 'site' && site.go === 'build' && site.text.startsWith('Site Founders Hall'), `the next-step line says to site it (${site?.text})`);
  s = siteHall(s);
  assert(!openingHoldsClock(s) && nextStep(s)?.text.startsWith('Site Founders Hall') !== true, 'sited, the clock runs');
  const { letters } = playYear(s);
  assert(letters.length === 0, 'no letter is sent this run');

  // From the hall's step: the letters kept, the hall still unsited.
  let h = reducer(foundWalk('Skip hall'), { type: 'ADVANCE_OPENING' });
  h = reducer(h, { type: 'SKIP_OPENING', keepLetters: true });
  assert(h.events.opening.stage === 'play' && !h.events.opening.skipped, 'skipping the rest keeps the letters');
  assert(!(FOUNDERS_HALL_ID in h.placements) && openingHoldsClock(h), 'but the hall stays unplaced and the clock held');
  assert(nextStep(h)?.text.startsWith('Site Founders Hall') === true, 'and the line says to site it');
  h = siteHall(h);
  assert(!openingHoldsClock(h) && nextStep(h)?.text === OPENING_LETTERS[0].ask(h).text, `sited, the line is the first letter's ask (${nextStep(h)?.text})`);

  // From the professor's step: the hall stands, so the clock runs.
  let a = siteHall(reducer(foundWalk('Skip appoint'), { type: 'ADVANCE_OPENING' }));
  assert(a.events.opening.stage === 'appoint', 'on the professor\'s step');
  a = reducer(a, { type: 'SKIP_OPENING', keepLetters: true });
  assert(a.events.opening.stage === 'play' && !openingHoldsClock(a), 'skipped, the clock runs');
  assert(nextStep(a)?.intent?.kind === 'found' && nextStep(a)?.hallId === FOUNDERS_HALL_ID, `and the line asks for a program in Founders Hall (${nextStep(a)?.text})`);

  // From the program's step.
  let f = reducer(siteHall(reducer(foundWalk('Skip found'), { type: 'ADVANCE_OPENING' })), { type: 'HIRE_FACULTY', facultyId: WALKTHROUGH_PROFESSOR });
  assert(f.events.opening.stage === 'found', 'on the program\'s step');
  f = reducer(f, { type: 'SKIP_OPENING', keepLetters: true });
  assert(f.events.opening.stage === 'play' && !openingHoldsClock(f), 'skipped, the clock runs');
  assert(f.faculty.length === 1 && Object.values(f.halls).flat().every((slot) => slot.programId === null), 'with Bennett appointed and nothing founded');
}

// --- the course step (Plan 103B): skipped, and when it can't be done ------
{
  // Skipped: the letters kept, the clock runs.
  let s = untilStage(walkToCourse('Skip course'), 'second-course');
  assert(s.events.opening.stage === 'second-course', 'on the course step');
  s = reducer(s, { type: 'SKIP_OPENING', keepLetters: true });
  assert(s.events.opening.stage === 'play' && !s.events.opening.skipped && !openingHoldsClock(s), 'skipped, the letters are kept and the clock runs');
  const kept = playYear(s).letters.map((l) => l.id);
  assert(kept.includes(NEEDS_LETTER_ID), `skipped before the needs steps, their letter comes at week 9 (${kept.join(',')})`);

  // No program housed any more while the course is written: the walk ends
  // without the step.
  let gone = walkToCourse('Gone');
  gone.halls[FOUNDERS_HALL_ID][0].programId = null;
  gone = reducer(gone, { type: 'TICK' });
  assert(gone.events.opening.stage === 'needs', `a walk with no program left goes on to the needs at the next week (${gone.events.opening.stage})`);

  // Nothing the college can start (no cash for a course): the step is never
  // shown, so it can't hold the clock on what can't be done.
  let poor = walkToCourse('Poor');
  const entry = programById(WALKTHROUGH_PROGRAM)!.entryCourseId;
  for (let i = 0; i < 60 && poor.tech.find((t) => t.id === entry)?.status !== 'done'; i += 1) {
    poor = poor.pendingInterrupt ? reducer(poor, defaultAnswer(poor)!) : reducer(poor, { type: 'TICK' });
  }
  assert(poor.events.opening.stage === 'await-course', 'the course is taught, the step not yet settled');
  poor.finance.cash = 0;
  poor = reducer(poor, { type: 'TICK' });
  assert(poor.events.opening.stage === 'needs', `with no course it can afford, the walk goes on to the needs without the step (${poor.events.opening.stage})`);

  // A save at 'play' (an old save, or a headless run) never gets the step.
  let headless = foundWalk('No step', false);
  headless = reducer(headless, { type: 'HIRE_FACULTY', facultyId: WALKTHROUGH_PROFESSOR });
  headless = reducer(headless, { type: 'FOUND_PROGRAM', programId: WALKTHROUGH_PROGRAM, hallId: FOUNDERS_HALL_ID, slot: 0, facultyId: WALKTHROUGH_PROFESSOR });
  for (let i = 0; i < 10; i += 1) headless = headless.pendingInterrupt ? reducer(headless, defaultAnswer(headless)!) : reducer(headless, { type: 'TICK' });
  assert(headless.tech.find((t) => t.id === entry)?.status === 'done' && headless.events.opening.stage === 'play', 'a run at play stays at play when its first course is taught');

  // A save on the step resumes on it.
  const step = untilStage(walkToCourse('Resume'), 'second-course');
  assert(saveGame(step) && loadGame()?.events.opening.stage === 'second-course', 'a save on the course step resumes on it');
}

// --- the needs steps (Plan 103C): already done, skipped, and when they can't be ---
{
  // Both already sited before the needs: the card says so, and Next ends the walk.
  let both = untilStage(walkToCourse('Both'), 'second-course');
  both = siteAnywhere(both, both.tech.find((t) => t.kind === 'dorm' && t.status === 'available')!.id);
  both = siteAnywhere(both, both.tech.find((t) => t.facilityType === 'diningHall' && t.status === 'available')!.id);
  assert(both.events.opening.stage === 'second-course', 'siting both on the course step leaves it standing');
  const course = programById(WALKTHROUGH_PROGRAM)!.courseIds.find((id) => both.tech.find((t) => t.id === id)?.status === 'available')!;
  both = reducer(both, { type: 'START_DEVELOPMENT', nodeId: course, facultyId: WALKTHROUGH_PROFESSOR });
  assert(both.events.opening.stage === 'needs' && OPENING_STEPS.needs.body(both).includes('are going up'), `the needs card says both are going up (${OPENING_STEPS.needs.body(both).slice(-90)})`);
  both = reducer(both, { type: 'ADVANCE_OPENING' });
  assert(both.events.opening.stage === 'play' && !openingHoldsClock(both), 'and Next ends the walk, both site steps already done');

  // Only the residence hall sited: Next goes straight to the dining hall.
  let one = untilStage(walkToCourse('One'), 'second-course');
  one = siteAnywhere(one, one.tech.find((t) => t.kind === 'dorm' && t.status === 'available')!.id);
  one = reducer(one, { type: 'START_DEVELOPMENT', nodeId: course, facultyId: WALKTHROUGH_PROFESSOR });
  one = reducer(one, { type: 'ADVANCE_OPENING' });
  assert(one.events.opening.stage === 'site-dining', `with a residence hall sited, Next asks only for the dining hall (${one.events.opening.stage})`);

  // Skipped from each needs card: the letters kept, the needs letter not sent.
  for (const stage of ['needs', 'site-housing', 'site-dining'] as const) {
    let k = untilStage(walkToCourse(`Skip ${stage}`), 'second-course');
    k = reducer(k, { type: 'START_DEVELOPMENT', nodeId: course, facultyId: WALKTHROUGH_PROFESSOR });
    if (stage !== 'needs') k = reducer(k, { type: 'ADVANCE_OPENING' });
    if (stage === 'site-dining') k = siteAnywhere(k, walkBuilding(k)!.id);
    assert(k.events.opening.stage === stage, `on the ${stage} step (${k.events.opening.stage})`);
    k = reducer(k, { type: 'SKIP_OPENING', keepLetters: true });
    assert(k.events.opening.stage === 'play' && !k.events.opening.skipped && !openingHoldsClock(k), `skipped from ${stage}, the clock runs and the letters are kept`);
    const sent = playYear(k).letters.map((l) => l.id);
    assert(!sent.includes(NEEDS_LETTER_ID), `and the needs letter is not sent: the step showed it (${sent.join(',')})`);
  }

  // Nothing the college can put up (no cash, no loan): the site steps pass.
  let broke = untilStage(walkToCourse('Broke'), 'second-course');
  broke = reducer(broke, { type: 'START_DEVELOPMENT', nodeId: course, facultyId: WALKTHROUGH_PROFESSOR });
  broke.finance.cash = 0;
  broke.finance.loans = [];
  for (const t of broke.tech) if (t.kind === 'dorm' || t.facilityType === 'diningHall') t.cost = 1e12;
  broke = reducer(broke, { type: 'ADVANCE_OPENING' });
  assert(broke.events.opening.stage === 'play' && !openingHoldsClock(broke), `with neither building within reach, Next ends the walk (${broke.events.opening.stage})`);
}

// --- each card introduces its own step, in the order played (Plan 104L) ----
{
  const words = (stage: GameState['events']['opening']['stage'], s: GameState) => OPENING_STEPS[stage as 'welcome'].body(s).toLowerCase();
  const w = foundWalk('Order');
  const site = reducer(w, { type: 'ADVANCE_OPENING' });
  const appoint = siteHall(site);
  const found = reducer(appoint, { type: 'HIRE_FACULTY', facultyId: WALKTHROUGH_PROFESSOR });
  // A card names no step it doesn't lead to: the welcome and the hall's
  // step no professor, program or course; choosing the program no course.
  for (const [stage, s, banned] of [
    ['welcome', w, ['professor', 'program', 'course', 'in that order']],
    ['site-hall', site, ['professor', 'program', 'course']],
    ['appoint', appoint, ['course']],
  ] as const) {
    const said = banned.filter((term) => words(stage, s).includes(term));
    assert(said.length === 0, `${stage}: names no later step (${said.join(', ')})`);
  }
  // Choosing the program reads program, then professor (decision 8).
  const pick = OPENING_STEPS.appoint.body(appoint);
  assert(OPENING_STEPS.appoint.title === 'Choose the first program', `the step is choosing a program (${OPENING_STEPS.appoint.title})`);
  assert(pick.includes('English, with Dr. Grace Bennett; Mathematics, with Dr. Priya Iyer; and Economics, with Dr. John Okafor'), `the three founding candidates as three programs (${pick})`);
  assert(words('found', found).indexOf('course') >= 0, 'courses come in when the program is founded');
}

// --- the walkthrough never opens a gated tab (Plan 104M) -------------------
{
  const doorTab = { curriculum: 'curriculum', build: null, hall: null } as const;
  let w = foundWalk('Doors');
  const seen: string[] = [];
  const check = () => {
    const stage = w.events.opening.stage;
    if (stage === 'play' || stage === 'await-course') return;
    const door = OPENING_STEPS[stage].door;
    const tab = door ? doorTab[door] : null;
    seen.push(stage);
    assert(tab === null || tabAvailable(w, tab), `${stage}: its door (${door}) is open`);
  };
  check();
  w = reducer(w, { type: 'ADVANCE_OPENING' }); check();
  w = siteHall(w); check();
  w = reducer(w, { type: 'HIRE_FACULTY', facultyId: WALKTHROUGH_PROFESSOR }); check();
  w = reducer(w, { type: 'FOUND_PROGRAM', programId: WALKTHROUGH_PROGRAM, hallId: FOUNDERS_HALL_ID, slot: 0, facultyId: WALKTHROUGH_PROFESSOR });
  w = untilStage(w, 'second-course'); check();
  const next = programById(WALKTHROUGH_PROGRAM)!.courseIds.find((id) => w.tech.find((t) => t.id === id)?.status === 'available')!;
  w = reducer(w, { type: 'START_DEVELOPMENT', nodeId: next, facultyId: WALKTHROUGH_PROFESSOR }); check();
  w = reducer(w, { type: 'ADVANCE_OPENING' }); check();
  assert(seen.join(',') === 'welcome,site-hall,appoint,found,second-course,needs,site-housing', `every card checked (${seen.join(',')})`);
  assert(Object.values(OPENING_STEPS).every((step) => step.door === undefined || step.door in doorTab), 'no card has a door to a gated tab');
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
      s, act: (a: Action) => acted.push(a), buildOpen: false, hallOpen: false, curriculumOpen: false, studentsOpen: false, placing: false,
      onOpenBuild: () => {}, onOpenHall: () => {}, onOpenCurriculum: () => {}, onOpenStudents: () => {},
    };
    const Probe = () => { tree = OpeningCoach(props); return null; };
    renderToStaticMarkup(createElement(Probe));
    return { acted, elements: all(tree), html: renderToStaticMarkup(createElement(OpeningCoach, props)) };
  };

  const welcome = foundWalk('Ask');
  const siteStep = reducer(welcome, { type: 'ADVANCE_OPENING' });
  const appointStep = siteHall(siteStep);
  const foundStep = reducer(appointStep, { type: 'HIRE_FACULTY', facultyId: WALKTHROUGH_PROFESSOR });
  const courseStep = untilStage(walkToCourse('Ask course'), 'second-course');
  const course = walkProgram(courseStep) ? programById(walkProgram(courseStep)!)!.courseIds.find((id) => courseStep.tech.find((t) => t.id === id)?.status === 'available')! : '';
  const needsStep = reducer(courseStep, { type: 'START_DEVELOPMENT', nodeId: course, facultyId: WALKTHROUGH_PROFESSOR });
  const housingStep = reducer(needsStep, { type: 'ADVANCE_OPENING' });
  const diningStep = siteAnywhere(housingStep, walkBuilding(housingStep)!.id);
  const steps = [welcome, siteStep, appointStep, foundStep, courseStep, needsStep, housingStep, diningStep];
  assert(steps.map((x) => x.events.opening.stage).join(',') === 'welcome,site-hall,appoint,found,second-course,needs,site-housing,site-dining',
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
