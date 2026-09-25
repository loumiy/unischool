// ---------------------------------------------------------------------
// The owner's playthrough, the rules half (Plan 59): what an unstaffed
// course does (its program goes dark), how a college is put back together
// (restaffing, the Deans, a candidate always on the market), sport clubs on
// their own cap, the research letters, the library's stories, and the
// Second Quad gone.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { createInitialState } from '../src/state/actions';
import { reducer } from '../src/engine/reducer';
import type { GameState } from '../src/state/types';
import { FOUNDING_PROGRAMS } from '../src/data/foundingData';
import { programById } from '../src/data/techData';
import { OPENING_LETTERS } from '../src/data/eventData';
import { LIBRARY_TIER1_ID } from '../src/data/facilitiesData';
import { MAX_ACTIVE_CLUBS, canFormClub, clubCapacity, rollClubPetition, sportClubCapacity } from '../src/data/studentLifeData';
import { darkPrograms, unstaffedPrograms } from '../src/systems/techtree/darkness';
import { instructionCapacityDetail } from '../src/systems/techtree/instructionCapacity';
import { averageCourseQuality } from '../src/systems/faculty/facultyAssignment';
import { restaffPlan } from '../src/systems/faculty/restaffing';
import { tickFaculty } from '../src/systems/faculty/facultySystem';
import { canExtend, extensionCost, extensionGain } from '../src/systems/estate/estate';
import { fireOpeningLetter } from '../src/systems/events/eventSystem';
import { nextStep } from '../src/systems/guidance/nextStep';
import { bindScriptStream } from '../src/engine/random';

// Direct calls into the systems (tickFaculty, rollClubPetition) draw from a
// bound stream, as the harness's do.
bindScriptStream(59);

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('playthrough rules tests');

// The English professor leaves: English's two courses lose their teacher.
function orphanEnglish(s: GameState): void {
  const english = programById('ENGL')!;
  for (const id of english.courseIds) delete s.courseFaculty[id];
}

// --- an unstaffed course darkens its program --------------------------------
{
  const s = createInitialState('Dark');
  const before = instructionCapacityDetail(s).courses;
  const english = programById('ENGL')!;
  const quality = averageCourseQuality(s, english.courseIds);
  assert(darkPrograms(s).size === 0 && quality !== null && quality > 0, 'a staffed college is lit, and English grades');
  orphanEnglish(s);
  assert(unstaffedPrograms(s).has('ENGL'), 'English with no teacher is unstaffed');
  assert(instructionCapacityDetail(s).courses === before - 2, `and seats nobody (${before} courses to ${instructionCapacityDetail(s).courses})`);
  assert(averageCourseQuality(s, english.courseIds) === 0, 'every course of it counts as a zero');
  // One course of a program unstaffed darkens all of it.
  const t = createInitialState('Half');
  delete t.courseFaculty[english.courseIds[0]];
  assert(instructionCapacityDetail(t).courses === before - 2, 'one unstaffed course darkens the whole program');
  // Development holds while dark.
  const u = createInitialState('Hold');
  const next = u.tech.find((x) => x.id === 'ENGL120')!;
  next.status = 'developing';
  u.developing['ENGL120'] = 3;
  delete u.courseFaculty[english.courseIds[0]];
  let v = u;
  for (let i = 0; i < 3; i += 1) { v.pendingInterrupt = null; v = reducer(v, { type: 'TICK' }); }
  assert(v.developing['ENGL120'] === 3, 'a dark program\'s course in development holds its countdown');
}

// --- restaffing: the payroll first, then the market, in one click ------------
{
  let s = createInitialState('Restaff');
  orphanEnglish(s);
  // The market lists nobody in English at first, perhaps; the week's tick
  // guarantees someone (facultySystem.ts).
  s.candidates = s.candidates.filter((c) => c.field !== 'English');
  tickFaculty(s);
  assert(s.candidates.some((c) => c.field === 'English'), 'a field with an unstaffed course always has a candidate listed');
  const plan = restaffPlan(s, programById('ENGL')!.school);
  assert(plan.length === 2, `the plan covers both courses (${plan.length})`);
  s = reducer(s, { type: 'RESTAFF', school: programById('ENGL')!.school });
  assert(!unstaffedPrograms(s).has('ENGL'), 'restaffing lights the program again');
  const payroll = s.faculty.length;
  s = reducer(s, { type: 'RESTAFF', school: null });
  assert(s.faculty.length === payroll, 'a second restaff has nothing to do');
}

// --- the Deans bring their plans at year's turn -----------------------------
{
  let s = createInitialState('Deans');
  const school = programById('ENGL')!.school;
  s.seats = [{ seatId: 'dean', school, holder: 'Dean Test', internal: false, policy: 'collegial', salary: 190_000, appointedYear: 1 }];
  orphanEnglish(s);
  s.events.opening.skipped = true;
  s.clock.year = 3;
  s.clock.week = 2;
  s = reducer(s, { type: 'TICK' });
  assert(s.pendingInterrupt?.type === 'dean-recommendations', `a Dean with an unstaffed course brings a recommendation (${s.pendingInterrupt?.type})`);
  s = reducer(s, { type: 'RESOLVE_DEAN_RECOMMENDATIONS', accept: true });
  assert(!unstaffedPrograms(s).has('ENGL') && s.pendingInterrupt === null, 'accepting restaffs the school and the year goes on');
  orphanEnglish(s);
  s = reducer(s, { type: 'TICK' });
  assert(s.pendingInterrupt?.type !== 'dean-recommendations', 'and once a year only');
}

// --- sport clubs on their own cap -------------------------------------------
{
  const s = createInitialState('Clubs');
  s.tech.find((t) => t.facilityType === 'studentCenter')!.status = 'done';
  s.students.classes = { freshman: 3_000, sophomore: 3_000, junior: 3_000, senior: 3_000 };
  s.orgs.clubs = Array.from({ length: clubCapacity(s) }, (_, i) => ({
    id: `c${i}`, kind: 'club', name: `Club ${i}`, sport: null, foundedYear: 1, members: 20, upkeepPerWeek: 0, varsityLastAskedYear: null,
  }) as unknown as GameState['orgs']['clubs'][number]);
  assert(clubCapacity(s) === MAX_ACTIVE_CLUBS, 'interest clubs are full');
  assert(sportClubCapacity(s) > 1, `and sport clubs have room of their own (${sportClubCapacity(s)})`);
  assert(canFormClub(s), 'so a club can still form');
  const drawn = new Set<string | null>();
  for (let i = 0; i < 40; i += 1) drawn.add(rollClubPetition(s)?.sport ?? null);
  assert(!drawn.has(null) && drawn.size > 0, 'and every petition is a sport club');
}

// --- the research letters ---------------------------------------------------
{
  const s = createInitialState('Labs');
  s.events.opening.read = OPENING_LETTERS.filter((l) => !l.id.startsWith('the-')).map((l) => l.id);
  const lab = s.tech.find((t) => t.facilityType === 'lab')!;
  lab.status = 'done';
  const fired = fireOpeningLetter(s) ? (s.pendingInterrupt?.payload as { id: string } | undefined)?.id : undefined;
  assert(fired === 'the-laboratories', `the first lab brings "The laboratories" (${fired})`);
  s.pendingInterrupt = null;
  const letter = OPENING_LETTERS.find((l) => l.id === 'the-laboratories')!;
  assert(letter.ask(s).intent?.kind === 'research', `it asks for research in ${lab.name} (${letter.ask(s).text})`);
  s.research.finishedLabs = [lab.id];
  assert(letter.done(s), 'every lab having finished one is done');
  // The campus with nothing else to say: letters declined, nothing on offer,
  // no hall to site, no shortfall.
  const quiet: GameState = { ...s, research: { ...s.research, finishedLabs: [] }, clock: { ...s.clock, year: 2 }, programOffers: [] };
  quiet.events = { ...s.events, opening: { ...s.events.opening, skipped: true } };
  quiet.tech = s.tech.map((x) => (x.id.startsWith('HALL-') ? { ...x, status: 'locked' } : x));
  quiet.students = { ...s.students, satisfactionBreakdown: { academic: 70, social: 70, basicNeeds: 70, health: 70, housing: 70 } };
  const line = nextStep(quiet);
  assert(line?.intent?.kind === 'research' && line.intent.labId === lab.id, `the line points at the unproven lab (${line?.text})`);
}

// --- the library adds a story from its panel --------------------------------
{
  let s = createInitialState('Library');
  const lib = s.tech.find((t) => t.id === LIBRARY_TIER1_ID)!;
  lib.status = 'done';
  s.finance.cash = 50_000_000;
  assert(canExtend(lib) && extensionCost(lib) > 0 && extensionGain(lib) > 0, 'the library can add a story, like a dining hall');
  const served = lib.effects?.servesPopulation ?? 0;
  s = reducer(s, { type: 'EXTEND_BUILDING', id: lib.id });
  const going = s.tech.find((t) => t.id === lib.id)!;
  assert((going.extensionWeeks ?? 0) > 0, 'the story goes up');
  for (let i = 0; i < 40 && (s.tech.find((t) => t.id === lib.id)!.extensionWeeks ?? 0) > 0; i += 1) { s.pendingInterrupt = null; s = reducer(s, { type: 'TICK' }); }
  const done = s.tech.find((t) => t.id === lib.id)!;
  assert(done.floorsAdded === 1 && (done.effects?.servesPopulation ?? 0) > served, `and it serves more (${served} to ${done.effects?.servesPopulation})`);
}

// --- the Second Quad is gone ------------------------------------------------
{
  const s = createInitialState('Quad');
  assert(!s.tech.some((t) => t.id === 'QUAD-S2'), 'no Second Quad in a new game');
  assert(FOUNDING_PROGRAMS.length === 3, 'and the founding programs are untouched');
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
