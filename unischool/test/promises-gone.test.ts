// ---------------------------------------------------------------------
// Promises gone (Plan 124E): the board's public promises (Plan 33) were cut.
// A save from before loads without them: its record, an offer it had
// pending at the summer's Review, the journal's lines about them and a
// written Final Report's tally are dropped, and the Review continues with
// nothing to take. Every committed fixture that held promises still loads.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { readSave } from '../src/state/persistence';
import { reducer } from '../src/engine/reducer';
import type { GameState } from '../src/state/types';

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('promises gone tests');

const dir = join(process.cwd(), 'test/fixtures');
const fixtures = readdirSync(dir).filter((f) => f.endsWith('.json'));
let held = 0;
for (const f of fixtures) {
  const raw = readFileSync(join(dir, f), 'utf8');
  const had = (JSON.parse(raw) as { state: Record<string, unknown> }).state.promises !== undefined;
  if (had) held += 1;
  const read = readSave(raw);
  assert('state' in read, `${f} loads`);
  if ('state' in read) assert(!('promises' in read.state), `${f} loads without promises`);
}
assert(held > 10, `the fixtures hold promises to drop (${held})`);

// A save written at the Review beat with an offer pending, a promise open
// and kept, the journal's lines, and a written report that counted them.
{
  const raw = JSON.parse(readFileSync(join(dir, 'save-v102.json'), 'utf8')) as { state: GameState & Record<string, unknown> };
  const s = raw.state;
  s.promises = {
    active: [{ id: 'debt-free', madeYear: 3, dueYear: 8 }],
    settled: [{ id: 'beautiful-campus', year: 4, kept: true }],
    declined: [{ id: 'selective-college', year: 4 }],
    offer: { ids: ['four-schools', 'loyal-alumni'], decade: true },
  };
  s.log.unshift({ year: s.clock.year, week: 1, kind: 'good', message: 'Kept: a beautiful campus.', topic: 'ambition' as never });
  s.pendingInterrupt = { type: 'summer', payload: { beat: 0, tuition: s.finance.listedTuition, admitRate: s.students.admitRate } };
  s.ending = {
    report: { year: 50, college: 'X', title: 'X: a college', mark: 'B', markScore: 70, axes: [], kept: ['a'], missed: [], declined: 3, finances: [], eras: [], rank: 1, total: 2 } as never,
    addenda: [],
  };
  const read = readSave(JSON.stringify(raw));
  assert('state' in read, 'a save with an offer pending loads');
  if ('state' in read) {
    const t = read.state;
    assert(!('promises' in t), 'without its promises, the offer among them');
    assert(!t.log.some((e) => (e.topic as string | undefined) === 'ambition'), 'the journal\'s promise lines lose their topic');
    assert(t.log.some((e) => e.message === 'Kept: a beautiful campus.'), 'but the lines themselves stay, as texture');
    const report = t.ending?.report as unknown as Record<string, unknown>;
    assert(report && !('kept' in report) && !('missed' in report) && !('declined' in report), 'a written report loses its promise tally');
    assert(report?.mark === 'B' && report?.markScore === 70, 'and keeps the grade it was given');
    if (t.pendingInterrupt?.type === 'summer') {
      const next = reducer(t, { type: 'RESOLVE_SUMMER_BEAT' });
      assert((next.pendingInterrupt?.payload as { beat?: number } | undefined)?.beat === 1, 'the Review continues to Admissions');
      assert(!('promises' in next), 'and makes no promise');
    }
  }
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`  ${failures} of ${checks} checks failed`);
  process.exit(1);
}
