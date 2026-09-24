// The alumni ledger (src/systems/alumni/ledger.ts): a class is stamped at
// commencement with what its four years held, read off the history rows,
// and its warmth follows.

import { createInitialState } from '../src/state/actions';
import { classYears, memoryFor, memoryLine, stampGraduatingClass, warmthFor } from '../src/systems/alumni/ledger';
import { bindScriptStream } from '../src/engine/random';
import type { GameState, YearSnapshot } from '../src/state/types';

bindScriptStream(3030);

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('alumni tests');

function row(year: number, over: Partial<YearSnapshot> = {}): YearSnapshot {
  return {
    year, prestige: 60, rank: 50, enrolled: 1000, cash: 1e6, coursesDone: 10, programsEstablished: 1,
    satisfaction: 60, net: 1e5, applicants: 3000, admitRate: 0.4, incomingQuality: 55,
    satisfactionAverage: 60, coursesFinished: 2, attrition: 20, graduated: 200, worstRung: 0, schoolsFounded: 0,
    ...over,
  };
}
function withYears(rows: YearSnapshot[]): GameState {
  const s = createInitialState('Alumni');
  s.history = rows;
  return s;
}

{
  const happy = withYears([1, 2, 3, 4, 5].map((y) => row(y, { satisfactionAverage: 80 })));
  const c = classYears(happy, 5);
  assert(c.years.length === 4 && c.years[0].year === 2, 'a class\'s years are the four before commencement');
  const memory = memoryFor(happy, c);
  assert(memory.includes('happy'), `a happy four years is remembered (${memory.join(', ')})`);

  const grim = withYears([1, 2, 3, 4, 5].map((y) => row(y, { satisfactionAverage: 40, net: -1e5, worstRung: y === 4 ? 5 : 1 })));
  const gm = memoryFor(grim, classYears(grim, 5));
  assert(gm.includes('receivership') && gm.includes('unhappy') && gm.includes('deficits'), `and so is a grim one (${gm.join(', ')})`);
  assert(gm[0] === 'receivership', 'loudest first');
  assert(warmthFor(classYears(grim, 5), gm) < warmthFor(classYears(happy, 5), memory), 'and it is colder');

  const quiet = withYears([1, 2, 3, 4, 5].map((y) => row(y)));
  const qm = memoryFor(quiet, { ...classYears(quiet, 5), teaching: 50 });
  assert(qm.join() === 'quiet', `a class nothing happened to is quiet (${qm.join(', ')})`);
  assert(memoryLine({ classYear: 5, memory: ['happy', 'well-taught', 'building-years', 'deficits'] }) === 'The class of 5: happy in it, properly taught and there for the building years.', 'the line shows three clauses');

  const leaky = withYears([1, 2, 3, 4, 5].map((y) => row(y, { attrition: 80 })));
  assert(memoryFor(leaky, classYears(leaky, 5)).includes('thinned'), 'a college losing a twelfth a year thins its classes');

  const founded = withYears([1, 2, 3, 4, 5].map((y) => row(y, { schoolsFounded: y >= 3 ? 1 : 0, programsEstablished: y })));
  const fm = memoryFor(founded, classYears(founded, 5));
  assert(fm.includes('new-school') && fm.includes('first-of-program'), `a founding is remembered (${fm.join(', ')})`);

  stampGraduatingClass(happy, 250, 5);
  const stamped = happy.alumni![0];
  assert(stamped.classYear === 5 && stamped.size === 250 && stamped.warmth > 0 && stamped.warmth <= 100 && stamped.nudged === 0, 'commencement stamps the class');
  stampGraduatingClass(happy, 0, 6);
  assert(happy.alumni!.length === 1, 'a class of nobody is not a class');
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
