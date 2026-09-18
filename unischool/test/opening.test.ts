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
// latest letter's ask until it is done, and afterwards a reading of the
// campus that goes quiet when nothing is on offer.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { createInitialState } from '../src/state/actions';
import { reducer } from '../src/engine/reducer';
import { defaultAnswer } from '../src/engine/defaultAnswers';
import { OPENING_LETTERS } from '../src/data/eventData';
import { GENED_CORE_IDS } from '../src/data/techData';
import { nextStep } from '../src/systems/guidance/nextStep';
import type { GameState } from '../src/state/types';

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
  assert(nextStep(s)?.go === 'curriculum', 'and it points at the Curriculum');
  for (const id of GENED_CORE_IDS) s = reducer(s, { type: 'START_DEVELOPMENT', nodeId: id });
  assert(OPENING_LETTERS[0].done(s), 'starting all six core courses does the first ask');
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
  assert(nextStep(s) === null, 'a quiet campus with nothing on offer has no next step — the line is a reading, not a queue');

  s.students.satisfactionBreakdown.basicNeeds = 32;
  assert(nextStep(s)?.text.startsWith('Basic needs is at 32') && nextStep(s)?.go === 'build', `a shortfall under 50 is named with its figure (${nextStep(s)?.text})`);

  // A standing hall with a free slot outranks a shortfall: founding is the
  // most valuable click there is.
  const hall = s.tech.find((t) => t.id === 'HALL-01')!;
  hall.status = 'done';
  s.placements[hall.id] = { row: 0, col: 0, w: 1, h: 1 };
  s.halls[hall.id] = Array.from({ length: hall.slots ?? 6 }, () => ({ programId: null }));
  s.programOffers = ['COMP'];
  const step = nextStep(s);
  assert(step?.go === 'curriculum' && step.text.includes(hall.name) && step.text.includes('Computer Science'), `a free slot with a program on offer is the line (${step?.text})`);
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
