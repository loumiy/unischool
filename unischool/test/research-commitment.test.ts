// ---------------------------------------------------------------------
// What a research commitment costs in teaching
// (src/systems/techtree/techSystem.ts's RESEARCH_COMMITMENT_SLOTS,
// effectiveCourseSlots and coursesShedByCommitment, and the
// START_INITIATIVE case that acts on them).
//
// The old rule was "a committed scholar teaches nothing", which is one
// line of arithmetic and needed no test. Two slots is a rule with EDGES —
// somebody with two slots still stops teaching entirely, somebody with
// five keeps three, and which three they keep is a choice — and every edge
// is a place a later refactor can quietly get it wrong in a way no player
// would report as a bug, only as the game feeling punitive.
//
// The checks run against a real founding state with real courses, and
// drive the actual reducer rather than a paraphrase of it, because the
// thing worth pinning is what the game does when the button is pressed.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { createInitialState } from '../src/state/actions';
import { reducer } from '../src/engine/reducer';
import {
  RESEARCH_COMMITMENT_SLOTS, coursesShedByCommitment, effectiveCourseSlots,
  facultyLoad, isCommitted,
} from '../src/systems/techtree/techSystem';
import { tierOf } from '../src/data/courseQuality';
import { RESEARCH_TOPICS } from '../src/data/researchTopics';
import { labFields } from '../src/data/techData';
import type { Buildable, Faculty, GameState } from '../src/state/types';

let seed = 777;
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

const TIER_RANK: Record<string, number> = { core: 0, '1': 1, '2': 2, '3': 3, graduate: 4 };
const rank = (id: string) => TIER_RANK[String(tierOf(id))] ?? 0;

// A campus with one finished lab, cash in the bank, and a department whose
// people actually teach things — the state in which committing somebody
// means something.
function equipped(): { s: GameState; labId: string; field: string } {
  const s = createInitialState('Ashcombe', 'private');
  const lab = s.tech.find((t) => t.kind === 'facility' && t.facilityType === 'lab')!;
  lab.status = 'done';
  s.finance.cash = 5_000_000_000;
  return { s, labId: lab.id, field: labFields(lab.id)[0] };
}

// Put `count` offered courses in `field` on the roster member `f`, taken
// from the real catalogue so their tiers are the game's own.
function teach(s: GameState, f: Faculty, count: number): Buildable[] {
  const courses = s.tech.filter((t) => t.kind === 'course' && t.requiresFaculty === f.field).slice(0, count);
  for (const c of courses) {
    c.status = 'done';
    s.courseFaculty[c.id] = f.id;
  }
  return courses;
}

function hire(s: GameState, field: string, slots: number, name: string): Faculty {
  const f: Faculty = {
    id: `test-${name}`,
    name,
    field,
    teaching: 70,
    research: 70,
    acclaim: 0,
    courseSlots: slots,
    salary: 100_000,
    tenureWeeks: 0,
  } as Faculty;
  s.faculty.push(f);
  return f;
}

console.log('research commitment tests');

// --- the price itself -------------------------------------------------
{
  assert(RESEARCH_COMMITMENT_SLOTS === 2, 'a commitment costs two course slots');

  const { s, labId, field } = equipped();
  const five = hire(s, field, 5, 'five');
  const two = hire(s, field, 2, 'two');
  const one = hire(s, field, 1, 'one');

  assert(effectiveCourseSlots(s, five) === 5, 'an uncommitted professor offers all their slots');

  // Commit them by hand — the arithmetic is what is under test here, not
  // the reducer's guards.
  s.research.initiatives[labId] = {
    labId, topicId: 'X01', depth: 'pilot',
    participantIds: [five.id, two.id, one.id],
    weeksTotal: 26, weeksRemaining: 26, publications: 0, breakthroughs: 0, grantIncome: 0,
  };

  assert(isCommitted(s, five.id), 'and a committed one is committed');
  assert(effectiveCourseSlots(s, five) === 3, 'five slots become three');
  assert(effectiveCourseSlots(s, two) === 0, 'two become none — a junior hire is an expensive person to commit');
  assert(effectiveCourseSlots(s, one) === 0, 'and one does not go negative');
}

// --- which courses are shed, and which are kept -----------------------
{
  const { s, field } = equipped();
  const prof = hire(s, field, 5, 'prof');
  const courses = teach(s, prof, 5);
  assert(courses.length === 5, 'the catalogue gave us five courses in the field to work with');

  const shed = coursesShedByCommitment(s, [prof.id]);
  assert(shed.length === 2, 'a five-slot professor sheds exactly two courses, not five');

  const kept = courses.filter((c) => !shed.includes(c));
  assert(kept.length === 3, 'and keeps three');
  const lowestKept = Math.min(...kept.map((c) => rank(c.id)));
  const highestShed = Math.max(...shed.map((c) => rank(c.id)));
  assert(
    highestShed <= lowestKept,
    `what is shed is never a higher tier than what is kept (shed up to ${highestShed}, kept from ${lowestKept})`,
  );

  // Determinism: the same state must shed the same courses, or the warning
  // the player read is not the commitment they got.
  const again = coursesShedByCommitment(s, [prof.id]);
  assert(
    again.map((c) => c.id).join() === shed.map((c) => c.id).join(),
    'the same commitment always sheds the same courses',
  );
}

// --- somebody under their new ceiling sheds nothing -------------------
{
  const { s, field } = equipped();
  const prof = hire(s, field, 5, 'light');
  teach(s, prof, 2);
  assert(
    coursesShedByCommitment(s, [prof.id]).length === 0,
    'a five-slot professor teaching two keeps both — there is no excess to shed',
  );
}

// --- and the reducer does what the helper says ------------------------
{
  const { s, labId, field } = equipped();
  const prof = hire(s, field, 5, 'reducer');
  const courses = teach(s, prof, 5);
  const topic = RESEARCH_TOPICS.find((t) => t.fields.length === 1 && t.fields[0] === field)!;
  const predicted = coursesShedByCommitment(s, [prof.id]).map((c) => c.id);

  const after = reducer(s, {
    type: 'START_INITIATIVE', labId, topicId: topic.id, depth: 'pilot', facultyIds: [prof.id],
  });

  assert(!!after.research.initiatives[labId], 'the initiative started');
  const stillTeaching = courses.filter((c) => after.courseFaculty[c.id] === prof.id);
  assert(stillTeaching.length === 3, `they keep teaching three of their five courses (kept ${stillTeaching.length})`);
  // Compared as sets: the helper reports them in shed order (lowest tier
  // first) and this reads them back in catalogue order, and it is WHICH
  // courses that matters, not the order they are listed in.
  const orphaned = courses.filter((c) => after.courseFaculty[c.id] === undefined).map((c) => c.id);
  assert(
    [...orphaned].sort().join() === [...predicted].sort().join(),
    `and the courses that lost their instructor are exactly the ones the warning named (${orphaned.join(', ')} vs ${predicted.join(', ')})`,
  );
  assert(
    facultyLoad(after, prof.id) === effectiveCourseSlots(after, prof),
    'their load now sits exactly at their reduced ceiling',
  );

  // The old behaviour, stated as the thing that must not come back.
  assert(orphaned.length !== courses.length, 'a commitment no longer empties a professor’s whole catalogue');
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
