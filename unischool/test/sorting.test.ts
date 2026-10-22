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
// once a second academic hall stands, says "Establish {school} (n of 6)"
// for the school closest to six (systems/guidance/establish.ts), with the
// step toward it (Plan 95O: found, move or wait); a free slot in a
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
import { CLAIM_AT, claimedSchool, closestSchool, dedicatedSchool, hallDisplayName, homeSchool, nextSchoolToMove, settleClaims, suggestedMove } from '../src/systems/techtree/schools';
import { readSave, SAVE_VERSION } from '../src/state/persistence';
import { establishAsk } from '../src/systems/guidance/establish';
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

// --- the chain: seven purchased halls, one for every school (Plan 89C) --
{
  const s = createInitialState('Chain');
  const purchased = s.tech.filter((t) => isAcademicHall(t) && t.id !== FOUNDERS_HALL_ID);
  assert(purchased.length === 7 && ACADEMIC_HALL_COUNT === 7, `seven purchased halls (${purchased.length})`);
  assert(purchased.length === milestoneSchools().length, 'one for every school: Founders Hall is left to the administration');
  assert(purchased.map((t) => t.name).join(',') === 'Elm Hall,Oak Hall,Linden Hall,Maple Hall,Chestnut Hall,Sycamore Hall,Walnut Hall', 'Elm through Walnut');
  const [sycamore, walnut] = purchased.slice(5);
  assert(walnut.prereqs.join() === sycamore.id && Math.abs(walnut.cost / sycamore.cost - 1.45) < 0.01, `Walnut Hall follows Sycamore Hall at the chain's ratio ($${walnut.cost})`);

  // Founders Hall is nobody's home, even with every purchased hall sited:
  // a school in it is away from home (Plan 89C; until then, at home there
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
  // One program doesn't claim the hall (Plan 100), but it is that school's
  // home for the sorting: nothing tells it to move on.
  assert(claimedSchool(s, 'HALL-01') === null, 'one program on its way leaves the hall open');
  const home = homeSchool(s, 'HALL-01');
  assert(home?.school === 'Science' && home.housed === 1 && home.slots === 6, 'and makes it Science\'s home for the sorting');
  assert(suggestedMove(s, 'MATH') === null, 'a program at home stays');
  assert(suggestedMove(s, 'PSYC')?.hallId === 'HALL-01', "Psychology is sent to Science's hall");
  assert(suggestedMove(s, 'ENGL') === null && nextSchoolToMove(s) === 'Social Sciences & Humanities', 'English waits for a hall of its own, and its school is next');

  s.halls['HALL-01'][1] = { programId: 'ENGL' };
  s.halls[FOUNDERS_HALL_ID][0] = { programId: null };
  assert(claimedSchool(s, 'HALL-01') === null, 'a mixed hall is claimed by nobody');
  assert(suggestedMove(s, 'ENGL') === null && suggestedMove(s, 'MATH') === null, 'and with no empty hall nothing in it has anywhere to go');
}

// --- the claim at three (Plan 100) ----------------------------------------
{
  const s = college('Claims');
  stand(s, 'HALL-01', 20);
  const put = (slot: number, id: string | null) => { s.halls['HALL-01'][slot] = { programId: id }; settleClaims(s); };
  put(0, 'PHYS');
  assert(claimedSchool(s, 'HALL-01') === null, 'one program doesn\'t claim a hall');
  put(1, 'CHEM');
  assert(claimedSchool(s, 'HALL-01') === null && CLAIM_AT === 3, 'nor do two');
  put(2, 'ENGL');
  put(3, 'BIOL');
  const three = claimedSchool(s, 'HALL-01');
  assert(three?.school === 'Science' && three.housed === 3, `three claim it, beside another school's program (${JSON.stringify(three)})`);
  // 3 + 3: the first to three keeps it.
  s.clock.week += 1;
  put(4, 'HIST');
  put(5, 'SOCY');
  assert(claimedSchool(s, 'HALL-01')?.school === 'Science', 'at three each, the school that reached three first keeps the hall');
  assert(s.hallClaims?.['HALL-01']?.school === 'Science', 'as its record says');
  // Losing it: a Science program leaves, and Social Sciences, at three, claims.
  put(3, null);
  assert(claimedSchool(s, 'HALL-01')?.school === 'Social Sciences & Humanities', 'a move under three loses the claim to the other school at three');
  put(2, null);
  assert(claimedSchool(s, 'HALL-01') === null, 'and with neither at three the hall is open again');
  assert(claimedSchool(s, FOUNDERS_HALL_ID) === null, 'Founders Hall is never claimed');

  // A save from before: Elm Hall with one program, which claimed it then,
  // loads open, with nothing moved.
  const old = college('Old');
  stand(old, 'HALL-01', 20);
  old.halls['HALL-01'][0] = { programId: 'PHYS' };
  old.started = true;
  const read = readSave(JSON.stringify({ version: SAVE_VERSION, savedAt: 0, state: old }));
  assert(!('refused' in read) && claimedSchool(read.state, 'HALL-01') === null && read.state.halls['HALL-01'][0].programId === 'PHYS', 'an old save\'s one-program hall loads open, the program where it was');
}

// --- the line, short of a claim (Plan 100) ------------------------------
{
  // Founders Hall holds an office, so Science grows in Elm Hall.
  const s = college('Short');
  s.halls[FOUNDERS_HALL_ID][5] = { programId: null, office: { id: 'admissions', openedYear: 1 } };
  stand(s, 'HALL-01', 20);
  s.halls['HALL-01'][0] = { programId: 'PHYS' };
  s.programOffers = ['CHEM'];
  const line = nextStep(s)?.text ?? '';
  assert(line.endsWith("in Elm Hall (two more make it Science's hall)"), `a hall short of three says how many more claim it (${line})`);
  s.halls['HALL-01'][1] = { programId: 'BIOL' };
  const last = nextStep(s)?.text ?? '';
  assert(last.endsWith("in Elm Hall to make it Science's hall"), `and the last of them (${last})`);
}

// --- the next-step line: establish a school, and the step toward it -------
{
  const s = college('Line');
  assert(nextStep(s)?.text.startsWith('Establish') !== true, 'with Founders Hall the only academic hall, nothing asks for a school');
  stand(s, 'HALL-01', 20);
  // Schools grow in the halls the college builds, never Founders Hall (the
  // owner's notes after Plan 107): Science, the most in Founders Hall,
  // starts in Elm Hall, bringing its programs in.
  const start = nextStep(s);
  assert(start?.text === 'Establish Science (0 of 6): move Mathematics into Elm Hall' && start.intent?.kind === 'move' && start.intent.hallId === 'HALL-01',
    `Elm Hall standing empty, the school with most in Founders Hall moves into it (${start?.text})`);

  // A Science program on offer: founded there, not moved.
  s.programOffers = ['PHYS', 'HIST'];
  const grow = nextStep(s);
  assert(grow?.text === "Establish Science (0 of 6): found Physics in Elm Hall (three more make it Science's hall)", `the school is named, with its count in the hall (${grow?.text})`);
  assert(grow?.go === 'hall' && grow.hallId === 'HALL-01' && grow.intent?.kind === 'found' && grow.intent.programId === 'PHYS', 'founding its program in the built hall, never Founders Hall');

  // Two of Science in Elm Hall: it is closest there, Founders Hall's count
  // aside.
  s.halls['HALL-01'][0] = { programId: 'PHYS' };
  s.halls['HALL-01'][1] = { programId: 'CHEM' };
  s.programOffers = [];
  const two = nextStep(s);
  assert(two?.text === 'Establish Science (2 of 6): move Mathematics into Elm Hall', `the count is the built hall's (${two?.text})`);

  // Elm Hall full, with Oak Hall standing: room is made by moving another
  // school's program to a hall with a free slot, and the words say so.
  stand(s, 'HALL-02', 40);
  for (const [i, id] of ['HIST', 'CIVE', 'FILM', 'ECON'].entries()) s.halls['HALL-01'][2 + i] = { programId: id };
  const room = nextStep(s);
  assert(!!room?.text.startsWith('Establish Science (2 of 6): move ') && room.text.endsWith(' to Oak Hall to make room'), `a full hall makes room (${room?.text})`);
  assert(room?.intent?.kind === 'move' && room.intent.hallId === 'HALL-02' && !['PHYS', 'CHEM'].includes(room.intent.programId), 'and makes room with another school\'s program');

  // A school claiming a purchased hall offers its own programs (Plan 78D).
  const t = college('Own');
  stand(t, 'HALL-01', 20);
  for (const [i, id] of ['PHYS', 'CHEM', 'BIOL'].entries()) t.halls['HALL-01'][i] = { programId: id };
  const own = nextStep(t);
  assert(own?.hallId === 'HALL-01' && own.intent?.kind === 'found' && own.text === 'Establish Science (3 of 6): found Environmental Science in Elm Hall', `Science, three in Elm Hall, founds its own there (${own?.text})`);
}

// --- the step toward a school (Plan 95O, the second review's B3-4) ---------
{
  // Founders Hall holds an office, so no school is established there; Elm
  // Hall holds two Science programs and a History program, so it offers
  // nothing of its own and Founders Hall's two Science programs are to move.
  const s = college('Step');
  s.halls[FOUNDERS_HALL_ID][5] = { programId: null, office: { id: 'admissions', openedYear: 1 } };
  stand(s, 'HALL-01', 20);
  s.halls['HALL-01'][0] = { programId: 'PHYS' };
  s.halls['HALL-01'][1] = { programId: 'CHEM' };
  s.halls['HALL-01'][2] = { programId: 'HIST' };
  const name = (id: string) => programs().find((p) => p.id === id)!.name;

  // A move: the step names it, and opens the program's tile where it is.
  const first = establishAsk(s)!;
  assert(first.intent.kind === 'move' && ['MATH', 'PSYC'].includes(first.intent.programId), `the way to six is a move out of Founders Hall (${JSON.stringify(first.intent)})`);
  const firstId = first.intent.kind === 'move' ? first.intent.programId : '';
  assert(first.text === `Establish Science (2 of 6): move ${name(firstId)} into Elm Hall`, `the line keeps the goal and adds the move (${first.text})`);
  assert(first.go === 'hall' && first.hallId === FOUNDERS_HALL_ID && first.programId === firstId, 'and opens the program\'s tile in the hall it moves from');
  assert(nextStep(s)?.text === first.text && nextStep(s)?.programId === firstId, `NEXT carries it (${nextStep(s)?.text})`);

  // The count holds through each move: a program in transit counts toward
  // the hall it is moving to. The move to three claims Elm Hall for Science
  // (Plan 100), even with History beside them, so the next step is a
  // founding there from Science's own list, not another move.
  let t = s;
  const counts: number[] = [closestSchool(t)!.housed];
  const ask = establishAsk(t)!;
  if (ask.intent.kind === 'move') {
    t = reducer(t, { type: 'RELOCATE_PROGRAM', programId: ask.intent.programId, hallId: ask.intent.hallId, slot: ask.intent.slot });
    t.pendingInterrupt = null;
    counts.push(closestSchool(t)!.housed);
  }
  assert(counts.join(',') === '2,3', `the count rises with the move (${counts.join(',')})`);
  assert(claimedSchool(t, 'HALL-01')?.school === 'Science', 'three Science programs, one arriving, claim Elm Hall beside History');
  const then = establishAsk(t)!;
  assert(then.intent.kind === 'found' && then.intent.hallId === 'HALL-01', `then the way to six is a founding in Elm Hall (${then.text})`);

  // Nothing left to do but wait: the line says what it waits on. Elm Hall
  // with one Science program settled and one arriving (two: still open),
  // History, and nothing of Science anywhere else or on offer.
  const w = college('Wait');
  w.halls[FOUNDERS_HALL_ID][5] = { programId: null, office: { id: 'admissions', openedYear: 1 } };
  for (const slot of w.halls[FOUNDERS_HALL_ID]) if (slot.programId === 'MATH' || slot.programId === 'PSYC') slot.programId = null;
  stand(w, 'HALL-01', 20);
  w.halls['HALL-01'][0] = { programId: 'PHYS' };
  w.halls['HALL-01'][1] = { programId: 'CHEM', transitWeeks: 7 };
  w.halls['HALL-01'][2] = { programId: 'HIST' };
  w.programOffers = [];
  const waiting = establishAsk(w)!;
  assert(waiting.intent.kind === 'wait' && waiting.text === `Establish Science (2 of 6): ${name('CHEM')} arrives in 7 weeks`, `a wait names the first to arrive (${waiting.text})`);
  delete w.halls['HALL-01'][1].transitWeeks;
  assert(closestSchool(w)?.housed === 2, 'and the count holds on arrival');

  // A founding: Elm Hall holding only Science offers its own programs.
  const u = college('Found');
  stand(u, 'HALL-01', 20);
  for (const [i, id] of ['PHYS', 'CHEM', 'BIOL'].entries()) u.halls['HALL-01'][i] = { programId: id };
  const found = establishAsk(u)!;
  const foundId = found.intent.kind === 'found' ? found.intent.programId : undefined;
  const program = programs().find((p) => p.id === foundId);
  assert(program !== undefined, `the way to six is a founding in Elm Hall (${JSON.stringify(found.intent)})`);
  if (program) {
    const field = program.field!;
    u.candidates = u.candidates.filter((c) => c.field !== field);
    u.faculty = u.faculty.filter((f) => f.field !== field);
    assert(establishAsk(u)!.text === `Establish Science (3 of 6): post a search in ${field}`, `nobody to teach it and nobody listed: a search (${establishAsk(u)!.text})`);
    u.searches[field] = 4;
    assert(establishAsk(u)!.text === `Establish Science (3 of 6): the search in ${field} has 4 weeks to run`, `a search under way is named (${establishAsk(u)!.text})`);
    delete u.searches[field];
    u.candidates.push({ ...s.candidates[0], id: 'listed', field });
    assert(establishAsk(u)!.text === `Establish Science (3 of 6): found ${program.name} in Elm Hall`, `someone listed: the founding (${establishAsk(u)!.text})`);
    assert(establishAsk(u)!.go === 'hall' && establishAsk(u)!.hallId === 'HALL-01', 'at the hall it grows in');
  }
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
  assert(hall.ask(s).text === 'Place Elm Hall' && hall.ask(s).go === 'build', `its ask is to site Elm Hall (${hall.ask(s).text})`);
  assert(!hall.body(s).includes('undefined') && hall.body(s).includes('You can build Elm Hall'), 'and its body names the hall to build');
  assert(nextStep(s)?.text === 'Place Elm Hall', 'the line carries the ask past year one');

  s.placements['HALL-01'] = { row: 10, col: 20, w: 7, h: 5 };
  assert(hall.done(s), 'siting it is done');
  assert(!fireOpeningLetter(s), 'nothing more until it stands');

  stand(s, 'HALL-01', 20);
  assert(fired(s) === 'moving-in', 'Elm Hall standing, the second academic hall, brings "Moving in"');
  s.pendingInterrupt = null;
  const moving = letter('moving-in');
  const body = moving.body(s);
  assert(body.includes('Your schools will grow in halls like this one') && body.includes('Science has the most programs in Founders Hall, and Elm Hall has room for them'), `it says where schools grow, and which is closest (${body})`);
  assert(!/Move \w+ into|moves first/.test(body), 'and asks for no move');
  assert(moving.ask(s).text === 'Establish Science (0 of 6): move Mathematics into Elm Hall', `its ask is the school, in the built hall (${moving.ask(s).text})`);

  // Three Science programs in Elm Hall: halfway, and "A school takes shape".
  let t = reducer(s, { type: 'RELOCATE_PROGRAM', programId: 'MATH', hallId: 'HALL-01', slot: 0 });
  t.pendingInterrupt = null;
  t.halls['HALL-01'][1] = { programId: 'PHYS' };
  t.halls['HALL-01'][2] = { programId: 'CHEM' };
  assert(!moving.done(t), 'a move is not the ask: a school is');
  assert(fired(t) === 'a-school-grows', '"A school takes shape" comes at three in one hall');
  t.pendingInterrupt = null;
  const grows = letter('a-school-grows');
  assert(grows.body(t).includes('Science has three of the six programs it needs in Elm Hall.'), `it counts them (${grows.body(t)})`);
  assert(grows.ask(t).text === 'Establish Science (3 of 6): found Biology in Elm Hall' && grows.ask(t).hallId === 'HALL-01', `and asks for the school (${grows.ask(t).text})`);

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
  assert(/^Establish another school, (Social Sciences & Humanities|Business) \(1 of 6\): /.test(second.ask(t).text) || second.ask(t).text === 'Site Oak Hall', `and asks for another (${second.ask(t).text})`);
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
  s.tech.find((t) => t.facilityType === 'healthCenter' && t.tier === 1)!.status = 'available';
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
