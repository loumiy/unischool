// ---------------------------------------------------------------------
// MED550 as Internal Medicine (Plan 102B): a retitle at the same id, taught
// from Clinical Health. A saved run takes the new title, and the new field
// on a course not yet started; one under way keeps its instructor's field.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { createInitialState } from '../src/state/actions';
import { bindScriptStream } from '../src/engine/random';
import { exportSave, readSave } from '../src/state/persistence';
import type { GameState } from '../src/state/types';

bindScriptStream(1020);

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('internal medicine tests');

const med = (s: GameState) => s.tech.find((t) => t.id === 'MED550')!;

{
  const s = createInitialState('Medicine');
  assert(med(s).name.endsWith('· Internal Medicine') && med(s).requiresFaculty === 'Clinical Health', 'a new run teaches Internal Medicine from Clinical Health');
  assert(s.tech.filter((t) => t.kind === 'course').length === 473, 'the catalog stays at 473');
}
for (const [status, keeps] of [['available', false], ['developing', true]] as const) {
  const s = createInitialState('Medicine');
  Object.assign(med(s), { name: 'MD 550 · Global & Public Health Systems', requiresFaculty: 'Public Health', status });
  const read = readSave(exportSave(s).text);
  assert('state' in read, 'it loads');
  if ('state' in read) {
    const t = med(read.state);
    assert(t.name.endsWith('· Internal Medicine'), `a saved ${status} MED550 takes the new title`);
    assert(t.requiresFaculty === (keeps ? 'Public Health' : 'Clinical Health'), `and ${keeps ? 'keeps its instructor\'s field' : 'the new field'} (${t.requiresFaculty})`);
  }
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
