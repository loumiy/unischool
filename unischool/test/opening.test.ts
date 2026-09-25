// ---------------------------------------------------------------------
// The first year's script (Plan 16's PR F): four letters from the board's
// chair (data/eventData.ts's OPENING_LETTERS), fired through the interrupt
// system on the first quiet week at or after each letter's week of year
// one (eventSystem.ts's fireOpeningLetter), skippable from the first, and
// the next-step line the toolbar carries (systems/guidance/nextStep.ts).
//
// What is pinned: the letters arrive in order, at or after their weeks, in
// year one and never again; each fires once; "I know the way" stands the
// rest down; the shared defaults read them; the next-step line is the
// latest letter's ask until it is done, and afterward a reading of the
// campus that goes quiet when nothing is on offer.
//
// AND THE WALKTHROUGH (state/opening.ts): a guided founding
// opens with the clock held and Founders Hall unsited; the hall sites for
// nothing and its standing moves the walk on; Next moves the two click
// steps on; the fourth program founded frees the clock (Plan 19 — the
// college opens teaching three); the first letter is counted read so its
// ask is the next-step line the moment the walk ends and the letters carry
// on from the second (its ask, the fourth program, is what the walk just
// did); declining places the hall and stands the letters
// down; and a headless founding is untouched by all of it. The hold
// survives a save, and so do the founding programs' slots.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { createInitialState, createPreStartState } from '../src/state/actions';
import { reducer } from '../src/engine/reducer';
import { defaultAnswer } from '../src/engine/defaultAnswers';
import { OPENING_LETTERS } from '../src/data/eventData';
import { FOUNDERS_HALL_ID, programById } from '../src/data/techData';
import { FOUNDING_PROGRAMS } from '../src/data/foundingData';
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

// --- four letters, in order, at or after their weeks, in year one -------
{
  const { s, letters } = playYear(createInitialState('Opening'));
  assert(letters.length === OPENING_LETTERS.length, `every letter is delivered in year one (${letters.length} of ${OPENING_LETTERS.length})`);
  assert(letters.map((l) => l.id).join(',') === OPENING_LETTERS.map((l) => l.id).join(','), 'in the order they were written');
  for (const [i, letter] of OPENING_LETTERS.entries()) {
    const fired = letters[i];
    assert(fired !== undefined && fired.week >= letter.week && fired.week <= letter.week + 4, `"${letter.title}" arrives at or just after week ${letter.week} (week ${fired?.week})`);
  }
  assert(letters[0].week === 1, 'the doors open in week one — the first thing a new player sees');
  assert(s.clock.year === 2, 'and the year still turns over');
  assert(s.events.opening.read.length === OPENING_LETTERS.length && !s.events.opening.skipped, 'every letter is recorded read, and the script was not declined');

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
  assert(letters.length === OPENING_LETTERS.length - 1, 'the rest still arrive');
}

// --- the next-step line: the letter's ask until it is done ----------------
{
  let s = createInitialState('Next');
  assert(nextStep(s) === null, 'before any letter there is nothing to say');
  s = reducer(s, { type: 'TICK' });
  s = reducer(s, { type: 'RESOLVE_LETTER', skipAll: false });
  assert(nextStep(s)?.text === OPENING_LETTERS[0].ask, `after the first letter the line is its ask (${nextStep(s)?.text})`);
  assert(nextStep(s)?.go === 'hall' && nextStep(s)?.hallId === 'BLDG-GENSTUDIES', "and it opens Founders Hall's panel, where a program is founded");
  // Found a fourth program into one of Founders Hall's free rooms — the
  // founding draw guarantees one the roster can staff.
  const staffable = s.programOffers.find((id) => s.faculty.some((f) => f.field === programById(id)!.field))!;
  const instructor = s.faculty.find((f) => f.field === programById(staffable)!.field)!;
  s = reducer(s, { type: 'FOUND_PROGRAM', programId: staffable, hallId: FOUNDERS_HALL_ID, slot: FOUNDING_PROGRAMS.length, facultyId: instructor.id });
  assert(OPENING_LETTERS[0].done(s), 'founding a fourth program does the first ask');
  assert(nextStep(s) === null, 'and the line goes quiet until the next letter');

  // The second letter's ask, and the reading it hands to the build menu.
  s.events.opening.read.push(OPENING_LETTERS[1].id);
  assert(nextStep(s)?.text === OPENING_LETTERS[1].ask && nextStep(s)?.go === 'build', 'the second letter\'s ask points at the build menu');
}

// --- after the first year: a reading of the campus ------------------------
{
  const s = createInitialState('Reading');
  s.clock.year = 2;
  s.students.satisfactionBreakdown = { academic: 70, social: 70, basicNeeds: 70, health: 70, housing: 70 };
  const offers = s.programOffers;
  s.programOffers = [];
  assert(nextStep(s) === null, 'a quiet campus with nothing on offer has no next step — the line is a reading, not a queue');

  s.students.satisfactionBreakdown.basicNeeds = 32;
  assert(nextStep(s)?.text.startsWith('Basic needs is at 32') === true && nextStep(s)?.go === 'build', `a shortfall under 50 is named with its figure (${nextStep(s)?.text})`);

  // A standing hall with a free slot outranks a shortfall: founding is the
  // most valuable click there is — and at founding that hall is Founders
  // Hall, with its three free rooms (Plan 19).
  s.programOffers = offers;
  const founders = nextStep(s);
  assert(founders?.go === 'hall' && founders.text.includes('Founders Hall'), `Founders Hall's free rooms are the line while programs are on offer (${founders?.text})`);
  for (const slot of s.halls[FOUNDERS_HALL_ID]) if (slot.programId === null) slot.programId = 'FINA';
  s.halls[FOUNDERS_HALL_ID][4] = { programId: 'ACCT' };
  s.halls[FOUNDERS_HALL_ID][5] = { programId: 'ECON' };
  const hall = s.tech.find((t) => t.id === 'HALL-01')!;
  hall.status = 'done';
  s.placements[hall.id] = { row: 0, col: 0, w: 1, h: 1 };
  s.halls[hall.id] = Array.from({ length: hall.slots ?? 6 }, () => ({ programId: null }));
  s.programOffers = ['COMP'];
  const step = nextStep(s);
  assert(step?.go === 'hall' && step.hallId === hall.id && step.text.includes(hall.name) && step.text.includes('Computer Science'), `a free slot with a program on offer is the line (${step?.text})`);
}

// --- the walkthrough: a guided founding --------------------------------
{
  const found = (guided: boolean) => reducer(createPreStartState(), {
    type: 'START_GAME', name: 'Walk', vernacular: FOUNDING_VERNACULAR, colors: schoolColorsOf(FOUNDING_COLORS), guided,
  });

  // Headless: exactly what every founding was before the walk existed.
  const headless = found(false);
  assert(headless.events.opening.stage === 'play' && !openingHoldsClock(headless), 'a headless founding opens at play');
  assert(FOUNDERS_HALL_ID in headless.placements, 'with Founders Hall pre-placed');
  assert(headless.events.opening.read.length === 0, 'and no letter read');
  assert(createInitialState('Plain').events.opening.stage === 'play', 'createInitialState defaults to a headless founding');

  // Guided: held, and the hall waits to be sited.
  let s = found(true);
  assert(s.events.opening.stage === 'welcome' && openingHoldsClock(s), 'a guided founding opens on the welcome with the clock held');
  assert(!(FOUNDERS_HALL_ID in s.placements), 'Founders Hall is not placed');
  assert(FOUNDING_PROGRAMS.every((id, i) => s.halls[FOUNDERS_HALL_ID]?.[i]?.programId === id), 'but its slots hold the founding programs all the same');
  assert(s.events.opening.read.includes(OPENING_LETTERS[0].id) && !s.events.opening.skipped, 'the first letter is counted read — the welcome is its content');
  assert(nextStep(s) === null, 'the next-step line is silent while the walk holds the clock');
  const week = s.clock.week;
  s = reducer(s, { type: 'TICK' });
  assert(s.clock.week === week && s.pendingInterrupt === null, 'TICK is a no-op while the walk holds the clock — no letter, no week');

  // The founding save carries the hold, and the founding programs' slots.
  assert(saveGame(s), 'a mid-walk save is written');
  const resumed = loadGame();
  assert(resumed?.events.opening.stage === 'welcome', 'and resumes on the same step');
  assert(resumed?.halls[FOUNDERS_HALL_ID]?.[0]?.programId === FOUNDING_PROGRAMS[0], "the loader keeps Founders Hall's slots though the hall is unsited");

  // Next -> site the hall. Only the hall standing moves this step on.
  s = reducer(s, { type: 'ADVANCE_OPENING' });
  assert(s.events.opening.stage === 'site-hall', 'Next on the welcome asks for the hall');
  s = reducer(s, { type: 'ADVANCE_OPENING' });
  assert(s.events.opening.stage === 'site-hall', 'Next does nothing on a step that ends on something done');
  const hall = s.tech.find((t) => t.id === FOUNDERS_HALL_ID)!;
  assert(awaitsSite(s, hall), 'Founders Hall is built and awaits a site');
  const cash = s.finance.cash;
  const spot = centredPlacement(footprintOf(hall));
  s = reducer(s, { type: 'PLACE_BUILDABLE', buildableId: FOUNDERS_HALL_ID, row: spot.row, col: spot.col, rotated: false });
  assert(FOUNDERS_HALL_ID in s.placements, 'the hall is sited');
  assert(s.finance.cash === cash, 'and nothing was charged for it');
  assert(s.events.opening.stage === 'teaching', 'the hall standing moves the walk on');
  assert(openingHoldsClock(s), 'the clock is still held');

  // Next -> found a fourth program. A course started along the way does
  // not end the walk; a founding does.
  s = reducer(s, { type: 'ADVANCE_OPENING' });
  assert(s.events.opening.stage === 'found', 'Next on "teaching" asks for the fourth program');
  s = reducer(s, { type: 'START_DEVELOPMENT', nodeId: 'ENGL120' });
  assert(s.tech.find((t) => t.id === 'ENGL120')?.status === 'developing' && s.events.opening.stage === 'found', 'a course started is not the step');
  const fourth = s.programOffers.find((id) => s.faculty.some((f) => f.field === programById(id)!.field))!;
  const teacher = s.faculty.find((f) => f.field === programById(fourth)!.field)!;
  s = reducer(s, { type: 'FOUND_PROGRAM', programId: fourth, hallId: FOUNDERS_HALL_ID, slot: FOUNDING_PROGRAMS.length, facultyId: teacher.id });
  assert(s.halls[FOUNDERS_HALL_ID][FOUNDING_PROGRAMS.length].programId === fourth, 'the fourth program is founded into Founders Hall');
  assert(s.events.opening.stage === 'play' && !openingHoldsClock(s), 'and the walk is over');
  assert(OPENING_LETTERS[0].done(s) && nextStep(s) === null, 'the walk was the first letter\'s ask, so the line is quiet until the second letter');

  // The letters carry on from the second, on their weeks.
  const { letters, s: after } = playYear(s);
  assert(!letters.some((l) => l.id === OPENING_LETTERS[0].id), 'the first letter is never sent — the welcome was it');
  assert(letters.map((l) => l.id).join(',') === OPENING_LETTERS.slice(1).map((l) => l.id).join(','), `the rest arrive in order (${letters.map((l) => l.id).join(',')})`);
  assert(after.clock.year === 2, 'and the year turns over');
}

// --- the walkthrough: a program founded early ends it too -------------------
{
  let s = reducer(createPreStartState(), {
    type: 'START_GAME', name: 'Early', vernacular: FOUNDING_VERNACULAR, colors: schoolColorsOf(FOUNDING_COLORS), guided: true,
  });
  s = reducer(s, { type: 'ADVANCE_OPENING' });
  const hall = s.tech.find((t) => t.id === FOUNDERS_HALL_ID)!;
  const spot = centredPlacement(footprintOf(hall));
  s = reducer(s, { type: 'PLACE_BUILDABLE', buildableId: FOUNDERS_HALL_ID, row: spot.row, col: spot.col, rotated: false });
  assert(s.events.opening.stage === 'teaching', 'on "teaching"');
  const fourth = s.programOffers.find((id) => s.faculty.some((f) => f.field === programById(id)!.field))!;
  const teacher = s.faculty.find((f) => f.field === programById(fourth)!.field)!;
  s = reducer(s, { type: 'FOUND_PROGRAM', programId: fourth, hallId: FOUNDERS_HALL_ID, slot: FOUNDING_PROGRAMS.length, facultyId: teacher.id });
  assert(s.events.opening.stage === 'play', 'a program founded before pressing Next has done the step');
}

// --- the walkthrough: "I know the way" -------------------------------------
{
  let s = reducer(createPreStartState(), {
    type: 'START_GAME', name: 'Skip', vernacular: FOUNDING_VERNACULAR, colors: schoolColorsOf(FOUNDING_COLORS), guided: true,
  });
  s = reducer(s, { type: 'SKIP_OPENING' });
  assert(s.events.opening.stage === 'play' && !openingHoldsClock(s), 'declining frees the clock');
  assert(s.events.opening.skipped, 'and stands the letters down');
  const hall = s.tech.find((t) => t.id === FOUNDERS_HALL_ID)!;
  const spot = centredPlacement(footprintOf(hall));
  const placed = s.placements[FOUNDERS_HALL_ID];
  assert(placed !== undefined && placed.row === spot.row && placed.col === spot.col, 'and Founders Hall stands where a headless founding puts it');
  const { letters } = playYear(s);
  assert(letters.length === 0, 'no letter is sent this run');
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
