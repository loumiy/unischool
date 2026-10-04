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
// students — is the next-step line the moment the walk ends. Skipping at
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
import { teachPillars } from './fixtures/teaching';
import { nextStep } from '../src/systems/guidance/nextStep';
import { openingHoldsClock } from '../src/state/opening';
import { awaitsSite, centredPlacement, footprintOf } from '../src/state/campusMap';
import { FOUNDING_VERNACULAR } from '../src/data/foundingData';
import { FOUNDING_COLORS, schoolColorsOf } from '../src/data/schoolColors';
import { loadGame, saveGame } from '../src/state/persistence';
import type { GameState } from '../src/state/types';

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
  s.students.satisfactionBreakdown = { academic: 70, social: 70, basicNeeds: 70, health: 70, housing: 70 };
  const offers = s.programOffers;
  s.programOffers = [];
  assert(nextStep(s) === null, 'a quiet campus with nothing on offer has no next step — the line is a reading, not a queue');

  s.students.satisfactionBreakdown.basicNeeds = 32;
  assert(nextStep(s)?.text.startsWith('Basic needs is at 32') === true && nextStep(s)?.go === 'build', `a shortfall under 50 is named with its figure (${nextStep(s)?.text})`);

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
  assert(OPENING_STEPS.welcome.body(s).includes('nobody is on the payroll'), 'and the welcome says nobody is on the payroll yet');
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
  assert(OPENING_STEPS.found.body(s).startsWith('Found English'), `the card names English (${OPENING_STEPS.found.body(s).slice(0, 40)})`);

  // Found English: its entry course goes to the committee.
  const entry = programById(WALKTHROUGH_PROGRAM)!.entryCourseId;
  s = reducer(s, { type: 'FOUND_PROGRAM', programId: WALKTHROUGH_PROGRAM, hallId: FOUNDERS_HALL_ID, slot: 0, facultyId: WALKTHROUGH_PROFESSOR });
  assert(s.halls[FOUNDERS_HALL_ID][0].programId === WALKTHROUGH_PROGRAM, 'English is founded into Founders Hall');
  assert(s.tech.find((t) => t.id === entry)?.status === 'developing' && s.courseFaculty[entry] === WALKTHROUGH_PROFESSOR, 'its entry course is with the committee, Bennett to teach it');
  assert(s.events.opening.stage === 'play' && !openingHoldsClock(s), 'and the walk is over');
  const line = nextStep(s);
  assert(line !== null && line.text.startsWith('Places for 80 of 350 students') && line.text === OPENING_LETTERS[0].ask(s).text, `the line is the first letter's ask: seat the students (${line?.text})`);

  // The letters carry on from the second, on their weeks.
  const { letters, s: after } = playYear(s);
  assert(!letters.some((l) => l.id === OPENING_LETTERS[0].id), 'the first letter is never sent — the welcome was it');
  const calendar = letters.filter((l) => CALENDAR.some((c) => c.id === l.id));
  assert(calendar.map((l) => l.id).join(',') === CALENDAR.slice(1).map((l) => l.id).join(','), `the rest of the calendar arrives in order (${letters.map((l) => l.id).join(',')})`);
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

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
