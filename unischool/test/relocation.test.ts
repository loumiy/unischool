// ---------------------------------------------------------------------
// Relocation (Plan 14's PR F — see techSystem.ts's relocateProgram). A
// housed program moves to an empty slot in a standing hall, free in money
// and expensive in time: for RELOCATION_WEEKS it teaches nobody and
// contributes nothing, its courses cannot be started or advanced, and it
// counts toward no dedication — then it resumes with its courses and
// instructors exactly as they were.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { createInitialState } from '../src/state/actions';
import { reducer } from '../src/engine/reducer';
import { programById, programs } from '../src/data/techData';
import { canRelocateProgram, canStartDevelopment, RELOCATION_WEEKS } from '../src/systems/techtree/techSystem';
import { isInTransit, slotOf, transitWeeks } from '../src/systems/techtree/programOffers';
import { dedicatedSchool, isSchoolFounded } from '../src/systems/techtree/schools';
import { averageCourseQuality, courseQuality } from '../src/systems/faculty/facultyAssignment';
import type { GameState } from '../src/state/types';

let seed = 3131;
Math.random = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
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

function staffField(s: GameState, field: string): void {
  if (s.faculty.some((f) => f.id === `test-${field}`)) return;
  s.faculty.push({
    id: `test-${field}`, name: `Dr. Test ${field}`, field,
    teaching: 80, research: 60, teachingPotential: 90, researchPotential: 70,
    tenureWeeks: 0, weeksListed: 0, acclaim: 0, salary: 0, courseSlots: 10,
    nationality: 'United States', flag: '🇺🇸', bio: 'A test fixture, not a character.', gender: 'male', heritage: 'Anglo/Western European',
  });
}

function advance(s: GameState, weeks: number): GameState {
  for (let i = 0; i < weeks; i += 1) {
    s = s.pendingInterrupt ? reducer(s, { type: 'RESOLVE_REPORT' }) : reducer(s, { type: 'TICK' });
  }
  return s;
}

// Two standing halls; one Business program founded and its entry course
// done, with a tier-2 course developing.
function settled(): { s: GameState; programId: string } {
  let s = createInitialState('Movers');
  s.finance.cash = 500_000_000;
  for (const id of ['GE110', 'GE120', 'GE130', 'GE140', 'GE150', 'GE160']) {
    s = reducer(s, { type: 'START_DEVELOPMENT', nodeId: id });
  }
  s = advance(s, 6);
  for (const id of ['HALL-01', 'HALL-02']) {
    s.tech.find((t) => t.id === id)!.status = 'done';
    s.placements[id] = { row: id === 'HALL-01' ? 20 : 40, col: 20, w: 7, h: 5 };
    s.halls[id] = Array.from({ length: 6 }, () => ({ programId: null }));
  }
  const programId = s.programOffers[0];
  const program = programById(programId)!;
  const entry = s.tech.find((t) => t.id === program.entryCourseId)!;
  staffField(s, entry.requiresFaculty!);
  s = reducer(s, { type: 'FOUND_PROGRAM', programId, hallId: 'HALL-01', slot: 1, facultyId: `test-${entry.requiresFaculty}` });
  s = advance(s, entry.duration + 1);
  const t2 = s.tech.find((t) => t.id === program.courseIds[1])!;
  s = reducer(s, { type: 'START_DEVELOPMENT', nodeId: t2.id, facultyId: `test-${entry.requiresFaculty}` });
  return { s, programId };
}

console.log('relocation tests');

// ---- the move, the dark term, and the resumption ----
{
  let { s, programId } = settled();
  const program = programById(programId)!;
  const entry = s.tech.find((t) => t.id === program.entryCourseId)!;
  const t2 = s.tech.find((t) => t.id === program.courseIds[1])!;
  assert(entry.status === 'done' && t2.status === 'developing', 'fixture: entry course done, a tier-2 course developing');
  const weeksBefore = s.developing[t2.id];
  const instructorBefore = s.courseFaculty[entry.id];
  assert(courseQuality(s, entry) !== null, 'the settled entry course has a grade');
  const cash = s.finance.cash;

  assert(canRelocateProgram(s, { programId, hallId: 'HALL-02', slot: 3 }), 'the move to an empty slot of a standing hall is admissible');
  s = reducer(s, { type: 'RELOCATE_PROGRAM', programId, hallId: 'HALL-02', slot: 3 });
  assert(s.halls['HALL-01'][1].programId === null, 'the old slot is empty');
  assert(s.halls['HALL-02'][3].programId === programId, 'the new slot holds the program');
  assert(transitWeeks(s, programId) === RELOCATION_WEEKS, `and it is in transit for ${RELOCATION_WEEKS} weeks`);
  assert(s.finance.cash === cash, 'free in money');
  assert(courseQuality(s, entry) === null, 'in transit, the entry course has no grade');
  assert(averageCourseQuality(s, program.courseIds) === null, 'and the program averages nothing rather than an F');
  assert(!canStartDevelopment(s, s.tech.find((t) => t.id === program.courseIds[2])!, `test-${entry.requiresFaculty}`), 'no course of it can be started');
  assert(s.courseFaculty[entry.id] === instructorBefore, 'its instructors are untouched');

  s = advance(s, 5);
  assert(s.developing[t2.id] === weeksBefore, 'a developing course does not advance while in transit');
  assert(transitWeeks(s, programId) === RELOCATION_WEEKS - 5, 'the transit counts down');
  assert(!canRelocateProgram(s, { programId, hallId: 'HALL-01', slot: 0 }), 'a program in transit cannot be moved again');

  s = advance(s, RELOCATION_WEEKS - 5);
  assert(!isInTransit(s, programId), 'it settles on time');
  assert(s.developing[t2.id] === weeksBefore - 1, 'and its developing course advances the week it settles — twelve weeks cost twelve');
  assert(courseQuality(s, entry) !== null, 'its grade is back');
  assert(s.courseFaculty[entry.id] === instructorBefore, 'with the same instructor');
  assert(s.log.some((l) => l.message.includes('settled in')), 'the log says so');
  assert(JSON.stringify(slotOf(s, programId)) === JSON.stringify({ hallId: 'HALL-02', slot: 3 }), 'and it lives where it was sent');
}

// ---- refusals ----
{
  const { s, programId } = settled();
  assert(!canRelocateProgram(s, { programId, hallId: 'HALL-02', slot: 6 }), 'a slot that does not exist');
  assert(!canRelocateProgram(s, { programId, hallId: 'HALL-01', slot: 1 }), 'its own slot');
  assert(!canRelocateProgram(s, { programId, hallId: 'HALL-03', slot: 0 }), 'a hall that does not stand');
  assert(!canRelocateProgram(s, { programId: 'MECH', hallId: 'HALL-02', slot: 0 }), 'a program that is not housed');
  assert(!canRelocateProgram(s, { programId: 'CORE', hallId: 'HALL-02', slot: 0 }), 'the core never moves');
  s.halls['HALL-02'][0] = { programId: 'FINA' };
  assert(!canRelocateProgram(s, { programId, hallId: 'HALL-02', slot: 0 }), 'a taken slot');
  assert(canRelocateProgram(s, { programId, hallId: 'HALL-01', slot: 5 }), 'but a move within the same hall is allowed');
  const moved = reducer(JSON.parse(JSON.stringify(s)) as GameState, { type: 'RELOCATE_PROGRAM', programId, hallId: 'HALL-01', slot: 5 });
  assert(transitWeeks(moved, programId) === RELOCATION_WEEKS, 'and costs the same dark term');
  const refused = reducer(JSON.parse(JSON.stringify(s)) as GameState, { type: 'RELOCATE_PROGRAM', programId, hallId: 'HALL-02', slot: 0 });
  assert(JSON.stringify(refused.halls) === JSON.stringify(s.halls), 'a refused move writes nothing');
}

// ---- dedication waits for the arrival ----
{
  let s = createInitialState('Arrivals');
  for (const id of ['HALL-01', 'HALL-02']) {
    s.tech.find((t) => t.id === id)!.status = 'done';
    s.placements[id] = { row: id === 'HALL-01' ? 20 : 40, col: 20, w: 7, h: 5 };
    s.halls[id] = Array.from({ length: 6 }, () => ({ programId: null }));
  }
  const business = programs().filter((p) => p.kind === 'major' && p.school === 'Business').map((p) => p.id);
  business.slice(0, 5).forEach((id, i) => { s.halls['HALL-01'][i] = { programId: id }; });
  s.halls['HALL-02'][0] = { programId: business[5] };
  s = reducer(s, { type: 'RELOCATE_PROGRAM', programId: business[5], hallId: 'HALL-01', slot: 5 });
  assert(dedicatedSchool(s, 'HALL-01') === null, 'a hall whose sixth program is still in transit is not dedicated');
  s = advance(s, RELOCATION_WEEKS - 1);
  assert(!isSchoolFounded(s, 'Business'), 'and the school is not founded the week before it arrives');
  s = advance(s, 1);
  assert(dedicatedSchool(s, 'HALL-01') === 'Business', 'the hall is dedicated the week the sixth program settles');
  assert(isSchoolFounded(s, 'Business'), 'and the School of Business is founded');
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
