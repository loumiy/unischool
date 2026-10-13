// ---------------------------------------------------------------------
// Closing a program (Plan 101H): at once, never the last nor one another
// housed program needs; its slot freed, its courses locked and their
// teachers free; the school stays founded; the alumni give less for a few
// years; it may be founded again. program-thin's answer closes one.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { readFileSync } from 'node:fs';
import { bindScriptStream } from '../src/engine/random';
import { reducer } from '../src/engine/reducer';
import { closeProgram, closeRefusal } from '../src/systems/techtree/techSystem';
import { isHoused, offerablePrograms } from '../src/systems/techtree/programOffers';
import { cutGivingDip } from '../src/systems/alumni/giving';
import { eligible, eventById, rollVars } from '../src/systems/events/catalogue';
import { fire, resolveCatalogueEvent } from '../src/systems/events/catalogueEngine';
import { programById } from '../src/data/techData';
import { exportSave, readSave } from '../src/state/persistence';
import type { GameState } from '../src/state/types';

bindScriptStream(1070);

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('close program tests');

function college(): GameState {
  const read = readSave(readFileSync('test/fixtures/save-v102.json', 'utf8'));
  if (!('state' in read)) throw new Error('the fixture is refused');
  return read.state;
}
const housed = (s: GameState) => Object.values(s.halls).flat().map((x) => x.programId).filter((id): id is string => id !== null);

// ---- What can close ----
{
  const s = college();
  const ids = housed(s);
  assert(ids.length >= 3, `the fixture teaches a few programs (${ids.join(', ')})`);
  assert(closeRefusal(s, 'NOPE') !== null, 'a program not taught here cannot close');
  const closable = ids.filter((id) => closeRefusal(s, id) === null);
  assert(closable.length > 0, `some can close (${closable.join(', ')})`);
  // One another housed program needs: refused, naming who needs what.
  for (const id of ids) {
    const why = closeRefusal(s, id);
    if (why && why.includes('needs')) {
      const own = new Set(programById(id)!.courseIds);
      assert(s.tech.some((t) => t.kind === 'course' && !own.has(t.id) && t.prereqs.some((p) => own.has(p))), `${id} is refused because another program needs it (${why})`);
    }
  }
  // The last program never closes.
  const lone = college();
  for (const [hallId, slots] of Object.entries(lone.halls)) slots.forEach((slot, i) => { if (slot.programId && slot.programId !== ids[0]) lone.halls[hallId][i] = { programId: null }; });
  assert(closeRefusal(lone, ids[0]) === 'The college would teach nothing.', 'the college\'s last program never closes');
}

// ---- Closing ----
{
  const s = college();
  const id = housed(s).find((x) => closeRefusal(s, x) === null)!;
  const program = programById(id)!;
  const milestones = { ...s.milestones };
  const taught = program.courseIds.filter((c) => s.tech.find((t) => t.id === c)?.status === 'done');
  const next = reducer(s, { type: 'CLOSE_PROGRAM', programId: id });
  assert(!isHoused(next, id), `${program.name} leaves its slot`);
  assert(program.courseIds.every((c) => next.tech.find((t) => t.id === c)?.status === 'locked' && next.developing[c] === undefined && next.courseFaculty[c] === undefined), 'its courses lock, none under way, no teacher held');
  assert(taught.length === 0 || taught.every((c) => s.courseFaculty[c] === undefined || !next.faculty.every((f) => f.id !== s.courseFaculty[c])), 'its teachers stay on the faculty');
  assert(JSON.stringify(next.milestones) === JSON.stringify(milestones), 'every milestone stands: a founded school stays founded');
  assert(next.closedPrograms?.some((c) => c.programId === id && c.year === next.clock.year) === true, 'the closing is recorded');
  assert(offerablePrograms(next).some((p) => p.id === id), 'and it can be founded again from the offers');
  assert(next.log.some((l) => l.topic === 'program' && l.subject === id && l.kind === 'bad'), 'the log says so');
  // The alumni's dip, as a cut team's.
  assert(cutGivingDip(next) > 0 && cutGivingDip(next, next.clock.year + 5) === 0, 'the alumni give less for a few years');
  // Refused, the state is untouched.
  const again = reducer(next, { type: 'CLOSE_PROGRAM', programId: id });
  assert(again === next, 'a refused closing changes nothing');
}

// ---- program-thin ----
{
  const s = college();
  const e = eventById('program-thin')!;
  const vars = rollVars(s, e);
  assert(closeRefusal(s, vars.programId) === null && vars.program === programById(vars.programId)?.name, `it names a program it could close (${vars.program})`);
  s.catalogue = { pending: [], lastFired: {}, lastInlineWeek: 0, lastSeismicWeek: 0 };
  const p = fire(s, e);
  assert(resolveCatalogueEvent(s, p.instanceId, 'close'), 'closing it is an answer');
  assert(!isHoused(s, p.vars.programId), `and closes ${p.vars.program}`);
  // With nothing it could close, it waits.
  const none = college();
  for (const id of housed(none)) if (closeRefusal(none, id) === null) closeProgram(none, id);
  const left = housed(none).filter((id) => closeRefusal(none, id) === null);
  assert(left.length > 0 || !eligible(none, e), 'with nothing to close, it does not fire');
}

// ---- Saved ----
{
  const s = college();
  const id = housed(s).find((x) => closeRefusal(s, x) === null)!;
  closeProgram(s, id);
  s.closedPrograms!.push({ programId: 'NOPE', year: 1 }, { programId: id, year: 999 });
  const read = readSave(exportSave(s).text);
  assert('state' in read, 'it saves and loads');
  if ('state' in read) assert(read.state.closedPrograms?.length === 1 && read.state.closedPrograms[0].programId === id, 'the closing is kept, a malformed one dropped');
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
