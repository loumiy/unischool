// ---------------------------------------------------------------------
// Schools are founded (Plan 14's PR E — see systems/techtree/schools.ts).
// Six programs of one school, housed in one hall, founds that school:
// the `school-founded:<School>` milestone, awarded once, celebrated, never
// revoked. Six of one school scattered across halls founds nothing; five
// plus one of another school founds nothing. A graduate program counts as
// its home school, so a second Health Science hall with the MD in it
// dedicates on its own terms. And moving a program out keeps the
// milestone while the hall's live name follows the building.
//
// Halls here are written directly rather than built and founded through
// the reducer: the founding action is pinned by test/founding.test.ts,
// and what is under test is the READING over s.halls and the milestone
// pass that runs on it.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { createInitialState } from '../src/state/actions';
import { reducer } from '../src/engine/reducer';
import { FOUNDERS_HALL_ID, programs } from '../src/data/techData';
import { FOUNDING_PROGRAMS } from '../src/data/foundingData';
import { dedicatedHalls, dedicatedSchool, hallDisplayName, isSchoolFounded, schoolFoundedKey } from '../src/systems/techtree/schools';
import { describeMilestone, isCelebratedMilestone } from '../src/data/eventData';
import type { GameState } from '../src/state/types';

let seed = 77;
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

const majorsOf = (school: string) => programs().filter((p) => p.kind === 'major' && p.school === school).map((p) => p.id);

// A school with two halls standing and placed, both empty.
function withHalls(): GameState {
  const s = createInitialState('Dedication');
  for (const id of ['HALL-01', 'HALL-02', 'HALL-03']) {
    s.tech.find((t) => t.id === id)!.status = 'done';
    s.placements[id] = { row: 10 + 10 * Number(id.slice(-1)), col: 10, w: 7, h: 5 };
    s.halls[id] = Array.from({ length: 6 }, () => ({ programId: null }));
  }
  return s;
}

function house(s: GameState, hallId: string, ids: string[]): void {
  ids.forEach((id, i) => { s.halls[hallId][i] = { programId: id }; });
}

// A milestone pass runs when something finishes (techSystem.ts's
// checkMilestones is called from tickTech after a finish) — the cheapest
// finish is a one-week course. The founding action also runs the pass
// itself; this exercises the tick path.
function finishSomething(s: GameState): GameState {
  const next = s.tech.find((t) => t.id === 'ENGL120')!;
  next.status = 'developing';
  s.developing['ENGL120'] = 1;
  return reducer(s, { type: 'TICK' });
}

console.log('school founding tests');

// ---- six of one school in one hall founds it ----
{
  let s = withHalls();
  const business = majorsOf('Business');
  assert(business.length === 6, 'Business has six majors');
  house(s, 'HALL-01', business);
  assert(dedicatedSchool(s, 'HALL-01') === 'Business', 'a hall holding all six Business programs is dedicated to Business');
  assert(!isSchoolFounded(s, 'Business'), 'the milestone is not written until a milestone pass runs');
  s = finishSomething(s);
  assert(isSchoolFounded(s, 'Business'), 'the pass founds the School of Business');
  // Queued for celebration — and the event system may already have fired
  // it this same tick, in which case it is the pending interrupt instead.
  const celebrated = s.events.pendingMilestones.includes(schoolFoundedKey('Business'))
    || (s.pendingInterrupt?.type === 'milestone'
      && JSON.stringify(s.pendingInterrupt.payload).includes(schoolFoundedKey('Business')));
  assert(celebrated, 'and queues the celebration');
  assert(isCelebratedMilestone(schoolFoundedKey('Business')), 'school-founded is a celebrated kind');
  const entry = describeMilestone(s, schoolFoundedKey('Business'));
  assert(entry?.headline === 'This is the School of Business', `the celebration names the school (${entry?.headline})`);
  assert(s.log.some((l) => l.message.includes('This is the School of Business')), 'the log says so too');
  assert(hallDisplayName(s, s.tech.find((t) => t.id === 'HALL-01')!) === 'Business Hall', 'the hall reads as Business Hall on the map');
  assert(hallDisplayName(s, s.tech.find((t) => t.id === 'HALL-02')!) === 'South Academic Hall', 'an empty hall keeps its own name');
  // Awarded once: a second pass writes nothing new.
  const logged = s.log.filter((l) => l.message.includes('This is the School of Business')).length;
  if (s.pendingInterrupt) s = reducer(s, { type: 'RESOLVE_MILESTONE' });
  s = finishSomething(s);
  assert(s.log.filter((l) => l.message.includes('This is the School of Business')).length === logged, 'a second pass does not found the school twice');
}

// ---- five plus one founds nothing; six scattered founds nothing ----
{
  let s = withHalls();
  const [eng] = majorsOf('Engineering');
  house(s, 'HALL-01', [...majorsOf('Business').slice(0, 5), eng]);
  assert(dedicatedSchool(s, 'HALL-01') === null, 'five Business plus one Engineering dedicates nothing');
  s = finishSomething(s);
  assert(!isSchoolFounded(s, 'Business') && !isSchoolFounded(s, 'Engineering'), 'and founds nothing');

  const t = withHalls();
  const science = majorsOf('Science');
  house(t, 'HALL-01', science.slice(0, 3));
  house(t, 'HALL-02', science.slice(3));
  assert(dedicatedHalls(t).length === 0, 'six of one school across two halls dedicates neither');
  const u = finishSomething(t);
  assert(!isSchoolFounded(u, 'Science'), 'and founds nothing — the hall founds a school, not the count');

  const v = withHalls();
  house(v, 'HALL-01', science.slice(0, 5));
  assert(dedicatedSchool(v, 'HALL-01') === null, 'a hall with an empty slot is not dedicated');
}

// ---- a graduate program counts as its home school ----
{
  let s = withHalls();
  house(s, 'HALL-01', majorsOf('Health Science'));
  const grads = programs().filter((p) => p.kind === 'graduate' && p.school === 'Health Science').map((p) => p.id);
  assert(grads.includes('MED') && grads.includes('PHDH'), 'the MD and the health doctorate belong to Health Science');
  // A second Health Science hall: four majors could not fit (they are all
  // in the first), so the second holds the MD, the doctorate, and — to
  // fill it — four majors of Science would break purity. Six Health
  // Science programs: the six majors are taken, so the second hall can
  // hold at most the two graduate programs plus nothing. Dedication of a
  // second hall of one school therefore needs the programs to exist: the
  // reading is what is under test, so give the second hall the MD, the
  // doctorate and four of the majors moved out of the first.
  house(s, 'HALL-02', ['MED', 'PHDH', ...majorsOf('Health Science').slice(0, 4)]);
  house(s, 'HALL-01', [...majorsOf('Health Science').slice(4), ...majorsOf('Science').slice(0, 4)]);
  assert(dedicatedSchool(s, 'HALL-02') === 'Health Science', 'a hall of the MD, the health doctorate and four Health Science majors is dedicated to Health Science');
  assert(dedicatedSchool(s, 'HALL-01') === null, 'while the mixed hall is not');
  s = finishSomething(s);
  assert(isSchoolFounded(s, 'Health Science'), 'and founds the School of Health Science');
  assert(hallDisplayName(s, s.tech.find((t) => t.id === 'HALL-02')!) === 'Health Science Hall', 'the dedicated hall is Health Science Hall');
}

// ---- the milestone is never revoked; the name follows the building ----
{
  let s = withHalls();
  house(s, 'HALL-01', majorsOf('Computer Science'));
  s = finishSomething(s);
  assert(isSchoolFounded(s, 'Computer Science'), 'founded');
  s.halls['HALL-01'][0] = { programId: null };
  assert(dedicatedSchool(s, 'HALL-01') === null, 'a hall that loses a program is no longer dedicated');
  s = finishSomething(s);
  assert(isSchoolFounded(s, 'Computer Science'), 'but the school stays founded');
  assert(hallDisplayName(s, s.tech.find((t) => t.id === 'HALL-01')!) === 'North Academic Hall', 'while the hall goes back to its own name');
  // A lab's school gate reads the milestone, not the live purity.
  const lab = s.tech.find((t) => t.schoolGate === 'Computer Science')!;
  assert(!!lab, 'Computer Science has a lab with a school gate');
  assert(s.milestones[schoolFoundedKey('Computer Science')] === true, 'the gate the lab reads is still true');
}

// ---- Founders Hall is an ordinary hall: half a school at founding ----
{
  let s = createInitialState('Founders');
  const opening = programs().find((p) => p.id === FOUNDING_PROGRAMS[0])!.school;
  assert(dedicatedSchool(s, FOUNDERS_HALL_ID) === null, 'three of six is not dedicated');
  assert(dedicatedHalls(s).length === 0, 'a founding save has no dedicated hall');
  assert(hallDisplayName(s, s.tech.find((t) => t.id === FOUNDERS_HALL_ID)!) === 'Founders Hall', 'and Founders Hall keeps its name');
  const rest = majorsOf(opening).filter((id) => !FOUNDING_PROGRAMS.includes(id));
  assert(rest.length === 3, 'three programs of the opening school remain to be founded');
  rest.forEach((id, i) => { s.halls[FOUNDERS_HALL_ID][FOUNDING_PROGRAMS.length + i] = { programId: id }; });
  assert(dedicatedSchool(s, FOUNDERS_HALL_ID) === opening, `filling its three rooms with the rest of the school dedicates it to ${opening}`);
  s = finishSomething(s);
  assert(isSchoolFounded(s, opening), 'and founds the opening school');
  assert(hallDisplayName(s, s.tech.find((t) => t.id === FOUNDERS_HALL_ID)!) === `${opening} Hall`, 'so Founders Hall reads as the school\'s hall on the map');
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
