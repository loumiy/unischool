// ---------------------------------------------------------------------
// Sorting schools (Plan 55, Plan 80D): a school is six programs of one
// school in one hall, any academic hall, Founders Hall included. Programs
// begin in Founders Hall and may move out into halls of their own; nothing
// asks for a particular move.
//
// What is pinned: the chain is six purchased halls, one fewer than the
// schools; a move out of Founders Hall closes a program for four weeks and
// any other twelve; the readings (systems/techtree/schools.ts) say which
// hall a school claims, which school moves next and where a program could
// go (the hall panel's suggestion, and the harness's); the next-step line,
// once a second academic hall stands, says "Establish a school: six
// programs of {school} in one hall (n of 6)" for the school closest to six
// (systems/guidance/establish.ts) and never names a move; a free slot in a
// school's hall is offered for that school's programs (Plan 78D); and the
// letters that wait on the college (data/eventData.ts's OPENING_LETTERS
// with `arrives`) come when the college is ready, in any year.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { createInitialState } from '../src/state/actions';
import { teachingCollege } from './fixtures/teaching';
import { schoolFoundedKey } from '../src/systems/techtree/schools';
import { reducer } from '../src/engine/reducer';
import { ACADEMIC_HALL_COUNT, FOUNDERS_HALL_ID, isAcademicHall, milestoneSchools, programs } from '../src/data/techData';
import { OPENING_LETTERS } from '../src/data/eventData';
import { FOUNDERS_MOVE_WEEKS, RELOCATION_WEEKS, relocationWeeks } from '../src/systems/techtree/techSystem';
import { claimedSchool, dedicatedSchool, hallDisplayName, nextSchoolToMove, suggestedMove } from '../src/systems/techtree/schools';
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

// A college a few months in: the founding pillars (English, Mathematics,
// Economics; fixtures/teaching.ts) and a fourth, Psychology, in Founders
// Hall — two Science programs, one each of the other two schools.
function college(name: string): GameState {
  const s = teachingCollege(name);
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

// --- the chain: seven purchased halls, one for every school (Plan 87C) --
{
  const s = createInitialState('Chain');
  const purchased = s.tech.filter((t) => isAcademicHall(t) && t.id !== FOUNDERS_HALL_ID);
  assert(purchased.length === 7 && ACADEMIC_HALL_COUNT === 7, `seven purchased halls (${purchased.length})`);
  assert(purchased.length === milestoneSchools().length, 'one for every school: Founders Hall is left to the administration');
  assert(purchased.map((t) => t.name).join(',') === 'Elm Hall,Oak Hall,Linden Hall,Maple Hall,Chestnut Hall,Sycamore Hall,Walnut Hall', 'Elm through Walnut');
  const [sycamore, walnut] = purchased.slice(5);
  assert(walnut.prereqs.join() === sycamore.id && Math.abs(walnut.cost / sycamore.cost - 1.45) < 0.01, `Walnut Hall follows Sycamore Hall at the chain's ratio ($${walnut.cost})`);

  // Founders Hall is nobody's home, even with every purchased hall sited:
  // a school in it is away from home (Plan 87C; until then, at home there
  // once every hall was sited, Plan 59).
  for (let i = 0; i < 6; i += 1) s.halls[FOUNDERS_HALL_ID][i] = { programId: ['CIVE', 'INDE', 'ELEC', 'CHEN', 'MECH', 'AERO'][i] };
  assert(claimedSchool(s, FOUNDERS_HALL_ID) === null && nextSchoolToMove(s) === 'Engineering', 'six Engineering programs in Founders Hall are away from home');
  for (const t of purchased) t.status = 'done';
  assert(claimedSchool(s, FOUNDERS_HALL_ID) === null && nextSchoolToMove(s) === 'Engineering', 'and still are with every hall sited');
  assert(dedicatedSchool(s, FOUNDERS_HALL_ID) === 'Engineering', 'though the six still found Engineering in Founders Hall');
  assert(hallDisplayName(s, s.tech.find((t) => t.id === FOUNDERS_HALL_ID)!) === 'Founders Hall', 'and Founders Hall keeps its name');
}

// --- a graduate program's host is no school's hall (Plan 59) ---------------
{
  const s = createInitialState('Host');
  const law = s.tech.find((t) => t.id === 'PROJ-LAW')!;
  law.status = 'done';
  s.halls[law.id] = [{ programId: 'LAWS' }];
  assert(dedicatedSchool(s, law.id) === null, 'the Law School housing the JD is dedicated to no school');
  assert(hallDisplayName(s, law) === law.name, `and keeps its name (${hallDisplayName(s, law)})`);
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

// --- the next-step line: establish a school, never a named move ------------
{
  const s = college('Line');
  assert(nextStep(s)?.text.startsWith('Establish') !== true, 'with Founders Hall the only academic hall, nothing asks for a school');
  stand(s, 'HALL-01', 20);
  const quiet = nextStep(s);
  assert(quiet?.intent?.kind !== 'move', `Elm Hall standing empty is not a move to make (${quiet?.text})`);

  // A Science program on offer: Science is closest to six, in Founders Hall.
  s.programOffers = ['PHYS', 'HIST'];
  const grow = nextStep(s);
  assert(grow?.text === 'Establish a school: six programs of Science in one hall (2 of 6)', `the school closest to six is named, with its count (${grow?.text})`);
  assert(grow?.go === 'hall' && grow.hallId === FOUNDERS_HALL_ID && grow.intent?.kind === 'found' && grow.intent.programId === 'PHYS', 'at the hall it is growing in, Founders Hall included, founding its program there');

  // Nothing of Science on offer: the line gives way to a free slot.
  s.programOffers = ['HIST'];
  const founders = nextStep(s);
  assert(founders?.hallId === FOUNDERS_HALL_ID && founders.text.startsWith('Founders Hall has a free program slot'), `anything else goes to Founders Hall (${founders?.text})`);

  // Founders Hall full: room is made by moving another school's program to
  // a hall with a free slot, and the words still name only the school.
  for (const [i, id] of ['CIVE', 'FILM'].entries()) s.halls[FOUNDERS_HALL_ID][4 + i] = { programId: id };
  s.programOffers = [];
  const room = nextStep(s);
  assert(room?.text === 'Establish a school: six programs of Science in one hall (2 of 6)' && !/move/i.test(room.text), `a full hall keeps the same words (${room?.text})`);
  assert(room?.intent?.kind === 'move' && room.intent.hallId === 'HALL-01' && !['MATH', 'PSYC'].includes(room.intent.programId), 'and makes room with another school\'s program');

  // A school claiming a purchased hall offers its own programs (Plan 78D).
  const t = college('Own');
  stand(t, 'HALL-01', 20);
  for (const [i, id] of ['PHYS', 'CHEM', 'BIOL'].entries()) t.halls['HALL-01'][i] = { programId: id };
  const own = nextStep(t);
  assert(own?.hallId === 'HALL-01' && own.intent?.kind === 'found' && own.text === 'Establish a school: six programs of Science in one hall (3 of 6)', `Science, three in Elm Hall, founds its own there (${own?.text})`);
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
  assert(!hall.body(s).includes('undefined') && hall.body(s).includes('Founders Hall included'), 'and its body reads: a school in any hall');
  assert(nextStep(s)?.text === 'Site Elm Hall', 'the line carries the ask past year one');

  s.placements['HALL-01'] = { row: 10, col: 20, w: 7, h: 5 };
  assert(hall.done(s), 'siting it is done');
  assert(!fireOpeningLetter(s), 'nothing more until it stands');

  stand(s, 'HALL-01', 20);
  assert(fired(s) === 'moving-in', 'Elm Hall standing, the second academic hall, brings "Moving in"');
  s.pendingInterrupt = null;
  const moving = letter('moving-in');
  const body = moving.body(s);
  assert(body.includes('any hall, Founders Hall included') && body.includes('Science is closest, with two programs in Founders Hall'), `it says what a school is, and which is closest (${body})`);
  assert(!/Move \w+ into|moves first/.test(body), 'and asks for no move');
  assert(moving.ask(s).text === 'Establish a school: six programs of Science in one hall (2 of 6)', `its ask is the school (${moving.ask(s).text})`);

  // Three Science programs in Elm Hall: halfway, and "A school takes shape".
  let t = reducer(s, { type: 'RELOCATE_PROGRAM', programId: 'MATH', hallId: 'HALL-01', slot: 0 });
  t.pendingInterrupt = null;
  t.halls['HALL-01'][1] = { programId: 'PHYS' };
  t.halls['HALL-01'][2] = { programId: 'CHEM' };
  assert(!moving.done(t), 'a move is not the ask: a school is');
  assert(fired(t) === 'a-school-grows', '"A school takes shape" comes at three in one hall');
  t.pendingInterrupt = null;
  const grows = letter('a-school-grows');
  assert(grows.body(t).startsWith('Science has three of six in Elm Hall.'), `it counts them (${grows.body(t)})`);
  assert(grows.ask(t).text === 'Establish a school: six programs of Science in one hall (3 of 6)' && grows.ask(t).hallId === 'HALL-01', `and asks for the school (${grows.ask(t).text})`);

  // Six: the school is founded, and both asks are done.
  t.halls['HALL-01'][3] = { programId: 'PSYC' };
  t.halls[FOUNDERS_HALL_ID][3] = { programId: null };
  t.halls['HALL-01'][4] = { programId: 'BIOL' };
  t.halls['HALL-01'][5] = { programId: 'ENVS' };
  delete t.halls['HALL-01'][0].transitWeeks; // Mathematics has arrived
  assert(dedicatedSchool(t, 'HALL-01') === 'Science', 'six Science programs in Elm Hall found the school');
  t.milestones[schoolFoundedKey('Science')] = true;
  assert(moving.done(t) && grows.done(t), 'and both letters are done');
  assert(fired(t) === 'a-second-school', '"A second school" follows the first');
  t.pendingInterrupt = null;
  const second = letter('a-second-school');
  assert(second.body(t).startsWith('The School of Science is founded'), `it names the first (${second.body(t)})`);
  assert(/^Establish another school: six programs of (Social Sciences & Humanities|Business) in one hall \(1 of 6\)$/.test(second.ask(t).text) || second.ask(t).text === 'Site Oak Hall', `and asks for another (${second.ask(t).text})`);
  t.milestones[schoolFoundedKey('Business')] = true;
  assert(second.done(t), 'two schools founded is done');
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

// --- every line that asks for something says what, as data (Plan 58) -------
{
  const s = college('Intents');
  stand(s, 'HALL-01', 20);
  s.students.satisfactionBreakdown.health = 20;
  // Science whole in Elm Hall, so nothing waits to be founded there.
  programs().filter((p) => p.school === 'Science' && p.kind !== 'graduate').forEach((p, i) => { s.halls['HALL-01'][i] = { programId: p.id }; });
  s.halls[FOUNDERS_HALL_ID][1] = { programId: null };
  s.halls[FOUNDERS_HALL_ID][3] = { programId: null };
  s.milestones[schoolFoundedKey('Science')] = true;
  const low = nextStep(s);
  assert(low?.intent?.kind === 'build-for' && low.intent.attribute === 'health', `a shortfall names its attribute (${low?.text})`);
  for (const letter of OPENING_LETTERS) {
    const ask = letter.ask(s);
    assert(ask.intent !== undefined, `"${letter.title}" says what it asks for as data`);
  }
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
