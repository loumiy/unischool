// ---------------------------------------------------------------------
// The charter, granted (Plan 72E): the first lab brings a university
// charter with a log line and no modal; the pennant renames the college,
// the name and College or, once chartered, University; and a save held at
// the old modal loads chartered, a week on.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { reducer } from '../src/engine/reducer';
import { bindScriptStream } from '../src/engine/random';
import { tickEvents } from '../src/systems/events/eventSystem';
import { readSave } from '../src/state/persistence';
import { createInitialState } from '../src/state/actions';
import { institutionName, type GameState } from '../src/state/types';

bindScriptStream(7273);

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('charter tests');

const raw = readFileSync(join(process.cwd(), 'test/fixtures/save-v78-charter.json'), 'utf8');
const held = JSON.parse(raw) as { version: number; state: GameState };

{
  // The same college the week before the old modal: a lab at work, the
  // charter not yet granted.
  const s = structuredClone(held.state);
  s.pendingInterrupt = null;
  s.self.universityCharterOffered = false;
  s.self.suffix = 'College';
  tickEvents(s);
  assert(s.self.suffix === 'University' && s.self.universityCharterOffered, `the first lab brings the charter (${institutionName(s.self)})`);
  assert(s.pendingInterrupt === null, 'with no modal');
  assert(/university charter/.test(s.log[0]?.message ?? '') && s.log[0].message.includes(institutionName(s.self)), `and a log line: "${s.log[0]?.message}"`);
  const again = s.log.length;
  tickEvents(s);
  assert(!s.log.slice(0, s.log.length - again).some((l) => /university charter/.test(l.message)), 'once');
}

{
  const s = createInitialState('Hollis');
  const renamed = reducer(s, { type: 'RENAME_COLLEGE', name: '  Ashgrove University ', suffix: 'University' });
  assert(renamed.self.name === 'Ashgrove' && renamed.self.suffix === 'College', `before the charter, a rename keeps College and drops a typed suffix (${institutionName(renamed.self)})`);
  assert(/is renamed Ashgrove College/.test(renamed.log[0]?.message ?? ''), 'and says so in the log');
  assert(reducer(s, { type: 'RENAME_COLLEGE', name: '   ', suffix: 'College' }) === s, 'an empty name is refused');
  assert(reducer(s, { type: 'RENAME_COLLEGE', name: 'Hollis', suffix: 'College' }) === s, 'as is no change at all');
  const chartered = structuredClone(s);
  chartered.self.universityCharterOffered = true;
  chartered.self.suffix = 'University';
  const back = reducer(chartered, { type: 'RENAME_COLLEGE', name: 'Hollis', suffix: 'College' });
  assert(back.self.suffix === 'College', 'once chartered, it can go back to College');
  const up = reducer(back, { type: 'RENAME_COLLEGE', name: 'Hollis', suffix: 'University' });
  assert(up.self.suffix === 'University', 'and to University again');
  const long = reducer(s, { type: 'RENAME_COLLEGE', name: 'X'.repeat(90), suffix: 'College' });
  assert(long.self.name.length === 60, 'a name is cut at the founding screen\'s length');
}

{
  assert(held.version === 78 && held.state.pendingInterrupt?.type === 'charter', 'the fixture is a version-78 save held at the old modal');
  const read = readSave(raw);
  if ('refused' in read) {
    assert(false, `it loads (refused: ${read.refused})`);
  } else {
    const s = read.state;
    assert(s.pendingInterrupt === null && s.self.suffix === 'University' && s.self.universityCharterOffered, 'it loads chartered, with no modal');
    const week = (y: number, w: number) => y * 52 + w;
    assert(week(s.clock.year, s.clock.week) === week(held.state.clock.year, held.state.clock.week) + 1, 'a week on, as answering it was');
    assert(/university charter/.test(s.log[0]?.message ?? ''), 'with the charter in the log');
  }
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
