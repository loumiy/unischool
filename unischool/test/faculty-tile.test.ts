// ---------------------------------------------------------------------
// The faculty tile's face and its person page (Plan 95G, the second
// review's B2-1). What is worth pinning:
//
//   - the face in the grid carries More and its chips, and no Train or
//     Dismiss: a year-40 grid lost about 80 Dismiss buttons;
//   - Train and Dismiss are on the person page that More opens
//     (FacultyActions), with Train's outcome as its tooltip, its refusal
//     said when a pick cannot be spent, and no Train for an A;
//   - a candidate's face still carries Appoint;
//   - the tab's summary is one row of figures, the course-slot sums read
//     off facultyCapacity.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Faculty, GameState } from '../src/state/types';
import { readSave } from '../src/state/persistence';
import { oneGradeUp } from '../src/data/courseQuality';
import { TRAINING_INSTITUTE_ID, TRAINING_WORDS } from '../src/data/trainingData';
import { whyNotTrain } from '../src/systems/faculty/training';
import { facultyCapacity } from '../src/systems/faculty/facultyCapacity';
import FacultyTile, { FacultyActions } from '../src/tabs/FacultyTile';
import { FacultyFigures } from '../src/tabs/FacultyTab';

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('faculty tile tests');

function launch(): GameState {
  const read = readSave(readFileSync(join(process.cwd(), 'test/fixtures/save-launch.json'), 'utf8'));
  if ('refused' in read) throw new Error(`the launch fixture is refused: ${read.refused}`);
  return read.state;
}
// A college specialized in academics, its institute standing (training.test.ts's).
function program(): GameState {
  const s = launch();
  s.specialization = 'academics';
  s.specializationYear = s.clock.year;
  s.tech.find((t) => t.id === TRAINING_INSTITUTE_ID)!.status = 'done';
  return s;
}
const act = () => {};
const tile = (s: GameState, f: Faculty, isCandidate = false) =>
  renderToStaticMarkup(createElement(FacultyTile, { s, act, f, isCandidate }));
const actions = (s: GameState, f: Faculty) =>
  renderToStaticMarkup(createElement(FacultyActions, { s, act, f }));

// ---- The face: More and the chips, no Train or Dismiss ----
{
  const s = program();
  const trainable = s.faculty.find((f) => whyNotTrain(s, f) === null)!;
  assert(trainable !== undefined, 'the launch college, specialized, has somebody to train');
  for (const f of s.faculty) {
    const html = tile(s, f);
    if (!html.includes('faculty-expand-btn') || html.includes('>Dismiss<') || html.includes('btn-train') || html.includes('btn-danger')) {
      assert(false, `${f.name}'s face carries More and no Train or Dismiss`);
      break;
    }
  }
  assert(true, 'every face carries More and no Train or Dismiss');
  const face = tile(s, trainable);
  assert(face.includes('faculty-card-load') && face.includes('faculty-tile-stats'), 'the face keeps its load chip and its meters');
}

// ---- The person page: Train and Dismiss ----
{
  const s = program();
  const f = s.faculty.find((x) => whyNotTrain(s, x) === null)!;
  const html = actions(s, f);
  assert(html.includes('btn-train') && html.includes(`>${TRAINING_WORDS.train}<`), 'the person page offers Train');
  assert(!/btn-train[^>]*disabled/.test(html), 'and it can be pressed');
  assert(html.includes('btn-danger') && html.includes('>Dismiss<'), 'the person page offers Dismiss');

  // An A is not offered training at all.
  const a = s.faculty.find((x) => oneGradeUp(x.teaching) === null);
  if (a) assert(!actions(s, a).includes('btn-train') && actions(s, a).includes('>Dismiss<'), 'an A is offered Dismiss and no Train');

  // The picks spent: Train stays, refused, and says why.
  const spent = program();
  const below = spent.faculty.filter((x) => oneGradeUp(x.teaching) !== null);
  spent.training = { year: spent.clock.year, trained: below.slice(1).map((x) => x.id) };
  const g = below[0];
  if (g && whyNotTrain(spent, g) === 'no-picks') {
    const refused = actions(spent, g);
    assert(/<button[^>]*class="btn-train"[^>]*disabled/.test(refused) || /disabled=""[^>]*class="btn-train"/.test(refused), 'with the picks spent, Train is refused');
    assert(refused.includes('title='), 'and says why in its tooltip');
  } else {
    assert(false, 'a pick can be spent out (the training state has the shape this test expects)');
  }

  // Without the institute, no Train; Dismiss stays.
  const plain = launch();
  const p = plain.faculty[0];
  const none = actions(plain, p);
  assert(!none.includes('btn-train') && none.includes('>Dismiss<'), 'without the institute, Dismiss and no Train');
}

// ---- A candidate's face keeps Appoint ----
{
  const s = launch();
  const c = s.candidates[0];
  if (c) {
    const html = tile(s, c, true);
    assert(html.includes('>Appoint<') && !html.includes('>Dismiss<'), 'a candidate is appointed from the face');
  }
}

// ---- The summary, as one row of figures ----
{
  const s = launch();
  const cap = facultyCapacity(s);
  const html = renderToStaticMarkup(createElement(FacultyFigures, { cap }));
  const text = html.replace(/<[^>]+>/g, '');
  assert(text.includes(`${cap.total.supply.toLocaleString('en-US')} course slots`), `the row leads with the course slots (${text})`);
  assert(text.includes(`${cap.total.offered.toLocaleString('en-US')} on offer`), 'then those on offer');
  assert(text.split(' ').length <= 16, `and it is one short row (${text.split(' ').length} words)`);
}

console.log(`  ${checks} checks, ${failures} failed`);
if (failures > 0) process.exit(1);
