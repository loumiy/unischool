// ---------------------------------------------------------------------
// The four capacity figures the Faculty tab's meter is drawn from (see
// src/systems/faculty/facultyCapacity.ts): what the roster supplies, what
// the current courseload takes, what the revealed curriculum would take
// next, and what the whole catalog will take once it is developed.
//
// Two of those are new readings of old state and one is a re-derivation of
// arithmetic techSystem.ts already owns, so what is worth pinning is that
// they agree — with techSystem, and with each other:
//
//   - a department's four figures are nested (offered <= offered+available
//     <= catalog), so the meter's segments can never overdraw its track;
//   - supply is COMMITMENT-ADJUSTED, so funding a project is visible as a
//     department losing capacity rather than as a number that did not move;
//   - an unstaffed course still consumes supply, which is the finding
//     techSystem.ts's usedFacultySlots documents at length and the one a
//     re-derivation is most likely to quietly undo;
//   - EVERY field in the taxonomy gets a row, including the ones nobody
//     has hired into — the whole point of the rebuilt tab.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { createInitialState } from '../src/state/actions';
import { facultyCapacity, hiresFor, SLOTS_PER_NEW_HIRE } from '../src/systems/faculty/facultyCapacity';
import { totalFacultySlots, usedFacultySlots } from '../src/systems/techtree/techSystem';
import { FACULTY_FIELDS, FACULTY_FIELD_GROUPS } from '../src/data/facultyData';
import type { Faculty, GameState } from '../src/state/types';
import { bindScriptStream } from '../src/engine/random';

bindScriptStream(31337);
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

// Offer `count` of the field's courses; the rest are left revealed but
// undeveloped, which is what `available` counts.
function offer(s: GameState, count: number): void {
  const courses = s.tech.filter((t) => t.requiresFaculty === FIELD).slice(0, count);
  for (const c of courses) c.status = 'done';
}

function reveal(s: GameState, count: number): void {
  const courses = s.tech.filter((t) => t.requiresFaculty === FIELD && t.status === 'locked').slice(0, count);
  for (const c of courses) c.status = 'available';
}

console.log('faculty capacity tests');

// --- the taxonomy is rendered whole ------------------------------------
{
  const s = createInitialState('Ashcombe');
  const cap = facultyCapacity(s);

  assert(cap.fields.length === FACULTY_FIELDS.length,
    `every field in the taxonomy gets a row (${cap.fields.length} of ${FACULTY_FIELDS.length})`);
  assert(cap.fields.every((c, i) => c.field === FACULTY_FIELDS[i]),
    'in division order, not roster order');

  // The divisions ARE the taxonomy: every field in exactly one group, no
  // group naming a field that does not exist. This is what lets the tab
  // group 29 rows without a second list to keep in sync.
  const grouped = FACULTY_FIELD_GROUPS.flatMap((g) => g.fields);
  assert(grouped.length === FACULTY_FIELDS.length && grouped.every((f, i) => f === FACULTY_FIELDS[i]),
    'the divisions partition the field list exactly');
  assert(new Set(grouped).size === grouped.length, 'no field sits in two divisions');

  // A department nobody has hired into still has a catalog, which is the
  // number that says whether it is worth founding.
  const neuro = cap.byField.get('Neuroscience')!;
  assert(neuro.hired === 0 && neuro.catalogue > 0,
    `an empty department still reports its catalog (Neuroscience: ${neuro.catalogue} courses)`);

  assert(cap.total.catalogue === s.tech.filter((t) => t.kind === 'course' && t.requiresFaculty).length,
    'the field totals account for every gated course in the catalog');
  assert(cap.fields.reduce((n, c) => n + c.hired, 0) === s.faculty.length,
    'and for every person on the roster');
}

// --- the figures are nested, so the meter cannot overdraw ---------------
{
  const s = createInitialState('Ashcombe');
  const cap = facultyCapacity(s);
  for (const c of cap.fields) {
    assert(c.offered + c.available <= c.catalogue,
      `${c.field}: offered + available never exceeds the catalog (${c.offered}+${c.available} <= ${c.catalogue})`);
    assert(c.supply <= c.grossSupply, `${c.field}: commitments only ever subtract supply`);
    assert(c.catalogue <= cap.scale, `${c.field}: its catalog fits the shared scale`);
  }
  assert(cap.scale === Math.max(...cap.fields.map((c) => c.catalogue)),
    'the shared scale is the longest catalog on the board, not the largest roster');
}

// --- the school-wide gap is summed per department ----------------------
{
  // The one figure that cannot be computed from the school-wide totals.
  // Slots do not transfer between departments, so hiring sixty physicists
  // does not shorten the queue in Law — and `catalogue - supply` on the
  // totals says it does.
  const s = createInitialState('Ashcombe');
  const before = facultyCapacity(s);

  for (let i = 0; i < 60; i += 1) s.faculty.push(person(`glut${i}`, 10));
  const after = facultyCapacity(s);
  const physics = after.byField.get(FIELD)!;

  assert(physics.supply > physics.catalogue, 'Physics is now hired well past its own catalog');
  assert(after.total.supply > after.total.catalogue, 'and the school-wide supply passes the school-wide catalog');
  assert(after.total.shortfall > 0,
    `while every other department is still short (${after.total.shortfall} slots), which the naive subtraction would report as zero`);
  assert(after.total.shortfall === before.total.shortfall - Math.max(0, before.byField.get(FIELD)!.catalogue - before.byField.get(FIELD)!.supply),
    'and the gap that closed is exactly the one department that was hired into');
  assert(hiresFor(after.total.shortfall) > 0, 'so the tab still asks for more appointments');
}

// --- it agrees with techSystem, field by field -------------------------
{
  const s = bare();
  s.faculty.push(person('prof', 4));
  offer(s, 3);
  const c = facultyCapacity(s).byField.get(FIELD)!;

  assert(c.supply === totalFacultySlots(s, FIELD), `supply is totalFacultySlots (${c.supply})`);
  assert(c.offered === usedFacultySlots(s, FIELD), `offered is usedFacultySlots (${c.offered})`);
  assert(c.state === 'ok', 'four slots against three courses reads as room');
}

// --- an unstaffed course still costs its slot --------------------------
{
  // The finding usedFacultySlots is built on: dismissing the only
  // professor loses the teacher AND the capacity, so the department reads
  // as over its ceiling rather than as empty and available.
  const s = bare();
  s.faculty.push(person('prof', 4));
  offer(s, 3);
  for (const t of s.tech) {
    if (t.requiresFaculty === FIELD && t.status === 'done') s.courseFaculty[t.id] = 'prof';
  }
  s.faculty = s.faculty.filter((f) => f.id !== 'prof');

  const c = facultyCapacity(s).byField.get(FIELD)!;
  assert(c.offered === 3, 'the three courses are still offered');
  assert(c.supply === 0, 'with nobody to teach them');
  assert(c.state === 'over', 'which is the alarmed state, not an empty one');
}

// --- at the ceiling with something revealed is 'short' -----------------
{
  const s = bare();
  s.faculty.push(person('prof', 2));
  offer(s, 2);
  reveal(s, 1);

  const c = facultyCapacity(s).byField.get(FIELD)!;
  assert(c.available >= 1, 'a revealed course is waiting');
  assert(c.state === 'short', 'a department at its ceiling with a course waiting is short');

  // Same department, nothing revealed: full, but not blocking anything.
  const quiet = bare();
  quiet.faculty.push(person('prof', 2));
  offer(quiet, 2);
  for (const t of quiet.tech) if (t.requiresFaculty === FIELD && t.status === 'available') t.status = 'locked';
  assert(facultyCapacity(quiet).byField.get(FIELD)!.state === 'ok',
    'and is not short when there is nothing it is stopping');
}

// --- a research commitment takes capacity, visibly ---------------------
{
  const s = bare();
  s.faculty.push(person('prof', 4));
  offer(s, 3);
  const before = facultyCapacity(s).byField.get(FIELD)!;
  assert(before.state === 'ok' && before.committed === 0, 'before the project, the department has room');

  const lab = s.tech.find((t) => t.kind === 'facility' && t.facilityType === 'lab')!;
  s.research.initiatives[lab.id] = {
    labId: lab.id, topicId: 'X01', depth: 'pilot', participantIds: ['prof'],
    weeksTotal: 26, weeksRemaining: 26, publications: 0, breakthroughs: 0, grantIncome: 0, banked: 0,
  };

  const after = facultyCapacity(s).byField.get(FIELD)!;
  assert(after.supply === before.supply - 2, `committing them costs two slots (${before.supply} -> ${after.supply})`);
  assert(after.grossSupply === before.grossSupply,
    'the gross figure does not move, so the tab can show where the slots went');
  assert(after.committed === 1, 'and says how many people are on projects');
  assert(after.state === 'over', 'three courses on two remaining slots is over the ceiling');
}

// --- slots, in people --------------------------------------------------
{
  assert(hiresFor(0) === 0, 'no gap is no hires');
  assert(hiresFor(1) === 1, 'any gap at all is at least one hire');
  assert(hiresFor(SLOTS_PER_NEW_HIRE * 3) === 3, 'and otherwise rounds up by the slots a new hire brings');
  assert(hiresFor(-4) === 0, 'headroom is not a negative number of people');
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
