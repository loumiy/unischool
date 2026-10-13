// ---------------------------------------------------------------------
// Hires and retirements (Plan 101D): a hiring event rolls the candidate it
// names, and the answer that hires appoints them; the retirement events
// name the professor in their year's notice.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { createInitialState } from '../src/state/actions';
import { bindScriptStream } from '../src/engine/random';
import { eligible, eventById, eventText, fill, rollVars } from '../src/systems/events/catalogue';
import { fire, resolveCatalogueEvent } from '../src/systems/events/catalogueEngine';
import { appointFaculty, careerWeeks } from '../src/systems/faculty/facultySystem';
import { generateCandidate } from '../src/data/facultyData';
import { absoluteWeek } from '../src/data/eventData';
import { exportSave, readSave } from '../src/state/persistence';
import { WEEKS_PER_YEAR, type Faculty, type GameState } from '../src/state/types';

bindScriptStream(1040);

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('event hires tests');

function college(): GameState {
  const s = createInitialState('Hires');
  s.clock.year = 30;
  s.catalogue = { pending: [], lastFired: {}, lastInlineWeek: 0, lastSeismicWeek: 0 };
  // A course taught in Biology, so a taught field exists.
  const course = s.tech.find((t) => t.kind === 'course' && t.requiresFaculty === 'Biology')!;
  course.status = 'done';
  return s;
}

function professor(s: GameState, field: string, tenureWeeks: number): Faculty {
  const f = generateCandidate(field, s.faculty.map((x) => x.name));
  appointFaculty(s, f);
  f.tenureWeeks = tenureWeeks;
  return f;
}

// ---- A hire ----
for (const id of ['frozen-post', 'contract-visiting-chair', 'two-body']) {
  const e = eventById(id)!;
  const s = college();
  if (id === 'two-body') professor(s, 'Biology', 3 * WEEKS_PER_YEAR);
  const p = fire(s, e);
  const text = fill(eventText(e, p), p.vars);
  assert(!!p.candidate && text.includes(p.candidate.name) && !/\{\w+\}/.test(text), `${id}: the letter names the candidate it rolled (${text.slice(0, 70)}…)`);
  const taught = new Set(s.tech.filter((t) => t.kind === 'course' && t.status === 'done').map((t) => t.requiresFaculty));
  assert(taught.has(p.candidate!.field) === (e.hires === 'taught'), `${id}: a ${e.hires} field (${p.candidate!.field})`);
  const hire = e.choices.find((c) => (c.effects.hire ?? 0) > 0)!;
  const before = s.faculty.length;
  s.finance.cash = 10_000_000;
  assert(resolveCatalogueEvent(s, p.instanceId, hire.id), `${id}: ${hire.id} is answered`);
  assert(s.faculty.length === before + 1 && s.faculty.some((f) => f.id === p.candidate!.id), `${id}: ${hire.id} appoints them`);
  assert(s.log.some((l) => l.topic === 'appointment' && l.subject === p.candidate!.id), `${id}: and logs the appointment`);
  const q = fire(s, e);
  const other = e.choices.find((c) => !c.effects.hire)!;
  resolveCatalogueEvent(s, q.instanceId, other.id);
  assert(!s.faculty.some((f) => f.id === q.candidate!.id), `${id}: ${other.id} appoints nobody`);
}
{
  // Saved while it waits, the candidate comes back; a malformed one is dropped.
  const s = college();
  const p = fire(s, eventById('frozen-post')!);
  const q = fire(s, eventById('contract-visiting-chair')!);
  (q.candidate as unknown as { salary: unknown }).salary = 'lots';
  const read = readSave(exportSave(s).text);
  assert('state' in read, 'it saves and loads');
  if ('state' in read) {
    const pending = read.state.catalogue!.pending;
    assert(pending.find((x) => x.instanceId === p.instanceId)?.candidate?.id === p.candidate!.id, 'a waiting candidate is kept');
    assert(pending.find((x) => x.instanceId === q.instanceId)?.candidate === undefined, 'a malformed one is dropped');
  }
}

// ---- Retirements ----
{
  const s = college();
  const lecture = eventById('the-last-lecture')!;
  const steady = professor(s, 'Biology', 10 * WEEKS_PER_YEAR);
  for (let i = 0; i < 5; i++) professor(s, 'Biology', 2 * WEEKS_PER_YEAR);
  assert(!eligible(s, lecture), 'with nobody in their notice, the last lecture waits');
  const leaving = professor(s, 'Biology', 0);
  leaving.tenureWeeks = careerWeeks(leaving.id) - 10;
  assert(eligible(s, lecture) && rollVars(s, lecture).faculty === leaving.name, `in their notice year, it names them (${rollVars(s, lecture).faculty})`);
  assert(rollVars(s, eventById('emeritus-office')!).faculty === leaving.name, 'and so does the emeritus office');
  // The founding faculty: appointed in the first three years.
  const founding = eventById('founding-faculty-last')!;
  for (let i = 0; i < 5; i++) professor(s, 'Biology', 2 * WEEKS_PER_YEAR);
  s.clock.year = 80;
  assert(!eligible(s, founding), 'a retiring professor who joined late is not the founding faculty');
  s.clock.year = 30;
  leaving.tenureWeeks = absoluteWeek(s) - WEEKS_PER_YEAR;
  const career = careerWeeks(leaving.id);
  // Keep them in their notice: a career long enough to reach year one.
  if (leaving.tenureWeeks >= career - WEEKS_PER_YEAR && leaving.tenureWeeks < career) {
    assert(eligible(s, founding) && rollVars(s, founding).faculty === leaving.name, 'the last founding professor, retiring, is named');
    steady.tenureWeeks = absoluteWeek(s) - 2 * WEEKS_PER_YEAR;
    assert(!eligible(s, founding), 'while another founding professor stays, they are not the last');
  } else {
    assert(!eligible(s, founding), 'a founding professor not yet in their notice is not named');
  }
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
