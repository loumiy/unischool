// The hall of fame (Plan 33, state/hall.ts): a finished run hangs once, in
// its own storage key, newest first, a dozen at most; a new run's save
// never takes one down.

import { createInitialState } from '../src/state/actions';
import { bindScriptStream } from '../src/engine/random';
import { finalReport } from '../src/state/finalReport';
import { HALL_KEY, HALL_MAX, hangInHall, readHall } from '../src/state/hall';
import { clearSave, saveGame } from '../src/state/persistence';

bindScriptStream(3338);
const store = new Map<string, string>();
(globalThis as unknown as { localStorage: unknown }).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => { store.set(k, v); },
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

console.log('hall tests');

{
  assert(readHall().length === 0, 'an empty hall');
  const s = createInitialState('Hallowell');
  s.clock.year = 50;
  const report = finalReport(s);
  assert(hangInHall(s, report, 1_000), 'a finished run hangs');
  const [entry] = readHall();
  assert(entry.college === report.college && entry.title === report.title && entry.mark === report.mark, 'with its plaque: the name, the title and the mark');
  assert(entry.grades.length === 6 && entry.vernacular === s.self.vernacular && entry.colors.primary === s.self.colors.primary, 'its grades, and what its portrait is drawn from');
  assert(!hangInHall(s, report, 2_000) && readHall().length === 1, 'the same report is not hung twice');
  saveGame(s);
  clearSave();
  assert(readHall().length === 1, 'a new run\'s save leaves the hall alone');
  for (let i = 0; i < HALL_MAX + 3; i++) {
    const other = createInitialState(`College ${i}`);
    other.clock.year = 50;
    hangInHall(other, finalReport(other), 3_000 + i);
  }
  const hall = readHall();
  assert(hall.length === HALL_MAX && hall[0].finishedAt > hall[1].finishedAt, `a dozen at most, newest first (${hall.length})`);
  store.set(HALL_KEY, JSON.stringify([{ id: 1 }, ...hall.slice(0, 2)]));
  assert(readHall().length === 2, 'a malformed entry is passed over');
  store.set(HALL_KEY, 'not json');
  assert(readHall().length === 0, 'and an unreadable hall is an empty one');
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
