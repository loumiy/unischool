// ---------------------------------------------------------------------
// The committee (Plan 80E):
//
//   1. Course lengths: each course's weeks are its tier's (or its graduate
//      kind's), varied up to a quarter either way, whole weeks, fixed for
//      that course, and not all alike within a tier.
//   2. A graduate course takes a committee seat like any other: it cannot
//      start while the committee is full, and counts once it starts; nor
//      can a graduate program be founded, since its entry course would not
//      start.
//   3. The dock's committee chip: the courses being written of the most at
//      once, flagged only while there is room and a course that could start.
//   4. A loaded save takes the catalog's weeks for a course not yet started;
//      a course under way keeps the weeks it was started with.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { teachingCollege } from './fixtures/teaching';
import type { GameState } from '../src/state/types';
import { COURSE_LENGTH_SPREAD, courseWeeks, graduateGateMet, graduatePrograms, initialTech, schoolCurriculumIds } from '../src/data/techData';
import { GRADUATE_HOSTS } from '../src/data/projectData';
import {
  canFoundProgram, canStartDevelopment, committeeSeats, committeeStatus, coursesInDevelopment, courseSlotsFree, eligibleInstructors, foundProgram,
  startDevelopment,
} from '../src/systems/techtree/techSystem';
import { clearSave, loadGame, SAVE_KEY, SAVE_VERSION } from '../src/state/persistence';
import { bindScriptStream } from '../src/engine/random';

bindScriptStream(80);
const store = new Map<string, string>();
(globalThis as unknown as { localStorage: unknown }).localStorage = {
  getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
  setItem: (k: string, v: string) => { store.set(k, String(v)); },
  removeItem: (k: string) => { store.delete(k); },
  clear: () => { store.clear(); },
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

console.log('committee tests');

// ---- 1. course lengths ----
{
  // The unvaried weeks, as techData.ts states them: by an undergraduate
  // course's number (101 the entry, 1xx the tier-2 core, 2xx the capstones)
  // and by a graduate program's kind.
  const gradType = new Map(graduatePrograms().map((p) => [p.id, p.type]));
  const baseOf = (id: string, graduateProgram?: string): number => {
    if (graduateProgram !== undefined) return gradType.get(graduateProgram) === 'professional' ? 40 : 32;
    const num = Number(/(\d+)$/.exec(id)![1]);
    return num === 101 ? 4 : num < 200 ? 12 : 24;
  };
  const courses = initialTech().filter((t) => t.kind === 'course');
  assert(courses.length > 400, `every course is seeded (${courses.length})`);
  const outside = courses.filter((t) => {
    const base = baseOf(t.id, t.graduateProgram);
    return !Number.isInteger(t.duration) || t.duration < 1 || Math.abs(t.duration - base) > base * COURSE_LENGTH_SPREAD;
  });
  assert(outside.length === 0, `every course's weeks are whole and within a quarter of its tier's (${outside.slice(0, 3).map((t) => `${t.id} ${t.duration}`).join(', ')})`);

  const again = new Map(initialTech().map((t) => [t.id, t.duration]));
  assert(courses.every((t) => again.get(t.id) === t.duration), 'the same course gets the same weeks every time');
  assert(courses.every((t) => courseWeeks(t.id, baseOf(t.id, t.graduateProgram)) === t.duration), 'and they are courseWeeks of its id');

  // Varied: a tier's courses do not all finish together.
  for (const base of [4, 12, 24, 32, 40]) {
    const weeks = new Set(courses.filter((t) => baseOf(t.id, t.graduateProgram) === base).map((t) => t.duration));
    assert(weeks.size >= 3, `courses of ${base} weeks vary (${[...weeks].sort((a, b) => a - b).join(', ')})`);
  }
  const lo = courses.filter((t) => baseOf(t.id, t.graduateProgram) === 24).map((t) => t.duration);
  assert(Math.min(...lo) <= 20 && Math.max(...lo) >= 28, `the capstones reach toward both ends of the band (${Math.min(...lo)}–${Math.max(...lo)})`);
}

// A college teaching its pillars (fixtures/teaching.ts) with money to spend, where a course needs no professor, so the
// committee is the only thing that can hold a start.
function rich(): GameState {
  const s = teachingCollege('Committee');
  s.finance.cash = 1e10;
  for (const t of s.tech) if (t.kind === 'course') delete t.requiresFaculty;
  return s;
}
const available = (s: GameState, graduate: boolean) =>
  s.tech.filter((t) => t.kind === 'course' && t.status === 'available' && (t.graduateProgram !== undefined) === graduate);

// ---- 2. a graduate course takes a seat ----
{
  const s = rich();
  const grad = s.tech.find((t) => t.kind === 'course' && t.graduateProgram !== undefined)!;
  grad.status = 'available';
  const undergrad = available(s, false);
  assert(undergrad.length >= committeeSeats(s), `enough courses to fill the committee (${undergrad.length})`);
  for (const t of undergrad.slice(0, committeeSeats(s))) startDevelopment(s, t);
  assert(courseSlotsFree(s) === 0, 'the committee is full');
  assert(!canStartDevelopment(s, grad), 'a graduate course cannot start while the committee is full');

  // One comes free: the graduate course may start, and takes the place.
  const first = coursesInDevelopment(s)[0];
  first.status = 'done';
  delete s.developing[first.id];
  assert(courseSlotsFree(s) === 1 && canStartDevelopment(s, grad), 'with room, it can start');
  startDevelopment(s, grad);
  assert(coursesInDevelopment(s).some((t) => t.id === grad.id), 'and it counts as one the committee is writing');
  assert(courseSlotsFree(s) === 0, 'which fills the committee again');
  assert(s.developing[grad.id] === grad.duration, 'it runs for its own weeks');
  const other = available(s, false)[0];
  assert(other !== undefined && !canStartDevelopment(s, other), 'so an undergraduate course waits for room');
}

// ---- 2b. founding a graduate program needs room for its entry course ----
{
  const s = rich();
  const program = graduatePrograms().find((p) => p.id === 'LAWS')!;
  const hostId = GRADUATE_HOSTS[program.id];
  const host = s.tech.find((t) => t.id === hostId)!;
  host.status = 'done';
  s.halls[hostId] ??= Array.from({ length: host.slots ?? 1 }, () => ({ programId: null }));
  const curriculum = new Set(schoolCurriculumIds(program.homeSchool));
  for (const t of s.tech) if (curriculum.has(t.id)) t.status = 'done';
  assert(graduateGateMet(s, program.id), `the ${program.id} gate is met`);
  const entry = s.tech.find((t) => t.id === `${program.id}${program.courses[0].num}`)!;
  const slot = s.halls[hostId].findIndex((x) => x.programId === null);
  const founding = { programId: program.id, hallId: hostId, slot, facultyId: eligibleInstructors(s, entry)[0]?.id ?? '' };
  // Fill the committee with undergraduate courses.
  const filler = s.tech.filter((t) => t.kind === 'course' && t.graduateProgram === undefined && t.status === 'locked' && !curriculum.has(t.id))
    .slice(0, committeeSeats(s));
  for (const t of filler) { t.status = 'available'; startDevelopment(s, t); }
  assert(courseSlotsFree(s) === 0, 'the committee is full');
  assert(!canFoundProgram(s, founding), 'a graduate program cannot be founded while the committee is full');
  const first = coursesInDevelopment(s)[0];
  first.status = 'done';
  delete s.developing[first.id];
  assert(canFoundProgram(s, founding), `with room, it can (${founding.facultyId || 'no instructor needed'})`);
  foundProgram(s, founding);
  assert(entry.status === 'developing' && courseSlotsFree(s) === 0, 'and its entry course starts, taking the room');
}

// ---- 3. the dock's committee chip ----
{
  const s = rich();
  const seats = committeeSeats(s);
  let status = committeeStatus(s);
  assert(status.writing === coursesInDevelopment(s).length && status.seats === seats, `the chip counts what the committee is writing of its most (${status.writing} of ${status.seats})`);
  assert(status.ready, 'room and a course that could start: flagged');

  const toStart = available(s, false).slice(0, seats - status.writing);
  for (const t of toStart) startDevelopment(s, t);
  status = committeeStatus(s);
  assert(status.writing === seats && !status.ready, `full: ${status.writing} of ${status.seats}, not flagged`);

  // A course is done: room again, flagged while something could start.
  const done = coursesInDevelopment(s)[0];
  done.status = 'done';
  delete s.developing[done.id];
  status = committeeStatus(s);
  assert(status.writing === seats - 1 && status.ready, 'a course done frees room, and the chip is flagged');

  // Room, but nothing can start (no cash): not flagged.
  s.finance.cash = 0;
  status = committeeStatus(s);
  assert(status.writing === seats - 1 && !status.ready, 'room with nothing that can start is not flagged');

  // More seats with prestige, counted.
  s.self.reputation = 100;
  assert(committeeStatus(s).seats === 8, 'the chip counts the seats prestige adds');
}

// ---- 4. a loaded save and its weeks ----
{
  clearSave();
  const s = rich();
  const [waiting, underWay] = available(s, false);
  startDevelopment(s, underWay);
  const catalogWeeks = waiting.duration;
  // As a save from before Plan 80E would hold them: every course at its
  // tier's even weeks.
  waiting.duration = 999;
  underWay.duration = 998;
  s.developing[underWay.id] = 990;
  store.set(SAVE_KEY, JSON.stringify({ version: SAVE_VERSION, savedAt: Date.now(), state: s }));
  const loaded = loadGame();
  assert(loaded !== null, 'the save loads');
  const find = (id: string) => loaded!.tech.find((t) => t.id === id)!;
  assert(find(waiting.id).duration === catalogWeeks, `a course not yet started takes the catalog's weeks (${find(waiting.id).duration})`);
  assert(find(underWay.id).duration === 998 && loaded!.developing[underWay.id] === 990, 'a course under way keeps its weeks and what is left of them');
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
