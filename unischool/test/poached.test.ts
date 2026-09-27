// ---------------------------------------------------------------------
// A poached professor leaves (Plan 72B): `star-poached` names a professor,
// and *Wish them well*, its default, now loses exactly that one, their
// courses left waiting for a new instructor; *Counter the offer* keeps
// them. A firing saved before the id was kept finds them by name.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { createInitialState } from '../src/state/actions';
import { bindScriptStream } from '../src/engine/random';
import { generateCandidate } from '../src/data/facultyData';
import { eventById, priceScale, rollVars } from '../src/systems/events/catalogue';
import { resolveCatalogueEvent } from '../src/systems/events/catalogueEngine';
import type { GameState, PendingCatalogueEvent } from '../src/state/types';

bindScriptStream(7272);

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('poached tests');

// A college with a roster of four, each teaching a course.
function college(): GameState {
  const s = createInitialState('Poached');
  s.faculty = [];
  for (let i = 0; i < 4; i += 1) s.faculty.push({ ...generateCandidate('History'), id: `f-${i}`, name: `Professor ${i}` });
  const done = s.tech.filter((t) => t.status === 'done' || t.status === 'developing').slice(0, 4);
  done.forEach((t, i) => { s.courseFaculty[t.id] = `f-${i}`; });
  return s;
}

function waiting(s: GameState, vars = rollVars(s)): PendingCatalogueEvent {
  const c = s.catalogue ??= { pending: [], lastFired: {}, lastInlineWeek: 0, lastSeismicWeek: 0 };
  const p: PendingCatalogueEvent = { instanceId: `p-${c.pending.length}`, eventId: 'star-poached', firedWeek: 1, vars, scale: priceScale(s) };
  c.pending.push(p);
  return p;
}

{
  const e = eventById('star-poached');
  assert(e?.default === 'wish' && e.choices.find((c) => c.id === 'wish')?.effects.departs === 1, 'the default is the departure');

  const s = college();
  const p = waiting(s);
  const named = s.faculty.find((f) => f.id === p.vars.facultyId);
  assert(named !== undefined && named.name === p.vars.faculty, `the event names someone on the roster (${p.vars.faculty})`);
  const taught = Object.entries(s.courseFaculty).filter(([, id]) => id === p.vars.facultyId).map(([course]) => course);
  assert(resolveCatalogueEvent(s, p.instanceId, 'wish', 'timeout'), 'the default resolves');
  assert(s.faculty.length === 3 && !s.faculty.some((f) => f.id === p.vars.facultyId), 'and exactly the named professor is gone');
  assert(taught.every((course) => s.courseFaculty[course] === undefined), 'their courses wait for a new instructor');
  assert(s.log.some((l) => l.topic === 'departure' && l.subject === p.vars.facultyId && /leaves the college/.test(l.message)), 'and the log says so');
}

{
  const s = college();
  s.finance.cash = 10_000_000;
  const p = waiting(s);
  assert(resolveCatalogueEvent(s, p.instanceId, 'counter'), 'a counter-offer resolves');
  assert(s.faculty.length === 4 && s.faculty.some((f) => f.id === p.vars.facultyId), 'and keeps them');
}

{
  // A firing saved before Plan 72B: no id, found by name.
  const s = college();
  const p = waiting(s, { faculty: 'Professor 2' });
  resolveCatalogueEvent(s, p.instanceId, 'wish', 'timeout');
  assert(!s.faculty.some((f) => f.name === 'Professor 2') && s.faculty.length === 3, 'an older firing finds them by name');
  // Someone already gone: nobody else leaves.
  const q = waiting(s, { faculty: 'Professor 2', facultyId: 'f-2' });
  resolveCatalogueEvent(s, q.instanceId, 'wish', 'timeout');
  assert(s.faculty.length === 3, 'and one already gone takes nobody with them');
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
