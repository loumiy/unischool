// ---------------------------------------------------------------------
// Swapping instructors (Plan 14's PR G — see techSystem.ts's
// swapInstructors and the reducer's SWAP_COURSE_FACULTY). The Curriculum
// tab's faculty chips drag between courses; a drop swaps who teaches what.
// A legal swap changes both courses; an illegal one — wrong department,
// somebody full, a program in transit, an unstaffed course — changes
// neither, and nothing is ever displaced to unassigned.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { createInitialState } from '../src/state/actions';
import { reducer } from '../src/engine/reducer';
import { canSwapInstructors } from '../src/systems/techtree/techSystem';
import { projectedQuality } from '../src/systems/faculty/facultyAssignment';
import type { Faculty, GameState } from '../src/state/types';
import { bindScriptStream } from '../src/engine/random';

bindScriptStream(909);
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

function hire(s: GameState, id: string, field: string, teaching: number, courseSlots = 3): Faculty {
  const f: Faculty = {
    id, name: `Dr. ${id}`, field,
    teaching, research: 50, teachingPotential: teaching, researchPotential: 50,
    tenureWeeks: 0, weeksListed: 0, acclaim: 0, salary: 0, courseSlots,
    nationality: 'United States', flag: '🇺🇸', bio: 'A test fixture, not a character.', gender: 'female', heritage: 'Anglo/Western European',
  };
  s.faculty.push(f);
  return f;
}

// Two English professors on the two founding English courses — the
// pairing that exists at founding, but with the weaker one on the harder
// course.
function staffed(): GameState {
  const s = createInitialState('Swappers');
  s.faculty = s.faculty.filter((f) => f.field !== 'English');
  hire(s, 'strong', 'English', 90);
  hire(s, 'weak', 'English', 40);
  for (const [id, who] of [['ENGL101', 'weak'], ['ENGL110', 'strong']] as const) {
    s.tech.find((t) => t.id === id)!.status = 'done';
    s.courseFaculty[id] = who;
  }
  return s;
}

console.log('instructor swap tests');

// ---- a legal swap changes both ----
{
  let s = staffed();
  assert(canSwapInstructors(s, 'ENGL101', 'ENGL110'), 'two staffed courses in one department can swap');
  const a = s.tech.find((t) => t.id === 'ENGL101')!;
  const strong = s.faculty.find((f) => f.id === 'strong')!;
  const previewA = projectedQuality(s, a, strong);
  s = reducer(s, { type: 'SWAP_COURSE_FACULTY', courseA: 'ENGL101', courseB: 'ENGL110' });
  assert(s.courseFaculty['ENGL101'] === 'strong' && s.courseFaculty['ENGL110'] === 'weak', 'the two instructors trade courses');
  assert(previewA.grade !== undefined, 'the preview computed a grade for the incoming professor');
  // Symmetric: swapping back restores it.
  s = reducer(s, { type: 'SWAP_COURSE_FACULTY', courseA: 'ENGL110', courseB: 'ENGL101' });
  assert(s.courseFaculty['ENGL101'] === 'weak' && s.courseFaculty['ENGL110'] === 'strong', 'and the swap is symmetric');
}

// ---- illegal drops change nothing ----
{
  const s = staffed();
  const before = JSON.stringify(s.courseFaculty);
  // Wrong department.
  assert(s.tech.find((t) => t.id === 'MATH101')!.status === 'done' && s.courseFaculty['MATH101'] === 'f4', 'fixture: a founding Mathematics course, taught by the Mathematics hire');
  assert(!canSwapInstructors(s, 'ENGL101', 'MATH101'), 'a course in another department is not a legal target');
  // The same course, or the same person.
  assert(!canSwapInstructors(s, 'ENGL101', 'ENGL101'), 'a course cannot swap with itself');
  s.courseFaculty['ENGL110'] = 'weak';
  assert(!canSwapInstructors(s, 'ENGL101', 'ENGL110'), 'two courses taught by the same person have nothing to swap');
  s.courseFaculty['ENGL110'] = 'strong';
  // An unstaffed course.
  delete s.courseFaculty['ENGL110'];
  assert(!canSwapInstructors(s, 'ENGL101', 'ENGL110'), 'an unstaffed course is not a swap — nobody is displaced to unassigned');
  s.courseFaculty['ENGL110'] = 'strong';
  // An undeveloped course.
  assert(!canSwapInstructors(s, 'ENGL101', 'ENGL120'), 'a course not yet offered is not a target');
  // The reducer refuses all of it silently.
  const after = reducer(JSON.parse(JSON.stringify(s)) as GameState, { type: 'SWAP_COURSE_FACULTY', courseA: 'ENGL101', courseB: 'ENGL120' });
  assert(JSON.stringify(after.courseFaculty) === JSON.stringify(s.courseFaculty), 'a refused swap writes nothing');
  assert(JSON.stringify({ ...s.courseFaculty, MATH101: undefined }).includes('weak') && before.length > 0, 'fixture intact');
}

// ---- a swap never needs a slot, so a full professor can still trade ----
{
  const s = staffed();
  s.faculty.find((f) => f.id === 'strong')!.courseSlots = 1;
  s.faculty.find((f) => f.id === 'weak')!.courseSlots = 1;
  assert(canSwapInstructors(s, 'ENGL101', 'ENGL110'), 'two professors each at their one-course ceiling can still swap — nobody gains a course');
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
