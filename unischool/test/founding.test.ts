// ---------------------------------------------------------------------
// Founding a program (Plan 14's PR C — see techSystem.ts's foundProgram
// and the reducer's FOUND_PROGRAM). The one way a major enters the
// curriculum: it takes an empty slot in a standing hall, and its entry
// course starts with the chosen instructor in the same transaction. This
// file pins the gate — every way a founding is refused — and the
// transaction — everything a founding writes.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { createInitialState } from '../src/state/actions';
import { reducer } from '../src/engine/reducer';
import { FOUNDERS_HALL_ID, programById, programOfCourse } from '../src/data/techData';
import { FOUNDING_PROGRAMS } from '../src/data/foundingData';
import { canFoundProgram, canStartDevelopment, facultyGate } from '../src/systems/techtree/techSystem';
import { isHoused } from '../src/systems/techtree/programOffers';
import type { GameState } from '../src/state/types';

let seed = 4242;
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

function staffField(s: GameState, field: string, id = `test-${field}`): void {
  s.faculty.push({
    id, name: `Dr. Test ${field}`, field,
    teaching: 80, research: 60, teachingPotential: 90, researchPotential: 70,
    tenureWeeks: 0, weeksListed: 0, acclaim: 0, salary: 0, courseSlots: 10,
    nationality: 'United States', flag: '🇺🇸', bio: 'A test fixture, not a character.', gender: 'male', heritage: 'Anglo/Western European',
  });
}

// Counts TICKS, not loop passes: an interrupt on the way (the first year's
// letters, a milestone) is put down without a week going by, so `weeks` is
// always the number of weeks that actually elapsed.
function advance(s: GameState, weeks: number): GameState {
  let ticked = 0;
  while (ticked < weeks) {
    if (s.pendingInterrupt) { s = reducer(s, { type: 'RESOLVE_REPORT' }); continue; }
    s = reducer(s, { type: 'TICK' });
    ticked += 1;
  }
  return s;
}

// A school with the first hall standing and empty beside Founders Hall,
// three programs on offer, and every offered program's field staffed.
// The first hall's own gate (eight developed courses — Plan 19's PR B) is
// not what is under test here, so the hall is stood up directly.
function ready(): GameState {
  const s = createInitialState('Founders');
  s.finance.cash = 500_000_000;
  const hall = s.tech.find((t) => t.id === 'HALL-01')!;
  hall.status = 'done';
  s.placements['HALL-01'] = { row: 40, col: 90, w: 7, h: 5 };
  s.halls['HALL-01'] = Array.from({ length: 6 }, () => ({ programId: null }));
  for (const id of s.programOffers) {
    const field = s.tech.find((t) => t.id === programById(id)!.entryCourseId)?.requiresFaculty;
    if (field && !s.faculty.some((f) => f.id === `test-${field}`)) staffField(s, field);
  }
  return s;
}

console.log('founding tests');

// ---- the state the fixture promises ----
{
  const s = ready();
  assert(s.tech.find((t) => t.id === 'HALL-01')?.status === 'done', 'the first hall stands');
  assert(s.halls['HALL-01']?.length === 6 && s.halls['HALL-01'].every((x) => x.programId === null), 'with six empty slots');
  assert(s.programOffers.length === 3, 'three programs on offer');
  assert(s.halls[FOUNDERS_HALL_ID].filter((x) => x.programId === null).length === 3, 'and Founders Hall has three rooms free beside it');
}

// ---- the transaction ----
{
  let s = ready();
  const program = programById(s.programOffers[1])!;
  const entry = s.tech.find((t) => t.id === program.entryCourseId)!;
  const instructor = s.faculty.find((f) => f.field === entry.requiresFaculty)!;
  const cash = s.finance.cash;
  const founding = { programId: program.id, hallId: 'HALL-01', slot: 4, facultyId: instructor.id };
  assert(canFoundProgram(s, founding), 'the founding passes the gate');
  s = reducer(s, { type: 'FOUND_PROGRAM', ...founding });
  assert(s.halls['HALL-01'][4].programId === program.id, 'the slot is written');
  assert(isHoused(s, program.id), 'and the program reads as housed');
  assert(s.tech.find((t) => t.id === entry.id)?.status === 'developing', 'the entry course is developing');
  assert(s.developing[entry.id] === entry.duration, 'with its full duration ahead of it');
  assert(s.courseFaculty[entry.id] === instructor.id, 'taught by the chosen instructor');
  assert(cash - s.finance.cash === entry.cost, 'the entry course was charged, once');
  assert(!s.programOffers.includes(program.id), 'the founded program leaves the offer');
  assert(s.programOffers.length === 3, 'and a replacement is drawn');
  assert(s.log[0]?.message.includes(program.name) && s.log[0]?.message.includes('North Academic Hall'),
    `the log says where it was founded (${s.log[0]?.message})`);
  // Founding the same program twice, or into a taken slot, is refused.
  const again = reducer(s, { type: 'FOUND_PROGRAM', ...founding });
  assert(JSON.stringify(again.halls) === JSON.stringify(s.halls), 'a taken slot cannot be founded into');
}

// ---- the gate, every way it refuses ----
{
  const s = ready();
  const program = programById(s.programOffers[0])!;
  const entry = s.tech.find((t) => t.id === program.entryCourseId)!;
  const instructor = s.faculty.find((f) => f.field === entry.requiresFaculty)!;
  const ok = { programId: program.id, hallId: 'HALL-01', slot: 0, facultyId: instructor.id };
  assert(canFoundProgram(s, ok), 'the control founding is admissible');

  // Not on offer.
  const notOffered = programById('MECH')!.id === program.id ? 'FINA' : 'MECH';
  const offeredElsewhere = s.programOffers.includes(notOffered);
  if (!offeredElsewhere) {
    staffField(s, s.tech.find((t) => t.id === programById(notOffered)!.entryCourseId)!.requiresFaculty!, 'extra');
    assert(!canFoundProgram(s, { ...ok, programId: notOffered, facultyId: 'extra' }), 'a program not on offer cannot be founded');
  }
  // A founding program is housed already and never on offer.
  assert(!canFoundProgram(s, { ...ok, programId: FOUNDING_PROGRAMS[0] }), 'a founding program cannot be founded again');
  assert(!canFoundProgram(s, { ...ok, programId: 'CORE' }), 'nor can an id that is not a program');
  // No such hall, no such slot.
  assert(!canFoundProgram(s, { ...ok, hallId: 'HALL-02' }), 'a hall that does not stand has no slots');
  assert(!canFoundProgram(s, { ...ok, slot: 6 }), 'slot 7 of a six-slot hall does not exist');
  assert(!canFoundProgram(s, { ...ok, slot: -1 }), 'nor does slot 0 of 1');
  // Founders Hall's first three slots hold the founding programs; its
  // free rooms take a founding like any other hall's.
  assert(!canFoundProgram(s, { ...ok, hallId: FOUNDERS_HALL_ID, slot: 0 }), "Founders Hall's first slot holds a founding program");
  assert(canFoundProgram(s, { ...ok, hallId: FOUNDERS_HALL_ID, slot: 3 }), 'and its fourth room is open to a founding');
  // Cash.
  const poor = JSON.parse(JSON.stringify(s)) as GameState;
  poor.finance.cash = entry.cost - 1;
  assert(!canFoundProgram(poor, ok), 'a dollar short of the entry course refuses');
  // Instructor: wrong field, off the roster, or full.
  const other = s.faculty.find((f) => f.field !== entry.requiresFaculty)!;
  assert(!canFoundProgram(s, { ...ok, facultyId: other.id }), 'an instructor in another field is refused');
  assert(!canFoundProgram(s, { ...ok, facultyId: 'nobody' }), 'someone off the roster is refused');
  const full = JSON.parse(JSON.stringify(s)) as GameState;
  full.faculty.find((f) => f.id === instructor.id)!.courseSlots = 0;
  assert(!canFoundProgram(full, ok), 'a professor with no free slot is refused');
  // Nothing was written by any refusal.
  const refused = reducer(JSON.parse(JSON.stringify(s)) as GameState, { type: 'FOUND_PROGRAM', ...ok, facultyId: 'nobody' });
  assert(refused.halls['HALL-01'].every((x) => x.programId === null), 'a refused founding writes nothing');
  assert(refused.tech.find((t) => t.id === entry.id)?.status === 'locked', 'and starts nothing');
}

// ---- no other door ----
{
  const s = ready();
  const program = programById(s.programOffers[0])!;
  // The entry course is locked, and START_DEVELOPMENT refuses a locked
  // course; the only path to 'available' is the housed gate.
  const direct = reducer(JSON.parse(JSON.stringify(s)) as GameState, { type: 'START_DEVELOPMENT', nodeId: program.entryCourseId });
  assert(direct.tech.find((t) => t.id === program.entryCourseId)?.status === 'locked', 'a tier-1 course cannot be started from the curriculum before founding');
  // Sixty weeks of ticking never opens it either.
  const later = advance(JSON.parse(JSON.stringify(s)) as GameState, 60);
  assert(later.tech.find((t) => t.id === program.entryCourseId)?.status === 'locked', 'and time alone never opens it');
  assert(later.tech.filter((t) => t.kind === 'course' && t.status === 'available').every((t) => FOUNDING_PROGRAMS.includes(programOfCourse(t.id) ?? '')),
    'nothing but founding reveals a course outside the founding programs');
}

// ---- the hall fills, and the offer runs on ----
{
  let s = ready();
  const founded: string[] = [];
  for (let slot = 0; slot < 6; slot += 1) {
    // Staff whatever is on offer, then found the first one.
    for (const id of s.programOffers) {
      const field = s.tech.find((t) => t.id === programById(id)!.entryCourseId)?.requiresFaculty;
      if (field && !s.faculty.some((f) => f.id === `test-${field}`)) staffField(s, field);
    }
    const id = s.programOffers[0];
    const field = s.tech.find((t) => t.id === programById(id)!.entryCourseId)!.requiresFaculty!;
    s = reducer(s, { type: 'FOUND_PROGRAM', programId: id, hallId: 'HALL-01', slot, facultyId: `test-${field}` });
    founded.push(id);
  }
  assert(s.halls['HALL-01'].every((x) => x.programId !== null), 'six foundings fill the hall');
  assert(new Set(founded).size === 6, 'with six different programs');
  assert(s.programOffers.length === 3 && s.programOffers.every((id) => !founded.includes(id)), 'and three more are on offer');
}

// ---- courses from the map (PR D): the same start, the same rules ----
{
  let s = ready();
  const program = programById(s.programOffers[0])!;
  const entry = s.tech.find((t) => t.id === program.entryCourseId)!;
  const field = entry.requiresFaculty!;
  s = reducer(s, { type: 'FOUND_PROGRAM', programId: program.id, hallId: 'HALL-01', slot: 0, facultyId: `test-${field}` });
  s = advance(s, entry.duration + 1);
  const t2 = s.tech.find((t) => t.id === program.courseIds[1])!;
  assert(t2.status === 'available', 'a tier-2 course of the housed program is available once the entry course is done');
  // The hall panel dispatches the ordinary START_DEVELOPMENT with the
  // chosen instructor — and the ordinary gate refuses someone ineligible.
  const wrong = s.faculty.find((f) => f.field !== field)!;
  const refused = reducer(JSON.parse(JSON.stringify(s)) as GameState, { type: 'START_DEVELOPMENT', nodeId: t2.id, facultyId: wrong.id });
  assert(refused.tech.find((t) => t.id === t2.id)?.status === 'available', 'an instructor from another field is refused from the map too');
  s = reducer(s, { type: 'START_DEVELOPMENT', nodeId: t2.id, facultyId: `test-${field}` });
  assert(s.tech.find((t) => t.id === t2.id)?.status === 'developing', 'the chosen instructor starts it');
  assert(s.courseFaculty[t2.id] === `test-${field}`, 'and is recorded as teaching it');
  // A department with no free slot: the reason is readable, not silent.
  const full = JSON.parse(JSON.stringify(s)) as GameState;
  for (const f of full.faculty) if (f.field === field) f.courseSlots = 0;
  const t3 = full.tech.find((t) => t.id === program.courseIds[2])!;
  assert(t3.status === 'available' && !canStartDevelopment(full, t3), 'a course whose department is full cannot start');
  assert(facultyGate(full, field) !== 'open', `and facultyGate says why (${facultyGate(full, field)})`);
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
