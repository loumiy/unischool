// ---------------------------------------------------------------------
// Sorting schools (Plan 55): programs begin in Founders Hall and move out,
// school by school, into halls of their own, until every school has one
// and Founders Hall stands empty.
//
// What is pinned: the chain is seven purchased halls, one a school; a move
// out of Founders Hall is four weeks dark and any other twelve; the
// readings (systems/techtree/schools.ts) say which hall a school claims,
// which school moves next and where a program should go; the next-step
// line names the move before a free slot, and a free slot in a school's
// hall for that school's offer; and the letters that wait on the college
// (data/eventData.ts's OPENING_LETTERS with `arrives`) come when the
// college is ready, in any year, and ask for exactly the next move.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { createInitialState } from '../src/state/actions';
import { reducer } from '../src/engine/reducer';
import { ACADEMIC_HALL_COUNT, FOUNDERS_HALL_ID, isAcademicHall, milestoneSchools } from '../src/data/techData';
import { OPENING_LETTERS } from '../src/data/eventData';
import { FOUNDERS_MOVE_WEEKS, RELOCATION_WEEKS, relocationWeeks } from '../src/systems/techtree/techSystem';
import { claimedSchool, nextSchoolToMove, suggestedMove } from '../src/systems/techtree/schools';
import { fireOpeningLetter } from '../src/systems/events/eventSystem';
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

console.log('sorting tests');

// A college a few months in: the founding three (English, Mathematics,
// Economics) and a fourth, Psychology, in Founders Hall — two Science
// programs, one each of the other two schools.
function college(name: string): GameState {
  const s = createInitialState(name);
  s.halls[FOUNDERS_HALL_ID][3] = { programId: 'PSYC' };
  s.clock.year = 2;
  s.students.satisfactionBreakdown = { academic: 70, social: 70, basicNeeds: 70, health: 70, housing: 70 };
  s.programOffers = [];
  return s;
}

// A purchased hall standing, empty.
function stand(s: GameState, id: string, col: number): void {
  const hall = s.tech.find((t) => t.id === id)!;
  hall.status = 'done';
  s.placements[id] = { row: 10, col, w: 7, h: 5 };
  s.halls[id] = Array.from({ length: hall.slots ?? 6 }, () => ({ programId: null }));
}

// Fires the letter due, if any, and says which it was.
function fired(s: GameState): string | undefined {
  if (!fireOpeningLetter(s)) return undefined;
  return (s.pendingInterrupt?.payload as { id: string } | undefined)?.id;
}

function letter(id: string) {
  return OPENING_LETTERS.find((l) => l.id === id)!;
}

// --- the chain: one purchased hall a school --------------------------------
{
  const s = createInitialState('Chain');
  const purchased = s.tech.filter((t) => isAcademicHall(t) && t.id !== FOUNDERS_HALL_ID);
  assert(purchased.length === 7 && ACADEMIC_HALL_COUNT === 7, `seven purchased halls (${purchased.length})`);
  assert(purchased.length === milestoneSchools().length, 'one for each school');
  assert(purchased.map((t) => t.name).join(',') === 'Elm Hall,Oak Hall,Linden Hall,Maple Hall,Chestnut Hall,Sycamore Hall,Cedar Hall', 'Elm through Cedar');
}

// --- moves: four weeks out of Founders Hall, twelve between halls --------
{
  let s = college('Moves');
  stand(s, 'HALL-01', 20);
  stand(s, 'HALL-02', 40);
  assert(relocationWeeks(s, 'MATH') === FOUNDERS_MOVE_WEEKS && FOUNDERS_MOVE_WEEKS === 4, 'a move out of Founders Hall is four weeks');
  s = reducer(s, { type: 'RELOCATE_PROGRAM', programId: 'MATH', hallId: 'HALL-01', slot: 0 });
  assert(s.halls['HALL-01'][0].programId === 'MATH' && s.halls['HALL-01'][0].transitWeeks === 4, 'Mathematics goes dark for four weeks');
  // Four weeks; whatever else the weeks raise is put aside.
  for (let i = 0; i < 4; i += 1) {
    s.pendingInterrupt = null;
    s = reducer(s, { type: 'TICK' });
  }
  assert(s.halls['HALL-01'][0].transitWeeks === undefined, 'and is teaching again after four');
  assert(relocationWeeks(s, 'MATH') === RELOCATION_WEEKS && RELOCATION_WEEKS === 12, 'a move between purchased halls is still twelve');
  s = reducer(s, { type: 'RELOCATE_PROGRAM', programId: 'MATH', hallId: 'HALL-02', slot: 0 });
  assert(s.halls['HALL-02'][0].transitWeeks === 12, 'and is');
}

// --- the readings ---------------------------------------------------------
{
  let s = college('Readings');
  assert(claimedSchool(s, FOUNDERS_HALL_ID) === null, 'Founders Hall is no school\'s hall');
  assert(nextSchoolToMove(s) === 'Science', `Science, with two programs in Founders Hall, moves first (${nextSchoolToMove(s)})`);
  assert(suggestedMove(s, 'MATH') === null, 'with no hall standing there is nowhere to move');

  stand(s, 'HALL-01', 20);
  assert(claimedSchool(s, 'HALL-01') === null, 'an empty hall is claimed by nobody');
  const first = suggestedMove(s, 'MATH');
  assert(first?.hallId === 'HALL-01' && first.slot === 0, 'Mathematics is sent to the empty hall');
  assert(suggestedMove(s, 'ENGL') === null, 'English is not: Science moves first');

  s = reducer(s, { type: 'RELOCATE_PROGRAM', programId: 'MATH', hallId: 'HALL-01', slot: 0 });
  const claim = claimedSchool(s, 'HALL-01');
  assert(claim?.school === 'Science' && claim.housed === 1 && claim.slots === 6, 'a program on its way claims the hall for its school');
  assert(suggestedMove(s, 'MATH') === null, 'a program at home stays');
  assert(suggestedMove(s, 'PSYC')?.hallId === 'HALL-01', "Psychology is sent to Science's hall");
  assert(suggestedMove(s, 'ENGL') === null && nextSchoolToMove(s) === 'Social Sciences & Humanities', 'English waits for a hall of its own, and its school is next');

  s.halls['HALL-01'][1] = { programId: 'ENGL' };
  s.halls[FOUNDERS_HALL_ID][0] = { programId: null };
  assert(claimedSchool(s, 'HALL-01') === null, 'a mixed hall is claimed by nobody');
  assert(suggestedMove(s, 'ENGL') === null && suggestedMove(s, 'MATH') === null, 'and with no empty hall nothing in it has anywhere to go');
}

// --- the next-step line ---------------------------------------------------
{
  let s = college('Line');
  stand(s, 'HALL-01', 20);
  const move = nextStep(s);
  assert(move?.go === 'hall' && move.hallId === FOUNDERS_HALL_ID && move.text === 'Elm Hall stands empty: move Mathematics into it and Science has a hall of its own', `an empty hall names the move (${move?.text})`);

  s = reducer(s, { type: 'RELOCATE_PROGRAM', programId: 'MATH', hallId: 'HALL-01', slot: 0 });
  const next = nextStep(s);
  assert(next?.hallId === FOUNDERS_HALL_ID && next.text === 'Psychology could move to Elm Hall, which teaches Science', `then the next of its school (${next?.text})`);

  s = reducer(s, { type: 'RELOCATE_PROGRAM', programId: 'PSYC', hallId: 'HALL-01', slot: 1 });
  assert(nextStep(s) === null, 'with every Science program at home and nothing on offer, the line is quiet');

  s.programOffers = ['HIST', 'PHYS'];
  const home = nextStep(s);
  assert(home?.hallId === 'HALL-01' && home.text === 'Elm Hall has room for Physics, on offer — it teaches Science', `an offer of a school with a hall goes to that hall (${home?.text})`);
  s.programOffers = ['HIST'];
  const founders = nextStep(s);
  assert(founders?.hallId === FOUNDERS_HALL_ID && founders.text.startsWith('Founders Hall has a free slot'), `anything else goes to Founders Hall (${founders?.text})`);
  for (const [i, id] of ['SOCY', 'FINA', 'ACCT', 'ANTH'].entries()) s.halls[FOUNDERS_HALL_ID][[1, 3, 4, 5][i]] = { programId: id };
  const full = nextStep(s);
  assert(full?.go === undefined && full?.text === 'Founders Hall is full; Elm Hall has room for Science when one is on offer', `and when Founders Hall is full, the line says whose room is left (${full?.text})`);
}

// --- the letters that wait on the college ---------------------------------
{
  const s = college('Letters');
  s.events.opening.read = ['doors-open', 'somewhere-to-sleep', 'summer-is-coming'];
  s.clock.year = 3;
  assert(!fireOpeningLetter(s), 'nothing is due before the first hall opens');

  // Eight courses open Elm Hall (the ladder's 'curriculum' milestone).
  s.tech.find((t) => t.id === 'HALL-01')!.status = 'available';
  assert(fired(s) === 'a-hall-of-its-own', 'Elm Hall opening brings "A hall of its own", in year three as in year one');
  s.pendingInterrupt = null;
  const hall = letter('a-hall-of-its-own');
  assert(hall.ask(s).text === 'Site Elm Hall' && hall.ask(s).go === 'build', `its ask is to site Elm Hall (${hall.ask(s).text})`);
  assert(!hall.body(s).includes('undefined'), 'and its body reads');
  assert(nextStep(s)?.text === 'Site Elm Hall', 'the line carries the ask past year one');

  s.placements['HALL-01'] = { row: 10, col: 20, w: 7, h: 5 };
  assert(hall.done(s), 'siting it is done');
  assert(!fireOpeningLetter(s), 'nothing more until it stands');

  stand(s, 'HALL-01', 20);
  assert(fired(s) === 'moving-in', 'Elm Hall standing brings "Moving in"');
  s.pendingInterrupt = null;
  const moving = letter('moving-in');
  const body = moving.body(s);
  assert(body.includes('Science has two programs in Founders Hall — Mathematics and Psychology') && body.includes('four weeks dark, not the twelve'), `it names the school to move and what the move costs (${body})`);
  assert(moving.ask(s).text === 'Move Mathematics into Elm Hall' && moving.ask(s).hallId === FOUNDERS_HALL_ID, `and asks for one move, from Founders Hall's panel (${moving.ask(s).text})`);

  let t = reducer(s, { type: 'RELOCATE_PROGRAM', programId: 'MATH', hallId: 'HALL-01', slot: 0 });
  assert(moving.done(t), 'the move is done the moment it is made');
  assert(fired(t) === 'a-school-grows', '"A school takes shape" follows');
  t.pendingInterrupt = null;
  const grows = letter('a-school-grows');
  assert(grows.body(t).includes('Psychology still teaches Science from Founders Hall'), `it names what is left to move (${grows.body(t)})`);
  assert(grows.ask(t).text === 'Grow Science to three programs in Elm Hall (1 of 6)' && grows.ask(t).hallId === 'HALL-01', `and asks for three (${grows.ask(t).text})`);

  t = reducer(t, { type: 'RELOCATE_PROGRAM', programId: 'PSYC', hallId: 'HALL-01', slot: 1 });
  t.halls['HALL-01'][2] = { programId: 'PHYS' };
  assert(grows.done(t), 'three Science programs in Elm Hall is done');
  assert(!fireOpeningLetter(t), 'the second school waits on Oak Hall');

  t.tech.find((x) => x.id === 'HALL-02')!.status = 'available';
  assert(fired(t) === 'a-second-school', 'Oak Hall opening brings "A second school"');
  t.pendingInterrupt = null;
  const second = letter('a-second-school');
  assert(second.ask(t).text === 'Site Oak Hall' && second.ask(t).go === 'build', `first, site it (${second.ask(t).text})`);
  t.placements['HALL-02'] = { row: 10, col: 40, w: 7, h: 5 };
  assert(second.ask(t).text.startsWith('Oak Hall is rising') && second.ask(t).go === undefined, `then wait (${second.ask(t).text})`);
  stand(t, 'HALL-02', 40);
  assert(second.ask(t).text === 'Move English into Oak Hall' && second.ask(t).hallId === FOUNDERS_HALL_ID, `then move the next school (${second.ask(t).text})`);
  t = reducer(t, { type: 'RELOCATE_PROGRAM', programId: 'ENGL', hallId: 'HALL-02', slot: 0 });
  assert(second.done(t), 'two schools in halls of their own is done');
  assert(!fireOpeningLetter(t), 'and that is the last letter');
}

// --- a letter whose ask was done before it came is never sent -------------
{
  const s = college('Early');
  s.events.opening.read = ['doors-open', 'somewhere-to-sleep', 'summer-is-coming'];
  s.tech.find((t) => t.id === 'HALL-01')!.status = 'available';
  s.placements['HALL-01'] = { row: 10, col: 20, w: 7, h: 5 };
  assert(!fireOpeningLetter(s) && s.events.opening.read.includes('a-hall-of-its-own'), 'a hall sited before its letter came: the letter is recorded read, unsent');
  s.events.opening.skipped = true;
  stand(s, 'HALL-01', 20);
  assert(!fireOpeningLetter(s), '"I know the way" stands them all down');
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
