// ---------------------------------------------------------------------
// Whether waiting will help (src/systems/techtree/techSystem.ts's
// facultyGate, drawn by CurriculumTab.tsx as a yellow or a red dot).
//
// Three states, and the whole value of the predicate is that the middle one
// is distinguishable from the last: "your department is full, but there is
// somebody on the market" and "your department is full and nobody is
// listed" look identical on a course cell unless something says otherwise,
// and they call for opposite actions — go and appoint, versus wait.
//
// The failure mode worth guarding is a later refactor collapsing them back
// into one boolean, which no player would report as a bug; they would just
// find the curriculum stopped telling them anything useful.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { createInitialState } from '../src/state/actions';
import { facultyGate, hasFreeFacultySlot, totalFacultySlots, usedFacultySlots } from '../src/systems/techtree/techSystem';
import type { Faculty, GameState } from '../src/state/types';

let seed = 31337;
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

const FIELD = 'Physics';

// A school with nobody in the field and nothing listed in it: the blank
// slate each case below builds up from.
function bare(): GameState {
  const s = createInitialState('Ashcombe');
  s.faculty = s.faculty.filter((f) => f.field !== FIELD);
  s.candidates = s.candidates.filter((c) => c.field !== FIELD);
  for (const t of s.tech) {
    if (t.requiresFaculty === FIELD && (t.status === 'developing' || t.status === 'done')) t.status = 'available';
  }
  return s;
}

function person(id: string, slots: number): Faculty {
  return {
    id, name: id, field: FIELD, teaching: 60, research: 60, acclaim: 0,
    courseSlots: slots, salary: 100_000, tenureWeeks: 0,
  } as Faculty;
}

// Occupy `count` slots in the field by offering that many of its courses.
function offer(s: GameState, count: number): void {
  const courses = s.tech.filter((t) => t.requiresFaculty === FIELD).slice(0, count);
  for (const c of courses) c.status = 'done';
}

console.log('faculty gate tests');

// --- a free slot: nothing is in the way -------------------------------
{
  const s = bare();
  s.faculty.push(person('prof', 3));
  offer(s, 1);
  assert(hasFreeFacultySlot(s, FIELD), 'the department has room');
  assert(facultyGate(s, FIELD) === 'open', 'so the gate is open');

  // And it stays open whether or not anybody is listed — the market is only
  // consulted when the slots run out.
  s.candidates.push(person('listed', 2));
  assert(facultyGate(s, FIELD) === 'open', 'a candidate on the market does not change an already-open gate');
}

// --- no slot, somebody listed: go and appoint -------------------------
{
  const s = bare();
  s.faculty.push(person('prof', 2));
  offer(s, 2);
  s.candidates.push(person('listed', 2));

  assert(!hasFreeFacultySlot(s, FIELD), 'every slot is spoken for');
  assert(
    usedFacultySlots(s, FIELD) === totalFacultySlots(s, FIELD),
    `and the arithmetic says so (${usedFacultySlots(s, FIELD)} of ${totalFacultySlots(s, FIELD)})`,
  );
  assert(facultyGate(s, FIELD) === 'hireable', 'with somebody on the market, the block is one appointment away');
}

// --- no slot, empty market: only time helps ---------------------------
{
  const s = bare();
  s.faculty.push(person('prof', 2));
  offer(s, 2);
  assert(facultyGate(s, FIELD) === 'blocked', 'with nobody listed, there is nothing to do but wait');

  // A candidate in ANOTHER field is not a candidate in this one — the
  // obvious way to write the market check wrongly.
  s.candidates.push({ ...person('other', 2), field: 'Chemistry' } as Faculty);
  assert(facultyGate(s, FIELD) === 'blocked', 'a candidate in another field does not unblock this one');
}

// --- nobody hired at all ----------------------------------------------
{
  const s = bare();
  offer(s, 1);
  assert(totalFacultySlots(s, FIELD) === 0, 'an empty department supplies no slots');
  assert(facultyGate(s, FIELD) === 'blocked', 'so a course in it is blocked, not open');
  s.candidates.push(person('listed', 2));
  assert(facultyGate(s, FIELD) === 'hireable', 'and becomes hireable the moment somebody is listed');
}

// --- a research commitment can close an open gate ---------------------
{
  // The interaction 2C introduced: a committed scholar supplies two slots
  // fewer, so committing somebody can be what puts a department over its
  // own ceiling. The gate must read the same arithmetic everything else
  // does rather than f.courseSlots directly.
  const s = bare();
  s.faculty.push(person('prof', 4));
  offer(s, 3);
  assert(facultyGate(s, FIELD) === 'open', 'four slots against three courses leaves room');

  const lab = s.tech.find((t) => t.kind === 'facility' && t.facilityType === 'lab')!;
  s.research.initiatives[lab.id] = {
    labId: lab.id, topicId: 'X01', depth: 'pilot', participantIds: ['prof'],
    weeksTotal: 26, weeksRemaining: 26, publications: 0, breakthroughs: 0, grantIncome: 0, banked: 0,
  };
  assert(facultyGate(s, FIELD) === 'blocked', 'committing them to a project closes it');
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
